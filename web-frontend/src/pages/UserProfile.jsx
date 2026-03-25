import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPut, getAuthToken } from '../api/client.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function UserProfile() {
  const navigate = useNavigate();
  const { message, showMessage } = useFlashMessage();
  const [loading, setLoading] = useState(true);
  const [savingBirth, setSavingBirth] = useState(false);
  const [profile, setProfile] = useState(null);
  const [birthForm, setBirthForm] = useState({
    dob: '',
    timeOfBirth: '',
    placeOfBirth: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const token = getAuthToken();
    if (!token) {
      navigate('/', { replace: true });
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet('/user/profile', true);
      setProfile(data || null);
      setBirthForm({
        dob: data?.dob || '',
        timeOfBirth: data?.time_of_birth || '',
        placeOfBirth: data?.place_of_birth || '',
      });
    } catch (error) {
      showMessage('Failed to load profile', 'error');
      console.error('Load user profile error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    setBirthForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const saveBirthDetails = async (event) => {
    event.preventDefault();
    const token = getAuthToken();
    if (!token) {
      navigate('/', { replace: true });
      return;
    }

    if (birthForm.timeOfBirth && !TIME_PATTERN.test(birthForm.timeOfBirth)) {
      showMessage('Time of birth must be in HH:MM 24-hour format.', 'error');
      return;
    }

    setSavingBirth(true);
    try {
      const payload = {
        dob: birthForm.dob || null,
        time_of_birth: birthForm.timeOfBirth || null,
        place_of_birth: birthForm.placeOfBirth || null,
      };
      const response = await apiPut('/user/profile/dob', payload, true);
      setBirthForm({
        dob: response?.dob || birthForm.dob,
        timeOfBirth: response?.time_of_birth || birthForm.timeOfBirth,
        placeOfBirth: response?.place_of_birth || birthForm.placeOfBirth,
      });
      setProfile((prev) => ({
        ...(prev || {}),
        dob: response?.dob || birthForm.dob,
        time_of_birth: response?.time_of_birth || birthForm.timeOfBirth,
        place_of_birth: response?.place_of_birth || birthForm.placeOfBirth,
      }));
      showMessage('Birth details updated', 'success');
    } catch (error) {
      showMessage(error.message || 'Failed to update birth details', 'error');
      console.error('Save birth details error:', error);
    } finally {
      setSavingBirth(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_type');
    navigate('/', { replace: true });
  };

  if (loading) {
    return (
      <div className="container">
        <p className="loading">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-shell">
        <div className="page-header">
          <h2>My Profile</h2>
          <p>Keep your birth details up to date for horoscope insights.</p>
        </div>

        {message.text ? (
          <div className={`message ${message.type}`}>{message.text}</div>
        ) : null}

        <section className="section">
          <div className="profile-card">
            <h3>Birth Details</h3>
            <p className="section-subtitle">
              Add now or update later for personalized insights.
            </p>
            <form onSubmit={saveBirthDetails}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="userDob">Date of Birth (YYYY-MM-DD)</label>
                  <input
                    id="userDob"
                    type="date"
                    value={birthForm.dob}
                    onChange={handleChange('dob')}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="userTob">Time of Birth (HH:MM, 24-hour)</label>
                  <input
                    id="userTob"
                    type="text"
                    placeholder="05:30"
                    value={birthForm.timeOfBirth}
                    onChange={handleChange('timeOfBirth')}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="userPlace">Place of Birth</label>
                <input
                  id="userPlace"
                  type="text"
                  value={birthForm.placeOfBirth}
                  onChange={handleChange('placeOfBirth')}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={savingBirth}>
                  {savingBirth ? 'Saving...' : 'Save Birth Details'}
                </button>
              </div>
            </form>
            {profile?.full_name ? (
              <p className="section-subtitle">Account: {profile.full_name}</p>
            ) : null}
          </div>
        </section>

        <section className="section">
          <div className="profile-card">
            <h3>Account Settings</h3>
            <p className="section-subtitle">Manage your sign in and preferences.</p>
            <button type="button" className="btn btn-secondary" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
