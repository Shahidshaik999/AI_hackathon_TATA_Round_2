"""Dashboard endpoints - aggregated statistics and health overview."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timezone, timedelta
from typing import List

from app.database import get_db
from app.models.db_models import Equipment as EquipmentModel, Alert, DiagnosisRecord, MaintenanceLog

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Get comprehensive dashboard statistics."""

    # Equipment counts
    total_eq = await db.execute(select(func.count(EquipmentModel.id)).where(EquipmentModel.is_active == True))
    total_equipment = total_eq.scalar() or 0

    # Alerts
    active_alerts = await db.execute(
        select(func.count(Alert.id)).where(Alert.status == "active")
    )
    active_alert_count = active_alerts.scalar() or 0

    critical_alerts = await db.execute(
        select(func.count(Alert.id)).where(Alert.severity == "critical", Alert.status == "active")
    )
    critical_alert_count = critical_alerts.scalar() or 0

    # Diagnoses today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
    today_diag = await db.execute(
        select(func.count(DiagnosisRecord.id)).where(DiagnosisRecord.created_at >= today_start)
    )
    diagnoses_today = today_diag.scalar() or 0

    # Recent alerts
    recent_alert_result = await db.execute(
        select(Alert)
        .where(Alert.status == "active")
        .order_by(desc(Alert.triggered_at))
        .limit(10)
    )
    recent_alerts = []
    for alert in recent_alert_result.scalars().all():
        eq_result = await db.execute(
            select(EquipmentModel).where(EquipmentModel.id == alert.equipment_id)
        )
        eq = eq_result.scalar_one_or_none()
        recent_alerts.append({
            "id": alert.id,
            "equipment_name": eq.name if eq else "Unknown",
            "plant_area": eq.plant_area if eq else "Unknown",
            "severity": alert.severity.value if alert.severity else "medium",
            "title": alert.title,
            "triggered_at": alert.triggered_at.isoformat() if alert.triggered_at else None,
        })

    # Equipment health scores
    eq_result = await db.execute(
        select(EquipmentModel).where(EquipmentModel.is_active == True).limit(20)
    )
    equipment_list = eq_result.scalars().all()

    equipment_health = []
    health_distribution = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    for eq in equipment_list:
        # Get alert count for this equipment
        eq_alerts = await db.execute(
            select(func.count(Alert.id)).where(
                Alert.equipment_id == eq.id, Alert.status == "active"
            )
        )
        eq_critical = await db.execute(
            select(func.count(Alert.id)).where(
                Alert.equipment_id == eq.id,
                Alert.status == "active",
                Alert.severity == "critical",
            )
        )
        alert_cnt = eq_alerts.scalar() or 0
        critical_cnt = eq_critical.scalar() or 0

        health = max(0, 100 - critical_cnt * 20 - (alert_cnt - critical_cnt) * 8)

        if health >= 80:
            risk = "low"
        elif health >= 60:
            risk = "medium"
        elif health >= 35:
            risk = "high"
        else:
            risk = "critical"

        health_distribution[risk] += 1

        equipment_health.append({
            "equipment_id": eq.id,
            "equipment_name": eq.name,
            "equipment_type": eq.equipment_type,
            "plant_area": eq.plant_area,
            "health_score": health,
            "risk_level": risk,
            "active_alerts": alert_cnt,
        })

    # Average health
    avg_health = (
        sum(e["health_score"] for e in equipment_health) / len(equipment_health)
        if equipment_health else 100
    )

    return {
        "total_equipment": total_equipment,
        "active_alerts": active_alert_count,
        "critical_alerts": critical_alert_count,
        "equipment_health_avg": round(avg_health, 1),
        "diagnoses_today": diagnoses_today,
        "equipment_health_distribution": health_distribution,
        "recent_alerts": recent_alerts,
        "equipment_health_scores": sorted(equipment_health, key=lambda x: x["health_score"]),
    }


