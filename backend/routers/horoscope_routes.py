from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import personalized as astro

router = APIRouter()


class BirthBaseRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120, description="Full name")
    dob: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Date of birth in YYYY-MM-DD")
    tob: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="Time of birth in HH:MM (24h)")
    place: str = Field(..., min_length=2, max_length=200, description="Birth place, e.g. City, Country")


class HoroscopeRequest(BirthBaseRequest):
    topic: str = Field(default="daily horoscope", max_length=120, description="Guidance topic for personalized reading")
    include_ai_reading: bool = Field(default=True, description="Generate AI reading when API key is configured")
    alert_days: int = Field(default=7, ge=1, le=60, description="How many days of upcoming vrat/festival alerts")


class ReadingRequest(BirthBaseRequest):
    topic: str = Field(default="daily horoscope", max_length=120, description="Guidance topic for personalized reading")
    include_ai_reading: bool = Field(default=True, description="Generate AI reading when API key is configured")


class PlaceDateRequest(BaseModel):
    place: str = Field(..., min_length=2, max_length=200, description="Location as City, Country")
    date: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Optional date in YYYY-MM-DD")


class AlertsRequest(BaseModel):
    place: str = Field(..., min_length=2, max_length=200, description="Location as City, Country")
    days_ahead: int = Field(default=7, ge=1, le=60, description="How many days to scan for alerts")


class MuhuratRequest(BaseModel):
    place: str = Field(..., min_length=2, max_length=200, description="Location as City, Country")
    days_ahead: int = Field(default=7, ge=1, le=30, description="How many days to scan for muhurat windows")


def _to_julian_day(dt_utc: datetime) -> float:
    return astro.swe.julday(
        dt_utc.year,
        dt_utc.month,
        dt_utc.day,
        dt_utc.hour + dt_utc.minute / 60 + dt_utc.second / 3600,
    )


def _parse_birth_datetime(dob: str, tob: str) -> datetime:
    try:
        return datetime.strptime(f"{dob} {tob}", "%Y-%m-%d %H:%M")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date or time format. Use dob=YYYY-MM-DD and tob=HH:MM.",
        )


def _parse_date_or_today(date_str: Optional[str], timezone_obj) -> date:
    if not date_str:
        return datetime.now(timezone_obj).date()

    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")


def _resolve_location_timezone(place: str) -> Tuple[Any, str, Any]:
    geolocator = astro.Nominatim(user_agent="pandit_horoscope_api")
    location = geolocator.geocode(place, timeout=10)
    if not location:
        raise HTTPException(status_code=404, detail="Place not found. Please provide a more specific location.")

    timezone_finder = astro.TimezoneFinder()
    timezone_name = timezone_finder.timezone_at(lat=location.latitude, lng=location.longitude)
    if not timezone_name:
        raise HTTPException(status_code=400, detail="Could not determine timezone for the provided location.")

    try:
        timezone_obj = astro.pytz.timezone(timezone_name)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid timezone resolution: {exc}")

    return location, timezone_name, timezone_obj


def _build_planet_data(jd_birth: float, cusps: List[float]) -> Dict[str, Dict[str, Any]]:
    planet_data: Dict[str, Dict[str, Any]] = {}

    for planet_name, code in astro.PLANETS.items():
        pos, _ = astro.swe.calc_ut(jd_birth, code)
        longitude = float(pos[0])
        retrograde = bool(pos[3] < 0)
        rashi, degree_in_rashi = astro.deg_to_rashi(longitude)
        nakshatra, pada = astro.get_nakshatra(longitude)
        house = astro.get_house(longitude, cusps) or 12

        planet_data[planet_name] = {
            "rashi": rashi,
            "degree_in_rashi": round(float(degree_in_rashi), 2),
            "house": int(house),
            "nakshatra": nakshatra,
            "pada": int(pada),
            "retro": retrograde,
            "longitude": round(longitude, 4),
        }

    rahu_lon = float(planet_data["Rahu"]["longitude"])
    ketu_lon = (rahu_lon + 180.0) % 360.0
    ketu_rashi, ketu_deg = astro.deg_to_rashi(ketu_lon)
    ketu_nak, ketu_pada = astro.get_nakshatra(ketu_lon)
    ketu_house = astro.get_house(ketu_lon, cusps) or 12

    planet_data["Ketu"] = {
        "rashi": ketu_rashi,
        "degree_in_rashi": round(float(ketu_deg), 2),
        "house": int(ketu_house),
        "nakshatra": ketu_nak,
        "pada": int(ketu_pada),
        "retro": False,
        "longitude": round(float(ketu_lon), 4),
    }
    return planet_data


