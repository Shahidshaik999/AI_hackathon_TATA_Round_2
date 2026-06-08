"""Sensor data ingestion and anomaly detection endpoints."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app.models.db_models import (
    Equipment as EquipmentModel,
    SensorReading,
    Alert,
)
from app.schemas.schemas import SensorDataBatch, SensorReadingResponse
from app.agents.predictive_agent import predictive_agent

router = APIRouter(prefix="/sensors", tags=["Sensors"])


@router.post("/ingest")
async def ingest_sensor_data(
    data: SensorDataBatch,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Ingest sensor readings and run real-time anomaly detection."""

    # Verify equipment exists
    result = await db.execute(
        select(EquipmentModel).where(EquipmentModel.id == data.equipment_id)
    )
    equipment = result.scalar_one_or_none()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    timestamp = data.timestamp or datetime.now(timezone.utc)
    anomalies_detected = []
    saved_readings = []

    # Detect anomalies
    readings_for_detection = [r.model_dump() for r in data.readings]
    anomaly_results = predictive_agent.detect_anomalies(
        readings=readings_for_detection,
        equipment_type=equipment.equipment_type,
    )

    for reading, anomaly in zip(data.readings, anomaly_results):
        # Save reading
        db_reading = SensorReading(
            id=str(uuid.uuid4()),
            equipment_id=data.equipment_id,
            timestamp=timestamp,
            sensor_type=reading.sensor_type,
            value=reading.value,
            unit=reading.unit,
            is_anomaly=anomaly.is_anomaly,
            anomaly_score=anomaly.anomaly_score,
            threshold_min=reading.threshold_min,
            threshold_max=reading.threshold_max,
        )
        db.add(db_reading)
        saved_readings.append(db_reading.id)

        # Create alert for anomalies
        if anomaly.is_anomaly and anomaly.severity in ("alarm", "critical"):
            severity_map = {"alarm": "high", "critical": "critical"}
            db_alert = Alert(
                id=str(uuid.uuid4()),
                equipment_id=data.equipment_id,
                alert_type=f"sensor_anomaly_{reading.sensor_type}",
                severity=severity_map.get(anomaly.severity, "medium"),
                title=f"{anomaly.severity.upper()}: {reading.sensor_type} abnormal on {equipment.name}",
                description=anomaly.message,
                sensor_data={
                    reading.sensor_type: reading.value,
                    "unit": reading.unit,
                    "anomaly_score": anomaly.anomaly_score,
                },
                recommended_action=f"Inspect {equipment.name} - {reading.sensor_type} readings are {anomaly.severity}",
                triggered_at=timestamp,
            )
            db.add(db_alert)
            anomalies_detected.append({
                "sensor_type": reading.sensor_type,
                "severity": anomaly.severity,
                "message": anomaly.message,
                "alert_id": db_alert.id,
            })

    await db.commit()

    return {
        "readings_saved": len(saved_readings),
        "anomalies_detected": len(anomalies_detected),
        "anomaly_details": anomalies_detected,
        "timestamp": timestamp.isoformat(),
    }


@router.get("/equipment/{equipment_id}", response_model=List[dict])
async def get_equipment_sensor_history(
    equipment_id: str,
    sensor_type: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """Get sensor reading history for equipment."""
    query = (
        select(SensorReading)
        .where(SensorReading.equipment_id == equipment_id)
        .order_by(desc(SensorReading.timestamp))
        .limit(limit)
    )
    if sensor_type:
        query = query.where(SensorReading.sensor_type.ilike(f"%{sensor_type}%"))

    result = await db.execute(query)
    readings = result.scalars().all()

    return [
        {
            "id": r.id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "sensor_type": r.sensor_type,
            "value": r.value,
            "unit": r.unit,
            "is_anomaly": r.is_anomaly,
            "anomaly_score": r.anomaly_score,
        }
        for r in readings
    ]


@router.post("/equipment/{equipment_id}/rul")
async def estimate_rul(
    equipment_id: str,
    sensor_type: str = "vibration",
    db: AsyncSession = Depends(get_db),
):
    """Estimate Remaining Useful Life based on sensor history."""

    result = await db.execute(
        select(EquipmentModel).where(EquipmentModel.id == equipment_id)
    )
    equipment = result.scalar_one_or_none()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    # Get sensor history
    history_result = await db.execute(
        select(SensorReading)
        .where(
            SensorReading.equipment_id == equipment_id,
            SensorReading.sensor_type.ilike(f"%{sensor_type}%"),
        )
        .order_by(SensorReading.timestamp)
        .limit(100)
    )
    readings = history_result.scalars().all()

    if len(readings) < 3:
        return {
            "equipment_id": equipment_id,
            "sensor_type": sensor_type,
            "message": "Insufficient data for RUL estimation (need at least 3 readings)",
            "rul_days": None,
        }

    sensor_history = [
        {
            "value": r.value,
            "timestamp": r.timestamp,
            "sensor_type": r.sensor_type,
        }
        for r in readings
    ]

    rul = predictive_agent.estimate_rul(
        sensor_history=sensor_history,
        equipment_type=equipment.equipment_type,
    )

    return {
        "equipment_id": equipment_id,
        "equipment_name": equipment.name,
        "sensor_type": sensor_type,
        "rul_days": rul.rul_days,
        "confidence": rul.confidence,
        "trend": rul.trend,
        "degradation_rate_per_day": rul.degradation_rate,
        "failure_probability_7d": rul.failure_probability_7d,
        "failure_probability_30d": rul.failure_probability_30d,
        "method": rul.method,
    }
