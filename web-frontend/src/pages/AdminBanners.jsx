import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, ASSET_BASE_URL } from '../api/config.js';
import { apiDelete, apiPost, apiPut, getAuthToken, getUserType } from '../api/client.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';

const TARGET_OPTIONS = ['user', 'pandit', 'both'];

export default function AdminBanners() {
  const navigate = useNavigate();
  const { message, showMessage } = useFlashMessage();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    badgeText: '',
    targetAudience: 'both',
    isActive: true,
  });

  useEffect(() => {
    const userType = getUserType();
    if (userType !== 'admin') {
      navigate('/admin', { replace: true });
      return;
    }
    loadBanners();
  }, [navigate]);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/admin/banners`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.ok ? await response.json() : [];
      setBanners(Array.isArray(data) ? data : []);
    } catch (error) {
      showMessage('Failed to load banners', 'error');
      console.error('Load banners error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditing(null);
    setForm({
      title: '',
      subtitle: '',
      badgeText: '',
      targetAudience: 'both',
      isActive: true,
    });
    setImageFile(null);
    setImagePreview('');
    setShowModal(true);
  };

  const openEditModal = (banner) => {
    setEditing(banner);
    setForm({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      badgeText: banner.badge_text || '',
      targetAudience: banner.target_audience || 'both',
      isActive: Boolean(banner.is_active),
    });
    setImageFile(null);
    setImagePreview(banner.image_url ? `${ASSET_BASE_URL}${banner.image_url}` : '');
    setShowModal(true);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const saveBanner = async (event) => {
    event.preventDefault();
    const token = getAuthToken();
    if (!token) {
      showMessage('Please login again.', 'error');
      navigate('/admin', { replace: true });
      return;
    }

    if (!form.title || !form.subtitle) {
      showMessage('Title and subtitle are required.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('subtitle', form.subtitle);
    if (form.badgeText) formData.append('badge_text', form.badgeText);
    formData.append('target_audience', form.targetAudience);
    formData.append('is_active', String(form.isActive));
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      if (editing) {
        await apiPut(`/admin/banners/${editing.id}`, formData, true);
        showMessage('Banner updated successfully!', 'success');
      } else {
        await apiPost('/admin/banners', formData, true);
        showMessage('Banner created successfully!', 'success');
      }
      setShowModal(false);
      loadBanners();
    } catch (error) {
      showMessage(error.message || 'Failed to save banner', 'error');
      console.error('Save banner error:', error);
    }
  };

  const deleteBanner = async (bannerId) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await apiDelete(`/admin/banners/${bannerId}`, true);
      showMessage('Banner deleted.', 'success');
      loadBanners();
    } catch (error) {
      showMessage(error.message || 'Failed to delete banner', 'error');
      console.error('Delete banner error:', error);
    }
  };

  const toggleStatus = async (banner) => {
    try {
      await apiPut(
        `/admin/banners/${banner.id}`,
        {
          ...banner,
          is_active: !banner.is_active,
        },
        true
      );
      loadBanners();
    } catch (error) {
      showMessage(error.message || 'Failed to update banner status', 'error');
      console.error('Toggle banner status error:', error);
    }
  };

  const audienceLabel = useMemo(
    () =>
      TARGET_OPTIONS.reduce((acc, value) => {
        acc[value] = value.charAt(0).toUpperCase() + value.slice(1);
        return acc;
      }, {}),
    []
  );

  return (
    <div className="container">
      <div className="page-shell">
        <div className="page-header">
          <h2>Banner Management</h2>
          <p>Create hero banners for users and pandits.</p>
          <div className="button-group">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreateModal}>
              Create Banner
            </button>
          </div>
        </div>

        {message.text ? (
          <div className={`message ${message.type}`}>{message.text}</div>
        ) : null}

        {loading ? <p className="loading">Loading banners...</p> : null}

        <div className="admin-banner-grid">
          {!loading && banners.length === 0 ? (
            <p className="no-results">No banners created yet.</p>
          ) : null}
          {banners.map((banner) => (
            <div className="admin-banner-card" key={banner.id}>
              <div
                className="admin-banner-image"
                style={
                  banner.image_url
                    ? { backgroundImage: `url(${ASSET_BASE_URL}${banner.image_url})` }
                    : undefined
                }
              />
              <div className="admin-banner-body">
                <div>
                  <h3>{banner.title}</h3>
                  <p className="section-subtitle">{banner.subtitle}</p>
                  {banner.badge_text ? (
                    <span className="tag">{banner.badge_text}</span>
                  ) : null}
                </div>
                <div className="admin-banner-meta">
                  <span>Target: {banner.target_audience}</span>
                  <span className={banner.is_active ? 'status-active' : 'status-inactive'}>
                    {banner.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="button-group">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => toggleStatus(banner)}
                  >
                    {banner.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => openEditModal(banner)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => deleteBanner(banner.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`modal ${showModal ? '' : 'hidden'}`}>
        <div className="modal-content modal-wide">
          <span className="close" onClick={() => setShowModal(false)}>
            &times;
          </span>
          <h3>{editing ? 'Edit Banner' : 'Create Banner'}</h3>
          <form onSubmit={saveBanner}>
            <div className="form-group">
              <label htmlFor="bannerTitle">Title *</label>
              <input
                id="bannerTitle"
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="bannerSubtitle">Subtitle *</label>
              <textarea
                id="bannerSubtitle"
                rows="3"
                value={form.subtitle}
                onChange={(event) => setForm((prev) => ({ ...prev, subtitle: event.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="bannerBadge">Badge Text (Optional)</label>
              <input
                id="bannerBadge"
                type="text"
                value={form.badgeText}
                onChange={(event) => setForm((prev) => ({ ...prev, badgeText: event.target.value }))}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="bannerAudience">Target Audience</label>
                <select
                  id="bannerAudience"
                  value={form.targetAudience}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, targetAudience: event.target.value }))
                  }
                >
                  {TARGET_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {audienceLabel[option]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group form-group-inline">
                <label htmlFor="bannerActive">Active</label>
                <input
                  id="bannerActive"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="bannerImage">Banner Image</label>
              <input id="bannerImage" type="file" accept="image/*" onChange={handleFileChange} />
            </div>
            {imagePreview ? (
              <div className="banner-preview" style={{ backgroundImage: `url(${imagePreview})` }} />
            ) : null}
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
