"""
AirFareX - Airfare Price Index Engine

Purpose:
    Calculate a route-level and overall airfare price index
    from fare observations stored in MongoDB.

Base period:
    The earliest collection date in MongoDB is automatically
    used as the base period and assigned an index of 100.

Important:
    The current dataset contains observations from only one
    collection date, so the current overall index will be 100.
    When future collection runs create additional periods,
    the same script will automatically calculate price movement.
"""

import os
from collections import defaultdict
from datetime import datetime, timezone

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi


# ============================================================
# CONFIGURATION
# ============================================================

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise ValueError("MONGODB_URI not found in .env")

DATABASE_NAME = "AirFareX"
FARE_COLLECTION = "fare_observations"
INDEX_COLLECTION = "price_index"

BASE_INDEX = 100.0


# ============================================================
# MONGODB CONNECTION
# ============================================================

def connect_mongodb():
    """Connect to MongoDB Atlas."""

    client = MongoClient(
        MONGODB_URI,
        server_api=ServerApi("1")
    )

    client.admin.command("ping")

    print("======================================")
    print("MongoDB connection successful!")
    print("======================================")
    print("Database:", DATABASE_NAME)

    return client


# ============================================================
# DATE PARSING
# ============================================================

def parse_collection_date(value):
    """
    Convert collected_at into YYYY-MM-DD.

    Handles:
        2026-09-07T16:25:14.204552+05:30
        datetime objects
        ISO strings
    """

    if value is None:
        return None

    if isinstance(value, datetime):
        return value.date().isoformat()

    if isinstance(value, str):
        try:
            return datetime.fromisoformat(
                value.replace("Z", "+00:00")
            ).date().isoformat()
        except ValueError:
            return value[:10]

    return None


# ============================================================
# LOAD FARE OBSERVATIONS
# ============================================================

def load_fare_observations(collection):
    """
    Load valid fare observations.

    Only observations containing:
        origin
        destination
        fare_amount
        collected_at

    are used.
    """

    query = {
        "origin": {"$exists": True, "$ne": None},
        "destination": {"$exists": True, "$ne": None},
        "fare_amount": {"$exists": True, "$gt": 0},
        "collected_at": {"$exists": True, "$ne": None},
    }

    projection = {
        "_id": 0,
        "origin": 1,
        "destination": 1,
        "fare_amount": 1,
        "collected_at": 1,
        "airline": 1,
        "travel_date": 1,
    }

    observations = list(
        collection.find(query, projection)
    )

    print()
    print("Fare observations loaded:", len(observations))

    return observations


# ============================================================
# CALCULATE ROUTE PERIOD AVERAGES
# ============================================================

def calculate_route_period_averages(observations):
    """
    Calculate:

        route + collection period
                    ↓
             average fare

    Example:

        AMD-BOM | 2026-09-07 | ₹9544.12
    """

    grouped = defaultdict(list)

    for obs in observations:

        origin = str(obs.get("origin", "")).strip().upper()
        destination = str(
            obs.get("destination", "")
        ).strip().upper()

        fare = obs.get("fare_amount")

        period = parse_collection_date(
            obs.get("collected_at")
        )

        if not origin or not destination:
            continue

        if period is None:
            continue

        try:
            fare = float(fare)
        except (TypeError, ValueError):
            continue

        if fare <= 0:
            continue

        route = f"{origin}-{destination}"

        grouped[(route, period)].append(fare)

    route_periods = []

    for (route, period), fares in grouped.items():

        average_fare = sum(fares) / len(fares)

        route_periods.append({
            "route": route,
            "period": period,
            "average_fare": round(average_fare, 2),
            "observation_count": len(fares),
        })

    route_periods.sort(
        key=lambda x: (
            x["period"],
            x["route"]
        )
    )

    return route_periods


# ============================================================
# CALCULATE PRICE INDEX
# ============================================================

def calculate_price_index(route_periods):
    """
    Calculate route-level price indices.

    Formula:

        Index =
            Current average fare
            --------------------
            Base-period average fare
            × 100

    The earliest collection period is the base period.
    """

    if not route_periods:
        return [], None

    periods = sorted(
        set(item["period"] for item in route_periods)
    )

    base_period = periods[0]

    print()
    print("Base period:", base_period)
    print("Base index:", BASE_INDEX)

    # --------------------------------------------------------
    # Store base-period route fares
    # --------------------------------------------------------

    base_fares = {}

    for item in route_periods:

        if item["period"] == base_period:

            base_fares[item["route"]] = (
                item["average_fare"]
            )

    results = []

    for item in route_periods:

        route = item["route"]
        period = item["period"]
        current_fare = item["average_fare"]

        base_fare = base_fares.get(route)

        # A route must exist in the base period
        # to calculate a comparable index.
        if base_fare is None or base_fare <= 0:
            continue

        index_value = (
            current_fare / base_fare
        ) * BASE_INDEX

        price_change_percent = (
            (current_fare - base_fare)
            / base_fare
        ) * 100

        results.append({
            "route": route,
            "period": period,
            "base_period": base_period,
            "base_fare": round(base_fare, 2),
            "average_fare": round(current_fare, 2),
            "index": round(index_value, 2),
            "price_change_percent": round(
                price_change_percent,
                2
            ),
            "observation_count": item[
                "observation_count"
            ],
            "calculation_method":
                "Current route average fare / "
                "Base-period route average fare × 100",
        })

    return results, base_period


# ============================================================
# CALCULATE OVERALL AIRFAREX INDEX
# ============================================================

