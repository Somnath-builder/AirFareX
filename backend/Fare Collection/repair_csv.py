import csv
import re
from pathlib import Path

INPUT_FILE = Path("airfarex_fare_results.csv")
OUTPUT_FILE = Path("airfarex_fare_results_repaired.csv")

EXPECTED_COLUMNS = 20

HEX64 = re.compile(r"^[0-9a-f]{64}$", re.IGNORECASE)


def repair_csv():
    print("=" * 70)
    print("AirFareX CSV Repair Tool")
    print("=" * 70)

    if not INPUT_FILE.exists():
        print(f"ERROR: {INPUT_FILE} not found.")
        return

    repaired_rows = []
    removed_extra_ids = 0
    normal_rows = 0
    suspicious_rows = 0

    with INPUT_FILE.open("r", newline="", encoding="utf-8") as f:
        reader = csv.reader(f)

        for line_number, row in enumerate(reader, start=1):

            # Header
            if line_number == 1:
                repaired_rows.append(row)
                continue

            # Correct row
            if len(row) == EXPECTED_COLUMNS:
                repaired_rows.append(row)
                normal_rows += 1
                continue

            # Row has an observation_id accidentally inserted
            # at the beginning.
            if (
                len(row) == EXPECTED_COLUMNS + 1
                and HEX64.match(row[0] or "")
            ):
                repaired_rows.append(row[1:])
                removed_extra_ids += 1
                continue

            # Anything else is suspicious.
            print(
                f"WARNING: line {line_number} has "
                f"{len(row)} CSV fields and could not be automatically repaired."
            )
            print("Row:", row)

            suspicious_rows += 1

    if suspicious_rows:
        print()
        print("Repair stopped because suspicious rows were found.")
        print("Your original CSV has NOT been modified.")
        return

    with OUTPUT_FILE.open(
        "w",
        newline="",
        encoding="utf-8"
    ) as f:

        writer = csv.writer(f)
        writer.writerows(repaired_rows)

    print()
    print("Repair completed successfully.")
    print()
    print(f"Normal rows              : {normal_rows}")
    print(f"Observation IDs removed  : {removed_extra_ids}")
    print(f"Suspicious rows          : {suspicious_rows}")
    print()
    print(f"Repaired file:")
    print(f"  {OUTPUT_FILE}")
    print("=" * 70)


if __name__ == "__main__":
    repair_csv()
