import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, ASSET_BASE_URL } from '../api/config.js';
import { getAuthToken } from '../api/client.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';

export default function Services() {
  const navigate = useNavigate();
  const { message, showMessage } = useFlashMessage();
  const [services, setServices] = useState([]);
  const [serviceMeta, setServiceMeta] = useState({ skip: 0, limit: 12, total: 0 });
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState('price_asc');
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [serviceAddress, setServiceAddress] = useState('');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async (skipOverride = null) => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const skipValue = skipOverride !== null ? skipOverride : serviceMeta.skip;
      const response = await fetch(
        `${API_BASE_URL}/user/services?skip=${skipValue}&limit=${serviceMeta.limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      setServices((prev) => {
        if (skipValue > 0) {
          return [...prev, ...list];
        }
        return list;
      });
    } catch (error) {
      showMessage('Error loading services', 'error');
      console.error('Load services error:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchServices = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      let url = `${API_BASE_URL}/user/services/search?sort_by=${sortBy}`;
      if (keyword) {
        url += `&keyword=${encodeURIComponent(keyword)}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setServices(Array.isArray(data.items) ? data.items : data);
      setServiceMeta((prev) => ({ ...prev, skip: 0 }));
    } catch (error) {
      showMessage('Error searching services', 'error');
      console.error('Search services error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openBooking = async (service) => {
    setSelectedService(service);
    setBookingDate('');
    setServiceAddress('');
    setShowBookingModal(true);
  };

  const confirmBooking = async (event) => {
    event.preventDefault();
    if (!selectedService) {
      showMessage('Please select a service', 'error');
      return;
    }

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
          pandit_id: selectedService.pandit_id,
          service_id: selectedService.id,
          booking_date: bookingDate,
          service_address: serviceAddress,
        }),
      });

      if (response.ok) {
        showMessage('Booking created successfully!', 'success');
        setShowBookingModal(false);
        setTimeout(() => navigate('/bookings'), 1500);
      } else {
        const error = await response.json();
        showMessage(error.detail || 'Error creating booking', 'error');
      }
    } catch (error) {
      showMessage('Error creating booking', 'error');
      console.error('Create booking error:', error);
    }
  };

  const bookingSummary = useMemo(() => {
    if (!selectedService) {
      return null;
    }

    return {
      serviceName: selectedService.name,
      category: selectedService.category,
      price: selectedService.base_price,
      duration: selectedService.duration_minutes,
    };
  }, [selectedService]);

  const categories = useMemo(() => {
    const unique = new Set(services.map((service) => service.category).filter(Boolean));
    return ['All', ...Array.from(unique)];
  }, [services]);

  const [activeCategory, setActiveCategory] = useState('All');

  const filteredServices = useMemo(() => {
    if (activeCategory === 'All') {
      return services;
    }
    return services.filter((service) => service.category === activeCategory);
  }, [services, activeCategory]);

  return (
    <div className="container">
      <div className="page-shell">
        <section className="hero services-hero">
          <div className="hero-content">
            <span className="hero-badge">Limited Offer</span>
            <h1>Experience Divine Services</h1>
            <p>
              Traditional rituals meet modern convenience. Book verified pandits for
              any occasion.
            </p>
            <div className="hero-search">
              <input
                type="text"
                placeholder="Search for puja, astrology, or rituals"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
              <button type="button" onClick={searchServices}>
                Search
              </button>
            </div>
          </div>
        </section>

        {message.text ? (
          <div className={`message ${message.type}`}>{message.text}</div>
        ) : null}

        <section className="section">
          <div className="section-heading">
            <div>
              <h2 className="section-title">Our Sacred Services</h2>
              <p className="section-subtitle">
                Curated puja services and consultations designed for your milestones.
              </p>
            </div>
            <div className="chip-group">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`chip ${activeCategory === category ? 'active' : ''}`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setTimeout(searchServices, 0);
              }}
            >
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name_asc">Name: A to Z</option>
              <option value="name_desc">Name: Z to A</option>
            </select>
          </div>

          <div id="servicesList" className="services-grid">
            {loading ? <p className="loading">Loading services...</p> : null}
            {!loading && filteredServices.length === 0 ? (
              <p className="no-results">No services found</p>
            ) : null}
            {!loading
              ? filteredServices.map((service) => (
                <div className="service-card" key={service.id}>
                  <div
                    className={`service-thumb ${service.image_url ? 'has-image' : ''}`}
                    style={
                      service.image_url
                        ? { backgroundImage: `url(${ASSET_BASE_URL}${service.image_url})` }
                        : undefined
                    }
                  />
                    <div className="service-body">
                      <div>
                        <h3>{service.name}</h3>
                        <p className="section-subtitle">
                          {service.category} service for sacred moments.
                        </p>
                      </div>
                      <div className="service-meta">
                        <span className="tag">{service.category}</span>
                        <span className="tag">{service.duration_minutes} min</span>
                      </div>
                      {service.description ? (
                        <p className="section-subtitle">{service.description}</p>
                      ) : null}
                      <div className="service-footer">
                        <span className="service-price">Starting at Rs {service.base_price}</span>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => openBooking(service)}
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              : null}
          </div>
          {services.length >= serviceMeta.limit ? (
            <div className="load-more">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const nextSkip = serviceMeta.skip + serviceMeta.limit;
                  setServiceMeta((prev) => ({ ...prev, skip: nextSkip }));
                  loadServices(nextSkip);
                }}
              >
                Load More Services
              </button>
            </div>
          ) : null}
        </section>
      </div>

      <div
        id="bookingModal"
        className={`modal ${showBookingModal ? '' : 'hidden'}`}
      >
        <div className="modal-content">
          <span className="close" onClick={() => setShowBookingModal(false)}>
            &times;
          </span>
          <h3>Confirm Your Booking</h3>
          <form onSubmit={confirmBooking}>
            <div className="booking-summary">
              {bookingSummary ? (
                <>
                  <p>
                    <strong>Service:</strong> {bookingSummary.serviceName}
                  </p>
                  <p>
                    <strong>Category:</strong> {bookingSummary.category}
                  </p>
                  <p>
                    <strong>Price:</strong> Rs {bookingSummary.price}
                  </p>
                  <p>
                    <strong>Duration:</strong> {bookingSummary.duration} minutes
                  </p>
                </>
              ) : null}
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
                placeholder="Enter the full address for the service"
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
