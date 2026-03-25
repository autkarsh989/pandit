import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPut, getAuthToken, getUserType } from '../api/client.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeTimes(values) {
  const cleaned = values
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const unique = Array.from(new Set(cleaned));
  unique.sort((a, b) => {
    const [ah, am] = a.split(':').map(Number);
    const [bh, bm] = b.split(':').map(Number);
    return ah * 60 + am - (bh * 60 + bm);
  });

  return unique;
}

export default function AdminNotificationSettings() {
  const navigate = useNavigate();
  const { message, showMessage } = useFlashMessage();
  const [times, setTimes] = useState(['05:00', '10:00', '17:00']);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const userType = getUserType();
    if (userType !== 'admin') {
      navigate('/admin', { replace: true });
      return;
    }
    loadSettings();
  }, [navigate]);

  const invalidEntries = useMemo(
    () => times.filter((value) => value.trim().length > 0 && !TIME_PATTERN.test(value.trim())),
    [times]
  );

  const loadSettings = async () => {
    const token = getAuthToken();
    if (!token) return;
    setLoading(true);
    try {
      const response = await apiGet('/admin/notification-settings', true);
      const normalized = normalizeTimes(Array.isArray(response?.send_times) ? response.send_times : []);
      if (normalized.length > 0) {
        setTimes(normalized);
      }
    } catch (error) {
      showMessage('Unable to load notification timings.', 'error');
      console.error('Load notification settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTime = (index, value) => {
    setTimes((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const addTime = () => {
    if (times.length >= 6) {
      showMessage('You can add up to 6 notification times.', 'error');
      return;
    }
    setTimes((prev) => [...prev, '']);
  };

  const removeTime = (index) => {
    if (times.length <= 1) {
      showMessage('Keep at least one notification time.', 'error');
      return;
    }
    setTimes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const saveTimes = async () => {
    const token = getAuthToken();
    if (!token) return;

    const normalized = normalizeTimes(times);

    if (normalized.length < 1) {
      showMessage('Please add at least one notification time.', 'error');
      return;
    }

    if (normalized.some((value) => !TIME_PATTERN.test(value))) {
      showMessage('All times must be in HH:MM format. Example: 05:00', 'error');
      return;
    }

    setSaving(true);
    try {
      const response = await apiPut('/admin/notification-settings', { send_times: normalized }, true);
      const updated = normalizeTimes(Array.isArray(response?.send_times) ? response.send_times : normalized);
      setTimes(updated);
      showMessage('Notification timings updated successfully.', 'success');
    } catch (error) {
      showMessage(error.message || 'Failed to update notification timings.', 'error');
      console.error('Save notification settings error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container">
      <div className="page-shell">
        <div className="page-header">
          <h2>Notification Timing</h2>
          <p>Set when quote notifications are sent each day.</p>
          <div className="button-group">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Back
            </button>
          </div>
        </div>

        {message.text ? (
          <div className={`message ${message.type}`}>{message.text}</div>
        ) : null}

        <div className="profile-card">
          <h3>Daily Send Times (HH:MM)</h3>
          <p className="section-subtitle">Examples: 05:00, 10:00, 17:00</p>

          {loading ? <p className="loading">Loading current timing...</p> : null}

          <div className="time-list">
            {times.map((time, index) => (
              <div className="time-row" key={`slot-${index}`}>
                <input
                  type="text"
                  placeholder="HH:MM"
                  value={time}
                  onChange={(event) => updateTime(index, event.target.value)}
                  maxLength={5}
                />
                <button type="button" className="btn btn-secondary" onClick={() => removeTime(index)}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          {invalidEntries.length > 0 ? (
            <p className="error-text">Fix invalid time format before saving.</p>
          ) : null}

          <div className="button-group">
            <button type="button" className="btn btn-secondary" onClick={addTime}>
              Add Time
            </button>
            <button type="button" className="btn btn-primary" onClick={saveTimes} disabled={saving}>
              {saving ? 'Saving...' : 'Save Timing'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
