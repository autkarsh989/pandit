import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api/config.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';

export default function PanditOnboard() {
  const navigate = useNavigate();
  const { message, showMessage } = useFlashMessage();
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    password: '',
    email: '',
    experienceYears: '',
    bio: '',
    region: '',
    languages: '',
    locationName: '',
    latitude: '',
    longitude: '',
    pricePerService: '',
  });
  const [locating, setLocating] = useState(false);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      showMessage('Geolocation is not supported by this browser.', 'error');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }));
        setLocating(false);
        showMessage('Location captured successfully!', 'success');
      },
      (error) => {
        setLocating(false);
        showMessage('Unable to get location. Please enter manually.', 'error');
        console.error('Geolocation error:', error);
      }
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      full_name: form.fullName,
      phone: form.phone,
      password: form.password,
      email: form.email || null,
      experience_years: parseInt(form.experienceYears, 10),
      bio: form.bio,
      region: form.region,
      languages: form.languages,
      location_name: form.locationName || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      price_per_service: parseFloat(form.pricePerService),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/pandit/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showMessage('Pandit registered successfully! Please login as pandit.', 'success');
        setTimeout(() => navigate('/'), 1500);
      } else {
        const error = await response.json();
        showMessage(error.detail || 'Failed to register pandit.', 'error');
      }
    } catch (error) {
      showMessage('Network error. Please try again.', 'error');
      console.error('Pandit registration error:', error);
    }
  };

  return (
    <div className="onboard-page">
      <header className="auth-topbar">
        <div className="auth-brand">
          <div className="auth-logo">OM</div>
          <div>
            <p className="auth-brand-title">PANDIT</p>
            <p className="auth-brand-subtitle">Partner Portal</p>
          </div>
        </div>
        <div className="auth-topbar-actions">
          <button type="button" className="icon-pill">?</button>
          <button type="button" className="link-button" onClick={() => navigate('/')}>
            Already a partner? <span className="accent">Login</span>
          </button>
        </div>
      </header>

      {message.text ? (
        <div className={`message ${message.type}`}>{message.text}</div>
      ) : null}

      <div className="onboard-card">
        <div className="onboard-header">
          <h2>Professional Details</h2>
          <p>Please fill in your authentic information to build trust with your future clients.</p>
        </div>

        <form onSubmit={handleSubmit} className="onboard-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                placeholder="e.g. Acharya Sharma"
                required
                value={form.fullName}
                onChange={handleChange('fullName')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                placeholder="+91 00000 00000"
                required
                value={form.phone}
                onChange={handleChange('phone')}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="acharya@example.com"
                value={form.email}
                onChange={handleChange('email')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                required
                value={form.password}
                onChange={handleChange('password')}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="experienceYears">Years of Experience</label>
              <input
                type="number"
                id="experienceYears"
                min="0"
                max="100"
                placeholder="Select experience"
                required
                value={form.experienceYears}
                onChange={handleChange('experienceYears')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="pricePerService">Price per Service (Starting)</label>
              <input
                type="number"
                id="pricePerService"
                min="0"
                step="100"
                placeholder="Rs  1100"
                required
                value={form.pricePerService}
                onChange={handleChange('pricePerService')}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="region">Primary Region</label>
              <input
                type="text"
                id="region"
                placeholder="e.g. Varanasi, Uttar Pradesh"
                required
                value={form.region}
                onChange={handleChange('region')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="languages">Languages Known</label>
              <input
                type="text"
                id="languages"
                placeholder="Hindi, Sanskrit, English"
                required
                value={form.languages}
                onChange={handleChange('languages')}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="bio">Professional Bio</label>
            <textarea
              id="bio"
              rows="4"
              placeholder="Tell us about your background, expertise in specific rituals, and your spiritual philosophy."
              required
              value={form.bio}
              onChange={handleChange('bio')}
            />
          </div>

          <div className="kyc-note">
            <strong>KYC Verification:</strong> After submission, our team will review your
            profile. A verification badge will be granted upon successful document review.
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary full-width">
              Complete Registration ->
            </button>
          </div>
          <p className="policy-text">
            By clicking register, you agree to PANDIT&apos;s Terms of Service and Privacy Policy.
          </p>
        </form>
      </div>
    </div>
  );
}
