from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

try:
    import swisseph as swe
except Exception:  # pragma: no cover - optional dependency
    swe = None

LUNAR_MONTHS = [
    "Chaitra",
    "Vaishakha",
    "Jyeshtha",
    "Ashadha",
    "Shravana",
    "Bhadrapada",
    "Ashwin",
    "Kartik",
    "Margashirsha",
    "Pausha",
    "Magha",
    "Phalguna",
]

SIGNS = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
]

NAKSHATRAS = [
    "Ashwini",
    "Bharani",
    "Krittika",
    "Rohini",
    "Mrigashirsha",
    "Ardra",
    "Punarvasu",
    "Pushya",
    "Ashlesha",
    "Magha",
    "Purva Phalguni",
    "Uttara Phalguni",
    "Hasta",
    "Chitra",
    "Swati",
    "Vishakha",
    "Anuradha",
    "Jyeshtha",
    "Mula",
    "Purva Ashadha",
    "Uttara Ashadha",
    "Shravana",
    "Dhanishta",
    "Shatabhisha",
    "Purva Bhadrapada",
    "Uttara Bhadrapada",
    "Revati",
]

TITHIS = [
    "Pratipada",
    "Dwitiya",
    "Tritiya",
    "Chaturthi",
    "Panchami",
    "Shashthi",
    "Saptami",
    "Ashtami",
    "Navami",
    "Dashami",
    "Ekadashi",
    "Dwadashi",
    "Trayodashi",
    "Chaturdashi",
    "Purnima",
    "Pratipada",
    "Dwitiya",
    "Tritiya",
    "Chaturthi",
    "Panchami",
    "Shashthi",
    "Saptami",
    "Ashtami",
    "Navami",
    "Dashami",
    "Ekadashi",
    "Dwadashi",
    "Trayodashi",
    "Chaturdashi",
    "Amavasya",
]

KARANAS = [
    "Bava",
    "Balava",
    "Kaulava",
    "Taitila",
    "Garaja",
    "Vanija",
    "Vishti",
]

YOGAS = [
    "Vishkumbha",
    "Priti",
    "Ayushman",
    "Saubhagya",
    "Shobhana",
    "Atiganda",
    "Sukarma",
    "Dhriti",
    "Shoola",
    "Ganda",
    "Vriddhi",
    "Dhruva",
    "Vyaghata",
    "Harshana",
    "Vajra",
    "Siddhi",
    "Vyatipata",
    "Variyana",
    "Parigha",
    "Shiva",
    "Siddha",
    "Sadhya",
    "Shubha",
    "Shukla",
    "Brahma",
    "Indra",
    "Vaidhriti",
]

@dataclass(frozen=True)
class EphemerisSnapshot:
    jd: float
    sun_long: float
    moon_long: float


def _deg_normalize(value: float) -> float:
    return value % 360.0


def _calc_body_longitude(jd: float, body: int) -> float:
    if swe is None:
        return 0.0
    result = swe.calc_ut(jd, body)
    return float(result[0][0])


def snapshot(jd: float) -> EphemerisSnapshot:
    sun_long = _calc_body_longitude(jd, swe.SUN if swe else 0)
    moon_long = _calc_body_longitude(jd, swe.MOON if swe else 1)
    return EphemerisSnapshot(jd=jd, sun_long=_deg_normalize(sun_long), moon_long=_deg_normalize(moon_long))


def planet_longitudes(jd: float) -> Dict[str, float]:
    if swe is None:
        return {
            "Sun": 0.0,
            "Moon": 0.0,
            "Mars": 0.0,
            "Mercury": 0.0,
            "Jupiter": 0.0,
            "Venus": 0.0,
            "Saturn": 0.0,
            "Rahu": 0.0,
            "Ketu": 180.0,
        }
    bodies = {
        "Sun": swe.SUN,
        "Moon": swe.MOON,
        "Mars": swe.MARS,
        "Mercury": swe.MERCURY,
        "Jupiter": swe.JUPITER,
        "Venus": swe.VENUS,
        "Saturn": swe.SATURN,
        "Rahu": swe.MEAN_NODE,
    }
    longs = {}
    for name, body in bodies.items():
        longs[name] = _deg_normalize(_calc_body_longitude(jd, body))
    longs["Ketu"] = _deg_normalize(longs["Rahu"] + 180.0)
    return longs


def to_julian_day(dt: datetime) -> float:
    if swe is None:
        # Approximate JD to keep flow working without external dependency.
        unix_seconds = dt.timestamp()
        return unix_seconds / 86400.0 + 2440587.5
    return float(swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute / 60 + dt.second / 3600))


def sign_name(longitude: float) -> str:
    idx = int(_deg_normalize(longitude) // 30)
    return SIGNS[idx]


def tithi_name(moon_long: float, sun_long: float) -> str:
    diff = _deg_normalize(moon_long - sun_long)
    idx = int(diff // 12)
    return TITHIS[idx]


def nakshatra_name(moon_long: float) -> str:
    idx = int(_deg_normalize(moon_long) // (360 / 27))
    return NAKSHATRAS[idx]


def yoga_name(moon_long: float, sun_long: float) -> str:
    total = _deg_normalize(moon_long + sun_long)
    idx = int(total // (360 / 27))
    return YOGAS[idx]


def karana_name(moon_long: float, sun_long: float) -> str:
    diff = _deg_normalize(moon_long - sun_long)
    idx = int((diff % 60) // (60 / 7))
    return KARANAS[idx]


def lunar_month_name(sun_long: float) -> str:
    idx = int(_deg_normalize(sun_long) // 30)
    return LUNAR_MONTHS[idx]


def ascendant(jd: float, lat: float, lon: float) -> Optional[float]:
    if swe is None:
        return None
    try:
        houses = swe.houses(jd, lat, lon)
        return float(houses[0][0])
    except Exception:
        return None


def sunrise_sunset(dt: date, lat: float, lon: float) -> Tuple[datetime, datetime]:
    if swe is None:
        sunrise = datetime(dt.year, dt.month, dt.day, 6, 0, 0, tzinfo=timezone.utc)
        sunset = datetime(dt.year, dt.month, dt.day, 18, 0, 0, tzinfo=timezone.utc)
        return sunrise, sunset

    jd = swe.julday(dt.year, dt.month, dt.day, 0)
    rs = swe.rise_trans(jd, swe.SUN, geopos=(lon, lat, 0), rsmi=swe.CALC_RISE)
    ss = swe.rise_trans(jd, swe.SUN, geopos=(lon, lat, 0), rsmi=swe.CALC_SET)
    sunrise = datetime.fromtimestamp((rs[1][0] - 2440587.5) * 86400.0, tz=timezone.utc)
    sunset = datetime.fromtimestamp((ss[1][0] - 2440587.5) * 86400.0, tz=timezone.utc)
    return sunrise, sunset
