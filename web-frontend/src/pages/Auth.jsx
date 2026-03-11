import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api/config.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';

export default function Auth() {
  const navigate = useNavigate();
  const { message, showMessage, clearMessage } = useFlashMessage();
  const [formType, setFormType] = useState('login');
  const [accountType, setAccountType] = useState('user');
  const [loginForm, setLoginForm] = useState({ phone: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    phone: '',
    password: '',
    location: '',
    email: '',
  });
  const [panditForm, setPanditForm] = useState({
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
  const [panditLocating, setPanditLocating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const toggleForm = (type) => {
    setFormType(type);
    clearMessage();
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `${API_BASE_URL}/${accountType === 'pandit' ? 'pandit' : 'user'}/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: loginForm.phone,
            password: loginForm.password,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user_type', data.user_type);
        showMessage('Login successful. Redirecting...', 'success');
        setTimeout(() => navigate('/dashboard'), 1000);
      } else {
        const error = await response.json();
        showMessage(error.detail || 'Login failed. Please check your credentials.', 'error');
      }
    } catch (error) {
      showMessage('Network error. Please try again.', 'error');
      console.error('Login error:', error);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: registerForm.fullName,
          phone: registerForm.phone,
          password: registerForm.password,
          email: registerForm.email || null,
          location_name: registerForm.location || null,
        }),
      });

      if (response.ok) {
        showMessage('Registration successful. Please login.', 'success');
        setTimeout(() => toggleForm('login'), 1500);
      } else {
        const error = await response.json();
        showMessage(error.detail || 'Registration failed. Please try again.', 'error');
      }
    } catch (error) {
      showMessage('Network error. Please try again.', 'error');
      console.error('Registration error:', error);
    }
  };

  const handlePanditRegister = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/pandit/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: panditForm.fullName,
          phone: panditForm.phone,
          password: panditForm.password,
          email: panditForm.email || null,
          experience_years: parseInt(panditForm.experienceYears, 10),
          bio: panditForm.bio,
          region: panditForm.region,
          languages: panditForm.languages,
          location_name: panditForm.locationName || null,
          latitude: panditForm.latitude ? parseFloat(panditForm.latitude) : null,
          longitude: panditForm.longitude ? parseFloat(panditForm.longitude) : null,
          price_per_service: parseFloat(panditForm.pricePerService),
        }),
      });

      if (response.ok) {
        showMessage('Pandit registered successfully. Please login.', 'success');
        setTimeout(() => {
          setAccountType('pandit');
          toggleForm('login');
        }, 1500);
      } else {
        const error = await response.json();
        showMessage(error.detail || 'Pandit registration failed. Please try again.', 'error');
      }
    } catch (error) {
      showMessage('Network error. Please try again.', 'error');
      console.error('Pandit registration error:', error);
    }
  };

  const capturePanditLocation = () => {
    if (!navigator.geolocation) {
      showMessage('Geolocation is not supported by this browser.', 'error');
      return;
    }

    setPanditLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPanditForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }));
        setPanditLocating(false);
        showMessage('Location captured successfully.', 'success');
      },
      () => {
        setPanditLocating(false);
        showMessage('Unable to get location. Please allow GPS access.', 'error');
      }
    );
  };

  return (
    <div className="auth-page">
      <header className="auth-topbar">
        <div className="auth-brand">
          <div className="auth-logo">OM</div>
          <div>
            <p className="auth-brand-title">PANDIT</p>
            <p className="auth-brand-subtitle">Spiritual Services</p>
          </div>
        </div>
        <div className="auth-topbar-actions">
          <button type="button" className="icon-pill">?</button>
          <button type="button" className="lang-pill">English</button>
        </div>
      </header>

      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-user-icon">U</div>
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${accountType === 'user' ? 'active' : ''}`}
                onClick={() => setAccountType('user')}
              >
                User Login
              </button>
              <button
                type="button"
                className={`auth-tab ${accountType === 'pandit' ? 'active' : ''}`}
                onClick={() => setAccountType('pandit')}
              >
                Pandit Login
              </button>
            </div>
          </div>

          <div className="auth-body">
            <h2 className="auth-title">{formType === 'login' ? 'Sign In' : 'Register'}</h2>
            <p className="auth-subtitle">
              {formType === 'login'
                ? 'Access your spiritual account'
                : 'Create your spiritual account'}
            </p>

        <div className={`auth-form ${formType === 'login' ? '' : 'hidden'}`}>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="loginPhone">Phone Number</label>
              <div className="input-pill">
                <span className="input-icon">P</span>
                <input
                  type="tel"
                  id="loginPhone"
                  placeholder="Enter your mobile number"
                  required
                  value={loginForm.phone}
                  onChange={(event) =>
                    setLoginForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="loginPassword">Password</label>
                <button type="button" className="link-button">Forgot?</button>
              </div>
              <div className="input-pill">
                <span className="input-icon">L</span>
                <input
                  type="password"
                  id="loginPassword"
                  placeholder="Enter your password"
                  required
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                />
                <span className="input-icon">E</span>
              </div>
            </div>
            <button type="submit" className="btn btn-primary full-width">
              Sign In ->
            </button>
          </form>
          <p className="toggle-auth center-text">
            Don&apos;t have an account?{' '}
            <button type="button" onClick={() => toggleForm('register')} className="link-button">
              Register Now
            </button>
          </p>
        </div>

        <div className={`auth-form ${formType === 'register' ? '' : 'hidden'}`}>
          {accountType === 'user' ? (
            <>
              <h2>User Registration</h2>
              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label htmlFor="registerName">Full Name</label>
                  <input
                    type="text"
                    id="registerName"
                    placeholder="Enter your full name"
                    required
                    value={registerForm.fullName}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, fullName: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="registerPhone">Phone Number</label>
                  <input
                    type="tel"
                    id="registerPhone"
                    placeholder="Enter your phone number"
                    required
                    value={registerForm.phone}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="registerPassword">Password</label>
                  <input
                    type="password"
                    id="registerPassword"
                    placeholder="Create a password"
                    required
                    value={registerForm.password}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, password: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="registerEmail">Email (Optional)</label>
                  <input
                    type="email"
                    id="registerEmail"
                    placeholder="Enter your email"
                    value={registerForm.email}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="registerLocation">Location (Optional)</label>
                  <input
                    type="text"
                    id="registerLocation"
                    placeholder="Enter your location"
                    value={registerForm.location}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({ ...prev, location: event.target.value }))
                    }
                  />
                  <p className="helper-text">Helps us show nearby pandits and services.</p>
                </div>
                <button type="submit" className="btn btn-primary">
                  Register
                </button>
              </form>
            </>
          ) : (
            <>
              <h2>Pandit Registration</h2>
              <form onSubmit={handlePanditRegister}>
                <div className="form-group">
                  <label htmlFor="panditFullName">Full Name *</label>
                  <input
                    type="text"
                    id="panditFullName"
                    required
                    value={panditForm.fullName}
                    onChange={(event) =>
                      setPanditForm((prev) => ({ ...prev, fullName: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="panditPhone">Phone Number *</label>
                  <input
                    type="tel"
                    id="panditPhone"
                    required
                    value={panditForm.phone}
                    onChange={(event) =>
                      setPanditForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="panditPassword">Password *</label>
                  <input
                    type="password"
                    id="panditPassword"
                    required
                    value={panditForm.password}
                    onChange={(event) =>
                      setPanditForm((prev) => ({ ...prev, password: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="panditEmail">Email (Optional)</label>
                  <input
                    type="email"
                    id="panditEmail"
                    value={panditForm.email}
                    onChange={(event) =>
                      setPanditForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="panditExperience">Years of Experience *</label>
                  <input
                    type="number"
                    id="panditExperience"
                    min="0"
                    required
                    value={panditForm.experienceYears}
                    onChange={(event) =>
                      setPanditForm((prev) => ({ ...prev, experienceYears: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="panditBio">Bio *</label>
                  <textarea
                    id="panditBio"
                    rows="3"
                    required
                    value={panditForm.bio}
                    onChange={(event) =>
                      setPanditForm((prev) => ({ ...prev, bio: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="panditRegion">Region *</label>
                  <input
                    type="text"
                    id="panditRegion"
                    required
                    value={panditForm.region}
                    onChange={(event) =>
                      setPanditForm((prev) => ({ ...prev, region: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="panditLanguages">Languages *</label>
                  <input
                    type="text"
                    id="panditLanguages"
                    required
                    value={panditForm.languages}
                    onChange={(event) =>
                      setPanditForm((prev) => ({ ...prev, languages: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="panditLocationName">Location Name</label>
                  <input
                    type="text"
                    id="panditLocationName"
                    value={panditForm.locationName}
                    onChange={(event) =>
                      setPanditForm((prev) => ({ ...prev, locationName: event.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label>GPS Location</label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={capturePanditLocation}
                  >
                    {panditLocating ? 'Capturing...' : 'Capture GPS Location'}
                  </button>
                  <p className="helper-text">
                    We use your location to show devotees nearby. Please allow GPS access.
                  </p>
                </div>
                <div className="form-group">
                  <label htmlFor="panditPrice">Price per Service (Rs) *</label>
                  <input
                    type="number"
                    id="panditPrice"
                    min="1"
                    required
                    value={panditForm.pricePerService}
                    onChange={(event) =>
                      setPanditForm((prev) => ({ ...prev, pricePerService: event.target.value }))
                    }
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Register as Pandit
                </button>
              </form>
            </>
          )}
          <p className="toggle-auth center-text">
            Already have an account?{' '}
            <button type="button" onClick={() => toggleForm('login')} className="link-button">
              Login
            </button>
          </p>
        </div>

        {message.text ? (
          <div className={`message ${message.type}`}>{message.text}</div>
        ) : null}
          </div>
          <div className="auth-footer">
            <span>Secure Payment</span>
            <span>Verified Pandits</span>
          </div>
        </div>
      </div>
    </div>
  );
}
