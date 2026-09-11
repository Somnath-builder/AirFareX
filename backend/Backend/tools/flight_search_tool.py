"""
AirFareX - Live Flight Search Tool (SerpApi)
============================================

Performs a live Google Flights search via SerpApi, formats flight options,
and stores fare observations into MongoDB Atlas to feed the real-time index.
"""

from __future__ import annotations

import hashlib
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv
from pymongo import UpdateOne

from Backend.tools.airport_resolver import normalize_route_pair, get_city_name

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")


def format_fare_observation(
    flight_group: Dict[str, Any],
    origin: str,
    destination: str,
    travel_date: str,
    collected_at: str,
) -> Optional[Dict[str, Any]]:
    """Normalizes a Google Flights result into the official AirFareX fare_observations schema."""
    price_val = flight_group.get("price")
    if price_val is None:
        return None

    try:
        price = float(str(price_val).replace(",", "").replace("₹", "").strip())
    except (ValueError, TypeError):
        return None

    legs = flight_group.get("flights", [])
    if not isinstance(legs, list):
        legs = []

    airlines = []
    flight_numbers = []
    departure_time = ""
    arrival_time = ""

    for i, leg in enumerate(legs):
        if not isinstance(leg, dict):
            continue
        airline = str(leg.get("airline", "")).strip()
        flight_num = str(leg.get("flight_number", "")).strip()

        if airline and airline not in airlines:
            airlines.append(airline)
        if flight_num:
            flight_numbers.append(flight_num)

        if i == 0:
            departure_time = str(leg.get("departure_airport", {}).get("time", "")).strip()
        if i == len(legs) - 1:
            arrival_time = str(leg.get("arrival_airport", {}).get("time", "")).strip()

    airline_str = ", ".join(airlines) if airlines else "Unknown Airline"
    flight_numbers_str = ", ".join(flight_numbers)

    raw_hash = f"{origin}|{destination}|{travel_date}|{airline_str}|{flight_numbers_str}|{price}|INR|{collected_at}"
    observation_id = hashlib.sha256(raw_hash.encode("utf-8")).hexdigest()

    return {
        "observation_id": observation_id,
        "source": "AirFareX Copilot Search (SerpApi)",
        "origin": origin,
        "destination": destination,
        "requested_origin": origin,
        "requested_destination": destination,
        "travel_date": travel_date,
        "airline": airline_str,
        "flight_numbers": flight_numbers_str,
        "departure_time": departure_time,
        "arrival_time": arrival_time,
        "stops": flight_group.get("stops", max(0, len(legs) - 1)),
        "total_duration_minutes": flight_group.get("total_duration"),
        "fare_amount": price,
        "currency": "INR",
        "collected_at": collected_at,
    }


