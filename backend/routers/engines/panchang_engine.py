from __future__ import annotations

from datetime import date, datetime
from typing import Dict

from . import astro_calc


def panchang_for_datetime(dt: datetime) -> Dict[str, str]:
    jd = astro_calc.to_julian_day(dt)
    snap = astro_calc.snapshot(jd)

    tithi = astro_calc.tithi_name(snap.moon_long, snap.sun_long)
    nakshatra = astro_calc.nakshatra_name(snap.moon_long)
    yoga = astro_calc.yoga_name(snap.moon_long, snap.sun_long)
    karana = astro_calc.karana_name(snap.moon_long, snap.sun_long)
    month = astro_calc.lunar_month_name(snap.sun_long)

    return {
        "tithi": tithi,
        "nakshatra": nakshatra,
        "yoga": yoga,
        "karana": karana,
        "month": month,
    }


def panchang_for_date(day: date) -> Dict[str, str]:
    noon = datetime(day.year, day.month, day.day, 12, 0, 0)
    return panchang_for_datetime(noon)
