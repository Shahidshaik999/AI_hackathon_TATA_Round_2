"""Knowledge Agent - RAG over equipment manuals, SOPs, and maintenance records."""
import logging
import os
from typing import List, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

# Comprehensive built-in knowledge base for steel plant equipment
BUILTIN_KNOWLEDGE = """
=== STEEL PLANT EQUIPMENT MAINTENANCE KNOWLEDGE BASE ===

## BLAST FURNACE MAINTENANCE

### Common Failures & Root Causes
1. **Tuyere Burnout**
   - Root cause: Excessive heat, inadequate cooling water flow, refractory failure
   - Symptoms: Temperature spike, reduced blast pressure, water leakage detection
   - Immediate action: Reduce blast rate, increase cooling, prepare spare tuyere
   - RUL indicator: Tuyere life typically 45-90 days depending on operating conditions

2. **Stave Cooler Failure**
   - Root cause: Thermal cycling, water quality issues, mechanical stress
   - Symptoms: Reduced cooling efficiency, hot spots on shell, water flow anomalies
   - Preventive: Monthly inspection, water quality monitoring, thermal imaging quarterly

3. **Bell & Hopper Wear**
   - Root cause: Abrasive burden material, inadequate sealing
   - Symptoms: Gas leakage, uneven burden distribution
   - Maintenance: Inspect seals every 30 days, replace worn components per schedule

### Sensor Thresholds - Blast Furnace
- Shell temperature: Normal 45-65°C, Warning >75°C, Critical >90°C
- Cooling water flow: Normal 120-150 m³/h, Warning <110 m³/h, Critical <90 m³/h
- Tuyere temperature: Normal 200-280°C, Warning >320°C, Critical >380°C
- Top gas pressure: Normal 1.8-2.2 bar, Warning <1.6 or >2.5 bar

---

## CONTINUOUS CASTING MACHINE (CCM)

### Common Failures & Root Causes
1. **Mold Copper Plate Wear**
   - Root cause: Thermal fatigue, mechanical wear, inadequate coating
   - Symptoms: Surface cracks in cast slab, taper loss >0.3mm, copper pickup
   - RUL: Typically 1000-1500 heats or 300-450 tons/m width
   - Action: Monitor taper and wear; replace at threshold

2. **Segment Roll Bearing Failure**
   - Root cause: Poor lubrication, misalignment, overload
   - Vibration indicator: >6.3 mm/s = warning; >10 mm/s = critical
   - Temperature: Bearing temp >80°C warning; >95°C critical
   - Lubrication: Every 500 operating hours

3. **Breakout Detection**
   - Root cause: Skull formation, mold heat transfer issues, speed mismatch
   - Prevention: Thermocouple monitoring at mold exit, maintain casting speed 0.8-1.2 m/min

### SOPs - CCM Operation
- Pre-heat mold before casting start: minimum 45 minutes
- Check mold cooling water: inlet/outlet temperature differential max 8°C
- Verify segment alignment before campaign: tolerance ±0.3mm
- Lubrication interval for segments: every 8 hours of continuous casting

---

## ROLLING MILL EQUIPMENT

### Hot Strip Mill - Common Issues
1. **Work Roll Bearing Failure**
   - Vibration threshold: >7.5 mm/s = replace immediately
   - Temperature: >95°C = stop and inspect
   - Root cause: Fatigue, inadequate lubrication, mill vibration (chatter)
   - MTBF: 600-800 hours under normal conditions

2. **Hydraulic System Failure**
   - Root cause: Seal degradation, contamination, pressure surges
   - Symptoms: Pressure fluctuation >±15%, slow response, oil temperature >65°C
   - Preventive: Oil analysis every 500 hours, filter change every 1000 hours

3. **Drive Gearbox Issues**
   - Oil temperature: Normal <65°C, Warning >70°C, Critical >80°C
   - Vibration: Normal <4.5 mm/s, Warning >6.0 mm/s, Critical >8.5 mm/s
   - Oil analysis: Check particle count monthly; NAS level should remain <8

### Cold Rolling Mill
- Work roll chatter detection: vibration frequency 100-150 Hz indicates chatter
- Emulsion system: maintain concentration 3.5-5.0%, temperature 50-55°C
- Roll change frequency: every 200-300 coils depending on grade

---

## ELECTRIC ARC FURNACE (EAF)

### Electrode System
- Electrode consumption: Normal 2.0-2.5 kg/ton, High >3.0 kg/ton
- Root cause of high consumption: short arc, water cooling issues, mechanical breakage
- Electrode slippage: check clamp hydraulics and electrode surface

### Transformer Issues
- Oil temperature: Normal <65°C, Warning >75°C, Critical >85°C
- Load tap changer: inspect every 200 heats
- Power factor: maintain >0.92

---

## PUMP & MOTOR SYSTEMS (ALL AREAS)

### General Motor Diagnostics
- Bearing vibration severity (ISO 10816):
  - Class I (<15 kW): Good <0.71, Satisfactory <1.8, Unsatisfactory <4.5, Unacceptable >4.5 mm/s
  - Class II (15-75 kW): Good <1.12, Satisfactory <2.8, Unsatisfactory <7.1 mm/s
  - Class III (>75 kW): Good <1.8, Satisfactory <4.5, Unsatisfactory <11.2 mm/s

### Root Cause Analysis Framework
1. Unbalance: 1x running speed dominant in spectrum
2. Misalignment: 2x and 3x components dominant
3. Bearing defect: BPFO, BPFI frequencies present
4. Looseness: Multiple harmonics, 0.5x subharmonic
5. Resonance: High amplitude at natural frequency

### Lubrication Best Practices
- Grease-lubricated bearings: interval = (14,000,000 / N*sqrt(D)) hours
  where N = speed RPM, D = bearing bore mm
- Oil-lubricated: change interval 2000-4000 hours, oil analysis at 1000h
- Temperature rise at bearing: if >15°C above ambient, investigate lubrication

---

## CRANE & MATERIAL HANDLING

### Overhead Crane Maintenance
- Wire rope inspection: monthly visual, replace at 10% broken wires in any lay
- Hook inspection: quarterly NDT, replace if >5% throat wear
- Brake lining: inspect every 500 lifts, replace at <50% thickness
- Runway inspection: quarterly, check rail wear, alignment, fasteners

---

## PREDICTIVE MAINTENANCE GUIDELINES

### RUL Estimation Methods
1. **Bearing**: Linear degradation from P-F interval
   - P-F interval typically 1-6 months
   - Use vibration trend + temperature trend
   - RUL = (Current_value - Alarm_threshold) / Degradation_rate

2. **Refractory lining**: Based on wear rate
   - BF hearth: measure campaign length, monitor Si content in hot metal
   - CCM mold: heat counter + taper measurement

3. **General equipment**: Weibull analysis on historical failure data
   - Mean life estimation from population data
   - Scale individual machine based on current condition indicators

### Risk Priority Number (RPN) Calculation
RPN = Severity × Occurrence × Detectability
- Severity: 1-10 (1=negligible, 10=safety critical)
- Occurrence: 1-10 (1=very rare, 10=very frequent)  
- Detectability: 1-10 (1=always detected, 10=not detectable)
- RPN >200: Immediate action required
- RPN 100-200: Action within 1 week
- RPN <100: Monitor and schedule

---

## FAULT CODES AND ERROR MESSAGES

### PLC/SCADA Common Fault Codes
- E001: Motor overcurrent - check load, bearings, cooling
- E002: Motor overtemperature - check cooling, load, ambient conditions  
- E003: Vibration alarm - check mounting, balance, alignment
- E004: Oil pressure low - check pump, filter, leaks
- E005: Cooling water flow low - check pump, filter, line blockage
- E010: Hydraulic pressure deviation - check pump, valve, actuator
- E020: Encoder/speed feedback fault - check encoder, coupling, wiring
- E021: Drive fault - check input voltage, cooling, parameters
- E030: Thermocouple open circuit - check wiring, replace thermocouple
- E031: Temperature high alarm - investigate heat source, cooling
- E040: Level sensor fault - check sensor, calibrate, clean
- E050: Pressure transmitter fault - check impulse line, calibrate

---

## SPARE PARTS CRITICALITY GUIDE

### A-Class (Critical - always in stock)
- Main drive bearings for all critical equipment
- Seal kits for hydraulic cylinders
- VFD/Drive control boards
- PLC I/O modules
- Pressure/temperature transmitters

### B-Class (Important - minimum 2-week stock)
- Secondary bearings
- Coupling elements
- Lubricants and oils
- Filter elements

### C-Class (Standard - order on demand)
- Structural components
- Non-critical instrumentation
- General fasteners

---

## MAINTENANCE SCHEDULING BEST PRACTICES

### Condition-Based Maintenance Triggers
1. Vibration: Plan maintenance when reaching 80% of alarm threshold
2. Temperature: Trending >2°C/week increase warrants investigation
3. Oil analysis: Metal particle count increase >50% from baseline
4. Production impact: Any quality deviation linked to equipment condition

### Maintenance Window Optimization
- Coordinate with production planning for planned maintenance
- Group activities by area to minimize shutdowns
- Critical path analysis for shutdown activities
- Average shutdown time estimates:
  - Motor/bearing replacement: 4-8 hours
  - Hydraulic seal replacement: 2-4 hours
  - Roll change: 30-45 minutes
  - Gearbox overhaul: 24-48 hours
"""