def _compute_birth_bundle(payload: BirthBaseRequest) -> Dict[str, Any]:
    dt_local_naive = _parse_birth_datetime(payload.dob, payload.tob)
    location, timezone_name, timezone_obj = _resolve_location_timezone(payload.place)

    try:
        dt_local = timezone_obj.localize(dt_local_naive)
        dt_utc = dt_local.astimezone(astro.pytz.utc)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not process birth time with timezone: {exc}")

    try:
        jd_birth = _to_julian_day(dt_utc)
        cusps, ascmc = astro.swe.houses(jd_birth, float(location.latitude), float(location.longitude), b"P")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to compute birth chart houses: {exc}")

    lagna_rashi, lagna_deg = astro.deg_to_rashi(float(ascmc[0]))
    planet_data = _build_planet_data(jd_birth, list(cusps))
    chart_context = astro.build_chart_context(payload.name, lagna_rashi, float(lagna_deg), planet_data)

    return {
        "location": location,
        "timezone_name": timezone_name,
        "timezone_obj": timezone_obj,
        "dt_local": dt_local,
        "dt_utc": dt_utc,
        "jd_birth": jd_birth,
        "lagna_rashi": lagna_rashi,
        "lagna_deg": float(lagna_deg),
        "planet_data": planet_data,
        "chart_context": chart_context,
    }


def _collect_vrat_alerts(days_ahead: int, timezone_obj) -> List[Dict[str, Any]]:
    alerts: List[Dict[str, Any]] = []
    now_local = datetime.now(timezone_obj)

    for day_offset in range(days_ahead + 1):
        target_local = (now_local + timedelta(days=day_offset)).replace(
            hour=12, minute=0, second=0, microsecond=0
        )
        target_utc = target_local.astimezone(astro.pytz.utc)
        jd_target = _to_julian_day(target_utc)

        details = astro.get_panchang_details(jd_target)
        tags = astro.get_vrat_festival_tags(details["tithi_number"], details["paksha"])
        if not tags:
            continue

        alerts.append(
            {
                "day_offset": day_offset,
                "date": target_local.date().isoformat(),
                "tags": tags,
                "tithi": details["tithi_name"],
                "paksha": details["paksha"],
                "nakshatra": details["nakshatra"],
            }
        )

    return alerts


def _collect_shubh_muhurats(days_ahead: int, timezone_obj) -> List[Dict[str, Any]]:
    windows: List[Dict[str, Any]] = []
    now_local = datetime.now(timezone_obj)
    avoided_tithis = {4, 9, 14}

    for day_offset in range(days_ahead + 1):
        target_local = (now_local + timedelta(days=day_offset)).replace(
            hour=12, minute=0, second=0, microsecond=0
        )
        target_utc = target_local.astimezone(astro.pytz.utc)
        jd_target = _to_julian_day(target_utc)
        details = astro.get_panchang_details(jd_target)

        if details["tithi_number"] in avoided_tithis:
            continue
        if details["nakshatra"] not in astro.AUSPICIOUS_NAKSHATRAS:
            continue

        noon = target_local.replace(hour=12, minute=0)
        windows.append(
            {
                "day_offset": day_offset,
                "date": target_local.date().isoformat(),
                "tithi": details["tithi_name"],
                "nakshatra": details["nakshatra"],
                "abhijit_approx": f"{(noon - timedelta(minutes=24)).strftime('%H:%M')} - {(noon + timedelta(minutes=24)).strftime('%H:%M')}",
                "morning_window": "09:00 - 11:00",
                "evening_window": "16:00 - 18:00",
            }
        )

    return windows


