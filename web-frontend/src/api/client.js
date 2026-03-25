import { API_BASE_URL } from './config.js';

export function getAuthToken() {
  return localStorage.getItem('token');
}

export function getUserType() {
  return localStorage.getItem('user_type');
}

export function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function buildHeaders(useAuth, data) {
  const headers = {
    ...(useAuth ? getAuthHeaders() : {}),
  };

  if (data && !(data instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

export async function apiGet(endpoint, useAuth = false) {
  const headers = {
    'Content-Type': 'application/json',
    ...(useAuth ? getAuthHeaders() : {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`API GET failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return null;
}

export async function apiPost(endpoint, data, useAuth = false) {
  const headers = buildHeaders(useAuth, data);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: data instanceof FormData ? data : JSON.stringify(data),
  });

  if (!response.ok) {
    let message = 'API request failed';
    try {
      const error = await response.json();
      message = error.detail || message;
    } catch {
      // ignore JSON parsing errors
    }
    throw new Error(message);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return null;
}

export async function apiPut(endpoint, data, useAuth = false) {
  const headers = buildHeaders(useAuth, data);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers,
    body: data === undefined ? undefined : data instanceof FormData ? data : JSON.stringify(data),
  });

  if (!response.ok) {
    let message = 'API request failed';
    try {
      const error = await response.json();
      message = error.detail || message;
    } catch {
      // ignore JSON parsing errors
    }
    throw new Error(message);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return null;
}

export async function apiDelete(endpoint, useAuth = false) {
  const headers = buildHeaders(useAuth);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    let message = 'API request failed';
    try {
      const error = await response.json();
      message = error.detail || message;
    } catch {
      // ignore JSON parsing errors
    }
    throw new Error(message);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return null;
}
