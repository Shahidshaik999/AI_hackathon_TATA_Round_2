"""Report Agent - Generates structured maintenance reports."""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import json

from app.agents.llm_client import get_llm

logger = logging.getLogger(__name__)

REPORT_SYSTEM_PROMPT = """You are a senior maintenance report writer for a steel manufacturing plant.
Generate professional, structured maintenance reports based on provided data.

FORMATTING RULES — follow strictly:
- Use # for the main report title
- Use ## for major sections
- Use ### for sub-sections
- Use numbered lists (1. 2. 3.) for sequential actions
- Use bullet lists (- item) for non-sequential observations
- Do NOT use **double asterisks** anywhere
- Do NOT use emojis
- Write in formal, professional engineering language suitable for plant management
- All section headings must be on their own line"""

MAINTENANCE_SUMMARY_TEMPLATE = """
Generate a comprehensive maintenance summary report based on the following data.

Equipment: {equipment_name} ({equipment_type})
Location: {location}
Report Period: {date_from} to {date_to}

Diagnosis History: {diagnosis_summary}
Active Alerts: {alerts_summary}
Recent Maintenance: {maintenance_summary}
Health Score: {health_score}/100

Generate a professional report with:
1. Executive Summary (2-3 sentences)
2. Equipment Health Assessment
3. Key Issues Identified
4. Risk Analysis
5. Maintenance Actions Taken
6. Recommended Next Actions (prioritized)
7. Spare Parts Recommendations
8. Conclusion

Format as structured text with clear headings."""