def _build_transit_snapshot(planet_data: Dict[str, Dict[str, Any]], jd_now: float) -> Dict[str, Dict[str, Any]]:
    transit_snapshot: Dict[str, Dict[str, Any]] = {}

    for planet_name, code in astro.PLANETS.items():
        current_lon = astro.swe.calc_ut(jd_now, code)[0][0]
        current_rashi, current_deg = astro.deg_to_rashi(current_lon)
        transit_snapshot[planet_name] = {
            "birth_rashi": planet_data[planet_name]["rashi"],
            "current_rashi": current_rashi,
            "current_degree_in_rashi": round(float(current_deg), 2),
            "changed": current_rashi != planet_data[planet_name]["rashi"],
        }

    rahu_current = astro.swe.calc_ut(jd_now, astro.swe.MEAN_NODE)[0][0]
    ketu_current = (rahu_current + 180) % 360
    ketu_current_rashi, ketu_current_deg = astro.deg_to_rashi(ketu_current)
    transit_snapshot["Ketu"] = {
        "birth_rashi": planet_data["Ketu"]["rashi"],
        "current_rashi": ketu_current_rashi,
        "current_degree_in_rashi": round(float(ketu_current_deg), 2),
        "changed": ketu_current_rashi != planet_data["Ketu"]["rashi"],
    }

    return transit_snapshot


def _build_dasha_payload(now_local: datetime, birth_local: datetime, moon_lon_birth: float) -> Dict[str, Any]:
    maha_lord, elapsed_maha, maha_total, cycle_index, elapsed_years = astro.get_current_vimshottari(
        now_local,
        birth_local,
        moon_lon_birth,
    )
    antar_lord, elapsed_antar, antar_total = astro.get_antardasha(maha_lord, elapsed_maha)

    return {
        "mahadasha": maha_lord,
        "elapsed_years_in_mahadasha": round(float(elapsed_maha), 2),
        "total_mahadasha_years": round(float(maha_total), 2),
        "remaining_mahadasha_years": round(max(0.0, float(maha_total - elapsed_maha)), 2),
        "antardasha": antar_lord,
        "elapsed_years_in_antardasha": round(float(elapsed_antar), 2),
        "total_antardasha_years": round(float(antar_total), 2),
        "remaining_antardasha_years": round(max(0.0, float(antar_total - elapsed_antar)), 2),
        "cycle_index": int(cycle_index),
        "elapsed_years_from_birth": round(float(elapsed_years), 2),
    }


def _sanitize_panchang(details: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "tithi_number": int(details["tithi_number"]),
        "tithi_name": details["tithi_name"],
        "paksha": details["paksha"],
        "nakshatra": details["nakshatra"],
        "pada": int(details["pada"]),
        "yoga": details["yoga"],
        "karana": details["karana"],
    }


def _location_payload(location: Any, timezone_name: str) -> Dict[str, Any]:
    return {
        "resolved_place": location.address,
        "latitude": round(float(location.latitude), 6),
        "longitude": round(float(location.longitude), 6),
        "timezone": timezone_name,
    }


@router.get("/predict")
def predict_info() -> Dict[str, Any]:
    return {
        "message": "Horoscope endpoints are ready.",
        "main_endpoint": "POST /predict",
        "other_endpoints": [
            "POST /kundli",
            "POST /panchang/today",
            "POST /moon-phase/today",
            "POST /dasha",
            "POST /transit",
            "POST /alerts",
            "POST /muhurat",
            "POST /reading",
        ],
        "required_fields_for_birth_routes": ["name", "dob", "tob", "place"],
    }


