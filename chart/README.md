# Astro Daily System

FastAPI backend + HTML/CSS/JS frontend that calculates Kundali, Mulank, Panchang, time guidance, and monthly festivals. It auto-updates the daily cache once per day and serves a single-page UI.

## Run

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Then open `http://127.0.0.1:8000`.

## API

- `GET /api/today` – cached daily Panchang + festivals
- `GET /api/festivals` – monthly festival cache
- `POST /api/report` – personalized report
- `POST /api/refresh` – force daily cache refresh

## Notes

- Swiss Ephemeris is used for astronomy. If it is unavailable, the system falls back to safe defaults.
- Daily cache refresh runs at 4:00 AM server time.
- Local time calculations use `timezonefinder` to convert sunrise/sunset to the user's timezone.
