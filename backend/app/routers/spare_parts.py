"""Spare parts management endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app.models.db_models import SparePart

router = APIRouter(prefix="/spare-parts", tags=["Spare Parts"])


@router.get("/")
async def list_spare_parts(
    is_critical: Optional[bool] = Query(None),
    low_stock: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(SparePart).order_by(SparePart.name)
    if is_critical is not None:
        query = query.where(SparePart.is_critical == is_critical)

    result = await db.execute(query)
    parts = result.scalars().all()

    output = []
    for p in parts:
        stock_status = "ok"
        if p.quantity_available <= 0:
            stock_status = "out_of_stock"
        elif p.quantity_available <= p.reorder_level:
            stock_status = "low_stock"

        if low_stock and stock_status == "ok":
            continue

        output.append({
            "id": p.id,
            "part_number": p.part_number,
            "name": p.name,
            "description": p.description,
            "quantity_available": p.quantity_available,
            "reorder_level": p.reorder_level,
            "stock_status": stock_status,
            "unit_cost": p.unit_cost,
            "supplier": p.supplier,
            "procurement_lead_days": p.procurement_lead_days,
            "location": p.location,
            "is_critical": p.is_critical,
            "equipment_compatibility": p.equipment_compatibility,
        })
    return output


@router.post("/")
async def create_spare_part(data: dict, db: AsyncSession = Depends(get_db)):
    part = SparePart(id=str(uuid.uuid4()), **data)
    db.add(part)
    await db.commit()
    await db.refresh(part)
    return {"id": part.id, "message": "Spare part added"}


@router.put("/{part_id}/stock")
async def update_stock(
    part_id: str,
    quantity: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SparePart).where(SparePart.id == part_id))
    part = result.scalar_one_or_none()
    if not part:
        raise HTTPException(status_code=404, detail="Part not found")
    part.quantity_available = quantity
    part.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Stock updated", "quantity_available": quantity}


@router.get("/stats")
async def spare_parts_stats(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SparePart))
    parts = result.scalars().all()
    total = len(parts)
    critical = sum(1 for p in parts if p.is_critical)
    low = sum(1 for p in parts if p.quantity_available <= p.reorder_level)
    out = sum(1 for p in parts if p.quantity_available <= 0)
    return {"total": total, "critical": critical, "low_stock": low, "out_of_stock": out}
