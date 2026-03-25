import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, ASSET_BASE_URL } from '../api/config.js';
import { getAuthToken, getUserType } from '../api/client.js';
import SpecialOfferBadge from '../components/SpecialOfferBadge.jsx';

export default function Dashboard() {
  const userType = getUserType();
  const isPandit = userType === 'pandit';
  const [dashboard, setDashboard] = useState(null);
  const [banner, setBanner] = useState(null);
  const [specialOffers, setSpecialOffers] = useState([]);
  const [globalPricing, setGlobalPricing] = useState(null);
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
        const [dashboardRes, bannerRes, offersRes, pricingRes] = await Promise.all([
          fetch(`${API_BASE_URL}${endpoint}`, { headers }),
          fetch(`${API_BASE_URL}/banners/active`, { headers }),
          fetch(`${API_BASE_URL}/special-offers/active`, { headers }),
          fetch(`${API_BASE_URL}/global-pricing/current`, { headers }),
        ]);
        const data = dashboardRes.ok ? await dashboardRes.json() : null;
        const bannerData = bannerRes.ok ? await bannerRes.json() : [];
        const offersData = offersRes.ok ? await offersRes.json() : [];
        const pricingData = pricingRes.ok ? await pricingRes.json() : null;
        setDashboard(data);

        const activeBanners = Array.isArray(bannerData) ? bannerData : [];
        const userBanner = activeBanners.find(
          (item) => item.target_audience === userType || item.target_audience === 'both'
        );
        setBanner(userBanner || null);

        const activeOffers = Array.isArray(offersData) ? offersData : [];
        const userOffers = activeOffers.filter(
          (offer) => offer.target_audience === userType || offer.target_audience === 'both'
        );
        setSpecialOffers(userOffers);

        setGlobalPricing(pricingData || null);
      } catch (error) {
        console.error('Load pandit dashboard error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPanditData();
  }, [isPandit, userType]);

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

  const heroContent = useMemo(() => {
    const defaultContent = {
      badge: isPandit ? 'Pandit Console' : 'Welcome Back',
      title: isPandit
        ? `Namaste, ${dashboard?.pandit_name || 'Pandit'}`
        : 'Plan Your Sacred Moments',
      subtitle: isPandit
        ? 'May your day be filled with divine grace. Here is your schedule today.'
        : 'Discover verified pandits and curated rituals designed for every occasion.',
    };

    if (!banner) return defaultContent;

    return {
      badge: banner.badge_text || defaultContent.badge,
      title: banner.title || defaultContent.title,
      subtitle: banner.subtitle || defaultContent.subtitle,
    };
  }, [banner, dashboard, isPandit]);

  return (
    <div className="container">
      <div className="page-shell">
        <section
          className={`dashboard-hero ${banner?.image_url ? 'with-image' : ''}`}
          style={
            banner?.image_url
              ? { backgroundImage: `url(${ASSET_BASE_URL}${banner.image_url})` }
              : undefined
          }
        >
          <div className="hero-content">
            <span className="hero-badge">{heroContent.badge}</span>
            <h1>{heroContent.title}</h1>
            <p>{heroContent.subtitle}</p>
            <div className="hero-actions">
              {isPandit ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCalendar(true)}
                  >
                    View Calendar
                  </button>
                  <Link to="/manage-services" className="btn btn-primary">
                    Manage Services
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/services" className="btn btn-primary">
                    Explore Services
                  </Link>
                  <Link to="/pandits" className="btn btn-secondary">
                    Find Pandits
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hero-side">
            <div className="stat-card">
              <p className="stat-label">{isPandit ? 'Pending Requests' : 'Upcoming'}</p>
              <p className="stat-value">
                {loading
                  ? '--'
                  : isPandit
                    ? stats.pendingRequests
                    : dashboard?.upcoming_count ?? 0}
              </p>
              <p className="stat-note">Bookings</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">{isPandit ? 'Total Earnings' : 'Total Spend'}</p>
              <p className="stat-value">
                {loading
                  ? '--'
                  : isPandit
                    ? `Rs ${stats.totalEarnings.toFixed(0)}`
                    : `Rs ${Number(dashboard?.total_spend ?? 0).toFixed(0)}`}
              </p>
              <p className="stat-note">Lifetime</p>
            </div>
          </div>
        </section>

        {specialOffers.length > 0 ? (
          <section className="section">
            <div className="section-heading">
              <div>
                <h2 className="section-title">Special Offers</h2>
                <p className="section-subtitle">Limited-time promos curated for you.</p>
              </div>
            </div>
            <div className="offers-scroll">
              <div className="offers-track">
                {specialOffers.map((offer) => (
                  <SpecialOfferBadge key={offer.id} offer={offer} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {globalPricing && globalPricing.discount_percentage > 0 ? (
          <section className="section">
            <div className="pricing-alert">
              <div>
                <h3>Special Pricing Active</h3>
                <p className="section-subtitle">
                  {globalPricing.description ||
                    'All services are currently discounted. Book now to save!'}
                </p>
              </div>
              <span className="pricing-discount-pill">
                {globalPricing.discount_percentage}% OFF
              </span>
            </div>
          </section>
        ) : null}

        {isPandit ? (
          <>
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
