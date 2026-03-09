# =========================================================
# 🔮 DIGITAL PANDIT – ADVANCED VEDIC ASTROLOGY ENGINE
# =========================================================

import swisseph as swe
from datetime import datetime, timedelta
import pytz
import json
from geopy.geocoders import Nominatim

swe.set_sid_mode(swe.SIDM_LAHIRI)

# ---------------- CONSTANTS ----------------
RASHI = [
    "Mesha","Vrishabha","Mithuna","Karka","Simha","Kanya",
    "Tula","Vrischika","Dhanu","Makara","Kumbha","Meena"
]

NAKSHATRA = [
    "Ashwini","Bharani","Krittika","Rohini","Mrigashirsha","Ardra",
    "Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni",
    "Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
    "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta",
    "Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"
]

PLANETS = {
    "Sun": swe.SUN,
    "Moon": swe.MOON,
    "Mars": swe.MARS,
    "Mercury": swe.MERCURY,
    "Jupiter": swe.JUPITER,
    "Venus": swe.VENUS,
    "Saturn": swe.SATURN,
    "Rahu": swe.MEAN_NODE
}

DASHA_ORDER = [
    ("Ketu",7),("Venus",20),("Sun",6),("Moon",10),
    ("Mars",7),("Rahu",18),("Jupiter",16),
    ("Saturn",19),("Mercury",17)
]

# ---------------- HELPERS ----------------
def normalize_time(t):
    return t if len(t.split(":")) == 3 else t + ":00"

def get_lat_lon(place):
    g = Nominatim(user_agent="vedic_engine")
    loc = g.geocode(place)
    if not loc:
        raise ValueError("Place not found")
    return loc.latitude, loc.longitude

def julian_day(dob, time):
    tz = pytz.timezone("Asia/Kolkata")
    dt = datetime.strptime(f"{dob} {time}", "%Y-%m-%d %H:%M:%S")
    dt = tz.localize(dt)
    jd = swe.julday(dt.year, dt.month, dt.day,
                    dt.hour + dt.minute/60)
    return jd, dt

