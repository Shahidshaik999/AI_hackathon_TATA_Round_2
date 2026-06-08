"""LLM client — uses Groq (primary) -> OpenAI -> Mock fallback."""
import logging
import json
from app.config import settings

logger = logging.getLogger(__name__)


def get_llm(temperature: float = 0.1, model: str = "gpt-4o"):
    """
    Return an LLM instance.
    Priority: Groq (if key set) -> OpenAI (if key set) -> Mock
    """

    # ── Groq ──────────────────────────────────────────────────────────────────
    groq_key = (settings.groq_api_key or "").strip()
    if groq_key:
        try:
            from langchain_groq import ChatGroq
            # Use llama-3.3-70b-versatile — latest stable Groq model (June 2026)
            llm = ChatGroq(
                model="llama-3.3-70b-versatile",
                temperature=temperature,
                api_key=groq_key,
                max_retries=2,
            )
            logger.info("Using Groq LLM (llama-3.3-70b-versatile)")
            return llm
        except Exception as e:
            logger.warning(f"Groq init failed: {e} — trying OpenAI")

    # ── OpenAI ────────────────────────────────────────────────────────────────
    openai_key = (settings.openai_api_key or "").strip()
    if openai_key:
        try:
            from langchain_openai import ChatOpenAI
            llm = ChatOpenAI(
                model=model,
                temperature=temperature,
                api_key=openai_key,
                streaming=True,
            )
            logger.info("Using OpenAI LLM (gpt-4o)")
            return llm
        except Exception as e:
            logger.warning(f"OpenAI init failed: {e} — using mock")

    # ── Mock (demo fallback) ───────────────────────────────────────────────────
    logger.warning("No valid API key found — using built-in demo responses")
    return MockLLM()


class MockLLM:
    """Deterministic demo responses used when no API key is configured."""

    async def ainvoke(self, messages) -> "MockResponse":
        content = self._generate_mock_response(str(messages[-1]) if messages else "")
        return MockResponse(content=content)

    def _generate_mock_response(self, last_msg: str) -> str:
        msg = last_msg.lower()

        if any(w in msg for w in ["diagnos", "fault", "failure", "vibration", "temperature", "analyse", "analyze"]):
            return json.dumps({
                "diagnosis": "Bearing wear detected in main drive motor. Elevated vibration at 8.2 mm/s and temperature at 87 deg C indicate progressive bearing degradation. Immediate maintenance action is required to prevent unplanned failure.",
                "root_causes": [
                    {"cause": "Inadequate lubrication — interval exceeded by 340 hours", "probability": 0.72, "evidence": "Vibration spectrum shows BPFO frequency components; Lubrication log overdue by 340 hours; Bearing temperature trending upward 2.5 deg C per day; Last greasing recorded 47 days ago against 30-day schedule"},
                    {"cause": "Shaft misalignment", "probability": 0.45, "evidence": "Vibration shows dominant 2x running speed component; Axial vibration 40 percent of radial — indicates angular misalignment; Coupling inspection not recorded in last 6 months"}
                ],
                "risk_level": "high",
                "rul_estimate_days": 12.5,
                "rul_confidence": 0.78,
                "confidence_score": 0.84,
                "immediate_actions": [
                    "Reduce operating load by 20 percent immediately",
                    "Apply emergency lubrication — grease grade NLGI 2",
                    "Schedule bearing replacement within 72 hours"
                ],
                "recommendations": [
                    {"action": "Replace main drive bearing SKF 22320 (P/N: B-2247)", "priority": "high", "timeline": "Within 3 days", "responsible": "Mechanical maintenance team"},
                    {"action": "Perform shaft alignment check using laser alignment tool", "priority": "medium", "timeline": "During bearing replacement downtime", "responsible": "Alignment specialist"},
                    {"action": "Install permanent vibration monitoring sensor", "priority": "low", "timeline": "Next planned shutdown", "responsible": "Instrumentation team"}
                ],
                "long_term_actions": [
                    "Review and update lubrication schedule for all drive motors in the plant",
                    "Install online condition monitoring system on critical motors"
                ],
                "spare_parts_needed": [
                    {"part_name": "Main drive bearing SKF 22320", "part_number": "B-2247", "quantity_needed": 2, "available_in_stock": 2, "procurement_lead_days": 5, "urgency": "immediate"},
                    {"part_name": "Bearing grease NLGI 2 (1kg)", "part_number": "G-0012", "quantity_needed": 1, "available_in_stock": 5, "procurement_lead_days": 1, "urgency": "within_week"}
                ],
                "process_defects_detected": ["Possible uneven load distribution due to misalignment affecting product quality"],
                "early_warning_signals": ["Vibration trending upward 0.3 mm/s per week over last 3 weeks"]
            })

        if any(w in msg for w in ["report", "summary", "maintenance plan"]):
            return """# Maintenance Summary Report

## Executive Summary

Equipment health analysis has been completed for the requested asset. Based on sensor data trends and maintenance history, the equipment is operating with elevated risk indicators that require prompt attention.

## Equipment Health Assessment

- Current Health Score: 65 out of 100 — Medium Risk
- Active Alerts: 2 (1 high severity, 1 medium severity)
- Days Since Last Maintenance: 87 days

## Key Issues Identified

1. Bearing vibration trending upward — 15 percent increase observed over the past 3 weeks
2. Lubrication service interval overdue by 340 hours
3. Oil temperature elevated by 8 degrees C above established baseline

## Recommended Next Actions

1. Schedule bearing lubrication within 24 hours — urgent priority
2. Plan bearing replacement within 5 to 7 days
3. Perform shaft alignment check during next available downtime window

## Spare Parts Required

- Main drive bearing (P/N: B-2247) x 2 — available in stock
- Alignment shims — verify current stock level

Report generated by Maintenance Wizard AI — Tata Steel"""

        # General conversational response
        return (
            "## Maintenance Wizard AI\n\n"
            "I can help you with the following:\n\n"
            "- Fault diagnosis — describe symptoms or share sensor readings\n"
            "- Root cause analysis — systematic investigation of equipment failures\n"
            "- Maintenance recommendations — step-by-step prioritised actions\n"
            "- Knowledge lookup — search equipment manuals and SOPs\n"
            "- Spare parts — check availability and procurement lead times\n\n"
            "Please describe the equipment issue you are experiencing."
        )


class MockResponse:
    def __init__(self, content: str):
        self.content = content
