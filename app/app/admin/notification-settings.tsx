import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

import AppButton from '@/components/AppButton';
import Card from '@/components/Card';
import Screen from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetAdminNotificationSettings,
  apiUpdateAdminNotificationSettings,
} from '@/lib/api';
import { colors, fonts, radius, spacing } from '@/constants/theme';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeTimes(values: string[]): string[] {
  const cleaned = values
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const unique = Array.from(new Set(cleaned));
  unique.sort((a, b) => {
    const [ah, am] = a.split(':').map(Number);
    const [bh, bm] = b.split(':').map(Number);
    return ah * 60 + am - (bh * 60 + bm);
  });

  return unique;
}

export default function AdminNotificationSettingsScreen() {
  const { token, userType, ready, signOut } = useAuth();
  const [times, setTimes] = useState<string[]>(['05:00', '10:00', '17:00']);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!token || userType !== 'admin') {
      router.replace('/(auth)/admin');
      return;
    }

    void loadSettings(token);
  }, [ready, token, userType]);

  const invalidEntries = useMemo(
    () => times.filter((value) => value.trim().length > 0 && !TIME_PATTERN.test(value.trim())),
    [times]
  );

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/admin');
        },
      },
    ]);
  };

  const loadSettings = async (adminToken: string) => {
    setLoading(true);
    try {
      const response = await apiGetAdminNotificationSettings(adminToken);
      const normalized = normalizeTimes(Array.isArray(response.send_times) ? response.send_times : []);
      if (normalized.length > 0) {
        setTimes(normalized);
      }
    } catch (error) {
      console.error('Load notification settings error', error);
      Alert.alert('Error', 'Unable to load notification timings.');
    } finally {
      setLoading(false);
    }
  };

  const updateTime = (index: number, value: string) => {
    setTimes((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const addTime = () => {
    if (times.length >= 6) {
      Alert.alert('Limit reached', 'You can add up to 6 notification times.');
      return;
    }
    setTimes((prev) => [...prev, '']);
  };

  const removeTime = (index: number) => {
    if (times.length <= 1) {
      Alert.alert('At least one time required', 'Keep at least one notification time.');
      return;
    }
    setTimes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const saveTimes = async () => {
    if (!token) return;

    const normalized = normalizeTimes(times);

    if (normalized.length < 1) {
      Alert.alert('Validation error', 'Please add at least one notification time.');
      return;
    }

    if (normalized.some((value) => !TIME_PATTERN.test(value))) {
      Alert.alert('Validation error', 'All times must be in HH:MM format. Example: 05:00');
      return;
    }

    setSaving(true);
    try {
      const response = await apiUpdateAdminNotificationSettings(normalized, token);
      setTimes(normalizeTimes(response.send_times));
      Alert.alert('Saved', 'Notification timings updated successfully.');
    } catch (error: any) {
      console.error('Save notification settings error', error);
      Alert.alert('Error', error?.message || 'Failed to update notification timings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Notification Timing</Text>
          <Text style={styles.subTitle}>Set when quote notifications are sent each day.</Text>
        </View>
        <View style={styles.headerActions}>
          <AppButton title="Back" variant="secondary" onPress={() => router.back()} />
          <AppButton title="Logout" variant="secondary" onPress={handleLogout} />
        </View>
      </View>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Daily Send Times (HH:MM)</Text>
        <Text style={styles.hint}>Examples: 05:00, 10:00, 17:00</Text>

        {loading ? <Text style={styles.loading}>Loading current timing...</Text> : null}

        <View style={styles.timeList}>
          {times.map((time, index) => (
            <View key={`slot-${index}`} style={styles.timeRow}>
              <TextInput
                style={styles.timeInput}
                placeholder="HH:MM"
                value={time}
                onChangeText={(text) => updateTime(index, text)}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
              <TouchableOpacity style={styles.removeButton} onPress={() => removeTime(index)}>
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {invalidEntries.length > 0 ? (
          <Text style={styles.errorText}>Fix invalid time format before saving.</Text>
        ) : null}

        <View style={styles.actionsRow}>
          <AppButton title="Add Time" variant="secondary" onPress={addTime} />
          <AppButton title={saving ? 'Saving...' : 'Save Timing'} onPress={saveTimes} disabled={saving} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    gap: 10,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink900,
  },
  subTitle: {
    fontFamily: fonts.body,
    color: colors.ink500,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  card: {
    gap: 10,
  },
  cardTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.ink900,
  },
  hint: {
    fontFamily: fonts.body,
    color: colors.ink500,
  },
  loading: {
    fontFamily: fonts.body,
    color: colors.ink500,
  },
  timeList: {
    gap: 10,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border200,
    borderRadius: radius.md,
    backgroundColor: '#fdfaf7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    color: colors.ink900,
    fontSize: 14,
  },
  removeButton: {
    borderWidth: 1,
    borderColor: colors.border200,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: colors.cream200,
  },
  removeButtonText: {
    fontFamily: fonts.bodySemi,
    color: colors.ink700,
    fontSize: 12,
  },
  errorText: {
    fontFamily: fonts.bodySemi,
    color: colors.orange600,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 6,
  },
});