class ReportAgent:
    """Agent for generating structured maintenance reports."""

    def __init__(self):
        self.llm = None

    def _get_llm(self):
        if self.llm is None:
            self.llm = get_llm(temperature=0.1, model="gpt-4o")
        return self.llm

    async def generate_maintenance_summary(
        self,
        equipment: Dict[str, Any],
        diagnoses: List[Dict[str, Any]],
        alerts: List[Dict[str, Any]],
        maintenance_logs: List[Dict[str, Any]],
        health_score: float,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Generate a comprehensive maintenance summary report."""

        # Summarize diagnoses
        diagnosis_summary = self._summarize_diagnoses(diagnoses)
        alerts_summary = self._summarize_alerts(alerts)
        maintenance_summary = self._summarize_maintenance(maintenance_logs)

        date_from_str = date_from.strftime("%Y-%m-%d") if date_from else "N/A"
        date_to_str = date_to.strftime("%Y-%m-%d") if date_to else datetime.now().strftime("%Y-%m-%d")

        prompt = MAINTENANCE_SUMMARY_TEMPLATE.format(
            equipment_name=equipment.get("name", "Unknown"),
            equipment_type=equipment.get("equipment_type", "Unknown"),
            location=equipment.get("location", "Unknown"),
            date_from=date_from_str,
            date_to=date_to_str,
            diagnosis_summary=diagnosis_summary,
            alerts_summary=alerts_summary,
            maintenance_summary=maintenance_summary,
            health_score=health_score,
        )

        try:
            from langchain_core.messages import HumanMessage, SystemMessage
            llm = self._get_llm()
            messages = [
                SystemMessage(content=REPORT_SYSTEM_PROMPT),
                HumanMessage(content=prompt),
            ]
            response = await llm.ainvoke(messages)
            report_content = response.content

        except Exception as e:
            logger.error(f"Report generation failed: {e}")
            report_content = self._generate_fallback_report(
                equipment, diagnoses, alerts, maintenance_logs, health_score
            )

        return {
            "report_type": "maintenance_summary",
            "equipment_id": equipment.get("id"),
            "equipment_name": equipment.get("name"),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "date_from": date_from_str,
            "date_to": date_to_str,
            "health_score": health_score,
            "content": report_content,
            "metadata": {
                "diagnoses_count": len(diagnoses),
                "alerts_count": len(alerts),
                "maintenance_actions_count": len(maintenance_logs),
            },
        }

    async def generate_alert_report(
        self,
        alert: Dict[str, Any],
        equipment: Dict[str, Any],
        sensor_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Generate a structured alert report."""

        severity = alert.get("severity", "medium").upper()
        equipment_name = equipment.get("name", "Unknown Equipment")
        alert_type = alert.get("alert_type", "Unknown")
        triggered_at = alert.get("triggered_at", "Unknown")
        alert_status = alert.get("status", "Active").upper()
        alert_description = alert.get("description", "No description provided.")
        alert_analysis = alert.get("ai_analysis", "Automated analysis pending.")
        alert_recommended = alert.get("recommended_action", "1. Inspect equipment immediately\n2. Check sensor readings\n3. Contact maintenance supervisor")
        eq_location = equipment.get("location", "Unknown")
        eq_plant_area = equipment.get("plant_area", "Unknown")
        generated_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        sensor_table = self._format_sensor_data_table(sensor_data)

        report_content = f"""
# ABNORMAL CONDITION ALERT REPORT

**SEVERITY: {severity}**
**Generated:** {generated_time}
**Equipment:** {equipment_name}
**Location:** {eq_location}
**Plant Area:** {eq_plant_area}

---

## Alert Details

| Field | Value |
|-------|-------|
| Alert Type | {alert_type} |
| Severity | {severity} |
| Triggered At | {triggered_at} |
| Status | {alert_status} |

## Description

{alert_description}

## AI Analysis

{alert_analysis}

## Recommended Immediate Actions

{alert_recommended}

## Sensor Readings at Time of Alert

{sensor_table}

---

## Action Required

- [ ] Acknowledge alert
- [ ] Dispatch maintenance crew
- [ ] Verify sensor readings on-site
- [ ] Take corrective action
- [ ] Update maintenance log
- [ ] Close alert when resolved

**Report prepared by:** Maintenance Wizard AI System
**Tata Steel Maintenance Operations**
"""

        return {
            "report_type": "alert_report",
            "alert_id": alert.get("id"),
            "equipment_name": equipment_name,
            "severity": alert.get("severity", "medium"),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "content": report_content,
        }

    def _summarize_diagnoses(self, diagnoses: List[Dict]) -> str:
        if not diagnoses:
            return "No diagnostic sessions recorded in this period."
        summaries = []
        for d in diagnoses[:5]:
            summaries.append(
                f"- [{d.get('created_at', 'N/A')}] Risk: {d.get('risk_level', 'N/A')} | "
                f"{d.get('diagnosis', 'N/A')[:100]}"
            )
        return "\n".join(summaries)

    def _summarize_alerts(self, alerts: List[Dict]) -> str:
        if not alerts:
            return "No alerts in this period."
        critical = sum(1 for a in alerts if a.get("severity") == "critical")
        high = sum(1 for a in alerts if a.get("severity") == "high")
        return f"Total alerts: {len(alerts)} (Critical: {critical}, High: {high})"

    def _summarize_maintenance(self, logs: List[Dict]) -> str:
        if not logs:
            return "No maintenance activities recorded."
        summaries = []
        for log in logs[:5]:
            summaries.append(
                f"- [{log.get('timestamp', 'N/A')}] {log.get('maintenance_type', 'N/A')}: "
                f"{log.get('description', 'N/A')[:80]}"
            )
        return "\n".join(summaries)

    def _format_sensor_data_table(self, sensor_data: Optional[Dict]) -> str:
        if not sensor_data:
            return "No sensor data available at time of alert."
        rows = []
        for key, value in sensor_data.items():
            rows.append(f"| {key} | {value} |")
        header = "| Parameter | Value |\n|-----------|-------|"
        return header + "\n" + "\n".join(rows)

    def _generate_fallback_report(
        self,
        equipment: Dict,
        diagnoses: List[Dict],
        alerts: List[Dict],
        logs: List[Dict],
        health_score: float,
    ) -> str:
        risk = "LOW" if health_score >= 80 else ("MEDIUM" if health_score >= 60 else ("HIGH" if health_score >= 35 else "CRITICAL"))
        return f"""# MAINTENANCE SUMMARY REPORT

**Equipment:** {equipment.get('name', 'Unknown')}
**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Executive Summary
Equipment health score is {health_score:.0f}/100 ({risk} risk). 
{len(alerts)} alerts recorded, {len(diagnoses)} diagnostic sessions completed.

## Equipment Health Assessment
- Health Score: {health_score:.0f}/100
- Risk Level: {risk}
- Active Alerts: {len([a for a in alerts if a.get('status') == 'active'])}

## Key Issues
{self._summarize_diagnoses(diagnoses)}

## Maintenance Actions
{self._summarize_maintenance(logs)}

## Recommended Next Actions
1. Review and address all active alerts
2. Schedule preventive maintenance if overdue
3. Monitor degradation trends closely
4. Ensure critical spare parts are available

*Report generated by Maintenance Wizard AI - Tata Steel*
"""


# Singleton
report_agent = ReportAgent()
