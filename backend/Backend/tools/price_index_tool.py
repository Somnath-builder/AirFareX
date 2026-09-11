"""
AirFareX - Price Index Tool
===========================

Retrieves and interprets the AirFareX prototype airfare price index
from MongoDB Atlas `price_index` collection.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from Backend.tools.airport_resolver import normalize_route_pair, resolve_airport


def get_price_index(
    db,
    route: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Retrieve current and historical index records from the AirFareX prototype price index.
    """
    collection = db["price_index"]
    query: Dict[str, Any] = {}

    target_route = None
    if route:
        parts = [p.strip() for p in route.replace("->", "-").replace("TO", "-").replace("to", "-").split("-")]
        if len(parts) >= 2:
            orig = resolve_airport(parts[0])
            dest = resolve_airport(parts[1])
            if orig and dest:
                target_route = f"{orig}-{dest}"
                query["route"] = target_route

    if target_route:
        # Route-level index
        records = list(collection.find({"route": target_route}, {"_id": 0}).sort("period", 1))
        index_scope = "ROUTE_LEVEL"
    else:
        # Check if there is an overall index (records where route is not present or overall)
        overall_records = list(collection.find({"$or": [{"route": {"$exists": False}}, {"route": None}, {"route": "OVERALL"}]}, {"_id": 0}).sort("period", 1))
        if overall_records:
            records = overall_records
            index_scope = "OVERALL_NATIONAL"
        else:
            # Fallback to all latest records
            records = list(collection.find({}, {"_id": 0}).sort("period", 1))
            index_scope = "COMBINED"

    if not records:
        return {
            "status": "not_found",
            "index_name": "AirFareX Price Index",
            "scope": index_scope,
            "route": target_route,
            "message": f"No price index records found for {target_route or 'overall index'} in AirFareX database.",
        }

    latest = records[-1]
    latest_index = float(latest.get("index", 100.0))
    base_period = latest.get("base_period", records[0].get("period", "Base Period"))
    current_period = latest.get("period", "Current")

    # Percentage change relative to base period (100)
    change_from_base = round(latest_index - 100.0, 2)
    change_str = f"{change_from_base:+.2f}%"

    if latest_index > 100.0:
        interpretation = (
            f"The AirFareX Price Index for {target_route or 'domestic routes'} is currently {latest_index:.2f}, "
            f"which is {abs(change_from_base):.2f}% higher than the base period level of 100.00 ({base_period})."
        )
    elif latest_index < 100.0:
        interpretation = (
            f"The AirFareX Price Index for {target_route or 'domestic routes'} is currently {latest_index:.2f}, "
            f"which is {abs(change_from_base):.2f}% lower than the base period level of 100.00 ({base_period})."
        )
    else:
        interpretation = (
            f"The AirFareX Price Index for {target_route or 'domestic routes'} is at the baseline level of 100.00 ({base_period})."
        )

    series = []
    for r in records[-10:]:
        series.append({
            "period": r.get("period"),
            "index": round(float(r.get("index", 100.0)), 2),
            "base_fare": r.get("base_fare"),
            "current_fare": r.get("current_fare") or r.get("average_fare"),
            "period_change": r.get("period_change_percent"),
        })

    return {
        "status": "success",
        "index_name": "AirFareX Prototype Airfare Price Index",
        "scope": index_scope,
        "route": target_route,
        "current_index": latest_index,
        "base_period": base_period,
        "base_index": 100.0,
        "current_period": current_period,
        "change_from_base_percent": change_from_base,
        "interpretation": interpretation,
        "series": series,
        "disclaimer": "AirFareX Price Index is a research prototype developed for MoSPI Hackathon Problem Statement 26056 and is not an official government CPI publication.",
    }
