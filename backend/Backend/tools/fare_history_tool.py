"""
AirFareX - Fare History & Route Analytics Tools
===============================================

Queries MongoDB Atlas `fare_observations` for historical data:
- get_cheapest_fare()
- get_route_price()
- get_price_history()
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import statistics

from Backend.tools.airport_resolver import normalize_route_pair, get_city_name


def get_cheapest_fare(
    db,
    origin: str,
    destination: str,
    travel_date: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Retrieve the cheapest observed fare recorded in MongoDB for a route.
    """
    orig_code, dest_code, route = normalize_route_pair(origin, destination)
    if not orig_code or not dest_code:
        return {
            "status": "error",
            "message": f"Invalid airport code/city: '{origin}' or '{destination}'."
        }

    collection = db["fare_observations"]
    query: Dict[str, Any] = {
        "origin": orig_code,
        "destination": dest_code,
        "fare_amount": {"$type": "number", "$gt": 0},
    }
    if travel_date:
        query["travel_date"] = travel_date

    pipeline = [
        {"$match": query},
        {"$sort": {"fare_amount": 1}},
        {"$limit": 1},
    ]

    results = list(collection.aggregate(pipeline))
    if not results:
        return {
            "status": "not_found",
            "route": route,
            "origin": orig_code,
            "origin_city": get_city_name(orig_code),
            "destination": dest_code,
            "destination_city": get_city_name(dest_code),
            "travel_date": travel_date,
            "message": f"No observed fare data found in AirFareX records for {route}" + (f" on {travel_date}." if travel_date else "."),
        }

    best = results[0]
    return {
        "status": "success",
        "route": route,
        "origin": orig_code,
        "origin_city": get_city_name(orig_code),
        "destination": dest_code,
        "destination_city": get_city_name(dest_code),
        "travel_date": best.get("travel_date"),
        "cheapest_fare": best.get("fare_amount"),
        "currency": best.get("currency", "INR"),
        "airline": best.get("airline", "Unknown"),
        "flight_numbers": best.get("flight_numbers", ""),
        "departure_time": best.get("departure_time", ""),
        "arrival_time": best.get("arrival_time", ""),
        "stops": best.get("stops", 0),
        "duration_minutes": best.get("total_duration_minutes"),
        "collected_at": best.get("collected_at", ""),
        "source": best.get("source", "AirFareX Observation"),
    }


def get_route_price(
    db,
    origin: str,
    destination: str,
) -> Dict[str, Any]:
    """
    Retrieve current/latest price distribution and statistics for a route.
    """
    orig_code, dest_code, route = normalize_route_pair(origin, destination)
    if not orig_code or not dest_code:
        return {
            "status": "error",
            "message": f"Invalid airport code/city: '{origin}' or '{destination}'."
        }

    collection = db["fare_observations"]
    docs = list(
        collection.find(
            {
                "origin": orig_code,
                "destination": dest_code,
                "fare_amount": {"$type": "number", "$gt": 0},
            },
            {
                "_id": 0,
                "fare_amount": 1,
                "airline": 1,
                "travel_date": 1,
                "collected_at": 1,
            }
        ).sort("collected_at", -1)
    )

    if not docs:
        return {
            "status": "not_found",
            "route": route,
            "origin": orig_code,
            "destination": dest_code,
            "message": f"No fare observations available for route {route} in AirFareX database.",
        }

    fares = [d["fare_amount"] for d in docs if isinstance(d.get("fare_amount"), (int, float))]
    if not fares:
        return {
            "status": "not_found",
            "route": route,
            "message": f"No numeric fares recorded for {route}.",
        }

    min_fare = min(fares)
    max_fare = max(fares)
    avg_fare = round(statistics.mean(fares), 2)
    med_fare = round(statistics.median(fares), 2)
    latest_fare = docs[0].get("fare_amount")

    # Group by carrier
    carrier_fares: Dict[str, List[float]] = {}
    for d in docs:
        airline = d.get("airline", "Unknown")
        carrier_fares.setdefault(airline, []).append(d["fare_amount"])

    carriers_summary = []
    for airline, a_fares in sorted(carrier_fares.items(), key=lambda x: len(x[1]), reverse=True):
        carriers_summary.append({
            "airline": airline,
            "observations": len(a_fares),
            "average_fare": round(statistics.mean(a_fares), 2),
            "minimum_fare": min(a_fares),
        })

    return {
        "status": "success",
        "route": route,
        "origin": orig_code,
        "origin_city": get_city_name(orig_code),
        "destination": dest_code,
        "destination_city": get_city_name(dest_code),
        "observation_count": len(fares),
        "minimum_fare": min_fare,
        "median_fare": med_fare,
        "average_fare": avg_fare,
        "maximum_fare": max_fare,
        "latest_fare": latest_fare,
        "carriers": carriers_summary[:5],
    }


def get_price_history(
    db,
    origin: str,
    destination: str,
    travel_date: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Retrieve historical airfare progression over collection periods.
    """
    orig_code, dest_code, route = normalize_route_pair(origin, destination)
    if not orig_code or not dest_code:
        return {
            "status": "error",
            "message": f"Invalid airport code/city: '{origin}' or '{destination}'."
        }

    collection = db["fare_observations"]
    match_stage: Dict[str, Any] = {
        "origin": orig_code,
        "destination": dest_code,
        "fare_amount": {"$type": "number", "$gt": 0},
    }
    if travel_date:
        match_stage["travel_date"] = travel_date

    # Aggregate by collection date (period)
    pipeline = [
        {"$match": match_stage},
        {
            "$project": {
                "fare_amount": 1,
                "airline": 1,
                "travel_date": 1,
                "collection_period": {
                    "$substr": ["$collected_at", 0, 10]
                }
            }
        },
        {
            "$group": {
                "_id": "$collection_period",
                "observations": {"$sum": 1},
                "average_fare": {"$avg": "$fare_amount"},
                "minimum_fare": {"$min": "$fare_amount"},
                "maximum_fare": {"$max": "$fare_amount"},
            }
        },
        {"$sort": {"_id": 1}}
    ]

    periods_data = list(collection.aggregate(pipeline))
    if not periods_data:
        return {
            "status": "not_found",
            "route": route,
            "message": f"No historical collection periods recorded for route {route}.",
        }

    history = []
    for item in periods_data:
        history.append({
            "period": item["_id"],
            "observations": item["observations"],
            "average_fare": round(item["average_fare"], 2),
            "minimum_fare": round(item["minimum_fare"], 2),
            "maximum_fare": round(item["maximum_fare"], 2),
        })

    # Trend calculation
    trend = "STABLE"
    pct_change = 0.0
    if len(history) >= 2:
        earliest_avg = history[0]["average_fare"]
        latest_avg = history[-1]["average_fare"]
        if earliest_avg > 0:
            pct_change = round(((latest_avg - earliest_avg) / earliest_avg) * 100, 2)
            if pct_change > 3.0:
                trend = "INCREASING"
            elif pct_change < -3.0:
                trend = "DECREASING"

    all_fares = [h["average_fare"] for h in history]
    overall_median = round(statistics.median(all_fares), 2) if all_fares else 0.0

    return {
        "status": "success",
        "route": route,
        "origin": orig_code,
        "origin_city": get_city_name(orig_code),
        "destination": dest_code,
        "destination_city": get_city_name(dest_code),
        "total_periods": len(history),
        "earliest_period": history[0]["period"],
        "latest_period": history[-1]["period"],
        "overall_historical_median": overall_median,
        "period_percentage_change": pct_change,
        "trend": trend,
        "history": history,
    }
