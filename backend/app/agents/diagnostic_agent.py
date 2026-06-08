"""Diagnostic Agent - Fault diagnosis and root cause analysis."""
import logging
import json
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.agents.llm_client import get_llm
from app.agents.knowledge_agent import knowledge_agent

logger = logging.getLogger(__name__)

DIAGNOSTIC_SYSTEM_PROMPT = """You are an expert industrial maintenance engineer AI for a steel manufacturing plant.
Your role is to diagnose equipment faults, identify root causes, and recommend maintenance actions.

You have deep expertise in blast furnaces, continuous casting machines, rolling mills, electric arc furnaces,
pumps, motors, compressors, hydraulic systems, cranes, conveyors, and material handling equipment.

FORMATTING RULES — follow strictly:
- Do NOT use **double asterisks** for bold text anywhere in your response
- Do NOT use emojis
- Output MUST be valid JSON matching the specified schema
- In string fields, use plain text only — no markdown symbols
- For lists within JSON string fields, use numbered format: 1. Step one 2. Step two
- Keep diagnosis field as a plain professional paragraph
- Keep each root cause evidence field as a plain sentence"""

DIAGNOSTIC_PROMPT_TEMPLATE = """
Analyze the following equipment issue and provide a comprehensive maintenance diagnosis.

## Equipment Information
{equipment_info}

## Reported Issue / Query
{query}

## Current Sensor Readings
{sensor_data}

## Relevant Knowledge Base Context
{knowledge_context}

## Historical Maintenance Records
{maintenance_history}

Provide your analysis in the following JSON format:
{{
  "diagnosis": "Clear, concise diagnosis statement (2-3 sentences)",
  "root_causes": [
    {{
      "cause": "Root cause description",
      "probability": 0.0-1.0,
      "evidence": "Point 1: specific sensor reading or observation; Point 2: maintenance history fact; Point 3: additional supporting indicator"
    }}
  ],
  "risk_level": "low|medium|high|critical",
  "rul_estimate_days": null_or_number,
  "rul_confidence": 0.0-1.0,
  "confidence_score": 0.0-1.0,
  "immediate_actions": ["action1", "action2"],
  "recommendations": [
    {{
      "action": "Specific action to take",
      "priority": "high|medium|low",
      "timeline": "e.g., Within 24 hours",
      "responsible": "e.g., Mechanical team"
    }}
  ],
  "long_term_actions": ["action1", "action2"],
  "spare_parts_needed": [
    {{
      "part_name": "Part name",
      "part_number": "P/N or null",
      "quantity_needed": 1,
      "available_in_stock": null,
      "procurement_lead_days": null,
      "urgency": "immediate|within_week|planned"
    }}
  ],
  "process_defects_detected": [],
  "early_warning_signals": []
}}

CRITICAL: For each root cause, the evidence field MUST contain 2-4 specific bullet points separated by semicolons.
Each evidence point should reference a specific sensor value, threshold, maintenance record, or observation.
Example evidence format: Vibration 8.7 mm/s exceeds alarm threshold of 7.1 mm/s; Lubrication interval exceeded by 340 hours; Bearing temperature trending upward 3 deg C per day; BPFO frequency components detected in vibration spectrum"""


