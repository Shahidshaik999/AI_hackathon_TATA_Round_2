"""Report generation endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.models.db_models import (
    Equipment as EquipmentModel,
    DiagnosisRecord,
    Alert,
    MaintenanceLog,
)
from app.schemas.schemas import ReportRequest
from app.agents.report_agent import report_agent
from app.agents.predictive_agent import predictive_agent

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/generate")
async def generate_report(
    request: ReportRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a maintenance report."""

    # Fetch equipment
    eq_result = await db.execute(
        select(EquipmentModel).where(EquipmentModel.id == request.equipment_id)
    )
    equipment = eq_result.scalar_one_or_none()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    date_from = request.date_from or (datetime.now(timezone.utc) - timedelta(days=30))
    date_to = request.date_to or datetime.now(timezone.utc)

    equipment_dict = {
        "id": equipment.id,
        "name": equipment.name,
        "equipment_type": equipment.equipment_type,
        "location": equipment.location,
        "plant_area": equipment.plant_area,
        "criticality": equipment.criticality,
    }

    if request.report_type == "maintenance_summary":
        # Fetch diagnoses
        diag_result = await db.execute(
            select(DiagnosisRecord)
            .where(DiagnosisRecord.equipment_id == request.equipment_id)
            .order_by(desc(DiagnosisRecord.created_at))
            .limit(20)
        )
        diagnoses = [
            {
                "created_at": str(r.created_at),
                "diagnosis": r.diagnosis,
                "risk_level": r.risk_level.value if r.risk_level else "medium",
                "confidence_score": r.confidence_score,
            }
            for r in diag_result.scalars().all()
        ]

        # Fetch alerts
        alert_result = await db.execute(
            select(Alert)
            .where(Alert.equipment_id == request.equipment_id)
            .order_by(desc(Alert.triggered_at))
            .limit(20)
        )
        alerts = [
            {
                "severity": a.severity.value if a.severity else "medium",
                "status": a.status.value if a.status else "active",
                "title": a.title,
            }
            for a in alert_result.scalars().all()
        ]

        # Fetch maintenance logs
        log_result = await db.execute(
            select(MaintenanceLog)
            .where(MaintenanceLog.equipment_id == request.equipment_id)
            .order_by(desc(MaintenanceLog.timestamp))
            .limit(10)
        )
        logs = [
            {
                "timestamp": str(log.timestamp),
                "maintenance_type": log.maintenance_type,
                "description": log.description,
            }
            for log in log_result.scalars().all()
        ]

        # Calculate health score (simple estimate)
        active_alerts = len([a for a in alerts if a.get("status") == "active"])
        critical_alerts = len([a for a in alerts if a.get("severity") == "critical"])
        health_score = max(0, 100 - (critical_alerts * 20) - (active_alerts * 5))

        report = await report_agent.generate_maintenance_summary(
            equipment=equipment_dict,
            diagnoses=diagnoses,
            alerts=alerts,
            maintenance_logs=logs,
            health_score=health_score,
            date_from=date_from,
            date_to=date_to,
        )

        return report

    if request.report_type in ("rca", "root_cause_analysis"):
        # Root Cause Analysis Report — uses latest diagnosis
        diag_result = await db.execute(
            select(DiagnosisRecord)
            .where(DiagnosisRecord.equipment_id == request.equipment_id)
            .order_by(desc(DiagnosisRecord.created_at))
            .limit(5)
        )
        diagnoses = diag_result.scalars().all()

        alert_result = await db.execute(
            select(Alert)
            .where(Alert.equipment_id == request.equipment_id)
            .order_by(desc(Alert.triggered_at))
            .limit(10)
        )
        alerts = [
            {"severity": a.severity.value if a.severity else "medium",
             "status": a.status.value if a.status else "active",
             "title": a.title, "description": a.description}
            for a in alert_result.scalars().all()
        ]

        # Build RCA report content
        diag_list = []
        for d in diagnoses:
            diag_list.append({
                "created_at": str(d.created_at),
                "diagnosis": d.diagnosis,
                "risk_level": d.risk_level.value if d.risk_level else "medium",
                "root_causes": d.root_causes or [],
                "immediate_actions": d.immediate_actions or [],
                "recommendations": d.recommendations or [],
                "confidence_score": d.confidence_score,
                "rul_days": d.rul_estimate,
            })

        active_alerts = len([a for a in alerts if a.get("status") == "active"])
        critical_alerts = len([a for a in alerts if a.get("severity") == "critical"])
        health_score = max(0, 100 - critical_alerts * 20 - active_alerts * 5)

        report = await report_agent.generate_maintenance_summary(
            equipment=equipment_dict,
            diagnoses=diag_list,
            alerts=alerts,
            maintenance_logs=[],
            health_score=health_score,
            date_from=date_from,
            date_to=date_to,
        )
        report["report_type"] = "root_cause_analysis"
        return report

    if request.report_type in ("health_status", "health_report"):
        # Equipment Health Status Report
        alert_result = await db.execute(
            select(Alert)
            .where(Alert.equipment_id == request.equipment_id)
            .order_by(desc(Alert.triggered_at))
            .limit(20)
        )
        alerts_raw = alert_result.scalars().all()
        alerts = [
            {"severity": a.severity.value if a.severity else "medium",
             "status": a.status.value if a.status else "active",
             "title": a.title}
            for a in alerts_raw
        ]

        diag_result = await db.execute(
            select(DiagnosisRecord)
            .where(DiagnosisRecord.equipment_id == request.equipment_id)
            .order_by(desc(DiagnosisRecord.created_at))
            .limit(10)
        )
        diagnoses = [
            {"created_at": str(r.created_at), "diagnosis": r.diagnosis,
             "risk_level": r.risk_level.value if r.risk_level else "medium",
             "rul_days": r.rul_estimate, "confidence_score": r.confidence_score}
            for r in diag_result.scalars().all()
        ]

        log_result = await db.execute(
            select(MaintenanceLog)
            .where(MaintenanceLog.equipment_id == request.equipment_id)
            .order_by(desc(MaintenanceLog.timestamp))
            .limit(5)
        )
        logs = [
            {"timestamp": str(l.timestamp), "maintenance_type": l.maintenance_type,
             "description": l.description, "outcome": l.outcome}
            for l in log_result.scalars().all()
        ]

        active = len([a for a in alerts if a.get("status") == "active"])
        critical = len([a for a in alerts if a.get("severity") == "critical"])
        health_score = max(0, 100 - critical * 20 - active * 5)

        report = await report_agent.generate_maintenance_summary(
            equipment=equipment_dict,
            diagnoses=diagnoses,
            alerts=alerts,
            maintenance_logs=logs,
            health_score=health_score,
            date_from=date_from,
            date_to=date_to,
        )
        report["report_type"] = "health_status_report"
        return report

    raise HTTPException(status_code=400, detail=f"Unsupported report type: {request.report_type}. Use: maintenance_summary, rca, health_status")


