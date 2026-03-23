import json
import os
import random
from typing import List

from fastapi import APIRouter, HTTPException, Query
from litellm import completion

router = APIRouter(prefix="/quotes", tags=["Quotes"])

GEMINI_MODEL = "gemini/gemini-2.5-flash"

FALLBACK_QUOTES = [
    "Small steps done daily create big results over time.",
    "Calm mind, clear plan, consistent action.",
    "Discipline beats motivation when days get difficult.",
    "Your focus decides the direction of your day.",
    "Done is better than delayed perfection.",
    "Protect your energy, then invest it with purpose.",
    "A thoughtful pause can save hours of confusion.",
    "Progress grows where attention goes.",
    "Strong habits build silent confidence.",
    "You do not need speed, you need consistency.",
    "Respect your time and others will too.",
    "Gratitude keeps ambition healthy.",
    "A clear morning creates a better evening.",
    "Keep promises made to yourself.",
    "One brave decision can change your week.",
    "Let your actions speak before your words do.",
    "When uncertain, choose the next useful step.",
    "Patience and persistence are a powerful pair.",
    "Clarity appears after you start, not before.",
    "Your daily routine is your long-term strategy.",
    "Kindness and boundaries can exist together.",
    "Rest is preparation, not laziness.",
    "Quiet work often creates loud outcomes.",
    "Every reset is a new chance to lead yourself well.",
    "Stay teachable, stay adaptable, stay moving.",
    "The best time to simplify is now.",
    "One completed task reduces future stress.",
    "Confidence grows by keeping small commitments.",
    "Protect your morning from unnecessary noise.",
    "A steady effort outlasts a sudden burst.",
]


def _clean_quotes(raw_quotes: List[str], count: int) -> List[str]:
    cleaned: List[str] = []
    seen = set()

    for quote in raw_quotes:
        text = (quote or "").strip().replace("\n", " ")
        text = " ".join(text.split())
        if len(text) < 20:
            continue
        lowered = text.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        cleaned.append(text)
        if len(cleaned) >= count:
            break

    return cleaned


def _build_fallback_quotes(count: int) -> List[str]:
    sampled = FALLBACK_QUOTES.copy()
    random.shuffle(sampled)
    if len(sampled) >= count:
        return sampled[:count]

    result = sampled
    while len(result) < count:
        result.append(random.choice(FALLBACK_QUOTES))
    return result


def _generate_quotes_with_ai(count: int) -> List[str]:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key is not configured on server")

    prompt = (
        "Generate motivational quotes for mobile push notifications. "
        f"Return exactly {count} unique quotes as a strict JSON array of strings. "
        "Each quote must be 8-18 words, practical, positive, and easy to read. "
        "No markdown, no numbering, no emojis, no hashtags."
    )

    response = completion(
        model=GEMINI_MODEL,
        api_key=api_key,
        messages=[
            {"role": "system", "content": "You create short motivational quotes."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.8,
        max_tokens=700,
    )

    content = (response.choices[0].message.content or "").strip()

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        start = content.find("[")
        end = content.rfind("]")
        if start == -1 or end == -1 or end <= start:
            raise HTTPException(status_code=500, detail="AI returned non-JSON response")
        parsed = json.loads(content[start : end + 1])

    if not isinstance(parsed, list):
        raise HTTPException(status_code=500, detail="AI did not return a quote list")

    string_quotes = [item for item in parsed if isinstance(item, str)]
    cleaned = _clean_quotes(string_quotes, count)
    if len(cleaned) < count:
        raise HTTPException(status_code=500, detail="AI returned insufficient usable quotes")
    return cleaned


@router.get("/daily")
def get_daily_quotes(count: int = Query(default=20, ge=1, le=50)):
    try:
        quotes = _generate_quotes_with_ai(count)
        return {
            "quotes": quotes,
            "count": len(quotes),
            "source": "ai",
        }
    except Exception:
        fallback_quotes = _build_fallback_quotes(count)
        return {
            "quotes": fallback_quotes,
            "count": len(fallback_quotes),
            "source": "fallback",
        }
