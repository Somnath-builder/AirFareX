"""
AirFareX - Final Fare Collection Engine

Purpose
-------
Collect near-real-time airfare observations from Google Flights
through SerpApi, store them safely in MongoDB Atlas, maintain CSV
backups, support checkpoint/resume, and generate a current
cheapest-fare dataset.

Architecture
------------
DGCA validated fare-search queue
        ↓
SerpApi / Google Flights
        ↓
MongoDB Atlas
        ↓
CSV backup
        ↓
Cheapest fare dataset

Important
---------
- Does NOT bypass CAPTCHA, anti-bot systems, login requirements,
  IP restrictions, or other access controls.
- Does NOT print the SerpApi API key.
- Stops safely on HTTP 429.
- MongoDB is the primary storage.
- CSV is a backup/export.
- Checkpoint allows safe resume.
"""

import os
import sys
import time
import hashlib
import shutil
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne
from pymongo.server_api import ServerApi


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent

ENV_FILE = PROJECT_DIR / ".env"

INPUT_FILE = BASE_DIR / "airfarex_valid_fare_search_queue.csv"

RESULTS_FILE = BASE_DIR / "airfarex_fare_results.csv"
CHEAPEST_FILE = BASE_DIR / "airfarex_cheapest_fares.csv"
NO_FARES_FILE = BASE_DIR / "airfarex_no_fares.csv"

CHECKPOINT_FILE = BASE_DIR / "airfarex_collection_checkpoint.csv"


# ============================================================
# CONFIGURATION
# ============================================================

SERPAPI_URL = "https://serpapi.com/search.json"

# IMPORTANT:
# Keep this at 10 while testing.
# Once everything is confirmed, increase gradually.
MAX_SEARCHES = 10

# Resume previously completed searches.
RESUME_MODE = True

# Wait between SerpApi requests.
REQUEST_DELAY_SECONDS = 3

# Timeout for one HTTP request.
REQUEST_TIMEOUT_SECONDS = 60

# Synchronize CSV from MongoDB every N successful searches.
CSV_SYNC_INTERVAL = 10

# Google Flights search settings.
CURRENCY = "INR"
LANGUAGE = "en"
ADULTS = 1
TRAVEL_CLASS = 1

# MongoDB.
MONGODB_DATABASE = "AirFareX"
MONGODB_COLLECTION = "fare_observations"


# ============================================================
# CSV SCHEMAS
# ============================================================

RESULT_COLUMNS = [
    "source",
    "origin",
    "destination",
    "requested_origin",
    "requested_destination",
    "travel_date",
    "airline",
    "flight_numbers",
    "departure_time",
    "arrival_time",
    "stops",
    "total_duration_minutes",
    "fare_amount",
    "base_fare",
    "tax_amount",
    "currency",
    "offer_id",
    "booking_url",
    "booking_method",
    "collected_at",
]


NO_FARE_COLUMNS = [
    "source",
    "origin",
    "destination",
    "travel_date",
    "status",
    "reason",
    "collected_at",
]


CHECKPOINT_COLUMNS = [
    "origin",
    "destination",
    "travel_date",
    "status",
    "collected_at",
    "reason",
]


# ============================================================
# CUSTOM EXCEPTIONS
# ============================================================

class SerpApiRateLimitError(Exception):
    """Raised when SerpApi returns HTTP 429."""
    pass


class SerpApiQueryError(Exception):
    """Raised for a SerpApi query/API error."""
    pass


# ============================================================
# GENERAL HELPERS
# ============================================================

def clean_text(value):
    """Convert a value into a clean string."""
    if value is None:
        return ""

    try:
        if pd.isna(value):
            return ""
    except Exception:
        pass

    return str(value).strip()


def safe_int(value):
    """Safely convert a value to integer."""
    try:
        if value is None or value == "":
            return None

        return int(float(str(value).replace(",", "").strip()))

    except Exception:
        return None


def safe_float(value):
    """Safely convert a value to float."""
    try:
        if value is None or value == "":
            return None

        text = str(value).replace(",", "").strip()

        return float(text)

    except Exception:
        return None


def get_collected_at():
    """Return current UTC timestamp in ISO format."""
    return datetime.now(timezone.utc).isoformat()


def normalize_date(value):
    """
    Convert dates to YYYY-MM-DD.

    The queue already contains ISO dates, so dayfirst=False
    avoids unnecessary pandas warnings.
    """
    if value is None or clean_text(value) == "":
        return None

    try:
        dt = pd.to_datetime(
            value,
            dayfirst=False,
            errors="coerce"
        )

        if pd.isna(dt):
            return None

        return dt.strftime("%Y-%m-%d")

    except Exception:
        return None


