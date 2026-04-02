from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any, Dict


def _build_prompt(report: Dict[str, Any]) -> str:
    payload = json.dumps(report, ensure_ascii=True, indent=2, sort_keys=True)
    return (
        "Create a beautiful, well-structured HTML report using ONLY the data provided.\n"
        "Rules:\n"
        "- Output HTML only. No markdown, no code fences.\n"
        "- Do not invent or assume missing data. If something is missing, write 'Not provided'.\n"
        "- Target 400-650 words.\n"
        "- No <style> or <script> tags.\n"
        "- Use this structure and class names:\n"
        "  <div class=\"llm-report\">\n"
        "    <section class=\"llm-hero\">...</section>\n"
        "    <section class=\"llm-grid\">...use <div class=\"llm-card\"> for each card...</section>\n"
        "    <section class=\"llm-details\">...lists...</section>\n"
        "    <section class=\"llm-guidance\">...best times, remedies...</section>\n"
        "    <section class=\"llm-footer\">...short closing...</section>\n"
        "  </div>\n"
        "Content requirements (must include all):\n"
        "- Hero: date, moon sign, ascendant (if present), overall quality.\n"
        "- Grid cards (5-8): mulank, panchang tithi/nakshatra/yoga, best time, gemstone, dasha/antardasha.\n"
        "- Details: kundali summary, transit summary, top 5 aspects (angle + orb), dosha hints.\n"
        "- Guidance: muhurat slots, remedies, prosperity tips, avoid list.\n"
        "Make it feel premium, calm, and insightful. Tie every insight directly to the data.\n"
        "Data JSON:\n"
        f"{payload}\n"
    )


def _sanitize_html(html: str) -> str:
    lowered = html.lower()
    if "<script" in lowered or "<style" in lowered:
        html = html.replace("<script", "&lt;script").replace("<style", "&lt;style")
    return html


def generate_llm_report(report: Dict[str, Any]) -> Dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return {"html": "", "error": "Missing GEMINI_API_KEY or GOOGLE_API_KEY"}

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    temperature = float(os.getenv("GEMINI_TEMPERATURE", "0.6"))
    max_tokens = int(os.getenv("GEMINI_MAX_TOKENS", "900"))
    api_url = os.getenv(
        "GEMINI_API_URL",
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    )

    payload = {
        "contents": [{"parts": [{"text": _build_prompt(report)}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        },
    }

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        api_url,
        data=body,
        headers={
            "x-goog-api-key": api_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            body = exc.read().decode("utf-8")
            detail = body[:500]
        except Exception:
            detail = ""
        message = f"GEMINI HTTP {exc.code}"
        if detail:
            message = f"{message}: {detail}"
        return {"html": "", "error": message}
    except urllib.error.URLError:
        return {"html": "", "error": "GEMINI connection failed"}

    content = ""
    candidates = data.get("candidates") or []
    if candidates:
        parts = candidates[0].get("content", {}).get("parts", []) or []
        if parts:
            content = parts[0].get("text", "") or ""

    html = _sanitize_html(content.strip())
    return {"html": html, "model": model, "error": ""}
