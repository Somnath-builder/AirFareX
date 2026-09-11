"""
AirFareX - Cheapest Date Finder Tool
====================================

Analyzes observed fares across a specified date window to find
the most economical travel date for a given corridor.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from Backend.tools.airport_resolver import normalize_route_pair, get_city_name


def find_cheapest_dates(
    db,
    origin: str,
    destination: str,
    start_date: str,
    end_date: str,
) -> Dict[str, Any]:
    """
    Find the cheapest observed travel date within a date range for a route.
    """
    orig_code, dest_code, route = normalize_route_pair(origin, destination)
    if not orig_code or not dest_code:
        return {
            "status": "error",
            "message": f"Invalid airport code/city: '{origin}' or '{destination}'."
        }

    collection = db["fare_observations"]
    pipeline = [
        {
            "$match": {
                "origin": orig_code,
                "destination": dest_code,
                "travel_date": {"$gte": start_date, "$lte": end_date},
                "fare_amount": {"$type": "number", "$gt": 0}
            }
        },
        {
            "$sort": {"fare_amount": 1}
        },
        {
            "$group": {
                "_id": "$travel_date",
                "cheapest_fare": {"$first": "$fare_amount"},
                "airline": {"$first": "$airline"},
                "flight_numbers": {"$first": "$flight_numbers"},
                "departure_time": {"$first": "$departure_time"},
                "observation_count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}}
    ]

    date_results = list(collection.aggregate(pipeline))

    if not date_results:
        # Check if any dates are available for this route at all
        any_dates = list(collection.find(
            {"origin": orig_code, "destination": dest_code, "fare_amount": {"$gt": 0}},
            {"travel_date": 1, "fare_amount": 1, "_id": 0}
        ).sort("travel_date", 1).limit(10))

        available_hint = [d.get("travel_date") for d in any_dates if d.get("travel_date")]
        return {
            "status": "not_found",
            "route": route,
            "origin_city": get_city_name(orig_code),
            "destination_city": get_city_name(dest_code),
            "date_range": {"from": start_date, "to": end_date},
            "message": f"No observed fare data found between {start_date} and {end_date} for {route}."
                       + (f" Known recorded dates for this route include: {', '.join(sorted(set(available_hint)))}." if available_hint else ""),
            "available_dates": sorted(list(set(available_hint)))
        }

    # Rank dates by price
    sorted_by_price = sorted(date_results, key=lambda x: x["cheapest_fare"])
    best_option = sorted_by_price[0]
    worst_option = sorted_by_price[-1]

    cheapest_date = best_option["_id"]
    cheapest_fare = best_option["cheapest_fare"]
    cheapest_airline = best_option["airline"]

    savings_vs_max = round(worst_option["cheapest_fare"] - cheapest_fare, 2)
    savings_pct = round((savings_vs_max / worst_option["cheapest_fare"]) * 100, 1) if worst_option["cheapest_fare"] > 0 else 0

    alternatives = []
    for d in sorted_by_price:
        diff = round(d["cheapest_fare"] - cheapest_fare, 2)
        alternatives.append({
            "travel_date": d["_id"],
            "cheapest_fare": d["cheapest_fare"],
            "airline": d["airline"],
            "price_difference": f"+₹{diff:,.2f}" if diff > 0 else "Lowest Fare",
            "observation_count": d["observation_count"]
        })

    return {
        "status": "success",
        "route": route,
        "origin": orig_code,
        "origin_city": get_city_name(orig_code),
        "destination": dest_code,
        "destination_city": get_city_name(dest_code),
        "date_range": {
            "from": start_date,
            "to": end_date
        },
        "cheapest_date": cheapest_date,
        "cheapest_fare": cheapest_fare,
        "cheapest_airline": cheapest_airline,
        "savings_vs_highest_date": savings_vs_max,
        "savings_percentage": savings_pct,
        "dates_analyzed": len(date_results),
        "alternatives": alternatives
    }
