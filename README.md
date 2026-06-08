# 🏭 Maintenance Wizard — Intelligent Industrial AI System
### Tata Steel AI Hackathon 2026 — Round 2: Agentic AI Challenge

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- (Optional) OpenAI API key for full LLM capability

### Start Backend (Terminal 1)
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
python run.py
# API available at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### Start Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
# UI available at http://localhost:5173
```

### Add API Key (Optional but recommended)
Edit `backend/.env`:
```
OPENAI_API_KEY=sk-your-key-here
```
Without a key, the system uses intelligent fallback responses that still demonstrate all features.

---

## 🎯 What This System Does

The **Maintenance Wizard** is a full-stack Agentic AI platform that transforms how steel plant engineers handle equipment maintenance. It replaces fragmented, manual maintenance processes with an intelligent, context-aware AI assistant.

### Core Capabilities

| Feature | Description |
|---------|-------------|
| 🔍 **AI Fault Diagnosis** | Multi-source diagnosis with root cause analysis and probability scoring |
| 📈 **RUL Prediction** | Remaining Useful Life estimation from sensor degradation trends |
| 🚨 **Real-time Alerts** | Automated anomaly detection with severity classification |
| 💬 **AI Chat Assistant** | Multi-turn conversational support for maintenance engineers |
| 📊 **Health Dashboard** | Real-time equipment health scores across the entire plant |
| 📄 **Report Generation** | AI-generated structured maintenance reports |
| 📚 **Knowledge Base** | RAG over equipment manuals, SOPs, failure reports |
| 📦 **Spare Parts** | Availability tracking with procurement lead time |

---

## 🧠 Agent Architecture

```
User Query
    │
    ▼
┌─────────────────────────────────┐
│     Orchestrator Agent           │
│     (Query routing & context)    │
└──────────┬──────────────────────┘
           │
    ┌──────┴──────────────────────────────────┐
    │              │              │            │
    ▼              ▼              ▼            ▼
Diagnostic    Predictive     Knowledge     Report
Agent         Agent          Agent (RAG)   Agent
│             │              │             │
│Fault diag.  │RUL estimate  │Manuals      │Summaries
│Root causes  │Anomaly det.  │SOPs         │Alert rpts
│Risk level   │Failure prob. │Failure rpts │Logbook
│Recommends.  │Health score  │Custom docs  │
    │              │              │            │
    └──────┬──────────────────────────────────┘
           │
    ┌──────▼──────────────┐
    │     Chat Agent       │
    │  (Multi-turn conv.)  │
    └─────────────────────┘
           │
    Structured Response to User
```

---

## 📁 Project Structure

```
TATA_Round_2/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── diagnostic_agent.py    # Fault diagnosis + RCA
│   │   │   ├── predictive_agent.py    # RUL + anomaly detection
│   │   │   ├── knowledge_agent.py     # RAG knowledge retrieval
│   │   │   ├── chat_agent.py          # Multi-turn conversation
│   │   │   ├── report_agent.py        # Report generation
│   │   │   └── llm_client.py         # LLM with fallback chain
│   │   ├── models/
│   │   │   └── db_models.py          # SQLAlchemy ORM models
│   │   ├── routers/
│   │   │   ├── equipment.py          # Equipment CRUD
│   │   │   ├── diagnosis.py          # AI diagnosis endpoint
│   │   │   ├── sensors.py            # Sensor ingest + RUL
│   │   │   ├── alerts.py             # Alert management
│   │   │   ├── chat.py               # Chat + WebSocket
│   │   │   ├── reports.py            # Report generation
│   │   │   ├── knowledge.py          # KB upload + search
│   │   │   └── dashboard.py          # Dashboard stats
│   │   ├── schemas/schemas.py        # Pydantic validation
│   │   ├── config.py                 # App configuration
│   │   ├── database.py               # DB session management
│   │   └── main.py                   # FastAPI app + seed data
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.tsx         # Plant overview + KPIs
│       │   ├── EquipmentPage.tsx     # Equipment registry + sensors
│       │   ├── DiagnosisPage.tsx     # AI diagnosis interface
│       │   ├── AlertsPage.tsx        # Alert management
│       │   ├── ChatPage.tsx          # AI chat assistant
│       │   ├── ReportsPage.tsx       # Report generation
│       │   └── KnowledgePage.tsx     # Knowledge base
│       ├── components/
│       │   ├── Layout.tsx            # App shell + navigation
│       │   ├── HealthGauge.tsx       # SVG health gauge
│       │   └── RiskBadge.tsx         # Risk level badges
│       └── api.ts                    # Typed API client
├── data/
│   └── samples/                      # Sample API payloads
├── docs/
│   └── SYSTEM_ARCHITECTURE.md       # Full architecture doc
├── start_backend.bat                 # One-click backend start
└── start_frontend.bat                # One-click frontend start
```

---

## 🔌 API Reference

The full interactive API documentation is available at `http://localhost:8000/docs`

Key endpoints:
- `POST /api/v1/diagnosis/` — Run AI-powered fault diagnosis
- `POST /api/v1/sensors/ingest` — Ingest sensor readings with anomaly detection
- `POST /api/v1/chat/` — Send message to AI assistant
- `GET /api/v1/dashboard/stats` — Get plant-wide health dashboard
- `POST /api/v1/reports/generate` — Generate maintenance report
- `GET /api/v1/alerts/` — List active alerts
- `POST /api/v1/knowledge/search` — Search knowledge base

---

## 🏗️ Technology Stack

**Backend:** Python 3.11 · FastAPI · LangChain · LangGraph · OpenAI GPT-4o · ChromaDB · SQLAlchemy · NumPy · Scikit-learn

**Frontend:** React 18 · TypeScript · Tailwind CSS · Recharts · Axios · React Router

---

## 📊 Demo Data

The system auto-seeds with realistic steel plant data on first run:
- **8 equipment** across Blast Furnace, SMS, Hot Rolling Mill, Coke Oven
- **3 active alerts** (critical/high/medium severity)
- **48 hours** of realistic sensor readings per equipment
- **Maintenance logs** and historical records
- **5 spare parts** inventory items

---

*Built for Tata Steel AI Hackathon 2026 — Round 2: Agentic AI Challenge*
