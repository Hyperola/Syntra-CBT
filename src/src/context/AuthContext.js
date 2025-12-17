// context/AuthContext.js - COMPLETE FIXED VERSION
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

// Use environment variable or fallback to Render.com URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  // Add token to axios headers if it exists
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Helper function to extract user from response
  const extractUserFromResponse = useCallback((responseData) => {
    console.log('AuthContext - Extracting user from response:', responseData);
    
    if (!responseData) return null;
    
    // Case 1: Response has {success: true, user: {...}} structure
    if (responseData.success && responseData.user) {
      return responseData.user;
    }
    
    // Case 2: Response is already the user object
    if (responseData._id || responseData.id || responseData.username) {
      return responseData;
    }
    
    // Case 3: Response has nested data with user
    if (responseData.data && (responseData.data._id || responseData.data.username)) {
      return responseData.data;
    }
    
    console.warn('AuthContext - Could not extract user from response:', responseData);
    return null;
  }, []);

  // Helper function to check permissions
  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    
    // Ensure we're working with the extracted user object
    const userObj = extractUserFromResponse(user) || user;
    
    // Super admin has all permissions
    if (userObj.role === 'super_admin') return true;
    
    // Check if user has the specific permission
    return userObj.permissions && userObj.permissions.includes(permission);
  }, [user, extractUserFromResponse]);

  const verifyToken = useCallback(async (tokenToVerify, userData = null) => {
    console.log('AuthContext - Verifying token');
    try {
      let responseData;
      
      if (userData) {
        // User data already provided (from refresh or login)
        responseData = { success: true, user: userData };
      } else {
        // Need to fetch user data from API
        const res = await api.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${tokenToVerify}` },
        });
        responseData = res.data;
      }
      
      console.log('AuthContext - Verification response:', responseData);
      
      // Extract user from response
      const extractedUser = extractUserFromResponse(responseData);
      
      if (extractedUser) {
        setUser(extractedUser);
        setToken(tokenToVerify);
        setError(null);
        console.log('AuthContext - User verified:', extractedUser.username, 'Role:', extractedUser.role);
        return true;
      } else {
        throw new Error('Invalid user data in response');
      }
    } catch (err) {
      console.error('AuthContext - Token verification failed:', err.response?.data || err.message);
      setError('Session expired. Please log in again.');
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      return false;
    }
  }, [extractUserFromResponse]);

  const refreshToken = useCallback(async () => {
    try {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) return false;
      
      const decoded = jwtDecode(currentToken);
      const currentTime = Date.now() / 1000;
      
      // Refresh token if it expires in less than 5 minutes
      if (decoded.exp < currentTime + 300) {
        console.log('AuthContext - Refreshing token');
        const res = await api.post('/api/auth/refresh', {}, {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        
        console.log('AuthContext - Refresh response:', res.data);
        
        localStorage.setItem('token', res.data.token);
        
        // Extract user from refresh response if available
        const extractedUser = extractUserFromResponse(res.data);
        
        if (extractedUser) {
          await verifyToken(res.data.token, extractedUser);
        } else {
          await verifyToken(res.data.token);
        }
        
        return true;
      }
      return true;
    } catch (err) {
      console.error('AuthContext - Token refresh failed:', err.response?.data || err.message);
      setError('Session expired. Please log in again.');
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      return false;
    }
  }, [verifyToken, extractUserFromResponse]);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      console.log('AuthContext - Initializing, token:', storedToken ? 'Present' : 'Absent');
      
      if (storedToken) {
        try {
          const decoded = jwtDecode(storedToken);
          const currentTime = Date.now() / 1000;
          
          if (decoded.exp < currentTime) {
            console.log('AuthContext - Token expired, attempting refresh');
            const refreshed = await refreshToken();
            if (!refreshed) {
              setUser(null);
              setLoading(false);
              return;
            }
          } else {
            await verifyToken(storedToken);
          }
        } catch (error) {
          console.error('AuthContext - Initialization error:', error);
          localStorage.removeItem('token');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [verifyToken, refreshToken]);

  const login = async (username, password) => {
    console.log('AuthContext - Login attempt for:', username);
    console.log('AuthContext - Using API URL:', API_BASE_URL);
    
    setLoading(true);
    setError(null);
    
    try {
      // Clear any existing token
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      
      const res = await api.post('/api/auth/login', { 
        username: username.trim(), 
        password 
      }, {
        timeout: 10000, // 10 second timeout
      });
      
      console.log('AuthContext - Login response:', res.data);
      
      if (res.data && res.data.token) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        
        // Extract user from response
        const extractedUser = extractUserFromResponse(res.data);
        
        if (extractedUser) {
          setUser(extractedUser);
          console.log('AuthContext - Login successful for user:', extractedUser.username, 'Role:', extractedUser.role);
          return { success: true, data: res.data, user: extractedUser };
        } else {
          throw new Error('Invalid user data in response');
        }
      } else {
        throw new Error('No token in response');
      }
    } catch (err) {
      console.error('AuthContext - Login failed:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
        config: {
          url: err.config?.url,
          method: err.config?.method
        }
      });
      
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (err.response) {
        // Server responded with error status
        if (err.response.status === 400) {
          errorMessage = err.response.data?.error || 'Invalid username or password';
        } else if (err.response.status === 401) {
          errorMessage = 'Unauthorized access. Please check your credentials.';
        } else if (err.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (err.request) {
        // Request made but no response
        errorMessage = 'No response from server. Please check your connection.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Connection timeout. Please try again.';
      } else if (err.message === 'No token in response') {
        errorMessage = 'Invalid server response. Please contact administrator.';
      }
      
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage,
        details: err.response?.data
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(() => {
    console.log('AuthContext - Logging out');
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get user object (extracted if needed)
  const getCurrentUser = useCallback(() => {
    if (!user) return null;
    return extractUserFromResponse(user) || user;
  }, [user, extractUserFromResponse]);

  const value = {
    user: getCurrentUser(), // Always return extracted user
    rawUser: user, // Original user data (for debugging)
    token,
    login,
    logout,
    loading,
    error,
    clearError,
    refreshToken,
    hasPermission,
    extractUserFromResponse,
    isAuthenticated: !!getCurrentUser(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};