from __future__ import annotations

from typing import Dict, List


GEMSTONE_BY_SIGN = {
    "Aries": "Red Coral",
    "Taurus": "Diamond",
    "Gemini": "Emerald",
    "Cancer": "Pearl",
    "Leo": "Ruby",
    "Virgo": "Emerald",
    "Libra": "Diamond",
    "Scorpio": "Red Coral",
    "Sagittarius": "Yellow Sapphire",
    "Capricorn": "Blue Sapphire",
    "Aquarius": "Blue Sapphire",
    "Pisces": "Yellow Sapphire",
}

GEMSTONE_CAUTION = {
    "Saturn": ["Ruby", "Pearl"],
    "Rahu": ["Pearl", "Ruby"],
    "Ketu": ["Diamond", "Blue Sapphire"],
}

REMEDIES = {
    "Sun": ["Offer water to the Sun at sunrise", "Recite Gayatri mantra 11 times"],
    "Moon": ["Drink water from a silver cup", "Spend quiet time near water"],
    "Mars": ["Avoid anger triggers", "Do a short workout for grounding"],
    "Mercury": ["Write your top 3 priorities", "Speak with clarity and kindness"],
    "Jupiter": ["Study or teach for 15 minutes", "Donate yellow food"],
    "Venus": ["Wear clean/light colors", "Offer sweets to someone"],
    "Saturn": ["Be punctual in work", "Help someone elderly"],
    "Rahu": ["Avoid overindulgence", "Meditate 10 minutes"],
    "Ketu": ["Simplify your schedule", "Do a short prayer"],
}

NAKSHATRA_THEMES = {
    "Ashwini": "quick action",
    "Bharani": "transformation",
    "Krittika": "clarity",
    "Rohini": "growth",
    "Mrigashirsha": "curiosity",
    "Ardra": "release",
    "Punarvasu": "renewal",
    "Pushya": "nourishment",
    "Ashlesha": "intuition",
    "Magha": "leadership",
    "Purva Phalguni": "joy",
    "Uttara Phalguni": "stability",
    "Hasta": "skill",
    "Chitra": "design",
    "Swati": "independence",
    "Vishakha": "determination",
    "Anuradha": "connection",
    "Jyeshtha": "influence",
    "Mula": "deep work",
    "Purva Ashadha": "victory",
    "Uttara Ashadha": "endurance",
    "Shravana": "learning",
    "Dhanishta": "visibility",
    "Shatabhisha": "healing",
    "Purva Bhadrapada": "focus",
    "Uttara Bhadrapada": "grounding",
    "Revati": "completion",
}


def _best_time(guidance: Dict[str, object]) -> str:
    choghadiya = guidance.get("choghadiya") or []
    for slot in choghadiya:
        if slot.get("type") in {"Amrit", "Shubh"}:
            return slot.get("range", guidance.get("abhijit_muhurat", "12:00 PM - 12:40 PM"))
    return guidance.get("abhijit_muhurat", "12:00 PM - 12:40 PM")


def _mulank_traits(mulank: int) -> Dict[str, str]:
    traits = {
        1: "leadership",
        2: "empathy",
        3: "communication",
        4: "discipline",
        5: "adaptability",
        6: "responsibility",
        7: "analysis",
        8: "ambition",
        9: "service",
    }
    return {"theme": traits.get(mulank, "balance")}


def predict_day(
    kundali: Dict[str, str],
    mulank: int,
    panchang: Dict[str, str],
    guidance: Dict[str, object],
    transit: Dict[str, object],
    dasha: Dict[str, object],
    antardasha: Dict[str, object],
    aspects: Dict[str, object],
    muhurat: Dict[str, str],
    dosha_flags: Dict[str, bool],
) -> Dict[str, object]:
    score = 0

    if panchang.get("tithi") in {"Dwitiya", "Tritiya", "Panchami"}:
        score += 2
    if panchang.get("yoga") in {"Shubha", "Shukla", "Siddhi"}:
        score += 1
    if mulank in {1, 3, 5}:
        score += 1
    if kundali.get("moon_sign") in {"Leo", "Sagittarius", "Aries"}:
        score += 2

    moon_sign = kundali.get("moon_sign", "Aries")
    asc_sign = kundali.get("ascendant_sign") or "Aries"
    nakshatra = kundali.get("nakshatra") or "Rohini"

    if score >= 4:
        quality = "Very good"
        recommendation = "Great day for launches, meetings, and important decisions."
        avoid = ["Procrastination", "Overthinking"]
        day_outlook = "Momentum is high and results come faster than expected."
    elif score >= 2:
        quality = "Balanced"
        recommendation = "Normal day. Focus on steady progress and avoid risky moves."
        avoid = ["High-risk investments", "Impulsive arguments"]
        day_outlook = "Progress is steady; small wins compound through the day."
    else:
        quality = "Challenging"
        recommendation = "Slow down. Use the day for planning and reflection."
        avoid = ["Big commitments", "Confrontations"]
        day_outlook = "Energy is mixed; patience will prevent avoidable friction."

    mulank_profile = _mulank_traits(mulank)
    gemstone = GEMSTONE_BY_SIGN.get(moon_sign, "Yellow Sapphire")
    best_time = _best_time(guidance)

    transit_effect = transit.get("effect", "Balanced energy from transits today.")
    house_effect = transit.get("house_effect", "Grounded progress.")
    dasha_lord = dasha.get("mahadasha", "Unknown")
    antar_lord = antardasha.get("antardasha", "Unknown")
    day_outlook = (
        f"{day_outlook} Your Moon sign is {moon_sign}, rising sign is {asc_sign}, "
        f"and your Nakshatra theme leans toward {NAKSHATRA_THEMES.get(nakshatra, 'balance')}. "
        f"Mahadasha: {dasha_lord}, Antardasha: {antar_lord}. "
        f"Transit note: {transit_effect}. House note: {house_effect}"
    )

    good_for_you = [
        f"Activities that use your {mulank_profile['theme']}",
        f"Work that aligns with {NAKSHATRA_THEMES.get(nakshatra, 'steady progress')}",
        "Short, focused sessions instead of multitasking",
    ]

    remedy_focus = REMEDIES.get(dasha_lord, ["Follow a calm routine", "Keep your space tidy"])
    gemstone_caution = GEMSTONE_CAUTION.get(dasha_lord, [])

    prosperity_boosters = [
        f"Start key work during {best_time}",
        "Keep a written to-do list for clarity",
        f"Lean into {mulank_profile['theme']} when making decisions",
    ]

    return {
        "score": score,
        "quality": quality,
        "recommendation": recommendation,
        "day_outlook": day_outlook,
        "best_time": best_time,
        "good_for_you_today": good_for_you,
        "gemstone": gemstone,
        "gemstone_caution": gemstone_caution,
        "remedies": remedy_focus,
        "prosperity_tips": prosperity_boosters,
        "recommended_tasks": [
            "Planning",
            "Learning",
            "Routine work",
        ],
        "avoid": avoid,
        "aspects": aspects,
        "muhurat": muhurat,
        "dosha_flags": dosha_flags,
    }
