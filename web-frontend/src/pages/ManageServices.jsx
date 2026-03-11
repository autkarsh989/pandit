import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../api/config.js';
import { getAuthToken } from '../api/client.js';
import { useFlashMessage } from '../hooks/useFlashMessage.js';

const QUICK_SERVICES = [
  { name: 'Satyanarayan Puja', category: 'Puja', price: 2100, duration: 180 },
  { name: 'Griha Pravesh Puja', category: 'Puja', price: 3500, duration: 240 },
  { name: 'Ganesh Chaturthi Puja', category: 'Festival', price: 2500, duration: 120 },
  { name: 'Navratri Hawan', category: 'Hawan', price: 5100, duration: 300 },
  { name: 'Vivah Sanskar', category: 'Wedding', price: 11000, duration: 480 },
  { name: 'Namkaran Ceremony', category: 'Naming', price: 2100, duration: 90 },
  { name: 'Kundli Reading', category: 'Astrology', price: 1100, duration: 60 },
  { name: 'Rudrabhishek', category: 'Puja', price: 3100, duration: 150 },
  { name: 'Lakshmi Puja', category: 'Puja', price: 2100, duration: 120 },
  { name: 'Durga Puja', category: 'Festival', price: 5100, duration: 240 },
  { name: 'Shradh Ceremony', category: 'Ritual', price: 3500, duration: 180 },
  { name: 'Vastu Consultation', category: 'Astrology', price: 2100, duration: 90 },
];

