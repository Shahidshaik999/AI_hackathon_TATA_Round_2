"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


# ─── Equipment ──────────────────────────────────────────────────────────────

class EquipmentCreate(BaseModel):
    name: str
    equipment_type: str
    location: Optional[str] = None
    plant_area: Optional[str] = None
    criticality: str = "medium"
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    specifications: Dict[str, Any] = {}


class EquipmentResponse(BaseModel):
    id: str
    name: str
    equipment_type: str
    location: Optional[str]
    plant_area: Optional[str]
    criticality: str
    manufacturer: Optional[str]
    model_number: Optional[str]
    specifications: Dict[str, Any]
    is_active: bool
    created_at: datetime
    last_maintenance_date: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Sensor Data ─────────────────────────────────────────────────────────────

class SensorDataPoint(BaseModel):
    sensor_type: str
    value: float
    unit: Optional[str] = None
    threshold_min: Optional[float] = None
    threshold_max: Optional[float] = None


class SensorDataBatch(BaseModel):
    equipment_id: str
    timestamp: Optional[datetime] = None
    readings: List[SensorDataPoint]


class SensorReadingResponse(BaseModel):
    id: str
    equipment_id: str
    timestamp: datetime
    sensor_type: str
    value: float
    unit: Optional[str]
    is_anomaly: bool
    anomaly_score: float

    class Config:
        from_attributes = True


# ─── Diagnosis / AI ───────────────────────────────────────────────────────────

class DiagnosisRequest(BaseModel):
    equipment_id: str
    query: str
    sensor_data: Optional[Dict[str, Any]] = None
    fault_description: Optional[str] = None
    session_id: Optional[str] = None
    include_rul: bool = True
    include_spare_parts: bool = True


class RootCause(BaseModel):
    cause: str
    probability: float
    evidence: str


class Recommendation(BaseModel):
    action: str
    priority: str
    timeline: str
    responsible: str


class SparePart(BaseModel):
    part_name: str
    part_number: Optional[str]
    quantity_needed: int
    available_in_stock: Optional[int]
    procurement_lead_days: Optional[int]
    urgency: str


class DiagnosisResponse(BaseModel):
    id: str
    equipment_id: str
    query: str
    diagnosis: str
    root_causes: List[RootCause]
    risk_level: RiskLevel
    rul_estimate_days: Optional[float]
    rul_confidence: Optional[float]
    confidence_score: float
    immediate_actions: List[str]
    recommendations: List[Recommendation]
    long_term_actions: List[str]
    spare_parts_needed: List[SparePart]
    sources_used: List[str]
    agent_trace: List[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Chat ─────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # user | assistant | system
    content: str
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    equipment_id: Optional[str] = None
    user_role: str = "engineer"
    context: Optional[Dict[str, Any]] = {}


class ChatResponse(BaseModel):
    session_id: str
    message: str
    agent_type: str
    sources: List[str] = []
    follow_up_suggestions: List[str] = []
    alerts_triggered: List[str] = []
    timestamp: datetime


# ─── Alerts ───────────────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    id: str
    equipment_id: str
    alert_type: str
    severity: RiskLevel
    status: AlertStatus
    title: str
    description: Optional[str]
    triggered_at: datetime
    ai_analysis: Optional[str]
    recommended_action: Optional[str]

    class Config:
        from_attributes = True


class AlertAcknowledge(BaseModel):
    acknowledged_by: str
    notes: Optional[str] = None


# ─── Reports ──────────────────────────────────────────────────────────────────

class ReportRequest(BaseModel):
    equipment_id: str
    report_type: str = "maintenance_summary"  # maintenance_summary | rca | health_status
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    include_predictions: bool = True
    include_recommendations: bool = True
    format: str = "json"  # json | pdf


class HealthScoreResponse(BaseModel):
    equipment_id: str
    equipment_name: str
    health_score: float  # 0-100
    risk_level: RiskLevel
    rul_days: Optional[float]
    active_alerts: int
    last_maintenance: Optional[datetime]
    next_maintenance_due: Optional[datetime]
    trend: str  # improving | stable | degrading
    key_concerns: List[str]


# ─── Knowledge Base ───────────────────────────────────────────────────────────

class DocumentUpload(BaseModel):
    title: str
    document_type: str  # manual | sop | failure_report | maintenance_record
    equipment_type: Optional[str] = None
    content: Optional[str] = None


# ─── Feedback ─────────────────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    diagnosis_id: str
    score: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    actual_root_cause: Optional[str] = None
    was_recommendation_helpful: Optional[bool] = None


# ─── Spare Parts ──────────────────────────────────────────────────────────────

class SparePartCreate(BaseModel):
    part_number: str
    name: str
    description: Optional[str] = None
    equipment_compatibility: List[str] = []
    quantity_available: int = 0
    reorder_level: int = 5
    unit_cost: Optional[float] = None
    supplier: Optional[str] = None
    procurement_lead_days: Optional[int] = None
    location: Optional[str] = None
    is_critical: bool = False


class SparePartResponse(SparePartCreate):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_equipment: int
    active_alerts: int
    critical_alerts: int
    equipment_health_avg: float
    diagnoses_today: int
    maintenance_due: int
    equipment_health_distribution: Dict[str, int]
    recent_alerts: List[AlertResponse]
    equipment_health_scores: List[HealthScoreResponse]
