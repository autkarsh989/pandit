import { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, View } from 'react-native';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import AppButton from '@/components/AppButton';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { router, useLocalSearchParams } from 'expo-router';

type Pandit = {
  id: string;
  full_name: string;
  experience_years?: number;
  region?: string;
  languages?: string;
  rating_avg?: number;
  review_count?: number;
  bio?: string;
  price_per_service?: number;
};

type Service = {
  id: string;
  name: string;
  category: string;
  base_price: number;
  duration_minutes: number;
  description?: string;
};

export default function PanditPortalScreen() {
  const { token, ready } = useAuth();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const panditId = Array.isArray(id) ? id[0] : id;
  const [pandit, setPandit] = useState<Pandit | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [bookingServiceId, setBookingServiceId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [serviceAddress, setServiceAddress] = useState('');

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    loadPandit();
  }, [ready, token, panditId]);

  const loadPandit = async () => {
    if (!token || !panditId) return;
    try {
      const [panditData, servicesData] = await Promise.all([
        apiGet<Pandit>(`/user/pandits/${panditId}`, token),
        apiGet<Service[]>(`/user/pandits/${panditId}/services`, token),
      ]);
      setPandit(panditData);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      if (servicesData.length > 0) {
        setBookingServiceId(servicesData[0].id);
      }
    } catch (error) {
      console.error('Load pandit error', error);
    }
  };

  const tags = useMemo(() => {
    if (!pandit) return [];
    return [
      pandit.region,
      pandit.languages,
      pandit.experience_years ? `${pandit.experience_years}+ years` : null,
    ].filter(Boolean) as string[];
  }, [pandit]);

  const confirmBooking = async () => {
    if (!token || !pandit) return;
    try {
      await apiPost(
        '/user/bookings',
        {
          pandit_id: pandit.id,
          service_id: bookingServiceId,
          booking_date: bookingDate,
          service_address: serviceAddress,
        },
        token
      );
      setShowModal(false);
      router.push('/(tabs)/bookings');
    } catch (error) {
      console.error('Create booking error', error);
    }
  };

  if (!pandit) {
    return (
      <Screen>
        <Text style={styles.loading}>Loading pandit profile...</Text>
      </Screen>
    );
  }

  return (
    <Screen>
    <Card style={styles.heroCard}>
        <Text style={styles.name}>{pandit.full_name}</Text>
        <Text style={styles.subTitle}>
          {pandit.experience_years ?? 0} years experience • {pandit.region}
        </Text>
        <Text style={styles.rating}>
          {Number.isFinite(pandit.rating_avg) ? pandit.rating_avg?.toFixed(1) : 'N/A'} •{' '}
          {pandit.review_count ?? 0} reviews
        </Text>
        <View style={styles.tagRow}>
          {tags.map((tag) => (
            <Text key={tag} style={styles.tag}>
              {tag}
            </Text>
          ))}
        </View>
      </Card>

      <Card style={styles.sideCard}>
        <Text style={styles.priceLabel}>Consultation starting at</Text>
        <Text style={styles.price}>Rs {pandit.price_per_service ?? 0}</Text>
        <AppButton title="Book Consultation" onPress={() => setShowModal(true)} />
      </Card>

      <Card style={styles.aboutCard}>
        <Text style={styles.sectionTitle}>About Pandit</Text>
        <Text style={styles.sectionText}>{pandit.bio || 'No bio available yet.'}</Text>
      </Card>

      {/* Services list intentionally hidden per updated brief */}

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Your Booking</Text>
            <TextInput
              style={styles.input}
              placeholder="Booking Date (YYYY-MM-DD)"
              value={bookingDate}
              onChangeText={setBookingDate}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Service Address"
              value={serviceAddress}
              onChangeText={setServiceAddress}
              multiline
            />
            <View style={styles.modalActions}>
              <AppButton title="Cancel" variant="secondary" onPress={() => setShowModal(false)} />
              <AppButton title="Confirm" onPress={confirmBooking} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    textAlign: 'center',
    fontFamily: fonts.body,
    color: colors.ink500,
  },
  heroCard: {
    gap: 8,
  },
  name: {
    fontFamily: fonts.headingBold,
    fontSize: 22,
    color: colors.ink900,
  },
  subTitle: {
    fontFamily: fonts.body,
    color: colors.ink500,
  },
  rating: {
    fontFamily: fonts.bodySemi,
    color: colors.orange600,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sideCard: {
    marginTop: spacing.md,
    gap: 8,
  },
  priceLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink500,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  price: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.orange600,
  },
  aboutCard: {
    marginTop: spacing.md,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink900,
    marginTop: spacing.lg,
  },
  sectionText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink500,
  },
  tag: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink700,
    backgroundColor: '#f3e7d8',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(32, 22, 14, 0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 10,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border200,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    backgroundColor: '#fdfaf7',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
});
