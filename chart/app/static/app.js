const todayStatus = document.getElementById("today-status");
const todayData = document.getElementById("today-data");
const reportForm = document.getElementById("report-form");
const reportOutput = document.getElementById("report-output");
const reportRaw = document.getElementById("report-raw");
const festivalOutput = document.getElementById("festival-output");
const refreshBtn = document.getElementById("refresh-btn");
const gpsBtn = document.getElementById("gps-btn");
const latitudeInput = document.getElementById("latitude");
const longitudeInput = document.getElementById("longitude");

const renderTiles = (container, data) => {
  container.innerHTML = "";
  Object.entries(data).forEach(([key, value]) => {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.innerHTML = `<strong>${key}</strong><div>${value}</div>`;
    container.appendChild(tile);
  });
};

const renderReport = (report) => {
  reportOutput.innerHTML = "";

  const section = (title, content, isHtml = false) => {
    const card = document.createElement("div");
    card.className = "report-section";
    const heading = document.createElement("h3");
    heading.textContent = title;
    card.appendChild(heading);
    if (isHtml) {
      card.insertAdjacentHTML("beforeend", content);
    } else {
      card.insertAdjacentHTML("beforeend", content);
    }
    reportOutput.appendChild(card);
  };

  section(
    "Kundali",
    `<p>Moon Sign: ${report.kundali.moon_sign}</p>
     <p>Sun Sign: ${report.kundali.sun_sign}</p>
     <p>Nakshatra: ${report.kundali.nakshatra}</p>
     <p>Ascendant: ${report.kundali.ascendant_sign || "Unavailable"}</p>`
  );

  section(
    "Mulank",
    `<p>${report.mulank}</p>`
  );

  section(
    "Today's Panchang",
    `<ul class="report-list">
      <li>Tithi: ${report.panchang.tithi}</li>
      <li>Nakshatra: ${report.panchang.nakshatra}</li>
      <li>Yoga: ${report.panchang.yoga}</li>
      <li>Karana: ${report.panchang.karana}</li>
      <li>Month: ${report.panchang.month}</li>
    </ul>`
  );

  section(
    "Time Guidance",
    `<ul class="report-list">
      <li>Sunrise: ${report.guidance.sunrise}</li>
      <li>Sunset: ${report.guidance.sunset}</li>
      <li>Rahu Kaal: ${report.guidance.rahu_kaal}</li>
      <li>Abhijit Muhurat: ${report.guidance.abhijit_muhurat}</li>
    </ul>`
  );

  section(
    "Prediction",
    `<p>${report.prediction.quality} day</p>
     <p>${report.prediction.day_outlook}</p>
     <p><strong>Best Time:</strong> ${report.prediction.best_time}</p>
     <p><strong>Gemstone:</strong> ${report.prediction.gemstone}</p>
     <p><strong>Gemstone Caution:</strong> ${report.prediction.gemstone_caution.join(", ") || "None"}</p>
     <p>${report.prediction.recommendation}</p>
     <ul class="report-list">
      ${report.prediction.recommended_tasks.map((t) => `<li>${t}</li>`).join("")}
     </ul>
     <p><strong>Good For You:</strong></p>
     <ul class="report-list">
      ${report.prediction.good_for_you_today.map((t) => `<li>${t}</li>`).join("")}
     </ul>
     <p><strong>Prosperity Tips:</strong></p>
     <ul class="report-list">
     ${report.prediction.prosperity_tips.map((t) => `<li>${t}</li>`).join("")}
     </ul>`
  );

  section(
    "Dasha",
    `<p>Mahadasha: ${report.dasha.mahadasha}</p>
     <p>Ends On: ${report.dasha.ends_on}</p>
     <p>Remaining Years: ${report.dasha.remaining_years}</p>`
  );

  section(
    "Antardasha",
    `<p>Antardasha: ${report.antardasha.antardasha}</p>
     <p>Remaining Months: ${report.antardasha.remaining_months}</p>`
  );

  section(
    "Transits",
    `<p>Natal Moon: ${report.transit.natal_moon_sign}</p>
     <p>Current Moon: ${report.transit.current_moon_sign}</p>
     <p>Moon House: ${report.transit.moon_house_from_natal}</p>
     <p>Ascendant House: ${report.transit.moon_house_from_asc}</p>
     <p>Transit Effect: ${report.transit.effect}</p>
     <p>House Effect: ${report.transit.house_effect}</p>`
  );

  section(
    "Planetary Aspects",
    `<ul class="report-list">
      ${Object.entries(report.aspects || report.prediction.aspects || {})
        .map(([planet, aspect]) => {
          if (!aspect || typeof aspect !== "object") {
            return `<li>${planet}: ${aspect}</li>`;
          }
          const angle = aspect.angle != null ? `${aspect.angle}°` : "n/a";
          const orb = aspect.orb != null ? `${aspect.orb}°` : "n/a";
          const label = aspect.within_orb ? aspect.aspect : `${aspect.aspect} wide`;
          return `<li>${planet}: ${label} (angle ${angle}, orb ${orb})</li>`;
        })
        .join("") || "<li>No strong aspects today</li>"}
     </ul>`
  );

  section(
    "Muhurat Guide",
    `<ul class="report-list">
      <li>Business: ${report.prediction.muhurat.business}</li>
      <li>Travel Best: ${report.prediction.muhurat.travel_best}</li>
      <li>Travel Avoid: ${report.prediction.muhurat.travel_avoid}</li>
      <li>Study: ${report.prediction.muhurat.study}</li>
      <li>Puja: ${report.prediction.muhurat.puja}</li>
      <li>Amrit: ${report.prediction.muhurat.amrit}</li>
    </ul>`
  );

  section(
    "Remedies",
    `<ul class="report-list">
      ${report.prediction.remedies.map((t) => `<li>${t}</li>`).join("")}
     </ul>`
  );

  section(
    "Dosha Hints",
    `<ul class="report-list">
      <li>Manglik Hint: ${report.prediction.dosha_flags.manglik_hint ? "Yes" : "No"}</li>
      <li>Kaal Sarp Hint: ${report.prediction.dosha_flags.kaal_sarp_hint ? "Yes" : "No"}</li>
     </ul>`
  );

  if (report.llm_report && report.llm_report.html) {
    const wrapped = `<div class="llm-scroll">${report.llm_report.html}</div>`;
    section("AI Narrative Report", wrapped, true);
  } else if (report.llm_report && report.llm_report.error) {
    section("AI Narrative Report", `<p>${report.llm_report.error}</p>`, true);
  }
};