export default function ManageServices() {
  const { message, showMessage } = useFlashMessage();
  const [services, setServices] = useState([]);
  const [serviceMeta, setServiceMeta] = useState({ skip: 0, limit: 8, total: 0 });
  const [loading, setLoading] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    description: '',
    basePrice: '',
    durationMinutes: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: '',
    basePrice: '',
    durationMinutes: '',
    description: '',
  });

  useEffect(() => {
    loadAllServices();
  }, []);

  const categories = useMemo(
    () => [
      'Puja',
      'Hawan',
      'Wedding',
      'Naming',
      'Astrology',
      'Festival',
      'Ritual',
      'Other',
    ],
    []
  );

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const loadAllServices = async (skipOverride = null) => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const skipValue = skipOverride !== null ? skipOverride : serviceMeta.skip;
      const response = await fetch(
        `${API_BASE_URL}/pandit/services/paged?skip=${skipValue}&limit=${serviceMeta.limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      const items = Array.isArray(data.items) ? data.items : [];
      setServiceMeta({
        total: data.total || 0,
        skip: data.skip || 0,
        limit: data.limit || serviceMeta.limit,
      });
      setServices((prev) => {
        if (skipValue > 0) {
          return [...prev, ...items];
        }
        return items;
      });
    } catch (error) {
      showMessage('Error loading services', 'error');
      console.error('Load services error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addService = async (payload) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/pandit/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showMessage(`Service "${payload.name}" added successfully!`, 'success');
        setForm({ name: '', category: '', basePrice: '', durationMinutes: '', description: '' });
        setServiceMeta((prev) => ({ ...prev, skip: 0 }));
        loadAllServices(0);
      } else {
        const error = await response.json();
        showMessage(error.detail || 'Failed to add service.', 'error');
      }
    } catch (error) {
      showMessage('Network error. Please try again.', 'error');
      console.error('Add service error:', error);
    }
  };

  const handleAddService = async (event) => {
    event.preventDefault();
    await addService({
      name: form.name,
      category: form.category,
      description: form.description || null,
      base_price: parseFloat(form.basePrice),
      duration_minutes: parseInt(form.durationMinutes, 10),
    });
  };

  const addQuickService = async (quickService) => {
    await addService({
      name: quickService.name,
      category: quickService.category,
      description: null,
      base_price: quickService.price,
      duration_minutes: quickService.duration,
    });
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setEditForm({
      name: service.name || '',
      category: service.category || '',
      description: service.description || '',
      basePrice: service.base_price?.toString() || '',
      durationMinutes: service.duration_minutes?.toString() || '',
    });
  };

  const closeEditModal = () => {
    setEditingService(null);
  };

  const updateService = async (event) => {
    event.preventDefault();
    if (!editingService) return;
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/pandit/services/${editingService.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editForm.name,
          category: editForm.category,
          description: editForm.description || null,
          base_price: parseFloat(editForm.basePrice),
          duration_minutes: parseInt(editForm.durationMinutes, 10),
        }),
      });
      if (response.ok) {
        showMessage('Service updated successfully!', 'success');
        closeEditModal();
        setServiceMeta((prev) => ({ ...prev, skip: 0 }));
        loadAllServices(0);
      } else {
        const error = await response.json();
        showMessage(error.detail || 'Failed to update service.', 'error');
      }
    } catch (error) {
      showMessage('Network error. Please try again.', 'error');
      console.error('Update service error:', error);
    }
  };

  const uploadServiceImage = async (serviceId, file) => {
    if (!file) return;
    if (!(file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg') || file.name.toLowerCase().endsWith('.png'))) {
      showMessage('Only JPG and PNG files are allowed.', 'error');
      return;
    }
    setUploadingImage(true);
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_BASE_URL}/pandit/services/${serviceId}/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        showMessage('Image uploaded successfully!', 'success');
        setServices((prev) =>
          prev.map((service) =>
            service.id === serviceId ? { ...service, image_url: data.image_url } : service
          )
        );
      } else {
        const error = await response.json();
        showMessage(error.detail || 'Failed to upload image.', 'error');
      }
    } catch (error) {
      showMessage('Network error. Please try again.', 'error');
      console.error('Upload image error:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div className="container">
      <div className="page-header manage-services-header">
        <h2>Manage Services</h2>
        <p>Add and manage spiritual services offered on the platform</p>
      </div>

      {message.text ? (
        <div className={`message ${message.type}`}>{message.text}</div>
      ) : null}

      <div className="service-management">
        <div className="add-service-section">
          <h3>Add New Service</h3>
          <p className="section-subtitle">Expand your offerings to reach more devotees.</p>
          <form onSubmit={handleAddService}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="serviceName">Service Name *</label>
                <input
                  type="text"
                  id="serviceName"
                  placeholder="e.g., Satyanarayan Puja"
                  required
                  value={form.name}
                  onChange={handleChange('name')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="serviceCategory">Category *</label>
                <select
                  id="serviceCategory"
                  required
                  value={form.category}
                  onChange={handleChange('category')}
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="basePrice">Base Price (Rs )</label>
                <input
                  type="number"
                  id="basePrice"
                  min="0"
                  step="100"
                  placeholder="5100"
                  required
                  value={form.basePrice}
                  onChange={handleChange('basePrice')}
                />
              </div>

              <div className="form-group">
                <label htmlFor="durationMinutes">Duration (minutes) *</label>
                <input
                  type="number"
                  id="durationMinutes"
                  min="15"
                  step="15"
                  placeholder="120"
                  required
                  value={form.durationMinutes}
                  onChange={handleChange('durationMinutes')}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="serviceDescription">Description</label>
              <textarea
                id="serviceDescription"
                rows="3"
                placeholder="Briefly describe the ritual and its significance..."
                value={form.description}
                onChange={handleChange('description')}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Create Service
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  setForm({
                    name: '',
                    category: '',
                    basePrice: '',
                    durationMinutes: '',
                    description: '',
                  })
                }
              >
                Clear Form
              </button>
            </div>
          </form>
        </div>

        <div className="quick-add-section">
          <h3>Your Active Services</h3>
          <p className="help-text">Tap to quickly add common services</p>
          <div className="quick-add-grid">
            {QUICK_SERVICES.map((service) => (
              <button
                key={`${service.name}-${service.category}`}
                type="button"
                className="quick-add-btn"
                onClick={() => addQuickService(service)}
              >
                {service.name}
              </button>
            ))}
          </div>
        </div>

        <div className="existing-services-section">
          <div className="section-heading">
            <div>
              <h3>Your Active Services</h3>
              <p className="section-subtitle">Manage the services you currently offer.</p>
            </div>
            <button type="button" onClick={loadAllServices} className="btn btn-secondary">
              Refresh List
            </button>
          </div>
          <div className="service-card-grid">
            {loading ? <p className="loading">Loading services...</p> : null}
            {!loading && services.length === 0 ? (
              <p className="no-results">No services found. Add some services above!</p>
            ) : null}
            {!loading && services.length > 0
              ? services.map((service) => (
                  <div className="service-mini-card" key={service.id}>
                    <div className="service-mini-icon">OM</div>
                  <div className="service-mini-info">
                    <h4>{service.name}</h4>
                    <p>Category: {service.category}</p>
                    {service.description ? (
                      <p className="service-desc">{service.description}</p>
                    ) : null}
                    <div className="service-mini-meta">
                      <span>Time {service.duration_minutes} min</span>
                      <span>Rs {service.base_price}</span>
                    </div>
                    <div className="service-upload-row">
                      <label className="upload-label">
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          onChange={(event) =>
                            uploadServiceImage(service.id, event.target.files?.[0])
                          }
                          disabled={uploadingImage}
                        />
                        {uploadingImage ? 'Uploading...' : 'Upload Image'}
                      </label>
                    </div>
                  </div>
                    <button type="button" className="edit-pill" onClick={() => openEditModal(service)}>
                      Edit
                    </button>
                  </div>
                ))
              : null}
          </div>
          {services.length < serviceMeta.total ? (
            <div className="load-more">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const nextSkip = serviceMeta.skip + serviceMeta.limit;
                  loadAllServices(nextSkip);
                }}
              >
                Load More Services
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {editingService ? (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={closeEditModal}>
              &times;
            </span>
            <h3>Edit Service</h3>
            <form onSubmit={updateService}>
              <div className="form-group">
                <label htmlFor="editName">Service Name</label>
                <input
                  id="editName"
                  type="text"
                  value={editForm.name}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="editCategory">Category</label>
                <select
                  id="editCategory"
                  value={editForm.category}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, category: event.target.value }))
                  }
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="editDescription">Description</label>
                <textarea
                  id="editDescription"
                  rows="3"
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="editPrice">Base Price (Rs)</label>
                  <input
                    id="editPrice"
                    type="number"
                    min="0"
                    step="100"
                    value={editForm.basePrice}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, basePrice: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editDuration">Duration (minutes)</label>
                  <input
                    id="editDuration"
                    type="number"
                    min="15"
                    step="15"
                    value={editForm.durationMinutes}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, durationMinutes: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
