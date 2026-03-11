from __future__ import annotations

import sys
import threading
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

if __package__ in (None, ""):
    sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.engines.cache import FESTIVAL_CACHE, TODAY_CACHE, cache_stamp, read_cache, write_cache
from app.engines.festival_engine import month_festivals
from app.engines.kundali_engine import generate_kundali
from app.engines.dasha_engine import current_antardasha, current_mahadasha
from app.engines.numerology import calculate_mulank
from app.engines.panchang_engine import panchang_for_datetime
from app.engines.prediction_engine import predict_day
from app.engines.time_guidance_engine import time_guidance
from app.engines import astro_calc
from app.engines.llm_report import generate_llm_report

load_dotenv()

app = FastAPI(title="Astro Daily System", version="1.0")
STATIC_DIR = Path(__file__).resolve().parent / "static"
TEMPLATE_DIR = Path(__file__).resolve().parent / "templates"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

CURRENT_LOCATION = {"latitude": 25.4358, "longitude": 81.8463}


class ReportRequest(BaseModel):
    dob: str = Field(..., example="1998-05-10")
    tob: str = Field(..., example="14:30")
    latitude: float = Field(..., example=25.4358)
    longitude: float = Field(..., example=81.8463)


class DailyContext(BaseModel):
    latitude: float = Field(..., example=25.4358)
    longitude: float = Field(..., example=81.8463)


def build_daily_report(day: date, latitude: float, longitude: float) -> Dict[str, Any]:
    now = datetime.utcnow()
    panchang = panchang_for_datetime(now)
    guidance = time_guidance(day, latitude, longitude)
    festivals = month_festivals(day, latitude, longitude)

    return {
        "date": day.isoformat(),
        "panchang": panchang,
        "guidance": guidance,
        "festivals": festivals,
    }


def refresh_daily_cache(latitude: float, longitude: float) -> Dict[str, Any]:
    day = date.today()
    report = build_daily_report(day, latitude, longitude)
    report["location"] = {"latitude": latitude, "longitude": longitude}
    report["updated_on"] = cache_stamp()
    write_cache(TODAY_CACHE, report)

    festival_payload = {
        "month": day.month,
        "year": day.year,
        "updated_on": cache_stamp(),
        "festivals": report["festivals"],
    }
    write_cache(FESTIVAL_CACHE, festival_payload)
    return report


