import base64
import hashlib
import hmac
import json
import os
import urllib.error
import urllib.request
from datetime import datetime

import models
from fastapi import HTTPException

import config


def has_razorpay_credentials() -> bool:
    return bool(config.RAZORPAY_KEY_ID and config.RAZORPAY_KEY_SECRET)


def calculate_booking_amount(db, base_price: float) -> float:
    """Mirror the frontend discount rules so the charged amount matches the displayed price."""
    best_price = float(base_price)

    pricing = (
        db.query(models.GlobalPricing)
        .filter(models.GlobalPricing.is_active == True)
        .order_by(models.GlobalPricing.created_at.desc())
        .first()
    )
    if pricing and pricing.discount_percentage and pricing.discount_percentage > 0:
        discounted = base_price * (1 - pricing.discount_percentage / 100)
        best_price = min(best_price, discounted)

    current_time = datetime.now()
    offers = (
        db.query(models.SpecialOffer)
        .filter(
            models.SpecialOffer.is_active == True,
            models.SpecialOffer.start_date <= current_time,
            (models.SpecialOffer.end_date.is_(None)) | (models.SpecialOffer.end_date >= current_time),
            (models.SpecialOffer.max_uses.is_(None))
            | (models.SpecialOffer.current_uses < models.SpecialOffer.max_uses),
            models.SpecialOffer.target_audience.in_(["user", "both"]),
        )
        .all()
    )

    for offer in offers:
        if offer.discount_percentage and offer.discount_percentage > 0:
            discounted = base_price * (1 - offer.discount_percentage / 100)
            best_price = min(best_price, discounted)
        if offer.discount_amount and offer.discount_amount > 0:
            discounted = base_price - offer.discount_amount
            best_price = min(best_price, discounted)

    return max(0.0, round(best_price))


def create_razorpay_order(amount_in_rupees: float, receipt: str, notes: dict | None = None) -> dict:
    if not has_razorpay_credentials():
        raise HTTPException(status_code=503, detail="Razorpay credentials are not configured")

    amount_paise = int(round(float(amount_in_rupees) * 100))
    payload = {
        "amount": amount_paise,
        "currency": config.RAZORPAY_CURRENCY,
        "receipt": receipt,
        "payment_capture": 1,
    }
    if notes:
        payload["notes"] = notes

    auth_token = base64.b64encode(
        f"{config.RAZORPAY_KEY_ID}:{config.RAZORPAY_KEY_SECRET}".encode("utf-8")
    ).decode("utf-8")

    request = urllib.request.Request(
        "https://api.razorpay.com/v1/orders",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Basic {auth_token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        error_body = error.read().decode("utf-8", errors="ignore")
        raise HTTPException(
            status_code=502,
            detail=f"Razorpay order creation failed: {error_body or error.reason}",
        )
    except urllib.error.URLError as error:
        raise HTTPException(
            status_code=502,
            detail=f"Razorpay order creation failed: {error.reason}",
        )


def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    if not has_razorpay_credentials():
        return False

    payload = f"{order_id}|{payment_id}".encode("utf-8")
    expected = hmac.new(
        config.RAZORPAY_KEY_SECRET.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)