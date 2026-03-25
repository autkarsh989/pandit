import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiDelete, apiPost, apiPut, getAuthToken, getUserType } from '../api/client.js';
import { API_BASE_URL } from '../api/config.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';

const EFFECT_TYPES = [
  { value: 'badge', label: 'Badge' },
  { value: 'flash', label: 'Flash' },
  { value: 'glow', label: 'Glow' },
  { value: 'pulse', label: 'Pulse' },
];

const EFFECT_COLORS = [
  '#ff6b35',
  '#ff3838',
  '#ff9500',
  '#ffcc02',
  '#32d74b',
  '#007aff',
  '#5856d6',
  '#af52de',
];

const TARGET_OPTIONS = ['user', 'pandit', 'both'];

export default function AdminSpecialOffers() {
  const navigate = useNavigate();
  const { message, showMessage } = useFlashMessage();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    discountPercentage: '',
    discountAmount: '',
    offerCode: '',
    targetAudience: 'both',
    effectType: 'badge',
    effectColor: '#ff6b35',
    endDate: '',
    maxUses: '',
    isActive: true,
  });

  useEffect(() => {
    const userType = getUserType();
    if (userType !== 'admin') {
      navigate('/admin', { replace: true });
      return;
    }
    loadOffers();
  }, [navigate]);

  const loadOffers = async () => {
    const token = getAuthToken();
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/special-offers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.ok ? await response.json() : [];
      setOffers(Array.isArray(data) ? data : []);
    } catch (error) {
      showMessage('Failed to load special offers', 'error');
      console.error('Load offers error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditing(null);
    setForm({
      title: '',
      description: '',
      discountPercentage: '',
      discountAmount: '',
      offerCode: '',
      targetAudience: 'both',
      effectType: 'badge',
      effectColor: '#ff6b35',
      endDate: '',
      maxUses: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (offer) => {
    setEditing(offer);
    setForm({
      title: offer.title || '',
      description: offer.description || '',
      discountPercentage: offer.discount_percentage?.toString() || '',
      discountAmount: offer.discount_amount?.toString() || '',
      offerCode: offer.offer_code || '',
      targetAudience: offer.target_audience || 'both',
      effectType: offer.effect_type || 'badge',
      effectColor: offer.effect_color || '#ff6b35',
      endDate: offer.end_date ? offer.end_date.slice(0, 10) : '',
      maxUses: offer.max_uses?.toString() || '',
      isActive: Boolean(offer.is_active),
    });
    setShowModal(true);
  };

  const saveOffer = async (event) => {
    event.preventDefault();
    if (!form.title || !form.description) {
      showMessage('Title and description are required.', 'error');
      return;
    }
    if (!form.discountPercentage && !form.discountAmount) {
      showMessage('Provide a discount percentage or amount.', 'error');
      return;
    }

    const payload = {
      title: form.title,
      description: form.description,
      discount_percentage: form.discountPercentage ? parseFloat(form.discountPercentage) : null,
      discount_amount: form.discountAmount ? parseFloat(form.discountAmount) : null,
      offer_code: form.offerCode || null,
      target_audience: form.targetAudience,
      effect_type: form.effectType,
      effect_color: form.effectColor,
      end_date: form.endDate ? new Date(form.endDate).toISOString() : null,
      max_uses: form.maxUses ? parseInt(form.maxUses, 10) : null,
      is_active: form.isActive,
    };

    try {
      if (editing) {
        await apiPut(`/admin/special-offers/${editing.id}`, payload, true);
        showMessage('Special offer updated', 'success');
      } else {
        await apiPost('/admin/special-offers', payload, true);
        showMessage('Special offer created', 'success');
      }
      setShowModal(false);
      loadOffers();
    } catch (error) {
      showMessage(error.message || 'Failed to save offer', 'error');
      console.error('Save offer error:', error);
    }
  };

  const deleteOffer = async (offerId) => {
    if (!window.confirm('Delete this special offer?')) return;
    try {
      await apiDelete(`/admin/special-offers/${offerId}`, true);
      showMessage('Special offer deleted', 'success');
      loadOffers();
    } catch (error) {
      showMessage(error.message || 'Failed to delete offer', 'error');
      console.error('Delete offer error:', error);
    }
  };

  const toggleOfferStatus = async (offer) => {
    try {
      await apiPut(
        `/admin/special-offers/${offer.id}`,
        {
          ...offer,
          is_active: !offer.is_active,
        },
        true
      );
      loadOffers();
    } catch (error) {
      showMessage(error.message || 'Failed to update offer status', 'error');
      console.error('Toggle offer status error:', error);
    }
  };

  const formatDiscount = (offer) => {
    if (offer.discount_percentage) {
      return `${offer.discount_percentage}% OFF`;
    }
    if (offer.discount_amount) {
      return `Rs ${offer.discount_amount} OFF`;
    }
    return 'Special Offer';
  };

  const audienceLabels = useMemo(
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
          <h2>Special Offers</h2>
          <p>Create promotional offers with visual effects.</p>
          <div className="button-group">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreateModal}>
              Create Offer
            </button>
          </div>
        </div>

        {message.text ? (
          <div className={`message ${message.type}`}>{message.text}</div>
        ) : null}

        {loading ? <p className="loading">Loading offers...</p> : null}

        <div className="offers-grid">
          {!loading && offers.length === 0 ? (
            <p className="no-results">No special offers created yet.</p>
          ) : null}
          {offers.map((offer) => (
            <div className="offer-card" key={offer.id}>
              <div
                className="offer-preview"
                style={{ backgroundColor: offer.effect_color || '#db731c' }}
              >
                <span>{formatDiscount(offer)}</span>
              </div>
              <div className="offer-body">
                <h3>{offer.title}</h3>
                <p className="section-subtitle">{offer.description}</p>
                <div className="offer-meta">
                  <span>Target: {offer.target_audience}</span>
                  <span>Effect: {offer.effect_type}</span>
                  <span className={offer.is_active ? 'status-active' : 'status-inactive'}>
                    {offer.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {offer.offer_code ? <p className="offer-code">Code: {offer.offer_code}</p> : null}
                {offer.max_uses ? (
                  <p className="mini-meta">
                    Used: {offer.current_uses}/{offer.max_uses}
                  </p>
                ) : null}
                {offer.end_date ? (
                  <p className="mini-meta">
                    Expires: {new Date(offer.end_date).toLocaleDateString()}
                  </p>
                ) : null}
                <div className="button-group">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => toggleOfferStatus(offer)}
                  >
                    {offer.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => openEditModal(offer)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => deleteOffer(offer.id)}
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
          <h3>{editing ? 'Edit Special Offer' : 'Create Special Offer'}</h3>
          <form onSubmit={saveOffer}>
            <div className="form-group">
              <label htmlFor="offerTitle">Title *</label>
              <input
                id="offerTitle"
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="offerDesc">Description *</label>
              <textarea
                id="offerDesc"
                rows="3"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="discountPercent">Discount %</label>
                <input
                  id="discountPercent"
                  type="number"
                  min="0"
                  step="1"
                  value={form.discountPercentage}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, discountPercentage: event.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="discountAmount">Discount Amount (Rs)</label>
                <input
                  id="discountAmount"
                  type="number"
                  min="0"
                  step="1"
                  value={form.discountAmount}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, discountAmount: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="offerCode">Offer Code (Optional)</label>
              <input
                id="offerCode"
                type="text"
                value={form.offerCode}
                onChange={(event) => setForm((prev) => ({ ...prev, offerCode: event.target.value }))}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="offerAudience">Target Audience</label>
                <select
                  id="offerAudience"
                  value={form.targetAudience}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, targetAudience: event.target.value }))
                  }
                >
                  {TARGET_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {audienceLabels[option]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="offerEffect">Effect Type</label>
                <select
                  id="offerEffect"
                  value={form.effectType}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, effectType: event.target.value }))
                  }
                >
                  {EFFECT_TYPES.map((effect) => (
                    <option key={effect.value} value={effect.value}>
                      {effect.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Effect Color</label>
              <div className="color-row">
                {EFFECT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-swatch ${form.effectColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setForm((prev) => ({ ...prev, effectColor: color }))}
                  />
                ))}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="offerMaxUses">Max Uses (Optional)</label>
                <input
                  id="offerMaxUses"
                  type="number"
                  min="1"
                  value={form.maxUses}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, maxUses: event.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="offerEndDate">End Date (Optional)</label>
                <input
                  id="offerEndDate"
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                />
              </div>
            </div>
            <div className="form-group form-group-inline">
              <label htmlFor="offerActive">Active</label>
              <input
                id="offerActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                }
              />
            </div>
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
