"""SQLAlchemy ORM models for the Maintenance Wizard."""
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    JSON, ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
import enum

from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertStatus(str, enum.Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, index=True)
    equipment_type = Column(String(100), nullable=False)
    location = Column(String(255))
    plant_area = Column(String(100))
    criticality = Column(String(50), default="medium")
    installation_date = Column(DateTime)
    last_maintenance_date = Column(DateTime)
    manufacturer = Column(String(255))
    model_number = Column(String(100))
    specifications = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    sensor_readings = relationship("SensorReading", back_populates="equipment", lazy="select")
    maintenance_logs = relationship("MaintenanceLog", back_populates="equipment", lazy="select")
    alerts = relationship("Alert", back_populates="equipment", lazy="select")
    diagnoses = relationship("DiagnosisRecord", back_populates="equipment", lazy="select")


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    equipment_id = Column(String, ForeignKey("equipment.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=utcnow, index=True)
    sensor_type = Column(String(100), nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String(50))
    is_anomaly = Column(Boolean, default=False)
    anomaly_score = Column(Float, default=0.0)
    threshold_min = Column(Float)
    threshold_max = Column(Float)
    raw_data = Column(JSON, default=dict)

    equipment = relationship("Equipment", back_populates="sensor_readings")


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    equipment_id = Column(String, ForeignKey("equipment.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=utcnow, index=True)
    maintenance_type = Column(String(100))  # preventive, corrective, predictive
    description = Column(Text)
    technician = Column(String(255))
    duration_hours = Column(Float)
    parts_replaced = Column(JSON, default=list)
    cost = Column(Float)
    root_cause = Column(Text)
    actions_taken = Column(Text)
    outcome = Column(String(100))
    next_maintenance_due = Column(DateTime)
    created_at = Column(DateTime, default=utcnow)

    equipment = relationship("Equipment", back_populates="maintenance_logs")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    equipment_id = Column(String, ForeignKey("equipment.id"), nullable=False, index=True)
    alert_type = Column(String(100), nullable=False)
    severity = Column(SAEnum(RiskLevel), default=RiskLevel.MEDIUM)
    status = Column(SAEnum(AlertStatus), default=AlertStatus.ACTIVE)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    triggered_at = Column(DateTime, default=utcnow)
    acknowledged_at = Column(DateTime)
    resolved_at = Column(DateTime)
    acknowledged_by = Column(String(255))
    sensor_data = Column(JSON, default=dict)
    ai_analysis = Column(Text)
    recommended_action = Column(Text)

    equipment = relationship("Equipment", back_populates="alerts")


class DiagnosisRecord(Base):
    __tablename__ = "diagnosis_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    equipment_id = Column(String, ForeignKey("equipment.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=utcnow, index=True)
    query = Column(Text, nullable=False)
    diagnosis = Column(Text)
    root_causes = Column(JSON, default=list)
    risk_level = Column(SAEnum(RiskLevel), default=RiskLevel.MEDIUM)
    rul_estimate = Column(Float)  # days
    confidence_score = Column(Float)
    recommendations = Column(JSON, default=list)
    immediate_actions = Column(JSON, default=list)
    long_term_actions = Column(JSON, default=list)
    spare_parts_needed = Column(JSON, default=list)
    sources_used = Column(JSON, default=list)
    agent_trace = Column(JSON, default=list)
    feedback_score = Column(Integer)
    feedback_comment = Column(Text)
    session_id = Column(String, index=True)

    equipment = relationship("Equipment", back_populates="diagnoses")


class ConversationSession(Base):
    __tablename__ = "conversation_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    equipment_id = Column(String, ForeignKey("equipment.id"), nullable=True)
    user_role = Column(String(100), default="engineer")
    messages = Column(JSON, default=list)
    context = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(500), nullable=False)
    document_type = Column(String(100))  # manual, sop, failure_report, maintenance_record
    equipment_type = Column(String(100))
    content = Column(Text)
    file_path = Column(String(500))
    chunk_count = Column(Integer, default=0)
    is_indexed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    doc_metadata = Column(JSON, default=dict)


class SparePart(Base):
    __tablename__ = "spare_parts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    part_number = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(500), nullable=False)
    description = Column(Text)
    equipment_compatibility = Column(JSON, default=list)
    quantity_available = Column(Integer, default=0)
    reorder_level = Column(Integer, default=5)
    unit_cost = Column(Float)
    supplier = Column(String(255))
    procurement_lead_days = Column(Integer)
    location = Column(String(255))
    is_critical = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
