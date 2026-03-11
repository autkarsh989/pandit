import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import AppButton from '@/components/AppButton';
import AppTextInput from '@/components/AppTextInput';
import { API_BASE_URL } from '@/lib/config';
import { colors, fonts, spacing } from '@/constants/theme';
import { router } from 'expo-router';

export default function PanditOnboardScreen() {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    password: '',
    email: '',
    experienceYears: '',
    bio: '',
    region: '',
    languages: '',
    locationName: '',
    latitude: '',
    longitude: '',
    pricePerService: '',
  });
  const [message, setMessage] = useState<string | null>(null);

  const handleBack = () => {
    router.back();
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pandit/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.fullName,
          phone: form.phone,
          password: form.password,
          email: form.email || null,
          experience_years: parseInt(form.experienceYears, 10),
          bio: form.bio,
          region: form.region,
          languages: form.languages,
          location_name: form.locationName || null,
          latitude: form.latitude ? parseFloat(form.latitude) : null,
          longitude: form.longitude ? parseFloat(form.longitude) : null,
          price_per_service: parseFloat(form.pricePerService),
        }),
      });
      if (response.ok) {
        setMessage('Pandit registered successfully! Please login as pandit.');
        setTimeout(() => router.replace('/(auth)/login'), 600);
      } else {
        const error = await response.json();
        setMessage(error.detail || 'Failed to register pandit.');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Partner Onboarding</Text>
          <Text style={styles.subTitle}>Please fill in authentic information to build trust.</Text>
        </View>
        <AppButton
          title="Back"
          variant="secondary"
          onPress={handleBack}
        />
      </View>
      <Card style={styles.card}>
        <AppTextInput label="Full Name" value={form.fullName} onChangeText={(text) => setForm((prev) => ({ ...prev, fullName: text }))} />
        <AppTextInput label="Phone Number" value={form.phone} onChangeText={(text) => setForm((prev) => ({ ...prev, phone: text }))} keyboardType="phone-pad" />
        <AppTextInput label="Email" value={form.email} onChangeText={(text) => setForm((prev) => ({ ...prev, email: text }))} keyboardType="email-address" />
        <AppTextInput label="Password" value={form.password} onChangeText={(text) => setForm((prev) => ({ ...prev, password: text }))} secureTextEntry />
        <AppTextInput label="Experience Years" value={form.experienceYears} onChangeText={(text) => setForm((prev) => ({ ...prev, experienceYears: text }))} keyboardType="numeric" />
        <AppTextInput label="Region" value={form.region} onChangeText={(text) => setForm((prev) => ({ ...prev, region: text }))} />
        <AppTextInput label="Languages" value={form.languages} onChangeText={(text) => setForm((prev) => ({ ...prev, languages: text }))} />
        <AppTextInput label="Bio" value={form.bio} onChangeText={(text) => setForm((prev) => ({ ...prev, bio: text }))} multiline />
        <AppTextInput label="Price per Service" value={form.pricePerService} onChangeText={(text) => setForm((prev) => ({ ...prev, pricePerService: text }))} keyboardType="numeric" />
        <AppButton title="Complete Registration" onPress={handleSubmit} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
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
  card: {
    gap: 10,
  },
  message: {
    textAlign: 'center',
    fontFamily: fonts.body,
    color: colors.orange600,
  },
});
