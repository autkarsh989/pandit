import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import AppButton from '@/components/AppButton';
import AppTextInput from '@/components/AppTextInput';
import { colors, fonts, spacing } from '@/constants/theme';
import { apiGet, apiPut } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

type PanditProfile = {
  full_name?: string;
  phone?: string;
  email?: string;
  experience_years?: number;
  bio?: string;
  region?: string;
  languages?: string;
  price_per_service?: number;
  location_name?: string;
  latitude?: number;
  longitude?: number;
};

type UserProfile = {
  full_name?: string;
  phone?: string;
  email?: string;
  dob?: string;
  time_of_birth?: string;
  place_of_birth?: string;
};

export default function ProfileScreen() {
  const { token, userType, ready, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [birthForm, setBirthForm] = useState({
    dob: '',
    timeOfBirth: '',
    placeOfBirth: '',
  });
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    experienceYears: '',
    bio: '',
    region: '',
    languages: '',
    pricePerService: '',
    locationName: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    loadProfile();
  }, [ready, token, userType]);

  const loadProfile = async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (userType === 'pandit') {
        const data = await apiGet<PanditProfile>('/pandit/profile', token);
        setForm({
          fullName: data.full_name || '',
          phone: data.phone || '',
          email: data.email || '',
          experienceYears: data.experience_years?.toString() || '',
          bio: data.bio || '',
          region: data.region || '',
          languages: data.languages || '',
          pricePerService: data.price_per_service?.toString() || '',
          locationName: data.location_name || '',
          latitude: data.latitude?.toString() || '',
          longitude: data.longitude?.toString() || '',
        });
      } else {
        const data = await apiGet<UserProfile>('/user/profile', token);
        setUserProfile(data);
        setBirthForm({
          dob: data.dob || '',
          timeOfBirth: data.time_of_birth || '',
          placeOfBirth: data.place_of_birth || '',
        });
      }
    } catch (error) {
      console.error('Load profile error', error);
    } finally {
      setLoading(false);
    }
  };

  const saveBirthDetails = async () => {
    if (!token) return;
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (birthForm.timeOfBirth && !timeRegex.test(birthForm.timeOfBirth)) {
      Alert.alert('Invalid Time', 'Time of birth must be in HH:MM 24-hour format');
      return;
    }

    try {
      const payload = {
        dob: birthForm.dob || null,
        time_of_birth: birthForm.timeOfBirth || null,
        place_of_birth: birthForm.placeOfBirth || null,
      };
      const res = await apiPut<any>('/user/profile/dob', payload, token);
      setBirthForm({
        dob: res?.dob || '',
        timeOfBirth: res?.time_of_birth || '',
        placeOfBirth: res?.place_of_birth || '',
      });
      setUserProfile((prev) => ({
        ...(prev || {}),
        dob: res?.dob || undefined,
        time_of_birth: res?.time_of_birth || undefined,
        place_of_birth: res?.place_of_birth || undefined,
      }));
      Alert.alert('Success', 'Birth details updated');
    } catch (error) {
      console.error('Save birth details error', error);
      Alert.alert('Error', 'Failed to update birth details');
    }
  };

  const updateProfile = async () => {
    if (!token) return;
    const params = new URLSearchParams();
    if (form.fullName) params.append('full_name', form.fullName);
    if (form.phone) params.append('phone', form.phone);
    if (form.email !== '') params.append('email', form.email);
    if (form.experienceYears !== '') params.append('experience_years', form.experienceYears);
    if (form.bio) params.append('bio', form.bio);
    if (form.region) params.append('region', form.region);
    if (form.languages) params.append('languages', form.languages);
    if (form.pricePerService !== '') params.append('price_per_service', form.pricePerService);
    if (form.locationName) params.append('location_name', form.locationName);
    try {
      await apiPut(`/pandit/profile?${params.toString()}`, undefined, token);
    } catch (error) {
      console.error('Update profile error', error);
    }
  };

  const updateLocation = async () => {
    if (!token) return;
    if (!form.latitude || !form.longitude) return;
    const params = new URLSearchParams({
      latitude: form.latitude,
      longitude: form.longitude,
    });
    if (form.locationName) params.append('location_name', form.locationName);
    try {
      await apiPut(`/pandit/location?${params.toString()}`, undefined, token);
    } catch (error) {
      console.error('Update location error', error);
    }
  };

  if (loading) {
    return (
      <Screen>
        <Text style={styles.loading}>Loading profile...</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.pageTitle}>My Profile</Text>
      <Text style={styles.pageSubtitle}>Keep your profile and location up to date.</Text>

      {userType !== 'pandit' ? (
        <>
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Birth Details</Text>
            <Text style={styles.cardSub}>Add now or update later for horoscope and personalized services.</Text>
            <AppTextInput
              label="Date of Birth (YYYY-MM-DD)"
              value={birthForm.dob}
              onChangeText={(text) => setBirthForm((prev) => ({ ...prev, dob: text }))}
            />
            <AppTextInput
              label="Time of Birth (HH:MM, 24-hour)"
              value={birthForm.timeOfBirth}
              onChangeText={(text) => setBirthForm((prev) => ({ ...prev, timeOfBirth: text }))}
            />
            <AppTextInput
              label="Place of Birth"
              value={birthForm.placeOfBirth}
              onChangeText={(text) => setBirthForm((prev) => ({ ...prev, placeOfBirth: text }))}
            />
            <AppButton title="Save Birth Details" onPress={saveBirthDetails} />
            {userProfile?.full_name ? <Text style={styles.cardSub}>Account: {userProfile.full_name}</Text> : null}
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Account Settings</Text>
            <Text style={styles.cardSub}>Manage your sign in and preferences.</Text>
            <AppButton title="Sign Out" variant="secondary" onPress={signOut} />
          </Card>
        </>
      ) : (
        <>
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Profile Details</Text>
            <AppTextInput
              label="Full Name"
              value={form.fullName}
              onChangeText={(text) => setForm((prev) => ({ ...prev, fullName: text }))}
            />
            <AppTextInput
              label="Phone"
              value={form.phone}
              onChangeText={(text) => setForm((prev) => ({ ...prev, phone: text }))}
              keyboardType="phone-pad"
            />
            <AppTextInput
              label="Email"
              value={form.email}
              onChangeText={(text) => setForm((prev) => ({ ...prev, email: text }))}
              keyboardType="email-address"
            />
            <AppTextInput
              label="Experience (years)"
              value={form.experienceYears}
              onChangeText={(text) => setForm((prev) => ({ ...prev, experienceYears: text }))}
              keyboardType="numeric"
            />
            <AppTextInput
              label="Bio"
              value={form.bio}
              onChangeText={(text) => setForm((prev) => ({ ...prev, bio: text }))}
              multiline
            />
            <AppTextInput
              label="Region"
              value={form.region}
              onChangeText={(text) => setForm((prev) => ({ ...prev, region: text }))}
            />
            <AppTextInput
              label="Languages"
              value={form.languages}
              onChangeText={(text) => setForm((prev) => ({ ...prev, languages: text }))}
            />
            <AppTextInput
              label="Price per Service (Rs)"
              value={form.pricePerService}
              onChangeText={(text) => setForm((prev) => ({ ...prev, pricePerService: text }))}
              keyboardType="numeric"
            />
            <AppButton title="Save Profile" onPress={updateProfile} />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Location & Coordinates</Text>
            <AppTextInput
              label="Location Name"
              value={form.locationName}
              onChangeText={(text) => setForm((prev) => ({ ...prev, locationName: text }))}
            />
            <AppTextInput
              label="Latitude"
              value={form.latitude}
              onChangeText={(text) => setForm((prev) => ({ ...prev, latitude: text }))}
              keyboardType="numeric"
            />
            <AppTextInput
              label="Longitude"
              value={form.longitude}
              onChangeText={(text) => setForm((prev) => ({ ...prev, longitude: text }))}
              keyboardType="numeric"
            />
            <AppButton title="Save Location" variant="secondary" onPress={updateLocation} />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Account Settings</Text>
            <Text style={styles.cardSub}>Manage your sign in and preferences.</Text>
            <AppButton title="Sign Out" variant="secondary" onPress={signOut} />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.ink900,
  },
  pageSubtitle: {
    fontFamily: fonts.body,
    color: colors.ink500,
    marginBottom: spacing.md,
  },
  loading: {
    textAlign: 'center',
    fontFamily: fonts.body,
    color: colors.ink500,
  },
  card: {
    marginBottom: spacing.lg,
    gap: 10,
  },
  cardTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink900,
  },
  cardSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink500,
  },
});
