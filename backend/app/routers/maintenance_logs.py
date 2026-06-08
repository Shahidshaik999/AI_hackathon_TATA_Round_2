"""Maintenance log (digital logbook) endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app.models.db_models import MaintenanceLog, Equipment as EquipmentModel

router = APIRouter(prefix="/maintenance-logs", tags=["Maintenance Logs"])


@router.get("/")
async def list_logs(
    equipment_id: Optional[str] = None,
    maintenance_type: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    query = select(MaintenanceLog).order_by(desc(MaintenanceLog.timestamp)).limit(limit)
    if equipment_id:
        query = query.where(MaintenanceLog.equipment_id == equipment_id)
    if maintenance_type:
        query = query.where(MaintenanceLog.maintenance_type == maintenance_type)

    result = await db.execute(query)
    logs = result.scalars().all()

    output = []
    for log in logs:
        eq_res = await db.execute(
            select(EquipmentModel).where(EquipmentModel.id == log.equipment_id)
        )
        eq = eq_res.scalar_one_or_none()
        output.append({
            "id": log.id,
            "equipment_id": log.equipment_id,
            "equipment_name": eq.name if eq else "Unknown",
            "plant_area": eq.plant_area if eq else "Unknown",
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "maintenance_type": log.maintenance_type,
            "description": log.description,
            "technician": log.technician,
            "duration_hours": log.duration_hours,
            "parts_replaced": log.parts_replaced,
            "root_cause": log.root_cause,
            "actions_taken": log.actions_taken,
            "outcome": log.outcome,
            "cost": log.cost,
            "next_maintenance_due": log.next_maintenance_due.isoformat() if log.next_maintenance_due else None,
        })
    return output


@router.post("/")
async def create_log(data: dict, db: AsyncSession = Depends(get_db)):
    """Create a new digital maintenance log entry."""
    equipment_id = data.get("equipment_id")
    if not equipment_id:
        raise HTTPException(status_code=400, detail="equipment_id is required")

    eq_res = await db.execute(
        select(EquipmentModel).where(EquipmentModel.id == equipment_id)
    )
    eq = eq_res.scalar_one_or_none()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment not found")

    # Update equipment last_maintenance_date
    eq.last_maintenance_date = datetime.now(timezone.utc)

    log = MaintenanceLog(
        id=str(uuid.uuid4()),
        equipment_id=equipment_id,
        timestamp=datetime.now(timezone.utc),
        maintenance_type=data.get("maintenance_type", "corrective"),
        description=data.get("description", ""),
        technician=data.get("technician", ""),
        duration_hours=data.get("duration_hours"),
        parts_replaced=data.get("parts_replaced", []),
        cost=data.get("cost"),
        root_cause=data.get("root_cause", ""),
        actions_taken=data.get("actions_taken", ""),
        outcome=data.get("outcome", "completed"),
    )
    db.add(log)
    await db.commit()
    return {"id": log.id, "message": "Maintenance log entry created"}


@router.get("/equipment/{equipment_id}/summary")
async def equipment_log_summary(equipment_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MaintenanceLog)
        .where(MaintenanceLog.equipment_id == equipment_id)
        .order_by(desc(MaintenanceLog.timestamp))
    )
    logs = result.scalars().all()

    type_counts = {}
    total_cost = 0
    total_hours = 0
    for log in logs:
        t = log.maintenance_type or "unknown"
        type_counts[t] = type_counts.get(t, 0) + 1
        total_cost += log.cost or 0
        total_hours += log.duration_hours or 0

    return {
        "equipment_id": equipment_id,
        "total_entries": len(logs),
        "by_type": type_counts,
        "total_cost": round(total_cost, 2),
        "total_hours": round(total_hours, 2),
        "last_entry": logs[0].timestamp.isoformat() if logs else None,
    }
