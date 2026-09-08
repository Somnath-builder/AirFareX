"""AirFareX airfare price-index engine.

Fixed-base, collection-period index.  The collection date (collected_at)
is the time dimension; travel_date is NOT used as an inflation period.
Historical index records are upserted and preserved.
"""
import os
from collections import defaultdict
from datetime import datetime, timezone
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne
from pymongo.server_api import ServerApi

load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI not found in .env")

DATABASE_NAME = "AirFareX"
FARE_COLLECTION = "fare_observations"
INDEX_COLLECTION = "price_index"
BASE_INDEX = 100.0


def connect_mongodb():
    client = MongoClient(MONGODB_URI, server_api=ServerApi("1"))
    client.admin.command("ping")
    print("=" * 60)
    print("MongoDB connection successful!")
    print("=" * 60)
    print("Database:", DATABASE_NAME)
    return client


def parse_collection_date(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date().isoformat()
        except ValueError:
            return value[:10]
    return None


def load_fare_observations(collection):
    query = {
        "origin": {"$exists": True, "$ne": None},
        "destination": {"$exists": True, "$ne": None},
        "fare_amount": {"$exists": True, "$gt": 0},
        "collected_at": {"$exists": True, "$ne": None},
    }
    projection = {"_id": 0, "origin": 1, "destination": 1,
                  "fare_amount": 1, "collected_at": 1,
                  "airline": 1, "travel_date": 1}
    observations = list(collection.find(query, projection))
    print("\nFare observations loaded:", len(observations))
    return observations


def calculate_route_period_averages(observations):
    grouped = defaultdict(list)
    for obs in observations:
        origin = str(obs.get("origin", "")).strip().upper()
        destination = str(obs.get("destination", "")).strip().upper()
        if not origin or not destination:
            continue
        try:
            fare = float(obs.get("fare_amount"))
        except (TypeError, ValueError):
            continue
        if fare <= 0:
            continue
        period = parse_collection_date(obs.get("collected_at"))
        if not period:
            continue
        grouped[(f"{origin}-{destination}", period)].append(fare)

    result = []
    for (route, period), fares in grouped.items():
        result.append({
            "route": route,
            "period": period,
            "average_fare": round(sum(fares) / len(fares), 2),
            "observation_count": len(fares),
        })
    return sorted(result, key=lambda x: (x["period"], x["route"]))


def calculate_price_index(route_periods):
    if not route_periods:
        return [], None

    periods = sorted({x["period"] for x in route_periods})
    base_period = periods[0]
    base_fares = {
        x["route"]: x["average_fare"]
        for x in route_periods if x["period"] == base_period
    }

    print("\nBase period:", base_period)
    print("Base index:", BASE_INDEX)

    results = []
    for item in route_periods:
        base_fare = base_fares.get(item["route"])
        if not base_fare or base_fare <= 0:
            continue
        current = item["average_fare"]
        index = current / base_fare * BASE_INDEX
        change = (current - base_fare) / base_fare * 100
        results.append({
            "record_type": "route",
            "route": item["route"],
            "period": item["period"],
            "base_period": base_period,
            "base_fare": round(base_fare, 2),
            "average_fare": round(current, 2),
            "index": round(index, 2),
            "price_change_percent": round(change, 2),
            "observation_count": item["observation_count"],
            "calculation_method": "Current route average fare / Base-period route average fare × 100",
        })
    return results, base_period


def calculate_overall_index(route_indices):
    grouped = defaultdict(list)
    for item in route_indices:
        grouped[item["period"]].append(item["index"])

    result = []
    for period in sorted(grouped):
        values = grouped[period]
        if not values:
            continue
        index = sum(values) / len(values)
        result.append({
            "record_type": "overall",
            "period": period,
            "index": round(index, 2),
            "base_index": BASE_INDEX,
            "airfare_change_percent": round(index - BASE_INDEX, 2),
            "routes_included": len(values),
            "weighting_method": "Equal route weighting",
        })
    return result


def save_to_mongodb(index_collection, route_indices, overall_indices):
    operations = []
    now = datetime.now(timezone.utc)

    for item in route_indices:
        doc = {**item, "updated_at": now}
        operations.append(UpdateOne(
            {"record_type": "route", "route": item["route"], "period": item["period"]},
            {"$set": doc}, upsert=True))

    for item in overall_indices:
        doc = {**item, "updated_at": now}
        operations.append(UpdateOne(
            {"record_type": "overall", "period": item["period"]},
            {"$set": doc}, upsert=True))

    if not operations:
        print("\nNo price-index records to save.")
        return
    result = index_collection.bulk_write(operations, ordered=False)
    print("\nPrice index records processed:", len(operations))
    print("Inserted:", result.upserted_count)
    print("Updated :", result.modified_count)


def display_results(route_indices, overall_indices, base_period):
    print("\n" + "=" * 60)
    print("AIRFAREX PRICE INDEX")
    print("=" * 60)
    print("\nBase period :", base_period)
    print("Base index  :", BASE_INDEX)

    periods = sorted({x["period"] for x in route_indices})
    print("\nCollection periods:")
    for p in periods:
        print("  -", p)

    print("\n" + "-" * 60)
    print("OVERALL AIRFAREX INDEX")
    print("-" * 60)
    for item in overall_indices:
        print(f"{item['period']} : {item['index']:.2f} ({item['airfare_change_percent']:+.2f}%)")

    if route_indices:
        latest = max(x["period"] for x in route_indices)
        latest_routes = sorted(
            (x for x in route_indices if x["period"] == latest),
            key=lambda x: x["index"], reverse=True)
        print("\n" + "-" * 60)
        print("LATEST ROUTE-LEVEL INDEX")
        print("-" * 60)
        for item in latest_routes[:20]:
            print(f"{item['route']:10} Fare: ₹{item['average_fare']:,.2f} "
                  f"Index: {item['index']:.2f} Change: {item['price_change_percent']:+.2f}%")


def main():
    print("\n" + "=" * 60)
    print("AirFareX - Airfare Price Index Engine")
    print("=" * 60)
    client = None
    try:
        client = connect_mongodb()
        db = client[DATABASE_NAME]
        fares = db[FARE_COLLECTION]
        indexes = db[INDEX_COLLECTION]

        indexes.create_index(
            [("record_type", 1), ("route", 1), ("period", 1)],
            name="price_index_route_period")
        indexes.create_index(
            [("record_type", 1), ("period", 1)],
            name="price_index_overall_period")

        observations = load_fare_observations(fares)
        if not observations:
            print("No valid fare observations found.")
            return

        route_periods = calculate_route_period_averages(observations)
        print("Route-period averages:", len(route_periods))
        route_indices, base_period = calculate_price_index(route_periods)
        print("Route index records:", len(route_indices))
        overall = calculate_overall_index(route_indices)
        print("Overall index periods:", len(overall))

        save_to_mongodb(indexes, route_indices, overall)
        display_results(route_indices, overall, base_period)

        unique_periods = sorted({x["period"] for x in route_periods})
        print()
        if len(unique_periods) == 1:
            print("NOTE: Only one fare collection period exists.")
            print("The legitimate index for that period is 100.00.")
            print("Run fare collection again on a later date to create another period.")
        else:
            print(f"Index contains {len(unique_periods)} collection periods.")

        print("\n" + "=" * 60)
        print("PRICE INDEX CALCULATION COMPLETED")
        print("=" * 60)
    except Exception as error:
        print("\nPrice index calculation failed:")
        print(error)
        raise
    finally:
        if client is not None:
            client.close()
            print("\nMongoDB connection closed.")


if __name__ == "__main__":
    main()
