from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Dict, List

from . import panchang_engine
from . import time_guidance_engine

FESTIVAL_RULES = [
    {"name": "Maha Shivaratri", "month": "Phalguna", "tithi": "Chaturdashi"},
    {"name": "Holi", "month": "Phalguna", "tithi": "Purnima"},
    {"name": "Ram Navami", "month": "Chaitra", "tithi": "Navami"},
    {"name": "Janmashtami", "month": "Bhadrapada", "tithi": "Ashtami"},
    {"name": "Ganesh Chaturthi", "month": "Bhadrapada", "tithi": "Chaturthi"},
    {"name": "Navratri Start", "month": "Ashwin", "tithi": "Pratipada"},
    {"name": "Dussehra", "month": "Ashwin", "tithi": "Dashami"},
    {"name": "Diwali", "month": "Kartik", "tithi": "Amavasya"},
]


def _month_range(day: date) -> List[date]:
    start = date(day.year, day.month, 1)
    if day.month == 12:
        next_month = date(day.year + 1, 1, 1)
    else:
        next_month = date(day.year, day.month + 1, 1)
    days = (next_month - start).days
    return [start + timedelta(days=idx) for idx in range(days)]


def month_festivals(day: date, lat: float, lon: float) -> List[Dict[str, str]]:
    festivals = []
    for current_day in _month_range(day):
        panchang = panchang_engine.panchang_for_date(current_day)
        for rule in FESTIVAL_RULES:
            if panchang["month"] == rule["month"] and panchang["tithi"] == rule["tithi"]:
                guidance = time_guidance_engine.time_guidance(current_day, lat, lon)
                festivals.append({
                    "festival": rule["name"],
                    "date": current_day.isoformat(),
                    "start": guidance["sunrise"],
                    "end": guidance["sunset"],
                    "tithi": panchang["tithi"],
                    "month": panchang["month"],
                })
    return festivals
