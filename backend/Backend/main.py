"""
AirFareX - FastAPI Backend

Provides:
    /api/health
    /api/routes
    /api/cheapest
    /api/price-index
    /api/analytics
    /api/lead-time
    /api/search
"""

import hashlib
import os
import subprocess
import sys
from datetime import datetime, timezone
from typing import Optional

# Ensure parent directory is in sys.path to import lead_time_engine
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from lead_time_engine import calculate_lead_time_metrics

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient, UpdateOne
from pymongo.server_api import ServerApi
import certifi


# ============================================================
# CONFIGURATION
# ============================================================

load_dotenv(
    os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        ".env"
    )
)

MONGODB_URI = os.getenv("MONGODB_URI")
SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")

if not MONGODB_URI:
    raise ValueError("MONGODB_URI not found in .env")


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="AirFareX API",
    description=(
        "Real-Time Airfare Intelligence & Price Index Platform"
    ),
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# MONGODB
# ============================================================

client = MongoClient(MONGODB_URI, server_api=ServerApi('1'), tls=True, tlsAllowInvalidCertificates=True)

db = client["AirFareX"]

fare_collection = db["fare_observations"]
index_collection = db["price_index"]


# ============================================================
# HELPER
# ============================================================

def serialize_document(document):
    """
    Convert MongoDB document into JSON-safe dictionary.
    """

    if not document:
        return None

    document.pop("_id", None)

    for key, value in list(document.items()):

        if isinstance(value, datetime):
            document[key] = value.isoformat()

    return document


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health_check():

    try:

        client.admin.command("ping")

        return {
            "status": "healthy",
            "service": "AirFareX API",
            "database": "connected",
        }

    except Exception as error:

        return {
            "status": "error",
            "database": "disconnected",
            "message": str(error),
        }


# ============================================================
# ROUTES
# ============================================================

@app.get("/api/routes")
def get_routes():

    pipeline = [
        {
            "$group": {
                "_id": {
                    "origin": "$origin",
                    "destination": "$destination",
                },
                "observation_count": {
                    "$sum": 1
                },
                "average_fare": {
                    "$avg": "$fare_amount"
                },
                "minimum_fare": {
                    "$min": "$fare_amount"
                },
            }
        },
        {
            "$sort": {
                "observation_count": -1
            }
        },
    ]

    results = list(
        fare_collection.aggregate(pipeline)
    )

    routes = []

    for item in results:

        routes.append({
            "origin": item["_id"]["origin"],
            "destination": item["_id"]["destination"],
            "route": (
                f"{item['_id']['origin']}-"
                f"{item['_id']['destination']}"
            ),
            "observation_count": item[
                "observation_count"
            ],
            "average_fare": round(
                item["average_fare"],
                2
            ),
            "minimum_fare": round(
                item["minimum_fare"],
                2
            ),
        })

    return {
        "count": len(routes),
        "routes": routes,
    }


# ============================================================
# CHEAPEST FLIGHTS
# ============================================================

@app.get("/api/cheapest")
def get_cheapest_flights(
    origin: Optional[str] = Query(
        None,
        min_length=3,
        max_length=3
    ),
    destination: Optional[str] = Query(
        None,
        min_length=3,
        max_length=3
    ),
    travel_date: Optional[str] = None,
):
    """
    Return cheapest observed fares.

    Filters are optional.
    """

    query = {}

    if origin:
        query["origin"] = origin.upper()

    if destination:
        query["destination"] = destination.upper()

    if travel_date:
        query["travel_date"] = travel_date

    pipeline = [
        {
            "$match": query
        },
        {
            "$sort": {
                "fare_amount": 1
            }
        },
        {
            "$limit": 50
        }
    ]

    results = list(
        fare_collection.aggregate(
            pipeline
        )
    )

    flights = []

    for item in results:

        flights.append(
            serialize_document(item)
        )

    return {
        "count": len(flights),
        "flights": flights,
    }


