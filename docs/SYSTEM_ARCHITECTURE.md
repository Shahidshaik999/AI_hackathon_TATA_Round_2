# Maintenance Wizard — System Architecture Document
## Tata Steel AI Hackathon 2026 — Round 2: Agentic AI Challenge

---

## 1. Executive Summary

The **Maintenance Wizard** is an intelligent, autonomous Agentic AI system designed for industrial equipment maintenance in steel manufacturing plants. It consolidates fragmented maintenance data sources, performs contextual reasoning using Large Language Models (LLMs), and provides explainable, actionable maintenance recommendations.

The system shifts maintenance teams from **reactive troubleshooting** to **proactive, predictive maintenance** — reducing unplanned downtime, improving diagnostic accuracy, and enabling data-driven maintenance planning.

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                           │
│  React + TypeScript + Tailwind CSS + Recharts                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │Dashboard │ │Equipment │ │Diagnosis │ │  Chat    │ │ Reports  │ │
│  │          │ │Registry  │ │   AI     │ │   AI     │ │Generator │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTP REST + WebSocket
┌──────────────────────────▼──────────────────────────────────────────┐
│                        API GATEWAY LAYER                            │
│                    FastAPI (Python 3.11+)                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │Equipment │ │Diagnosis │ │ Sensors  │ │  Alerts  │ │Knowledge │ │
│  │   API    │ │   API    │ │   API    │ │   API    │ │   API    │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                      AGENTIC AI LAYER                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   ORCHESTRATOR (LangGraph)                   │   │
│  │        Routes queries to appropriate specialist agents        │   │
│  └─────────┬────────────┬────────────┬─────────────┬───────────┘   │
│            │            │            │             │               │
│  ┌─────────▼──┐ ┌───────▼───┐ ┌─────▼──────┐ ┌───▼────────┐     │
│  │Diagnostic  │ │Predictive  │ │ Knowledge  │ │   Report   │     │
│  │  Agent     │ │  Agent     │ │   Agent    │ │   Agent    │     │
│  │            │ │            │ │  (RAG)     │ │            │     │
│  │• RCA       │ │• RUL Est.  │ │• Retrieval │ │• Summary   │     │
│  │• Fault     │ │• Anomaly   │ │• Indexing  │ │• Alert Rpt │     │
│  │  Diagnosis │ │  Detection │ │• Search    │ │• Logbook   │     │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘     │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                    CHAT AGENT                            │      │
│  │   Multi-turn conversational interface (LangChain)         │      │
│  └──────────────────────────────────────────────────────────┘      │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                       DATA LAYER                                     │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  SQLite/     │  │  ChromaDB    │  │   In-Memory Cache        │  │
│  │  PostgreSQL  │  │  (Vector DB) │  │   (Session State)        │  │
│  │              │  │              │  │                          │  │
│  │• Equipment   │  │• Equipment   │  │• Active Sessions         │  │
│  │• Sensors     │  │  Manuals     │  │• WebSocket Connections   │  │
│  │• Alerts      │  │• SOPs        │  │                          │  │
│  │• Diagnoses   │  │• Failure Rpts│  │                          │  │
│  │• Maintenance │  │• Custom Docs │  │                          │  │
│  │  Logs        │  │              │  │                          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript | UI framework |
| Styling | Tailwind CSS 3 | Dark theme UI |
| Charts | Recharts | Health dashboards, sensor trends |
| Routing | React Router 6 | SPA navigation |
| HTTP Client | Axios | API communication |
| Backend | Python 3.11 + FastAPI | REST API + WebSocket |
| ASGI | Uvicorn | Async HTTP server |
| AI Orchestration | LangChain 0.2 + LangGraph | Multi-agent pipeline |
| LLM | OpenAI GPT-4o | Primary reasoning |
| LLM Fallback | Groq (LLaMA-3 70B) | Secondary LLM |
| Embeddings | OpenAI / HuggingFace | Text vectorization |
| Vector DB | ChromaDB | RAG knowledge retrieval |
| Database | SQLite (dev) / PostgreSQL | Structured data |
| ORM | SQLAlchemy 2.0 (async) | Database operations |
| Data Processing | NumPy, Pandas, Scikit-learn | RUL & anomaly detection |

---

## 4. Agent Architecture

### 4.1 Diagnostic Agent
**Purpose:** Fault diagnosis and root cause analysis

**Inputs:**
- Equipment information (type, location, criticality)
- User-described symptoms/query
- Sensor readings (vibration, temperature, pressure, etc.)
- Historical maintenance logs
- Retrieved knowledge base context

**Outputs:**
- Probable diagnosis with reasoning
- Root cause analysis with probability scores
- Risk level classification (low/medium/high/critical)
- Confidence score
- Evidence-based traceability

**Method:** Prompt-engineered GPT-4o with structured JSON output, fallback to rule-based logic

### 4.2 Predictive Agent
**Purpose:** RUL estimation, anomaly detection, failure prediction

**Anomaly Detection:**
- Threshold-based detection using industry standards (ISO 10816 for vibration)
- Statistical scoring for anomaly severity
- Real-time alert generation

**RUL Estimation:**
- Linear degradation model with sensor history
- R² confidence scoring
- P-F interval analysis
- Failure probability at 7-day and 30-day horizons

### 4.3 Knowledge Agent (RAG)
**Purpose:** Retrieval-Augmented Generation over maintenance knowledge base

