from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo
from typing import Dict, List

from timezonefinder import TimezoneFinder

from . import astro_calc

RAHU_KAAL_SLOTS = {
    0: 2,  # Monday
    1: 7,  # Tuesday
    2: 5,  # Wednesday
    3: 6,  # Thursday
    4: 4,  # Friday
    5: 3,  # Saturday
    6: 8,  # Sunday
}

CHOGHADIYA_TYPES = [
    "Udveg",
    "Char",
    "Labh",
    "Amrit",
    "Kaal",
    "Shubh",
    "Rog",
    "Udveg",
]


def _format_time_range(start: datetime, end: datetime) -> str:
    return f"{start.strftime('%I:%M %p')} - {end.strftime('%I:%M %p')}"


def _localize(dt: datetime, lat: float, lon: float) -> datetime:
    tf = TimezoneFinder()
    tz_name = tf.timezone_at(lat=lat, lng=lon) or "UTC"
    return dt.astimezone(ZoneInfo(tz_name))


def _segment_times(start: datetime, end: datetime, parts: int) -> List[Dict[str, str]]:
    segments = []
    for idx in range(parts):
        seg_start = start + idx * (end - start) / parts
        seg_end = start + (idx + 1) * (end - start) / parts
        segments.append({
            "range": _format_time_range(seg_start, seg_end),
            "start_iso": seg_start.isoformat(),
            "end_iso": seg_end.isoformat(),
            "type": CHOGHADIYA_TYPES[idx % len(CHOGHADIYA_TYPES)],
        })
    return segments


def time_guidance(day: date, lat: float, lon: float) -> Dict[str, object]:
    sunrise_utc, sunset_utc = astro_calc.sunrise_sunset(day, lat, lon)
    sunrise = _localize(sunrise_utc, lat, lon)
    sunset = _localize(sunset_utc, lat, lon)

    day_length = (sunset - sunrise) / 8
    slot = RAHU_KAAL_SLOTS[day.weekday()] - 1
    rahu_start = sunrise + slot * day_length
    rahu_end = rahu_start + day_length

    abhijit_start = sunrise + (sunset - sunrise) * 0.5 - day_length * 0.1
    abhijit_end = abhijit_start + day_length * 0.2

    return {
        "sunrise": sunrise.strftime("%I:%M %p"),
        "sunset": sunset.strftime("%I:%M %p"),
        "sunrise_iso": sunrise.isoformat(),
        "sunset_iso": sunset.isoformat(),
        "rahu_kaal": _format_time_range(rahu_start, rahu_end),
        "rahu_start_iso": rahu_start.isoformat(),
        "rahu_end_iso": rahu_end.isoformat(),
        "abhijit_muhurat": _format_time_range(abhijit_start, abhijit_end),
        "choghadiya": _segment_times(sunrise, sunset, 8),
    }
