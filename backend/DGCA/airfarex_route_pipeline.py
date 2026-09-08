
"""
AIRFAREX
DGCA Flight Schedule -> Route Extraction -> Fare Search Queue

Input:
    flight schedule.zip

Output:
    dgca_routes.csv
    airfarex_fare_search_queue.csv

The program:
1. Reads domestic DGCA schedule PDFs from the ZIP.
2. Extracts airline, flight number, origin, destination,
   aircraft, frequency and effective dates.
3. Removes duplicate schedule records.
4. Creates fare-search jobs for:
       T+1, T+7, T+15, T+30, T+45
5. Provides a safe adapter where permitted airline/API
   fare-search code can be connected.
"""

from __future__ import annotations

import io
import re
import zipfile
from dataclasses import dataclass, asdict
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

import pandas as pd
import pdfplumber


# ============================================================
# 1. DGCA CITY/AIRPORT -> IATA CODE
# ============================================================

AIRPORT_OVERRIDES = {

    "Agartala": "IXA",
    "Ahmedabad": "AMD",
    "Aizawl": "AJL",
    "Allahabad": "IXD",
    "Prayagraj": "IXD",
    "Amritsar": "ATQ",
    "Aurangabad": "IXU",
    "Ayodhya": "AYJ",

    "Bangalore": "BLR",
    "Bengaluru": "BLR",

    "Bhopal": "BHO",
    "Bhubaneswar": "BBI",
    "Bhuj": "BHJ",
    "Chandigarh": "IXC",

    "Chennai": "MAA",
    "Coimbatore": "CJB",

    "Cochin": "COK",
    "Kochi": "COK",

    "Calicut": "CCJ",

    "Dehradun": "DED",
    "Delhi": "DEL",
    "New Delhi": "DEL",

    "Dibrugarh": "DIB",
    "Dimapur": "DMU",

    "Goa": "GOI",
    "Goa Mopa": "GOX",
    "GOA MOPA": "GOX",
    "Goa MOPA": "GOX",

    "Guwahati": "GAU",

    "Hubali": "HBX",
    "Hubballi": "HBX",

    "Hyderabad": "HYD",
    "Imphal": "IMF",
    "Indore": "IDR",

    "Jaipur": "JAI",
    "Jammu": "IXJ",
    "Jodhpur": "JDH",

    "Kolkata": "CCU",
    "Calcutta": "CCU",

    "Leh": "IXL",
    "Lucknow": "LKO",

    "Madurai": "IXM",
    "Mangalore": "IXE",
    "Mumbai": "BOM",
    "Nagpur": "NAG",

    "Patna": "PAT",
    "Port Blair": "IXZ",
    "Pune": "PNQ",

    "Raipur": "RPR",
    "Rajkot": "RAJ",
    "Ranchi": "IXR",

    "Srinagar": "SXR",
    "Surat": "STV",

    "Thiruvananthapuram": "TRV",
    "Trivandrum": "TRV",

    "Udaipur": "UDR",
    "Vadodara": "BDQ",
    "Varanasi": "VNS",
    "Vijayawada": "VGA",
    "Visakhapatnam": "VTZ",
}


# ============================================================
# 2. DATA STRUCTURE
# ============================================================

@dataclass(frozen=True)
class RouteRecord:

    airline: str
    flight_number: str
    operator_code: str
    aircraft_type: str
    frequency: str

    origin: str
    destination: str

    effective_from: str
    effective_to: str

    direction: str

    source_file: str


# ============================================================
# 3. HELPER FUNCTIONS
# ============================================================

def clean_text(value) -> str:

    if value is None:
        return ""

    return re.sub(
        r"\s+",
        " ",
        str(value)
    ).strip()


def heading_to_iata(heading: str) -> Optional[str]:

    heading = clean_text(heading)

    # Known DGCA airport names
    if heading in AIRPORT_OVERRIDES:
        return AIRPORT_OVERRIDES[heading]

    # If DGCA itself gives an IATA code
    if re.fullmatch(
        r"[A-Z]{3}",
        heading
    ):
        return heading

    return None


def airline_from_filename(path: str) -> str:

    name = Path(path).stem

    name = re.sub(
        r"_SS_2026$",
        "",
        name,
        flags=re.IGNORECASE
    )

    airline_names = {

        "INTERGLOBE AVIATION LTD":
            "IndiGo",

        "AirIndiaLtd":
            "Air India",

        "AirIndiaExpressLimited":
            "Air India Express",

        "AllianceAir":
            "Alliance Air",

        "SpiceJet":
            "SpiceJet",

        "SNVAviation Private Limited":
            "Akasa Air",

        "Ghodawat EnterprisesPvtLtd":
            "Ghodawat Enterprises",

        "JUSTUDOAVIATIONPVTLTD":
            "Just Udo Aviation",
    }

    return airline_names.get(
        name,
        name.replace("_", " ").strip()
    )


# ============================================================
# 4. EXTRACT ROUTES FROM DGCA PDFS
# ============================================================

