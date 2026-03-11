import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL, ASSET_BASE_URL } from '../api/config.js';
import { getAuthToken } from '../api/client.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';

export default function PanditPortal() {
  const { panditId } = useParams();
  const navigate = useNavigate();
  const { message, showMessage } = useFlashMessage();
  const [pandit, setPandit] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingServiceId, setBookingServiceId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [serviceAddress, setServiceAddress] = useState('');

  useEffect(() => {
    loadPandit();
  }, [panditId]);

  const loadPandit = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        showMessage('Please login again.', 'error');
        navigate('/');
        return;
      }

      const [panditRes, servicesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/user/pandits/${panditId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/user/pandits/${panditId}/services`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!panditRes.ok) {
        const error = await panditRes.json();
        throw new Error(error.detail || 'Failed to load pandit profile');
      }
      if (!servicesRes.ok) {
        const error = await servicesRes.json();
        throw new Error(error.detail || 'Failed to load pandit services');
      }

      const panditData = await panditRes.json();
      const servicesData = await servicesRes.json();
      setPandit(panditData);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      if (Array.isArray(servicesData) && servicesData.length > 0) {
        setBookingServiceId(servicesData[0].id);
      }
    } catch (error) {
      showMessage(error.message || 'Failed to load pandit profile', 'error');
      console.error('Pandit portal error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openBooking = () => {
    setBookingDate('');
    setServiceAddress('');
    setShowBookingModal(true);
  };

  const confirmBooking = async (event) => {
    event.preventDefault();
    const token = getAuthToken();
    if (!token) {
      showMessage('Please login again.', 'error');
      navigate('/');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/user/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pandit_id: panditId,
          service_id: bookingServiceId,
          booking_date: bookingDate,
          service_address: serviceAddress,
        }),
      });

      if (response.ok) {
        showMessage('Booking created successfully!', 'success');
        setShowBookingModal(false);
        setTimeout(() => navigate('/bookings'), 1000);
      } else {
        const error = await response.json();
        showMessage(error.detail || 'Error creating booking', 'error');
      }
    } catch (error) {
      showMessage('Error creating booking', 'error');
      console.error('Create booking error:', error);
    }
  };

  const tags = useMemo(() => {
    if (!pandit) return [];
    return [
      pandit.region,
      pandit.languages,
      pandit.experience_years ? `${pandit.experience_years}+ years` : null,
    ].filter(Boolean);
  }, [pandit]);

  if (loading) {
    return (
      <div className="container">
        <p className="loading">Loading pandit profile...</p>
      </div>
    );
  }

  if (!pandit) {
    return (
      <div className="container">
        <p className="no-results">Pandit profile not found.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-shell">
        <section className="pandit-portal-hero">
          <div className="pandit-portal-card">
            <div className="pandit-portal-header">
              <div className="pandit-portal-avatar">
                {pandit.full_name
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join('')}
              </div>
              <div>
                <h2>{pandit.full_name}</h2>
                <p className="section-subtitle">
                  {pandit.experience_years} years experience  -  {pandit.region}
                </p>
              </div>
              <button type="button" className="btn btn-secondary">
                Share
              </button>
            </div>
            <div className="pandit-portal-rating">
              <span className="rating-stars">
                {Number.isFinite(pandit.rating_avg) ? pandit.rating_avg.toFixed(1) : 'N/A'}
              </span>
              <span className="section-subtitle">
                {pandit.review_count ?? 0} verified reviews
              </span>
            </div>
            <div className="pandit-portal-tags">
              {tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="pandit-portal-side">
            <div className="portal-price-card">
              <p className="portal-price-label">Consultation starting at</p>
              <h3>Rs {pandit.price_per_service}</h3>
              <ul className="portal-benefits">
                <li>45-60 minutes session</li>
                <li>Virtual or in-person option</li>
                <li>Detailed guidance included</li>
              </ul>
              <button type="button" className="btn btn-primary" onClick={openBooking}>
                Book Consultation
              </button>
            </div>
            <div className="portal-trust-card">
              <h4>Trust Guarantee</h4>
              <ul>
                <li>Verified credentials</li>
                <li>Background checked</li>
                <li>Secure payments</li>
              </ul>
            </div>
          </div>
        </section>

        {message.text ? (
          <div className={`message ${message.type}`}>{message.text}</div>
        ) : null}

        <section className="section">
          <div className="portal-section-card">
            <h3>About Pandit</h3>
            <p className="section-subtitle">
              {pandit.bio || 'No bio available yet.'}
            </p>
          </div>
        </section>

        <section className="section">
          <div className="portal-section-card">
            <div className="section-heading">
              <div>
                <h3>Availability</h3>
                <p className="section-subtitle">October 2023</p>
              </div>
              <div className="calendar-nav">
                <button type="button" className="icon-pill">{'<'}</button>
                <button type="button" className="icon-pill">{'>'}</button>
              </div>
            </div>
            <div className="calendar-grid">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="calendar-day">
                  {day}
                </div>
              ))}
              {Array.from({ length: 14 }).map((_, index) => (
                <div
                  key={`date-${index + 1}`}
                  className={`calendar-date ${index === 5 || index === 11 ? 'active' : ''}`}
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
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <h2 className="section-title">Services Offered</h2>
              <p className="section-subtitle">Choose a service to book with this pandit</p>
            </div>
          </div>
          <div className="services-grid">
            {services.length === 0 ? (
              <p className="no-results">No services listed yet.</p>
            ) : (
              services.map((service) => (
                <div className="service-card" key={service.id}>
                  <div
                    className={`service-thumb portal-service-thumb ${service.image_url ? 'has-image' : ''}`}
                    style={
                      service.image_url
                        ? { backgroundImage: `url(${ASSET_BASE_URL}${service.image_url})` }
                        : undefined
                    }
                  />
                  <div className="service-body">
                    <div>
                      <h3>{service.name}</h3>
                      <p className="section-subtitle">{service.category}</p>
                      {service.description ? (
                        <p className="section-subtitle">{service.description}</p>
                      ) : null}
                    </div>
                    <div className="service-meta">
                      <span className="tag">{service.duration_minutes} min</span>
                      <span className="tag">Rs {service.base_price}</span>
                    </div>
                    <div className="service-footer">
                      <span className="service-price">Rs {service.base_price}</span>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          setBookingServiceId(service.id);
                          openBooking();
                        }}
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div id="bookingModal" className={`modal ${showBookingModal ? '' : 'hidden'}`}>
        <div className="modal-content">
          <span className="close" onClick={() => setShowBookingModal(false)}>
            &times;
          </span>
          <h3>Confirm Your Booking</h3>
          <form onSubmit={confirmBooking}>
            <div className="form-group">
              <label htmlFor="bookingService">Select Service</label>
              <select
                id="bookingService"
                required
                value={bookingServiceId}
                onChange={(event) => setBookingServiceId(event.target.value)}
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - Rs {service.base_price}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="bookingDate">Booking Date</label>
              <input
                type="date"
                id="bookingDate"
                required
                value={bookingDate}
                onChange={(event) => setBookingDate(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="serviceAddress">Service Address *</label>
              <textarea
                id="serviceAddress"
                rows="3"
                required
                value={serviceAddress}
                onChange={(event) => setServiceAddress(event.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Confirm Booking
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