@router.post("/predict")
def predict_horoscope(payload: HoroscopeRequest) -> Dict[str, Any]:
    bundle = _compute_birth_bundle(payload)

    score, strengths, growth = astro.derive_profile_scorecard(bundle["planet_data"])
    remedy_planets = astro.get_priority_planets_for_remedy(bundle["planet_data"])
    birth_panchang = astro.get_panchang_details(bundle["jd_birth"])

    now_local = datetime.now(bundle["timezone_obj"])
    now_utc = now_local.astimezone(astro.pytz.utc)
    jd_now = _to_julian_day(now_utc)
    today_panchang = astro.get_panchang_details(jd_now)
    moon_phase, illumination, elongation = astro.get_moon_phase_details(
        today_panchang["moon_lon"],
        today_panchang["sun_lon"],
    )

    moon_lon_birth = float(bundle["planet_data"]["Chandra (Moon)"]["longitude"])
    dasha_payload = _build_dasha_payload(now_local, bundle["dt_local"], moon_lon_birth)
    transit_snapshot = _build_transit_snapshot(bundle["planet_data"], jd_now)

    if payload.include_ai_reading:
        personalized_reading = astro.generate_personalized_text(payload.topic, bundle["chart_context"])
    else:
        personalized_reading = astro.get_fallback_text(payload.topic, bundle["chart_context"])

    upcoming_alerts = _collect_vrat_alerts(payload.alert_days, bundle["timezone_obj"])
    shubh_muhurats = _collect_shubh_muhurats(min(payload.alert_days, 14), bundle["timezone_obj"])

    return {
        "input": {
            "name": payload.name,
            "dob": payload.dob,
            "tob": payload.tob,
            "place": payload.place,
            "topic": payload.topic,
        },
        "location": _location_payload(bundle["location"], bundle["timezone_name"]),
        "lagna": {
            "rashi": bundle["lagna_rashi"],
            "degree_in_rashi": round(float(bundle["lagna_deg"]), 2),
        },
        "planet_positions": bundle["planet_data"],
        "scorecard": {
            "score": int(score),
            "strengths": strengths,
            "growth_areas": growth,
        },
        "panchang": {
            "birth": _sanitize_panchang(birth_panchang),
            "today": _sanitize_panchang(today_panchang),
        },
        "moon_phase": {
            "phase": moon_phase,
            "illumination_percent": round(float(illumination), 2),
            "sun_moon_angle": round(float(elongation), 2),
        },
        "dasha": dasha_payload,
        "transit_snapshot": transit_snapshot,
        "remedies": {
            "priority_planets": remedy_planets,
            "mantras": {planet: astro.PLANET_MANTRAS.get(planet) for planet in remedy_planets},
        },
        "upcoming_vrat_alerts": upcoming_alerts,
        "shubh_muhurat_windows": shubh_muhurats,
        "reading": {
            "topic": payload.topic,
            "ai_enabled": payload.include_ai_reading,
            "text": personalized_reading,
        },
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


@router.post("/kundli")
def generate_kundli(payload: BirthBaseRequest) -> Dict[str, Any]:
    bundle = _compute_birth_bundle(payload)
    score, strengths, growth = astro.derive_profile_scorecard(bundle["planet_data"])
    birth_panchang = astro.get_panchang_details(bundle["jd_birth"])

    return {
        "input": {
            "name": payload.name,
            "dob": payload.dob,
            "tob": payload.tob,
            "place": payload.place,
        },
        "location": _location_payload(bundle["location"], bundle["timezone_name"]),
        "lagna": {
            "rashi": bundle["lagna_rashi"],
            "degree_in_rashi": round(float(bundle["lagna_deg"]), 2),
        },
        "planet_positions": bundle["planet_data"],
        "birth_panchang": _sanitize_panchang(birth_panchang),
        "scorecard": {
            "score": int(score),
            "strengths": strengths,
            "growth_areas": growth,
        },
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


@router.post("/panchang/today")
def get_today_panchang(payload: PlaceDateRequest) -> Dict[str, Any]:
    location, timezone_name, timezone_obj = _resolve_location_timezone(payload.place)
    target_day = _parse_date_or_today(payload.date, timezone_obj)

    local_noon = timezone_obj.localize(datetime(target_day.year, target_day.month, target_day.day, 12, 0, 0))
    jd_target = _to_julian_day(local_noon.astimezone(astro.pytz.utc))

    details = astro.get_panchang_details(jd_target)
    moon_phase, illumination, elongation = astro.get_moon_phase_details(details["moon_lon"], details["sun_lon"])

    return {
        "date": target_day.isoformat(),
        "location": _location_payload(location, timezone_name),
        "panchang": _sanitize_panchang(details),
        "moon_phase": {
            "phase": moon_phase,
            "illumination_percent": round(float(illumination), 2),
            "sun_moon_angle": round(float(elongation), 2),
        },
    }


@router.post("/moon-phase/today")
def get_moon_phase_today(payload: PlaceDateRequest) -> Dict[str, Any]:
    location, timezone_name, timezone_obj = _resolve_location_timezone(payload.place)
    target_day = _parse_date_or_today(payload.date, timezone_obj)

    local_noon = timezone_obj.localize(datetime(target_day.year, target_day.month, target_day.day, 12, 0, 0))
    jd_target = _to_julian_day(local_noon.astimezone(astro.pytz.utc))
    details = astro.get_panchang_details(jd_target)
    phase, illumination, elongation = astro.get_moon_phase_details(details["moon_lon"], details["sun_lon"])

    return {
        "date": target_day.isoformat(),
        "location": _location_payload(location, timezone_name),
        "moon_phase": {
            "phase": phase,
            "illumination_percent": round(float(illumination), 2),
            "sun_moon_angle": round(float(elongation), 2),
            "tithi": details["tithi_name"],
            "paksha": details["paksha"],
        },
    }


@router.post("/dasha")
def get_dasha_snapshot(payload: BirthBaseRequest) -> Dict[str, Any]:
    bundle = _compute_birth_bundle(payload)
    now_local = datetime.now(bundle["timezone_obj"])
    moon_lon_birth = float(bundle["planet_data"]["Chandra (Moon)"]["longitude"])
    dasha_payload = _build_dasha_payload(now_local, bundle["dt_local"], moon_lon_birth)

    return {
        "input": {
            "name": payload.name,
            "dob": payload.dob,
            "tob": payload.tob,
            "place": payload.place,
        },
        "location": _location_payload(bundle["location"], bundle["timezone_name"]),
        "dasha": dasha_payload,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


@router.post("/transit")
def get_transit_snapshot(payload: BirthBaseRequest) -> Dict[str, Any]:
    bundle = _compute_birth_bundle(payload)
    now_local = datetime.now(bundle["timezone_obj"])
    now_utc = now_local.astimezone(astro.pytz.utc)
    jd_now = _to_julian_day(now_utc)
    transit_snapshot = _build_transit_snapshot(bundle["planet_data"], jd_now)

    return {
        "input": {
            "name": payload.name,
            "dob": payload.dob,
            "tob": payload.tob,
            "place": payload.place,
        },
        "location": _location_payload(bundle["location"], bundle["timezone_name"]),
        "transit_snapshot": transit_snapshot,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


@router.post("/alerts")
def get_vrat_alerts(payload: AlertsRequest) -> Dict[str, Any]:
    location, timezone_name, timezone_obj = _resolve_location_timezone(payload.place)
    alerts = _collect_vrat_alerts(payload.days_ahead, timezone_obj)

    return {
        "location": _location_payload(location, timezone_name),
        "days_ahead": payload.days_ahead,
        "alerts_count": len(alerts),
        "alerts": alerts,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


@router.post("/muhurat")
def get_shubh_muhurat(payload: MuhuratRequest) -> Dict[str, Any]:
    location, timezone_name, timezone_obj = _resolve_location_timezone(payload.place)
    windows = _collect_shubh_muhurats(payload.days_ahead, timezone_obj)

    return {
        "location": _location_payload(location, timezone_name),
        "days_ahead": payload.days_ahead,
        "total_windows": len(windows),
        "windows": windows,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


@router.post("/reading")
def get_personalized_reading(payload: ReadingRequest) -> Dict[str, Any]:
    bundle = _compute_birth_bundle(payload)
    score, strengths, growth = astro.derive_profile_scorecard(bundle["planet_data"])

    if payload.include_ai_reading:
        reading_text = astro.generate_personalized_text(payload.topic, bundle["chart_context"])
    else:
        reading_text = astro.get_fallback_text(payload.topic, bundle["chart_context"])

    return {
        "input": {
            "name": payload.name,
            "dob": payload.dob,
            "tob": payload.tob,
            "place": payload.place,
            "topic": payload.topic,
        },
        "location": _location_payload(bundle["location"], bundle["timezone_name"]),
        "scorecard": {
            "score": int(score),
            "strengths": strengths,
            "growth_areas": growth,
        },
        "reading": {
            "topic": payload.topic,
            "ai_enabled": payload.include_ai_reading,
            "text": reading_text,
        },
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }