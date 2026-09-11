"""
AirFareX - Booking Advisor Tool
===============================

Provides explainable, statistical booking recommendations:
- GOOD_TIME_TO_BOOK
- CONSIDER_WAITING
- FARE_IS_AVERAGE
- INSUFFICIENT_DATA

Explicitly complies with anti-hallucination & explainability guidelines:
Never claims future price certainty; all decisions grounded in actual numbers.
"""

from __future__ import annotations

import statistics
from datetime import datetime, date
from typing import Any, Dict, Optional

from Backend.tools.airport_resolver import normalize_route_pair, get_city_name


def get_booking_recommendation(
    db,
    origin: str,
    destination: str,
    travel_date: Optional[str] = None,
    current_fare: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Evaluate whether a given or observed fare is a favorable time to book
    relative to historical AirFareX route metrics and lead-time patterns.
    """
    orig_code, dest_code, route = normalize_route_pair(origin, destination)
    if not orig_code or not dest_code:
        return {
            "status": "error",
            "message": f"Invalid airport code/city: '{origin}' or '{destination}'."
        }

    collection = db["fare_observations"]

    # Gather historical fares for route
    query: Dict[str, Any] = {
        "origin": orig_code,
        "destination": dest_code,
        "fare_amount": {"$type": "number", "$gt": 0}
    }

    obs_list = list(collection.find(query, {"fare_amount": 1, "travel_date": 1, "collected_at": 1}).sort("collected_at", -1))
    if len(obs_list) < 5:
        return {
            "status": "success",
            "route": route,
            "origin_city": get_city_name(orig_code),
            "destination_city": get_city_name(dest_code),
            "recommendation": "INSUFFICIENT_DATA",
            "reason": f"AirFareX has recorded only {len(obs_list)} observations for {route}. A minimum of 5 observations is required for statistical pricing guidance.",
            "data_used": {
                "observations": len(obs_list),
                "current_fare": current_fare,
            },
            "disclaimer": "AirFareX provides guidance based strictly on observed historical samples. It cannot predict airline revenue management algorithms with certainty."
        }

    fares = [d["fare_amount"] for d in obs_list if isinstance(d.get("fare_amount"), (int, float))]
    med_fare = round(statistics.median(fares), 2)
    avg_fare = round(statistics.mean(fares), 2)
    min_fare = min(fares)
    max_fare = max(fares)

    # Determine reference fare to evaluate
    eval_fare = current_fare
    if eval_fare is None:
        if travel_date:
            date_match = collection.find_one(
                {"origin": orig_code, "destination": dest_code, "travel_date": travel_date, "fare_amount": {"$gt": 0}},
                sort=[("fare_amount", 1)]
            )
            if date_match:
                eval_fare = float(date_match["fare_amount"])

        if eval_fare is None and obs_list:
            eval_fare = float(obs_list[0]["fare_amount"])

    if eval_fare is None:
        eval_fare = med_fare

    eval_fare = round(float(eval_fare), 2)

    # Mathematical difference from historical median
    diff_from_median = eval_fare - med_fare
    pct_from_median = round((diff_from_median / med_fare) * 100, 1) if med_fare > 0 else 0.0

    # Lead time check if travel_date available
    days_to_departure = None
    if travel_date:
        try:
            t_dt = datetime.strptime(travel_date.strip(), "%Y-%m-%d").date()
            today_dt = date.today()
            days_to_departure = (t_dt - today_dt).days
        except Exception:
            pass

    # Recommendation classification
    if pct_from_median <= -10.0:
        recommendation = "GOOD_TIME_TO_BOOK"
        reason = (
            f"The evaluated fare of ₹{eval_fare:,.2f} is approximately {abs(pct_from_median):.1f}% below "
            f"the historical route median of ₹{med_fare:,.2f}. Historically observed data suggests this is a relatively favorable price."
        )
    elif pct_from_median >= 12.0:
        if days_to_departure is not None and days_to_departure <= 3:
            recommendation = "GOOD_TIME_TO_BOOK"
            reason = (
                f"Although the fare of ₹{eval_fare:,.2f} is {pct_from_median:.1f}% above the route median (₹{med_fare:,.2f}), "
                f"departure is only {days_to_departure} day(s) away. Airline dynamic pricing curves historically exhibit severe surge within 72 hours of flight."
            )
        else:
            recommendation = "CONSIDER_WAITING"
            reason = (
                f"The evaluated fare of ₹{eval_fare:,.2f} is currently {pct_from_median:.1f}% above "
                f"the historical median of ₹{med_fare:,.2f} for this corridor."
                + (f" With {days_to_departure} days until departure, observing prices over the next few days may be advisable." if days_to_departure and days_to_departure > 10 else "")
            )
    else:
        recommendation = "FARE_IS_AVERAGE"
        reason = (
            f"The evaluated fare of ₹{eval_fare:,.2f} is within {abs(pct_from_median):.1f}% of the historical "
            f"route median (₹{med_fare:,.2f}), aligning closely with normal pricing behavior."
        )

    return {
        "status": "success",
        "route": route,
        "origin_city": get_city_name(orig_code),
        "destination_city": get_city_name(dest_code),
        "travel_date": travel_date,
        "recommendation": recommendation,
        "reason": reason,
        "data_used": {
            "evaluated_fare": eval_fare,
            "historical_median_fare": med_fare,
            "historical_average_fare": avg_fare,
            "historical_minimum_fare": min_fare,
            "historical_maximum_fare": max_fare,
            "difference_from_median_percent": pct_from_median,
            "total_observations_analyzed": len(fares),
            "days_to_departure": days_to_departure,
        },
        "disclaimer": "AirFareX booking guidance is calculated from historical statistical observations and yield patterns. It suggests trends but does not guarantee future fare adjustments."
    }
