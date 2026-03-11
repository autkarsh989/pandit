from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

from . import astro_calc

VIMSHOTTARI_ORDER = [
    "Ketu",
    "Venus",
    "Sun",
    "Moon",
    "Mars",
    "Rahu",
    "Jupiter",
    "Saturn",
    "Mercury",
]

VIMSHOTTARI_YEARS = {
    "Ketu": 7,
    "Venus": 20,
    "Sun": 6,
    "Moon": 10,
    "Mars": 7,
    "Rahu": 18,
    "Jupiter": 16,
    "Saturn": 19,
    "Mercury": 17,
}


def _nakshatra_index(moon_longitude: float) -> int:
    return int(astro_calc._deg_normalize(moon_longitude) // (360 / 27))


def _nakshatra_fraction(moon_longitude: float) -> float:
    segment = 360 / 27
    position = astro_calc._deg_normalize(moon_longitude) % segment
    return position / segment


def _dasha_lord_from_nakshatra(idx: int) -> str:
    return VIMSHOTTARI_ORDER[idx % len(VIMSHOTTARI_ORDER)]


def _next_lord(current: str) -> str:
    idx = VIMSHOTTARI_ORDER.index(current)
    return VIMSHOTTARI_ORDER[(idx + 1) % len(VIMSHOTTARI_ORDER)]


def _antardasha_sequence(mahadasha: str) -> List[str]:
    start_idx = VIMSHOTTARI_ORDER.index(mahadasha)
    return [
        VIMSHOTTARI_ORDER[(start_idx + idx) % len(VIMSHOTTARI_ORDER)]
        for idx in range(len(VIMSHOTTARI_ORDER))
    ]


def current_mahadasha(
    birth_dt: datetime, birth_moon_long: float, now: datetime
) -> Dict[str, object]:
    nak_idx = _nakshatra_index(birth_moon_long)
    lord = _dasha_lord_from_nakshatra(nak_idx)
    fraction = _nakshatra_fraction(birth_moon_long)

    lord_years = VIMSHOTTARI_YEARS[lord]
    remaining_years = lord_years * (1 - fraction)

    elapsed_days = (now - birth_dt).total_seconds() / 86400.0
    remaining_days = remaining_years * 365.25

    if elapsed_days < remaining_days:
        end_date = birth_dt + timedelta(days=remaining_days)
        return {
            "mahadasha": lord,
            "ends_on": end_date.date().isoformat(),
            "remaining_years": round((remaining_days - elapsed_days) / 365.25, 2),
            "elapsed_days": round(elapsed_days, 2),
            "total_days": round(remaining_days, 2),
        }

    elapsed_days -= remaining_days
    current = _next_lord(lord)

    while True:
        years = VIMSHOTTARI_YEARS[current]
        span_days = years * 365.25
        if elapsed_days <= span_days:
            end_date = now + timedelta(days=span_days - elapsed_days)
            return {
                "mahadasha": current,
                "ends_on": end_date.date().isoformat(),
                "remaining_years": round((span_days - elapsed_days) / 365.25, 2),
                "elapsed_days": round(elapsed_days, 2),
                "total_days": round(span_days, 2),
            }
        elapsed_days -= span_days
        current = _next_lord(current)


def current_antardasha(
    mahadasha_payload: Dict[str, object], now: datetime
) -> Dict[str, object]:
    mahadasha = mahadasha_payload["mahadasha"]
    elapsed_days = float(mahadasha_payload.get("elapsed_days", 0.0))
    total_days = float(mahadasha_payload.get("total_days", 1.0))

    sequence = _antardasha_sequence(mahadasha)
    for lord in sequence:
        share = VIMSHOTTARI_YEARS[lord] / 120.0
        span_days = total_days * share
        if elapsed_days <= span_days:
            remaining = max(span_days - elapsed_days, 0.0)
            return {
                "antardasha": lord,
                "remaining_months": round(remaining / 30.44, 2),
            }
        elapsed_days -= span_days

    return {"antardasha": sequence[0], "remaining_months": 0.0}
