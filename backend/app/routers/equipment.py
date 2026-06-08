"""Equipment management endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.database import get_db
from app.models.db_models import Equipment as EquipmentModel
from app.schemas.schemas import EquipmentCreate, EquipmentResponse

router = APIRouter(prefix="/equipment", tags=["Equipment"])


@router.post("/", response_model=EquipmentResponse)
async def create_equipment(
    equipment: EquipmentCreate,
    db: AsyncSession = Depends(get_db),
):
    db_equipment = EquipmentModel(
        id=str(uuid.uuid4()),
        **equipment.model_dump(),
    )
    db.add(db_equipment)
    await db.commit()
    await db.refresh(db_equipment)
    return db_equipment


@router.get("/", response_model=List[EquipmentResponse])
async def list_equipment(
    plant_area: Optional[str] = Query(None),
    equipment_type: Optional[str] = Query(None),
    is_active: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    query = select(EquipmentModel).where(EquipmentModel.is_active == is_active)
    if plant_area:
        query = query.where(EquipmentModel.plant_area == plant_area)
    if equipment_type:
        query = query.where(EquipmentModel.equipment_type.ilike(f"%{equipment_type}%"))

    result = await db.execute(query.order_by(EquipmentModel.name))
    return result.scalars().all()


@router.get("/{equipment_id}", response_model=EquipmentResponse)
async def get_equipment(equipment_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EquipmentModel).where(EquipmentModel.id == equipment_id)
    )
    equipment = result.scalar_one_or_none()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    return equipment


@router.put("/{equipment_id}", response_model=EquipmentResponse)
async def update_equipment(
    equipment_id: str,
    updates: EquipmentCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EquipmentModel).where(EquipmentModel.id == equipment_id)
    )
    equipment = result.scalar_one_or_none()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(equipment, field, value)
    equipment.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(equipment)
    return equipment


@router.delete("/{equipment_id}")
async def deactivate_equipment(
    equipment_id: str, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(EquipmentModel).where(EquipmentModel.id == equipment_id)
    )
    equipment = result.scalar_one_or_none()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    equipment.is_active = False
    await db.commit()
    return {"message": "Equipment deactivated successfully"}
