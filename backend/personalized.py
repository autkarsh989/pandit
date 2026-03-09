import swisseph as swe
import pytz
import os
import re
import math
import json
from datetime import datetime, timedelta
from geopy.geocoders import Nominatim
from timezonefinder import TimezoneFinder
from litellm import completion

# PDF Generation imports
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas

# =======================
# ASTRO SETTINGS
# =======================
swe.set_sid_mode(swe.SIDM_LAHIRI)

RASHIS = [
    "Aries (Mesh)", "Taurus (Vrishabh)", "Gemini (Mithun)",
    "Cancer (Karka)", "Leo (Singh)", "Virgo (Kanya)",
    "Libra (Tula)", "Scorpio (Vrishchik)", "Sagittarius (Dhanu)",
    "Capricorn (Makar)", "Aquarius (Kumbh)", "Pisces (Meen)"
]

NAKSHATRAS = [
    "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra",
    "Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni",
    "Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
    "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta",
    "Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"
]

PLANETS = {
    "Surya (Sun)": swe.SUN,
    "Chandra (Moon)": swe.MOON,
    "Mangal (Mars)": swe.MARS,
    "Budh (Mercury)": swe.MERCURY,
    "Guru (Jupiter)": swe.JUPITER,
    "Shukra (Venus)": swe.VENUS,
    "Shani (Saturn)": swe.SATURN,
    "Rahu": swe.MEAN_NODE
}

HOUSE_MEANINGS = {
    1:"Personality",2:"Wealth",3:"Courage",4:"Home",5:"Education",
    6:"Enemies",7:"Marriage",8:"Transformation",9:"Luck",
    10:"Career",11:"Income",12:"Loss & Moksha"
}

TITHIS = [
    "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
    "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
    "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima/Amavasya"
]

YOGAS = [
    "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma",
    "Dhriti", "Shoola", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
    "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha",
    "Shukla", "Brahma", "Indra", "Vaidhriti"
]

KARANAS = [
    "Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti"
]

GEMINI_MODEL = "gemini/gemini-2.5-flash"

VIMSHOTTARI_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
VIMSHOTTARI_YEARS = {
    "Ketu": 7,
    "Venus": 20,
    "Sun": 6,
    "Moon": 10,
    "Mars": 7,
    "Rahu": 18,
    "Jupiter": 16,
    "Saturn": 19,
    "Mercury": 17
}
TOTAL_VIMSHOTTARI_YEARS = 120
AUSPICIOUS_NAKSHATRAS = {
    "Rohini", "Mrigashira", "Punarvasu", "Pushya", "Hasta", "Anuradha",
    "Shravana", "Revati", "Uttara Phalguni", "Uttara Ashadha", "Uttara Bhadrapada"
}
RASHI_FOCUS = {
    "Aries (Mesh)": "bold action", "Taurus (Vrishabh)": "money stability", "Gemini (Mithun)": "communication",
    "Cancer (Karka)": "home and emotions", "Leo (Singh)": "leadership", "Virgo (Kanya)": "planning and execution",
    "Libra (Tula)": "relationships and balance", "Scorpio (Vrishchik)": "deep transformation", "Sagittarius (Dhanu)": "learning",
    "Capricorn (Makar)": "career discipline", "Aquarius (Kumbh)": "network and ideas", "Pisces (Meen)": "intuition and healing"
}
PLANET_MANTRAS = {
    "Surya (Sun)": "ॐ सूर्याय नमः (Om Suryaya Namah)",
    "Chandra (Moon)": "ॐ सोमाय नमः (Om Somaya Namah)",
    "Mangal (Mars)": "ॐ अं अंगारकाय नमः (Om Angarakaya Namah)",
    "Budh (Mercury)": "ॐ बुं बुधाय नमः (Om Budhaya Namah)",
    "Guru (Jupiter)": "ॐ बृं बृहस्पतये नमः (Om Brihaspataye Namah)",
    "Shukra (Venus)": "ॐ शुक्राय नमः (Om Shukraya Namah)",
    "Shani (Saturn)": "ॐ शं शनैश्चराय नमः (Om Shanicharaya Namah)",
    "Rahu": "ॐ राहवे नमः (Om Rahave Namah)",
    "Ketu": "ॐ केतवे नमः (Om Ketave Namah)",
}

