import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios'; // Make sure this is imported
import { AuthContext } from '../context/AuthContext';

const useTeacherData = () => {
  const { user, refreshToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchWithRetry = async (fetchFunction, maxRetries = 1) => {
    let retries = 0;
    while (retries <= maxRetries) {
      try {
        await fetchFunction();
        return;
      } catch (err) {
        if (err.response?.status === 401 && retries < maxRetries) {
          console.log('Token might be expired, attempting refresh...');
          const refreshed = await refreshToken();
          if (refreshed) {
            retries++;
            continue;
          }
        }
        throw err;
      }
    }
  };

  const fetchTests = async () => {
    setLoading(true);
    setError(null);
    try {
      // CHANGED: Use relative path with api instance
      const res = await api.get('/api/tests');
      console.log('Fetched tests:', res.data);
      const validTests = res.data.filter(test => test._id && /^[0-9a-fA-F]{24}$/.test(test._id));
      setTests(validTests);
      if (res.data.length !== validTests.length) {
        console.warn('Invalid test IDs filtered out');
      }
    } catch (err) {
      console.error('Fetch tests error:', err);
      if (err.response?.status === 403) {
        setError('You do not have permission to view tests. Please contact administrator.');
      } else {
        setError(err.response?.data?.error || 'Failed to load tests. Please try again.');
      }
    }
    setLoading(false);
  };

  const fetchQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      // CHANGED: Use relative path with api instance
      const res = await api.get('/api/questions');
      console.log('Fetched questions:', res.data);
      setQuestions(res.data || []);
    } catch (err) {
      console.error('Fetch questions error:', err);
      if (err.response?.status === 403) {
        setError('You do not have permission to view questions.');
      } else {
        setError(err.response?.data?.error || 'Failed to load questions.');
      }
    }
    setLoading(false);
  };

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      // CHANGED: Use relative path with api instance
      const res = await api.get('/api/results');
      setResults(res.data);
    } catch (err) {
      console.error('Fetch results error:', err);
      if (err.response?.status === 403) {
        setError('You do not have permission to view results.');
      } else {
        setError(err.response?.data?.error || 'Failed to load results.');
      }
    }
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      // CHANGED: Use relative path with api instance
      const res = await api.get('/api/analytics');
      console.log('Fetched analytics:', res.data);
      setAnalytics(Array.isArray(res.data.analytics) ? res.data.analytics : []);
    } catch (err) {
      console.error('Fetch analytics error:', err);
      if (err.response?.status === 403) {
        setError('You do not have permission to view analytics.');
      } else {
        setError(err.response?.data?.error || 'Failed to load analytics.');
      }
      setAnalytics([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && user.role === 'teacher') {
      console.log('Loading teacher data for:', user.username);
      // Use retry mechanism for initial data loading
      fetchWithRetry(async () => {
        await Promise.all([
          fetchTests(),
          fetchQuestions(),
          fetchResults(),
          fetchAnalytics()
        ]);
      });
    } else if (!user) {
      setError('Session expired. Please log in again.');
      navigate('/login');
    }
  }, [user, navigate]);

  return {
    tests,
    questions,
    results,
    analytics,
    loading,
    error,
    success,
    setError,
    setSuccess,
    fetchTests,
    fetchQuestions,
    fetchResults,
    fetchAnalytics,
    user,
    navigate,
  };
};

export default useTeacherData;