def extract_price(value):
    """Extract a numeric fare from different SerpApi price formats."""
    if value is None:
        return None

    if isinstance(value, (int, float)):
        return float(value)

    text = clean_text(value)

    if not text:
        return None

    # Remove currency symbols and commas.
    cleaned = (
        text.replace("₹", "")
        .replace("INR", "")
        .replace(",", "")
        .strip()
    )

    # Keep digits and decimal point.
    allowed = "0123456789."

    numeric = "".join(
        character for character in cleaned
        if character in allowed
    )

    if not numeric:
        return None

    try:
        return float(numeric)
    except Exception:
        return None


# ============================================================
# OBSERVATION ID
# ============================================================

def create_observation_id(record):
    """
    Create a deterministic ID for one fare observation.

    collected_at is intentionally included.

    This means:
        same fare collected again later
        =
        new historical observation

    while accidental duplicate processing of the same API
    response remains deduplicated.
    """

    fields = [
        clean_text(record.get("origin")),
        clean_text(record.get("destination")),
        clean_text(record.get("travel_date")),
        clean_text(record.get("airline")),
        clean_text(record.get("flight_numbers")),
        clean_text(record.get("fare_amount")),
        clean_text(record.get("currency")),
        clean_text(record.get("collected_at")),
    ]

    raw = "|".join(fields)

    return hashlib.sha256(
        raw.encode("utf-8")
    ).hexdigest()


# ============================================================
# MONGODB
# ============================================================

def connect_mongodb():
    """Connect to MongoDB Atlas."""

    load_dotenv(ENV_FILE)

    mongodb_uri = os.getenv("MONGODB_URI")

    if not mongodb_uri:
        raise ValueError(
            f"MONGODB_URI not found in {ENV_FILE}"
        )

    client = MongoClient(
        mongodb_uri,
        server_api=ServerApi("1")
    )

    client.admin.command("ping")

    print()
    print("======================================")
    print("MongoDB connection successful!")
    print("Database:", MONGODB_DATABASE)
    print("======================================")
    print()

    return client


def get_index_key(index_information):
    """Return normalized index key tuple."""

    return tuple(
        index_information.get("key", [])
    )


def ensure_index(collection, desired_key, unique=False):
    """
    Create an index only if an equivalent key-pattern index
    does not already exist.

    This prevents IndexOptionsConflict problems caused by
    previous index names.
    """

    desired_key = tuple(desired_key)

    for index in collection.list_indexes():

        existing_key = get_index_key(index)

        if existing_key == desired_key:

            # An equivalent index already exists.
            return index["name"]

    try:

        return collection.create_index(
            list(desired_key),
            unique=unique
        )

    except Exception as error:

        print(
            "Warning: could not create index",
            desired_key,
            "->",
            error
        )

        return None


def prepare_mongodb_collection(client):
    """Prepare MongoDB collection and indexes."""

    db = client[MONGODB_DATABASE]

    collection = db[MONGODB_COLLECTION]

    ensure_index(
        collection,
        [("observation_id", 1)],
        unique=True
    )

    ensure_index(
        collection,
        [
            ("origin", 1),
            ("destination", 1),
            ("travel_date", 1)
        ]
    )

    ensure_index(
        collection,
        [("collected_at", 1)]
    )

    ensure_index(
        collection,
        [("fare_amount", 1)]
    )

    ensure_index(
        collection,
        [("airline", 1)]
    )

    print("MongoDB indexes are ready.")

    return collection


def save_results_to_mongodb(collection, results):
    """
    Store fare observations in MongoDB.

    Uses upsert by observation_id.
    """

    if not results:
        return {
            "processed": 0,
            "new": 0,
            "matched": 0,
            "modified": 0
        }

    operations = []

    # Deduplicate within this batch.
    unique_records = {}

    for record in results:

        document = dict(record)

        observation_id = create_observation_id(document)

        document["observation_id"] = observation_id

        # MongoDB should not receive NaN.
        for key, value in list(document.items()):

            if isinstance(value, float) and pd.isna(value):
                document[key] = None

        unique_records[observation_id] = document

    for observation_id, document in unique_records.items():

        operations.append(
            UpdateOne(
                {
                    "observation_id": observation_id
                },
                {
                    "$set": document
                },
                upsert=True
            )
        )

    if not operations:
        return {
            "processed": 0,
            "new": 0,
            "matched": 0,
            "modified": 0
        }

    result = collection.bulk_write(
        operations,
        ordered=False
    )

    return {
        "processed": len(operations),
        "new": len(result.upserted_ids),
        "matched": result.matched_count,
        "modified": result.modified_count
    }


# ============================================================
# SERPAPI
# ============================================================