**Knowledge base includes:**
- Blast furnace maintenance procedures
- CCM operation and fault handling
- Rolling mill vibration diagnostics
- Motor/bearing/pump maintenance standards
- Fault code reference library
- ISO threshold standards
- Lubrication interval calculations
- Spare parts criticality guide

**Retrieval:** ChromaDB vector store with semantic search; keyword fallback

### 4.4 Chat Agent
**Purpose:** Multi-turn conversational maintenance assistant

**Features:**
- Context-aware conversation over 10-message history
- Equipment-specific context injection
- Role-based responses (engineer/supervisor/operator)
- Follow-up question suggestions
- Knowledge base grounding for all responses

### 4.5 Report Agent
**Purpose:** Structured maintenance report generation

**Report types:**
- Maintenance Summary Reports
- Alert Reports with AI analysis
- Equipment Health Status Reports
- Downloadable text format

---

## 5. Data Flow

```
SENSOR DATA FLOW:
Equipment → Sensor Ingest API → Anomaly Detection (Predictive Agent)
         → SensorReading DB  → Alert Generation → WebSocket Notification
         → Dashboard Update

DIAGNOSIS FLOW:
User Query → Diagnosis API
          → Equipment DB lookup
          → Maintenance History fetch
          → Knowledge Agent RAG retrieval
          → Diagnostic Agent (GPT-4o)
          → RUL calculation (Predictive Agent)
          → DiagnosisRecord saved
          → Structured response returned

CHAT FLOW:
User Message → Chat API
            → Session state lookup/create
            → Equipment context injection
            → Knowledge Agent RAG retrieval
            → Chat Agent (GPT-4o)
            → Response with follow-ups
            → Session history updated
```

---

## 6. Alerting and Prediction Logic

### Anomaly Detection Rules
| Sensor | Warning | Alarm | Critical |
|--------|---------|-------|---------|
| Vibration (Class II motor) | >2.8 mm/s | >7.1 mm/s | >11.2 mm/s |
| Bearing temperature | >80°C | >90°C | >100°C |
| Motor temperature | >75°C | >85°C | >95°C |
| Oil temperature | >65°C | >75°C | >85°C |
| Hydraulic pressure low | <150 bar | <120 bar | <90 bar |

### RUL Estimation Formula
```
RUL = (Failure_Threshold - Current_Value) / Degradation_Rate_per_Day

Where:
- Degradation_Rate = slope from linear regression of sensor history
- Confidence = R² from regression fit
- Failure Threshold = critical alarm level from equipment standards
```

### Risk Priority Classification
```
Health Score = 100 - (Critical_Alerts × 20) - (High_Alerts × 10) 
             - (Medium_Alerts × 5) - (Risk_Level_Deduction)

Critical: Score < 35
High: Score 35-60
Medium: Score 60-80
Low: Score ≥ 80
```

---

## 7. Feedback Loop

The system implements continuous improvement through:

1. **Rating System:** Engineers rate each diagnosis 1-5 stars
2. **Comment Collection:** Free-text feedback on recommendation accuracy
3. **Actual Root Cause:** Engineers can provide actual root cause for comparison
4. **History Analysis:** Diagnosis history with outcomes tracked in DB
5. **Future Enhancement:** Feedback data can be used to fine-tune domain-specific models

---

## 8. API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/dashboard/stats | Dashboard statistics |
| GET/POST | /api/v1/equipment/ | Equipment management |
| POST | /api/v1/diagnosis/ | Run AI diagnosis |
| POST | /api/v1/sensors/ingest | Ingest sensor readings |
| POST | /api/v1/sensors/equipment/{id}/rul | Estimate RUL |
| GET/POST | /api/v1/alerts/ | Alert management |
| POST | /api/v1/alerts/{id}/acknowledge | Acknowledge alert |
| POST | /api/v1/chat/ | Multi-turn chat |
| WS | /api/v1/chat/ws/{session_id} | Real-time WebSocket chat |
| POST | /api/v1/reports/generate | Generate reports |
| POST | /api/v1/knowledge/upload | Add knowledge documents |
| POST | /api/v1/knowledge/search | Search knowledge base |

---

## 9. Assumptions and Limitations

### Assumptions
1. Sensor data is pre-processed and in engineering units (mm/s, °C, bar)
2. Equipment metadata is available at onboarding
3. OpenAI API key available for production (mock responses work for demo)
4. Python 3.11+ and Node.js 18+ available

### Limitations
1. LLM responses are not deterministic — minor variation in outputs is expected
2. RUL estimation uses linear degradation model (simplified)
3. No real-time SCADA/OPC-UA integration (simulated sensor ingest endpoint)
4. Knowledge base is primarily English language
5. ChromaDB persistence requires HuggingFace model download (~90MB) on first run

### Production Enhancements (Out of Scope for Hackathon)
- OPC-UA / MQTT real-time data integration
- Fine-tuned domain LLM on historical Tata Steel data
- Multi-plant deployment with role-based access control
- Mobile-responsive application for field technicians
- Integration with SAP/ERP for work order creation
- Automated email/SMS notifications for critical alerts

---

## 10. Installation and Running

### Quick Start (Windows)
```
1. Double-click: start_backend.bat
   - Creates virtual environment
   - Installs Python dependencies
   - Seeds demo data
   - Starts API at http://localhost:8000

2. Double-click: start_frontend.bat
   - Installs npm packages
   - Starts UI at http://localhost:5173

3. Optional: Add OPENAI_API_KEY to backend/.env for full AI capability
```

### Manual Setup
```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

*Maintenance Wizard — Tata Steel AI Hackathon 2026*
*Team Submission — Round 2: Agentic AI Challenge*
