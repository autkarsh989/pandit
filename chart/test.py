import json
import os
import sys
import urllib.error
import urllib.request

from dotenv import load_dotenv


def main() -> int:
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("Missing GEMINI_API_KEY or GOOGLE_API_KEY in environment.")
        return 1

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    api_url = os.getenv(
        "GEMINI_API_URL",
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
    )

    payload = {
        "contents": [{"parts": [{"text": "Say hello in one sentence."}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 32,
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
        with urllib.request.urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
            print(f"HTTP {response.status}")
            print(raw[:800])
            return 0
    except urllib.error.HTTPError as exc:
        print(f"HTTPError {exc.code}")
        try:
            print(exc.read().decode("utf-8")[:800])
        except Exception:
            print("No response body")
        return 2
    except urllib.error.URLError as exc:
        print(f"URLError {exc}")
        return 3


if __name__ == "__main__":
    sys.exit(main())