class SerpApiFareSource:

    def __init__(self, api_key):

        self.api_key = api_key

        self.session = requests.Session()

        self.session.headers.update(
            {
                "User-Agent": (
                    "AirFareX/1.0 "
                    "(airfare research project)"
                )
            }
        )

    def search(
        self,
        origin,
        destination,
        travel_date
    ):
        """
        Search Google Flights through SerpApi.

        The API key is sent as a parameter but is NEVER
        printed to the terminal.
        """

        params = {
            "engine": "google_flights",
            "departure_id": origin,
            "arrival_id": destination,
            "outbound_date": travel_date,
            "type": 2,
            "adults": ADULTS,
            "travel_class": TRAVEL_CLASS,
            "currency": CURRENCY,
            "hl": LANGUAGE,
            "api_key": self.api_key,
        }

        try:

            response = self.session.get(
                SERPAPI_URL,
                params=params,
                timeout=REQUEST_TIMEOUT_SECONDS
            )

        except requests.Timeout as error:

            raise requests.Timeout(
                "SerpApi request timed out."
            ) from error

        except requests.RequestException as error:

            raise requests.RequestException(
                f"SerpApi network error: {error}"
            ) from error

        # ----------------------------------------------------
        # HTTP 429
        # ----------------------------------------------------

        if response.status_code == 429:

            raise SerpApiRateLimitError(
                "SerpApi returned HTTP 429 "
                "(rate limit reached)."
            )

        # ----------------------------------------------------
        # Other HTTP errors
        # ----------------------------------------------------

        if response.status_code != 200:

            raise SerpApiQueryError(
                f"SerpApi returned HTTP "
                f"{response.status_code}."
            )

        # ----------------------------------------------------
        # JSON
        # ----------------------------------------------------

        try:

            data = response.json()

        except ValueError as error:

            raise SerpApiQueryError(
                "SerpApi returned invalid JSON."
            ) from error

        # ----------------------------------------------------
        # API-level errors
        # ----------------------------------------------------

        if data.get("error"):

            error_message = clean_text(
                data.get("error")
            )

            raise SerpApiQueryError(
                f"SerpApi error: {error_message}"
            )

        return data


# ============================================================
# PARSING GOOGLE FLIGHTS RESULTS
# ============================================================

def parse_flight_result(
    flight,
    origin,
    destination,
    travel_date,
    collected_at
):
    """
    Convert one Google Flights result into an AirFareX
    observation.
    """

    if not isinstance(flight, dict):
        return None

    # --------------------------------------------------------
    # Price
    # --------------------------------------------------------

    price = extract_price(
        flight.get("price")
    )

    if price is None:
        return None

    # --------------------------------------------------------
    # Flight legs
    # --------------------------------------------------------

    legs = flight.get("flights", [])

    if not isinstance(legs, list):
        legs = []

    airlines = []
    flight_numbers = []

    departure_times = []
    arrival_times = []

    for leg in legs:

        if not isinstance(leg, dict):
            continue

        airline = clean_text(
            leg.get("airline")
        )

        flight_number = clean_text(
            leg.get("flight_number")
        )

        departure_time = clean_text(
            leg.get("departure_airport", {})
            .get("time")
            if isinstance(
                leg.get("departure_airport"),
                dict
            )
            else ""
        )

        arrival_time = clean_text(
            leg.get("arrival_airport", {})
            .get("time")
            if isinstance(
                leg.get("arrival_airport"),
                dict
            )
            else ""
        )

        if airline and airline not in airlines:
            airlines.append(airline)

        if flight_number:
            flight_numbers.append(
                flight_number
            )

        if departure_time:
            departure_times.append(
                departure_time
            )

        if arrival_time:
            arrival_times.append(
                arrival_time
            )

    # --------------------------------------------------------
    # Airline
    # --------------------------------------------------------

    airline_text = ", ".join(airlines)

    if not airline_text:

        airline_text = clean_text(
            flight.get("airline")
        )

    # --------------------------------------------------------
    # Flight numbers
    # --------------------------------------------------------

    flight_numbers_text = ", ".join(
        flight_numbers
    )

    if not flight_numbers_text:

        flight_numbers_text = clean_text(
            flight.get("flight_number")
        )

    # --------------------------------------------------------
    # Departure / arrival
    # --------------------------------------------------------

    departure_time_text = ""

    if departure_times:
        departure_time_text = departure_times[0]

    arrival_time_text = ""

    if arrival_times:
        arrival_time_text = arrival_times[-1]

    # --------------------------------------------------------
    # Stops
    # --------------------------------------------------------

    stops = flight.get("stops")

    if stops is None:

        if len(legs) <= 1:
            stops = 0
        else:
            stops = len(legs) - 1

    stops = safe_int(stops)

    # --------------------------------------------------------
    # Duration
    # --------------------------------------------------------

    duration = flight.get("total_duration")

    if duration is None:
        duration = flight.get("duration")

    duration_minutes = safe_int(duration)

    # --------------------------------------------------------
    # Booking URL
    # --------------------------------------------------------

    booking_url = clean_text(
        flight.get("booking_url")
    )

    booking_method = ""

    if booking_url:
        booking_method = "provider_supplied_url"

    # --------------------------------------------------------
    # Offer ID
    # --------------------------------------------------------

    offer_id = clean_text(
        flight.get("offer_id")
    )

    # --------------------------------------------------------
    # Base fare / tax
    # --------------------------------------------------------

    base_fare = extract_price(
        flight.get("base_fare")
    )

    tax_amount = extract_price(
        flight.get("tax")
    )

    # --------------------------------------------------------
    # Return record
    # --------------------------------------------------------

    return {
        "source": "Google Flights via SerpApi",

        "origin": origin,
        "destination": destination,

        "requested_origin": origin,
        "requested_destination": destination,

        "travel_date": travel_date,

        "airline": airline_text,

        "flight_numbers": flight_numbers_text,

        "departure_time": departure_time_text,

        "arrival_time": arrival_time_text,

        "stops": stops,

        "total_duration_minutes": duration_minutes,

        "fare_amount": price,

        "base_fare": base_fare,

        "tax_amount": tax_amount,

        "currency": CURRENCY,

        "offer_id": offer_id,

        "booking_url": booking_url,

        "booking_method": booking_method,

        "collected_at": collected_at,
    }


