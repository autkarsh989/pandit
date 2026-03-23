import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import AppButton from '@/components/AppButton';
import AppTextInput from '@/components/AppTextInput';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import Tag from '@/components/Tag';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { apiGet, apiPost } from '@/lib/api';

type InsightMode =
  | 'complete'
  | 'reading'
  | 'kundli'
  | 'panchang'
  | 'moon'
  | 'dasha'
  | 'transit'
  | 'alerts'
  | 'muhurat';

type InsightOption = {
  id: InsightMode;
  title: string;
  subtitle: string;
  cta: string;
  requiresBirth: boolean;
  requiresPlace: boolean;
  usesTopic?: boolean;
  showDateInput?: boolean;
  showPredictDays?: boolean;
  showAlertDays?: boolean;
  showMuhuratDays?: boolean;
};

type JsonRecord = Record<string, unknown>;

type UserBirthProfile = {
  full_name?: string;
  dob?: string;
  time_of_birth?: string;
  place_of_birth?: string;
};

const INSIGHT_OPTIONS: InsightOption[] = [
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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toText(value: unknown, fallback = '--') {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : fallback;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return fallback;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item : String(item ?? '')))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toRecordArray(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is JsonRecord => isRecord(item));
}

function pickRecord(source: JsonRecord | null, key: string): JsonRecord | null {
  if (!source) return null;
  const value = source[key];
  return isRecord(value) ? value : null;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function HoroscopeScreen() {
  const { token, ready } = useAuth();

  const [selectedMode, setSelectedMode] = useState<InsightMode>('complete');
  const [birthProfile, setBirthProfile] = useState<UserBirthProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [topic, setTopic] = useState('daily guidance for my day');
  const [dateValue, setDateValue] = useState('');
  const [predictAlertDays, setPredictAlertDays] = useState('7');
  const [alertDays, setAlertDays] = useState('7');
  const [muhuratDays, setMuhuratDays] = useState('7');
  const [includeAiReading, setIncludeAiReading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [resultMode, setResultMode] = useState<InsightMode | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }

    const loadBirthProfile = async () => {
      setProfileLoading(true);
      try {
        const profile = await apiGet<UserBirthProfile>('/user/profile', token);
        setBirthProfile(profile);
      } catch {
        setBirthProfile(null);
      } finally {
        setProfileLoading(false);
      }
    };

    loadBirthProfile();
  }, [ready, token]);

  const profileName = birthProfile?.full_name?.trim() || '';
  const profileDob = birthProfile?.dob?.trim() || '';
  const profileTob = birthProfile?.time_of_birth?.trim() || '';
  const profilePlace = birthProfile?.place_of_birth?.trim() || '';
  const hasCompleteBirth = !!(profileName && profileDob && profileTob && profilePlace);
  const hasPlaceOnly = !!profilePlace;

  const selectedOption = useMemo(
    () => INSIGHT_OPTIONS.find((option) => option.id === selectedMode) ?? INSIGHT_OPTIONS[0],
    [selectedMode]
  );

  const resultOption = useMemo(
    () => INSIGHT_OPTIONS.find((option) => option.id === resultMode) ?? null,
    [resultMode]
  );

  const requirementHint = useMemo(() => {
    if (selectedOption.requiresBirth) {
      return hasCompleteBirth
        ? 'Using saved birth details from your profile.'
        : 'Birth details are missing. Save them in Profile tab to generate this insight.';
    }
    if (selectedOption.requiresPlace) {
      return hasPlaceOnly
        ? 'Using saved place of birth from your profile.'
        : 'Place of birth is missing. Save it in Profile tab to generate this insight.';
    }
    return 'No required fields for this insight.';
  }, [selectedOption, hasCompleteBirth, hasPlaceOnly]);

  const parseBoundedInt = (raw: string, label: string, min: number, max: number): number | null => {
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

  const validateInputs = (option: InsightOption): boolean => {
    if (option.requiresBirth) {
      if (!hasCompleteBirth) {
        setErrorText('Birth details missing. Please save name, DOB, time and place in Profile tab first.');
        return false;
      }
    } else if (option.requiresPlace && !hasPlaceOnly) {
      setErrorText('Place of birth missing. Please save it in Profile tab first.');
      return false;
    }
    return true;
  };

  const runSelectedInsight = async () => {
    if (!token) return;
    if (!validateInputs(selectedOption)) return;

    const birthPayload = {
      name: profileName,
      dob: profileDob,
      tob: profileTob,
      place: profilePlace,
    };

    let requestPromise: Promise<unknown>;

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
        token
      );
    } else if (selectedMode === 'reading') {
      requestPromise = apiPost(
        '/reading',
        {
          ...birthPayload,
          topic: topic.trim() || 'daily guidance for my day',
          include_ai_reading: includeAiReading,
        },
        token
      );
    } else if (selectedMode === 'kundli') {
      requestPromise = apiPost('/kundli', birthPayload, token);
    } else if (selectedMode === 'panchang') {
      requestPromise = apiPost(
        '/panchang/today',
        {
          place: profilePlace,
          date: dateValue.trim() || undefined,
        },
        token
      );
    } else if (selectedMode === 'moon') {
      requestPromise = apiPost(
        '/moon-phase/today',
        {
          place: profilePlace,
          date: dateValue.trim() || undefined,
        },
        token
      );
    } else if (selectedMode === 'dasha') {
      requestPromise = apiPost('/dasha', birthPayload, token);
    } else if (selectedMode === 'transit') {
      requestPromise = apiPost('/transit', birthPayload, token);
    } else if (selectedMode === 'alerts') {
      const parsedAlertDays = parseBoundedInt(alertDays, 'Days ahead', 1, 60);
      if (parsedAlertDays === null) return;

      requestPromise = apiPost(
        '/alerts',
        {
          place: profilePlace,
          days_ahead: parsedAlertDays,
        },
        token
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
        token
      );
    }

    setErrorText(null);
    setLoading(true);
    try {
      const response = await requestPromise;
      setResult(response);
      setResultMode(selectedMode);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate insight right now.';
      setErrorText(message);
    } finally {
      setLoading(false);
    }
  };

  const renderNoResult = () => (
    <View style={styles.placeholderWrap}>
      <Text style={styles.placeholderTitle}>Your insights will appear here</Text>
      <Text style={styles.placeholderText}>
        Enter details, choose what you want to know, and tap the generate button.
      </Text>
    </View>
  );

  const renderCompleteResult = (data: JsonRecord) => {
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
      <View style={styles.resultStack}>
        <Text style={styles.resultTitle}>Complete Snapshot</Text>
        <View style={styles.statGrid}>
          <StatPill label="Score" value={toText(scorecard?.score)} />
          <StatPill label="Moon" value={toText(moonPhase?.phase)} />
          <StatPill label="Alerts" value={String(alerts.length)} />
          <StatPill label="Muhurat" value={String(muhuratWindows.length)} />
        </View>

        <Card style={styles.innerCard}>
          <Text style={styles.innerTitle}>Reading</Text>
          <Text style={styles.innerText}>{toText(reading?.text, 'Reading not available')}</Text>
        </Card>

        <Card style={styles.innerCard}>
          <Text style={styles.innerTitle}>Current Dasha</Text>
          <DetailRow label="Mahadasha" value={toText(dasha?.mahadasha)} />
          <DetailRow label="Antardasha" value={toText(dasha?.antardasha)} />
          <DetailRow
            label="Remaining Mahadasha Years"
            value={toText(dasha?.remaining_mahadasha_years)}
          />
        </Card>

        {strengths.length > 0 ? (
          <Card style={styles.innerCard}>
            <Text style={styles.innerTitle}>Strengths</Text>
            <View style={styles.tagWrap}>
              {strengths.map((item) => (
                <Tag key={item} label={item} />
              ))}
            </View>
          </Card>
        ) : null}

        {growth.length > 0 ? (
          <Card style={styles.innerCard}>
            <Text style={styles.innerTitle}>Growth Areas</Text>
            <View style={styles.tagWrap}>
              {growth.map((item) => (
                <Tag key={item} label={item} />
              ))}
            </View>
          </Card>
        ) : null}

        {remedyPlanets.length > 0 ? (
          <Card style={styles.innerCard}>
            <Text style={styles.innerTitle}>Suggested Remedy Planets</Text>
            <View style={styles.tagWrap}>
              {remedyPlanets.map((item) => (
                <Tag key={item} label={item} />
              ))}
            </View>
          </Card>
        ) : null}
      </View>
    );
  };

  const renderReadingResult = (data: JsonRecord) => {
    const reading = pickRecord(data, 'reading');
    const scorecard = pickRecord(data, 'scorecard');
    const strengths = toStringArray(scorecard?.strengths);
    const growth = toStringArray(scorecard?.growth_areas);

    return (
      <View style={styles.resultStack}>
        <Text style={styles.resultTitle}>Personal Reading</Text>
        <View style={styles.statGrid}>
          <StatPill label="Profile Score" value={toText(scorecard?.score)} />
          <StatPill label="Topic" value={toText(reading?.topic)} />
        </View>
        <Card style={styles.innerCard}>
          <Text style={styles.innerTitle}>Guidance</Text>
          <Text style={styles.innerText}>{toText(reading?.text, 'Reading not available')}</Text>
        </Card>

        {strengths.length > 0 ? (
          <Card style={styles.innerCard}>
            <Text style={styles.innerTitle}>Strengths</Text>
            <View style={styles.tagWrap}>
              {strengths.map((item) => (
                <Tag key={item} label={item} />
              ))}
            </View>
          </Card>
        ) : null}

        {growth.length > 0 ? (
          <Card style={styles.innerCard}>
            <Text style={styles.innerTitle}>Growth Areas</Text>
            <View style={styles.tagWrap}>
              {growth.map((item) => (
                <Tag key={item} label={item} />
              ))}
            </View>
          </Card>
        ) : null}
      </View>
    );
  };

  const renderKundliResult = (data: JsonRecord) => {
    const lagna = pickRecord(data, 'lagna');
    const scorecard = pickRecord(data, 'scorecard');
    const planetPositions = pickRecord(data, 'planet_positions');
    const firstPlanets = planetPositions ? Object.entries(planetPositions).slice(0, 7) : [];

    return (
      <View style={styles.resultStack}>
        <Text style={styles.resultTitle}>Kundli Overview</Text>
        <View style={styles.statGrid}>
          <StatPill label="Lagna" value={toText(lagna?.rashi)} />
          <StatPill label="Lagna Degree" value={toText(lagna?.degree_in_rashi)} />
          <StatPill label="Score" value={toText(scorecard?.score)} />
        </View>

        {firstPlanets.length > 0 ? (
          <Card style={styles.innerCard}>
            <Text style={styles.innerTitle}>Key Planet Positions</Text>
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
          </Card>
        ) : null}
      </View>
    );
  };

  const renderPanchangResult = (data: JsonRecord) => {
    const panchang = pickRecord(data, 'panchang');
    const moonPhase = pickRecord(data, 'moon_phase');

    return (
      <View style={styles.resultStack}>
        <Text style={styles.resultTitle}>Panchang For {toText(data.date, 'Selected Date')}</Text>
        <Card style={styles.innerCard}>
          <DetailRow label="Tithi" value={toText(panchang?.tithi_name)} />
          <DetailRow label="Paksha" value={toText(panchang?.paksha)} />
          <DetailRow label="Nakshatra" value={toText(panchang?.nakshatra)} />
          <DetailRow label="Yoga" value={toText(panchang?.yoga)} />
          <DetailRow label="Karana" value={toText(panchang?.karana)} />
        </Card>
        <Card style={styles.innerCard}>
          <DetailRow label="Moon Phase" value={toText(moonPhase?.phase)} />
          <DetailRow
            label="Illumination"
            value={`${toText(moonPhase?.illumination_percent)}%`}
          />
        </Card>
      </View>
    );
  };

  const renderMoonResult = (data: JsonRecord) => {
    const moonPhase = pickRecord(data, 'moon_phase');

    return (
      <View style={styles.resultStack}>
        <Text style={styles.resultTitle}>Moon Phase For {toText(data.date, 'Selected Date')}</Text>
        <View style={styles.statGrid}>
          <StatPill label="Phase" value={toText(moonPhase?.phase)} />
          <StatPill
            label="Illumination"
            value={`${toText(moonPhase?.illumination_percent)}%`}
          />
          <StatPill label="Tithi" value={toText(moonPhase?.tithi)} />
          <StatPill label="Paksha" value={toText(moonPhase?.paksha)} />
        </View>
      </View>
    );
  };

  const renderDashaResult = (data: JsonRecord) => {
    const dasha = pickRecord(data, 'dasha');
    const mahaTotal = toNumber(dasha?.total_mahadasha_years);
    const mahaRemaining = toNumber(dasha?.remaining_mahadasha_years);
    const progress =
      mahaTotal && mahaRemaining !== null
        ? Math.max(0, Math.min(100, Math.round(((mahaTotal - mahaRemaining) / mahaTotal) * 100)))
        : null;

    return (
      <View style={styles.resultStack}>
        <Text style={styles.resultTitle}>Current Dasha Timeline</Text>
        <Card style={styles.innerCard}>
          <DetailRow label="Mahadasha" value={toText(dasha?.mahadasha)} />
          <DetailRow label="Antardasha" value={toText(dasha?.antardasha)} />
          <DetailRow
            label="Elapsed Years In Mahadasha"
            value={toText(dasha?.elapsed_years_in_mahadasha)}
          />
          <DetailRow
            label="Remaining Years In Mahadasha"
            value={toText(dasha?.remaining_mahadasha_years)}
          />
          {progress !== null ? <DetailRow label="Mahadasha Progress" value={`${progress}%`} /> : null}
        </Card>
      </View>
    );
  };

  const renderTransitResult = (data: JsonRecord) => {
    const snapshot = pickRecord(data, 'transit_snapshot');
    const entries = snapshot ? Object.entries(snapshot) : [];
    const changed = entries.filter(([, value]) => {
      const details = isRecord(value) ? value : null;
      return details?.changed === true;
    });

    return (
      <View style={styles.resultStack}>
        <Text style={styles.resultTitle}>Transit Changes</Text>
        <View style={styles.statGrid}>
          <StatPill label="Planets Tracked" value={String(entries.length)} />
          <StatPill label="Changed" value={String(changed.length)} />
        </View>
        <Card style={styles.innerCard}>
          {changed.length === 0 ? (
            <Text style={styles.innerText}>No major sign change detected right now.</Text>
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
        </Card>
      </View>
    );
  };

  const renderAlertsResult = (data: JsonRecord) => {
    const alerts = toRecordArray(data.alerts);

    return (
      <View style={styles.resultStack}>
        <Text style={styles.resultTitle}>Upcoming Alerts</Text>
        <View style={styles.statGrid}>
          <StatPill label="Days Ahead" value={toText(data.days_ahead)} />
          <StatPill label="Total Alerts" value={toText(data.alerts_count)} />
        </View>

        <Card style={styles.innerCard}>
          {alerts.length === 0 ? (
            <Text style={styles.innerText}>No alerts found in the selected window.</Text>
          ) : (
            alerts.slice(0, 8).map((item) => {
              const tags = toStringArray(item.tags);
              const key = `${toText(item.date)}-${toText(item.day_offset)}`;

              return (
                <View key={key} style={styles.listItem}>
                  <Text style={styles.listItemTitle}>{toText(item.date)}</Text>
                  <Text style={styles.listItemSubtitle}>
                    {toText(item.tithi)} | {toText(item.nakshatra)}
                  </Text>
                  {tags.length > 0 ? (
                    <View style={styles.tagWrap}>
                      {tags.map((tag) => (
                        <Tag key={`${key}-${tag}`} label={tag} />
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </Card>
      </View>
    );
  };

  const renderMuhuratResult = (data: JsonRecord) => {
    const windows = toRecordArray(data.windows);

    return (
      <View style={styles.resultStack}>
        <Text style={styles.resultTitle}>Shubh Muhurat Windows</Text>
        <View style={styles.statGrid}>
          <StatPill label="Days Ahead" value={toText(data.days_ahead)} />
          <StatPill label="Total Windows" value={toText(data.total_windows)} />
        </View>

        <Card style={styles.innerCard}>
          {windows.length === 0 ? (
            <Text style={styles.innerText}>No suitable muhurat found in the selected range.</Text>
          ) : (
            windows.slice(0, 8).map((item) => {
              const key = `${toText(item.date)}-${toText(item.day_offset)}`;
              return (
                <View key={key} style={styles.listItem}>
                  <Text style={styles.listItemTitle}>{toText(item.date)}</Text>
                  <Text style={styles.listItemSubtitle}>
                    {toText(item.tithi)} | {toText(item.nakshatra)}
                  </Text>
                  <DetailRow label="Morning" value={toText(item.morning_window)} />
                  <DetailRow label="Abhijit" value={toText(item.abhijit_approx)} />
                  <DetailRow label="Evening" value={toText(item.evening_window)} />
                </View>
              );
            })
          )}
        </Card>
      </View>
    );
  };

  const renderResult = () => {
    if (!result || !resultMode) {
      return renderNoResult();
    }

    if (!isRecord(result)) {
      return (
        <View style={styles.placeholderWrap}>
          <Text style={styles.placeholderTitle}>Unexpected result format</Text>
          <Text style={styles.placeholderText}>Try again in a moment.</Text>
        </View>
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
    <Screen>
      <LinearGradient colors={['#d77929', '#9f4f18']} style={styles.heroCard}>
        <Text style={styles.heroKicker}>Personal Astro Guide</Text>
        <Text style={styles.heroTitle}>What would you like to know today?</Text>
        <Text style={styles.heroSubtitle}>
          Choose the kind of guidance you need, share your details once, and get a clear,
          user-friendly result.
        </Text>
      </LinearGradient>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Choose Your Insight</Text>
        <View style={styles.optionGrid}>
          {INSIGHT_OPTIONS.map((option) => {
            const active = selectedMode === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => setSelectedMode(option.id)}
                activeOpacity={0.9}
                style={[styles.optionCard, active ? styles.optionCardActive : null]}
              >
                <Text style={[styles.optionTitle, active ? styles.optionTitleActive : null]}>
                  {option.title}
                </Text>
                <Text
                  style={[styles.optionSubtitle, active ? styles.optionSubtitleActive : null]}
                >
                  {option.subtitle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Your Details</Text>
        <Text style={styles.requirementHint}>{requirementHint}</Text>

        {profileLoading ? (
          <View style={styles.loadingWrapInline}>
            <ActivityIndicator color={colors.orange600} />
            <Text style={styles.loadingText}>Loading saved profile details...</Text>
          </View>
        ) : (
          <Card style={styles.innerCardMuted}>
            <DetailRow label="Name" value={profileName || '--'} />
            <DetailRow label="Date Of Birth" value={profileDob || '--'} />
            <DetailRow label="Time Of Birth" value={profileTob || '--'} />
            <DetailRow label="Place Of Birth" value={profilePlace || '--'} />
            <AppButton
              title="Edit Birth Details In Profile"
              variant="secondary"
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.profileRedirectButton}
            />
          </Card>
        )}

        {selectedOption.usesTopic ? (
          <>
            <AppTextInput
              label="What Do You Want Guidance On"
              placeholder="Example: career growth this month"
              value={topic}
              onChangeText={setTopic}
            />
            <View style={styles.topicPresetWrap}>
              {TOPIC_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  onPress={() => setTopic(preset)}
                  style={styles.topicPreset}
                  activeOpacity={0.85}
                >
                  <Text style={styles.topicPresetText}>{preset}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Prefer detailed AI reading</Text>
              <Switch
                value={includeAiReading}
                onValueChange={setIncludeAiReading}
                trackColor={{ false: '#dbdbdb', true: colors.orange400 }}
                thumbColor={includeAiReading ? colors.orange600 : '#f4f3f4'}
              />
            </View>
          </>
        ) : null}

        {selectedOption.showDateInput ? (
          <AppTextInput
            label="Optional Date"
            placeholder="YYYY-MM-DD"
            value={dateValue}
            onChangeText={setDateValue}
          />
        ) : null}

        {selectedOption.showPredictDays ? (
          <AppTextInput
            label="How Many Days Of Festival Alerts"
            placeholder="1 to 60"
            value={predictAlertDays}
            onChangeText={setPredictAlertDays}
            keyboardType="numeric"
          />
        ) : null}

        {selectedOption.showAlertDays ? (
          <AppTextInput
            label="Days Ahead"
            placeholder="1 to 60"
            value={alertDays}
            onChangeText={setAlertDays}
            keyboardType="numeric"
          />
        ) : null}

        {selectedOption.showMuhuratDays ? (
          <AppTextInput
            label="Days Ahead"
            placeholder="1 to 30"
            value={muhuratDays}
            onChangeText={setMuhuratDays}
            keyboardType="numeric"
          />
        ) : null}

        <AppButton
          title={loading ? 'Generating Insight...' : selectedOption.cta}
          disabled={loading || profileLoading}
          onPress={runSelectedInsight}
          style={styles.generateButton}
        />
      </Card>

      <Card style={styles.sectionCard}>
        <View style={styles.resultHeadRow}>
          <Text style={styles.sectionTitle}>Your Result</Text>
          <Text style={styles.resultModeLabel}>{resultOption?.title ?? 'Not generated yet'}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.orange600} />
            <Text style={styles.loadingText}>Preparing your insights...</Text>
          </View>
        ) : null}

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        {renderResult()}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.lift,
  },
  heroKicker: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#ffe4c7',
  },
  heroTitle: {
    marginTop: 10,
    fontFamily: fonts.headingBold,
    fontSize: 30,
    lineHeight: 36,
    color: '#fff5e8',
  },
  heroSubtitle: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: '#f8dbc0',
  },
  sectionCard: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 21,
    color: colors.ink900,
    marginBottom: spacing.sm,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionCard: {
    width: '48%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border200,
    backgroundColor: '#fffaf5',
    padding: spacing.sm,
  },
  optionCardActive: {
    borderColor: colors.orange600,
    backgroundColor: '#ffeedb',
  },
  optionTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink900,
  },
  optionTitleActive: {
    color: colors.orange700,
  },
  optionSubtitle: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink500,
    lineHeight: 18,
  },
  optionSubtitleActive: {
    color: colors.ink700,
  },
  requirementHint: {
    marginBottom: spacing.md,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.orange700,
    backgroundColor: '#fff3e5',
    borderWidth: 1,
    borderColor: '#f3dac0',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  topicPresetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  topicPreset: {
    borderWidth: 1,
    borderColor: '#f0d7bf',
    backgroundColor: '#fff7ef',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  topicPresetText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink700,
  },
  switchRow: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border200,
    borderRadius: radius.md,
    backgroundColor: '#fdfaf7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink700,
  },
  generateButton: {
    marginTop: 4,
  },
  loadingWrapInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  innerCardMuted: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#eadbc9',
    backgroundColor: '#fff9f2',
    padding: spacing.sm,
    shadowOpacity: 0,
    elevation: 0,
  },
  profileRedirectButton: {
    marginTop: 8,
  },
  resultHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  resultModeLabel: {
    maxWidth: '55%',
    textAlign: 'right',
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.orange700,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink700,
  },
  errorText: {
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#f2c5c5',
    borderRadius: radius.md,
    backgroundColor: '#fff2f2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#a33737',
    fontFamily: fonts.bodySemi,
    fontSize: 13,
  },
  placeholderWrap: {
    borderWidth: 1,
    borderColor: colors.border200,
    borderRadius: radius.md,
    backgroundColor: '#fcf7f0',
    padding: spacing.md,
  },
  placeholderTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink900,
  },
  placeholderText: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink500,
  },
  resultStack: {
    gap: spacing.sm,
  },
  resultTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink900,
    marginBottom: 2,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statPill: {
    minWidth: 110,
    borderRadius: radius.md,
    backgroundColor: '#fff4e8',
    borderWidth: 1,
    borderColor: '#f3dcc2',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink500,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statValue: {
    marginTop: 2,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink900,
  },
  innerCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#f0dfcc',
    backgroundColor: '#fffaf5',
    padding: spacing.sm,
    shadowOpacity: 0,
    elevation: 0,
  },
  innerTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink900,
    marginBottom: 8,
  },
  innerText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink700,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  listItem: {
    borderTopWidth: 1,
    borderTopColor: '#f0dfcc',
    paddingTop: 10,
    marginTop: 10,
  },
  listItemTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.ink900,
  },
  listItemSubtitle: {
    marginTop: 2,
    marginBottom: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink500,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  detailLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink500,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.ink900,
  },
});
