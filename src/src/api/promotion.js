import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export const promotionAPI = {
  // Get classes
  getClasses: () => {
    return axios.get(`${API_BASE_URL}/classes`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
  },

  // Get eligible students
  getEligibleStudents: (classId, session, term) => {
    return axios.get(`${API_BASE_URL}/promotion/${classId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      params: { session, term }
    });
  },

  // Get promotion status
  getPromotionStatus: () => {
    return axios.get(`${API_BASE_URL}/sessions/promotion-status`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      timeout: 10000
    });
  },

  // Promote students (session/term auto-detected)
  promoteStudents: (studentIds, targetClassId) => {
    return axios.post(`${API_BASE_URL}/promotion`, {
      studentIds,
      targetClassId
    }, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
  },

  // Get promotion history
  getPromotionHistory: (type, id, session = null) => {
    return axios.get(`${API_BASE_URL}/promotion/history/${type}/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      params: { session }
    });
  }
};