def extract_domestic_routes(
    zip_path: str
) -> list[RouteRecord]:

    records = []

    with zipfile.ZipFile(zip_path) as archive:

        # Find only domestic PDFs
        pdf_names = [
            name
            for name in archive.namelist()
            if (
                name.lower().endswith(".pdf")
                and "/domestic/" in name.lower()
            )
        ]

        if not pdf_names:

            raise RuntimeError(
                "No domestic DGCA PDFs found."
            )

        print(
            f"Found {len(pdf_names)} domestic PDFs."
        )

        # ----------------------------------------------------
        # Process each airline PDF
        # ----------------------------------------------------

        for pdf_name in pdf_names:

            airline = airline_from_filename(
                pdf_name
            )

            print(
                f"\nProcessing: {airline}"
            )

            pdf_bytes = archive.read(
                pdf_name
            )

            with pdfplumber.open(
                io.BytesIO(pdf_bytes)
            ) as pdf:

                # Each PDF can contain many airport sections
                current_airport = None

                for page_number, page in enumerate(
                    pdf.pages,
                    start=1
                ):

                    tables = page.extract_tables()

                    for table in tables:

                        if not table:
                            continue

                        # ------------------------------------
                        # Identify table columns
                        # ------------------------------------

                        header = [
                            clean_text(x).lower()
                            for x in table[0]
                        ]

                        if (
                            "flight no." not in header
                            and "flight no" not in header
                        ):
                            continue

                        def column(name):

                            name = name.lower()

                            for i, h in enumerate(header):

                                if (
                                    h == name
                                    or name in h
                                ):
                                    return i

                            return None

                        flight_col = (
                            column("flight no.")
                            or column("flight no")
                        )

                        operator_col = column(
                            "operator code"
                        )

                        aircraft_col = column(
                            "aircraft type"
                        )

                        frequency_col = column(
                            "frequency"
                        )

                        arrival_from_col = column(
                            "arrival from"
                        )

                        departure_to_col = column(
                            "departure to"
                        )

                        effective_from_col = column(
                            "effective from"
                        )

                        effective_to_col = column(
                            "effective to"
                        )

                        # ------------------------------------
                        # Process table rows
                        # ------------------------------------

                        for row in table[1:]:

                            row = list(row)

                            # Make sure row is long enough
                            while len(row) < len(header):

                                row.append(None)

                            flight = clean_text(
                                row[flight_col]
                            ) if flight_col is not None else ""

                            # --------------------------------
                            # Airport heading
                            # --------------------------------

                            if not flight:

                                nonempty = [
                                    clean_text(x)
                                    for x in row
                                    if clean_text(x)
                                ]

                                if nonempty:

                                    possible_airport = (
                                        nonempty[0]
                                    )

                                    # Avoid treating column headers
                                    # as airport names
                                    if (
                                        possible_airport.lower()
                                        not in {
                                            "sl. no",
                                            "flight no.",
                                            "operator code",
                                        }
                                    ):

                                        current_airport = (
                                            possible_airport
                                        )

                                continue

                            if not current_airport:
                                continue

                            local_iata = (
                                heading_to_iata(
                                    current_airport
                                )
                            )

                            # Don't guess unknown airport codes
                            if not local_iata:

                                print(
                                    "WARNING: Unknown airport:",
                                    current_airport
                                )

                                continue

                            operator = (
                                clean_text(
                                    row[operator_col]
                                )
                                if operator_col is not None
                                else ""
                            )

                            aircraft = (
                                clean_text(
                                    row[aircraft_col]
                                )
                                if aircraft_col is not None
                                else ""
                            )

                            frequency = (
                                clean_text(
                                    row[frequency_col]
                                )
                                if frequency_col is not None
                                else ""
                            )

                            arrival_from = (
                                clean_text(
                                    row[arrival_from_col]
                                )
                                if arrival_from_col is not None
                                else ""
                            )

                            departure_to = (
                                clean_text(
                                    row[departure_to_col]
                                )
                                if departure_to_col is not None
                                else ""
                            )

                            effective_from = (
                                clean_text(
                                    row[effective_from_col]
                                )
                                if effective_from_col is not None
                                else ""
                            )

                            effective_to = (
                                clean_text(
                                    row[effective_to_col]
                                )
                                if effective_to_col is not None
                                else ""
                            )

                            # --------------------------------
                            # ARRIVAL
                            #
                            # Example:
                            # CCU -> DEL
                            # --------------------------------

                            if re.fullmatch(
                                r"[A-Z]{3}",
                                arrival_from
                            ):

                                records.append(
                                    RouteRecord(

                                        airline=airline,

                                        flight_number=flight,

                                        operator_code=operator,

                                        aircraft_type=aircraft,

                                        frequency=frequency,

                                        origin=arrival_from,

                                        destination=local_iata,

                                        effective_from=(
                                            effective_from
                                        ),

                                        effective_to=(
                                            effective_to
                                        ),

                                        direction="arrival",

                                        source_file=(
                                            Path(
                                                pdf_name
                                            ).name
                                        ),
                                    )
                                )

                            # --------------------------------
                            # DEPARTURE
                            #
                            # Example:
                            # DEL -> CCU
                            # --------------------------------

                            if re.fullmatch(
                                r"[A-Z]{3}",
                                departure_to
                            ):

                                records.append(
                                    RouteRecord(

                                        airline=airline,

                                        flight_number=flight,

                                        operator_code=operator,

                                        aircraft_type=aircraft,

                                        frequency=frequency,

                                        origin=local_iata,

                                        destination=departure_to,

                                        effective_from=(
                                            effective_from
                                        ),

                                        effective_to=(
                                            effective_to
                                        ),

                                        direction="departure",

                                        source_file=(
                                            Path(
                                                pdf_name
                                            ).name
                                        ),
                                    )
                                )

    # Remove exact duplicates
    records = list(
        dict.fromkeys(records)
    )

    return records


