"""Alert management endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.db_models import Alert, Equipment as EquipmentModel
from app.schemas.schemas import AlertResponse, AlertAcknowledge, RiskLevel

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/", response_model=List[dict])
async def list_alerts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    equipment_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List alerts with filters."""
    query = select(Alert).order_by(desc(Alert.triggered_at)).limit(limit)

    if status:
        query = query.where(Alert.status == status)
    if severity:
        query = query.where(Alert.severity == severity)
    if equipment_id:
        query = query.where(Alert.equipment_id == equipment_id)

    result = await db.execute(query)
    alerts = result.scalars().all()

    # Enrich with equipment names
    enriched = []
    for alert in alerts:
        eq_result = await db.execute(
            select(EquipmentModel).where(EquipmentModel.id == alert.equipment_id)
        )
        eq = eq_result.scalar_one_or_none()
        enriched.append({
            "id": alert.id,
            "equipment_id": alert.equipment_id,
            "equipment_name": eq.name if eq else "Unknown",
            "plant_area": eq.plant_area if eq else "Unknown",
            "alert_type": alert.alert_type,
            "severity": alert.severity.value if alert.severity else "medium",
            "status": alert.status.value if alert.status else "active",
            "title": alert.title,
            "description": alert.description,
            "triggered_at": alert.triggered_at.isoformat() if alert.triggered_at else None,
            "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
            "ai_analysis": alert.ai_analysis,
            "recommended_action": alert.recommended_action,
        })

    return enriched


@router.get("/stats")
async def get_alert_stats(db: AsyncSession = Depends(get_db)):
    """Get alert statistics for dashboard."""
    total_result = await db.execute(select(func.count(Alert.id)))
    total = total_result.scalar()

    active_result = await db.execute(
        select(func.count(Alert.id)).where(Alert.status == "active")
    )
    active = active_result.scalar()

    critical_result = await db.execute(
        select(func.count(Alert.id)).where(
            Alert.severity == "critical", Alert.status == "active"
        )
    )
    critical = critical_result.scalar()

    high_result = await db.execute(
        select(func.count(Alert.id)).where(
            Alert.severity == "high", Alert.status == "active"
        )
    )
    high = high_result.scalar()

    return {
        "total": total,
        "active": active,
        "critical": critical,
        "high": high,
        "medium": active - critical - high,
    }


@router.get("/{alert_id}")
async def get_alert(alert_id: str, db: AsyncSession = Depends(get_db)):
    """Get specific alert details."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    eq_result = await db.execute(
        select(EquipmentModel).where(EquipmentModel.id == alert.equipment_id)
    )
    equipment = eq_result.scalar_one_or_none()

    return {
        "id": alert.id,
        "equipment_id": alert.equipment_id,
        "equipment_name": equipment.name if equipment else "Unknown",
        "alert_type": alert.alert_type,
        "severity": alert.severity.value if alert.severity else "medium",
        "status": alert.status.value if alert.status else "active",
        "title": alert.title,
        "description": alert.description,
        "triggered_at": alert.triggered_at.isoformat() if alert.triggered_at else None,
        "sensor_data": alert.sensor_data,
        "ai_analysis": alert.ai_analysis,
        "recommended_action": alert.recommended_action,
    }


@router.post("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    body: AlertAcknowledge,
    db: AsyncSession = Depends(get_db),
):
    """Acknowledge an alert."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.now(timezone.utc)
    alert.acknowledged_by = body.acknowledged_by
    await db.commit()

    return {"message": "Alert acknowledged successfully"}


@router.post("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Mark alert as resolved."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "resolved"
    alert.resolved_at = datetime.now(timezone.utc)
    await db.commit()

    return {"message": "Alert resolved successfully"}
