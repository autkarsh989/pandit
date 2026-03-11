import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api/config.js';
import { getAuthToken, getUserType } from '../api/client.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';

export default function Bookings() {
  const navigate = useNavigate();
  const { message, showMessage } = useFlashMessage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewBookingId, setReviewBookingId] = useState('');
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [bookingDetail, setBookingDetail] = useState(null);
  const userType = getUserType();
  const isPandit = userType === 'pandit';

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    if (isPandit) {
      setActiveTab('pending');
    }
  }, [isPandit]);

  const loadBookings = async () => {
    const token = getAuthToken();
    if (!token) {
      showMessage('Please login again.', 'error');
      navigate('/');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isPandit ? '/pandit/bookings' : '/user/bookings';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      showMessage('Error loading bookings', 'error');
      console.error('Load bookings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (bookingId) => {
    setReviewBookingId(bookingId);
    setReviewRating('5');
    setReviewComment('');
    setShowReviewModal(true);
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
  };

  const openDetailModal = async (bookingId) => {
    const token = getAuthToken();
    if (!token) {
      showMessage('Please login again.', 'error');
      navigate('/');
      return;
    }

    setDetailLoading(true);
    setShowDetailModal(true);
    setBookingDetail(null);

    try {
      const endpoint = isPandit
        ? `${API_BASE_URL}/pandit/bookings/${bookingId}`
        : `${API_BASE_URL}/user/bookings/${bookingId}`;
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBookingDetail(data);
      } else {
        const error = await response.json();
        showMessage(error.detail || 'Failed to load booking details', 'error');
        setShowDetailModal(false);
      }
    } catch (error) {
      showMessage('Failed to load booking details', 'error');
      console.error('Booking detail error:', error);
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (reviewSubmitting) {
      return;
    }
    const token = getAuthToken();
    if (!token) {
      showMessage('Please login again.', 'error');
      navigate('/');
      return;
    }

    try {
      setReviewSubmitting(true);
      const endpoint = isPandit
        ? `${API_BASE_URL}/pandit/bookings/${reviewBookingId}/review`
        : `${API_BASE_URL}/user/bookings/${reviewBookingId}/review`;
      const response = await fetch(
        endpoint,
        {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: parseInt(reviewRating, 10),
          comment: reviewComment,
        }),
        }
      );

      if (response.ok) {
        showMessage('Review submitted successfully!', 'success');
        closeReviewModal();
        loadBookings();
      } else {
        showMessage('Error submitting review', 'error');
      }
    } catch (error) {
      showMessage('Error submitting review', 'error');
      console.error('Submit review error:', error);
    } finally {
      setReviewSubmitting(false);
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

  const filteredBookings = useMemo(() => {
    if (isPandit) {
      const group = statusGroups[activeTab] || [];
      return bookings.filter((booking) => group.includes(booking.status));
    }
    const group = statusGroups[activeTab] || [];
    return bookings.filter((booking) => group.includes(booking.status));
  }, [bookings, activeTab, statusGroups, isPandit]);

  const tabCounts = useMemo(
    () => ({
      upcoming: bookings.filter((booking) => statusGroups.upcoming.includes(booking.status)).length,
      completed: bookings.filter((booking) => statusGroups.completed.includes(booking.status)).length,
      cancelled: bookings.filter((booking) => statusGroups.cancelled.includes(booking.status)).length,
    }),
    [bookings, statusGroups]
  );

  return (
    <div className="container">
      <div className="page-header booking-header">
        <h2>{isPandit ? 'Booking Requests' : 'My Bookings'}</h2>
        <p>{isPandit ? 'Manage requests for your services' : 'View and manage your bookings'}</p>
        <div className="tabs" style={{ marginTop: '18px' }}>
          {isPandit ? (
            <>
              <button
                type="button"
                className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                Pending ({bookings.filter((b) => b.status === 'pending').length})
              </button>
              <button
                type="button"
                className={`tab-button ${activeTab === 'confirmed' ? 'active' : ''}`}
                onClick={() => setActiveTab('confirmed')}
              >
                Confirmed ({bookings.filter((b) => b.status === 'confirmed').length})
              </button>
              <button
                type="button"
                className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                Completed ({bookings.filter((b) => b.status === 'completed').length})
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`tab-button ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                Upcoming ({tabCounts.upcoming})
              </button>
              <button
                type="button"
                className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                Completed ({tabCounts.completed})
              </button>
              <button
                type="button"
                className={`tab-button ${activeTab === 'cancelled' ? 'active' : ''}`}
                onClick={() => setActiveTab('cancelled')}
              >
                Cancelled ({tabCounts.cancelled})
              </button>
            </>
          )}
        </div>
      </div>

      {message.text ? (
        <div className={`message ${message.type}`}>{message.text}</div>
      ) : null}

      <div id="bookingsList" className="bookings-list">
        {loading ? <p className="loading">Loading bookings...</p> : null}
        {!loading && bookings.length === 0 ? (
          <p className="no-results">
            {isPandit ? (
              'No booking requests yet.'
            ) : (
              <>
                No bookings found. <Link to="/pandits">Book a service</Link>
              </>
            )}
          </p>
        ) : null}
        {!loading && bookings.length > 0 && filteredBookings.length === 0 ? (
          <p className="no-results">No bookings in this section yet.</p>
        ) : null}
        {!loading
          ? filteredBookings.map((booking) => (
              <div className="booking-card" key={booking.id}>
                <div className="booking-left">
                  <div className="booking-avatar">OM</div>
                  <div className="booking-info">
                    <div className="booking-status-row">
                      <span className={`status-badge status-${booking.status}`}>
                        {booking.status}
                      </span>
                      <span className="booking-id">Order ID: #{booking.id.substring(0, 8)}</span>
                    </div>
                    <h3>{booking.service_name || `Booking #${booking.id.substring(0, 8)}`}</h3>
                    <p>{booking.pandit_name || booking.user_name || 'Pandit'}</p>
                    <div className="booking-meta">
                      <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                      <span>{new Date(booking.booking_date).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="booking-actions">
                    {!isPandit && booking.status === 'completed' && !booking.reviewed_by_user ? (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => openReviewModal(booking.id)}
                      >
                        Leave Review
                      </button>
                    ) : null}
                    {isPandit ? (
                      <>
                        {booking.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={async () => {
                                const token = getAuthToken();
                                const response = await fetch(
                                  `${API_BASE_URL}/pandit/bookings/${booking.id}/confirm`,
                                  {
                                    method: 'PUT',
                                    headers: { Authorization: `Bearer ${token}` },
                                  }
                                );
                                if (response.ok) {
                                  showMessage('Booking confirmed', 'success');
                                  loadBookings();
                                } else {
                                  const error = await response.json();
                                  showMessage(error.detail || 'Failed to confirm booking', 'error');
                                }
                              }}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={async () => {
                                const token = getAuthToken();
                                const response = await fetch(
                                  `${API_BASE_URL}/pandit/bookings/${booking.id}/reject`,
                                  {
                                    method: 'PUT',
                                    headers: { Authorization: `Bearer ${token}` },
                                  }
                                );
                                if (response.ok) {
                                  showMessage('Booking rejected', 'success');
                                  loadBookings();
                                } else {
                                  const error = await response.json();
                                  showMessage(error.detail || 'Failed to reject booking', 'error');
                                }
                              }}
                            >
                              Decline
                            </button>
                          </>
                        ) : null}
                        {booking.status === 'confirmed' ? (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={async () => {
                              const token = getAuthToken();
                              const response = await fetch(
                                `${API_BASE_URL}/pandit/bookings/${booking.id}/complete`,
                                {
                                  method: 'PUT',
                                  headers: { Authorization: `Bearer ${token}` },
                                }
                              );
                              if (response.ok) {
                                showMessage('Booking marked as completed', 'success');
                                loadBookings();
                              } else {
                                const error = await response.json();
                                showMessage(error.detail || 'Failed to complete booking', 'error');
                              }
                            }}
                          >
                            Mark Completed
                          </button>
                        ) : null}
                        {booking.status === 'completed' && !booking.reviewed_by_pandit ? (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => openReviewModal(booking.id)}
                          >
                            Rate User
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => openDetailModal(booking.id)}
                        >
                          View Details
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => openDetailModal(booking.id)}
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          : null}
      </div>
      {!isPandit ? (
        <div className="promo-card" style={{ marginTop: '24px' }}>
          <div>
            <h3>Plan your next spiritual milestone</h3>
            <p className="section-subtitle">
              Explore premium puja services and personal astrology consultations curated for you.
            </p>
          </div>
          <button type="button" className="btn btn-primary">
            Explore Services
          </button>
        </div>
      ) : null}

      <div id="reviewModal" className={`modal ${showReviewModal ? '' : 'hidden'}`}>
        <div className="modal-content">
          <span className="close" onClick={closeReviewModal}>
            &times;
          </span>
          <h3>Leave a Review</h3>
          <form onSubmit={submitReview}>
            <div className="form-group">
              <label htmlFor="reviewRating">Rating (1-5)</label>
              <select
                id="reviewRating"
                required
                value={reviewRating}
                onChange={(event) => setReviewRating(event.target.value)}
              >
                <option value="5">Excellent</option>
                <option value="4">Good</option>
                <option value="3">Average</option>
                <option value="2">Below Average</option>
                <option value="1">Poor</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="reviewComment">Comment</label>
              <textarea
                id="reviewComment"
                rows="4"
                placeholder="Share your experience..."
                required
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={reviewSubmitting}>
              {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      </div>

      <div id="detailModal" className={`modal ${showDetailModal ? '' : 'hidden'}`}>
        <div className="modal-content">
          <span className="close" onClick={closeDetailModal}>
            &times;
          </span>
          <h3>Booking Details</h3>
          {detailLoading ? <p className="loading">Loading details...</p> : null}
          {!detailLoading && bookingDetail ? (
            <div className="booking-summary">
              <p>
                <strong>Service:</strong>{' '}
                {bookingDetail.service_name || `Service #${bookingDetail.service_id.slice(0, 8)}`}
              </p>
              <p>
                <strong>{isPandit ? 'User' : 'Pandit'}:</strong>{' '}
                {isPandit
                  ? bookingDetail.user_name || `User #${bookingDetail.user_id.slice(0, 8)}`
                  : bookingDetail.pandit_name || `Pandit #${bookingDetail.pandit_id.slice(0, 8)}`}
              </p>
              <p>
                <strong>Date:</strong> {new Date(bookingDetail.booking_date).toLocaleDateString()}
              </p>
              <p>
                <strong>Status:</strong> {bookingDetail.status}
              </p>
              <p>
                <strong>Amount:</strong> Rs {bookingDetail.total_amount}
              </p>
              <p>
                <strong>Address:</strong> {bookingDetail.service_address}
              </p>
              {bookingDetail.service_location_name ? (
                <p>
                  <strong>Location:</strong> {bookingDetail.service_location_name}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
