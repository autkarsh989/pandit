import { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import Screen from '@/components/Screen';
import Card from '@/components/Card';
import AppButton from '@/components/AppButton';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

type Booking = {
  id: string;
  service_name?: string;
  pandit_name?: string;
  user_name?: string;
  booking_date: string;
  status: string;
  reviewed_by_user?: boolean;
  reviewed_by_pandit?: boolean;
  total_amount?: number;
  service_address?: string;
  service_location_name?: string;
  pandit_id?: string;
  user_id?: string;
  service_id?: string;
};

export default function BookingsScreen() {
  const { token, userType, ready } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [reviewModal, setReviewModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }
    if (userType === 'pandit') {
      setActiveTab('pending');
    }
    loadBookings();
  }, [ready, token, userType]);

  const loadBookings = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const endpoint = userType === 'pandit' ? '/pandit/bookings' : '/user/bookings';
      const data = await apiGet<Booking[]>(endpoint, token);
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Load bookings error', error);
    } finally {
      setLoading(false);
    }
  };

  const statusGroups = useMemo(
    () => ({
      upcoming: ['pending', 'confirmed', 'scheduled'],
      completed: ['completed'],
      cancelled: ['cancelled', 'rejected'],
      pending: ['pending'],
      confirmed: ['confirmed'],
    }),
    []
  );

  const filtered = useMemo(() => {
    const group = statusGroups[activeTab] || [];
    return bookings.filter((booking) => group.includes(booking.status));
  }, [bookings, activeTab, statusGroups]);

  const openReview = (booking: Booking) => {
    setSelectedBooking(booking);
    setReviewRating('5');
    setReviewComment('');
    setReviewModal(true);
  };

  const submitReview = async () => {
    if (!token || !selectedBooking) return;
    try {
      const endpoint =
        userType === 'pandit'
          ? `/pandit/bookings/${selectedBooking.id}/review`
          : `/user/bookings/${selectedBooking.id}/review`;
      await apiPost(
        endpoint,
        { rating: parseInt(reviewRating, 10), comment: reviewComment },
        token
      );
      setReviewModal(false);
      loadBookings();
    } catch (error) {
      console.error('Submit review error', error);
    }
  };

  const openDetail = (booking: Booking) => {
    setSelectedBooking(booking);
    setDetailModal(true);
  };

  const updateStatus = async (bookingId: string, action: 'confirm' | 'reject' | 'complete') => {
    if (!token) return;
    try {
      await apiPut(`/pandit/bookings/${bookingId}/${action}`, undefined, token);
      loadBookings();
    } catch (error: any) {
      console.error('Update booking error', error);
      // Show user-friendly error message
      const errorMessage = error.message || 'Failed to update booking status';
      Alert.alert('Error', errorMessage);
    }
  };

  const canCompleteBooking = (booking: Booking): boolean => {
    if (booking.status !== 'confirmed') return false;
    
    try {
      let bookingDateTime: Date;
      
      // Try to parse as datetime first, then fall back to date only
      if (booking.booking_date.includes(' ')) {
        bookingDateTime = new Date(booking.booking_date);
      } else {
        bookingDateTime = new Date(booking.booking_date + ' 00:00:00');
      }
      
      const currentDateTime = new Date();
      
      // Can only complete on or after the booking datetime
      if (currentDateTime < bookingDateTime) {
        return false;
      }
      
      // Add minimum buffer time - can only complete if booking time was at least 30 minutes ago
      const timeDiff = currentDateTime.getTime() - bookingDateTime.getTime();
      const minBuffer = 30 * 60 * 1000; // 30 minutes in milliseconds
      
      return timeDiff >= minBuffer;
    } catch {
      return true; // If date parsing fails, allow completion
    }
  };

  const getCompletionMessage = (booking: Booking): string => {
    if (booking.status !== 'confirmed') return '';
    
    try {
      let bookingDateTime: Date;
      
      if (booking.booking_date.includes(' ')) {
        bookingDateTime = new Date(booking.booking_date);
      } else {
        bookingDateTime = new Date(booking.booking_date + ' 00:00:00');
      }
      
      const currentDateTime = new Date();
      
      if (currentDateTime < bookingDateTime) {
        return `Can complete after ${bookingDateTime.toLocaleString()}`;
      }
      
      const timeDiff = currentDateTime.getTime() - bookingDateTime.getTime();
      const minBuffer = 30 * 60 * 1000; // 30 minutes
      
      if (timeDiff < minBuffer) {
        const remainingMinutes = Math.ceil((minBuffer - timeDiff) / (60 * 1000));
        return `Can complete in ${remainingMinutes} minutes`;
      }
      
      return '';
    } catch {
      return '';
    }
  };

  return (
    <Screen>
      <Text style={styles.pageTitle}>{userType === 'pandit' ? 'Booking Requests' : 'My Bookings'}</Text>
      <Text style={styles.pageSubtitle}>
        {userType === 'pandit' ? 'Manage requests for your services.' : 'View and manage your bookings.'}
      </Text>

      <View style={styles.tabs}>
        {(userType === 'pandit'
          ? ['pending', 'confirmed', 'completed']
          : ['upcoming', 'completed', 'cancelled']
        ).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab ? styles.tabActive : null]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab ? styles.tabTextActive : null]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <Text style={styles.loading}>Loading bookings...</Text> : null}
      {!loading && filtered.length === 0 ? (
        <Text style={styles.loading}>No bookings in this section yet.</Text>
      ) : null}

      <View style={styles.list}>
        {filtered.map((booking) => (
          <Card key={booking.id} style={styles.bookingCard}>
            <Text style={styles.cardTitle}>{booking.service_name || 'Service'}</Text>
            <Text style={styles.cardSub}>
              {booking.pandit_name || booking.user_name || 'Pandit'}
            </Text>
            <Text style={styles.cardSub}>
              {new Date(booking.booking_date).toLocaleDateString()} •{' '}
              {new Date(booking.booking_date).toLocaleTimeString()}
            </Text>
            <View style={styles.actions}>
              {!userType || userType === 'user' ? (
                <>
                  {booking.status === 'completed' && !booking.reviewed_by_user ? (
                    <AppButton title="Leave Review" variant="secondary" onPress={() => openReview(booking)} />
                  ) : null}
                  <AppButton title="View Details" onPress={() => openDetail(booking)} />
                </>
              ) : (
                <>
                  {booking.status === 'pending' ? (
                    <>
                      <AppButton title="Accept" onPress={() => updateStatus(booking.id, 'confirm')} />
                      <AppButton
                        title="Decline"
                        variant="secondary"
                        onPress={() => updateStatus(booking.id, 'reject')}
                      />
                    </>
                  ) : null}
                  {booking.status === 'confirmed' ? (
                    <View style={styles.completionSection}>
                      <AppButton 
                        title="Mark Completed" 
                        onPress={() => updateStatus(booking.id, 'complete')}
                        disabled={!canCompleteBooking(booking)}
                      />
                      {!canCompleteBooking(booking) && (
                        <Text style={styles.completionMessage}>
                          {getCompletionMessage(booking)}
                        </Text>
                      )}
                    </View>
                  ) : null}
                  {booking.status === 'completed' && !booking.reviewed_by_pandit ? (
                    <AppButton title="Rate User" variant="secondary" onPress={() => openReview(booking)} />
                  ) : null}
                  <AppButton title="Details" variant="secondary" onPress={() => openDetail(booking)} />
                </>
              )}
            </View>
          </Card>
        ))}
      </View>

      <Modal visible={reviewModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Leave a Review</Text>
            <TextInput
              style={styles.input}
              placeholder="Rating (1-5)"
              value={reviewRating}
              onChangeText={setReviewRating}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Share your experience..."
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
            />
            <View style={styles.modalActions}>
              <AppButton title="Cancel" variant="secondary" onPress={() => setReviewModal(false)} />
              <AppButton title="Submit Review" onPress={submitReview} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={detailModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Booking Details</Text>
            {selectedBooking ? (
              <View style={styles.detailBox}>
                <Text style={styles.detailText}>Service: {selectedBooking.service_name}</Text>
                <Text style={styles.detailText}>
                  {userType === 'pandit' ? 'User' : 'Pandit'}:{' '}
                  {selectedBooking.user_name || selectedBooking.pandit_name}
                </Text>
                <Text style={styles.detailText}>
                  Date: {new Date(selectedBooking.booking_date).toLocaleDateString()}
                </Text>
                <Text style={styles.detailText}>Status: {selectedBooking.status}</Text>
                {selectedBooking.total_amount ? (
                  <Text style={styles.detailText}>Amount: Rs {selectedBooking.total_amount}</Text>
                ) : null}
                {selectedBooking.service_address ? (
                  <Text style={styles.detailText}>Address: {selectedBooking.service_address}</Text>
                ) : null}
              </View>
            ) : null}
            <AppButton title="Close" variant="secondary" onPress={() => setDetailModal(false)} />
          </View>
        </View>
      </Modal>
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
  tabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.md,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border200,
    backgroundColor: '#fff',
  },
  tabActive: {
    backgroundColor: colors.orange600,
    borderColor: colors.orange600,
  },
  tabText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.ink700,
  },
  tabTextActive: {
    color: '#fff',
  },
  loading: {
    textAlign: 'center',
    fontFamily: fonts.body,
    color: colors.ink500,
    marginVertical: 12,
  },
  list: {
    gap: 12,
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
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
  detailBox: {
    backgroundColor: '#f6eee4',
    borderRadius: radius.md,
    padding: 12,
    gap: 6,
  },
  detailText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink700,
  },
  completionSection: {
    gap: 4,
  },
  completionMessage: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.ink500,
    fontStyle: 'italic',
  },
});
