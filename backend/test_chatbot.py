#!/usr/bin/env python3
"""
AirFareX Intelligence Copilot - Comprehensive Test Suite
========================================================

Validates all hackathon demonstration scenarios:
  1. Cheapest Flight Query (Kolkata -> Bangalore)
  2. Flexible Date Window Search (CCU -> BLR between Sept 20 & 27)
  3. Fare Price Explanation ("Is ₹8,000 expensive for Kolkata to Mumbai?")
  4. Price Index / Trend Query (Kolkata to Delhi)
  5. Booking Recommendation Advisor ("Should I book this flight now?")
  6. Budget-Based Destination Search ("Where can I fly from Kolkata under ₹5,000?")
  7. Multi-Turn Context Continuation (Turn 1: route, Turn 2: date follow-up)
  8. Copilot Health & Subsystems Status
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Ensure backend directory in sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from dotenv import load_dotenv
load_dotenv(BASE_DIR / ".env")

from pymongo import MongoClient
from pymongo.server_api import ServerApi

from Backend.chatbot import ChatRequest, ChatService


def print_banner(title: str):
    print("\n" + "=" * 70)
    print(f" 🧪 {title}")
    print("=" * 70)


def run_tests():
    print_banner("INITIALIZING AIRFAREX COPILOT TEST SUITE")
    
    # 1. MongoDB Connection
    mongo_uri = os.getenv("MONGODB_URI")
    db = None
    if mongo_uri:
        try:
            client = MongoClient(mongo_uri, server_api=ServerApi("1"), tls=True, tlsAllowInvalidCertificates=True)
            db = client["AirFareX"]
            client.admin.command("ping")
            print("✅ MongoDB connection verified.")
        except Exception as e:
            print(f"⚠️ MongoDB connection failed ({e}) — testing in offline mode.")

    # 2. Initialize ChatService
    service = ChatService(db=db)
    health = service.health_check()
    print(f"Copilot Name       : {health.copilot_name}")
    print(f"Database Connected : {health.database_connected}")
    print(f"Gemini Configured  : {health.gemini_configured}")
    print(f"Tools Available    : {len(health.tools_available)} tools registered")

    passed_count = 0
    total_count = 8

    # ========================================================
    # TEST 1: Cheapest Flight Query
    # ========================================================
    print_banner("TEST 1: Cheapest Flight Query (Kolkata -> Bangalore)")
    req1 = ChatRequest(message="Find the cheapest flight from Kolkata to Bangalore")
    res1 = service.process_chat_message(req1)
    print(f"Intent    : {res1.intent}")
    print(f"Tool Used : {res1.tool_used}")
    print(f"Message   : {res1.message[:150]}...")
    assert res1.intent in ("CHEAPEST_FLIGHT", "SEARCH_FLIGHTS"), f"Unexpected intent: {res1.intent}"
    assert res1.conversation_id is not None
    print("✅ TEST 1 PASSED")
    passed_count += 1

    # ========================================================
    # TEST 2: Flexible Date Window (Cheapest Day)
    # ========================================================
    print_banner("TEST 2: Flexible Date Window (CCU -> BLR Sept 20 to 27)")
    req2 = ChatRequest(message="I want to fly from Kolkata to Bangalore between September 20 and September 27. Which day is cheapest?")
    res2 = service.process_chat_message(req2)
    print(f"Intent    : {res2.intent}")
    print(f"Tool Used : {res2.tool_used}")
    print(f"Message   : {res2.message[:150]}...")
    assert res2.intent == "CHEAPEST_DATE", f"Unexpected intent: {res2.intent}"
    print("✅ TEST 2 PASSED")
    passed_count += 1

    # ========================================================
    # TEST 3: Fare Price Explanation
    # ========================================================
    print_banner("TEST 3: Fare Explanation ('Is ₹8,000 expensive for Kolkata to Mumbai?')")
    req3 = ChatRequest(message="Is ₹8,000 expensive for Kolkata to Mumbai?")
    res3 = service.process_chat_message(req3)
    print(f"Intent    : {res3.intent}")
    print(f"Tool Used : {res3.tool_used}")
    print(f"Message   : {res3.message[:150]}...")
    assert res3.intent in ("FARE_EXPLANATION", "BOOKING_RECOMMENDATION"), f"Unexpected intent: {res3.intent}"
    print("✅ TEST 3 PASSED")
    passed_count += 1

    # ========================================================
    # TEST 4: Price Index Query
    # ========================================================
    print_banner("TEST 4: Price Index ('What is the airfare price index for Kolkata to Delhi?')")
    req4 = ChatRequest(message="What is the airfare price index for Kolkata to Delhi?")
    res4 = service.process_chat_message(req4)
    print(f"Intent    : {res4.intent}")
    print(f"Tool Used : {res4.tool_used}")
    print(f"Message   : {res4.message[:150]}...")
    assert res4.intent == "PRICE_INDEX", f"Unexpected intent: {res4.intent}"
    print("✅ TEST 4 PASSED")
    passed_count += 1

    # ========================================================
    # TEST 5: Booking Recommendation Advisor
    # ========================================================
    print_banner("TEST 5: Booking Recommendation ('Should I book my Kolkata to Mumbai flight now?')")
    req5 = ChatRequest(message="Should I book my Kolkata to Mumbai flight now?")
    res5 = service.process_chat_message(req5)
    print(f"Intent    : {res5.intent}")
    print(f"Tool Used : {res5.tool_used}")
    print(f"Message   : {res5.message[:150]}...")
    assert res5.intent == "BOOKING_RECOMMENDATION", f"Unexpected intent: {res5.intent}"
    print("✅ TEST 5 PASSED")
    passed_count += 1

    # ========================================================
    # TEST 6: Budget Destination Search
    # ========================================================
    print_banner("TEST 6: Budget Search ('Where can I fly from Kolkata under ₹6,000?')")
    req6 = ChatRequest(message="Where can I fly from Kolkata under ₹6,000?")
    res6 = service.process_chat_message(req6)
    print(f"Intent    : {res6.intent}")
    print(f"Tool Used : {res6.tool_used}")
    print(f"Message   : {res6.message[:150]}...")
    assert res6.intent == "BUDGET_SEARCH", f"Unexpected intent: {res6.intent}"
    print("✅ TEST 6 PASSED")
    passed_count += 1

    # ========================================================
    # TEST 7: Multi-Turn Context Continuation
    # ========================================================
    print_banner("TEST 7: Multi-Turn Context Continuation")
    test_cid = "multi_turn_test_session"
    
    # Turn 1: Specify Route
    turn1_req = ChatRequest(message="Find flights from Kolkata to Bangalore", conversation_id=test_cid)
    turn1_res = service.process_chat_message(turn1_req)
    print(f"Turn 1 Intent  : {turn1_res.intent}")
    print(f"Turn 1 Context : {turn1_res.context}")
    assert turn1_res.context.get("origin") == "CCU"
    assert turn1_res.context.get("destination") == "BLR"

    # Turn 2: Follow-up with only date
    turn2_req = ChatRequest(message="What about September 28?", conversation_id=test_cid)
    turn2_res = service.process_chat_message(turn2_req)
    print(f"Turn 2 Intent  : {turn2_res.intent}")
    print(f"Turn 2 Context : {turn2_res.context}")
    assert turn2_res.context.get("origin") == "CCU", "Context lost origin!"
    assert turn2_res.context.get("destination") == "BLR", "Context lost destination!"
    print("✅ TEST 7 PASSED — Context successfully retained across conversation turns.")
    passed_count += 1

    # ========================================================
    # TEST 8: Session History and Reset
    # ========================================================
    print_banner("TEST 8: Conversation History and Reset")
    history_res = service.get_conversation_history(test_cid)
    print(f"Messages Recorded : {len(history_res.messages)}")
    assert len(history_res.messages) >= 4, "Expected at least 4 messages (2 turns)"
    
    reset_res = service.reset_conversation(test_cid)
    assert reset_res.status == "success"
    history_after = service.get_conversation_history(test_cid)
    assert len(history_after.messages) == 0, "Messages were not cleared after reset"
    print("✅ TEST 8 PASSED — Reset and history working properly.")
    passed_count += 1

    # ========================================================
    # SUMMARY
    # ========================================================
    print_banner("ALL COPILOT TESTS COMPLETED")
    print(f"Tests Passed: {passed_count}/{total_count} (100%)")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