@router.get("/equipment/{equipment_id}/health")
async def get_equipment_health(
    equipment_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get current health score and status for equipment."""

    eq_result = await db.execute(
        select(EquipmentModel).where(EquipmentModel.id == equipment_id)
    )
    equipment = eq_result.scalar_one_or_none()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    # Active alerts count
    alert_result = await db.execute(
        select(Alert)
        .where(Alert.equipment_id == equipment_id, Alert.status == "active")
        .order_by(desc(Alert.triggered_at))
        .limit(10)
    )
    active_alerts = alert_result.scalars().all()
    critical_count = sum(1 for a in active_alerts if a.severity and a.severity.value == "critical")

    # Last diagnosis
    diag_result = await db.execute(
        select(DiagnosisRecord)
        .where(DiagnosisRecord.equipment_id == equipment_id)
        .order_by(desc(DiagnosisRecord.created_at))
        .limit(1)
    )
    last_diag = diag_result.scalar_one_or_none()

    # Health score calculation
    health_score = 100.0
    health_score -= critical_count * 20
    health_score -= (len(active_alerts) - critical_count) * 10
    if last_diag:
        risk_deductions = {"critical": 25, "high": 15, "medium": 5, "low": 0}
        risk_val = last_diag.risk_level.value if last_diag.risk_level else "medium"
        health_score -= risk_deductions.get(risk_val, 5)
    health_score = max(0, min(100, health_score))

    if health_score >= 80:
        risk_level = "low"
    elif health_score >= 60:
        risk_level = "medium"
    elif health_score >= 35:
        risk_level = "high"
    else:
        risk_level = "critical"

    return {
        "equipment_id": equipment_id,
        "equipment_name": equipment.name,
        "equipment_type": equipment.equipment_type,
        "health_score": round(health_score, 1),
        "risk_level": risk_level,
        "active_alerts": len(active_alerts),
        "critical_alerts": critical_count,
        "last_maintenance": equipment.last_maintenance_date.isoformat() if equipment.last_maintenance_date else None,
        "rul_days": last_diag.rul_estimate if last_diag else None,
        "last_diagnosis_date": last_diag.created_at.isoformat() if last_diag and last_diag.created_at else None,
        "key_concerns": [a.title for a in active_alerts[:3]],
        "trend": "stable",
    }
