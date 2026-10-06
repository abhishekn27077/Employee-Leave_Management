import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('leavetrack_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('leavetrack_token');
        localStorage.removeItem('leavetrack_user');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const extractErrorMessage = (error) => {
  if (error.response && error.response.data) {
    if (error.response.data.conflicts && Array.isArray(error.response.data.conflicts) && error.response.data.conflicts.length > 0) {
      return error.response.data.conflicts.map((c) => `[${c.type}]: ${c.message}`).join(' \n• ');
    }
    if (error.response.data.message) {
      return error.response.data.message;
    }
    if (error.response.data.error) {
      return error.response.data.error;
    }
  }
  if (error.code === 'ERR_NETWORK') {
    return 'Unable to connect to backend server at http://localhost:8080. Please ensure Spring Boot is running.';
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
};

export const departmentApi = {
  getAll: () => api.get('/departments'),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

export const employeeApi = {
  getAll: () => api.get('/employees'),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
};

export const leaveTypeApi = {
  getAll: () => api.get('/leave-types'),
  getById: (id) => api.get(`/leave-types/${id}`),
  create: (data) => api.post('/leave-types', data),
  update: (id, data) => api.put(`/leave-types/${id}`, data),
  delete: (id) => api.delete(`/leave-types/${id}`),
};

export const leaveApi = {
  getAll: (params) => api.get('/leaves', { params }),
  getById: (id) => api.get(`/leaves/${id}`),
  getByEmployee: (employeeId) => api.get(`/leaves/employee/${employeeId}`),
  getMyLeaves: (params) => api.get('/leaves', { params }),
  apply: (data) => api.post('/leaves', data),
  approve: (id) => api.put(`/leaves/${id}/approve`),
  reject: (id) => api.put(`/leaves/${id}/reject`),
  cancel: (id) => api.put(`/leaves/${id}/cancel`),
  checkConflicts: (id, minAvailabilityThreshold) =>
    api.get(`/leaves/${id}/conflicts`, {
      params: minAvailabilityThreshold ? { minAvailabilityThreshold } : {},
    }),
  evaluateConflicts: (data, minAvailabilityThreshold) =>
    api.post('/leaves/evaluate-conflicts', data, {
      params: minAvailabilityThreshold ? { minAvailabilityThreshold } : {},
    }),
};

export const leavePolicyApi = {
  getAll: () => api.get('/leave-policies'),
  getById: (id) => api.get(`/leave-policies/${id}`),
  create: (data) => api.post('/leave-policies', data),
  update: (id, data) => api.put(`/leave-policies/${id}`, data),
  delete: (id) => api.delete(`/leave-policies/${id}`),
};

export const leaveBalanceApi = {
  getAll: (params) => api.get('/leave-balances', { params }),
  getById: (id) => api.get(`/leave-balances/${id}`),
  getByEmployee: (employeeId) => api.get(`/leave-balances/employee/${employeeId}`),
  getMyBalances: () => api.get('/leave-balances'),
  create: (data) => api.post('/leave-balances', data),
};

export const holidayApi = {
  getAll: () => api.get('/holidays'),
  getById: (id) => api.get(`/holidays/${id}`),
  create: (data) => api.post('/holidays', data),
  update: (id, data) => api.put(`/holidays/${id}`, data),
  delete: (id) => api.delete(`/holidays/${id}`),
  getRange: (start, end) => api.get('/holidays/range', { params: { start, end } }),
};

export const availabilityApi = {
  getDepartmentAvailability: (departmentId, date) =>
    api.get('/availability', { params: { departmentId, date } }),
  getByDepartment: (departmentId, date) =>
    api.get('/availability', { params: { departmentId, date } }),
};

export const leaveAdjustmentApi = {
  getAll: () => api.get('/leave-adjustments'),
  getById: (id) => api.get(`/leave-adjustments/${id}`),
  getByEmployee: (employeeId) => api.get(`/leave-adjustments/employee/${employeeId}`),
  create: (data) => api.post('/leave-adjustments', data),
};

export const auditHistoryApi = {
  getAll: (params) => api.get('/audit-history', { params }),
  getById: (id) => api.get(`/audit-history/${id}`),
};

export const dashboardApi = {
  getOverview: (date) => api.get('/dashboard/overview', { params: date ? { date } : {} }),
};

export default api;