# ============================================================
# PRICE INDEX
# ============================================================

@app.get("/api/price-index")
def get_price_index(
    route: Optional[str] = None
):

    query = {}

    if route:

        query["route"] = route.upper()

    results = list(
        index_collection.find(
            query,
            {"_id": 0}
        ).sort(
            [
                ("period", 1)
            ]
        )
    )

    return {
        "count": len(results),
        "data": results,
    }


# ============================================================
# ANALYTICS
# ============================================================

@app.get("/api/analytics")
def get_analytics():

    total_observations = (
        fare_collection.count_documents({})
    )

    total_routes = len(
        fare_collection.distinct(
            "origin"
        )
    )

    unique_route_list = fare_collection.aggregate(
        [
            {
                "$group": {
                    "_id": {
                        "origin": "$origin",
                        "destination": "$destination",
                    }
                }
            }
        ]
    )

    unique_routes = len(
        list(unique_route_list)
    )

    average_fare_result = list(
        fare_collection.aggregate(
            [
                {
                    "$group": {
                        "_id": None,
                        "average": {
                            "$avg": "$fare_amount"
                        },
                        "minimum": {
                            "$min": "$fare_amount"
                        },
                        "maximum": {
                            "$max": "$fare_amount"
                        },
                    }
                }
            ]
        )
    )

    if average_fare_result:

        statistics = average_fare_result[0]

        average_fare = round(
            statistics["average"],
            2
        )

        minimum_fare = round(
            statistics["minimum"],
            2
        )

        maximum_fare = round(
            statistics["maximum"],
            2
        )

    else:

        average_fare = 0
        minimum_fare = 0
        maximum_fare = 0

    airline_pipeline = [
        {
            "$group": {
                "_id": "$airline",
                "observations": {
                    "$sum": 1
                },
                "average_fare": {
                    "$avg": "$fare_amount"
                },
            }
        },
        {
            "$sort": {
                "observations": -1
            }
        },
        {
            "$limit": 20
        }
    ]

    airline_results = list(
        fare_collection.aggregate(
            airline_pipeline
        )
    )

    airlines = []

    for item in airline_results:

        airlines.append({
            "airline": item["_id"],
            "observations": item[
                "observations"
            ],
            "average_fare": round(
                item["average_fare"],
                2
            ),
        })

    return {
        "total_observations":
            total_observations,

        "unique_routes":
            unique_routes,

        "origin_airports":
            total_routes,

        "average_fare":
            average_fare,

        "minimum_fare":
            minimum_fare,

        "maximum_fare":
            maximum_fare,

        "airlines":
            airlines,
    }


# ============================================================
# LEAD TIME ANALYSIS
# ============================================================

@app.get("/api/lead-time")
def get_lead_time_analysis(
    origin: Optional[str] = Query(None, min_length=3, max_length=3),
    destination: Optional[str] = Query(None, min_length=3, max_length=3),
    route: Optional[str] = Query(None),
    airline: Optional[str] = Query(None),
):
    """
    Lead Time Analysis Endpoint:
    Returns the dynamic pricing curve across advance booking days (T+0 to T+45+),
    macro booking window buckets, carrier yield management comparisons, and economic insights.
    """
    try:
        metrics = calculate_lead_time_metrics(
            fare_collection,
            origin=origin,
            destination=destination,
            route=route,
            airline=airline,
        )
        return metrics
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate lead time analysis: {str(error)}"
        )


# ============================================================
# QUOTA EXHAUSTION ALERT NOTIFIER
# ============================================================