def parse_search_results(
    data,
    origin,
    destination,
    travel_date,
    collected_at
):
    """
    Parse both best_flights and other_flights.
    """

    all_flights = []

    best_flights = data.get(
        "best_flights",
        []
    )

    other_flights = data.get(
        "other_flights",
        []
    )

    if isinstance(best_flights, list):
        all_flights.extend(best_flights)

    if isinstance(other_flights, list):
        all_flights.extend(other_flights)

    results = []

    seen_ids = set()

    for flight in all_flights:

        record = parse_flight_result(
            flight,
            origin,
            destination,
            travel_date,
            collected_at
        )

        if record is None:
            continue

        observation_id = create_observation_id(
            record
        )

        if observation_id in seen_ids:
            continue

        seen_ids.add(
            observation_id
        )

        results.append(record)

    return results


# ============================================================
# QUEUE
# ============================================================

def load_queue():
    """Load and validate the DGCA-derived fare queue."""

    if not INPUT_FILE.exists():

        raise FileNotFoundError(
            f"Input queue not found:\n{INPUT_FILE}"
        )

    df = pd.read_csv(
        INPUT_FILE
    )

    required_columns = [
        "origin",
        "destination",
        "travel_date",
    ]

    missing = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing:

        raise ValueError(
            "Queue is missing columns: "
            + ", ".join(missing)
        )

    # --------------------------------------------------------
    # Normalize
    # --------------------------------------------------------

    df["origin"] = (
        df["origin"]
        .astype(str)
        .str.strip()
        .str.upper()
    )

    df["destination"] = (
        df["destination"]
        .astype(str)
        .str.strip()
        .str.upper()
    )

    df["travel_date"] = (
        df["travel_date"]
        .apply(normalize_date)
    )

    # --------------------------------------------------------
    # Remove invalid rows
    # --------------------------------------------------------

    before = len(df)

    df = df[
        df["origin"].str.len() > 0
    ]

    df = df[
        df["destination"].str.len() > 0
    ]

    df = df[
        df["travel_date"].notna()
    ]

    after = len(df)

    if before != after:

        print(
            f"Removed {before - after} "
            "invalid queue rows."
        )

    # --------------------------------------------------------
    # Remove exact duplicates
    # --------------------------------------------------------

    df = df.drop_duplicates(
        subset=[
            "origin",
            "destination",
            "travel_date"
        ]
    )

    df = df.sort_values(
        [
            "travel_date",
            "origin",
            "destination"
        ]
    ).reset_index(drop=True)

    print(
        f"Loaded {len(df)} queue rows."
    )

    print(
        "Unique route/date searches:",
        df[
            [
                "origin",
                "destination",
                "travel_date"
            ]
        ]
        .drop_duplicates()
        .shape[0]
    )

    return df


# ============================================================
# CHECKPOINT
# ============================================================