@router.get("/activity")
async def get_recent_activity(db: AsyncSession = Depends(get_db)):
    """Get recent system activity feed."""
    activities = []

    # Recent alerts
    alert_result = await db.execute(
        select(Alert).order_by(desc(Alert.triggered_at)).limit(5)
    )
    for alert in alert_result.scalars().all():
        activities.append({
            "type": "alert",
            "severity": alert.severity.value if alert.severity else "medium",
            "title": alert.title,
            "timestamp": alert.triggered_at.isoformat() if alert.triggered_at else None,
        })

    # Recent diagnoses
    diag_result = await db.execute(
        select(DiagnosisRecord).order_by(desc(DiagnosisRecord.created_at)).limit(5)
    )
    for diag in diag_result.scalars().all():
        activities.append({
            "type": "diagnosis",
            "severity": diag.risk_level.value if diag.risk_level else "medium",
            "title": f"Diagnosis: {(diag.diagnosis or 'Analysis completed')[:80]}",
            "timestamp": diag.created_at.isoformat() if diag.created_at else None,
        })

    # Sort by timestamp
    activities.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return activities[:15]


@router.get("/priority")
async def get_plant_priority(db: AsyncSession = Depends(get_db)):
    """
    Bottleneck prioritization across all plant equipment.
    Ranks equipment by combined risk: criticality + active alerts + RUL + maintenance overdue.
    """
    from app.models.db_models import SparePart, DiagnosisRecord
    from sqlalchemy import and_

    eq_result = await db.execute(
        select(EquipmentModel).where(EquipmentModel.is_active == True)
    )
    equipment_list = eq_result.scalars().all()

    priority_list = []

    for eq in equipment_list:
        # Count active alerts
        alert_res = await db.execute(
            select(Alert).where(
                Alert.equipment_id == eq.id,
                Alert.status == "active"
            ).order_by(desc(Alert.triggered_at))
        )
        alerts = alert_res.scalars().all()
        critical_alerts = sum(1 for a in alerts if a.severity and a.severity.value == "critical")
        high_alerts = sum(1 for a in alerts if a.severity and a.severity.value == "high")

        # Latest diagnosis
        diag_res = await db.execute(
            select(DiagnosisRecord)
            .where(DiagnosisRecord.equipment_id == eq.id)
            .order_by(desc(DiagnosisRecord.created_at))
            .limit(1)
        )
        last_diag = diag_res.scalar_one_or_none()

        # RUL from latest diagnosis
        rul_days = last_diag.rul_estimate if last_diag else None
        risk_level = last_diag.risk_level.value if last_diag and last_diag.risk_level else "medium"

        # Criticality score
        crit_map = {"critical": 4, "high": 3, "medium": 2, "low": 1}
        crit_score = crit_map.get(eq.criticality, 2)

        # Composite priority score (higher = more urgent)
        priority_score = (
            crit_score * 10
            + critical_alerts * 30
            + high_alerts * 15
            + (25 if rul_days is not None and rul_days < 7 else 0)
            + (15 if rul_days is not None and rul_days < 30 else 0)
            + (20 if risk_level == "critical" else 10 if risk_level == "high" else 0)
        )

        # Days since last maintenance
        days_since_maint = None
        if eq.last_maintenance_date:
            delta = datetime.now(timezone.utc) - eq.last_maintenance_date.replace(tzinfo=timezone.utc)
            days_since_maint = delta.days

        # Spare parts availability for this equipment type
        spare_res = await db.execute(
            select(SparePart).where(
                SparePart.is_critical == True
            )
        )
        critical_spares = spare_res.scalars().all()
        spares_ok = all(s.quantity_available > s.reorder_level for s in critical_spares)

        priority_list.append({
            "equipment_id": eq.id,
            "equipment_name": eq.name,
            "equipment_type": eq.equipment_type,
            "plant_area": eq.plant_area,
            "criticality": eq.criticality,
            "priority_score": priority_score,
            "active_alerts": len(alerts),
            "critical_alerts": critical_alerts,
            "risk_level": risk_level,
            "rul_days": rul_days,
            "days_since_maintenance": days_since_maint,
            "critical_spares_available": spares_ok,
            "recommended_action": (
                "IMMEDIATE SHUTDOWN & REPAIR" if critical_alerts > 0 and risk_level == "critical"
                else "URGENT: Schedule within 24h" if critical_alerts > 0 or (rul_days is not None and rul_days < 7)
                else "PLAN: Schedule within 1 week" if high_alerts > 0 or (rul_days is not None and rul_days < 30)
                else "MONITOR: Normal operations"
            ),
        })

    # Sort by priority score descending
    priority_list.sort(key=lambda x: x["priority_score"], reverse=True)
    return priority_list
