"""
AirFareX Intelligence Copilot - Entity Extractor & Intent Classifier
====================================================================

Extracts aviation entities (cities, IATA codes, dates, budgets) and
classifies user intents according to AirFareX intelligence taxonomy.
"""

from __future__ import annotations

import re
from datetime import datetime, date, timedelta
from typing import Any, Dict, List, Optional, Tuple

from Backend.tools.airport_resolver import resolve_airport, AIRPORT_MAP


# Supported AirFareX Copilot Intents
INTENTS = [
    "SEARCH_FLIGHTS",
    "CHEAPEST_FLIGHT",
    "CHEAPEST_DATE",
    "ROUTE_PRICE",
    "PRICE_HISTORY",
    "PRICE_INDEX",
    "FARE_COMPARISON",
    "BOOKING_RECOMMENDATION",
    "FARE_EXPLANATION",
    "BUDGET_SEARCH",
    "GENERAL_AIRFAREX_QUERY",
    "UNKNOWN",
]


def extract_budget(text: str) -> Optional[float]:
    """Extract budget or price limit from text (e.g., 'under ₹5,000', 'budget 6000')."""
    # Pattern: under/below/budget of ₹?X,XXX
    match = re.search(r'(?:under|below|budget(?:\s+of)?|max(?:\s+of)?|less\s+than)\s*(?:₹|inr|rs\.?)?\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)', text, re.IGNORECASE)
    if match:
        raw = match.group(1).replace(",", "")
        try:
            return float(raw)
        except ValueError:
            pass
    return None


def extract_fare_amount(text: str) -> Optional[float]:
    """Extract specific fare amount mentioned (e.g., 'Is ₹8,000 expensive?')."""
    match = re.search(r'(?:₹|inr|rs\.?)\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)', text, re.IGNORECASE)
    if match:
        raw = match.group(1).replace(",", "")
        try:
            return float(raw)
        except ValueError:
            pass
    return None