def load_checkpoint():
    """
    Load completed searches from checkpoint.

    Only searches marked as FARES_FOUND or NO_FARE_FOUND
    are considered completed.
    """

    if not CHECKPOINT_FILE.exists():

        return set()

    try:

        df = pd.read_csv(
            CHECKPOINT_FILE
        )

    except Exception as error:

        print(
            "Warning: could not read checkpoint:",
            error
        )

        return set()

    required = [
        "origin",
        "destination",
        "travel_date",
        "status"
    ]

    if not all(
        column in df.columns
        for column in required
    ):

        print(
            "Warning: checkpoint schema invalid."
        )

        return set()

    completed = set()

    for _, row in df.iterrows():

        status = clean_text(
            row["status"]
        )

        if status not in {
            "FARES_FOUND",
            "NO_FARE_FOUND"
        }:
            continue

        key = (
            clean_text(row["origin"]).upper(),
            clean_text(row["destination"]).upper(),
            normalize_date(row["travel_date"])
        )

        completed.add(key)

    return completed


def append_checkpoint(
    origin,
    destination,
    travel_date,
    status,
    reason
):
    """Append one completed search to checkpoint."""

    collected_at = get_collected_at()

    row = pd.DataFrame(
        [
            {
                "origin": origin,
                "destination": destination,
                "travel_date": travel_date,
                "status": status,
                "collected_at": collected_at,
                "reason": reason,
            }
        ],
        columns=CHECKPOINT_COLUMNS
    )

    file_exists = CHECKPOINT_FILE.exists()

    row.to_csv(
        CHECKPOINT_FILE,
        mode="a",
        header=not file_exists,
        index=False
    )


# ============================================================
# NO FARES
# ============================================================

def append_no_fare(
    origin,
    destination,
    travel_date,
    reason,
    collected_at
):
    """Save a legitimate no-fare result."""

    row = pd.DataFrame(
        [
            {
                "source": "Google Flights via SerpApi",
                "origin": origin,
                "destination": destination,
                "travel_date": travel_date,
                "status": "NO_FARE_FOUND",
                "reason": reason,
                "collected_at": collected_at,
            }
        ],
        columns=NO_FARE_COLUMNS
    )

    file_exists = NO_FARES_FILE.exists()

    row.to_csv(
        NO_FARES_FILE,
        mode="a",
        header=not file_exists,
        index=False
    )


# ============================================================
# CSV SAFETY
# ============================================================

def clean_nan_values(df):
    """Replace NaN with None/blank-safe values."""

    return df.where(
        pd.notna(df),
        None
    )


def synchronize_results_csv_from_mongodb(
    collection
):
    """
    Rebuild the fare results CSV entirely from MongoDB.

    This is the main protection against CSV corruption.
    MongoDB remains the source of truth.
    """

    try:

        documents = list(
            collection.find(
                {},
                {
                    "_id": 0
                }
            )
        )

        if not documents:

            print(
                "MongoDB contains no fare observations; "
                "CSV sync skipped."
            )

            return 0

        df = pd.DataFrame(
            documents
        )

        # observation_id is Mongo-only.
        if "observation_id" in df.columns:

            df = df.drop(
                columns=["observation_id"]
            )

        # Guarantee exactly the expected CSV columns.
        for column in RESULT_COLUMNS:

            if column not in df.columns:

                df[column] = None

        df = df[
            RESULT_COLUMNS
        ]

        df = clean_nan_values(df)

        # Temporary file.
        temp_file = RESULTS_FILE.with_suffix(
            ".tmp.csv"
        )

        df.to_csv(
            temp_file,
            index=False
        )

        # Atomic replacement.
        temp_file.replace(
            RESULTS_FILE
        )

        print(
            f"CSV synchronized from MongoDB: "
            f"{len(df)} rows."
        )

        return len(df)

    except Exception as error:

        print(
            "Warning: CSV synchronization failed:",
            error
        )

        return 0


# ============================================================
# CHEAPEST FARES
# ============================================================

