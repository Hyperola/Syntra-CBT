import api from './axios';

export const transcriptAPI = {
  getTranscript: (studentId) => api.get(`/api/transcript/${studentId}`)
};