class KnowledgeAgent:
    """
    RAG-based knowledge agent that retrieves relevant context
    from the built-in knowledge base and any uploaded documents.
    """

    def __init__(self):
        self.vectorstore = None
        self.retriever = None
        self._initialized = False

    async def initialize(self):
        """Initialize the vector store with knowledge base."""
        try:
            import chromadb
            from langchain_community.vectorstores import Chroma
            from langchain.text_splitter import RecursiveCharacterTextSplitter

            # Try OpenAI embeddings, fall back to simple TF-IDF
            embeddings = self._get_embeddings()

            splitter = RecursiveCharacterTextSplitter(
                chunk_size=800,
                chunk_overlap=100,
                separators=["\n\n", "\n", ".", " "],
            )

            chunks = splitter.split_text(BUILTIN_KNOWLEDGE)
            metadatas = [{"source": "builtin_knowledge_base", "chunk": i} for i in range(len(chunks))]

            os.makedirs(settings.chroma_persist_dir, exist_ok=True)

            self.vectorstore = Chroma.from_texts(
                texts=chunks,
                embedding=embeddings,
                metadatas=metadatas,
                persist_directory=settings.chroma_persist_dir,
                collection_name="maintenance_knowledge",
            )
            self.retriever = self.vectorstore.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 5},
            )
            self._initialized = True
            logger.info(f"Knowledge base initialized with {len(chunks)} chunks.")

        except Exception as e:
            logger.warning(f"Vector store initialization failed: {e}. Using keyword search fallback.")
            self._initialized = False

    def _get_embeddings(self):
        """Get embeddings with fallback."""
        if settings.openai_api_key:
            from langchain_openai import OpenAIEmbeddings
            return OpenAIEmbeddings(api_key=settings.openai_api_key)

        # Fallback: HuggingFace sentence transformers (free)
        try:
            from langchain_community.embeddings import HuggingFaceEmbeddings
            return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        except Exception:
            pass

        # Last resort: simple fake embeddings
        from langchain_community.embeddings import FakeEmbeddings
        return FakeEmbeddings(size=384)

    async def retrieve(self, query: str, equipment_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve relevant knowledge for a query."""
        if self._initialized and self.retriever:
            try:
                docs = await self.retriever.ainvoke(query)
                return [
                    {"content": doc.page_content, "source": doc.metadata.get("source", "knowledge_base")}
                    for doc in docs
                ]
            except Exception as e:
                logger.warning(f"Vector retrieval failed: {e}, using keyword fallback")

        # Keyword-based fallback
        return self._keyword_search(query, equipment_type)

    def _keyword_search(self, query: str, equipment_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Simple keyword-based search over the knowledge base."""
        query_lower = query.lower()
        keywords = query_lower.split()

        # Split knowledge base into sections
        sections = BUILTIN_KNOWLEDGE.split("---")
        scored_sections = []

        for section in sections:
            score = sum(1 for kw in keywords if kw in section.lower())
            if equipment_type and equipment_type.lower() in section.lower():
                score += 3
            if score > 0:
                scored_sections.append((score, section.strip()))

        scored_sections.sort(reverse=True, key=lambda x: x[0])

        return [
            {"content": section[:1200], "source": "builtin_knowledge_base"}
            for _, section in scored_sections[:4]
        ]

    async def add_document(self, title: str, content: str, metadata: Dict[str, Any] = {}):
        """Add a new document to the knowledge base."""
        if not self._initialized or not self.vectorstore:
            logger.warning("Vector store not initialized, document not indexed")
            return 0

        from langchain.text_splitter import RecursiveCharacterTextSplitter
        splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
        chunks = splitter.split_text(content)
        metadatas = [{**metadata, "source": title, "chunk": i} for i in range(len(chunks))]

        self.vectorstore.add_texts(texts=chunks, metadatas=metadatas)
        return len(chunks)


# Singleton
knowledge_agent = KnowledgeAgent()
