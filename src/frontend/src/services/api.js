/**
 * services/api.js
 * Instancia de Axios con interceptores para adjuntar JWT automáticamente
 * y renovar el token cuando el servidor devuelve 401 TOKEN_EXPIRED.
 */

import axios from 'axios';

const BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Interceptor de request: adjunta el access token en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Interceptor de response: maneja token expirado (refresh automático)
let isRefreshing    = false;
let pendingRequests = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !original._retry
    ) {
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          pendingRequests.forEach((resolve) => resolve(data.accessToken));
          pendingRequests = [];
        } catch {
          // Refresh falló — limpiar sesión
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(error);
        } finally {
          isRefreshing = false;
        }
      }

      // Encolar la petición hasta que el refresh termine
      return new Promise((resolve) => {
        pendingRequests.push((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(original));
        });
      });
    }

    return Promise.reject(error);
  }
);

// ─── Helpers por recurso ─────────────────────────────────────────────────────

export const authApi = {
  register:  (data)         => api.post('/auth/register', data),
  login:     (credentials)  => api.post('/auth/login', credentials),
  refresh:   (token)        => api.post('/auth/refresh', { refreshToken: token }),
  logout:    (refreshToken) => api.post('/auth/logout', { refreshToken }),
};

export const patientApi = {
  list:       ()        => api.get('/patients'),
  me:         ()        => api.get('/patients/me'),
  getById:    (id)      => api.get(`/patients/${id}`),
  update:     (id, d)   => api.put(`/patients/${id}`, d),
  deactivate: (id)      => api.delete(`/patients/${id}`),
};

export const appointmentApi = {
  getSlots: (params) => api.get('/appointments/slots', { params }),
  mine:     ()       => api.get('/appointments/mine'),
  book:     (data)   => api.post('/appointments', data),
  cancel:   (id)     => api.delete(`/appointments/${id}`),
};

export const recordApi = {
  create:         (data)      => api.post('/records', data),
  getByPatient:   (patientId) => api.get(`/records/patient/${patientId}`),
  getBySlot:      (slotId)    => api.get(`/records/slot/${slotId}`),
};

export const reportApi = {
  patients: ()       => api.get('/reports/patients'),
  calendar: (params) => api.get('/reports/calendar', { params }),
};

export const notificationApi = {
  getUnread: () => api.get('/notifications'),
  markRead:  () => api.patch('/notifications/read'),
};

export default api;
