"""
AirFareX - Airport & City Resolver Utility
==========================================

Maps common Indian city names, alternate spellings, and IATA codes
to standard 3-letter uppercase airport codes for domestic routes.
"""

from typing import Optional, Tuple

AIRPORT_MAP = {
    # Metropolitan & Primary Hubs
    "DELHI": "DEL",
    "NEW DELHI": "DEL",
    "DEL": "DEL",
    "MUMBAI": "BOM",
    "BOMBAY": "BOM",
    "BOM": "BOM",
    "BANGALORE": "BLR",
    "BENGALURU": "BLR",
    "BLR": "BLR",
    "KOLKATA": "CCU",
    "CALCUTTA": "CCU",
    "CCU": "CCU",
    "CHENNAI": "MAA",
    "MADRAS": "MAA",
    "MAA": "MAA",
    "HYDERABAD": "HYD",
    "HYD": "HYD",
    
    # Tier 2 & Key Domestic Hubs
    "AHMEDABAD": "AMD",
    "AMD": "AMD",
    "PUNE": "PNQ",
    "PNQ": "PNQ",
    "GOA": "GOI",
    "GOI": "GOI",
    "GOA DABOLIM": "GOI",
    "GOA MOPA": "GOX",
    "GOX": "GOX",
    "MOPA": "GOX",
    "JAIPUR": "JAI",
    "JAI": "JAI",
    "LUCKNOW": "LKO",
    "LKO": "LKO",
    "KOCHI": "COK",
    "COCHIN": "COK",
    "COK": "COK",
    "PATNA": "PAT",
    "PAT": "PAT",
    "GUWAHATI": "GAU",
    "GAU": "GAU",
    "CHANDIGARH": "IXC",
    "IXC": "IXC",
    "AMRITSAR": "ATQ",
    "ATQ": "ATQ",
    "SRINAGAR": "SXR",
    "SXR": "SXR",
    "VARANASI": "VNS",
    "BENARAS": "VNS",
    "KASHI": "VNS",
    "VNS": "VNS",
    "BHUBANESWAR": "BBI",
    "BHUBANESHWAR": "BBI",
    "BBI": "BBI",
    "BAGDOGRA": "IXB",
    "SILIGURI": "IXB",
    "IXB": "IXB",
    "RANCHI": "IXR",
    "IXR": "IXR",
    "RAIPUR": "RPR",
    "RPR": "RPR",
    "INDORE": "IDR",
    "IDR": "IDR",
    "NAGPUR": "NAG",
    "NAG": "NAG",
    "COIMBATORE": "CJB",
    "CJB": "CJB",
    "TRIVANDRUM": "TRV",
    "THIRUVANANTHAPURAM": "TRV",
    "TRV": "TRV",
    "MADURAI": "IXM",
    "IXM": "IXM",
    "MANGALORE": "IXE",
    "MANGALURU": "IXE",
    "IXE": "IXE",
    "SURAT": "STV",
    "STV": "STV",
    "VADODARA": "BDQ",
    "BARODA": "BDQ",
    "BDQ": "BDQ",
    "DEHRADUN": "DED",
    "DED": "DED",
    "IMPHAL": "IMF",
    "IMF": "IMF",
    "AIZAWL": "AJL",
    "AJL": "AJL",
    "AGARTALA": "IXA",
    "IXA": "IXA",
    "LEH": "IXL",
    "LADAKH": "IXL",
    "IXL": "IXL",
    "PORT BLAIR": "IXZ",
    "ANDAMAN": "IXZ",
    "IXZ": "IXZ",
    "JAMMU": "IXJ",
    "IXJ": "IXJ",
    "BHOPAL": "BHO",
    "BHO": "BHO",
    "JODHPUR": "JDH",
    "JDH": "JDH",
    "UDAIPUR": "UDR",
    "UDR": "UDR",
    "RAJKOT": "RAJ",
    "RAJ": "RAJ",
    "VIJAYAWADA": "VGA",
    "VGA": "VGA",
    "VISAKHAPATNAM": "VTZ",
    "VIZAG": "VTZ",
    "VTZ": "VTZ",
    "CALICUT": "CCJ",
    "KOZHIKODE": "CCJ",
    "CCJ": "CCJ",
    "DIMAPUR": "DMU",
    "DMU": "DMU",
    "DIBRUGARH": "DIB",
    "DIB": "DIB",
    "AGATTI": "AGX",
    "LAKSHADWEEP": "AGX",
    "AGX": "AGX",
    "PRAYAGRAJ": "IXD",
    "ALLAHABAD": "IXD",
    "IXD": "IXD",
    "AYODHYA": "AYJ",
    "AYJ": "AYJ",
}

# Reverse mapping for display
CODE_TO_CITY = {
    "DEL": "Delhi",
    "BOM": "Mumbai",
    "BLR": "Bengaluru",
    "CCU": "Kolkata",
    "MAA": "Chennai",
    "HYD": "Hyderabad",
    "AMD": "Ahmedabad",
    "PNQ": "Pune",
    "GOI": "Goa (Dabolim)",
    "GOX": "Goa (Mopa)",
    "JAI": "Jaipur",
    "LKO": "Lucknow",
    "COK": "Kochi",
    "PAT": "Patna",
    "GAU": "Guwahati",
    "IXC": "Chandigarh",
    "ATQ": "Amritsar",
    "SXR": "Srinagar",
    "VNS": "Varanasi",
    "BBI": "Bhubaneswar",
    "IXB": "Bagdogra",
    "IXR": "Ranchi",
    "RPR": "Raipur",
    "IDR": "Indore",
    "NAG": "Nagpur",
    "CJB": "Coimbatore",
    "TRV": "Thiruvananthapuram",
    "IXM": "Madurai",
    "IXE": "Mangalore",
    "STV": "Surat",
    "BDQ": "Vadodara",
    "DED": "Dehradun",
    "IMF": "Imphal",
    "AJL": "Aizawl",
    "IXA": "Agartala",
    "IXL": "Leh",
    "IXZ": "Port Blair",
    "IXJ": "Jammu",
    "BHO": "Bhopal",
    "JDH": "Jodhpur",
    "UDR": "Udaipur",
    "RAJ": "Rajkot",
    "VGA": "Vijayawada",
    "VTZ": "Visakhapatnam",
    "CCJ": "Kozhikode",
    "DMU": "Dimapur",
    "DIB": "Dibrugarh",
    "AGX": "Agatti",
    "IXD": "Prayagraj",
    "AYJ": "Ayodhya",
}


def resolve_airport(text: str) -> Optional[str]:
    """
    Resolve city name, common alias, or airport code to standard 3-letter IATA code.
    Example: 'Kolkata' -> 'CCU', 'blr' -> 'BLR', 'Bombay' -> 'BOM'
    """
    if not text:
        return None
    cleaned = text.strip().upper()
    if cleaned in AIRPORT_MAP:
        return AIRPORT_MAP[cleaned]
    # Check 3-letter code directly against known Indian airport codes
    if cleaned in CODE_TO_CITY:
        return cleaned
    return None


def get_city_name(code: str) -> str:
    """Return friendly city name for an airport code."""
    if not code:
        return "Unknown"
    return CODE_TO_CITY.get(code.upper().strip(), code.upper().strip())


def normalize_route_pair(origin: str, destination: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Normalize both origin and destination and return (origin_code, dest_code, 'ORIG-DEST').
    """
    orig_code = resolve_airport(origin)
    dest_code = resolve_airport(destination)
    if orig_code and dest_code:
        return orig_code, dest_code, f"{orig_code}-{dest_code}"
    return orig_code, dest_code, None
