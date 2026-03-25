import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api/config.js';
import { apiPost, getAuthToken } from '../api/client.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';

const INSIGHT_OPTIONS = [
  {
    id: 'complete',
    title: 'Complete Life Snapshot',
    subtitle: 'Reading, score, dasha, transits, alerts and muhurat in one flow.',
    cta: 'Generate Complete Snapshot',
    requiresBirth: true,
    requiresPlace: true,
    usesTopic: true,
    showPredictDays: true,
  },
  {
    id: 'reading',
    title: 'Personalized Reading',
    subtitle: 'Ask what matters most and get focused guidance.',
    cta: 'Generate Reading',
    requiresBirth: true,
    requiresPlace: true,
    usesTopic: true,
  },
  {
    id: 'kundli',
    title: 'Kundli Overview',
    subtitle: 'See lagna, planetary positions, strengths and growth areas.',
    cta: 'Show Kundli',
    requiresBirth: true,
    requiresPlace: true,
  },
  {
    id: 'panchang',
    title: 'Today Panchang',
    subtitle: 'Daily tithi, nakshatra, yoga and karana for your place.',
    cta: 'Show Panchang',
    requiresBirth: false,
    requiresPlace: true,
    showDateInput: true,
  },
  {
    id: 'moon',
    title: 'Moon Phase Insight',
    subtitle: 'Track phase and illumination for the selected day.',
    cta: 'Show Moon Phase',
    requiresBirth: false,
    requiresPlace: true,
    showDateInput: true,
  },
  {
    id: 'dasha',
    title: 'Dasha Timeline',
    subtitle: 'Understand current mahadasha and antardasha influences.',
    cta: 'Show Dasha',
    requiresBirth: true,
    requiresPlace: true,
  },
  {
    id: 'transit',
    title: 'Transit Watch',
    subtitle: 'Know what changed in current planetary transits.',
    cta: 'Show Transit Changes',
    requiresBirth: true,
    requiresPlace: true,
  },
  {
    id: 'alerts',
    title: 'Vrat And Festival Alerts',
    subtitle: 'Get upcoming observances and key dates.',
    cta: 'Show Alerts',
    requiresBirth: false,
    requiresPlace: true,
    showAlertDays: true,
  },
  {
    id: 'muhurat',
    title: 'Shubh Muhurat Finder',
    subtitle: 'Find auspicious windows in the coming days.',
    cta: 'Find Muhurat Windows',
    requiresBirth: false,
    requiresPlace: true,
    showMuhuratDays: true,
  },
];

const TOPIC_PRESETS = ['Career', 'Marriage', 'Finance', 'Health', 'Family', 'Spiritual Growth'];

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const toText = (value, fallback = '--') => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : fallback;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return fallback;
};

const toNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const toStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const toRecordArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => isRecord(item));
};

const pickRecord = (source, key) => {
  if (!source) return null;
  const value = source[key];
  return isRecord(value) ? value : null;
};

