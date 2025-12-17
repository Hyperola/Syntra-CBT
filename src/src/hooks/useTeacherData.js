import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const useTeacherData = () => {
  const { user, refreshToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch teacher's tests
  const fetchTests = async () => {
    try {
      const res = await api.get('/api/tests');
      console.log('Fetched tests:', res.data);
      
      // Handle different response formats
      let testsData = res.data || [];
      if (res.data && res.data.tests) testsData = res.data.tests;
      if (res.data && res.data.data) testsData = res.data.data;
      
      // Ensure it's an array
      const validTests = Array.isArray(testsData) 
        ? testsData.filter(test => test && test._id) 
        : [];
      
      setTests(validTests);
      
      if (validTests.length === 0) {
        console.log('No tests found for this teacher');
      }
    } catch (err) {
      console.error('Fetch tests error:', err);
      // Don't set error for tests if it's a permission issue
      if (err.response?.status === 403) {
        console.log('Teacher does not have permission to view all tests');
        // Try teacher-specific tests endpoint
        try {
          const teacherRes = await api.get(`/api/tests/teacher/${user?.id}`);
          const teacherTests = teacherRes.data.tests || teacherRes.data || [];
          setTests(Array.isArray(teacherTests) ? teacherTests : []);
        } catch (teacherErr) {
          console.log('No teacher-specific tests endpoint');
          setTests([]);
        }
      } else {
        setTests([]);
      }
    }
  };

  // Fetch teacher's questions - UPDATED VERSION
  const fetchQuestions = async () => {
    try {
      console.log('📚 Fetching teacher questions...');
      
      // Try teacher-specific endpoint first
      try {
        const res = await api.get('/api/teacher/questions');
        console.log('✅ Teacher questions response:', res.data);
        
        if (res.data.success && res.data.questions) {
          setQuestions(res.data.questions || []);
          console.log(`✅ Loaded ${res.data.questions.length} questions for teacher`);
          return;
        }
      } catch (teacherErr) {
        console.log('⚠️ Teacher questions endpoint not available:', teacherErr.message);
      }
      
      // Fallback to general endpoint (for admins)
      const res = await api.get('/api/questions');
      console.log('📋 General questions response:', res.data);
      
      // Handle different response formats
      let questionsData = res.data || [];
      if (res.data && res.data.questions) questionsData = res.data.questions;
      if (res.data && res.data.data) questionsData = res.data.data;
      
      setQuestions(Array.isArray(questionsData) ? questionsData : []);
      
    } catch (err) {
      console.error('❌ Fetch questions error:', err);
      setQuestions([]);
      
      if (err.response?.status === 403) {
        console.log('⚠️ Teacher does not have permission to view general questions');
      }
    }
  };

  // Fetch teacher's results
  const fetchResults = async () => {
    try {
      // Use the new teacher-specific endpoint
      const res = await api.get('/api/results/teacher');
      console.log('Fetched teacher results:', res.data);
      
      // Handle different response formats
      let resultsData = res.data || [];
      if (res.data && res.data.results) resultsData = res.data.results;
      if (res.data && res.data.data) resultsData = res.data.data;
      
      setResults(Array.isArray(resultsData) ? resultsData : []);
    } catch (err) {
      console.error('Fetch results error:', err);
      if (err.response?.status === 403) {
        console.log('Teacher does not have permission to view results');
        setResults([]);
      } else if (err.response?.status === 404) {
        console.log('Teacher results endpoint not found');
        setResults([]);
      } else {
        setResults([]);
      }
    }
  };

  // Fetch teacher's analytics
  const fetchAnalytics = async () => {
    try {
      // Use the new teacher-specific analytics endpoint
      const res = await api.get('/api/analytics/teacher');
      console.log('Fetched teacher analytics:', res.data);
      
      // Handle different response formats
      let analyticsData = res.data || [];
      if (res.data && res.data.analytics) analyticsData = res.data.analytics;
      if (res.data && res.data.data) analyticsData = res.data.data;
      
      setAnalytics(Array.isArray(analyticsData) ? analyticsData : []);
    } catch (err) {
      console.error('Fetch analytics error:', err);
      if (err.response?.status === 403 || err.response?.status === 404) {
        console.log('Teacher analytics endpoint not available');
        // Try general analytics
        try {
          const generalRes = await api.get('/api/analytics');
          let generalData = generalRes.data || [];
          if (generalRes.data && generalRes.data.analytics) generalData = generalRes.data.analytics;
          if (generalRes.data && generalRes.data.data) generalData = generalRes.data.data;
          
          setAnalytics(Array.isArray(generalData) ? generalData : []);
        } catch (generalErr) {
          console.log('Analytics not available for teacher');
          setAnalytics([]);
        }
      } else {
        setAnalytics([]);
      }
    }
  };

  // Fetch teacher's assignments
  const fetchAssignments = async () => {
    try {
      // Use the new endpoint
      const res = await api.get(`/api/users/teachers/${user?.id}/assignments`);
      console.log('Fetched teacher assignments:', res.data);
      
      // Handle the response format
      if (res.data && res.data.success && res.data.assignments) {
        setAssignments(res.data.assignments);
      } else {
        setAssignments([]);
      }
    } catch (err) {
      console.error('Error fetching teacher assignments:', err);
      // Don't set error, just log it
      setAssignments([]);
    }
  };

  // Fetch teacher's classes
  const fetchTeacherClasses = async () => {
    try {
      const res = await api.get(`/api/users/teachers/${user?.id}/classes`);
      console.log('Fetched teacher classes:', res.data);
      return res.data;
    } catch (err) {
      console.error('Error fetching teacher classes:', err);
      return { success: false, classes: [] };
    }
  };

  // Fetch teacher's schedule
  const fetchTeacherSchedule = async () => {
    try {
      const res = await api.get('/api/teacher/schedule');
      console.log('Fetched teacher schedule:', res.data);
      return res.data;
    } catch (err) {
      console.error('Error fetching teacher schedule:', err);
      return { success: false, schedule: [] };
    }
  };

  // Fetch all data for teacher
  const fetchAllData = async () => {
    if (!user || user.role !== 'teacher') {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Loading teacher data for:', user.username);
      
      // Fetch data in parallel
      await Promise.all([
        fetchTests(),
        fetchQuestions(),
        fetchResults(),
        fetchAnalytics(),
        fetchAssignments()
      ]);
      
    } catch (err) {
      console.error('Error fetching teacher data:', err);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        navigate('/login');
      } else {
        // Don't show error for missing endpoints
        console.log('Some endpoints may not be implemented yet');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'teacher') {
      fetchAllData();
    } else if (!user) {
      setError('Please log in to access this page.');
      navigate('/login');
    }
  }, [user, navigate]);

  // Function to refetch all data
  const refetchAll = async () => {
    await fetchAllData();
  };

  return {
    tests,
    questions,
    results,
    analytics,
    assignments,
    loading,
    error,
    success,
    setError,
    setSuccess,
    fetchTests,
    fetchQuestions,
    fetchResults,
    fetchAnalytics,
    fetchAssignments,
    fetchTeacherClasses,
    fetchTeacherSchedule,
    refetchAll,
    user,
    navigate,
  };
};

export default useTeacherData;