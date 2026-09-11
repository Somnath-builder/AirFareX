"""
AirFareX - Budget Search Tool
=============================

Finds accessible destinations from a given origin under a specified budget ceiling,
using actual MongoDB fare observations.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from Backend.tools.airport_resolver import resolve_airport, get_city_name


def budget_search(
    db,
    origin: str,
    max_budget: float,
    travel_date: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Find domestic destinations from an origin that fit within a maximum price budget.
    """
    orig_code = resolve_airport(origin)
    if not orig_code:
        return {
            "status": "error",
            "message": f"Could not recognize origin city or airport '{origin}'."
        }

    collection = db["fare_observations"]
    match_stage: Dict[str, Any] = {
        "origin": orig_code,
        "fare_amount": {"$type": "number", "$gt": 0, "$lte": float(max_budget)}
    }
    if travel_date:
        match_stage["travel_date"] = travel_date

    pipeline = [
        {"$match": match_stage},
        {"$sort": {"fare_amount": 1}},
        {
            "$group": {
                "_id": "$destination",
                "cheapest_fare": {"$first": "$fare_amount"},
                "airline": {"$first": "$airline"},
                "flight_numbers": {"$first": "$flight_numbers"},
                "travel_date": {"$first": "$travel_date"},
                "total_observations": {"$sum": 1},
            }
        },
        {"$sort": {"cheapest_fare": 1}},
        {"$limit": 10}
    ]

    destinations_found = list(collection.aggregate(pipeline))

    if not destinations_found:
        # Check what the lowest observed fare from this origin actually is
        cheapest_any = list(collection.find(
            {"origin": orig_code, "fare_amount": {"$gt": 0}},
            {"fare_amount": 1, "destination": 1, "_id": 0}
        ).sort("fare_amount", 1).limit(3))

        alternatives = []
        for c in cheapest_any:
            dest = c.get("destination")
            alternatives.append(f"{get_city_name(dest)} ({dest}) at ₹{c.get('fare_amount'):,.2f}")

        msg = f"No flights observed from {get_city_name(orig_code)} ({orig_code}) under ₹{max_budget:,.2f}."
        if alternatives:
            msg += f" The lowest fares observed from {orig_code} start at: {', '.join(alternatives)}."

        return {
            "status": "no_results",
            "origin": orig_code,
            "origin_city": get_city_name(orig_code),
            "max_budget": max_budget,
            "destinations_count": 0,
            "destinations": [],
            "message": msg
        }

    results = []
    for d in destinations_found:
        dest_code = d["_id"]
        results.append({
            "destination": dest_code,
            "destination_city": get_city_name(dest_code),
            "route": f"{orig_code}-{dest_code}",
            "cheapest_fare": d["cheapest_fare"],
            "airline": d["airline"],
            "flight_numbers": d["flight_numbers"],
            "travel_date": d["travel_date"],
            "observations_count": d["total_observations"]
        })

    return {
        "status": "success",
        "origin": orig_code,
        "origin_city": get_city_name(orig_code),
        "max_budget": max_budget,
        "destinations_count": len(results),
        "destinations": results,
        "summary": f"Found {len(results)} destination(s) from {get_city_name(orig_code)} with fares under ₹{max_budget:,.2f}."
    }