class DiagnosticAgent:
    """Agent for diagnosing equipment faults and performing root cause analysis."""

    def __init__(self):
        self.llm = None

    def _get_llm(self):
        if self.llm is None:
            self.llm = get_llm(temperature=0.05, model="gpt-4o")
        return self.llm

    async def diagnose(
        self,
        query: str,
        equipment: Dict[str, Any],
        sensor_data: Optional[Dict[str, Any]] = None,
        maintenance_history: Optional[List[Dict]] = None,
        fault_description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Run full diagnostic analysis on equipment issue."""

        trace = []
        trace.append({"step": "start", "agent": "diagnostic", "timestamp": datetime.utcnow().isoformat()})

        # Step 1: Build query context
        equipment_type = equipment.get("equipment_type", "")
        full_query = f"{query}"
        if fault_description:
            full_query += f"\nFault Description: {fault_description}"

        # Step 2: Retrieve knowledge context
        trace.append({"step": "knowledge_retrieval", "query": full_query[:100]})
        knowledge_docs = await knowledge_agent.retrieve(full_query, equipment_type)
        knowledge_context = "\n\n".join([f"[{d['source']}]:\n{d['content']}" for d in knowledge_docs[:3]])

        # Step 3: Format inputs
        equipment_info = self._format_equipment_info(equipment)
        sensor_str = self._format_sensor_data(sensor_data)
        history_str = self._format_maintenance_history(maintenance_history)

        # Step 4: Build prompt and call LLM
        prompt = DIAGNOSTIC_PROMPT_TEMPLATE.format(
            equipment_info=equipment_info,
            query=full_query,
            sensor_data=sensor_str,
            knowledge_context=knowledge_context[:2000] if knowledge_context else "No specific context available.",
            maintenance_history=history_str,
        )

        trace.append({"step": "llm_inference", "model": "gpt-4o"})

        try:
            from langchain_core.messages import HumanMessage, SystemMessage
            llm = self._get_llm()
            messages = [
                SystemMessage(content=DIAGNOSTIC_SYSTEM_PROMPT),
                HumanMessage(content=prompt),
            ]
            response = await llm.ainvoke(messages)
            raw_content = response.content

            # Parse JSON response
            result = self._parse_llm_response(raw_content)
            trace.append({"step": "complete", "success": True})

        except Exception as e:
            logger.error(f"LLM diagnostic failed: {e}")
            result = self._fallback_diagnosis(query, equipment, sensor_data)
            trace.append({"step": "fallback", "error": str(e)})

        result["agent_trace"] = trace
        result["sources_used"] = [d["source"] for d in knowledge_docs]
        return result

    def _parse_llm_response(self, content: str) -> Dict[str, Any]:
        """Parse JSON from LLM response."""
        # Try to extract JSON from code blocks
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Find JSON object in text
            start = content.find("{")
            end = content.rfind("}") + 1
            if start != -1 and end > start:
                return json.loads(content[start:end])
            raise ValueError("Could not parse JSON from LLM response")

    def _fallback_diagnosis(
        self,
        query: str,
        equipment: Dict[str, Any],
        sensor_data: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Rule-based fallback diagnosis when LLM is unavailable."""
        risk_level = "medium"
        immediate_actions = []
        root_causes = []

        # Simple rule-based logic
        if sensor_data:
            vibration = sensor_data.get("vibration_mm_s", 0)
            temperature = sensor_data.get("temperature_c", 0)
            if vibration > 10:
                risk_level = "critical"
                root_causes.append({
                    "cause": "Severe bearing failure — immediate shutdown required",
                    "probability": 0.85,
                    "evidence": f"Vibration {vibration} mm/s exceeds critical threshold (10 mm/s); ISO 10816 Class III limit violated by {vibration-10:.1f} mm/s; Risk of catastrophic failure if operation continues; Immediate inspection and bearing replacement required"
                })
                immediate_actions.append("Stop equipment immediately and inspect bearings")
            elif vibration > 7.5:
                risk_level = "high"
                root_causes.append({
                    "cause": "Bearing wear or misalignment — urgent maintenance required",
                    "probability": 0.75,
                    "evidence": f"Vibration {vibration} mm/s exceeds alarm threshold (7.5 mm/s); {((vibration-7.5)/7.5*100):.0f}% above alarm level; P-F interval likely within 1-2 weeks; Schedule bearing replacement within 48 hours"
                })
                immediate_actions.append("Reduce operating load and schedule urgent bearing inspection within 48 hours")

            if temperature > 90:
                risk_level = "critical" if risk_level != "critical" else risk_level
                root_causes.append({
                    "cause": "Critical overheating — cooling system or bearing failure",
                    "probability": 0.80,
                    "evidence": f"Temperature {temperature} deg C exceeds critical threshold (90 deg C); {temperature-90:.0f} deg C above critical limit; Risk of winding insulation damage if sustained; Check cooling flow and bearing condition immediately"
                })
                immediate_actions.append("Check cooling system immediately — reduce load to prevent thermal damage")

        return {
            "diagnosis": f"Analysis of {equipment.get('name', 'equipment')} based on available data. {query}",
            "root_causes": root_causes or [{"cause": "Further investigation required", "probability": 0.5, "evidence": "Insufficient data for definitive diagnosis"}],
            "risk_level": risk_level,
            "rul_estimate_days": None,
            "rul_confidence": None,
            "confidence_score": 0.45,
            "immediate_actions": immediate_actions or ["Conduct visual inspection", "Review maintenance history"],
            "recommendations": [
                {"action": "Schedule detailed inspection", "priority": "high", "timeline": "Within 24 hours", "responsible": "Maintenance team"}
            ],
            "long_term_actions": ["Review maintenance schedule", "Consider predictive maintenance upgrade"],
            "spare_parts_needed": [],
            "process_defects_detected": [],
            "early_warning_signals": [],
        }

    def _format_equipment_info(self, equipment: Dict[str, Any]) -> str:
        if not equipment:
            return "No equipment information provided"
        return (
            f"Name: {equipment.get('name', 'Unknown')}\n"
            f"Type: {equipment.get('equipment_type', 'Unknown')}\n"
            f"Location: {equipment.get('location', 'Unknown')}\n"
            f"Plant Area: {equipment.get('plant_area', 'Unknown')}\n"
            f"Criticality: {equipment.get('criticality', 'medium')}\n"
            f"Manufacturer: {equipment.get('manufacturer', 'Unknown')}\n"
            f"Last Maintenance: {equipment.get('last_maintenance_date', 'Unknown')}"
        )

    def _format_sensor_data(self, sensor_data: Optional[Dict[str, Any]]) -> str:
        if not sensor_data:
            return "No sensor data provided"
        lines = []
        for key, value in sensor_data.items():
            lines.append(f"- {key}: {value}")
        return "\n".join(lines)

    def _format_maintenance_history(self, history: Optional[List[Dict]]) -> str:
        if not history:
            return "No maintenance history available"
        lines = []
        for record in history[:5]:
            lines.append(
                f"- {record.get('timestamp', '')} | {record.get('maintenance_type', '')} | "
                f"{record.get('description', '')}"
            )
        return "\n".join(lines)


# Singleton
diagnostic_agent = DiagnosticAgent()
