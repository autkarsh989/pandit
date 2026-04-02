from __future__ import annotations

from datetime import datetime
from typing import Dict, Optional

from . import astro_calc


def generate_kundali(dob: str, tob: str, lat: float, lon: float) -> Dict[str, Optional[str]]:
    year, month, day = [int(x) for x in dob.split("-")]
    hour, minute = [int(x) for x in tob.split(":")]
    dt = datetime(year, month, day, hour, minute)
    jd = astro_calc.to_julian_day(dt)
    snap = astro_calc.snapshot(jd)

    moon_sign = astro_calc.sign_name(snap.moon_long)
    sun_sign = astro_calc.sign_name(snap.sun_long)
    nakshatra = astro_calc.nakshatra_name(snap.moon_long)
    asc = astro_calc.ascendant(jd, lat, lon)
    asc_sign = astro_calc.sign_name(asc) if asc is not None else None

    return {
        "moon_sign": moon_sign,
        "sun_sign": sun_sign,
        "nakshatra": nakshatra,
        "ascendant_sign": asc_sign,
        "moon_longitude_value": snap.moon_long,
        "moon_longitude": f"{snap.moon_long:.2f}",
        "sun_longitude": f"{snap.sun_long:.2f}",
    }
