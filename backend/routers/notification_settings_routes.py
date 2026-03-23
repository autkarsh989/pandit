import json
import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_admin, get_db

router = APIRouter()

DEFAULT_SEND_TIMES = ["05:00", "10:00", "17:00"]
TIME_PATTERN = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _normalize_times(send_times: list[str]) -> list[str]:
    cleaned = []
    for raw_time in send_times:
        value = (raw_time or "").strip()
        if not TIME_PATTERN.match(value):
            raise HTTPException(status_code=400, detail=f"Invalid time format: {raw_time}. Use HH:MM")
        cleaned.append(value)

    unique_sorted = sorted(set(cleaned))
    if not unique_sorted:
        raise HTTPException(status_code=400, detail="At least one notification time is required")

    return unique_sorted


def _get_or_create_schedule(db: Session) -> models.NotificationSchedule:
    schedule = db.query(models.NotificationSchedule).first()
    if schedule:
        return schedule

    schedule = models.NotificationSchedule(send_times=json.dumps(DEFAULT_SEND_TIMES))
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


def _parse_send_times(raw_json: str | None) -> list[str]:
    if not raw_json:
        return DEFAULT_SEND_TIMES

    try:
        parsed = json.loads(raw_json)
        if not isinstance(parsed, list):
            return DEFAULT_SEND_TIMES
        as_strings = [item for item in parsed if isinstance(item, str)]
        normalized = _normalize_times(as_strings)
        return normalized or DEFAULT_SEND_TIMES
    except Exception:
        return DEFAULT_SEND_TIMES


@router.get("/notification-settings", response_model=schemas.NotificationScheduleResponse)
def get_notification_settings(db: Session = Depends(get_db)):
    """Public endpoint consumed by mobile app to fetch notification send times."""
    schedule = _get_or_create_schedule(db)
    return schemas.NotificationScheduleResponse(
        send_times=_parse_send_times(schedule.send_times),
        updated_by=schedule.updated_by,
        updated_at=schedule.updated_at or datetime.utcnow(),
    )


@router.get("/admin/notification-settings", response_model=schemas.NotificationScheduleResponse)
def get_admin_notification_settings(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Admin-only endpoint to view current notification schedule."""
    schedule = _get_or_create_schedule(db)
    return schemas.NotificationScheduleResponse(
        send_times=_parse_send_times(schedule.send_times),
        updated_by=schedule.updated_by,
        updated_at=schedule.updated_at or datetime.utcnow(),
    )


@router.put("/admin/notification-settings", response_model=schemas.NotificationScheduleResponse)
def update_notification_settings(
    payload: schemas.NotificationScheduleUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Admin-only endpoint to update daily notification times."""
    normalized = _normalize_times(payload.send_times)

    schedule = _get_or_create_schedule(db)
    schedule.send_times = json.dumps(normalized)
    schedule.updated_by = admin.id

    db.commit()
    db.refresh(schedule)

    return schemas.NotificationScheduleResponse(
        send_times=normalized,
        updated_by=schedule.updated_by,
        updated_at=schedule.updated_at or datetime.utcnow(),
    )
