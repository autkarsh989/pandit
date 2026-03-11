import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import AppButton from '@/components/AppButton';
import { colors, fonts, spacing } from '@/constants/theme';
import { apiGet, apiPut } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

type Stats = {
  users?: { total?: number };
  pandits?: { total?: number; verified?: number; pending_verification?: number };
  services?: { total?: number };
  bookings?: { total?: number; pending?: number; completed?: number };
};

type Pandit = {
  id: string;
  full_name?: string;
  name?: string;
  region?: string;
  languages?: string;
  bio?: string;
  experience_years?: number;
  price_per_service?: number;
};

export default function AdminDashboardScreen() {
  const { token, userType, ready, signOut } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pending, setPending] = useState<Pandit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!token || userType !== 'admin') {
      router.replace('/(auth)/admin');
      return;
    }
    loadDashboard();
  }, [ready, token, userType]);

  const loadDashboard = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [statsData, pendingData] = await Promise.all([
        apiGet<Stats>('/admin/stats', token),
        apiGet<Pandit[]>('/admin/pandits/pending', token),
      ]);
      setStats(statsData);
      setPending(Array.isArray(pendingData) ? pendingData : []);
    } catch (error) {
      console.error('Admin dashboard error', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = useMemo(
    () => [
      { label: 'Total Users', value: stats?.users?.total ?? 0 },
      { label: 'Total Pandits', value: stats?.pandits?.total ?? 0 },
      { label: 'Verified Pandits', value: stats?.pandits?.verified ?? 0 },
      { label: 'Pending Verifications', value: stats?.pandits?.pending_verification ?? 0 },
      { label: 'Total Services', value: stats?.services?.total ?? 0 },
      { label: 'Total Bookings', value: stats?.bookings?.total ?? 0 },
      { label: 'Pending Bookings', value: stats?.bookings?.pending ?? 0 },
      { label: 'Completed Bookings', value: stats?.bookings?.completed ?? 0 },
    ],
    [stats]
  );

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/admin');
          },
        },
      ]
    );
  };

  const handleNavigation = (route: string, routeName: string) => {
    try {
      console.log(`Attempting to navigate to ${routeName}: ${route}`);
      Alert.alert('Navigation Test', `Navigating to ${routeName}`, [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Go', 
          onPress: () => {
            console.log(`Actually navigating to: ${route}`);
            router.push(route as any);
          }
        }
      ]);
    } catch (error) {
      console.error(`Navigation error to ${routeName}:`, error);
      Alert.alert('Navigation Error', `Failed to navigate to ${routeName}: ${error}`);
    }
  };

  const handleAction = async (panditId: string, action: 'approve' | 'reject') => {
    if (!token) return;
    try {
      await apiPut(`/admin/pandits/${panditId}/${action}`, undefined, token);
      loadDashboard();
    } catch (error) {
      console.error('Pandit action error', error);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Admin Console</Text>
          <Text style={styles.subTitle}>Review verification requests and monitor activity.</Text>
        </View>
        <AppButton
          title="Logout"
          variant="secondary"
          onPress={handleLogout}
        />
      </View>

      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.cardTitle}>Platform Snapshot</Text>
          <AppButton title="Refresh" variant="secondary" onPress={loadDashboard} />
        </View>
        {loading ? <Text style={styles.loading}>Loading admin data...</Text> : null}
        <View style={styles.grid}>
          {statCards.map((card) => (
            <Card key={card.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{card.label}</Text>
              <Text style={styles.statValue}>{card.value}</Text>
            </Card>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <AppButton
            title="Banners"
            variant="secondary"
            onPress={() => handleNavigation('/admin/banners', 'Banners')}
          />
          <AppButton
            title="Offers"
            variant="secondary"
            onPress={() => handleNavigation('/admin/special-offers', 'Special Offers')}
          />
          <AppButton
            title="Pricing"
            variant="secondary"
            onPress={() => handleNavigation('/admin/global-pricing', 'Global Pricing')}
          />
          <AppButton
            title="Reports"
            variant="secondary"
            onPress={() => Alert.alert('Coming Soon', 'Reports feature will be available soon!')}
          />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Pending Pandit Verifications</Text>
        {pending.length === 0 ? (
          <Text style={styles.loading}>No pending pandit verifications.</Text>
        ) : (
          <View style={styles.list}>
            {pending.map((pandit) => (
              <Card key={pandit.id} style={styles.pendingCard}>
                <Text style={styles.pendingTitle}>{pandit.full_name || pandit.name || 'Pandit'}</Text>
                <Text style={styles.pendingSub}>
                  {pandit.region || 'Region not provided'} • {pandit.languages || 'Languages not set'}
                </Text>
                <Text style={styles.pendingSub}>{pandit.bio || 'No bio provided yet.'}</Text>
                <View style={styles.actionRow}>
                  <AppButton title="Approve" onPress={() => handleAction(pandit.id, 'approve')} />
                  <AppButton title="Reject" variant="secondary" onPress={() => handleAction(pandit.id, 'reject')} />
                </View>
              </Card>
            ))}
          </View>
        )}
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
    marginBottom: spacing.lg,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink900,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flexBasis: '48%',
    gap: 6,
  },
  statLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.ink500,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.ink900,
  },
  loading: {
    textAlign: 'center',
    fontFamily: fonts.body,
    color: colors.ink500,
  },
  list: {
    gap: 10,
  },
  pendingCard: {
    gap: 6,
  },
  pendingTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  pendingSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink500,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
});
