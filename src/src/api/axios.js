import axios from 'axios';
import API_BASE_URL from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('API Request with token to:', config.url);
    } else {
      console.warn('API Request without token to:', config.url);
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response success:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('API Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.error || error.message
    });
    
    if (error.response?.status === 401) {
      console.log('Authentication failed, redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      console.log('Access forbidden - insufficient permissions');
      error.message = 'Access denied. You do not have permission to access this resource.';
    } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
      console.log('Network error detected');
      error.message = 'Network error. Please check your internet connection.';
    }
    
    return Promise.reject(error);
  }
);

export default api;