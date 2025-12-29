import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const promotionAPI = {
  // Get classes
  getClasses: () => {
    return api.get('/classes');
  },

  // Get promotion status
  getPromotionStatus: () => {
    return api.get('/sessions/promotion-status');
  },

  // Get session eligibility (FIXED PATH: /promotions/ not /promotion/)
  getSessionEligibility: (classId, session) => {
    return api.get(`/promotions/session-eligibility/${classId}`, {
      params: { session }
    });
  },

  // Bulk promote students
  promoteStudents: (studentIds, targetClassId, session, term = 'Third Term') => {
    return api.post('/promotions/bulk-promote', {
      studentIds,
      targetClassId,
      session,
      term
    });
  },

  // Get promotion history
  getPromotionHistory: (type, id, session = null) => {
    return api.get(`/promotions/history/${type}/${id}`, {
      params: session ? { session } : {}
    });
  },

  // Get current session info
  getCurrentSessionInfo: () => {
    return api.get('/sessions/current');
  }
};