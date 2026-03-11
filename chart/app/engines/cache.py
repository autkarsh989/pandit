from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any, Dict

CACHE_DIR = Path(__file__).resolve().parents[2] / "data"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

TODAY_CACHE = CACHE_DIR / "cache_today.json"
FESTIVAL_CACHE = CACHE_DIR / "cache_festivals.json"


def read_cache(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def write_cache(path: Path, payload: Dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def cache_stamp() -> str:
    return date.today().isoformat()
