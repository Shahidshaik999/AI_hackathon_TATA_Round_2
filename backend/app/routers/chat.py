"""Chat endpoints - multi-turn conversational interface."""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import json
import logging

from app.database import get_db
from app.models.db_models import ConversationSession, Equipment as EquipmentModel
from app.schemas.schemas import ChatRequest, ChatResponse
from app.agents.chat_agent import chat_agent

router = APIRouter(prefix="/chat", tags=["Chat"])
logger = logging.getLogger(__name__)


@router.post("/", response_model=dict)
async def send_message(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get AI response."""

    # Get or create session
    session = None
    if request.session_id:
        result = await db.execute(
            select(ConversationSession).where(
                ConversationSession.id == request.session_id
            )
        )
        session = result.scalar_one_or_none()

    if not session:
        session = ConversationSession(
            id=request.session_id or str(uuid.uuid4()),
            equipment_id=request.equipment_id,
            user_role=request.user_role,
            messages=[],
            context=request.context or {},
        )
        db.add(session)

    # Get equipment if specified
    equipment = None
    equipment_id = request.equipment_id or session.equipment_id
    if equipment_id:
        eq_result = await db.execute(
            select(EquipmentModel).where(EquipmentModel.id == equipment_id)
        )
        eq = eq_result.scalar_one_or_none()
        if eq:
            equipment = {
                "id": eq.id,
                "name": eq.name,
                "equipment_type": eq.equipment_type,
                "location": eq.location,
                "criticality": eq.criticality,
            }

    # Add user message to history
    messages = session.messages or []
    user_message = {
        "role": "user",
        "content": request.message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    messages.append(user_message)

    # Get AI response
    response = await chat_agent.chat(
        message=request.message,
        session_messages=messages[:-1],  # History without current message
        equipment=equipment,
        user_role=request.user_role,
        context=request.context,
    )

    # Add assistant message to history
    assistant_message = {
        "role": "assistant",
        "content": response["message"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent_type": response.get("agent_type", "conversational"),
    }
    messages.append(assistant_message)

    # Update session
    session.messages = messages
    session.updated_at = datetime.now(timezone.utc)

    await db.commit()

    return {
        "session_id": session.id,
        "message": response["message"],
        "agent_type": response.get("agent_type", "conversational"),
        "sources": response.get("sources", []),
        "follow_up_suggestions": response.get("follow_up_suggestions", []),
        "alerts_triggered": response.get("alerts_triggered", []),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/sessions/{session_id}/history")
async def get_chat_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get chat history for a session."""
    result = await db.execute(
        select(ConversationSession).where(ConversationSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": session_id,
        "messages": session.messages or [],
        "equipment_id": session.equipment_id,
        "created_at": session.created_at.isoformat() if session.created_at else None,
    }


@router.delete("/sessions/{session_id}")
async def clear_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Clear chat session history."""
    result = await db.execute(
        select(ConversationSession).where(ConversationSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.messages = []
    session.is_active = False
    await db.commit()
    return {"message": "Session cleared"}


# WebSocket for real-time chat
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        self.active_connections.pop(session_id, None)

    async def send_message(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_json(message)


ws_manager = ConnectionManager()


@router.websocket("/ws/{session_id}")
async def websocket_chat(
    websocket: WebSocket,
    session_id: str,
):
    """WebSocket endpoint for real-time chat."""
    await ws_manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            message = payload.get("message", "")
            equipment_id = payload.get("equipment_id")

            # Get AI response
            response = await chat_agent.chat(
                message=message,
                session_messages=payload.get("history", []),
                equipment=payload.get("equipment"),
                user_role=payload.get("user_role", "engineer"),
            )

            await websocket.send_json({
                "type": "message",
                "session_id": session_id,
                "message": response["message"],
                "agent_type": response.get("agent_type"),
                "follow_up_suggestions": response.get("follow_up_suggestions", []),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

    except WebSocketDisconnect:
        ws_manager.disconnect(session_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(session_id)