def extract_airports(text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract origin and destination airport codes from text.
    Handles 'from X to Y', 'X to Y', and standalone city mentions.
    """
    # Pattern 1: 'from <city/code> to <city/code>'
    from_to_match = re.search(r'\bfrom\s+([a-zA-Z\s\(\)]+?)\s+to\s+([a-zA-Z\s\(\)]+?)(?:\s+(?:on|in|between|under|tomorrow|this|next|\d)|$|\?|\.|\,)', text, re.IGNORECASE)
    if from_to_match:
        orig = resolve_airport(from_to_match.group(1))
        dest = resolve_airport(from_to_match.group(2))
        if orig and dest:
            return orig, dest

    # Pattern 2: '<city/code> to <city/code>'
    to_match = re.search(r'\b([a-zA-Z]{3,15})\s+(?:to|->|-)\s+([a-zA-Z]{3,15})\b', text, re.IGNORECASE)
    if to_match:
        orig = resolve_airport(to_match.group(1))
        dest = resolve_airport(to_match.group(2))
        if orig and dest:
            return orig, dest

    # Pattern 3: Scan all words for known airport codes/cities
    words = re.findall(r'[a-zA-Z]{3,15}', text)
    matched_codes = []
    for w in words:
        resolved = resolve_airport(w)
        if resolved and resolved not in matched_codes:
            matched_codes.append(resolved)

    if len(matched_codes) >= 2:
        return matched_codes[0], matched_codes[1]
    elif len(matched_codes) == 1:
        return matched_codes[0], None

    return None, None


def extract_dates(text: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract single travel date or date window (start_date, end_date).
    Supports ISO (2026-09-25) and natural terms (September 25, tomorrow, etc.).
    """
    # Check for ISO dates: YYYY-MM-DD
    iso_dates = re.findall(r'\b(20\d\d[-/]\d{1,2}[-/]\d{1,2})\b', text)
    if len(iso_dates) >= 2:
        try:
            d1 = datetime.strptime(iso_dates[0].replace("/", "-"), "%Y-%m-%d").strftime("%Y-%m-%d")
            d2 = datetime.strptime(iso_dates[1].replace("/", "-"), "%Y-%m-%d").strftime("%Y-%m-%d")
            return d1, d2
        except Exception:
            pass
    elif len(iso_dates) == 1:
        try:
            d1 = datetime.strptime(iso_dates[0].replace("/", "-"), "%Y-%m-%d").strftime("%Y-%m-%d")
            return d1, None
        except Exception:
            pass

    today = date.today()

    # Relative words
    lower = text.lower()
    if "tomorrow" in lower:
        return (today + timedelta(days=1)).isoformat(), None
    if "day after tomorrow" in lower:
        return (today + timedelta(days=2)).isoformat(), None

    # Month name + day: e.g. "September 25", "Sept 25", "25th September"
    months = {
        "january": 1, "jan": 1, "february": 2, "feb": 2, "march": 3, "mar": 3,
        "april": 4, "apr": 4, "may": 5, "june": 6, "jun": 6, "july": 7, "jul": 7,
        "august": 8, "aug": 8, "september": 9, "sept": 9, "sep": 9, "october": 10,
        "oct": 10, "november": 11, "nov": 11, "december": 12, "dec": 12,
    }

    month_pattern = "|".join(months.keys())
    
    # "between September 20 and September 27" or "between Sept 20 and 27"
    range_match = re.search(
        rf'between\s+({month_pattern})\s+(\d{{1,2}})(?:st|nd|rd|th)?\s+and\s+(?:({month_pattern})\s+)?(\d{{1,2}})(?:st|nd|rd|th)?',
        lower
    )
    if range_match:
        m1_str, d1_str, m2_str, d2_str = range_match.groups()
        m1 = months[m1_str]
        m2 = months[m2_str] if m2_str else m1
        d1 = int(d1_str)
        d2 = int(d2_str)
        y = today.year
        return f"{y:04d}-{m1:02d}-{d1:02d}", f"{y:04d}-{m2:02d}-{d2:02d}"

    # Single "September 25"
    single_match = re.search(rf'\b({month_pattern})\s+(\d{{1,2}})(?:st|nd|rd|th)?\b', lower)
    if single_match:
        m_str, d_str = single_match.groups()
        m = months[m_str]
        d = int(d_str)
        y = today.year
        return f"{y:04d}-{m:02d}-{d:02d}", None

    # "25th September"
    rev_match = re.search(rf'\b(\d{{1,2}})(?:st|nd|rd|th)?\s+({month_pattern})\b', lower)
    if rev_match:
        d_str, m_str = rev_match.groups()
        m = months[m_str]
        d = int(d_str)
        y = today.year
        return f"{y:04d}-{m:02d}-{d:02d}", None

    return None, None


def classify_intent(text: str) -> str:
    """Classify query into one of the 12 AirFareX taxonomy intents."""
    lower = text.lower()

    if any(k in lower for k in ["price index", "airfare index", "index value", "cpi", "relative to base"]):
        return "PRICE_INDEX"

    if any(k in lower for k in ["should i book", "book now", "good time to book", "wait or book", "booking advice", "booking recommendation"]):
        return "BOOKING_RECOMMENDATION"

    if any(k in lower for k in ["expensive", "is ₹", "is rs", "cheap or expensive", "why is", "why are"]):
        return "FARE_EXPLANATION"

    if any(k in lower for k in ["which day", "cheapest day", "cheapest date", "best day to fly"]):
        return "CHEAPEST_DATE"

    if any(k in lower for k in ["compare", "is september", "cheaper than", "versus", " vs "]):
        return "FARE_COMPARISON"

    if any(k in lower for k in ["budget", "under ₹", "under rs", "under 5000", "under 6000", "where can i fly", "where can i go", "somewhere cheap"]):
        return "BUDGET_SEARCH"

    if any(k in lower for k in ["cheapest flight", "lowest fare", "cheapest price", "best fare"]):
        return "CHEAPEST_FLIGHT"

    if any(k in lower for k in ["history", "price trend", "how did fares change", "fare progression", "what happened to airfare", "trend"]):
        return "PRICE_HISTORY"

    if any(k in lower for k in ["route price", "average fare for", "price for", "fare for"]):
        return "ROUTE_PRICE"

    if any(k in lower for k in ["find flights", "search flights", "flights from", "flight from"]):
        return "SEARCH_FLIGHTS"

    if any(k in lower for k in ["airfarex", "what is this platform", "mospi", "help", "who are you"]):
        return "GENERAL_AIRFAREX_QUERY"

    return "UNKNOWN"
