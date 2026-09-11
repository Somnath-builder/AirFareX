"""
AirFareX Intelligence Copilot - Context Manager
===============================================

Maintains conversation sessions and multi-turn state (origin, destination,
travel date, budget, previous intent) across successive messages.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple


class ContextManager:
    """
    Manages conversational memory with an in-memory session store
    and optional persistent storage in MongoDB `chat_sessions`.
    """

    def __init__(self, db=None, max_in_memory: int = 500):
        self.db = db
        self.max_in_memory = max_in_memory
        self._sessions: Dict[str, Dict[str, Any]] = {}

    def get_or_create_session(self, conversation_id: Optional[str] = None) -> Tuple[str, Dict[str, Any]]:
        """Retrieve existing session state or initialize a fresh one."""
        cid = conversation_id.strip() if conversation_id and conversation_id.strip() else f"afx_{uuid.uuid4().hex[:10]}"

        if cid in self._sessions:
            return cid, self._sessions[cid]

        # Check MongoDB persistent storage
        if self.db is not None:
            try:
                doc = self.db["chat_sessions"].find_one({"conversation_id": cid})
                if doc:
                    doc.pop("_id", None)
                    self._sessions[cid] = doc
                    return cid, doc
            except Exception as err:
                print(f"[Warning] Failed to read chat session from MongoDB: {err}")

        # Initialize fresh session
        now_iso = datetime.now(timezone.utc).isoformat()
        new_session: Dict[str, Any] = {
            "conversation_id": cid,
            "created_at": now_iso,
            "updated_at": now_iso,
            "state": {
                "origin": None,
                "destination": None,
                "travel_date": None,
                "passengers": 1,
                "cabin_class": "economy",
                "budget": None,
                "last_intent": None,
                "last_tool_used": None,
            },
            "messages": [],
        }

        # Keep memory bounded
        if len(self._sessions) >= self.max_in_memory:
            oldest_key = next(iter(self._sessions))
            self._sessions.pop(oldest_key, None)

        self._sessions[cid] = new_session
        self._persist_to_mongo(cid, new_session)
        return cid, new_session

    def update_state(self, conversation_id: str, new_fields: Dict[str, Any]):
        """Update context slots like origin, destination, travel_date."""
        if conversation_id in self._sessions:
            state = self._sessions[conversation_id].setdefault("state", {})
            for key, val in new_fields.items():
                if val is not None:
                    state[key] = val
            self._sessions[conversation_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._persist_to_mongo(conversation_id, self._sessions[conversation_id])

    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        tool_used: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
    ):
        """Append a message turn to the conversation history."""
        if conversation_id in self._sessions:
            msg_record = {
                "role": role,
                "content": content,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "tool_used": tool_used,
                "data": data,
            }
            # Retain last 20 messages to keep context window light and token-efficient
            messages = self._sessions[conversation_id].setdefault("messages", [])
            messages.append(msg_record)
            if len(messages) > 20:
                self._sessions[conversation_id]["messages"] = messages[-20:]

            self._sessions[conversation_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._persist_to_mongo(conversation_id, self._sessions[conversation_id])

    def reset_session(self, conversation_id: str) -> bool:
        """Clear conversation memory for a given ID."""
        self._sessions.pop(conversation_id, None)
        if self.db is not None:
            try:
                self.db["chat_sessions"].delete_one({"conversation_id": conversation_id})
            except Exception:
                pass
        return True

    def get_history(self, conversation_id: str) -> List[Dict[str, Any]]:
        """Return history list for conversation ID."""
        if conversation_id in self._sessions:
            return self._sessions[conversation_id].get("messages", [])
        return []

    def _persist_to_mongo(self, conversation_id: str, session_data: Dict[str, Any]):
        """Save session asynchronously or best-effort into MongoDB."""
        if self.db is not None:
            try:
                self.db["chat_sessions"].update_one(
                    {"conversation_id": conversation_id},
                    {"$set": session_data},
                    upsert=True,
                )
            except Exception as err:
                # Do not block chat processing if background session logging fails
                pass
