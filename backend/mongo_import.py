import os
import hashlib
import pandas as pd
from datetime import datetime, timezone

from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne
from pymongo.server_api import ServerApi


# ============================================================
# AIRFAREX - MONGODB FARE IMPORTER
# ============================================================

print()
print("=" * 70)
print("AIRFAREX - MONGODB FARE IMPORT")
print("=" * 70)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

ENV_FILE = os.path.join(BASE_DIR, ".env")

CSV_FILE = os.path.join(
    BASE_DIR,
    "Fare Collection",
    "airfarex_fare_results.csv"
)


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv(ENV_FILE)

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise ValueError(
        "MONGODB_URI not found in .env file.\n"
        "Make sure your root .env contains MONGODB_URI=..."
    )


# ============================================================
# MONGODB CONFIGURATION
# ============================================================

DATABASE_NAME = "AirFareX"
COLLECTION_NAME = "fare_observations"


# ============================================================
# CHECK INPUT CSV
# ============================================================

if not os.path.exists(CSV_FILE):
    raise FileNotFoundError(
        f"\nFare results CSV not found:\n{CSV_FILE}\n"
    )


print()
print("Input file:")
print(CSV_FILE)


# ============================================================
# CONNECT TO MONGODB ATLAS
# ============================================================

print()
print("Connecting to MongoDB Atlas...")

client = MongoClient(
    MONGODB_URI,
    server_api=ServerApi("1")
)

try:
    client.admin.command("ping")
    print("MongoDB connection successful!")

except Exception as error:
    print()
    print("MongoDB connection failed:")
    print(error)
    raise


db = client[DATABASE_NAME]
collection = db[COLLECTION_NAME]


# ============================================================
# READ CSV
# ============================================================

print()
print("Reading fare data...")

df = pd.read_csv(CSV_FILE)

print(f"Records found in CSV: {len(df)}")


if df.empty:
    print()
    print("No fare records found.")
    client.close()
    raise SystemExit


# ============================================================
# CLEAN COLUMN NAMES
# ============================================================

df.columns = [
    str(column).strip()
    for column in df.columns
]


# ============================================================
# NORMALIZE DATA
# ============================================================

# Convert NaN values to None so MongoDB stores them properly.
df = df.where(pd.notnull(df), None)


# ============================================================
# CREATE UNIQUE OBSERVATION ID
# ============================================================

def create_observation_id(record):
    """
    Creates a deterministic ID for a fare observation.

    The same route/date/airline/flight/fare combination
    will always generate the same ID.

    This prevents duplicate MongoDB records when the
    importer is run multiple times.
    """

    values = [
        str(record.get("origin", "")),
        str(record.get("destination", "")),
        str(record.get("travel_date", "")),
        str(record.get("airline", "")),
        str(record.get("flight_number", "")),
        str(record.get("fare_amount", "")),
        str(record.get("currency", "INR")),
        str(record.get("collected_at", "")),
    ]

    raw_string = "|".join(values)

    return hashlib.sha256(
        raw_string.encode("utf-8")
    ).hexdigest()


# ============================================================
# PREPARE MONGODB DOCUMENTS
# ============================================================

records = df.to_dict("records")

documents = []

for record in records:

    # --------------------------------------------------------
    # Clean values
    # --------------------------------------------------------

    cleaned_record = {}

    for key, value in record.items():

        if pd.isna(value):
            cleaned_record[key] = None

        else:
            cleaned_record[key] = value

    # --------------------------------------------------------
    # Ensure fare amount is numeric
    # --------------------------------------------------------

    if cleaned_record.get("fare_amount") is not None:

        try:
            cleaned_record["fare_amount"] = float(
                cleaned_record["fare_amount"]
            )

        except (ValueError, TypeError):
            cleaned_record["fare_amount"] = None

    # --------------------------------------------------------
    # Create unique observation ID
    # --------------------------------------------------------

    observation_id = create_observation_id(cleaned_record)

    cleaned_record["observation_id"] = observation_id

    # --------------------------------------------------------
    # Add MongoDB import timestamp
    # --------------------------------------------------------

    cleaned_record["imported_at"] = datetime.now(timezone.utc)

    documents.append(cleaned_record)


# ============================================================
# CREATE INDEXES
# ============================================================

print()
print("Creating MongoDB indexes...")

collection.create_index(
    [("observation_id", 1)],
    unique=True,
    name="unique_observation_id"
)

collection.create_index(
    [
        ("origin", 1),
        ("destination", 1),
        ("travel_date", 1)
    ],
    name="route_travel_date"
)

collection.create_index(
    [("fare_amount", 1)],
    name="fare_amount_index"
)

collection.create_index(
    [("collected_at", -1)],
    name="collected_at_index"
)

collection.create_index(
    [("airline", 1)],
    name="airline_index"
)

print("Indexes ready.")


# ============================================================
# UPSERT FARE OBSERVATIONS
# ============================================================

print()
print("Importing fare observations...")

operations = []

for document in documents:

    observation_id = document["observation_id"]

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


# ============================================================
# EXECUTE BULK WRITE
# ============================================================

if operations:

    result = collection.bulk_write(
        operations,
        ordered=False
    )

    print()
    print("-" * 70)
    print("MONGODB IMPORT COMPLETE")
    print("-" * 70)

    print(
        f"New records inserted : {result.upserted_count}"
    )

    print(
        f"Existing records updated : {result.modified_count}"
    )

    print(
        f"Matched existing records : {result.matched_count}"
    )

else:

    print("No records to import.")


# ============================================================
# DATABASE SUMMARY
# ============================================================

total_documents = collection.count_documents({})

fare_documents = collection.count_documents(
    {
        "fare_amount": {
            "$ne": None
        }
    }
)


print()
print("=" * 70)
print("AIRFAREX MONGODB SUMMARY")
print("=" * 70)

print(f"Database               : {DATABASE_NAME}")
print(f"Collection             : {COLLECTION_NAME}")
print(f"Total documents        : {total_documents}")
print(f"Documents with fares   : {fare_documents}")


# ============================================================
# SAMPLE RECORD
# ============================================================

sample = collection.find_one(
    {},
    {
        "_id": 0
    }
)

if sample:

    print()
    print("-" * 70)
    print("SAMPLE STORED RECORD")
    print("-" * 70)

    for key, value in sample.items():
        print(f"{key}: {value}")


# ============================================================
# CLOSE CONNECTION
# ============================================================

client.close()

print()
print("=" * 70)
print("MongoDB connection closed.")
print("AirFareX fare data is now stored in MongoDB Atlas.")
print("=" * 70)
print()