"""
AirFareX Intelligence Copilot - Gemini Client
=============================================

Integrates Google's official Gemini API (google.genai) with function calling.
Executes AirFareX backend tools against MongoDB Atlas and SerpApi,
and synthesizes explainable natural-language responses.
"""

from __future__ import annotations

import json
import os
from typing import Any, Callable, Dict, List, Optional, Tuple

from dotenv import load_dotenv

from Backend.chatbot.prompts import COPILOT_SYSTEM_INSTRUCTION
from Backend.tools import (
    search_flights,
    get_cheapest_fare,
    get_route_price,
    get_price_history,
    get_price_index,
    find_cheapest_dates,
    compare_fares,
    get_booking_recommendation,
    budget_search,
)

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))


class GeminiCopilotClient:
    """
    Manages Gemini LLM session, function-calling dispatch,
    and fallback reasoning when API keys are unconfigured.
    """

    def __init__(self, db=None, model_name: Optional[str] = None):
        self.db = db
        self.model_name = model_name or os.getenv("GEMINI_MODEL", "gemini-flash-latest")
        self.api_key = os.getenv("GEMINI_API_KEY")
        self._client = None
        self._init_client()

    def _init_client(self):
        """Initializes google.genai Client if API key is present."""
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key and self.api_key.strip() and self.api_key != "your_key_here":
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except Exception as err:
                print(f"[Warning] Failed to initialize google.genai Client: {err}")
                self._client = None
        else:
            self._client = None

    @property
    def is_configured(self) -> bool:
        """Returns True if a valid Gemini API client is initialized."""
        return self._client is not None

    def execute_tool(self, tool_name: str, tool_args: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes an AirFareX backend tool using the actual database connection.
        """
        name = tool_name.strip()

        try:
            if name == "search_flights":
                return search_flights(
                    db=self.db,
                    origin=tool_args.get("origin", ""),
                    destination=tool_args.get("destination", ""),
                    travel_date=tool_args.get("travel_date", ""),
                    passengers=tool_args.get("passengers", 1),
                    cabin_class=tool_args.get("cabin_class", "economy"),
                    max_price=tool_args.get("max_price"),
                )

            elif name == "get_cheapest_fare":
                return get_cheapest_fare(
                    db=self.db,
                    origin=tool_args.get("origin", ""),
                    destination=tool_args.get("destination", ""),
                    travel_date=tool_args.get("travel_date"),
                )

            elif name == "get_route_price":
                return get_route_price(
                    db=self.db,
                    origin=tool_args.get("origin", ""),
                    destination=tool_args.get("destination", ""),
                )

            elif name == "get_price_history":
                return get_price_history(
                    db=self.db,
                    origin=tool_args.get("origin", ""),
                    destination=tool_args.get("destination", ""),
                    travel_date=tool_args.get("travel_date"),
                    start_date=tool_args.get("start_date"),
                    end_date=tool_args.get("end_date"),
                )

            elif name == "get_price_index":
                return get_price_index(
                    db=self.db,
                    route=tool_args.get("route"),
                )

            elif name == "find_cheapest_dates":
                return find_cheapest_dates(
                    db=self.db,
                    origin=tool_args.get("origin", ""),
                    destination=tool_args.get("destination", ""),
                    start_date=tool_args.get("start_date", ""),
                    end_date=tool_args.get("end_date", ""),
                )

            elif name == "compare_fares":
                return compare_fares(
                    db=self.db,
                    origin=tool_args.get("origin", ""),
                    destination=tool_args.get("destination", ""),
                    date_a=tool_args.get("date_a"),
                    date_b=tool_args.get("date_b"),
                    compare_route_origin=tool_args.get("compare_route_origin"),
                    compare_route_destination=tool_args.get("compare_route_destination"),
                )

            elif name == "get_booking_recommendation":
                return get_booking_recommendation(
                    db=self.db,
                    origin=tool_args.get("origin", ""),
                    destination=tool_args.get("destination", ""),
                    travel_date=tool_args.get("travel_date"),
                    current_fare=tool_args.get("current_fare"),
                )

            elif name == "budget_search":
                return budget_search(
                    db=self.db,
                    origin=tool_args.get("origin", ""),
                    max_budget=tool_args.get("max_budget", 5000),
                    travel_date=tool_args.get("travel_date"),
                )

            else:
                return {
                    "status": "error",
                    "message": f"Unknown AirFareX tool '{tool_name}'."
                }

        except Exception as exc:
            return {
                "status": "error",
                "message": f"Error executing tool '{tool_name}': {str(exc)}"
            }

    def _get_tool_declarations(self):
        """Constructs types.FunctionDeclaration objects for Google GenAI SDK."""
        from google.genai import types

        return [
            types.FunctionDeclaration(
                name="search_flights",
                description="Search live airfares on Google Flights via SerpApi for a domestic route and travel date.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "origin": types.Schema(type=types.Type.STRING, description="Departure city or airport code (e.g., CCU, Kolkata, DEL)"),
                        "destination": types.Schema(type=types.Type.STRING, description="Arrival city or airport code (e.g., BLR, Bangalore, BOM)"),
                        "travel_date": types.Schema(type=types.Type.STRING, description="Flight departure date in YYYY-MM-DD format"),
                        "passengers": types.Schema(type=types.Type.INTEGER, description="Number of adult passengers (default: 1)"),
                        "cabin_class": types.Schema(type=types.Type.STRING, description="Cabin class: economy, business, or first"),
                        "max_price": types.Schema(type=types.Type.NUMBER, description="Optional maximum fare filter in INR"),
                    },
                    required=["origin", "destination", "travel_date"],
                ),
            ),
            types.FunctionDeclaration(
                name="get_cheapest_fare",
                description="Retrieve the lowest recorded fare observation from MongoDB for a route and optional date.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "origin": types.Schema(type=types.Type.STRING, description="Departure city or airport code"),
                        "destination": types.Schema(type=types.Type.STRING, description="Arrival city or airport code"),
                        "travel_date": types.Schema(type=types.Type.STRING, description="Optional travel date in YYYY-MM-DD format"),
                    },
                    required=["origin", "destination"],
                ),
            ),
            types.FunctionDeclaration(
                name="get_route_price",
                description="Get price distribution (minimum, median, maximum, latest) and carrier breakdown for a route.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "origin": types.Schema(type=types.Type.STRING, description="Departure city or airport code"),
                        "destination": types.Schema(type=types.Type.STRING, description="Arrival city or airport code"),
                    },
                    required=["origin", "destination"],
                ),
            ),
            types.FunctionDeclaration(
                name="get_price_history",
                description="Retrieve historical fare movements, percentage trends, and collection periods for a route.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "origin": types.Schema(type=types.Type.STRING, description="Departure city or airport code"),
                        "destination": types.Schema(type=types.Type.STRING, description="Arrival city or airport code"),
                        "travel_date": types.Schema(type=types.Type.STRING, description="Optional travel date in YYYY-MM-DD format"),
                        "start_date": types.Schema(type=types.Type.STRING, description="Optional start of date window"),
                        "end_date": types.Schema(type=types.Type.STRING, description="Optional end of date window"),
                    },
                    required=["origin", "destination"],
                ),
            ),
            types.FunctionDeclaration(
                name="get_price_index",
                description="Query the AirFareX prototype airfare price index relative to base period level 100.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "route": types.Schema(type=types.Type.STRING, description="Optional route code (e.g. 'CCU-BLR' or 'Kolkata to Bangalore'). If omitted, retrieves overall national index."),
                    },
                ),
            ),
            types.FunctionDeclaration(
                name="find_cheapest_dates",
                description="Compare observed fares across a date range to identify the cheapest travel date.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "origin": types.Schema(type=types.Type.STRING, description="Departure city or airport code"),
                        "destination": types.Schema(type=types.Type.STRING, description="Arrival city or airport code"),
                        "start_date": types.Schema(type=types.Type.STRING, description="Start date of window in YYYY-MM-DD format"),
                        "end_date": types.Schema(type=types.Type.STRING, description="End date of window in YYYY-MM-DD format"),
                    },
                    required=["origin", "destination", "start_date", "end_date"],
                ),
            ),
            types.FunctionDeclaration(
                name="compare_fares",
                description="Calculate exact mathematical differences between two dates on a route, or between two different routes.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "origin": types.Schema(type=types.Type.STRING, description="Primary origin city or airport code"),
                        "destination": types.Schema(type=types.Type.STRING, description="Primary destination city or airport code"),
                        "date_a": types.Schema(type=types.Type.STRING, description="First date to compare (YYYY-MM-DD)"),
                        "date_b": types.Schema(type=types.Type.STRING, description="Second date to compare (YYYY-MM-DD)"),
                        "compare_route_origin": types.Schema(type=types.Type.STRING, description="Optional second route origin for route-vs-route comparison"),
                        "compare_route_destination": types.Schema(type=types.Type.STRING, description="Optional second route destination for route-vs-route comparison"),
                    },
                    required=["origin", "destination"],
                ),
            ),
            types.FunctionDeclaration(
                name="get_booking_recommendation",
                description="Evaluate whether a fare is good to book based on historical median, lead time, and statistical patterns.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "origin": types.Schema(type=types.Type.STRING, description="Departure city or airport code"),
                        "destination": types.Schema(type=types.Type.STRING, description="Arrival city or airport code"),
                        "travel_date": types.Schema(type=types.Type.STRING, description="Optional planned travel date (YYYY-MM-DD)"),
                        "current_fare": types.Schema(type=types.Type.NUMBER, description="Optional specific fare amount to evaluate in INR"),
                    },
                    required=["origin", "destination"],
                ),
            ),
            types.FunctionDeclaration(
                name="budget_search",
                description="Find domestic destinations from an origin city that fit under a specified budget limit.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "origin": types.Schema(type=types.Type.STRING, description="Departure city or airport code"),
                        "max_budget": types.Schema(type=types.Type.NUMBER, description="Maximum budget in INR (e.g., 5000)"),
                        "travel_date": types.Schema(type=types.Type.STRING, description="Optional specific travel date (YYYY-MM-DD)"),
                    },
                    required=["origin", "max_budget"],
                ),
            ),
        ]

    def generate_chat_response(
        self,
        user_message: str,
        conversation_context: Dict[str, Any],
        history: List[Dict[str, Any]],
    ) -> Tuple[str, Optional[str], Optional[Dict[str, Any]], str]:
        """
        Sends conversation to Gemini, handles tool calls, and returns
        (final_message, tool_used, tool_data, intent).
        """
        self._init_client()

        if not self._client:
            # Fallback when GEMINI_API_KEY is not configured
            return self._fallback_deterministic_handler(user_message, conversation_context)

        from google.genai import types

        tool_declarations = self._get_tool_declarations()
        tools_list = [types.Tool(function_declarations=tool_declarations)]

        config = types.GenerateContentConfig(
            system_instruction=COPILOT_SYSTEM_INSTRUCTION,
            temperature=0.2,
            tools=tools_list,
        )

        # Build contents from context & history
        contents = []

        # Add brief state summary to remind model of active context
        active_slots = {k: v for k, v in conversation_context.items() if v is not None}
        if active_slots:
            context_summary = f"[System Context: Active search parameters from previous turns: {json.dumps(active_slots)}]"
            contents.append(types.Content(role="user", parts=[types.Part.from_text(text=context_summary)]))
            contents.append(types.Content(role="model", parts=[types.Part.from_text(text="Understood. I will use this conversation context to interpret follow-up queries.")]))

        # Append previous conversation history turns (last 6 turns)
        for h in history[-6:]:
            role = "user" if h.get("role") == "user" else "model"
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=h.get("content", ""))]))

        # Append current user message
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_message)]))

        try:
            response = self._client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=config,
            )

            # Check if Gemini wants to call a tool
            function_calls = getattr(response, "function_calls", None)
            if not function_calls and hasattr(response, "candidates") and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, "content") and candidate.content and hasattr(candidate.content, "parts"):
                    for part in candidate.content.parts:
                        if hasattr(part, "function_call") and part.function_call:
                            function_calls = [part.function_call]
                            break

            if function_calls:
                call = function_calls[0]
                tool_name = call.name
                tool_args = dict(call.args) if hasattr(call, "args") else {}

                # Execute backend tool
                tool_data = self.execute_tool(tool_name, tool_args)

                # Send tool response back to Gemini to synthesize final natural language answer
                followup_contents = list(contents)
                followup_contents.append(types.Content(
                    role="model",
                    parts=[types.Part.from_function_call(name=tool_name, args=tool_args)]
                ))
                followup_contents.append(types.Content(
                    role="user",
                    parts=[types.Part.from_function_response(
                        name=tool_name,
                        response={"result": tool_data}
                    )]
                ))

                synthesis_config = types.GenerateContentConfig(
                    system_instruction=COPILOT_SYSTEM_INSTRUCTION,
                    temperature=0.2,
                )

                synthesis_response = self._client.models.generate_content(
                    model=self.model_name,
                    contents=followup_contents,
                    config=synthesis_config,
                )

                final_text = synthesis_response.text or self._format_tool_fallback_text(tool_name, tool_data)
                intent = self._infer_intent_from_tool(tool_name)
                return final_text, tool_name, tool_data, intent

            # Normal text response without tool call
            return response.text, None, None, "GENERAL_AIRFAREX_QUERY"

        except Exception as exc:
            print(f"[Warning] Gemini API call encountered error: {exc}. Using deterministic fallback.")
            return self._fallback_deterministic_handler(user_message, conversation_context)

    def _infer_intent_from_tool(self, tool_name: str) -> str:
        mapping = {
            "search_flights": "SEARCH_FLIGHTS",
            "get_cheapest_fare": "CHEAPEST_FLIGHT",
            "get_route_price": "ROUTE_PRICE",
            "get_price_history": "PRICE_HISTORY",
            "get_price_index": "PRICE_INDEX",
            "find_cheapest_dates": "CHEAPEST_DATE",
            "compare_fares": "FARE_COMPARISON",
            "get_booking_recommendation": "BOOKING_RECOMMENDATION",
            "budget_search": "BUDGET_SEARCH",
        }
        return mapping.get(tool_name, "GENERAL_AIRFAREX_QUERY")

    def _fallback_deterministic_handler(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Optional[str], Optional[Dict[str, Any]], str]:
        """
        Deterministic entity extraction and tool execution fallback.
        Ensures the API continues functioning cleanly even if GEMINI_API_KEY
        is absent, expired, or temporarily rate-limited.
        """
        from Backend.chatbot.intent_classifier import (
            classify_intent,
            extract_airports,
            extract_dates,
            extract_budget,
            extract_fare_amount,
        )

        intent = classify_intent(user_message)
        orig, dest = extract_airports(user_message)
        d1, d2 = extract_dates(user_message)
        budget = extract_budget(user_message)
        mentioned_fare = extract_fare_amount(user_message)

        # Merge with context if missing
        orig = orig or context.get("origin")
        dest = dest or context.get("destination")
        travel_date = d1 or context.get("travel_date")

        tool_used = None
        tool_data = None
        message = ""

        if intent == "PRICE_INDEX":
            route = f"{orig}-{dest}" if orig and dest else None
            tool_used = "get_price_index"
            tool_data = get_price_index(self.db, route=route)
            idx = tool_data.get("current_index", 100.0)
            chg = tool_data.get("change_from_base_percent", 0.0)
            message = (
                f"The {tool_data.get('index_name')} for {tool_data.get('route') or 'all domestic corridors'} "
                f"is currently **{idx:.2f}** (baseline: 100.00 on {tool_data.get('base_period')}). "
                f"Observed domestic fares are approximately {abs(chg):.2f}% {'higher' if chg > 0 else 'lower'} than the base period level."
            )

        elif intent == "CHEAPEST_DATE" and orig and dest:
            s_date = d1 or "2026-09-20"
            e_date = d2 or "2026-09-27"
            tool_used = "find_cheapest_dates"
            tool_data = find_cheapest_dates(self.db, orig, dest, s_date, e_date)
            if tool_data.get("status") == "success":
                message = (
                    f"Between {s_date} and {e_date}, the cheapest travel date from {orig} to {dest} is **{tool_data.get('cheapest_date')}** "
                    f"at **₹{tool_data.get('cheapest_fare'):,.2f}** on {tool_data.get('cheapest_airline')}. "
                    f"Choosing this date saves approximately ₹{tool_data.get('savings_vs_highest_date'):,.2f} ({tool_data.get('savings_percentage')}%) compared to the highest date in this window."
                )
            else:
                message = tool_data.get("message", "No date comparison observations available.")

        elif intent == "FARE_EXPLANATION" and orig and dest:
            tool_used = "get_booking_recommendation"
            tool_data = get_booking_recommendation(self.db, orig, dest, travel_date, current_fare=mentioned_fare)
            data_used = tool_data.get("data_used", {})
            eval_f = data_used.get("evaluated_fare", mentioned_fare or 0)
            med_f = data_used.get("historical_median_fare", 0)
            diff_pct = data_used.get("difference_from_median_percent", 0)
            status_word = "relatively expensive" if diff_pct > 0 else "relatively economical"
            message = (
                f"₹{eval_f:,.2f} is **{status_word}** compared with AirFareX's recent observed median of ₹{med_f:,.2f} for {orig} → {dest}. "
                f"It is approximately {abs(diff_pct):.1f}% {'higher' if diff_pct > 0 else 'lower'} than that median. {tool_data.get('reason')}"
            )

        elif intent == "BOOKING_RECOMMENDATION" and orig and dest:
            tool_used = "get_booking_recommendation"
            tool_data = get_booking_recommendation(self.db, orig, dest, travel_date, current_fare=mentioned_fare)
            rec = tool_data.get("recommendation", "FARE_IS_AVERAGE")
            reason = tool_data.get("reason", "")
            message = f"**Booking Recommendation: {rec}**\n\n{reason}\n\n_{tool_data.get('disclaimer')}_"

        elif intent == "BUDGET_SEARCH" and orig and budget:
            tool_used = "budget_search"
            tool_data = budget_search(self.db, orig, budget, travel_date)
            dest_list = tool_data.get("destinations", [])
            if dest_list:
                items = [f"• **{d['destination_city']} ({d['destination']})**: from ₹{d['cheapest_fare']:,.2f} on {d['airline']} ({d['travel_date']})" for d in dest_list[:5]]
                message = f"Found {len(dest_list)} destination(s) from {orig} within your budget of ₹{budget:,.2f}:\n\n" + "\n".join(items)
            else:
                message = tool_data.get("message", f"No destinations found from {orig} under ₹{budget:,.2f}.")

        elif intent == "FARE_COMPARISON" and orig and dest and d1 and d2:
            tool_used = "compare_fares"
            tool_data = compare_fares(self.db, orig, dest, date_a=d1, date_b=d2)
            message = tool_data.get("summary", "Fare comparison calculated.")

        elif intent in ("CHEAPEST_FLIGHT", "SEARCH_FLIGHTS") and orig and dest:
            tool_used = "get_cheapest_fare"
            tool_data = get_cheapest_fare(self.db, orig, dest, travel_date)
            if tool_data.get("status") == "success":
                message = (
                    f"The cheapest observed fare for {orig} → {dest}" + (f" on {travel_date}" if travel_date else "") +
                    f" is **₹{tool_data.get('cheapest_fare'):,.2f}** on {tool_data.get('airline')}" +
                    (f" (Flight {tool_data.get('flight_numbers')})" if tool_data.get('flight_numbers') else "") + "."
                )
            else:
                message = tool_data.get("message", f"No observed fares found for {orig} → {dest}.")

        elif intent == "ROUTE_PRICE" and orig and dest:
            tool_used = "get_route_price"
            tool_data = get_route_price(self.db, orig, dest)
            if tool_data.get("status") == "success":
                message = (
                    f"Route statistics for **{orig} → {dest}** based on {tool_data.get('observation_count')} observations:\n"
                    f"• Minimum Fare: ₹{tool_data.get('minimum_fare'):,.2f}\n"
                    f"• Median Fare: ₹{tool_data.get('median_fare'):,.2f}\n"
                    f"• Average Fare: ₹{tool_data.get('average_fare'):,.2f}\n"
                    f"• Maximum Fare: ₹{tool_data.get('maximum_fare'):,.2f}"
                )
            else:
                message = tool_data.get("message", f"No route statistics for {orig} → {dest}.")

        else:
            if not orig and not dest:
                message = (
                    "Hello! I am the **AirFareX Intelligence Copilot**. I can help you search domestic flights, "
                    "find the cheapest travel dates, analyze route price trends, explain whether a fare is expensive, "
                    "and consult the AirFareX Price Index. Which corridor would you like to explore?"
                )
            elif orig and not dest:
                message = f"Got it, departing from **{orig}**. Where would you like to fly to, and on what date?"
            elif not travel_date and not (intent == "PRICE_INDEX"):
                message = f"Looking at **{orig} → {dest}**. What travel date or date range would you like to check?"
            else:
                message = f"I've noted **{orig} → {dest}** for {travel_date or 'upcoming dates'}. Would you like the cheapest fare, historical trend, or price index?"

        return message, tool_used, tool_data, intent

    def _format_tool_fallback_text(self, tool_name: str, tool_data: Dict[str, Any]) -> str:
        """Helper to generate a clean summary when raw tool data is returned."""
        if tool_name == "get_price_index":
            return tool_data.get("interpretation", "Price index data retrieved.")
        if tool_name == "find_cheapest_dates":
            return f"Cheapest date found: {tool_data.get('cheapest_date')} at ₹{tool_data.get('cheapest_fare'):,.2f} on {tool_data.get('cheapest_airline')}."
        if tool_name == "get_booking_recommendation":
            return f"{tool_data.get('recommendation')}: {tool_data.get('reason')}"
        if tool_name == "get_cheapest_fare":
            return f"Cheapest fare is ₹{tool_data.get('cheapest_fare'):,.2f} on {tool_data.get('airline')}."
        if tool_name == "budget_search":
            return tool_data.get("summary", "Budget search completed.")
        return json.dumps(tool_data)