def _seconds_until_next_run(target_hour: int = 4) -> float:
    now = datetime.now()
    target = now.replace(hour=target_hour, minute=0, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return (target - now).total_seconds()


def _scheduler_loop() -> None:
    while True:
        try:
            refresh_daily_cache(CURRENT_LOCATION["latitude"], CURRENT_LOCATION["longitude"])
        except Exception:
            pass
        time.sleep(_seconds_until_next_run())


def start_scheduler() -> None:
    thread = threading.Thread(target=_scheduler_loop, daemon=True)
    thread.start()


@app.on_event("startup")
async def startup_event() -> None:
    cached = read_cache(TODAY_CACHE)
    if cached.get("location"):
        CURRENT_LOCATION.update(cached["location"])
    else:
        refresh_daily_cache(CURRENT_LOCATION["latitude"], CURRENT_LOCATION["longitude"])
    start_scheduler()


@app.get("/", response_class=HTMLResponse)
async def index() -> HTMLResponse:
    html = (TEMPLATE_DIR / "index.html").read_text(encoding="utf-8")
    return HTMLResponse(html)


@app.get("/api/today")
async def get_today() -> Dict[str, Any]:
    cached = read_cache(TODAY_CACHE)
    if not cached:
        raise HTTPException(status_code=404, detail="Daily cache not ready")
    return cached


@app.post("/api/report")
async def post_report(payload: ReportRequest) -> Dict[str, Any]:
    kundali = generate_kundali(payload.dob, payload.tob, payload.latitude, payload.longitude)
    mulank = calculate_mulank(payload.dob)
    panchang = panchang_for_datetime(datetime.utcnow())
    guidance = time_guidance(date.today(), payload.latitude, payload.longitude)
    birth_dt = datetime.fromisoformat(f"{payload.dob}T{payload.tob}:00")
    birth_moon_long = float(kundali.get("moon_longitude_value") or 0.0)
    dasha = current_mahadasha(birth_dt, birth_moon_long, datetime.utcnow())
    antardasha = current_antardasha(dasha, datetime.utcnow())

    now_dt = datetime.utcnow()
    now_jd = astro_calc.to_julian_day(now_dt)
    now_snap = astro_calc.snapshot(now_jd)
    now_longs = astro_calc.planet_longitudes(now_jd)
    natal_sign_idx = astro_calc.SIGNS.index(kundali["moon_sign"])
    transit_sign_idx = astro_calc.SIGNS.index(astro_calc.sign_name(now_snap.moon_long))
    transit_house = (transit_sign_idx - natal_sign_idx) % 12 + 1
    transit_effect = "Supportive for growth" if transit_house in {3, 6, 10, 11} else "Slow and reflective"

    asc_sign = kundali.get("ascendant_sign") or kundali["moon_sign"]
    asc_idx = astro_calc.SIGNS.index(asc_sign)
    moon_from_asc = (transit_sign_idx - asc_idx) % 12 + 1
    house_effect = (
        "Action and visibility improve" if moon_from_asc in {1, 5, 9, 10}
        else "Focus on foundations and inner work"
    )

    transit = {
        "current_moon_sign": astro_calc.sign_name(now_snap.moon_long),
        "natal_moon_sign": kundali["moon_sign"],
        "moon_house_from_natal": transit_house,
        "effect": transit_effect,
        "moon_house_from_asc": moon_from_asc,
        "house_effect": house_effect,
    }

    natal_moon_long = float(kundali.get("moon_longitude_value") or 0.0)
    aspect_angles = [
        (0, "Conjunct"),
        (60, "Sextile"),
        (90, "Square"),
        (120, "Trine"),
        (180, "Opposition"),
    ]
    aspects: Dict[str, Dict[str, object]] = {}
    for planet, p_long in now_longs.items():
        delta = abs((p_long - natal_moon_long + 180) % 360 - 180)
        closest_angle, closest_name = min(
            aspect_angles,
            key=lambda item: abs(delta - item[0]),
        )
        orb = abs(delta - closest_angle)
        aspects[planet] = {
            "aspect": closest_name,
            "angle": round(delta, 1),
            "orb": round(orb, 1),
            "within_orb": orb <= 6,
        }

    def _overlaps(start_a, end_a, start_b, end_b) -> bool:
        return max(start_a, start_b) < min(end_a, end_b)

    rahu_start = datetime.fromisoformat(guidance.get("rahu_start_iso"))
    rahu_end = datetime.fromisoformat(guidance.get("rahu_end_iso"))

    best_slot = None
    for slot in guidance.get("choghadiya", []):
        if slot.get("type") not in {"Amrit", "Shubh"}:
            continue
        slot_start = datetime.fromisoformat(slot["start_iso"])
        slot_end = datetime.fromisoformat(slot["end_iso"])
        if not _overlaps(slot_start, slot_end, rahu_start, rahu_end):
            best_slot = slot["range"]
            break
    if best_slot is None:
        best_slot = guidance.get("abhijit_muhurat", "12:00 PM - 12:40 PM")
    muhurat = {
        "business": best_slot,
        "travel_best": best_slot,
        "travel_avoid": guidance.get("rahu_kaal", "Avoid during Rahu Kaal"),
        "study": guidance.get("sunrise", "Morning hours"),
        "puja": guidance.get("sunrise", "Morning hours"),
        "amrit": next((c["range"] for c in guidance.get("choghadiya", []) if c["type"] == "Amrit"), "Not found"),
    }

    dosha_flags = {
        "manglik_hint": kundali.get("moon_sign") in {"Aries", "Scorpio"},
        "kaal_sarp_hint": now_longs.get("Rahu", 0.0) < natal_moon_long < now_longs.get("Ketu", 180.0),
    }

    prediction = predict_day(
        kundali,
        mulank,
        panchang,
        guidance,
        transit,
        dasha,
        antardasha,
        aspects,
        muhurat,
        dosha_flags,
    )

    report_payload = {
        "kundali": kundali,
        "mulank": mulank,
        "panchang": panchang,
        "guidance": guidance,
        "prediction": prediction,
        "dasha": dasha,
        "antardasha": antardasha,
        "transit": transit,
        "aspects": aspects,
        "muhurat": muhurat,
        "dosha_flags": dosha_flags,
    }

    llm_report = generate_llm_report(report_payload)
    report_payload["llm_report"] = llm_report
    return report_payload


@app.post("/api/refresh")
async def refresh_cache(payload: DailyContext) -> Dict[str, Any]:
    CURRENT_LOCATION["latitude"] = payload.latitude
    CURRENT_LOCATION["longitude"] = payload.longitude
    return refresh_daily_cache(payload.latitude, payload.longitude)


@app.get("/api/festivals")
async def get_festivals() -> Dict[str, Any]:
    cached = read_cache(FESTIVAL_CACHE)
    if not cached:
        raise HTTPException(status_code=404, detail="Festival cache not ready")
    return cached
