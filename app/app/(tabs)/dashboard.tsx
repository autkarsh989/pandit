import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, ImageBackground, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import Screen from '@/components/Screen';
import Card from '@/components/Card';
import AppButton from '@/components/AppButton';
import SpecialOfferBadge from '@/components/SpecialOfferBadge';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';
import { apiGet } from '@/lib/api';
import { ASSET_BASE_URL } from '@/lib/config';
import { useAuth } from '@/context/AuthContext';

type DashboardData = {
  pandit_name?: string;
  active_services?: number;
  pending_requests?: number;
  total_earnings?: number;
  rating_avg?: number;
  upcoming_bookings?: Array<{
    id: string;
    service_name?: string;
    user_name?: string;
    booking_date: string;
    service_location_name?: string;
    service_address?: string;
    status: string;
  }>;
  recent_requests?: Array<{
    id: string;
    user_name?: string;
    service_name?: string;
  }>;
  upcoming_count?: number;
  completed_count?: number;
  cancelled_count?: number;
  total_spend?: number;
};

type Banner = {
  id: string;
  title: string;
  subtitle: string;
  badge_text?: string;
  image_url?: string;
  target_audience: 'user' | 'pandit' | 'both';
  is_active: boolean;
};

type SpecialOffer = {
  id: string;
  title: string;
  description: string;
  discount_percentage?: number;
  discount_amount?: number;
  effect_type: 'badge' | 'flash' | 'glow' | 'pulse';
  effect_color: string;
  target_audience: 'user' | 'pandit' | 'both';
  is_active: boolean;
};

type GlobalPricing = {
  id: string;
  discount_percentage: number;
  is_active: boolean;
  description?: string;
};

