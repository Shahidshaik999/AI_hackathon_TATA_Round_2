# Maintenance Wizard — Intelligent Industrial Maintenance AI System

**Tata Steel AI Hackathon 2026 — Round 2: Agentic AI Challenge**

An intelligent, full-stack Agentic AI platform for industrial equipment maintenance in steel manufacturing environments. The system consolidates fragmented maintenance data sources, performs AI-powered fault diagnosis, predicts equipment failures, and provides explainable maintenance recommendations through a professional web interface.

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation and Setup](#installation-and-setup)
- [API Reference](#api-reference)
- [Demo Data](#demo-data)
- [Data Sources](#data-sources)
- [Screenshots Guide](#screenshots-guide)

---

## Overview

Steel manufacturing plants operate highly complex, capital-intensive equipment systems where unplanned downtime results in significant production loss, safety risks, and increased maintenance costs. The Maintenance Wizard addresses this by replacing manual, fragmented maintenance processes with an intelligent AI system that:

- Diagnoses equipment faults in seconds with evidence-based root cause analysis
- Predicts remaining useful life from sensor degradation trends
- Detects anomalies in real-time and generates structured alerts
- Provides natural language interaction for maintenance engineers
- Consolidates equipment manuals, SOPs, maintenance records, and sensor data into a unified platform
- Prioritizes maintenance actions based on criticality, alert severity, RUL, and spare parts availability

---

## System Architecture

```
User (Maintenance Engineer)
          |
          | HTTP / WebSocket
          v
+---------------------------+
|     React Frontend         |
|  10 pages, TypeScript,     |
|  Tailwind CSS, Recharts    |
+---------------------------+
          |
          | REST API
          v
+---------------------------+
|   FastAPI Backend          |
|   41 endpoints             |
|   Python 3.11, async       |
+---------------------------+
          |
          v
+--------------------------------------------------+
|              Agentic AI Layer                     |
|                                                   |
|  Diagnostic    Predictive    Knowledge    Report  |
|  Agent         Agent         Agent (RAG)  Agent   |
|  - RCA         - RUL         - Manuals    - Summary|
|  - Risk Level  - Anomaly     - SOPs       - Alerts |
|  - Evidence    - Failure     - Logs       - Logbook|
|                  Probability  - Search             |
|                                                   |
|              Chat Agent                           |
|              - Multi-turn conversation            |
|              - Session memory                     |
|              - Follow-up suggestions              |
+--------------------------------------------------+
          |
          v
+------------------------------------------+
|              Data Layer                   |
|                                           |
|  SQLite DB          ChromaDB (Vector)     |
|  - Equipment        - Knowledge chunks    |
|  - Sensor readings  - Semantic search     |
|  - Alerts           - Document index      |
|  - Diagnoses                             |
|  - Maintenance logs                      |
|  - Spare parts                           |
+------------------------------------------+
```

### Agent Descriptions

| Agent | Responsibility |
|-------|---------------|
| Diagnostic Agent | Fault diagnosis, root cause analysis with probability scores and multi-point evidence, risk classification, spare parts identification |
| Predictive Agent | RUL estimation using linear degradation model, ISO 10816 threshold-based anomaly detection, failure probability at 7-day and 30-day horizons |
| Knowledge Agent | RAG retrieval over equipment manuals, SOPs, failure reports. Falls back to keyword search if vector store unavailable |
| Chat Agent | Multi-turn conversational interface with 10-message session history, follow-up suggestions, equipment context injection |
| Report Agent | AI-generated structured reports — maintenance summary, root cause analysis, health status. Downloadable text format |

**LLM:** Groq LLaMA-3.3-70B-Versatile (primary) with OpenAI GPT-4o fallback and deterministic mock responses for offline demo

---

## Features

### Core Functionality

**AI Fault Diagnosis**
- Natural language description of symptoms with optional sensor readings and fault codes
- LLM-powered root cause analysis with probability scores (0-100%)
- Each root cause includes 2-4 specific evidence points referencing sensor values, thresholds, and maintenance history
- Confidence score and source traceability for every diagnosis
- 1-5 star feedback system for continuous improvement

**Remaining Useful Life Prediction**
- Linear degradation model applied to sensor history
- Confidence score based on R-squared regression fit
- Failure probability at 7-day and 30-day horizons
- Degradation trend classification: stable, degrading, improving

**Real-time Anomaly Detection**
- Every sensor reading is evaluated against ISO 10816 vibration standards and configurable thresholds
- Automatic alert generation for warning, alarm, and critical severity levels
- Alerts include AI-generated analysis and recommended action

**Plant Priority Ranking**
- Composite priority score using: equipment criticality (x4), critical alert count (x30), RUL status (x25), risk level (x20)
- Recommended action: Immediate Shutdown, Urgent 24h, Plan 1 Week, Monitor
- Spare parts availability check per equipment

**Knowledge Base with AI Answer**
- Built-in knowledge covering: Blast Furnace, CCM, Rolling Mill, EAF, Motors, Cranes, Fault Codes, Spare Parts, RUL Methods, RPN Calculation
- Document upload and indexing (TXT, PDF, DOCX)
- Keyword search with semantic retrieval
- AI Answer mode: full structured response grounded in knowledge base

**Maintenance Logbook**
- Digital log entries with equipment, type, technician, duration, parts replaced, root cause, cost
- Filter by equipment and maintenance type
- Summary statistics per equipment

**Spare Parts Management**
- Stock levels with reorder alerts
- Procurement lead times per supplier
- Critical parts flagging
- Inline stock update

### UI Pages

| Page | Purpose |
|------|---------|
| Dashboard | Plant-wide KPIs, health gauges, alert feed, trend charts, risk distribution |
| Priority | Bottleneck ranking table with composite score and recommended actions |
| Equipment | Registry, specifications, 48-hour sensor trend charts per sensor type |
| Diagnosis | AI fault diagnosis with evidence-based RCA, RUL, recommendations, feedback |
| Alerts | Alert management with severity filters, acknowledge and resolve workflow |
| AI Chat | Multi-turn conversational assistant with session memory, follow-ups, source citations |
| Logbook | Digital maintenance log — create, view, filter entries |
| Spare Parts | Inventory management with low-stock alerts and procurement strategy |
| Reports | AI-generated reports (3 types), downloadable text format |
| Knowledge | Search, AI Answer, document upload and management |

---

## Technology Stack

### Backend
| Component | Technology |
|-----------|-----------|
| Web Framework | FastAPI 0.111 (Python 3.11, async) |
| ASGI Server | Uvicorn with auto-reload |
| AI Orchestration | LangChain 0.2, LangGraph |
| LLM Primary | Groq API — LLaMA-3.3-70B-Versatile |
| LLM Fallback | OpenAI GPT-4o |
| Vector Database | ChromaDB with keyword fallback |
| Relational Database | SQLite (async via aiosqlite) |
| ORM | SQLAlchemy 2.0 (async) |
| Data Validation | Pydantic v2 |
| Data Processing | NumPy, Pandas, Scikit-learn, SciPy |
| Real-time | WebSockets |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS 3 (dark theme) |
| Charts | Recharts |
| HTTP Client | Axios |
| Routing | React Router 6 with keep-alive state |
| Notifications | React Hot Toast |
| Icons | Lucide React |

---

## Project Structure

```
TATA_Round_2/
|
|-- backend/
|   |-- app/
|   |   |-- agents/
|   |   |   |-- chat_agent.py          Multi-turn conversational AI agent
|   |   |   |-- diagnostic_agent.py    Fault diagnosis and RCA agent
|   |   |   |-- knowledge_agent.py     RAG retrieval agent
|   |   |   |-- llm_client.py          LLM with Groq/OpenAI/Mock fallback
|   |   |   |-- predictive_agent.py    RUL estimation and anomaly detection
|   |   |   `-- report_agent.py        Report generation agent
|   |   |-- models/
|   |   |   `-- db_models.py           SQLAlchemy ORM (8 models)
|   |   |-- routers/
|   |   |   |-- alerts.py              Alert management (5 endpoints)
|   |   |   |-- chat.py                Chat + WebSocket (4 endpoints)
|   |   |   |-- dashboard.py           Dashboard stats + priority (3 endpoints)
|   |   |   |-- diagnosis.py           AI diagnosis + feedback (3 endpoints)
|   |   |   |-- equipment.py           Equipment CRUD (5 endpoints)
|   |   |   |-- knowledge.py           KB search + upload + AI answer (5 endpoints)
|   |   |   |-- maintenance_logs.py    Digital logbook (3 endpoints)
|   |   |   |-- reports.py             Report generation + health (2 endpoints)
|   |   |   |-- sensors.py             Sensor ingest + RUL (3 endpoints)
|   |   |   `-- spare_parts.py         Spare parts CRUD (4 endpoints)
|   |   |-- schemas/
|   |   |   `-- schemas.py             Pydantic request/response models
|   |   |-- config.py                  Pydantic settings from .env
|   |   |-- database.py                Async SQLAlchemy session management
|   |   `-- main.py                    FastAPI app, CORS, startup, demo data seed
|   |-- .env.example                   Environment template
|   |-- requirements.txt               Python dependencies
|   `-- run.py                         Uvicorn entry point
|
|-- frontend/
|   `-- src/
|       |-- components/
|       |   |-- HealthGauge.tsx         SVG circular health score gauge
|       |   |-- Layout.tsx              App shell, sidebar navigation, header
|       |   |-- MarkdownRenderer.tsx    Converts LLM markdown to clean HTML
|       |   `-- RiskBadge.tsx           Risk level badge with color dot
|       |-- pages/
|       |   |-- AlertsPage.tsx          Alert management with detail panel
|       |   |-- ChatPage.tsx            Multi-turn AI chat with session memory
|       |   |-- Dashboard.tsx           Plant overview, KPIs, charts
|       |   |-- DiagnosisPage.tsx       AI diagnosis with evidence-based RCA
|       |   |-- EquipmentPage.tsx       Equipment registry with sensor trends
|       |   |-- KnowledgePage.tsx       Search, AI Answer, document management
|       |   |-- LogbookPage.tsx         Digital maintenance logbook
|       |   |-- PriorityPage.tsx        Plant bottleneck priority ranking
|       |   |-- ReportsPage.tsx         AI report generation
|       |   `-- SparePartsPage.tsx      Spare parts inventory management
|       |-- api.ts                      Typed Axios API client for all endpoints
|       |-- App.tsx                     Router with keep-alive state (all pages persist)
|       `-- index.css                   Tailwind + custom component classes
|
|-- data/
|   |-- logs/
|   |   |-- sample_equipment_delay_log.csv    10 realistic delay records
|   |   `-- sample_sensor_readings.csv        29 sensor readings with anomalies
|   |-- manuals/
|   |   |-- blast_furnace_motor_manual.txt    Motor specifications, thresholds, procedures
|   |   `-- ccm_segment_bearing_sop.txt       CCM bearing maintenance SOP
|   `-- samples/
|       |-- README_DATA.md                    Data sources explanation
|       |-- rul_sensor_data_sample.csv        90-day bearing degradation dataset
|       |-- sample_diagnosis_requests.json    Sample API payloads for diagnosis
|       `-- sample_sensor_data.json           Sample sensor ingest payloads
|
|-- docs/
|   `-- SYSTEM_ARCHITECTURE.md        Full architecture, data flow, prediction logic
|
|-- .gitignore                         Excludes .env, venv, node_modules, DB
|-- README.md                          This file
|-- create_submission.bat              Creates submission ZIP
|-- start_backend.bat                  One-click backend startup
`-- start_frontend.bat                 One-click frontend startup
```

---

## Installation and Setup

### Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- A Groq API key (free at https://console.groq.com) — required for real AI responses

### Step 1 — Configure API Key

Copy the environment template and add your key:

```bash
cd backend
copy .env.example .env
```

Edit `backend/.env`:

```
GROQ_API_KEY=gsk_your_groq_api_key_here
```

The system works without a key using built-in deterministic responses, but real AI responses require the Groq key.

### Step 2 — Start Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

Backend starts at: http://localhost:8000
Interactive API docs: http://localhost:8000/docs

On first startup, the system automatically seeds the database with:
- 8 steel plant equipment assets
- 3 active alerts (critical, high, medium severity)
- 96 hours of sensor readings per equipment
- 16 maintenance log entries
- 5 spare parts with procurement data

### Step 3 — Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts at: http://localhost:5173

### One-click Start (Windows)

Double-click `start_backend.bat` in one terminal, then `start_frontend.bat` in another.

---

## API Reference

Full interactive documentation: http://localhost:8000/docs

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/dashboard/stats | Plant-wide health statistics |
| GET | /api/v1/dashboard/priority | Equipment bottleneck priority ranking |
| GET | /api/v1/equipment/ | List all equipment |
| POST | /api/v1/equipment/ | Register new equipment |
| POST | /api/v1/diagnosis/ | Run AI fault diagnosis |
| POST | /api/v1/diagnosis/feedback | Submit diagnosis feedback (1-5 stars) |
| POST | /api/v1/sensors/ingest | Ingest sensor readings with anomaly detection |
| POST | /api/v1/sensors/equipment/{id}/rul | Estimate remaining useful life |
| GET | /api/v1/alerts/ | List alerts with filters |
| POST | /api/v1/alerts/{id}/acknowledge | Acknowledge alert |
| POST | /api/v1/alerts/{id}/resolve | Resolve alert |
| POST | /api/v1/chat/ | Send message to AI assistant |
| WS | /api/v1/chat/ws/{session_id} | WebSocket real-time chat |
| POST | /api/v1/reports/generate | Generate AI maintenance report |
| POST | /api/v1/knowledge/search | Search knowledge base |
| POST | /api/v1/knowledge/ai-answer | Get AI-generated answer from KB |
| POST | /api/v1/knowledge/upload | Upload document to knowledge base |
| GET | /api/v1/maintenance-logs/ | List maintenance log entries |
| POST | /api/v1/maintenance-logs/ | Create logbook entry |
| GET | /api/v1/spare-parts/ | List spare parts inventory |
| PUT | /api/v1/spare-parts/{id}/stock | Update stock quantity |

### Example: Run AI Diagnosis

```bash
POST /api/v1/diagnosis/
Content-Type: application/json

{
  "equipment_id": "your-equipment-id",
  "query": "High vibration detected with grinding noise from bearing housing",
  "sensor_data": {
    "vibration_mm_s": 8.7,
    "temperature_c": 84.0,
    "current_a": 105.0
  },
  "fault_description": "E003 - Vibration High Alarm",
  "include_rul": true,
  "include_spare_parts": true
}
```

Response includes: diagnosis, root causes with evidence, risk level, RUL estimate, confidence score, immediate actions, prioritized recommendations, spare parts needed, sources used, agent trace.

### Example: Ingest Sensor Readings

```bash
POST /api/v1/sensors/ingest
Content-Type: application/json

{
  "equipment_id": "your-equipment-id",
  "readings": [
    {"sensor_type": "vibration_mm_s", "value": 9.5, "unit": "mm/s", "threshold_max": 7.1},
    {"sensor_type": "temperature_c", "value": 92.0, "unit": "deg C", "threshold_max": 85.0}
  ]
}
```

Automatically detects anomalies and generates alerts for threshold breaches.

---

## Demo Data

The system seeds realistic steel plant data on first startup. This data is modeled on real equipment types and industry-standard parameters.

### Equipment (8 assets)

| Equipment | Type | Plant Area | Criticality |
|-----------|------|-----------|-------------|
| Blast Furnace #1 Main Drive | Motor (450kW, 6.6kV) | Blast Furnace | Critical |
| CCM Segment Roll Bearing — Strand 2 | Bearing (SKF 23280) | Steel Melting Shop | Critical |
| Hot Strip Mill Work Roll Drive | Gearbox (Flender B3SH) | Hot Rolling Mill | High |
| EAF Transformer Cooling Pump | Pump (KSB 180m3/h) | Steel Melting Shop | High |
| Sinter Plant Exhaust Fan | Fan (ABB 250kW) | Raw Material Handling | High |
| Ladle Crane Main Hoist | Crane (Demag 300T) | Steel Melting Shop | Critical |
| Hydraulic System — CCM Mold Oscillation | Hydraulic (Rexroth 280bar) | Steel Melting Shop | Critical |
| Coke Oven Pusher Machine Drive | Motor (ABB 132kW) | Coke Oven | Medium |

### Pre-seeded Alerts

| Alert | Severity | Equipment |
|-------|----------|-----------|
| CCM Segment Bearing temperature 94 deg C approaching critical limit | Critical | CCM Strand 2 |
| Blast Furnace main drive vibration 8.7 mm/s above alarm threshold | High | BF-1 Main Drive |
| HSM Gearbox oil pressure dropped to 2.1 bar below warning level | Medium | HSM Work Roll Drive |

---

## Data Sources

No proprietary Tata Steel data was available for this submission. The system uses:

1. **Synthetic operational data** — seeded at startup, modeled after real steel plant parameters and ISO standards
2. **Domain knowledge base** — compiled from ISO 10816 vibration standards, bearing maintenance handbooks, and steel plant engineering best practices
3. **Sample manuals** — realistic equipment manual and SOP documents in `data/manuals/`
4. **RUL dataset** — 90-day bearing degradation curve compatible with NASA CMAPSS format

The system is designed to accept real SCADA/sensor data through the `/sensors/ingest` API without any code changes.

---

## Judging Criteria Coverage

| Criterion | Implementation |
|-----------|---------------|
| Problem understanding and solution approach | Full-stack system addressing every requirement in the problem statement |
| Effective use of Agentic AI frameworks | LangChain agents, RAG, multi-turn conversation, LangGraph |
| Technical implementation and innovation | 41 API endpoints, TypeScript frontend, async Python backend, real Groq AI |
| Scalability and real-world applicability | Architecture supports PostgreSQL, real SCADA data, multi-plant deployment |
| Quality of presentation and communication | Professional dark theme UI, no emojis, clean typography, structured AI responses |
| Business impact and feasibility | Directly addresses all 6 business outcomes stated in problem section 8 |

---

## Assumptions and Limitations

**Assumptions**
- Sensor readings are provided in engineering units (mm/s, degrees C, bar)
- Equipment metadata is entered at onboarding time
- Groq API key is available for production use

**Limitations**
- SQLite used for development — PostgreSQL recommended for production
- No authentication or role-based access control implemented
- RUL uses linear degradation (simplified) — Weibull or LSTM would be more accurate
- ChromaDB requires HuggingFace model download (~90MB) on first run if Groq embeddings not available
- No direct SCADA/OPC-UA integration (sensor data ingested via API)

**Production Enhancements (out of scope for hackathon)**
- OPC-UA / MQTT real-time data integration
- Fine-tuned domain LLM on historical Tata Steel maintenance data
- Mobile application for field technicians
- Integration with SAP/ERP for automated work order creation
- Multi-plant deployment with tenant isolation

---

*Maintenance Wizard — Built for Tata Steel AI Hackathon 2026, Round 2: Agentic AI Challenge*