def search_flights(
    db,
    origin: str,
    destination: str,
    travel_date: str,
    passengers: int = 1,
    cabin_class: str = "economy",
    max_price: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Executes live flight search via SerpApi (Google Flights).
    Saves observed fares into MongoDB Atlas `fare_observations`.
    """
    orig_code, dest_code, route = normalize_route_pair(origin, destination)
    if not orig_code or not dest_code:
        return {
            "status": "error",
            "error_type": "INVALID_AIRPORT",
            "message": f"Could not recognize airport for '{origin}' or '{destination}'. Please specify standard Indian city names or 3-letter IATA codes (e.g., DEL, BOM, BLR, CCU).",
            "count": 0,
            "flights": [],
        }

    if not travel_date:
        return {
            "status": "error",
            "error_type": "MISSING_DATE",
            "message": "Travel date is required (format: YYYY-MM-DD).",
            "count": 0,
            "flights": [],
        }

    api_key = os.getenv("SERPAPI_API_KEY") or SERPAPI_API_KEY
    if not api_key:
        return {
            "status": "error",
            "error_type": "MISSING_API_KEY",
            "message": "SERPAPI_API_KEY is not configured in backend/.env.",
            "count": 0,
            "flights": [],
        }

    travel_class_code = 1
    if cabin_class.lower() == "business":
        travel_class_code = 2
    elif cabin_class.lower() == "first":
        travel_class_code = 3
    elif cabin_class.lower() in ("premium_economy", "premium economy"):
        travel_class_code = 4

    collected_at = datetime.now(timezone.utc).isoformat()
    params = {
        "engine": "google_flights",
        "departure_id": orig_code,
        "arrival_id": dest_code,
        "outbound_date": travel_date,
        "type": 2,  # One-way
        "adults": max(1, passengers),
        "travel_class": travel_class_code,
        "currency": "INR",
        "hl": "en",
        "api_key": api_key,
    }

    try:
        response = requests.get(
            "https://serpapi.com/search.json",
            params=params,
            timeout=60,
        )

        if response.status_code == 429:
            return {
                "status": "error",
                "error_type": "QUOTA_EXHAUSTED",
                "message": "SerpApi search quota has been exhausted. Please update SERPAPI_API_KEY in backend/.env.",
                "count": 0,
                "flights": [],
            }

        if response.status_code != 200:
            return {
                "status": "error",
                "error_type": "API_ERROR",
                "message": f"SerpApi returned HTTP {response.status_code}.",
                "count": 0,
                "flights": [],
            }

        data = response.json()

    except requests.Timeout:
        return {
            "status": "error",
            "error_type": "TIMEOUT",
            "message": "Request to SerpApi timed out after 60 seconds.",
            "count": 0,
            "flights": [],
        }
    except requests.RequestException as exc:
        return {
            "status": "error",
            "error_type": "NETWORK_ERROR",
            "message": f"Unable to reach SerpApi: {str(exc)}",
            "count": 0,
            "flights": [],
        }

    api_error = str(data.get("error", "")).lower()
    if api_error:
        if any(term in api_error for term in ["run out of searches", "monthly limit", "plan limit", "account limit", "rate limit"]):
            return {
                "status": "error",
                "error_type": "QUOTA_EXHAUSTED",
                "message": f"SerpApi quota limit reached: {data.get('error')}",
                "count": 0,
                "flights": [],
            }

        if any(term in api_error for term in ["hasn't returned any results", "has not returned any results", "no flights found"]):
            return {
                "status": "no_fares",
                "error_type": "NO_FARE_FOUND",
                "origin": orig_code,
                "origin_city": get_city_name(orig_code),
                "destination": dest_code,
                "destination_city": get_city_name(dest_code),
                "travel_date": travel_date,
                "count": 0,
                "cheapest": None,
                "flights": [],
                "message": f"No flights found for {get_city_name(orig_code)} ({orig_code}) to {get_city_name(dest_code)} ({dest_code}) on {travel_date}.",
            }

    combined_results = data.get("best_flights", []) + data.get("other_flights", [])
    flights = []
    mongo_records = []

    for flight_group in combined_results:
        price = flight_group.get("price")
        if price is None:
            continue

        try:
            price_num = float(str(price).replace(",", "").replace("₹", "").strip())
        except (ValueError, TypeError):
            continue

        if max_price and price_num > max_price:
            continue

        legs = flight_group.get("flights", [])
        airlines = []
        flight_nums = []
        dep_time = ""
        arr_time = ""
        for i, leg in enumerate(legs):
            if isinstance(leg, dict):
                a = str(leg.get("airline", "")).strip()
                fn = str(leg.get("flight_number", "")).strip()
                if a and a not in airlines:
                    airlines.append(a)
                if fn and fn not in flight_nums:
                    flight_nums.append(fn)
                if i == 0:
                    dep_time = str(leg.get("departure_airport", {}).get("time", "")).strip()
                if i == len(legs) - 1:
                    arr_time = str(leg.get("arrival_airport", {}).get("time", "")).strip()

        flight_dict = {
            "airline": ", ".join(airlines) if airlines else "Unknown",
            "flight_numbers": ", ".join(flight_nums),
            "departure_time": dep_time,
            "arrival_time": arr_time,
            "stops": flight_group.get("stops", max(0, len(legs) - 1)),
            "total_duration_minutes": flight_group.get("total_duration"),
            "fare_amount": price_num,
            "currency": "INR",
        }
        flights.append(flight_dict)

        obs = format_fare_observation(flight_group, orig_code, dest_code, travel_date, collected_at)
        if obs:
            mongo_records.append(obs)

    # Save to MongoDB Atlas
    observations_saved = 0
    if mongo_records and db is not None:
        try:
            ops = [
                UpdateOne(
                    {"observation_id": doc["observation_id"]},
                    {"$set": doc},
                    upsert=True,
                )
                for doc in mongo_records
            ]
            res = db["fare_observations"].bulk_write(ops, ordered=False)
            observations_saved = len(res.upserted_ids) + res.modified_count + res.matched_count
        except Exception as db_err:
            print(f"[Warning] Failed to write observations to MongoDB: {db_err}")

    flights.sort(key=lambda x: x["fare_amount"])
    cheapest = flights[0] if flights else None

    return {
        "status": "success",
        "origin": orig_code,
        "origin_city": get_city_name(orig_code),
        "destination": dest_code,
        "destination_city": get_city_name(dest_code),
        "route": f"{orig_code}-{dest_code}",
        "travel_date": travel_date,
        "source": "SerpApi Google Flights",
        "count": len(flights),
        "cheapest": cheapest,
        "flights": flights[:10],  # Return top 10 best flights for clean context
        "observations_saved": observations_saved,
    }