# ---------------- NAVAMSA ----------------
def navamsa(lon):
    part = int((lon % 30) // (30/9))
    base = int(lon // 30)
    return RASHI[(base * 9 + part) % 12]

# ---------------- PLANET STRENGTH ----------------
def planet_strength(lon, retro):
    score = 50
    if retro: score += 10
    if lon % 30 < 10: score += 5
    return score

# ---------------- JANMA KUNDLI ----------------
def janma_kundli(dob, time, place):
    lat, lon = get_lat_lon(place)
    time = normalize_time(time)
    jd, dt = julian_day(dob, time)

    lagna = swe.houses(jd, lat, lon)[1][0]
    moon = swe.calc_ut(jd, swe.MOON)[0][0]
    sun = swe.calc_ut(jd, swe.SUN)[0][0]

    kundli = {
        "Lagna": RASHI[int(lagna//30)],
        "Chandra Rashi": RASHI[int(moon//30)],
        "Surya Rashi": RASHI[int(sun//30)],
        "Birth Day": dt.strftime("%A"),
        "Panchang": {
            "Tithi": int(((moon - sun) % 360)//12)+1,
            "Nakshatra": NAKSHATRA[int(moon//(13+1/3))]
        },
        "Planets": {}
    }

    for name,pid in PLANETS.items():
        lon_p, speed = swe.calc_ut(jd,pid)[0][0], swe.calc_ut(jd,pid)[0][3]
        kundli["Planets"][name] = {
            "Rashi": RASHI[int(lon_p//30)],
            "House": (int((lon_p-lagna)//30)%12)+1,
            "Nakshatra": NAKSHATRA[int(lon_p//(13+1/3))],
            "Retrograde": speed < 0,
            "Navamsa": navamsa(lon_p),
            "Strength": planet_strength(lon_p, speed<0)
        }

    rahu = swe.calc_ut(jd, swe.MEAN_NODE)[0][0]
    kundli["Planets"]["Ketu"] = {
        "Rashi": RASHI[int((rahu+180)%360//30)],
        "House": ((int((rahu+180-lagna)//30)%12)+1)
    }

    return kundli

# ---------------- HOROSCOPE ----------------
def daily_horoscope(k):
    moon_today = RASHI[int(swe.calc_ut(swe.julday(*datetime.utcnow().timetuple()[:3]), swe.MOON)[0][0]//30)]
    diff = (RASHI.index(moon_today)-RASHI.index(k["Chandra Rashi"]))%12
    quality = "Shubh" if diff in [1,5,9] else "Ashubh" if diff in [6,8] else "Madhyam"

    return {
        "Overall": quality,
        "Career": "Promotion chances" if quality=="Shubh" else "Avoid arguments",
        "Love": "Emotional bonding",
        "Money": "Savings favored" if quality!="Ashubh" else "Unexpected expenses",
        "Health": "Meditation advised"
    }

# ---------------- DOSHA ----------------
    mars_house = k["Planets"]["Mars"]["House"]
    return mars_house in [1,4,7,8,12]
def manglik_dosha(k):
    manglik_houses = [1,2,4,7,8,12]
    mars = k["Planets"]["Mars"]

    checks = {
        "From Lagna": mars["House"],
        "From Moon": ((mars["House"] - k["Planets"]["Moon"]["House"]) % 12) + 1,
        "From Venus": ((mars["House"] - k["Planets"]["Venus"]["House"]) % 12) + 1
    }

    is_manglik = any(h in manglik_houses for h in checks.values())

    # --- Cancellation rules ---
    mars_rashi = mars["Rashi"]
    cancellation = mars_rashi in ["Mesha","Vrischika","Makara"]

    return {
        "Manglik": is_manglik and not cancellation,
        "Details": checks,
        "Cancelled": cancellation
    }
def kaal_sarp_dosha(k):
    rahu = k["Planets"]["Rahu"]["House"]
    ketu = k["Planets"]["Ketu"]["House"]
    return abs(rahu - ketu) == 6

# ---------------- ASTRONOMY ----------------
def moon_phase():
    sun = swe.calc_ut(swe.julday(*datetime.utcnow().timetuple()[:3]), swe.SUN)[0][0]
    moon = swe.calc_ut(swe.julday(*datetime.utcnow().timetuple()[:3]), swe.MOON)[0][0]
    diff = (moon - sun) % 360
    if diff < 90: return "Shukla Paksha"
    if diff < 180: return "Purnima Phase"
    if diff < 270: return "Krishna Paksha"
    return "Amavasya Phase"

# ---------------- MENU LOOP ----------------
def menu():
    print("""
1. View Janma Kundli
2. Today Horoscope
3. Dosha Analysis
4. Planet Strength Report
5. Astronomy Details
6. Export Kundli JSON
7. Exit
""")

# ---------------- MAIN ----------------
def main():
    print("🔮 DIGITAL PANDIT 🔮")
    dob = input("DOB (YYYY-MM-DD): ")
    time = input("Time (HH:MM): ")
    place = input("Place: ")

    kundli = janma_kundli(dob,time,place)

    while True:
        menu()
        ch = input("Choose option: ")

        if ch == "1":
            print(json.dumps(kundli, indent=2))

        elif ch == "2":
            print(daily_horoscope(kundli))

        elif ch == "3":
            print("Manglik Dosha:", manglik_dosha(kundli))
            print("Kaal Sarp Dosha:", kaal_sarp_dosha(kundli))

        elif ch == "4":
            for p in kundli["Planets"]:
                print(p, kundli["Planets"][p].get("Strength"))

        elif ch == "5":
            print("Moon Phase:", moon_phase())

        elif ch == "6":
            with open("kundli.json","w") as f:
                json.dump(kundli,f,indent=2)
            print("Saved as kundli.json")

        elif ch == "7":
            print("🙏 Exit. Dhanyavaad!")
            break

        else:
            print("Invalid choice")

if __name__=="__main__":
    main()