def notify_quota_exhausted(source="AirFareX Backend"):
    """
    Triggers an instant alert when SerpApi limits are exhausted:
    1. Prints a prominent terminal banner.
    2. Triggers a native macOS notification popup and chime.
    """
    print()
    print("=" * 70)
    print("🚨 [AIRFAREX ALERT] SERPAPI SEARCH QUOTA EXHAUSTED (HTTP 429) 🚨")
    print(f"Source : {source}")
    print("Detail : Your SerpApi account has reached its search credit limit.")
    print("👉 ACTION REQUIRED: Update SERPAPI_API_KEY in backend/.env")
    print("=" * 70)
    print()

    try:
        title = "AirFareX: SerpApi Limit Exhausted"
        message = "SerpApi quota reached (HTTP 429). Please update SERPAPI_API_KEY in backend/.env."
        apple_script = (
            f'display notification "{message}" '
            f'with title "{title}" '
            f'sound name "Sosumi"'
        )
        subprocess.run(["osascript", "-e", apple_script], check=False, timeout=3)
    except Exception:
        pass


# ============================================================
# LIVE SEARCH FARE INGESTION HELPER
# ============================================================

def format_fare_observation(
    flight_group,
    origin,
    destination,
    travel_date,
    collected_at
):
    """
    Normalizes a Google Flights result into the official AirFareX
    fare_observations schema for price index calculation.
    """
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

    # Generate deterministic hash to prevent accidental duplicates
    raw_hash = f"{origin}|{destination}|{travel_date}|{airline_str}|{flight_numbers_str}|{price}|INR|{collected_at}"
    observation_id = hashlib.sha256(raw_hash.encode("utf-8")).hexdigest()

    return {
        "observation_id": observation_id,
        "source": "Live User Search (SerpApi)",
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


# ============================================================
# LIVE FLIGHT SEARCH & PRICE INDEX INGESTION
# ============================================================

@app.get("/api/search")
def search_flights(
    origin: str = Query(
        ...,
        min_length=3,
        max_length=3
    ),
    destination: str = Query(
        ...,
        min_length=3,
        max_length=3
    ),
    travel_date: str = Query(
        ...
    ),
):
    """
    1. Performs a live Google Flights search through SerpApi.
    2. Returns instantaneous real-time flight cards to the client.
    3. Asynchronously records observations into MongoDB (fare_observations)
       to immediately feed the real-time Price Index engine.
    """

    if not SERPAPI_API_KEY:

        raise HTTPException(
            status_code=500,
            detail="SERPAPI_API_KEY not found in .env"
        )

    origin = origin.upper().strip()
    destination = destination.upper().strip()
    collected_at = datetime.now(timezone.utc).isoformat()

    params = {
        "engine": "google_flights",
        "departure_id": origin,
        "arrival_id": destination,
        "outbound_date": travel_date,
        "type": 2,
        "adults": 1,
        "travel_class": 1,
        "currency": "INR",
        "hl": "en",
        "api_key": SERPAPI_API_KEY,
    }

    try:

        response = requests.get(
            "https://serpapi.com/search.json",
            params=params,
            timeout=60,
        )

        if response.status_code == 429:

            notify_quota_exhausted(source="Live Flight Search API")

            raise HTTPException(
                status_code=429,
                detail=(
                    "SERPAPI_QUOTA_EXHAUSTED: SerpApi search limit reached. "
                    "Please update SERPAPI_API_KEY in backend/.env"
                )
            )

        if response.status_code != 200:

            raise HTTPException(
                status_code=502,
                detail=(
                    "SerpApi request failed."
                )
            )

        data = response.json()

    except requests.RequestException:

        raise HTTPException(
            status_code=502,
            detail="Unable to contact SerpApi."
        )

    # Check if SerpApi returned a quota exhaustion message in JSON
    api_error = str(data.get("error", "")).lower()
    if api_error and (
        "run out of searches" in api_error
        or "monthly limit" in api_error
        or "plan limit" in api_error
        or "account limit" in api_error
        or "rate limit" in api_error
    ):
        notify_quota_exhausted(source="Live Flight Search API (JSON Quota Error)")
        raise HTTPException(
            status_code=429,
            detail=(
                f"SERPAPI_QUOTA_EXHAUSTED: {data.get('error')}. "
                "Please update SERPAPI_API_KEY in backend/.env"
            )
        )

    # Gracefully handle "Google Flights returned no results"
    if api_error and (
        "hasn't returned any results" in api_error
        or "has not returned any results" in api_error
        or "no flights found" in api_error
    ):
        return {
            "origin": origin,
            "destination": destination,
            "travel_date": travel_date,
            "source": "SerpApi Google Flights",
            "near_real_time": True,
            "count": 0,
            "cheapest": None,
            "flights": [],
            "saved_to_mongodb": False,
            "observations_saved": 0,
            "message": "No flights found for this route and date.",
        }

    flights = []
    mongo_records = []

    combined_results = (
        data.get("best_flights", [])
        + data.get("other_flights", [])
    )

    for flight_group in combined_results:

        price = flight_group.get("price")

        if price is None:
            continue

        flights.append({
            "price": price,
            "currency": "INR",
            "total_duration_minutes":
                flight_group.get(
                    "total_duration"
                ),
            "stops":
                flight_group.get(
                    "stops"
                ),
            "flights":
                flight_group.get(
                    "flights",
                    []
                ),
        })

        # Build MoSPI Price Index observation document
        obs = format_fare_observation(
            flight_group,
            origin,
            destination,
            travel_date,
            collected_at
        )
        if obs:
            mongo_records.append(obs)

    # Ingest into MongoDB fare_observations collection
    observations_saved = 0
    if mongo_records:
        try:
            ops = [
                UpdateOne(
                    {"observation_id": doc["observation_id"]},
                    {"$set": doc},
                    upsert=True
                )
                for doc in mongo_records
            ]
            write_result = fare_collection.bulk_write(
                ops,
                ordered=False
            )
            observations_saved = (
                len(write_result.upserted_ids)
                + write_result.modified_count
                + write_result.matched_count
            )
        except Exception as db_err:
            # Never fail the user's flight search if background DB logging fails
            print(f"[Warning] Failed to write live observations to MongoDB: {db_err}")

    flights.sort(
        key=lambda x: x["price"]
    )

    return {
        "origin": origin,
        "destination": destination,
        "travel_date": travel_date,
        "source": "SerpApi Google Flights",
        "near_real_time": True,
        "count": len(flights),
        "cheapest":
            flights[0] if flights else None,
        "flights": flights,
        "saved_to_mongodb": observations_saved > 0,
        "observations_saved": observations_saved,
    }


# ============================================================
# STARTUP MESSAGE
# ============================================================

@app.on_event("startup")
def startup_event():

    print()
    print("=" * 60)
    print("AirFareX FastAPI Backend")
    print("=" * 60)
    print("MongoDB database :", "AirFareX")
    print("Fare collection  :", "fare_observations")
    print("Index collection :", "price_index")
    print("=" * 60)




# ============================================================
# ROUTE DETAILS STATS
# ============================================================

@app.get("/api/route-stats/{origin}/{destination}")
def get_route_stats(origin: str, destination: str):
    try:
        match_stage = {
            "$match": {
                "origin": origin.upper(),
                "destination": destination.upper(),
                "fare_amount": {"$type": "number", "$gt": 0}
            }
        }
        
        # Overall Stats
        overall_pipeline = [
            match_stage,
            {
                "$group": {
                    "_id": None,
                    "total_observations": {"$sum": 1},
                    "average_fare": {"$avg": "$fare_amount"},
                    "minimum_fare": {"$min": "$fare_amount"},
                    "maximum_fare": {"$max": "$fare_amount"}
                }
            }
        ]
        overall_list = list(fare_collection.aggregate(overall_pipeline))
        overall = overall_list[0] if overall_list else {
            "total_observations": 0, "average_fare": 0, "minimum_fare": 0, "maximum_fare": 0
        }
        overall.pop("_id", None)
        if overall["average_fare"]:
            overall["average_fare"] = round(overall["average_fare"], 2)

        # Price Trend by Travel Date
        trend_pipeline = [
            match_stage,
            {
                "$group": {
                    "_id": "$travel_date",
                    "average_fare": {"$avg": "$fare_amount"},
                    "minimum_fare": {"$min": "$fare_amount"}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        trend_list = list(fare_collection.aggregate(trend_pipeline))
        price_trend = [
            {
                "travel_date": t["_id"],
                "average_fare": round(t["average_fare"], 2),
                "minimum_fare": t["minimum_fare"]
            }
            for t in trend_list if t["_id"]
        ]

        # Carrier Share
        carrier_pipeline = [
            match_stage,
            {
                "$group": {
                    "_id": "$airline",
                    "observations": {"$sum": 1},
                    "average_fare": {"$avg": "$fare_amount"}
                }
            },
            {"$sort": {"observations": -1}}
        ]
        carrier_list = list(fare_collection.aggregate(carrier_pipeline))
        carrier_share = [
            {
                "airline": c["_id"] or "Unknown",
                "observations": c["observations"],
                "average_fare": round(c["average_fare"], 2)
            }
            for c in carrier_list
        ]

        # Top 5 Cheapest Flights
        cheapest_pipeline = [
            match_stage,
            {"$sort": {"fare_amount": 1}},
            {"$limit": 5},
            {
                "$project": {
                    "_id": 0,
                    "airline": 1,
                    "fare_amount": 1,
                    "travel_date": 1,
                    "departure_time": 1,
                    "flight_numbers": 1
                }
            }
        ]
        cheapest_flights = list(fare_collection.aggregate(cheapest_pipeline))

        return {
            "origin": origin.upper(),
            "destination": destination.upper(),
            "overall_stats": overall,
            "price_trend": price_trend,
            "carrier_share": carrier_share,
            "cheapest_flights": cheapest_flights
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# ============================================================
# ML BOOKING WINDOW INTELLIGENCE
# ============================================================

from Backend.ml_predictor import FareForecaster
import pandas as pd

forecaster = FareForecaster()
try:
    forecaster.load_model()
except Exception as e:
    print(f"Warning: Could not load ML model: {e}")

@app.get("/api/booking-prediction/{origin}/{destination}")
def get_booking_prediction(origin: str, destination: str):
    try:
        origin = origin.upper()
        destination = destination.upper()
        route_str = f"{origin}-{destination}"
        
        # Check historical data volume
        match_stage = {
            "origin": origin,
            "destination": destination,
            "fare_amount": {"$type": "number", "$gt": 0}
        }
        
        # Get historical median and observation count
        pipeline = [
            {"$match": match_stage},
            {"$group": {
                "_id": None,
                "count": {"$sum": 1},
                "median_fare": {"$avg": "$fare_amount"}, # Using avg as approximation for median
                "current_fare": {"$last": "$fare_amount"}
            }}
        ]
        
        stats_res = list(fare_collection.aggregate(pipeline))
        if not stats_res or stats_res[0]["count"] < 15:
            return {
                "route": route_str,
                "status": "insufficient_data",
                "message": "AirFareX is still collecting historical observations for this route. Forecast reliability will improve as additional booking-window data becomes available."
            }
            
        stats = stats_res[0]
        current_fare = stats["current_fare"]
        historical_median = stats["median_fare"]
        
        # Generate predictions for 3, 7, 14 days out
        # We need a representative airline, month, and day_of_week for the baseline.
        # Let's find the most common airline for this route
        airline_res = list(fare_collection.aggregate([
            {"$match": match_stage},
            {"$group": {"_id": "$airline", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 1}
        ]))
        primary_airline = airline_res[0]["_id"] if airline_res else "Unknown"
        
        import datetime
        now = datetime.datetime.now()
        current_month = now.month
        
        horizons = [3, 7, 14]
        predictions = {}
        
        if forecaster.model:
            for days in horizons:
                target_date = now + datetime.timedelta(days=days)
                df_infer = pd.DataFrame([{
                    "route": route_str,
                    "airline": primary_airline,
                    "days_to_departure": days,
                    "month": target_date.month,
                    "day_of_week": target_date.weekday()
                }])
                pred_fare = forecaster.predict(df_infer)[0]
                
                # Add a synthetic confidence interval based on historical variance
                # For simplicity, +/- 3-5% based on horizon
                variance = 0.03 + (days * 0.002)
                predictions[f"{days}_days"] = {
                    "low": round(pred_fare * (1 - variance)),
                    "high": round(pred_fare * (1 + variance)),
                    "expected": round(pred_fare)
                }
        else:
            return {"status": "error", "message": "ML model not available"}
            
        # Booking Logic Engine
        pred_7d = predictions.get("7_days", {}).get("expected", current_fare)
        price_diff_pct = ((pred_7d - current_fare) / current_fare) * 100
        
        # Calculate Probability of Increase (simplified heuristic combining model diff and lead time)
        prob_increase = 0.50 + (price_diff_pct / 100.0)
        # Cap probability between 15% and 95%
        prob_increase = max(0.15, min(0.95, prob_increase))
        
        # Booking Score (0-100)
        # Higher score = better to book NOW. (i.e. high probability of increase)
        booking_score = round(prob_increase * 100)
        
        if booking_score > 75:
            recommendation = "Book within the next 2-3 days"
            risk_level = "High risk of waiting"
        elif booking_score > 55:
            recommendation = "Monitor fare closely"
            risk_level = "Increasing risk"
        else:
            recommendation = "Wait for better pricing"
            risk_level = "Good time to book / Safe to wait"
            
        factors = [
            f"Current fare is {round(abs((current_fare - historical_median) / historical_median) * 100, 1)}% {'above' if current_fare > historical_median else 'below'} historical median",
            f"Route historically sees high volatility within 14 days of departure" if booking_score > 60 else "Route pricing is historically stable",
            f"Based on {stats['count']} historical observations for {route_str}"
        ]
        
        return {
            "status": "success",
            "route": route_str,
            "current_fare": round(current_fare),
            "historical_median": round(historical_median),
            "predicted_fare": predictions,
            "probability_of_increase": round(prob_increase * 100),
            "booking_score": booking_score,
            "recommendation": recommendation,
            "risk_level": risk_level,
            "model_reliability": "MODERATE" if stats['count'] < 50 else "HIGH",
            "factors": factors
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# AIRFAREX INTELLIGENCE COPILOT (CHATBOT API)
# ============================================================

from Backend.chatbot import (
    ChatRequest,
    ChatResponse,
    ResetRequest,
    ResetResponse,
    ConversationHistoryResponse,
    ChatHealthResponse,
    ChatService,
)

chat_service = ChatService(db=db)

@app.post("/api/chat", response_model=ChatResponse)
def chat_with_copilot(request: ChatRequest):
    """
    AirFareX Intelligence Copilot Endpoint:
    Natural language interface for flight search, price index inquiries,
    booking recommendations, route statistics, and fare comparisons.
    """
    try:
        return chat_service.process_chat_message(request)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Chat processing error: {str(exc)}"
        )

@app.post("/api/chat/reset", response_model=ResetResponse)
def reset_chat_conversation(request: ResetRequest):
    """Reset a conversation session and clear its context."""
    return chat_service.reset_conversation(request.conversation_id)

@app.get("/api/chat/history/{conversation_id}", response_model=ConversationHistoryResponse)
def get_chat_history(conversation_id: str):
    """Retrieve full message history for a conversation ID."""
    return chat_service.get_conversation_history(conversation_id)

@app.get("/api/chat/health", response_model=ChatHealthResponse)
def get_chat_health():
    """Health check for the AirFareX Intelligence Copilot."""
    return chat_service.health_check()
