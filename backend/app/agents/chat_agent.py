"""Chat Agent - Multi-turn conversational interface for maintenance engineers."""
import logging
from typing import Dict, Any, List, Optional

from app.agents.llm_client import get_llm
from app.agents.knowledge_agent import knowledge_agent

logger = logging.getLogger(__name__)

CHAT_SYSTEM_PROMPT = """You are the Maintenance Wizard, an expert AI assistant for steel plant maintenance engineers at Tata Steel.

You assist with fault diagnosis, root cause analysis, maintenance planning, SOP lookup, spare parts guidance, and failure prediction.

FORMATTING RULES — follow strictly:
- Use ## for section headings (e.g. ## Root Cause Analysis)
- Use ### for sub-headings
- Use numbered lists (1. 2. 3.) for sequential steps or ranked items
- Use bullet lists (- item) for non-sequential points
- Use -> for action items or recommendations
- Do NOT use **double asterisks** for bold — the renderer handles headings automatically
- Do NOT use emojis anywhere
- Write in clear, professional engineering language
- Keep paragraphs short (2-3 sentences max)

RESPONSE STRUCTURE for maintenance questions:
## Summary
[1-2 sentence direct answer]

## Key Findings
[bullet list of observations]

## Recommended Actions
[numbered steps in priority order]

## Follow-up Questions
[3 short questions the engineer might ask next, one per line starting with ->]

For general questions, skip the structure and respond conversationally but still follow formatting rules."""

CHAT_PROMPT_TEMPLATE = """Equipment context: {equipment_context}

Relevant knowledge base:
{knowledge_context}

Conversation history:
{history}

Engineer ({user_role}) asks: {message}

Respond following the formatting rules in your system instructions."""


