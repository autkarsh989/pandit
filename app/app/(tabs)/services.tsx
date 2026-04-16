import { useEffect, useMemo, useState } from 'react';
import {
  ImageBackground,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from 'react-native';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import AppButton from '@/components/AppButton';
import Tag from '@/components/Tag';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';
import { apiGet, apiPost } from '@/lib/api';
import { ASSET_BASE_URL } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { createBookingWithPayment } from '@/lib/bookingPayments';

type Service = {
  id: string;
  name: string;
  category: string;
  base_price: number;
  duration_minutes: number;
  description?: string;
  image_url?: string;
  pandit_id: string;
};

type SpecialOffer = {
  id: string;
  title: string;
  description: string;
  discount_percentage?: number;
  discount_amount?: number;
  target_audience: 'user' | 'pandit' | 'both';
};

type GlobalPricing = {
  id: string;
  discount_percentage: number;
  description?: string;
  is_active: boolean;
};

export default function ServicesScreen() {
  const { token, ready } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState('price_asc');
  const [selected, setSelected] = useState<Service | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [serviceAddress, setServiceAddress] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [globalPricing, setGlobalPricing] = useState<GlobalPricing | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    loadServices();
    loadPricing();
  }, [ready, token]);

  const loadPricing = async () => {
    if (!token) return;
    try {
      const [offersResponse, pricingResponse] = await Promise.all([
        apiGet<SpecialOffer[]>('/special-offers/active', token).catch(() => []),
        apiGet<GlobalPricing | null>('/global-pricing/current', token).catch(() => null),
      ]);
      const applicableOffers = Array.isArray(offersResponse)
        ? offersResponse.filter(
            (offer) => offer.target_audience === 'user' || offer.target_audience === 'both'
          )
        : [];
      setSpecialOffers(applicableOffers);
      setGlobalPricing(pricingResponse);
    } catch (error) {
      console.error('Load pricing error', error);
    }
  };

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await apiGet<Service[]>('/user/services?skip=0&limit=12', token);
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Load services error', error);
    } finally {
      setLoading(false);
    }
  };

  const searchServices = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = `/user/services/search?sort_by=${sortBy}`;
      if (keyword) {
        url += `&keyword=${encodeURIComponent(keyword)}`;
      }
      const data = await apiGet<any>(url, token);
      setServices(Array.isArray(data.items) ? data.items : data);
    } catch (error) {
      console.error('Search services error', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const unique = new Set(services.map((service) => service.category).filter(Boolean));
    return ['All', ...Array.from(unique)];
  }, [services]);

  const [activeCategory, setActiveCategory] = useState('All');
  const filtered = useMemo(() => {
    if (activeCategory === 'All') return services;
    return services.filter((service) => service.category === activeCategory);
  }, [services, activeCategory]);

  const openBooking = (service: Service) => {
    setSelected(service);
    setBookingDate('');
    setServiceAddress('');
    setShowModal(true);
  };

  const confirmBooking = async () => {
    if (!selected || !token) return;
    setBookingSubmitting(true);
    try {
      await createBookingWithPayment(
        {
          pandit_id: selected.pandit_id,
          service_id: selected.id,
          booking_date: bookingDate,
          service_address: serviceAddress,
        },
        token
      );
      setShowModal(false);
      router.push('/(tabs)/bookings');
    } catch (error) {
      console.error('Create booking error', error);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const getDiscountedPrice = (basePrice: number) => {
    let bestPrice = basePrice;

    if (globalPricing?.discount_percentage && globalPricing.discount_percentage > 0) {
      const discounted = basePrice * (1 - globalPricing.discount_percentage / 100);
      bestPrice = Math.min(bestPrice, discounted);
    }

    specialOffers.forEach((offer) => {
      if (offer.discount_percentage && offer.discount_percentage > 0) {
        const discounted = basePrice * (1 - offer.discount_percentage / 100);
        bestPrice = Math.min(bestPrice, discounted);
      }
      if (offer.discount_amount && offer.discount_amount > 0) {
        const discounted = basePrice - offer.discount_amount;
        bestPrice = Math.min(bestPrice, discounted);
      }
    });

    return Math.max(0, Math.round(bestPrice));
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.heroBadge}>Limited Offer</Text>
        <Text style={styles.heroTitle}>Experience Divine Services</Text>
        <Text style={styles.heroSubtitle}>
          Traditional rituals meet modern convenience. Book verified pandits for any occasion.
        </Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for puja, astrology, or rituals"
            placeholderTextColor={colors.ink500}
            value={keyword}
            onChangeText={setKeyword}
          />
          <AppButton title="Search" onPress={searchServices} />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Our Sacred Services</Text>
          <Text style={styles.sectionSub}>
            Curated puja services and consultations designed for your milestones.
          </Text>
        </View>

        <View style={styles.chipRow}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.chip,
                activeCategory === category ? styles.chipActive : null,
              ]}
              onPress={() => setActiveCategory(category)}
            >
              <Text
                style={[
                  styles.chipText,
                  activeCategory === category ? styles.chipTextActive : null,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sortRow}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => {
              setSortBy(sortBy === 'price_asc' ? 'price_desc' : 'price_asc');
              setTimeout(searchServices, 0);
            }}
          >
            <Text style={styles.sortText}>
              Sort: {sortBy === 'price_asc' ? 'Price Low to High' : 'Price High to Low'}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? <Text style={styles.loading}>Loading services...</Text> : null}
        {!loading && filtered.length === 0 ? (
          <Text style={styles.loading}>No services found</Text>
        ) : null}

        <View style={styles.grid}>
          {filtered.map((service) => (
            <Card key={service.id} style={styles.serviceCard}>
              {service.image_url ? (
                <ImageBackground
                  source={{ uri: `${ASSET_BASE_URL}${service.image_url}` }}
                  style={styles.thumb}
                  imageStyle={styles.thumbImage}
                  resizeMode="cover"
                />
              ) : (
                <ImageBackground
                  source={require('@/assets/images/kalash.png')}
                  style={styles.thumb}
                  imageStyle={styles.thumbImage}
                  resizeMode="cover"
                />
              )}
              <Text style={styles.cardTitle}>{service.name}</Text>
              <Text style={styles.cardSub}>{service.category} service for sacred moments.</Text>
              <View style={styles.tagRow}>
                <Tag label={service.category} />
                <Tag label={`${service.duration_minutes} min`} />
              </View>
              {service.description ? (
                <Text style={styles.cardSub}>{service.description}</Text>
              ) : null}
              <View style={styles.cardFooter}>
                <Text style={styles.price}>Rs {getDiscountedPrice(service.base_price)}</Text>
                <AppButton title="Book Now" onPress={() => openBooking(service)} />
              </View>
            </Card>
          ))}
        </View>

        {services.length >= 12 && (
          <AppButton
            title="Load More Services"
            variant="secondary"
            onPress={() => {
              // Load more services logic can be added here
              console.log('Load more services');
            }}
          />
        )}
      </View>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirm Your Booking</Text>
            {selected ? (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>Service: {selected.name}</Text>
                <Text style={styles.summaryText}>Category: {selected.category}</Text>
                <Text style={styles.summaryText}>
                  Price: Rs {getDiscountedPrice(selected.base_price)}
                </Text>
                <Text style={styles.summaryText}>
                  Duration: {selected.duration_minutes} minutes
                </Text>
              </View>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Booking Date (YYYY-MM-DD)"
              placeholderTextColor={colors.ink500}
              value={bookingDate}
              onChangeText={setBookingDate}
            />
            <Text style={styles.helpText}>
              Enter the date and time when you want the service to be performed
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Service Address"
              placeholderTextColor={colors.ink500}
              value={serviceAddress}
              onChangeText={setServiceAddress}
              multiline
            />
            <View style={styles.modalActions}>
              <AppButton title="Cancel" variant="secondary" onPress={() => setShowModal(false)} />
              <AppButton
                title={bookingSubmitting ? 'Processing...' : 'Pay & Book'}
                onPress={confirmBooking}
                disabled={bookingSubmitting}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    ...shadow.lift,
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
    fontSize: 20,
    color: colors.ink900,
    marginTop: 6,
  },
  heroSubtitle: {
    fontFamily: fonts.body,
    color: colors.ink500,
    marginTop: 6,
  },
  searchRow: {
    marginTop: 10,
    gap: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border200,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontFamily: fonts.body,
    fontSize: 14,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    marginBottom: 8,
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
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border200,
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: colors.orange500,
    borderColor: colors.orange500,
  },
  chipText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.ink700,
  },
  chipTextActive: {
    color: '#fff',
  },
  sortRow: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  sortButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border200,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sortText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.ink700,
  },
  loading: {
    fontFamily: fonts.body,
    color: colors.ink500,
    textAlign: 'center',
    marginVertical: 12,
  },
  grid: {
    gap: 10,
  },
  serviceCard: {
    gap: 6,
  },
  thumb: {
    height: 140,
    borderRadius: radius.md,
    backgroundColor: '#f1e3d4',
    marginBottom: 6,
  },
  thumbImage: {
    borderRadius: radius.md,
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
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8,
  },
  price: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
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
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    marginBottom: 10,
  },
  summaryBox: {
    backgroundColor: '#f6eee4',
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
  },
  summaryText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink700,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border200,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontFamily: fonts.body,
    fontSize: 14,
    backgroundColor: '#fdfaf7',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  helpText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink500,
    fontStyle: 'italic',
  },
});