def calculate_overall_index(route_indices):
    """
    Calculate the overall AirFareX index.

    Current implementation:
        Equal-weight average of comparable route indices.

    Later, this can be upgraded to DGCA passenger-traffic
    weighted indices for a stronger statistical methodology.
    """

    grouped = defaultdict(list)

    for item in route_indices:

        grouped[item["period"]].append(
            item["index"]
        )

    overall_results = []

    for period in sorted(grouped):

        values = grouped[period]

        if not values:
            continue

        overall_index = (
            sum(values) / len(values)
        )

        inflation = overall_index - BASE_INDEX

        overall_results.append({
            "period": period,
            "index": round(
                overall_index,
                2
            ),
            "base_index": BASE_INDEX,
            "airfare_change_percent": round(
                inflation,
                2
            ),
            "routes_included": len(values),
            "weighting_method": "Equal route weighting",
        })

    return overall_results


# ============================================================
# SAVE TO MONGODB
# ============================================================

def save_to_mongodb(
    index_collection,
    route_indices,
    overall_indices
):
    """
    Replace previously calculated index records
    with the latest calculation.
    """

    # Remove previous calculated records
    index_collection.delete_many({})

    documents = []

    # --------------------------------------------------------
    # Route-level documents
    # --------------------------------------------------------

    for item in route_indices:

        document = {
            "record_type": "route",
            **item,
            "updated_at": datetime.now(
                timezone.utc
            ),
        }

        documents.append(document)

    # --------------------------------------------------------
    # Overall index documents
    # --------------------------------------------------------

    for item in overall_indices:

        document = {
            "record_type": "overall",
            **item,
            "updated_at": datetime.now(
                timezone.utc
            ),
        }

        documents.append(document)

    if documents:
        index_collection.insert_many(
            documents
        )

    print()
    print(
        "Price index records saved:",
        len(documents)
    )


# ============================================================
# DISPLAY RESULTS
# ============================================================

def display_results(
    route_indices,
    overall_indices,
    base_period
):
    """Display a readable summary in terminal."""

    print()
    print("=" * 60)
    print("AIRFAREX PRICE INDEX")
    print("=" * 60)

    print()
    print("Base period :", base_period)
    print("Base index  :", BASE_INDEX)

    periods = sorted(
        set(
            item["period"]
            for item in route_indices
        )
    )

    print()
    print("Collection periods:")
    for period in periods:
        print("  -", period)

    # --------------------------------------------------------
    # Overall index
    # --------------------------------------------------------

    print()
    print("-" * 60)
    print("OVERALL AIRFAREX INDEX")
    print("-" * 60)

    if overall_indices:

        for item in overall_indices:

            print(
                f"{item['period']} : "
                f"{item['index']:.2f} "
                f"({item['airfare_change_percent']:+.2f}%)"
            )

    # --------------------------------------------------------
    # Route index
    # --------------------------------------------------------

    print()
    print("-" * 60)
    print("ROUTE-LEVEL INDEX")
    print("-" * 60)

    # Show latest period only
    if route_indices:

        latest_period = max(
            item["period"]
            for item in route_indices
        )

        latest_routes = [
            item
            for item in route_indices
            if item["period"] == latest_period
        ]

        latest_routes.sort(
            key=lambda x: x["index"],
            reverse=True
        )

        for item in latest_routes[:20]:

            print(
                f"{item['route']:10} "
                f"Fare: ₹{item['average_fare']:,.2f} "
                f"Index: {item['index']:.2f} "
                f"Change: {item['price_change_percent']:+.2f}%"
            )

        if len(latest_routes) > 20:
            print(
                f"... and "
                f"{len(latest_routes) - 20} more routes"
            )


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 60)
    print("AirFareX - Airfare Price Index Engine")
    print("=" * 60)

    client = None

    try:

        # ----------------------------------------------------
        # Connect
        # ----------------------------------------------------

        client = connect_mongodb()

        db = client[DATABASE_NAME]

        fare_collection = db[
            FARE_COLLECTION
        ]

        index_collection = db[
            INDEX_COLLECTION
        ]

        # ----------------------------------------------------
        # Load data
        # ----------------------------------------------------

        observations = load_fare_observations(
            fare_collection
        )

        if not observations:
            print()
            print(
                "No valid fare observations found."
            )
            return

        # ----------------------------------------------------
        # Route-period averages
        # ----------------------------------------------------

        route_periods = (
            calculate_route_period_averages(
                observations
            )
        )

        print(
            "Route-period averages:",
            len(route_periods)
        )

        # ----------------------------------------------------
        # Route indices
        # ----------------------------------------------------

        route_indices, base_period = (
            calculate_price_index(
                route_periods
            )
        )

        print(
            "Route index records:",
            len(route_indices)
        )

        # ----------------------------------------------------
        # Overall index
        # ----------------------------------------------------

        overall_indices = (
            calculate_overall_index(
                route_indices
            )
        )

        print(
            "Overall index periods:",
            len(overall_indices)
        )

        # ----------------------------------------------------
        # Save
        # ----------------------------------------------------

        save_to_mongodb(
            index_collection,
            route_indices,
            overall_indices
        )

        # ----------------------------------------------------
        # Display
        # ----------------------------------------------------

        display_results(
            route_indices,
            overall_indices,
            base_period
        )

        print()
        print("=" * 60)
        print("PRICE INDEX CALCULATION COMPLETED")
        print("=" * 60)

    except Exception as error:

        print()
        print("Price index calculation failed:")
        print(error)

        raise

    finally:

        if client is not None:
            client.close()

            print()
            print(
                "MongoDB connection closed."
            )


if __name__ == "__main__":
    main()
