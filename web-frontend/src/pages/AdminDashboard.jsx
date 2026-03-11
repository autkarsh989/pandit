import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../api/config.js';
import { getAuthToken } from '../api/client.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';

export default function AdminDashboard() {
  const { message, showMessage } = useFlashMessage();
  const [stats, setStats] = useState(null);
  const [pendingPandits, setPendingPandits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Total Users', value: stats.users?.total ?? 0 },
      { label: 'Total Pandits', value: stats.pandits?.total ?? 0 },
      { label: 'Verified Pandits', value: stats.pandits?.verified ?? 0 },
      { label: 'Pending Verifications', value: stats.pandits?.pending_verification ?? 0 },
      { label: 'Total Services', value: stats.services?.total ?? 0 },
      { label: 'Total Bookings', value: stats.bookings?.total ?? 0 },
      { label: 'Pending Bookings', value: stats.bookings?.pending ?? 0 },
      { label: 'Completed Bookings', value: stats.bookings?.completed ?? 0 },
    ];
  }, [stats]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, pendingRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/stats`, { headers }),
        fetch(`${API_BASE_URL}/admin/pandits/pending`, { headers }),
      ]);

      if (!statsRes.ok) {
        throw new Error('Failed to load stats');
      }
      if (!pendingRes.ok) {
        throw new Error('Failed to load pending pandits');
      }

      const [statsData, pendingData] = await Promise.all([
        statsRes.json(),
        pendingRes.json(),
      ]);
      setStats(statsData);
      setPendingPandits(Array.isArray(pendingData) ? pendingData : []);
    } catch (error) {
      showMessage(error.message || 'Failed to load admin dashboard', 'error');
      console.error('Admin dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePanditAction = async (panditId, action) => {
    setActionId(panditId);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/admin/pandits/${panditId}/${action}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Action failed');
      }
      showMessage(
        action === 'approve' ? 'Pandit approved successfully.' : 'Pandit rejected.',
        'success'
      );
      loadDashboard();
    } catch (error) {
      showMessage(error.message || 'Action failed', 'error');
      console.error('Pandit action error:', error);
    } finally {
      setActionId('');
    }
  };

  return (
    <div className="container">
      <div className="page-shell">
        <section className="admin-hero">
          <div className="hero-content">
            <span className="hero-badge">Admin Console</span>
            <h1>Platform Oversight</h1>
            <p>Review verification requests, monitor activity, and keep the platform safe.</p>
          </div>
          <div className="hero-side">
            <div className="stat-card">
              <p className="stat-label">Pending Reviews</p>
              <p className="stat-value">{stats?.pandits?.pending_verification ?? 0}</p>
              <p className="stat-note">Pandit verifications</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Active Users</p>
              <p className="stat-value">{stats?.users?.total ?? 0}</p>
              <p className="stat-note">Total registered</p>
            </div>
          </div>
        </section>

        {message.text ? (
          <div className={`message ${message.type}`}>{message.text}</div>
        ) : null}

        <section className="section">
          <div className="section-heading">
            <div>
              <h2 className="section-title">Platform Snapshot</h2>
              <p className="section-subtitle">Key metrics updated in real time</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={loadDashboard}>
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="loading">Loading admin data...</p>
          ) : (
            <div className="admin-stats-grid">
              {statCards.map((card) => (
                <div className="admin-stat-card" key={card.label}>
                  <p className="admin-stat-label">{card.label}</p>
                  <p className="admin-stat-value">{card.value}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <h2 className="section-title">Pending Pandit Verifications</h2>
              <p className="section-subtitle">
                Review new pandit profiles and approve trusted experts
              </p>
            </div>
          </div>

          {loading ? (
            <p className="loading">Loading pending requests...</p>
          ) : pendingPandits.length === 0 ? (
            <p className="no-results">No pending pandit verifications.</p>
          ) : (
            <div className="admin-pending-grid">
              {pendingPandits.map((pandit) => (
                <div className="admin-pending-card" key={pandit.id}>
                  <div className="pandit-header">
                    <div className="pandit-avatar">
                      {(pandit.full_name || pandit.name || 'Pandit')
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase())
                        .join('')}
                    </div>
                    <div>
                      <h3>{pandit.full_name || pandit.name || 'Pandit Profile'}</h3>
                      <div className="rating-row">
                        <span>{pandit.region || 'Region not provided'}</span>
                        <span> - </span>
                        <span>{pandit.languages || 'Languages not set'}</span>
                      </div>
                    </div>
                  </div>
                  <p className="section-subtitle">
                    {pandit.bio || 'No bio provided yet.'}
                  </p>
                  <div className="admin-pending-meta">
                    <span className="tag">Experience: {pandit.experience_years || 0} yrs</span>
                    <span className="tag">Price: Rs {pandit.price_per_service || 0}</span>
                  </div>
                  <div className="admin-pending-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handlePanditAction(pandit.id, 'approve')}
                      disabled={actionId === pandit.id}
                    >
                      {actionId === pandit.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handlePanditAction(pandit.id, 'reject')}
                      disabled={actionId === pandit.id}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