def save_cheapest_from_mongodb(
    collection
):
    """
    Build cheapest fare dataset using the LATEST collection
    cycle for each route/date.

    This avoids accidentally reporting an old fare as the
    current cheapest fare.
    """

    try:

        documents = list(
            collection.find(
                {},
                {
                    "_id": 0
                }
            )
        )

        if not documents:

            print(
                "No MongoDB fare observations "
                "available for cheapest-fare calculation."
            )

            return 0

        df = pd.DataFrame(
            documents
        )

        if "observation_id" in df.columns:

            df = df.drop(
                columns=["observation_id"]
            )

        required = [
            "origin",
            "destination",
            "travel_date",
            "fare_amount",
            "collected_at"
        ]

        missing = [
            column
            for column in required
            if column not in df.columns
        ]

        if missing:

            print(
                "Cannot calculate cheapest fares. "
                "Missing:",
                missing
            )

            return 0

        df["fare_amount"] = pd.to_numeric(
            df["fare_amount"],
            errors="coerce"
        )

        df = df[
            df["fare_amount"].notna()
        ]

        if df.empty:

            return 0

        # ----------------------------------------------------
        # Parse collection timestamps.
        # ----------------------------------------------------

        df["_collected_dt"] = pd.to_datetime(
            df["collected_at"],
            errors="coerce",
            utc=True
        )

        # ----------------------------------------------------
        # Find latest collection timestamp for each
        # route/date combination.
        # ----------------------------------------------------

        latest = (
            df.groupby(
                [
                    "origin",
                    "destination",
                    "travel_date"
                ],
                dropna=False
            )["_collected_dt"]
            .transform("max")
        )

        latest_df = df[
            df["_collected_dt"] == latest
        ].copy()

        # ----------------------------------------------------
        # Cheapest within latest collection.
        # ----------------------------------------------------

        idx = (
            latest_df.groupby(
                [
                    "origin",
                    "destination",
                    "travel_date"
                ]
            )["fare_amount"]
            .idxmin()
        )

        cheapest = latest_df.loc[
            idx
        ].copy()

        cheapest = cheapest.drop(
            columns=["_collected_dt"],
            errors="ignore"
        )

        cheapest = cheapest.sort_values(
            [
                "travel_date",
                "origin",
                "destination"
            ]
        )

        cheapest.to_csv(
            CHEAPEST_FILE,
            index=False
        )

        print(
            f"Cheapest fares saved: "
            f"{len(cheapest)} route/date records."
        )

        return len(cheapest)

    except Exception as error:

        print(
            "Warning: cheapest fare generation failed:",
            error
        )

        return 0


# ============================================================
# BACKUP / RECOVERY
# ============================================================

def backup_malformed_csv():
    """
    If an existing CSV cannot be read, rename it instead of
    deleting it.
    """

    if not RESULTS_FILE.exists():

        return

    timestamp = datetime.now(
        timezone.utc
    ).strftime(
        "%Y%m%d_%H%M%S"
    )

    backup_file = (
        BASE_DIR
        / f"airfarex_fare_results_corrupt_{timestamp}.csv"
    )

    try:

        shutil.copy2(
            RESULTS_FILE,
            backup_file
        )

        print(
            "Malformed CSV backed up to:",
            backup_file.name
        )

    except Exception as error:

        print(
            "Warning: could not back up malformed CSV:",
            error
        )


def validate_existing_csv():
    """
    Check whether the existing results CSV has the correct
    schema. If malformed, back it up.

    MongoDB remains unaffected.
    """

    if not RESULTS_FILE.exists():

        return True

    try:

        df = pd.read_csv(
            RESULTS_FILE
        )

        if list(df.columns) != RESULT_COLUMNS:

            print(
                "Warning: fare results CSV schema "
                "is incorrect."
            )

            backup_malformed_csv()

            return False

        return True

    except Exception as error:

        print(
            "Warning: fare results CSV is malformed:",
            error
        )

        backup_malformed_csv()

        return False


# ============================================================
# SEARCH ONE ROUTE
# ============================================================

