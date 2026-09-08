"""
AirFareX - Robust Airfare Price Index Engine

Methodology:
1. Uses fare collection date as the index time period.
2. Builds a consistent basket at route + travel-date level.
3. Uses the median fare for each basket item within each collection period.
4. Compares only basket items available in BOTH the base and current period.
5. Calculates route-level prices from comparable basket items.
6. Uses a fixed-base index with base period = 100.
7. Uses explicit route weights when backend/Data/route_weights.csv exists.
8. Otherwise derives a transparent DGCA schedule-frequency weighting proxy.
9. Stores route-level and overall index observations in MongoDB.

Important:
This is a prototype airfare index methodology for AirFareX.
It is NOT an official MoSPI CPI calculation.
Schedule frequency is only a proxy for route importance unless official
passenger-volume weights are supplied.
"""

from __future__ import annotations

import os
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import median
from typing import Dict, List, Tuple

import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING
from pymongo.server_api import ServerApi


# ---------------------------------------------------------------------
# PATHS / CONFIGURATION
# ---------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "Data"
DGCA_DIR = BASE_DIR / "DGCA"

FARE_FILE = DATA_DIR / "fare_observations.csv"
ROUTE_WEIGHTS_FILE = DATA_DIR / "route_weights.csv"
DGCA_ROUTES_FILE = DGCA_DIR / "dgca_routes.csv"

DB_NAME = "AirFareX"
FARE_COLLECTION = "fare_observations"
INDEX_COLLECTION = "price_index"

load_dotenv(BASE_DIR / ".env")


# ---------------------------------------------------------------------
# MONGODB
# ---------------------------------------------------------------------

def get_mongo_database():
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise ValueError("MONGODB_URI not found in backend/.env")

    client = MongoClient(uri, server_api=ServerApi("1"))
    client.admin.command("ping")
    return client[DB_NAME]


# ---------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------

def normalize_route(origin: str, destination: str) -> str:
    return f"{str(origin).strip().upper()}-{str(destination).strip().upper()}"


def parse_collection_period(value) -> str | None:
    if pd.isna(value):
        return None

    text = str(value).strip()

    # ISO timestamps and normal datetime strings
    try:
        dt = pd.to_datetime(text, errors="coerce")
        if not pd.isna(dt):
            return dt.strftime("%Y-%m-%d")
    except Exception:
        pass

    match = re.search(r"(\d{4})[-/](\d{1,2})[-/](\d{1,2})", text)
    if match:
        y, m, d = match.groups()
        return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"

    return None


def clean_fare(value) -> float | None:
    if value is None or pd.isna(value):
        return None

    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).replace(",", "").replace("₹", "").strip()

    match = re.search(r"\d+(?:\.\d+)?", text)
    if not match:
        return None

    return float(match.group())


def find_column(df: pd.DataFrame, candidates: List[str]) -> str | None:
    normalized = {str(c).strip().lower(): c for c in df.columns}

    for candidate in candidates:
        if candidate.lower() in normalized:
            return normalized[candidate.lower()]

    for column in df.columns:
        c = str(column).strip().lower()
        for candidate in candidates:
            if candidate.lower() in c:
                return column

    return None


# ---------------------------------------------------------------------
# LOAD FARE OBSERVATIONS
# ---------------------------------------------------------------------

def load_fare_observations(db) -> pd.DataFrame:
    """
    MongoDB is the primary source of truth.

    CSV is used only as a fallback if MongoDB contains no observations.
    """

    collection = db[FARE_COLLECTION]

    documents = list(
        collection.find(
            {},
            {
                "_id": 0,
                "origin": 1,
                "destination": 1,
                "travel_date": 1,
                "fare_amount": 1,
                "collected_at": 1,
                "airline": 1,
            },
        )
    )

    if documents:
        df = pd.DataFrame(documents)
        print(f"Fare observations loaded from MongoDB: {len(df)}")
    elif FARE_FILE.exists():
        df = pd.read_csv(FARE_FILE)
        print(f"Fare observations loaded from CSV fallback: {len(df)}")
    else:
        raise FileNotFoundError(
            "No fare observations found in MongoDB and no CSV fallback exists."
        )

    required = ["origin", "destination", "travel_date", "fare_amount", "collected_at"]

    missing = [column for column in required if column not in df.columns]
    if missing:
        raise ValueError(f"Missing required fare observation columns: {missing}")

    df["origin"] = df["origin"].astype(str).str.strip().str.upper()
    df["destination"] = df["destination"].astype(str).str.strip().str.upper()
    df["route"] = df.apply(
        lambda row: normalize_route(row["origin"], row["destination"]),
        axis=1,
    )

    df["travel_date"] = pd.to_datetime(
        df["travel_date"], errors="coerce"
    ).dt.strftime("%Y-%m-%d")

    df["collection_period"] = df["collected_at"].apply(parse_collection_period)
    df["fare"] = df["fare_amount"].apply(clean_fare)

    df = df.dropna(
        subset=["route", "travel_date", "collection_period", "fare"]
    )

    df = df[df["fare"] > 0].copy()

    return df


