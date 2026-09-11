#!/usr/bin/env python3
"""
AirFareX - Automated Daily Data Feeding & Price Index Pipeline
==============================================================

Automates the complete daily workflow:
  1. airfarex_fare_queue.py : Computes future search dates (T+1, T+7, T+15, T+30, T+45)
                              from DGCA schedules relative to TODAY.
  2. fare_search.py         : Scrapes Google Flights via SerpApi and writes new
                              fare observations directly into MongoDB Atlas.
  3. price_index.py         : Aggregates observations into matched baskets, computes
                              the Laspeyres price index, and writes to MongoDB Atlas.

Once complete, the React frontend and FastAPI backend automatically reflect
the updated price index and lead-time curves.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

# Set paths
BACKEND_DIR = Path(__file__).resolve().parent
FARE_COLLECTION_DIR = BACKEND_DIR / "Fare Collection"

QUEUE_SCRIPT = FARE_COLLECTION_DIR / "airfarex_fare_queue.py"
SCRAPER_SCRIPT = FARE_COLLECTION_DIR / "fare_search.py"
INDEX_SCRIPT = BACKEND_DIR / "price_index.py"

# Timezone
LOCAL_TIMEZONE = ZoneInfo("Asia/Kolkata")


def log_header(title: str):
    print()
    print("=" * 70)
    print(f" {title}")
    print("=" * 70)


def run_step(step_name: str, script_path: Path, env: dict | None = None) -> bool:
    """Executes a Python script as a subprocess and streams output."""
    log_header(f"RUNNING STEP: {step_name}")
    print(f"Script : {script_path.name}")
    print(f"Path   : {script_path}")
    print(f"Time   : {datetime.now(LOCAL_TIMEZONE).strftime('%Y-%m-%d %H:%M:%S %Z')}")
    print("-" * 70)

    if not script_path.exists():
        print(f"❌ Error: Script not found at {script_path}")
        return False

    process_env = os.environ.copy()
    if env:
        process_env.update(env)

    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            cwd=script_path.parent if script_path.parent.exists() else BACKEND_DIR,
            env=process_env,
            check=False,
        )

        if result.returncode == 0:
            print(f"\n✅ SUCCESS: {step_name} completed successfully.")
            return True
        else:
            print(f"\n❌ FAILED: {step_name} exited with error code {result.returncode}")
            return False

    except Exception as err:
        print(f"\n❌ EXCEPTION in {step_name}: {err}")
        return False


def verify_mongodb_state():
    """Queries MongoDB Atlas to print a post-pipeline summary."""
    log_header("POST-PIPELINE DATABASE VERIFICATION")
    load_dotenv(BACKEND_DIR / ".env")
    uri = os.getenv("MONGODB_URI")

    if not uri:
        print("⚠️ MONGODB_URI not found in backend/.env — skipping DB verification.")
        return

    try:
        from pymongo import MongoClient
        from pymongo.server_api import ServerApi

        client = MongoClient(uri, server_api=ServerApi("1"), tls=True, tlsAllowInvalidCertificates=True)
        db = client["AirFareX"]

        fare_count = db["fare_observations"].count_documents({})
        index_count = db["price_index"].count_documents({})

        latest_index = list(
            db["price_index"].find({"route": {"$exists": False}}).sort("period", -1).limit(1)
        )

        print(f"Database Name             : AirFareX")
        print(f"Total Fare Observations   : {fare_count:,}")
        print(f"Total Price Index Records : {index_count:,}")

        if latest_index:
            idx = latest_index[0]
            change = idx.get("period_change_percent", 0.0)
            change_str = f"{change:+.2f}%" if change is not None else "N/A"
            print(f"Latest Overall Index      : {idx.get('index', 0.0):.2f} (Period: {idx.get('period')}, Change: {change_str})")

        print("=" * 70)
        client.close()

    except Exception as err:
        print(f"⚠️ Could not query MongoDB for summary: {err}")


def main():
    parser = argparse.ArgumentParser(
        description="AirFareX - Daily Automated Fare Collection and Price Index Pipeline"
    )
    parser.add_argument(
        "--max-searches",
        type=int,
        default=10,
        help="Maximum SerpApi flight searches to perform in this run (default: 10)",
    )
    parser.add_argument(
        "--skip-queue",
        action="store_true",
        help="Skip regenerating the search queue",
    )
    parser.add_argument(
        "--skip-scrape",
        action="store_true",
        help="Skip the live SerpApi scraping step",
    )
    parser.add_argument(
        "--skip-index",
        action="store_true",
        help="Skip re-calculating the price index",
    )

    args = parser.parse_args()

    start_time = datetime.now(LOCAL_TIMEZONE)
    log_header(f"AIRFAREX DAILY AUTOMATION PIPELINE — START")
    print(f"Execution Time       : {start_time.strftime('%Y-%m-%d %H:%M:%S %Z')}")
    print(f"Max Searches Planned : {args.max_searches}")
    print(f"Python Executable    : {sys.executable}")

    # Step 1: Queue Generation
    if not args.skip_queue:
        success = run_step(
            "Step 1: Refresh Flight Search Queue (DGCA -> Future Dates)",
            QUEUE_SCRIPT,
        )
        if not success:
            print("\n❌ Pipeline aborted at Step 1 (Queue Generation).")
            sys.exit(1)
    else:
        print("\n⏩ Skipped Step 1: Flight Search Queue generation.")

    # Step 2: Fare Scraping
    if not args.skip_scrape:
        scrape_env = {"MAX_SEARCHES": str(args.max_searches)}
        success = run_step(
            "Step 2: Collect Fares & Log to MongoDB (SerpApi)",
            SCRAPER_SCRIPT,
            env=scrape_env,
        )
        if not success:
            print("\n⚠️ Scraping reported an issue, but proceeding to Step 3 to ensure index is calculated.")
    else:
        print("\n⏩ Skipped Step 2: Fare scraping.")

    # Step 3: Price Index Computation
    if not args.skip_index:
        success = run_step(
            "Step 3: Recompute Airfare Price Index & Update MongoDB",
            INDEX_SCRIPT,
        )
        if not success:
            print("\n❌ Pipeline aborted at Step 3 (Price Index Computation).")
            sys.exit(1)
    else:
        print("\n⏩ Skipped Step 3: Price Index Computation.")

    # Post-run verification
    verify_mongodb_state()

    end_time = datetime.now(LOCAL_TIMEZONE)
    duration = end_time - start_time
    log_header("AIRFAREX DAILY AUTOMATION PIPELINE — COMPLETED")
    print(f"Total Execution Time : {duration.total_seconds():.1f} seconds")
    print("Dashboard and backend are synchronized with the latest airfare index data.")
    print("=" * 70)


if __name__ == "__main__":
    main()