def process_one_search(
    source,
    mongo_collection,
    origin,
    destination,
    travel_date
):
    """
    Execute one fare search.

    Returns:
        status
        records
        reason
    """

    print(
        f"{origin} -> {destination} "
        f"on {travel_date}"
    )

    collected_at = get_collected_at()

    # --------------------------------------------------------
    # API request
    # --------------------------------------------------------

    data = source.search(
        origin,
        destination,
        travel_date
    )

    # --------------------------------------------------------
    # Parse
    # --------------------------------------------------------

    records = parse_search_results(
        data,
        origin,
        destination,
        travel_date,
        collected_at
    )

    # --------------------------------------------------------
    # No fares
    # --------------------------------------------------------

    if not records:

        reason = (
            "Google Flights returned no "
            "fare observations."
        )

        append_no_fare(
            origin,
            destination,
            travel_date,
            reason,
            collected_at
        )

        return (
            "NO_FARE_FOUND",
            [],
            reason
        )

    # --------------------------------------------------------
    # MongoDB
    # --------------------------------------------------------

    mongo_stats = save_results_to_mongodb(
        mongo_collection,
        records
    )

    # --------------------------------------------------------
    # Cheapest
    # --------------------------------------------------------

    cheapest_record = min(
        records,
        key=lambda x: x["fare_amount"]
    )

    print(
        f"Offers received: {len(records)}"
    )

    print(
        "Cheapest: "
        f"INR {cheapest_record['fare_amount']:.2f}"
        f" | {cheapest_record['airline'] or 'Unknown'}"
        f" | "
        f"{cheapest_record['flight_numbers'] or 'N/A'}"
    )

    print(
        "MongoDB:"
        f" {mongo_stats['new']} new,"
        f" {mongo_stats['matched']} matched"
    )

    reason = (
        f"{len(records)} fare observations"
    )

    return (
        "FARES_FOUND",
        records,
        reason
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("===================================================")
    print("AirFareX - Real-Time Fare Collection Engine")
    print("===================================================")
    print()

    print("Project directory:")
    print(PROJECT_DIR)

    print()
    print("Queue:")
    print(INPUT_FILE)

    print()
    print("MongoDB database:")
    print(MONGODB_DATABASE)

    print()
    print("MongoDB collection:")
    print(MONGODB_COLLECTION)

    print()
    print("Maximum searches this run:")
    print(MAX_SEARCHES)

    print()
    print("Resume mode:")
    print(RESUME_MODE)

    print()

    # --------------------------------------------------------
    # Environment
    # --------------------------------------------------------

    load_dotenv(
        ENV_FILE
    )

    serpapi_key = os.getenv(
        "SERPAPI_API_KEY"
    )

    if not serpapi_key:

        print(
            "ERROR: SERPAPI_API_KEY not found in:"
        )

        print(
            ENV_FILE
        )

        sys.exit(1)

    # --------------------------------------------------------
    # Existing CSV validation
    # --------------------------------------------------------

    validate_existing_csv()

    # --------------------------------------------------------
    # MongoDB
    # --------------------------------------------------------

    mongo_client = None

    try:

        mongo_client = connect_mongodb()

        mongo_collection = (
            prepare_mongodb_collection(
                mongo_client
            )
        )

        # ----------------------------------------------------
        # Queue
        # ----------------------------------------------------

        queue = load_queue()

        # ----------------------------------------------------
        # Checkpoint
        # ----------------------------------------------------

        completed = set()

        if RESUME_MODE:

            completed = load_checkpoint()

            print(
                f"Checkpoint contains "
                f"{len(completed)} completed "
                f"route/date searches."
            )

        # ----------------------------------------------------
        # Filter completed searches
        # ----------------------------------------------------

        remaining_rows = []

        for _, row in queue.iterrows():

            key = (
                clean_text(row["origin"]).upper(),
                clean_text(row["destination"]).upper(),
                normalize_date(row["travel_date"])
            )

            if RESUME_MODE and key in completed:

                continue

            remaining_rows.append(
                row
            )

        remaining_count = len(
            remaining_rows
        )

        print(
            f"Remaining searches: "
            f"{remaining_count}"
        )

        # ----------------------------------------------------
        # Development limit
        # ----------------------------------------------------

        rows_to_process = remaining_rows[
            :MAX_SEARCHES
        ]

        print(
            f"Running {len(rows_to_process)} "
            "searches this run."
        )

        if not rows_to_process:

            print()
            print(
                "No new searches to process."
            )

            synchronize_results_csv_from_mongodb(
                mongo_collection
            )

            save_cheapest_from_mongodb(
                mongo_collection
            )

            return

        # ----------------------------------------------------
        # SerpApi
        # ----------------------------------------------------

        source = SerpApiFareSource(
            serpapi_key
        )

        # ----------------------------------------------------
        # Counters
        # ----------------------------------------------------

        searches_attempted = 0
        successful_searches = 0
        no_fare_searches = 0
        failed_searches = 0

        total_observations = 0

        rate_limited = False

        interrupted = False

        # ----------------------------------------------------
        # Search loop
        # ----------------------------------------------------

        for index, row in enumerate(
            rows_to_process,
            start=1
        ):

            origin = clean_text(
                row["origin"]
            ).upper()

            destination = clean_text(
                row["destination"]
            ).upper()

            travel_date = normalize_date(
                row["travel_date"]
            )

            print()
            print(
                "---------------------------------------------------"
            )

            print(
                f"[{index}/{len(rows_to_process)}] ",
                end=""
            )

            print(
                f"{origin} -> {destination} "
                f"on {travel_date}"
            )

            searches_attempted += 1

            # ------------------------------------------------
            # Process
            # ------------------------------------------------

            try:

                status, records, reason = (
                    process_one_search(
                        source,
                        mongo_collection,
                        origin,
                        destination,
                        travel_date
                    )
                )

                # --------------------------------------------
                # Fares found
                # --------------------------------------------

                if status == "FARES_FOUND":

                    successful_searches += 1

                    total_observations += len(
                        records
                    )

                    append_checkpoint(
                        origin,
                        destination,
                        travel_date,
                        "FARES_FOUND",
                        reason
                    )

                # --------------------------------------------
                # Legitimate no-fare result
                # --------------------------------------------

                elif status == "NO_FARE_FOUND":

                    no_fare_searches += 1

                    append_checkpoint(
                        origin,
                        destination,
                        travel_date,
                        "NO_FARE_FOUND",
                        reason
                    )

                    print(
                        "No fares found."
                    )

            except SerpApiRateLimitError as error:

                # --------------------------------------------
                # STOP IMMEDIATELY
                # --------------------------------------------

                rate_limited = True

                print()
                print(
                    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
                )

                print(
                    "SERPAPI RATE LIMIT REACHED"
                )

                print(
                    str(error)
                )

                print(
                    "Stopping immediately."
                )

                print(
                    "All completed searches are preserved."
                )

                print(
                    "The current search was NOT marked "
                    "as completed."
                )

                print(
                    "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
                )

                break

            except SerpApiQueryError as error:

                failed_searches += 1

                print(
                    "SerpApi query error:",
                    str(error)
                )

                print(
                    "This search remains retryable."
                )

            except requests.Timeout:

                failed_searches += 1

                print(
                    "Request timed out."
                )

                print(
                    "This search remains retryable."
                )

            except requests.RequestException as error:

                failed_searches += 1

                print(
                    "Network error:",
                    str(error)
                )

                print(
                    "This search remains retryable."
                )

            except Exception as error:

                failed_searches += 1

                print(
                    "Unexpected error:",
                    type(error).__name__,
                    str(error)
                )

                print(
                    "This search remains retryable."
                )

            # ------------------------------------------------
            # Periodic CSV sync
            # ------------------------------------------------

            completed_this_run = (
                successful_searches
                + no_fare_searches
            )

            if (
                completed_this_run > 0
                and completed_this_run
                % CSV_SYNC_INTERVAL == 0
            ):

                print()
                print(
                    "Periodic MongoDB -> CSV sync..."
                )

                synchronize_results_csv_from_mongodb(
                    mongo_collection
                )

                save_cheapest_from_mongodb(
                    mongo_collection
                )

            # ------------------------------------------------
            # Rate delay
            # ------------------------------------------------

            if (
                not rate_limited
                and index < len(rows_to_process)
            ):

                time.sleep(
                    REQUEST_DELAY_SECONDS
                )

        # ----------------------------------------------------
        # Keyboard interrupt
        # ----------------------------------------------------

        # Note:
        # Ctrl+C is caught outside the loop below.

        # ----------------------------------------------------
        # Final synchronization
        # ----------------------------------------------------

        print()
        print(
            "==================================================="
        )

        print(
            "FINAL DATA SYNCHRONIZATION"
        )

        print(
            "==================================================="
        )

        csv_count = (
            synchronize_results_csv_from_mongodb(
                mongo_collection
            )
        )

        cheapest_count = (
            save_cheapest_from_mongodb(
                mongo_collection
            )
        )

        # ----------------------------------------------------
        # Summary
        # ----------------------------------------------------

        print()
        print(
            "==================================================="
        )

        print(
            "AIRFAREX COLLECTION SUMMARY"
        )

        print(
            "==================================================="
        )

        print(
            f"Searches attempted : "
            f"{searches_attempted}"
        )

        print(
            f"Successful searches : "
            f"{successful_searches}"
        )

        print(
            f"No-fare searches : "
            f"{no_fare_searches}"
        )

        print(
            f"Failed/retryable searches : "
            f"{failed_searches}"
        )

        print(
            f"Fare observations this run : "
            f"{total_observations}"
        )

        print(
            f"CSV rows synchronized : "
            f"{csv_count}"
        )

        print(
            f"Cheapest fare records : "
            f"{cheapest_count}"
        )

        if rate_limited:

            print()
            print(
                "STATUS: STOPPED BECAUSE OF SERPAPI "
                "RATE LIMIT."
            )

            print(
                "Run the script again later with "
                "RESUME_MODE = True."
            )

        else:

            print()
            print(
                "STATUS: COLLECTION RUN COMPLETED."
            )

        print()
        print(
            "MongoDB is the primary source of truth."
        )

        print(
            "CSV files are synchronized exports/backups."
        )

        print()
        print(
            "==================================================="
        )

    except KeyboardInterrupt:

        interrupted = True

        print()
        print()
        print(
            "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
        )

        print(
            "Collection interrupted by user."
        )

        print(
            "Completed searches remain in checkpoint."
        )

        print(
            "MongoDB data already saved remains safe."
        )

        print(
            "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
        )

        # Attempt emergency synchronization.
        if mongo_client is not None:

            try:

                collection = (
                    mongo_client[
                        MONGODB_DATABASE
                    ][
                        MONGODB_COLLECTION
                    ]
                )

                synchronize_results_csv_from_mongodb(
                    collection
                )

                save_cheapest_from_mongodb(
                    collection
                )

            except Exception as error:

                print(
                    "Emergency synchronization failed:",
                    error
                )

    except Exception as error:

        print()
        print(
            "FATAL ERROR:"
        )

        print(
            type(error).__name__,
            str(error)
        )

        sys.exit(1)

    finally:

        if mongo_client is not None:

            try:

                mongo_client.close()

                print(
                    "MongoDB connection closed."
                )

            except Exception:
                pass


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()
