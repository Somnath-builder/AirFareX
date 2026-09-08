"""
AirFareX - FastAPI Backend

Provides:
    /api/health
    /api/routes
    /api/cheapest
    /api/price-index
    /api/analytics
    /api/search
"""

import os
from datetime import datetime
from typing import Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
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
# LIVE FLIGHT SEARCH
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
    Perform a fresh Google Flights search through SerpApi.

    This is a near-real-time search and does not use the
    historical MongoDB fare observations.
    """

    if not SERPAPI_API_KEY:

        raise HTTPException(
            status_code=500,
            detail="SERPAPI_API_KEY not found in .env"
        )

    origin = origin.upper()
    destination = destination.upper()

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

            raise HTTPException(
                status_code=429,
                detail=(
                    "SerpApi rate limit reached. "
                    "Please try again later."
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

    flights = []

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