# ---------------------------------------------------------------------
# BUILD CONSISTENT BASKET
# ---------------------------------------------------------------------

def build_basket_periods(
    df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Each basket item is:

        route + travel_date

    For every collection period, its representative fare is the
    median of all offers observed for that basket item.

    This prevents one route with many duplicate airline offers from
    dominating the index and makes the comparison between periods
    more stable than averaging every individual fare.
    """

    grouped = (
        df.groupby(
            ["route", "travel_date", "collection_period"],
            as_index=False,
        )["fare"]
        .median()
        .rename(columns={"fare": "basket_median_fare"})
    )

    return grouped


def make_comparable_period(
    basket: pd.DataFrame,
    base_period: str,
    current_period: str,
) -> pd.DataFrame:
    """
    Keep only route/travel-date basket items that exist in both
    base and current collection periods.
    """

    base = basket[
        basket["collection_period"] == base_period
    ][["route", "travel_date", "basket_median_fare"]].rename(
        columns={"basket_median_fare": "base_fare"}
    )

    current = basket[
        basket["collection_period"] == current_period
    ][["route", "travel_date", "basket_median_fare"]].rename(
        columns={"basket_median_fare": "current_fare"}
    )

    comparable = base.merge(
        current,
        on=["route", "travel_date"],
        how="inner",
    )

    comparable = comparable[
        (comparable["base_fare"] > 0)
        & (comparable["current_fare"] > 0)
    ].copy()

    return comparable


# ---------------------------------------------------------------------
# ROUTE WEIGHTS
# ---------------------------------------------------------------------

def load_explicit_route_weights() -> Dict[str, float]:
    """
    Preferred weighting source.

    Expected file:
        backend/Data/route_weights.csv

    Columns:
        route,weight
    """

    if not ROUTE_WEIGHTS_FILE.exists():
        return {}

    weights_df = pd.read_csv(ROUTE_WEIGHTS_FILE)

    if "route" not in weights_df.columns or "weight" not in weights_df.columns:
        raise ValueError(
            "route_weights.csv must contain columns: route, weight"
        )

    weights: Dict[str, float] = {}

    for _, row in weights_df.iterrows():
        route = normalize_route(
            str(row["route"]).split("-")[0],
            str(row["route"]).split("-")[-1],
        )

        try:
            weight = float(row["weight"])
        except (TypeError, ValueError):
            continue

        if weight > 0:
            weights[route] = weight

    return weights


def load_dgca_frequency_weights() -> Dict[str, float]:
    """
    Transparent proxy weighting based on DGCA schedule frequency.

    This is NOT passenger-volume weighting.

    Expected DGCA file:
        backend/DGCA/dgca_routes.csv

    The route frequency is summed across schedule records.
    """

    if not DGCA_ROUTES_FILE.exists():
        return {}

    df = pd.read_csv(DGCA_ROUTES_FILE)

    origin_col = find_column(df, ["origin"])
    destination_col = find_column(df, ["destination"])
    frequency_col = find_column(df, ["frequency"])

    if not origin_col or not destination_col or not frequency_col:
        print(
            "DGCA route file does not contain the expected "
            "origin/destination/frequency columns."
        )
        return {}

    weights: Dict[str, float] = defaultdict(float)

    for _, row in df.iterrows():
        origin = str(row[origin_col]).strip().upper()
        destination = str(row[destination_col]).strip().upper()

        if not origin or not destination:
            continue

        frequency_text = str(row[frequency_col]).strip()

        # Frequency may contain values such as 1234567.
        digits = [int(x) for x in frequency_text if x.isdigit() and x != "0"]

        if not digits:
            continue

        # Count operating weekdays rather than interpreting 1234567 as
        # the number 1,234,567.
        operating_days = len(set(digits))

        route = normalize_route(origin, destination)
        weights[route] += operating_days

    return dict(weights)


def get_route_weights(routes: List[str]) -> Tuple[Dict[str, float], str]:
    explicit = load_explicit_route_weights()

    if explicit:
        usable = {
            route: explicit[route]
            for route in routes
            if route in explicit and explicit[route] > 0
        }

        if usable:
            return usable, "explicit route weights from route_weights.csv"

    dgca = load_dgca_frequency_weights()

    if dgca:
        usable = {
            route: dgca[route]
            for route in routes
            if route in dgca and dgca[route] > 0
        }

        if usable:
            return usable, "DGCA schedule-frequency proxy"

    return (
        {route: 1.0 for route in routes},
        "equal route weighting fallback",
    )


# ---------------------------------------------------------------------
# INDEX CALCULATION
# ---------------------------------------------------------------------

def calculate_index(
    basket: pd.DataFrame,
) -> Tuple[pd.DataFrame, pd.DataFrame, str]:
    periods = sorted(
        basket["collection_period"].dropna().unique().tolist()
    )

    if not periods:
        raise ValueError("No collection periods found.")

    base_period = periods[0]

    route_records = []

    for period in periods:
        comparable = make_comparable_period(
            basket,
            base_period,
            period,
        )

        if comparable.empty:
            continue

        for route, group in comparable.groupby("route"):
            # Average of normalized basket-item fares.
            # Every route/travel-date basket item has equal importance
            # within its route.
            base_average = group["base_fare"].mean()
            current_average = group["current_fare"].mean()

            if base_average <= 0:
                continue

            route_index = (
                current_average / base_average
            ) * 100.0

            route_records.append(
                {
                    "period": period,
                    "route": route,
                    "base_period": base_period,
                    "base_fare": round(base_average, 2),
                    "current_fare": round(current_average, 2),
                    "index": round(route_index, 4),
                    "basket_items": int(len(group)),
                }
            )

    route_index_df = pd.DataFrame(route_records)

    if route_index_df.empty:
        raise ValueError(
            "No comparable route basket items were found."
        )

    overall_records = []

    for period, group in route_index_df.groupby("period"):
        routes = group["route"].tolist()

        weights, weighting_method = get_route_weights(routes)

        weighted_values = []
        total_weight = 0.0

        for _, row in group.iterrows():
            route = row["route"]

            if route not in weights:
                continue

            weight = float(weights[route])

            if weight <= 0:
                continue

            weighted_values.append(
                float(row["index"]) * weight
            )
            total_weight += weight

        if total_weight <= 0:
            continue

        overall_index = sum(weighted_values) / total_weight

        previous_period = None
        previous_index = None

        earlier = [
            p for p in periods
            if p < period
        ]

        if earlier:
            previous_period = earlier[-1]

            previous_row = next(
                (
                    record
                    for record in overall_records
                    if record["period"] == previous_period
                ),
                None,
            )

            if previous_row:
                previous_index = previous_row["index"]

        if previous_index is not None and previous_index != 0:
            change = (
                (overall_index - previous_index)
                / previous_index
            ) * 100.0
        else:
            change = 0.0

        overall_records.append(
            {
                "period": period,
                "base_period": base_period,
                "index": round(overall_index, 4),
                "period_change_percent": round(change, 4),
                "routes_used": len(
                    [
                        route
                        for route in routes
                        if route in weights
                    ]
                ),
                "weighting_method": weighting_method,
            }
        )

    overall_index_df = pd.DataFrame(overall_records)

    return (
        route_index_df,
        overall_index_df,
        base_period,
    )


# ---------------------------------------------------------------------
# SAVE TO MONGODB
# ---------------------------------------------------------------------

def save_price_index(
    db,
    route_index_df: pd.DataFrame,
    overall_index_df: pd.DataFrame,
) -> Tuple[int, int]:
    collection = db[INDEX_COLLECTION]

    collection.create_index(
        [
            ("type", ASCENDING),
            ("period", ASCENDING),
            ("route", ASCENDING),
        ],
        name="price_index_lookup",
    )

    inserted = 0
    updated = 0

    for _, row in route_index_df.iterrows():
        document = {
            "type": "route",
            "period": row["period"],
            "route": row["route"],
            "base_period": row["base_period"],
            "base_fare": float(row["base_fare"]),
            "current_fare": float(row["current_fare"]),
            "index": float(row["index"]),
            "basket_items": int(row["basket_items"]),
            "updated_at": datetime.now(timezone.utc),
        }

        result = collection.update_one(
            {
                "type": "route",
                "period": row["period"],
                "route": row["route"],
            },
            {"$set": document},
            upsert=True,
        )

        if result.upserted_id is not None:
            inserted += 1
        else:
            updated += 1

    for _, row in overall_index_df.iterrows():
        document = {
            "type": "overall",
            "period": row["period"],
            "base_period": row["base_period"],
            "index": float(row["index"]),
            "period_change_percent": float(
                row["period_change_percent"]
            ),
            "routes_used": int(row["routes_used"]),
            "weighting_method": row["weighting_method"],
            "updated_at": datetime.now(timezone.utc),
        }

        result = collection.update_one(
            {
                "type": "overall",
                "period": row["period"],
            },
            {"$set": document},
            upsert=True,
        )

        if result.upserted_id is not None:
            inserted += 1
        else:
            updated += 1

    return inserted, updated


# ---------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------

def main():
    print("=" * 70)
    print("AirFareX - Robust Airfare Price Index Engine")
    print("=" * 70)
    print()

    print("Methodology:")
    print("  - Consistent route + travel-date basket")
    print("  - Median fare normalization")
    print("  - Only comparable basket items are included")
    print("  - Fixed-base index (base = 100)")
    print("  - Route weighting: explicit weights or DGCA schedule-frequency proxy")
    print("  - No fabricated historical collection dates")
    print()

    db = get_mongo_database()

    print("MongoDB connection successful!")
    print(f"Database: {DB_NAME}")
    print()

    df = load_fare_observations(db)

    if df.empty:
        print("No valid fare observations available.")
        return

    print(f"Valid fare observations: {len(df)}")
    print(
        f"Collection periods: "
        f"{df['collection_period'].nunique()}"
    )

    basket = build_basket_periods(df)

    print(
        f"Basket items: "
        f"{basket[['route', 'travel_date']].drop_duplicates().shape[0]}"
    )

    print(
        f"Route/travel-date/period basket records: {len(basket)}"
    )

    route_index_df, overall_index_df, base_period = calculate_index(
        basket
    )

    print()
    print(f"Base period: {base_period}")
    print("Base index: 100.00")
    print()

    print(
        f"Route index records: {len(route_index_df)}"
    )
    print(
        f"Overall index periods: {len(overall_index_df)}"
    )

    if not overall_index_df.empty:
        print()
        print("Overall Airfare Price Index:")

        for _, row in overall_index_df.iterrows():
            print(
                f"  {row['period']} : "
                f"{row['index']:.2f} "
                f"({row['period_change_percent']:+.2f}%)"
            )

    latest_period = route_index_df["period"].max()

    latest_routes = route_index_df[
        route_index_df["period"] == latest_period
    ].sort_values(
        "index",
        ascending=False,
    )

    print()
    print(f"Latest route-level index ({latest_period}):")

    for _, row in latest_routes.head(10).iterrows():
        print(
            f"  {row['route']} | "
            f"Fare ₹{row['current_fare']:,.2f} | "
            f"Index {row['index']:.2f} | "
            f"Basket items {row['basket_items']}"
        )

    inserted, updated = save_price_index(
        db,
        route_index_df,
        overall_index_df,
    )

    print()
    print("=" * 70)
    print("MongoDB price_index collection updated")
    print(f"Inserted: {inserted}")
    print(f"Updated: {updated}")
    print("=" * 70)


if __name__ == "__main__":
    main()
