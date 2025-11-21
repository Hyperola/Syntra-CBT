import { useState } from 'react';
import { promotionAPI } from '../api/promotion';

const usePromotion = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const promoteStudents = async (studentIds, targetClassId, session, term) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await promotionAPI.promoteStudents(studentIds, targetClassId, session, term);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to promote students';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const rollbackPromotion = async (studentIds, session, term) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await promotionAPI.rollbackPromotion(studentIds, session, term);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to rollback promotion';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    promoteStudents,
    rollbackPromotion,
    loading,
    error
  };
};

export default usePromotion;