class ChatAgent:
    def __init__(self):
        self.llm = None

    def _get_llm(self):
        if self.llm is None:
            self.llm = get_llm(temperature=0.15, model="gpt-4o")
        return self.llm

    async def chat(
        self,
        message: str,
        session_messages: List[Dict[str, str]],
        equipment: Optional[Dict[str, Any]] = None,
        user_role: str = "engineer",
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:

        knowledge_docs = await knowledge_agent.retrieve(
            message,
            equipment.get("equipment_type") if equipment else None,
        )
        knowledge_context = "\n\n".join([
            f"[{d['source']}]: {d['content'][:400]}"
            for d in knowledge_docs[:2]
        ]) or "No specific context found."

        history_str = self._format_history(session_messages[-10:])

        equipment_context = "No specific equipment selected."
        if equipment:
            equipment_context = (
                f"Name: {equipment.get('name')} | "
                f"Type: {equipment.get('equipment_type')} | "
                f"Location: {equipment.get('location', 'Unknown')} | "
                f"Criticality: {equipment.get('criticality', 'medium')}"
            )

        prompt = CHAT_PROMPT_TEMPLATE.format(
            equipment_context=equipment_context,
            knowledge_context=knowledge_context,
            history=history_str,
            message=message,
            user_role=user_role,
        )

        try:
            from langchain_core.messages import HumanMessage, SystemMessage
            llm = self._get_llm()
            response = await llm.ainvoke([
                SystemMessage(content=CHAT_SYSTEM_PROMPT),
                HumanMessage(content=prompt),
            ])
            response_text = response.content
        except Exception as e:
            logger.error(f"Chat LLM failed: {e}")
            response_text = self._fallback_response(message, equipment)

        follow_ups = self._extract_follow_ups(response_text)

        agent_type = "diagnostic" if any(
            w in message.lower() for w in ["diagnos", "fault", "failure", "vibration", "temperature", "broken"]
        ) else ("knowledge" if knowledge_docs else "conversational")

        return {
            "message": response_text,
            "agent_type": agent_type,
            "sources": list(set(d["source"] for d in knowledge_docs)),
            "follow_up_suggestions": follow_ups,
            "alerts_triggered": [],
        }

    def _format_history(self, messages: List[Dict]) -> str:
        if not messages:
            return "No previous conversation."
        return "\n".join(
            f"{msg.get('role', 'user').capitalize()}: {msg.get('content', '')[:300]}"
            for msg in messages
        )

    def _extract_follow_ups(self, text: str) -> List[str]:
        """Extract -> follow-up lines from the response."""
        follow_ups = []
        in_section = False
        for line in text.split("\n"):
            stripped = line.strip()
            if "follow-up" in stripped.lower() or "follow up" in stripped.lower():
                in_section = True
                continue
            if in_section and stripped.startswith("->"):
                cleaned = stripped.lstrip("->").strip()
                if cleaned and len(cleaned) > 10:
                    follow_ups.append(cleaned)
                if len(follow_ups) >= 3:
                    break
            elif in_section and stripped.startswith("##"):
                break
        return follow_ups

    def _fallback_response(self, message: str, equipment: Optional[Dict]) -> str:
        msg_lower = message.lower()
        eq_name = equipment.get("name", "the equipment") if equipment else "the equipment"

        if any(w in msg_lower for w in ["vibration", "vibrating", "shaking"]):
            return (
                f"## Vibration Analysis — {eq_name}\n\n"
                "High vibration in industrial equipment typically indicates one of the following causes:\n\n"
                "- Bearing wear — most common, especially with gradual increase over time\n"
                "- Shaft misalignment — presents as dominant 2x frequency component\n"
                "- Mass imbalance — 1x running speed dominant in vibration spectrum\n"
                "- Mechanical looseness — multiple harmonics present\n\n"
                "## Immediate Actions\n\n"
                "1. Check current vibration level against ISO 10816 alarm threshold\n"
                "2. Inspect bearing housing for unusual noise or heat\n"
                "3. Verify mounting bolts and baseframe integrity\n"
                "4. Review lubrication history — check if interval has been exceeded\n\n"
                "## Follow-up Questions\n\n"
                "-> What are the ISO 10816 vibration alarm thresholds for this motor class?\n"
                "-> How do I differentiate bearing failure from misalignment using vibration data?\n"
                "-> How to estimate remaining useful life from the current vibration trend?"
            )

        if any(w in msg_lower for w in ["temperature", "overheating", "hot", "heat"]):
            return (
                f"## Temperature Analysis — {eq_name}\n\n"
                "Elevated temperature in industrial equipment can indicate:\n\n"
                "- Cooling system failure — check coolant flow rate and inlet/outlet differential\n"
                "- Mechanical overload — verify operating load against rated capacity\n"
                "- Bearing degradation — friction from worn surfaces generates heat\n"
                "- Electrical fault — phase imbalance or insulation breakdown\n\n"
                "## Action Thresholds\n\n"
                "- Above 75 deg C: Warning — investigate cooling system\n"
                "- Above 85 deg C: Alarm — reduce load immediately\n"
                "- Above 95 deg C: Critical — initiate controlled shutdown\n\n"
                "## Follow-up Questions\n\n"
                "-> What is the normal operating temperature range for this equipment?\n"
                "-> How to verify if the cooling system is functioning correctly?\n"
                "-> When should thermal imaging inspection be scheduled?"
            )

        return (
            "## Maintenance Wizard AI\n\n"
            "I can assist with the following maintenance engineering tasks:\n\n"
            "- Fault diagnosis — describe symptoms or provide sensor readings\n"
            "- Root cause analysis — systematic investigation of equipment failures\n"
            "- Maintenance planning — schedule and prioritize activities\n"
            "- Knowledge lookup — equipment manuals, SOPs, and failure reports\n"
            "- Spare parts guidance — stock levels and procurement lead times\n\n"
            "Please describe the equipment issue or ask a specific maintenance question.\n\n"
            "## Follow-up Questions\n\n"
            "-> What are the early warning signs of bearing failure in rolling mills?\n"
            "-> How should maintenance be prioritized during a planned plant shutdown?\n"
            "-> Which spare parts should always be maintained in critical stock?"
        )


chat_agent = ChatAgent()
