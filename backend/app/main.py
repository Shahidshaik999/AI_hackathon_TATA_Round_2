"""
Maintenance Wizard - Intelligent Industrial AI System
Tata Steel AI Hackathon 2026

Main FastAPI application entry point.
"""
import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.config import settings
from app.database import init_db
from app.agents.knowledge_agent import knowledge_agent
from app.routers import equipment, diagnosis, sensors, chat, alerts, reports, knowledge, dashboard
from app.routers import spare_parts, maintenance_logs

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("=" * 60)
    logger.info("  Maintenance Wizard - Starting Up")
    logger.info("  Tata Steel AI Hackathon 2026")
    logger.info("=" * 60)

    # Initialize database
    try:
        await init_db()
        logger.info("✓ Database initialized")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")

    # Initialize knowledge base
    try:
        await knowledge_agent.initialize()
        logger.info("✓ Knowledge base initialized")
    except Exception as e:
        logger.warning(f"Knowledge base initialization warning: {e}")

    # Seed demo data if empty
    try:
        await seed_demo_data()
        logger.info("✓ Demo data seeded")
    except Exception as e:
        logger.warning(f"Demo data seeding: {e}")

    logger.info("✓ Maintenance Wizard ready!")
    logger.info(f"  API: http://localhost:8000")
    logger.info(f"  Docs: http://localhost:8000/docs")

    yield

    logger.info("Maintenance Wizard shutting down...")