# ============================================================
# 5. CREATE AIRFAREX SEARCH QUEUE
# ============================================================

def create_fare_search_queue(
    records,
    windows=(1, 7, 15, 30, 45)
):

    today = date.today()

    jobs = []

    for route in records:

        for days in windows:

            travel_date = (
                today
                + timedelta(days=days)
            )

            jobs.append({

                "airline":
                    route.airline,

                "flight_number":
                    route.flight_number,

                "origin":
                    route.origin,

                "destination":
                    route.destination,

                "travel_date":
                    travel_date.isoformat(),

                "advance_window":
                    f"T+{days}",

                "aircraft_type":
                    route.aircraft_type,

                "frequency":
                    route.frequency,

                "effective_from":
                    route.effective_from,

                "effective_to":
                    route.effective_to,

                "source_file":
                    route.source_file,

                "search_status":
                    "queued"
            })

    df = pd.DataFrame(jobs)

    if not df.empty:

        df = df.drop_duplicates(

            subset=[
                "airline",
                "flight_number",
                "origin",
                "destination",
                "travel_date"
            ]

        ).reset_index(drop=True)

    return df


# ============================================================
# 6. FARE SEARCH ENGINE
# ============================================================

class FareSearchEngine:

    """
    AirFareX fare-search interface.

    IMPORTANT:
    Connect this to an official/authorized API or another
    source where automated access is permitted.

    This class intentionally does NOT contain CAPTCHA
    bypassing or anti-bot evasion.
    """

    def search(
        self,
        origin,
        destination,
        travel_date
    ):

        print(
            f"Searching: "
            f"{origin} -> {destination} "
            f"on {travel_date}"
        )

        # ------------------------------------------------
        # This is where the actual permitted fare source
        # adapter will be connected.
        # ------------------------------------------------

        return {

            "origin": origin,

            "destination": destination,

            "travel_date": travel_date,

            "status": "NOT_CONNECTED",

            "message":
                "Connect an authorized fare API/source."
        }


# ============================================================
# 7. MAIN PROGRAM
# ============================================================

def main():

    ZIP_FILE = "flight schedule.zip"

    print("\n")
    print("=" * 60)
    print("              AIRFAREX")
    print(" DGCA ROUTE EXTRACTION SYSTEM")
    print("=" * 60)

    # --------------------------------------------------------
    # STEP 1
    # Extract DGCA routes
    # --------------------------------------------------------

    records = extract_domestic_routes(
        ZIP_FILE
    )

    route_df = pd.DataFrame(
        [
            asdict(record)
            for record in records
        ]
    )

    print("\n")
    print(
        "Total schedule records:",
        len(route_df)
    )

    # --------------------------------------------------------
    # STEP 2
    # Save DGCA route database
    # --------------------------------------------------------

    route_df.to_csv(
        "dgca_routes.csv",
        index=False
    )

    print(
        "Saved: dgca_routes.csv"
    )

    # --------------------------------------------------------
    # STEP 3
    # Count unique routes
    # --------------------------------------------------------

    unique_routes = (
        route_df[
            [
                "origin",
                "destination"
            ]
        ]
        .drop_duplicates()
    )

    print(
        "Unique routes:",
        len(unique_routes)
    )

    # --------------------------------------------------------
    # STEP 4
    # Create fare-search queue
    # --------------------------------------------------------

    fare_queue = (
        create_fare_search_queue(
            records
        )
    )

    fare_queue.to_csv(
        "airfarex_fare_search_queue.csv",
        index=False
    )

    print(
        "Saved:",
        "airfarex_fare_search_queue.csv"
    )

    # --------------------------------------------------------
    # STEP 5
    # Show sample routes
    # --------------------------------------------------------

    print("\n")
    print("=" * 60)
    print("SAMPLE ROUTES")
    print("=" * 60)

    print(
        route_df[
            [
                "airline",
                "flight_number",
                "origin",
                "destination"
            ]
        ]
        .drop_duplicates()
        .head(20)
        .to_string(index=False)
    )

    # --------------------------------------------------------
    # STEP 6
    # Test fare-search engine
    # --------------------------------------------------------

    print("\n")
    print("=" * 60)
    print("FARE SEARCH TEST")
    print("=" * 60)

    engine = FareSearchEngine()

    for job in fare_queue.head(5).to_dict(
        "records"
    ):

        result = engine.search(

            job["origin"],

            job["destination"],

            job["travel_date"]
        )

        print(result)


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    main()

