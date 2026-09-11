"""
AirFareX - Fare Comparison Tool
===============================

Performs exact mathematical comparisons:
1. Between two dates on the same route (e.g. Sept 20 vs Sept 25)
2. Between two different routes (e.g. CCU-DEL vs CCU-BOM)
3. Between current fare and historical median
"""

from __future__ import annotations

from typing import Any, Dict, Optional
import statistics

from Backend.tools.airport_resolver import normalize_route_pair, get_city_name


def compare_fares(
    db,
    origin: str,
    destination: str,
    date_a: Optional[str] = None,
    date_b: Optional[str] = None,
    compare_route_origin: Optional[str] = None,
    compare_route_destination: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Compare fares between dates on the same route OR between two different routes.
    """
    collection = db["fare_observations"]

    # Scenario 1: Comparing two different routes
    if compare_route_origin and compare_route_destination:
        orig1, dest1, route1 = normalize_route_pair(origin, destination)
        orig2, dest2, route2 = normalize_route_pair(compare_route_origin, compare_route_destination)

        fares1 = [d["fare_amount"] for d in collection.find({"origin": orig1, "destination": dest1, "fare_amount": {"$gt": 0}}, {"fare_amount": 1})]
        fares2 = [d["fare_amount"] for d in collection.find({"origin": orig2, "destination": dest2, "fare_amount": {"$gt": 0}}, {"fare_amount": 1})]

        if not fares1 or not fares2:
            return {
                "status": "not_found",
                "message": f"Insufficient data to compare {route1} ({len(fares1)} obs) and {route2} ({len(fares2)} obs)."
            }

        med1 = round(statistics.median(fares1), 2)
        med2 = round(statistics.median(fares2), 2)
        min1 = min(fares1)
        min2 = min(fares2)

        diff = round(abs(med1 - med2), 2)
        cheaper_route = route1 if med1 < med2 else route2
        pricier_route = route2 if med1 < med2 else route1
        pct = round((diff / max(med1, med2)) * 100, 1)

        return {
            "status": "success",
            "comparison_type": "ROUTE_VS_ROUTE",
            "route_1": {
                "route": route1,
                "origin_city": get_city_name(orig1),
                "destination_city": get_city_name(dest1),
                "median_fare": med1,
                "minimum_fare": min1,
                "observations": len(fares1),
            },
            "route_2": {
                "route": route2,
                "origin_city": get_city_name(orig2),
                "destination_city": get_city_name(dest2),
                "median_fare": med2,
                "minimum_fare": min2,
                "observations": len(fares2),
            },
            "cheaper_route": cheaper_route,
            "pricier_route": pricier_route,
            "absolute_difference": diff,
            "percentage_difference": pct,
            "summary": f"{cheaper_route} (median ₹{min(med1, med2):,.2f}) is ₹{diff:,.2f} ({pct}%) cheaper than {pricier_route} (median ₹{max(med1, med2):,.2f})."
        }

    # Scenario 2: Comparing two dates on the same route
    orig, dest, route = normalize_route_pair(origin, destination)
    if not orig or not dest:
        return {
            "status": "error",
            "message": f"Invalid airport code/city: '{origin}' or '{destination}'."
        }

    if not date_a or not date_b:
        return {
            "status": "error",
            "message": "Please supply two dates (date_a and date_b) to compare."
        }

    best_a = collection.find_one(
        {"origin": orig, "destination": dest, "travel_date": date_a, "fare_amount": {"$gt": 0}},
        sort=[("fare_amount", 1)]
    )
    best_b = collection.find_one(
        {"origin": orig, "destination": dest, "travel_date": date_b, "fare_amount": {"$gt": 0}},
        sort=[("fare_amount", 1)]
    )

    if not best_a and not best_b:
        return {
            "status": "not_found",
            "message": f"No fare data found for {route} on either {date_a} or {date_b}."
        }
    if not best_a:
        return {
            "status": "partial_data",
            "message": f"Found fare for {date_b} (₹{best_b['fare_amount']:,.2f}), but no observations recorded for {date_a}."
        }
    if not best_b:
        return {
            "status": "partial_data",
            "message": f"Found fare for {date_a} (₹{best_a['fare_amount']:,.2f}), but no observations recorded for {date_b}."
        }

    fare_a = float(best_a["fare_amount"])
    fare_b = float(best_b["fare_amount"])

    diff = round(abs(fare_a - fare_b), 2)
    cheaper_date = date_a if fare_a < fare_b else date_b
    pricier_date = date_b if fare_a < fare_b else date_a
    cheaper_fare = min(fare_a, fare_b)
    pricier_fare = max(fare_a, fare_b)
    pct = round((diff / pricier_fare) * 100, 1) if pricier_fare > 0 else 0

    return {
        "status": "success",
        "comparison_type": "DATE_VS_DATE",
        "route": route,
        "origin_city": get_city_name(orig),
        "destination_city": get_city_name(dest),
        "date_a": {
            "date": date_a,
            "cheapest_fare": fare_a,
            "airline": best_a.get("airline"),
        },
        "date_b": {
            "date": date_b,
            "cheapest_fare": fare_b,
            "airline": best_b.get("airline"),
        },
        "cheaper_date": cheaper_date,
        "pricier_date": pricier_date,
        "absolute_difference": diff,
        "percentage_difference": pct,
        "summary": f"{cheaper_date} (₹{cheaper_fare:,.2f}) is ₹{diff:,.2f} ({pct}%) cheaper than {pricier_date} (₹{pricier_fare:,.2f}) on {route}."
    }