app = FastAPI(
    title="Maintenance Wizard API",
    description="Intelligent Industrial Maintenance AI System for Steel Manufacturing",
    version=settings.version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins including Vercel deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include routers
app.include_router(equipment.router, prefix="/api/v1")
app.include_router(diagnosis.router, prefix="/api/v1")
app.include_router(sensors.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(knowledge.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(spare_parts.router, prefix="/api/v1")
app.include_router(maintenance_logs.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "app": "Maintenance Wizard",
        "version": settings.version,
        "description": "Intelligent Industrial Maintenance AI System",
        "status": "operational",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "knowledge_base": knowledge_agent._initialized,
    }


async def seed_demo_data():
    """Seed the database with realistic demo data for steel plant."""
    from app.database import AsyncSessionLocal
    from app.models.db_models import Equipment as EquipmentModel, SensorReading, MaintenanceLog, Alert, SparePart
    from sqlalchemy import select, func
    import uuid
    from datetime import timedelta
    import random

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        count_result = await db.execute(select(func.count(EquipmentModel.id)))
        if count_result.scalar() > 0:
            return

        logger.info("Seeding demo data for steel plant...")

        # Demo equipment
        equipment_list = [
            {
                "name": "Blast Furnace #1 - Main Drive",
                "equipment_type": "motor",
                "location": "BF-1 Casthouse",
                "plant_area": "Blast Furnace",
                "criticality": "critical",
                "manufacturer": "Siemens",
                "model_number": "1LA8-2452",
                "specifications": {"power_kw": 450, "speed_rpm": 1480, "voltage_v": 6600},
            },
            {
                "name": "CCM Segment Roll Bearing - Strand 2",
                "equipment_type": "bearing",
                "location": "Continuous Casting Machine",
                "plant_area": "Steel Melting Shop",
                "criticality": "critical",
                "manufacturer": "SKF",
                "model_number": "23280CA/W33",
                "specifications": {"bore_mm": 400, "load_rating_kn": 2800},
            },
            {
                "name": "Hot Strip Mill Work Roll Drive",
                "equipment_type": "gearbox",
                "location": "HSM Stand F3",
                "plant_area": "Hot Rolling Mill",
                "criticality": "high",
                "manufacturer": "Flender",
                "model_number": "B3SH-400",
                "specifications": {"ratio": 4.5, "input_speed_rpm": 960, "oil_type": "ISO VG 220"},
            },
            {
                "name": "EAF Transformer Cooling Pump",
                "equipment_type": "pump",
                "location": "EAF Bay 2",
                "plant_area": "Steel Melting Shop",
                "criticality": "high",
                "manufacturer": "KSB",
                "model_number": "Etanorm 100-080",
                "specifications": {"flow_m3h": 180, "head_m": 45, "power_kw": 37},
            },
            {
                "name": "Sinter Plant Exhaust Fan",
                "equipment_type": "fan",
                "location": "Sinter Plant",
                "plant_area": "Raw Material Handling",
                "criticality": "high",
                "manufacturer": "ABB",
                "model_number": "M3BP-315",
                "specifications": {"power_kw": 250, "speed_rpm": 740, "airflow_m3h": 150000},
            },
            {
                "name": "Ladle Crane Main Hoist",
                "equipment_type": "crane",
                "location": "SMS Bay 1",
                "plant_area": "Steel Melting Shop",
                "criticality": "critical",
                "manufacturer": "Demag",
                "model_number": "LHC-300T",
                "specifications": {"capacity_tons": 300, "span_m": 32, "lift_height_m": 18},
            },
            {
                "name": "Hydraulic System - CCM Mold Oscillation",
                "equipment_type": "hydraulic",
                "location": "CCM Control Room",
                "plant_area": "Steel Melting Shop",
                "criticality": "critical",
                "manufacturer": "Bosch Rexroth",
                "model_number": "A10VSO-140",
                "specifications": {"pressure_bar": 280, "flow_lpm": 140, "oil_volume_l": 500},
            },
            {
                "name": "Coke Oven Pusher Machine Drive",
                "equipment_type": "motor",
                "location": "Coke Oven Battery 2",
                "plant_area": "Coke Oven",
                "criticality": "medium",
                "manufacturer": "ABB",
                "model_number": "M2BAX-280",
                "specifications": {"power_kw": 132, "speed_rpm": 1485},
            },
        ]

        equipment_ids = []
        for eq_data in equipment_list:
            eq = EquipmentModel(
                id=str(uuid.uuid4()),
                last_maintenance_date=datetime.now(timezone.utc) - timedelta(days=random.randint(30, 180)),
                **eq_data,
            )
            db.add(eq)
            equipment_ids.append(eq.id)

        await db.flush()

        # Add realistic sensor readings
        sensor_configs = {
            "motor": [
                ("vibration_mm_s", 0.5, 12.0, "mm/s"),
                ("temperature_c", 35, 95, "°C"),
                ("current_a", 50, 200, "A"),
            ],
            "bearing": [
                ("vibration_mm_s", 0.3, 15.0, "mm/s"),
                ("temperature_c", 40, 100, "°C"),
            ],
            "gearbox": [
                ("vibration_mm_s", 1.0, 12.0, "mm/s"),
                ("oil_temperature_c", 40, 85, "°C"),
                ("oil_pressure_bar", 2.0, 6.0, "bar"),
            ],
            "pump": [
                ("vibration_mm_s", 0.5, 8.0, "mm/s"),
                ("temperature_c", 30, 80, "°C"),
                ("flow_rate_m3h", 100, 200, "m³/h"),
                ("pressure_bar", 3.0, 7.0, "bar"),
            ],
            "hydraulic": [
                ("pressure_bar", 150, 300, "bar"),
                ("oil_temperature_c", 35, 80, "°C"),
                ("oil_level_pct", 20, 100, "%"),
            ],
        }

        now = datetime.now(timezone.utc)
        for i, (eq_id, eq_data) in enumerate(zip(equipment_ids, equipment_list)):
            eq_type = eq_data.get("equipment_type", "motor")
            sensors = sensor_configs.get(eq_type, sensor_configs["motor"])

            # Generate 48 hours of readings (every 30 min)
            for hours_back in range(96, 0, -1):
                ts = now - timedelta(minutes=hours_back * 30)
                for sensor_type, min_val, max_val, unit in sensors:
                    # Add realistic trend (slight degradation for some equipment)
                    trend_factor = 1.0 + (i % 3) * 0.003 * (96 - hours_back)
                    base_val = min_val + (max_val - min_val) * (0.3 + random.uniform(-0.05, 0.05))
                    value = base_val * trend_factor + random.gauss(0, base_val * 0.02)
                    value = max(min_val * 0.8, min(max_val * 1.1, value))

                    reading = SensorReading(
                        id=str(uuid.uuid4()),
                        equipment_id=eq_id,
                        timestamp=ts,
                        sensor_type=sensor_type,
                        value=round(value, 3),
                        unit=unit,
                        is_anomaly=value > max_val * 0.9,
                        anomaly_score=max(0, (value - max_val * 0.8) / (max_val * 0.2)) if value > max_val * 0.8 else 0,
                    )
                    db.add(reading)

        # Add maintenance logs
        maintenance_types = ["preventive", "corrective", "predictive"]
        for eq_id, eq_data in zip(equipment_ids[:5], equipment_list[:5]):
            for j in range(3):
                log = MaintenanceLog(
                    id=str(uuid.uuid4()),
                    equipment_id=eq_id,
                    timestamp=now - timedelta(days=random.randint(5, 120)),
                    maintenance_type=random.choice(maintenance_types),
                    description=f"Routine maintenance - {eq_data['equipment_type']} service",
                    technician=random.choice(["Rajesh Kumar", "Suresh Patel", "Amit Singh", "Vijay Sharma"]),
                    duration_hours=random.uniform(2, 16),
                    parts_replaced=["Bearing", "Seal"] if j == 0 else [],
                    cost=random.uniform(5000, 50000),
                    root_cause="Wear and tear" if j > 0 else None,
                    actions_taken="Replaced worn components, lubricated, tested",
                    outcome="Resolved",
                )
                db.add(log)

        # Add some active alerts
        alert_templates = [
            {
                "alert_type": "vibration_high",
                "severity": "high",
                "title": "HIGH VIBRATION: Blast Furnace Main Drive",
                "description": "Vibration level 8.7 mm/s exceeds alarm threshold of 7.1 mm/s",
                "recommended_action": "Schedule bearing inspection within 48 hours. Check alignment and lubrication.",
            },
            {
                "alert_type": "temperature_critical",
                "severity": "critical",
                "title": "CRITICAL TEMPERATURE: CCM Segment Bearing",
                "description": "Bearing temperature 94°C approaching critical threshold of 100°C",
                "recommended_action": "IMMEDIATE: Inspect cooling system. Consider reducing casting speed. Prepare bearing replacement.",
            },
            {
                "alert_type": "oil_pressure_low",
                "severity": "medium",
                "title": "LOW OIL PRESSURE: HSM Gearbox",
                "description": "Oil pressure dropped to 2.1 bar, below warning threshold of 2.5 bar",
                "recommended_action": "Check oil level, filter condition, and pump performance within 24 hours.",
            },
        ]

        for idx, alert_template in enumerate(alert_templates):
            alert = Alert(
                id=str(uuid.uuid4()),
                equipment_id=equipment_ids[idx % len(equipment_ids)],
                triggered_at=now - timedelta(hours=random.randint(1, 24)),
                sensor_data={"value": 8.7, "unit": "mm/s"},
                **alert_template,
            )
            db.add(alert)

        # Add spare parts
        spare_parts_data = [
            {"part_number": "B-2247", "name": "Main Drive Bearing SKF-22320", "quantity_available": 2, "reorder_level": 3, "unit_cost": 45000, "supplier": "SKF India", "procurement_lead_days": 5, "is_critical": True},
            {"part_number": "S-1105", "name": "Hydraulic Seal Kit - Rexroth", "quantity_available": 8, "reorder_level": 5, "unit_cost": 8500, "supplier": "Bosch Rexroth", "procurement_lead_days": 3, "is_critical": True},
            {"part_number": "F-3301", "name": "Oil Filter Element - 10 micron", "quantity_available": 15, "reorder_level": 10, "unit_cost": 1200, "supplier": "Hydac", "procurement_lead_days": 2, "is_critical": False},
            {"part_number": "C-4420", "name": "Motor Coupling - Flange Type", "quantity_available": 3, "reorder_level": 2, "unit_cost": 22000, "supplier": "Lovejoy", "procurement_lead_days": 7, "is_critical": False},
            {"part_number": "V-2210", "name": "VFD Control Board - Siemens S120", "quantity_available": 1, "reorder_level": 1, "unit_cost": 180000, "supplier": "Siemens India", "procurement_lead_days": 14, "is_critical": True},
        ]

        for sp_data in spare_parts_data:
            sp = SparePart(
                id=str(uuid.uuid4()),
                equipment_compatibility=["motor", "bearing", "gearbox"],
                description=f"Standard spare part for industrial maintenance",
                location="Main Warehouse - Bay 3",
                **sp_data,
            )
            db.add(sp)

        await db.commit()
        logger.info(f"Demo data seeded: {len(equipment_list)} equipment, {len(alert_templates)} alerts")
