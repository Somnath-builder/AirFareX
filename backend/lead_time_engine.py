"""
AirFareX - Lead Time Analysis Engine
====================================

Analyzes the impact of advance booking windows (lead time) on domestic airfare pricing.

Economic Concept:
- Lead Time = Travel Date - Collection Date (in days).
- Yield Management / Dynamic Pricing: Airlines systematically increase fares
  as departure date nears (urgency premium / last-minute surge).
- Forward-looking CPI relevance: MoSPI tracking of how advance vs urgent purchase
  affects consumer expenditure weights.

Provides:
- Discrete day-by-day price progression curve.
- Macro booking window buckets (0-1d, 2-7d, 8-14d, 15-30d, 31+d).
- Carrier-level dynamic pricing comparisons.
- Route-specific lead-time filters.
- Standalone CLI report generator.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi

# ---------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = "AirFareX"
COLLECTION_NAME = "fare_observations"
LOCAL_TIMEZONE = ZoneInfo("Asia/Kolkata")


# ---------------------------------------------------------------------
# DATABASE CONNECTION
# ---------------------------------------------------------------------

def get_mongo_collection(uri: Optional[str] = None):
    """Return MongoDB fare_observations collection."""
    conn_uri = uri or MONGODB_URI
    if not conn_uri:
        raise ValueError("MONGODB_URI not found in environment or backend/.env")

    client = MongoClient(
        conn_uri,
        server_api=ServerApi("1"),
        tls=True,
        tlsAllowInvalidCertificates=True
    )
    db = client[DB_NAME]
    return db[COLLECTION_NAME]


# ---------------------------------------------------------------------
# WINDOW BUCKET DEFINITIONS
# ---------------------------------------------------------------------

WINDOW_BUCKETS = [
    {"key": "0-1d", "min_days": 0, "max_days": 1, "label": "Last-Minute (0-1 Days)"},
    {"key": "2-7d", "min_days": 2, "max_days": 7, "label": "1 Week Out (2-7 Days)"},
    {"key": "8-14d", "min_days": 8, "max_days": 14, "label": "2 Weeks Out (8-14 Days)"},
    {"key": "15-30d", "min_days": 15, "max_days": 30, "label": "Advance (15-30 Days)"},
    {"key": "31d+", "min_days": 31, "max_days": 9999, "label": "Early Bird (31+ Days)"},
]


def classify_window(days: int) -> str:
    for bucket in WINDOW_BUCKETS:
        if bucket["min_days"] <= days <= bucket["max_days"]:
            return bucket["label"]
    return "Other"


# ---------------------------------------------------------------------
# CORE CALCULATION ENGINE
# ---------------------------------------------------------------------

def calculate_lead_time_metrics(
    collection,
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    route: Optional[str] = None,
    airline: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Query MongoDB fare_observations and calculate detailed lead-time analytics.
    """
    # Build query filter
    query: Dict[str, Any] = {}

    if route:
        parts = [p.strip().upper() for p in route.replace("->", "-").split("-")]
        if len(parts) == 2:
            query["origin"] = parts[0]
            query["destination"] = parts[1]
    else:
        if origin:
            query["origin"] = origin.strip().upper()
        if destination:
            query["destination"] = destination.strip().upper()

    if airline:
        query["airline"] = {"$regex": airline.strip(), "$options": "i"}

    # Project required fields
    projection = {
        "_id": 0,
        "origin": 1,
        "destination": 1,
        "travel_date": 1,
        "collected_at": 1,
        "fare_amount": 1,
        "airline": 1,
    }

    documents = list(collection.find(query, projection))

    if not documents:
        return {
            "total_observations": 0,
            "curve": [],
            "windows": [],
            "carrier_comparison": [],
            "insights": {
                "cheapest_window": "N/A",
                "average_surge_percentage": 0.0,
                "summary": "No fare observations matching the specified criteria."
            },
            "available_routes": [],
            "available_airlines": [],
        }

    df = pd.DataFrame(documents)

    # Clean numeric fares
    df["fare_amount"] = pd.to_numeric(df["fare_amount"], errors="coerce")
    df = df.dropna(subset=["fare_amount"])
    df = df[df["fare_amount"] > 0]

    # Calculate lead time in days (Indian Standard Time)
    travel_dates = pd.to_datetime(df["travel_date"], errors="coerce").dt.date
    
    collected_dates = pd.to_datetime(
        df["collected_at"], errors="coerce", utc=True
    ).dt.tz_convert(LOCAL_TIMEZONE).dt.date

    df["lead_time_days"] = (travel_dates - collected_dates).apply(
        lambda x: x.days if pd.notnull(x) else None
    )

    # Filter out invalid negative lead times (searches collected after travel date)
    df = df.dropna(subset=["lead_time_days"])
    df["lead_time_days"] = df["lead_time_days"].astype(int)
    df = df[df["lead_time_days"] >= 0]

    if df.empty:
        return {
            "total_observations": 0,
            "curve": [],
            "windows": [],
            "carrier_comparison": [],
            "insights": {
                "cheapest_window": "N/A",
                "average_surge_percentage": 0.0,
                "summary": "No valid lead-time observations found."
            },
            "available_routes": [],
            "available_airlines": [],
        }

    df["route"] = df["origin"] + "-" + df["destination"]

    # -----------------------------------------------------------------
    # 1. Discrete Lead Time Curve (by day)
    # -----------------------------------------------------------------
    curve = []
    grouped_days = df.groupby("lead_time_days")

    for days, group in sorted(grouped_days):
        avg_f = float(group["fare_amount"].mean())
        med_f = float(group["fare_amount"].median())
        min_f = float(group["fare_amount"].min())
        max_f = float(group["fare_amount"].max())
        count_f = int(len(group))

        label = (
            "Same Day (T-0)" if days == 0
            else f"{days} Day Out (T-{days})" if days == 1
            else f"{days} Days Out (T-{days})"
        )

        curve.append({
            "days_before_departure": int(days),
            "label": label,
            "average_fare": round(avg_f, 2),
            "median_fare": round(med_f, 2),
            "minimum_fare": round(min_f, 2),
            "maximum_fare": round(max_f, 2),
            "observations": count_f,
        })

    # -----------------------------------------------------------------
    # 2. Window Buckets (Macro Summary)
    # -----------------------------------------------------------------
    df["window_label"] = df["lead_time_days"].apply(classify_window)
    windows = []

    for bucket in WINDOW_BUCKETS:
        b_df = df[df["window_label"] == bucket["label"]]
        if not b_df.empty:
            windows.append({
                "key": bucket["key"],
                "label": bucket["label"],
                "average_fare": round(float(b_df["fare_amount"].mean()), 2),
                "median_fare": round(float(b_df["fare_amount"].median()), 2),
                "minimum_fare": round(float(b_df["fare_amount"].min()), 2),
                "maximum_fare": round(float(b_df["fare_amount"].max()), 2),
                "observations": int(len(b_df)),
            })

    # -----------------------------------------------------------------
    # 3. Carrier Dynamic Pricing Comparison
    # -----------------------------------------------------------------
    carrier_comparison = []
    airline_groups = df.groupby("airline")

    for air, a_df in airline_groups:
        if len(a_df) < 3:
            continue

        # Last-minute (<= 2 days) vs Advance (>= 7 days)
        last_minute = a_df[a_df["lead_time_days"] <= 2]["fare_amount"]
        advance = a_df[a_df["lead_time_days"] >= 7]["fare_amount"]

        lm_avg = round(float(last_minute.mean()), 2) if not last_minute.empty else None
        adv_avg = round(float(advance.mean()), 2) if not advance.empty else None

        surge_pct = None
        if lm_avg and adv_avg and adv_avg > 0:
            surge_pct = round(((lm_avg - adv_avg) / adv_avg) * 100, 1)

        carrier_comparison.append({
            "airline": str(air),
            "total_observations": int(len(a_df)),
            "overall_average_fare": round(float(a_df["fare_amount"].mean()), 2),
            "last_minute_avg_fare": lm_avg,
            "advance_avg_fare": adv_avg,
            "surge_percentage": surge_pct,
        })

    carrier_comparison.sort(key=lambda x: x["total_observations"], reverse=True)

    # -----------------------------------------------------------------
    # 4. Economic Insights & Key Takeaways
    # -----------------------------------------------------------------
    cheapest_day_point = min(curve, key=lambda x: x["average_fare"]) if curve else None
    highest_day_point = max(curve, key=lambda x: x["average_fare"]) if curve else None

    surge_pct = 0.0
    if cheapest_day_point and highest_day_point and cheapest_day_point["average_fare"] > 0:
        surge_pct = round(
            ((highest_day_point["average_fare"] - cheapest_day_point["average_fare"])
             / cheapest_day_point["average_fare"]) * 100,
            1
        )

    # Summary text
    summary_msg = (
        f"Domestic airfares reach their lowest level at {cheapest_day_point['label'] if cheapest_day_point else 'advance window'}, "
        f"with fares averaging ₹{cheapest_day_point['average_fare'] if cheapest_day_point else 0:,.2f}. "
        f"Last-minute booking commands an average dynamic pricing surge of +{surge_pct}%."
    )

    # Unique routes and airlines for frontend dropdown filters
    available_routes = sorted(df["route"].unique().tolist())
    available_airlines = sorted(df["airline"].dropna().unique().tolist())

    return {
        "total_observations": int(len(df)),
        "filter_applied": {
            "origin": origin,
            "destination": destination,
            "route": route,
            "airline": airline,
        },
        "insights": {
            "cheapest_window": cheapest_day_point["label"] if cheapest_day_point else "N/A",
            "cheapest_fare": cheapest_day_point["average_fare"] if cheapest_day_point else None,
            "highest_window": highest_day_point["label"] if highest_day_point else "N/A",
            "highest_fare": highest_day_point["average_fare"] if highest_day_point else None,
            "average_surge_percentage": surge_pct,
            "summary": summary_msg,
        },
        "curve": curve,
        "windows": windows,
        "carrier_comparison": carrier_comparison[:10],
        "available_routes": available_routes,
        "available_airlines": available_airlines,
    }


