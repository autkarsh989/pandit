import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api/config.js';
import { getAuthToken } from '../api/client.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';

export default function Pandits() {
  const navigate = useNavigate();
  const { message, showMessage } = useFlashMessage();
  const [pandits, setPandits] = useState([]);
  const [allPandits, setAllPandits] = useState([]);
  const [allPanditMeta, setAllPanditMeta] = useState({ total: 0, skip: 0, limit: 12 });
  const [loading, setLoading] = useState(false);
  const [showDistance, setShowDistance] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedPanditId, setSelectedPanditId] = useState('');
  const [services, setServices] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [bookingServiceId, setBookingServiceId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [serviceAddress, setServiceAddress] = useState('');
  const [filters, setFilters] = useState({
    maxDistance: 50,
    minRating: 0,
    maxPrice: '',
    sortBy: 'match_score',
  });
  const [uiFilters, setUiFilters] = useState({
    serviceType: 'All Pujas & Rituals',
    language: 'All Languages',
    priceRange: 'Any Price',
    locationText: 'Varanasi, UP',
  });
  const [location, setLocation] = useState({
    latitude: '',
    longitude: '',
    locationName: '',
  });

  const activeLocation = location.locationName || 'your area';

  const getPanditName = (pandit) =>
    pandit.full_name || pandit.name || `Pandit ${pandit.id?.slice(0, 4) || 'Profile'}`;

  const getInitials = (name) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');

  const filteredPandits = useMemo(() => pandits, [pandits]);
  const openPanditPortal = (panditId) => {
    navigate(`/pandits/${panditId}`);
  };

  const loadAllPandits = async (skipOverride = null) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return;
      }
      const skipValue = skipOverride !== null ? skipOverride : allPanditMeta.skip;
      const response = await fetch(
        `${API_BASE_URL}/user/pandits/paged?skip=${skipValue}&limit=${allPanditMeta.limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      const items = Array.isArray(data.items) ? data.items : [];
      setAllPanditMeta({
        total: data.total || 0,
        skip: data.skip || 0,
        limit: data.limit || 12,
      });
      setAllPandits((prev) => {
        if (data.skip && data.skip > 0) {
          return [...prev, ...items];
        }
        return items;
      });
    } catch (error) {
      console.error('Load all pandits error:', error);
    }
  };

  const persistLocationIfNeeded = async () => {
    if (!location.latitude || !location.longitude) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      showMessage('Please login again.', 'error');
      navigate('/');
      return;
    }

    const params = new URLSearchParams({
      latitude: location.latitude,
      longitude: location.longitude,
    });
    if (location.locationName) {
      params.append('location_name', location.locationName);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/user/location?${params.toString()}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        showMessage(error.detail || 'Failed to update location', 'error');
      }
    } catch (error) {
      showMessage('Failed to update location', 'error');
      console.error('Update location error:', error);
    }
  };

  const loadNearbyPandits = async () => {
    setLoading(true);
    setShowDistance(true);
    const token = getAuthToken();
    if (!token) {
      showMessage('Please login again.', 'error');
      navigate('/');
      return;
    }

    try {
      await persistLocationIfNeeded();
      const params = new URLSearchParams({
        max_distance_km: String(filters.maxDistance || 50),
        min_rating: String(filters.minRating || 0),
        sort_by: filters.sortBy,
      });
      if (filters.maxPrice) {
        params.append('max_price', filters.maxPrice);
      }
      if (location.latitude && location.longitude) {
        params.append('latitude', location.latitude);
        params.append('longitude', location.longitude);
      }

      const response = await fetch(`${API_BASE_URL}/user/pandits/search?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 400) {
        const error = await response.json();
        showMessage(error.detail || 'Please update your location in your profile first', 'error');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setPandits(Array.isArray(data) ? data : []);
    } catch (error) {
      showMessage('Error loading nearby pandits', 'error');
      console.error('Load nearby pandits error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openBookingModal = async (panditId) => {
    setSelectedPanditId(panditId);
    setShowBookingModal(true);
    setServiceLoading(true);
    setServices([]);
    setBookingServiceId('');
    setServiceAddress('');
    setBookingDate('');

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/user/pandits/${panditId}/services`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      setServices(list);
      if (list.length > 0) {
        setBookingServiceId(list[0].id);
      }
    } catch (error) {
      showMessage('Error loading services', 'error');
      console.error('Load services error:', error);
    } finally {
      setServiceLoading(false);
    }
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
  };

  const createBooking = async (event) => {
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
          pandit_id: selectedPanditId,
          service_id: bookingServiceId,
          booking_date: bookingDate,
          service_address: serviceAddress,
        }),
      });

      if (response.ok) {
        showMessage('Booking created successfully!', 'success');
        closeBookingModal();
        setTimeout(() => navigate('/bookings'), 1500);
      } else {
        showMessage('Error creating booking', 'error');
      }
    } catch (error) {
      showMessage('Error creating booking', 'error');
      console.error('Create booking error:', error);
    }
  };

  return (
    <div className="container">
      <div className="page-shell">
        <section className="hero pandits-hero">
          <div className="hero-content">
            <span className="hero-badge">Limited Offer</span>
            <h1>Maha Shivratri Special</h1>
            <p>
              Book verified pandits for Rudrabhishek and Shiva Puja. Experience divinity at
              home or temple.
            </p>
            <button type="button" className="btn btn-primary">
              Explore Rituals
            </button>
          </div>
        </section>

        {message.text ? (
          <div className={`message ${message.type}`}>{message.text}</div>
        ) : null}

        <div className="filter-strip">
          <div className="filter-item">
            <label>Service Type</label>
            <select
              value={uiFilters.serviceType}
              onChange={(event) =>
                setUiFilters((prev) => ({ ...prev, serviceType: event.target.value }))
              }
            >
              <option>All Pujas & Rituals</option>
              <option>Vedic Puja</option>
              <option>Astrology</option>
              <option>Wedding Rituals</option>
            </select>
          </div>
          <div className="filter-item">
            <label>Location</label>
            <input
              type="text"
              value={uiFilters.locationText}
              onChange={(event) =>
                setUiFilters((prev) => ({ ...prev, locationText: event.target.value }))
              }
            />
          </div>
          <div className="filter-item">
            <label>Language</label>
            <select
              value={uiFilters.language}
              onChange={(event) =>
                setUiFilters((prev) => ({ ...prev, language: event.target.value }))
              }
            >
              <option>All Languages</option>
              <option>Hindi</option>
              <option>English</option>
              <option>Sanskrit</option>
            </select>
          </div>
          <div className="filter-item">
            <label>Price Range</label>
            <select
              value={uiFilters.priceRange}
              onChange={(event) =>
                setUiFilters((prev) => ({ ...prev, priceRange: event.target.value }))
              }
            >
              <option>Any Price</option>
              <option>Under Rs 1,000</option>
              <option>Rs 1,000 - Rs 3,000</option>
              <option>Above Rs 3,000</option>
            </select>
          </div>
          <button type="button" onClick={loadNearbyPandits} className="btn btn-primary">
            Apply Filters
          </button>
        </div>

        <div className="page-header location-card" style={{ marginTop: '12px' }}>
          <h2>Update Location</h2>
          <p>Nearby search requires your current location</p>
        </div>
        <div className="filter-bar location-card">
          <div className="form-group">
            <label htmlFor="userLatitude">Latitude</label>
            <input
              id="userLatitude"
              type="number"
              step="any"
              value={location.latitude}
              onChange={(event) =>
                setLocation((prev) => ({ ...prev, latitude: event.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="userLongitude">Longitude</label>
            <input
              id="userLongitude"
              type="number"
              step="any"
              value={location.longitude}
              onChange={(event) =>
                setLocation((prev) => ({ ...prev, longitude: event.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="userLocationName">Location Name</label>
            <input
              id="userLocationName"
              type="text"
              value={location.locationName}
              onChange={(event) =>
                setLocation((prev) => ({ ...prev, locationName: event.target.value }))
              }
            />
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (!navigator.geolocation) {
                showMessage('Geolocation is not supported by this browser.', 'error');
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setLocation((prev) => ({
                    ...prev,
                    latitude: pos.coords.latitude.toString(),
                    longitude: pos.coords.longitude.toString(),
                  }));
                  showMessage('Location captured. Click Save Location.', 'success');
                },
                () => {
                  showMessage('Unable to get location. Please enter manually.', 'error');
                }
              );
            }}
          >
            Use Current Location
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              const token = getAuthToken();
              if (!token) {
                showMessage('Please login again.', 'error');
                navigate('/');
                return;
              }
              if (!location.latitude || !location.longitude) {
                showMessage('Please enter latitude and longitude.', 'error');
                return;
              }

              const params = new URLSearchParams({
                latitude: location.latitude,
                longitude: location.longitude,
              });
              if (location.locationName) {
                params.append('location_name', location.locationName);
              }

              try {
                const response = await fetch(
                  `${API_BASE_URL}/user/location?${params.toString()}`,
                  {
                    method: 'PUT',
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );
                if (response.ok) {
                  showMessage('Location updated successfully!', 'success');
                } else {
                  const error = await response.json();
                  showMessage(error.detail || 'Failed to update location', 'error');
                }
              } catch (error) {
                showMessage('Failed to update location', 'error');
                console.error('Update location error:', error);
              }
            }}
          >
            Save Location
          </button>
        </div>

        <section className="section">
          <div className="section-heading">
            <div>
              <h2 className="section-title">Top Rated Pandits in {activeLocation}</h2>
              <p className="section-subtitle">Verified experts for your spiritual needs</p>
            </div>
            <div className="section-subtitle">
              Showing {filteredPandits.length} results
            </div>
          </div>

          <div id="panditsList" className="pandits-grid">
            {loading ? <p className="loading">Loading pandits...</p> : null}
            {!loading && filteredPandits.length === 0 ? (
              <div className="no-results">
                <p>No pandits found nearby. Adjust filters or update location.</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setAllPanditMeta((prev) => ({ ...prev, skip: 0 }));
                    loadAllPandits(0);
                  }}
                >
                  Show all verified pandits
                </button>
              </div>
            ) : null}
            {!loading
              ? filteredPandits.map((pandit) => {
                  const rating = Number.isFinite(pandit.rating_avg)
                    ? pandit.rating_avg.toFixed(1)
                    : 'N/A';
                  const name = getPanditName(pandit);
                  const languages = pandit.languages
                    ? pandit.languages.split(',').map((lang) => lang.trim())
                    : [];
                  const reviews = pandit.review_count ?? 0;

                  return (
                    <div
                      className="pandit-card"
                      key={pandit.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openPanditPortal(pandit.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          openPanditPortal(pandit.id);
                        }
                      }}
                    >
                      <div className="pandit-header">
                        <div className="pandit-avatar">{getInitials(name)}</div>
                        <div>
                          <h3>{name}</h3>
                          <div className="rating-row">
                            <span className="rating-stars">{rating}</span>
                            <span>({reviews} reviews)</span>
                            {pandit.experience_years ? (
                              <span>{pandit.experience_years} years experience</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="pandit-meta">
                        {languages.slice(0, 3).map((lang) => (
                          <span className="tag" key={`${pandit.id}-${lang}`}>
                            {lang}
                          </span>
                        ))}
                        {pandit.region ? <span className="tag">{pandit.region}</span> : null}
                      </div>
                      <div className="section-subtitle">
                        {pandit.bio || 'Specialist in traditional rituals and personalized guidance.'}
                      </div>
                      <div className="service-footer">
                        <span className="pandit-price">Starting from Rs {pandit.price_per_service}</span>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            openBookingModal(pandit.id);
                          }}
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  );
                })
              : null}
          </div>
        {!loading && filteredPandits.length > 0 ? (
          <div className="load-more">
            <button type="button" className="btn btn-secondary">
              Load More Pandits
            </button>
          </div>
        ) : null}
        </section>

        {allPandits.length > 0 ? (
          <section className="section">
            <div className="section-separator">
              <span>All Verified Pandits</span>
            </div>
            <div className="section-heading">
              <div>
                <h2 className="section-title">All Verified Pandits</h2>
                <p className="section-subtitle">
                  Showing verified pandits across the platform
                </p>
              </div>
              <div className="section-subtitle">
                Showing {allPandits.length} results
              </div>
            </div>

            <div className="pandits-grid">
              {allPandits.map((pandit) => {
                const rating = Number.isFinite(pandit.rating_avg)
                  ? pandit.rating_avg.toFixed(1)
                  : 'N/A';
                const name = getPanditName(pandit);
                const languages = pandit.languages
                  ? pandit.languages.split(',').map((lang) => lang.trim())
                  : [];
                const reviews = pandit.review_count ?? 0;

                return (
                  <div
                    className="pandit-card"
                    key={`all-${pandit.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => openPanditPortal(pandit.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        openPanditPortal(pandit.id);
                      }
                    }}
                  >
                    <div className="pandit-header">
                      <div className="pandit-avatar">{getInitials(name)}</div>
                      <div>
                        <h3>{name}</h3>
                        <div className="rating-row">
                          <span className="rating-stars">{rating}</span>
                          <span>({reviews} reviews)</span>
                          {pandit.experience_years ? (
                            <span>{pandit.experience_years} years experience</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="pandit-meta">
                      {languages.slice(0, 3).map((lang) => (
                        <span className="tag" key={`all-${pandit.id}-${lang}`}>
                          {lang}
                        </span>
                      ))}
                      {pandit.region ? <span className="tag">{pandit.region}</span> : null}
                    </div>
                    <div className="section-subtitle">
                      {pandit.bio ||
                        'Specialist in traditional rituals and personalized guidance.'}
                    </div>
                    <div className="service-footer">
                      <span className="pandit-price">
                        Starting from Rs {pandit.price_per_service}
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={(event) => {
                          event.stopPropagation();
                          openBookingModal(pandit.id);
                        }}
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {allPandits.length < allPanditMeta.total ? (
              <div className="load-more">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const nextSkip = allPanditMeta.skip + allPanditMeta.limit;
                    loadAllPandits(nextSkip);
                  }}
                >
                  Load More Pandits
                </button>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      <div id="bookingModal" className={`modal ${showBookingModal ? '' : 'hidden'}`}>
        <div className="modal-content">
          <span className="close" onClick={closeBookingModal}>
            &times;
          </span>
          <h3>Book a Service</h3>
          <form onSubmit={createBooking}>
            <div className="form-group">
              <label htmlFor="bookingService">Select Service</label>
              <select
                id="bookingService"
                required
                value={bookingServiceId}
                onChange={(event) => setBookingServiceId(event.target.value)}
              >
                {serviceLoading ? <option value="">Loading services...</option> : null}
                {!serviceLoading && services.length === 0 ? (
                  <option value="">No services available</option>
                ) : null}
                {!serviceLoading
                  ? services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - Rs {service.base_price}
                      </option>
                    ))
                  : null}
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
