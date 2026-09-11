"""
AirFareX Intelligence Copilot - Pydantic Schemas
================================================

Request and response validation models for the chatbot API.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="User query or message")
    conversation_id: Optional[str] = Field(None, max_length=128, description="Optional conversation identifier for context continuation")


class ChatResponse(BaseModel):
    conversation_id: str
    intent: str
    message: str
    data: Optional[Dict[str, Any]] = None
    tool_used: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    context: Optional[Dict[str, Any]] = None


class ResetRequest(BaseModel):
    conversation_id: str = Field(..., min_length=1, max_length=128)


class ResetResponse(BaseModel):
    status: str
    conversation_id: str
    message: str


class ChatMessageRecord(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str
    timestamp: str
    tool_used: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class ConversationHistoryResponse(BaseModel):
    conversation_id: str
    created_at: str
    updated_at: str
    context: Dict[str, Any]
    messages: List[ChatMessageRecord]


class ChatHealthResponse(BaseModel):
    status: str
    copilot_name: str
    gemini_configured: bool
    database_connected: bool
    tools_available: List[str]
