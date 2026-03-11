import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../api/config.js';
import { getAuthToken, getUserType } from '../api/client.js';

export default function Dashboard() {
  const userType = getUserType();
  const isPandit = userType === 'pandit';
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    const loadPanditData = async () => {
      const token = getAuthToken();
      if (!token) return;
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const endpoint = isPandit ? '/pandit/dashboard' : '/user/dashboard';
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
        const data = response.ok ? await response.json() : null;
        setDashboard(data);
      } catch (error) {
        console.error('Load pandit dashboard error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPanditData();
  }, [isPandit]);

  const stats = useMemo(() => {
    if (!dashboard) {
      return {
        activeServices: 0,
        pendingRequests: 0,
        totalEarnings: 0,
        rating: 'N/A',
      };
    }
    const activeServices = dashboard.active_services || 0;
    const pendingRequests = dashboard.pending_requests || 0;
    const totalEarnings = dashboard.total_earnings || 0;
    const rating =
      Number.isFinite(dashboard.rating_avg) ? dashboard.rating_avg.toFixed(1) : 'N/A';
    return {
      activeServices,
      pendingRequests,
      totalEarnings,
      rating,
    };
  }, [dashboard]);

  const upcomingRituals = useMemo(() => {
    if (!dashboard || !Array.isArray(dashboard.upcoming_bookings)) {
      return [];
    }
    return dashboard.upcoming_bookings.slice(0, 2);
  }, [dashboard]);

  const requestItems = useMemo(() => {
    if (!dashboard || !Array.isArray(dashboard.recent_requests)) {
      return [];
    }
    return dashboard.recent_requests.slice(0, 2);
  }, [dashboard]);

  return (
    <div className="container">
      <div className="page-shell">
        {isPandit ? (
          <>
            <section className="pandit-dashboard-header">
              <div>
                <h1>
                  {dashboard?.pandit_name
                    ? `Namaste, ${dashboard.pandit_name}`
                    : 'Namaste, Pandit'}
                </h1>
                <p>May your day be filled with divine grace. Here is your schedule today.</p>
              </div>
              <div className="pandit-dashboard-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCalendar(true)}
                >
                  View Calendar
                </button>
                <Link to="/manage-services" className="btn btn-primary">
                  + New Service
                </Link>
              </div>
            </section>

            <section className="pandit-stats-grid">
              <div className="stat-pill">
                <p>Active Services</p>
                <h3>{loading ? '--' : stats.activeServices}</h3>
              </div>
              <div className="stat-pill">
                <p>Pending Requests</p>
                <h3>{loading ? '--' : stats.pendingRequests}</h3>
              </div>
              <div className="stat-pill">
                <p>Total Earnings</p>
                <h3>{loading ? '--' : `Rs ${stats.totalEarnings.toFixed(0)}`}</h3>
              </div>
              <div className="stat-pill">
                <p>Overall Rating</p>
                <h3>{loading ? '--' : stats.rating}</h3>
              </div>
            </section>

            <section className="pandit-dashboard-body">
              <div className="upcoming-rituals">
                <div className="section-heading">
                  <div>
                    <h2 className="section-title">Upcoming Rituals</h2>
                    <p className="section-subtitle">Your scheduled ceremonies this week</p>
                  </div>
                  <button type="button" className="link-button">See all</button>
                </div>

                {upcomingRituals.length === 0 ? (
                  <div className="ritual-card">
                    <div className="ritual-thumb">OM</div>
                    <div className="ritual-info">
                      <h3>No upcoming rituals</h3>
                      <p>New bookings will appear here.</p>
                    </div>
                  </div>
                ) : (
                  upcomingRituals.map((booking) => (
                    <div className="ritual-card" key={booking.id}>
                      <div className="ritual-thumb">OM</div>
                      <div className="ritual-info">
                        <h3>{booking.service_name || 'Service'}</h3>
                        <p>{booking.user_name || 'Requested by devotee'}</p>
                        <div className="ritual-meta">
                          <span>{new Date(booking.booking_date).toLocaleDateString()}</span>
                          <span>{new Date(booking.booking_date).toLocaleTimeString()}</span>
                          <span>{booking.service_location_name || booking.service_address || 'Location'}</span>
                        </div>
                      </div>
                      <div className="ritual-actions">
                        <span className="status-pill confirmed">{booking.status}</span>
                        <button type="button" className="btn btn-secondary">Details</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <aside className="request-card">
                <h3>New Requests</h3>
                {requestItems.length === 0 ? (
                  <div className="request-item">
                    <div className="request-avatar">N</div>
                    <div>
                      <p>No new requests</p>
                      <span>Pending requests will show here.</span>
                    </div>
                  </div>
                ) : (
                  requestItems.map((booking) => (
                    <div className="request-item" key={`request-${booking.id}`}>
                      <div className="request-avatar">
                        {(booking.user_name || 'U').slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p>{booking.user_name || 'Devotee'}</p>
                        <span>{booking.service_name || 'Service'} - pending</span>
                      </div>
                      <span className="request-arrow">></span>
                    </div>
                  ))
                )}
                <button type="button" className="btn btn-primary full-width">
                  Review All Requests
                </button>
              </aside>
            </section>
          </>
        ) : (
          <>
            <section className="hero services-hero">
              <div className="hero-content">
                <span className="hero-badge">Welcome Back</span>
                <h1>Plan Your Sacred Moments</h1>
                <p>
                  Discover verified pandits and curated rituals designed for every occasion.
                </p>
                <div className="hero-actions">
                  <Link to="/services" className="btn btn-primary">
                    Explore Services
                  </Link>
                  <Link to="/bookings" className="btn btn-secondary">
                    View Bookings
                  </Link>
                </div>
              </div>
            </section>

            <section className="section">
              <div className="user-stat-grid">
                <div className="stat-pill">
                  <p>Upcoming</p>
                  <h3>{loading ? '--' : dashboard?.upcoming_count ?? 0}</h3>
                </div>
                <div className="stat-pill">
                  <p>Completed</p>
                  <h3>{loading ? '--' : dashboard?.completed_count ?? 0}</h3>
                </div>
                <div className="stat-pill">
                  <p>Cancelled</p>
                  <h3>{loading ? '--' : dashboard?.cancelled_count ?? 0}</h3>
                </div>
                <div className="stat-pill">
                  <p>Total Spend</p>
                  <h3>{loading ? '--' : `Rs ${Number(dashboard?.total_spend ?? 0).toFixed(0)}`}</h3>
                </div>
              </div>
              <div className="dashboard-grid">
                <div className="dashboard-card">
                  <div className="card-icon">PUJA</div>
                  <h3>Browse Services</h3>
                  <p>Explore pujas, ceremonies, and consultations curated for you</p>
                  <Link to="/services" className="btn btn-primary">
                    View Services
                  </Link>
                </div>
                <div className="dashboard-card">
                  <div className="card-icon">FIND</div>
                  <h3>Find Pandits</h3>
                  <p>Connect with experienced pandits near your location</p>
                  <Link to="/pandits" className="btn btn-primary">
                    Find Pandits
                  </Link>
                </div>
                <div className="dashboard-card">
                  <div className="card-icon">BOOK</div>
                  <h3>My Bookings</h3>
                  <p>View, reschedule, or review your booked rituals</p>
                  <Link to="/bookings" className="btn btn-primary">
                    View Bookings
                  </Link>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {showCalendar ? (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowCalendar(false)}>
              &times;
            </span>
            <h3>Availability Calendar</h3>
            <div className="calendar-grid">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="calendar-day">
                  {day}
                </div>
              ))}
              {Array.from({ length: 30 }).map((_, index) => (
                <div
                  key={`dash-date-${index + 1}`}
                  className={`calendar-date ${index % 7 === 5 ? 'active' : ''}`}
                >
                  {index + 1}
                </div>
              ))}
            </div>
            <div className="calendar-legend">
              <span className="legend-item"><span className="legend-dot recommended" />Recommended</span>
              <span className="legend-item"><span className="legend-dot available" />Available</span>
              <span className="legend-item"><span className="legend-dot booked" />Booked</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