# ---------------------------------------------------------------------
# CLI REPORT GENERATOR
# ---------------------------------------------------------------------

def print_lead_time_report():
    print("=" * 70)
    print("AirFareX - Real-Time Lead Time Analysis Engine")
    print("=" * 70)

    try:
        col = get_mongo_collection()
    except Exception as err:
        print(f"Failed to connect to MongoDB: {err}")
        return

    print("\nCalculating metrics from MongoDB fare_observations...\n")
    results = calculate_lead_time_metrics(col)

    if results["total_observations"] == 0:
        print("No observations found in MongoDB.")
        return

    print(f"Total Observations Analyzed : {results['total_observations']}")
    print(f"Unique Routes Evaluated     : {len(results['available_routes'])}")
    print(f"Airlines Represented        : {len(results['available_airlines'])}")
    print("-" * 70)
    print("ECONOMIC TAKEAWAY:")
    print(results["insights"]["summary"])
    print("-" * 70)

    print("\nDISCRETE BOOKING WINDOW CURVE:")
    print(f"{'Lead Time':<25} {'Avg Fare':<12} {'Median':<12} {'Min Fare':<10} {'Max Fare':<10} {'Offers':<6}")
    print("-" * 75)
    for pt in results["curve"]:
        print(
            f"{pt['label']:<25} "
            f"₹{pt['average_fare']:<11.2f} "
            f"₹{pt['median_fare']:<11.2f} "
            f"₹{pt['minimum_fare']:<9.0f} "
            f"₹{pt['maximum_fare']:<9.0f} "
            f"{pt['observations']:<6}"
        )

    print("\nMACRO BOOKING WINDOWS:")
    print(f"{'Window':<30} {'Avg Fare':<12} {'Median':<12} {'Offers':<6}")
    print("-" * 65)
    for win in results["windows"]:
        print(
            f"{win['label']:<30} "
            f"₹{win['average_fare']:<11.2f} "
            f"₹{win['median_fare']:<11.2f} "
            f"{win['observations']:<6}"
        )

    if results["carrier_comparison"]:
        print("\nCARRIER PRICING STRATEGIES (Last-Minute vs Advance):")
        print(f"{'Airline':<25} {'Last-Minute':<14} {'Advance (7d+)':<14} {'Surge %':<10}")
        print("-" * 65)
        for c in results["carrier_comparison"]:
            lm_str = f"₹{c['last_minute_avg_fare']:,.2f}" if c['last_minute_avg_fare'] else "N/A"
            adv_str = f"₹{c['advance_avg_fare']:,.2f}" if c['advance_avg_fare'] else "N/A"
            surge_str = f"+{c['surge_percentage']}%" if c['surge_percentage'] is not None else "N/A"
            print(f"{c['airline']:<25} {lm_str:<14} {adv_str:<14} {surge_str:<10}")

    print("=" * 70)


if __name__ == "__main__":
    print_lead_time_report()
