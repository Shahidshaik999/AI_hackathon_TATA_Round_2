"""Diagnosis endpoints - fault diagnosis, RCA, RUL prediction."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app.models.db_models import (
    Equipment as EquipmentModel,
    DiagnosisRecord,
    MaintenanceLog,
    SensorReading,
)
from app.schemas.schemas import DiagnosisRequest, DiagnosisResponse, FeedbackRequest
from app.agents.diagnostic_agent import diagnostic_agent
from app.agents.predictive_agent import predictive_agent

router = APIRouter(prefix="/diagnosis", tags=["Diagnosis"])


@router.post("/", response_model=dict)
async def run_diagnosis(
    request: DiagnosisRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Run comprehensive AI-powered fault diagnosis."""

    # Fetch equipment
    result = await db.execute(
        select(EquipmentModel).where(EquipmentModel.id == request.equipment_id)
    )
    equipment = result.scalar_one_or_none()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    # Fetch maintenance history
    history_result = await db.execute(
        select(MaintenanceLog)
        .where(MaintenanceLog.equipment_id == request.equipment_id)
        .order_by(desc(MaintenanceLog.timestamp))
        .limit(10)
    )
    maintenance_history = [
        {
            "timestamp": str(log.timestamp),
            "maintenance_type": log.maintenance_type,
            "description": log.description,
            "root_cause": log.root_cause,
            "outcome": log.outcome,
        }
        for log in history_result.scalars().all()
    ]

    # Fetch recent sensor readings
    sensor_result = await db.execute(
        select(SensorReading)
        .where(SensorReading.equipment_id == request.equipment_id)
        .order_by(desc(SensorReading.timestamp))
        .limit(50)
    )
    sensor_readings = sensor_result.scalars().all()

    # Build sensor data summary
    sensor_data = request.sensor_data or {}
    if sensor_readings and not sensor_data:
        # Use latest readings
        latest_by_type = {}
        for sr in sensor_readings:
            if sr.sensor_type not in latest_by_type:
                latest_by_type[sr.sensor_type] = sr.value
        sensor_data = latest_by_type

    # Run diagnosis
    equipment_dict = {
        "id": equipment.id,
        "name": equipment.name,
        "equipment_type": equipment.equipment_type,
        "location": equipment.location,
        "plant_area": equipment.plant_area,
        "criticality": equipment.criticality,
        "manufacturer": equipment.manufacturer,
        "last_maintenance_date": str(equipment.last_maintenance_date) if equipment.last_maintenance_date else None,
    }

    diagnosis_result = await diagnostic_agent.diagnose(
        query=request.query,
        equipment=equipment_dict,
        sensor_data=sensor_data,
        maintenance_history=maintenance_history,
        fault_description=request.fault_description,
    )

    # RUL prediction if requested
    if request.include_rul and len(sensor_readings) >= 3:
        # Group by sensor type for trend analysis
        vibration_readings = [
            {
                "value": sr.value,
                "timestamp": sr.timestamp,
                "sensor_type": sr.sensor_type,
            }
            for sr in sensor_readings
            if "vibration" in sr.sensor_type.lower()
        ]
        if vibration_readings:
            rul_result = predictive_agent.estimate_rul(
                sensor_history=vibration_readings,
                equipment_type=equipment.equipment_type,
            )
            if diagnosis_result.get("rul_estimate_days") is None:
                diagnosis_result["rul_estimate_days"] = rul_result.rul_days
                diagnosis_result["rul_confidence"] = rul_result.confidence

    # Save to database
    diagnosis_id = str(uuid.uuid4())
    db_record = DiagnosisRecord(
        id=diagnosis_id,
        equipment_id=request.equipment_id,
        query=request.query,
        diagnosis=diagnosis_result.get("diagnosis"),
        root_causes=diagnosis_result.get("root_causes", []),
        risk_level=diagnosis_result.get("risk_level", "medium"),
        rul_estimate=diagnosis_result.get("rul_estimate_days"),
        confidence_score=diagnosis_result.get("confidence_score", 0.5),
        recommendations=diagnosis_result.get("recommendations", []),
        immediate_actions=diagnosis_result.get("immediate_actions", []),
        long_term_actions=diagnosis_result.get("long_term_actions", []),
        spare_parts_needed=diagnosis_result.get("spare_parts_needed", []),
        sources_used=diagnosis_result.get("sources_used", []),
        agent_trace=diagnosis_result.get("agent_trace", []),
        session_id=request.session_id,
    )
    db.add(db_record)
    await db.commit()

    return {
        "id": diagnosis_id,
        "equipment_id": request.equipment_id,
        "equipment_name": equipment.name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **diagnosis_result,
    }


@router.get("/equipment/{equipment_id}", response_model=List[dict])
async def get_equipment_diagnoses(
    equipment_id: str,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Get diagnosis history for an equipment."""
    result = await db.execute(
        select(DiagnosisRecord)
        .where(DiagnosisRecord.equipment_id == equipment_id)
        .order_by(desc(DiagnosisRecord.created_at))
        .limit(limit)
    )
    records = result.scalars().all()
    return [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "query": r.query,
            "diagnosis": r.diagnosis,
            "risk_level": r.risk_level.value if r.risk_level else None,
            "confidence_score": r.confidence_score,
            "rul_estimate_days": r.rul_estimate,
            "immediate_actions": r.immediate_actions,
            "feedback_score": r.feedback_score,
        }
        for r in records
    ]


@router.post("/feedback")
async def submit_feedback(
    feedback: FeedbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """Submit feedback on a diagnosis for continuous improvement."""
    result = await db.execute(
        select(DiagnosisRecord).where(DiagnosisRecord.id == feedback.diagnosis_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Diagnosis record not found")

    record.feedback_score = feedback.score
    record.feedback_comment = feedback.comment
    await db.commit()

    return {"message": "Feedback recorded. Thank you for helping improve the system."}