function StatPill({ label, value }) {
  return (
    <div className="astro-stat-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="astro-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function Horoscope() {
  const navigate = useNavigate();
  const { message, showMessage } = useFlashMessage();
  const showMessageRef = useRef(showMessage);
  const [selectedMode, setSelectedMode] = useState('complete');
  const [birthProfile, setBirthProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [topic, setTopic] = useState('daily guidance for my day');
  const [dateValue, setDateValue] = useState('');
  const [predictAlertDays, setPredictAlertDays] = useState('7');
  const [alertDays, setAlertDays] = useState('7');
  const [muhuratDays, setMuhuratDays] = useState('7');
  const [includeAiReading, setIncludeAiReading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [result, setResult] = useState(null);
  const [resultMode, setResultMode] = useState(null);

  useEffect(() => {
    showMessageRef.current = showMessage;
  }, [showMessage]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    let isMounted = true;

    const loadBirthProfile = async () => {
      if (!isMounted) return;
      setProfileLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!isMounted) return;

        if (response.status === 401) {
          showMessageRef.current('Please login again.', 'error');
          navigate('/', { replace: true });
          return;
        }

        if (response.status === 404 || response.status === 204) {
          setBirthProfile(null);
          return;
        }

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.detail || 'Failed to load profile');
        }

        const contentType = response.headers.get('content-type');
        const profile = contentType && contentType.includes('application/json')
          ? await response.json()
          : null;
        setBirthProfile(profile || null);
      } catch (error) {
        console.error('Load birth profile error:', error);
        setBirthProfile(null);
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    };

    loadBirthProfile();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const profileName = birthProfile?.full_name?.trim() || '';
  const profileDob = birthProfile?.dob?.trim() || '';
  const profileTob = birthProfile?.time_of_birth?.trim() || '';
  const profilePlace = birthProfile?.place_of_birth?.trim() || '';
  const hasCompleteBirth = Boolean(profileName && profileDob && profileTob && profilePlace);
  const hasPlaceOnly = Boolean(profilePlace);

  const selectedOption = useMemo(
    () => INSIGHT_OPTIONS.find((option) => option.id === selectedMode) || INSIGHT_OPTIONS[0],
    [selectedMode]
  );

  const resultOption = useMemo(
    () => INSIGHT_OPTIONS.find((option) => option.id === resultMode) || null,
    [resultMode]
  );

  const requirementHint = useMemo(() => {
    if (selectedOption.requiresBirth) {
      return hasCompleteBirth
        ? 'Using saved birth details from your profile.'
        : 'Birth details are missing. Save them in Profile to generate this insight.';
    }
    if (selectedOption.requiresPlace) {
      return hasPlaceOnly
        ? 'Using saved place of birth from your profile.'
        : 'Place of birth is missing. Save it in Profile to generate this insight.';
    }
    return 'No required fields for this insight.';
  }, [selectedOption, hasCompleteBirth, hasPlaceOnly]);

  const parseBoundedInt = (raw, label, min, max) => {
    const value = Number.parseInt(raw, 10);
    if (Number.isNaN(value)) {
      setErrorText(`${label} must be a number.`);
      return null;
    }
    if (value < min || value > max) {
      setErrorText(`${label} must be between ${min} and ${max}.`);
      return null;
    }
    return value;
  };

  const validateInputs = () => {
    if (selectedOption.requiresBirth && !hasCompleteBirth) {
      setErrorText('Birth details missing. Save name, DOB, time, and place in Profile first.');
      return false;
    }
    if (!selectedOption.requiresBirth && selectedOption.requiresPlace && !hasPlaceOnly) {
      setErrorText('Place of birth missing. Save it in Profile first.');
      return false;
    }
    return true;
  };

  const runSelectedInsight = async () => {
    if (!validateInputs()) return;
    const token = getAuthToken();
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    const birthPayload = {
      name: profileName,
      dob: profileDob,
      tob: profileTob,
      place: profilePlace,
    };

    let requestPromise;

    if (selectedMode === 'complete') {
      const parsedPredictDays = parseBoundedInt(predictAlertDays, 'Alert days', 1, 60);
      if (parsedPredictDays === null) return;
      requestPromise = apiPost(
        '/predict',
        {
          ...birthPayload,
          topic: topic.trim() || 'daily guidance for my day',
          include_ai_reading: includeAiReading,
          alert_days: parsedPredictDays,
        },
        true
      );
    } else if (selectedMode === 'reading') {
      requestPromise = apiPost(
        '/reading',
        {
          ...birthPayload,
          topic: topic.trim() || 'daily guidance for my day',
          include_ai_reading: includeAiReading,
        },
        true
      );
    } else if (selectedMode === 'kundli') {
      requestPromise = apiPost('/kundli', birthPayload, true);
    } else if (selectedMode === 'panchang') {
      requestPromise = apiPost(
        '/panchang/today',
        {
          place: profilePlace,
          date: dateValue.trim() || undefined,
        },
        true
      );
    } else if (selectedMode === 'moon') {
      requestPromise = apiPost(
        '/moon-phase/today',
        {
          place: profilePlace,
          date: dateValue.trim() || undefined,
        },
        true
      );
    } else if (selectedMode === 'dasha') {
      requestPromise = apiPost('/dasha', birthPayload, true);
    } else if (selectedMode === 'transit') {
      requestPromise = apiPost('/transit', birthPayload, true);
    } else if (selectedMode === 'alerts') {
      const parsedAlertDays = parseBoundedInt(alertDays, 'Days ahead', 1, 60);
      if (parsedAlertDays === null) return;
      requestPromise = apiPost(
        '/alerts',
        {
          place: profilePlace,
          days_ahead: parsedAlertDays,
        },
        true
      );
    } else {
      const parsedMuhuratDays = parseBoundedInt(muhuratDays, 'Muhurat days', 1, 30);
      if (parsedMuhuratDays === null) return;
      requestPromise = apiPost(
        '/muhurat',
        {
          place: profilePlace,
          days_ahead: parsedMuhuratDays,
        },
        true
      );
    }

    setErrorText('');
    setLoading(true);
    try {
      const response = await requestPromise;
      setResult(response);
      setResultMode(selectedMode);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Unable to generate insight right now.';
      setErrorText(messageText);
    } finally {
      setLoading(false);
    }
  };

  const renderNoResult = () => (
    <div className="astro-placeholder">
      <h4>Your insights will appear here</h4>
      <p>Enter details, choose what you want to know, and tap the generate button.</p>
    </div>
  );

  const renderCompleteResult = (data) => {
    const reading = pickRecord(data, 'reading');
    const scorecard = pickRecord(data, 'scorecard');
    const moonPhase = pickRecord(data, 'moon_phase');
    const dasha = pickRecord(data, 'dasha');
    const remedies = pickRecord(data, 'remedies');

    const strengths = toStringArray(scorecard?.strengths);
    const growth = toStringArray(scorecard?.growth_areas);
    const remedyPlanets = toStringArray(remedies?.priority_planets);
    const alerts = toRecordArray(data.upcoming_vrat_alerts);
    const muhuratWindows = toRecordArray(data.shubh_muhurat_windows);

    return (
      <div className="astro-result-stack">
        <h3>Complete Snapshot</h3>
        <div className="astro-stat-grid">
          <StatPill label="Score" value={toText(scorecard?.score)} />
          <StatPill label="Moon" value={toText(moonPhase?.phase)} />
          <StatPill label="Alerts" value={String(alerts.length)} />
          <StatPill label="Muhurat" value={String(muhuratWindows.length)} />
        </div>

        <div className="astro-card">
          <h4>Reading</h4>
          <p>{toText(reading?.text, 'Reading not available')}</p>
        </div>

        <div className="astro-card">
          <h4>Current Dasha</h4>
          <DetailRow label="Mahadasha" value={toText(dasha?.mahadasha)} />
          <DetailRow label="Antardasha" value={toText(dasha?.antardasha)} />
          <DetailRow label="Remaining Mahadasha Years" value={toText(dasha?.remaining_mahadasha_years)} />
        </div>

        {strengths.length > 0 ? (
          <div className="astro-card">
            <h4>Strengths</h4>
            <div className="astro-tag-row">
              {strengths.map((item) => (
                <span className="tag" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {growth.length > 0 ? (
          <div className="astro-card">
            <h4>Growth Areas</h4>
            <div className="astro-tag-row">
              {growth.map((item) => (
                <span className="tag" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {remedyPlanets.length > 0 ? (
          <div className="astro-card">
            <h4>Suggested Remedy Planets</h4>
            <div className="astro-tag-row">
              {remedyPlanets.map((item) => (
                <span className="tag" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderReadingResult = (data) => {
    const reading = pickRecord(data, 'reading');
    const scorecard = pickRecord(data, 'scorecard');
    const strengths = toStringArray(scorecard?.strengths);
    const growth = toStringArray(scorecard?.growth_areas);

    return (
      <div className="astro-result-stack">
        <h3>Personal Reading</h3>
        <div className="astro-stat-grid">
          <StatPill label="Profile Score" value={toText(scorecard?.score)} />
          <StatPill label="Topic" value={toText(reading?.topic)} />
        </div>
        <div className="astro-card">
          <h4>Guidance</h4>
          <p>{toText(reading?.text, 'Reading not available')}</p>
        </div>
        {strengths.length > 0 ? (
          <div className="astro-card">
            <h4>Strengths</h4>
            <div className="astro-tag-row">
              {strengths.map((item) => (
                <span className="tag" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {growth.length > 0 ? (
          <div className="astro-card">
            <h4>Growth Areas</h4>
            <div className="astro-tag-row">
              {growth.map((item) => (
                <span className="tag" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderKundliResult = (data) => {
    const lagna = pickRecord(data, 'lagna');
    const scorecard = pickRecord(data, 'scorecard');
    const planetPositions = pickRecord(data, 'planet_positions');
    const firstPlanets = planetPositions ? Object.entries(planetPositions).slice(0, 7) : [];

    return (
      <div className="astro-result-stack">
        <h3>Kundli Overview</h3>
        <div className="astro-stat-grid">
          <StatPill label="Lagna" value={toText(lagna?.rashi)} />
          <StatPill label="Lagna Degree" value={toText(lagna?.degree_in_rashi)} />
          <StatPill label="Score" value={toText(scorecard?.score)} />
        </div>
        {firstPlanets.length > 0 ? (
          <div className="astro-card">
            <h4>Key Planet Positions</h4>
            {firstPlanets.map(([planetName, payload]) => {
              const details = isRecord(payload) ? payload : null;
              return (
                <DetailRow
                  key={planetName}
                  label={planetName}
                  value={`${toText(details?.rashi)} | House ${toText(details?.house)}`}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };

  const renderPanchangResult = (data) => {
    const panchang = pickRecord(data, 'panchang');
    const moonPhase = pickRecord(data, 'moon_phase');

    return (
      <div className="astro-result-stack">
        <h3>Panchang For {toText(data.date, 'Selected Date')}</h3>
        <div className="astro-card">
          <DetailRow label="Tithi" value={toText(panchang?.tithi_name)} />
          <DetailRow label="Paksha" value={toText(panchang?.paksha)} />
          <DetailRow label="Nakshatra" value={toText(panchang?.nakshatra)} />
          <DetailRow label="Yoga" value={toText(panchang?.yoga)} />
          <DetailRow label="Karana" value={toText(panchang?.karana)} />
        </div>
        <div className="astro-card">
          <DetailRow label="Moon Phase" value={toText(moonPhase?.phase)} />
          <DetailRow label="Illumination" value={`${toText(moonPhase?.illumination_percent)}%`} />
        </div>
      </div>
    );
  };

  const renderMoonResult = (data) => {
    const moonPhase = pickRecord(data, 'moon_phase');
    return (
      <div className="astro-result-stack">
        <h3>Moon Phase For {toText(data.date, 'Selected Date')}</h3>
        <div className="astro-stat-grid">
          <StatPill label="Phase" value={toText(moonPhase?.phase)} />
          <StatPill label="Illumination" value={`${toText(moonPhase?.illumination_percent)}%`} />
          <StatPill label="Tithi" value={toText(moonPhase?.tithi)} />
          <StatPill label="Paksha" value={toText(moonPhase?.paksha)} />
        </div>
      </div>
    );
  };

  const renderDashaResult = (data) => {
    const dasha = pickRecord(data, 'dasha');
    const mahaTotal = toNumber(dasha?.total_mahadasha_years);
    const mahaRemaining = toNumber(dasha?.remaining_mahadasha_years);
    const progress =
      mahaTotal && mahaRemaining !== null
        ? Math.max(0, Math.min(100, Math.round(((mahaTotal - mahaRemaining) / mahaTotal) * 100)))
        : null;

    return (
      <div className="astro-result-stack">
        <h3>Current Dasha Timeline</h3>
        <div className="astro-card">
          <DetailRow label="Mahadasha" value={toText(dasha?.mahadasha)} />
          <DetailRow label="Antardasha" value={toText(dasha?.antardasha)} />
          <DetailRow label="Elapsed Years In Mahadasha" value={toText(dasha?.elapsed_years_in_mahadasha)} />
          <DetailRow label="Remaining Years In Mahadasha" value={toText(dasha?.remaining_mahadasha_years)} />
          {progress !== null ? <DetailRow label="Mahadasha Progress" value={`${progress}%`} /> : null}
        </div>
      </div>
    );
  };

  const renderTransitResult = (data) => {
    const snapshot = pickRecord(data, 'transit_snapshot');
    const entries = snapshot ? Object.entries(snapshot) : [];
    const changed = entries.filter(([, value]) => {
      const details = isRecord(value) ? value : null;
      return details?.changed === true;
    });

    return (
      <div className="astro-result-stack">
        <h3>Transit Changes</h3>
        <div className="astro-stat-grid">
          <StatPill label="Planets Tracked" value={String(entries.length)} />
          <StatPill label="Changed" value={String(changed.length)} />
        </div>
        <div className="astro-card">
          {changed.length === 0 ? (
            <p>No major sign change detected right now.</p>
          ) : (
            changed.map(([planet, value]) => {
              const details = isRecord(value) ? value : null;
              return (
                <DetailRow
                  key={planet}
                  label={planet}
                  value={`${toText(details?.birth_rashi)} -> ${toText(details?.current_rashi)}`}
                />
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderAlertsResult = (data) => {
    const alerts = toRecordArray(data.alerts);

    return (
      <div className="astro-result-stack">
        <h3>Upcoming Alerts</h3>
        <div className="astro-stat-grid">
          <StatPill label="Days Ahead" value={toText(data.days_ahead)} />
          <StatPill label="Total Alerts" value={toText(data.alerts_count)} />
        </div>
        <div className="astro-card">
          {alerts.length === 0 ? (
            <p>No alerts found in the selected window.</p>
          ) : (
            alerts.slice(0, 8).map((item) => {
              const tags = toStringArray(item.tags);
              const key = `${toText(item.date)}-${toText(item.day_offset)}`;
              return (
                <div className="astro-list-item" key={key}>
                  <h5>{toText(item.date)}</h5>
                  <p className="section-subtitle">
                    {toText(item.tithi)} | {toText(item.nakshatra)}
                  </p>
                  {tags.length > 0 ? (
                    <div className="astro-tag-row">
                      {tags.map((tag) => (
                        <span className="tag" key={`${key}-${tag}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderMuhuratResult = (data) => {
    const windows = toRecordArray(data.windows);

    return (
      <div className="astro-result-stack">
        <h3>Shubh Muhurat Windows</h3>
        <div className="astro-stat-grid">
          <StatPill label="Days Ahead" value={toText(data.days_ahead)} />
          <StatPill label="Total Windows" value={toText(data.total_windows)} />
        </div>
        <div className="astro-card">
          {windows.length === 0 ? (
            <p>No suitable muhurat found in the selected range.</p>
          ) : (
            windows.slice(0, 8).map((item) => {
              const key = `${toText(item.date)}-${toText(item.day_offset)}`;
              return (
                <div className="astro-list-item" key={key}>
                  <h5>{toText(item.date)}</h5>
                  <p className="section-subtitle">
                    {toText(item.tithi)} | {toText(item.nakshatra)}
                  </p>
                  <DetailRow label="Morning" value={toText(item.morning_window)} />
                  <DetailRow label="Abhijit" value={toText(item.abhijit_approx)} />
                  <DetailRow label="Evening" value={toText(item.evening_window)} />
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (!result || !resultMode) return renderNoResult();
    if (!isRecord(result)) {
      return (
        <div className="astro-placeholder">
          <h4>Unexpected result format</h4>
          <p>Try again in a moment.</p>
        </div>
      );
    }

    if (resultMode === 'complete') return renderCompleteResult(result);
    if (resultMode === 'reading') return renderReadingResult(result);
    if (resultMode === 'kundli') return renderKundliResult(result);
    if (resultMode === 'panchang') return renderPanchangResult(result);
    if (resultMode === 'moon') return renderMoonResult(result);
    if (resultMode === 'dasha') return renderDashaResult(result);
    if (resultMode === 'transit') return renderTransitResult(result);
    if (resultMode === 'alerts') return renderAlertsResult(result);
    return renderMuhuratResult(result);
  };

  return (
    <div className="container">
      <div className="page-shell">
        <section className="horoscope-hero">
          <div className="hero-content">
            <span className="hero-badge">Personal Astro Guide</span>
            <h1>What would you like to know today?</h1>
            <p>
              Choose the kind of guidance you need, share your details once, and get a clear,
              user-friendly result.
            </p>
          </div>
        </section>

        {message.text ? (
          <div className={`message ${message.type}`}>{message.text}</div>
        ) : null}

        <section className="section">
          <div>
            <h2 className="section-title">Choose Your Insight</h2>
            <p className="section-subtitle">Pick a mode to generate your guidance.</p>
          </div>
          <div className="astro-option-grid">
            {INSIGHT_OPTIONS.map((option) => {
              const active = selectedMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`astro-option-card ${active ? 'active' : ''}`}
                  onClick={() => setSelectedMode(option.id)}
                >
                  <h4>{option.title}</h4>
                  <p>{option.subtitle}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="section">
          <div>
            <h2 className="section-title">Your Details</h2>
            <p className="requirement-hint">{requirementHint}</p>
          </div>

          {profileLoading ? (
            <p className="loading">Loading saved profile details...</p>
          ) : (
            <div className="astro-card muted">
              <DetailRow label="Name" value={profileName || '--'} />
              <DetailRow label="Date Of Birth" value={profileDob || '--'} />
              <DetailRow label="Time Of Birth" value={profileTob || '--'} />
              <DetailRow label="Place Of Birth" value={profilePlace || '--'} />
              <Link to="/profile" className="btn btn-secondary">
                Edit Birth Details In Profile
              </Link>
            </div>
          )}

          {selectedOption.usesTopic ? (
            <div className="astro-card">
              <div className="form-group">
                <label htmlFor="astroTopic">What Do You Want Guidance On</label>
                <input
                  id="astroTopic"
                  type="text"
                  placeholder="Example: career growth this month"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                />
              </div>
              <div className="astro-topic-row">
                {TOPIC_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="chip"
                    onClick={() => setTopic(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <label className="switch-row">
                <span>Prefer detailed AI reading</span>
                <input
                  type="checkbox"
                  checked={includeAiReading}
                  onChange={(event) => setIncludeAiReading(event.target.checked)}
                />
              </label>
            </div>
          ) : null}

          {selectedOption.showDateInput ? (
            <div className="form-group">
              <label htmlFor="astroDate">Optional Date</label>
              <input
                id="astroDate"
                type="date"
                value={dateValue}
                onChange={(event) => setDateValue(event.target.value)}
              />
            </div>
          ) : null}

          {selectedOption.showPredictDays ? (
            <div className="form-group">
              <label htmlFor="astroPredictDays">How Many Days Of Festival Alerts</label>
              <input
                id="astroPredictDays"
                type="number"
                min="1"
                max="60"
                value={predictAlertDays}
                onChange={(event) => setPredictAlertDays(event.target.value)}
              />
            </div>
          ) : null}

          {selectedOption.showAlertDays ? (
            <div className="form-group">
              <label htmlFor="astroAlertDays">Days Ahead</label>
              <input
                id="astroAlertDays"
                type="number"
                min="1"
                max="60"
                value={alertDays}
                onChange={(event) => setAlertDays(event.target.value)}
              />
            </div>
          ) : null}

          {selectedOption.showMuhuratDays ? (
            <div className="form-group">
              <label htmlFor="astroMuhuratDays">Days Ahead</label>
              <input
                id="astroMuhuratDays"
                type="number"
                min="1"
                max="30"
                value={muhuratDays}
                onChange={(event) => setMuhuratDays(event.target.value)}
              />
            </div>
          ) : null}

          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || profileLoading}
            onClick={runSelectedInsight}
          >
            {loading ? 'Generating Insight...' : selectedOption.cta}
          </button>
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <h2 className="section-title">Your Result</h2>
              <p className="section-subtitle">
                {resultOption?.title || 'Not generated yet'}
              </p>
            </div>
          </div>

          {loading ? <p className="loading">Preparing your insights...</p> : null}
          {errorText ? <div className="astro-error">{errorText}</div> : null}

          {renderResult()}
        </section>
      </div>
    </div>
  );
}