const renderFestivals = (festivals) => {
  festivalOutput.innerHTML = "";
  if (!festivals || festivals.length === 0) {
    festivalOutput.innerHTML = "<p>No festival matches found for this month.</p>";
    return;
  }
  festivals.forEach((festival) => {
    const card = document.createElement("div");
    card.className = "festival-card";
    card.innerHTML = `
      <h4>${festival.festival}</h4>
      <p>Date: ${festival.date}</p>
      <p>Start: ${festival.start}</p>
      <p>End: ${festival.end}</p>
      <p>Tithi: ${festival.tithi}</p>
    `;
    festivalOutput.appendChild(card);
  });
};

const loadToday = async () => {
  try {
    const res = await fetch("/api/today");
    const data = await res.json();
    todayStatus.textContent = `Updated on ${data.updated_on}`;
    renderTiles(todayData, {
      Tithi: data.panchang.tithi,
      Nakshatra: data.panchang.nakshatra,
      Yoga: data.panchang.yoga,
      Karana: data.panchang.karana,
    });
    renderFestivals(data.festivals);
  } catch (err) {
    todayStatus.textContent = "Daily cache not ready yet.";
  }
};

reportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(reportForm);
  const payload = Object.fromEntries(formData.entries());
  payload.latitude = Number(payload.latitude);
  payload.longitude = Number(payload.longitude);

  const res = await fetch("/api/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  renderReport(data);
  if (reportRaw) {
    reportRaw.textContent = JSON.stringify(data, null, 2);
  }
});

refreshBtn.addEventListener("click", async () => {
  const latitude = Number(latitudeInput.value || 25.4358);
  const longitude = Number(longitudeInput.value || 81.8463);
  await fetch("/api/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude, longitude }),
  });
  loadToday();
});

gpsBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    todayStatus.textContent = "Geolocation is not supported by this browser.";
    return;
  }
  gpsBtn.disabled = true;
  gpsBtn.textContent = "Locating...";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      latitudeInput.value = position.coords.latitude.toFixed(4);
      longitudeInput.value = position.coords.longitude.toFixed(4);
      gpsBtn.disabled = false;
      gpsBtn.textContent = "Use Current Location";
    },
    () => {
      todayStatus.textContent = "Location permission denied or unavailable.";
      gpsBtn.disabled = false;
      gpsBtn.textContent = "Use Current Location";
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

loadToday();
