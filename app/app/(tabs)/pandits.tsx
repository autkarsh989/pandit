import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import Tag from '@/components/Tag';
import AppButton from '@/components/AppButton';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';
import { apiGet, apiPut, apiPost } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

type Pandit = {
  id: string;
  full_name?: string;
  name?: string;
  bio?: string;
  languages?: string;
  region?: string;
  rating_avg?: number;
  review_count?: number;
  experience_years?: number;
  price_per_service?: number;
};

type Service = {
  id: string;
  name: string;
  base_price: number;
};

export default function PanditsScreen() {
  const { token, ready } = useAuth();
  const [pandits, setPandits] = useState<Pandit[]>([]);
  const [allPandits, setAllPandits] = useState<Pandit[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState({ latitude: '', longitude: '', locationName: '' });
  const [filters, setFilters] = useState({
    maxDistance: '50',
    minRating: '0',
    maxPrice: '',
    sortBy: 'match_score',
  });
  const [uiFilters, setUiFilters] = useState({
    serviceType: 'All Pujas & Rituals',
    language: 'All Languages',
    priceRange: 'Any Price',
  });
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedPanditId, setSelectedPanditId] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [bookingServiceId, setBookingServiceId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [serviceAddress, setServiceAddress] = useState('');

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    loadAllPandits();
  }, [ready, token]);

  const loadAllPandits = async () => {
    if (!token) return;
    try {
      const data = await apiGet<{ items: Pandit[] }>('/user/pandits/paged?skip=0&limit=12', token);
      setAllPandits(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error('Load all pandits error', error);
    }
  };

  const loadNearbyPandits = async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Update location if provided
      if (location.latitude && location.longitude) {
        const params = new URLSearchParams({
          latitude: location.latitude,
          longitude: location.longitude,
        });
        if (location.locationName) {
          params.append('location_name', location.locationName);
        }
        await apiPut(`/user/location?${params.toString()}`, undefined, token);
      }

      // Search for nearby pandits
      const searchParams = new URLSearchParams({
        max_distance_km: filters.maxDistance || '50',
        min_rating: filters.minRating || '0',
        sort_by: filters.sortBy,
      });
      if (filters.maxPrice) {
        searchParams.append('max_price', filters.maxPrice);
      }
      if (location.latitude && location.longitude) {
        searchParams.append('latitude', location.latitude);
        searchParams.append('longitude', location.longitude);
      }

      const data = await apiGet<Pandit[]>(`/user/pandits/search?${searchParams.toString()}`, token);
      setPandits(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Load nearby pandits error', error);
    } finally {
      setLoading(false);
    }
  };

  const openBookingModal = async (panditId: string) => {
    setSelectedPanditId(panditId);
    setShowBookingModal(true);
    try {
      const data = await apiGet<Service[]>(`/user/pandits/${panditId}/services`, token);
      setServices(Array.isArray(data) ? data : []);
      if (data.length > 0) {
        setBookingServiceId(data[0].id);
      }
    } catch (error) {
      console.error('Load services error', error);
    }
  };

  const createBooking = async () => {
    if (!token || !selectedPanditId) return;
    try {
      await apiPost(
        '/user/bookings',
        {
          pandit_id: selectedPanditId,
          service_id: bookingServiceId,
          booking_date: bookingDate,
          service_address: serviceAddress,
        },
        token
      );
      setShowBookingModal(false);
      router.push('/(tabs)/bookings');
    } catch (error) {
      console.error('Create booking error', error);
    }
  };

  const getName = (pandit: Pandit) =>
    pandit.full_name || pandit.name || `Pandit ${pandit.id.slice(0, 4)}`;

  const getInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');

  const renderPanditCard = (pandit: Pandit, keyPrefix = '') => {
    const name = getName(pandit);
    const rating = Number.isFinite(pandit.rating_avg) ? pandit.rating_avg?.toFixed(1) : 'N/A';
    const languages = pandit.languages ? pandit.languages.split(',').map((lang) => lang.trim()) : [];

    return (
      <TouchableOpacity
        key={`${keyPrefix}${pandit.id}`}
        onPress={() => router.push(`/pandit/${pandit.id}`)}
        activeOpacity={0.9}
      >
        <Card style={styles.panditCard}>
          <View style={styles.panditHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(name)}</Text>
            </View>
            <View style={styles.panditInfo}>
              <Text style={styles.panditName}>{name}</Text>
              <Text style={styles.panditMeta}>
                {rating} • {pandit.review_count ?? 0} reviews • {pandit.experience_years ?? 0} yrs
              </Text>
            </View>
          </View>
          <View style={styles.tagRow}>
            {languages.slice(0, 3).map((lang) => (
              <Tag key={`${pandit.id}-${lang}`} label={lang} />
            ))}
            {pandit.region ? <Tag label={pandit.region} /> : null}
          </View>
          <Text style={styles.panditBio}>
            {pandit.bio || 'Specialist in traditional rituals and personalized guidance.'}
          </Text>
          <View style={styles.cardFooter}>
            <Text style={styles.price}>Starting from Rs {pandit.price_per_service ?? 0}</Text>
            <AppButton
              title="Book Now"
              onPress={() => openBookingModal(pandit.id)}
            />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <Card style={styles.hero}>
        <Text style={styles.heroBadge}>Limited Offer</Text>
        <Text style={styles.heroTitle}>Maha Shivratri Special</Text>
        <Text style={styles.heroSubtitle}>
          Book verified pandits for Rudrabhishek and Shiva Puja. Experience divinity at home.
        </Text>
        <AppButton title="Explore Rituals" onPress={() => router.push('/(tabs)/services')} />
      </Card>

      {/* Filter Strip */}
      <Card style={styles.filterCard}>
        <Text style={styles.sectionTitle}>Filters</Text>
        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Service Type</Text>
            <TextInput
              style={styles.filterInput}
              value={uiFilters.serviceType}
              onChangeText={(text) => setUiFilters(prev => ({ ...prev, serviceType: text }))}
            />
          </View>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Language</Text>
            <TextInput
              style={styles.filterInput}
              value={uiFilters.language}
              onChangeText={(text) => setUiFilters(prev => ({ ...prev, language: text }))}
            />
          </View>
        </View>
        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Max Distance (km)</Text>
            <TextInput
              style={styles.filterInput}
              value={filters.maxDistance}
              onChangeText={(text) => setFilters(prev => ({ ...prev, maxDistance: text }))}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Max Price</Text>
            <TextInput
              style={styles.filterInput}
              value={filters.maxPrice}
              onChangeText={(text) => setFilters(prev => ({ ...prev, maxPrice: text }))}
              keyboardType="numeric"
              placeholder="Optional"
            />
          </View>
        </View>
      </Card>

      {/* Location Update */}
      <Card style={styles.locationCard}>
        <Text style={styles.sectionTitle}>Update Location</Text>
        <Text style={styles.sectionSub}>Nearby search requires your current location</Text>
        <TextInput
          style={styles.input}
          placeholder="Latitude"
          value={location.latitude}
          onChangeText={(text) => setLocation(prev => ({ ...prev, latitude: text }))}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Longitude"
          value={location.longitude}
          onChangeText={(text) => setLocation(prev => ({ ...prev, longitude: text }))}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Location Name"
          value={location.locationName}
          onChangeText={(text) => setLocation(prev => ({ ...prev, locationName: text }))}
        />
        <AppButton title="Apply Filters & Search Nearby" onPress={loadNearbyPandits} />
      </Card>

      {/* Nearby Results */}
      {pandits.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Top Rated Pandits in {location.locationName || 'your area'}
          </Text>
          <Text style={styles.sectionSub}>Verified experts for your spiritual needs</Text>
          <Text style={styles.resultCount}>Showing {pandits.length} results</Text>
          
          {loading && <Text style={styles.loading}>Loading pandits...</Text>}
          
          <View style={styles.grid}>
            {pandits.map((pandit) => renderPanditCard(pandit, 'nearby-'))}
          </View>
        </View>
      )}

      {/* All Pandits */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Verified Pandits</Text>
        <Text style={styles.sectionSub}>Showing verified pandits across the platform</Text>
        <Text style={styles.resultCount}>Showing {allPandits.length} results</Text>

        <View style={styles.grid}>
          {allPandits.map((pandit) => renderPanditCard(pandit, 'all-'))}
        </View>
      </View>

      {/* Booking Modal */}
      <Modal visible={showBookingModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Book a Service</Text>
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
              <AppButton title="Cancel" variant="secondary" onPress={() => setShowBookingModal(false)} />
              <AppButton title="Confirm Booking" onPress={createBooking} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 10,
    backgroundColor: '#fff',
    ...shadow.soft,
  },
  heroBadge: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.orange600,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 22,
    color: colors.ink900,
  },
  heroSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink500,
  },
  filterCard: {
    marginTop: spacing.md,
    gap: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink700,
    marginBottom: 4,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: colors.border200,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: fonts.body,
    fontSize: 12,
    backgroundColor: '#fdfaf7',
  },
  locationCard: {
    marginTop: spacing.md,
    gap: 10,
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
  section: {
    marginTop: spacing.xl,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink900,
  },
  sectionSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink500,
  },
  resultCount: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink700,
  },
  loading: {
    textAlign: 'center',
    fontFamily: fonts.body,
    color: colors.ink500,
    marginVertical: 12,
  },
  grid: {
    gap: 12,
  },
  panditCard: {
    gap: 8,
  },
  panditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.orange500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: '#fff',
  },
  panditInfo: {
    flex: 1,
  },
  panditName: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink900,
  },
  panditMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink500,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  panditBio: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink500,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  price: {
    fontFamily: fonts.bodyBold,
    color: colors.orange600,
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
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
});