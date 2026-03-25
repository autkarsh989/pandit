import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../api/config.js';
import { apiDelete, apiPost, apiPut, getAuthToken, getUserType } from '../api/client.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';

export default function AdminGlobalPricing() {
  const navigate = useNavigate();
  const { message, showMessage } = useFlashMessage();
  const [pricingConfigs, setPricingConfigs] = useState([]);
  const [currentPricing, setCurrentPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    discountPercentage: '',
    description: '',
    isActive: true,
  });

  useEffect(() => {
    const userType = getUserType();
    if (userType !== 'admin') {
      navigate('/admin', { replace: true });
      return;
    }
    loadPricing();
  }, [navigate]);

  const loadPricing = async () => {
    const token = getAuthToken();
    if (!token) return;
    setLoading(true);
    try {
      const [listRes, currentRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/global-pricing`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/global-pricing/current`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const listData = listRes.ok ? await listRes.json() : [];
      const currentData = currentRes.ok ? await currentRes.json() : null;
      setPricingConfigs(Array.isArray(listData) ? listData : []);
      setCurrentPricing(currentData || null);
    } catch (error) {
      showMessage('Failed to load pricing configs', 'error');
      console.error('Load pricing configs error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditing(null);
    setForm({
      discountPercentage: '',
      description: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (config) => {
    setEditing(config);
    setForm({
      discountPercentage: config.discount_percentage?.toString() || '',
      description: config.description || '',
      isActive: Boolean(config.is_active),
    });
    setShowModal(true);
  };

  const saveConfig = async (event) => {
    event.preventDefault();
    const discountValue = parseFloat(form.discountPercentage);
    if (Number.isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      showMessage('Discount percentage must be between 0 and 100', 'error');
      return;
    }
    try {
      const payload = {
        discount_percentage: discountValue,
        description: form.description || null,
        is_active: form.isActive,
      };
      if (editing) {
        await apiPut(`/admin/global-pricing/${editing.id}`, payload, true);
        showMessage('Pricing updated', 'success');
      } else {
        await apiPost('/admin/global-pricing', payload, true);
        showMessage('Pricing created', 'success');
      }
      setShowModal(false);
      loadPricing();
    } catch (error) {
      showMessage(error.message || 'Failed to save pricing', 'error');
      console.error('Save pricing error:', error);
    }
  };

  const deleteConfig = async (configId) => {
    if (!window.confirm('Delete this pricing configuration?')) return;
    try {
      await apiDelete(`/admin/global-pricing/${configId}`, true);
      showMessage('Pricing configuration deleted', 'success');
      loadPricing();
    } catch (error) {
      showMessage(error.message || 'Failed to delete pricing', 'error');
      console.error('Delete pricing error:', error);
    }
  };

  const activateConfig = async (configId) => {
    try {
      await apiPost(`/admin/global-pricing/activate/${configId}`, {}, true);
      showMessage('Pricing activated', 'success');
      loadPricing();
    } catch (error) {
      showMessage(error.message || 'Failed to activate pricing', 'error');
      console.error('Activate pricing error:', error);
    }
  };

  const deactivateAll = async () => {
    if (!window.confirm('Deactivate all pricing and return to original prices?')) return;
    try {
      await apiPost('/admin/global-pricing/deactivate-all', {}, true);
      showMessage('Global pricing deactivated', 'success');
      loadPricing();
    } catch (error) {
      showMessage(error.message || 'Failed to deactivate pricing', 'error');
      console.error('Deactivate pricing error:', error);
    }
  };

  const formatDiscount = (percentage) => {
    if (!percentage) return 'No Discount';
    return `${percentage}% OFF`;
  };

  const previewPrice = useMemo(() => {
    const value = parseFloat(form.discountPercentage);
    if (Number.isNaN(value)) return null;
    const calculate = (price) => Math.round(price * (1 - value / 100));
    return [calculate(1000), calculate(2500), calculate(5000)];
  }, [form.discountPercentage]);

  return (
    <div className="container">
      <div className="page-shell">
        <div className="page-header">
          <h2>Global Pricing</h2>
          <p>Apply platform-wide discounts to services.</p>
          <div className="button-group">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreateModal}>
              Create Config
            </button>
          </div>
        </div>

        {message.text ? (
          <div className={`message ${message.type}`}>{message.text}</div>
        ) : null}

        <div className="pricing-highlight">
          <div>
            <h3>Current Active Pricing</h3>
            {currentPricing ? (
              <>
                <p className="pricing-discount">
                  {formatDiscount(currentPricing.discount_percentage)}
                </p>
                <p className="section-subtitle">
                  {currentPricing.description ||
                    'Global pricing discount applied to all services.'}
                </p>
                <div className="pricing-preview">
                  <span>Rs 1000 -> Rs {Math.round(1000 * (1 - currentPricing.discount_percentage / 100))}</span>
                  <span>Rs 2500 -> Rs {Math.round(2500 * (1 - currentPricing.discount_percentage / 100))}</span>
                </div>
              </>
            ) : (
              <p className="section-subtitle">No active pricing discount.</p>
            )}
          </div>
          <button type="button" className="btn btn-secondary" onClick={deactivateAll}>
            Return to Original Prices
          </button>
        </div>

        {loading ? <p className="loading">Loading pricing configurations...</p> : null}

        <div className="pricing-grid">
          {!loading && pricingConfigs.length === 0 ? (
            <p className="no-results">No pricing configurations created yet.</p>
          ) : null}
          {pricingConfigs.map((config) => (
            <div className="pricing-card" key={config.id}>
              <div>
                <h3>{formatDiscount(config.discount_percentage)}</h3>
                <p className="section-subtitle">{config.description || 'No description'}</p>
                <p className="mini-meta">
                  Created: {new Date(config.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="pricing-status">
                <span className={config.is_active ? 'status-active' : 'status-inactive'}>
                  {config.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="button-group">
                {!config.is_active ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => activateConfig(config.id)}
                  >
                    Activate
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => openEditModal(config)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => deleteConfig(config.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`modal ${showModal ? '' : 'hidden'}`}>
        <div className="modal-content">
          <span className="close" onClick={() => setShowModal(false)}>
            &times;
          </span>
          <h3>{editing ? 'Edit Pricing Configuration' : 'Create Pricing Configuration'}</h3>
          <form onSubmit={saveConfig}>
            <div className="form-group">
              <label htmlFor="discountPercentage">Discount Percentage (0-100) *</label>
              <input
                id="discountPercentage"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={form.discountPercentage}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, discountPercentage: event.target.value }))
                }
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="discountDescription">Description (Optional)</label>
              <textarea
                id="discountDescription"
                rows="3"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            {previewPrice ? (
              <div className="pricing-preview-card">
                <p>Price Preview</p>
                <span>Rs 1000 -> Rs {previewPrice[0]}</span>
                <span>Rs 2500 -> Rs {previewPrice[1]}</span>
                <span>Rs 5000 -> Rs {previewPrice[2]}</span>
              </div>
            ) : null}
            <div className="form-group form-group-inline">
              <label htmlFor="discountActive">Activate immediately</label>
              <input
                id="discountActive"
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
