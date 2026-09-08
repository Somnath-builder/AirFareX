import os

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.server_api import ServerApi


# Load .env
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise ValueError(
        "MONGODB_URI not found in .env"
    )


# Create MongoDB client
client = MongoClient(
    MONGODB_URI,
    server_api=ServerApi("1")
)


try:
    # Test connection
    client.admin.command("ping")

    print("======================================")
    print("MongoDB connection successful!")
    print("======================================")

    # AirFareX database
    db = client["AirFareX"]

    print("Database:", db.name)

except Exception as error:
    print("MongoDB connection failed:")
    print(error)