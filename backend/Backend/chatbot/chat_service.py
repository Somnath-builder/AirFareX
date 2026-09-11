"""
AirFareX Intelligence Copilot - Chat Service
============================================

Primary orchestrator coordinating request validation, context retention,
Gemini function-calling, tool execution, and response synthesis.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from Backend.chatbot.schemas import (
    ChatRequest,
    ChatResponse,
    ResetResponse,
    ConversationHistoryResponse,
    ChatHealthResponse,
)
from Backend.chatbot.context_manager import ContextManager
from Backend.chatbot.gemini_client import GeminiCopilotClient
from Backend.chatbot.intent_classifier import (
    extract_airports,
    extract_dates,
    extract_budget,
)


class ChatService:
    """
    Main service coordinating the AirFareX Intelligence Copilot.
    """

    def __init__(self, db=None):
        self.db = db
        self.context_manager = ContextManager(db=db)
        self.gemini_client = GeminiCopilotClient(db=db)

    def process_chat_message(self, request: ChatRequest) -> ChatResponse:
        """
        Process a user natural-language message through the Copilot pipeline.
        """
        raw_msg = request.message.strip()

        # 1. Retrieve or create session context
        cid, session = self.context_manager.get_or_create_session(request.conversation_id)
        current_state = session.get("state", {})
        history = session.get("messages", [])

        # 2. Extract entities to keep context up to date
        extracted_orig, extracted_dest = extract_airports(raw_msg)
        d1, d2 = extract_dates(raw_msg)
        budget = extract_budget(raw_msg)

        updates = {}
        if extracted_orig:
            updates["origin"] = extracted_orig
        if extracted_dest:
            updates["destination"] = extracted_dest
        if d1:
            updates["travel_date"] = d1
        if budget:
            updates["budget"] = budget

        if updates:
            self.context_manager.update_state(cid, updates)
            current_state = session.get("state", {})

        # 3. Log user message into history
        self.context_manager.add_message(cid, role="user", content=raw_msg)

        # 4. Generate response via Gemini Client (with function-calling)
        message_text, tool_used, tool_data, intent = self.gemini_client.generate_chat_response(
            user_message=raw_msg,
            conversation_context=current_state,
            history=history,
        )

        # 5. Update session with intent & tool info
        self.context_manager.update_state(cid, {
            "last_intent": intent,
            "last_tool_used": tool_used,
        })

        # 6. Log assistant response into history
        self.context_manager.add_message(
            cid,
            role="assistant",
            content=message_text,
            tool_used=tool_used,
            data=tool_data,
        )

        now_iso = datetime.now(timezone.utc).isoformat()

        return ChatResponse(
            conversation_id=cid,
            intent=intent,
            message=message_text,
            data=tool_data,
            tool_used=tool_used,
            timestamp=now_iso,
            context=self.context_manager._sessions.get(cid, {}).get("state"),
        )

    def reset_conversation(self, conversation_id: str) -> ResetResponse:
        """Reset conversation context."""
        self.context_manager.reset_session(conversation_id)
        return ResetResponse(
            status="success",
            conversation_id=conversation_id,
            message=f"Conversation {conversation_id} context has been cleared."
        )

    def get_conversation_history(self, conversation_id: str) -> ConversationHistoryResponse:
        """Retrieve full conversation history."""
        cid, session = self.context_manager.get_or_create_session(conversation_id)
        return ConversationHistoryResponse(
            conversation_id=cid,
            created_at=session.get("created_at", ""),
            updated_at=session.get("updated_at", ""),
            context=session.get("state", {}),
            messages=session.get("messages", []),
        )

    def health_check(self) -> ChatHealthResponse:
        """Check chatbot subsystems status."""
        tools = [
            "search_flights",
            "get_cheapest_fare",
            "get_route_price",
            "get_price_history",
            "get_price_index",
            "find_cheapest_dates",
            "compare_fares",
            "get_booking_recommendation",
            "budget_search",
        ]
        return ChatHealthResponse(
            status="healthy",
            copilot_name="AirFareX Intelligence Copilot",
            gemini_configured=self.gemini_client.is_configured,
            database_connected=self.db is not None,
            tools_available=tools,
        )
