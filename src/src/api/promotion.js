import api from './axios';

export const promotionAPI = {
  // Get classes
  getClasses: () => api.get('/api/classes'),
  
  // Get eligible students - using the basic route that exists
  getEligibleStudents: (classId, session, term) => 
    api.get(`/api/promotion/${classId}?session=${session}&term=${term}`),
  
  // Enhanced eligibility check
  checkEligibility: (classId, session, term) =>
    api.get(`/api/promotion/check-eligibility/${classId}?session=${session}&term=${term}`),
  
  // Test route for debugging
  testPromotion: (classId) => 
    api.get(`/api/promotion/test/${classId}`),
  
  // Promote students
  promoteStudents: (studentIds, targetClassId, session, term) =>
    api.post('/api/promotion', {
      studentIds,
      targetClassId,
      session,
      term
    }),
  
  // Optional: Rollback promotion
  rollbackPromotion: (studentIds, session, term) =>
    api.post('/api/promotion/rollback', {
      studentIds,
      session,
      term
    })
};