# =======================
# HELPER FUNCTIONS
# =======================
def deg_to_rashi(deg):
    return RASHIS[int(deg // 30)], deg % 30

def get_nakshatra(deg):
    n = int(deg // (13 + 1/3))
    pada = int((deg % (13 + 1/3)) // (3 + 1/3)) + 1
    return NAKSHATRAS[n], pada

def get_house(lon, cusps):
    for i in range(12):
        s, e = cusps[i], cusps[(i + 1) % 12]
        if s < e and s <= lon < e:
            return i + 1
        if s > e and (lon >= s or lon < e):
            return i + 1
    return None

def normalize_angle(deg):
    return deg % 360

def get_tithi_paksha(moon_lon, sun_lon):
    diff = normalize_angle(moon_lon - sun_lon)
    tithi_number = int(diff // 12) + 1
    paksha = "Shukla Paksha" if diff < 180 else "Krishna Paksha"
    tithi_name = TITHIS[(tithi_number - 1) % 15]
    return tithi_number, tithi_name, paksha

def get_yoga(moon_lon, sun_lon):
    yoga_index = int(normalize_angle(moon_lon + sun_lon) // (13 + 1/3))
    return YOGAS[yoga_index]

def get_karana(moon_lon, sun_lon):
    diff = normalize_angle(moon_lon - sun_lon)
    karana_index = int(diff // 6)
    if karana_index == 0:
        return "Kimstughna"
    if 57 <= karana_index <= 59:
        fixed = ["Shakuni", "Chatushpada", "Naga"]
        return fixed[karana_index - 57]
    return KARANAS[(karana_index - 1) % 7]

def get_panchang_details(jd):
    sun_lon = swe.calc_ut(jd, swe.SUN)[0][0]
    moon_lon = swe.calc_ut(jd, swe.MOON)[0][0]
    moon_nakshatra, moon_pada = get_nakshatra(moon_lon)
    tithi_number, tithi_name, paksha = get_tithi_paksha(moon_lon, sun_lon)
    yoga_name = get_yoga(moon_lon, sun_lon)
    karana_name = get_karana(moon_lon, sun_lon)

    return {
        "tithi_number": tithi_number,
        "tithi_name": tithi_name,
        "paksha": paksha,
        "nakshatra": moon_nakshatra,
        "pada": moon_pada,
        "yoga": yoga_name,
        "karana": karana_name,
        "sun_lon": sun_lon,
        "moon_lon": moon_lon,
    }

def get_moon_phase_details(moon_lon, sun_lon):
    elongation = normalize_angle(moon_lon - sun_lon)
    illumination = ((1 - math.cos(math.radians(elongation))) / 2) * 100

    if elongation < 22.5 or elongation >= 337.5:
        phase = "New Moon"
    elif elongation < 67.5:
        phase = "Waxing Crescent"
    elif elongation < 112.5:
        phase = "First Quarter"
    elif elongation < 157.5:
        phase = "Waxing Gibbous"
    elif elongation < 202.5:
        phase = "Full Moon"
    elif elongation < 247.5:
        phase = "Waning Gibbous"
    elif elongation < 292.5:
        phase = "Last Quarter"
    else:
        phase = "Waning Crescent"

    return phase, illumination, elongation

def get_vrat_festival_tags(tithi_number, paksha):
    tags = []

    if tithi_number == 11:
        tags.append(f"{paksha} Ekadashi Vrat")
    if tithi_number == 13:
        tags.append(f"{paksha} Pradosh Vrat")
    if tithi_number == 14 and paksha == "Krishna Paksha":
        tags.append("Masik Shivratri")
    if tithi_number == 4 and paksha == "Krishna Paksha":
        tags.append("Sankashti Chaturthi")
    if tithi_number == 4 and paksha == "Shukla Paksha":
        tags.append("Vinayaki Chaturthi")
    if tithi_number == 15 and paksha == "Shukla Paksha":
        tags.append("Purnima")
    if tithi_number == 30 and paksha == "Krishna Paksha":
        tags.append("Amavasya")

    return tags

def collect_upcoming_alerts(days_ahead=30):
    now_local = datetime.now(tz)
    alerts = []

    for day_offset in range(days_ahead + 1):
        target_local = (now_local + timedelta(days=day_offset)).replace(
            hour=12, minute=0, second=0, microsecond=0
        )
        target_utc = target_local.astimezone(pytz.utc)
        jd_target = swe.julday(
            target_utc.year, target_utc.month, target_utc.day,
            target_utc.hour + target_utc.minute / 60 + target_utc.second / 3600
        )

        details = get_panchang_details(jd_target)
        tags = get_vrat_festival_tags(details["tithi_number"], details["paksha"])

        if tags:
            alerts.append({
                "day_offset": day_offset,
                "target_local": target_local,
                "details": details,
                "tags": tags,
            })

    return alerts

def get_nakshatra_lord(nakshatra_index):
    return VIMSHOTTARI_ORDER[nakshatra_index % 9]

def rotate_vimshottari(start_lord):
    start_idx = VIMSHOTTARI_ORDER.index(start_lord)
    return VIMSHOTTARI_ORDER[start_idx:] + VIMSHOTTARI_ORDER[:start_idx]

def get_current_vimshottari(now_local, birth_local, moon_lon_birth):
    nakshatra_span = 13 + 1/3
    nak_index = int(moon_lon_birth // nakshatra_span)
    birth_lord = get_nakshatra_lord(nak_index)

    used_in_nak = (moon_lon_birth % nakshatra_span) / nakshatra_span
    balance_years = VIMSHOTTARI_YEARS[birth_lord] * (1 - used_in_nak)

    elapsed_days = (now_local - birth_local).total_seconds() / (24 * 3600)
    elapsed_years = elapsed_days / 365.2425

    order = rotate_vimshottari(birth_lord)
    segments = [(birth_lord, balance_years)]
    for lord in order[1:]:
        segments.append((lord, float(VIMSHOTTARI_YEARS[lord])))

    cycle_index = 0
    remaining = elapsed_years
    while True:
        for lord, years in segments:
            if remaining <= years:
                return lord, remaining, years, cycle_index, elapsed_years
            remaining -= years
        cycle_index += 1

def get_antardasha(mahadasa_lord, elapsed_in_mahadasha):
    mahadasa_years = VIMSHOTTARI_YEARS[mahadasa_lord]
    sequence = rotate_vimshottari(mahadasa_lord)

    remaining = elapsed_in_mahadasha
    for sub_lord in sequence:
        sub_years = mahadasa_years * (VIMSHOTTARI_YEARS[sub_lord] / TOTAL_VIMSHOTTARI_YEARS)
        if remaining <= sub_years:
            return sub_lord, remaining, sub_years
        remaining -= sub_years

    last = sequence[-1]
    last_years = mahadasa_years * (VIMSHOTTARI_YEARS[last] / TOTAL_VIMSHOTTARI_YEARS)
    return last, last_years, last_years

def get_priority_planets_for_remedy(planet_data):
    challenge_houses = {6, 8, 12}
    high_impact = []

    for p_name, p_data in planet_data.items():
        score = 0
        if p_data["house"] in challenge_houses:
            score += 2
        if p_data["retro"]:
            score += 1
        if p_name in {"Shani (Saturn)", "Rahu", "Ketu"}:
            score += 1
        high_impact.append((score, p_name))

    high_impact.sort(reverse=True)
    selected = [p for score, p in high_impact if score > 0][:3]
    if not selected:
        selected = ["Guru (Jupiter)", "Chandra (Moon)"]
    return selected

def derive_profile_scorecard(planet_data):
    kendra = {1, 4, 7, 10}
    trikon = {1, 5, 9}
    benefics = ["Guru (Jupiter)", "Shukra (Venus)", "Budh (Mercury)"]

    score = 50
    strengths = []
    growth = []

    for b in benefics:
        house = planet_data[b]["house"]
        if house in kendra:
            score += 8
            strengths.append(f"{b} in Kendra (House {house})")
        elif house in trikon:
            score += 6
            strengths.append(f"{b} in Trikon (House {house})")

    saturn_house = planet_data["Shani (Saturn)"]["house"]
    mars_house = planet_data["Mangal (Mars)"]["house"]
    if saturn_house in {8, 12}:
        score -= 6
        growth.append("Patience and emotional grounding")
    if mars_house in {6, 8, 12}:
        score -= 4
        growth.append("Impulse control and conflict management")

    moon_house = planet_data["Chandra (Moon)"]["house"]
    if moon_house in {10, 11}:
        score += 5
        strengths.append("Public visibility and achievement support")

    score = max(1, min(99, score))
    if not strengths:
        strengths = ["Balanced chart foundation"]
    if not growth:
        growth = ["Consistency in routine"]
    return score, strengths[:3], growth[:3]

def generate_pdf_report(name, dob, place, service_name, chart_data):
    """
    Generate a beautiful PDF report for the selected astrology service.
    Saves PDF as: username_dob_servicename.pdf
    """
    # Create safe filename
    safe_name = re.sub(r'[^\w\-_]', '_', name)
    safe_dob = re.sub(r'[^\w\-_]', '_', dob)
    safe_service = re.sub(r'[^\w\-_]', '_', service_name)
    filename = f"{safe_name}_{safe_dob}_{safe_service}.pdf"
    
    # Create the PDF document
    doc = SimpleDocTemplate(filename, pagesize=A4,
                           rightMargin=50, leftMargin=50,
                           topMargin=50, bottomMargin=50)
    
    # Container for the 'Flowable' objects
    story = []
    
    # Define custom styles
    styles = getSampleStyleSheet()
    
    # Custom title style
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#8B4513'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    # Custom heading style
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#D2691E'),
        spaceAfter=12,
        spaceBefore=12,
        fontName='Helvetica-Bold'
    )
    
    # Custom body style
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=11,
        textColor=colors.HexColor('#2F4F4F'),
        spaceAfter=12,
        leading=16
    )
    
    # Add header with decorative border
    header_text = "॥ श्री गणेशाय नमः ॥"
    story.append(Paragraph(header_text, title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Main title
    main_title = f"Vedic Astrology Report: {service_name}"
    story.append(Paragraph(main_title, title_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Personal Information Table
    story.append(Paragraph("Personal Information", heading_style))
    personal_data = [
        ['Name:', name],
        ['Date of Birth:', dob],
        ['Place of Birth:', place],
        ['Report Date:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')]
    ]
    
    personal_table = Table(personal_data, colWidths=[2*inch, 4*inch])
    personal_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F5DEB3')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#2F4F4F')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#D2691E')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(personal_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Add chart data sections
    if 'lagna' in chart_data:
        story.append(Paragraph("Birth Chart Details", heading_style))
        story.append(Paragraph(f"<b>Lagna (Ascendant):</b> {chart_data['lagna']}", body_style))
        story.append(Spacer(1, 0.1*inch))
    
    if 'planet_positions' in chart_data:
        story.append(Paragraph("Planetary Positions", heading_style))
        planet_data_table = [['Planet', 'Rashi', 'House', 'Nakshatra', 'Pada']]
        
        for planet_info in chart_data['planet_positions']:
            planet_data_table.append(planet_info)
        
        planet_table = Table(planet_data_table, colWidths=[1.5*inch, 1.5*inch, 0.8*inch, 1.5*inch, 0.7*inch])
        planet_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8B4513')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#D2691E')),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#FFF8DC'), colors.HexColor('#FAEBD7')]),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(planet_table)
        story.append(Spacer(1, 0.3*inch))
    
    if 'panchang' in chart_data:
        story.append(Paragraph("Panchang Details", heading_style))
        panchang_data = [
            ['Tithi:', chart_data['panchang'].get('tithi', 'N/A')],
            ['Nakshatra:', chart_data['panchang'].get('nakshatra', 'N/A')],
            ['Yoga:', chart_data['panchang'].get('yoga', 'N/A')],
            ['Karana:', chart_data['panchang'].get('karana', 'N/A')],
            ['Paksha:', chart_data['panchang'].get('paksha', 'N/A')]
        ]
        
        panchang_table = Table(panchang_data, colWidths=[2*inch, 4*inch])
        panchang_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F5DEB3')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#2F4F4F')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#D2691E')),
            ('PADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(panchang_table)
        story.append(Spacer(1, 0.3*inch))
    
    if 'analysis' in chart_data:
        story.append(Paragraph("Analysis & Insights", heading_style))
        # Split analysis into paragraphs for better formatting
        analysis_text = chart_data['analysis']
        for para in analysis_text.split('\n\n'):
            if para.strip():
                story.append(Paragraph(para.strip(), body_style))
        story.append(Spacer(1, 0.2*inch))
    
    if 'scorecard' in chart_data:
        story.append(Paragraph("Astro Profile Scorecard", heading_style))
        story.append(Paragraph(f"<b>Attraction Score:</b> {chart_data['scorecard']['score']}/99", body_style))
        
        if chart_data['scorecard'].get('strengths'):
            story.append(Paragraph("<b>Top Strengths:</b>", body_style))
            for strength in chart_data['scorecard']['strengths']:
                story.append(Paragraph(f"• {strength}", body_style))
        
        if chart_data['scorecard'].get('growth'):
            story.append(Paragraph("<b>Growth Areas:</b>", body_style))
            for growth in chart_data['scorecard']['growth']:
                story.append(Paragraph(f"• {growth}", body_style))
        story.append(Spacer(1, 0.2*inch))
    
    if 'recommendations' in chart_data:
        story.append(Paragraph("Recommendations & Remedies", heading_style))
        recommendations = chart_data['recommendations']
        for rec in recommendations:
            story.append(Paragraph(f"• {rec}", body_style))
        story.append(Spacer(1, 0.2*inch))
    
    # Footer
    story.append(Spacer(1, 0.5*inch))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.grey,
        alignment=TA_CENTER,
        fontStyle='italic'
    )
    footer_text = "This report is generated based on Vedic Astrology calculations.<br/>For best results, consult with a qualified astrologer.<br/>॥ ॐ शान्ति शान्ति शान्तिः ॥"
    story.append(Paragraph(footer_text, footer_style))
    
    # Build PDF
    try:
        doc.build(story)
        print(f"\n✅ PDF Report successfully generated: {filename}")
        print(f"📍 Saved in current directory: {os.path.abspath(filename)}")
        return filename
    except Exception as e:
        print(f"\n❌ Error generating PDF: {e}")
        return None

def print_personalized_welcome(name, score, strengths, growth):
    print("\n🎯 YOUR PERSONAL ASTRO DASHBOARD")
    print(f"Welcome, {name.title()}!")
    print(f"Attraction Score: {score}/99")
    print(f"Top Strength: {strengths[0]}")
    print(f"Growth Focus: {growth[0]}")

def weekly_focus_calendar(days=7, user_tz=None):
    print("\n📅 PERSONALIZED WEEKLY FOCUS")
    if user_tz is None:
        user_tz = pytz.UTC
    now_local = datetime.now(user_tz)
    for offset in range(days):
        target_local = (now_local + timedelta(days=offset)).replace(hour=12, minute=0, second=0, microsecond=0)
        target_utc = target_local.astimezone(pytz.utc)
        jd_target = swe.julday(
            target_utc.year, target_utc.month, target_utc.day,
            target_utc.hour + target_utc.minute / 60 + target_utc.second / 3600
        )
        moon_lon = swe.calc_ut(jd_target, swe.MOON)[0][0]
        moon_rashi, _ = deg_to_rashi(moon_lon)
        nak, _ = get_nakshatra(moon_lon)
        details = get_panchang_details(jd_target)
        focus = RASHI_FOCUS.get(moon_rashi, "mindful progress")
        day_label = "Today" if offset == 0 else target_local.strftime("%a")
        print(f"- {day_label}: Focus on {focus} | Moon: {moon_rashi} | {details['tithi_name']} | Nakshatra: {nak}")

def personalized_growth_plan(score, strengths, growth):
    print("\n🚀 PERSONALIZED GROWTH PLAN")
    user_goal = input("Aapka current goal kya hai? (career/love/health/money/spiritual): ").strip() or "overall growth"
    enhanced_context = (
        chart_context
        + f"\nAttraction Score: {score}/99"
        + f"\nTop Strengths: {', '.join(strengths)}"
        + f"\nGrowth Areas: {', '.join(growth)}"
        + f"\nUser Goal: {user_goal}"
    )
    print(generate_personalized_text(f"30-day personalized growth plan for {user_goal}", enhanced_context))

def astro_profile_scorecard(score, strengths, growth):
    print("\n🪪 MY ASTRO PROFILE SCORECARD")
    print(f"Attraction Score: {score}/99")
    print("Top Strengths:")
    for item in strengths:
        print(f"- {item}")
    print("Growth Areas:")
    for item in growth:
        print(f"- {item}")

def build_chart_context(name, lagna_rashi, lagna_deg, planet_data):
    moon = planet_data["Chandra (Moon)"]
    mars_house = planet_data["Mangal (Mars)"]["house"]
    manglik = "Yes" if mars_house in [1, 4, 7, 8, 12] else "No"

    planets_summary = []
    for planet_name, data in planet_data.items():
        planets_summary.append(
            f"- {planet_name}: {data['rashi']}, House {data['house']} ({HOUSE_MEANINGS[data['house']]}), "
            f"Nakshatra {data['nakshatra']} Pada {data['pada']}, Retrograde: {data['retro']}"
        )

    return (
        f"Name: {name}\n"
        f"Lagna: {lagna_rashi} ({lagna_deg:.2f}°)\n"
        f"Moon Rashi: {moon['rashi']}\n"
        f"Manglik: {manglik}\n"
        f"Planetary Positions:\n" + "\n".join(planets_summary)
    )

def clean_ai_text(text):
    text = text.strip()
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)
    text = text.replace("**", "")
    text = text.replace("__", "")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def get_fallback_text(topic, chart_context):
    name_match = re.search(r"Name:\s*(.*)", chart_context)
    lagna_match = re.search(r"Lagna:\s*(.*)", chart_context)
    moon_match = re.search(r"Moon Rashi:\s*(.*)", chart_context)

    user_name = name_match.group(1).strip() if name_match else "Friend"
    lagna = lagna_match.group(1).strip() if lagna_match else "Unknown"
    moon = moon_match.group(1).strip() if moon_match else "Unknown"

    topic = topic.lower()
    if "daily" in topic:
        return (
            f"Aaj ka Focus, {user_name}: Calm mind + sharp execution.\n\n"
            f"Aapka Lagna {lagna} aur Moon trend {moon} aaj planning aur practical kaam ko support karta hai.\n"
            "1) Subah 3 priority tasks likho aur pehle wahi complete karo.\n"
            "2) Important baat-cheet mein soft tone rakho, result better milega.\n"
            "3) Shaam ko 20 min digital detox karke mind reset karo.\n\n"
            "Small disciplined steps aaj aapko kal se stronger banaenge."
        )

    if "gemstone" in topic:
        return (
            f"Gemstone Energy Guide for {user_name}\n\n"
            f"Aapke {lagna} lagna aur {moon} moon pattern ke base par communication aur clarity pe kaam karna best rahega.\n"
            "1) Emerald (Panna) tabhi pehnein jab qualified astrologer se confirm ho.\n"
            "2) Thursday ko yellow shades aur gratitude practice add karein for Guru support.\n"
            "3) Daily 108 baar 'Om Budhaya Namah' ya 5 min breath focus karein.\n\n"
            "Right intention + consistency hi sabse bada gemstone activator hai."
        )

    return (
        f"Personal Guidance for {user_name}\n\n"
        f"Aapka Lagna {lagna} aur Moon {moon} dikhata hai ki aap practical soch ke saath steady growth create kar sakte hain.\n"
        "1) Ek clear weekly goal set karein aur usko daily mini-actions mein break karein.\n"
        "2) Decision lete waqt emotions + logic dono ka balance rakhein.\n"
        "3) Har raat 5-minute reflection likhein: kya seekha, kya improve karna hai.\n\n"
        "Aapka chart potential strong hai—consistency se results fast aayenge."
    )

def generate_personalized_text(topic, chart_context):
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return "⚠️ Gemini API key missing. Set GEMINI_API_KEY (or GOOGLE_API_KEY) to enable AI personalized content."

    system_prompt = (
        "You are an elite Vedic astrology counselor who writes warm, insightful, and practical guidance. "
        "Blend traditional Vedic wisdom with modern lifestyle coaching. "
        "Keep language simple, uplifting, and specific to the provided chart data."
    )

    user_prompt = f"""
Generate a highly personalized {topic} reading using the chart below.

Output rules (strict):
- Return plain text only (no markdown symbols like #, *, **, or bullet markdown).
- 140 to 220 words minimum.
- Line 1: engaging headline.
- Next: 2-3 chart-based insights.
- Then: exactly 3 practical action steps in numbered format (1), 2), 3)).
- Last line: one motivating closing sentence.
- Use easy Hinglish (Hindi + English), warm and confident tone.
- Avoid fear-based predictions, legal/medical/financial guarantees, and absolute claims.

Chart data:
{chart_context}
"""

    try:
        for _ in range(2):
            response = completion(
                model=GEMINI_MODEL,
                api_key=api_key,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            content = response.choices[0].message.content or ""
            content = clean_ai_text(content)
            if len(content.split()) >= 90 and content.count("\n") >= 4:
                return content

        return get_fallback_text(topic, chart_context)
    except Exception as exc:
        fallback = get_fallback_text(topic, chart_context)
        return f"⚠️ AI generation failed: {exc}\n\n{fallback}"

# =======================
# USER INPUT
# =======================
def main():
    print("\n🔮 PERSONALIZED VEDIC HOROSCOPE SYSTEM\n")

    name = input("Naam: ").strip()
    if not name:
        print("⚠️ Name is required.")
        return
    
    dob = input("DOB (YYYY-MM-DD): ").strip()
    tob = input("Time (HH:MM): ").strip()
    place = input("Place (City, Country): ").strip()

    if not dob or not tob or not place:
        print("⚠️ All fields are required.")
        return

    # =======================
    # LOCATION + TIME
    # =======================
    try:
        geo = Nominatim(user_agent="vedic_app")
        loc = geo.geocode(place)
        
        if not loc:
            print(f"⚠️ Could not find location: {place}")
            return

        tf = TimezoneFinder()
        tz_str = tf.timezone_at(lat=loc.latitude, lng=loc.longitude)
        if not tz_str:
            print("⚠️ Could not determine timezone for location.")
            return
        
        tz = pytz.timezone(tz_str)

        dt_local = tz.localize(datetime.strptime(f"{dob} {tob}", "%Y-%m-%d %H:%M"))
        dt_utc = dt_local.astimezone(pytz.utc)

        jd = swe.julday(
            dt_utc.year, dt_utc.month, dt_utc.day,
            dt_utc.hour + dt_utc.minute / 60
        )
    except ValueError as e:
        print(f"⚠️ Invalid date/time format: {e}")
        return
    except Exception as e:
        print(f"⚠️ Error processing location/time: {e}")
        return

    # =======================
    # LAGNA
    # =======================
    try:
        cusps, ascmc = swe.houses(jd, loc.latitude, loc.longitude, b'P')
        lagna_rashi, lagna_deg = deg_to_rashi(ascmc[0])
        print(f"\n🧿 Lagna: {lagna_rashi} {lagna_deg:.2f}°")
    except Exception as e:
        print(f"⚠️ Error calculating houses: {e}")
        return

    # =======================
    # PLANET CALCULATION
    # =======================
    planet_data = {}

    print("\n🌍 GRAHA STHITI\n")

    try:
        for p, code in PLANETS.items():
            pos, _ = swe.calc_ut(jd, code)
            lon = pos[0]
            retro = pos[3] < 0
            rashi, deg = deg_to_rashi(lon)
            nak, pada = get_nakshatra(lon)
            house = get_house(lon, cusps)

            planet_data[p] = {
                "rashi": rashi,
                "house": house,
                "nakshatra": nak,
                "pada": pada,
                "retro": retro,
                "longitude": lon
            }

            print(f"{p}: {rashi} | Bhava {house} | {nak} Pada {pada}")
        
        # Calculate Ketu (180 degrees opposite to Rahu)
        rahu_lon = planet_data["Rahu"]["longitude"]
        ketu_lon = (rahu_lon + 180) % 360
        ketu_rashi, ketu_deg = deg_to_rashi(ketu_lon)
        ketu_nak, ketu_pada = get_nakshatra(ketu_lon)
        ketu_house = get_house(ketu_lon, cusps)
        
        planet_data["Ketu"] = {
            "rashi": ketu_rashi,
            "house": ketu_house,
            "nakshatra": ketu_nak,
            "pada": ketu_pada,
            "retro": False,
            "longitude": ketu_lon
        }
        print(f"Ketu: {ketu_rashi} | Bhava {ketu_house} | {ketu_nak} Pada {ketu_pada}")
        
    except Exception as e:
        print(f"⚠️ Error calculating planets: {e}")
        return

    # =======================
    # BASIC SUMMARY
    # =======================
    print("\n🧠 BASIC SUMMARY")
    chart_context = build_chart_context(name, lagna_rashi, lagna_deg, planet_data)
    print(generate_personalized_text("basic personality overview", chart_context))
    score, strengths, growth = derive_profile_scorecard(planet_data)
    print_personalized_welcome(name, score, strengths, growth)

    # =======================
    # SERVICE FUNCTIONS
    # =======================
    def janam_kundli():
        print("\n🧿 JANAM KUNDLI")
        for p, d in planet_data.items():
            print(f"{p} → {d['rashi']} | House {d['house']} ({HOUSE_MEANINGS[d['house']]})")

    def career_guidance():
        print("\n💼 CAREER GUIDANCE")
        print(generate_personalized_text("career guidance", chart_context))

    def marriage_analysis():
        print("\n💍 MARRIAGE ANALYSIS")
        print(generate_personalized_text("marriage and relationship analysis", chart_context))

    def daily_horoscope():
        today = datetime.utcnow()
        jd_today = swe.julday(today.year, today.month, today.day)
        moon_today = swe.calc_ut(jd_today, swe.MOON)[0][0]
        r, _ = deg_to_rashi(moon_today)
        print(f"\n🌞 Aaj Moon Rashi: {r}")
        daily_context = chart_context + f"\nToday's Moon Rashi (transit snapshot): {r}"
        print(generate_personalized_text("daily horoscope", daily_context))

    def gemstone():
        print("\n💎 GEMSTONE SUGGESTION")
        print(generate_personalized_text("gemstone recommendation", chart_context))

    def birth_panchang():
        print("\n📜 BIRTH PANCHANG (Janma Panchang)")
        details = get_panchang_details(jd)
        print(f"Tithi: {details['tithi_name']} (#{details['tithi_number']}) | {details['paksha']}")
        print(f"Nakshatra: {details['nakshatra']} Pada {details['pada']}")
        print(f"Yoga: {details['yoga']}")
        print(f"Karana: {details['karana']}")

    def todays_panchang():
        print("\n🗓️ TODAY'S PANCHANG")
        now_local = datetime.now(tz)
        now_utc = now_local.astimezone(pytz.utc)
        jd_now = swe.julday(
            now_utc.year, now_utc.month, now_utc.day,
            now_utc.hour + now_utc.minute / 60 + now_utc.second / 3600
        )
        details = get_panchang_details(jd_now)
        print(f"Local Time: {now_local.strftime('%Y-%m-%d %H:%M:%S %Z')}")
        print(f"Tithi: {details['tithi_name']} (#{details['tithi_number']}) | {details['paksha']}")
        print(f"Nakshatra: {details['nakshatra']} Pada {details['pada']}")
        print(f"Yoga: {details['yoga']}")
        print(f"Karana: {details['karana']}")

    def moon_phase_tracker():
        print("\n🌙 MOON PHASE TRACKER")
        now_utc = datetime.utcnow()
        jd_now = swe.julday(
            now_utc.year, now_utc.month, now_utc.day,
            now_utc.hour + now_utc.minute / 60 + now_utc.second / 3600
        )
        details = get_panchang_details(jd_now)
        phase, illumination, elongation = get_moon_phase_details(details["moon_lon"], details["sun_lon"])
        print(f"Phase: {phase}")
        print(f"Illumination: {illumination:.2f}%")
        print(f"Sun-Moon Angle: {elongation:.2f}°")
        print(f"Current Tithi: {details['tithi_name']} ({details['paksha']})")

    def transit_snapshot():
        print("\n🪐 PLANETARY TRANSIT SNAPSHOT (Now vs Birth)")
        now_utc = datetime.utcnow()
        jd_now = swe.julday(
            now_utc.year, now_utc.month, now_utc.day,
            now_utc.hour + now_utc.minute / 60 + now_utc.second / 3600
        )

        for planet_name, code in PLANETS.items():
            current_lon = swe.calc_ut(jd_now, code)[0][0]
            current_rashi, _ = deg_to_rashi(current_lon)
            birth_rashi = planet_data[planet_name]["rashi"]
            movement = "Changed" if current_rashi != birth_rashi else "Same"
            print(f"{planet_name}: Birth {birth_rashi} → Now {current_rashi} ({movement})")
        
        # Also calculate Ketu for transit
        rahu_lon = swe.calc_ut(jd_now, swe.MEAN_NODE)[0][0]
        ketu_lon = (rahu_lon + 180) % 360
        current_ketu_rashi, _ = deg_to_rashi(ketu_lon)
        birth_ketu_rashi = planet_data["Ketu"]["rashi"]
        movement = "Changed" if current_ketu_rashi != birth_ketu_rashi else "Same"
        print(f"Ketu: Birth {birth_ketu_rashi} → Now {current_ketu_rashi} ({movement})")        

    def festival_vrat_alerts(days_ahead=30):
        print("\n🎉 FESTIVAL & VRAT ALERTS")
        print(f"Upcoming {days_ahead} days (location-based panchang):")

        alerts = collect_upcoming_alerts(days_ahead)
        found_any = False

        for alert in alerts:
            found_any = True
            day_label = "Today" if alert["day_offset"] == 0 else alert["target_local"].strftime("%a, %d %b %Y")
            tag_text = ", ".join(alert["tags"])
            details = alert["details"]
            print(
                f"- {day_label}: {tag_text} | "
                f"Tithi: {details['tithi_name']} ({details['paksha']}) | "
                f"Nakshatra: {details['nakshatra']}"
            )

        if not found_any:
            print("No major vrat/festival alerts found in this range.")

    def next_alert_countdown(days_ahead=60):
        print("\n⏳ NEXT ALERT COUNTDOWN")
        now_local = datetime.now(tz)
        alerts = collect_upcoming_alerts(days_ahead)

        if not alerts:
            print("No upcoming alerts found in this range.")
            return

        first = alerts[0]
        delta = first["target_local"] - now_local
        days = max(0, delta.days)
        hours = max(0, int((delta.seconds or 0) / 3600))
        print(
            f"Next Alert: {', '.join(first['tags'])} on {first['target_local'].strftime('%a, %d %b %Y')} "
            f"(in {days} day(s), {hours} hour(s))"
        )

        key_map = {
            "Ekadashi": "Ekadashi",
            "Pradosh": "Pradosh",
            "Purnima": "Purnima",
            "Amavasya": "Amavasya",
        }
        for key, label in key_map.items():
            match = next(
                (
                    a for a in alerts
                    if any(key in tag for tag in a["tags"])
                ),
                None
            )
            if match:
                d = match["target_local"] - now_local
                d_days = max(0, d.days)
                print(f"- Next {label}: {match['target_local'].strftime('%a, %d %b %Y')} (in {d_days} day(s))")

    def shubh_muhurat_finder(days_ahead=7):
        print("\n✨ SHUBH MUHURAT FINDER (Approx)")
        print("Rule-based recommendation using Tithi + Nakshatra. Best for planning day-level tasks.")

        now_local = datetime.now(tz)
        found = False
        avoided_tithis = {4, 9, 14}

        for day_offset in range(days_ahead + 1):
            target_local = (now_local + timedelta(days=day_offset)).replace(
                hour=12, minute=0, second=0, microsecond=0
            )
            target_utc = target_local.astimezone(pytz.utc)
            jd_target = swe.julday(
                target_utc.year, target_utc.month, target_utc.day,
                target_utc.hour + target_utc.minute / 60 + target_utc.second / 3600
            )
            details = get_panchang_details(jd_target)

            tithi_good = details["tithi_number"] not in avoided_tithis
            nakshatra_good = details["nakshatra"] in AUSPICIOUS_NAKSHATRAS
            if not (tithi_good and nakshatra_good):
                continue

            found = True
            day_label = "Today" if day_offset == 0 else target_local.strftime("%a, %d %b %Y")
            noon = target_local.replace(hour=12, minute=0)
            abhijit_start = (noon - timedelta(minutes=24)).strftime("%H:%M")
            abhijit_end = (noon + timedelta(minutes=24)).strftime("%H:%M")
            print(
                f"- {day_label}: {abhijit_start}-{abhijit_end} (Abhijit approx), 09:00-11:00, 16:00-18:00 | "
                f"Tithi: {details['tithi_name']} | Nakshatra: {details['nakshatra']}"
            )

        if not found:
            print("No strong muhurat windows found in this range by current rules.")

    def dasha_antardasha_snapshot():
        print("\n🧭 DASHA / ANTARDASHA SNAPSHOT (Vimshottari)")
        moon_lon_birth = swe.calc_ut(jd, swe.MOON)[0][0]
        now_local = datetime.now(tz)

        maha_lord, elapsed_in_maha, maha_total, cycle_index, elapsed_years = get_current_vimshottari(
            now_local, dt_local, moon_lon_birth
        )
        antar_lord, elapsed_in_antar, antar_total = get_antardasha(maha_lord, elapsed_in_maha)

        remaining_maha = max(0.0, maha_total - elapsed_in_maha)
        remaining_antar = max(0.0, antar_total - elapsed_in_antar)

        print(f"Current Mahadasha: {maha_lord} ({elapsed_in_maha:.2f}/{maha_total:.2f} years, remaining {remaining_maha:.2f} years)")
        print(f"Current Antardasha: {maha_lord}/{antar_lord} ({elapsed_in_antar:.2f}/{antar_total:.2f} years, remaining {remaining_antar:.2f} years)")
        print(f"Age from birth data: {elapsed_years:.2f} years | Dasha cycle count completed: {cycle_index}")

        sequence = rotate_vimshottari(maha_lord)
        print("Upcoming Mahadashas:")
        for next_lord in sequence[1:4]:
            print(f"- {next_lord}: {VIMSHOTTARI_YEARS[next_lord]} years")

    def ai_weekly_coach():
        print("\n🧠 AI WEEKLY COACH")
        weekly_context = chart_context + "\nUpcoming 7-day moon trend personalized coaching requested."
        print(generate_personalized_text("weekly personalized coaching", weekly_context))

    def mantra_recommendation():
        print("\n🕉️ MANTRA RECOMMENDATION")
        remedy_planets = get_priority_planets_for_remedy(planet_data)
        print("Primary Beej/Devata Mantras for your current chart pattern:")
        for planet in remedy_planets:
            mantra = PLANET_MANTRAS.get(planet)
            if mantra:
                print(f"- {planet}: {mantra} | 108 jap, morning or evening")

        mantra_context = (
            chart_context
            + f"\nPriority remedy planets: {', '.join(remedy_planets)}"
            + "\nNeed practical mantra routine (time, count, day, and discipline tips)."
        )
        print("\nPersonalized Mantra Sadhana Guide:")
        print(generate_personalized_text("personalized mantra and remedy plan", mantra_context))

    def love_life_insights():
        print("\n❤️ LOVE LIFE INSIGHTS")
        venus_house = planet_data["Shukra (Venus)"]["house"]
        moon_house = planet_data["Chandra (Moon)"]["house"]
        mars_house = planet_data["Mangal (Mars)"]["house"]
        love_context = (
            chart_context
            + f"\nVenus House: {venus_house}, Moon House: {moon_house}, Mars House: {mars_house}"
            + "\nGive relationship compatibility style, emotional needs, red flags, green flags, and next 90-day love guidance."
        )
        print(generate_personalized_text("deep love life and relationship forecast", love_context))

    def career_master_forecast():
        print("\n📈 CAREER MASTER FORECAST")
        tenth_house_planets = [p for p, d in planet_data.items() if d["house"] == 10]
        eleventh_house_planets = [p for p, d in planet_data.items() if d["house"] == 11]
        career_context = (
            chart_context
            + f"\n10th House Planets: {', '.join(tenth_house_planets) if tenth_house_planets else 'None'}"
            + f"\n11th House Planets: {', '.join(eleventh_house_planets) if eleventh_house_planets else 'None'}"
            + "\nCreate career strategy with role suitability, skill roadmap, and 90-day execution plan."
        )
        print(generate_personalized_text("advanced career forecast and 90-day plan", career_context))

    def future_prediction_timeline():
        print("\n🔮 FUTURE PREDICTION TIMELINE")
        horizon = input("Prediction horizon choose karein (3m/6m/12m): ").strip().lower()
        if horizon not in {"3m", "6m", "12m"}:
            horizon = "6m"

        moon_lon_birth = swe.calc_ut(jd, swe.MOON)[0][0]
        now_local = datetime.now(tz)
        maha_lord, elapsed_in_maha, maha_total, _, _ = get_current_vimshottari(now_local, dt_local, moon_lon_birth)
        antar_lord, _, _ = get_antardasha(maha_lord, elapsed_in_maha)

        prediction_context = (
            chart_context
            + f"\nCurrent Dasha: {maha_lord}, Antardasha: {antar_lord}"
            + f"\nPrediction Horizon: {horizon}"
            + "\nProvide month-wise opportunities, caution zones, and best action themes for career, love, money, and health discipline."
        )
        print(generate_personalized_text(f"future prediction timeline for next {horizon}", prediction_context))

    def generate_complete_pdf():
        print("\n📄 GENERATE PDF REPORT")
        print("\nAvailable PDF Report Options:")
        print("1. Complete Birth Chart Report")
        print("2. Career Analysis Report")
        print("3. Marriage & Love Report")
        print("4. Personalized Horoscope Report")
        print("5. Custom Service Report")
        
        pdf_choice = input("\nSelect report type (1-5): ").strip()
        
        # Prepare base chart data
        chart_data = {
            'lagna': f"{lagna_rashi} {lagna_deg:.2f}°",
            'planet_positions': [],
            'panchang': {},
            'scorecard': {
                'score': score,
                'strengths': strengths,
                'growth': growth
            }
        }
    
        # Add planetary positions
        for p_name, p_data in planet_data.items():
            chart_data['planet_positions'].append([
                p_name,
                p_data['rashi'],
                str(p_data['house']),
                p_data['nakshatra'],
                str(p_data['pada'])
            ])
        
        # Add birth panchang
        birth_panchang = get_panchang_details(jd)
        chart_data['panchang'] = {
            'tithi': f"{birth_panchang['tithi_name']} (#{birth_panchang['tithi_number']})",
            'nakshatra': f"{birth_panchang['nakshatra']} Pada {birth_panchang['pada']}",
            'yoga': birth_panchang['yoga'],
            'karana': birth_panchang['karana'],
            'paksha': birth_panchang['paksha']
        }
        
        # Generate appropriate content based on selection
        if pdf_choice == "1":
            service_name = "Complete_Birth_Chart"
            chart_data['analysis'] = generate_personalized_text("complete birth chart analysis", chart_context)
            
            # Add recommendations
            remedy_planets = get_priority_planets_for_remedy(planet_data)
            recommendations = []
            for planet in remedy_planets[:3]:
                mantra = PLANET_MANTRAS.get(planet, "")
                if mantra:
                    recommendations.append(f"{planet}: {mantra}")
            chart_data['recommendations'] = recommendations
            
        elif pdf_choice == "2":
            service_name = "Career_Analysis"
            tenth_house_planets = [p for p, d in planet_data.items() if d["house"] == 10]
            career_context = chart_context + f"\n10th House Planets: {', '.join(tenth_house_planets) if tenth_house_planets else 'None'}"
            chart_data['analysis'] = generate_personalized_text("career analysis and guidance", career_context)
            
        elif pdf_choice == "3":
            service_name = "Marriage_Love_Report"
            venus_house = planet_data["Shukra (Venus)"]["house"]
            love_context = chart_context + f"\nVenus House: {venus_house}"
            chart_data['analysis'] = generate_personalized_text("marriage and love life analysis", love_context)
            
        elif pdf_choice == "4":
            service_name = "Personalized_Horoscope"
            today = datetime.utcnow()
            jd_today = swe.julday(today.year, today.month, today.day)
            moon_today = swe.calc_ut(jd_today, swe.MOON)[0][0]
            r, _ = deg_to_rashi(moon_today)
            daily_context = chart_context + f"\nToday's Transit Moon: {r}"
            chart_data['analysis'] = generate_personalized_text("personalized horoscope reading", daily_context)
            
        elif pdf_choice == "5":
            custom_service = input("Enter custom service name: ").strip() or "Custom_Report"
            service_name = custom_service.replace(" ", "_")
            chart_data['analysis'] = generate_personalized_text(f"{custom_service} analysis", chart_context)
            
        else:
            print("❌ Invalid option. Generating default report.")
            service_name = "Complete_Report"
            chart_data['analysis'] = generate_personalized_text("complete astrological analysis", chart_context)
        
        # Generate the PDF
        generate_pdf_report(name, dob, place, service_name, chart_data)

    # =======================
    # MENU LOOP
    # =======================
    while True:
        print("""
🛕 AVAILABLE SERVICES

📊 CALCULATION-BASED SERVICES (No AI Required)
1️⃣  Janam Kundli
2️⃣  Birth Panchang
3️⃣  Today's Panchang
4️⃣  Moon Phase Tracker
5️⃣  Planetary Transit Snapshot
6️⃣  Festival & Vrat Alerts
7️⃣  Next Alert Countdown
8️⃣  Shubh Muhurat Finder
9️⃣  Dasha/Antardasha Snapshot
🔟 Weekly Focus Calendar
1️⃣1️⃣ My Astro Scorecard

🤖 AI-POWERED SERVICES (Requires LLM)
1️⃣2️⃣ Career Guidance
1️⃣3️⃣ Marriage Analysis
1️⃣4️⃣ Daily Horoscope
1️⃣5️⃣ Gemstone Recommendation
1️⃣6️⃣ Personalized Growth Plan
1️⃣7️⃣ AI Weekly Coach
1️⃣8️⃣ Mantra Recommendation
1️⃣9️⃣ Love Life Insights
2️⃣0️⃣ Career Master Forecast
2️⃣1️⃣ Future Prediction Timeline

📄 PDF REPORT GENERATION
2️⃣2️⃣ Generate PDF Report

0️⃣ Exit
""")

        choice = input("👉 Option choose karein: ").strip()

        if choice == "1":
            janam_kundli()
        elif choice == "2":
            birth_panchang()
        elif choice == "3":
            todays_panchang()
        elif choice == "4":
            moon_phase_tracker()
        elif choice == "5":
            transit_snapshot()
        elif choice == "6":
            festival_vrat_alerts()
        elif choice == "7":
            next_alert_countdown()
        elif choice == "8":
            shubh_muhurat_finder()
        elif choice == "9":
            dasha_antardasha_snapshot()
        elif choice == "10":
            weekly_focus_calendar(user_tz=tz)
        elif choice == "11":
            astro_profile_scorecard(score, strengths, growth)
        elif choice == "12":
            career_guidance()
        elif choice == "13":
            marriage_analysis()
        elif choice == "14":
            daily_horoscope()
        elif choice == "15":
            gemstone()
        elif choice == "16":
            personalized_growth_plan(score, strengths, growth)
        elif choice == "17":
            ai_weekly_coach()
        elif choice == "18":
            mantra_recommendation()
        elif choice == "19":
            love_life_insights()
        elif choice == "20":
            career_master_forecast()
        elif choice == "21":
            future_prediction_timeline()
        elif choice == "22":
            generate_complete_pdf()
        elif choice == "0":
            print("\n🙏 Dhanyavaad! Program band ho raha hai.")
            break
        else:
            print("❌ Galat option, phir try karein.")

if __name__ == "__main__":
    main()