export default function DashboardScreen() {
  const { token, userType, ready } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [globalPricing, setGlobalPricing] = useState<GlobalPricing | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const [dashboardResponse, bannerResponse, offersResponse, pricingResponse] = await Promise.all([
          apiGet<DashboardData>(userType === 'pandit' ? '/pandit/dashboard' : '/user/dashboard', token),
          apiGet<Banner[]>('/banners/active', token),
          apiGet<SpecialOffer[]>('/special-offers/active', token),
          apiGet<GlobalPricing | null>('/global-pricing/current', token),
        ]);
        setData(dashboardResponse);
        
        // Find banner for current user type
        const activeBanners = Array.isArray(bannerResponse) ? bannerResponse : [];
        const userBanner = activeBanners.find(b => 
          b.target_audience === userType || b.target_audience === 'both'
        );
        setBanner(userBanner || null);

        // Filter special offers for current user type
        const activeOffers = Array.isArray(offersResponse) ? offersResponse : [];
        const userOffers = activeOffers.filter(offer => 
          offer.target_audience === userType || offer.target_audience === 'both'
        );
        setSpecialOffers(userOffers);

        setGlobalPricing(pricingResponse);
      } catch (error) {
        console.error('Dashboard error', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [ready, token, userType]);

  const stats = useMemo(() => {
    if (userType === 'pandit') {
      return [
        { label: 'Active Services', value: data?.active_services ?? 0 },
        { label: 'Pending Requests', value: data?.pending_requests ?? 0 },
        { label: 'Total Earnings', value: `Rs ${(data?.total_earnings ?? 0).toFixed(0)}` },
        {
          label: 'Rating',
          value: Number.isFinite(data?.rating_avg) ? data?.rating_avg?.toFixed(1) : 'N/A',
        },
      ];
    }

    return [
      { label: 'Upcoming', value: data?.upcoming_count ?? 0 },
      { label: 'Completed', value: data?.completed_count ?? 0 },
      { label: 'Cancelled', value: data?.cancelled_count ?? 0 },
      { label: 'Total Spend', value: `Rs ${(data?.total_spend ?? 0).toFixed(0)}` },
    ];
  }, [data, userType]);

  // Default content when no banner is available
  const defaultContent = {
    badge: userType === 'pandit' ? 'Pandit Console' : 'Welcome Back',
    title: userType === 'pandit' 
      ? `Namaste, ${data?.pandit_name ?? 'Pandit'}`
      : 'Plan Your Sacred Moments',
    subtitle: userType === 'pandit'
      ? 'May your day be filled with divine grace. Here is your schedule today.'
      : 'Discover verified pandits and curated rituals designed for every occasion.',
  };

  const heroContent = banner ? {
    badge: banner.badge_text || defaultContent.badge,
    title: banner.title || defaultContent.title,
    subtitle: banner.subtitle || defaultContent.subtitle,
  } : defaultContent;

  const HeroComponent = banner?.image_url ? (
    <ImageBackground
      source={{ uri: `${ASSET_BASE_URL}${banner.image_url}` }}
      style={styles.heroImage}
      imageStyle={styles.heroImageStyle}
    >
      <View style={styles.heroOverlay}>
        <Text style={styles.heroBadge}>{heroContent.badge}</Text>
        <Text style={styles.heroTitle}>{heroContent.title}</Text>
        <Text style={styles.heroSubtitle}>{heroContent.subtitle}</Text>
        <View style={styles.heroActions}>
          {userType === 'pandit' ? (
            <>
              <AppButton
                title="Manage Services"
                onPress={() => router.push('/manage-services')}
                variant="secondary"
              />
              <AppButton title="Booking Requests" onPress={() => router.push('/(tabs)/bookings')} />
            </>
          ) : (
            <>
              <AppButton title="Explore Services" onPress={() => router.push('/(tabs)/services')} />
              <AppButton
                title="Find Pandits"
                onPress={() => router.push('/(tabs)/pandits')}
                variant="secondary"
              />
            </>
          )}
        </View>
      </View>
    </ImageBackground>
  ) : (
    <LinearGradient colors={['#c46a19', '#814016']} style={styles.hero}>
      <Text style={styles.heroBadge}>{heroContent.badge}</Text>
      <Text style={styles.heroTitle}>{heroContent.title}</Text>
      <Text style={styles.heroSubtitle}>{heroContent.subtitle}</Text>
      <View style={styles.heroActions}>
        {userType === 'pandit' ? (
          <>
            <AppButton
              title="Manage Services"
              onPress={() => router.push('/manage-services')}
              variant="secondary"
            />
            <AppButton title="Booking Requests" onPress={() => router.push('/(tabs)/bookings')} />
          </>
        ) : (
          <>
            <AppButton title="Explore Services" onPress={() => router.push('/(tabs)/services')} />
            <AppButton
              title="Find Pandits"
              onPress={() => router.push('/(tabs)/pandits')}
              variant="secondary"
            />
          </>
        )}
      </View>
    </LinearGradient>
  );

  return (
    <Screen>
      {HeroComponent}

      {/* Special Offers Section */}
      {specialOffers.length > 0 && (
        <View style={styles.offersSection}>
          <Text style={styles.sectionTitle}>Special Offers</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.offersScroll}>
            <View style={styles.offersContainer}>
              {specialOffers.map((offer) => (
                <SpecialOfferBadge key={offer.id} offer={offer} style={styles.offerBadge} />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Global Pricing Alert */}
      {globalPricing && globalPricing.discount_percentage > 0 && (
        <Card style={styles.pricingAlert}>
          <View style={styles.pricingHeader}>
            <Text style={styles.pricingTitle}>🎉 Special Pricing Active!</Text>
            <Text style={styles.pricingDiscount}>{globalPricing.discount_percentage}% OFF</Text>
          </View>
          <Text style={styles.pricingDescription}>
            {globalPricing.description || 'All services are currently discounted. Book now to save!'}
          </Text>
        </Card>
      )}

      <View style={styles.statGrid}>
        {stats.map((stat) => (
          <Card key={stat.label} style={styles.statCard}>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{loading ? '--' : stat.value}</Text>
          </Card>
        ))}
      </View>

      {userType === 'pandit' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Rituals</Text>
          {(data?.upcoming_bookings ?? []).length === 0 ? (
            <Card>
              <Text style={styles.cardTitle}>No upcoming rituals</Text>
              <Text style={styles.cardSub}>New bookings will appear here.</Text>
            </Card>
          ) : (
            data?.upcoming_bookings?.slice(0, 2).map((booking) => (
              <Card key={booking.id} style={styles.bookingCard}>
                <Text style={styles.cardTitle}>{booking.service_name || 'Service'}</Text>
                <Text style={styles.cardSub}>{booking.user_name || 'Requested by devotee'}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    {new Date(booking.booking_date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.metaText}>
                    {new Date(booking.booking_date).toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.metaText}>
                  {booking.service_location_name || booking.service_address || 'Location'}
                </Text>
              </Card>
            ))
          )}
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Shortcuts</Text>
          <View style={styles.quickGrid}>
            <Card style={styles.quickCard}>
              <Text style={styles.cardTitle}>Browse Services</Text>
              <Text style={styles.cardSub}>Explore pujas and consultations curated for you.</Text>
              <AppButton
                title="View Services"
                onPress={() => router.push('/(tabs)/services')}
              />
            </Card>
            <Card style={styles.quickCard}>
              <Text style={styles.cardTitle}>Find Pandits</Text>
              <Text style={styles.cardSub}>Connect with experienced pandits near you.</Text>
              <AppButton
                title="Find Pandits"
                onPress={() => router.push('/(tabs)/pandits')}
              />
            </Card>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.lift,
  },
  heroImage: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.lift,
  },
  heroImageStyle: {
    borderRadius: radius.xl,
  },
  heroOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: spacing.xl,
  },
  heroBadge: {
    fontFamily: fonts.bodySemi,
    color: '#fff',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  heroTitle: {
    fontFamily: fonts.headingBold,
    color: '#fff',
    fontSize: 28,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: fonts.body,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: spacing.lg,
  },
  statCard: {
    flexBasis: '48%',
  },
  statLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.ink500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink900,
    marginTop: 6,
  },
  section: {
    marginTop: spacing.xl,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.ink900,
  },
  bookingCard: {
    gap: 6,
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
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink500,
  },
  quickGrid: {
    gap: 12,
  },
  quickCard: {
    gap: 10,
  },
  offersSection: {
    marginTop: spacing.lg,
    gap: 12,
  },
  offersScroll: {
    flexGrow: 0,
  },
  offersContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 2,
  },
  offerBadge: {
    minWidth: 120,
  },
  pricingAlert: {
    backgroundColor: colors.orange500,
    marginTop: spacing.lg,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pricingTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: '#fff',
  },
  pricingDiscount: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    color: '#fff',
  },
  pricingDescription: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 16,
  },
});
