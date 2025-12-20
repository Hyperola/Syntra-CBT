// hooks/useTeacherData.js - COMPLETELY FIXED VERSION
import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const useTeacherData = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // State variables
  const [tests, setTests] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Debug logging function
  const logDebug = (title, data) => {
    console.log(`🔍 ${title}:`, data);
  };

  // Fetch teacher's tests
  const fetchTests = async () => {
    try {
      logDebug('Fetching teacher tests', { teacherId: user?.id });
      const res = await api.get('/api/tests');
      
      let testsData = [];
      if (res.data && res.data.tests) testsData = res.data.tests;
      else if (res.data && res.data.data) testsData = res.data.data;
      else if (Array.isArray(res.data)) testsData = res.data;
      
      testsData = Array.isArray(testsData) 
        ? testsData.filter(test => test && test._id) 
        : [];
      
      logDebug('Tests fetched', { count: testsData.length });
      setTests(testsData);
      
    } catch (err) {
      console.error('❌ Fetch tests error:', err);
      setTests([]);
    }
  };

  // Fetch teacher's analytics - COMPLETELY FIXED VERSION
  const fetchAnalytics = async (useMockData = false) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      logDebug('Fetching teacher analytics', { 
        teacherId: user?.id,
        username: user?.username,
        useMockData 
      });
      
      // If mock data requested or development mode, try mock endpoint first
      if (useMockData) {
        try {
          const mockRes = await api.get('/api/analytics/test');
          if (mockRes.data && mockRes.data.success) {
            logDebug('Mock analytics fetched', { 
              count: mockRes.data.analytics?.length || 0 
            });
            
            // Process mock data
            const mockAnalytics = mockRes.data.analytics || [];
            const mockSummary = mockRes.data.summary || null;
            
            setAnalytics(mockAnalytics);
            setAnalyticsSummary(mockSummary);
            setLastUpdated(new Date());
            setSuccess('Mock analytics data loaded');
            
            console.log('📊 MOCK ANALYTICS DATA:', {
              analyticsCount: mockAnalytics.length,
              summary: mockSummary,
              sample: mockAnalytics[0]
            });
            
            return;
          }
        } catch (mockErr) {
          console.log('Mock analytics endpoint not available, using real data');
        }
      }
      
      // Try the real analytics endpoint
      const res = await api.get('/api/analytics/teacher');
      
      console.log('📊 ANALYTICS API RAW RESPONSE:', res.data);
      
      if (res.data && res.data.success) {
        // Handle different response structures
        let analyticsData = [];
        let summaryData = null;
        
        // STRUCTURE 1: Direct analytics and summary (most common)
        if (res.data.analytics && Array.isArray(res.data.analytics)) {
          analyticsData = res.data.analytics;
          summaryData = res.data.summary || null;
          console.log('✅ Using Structure 1: Direct analytics array');
        }
        // STRUCTURE 2: Wrapped in data object
        else if (res.data.data && res.data.data.analytics && Array.isArray(res.data.data.analytics)) {
          analyticsData = res.data.data.analytics;
          summaryData = res.data.data.summary || null;
          console.log('✅ Using Structure 2: Wrapped in data object');
        }
        // STRUCTURE 3: Just analytics array
        else if (Array.isArray(res.data)) {
          analyticsData = res.data;
          console.log('✅ Using Structure 3: Direct array response');
        }
        // STRUCTURE 4: Data is the analytics array
        else if (res.data.data && Array.isArray(res.data.data)) {
          analyticsData = res.data.data;
          console.log('✅ Using Structure 4: Data is array');
        }
        else {
          console.log('⚠️ Unknown response structure:', res.data);
          throw new Error('Unknown analytics response structure');
        }
        
        // Process analytics data to ensure consistent format
        const processedAnalytics = analyticsData.map(item => {
          // Get class name - handle all possible formats
          let className = 'Unknown Class';
          
          if (item.class) {
            if (typeof item.class === 'object') {
              // Class is an object with name property
              className = item.class.name || item.class.shortName || item.class.level || 'Unknown Class';
            } else if (typeof item.class === 'string') {
              // Check if it looks like an ObjectId
              const isObjectId = /^[0-9a-fA-F]{24}$/.test(item.class);
              if (isObjectId) {
                // It's an ObjectId, use className if available
                className = item.className || 'Unknown Class';
              } else {
                // It's already a class name string
                className = item.class;
              }
            }
          }
          
          // Get class name from className field if available
          if (item.className && typeof item.className === 'string') {
            className = item.className;
          }
          
          // Calculate average score percentage
          let averageScore = 0;
          if (item.averageScore !== undefined) {
            averageScore = parseFloat(item.averageScore);
            // If score seems to be out of total marks, convert to percentage
            if (averageScore > 0 && averageScore <= (item.totalMarks || 100)) {
              const totalMarks = item.totalMarks || 100;
              averageScore = (averageScore / totalMarks) * 100;
            }
          }
          
          // Ensure averageScore is a reasonable percentage
          if (isNaN(averageScore) || averageScore < 0) averageScore = 0;
          if (averageScore > 100) averageScore = 100;
          
          return {
            testId: item.testId || item._id || `test-${Math.random()}`,
            testTitle: item.testTitle || item.title || 'Untitled Test',
            subject: item.subject || 'Unknown Subject',
            class: className, // This will show "JSS 1" not ObjectId
            className: className,
            averageScore: parseFloat(averageScore.toFixed(2)),
            completionRate: parseFloat((item.completionRate || 0).toFixed(2)),
            totalStudents: item.totalStudents || 0,
            completedStudents: item.completedStudents || 0,
            topStudent: item.topStudent || 'N/A',
            createdAt: item.createdAt || new Date(),
            updatedAt: item.updatedAt || item.createdAt,
            session: item.session || 'Unknown',
            term: item.term || 'Unknown',
            status: item.status || 'unknown',
            totalMarks: item.totalMarks || 100,
            passingMarks: item.passingMarks || 50,
            hasResults: item.totalStudents > 0
          };
        });
        
        // Filter out tests with no data if needed
        const filteredAnalytics = processedAnalytics.filter(test => 
          test.totalStudents > 0 || test.averageScore > 0
        );
        
        console.log('📊 PROCESSED ANALYTICS:', {
          rawCount: analyticsData.length,
          processedCount: filteredAnalytics.length,
          summary: summaryData,
          sample: filteredAnalytics[0],
          allScores: filteredAnalytics.map(a => a.averageScore),
          allClasses: filteredAnalytics.map(a => a.class)
        });
        
        setAnalytics(filteredAnalytics);
        setAnalyticsSummary(summaryData);
        setLastUpdated(new Date());
        setSuccess(`Analytics data loaded: ${filteredAnalytics.length} tests found`);
        
      } else {
        throw new Error(res.data?.error || 'Failed to fetch analytics');
      }
      
    } catch (err) {
      console.error('❌ FETCH ANALYTICS ERROR:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        url: err.config?.url
      });
      
      // Set user-friendly error messages
      if (err.response?.status === 403) {
        setError('You do not have permission to view analytics');
      } else if (err.response?.status === 404) {
        setError('Analytics endpoint not found. Please check if the server route is configured.');
      } else if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        navigate('/login');
      } else if (err.message.includes('Network Error')) {
        setError('Cannot connect to server. Please check your internet connection.');
      } else {
        setError(`Failed to load analytics: ${err.message}`);
      }
      
      // Set empty data
      setAnalytics([]);
      setAnalyticsSummary(null);
      
      // Try fallback: create analytics from tests and results
      try {
        console.log('🔄 Trying fallback: Creating analytics from tests and results...');
        
        // Fetch tests and results in parallel
        const [testsRes, resultsRes] = await Promise.all([
          api.get('/api/tests'),
          api.get('/api/results/teacher').catch(() => ({ data: { results: [] } }))
        ]);
        
        const testsData = testsRes.data?.tests || testsRes.data?.data || [];
        const resultsData = resultsRes.data?.results || resultsRes.data?.data || [];
        
        console.log('📊 Fallback data:', {
          testsCount: testsData.length,
          resultsCount: resultsData.length
        });
        
        if (Array.isArray(testsData) && testsData.length > 0) {
          const fallbackAnalytics = testsData.map(test => {
            // Find results for this test
            const testResults = resultsData.filter(r => {
              if (!r.testId) return false;
              const testId = r.testId._id ? r.testId._id.toString() : r.testId.toString();
              return testId === test._id.toString();
            });
            
            // Calculate average score
            const scores = testResults.map(r => r.score || 0);
            const averageScore = scores.length > 0 
              ? scores.reduce((a, b) => a + b, 0) / scores.length 
              : 0;
            
            // Convert to percentage if needed
            let averageScorePercent = averageScore;
            if (averageScore > 0 && averageScore <= (test.totalMarks || 100)) {
              const totalMarks = test.totalMarks || 100;
              averageScorePercent = (averageScore / totalMarks) * 100;
            }
            
            // Get class name
            let className = 'Unknown Class';
            if (test.class) {
              if (typeof test.class === 'object') {
                className = test.class.name || test.class.shortName || test.class.level || 'Unknown Class';
              } else if (typeof test.class === 'string') {
                className = test.class;
              }
            }
            
            return {
              testId: test._id,
              testTitle: test.title || 'Untitled Test',
              subject: test.subject || 'Unknown Subject',
              class: className,
              className: className,
              averageScore: parseFloat(averageScorePercent.toFixed(2)),
              completionRate: testResults.length > 0 ? 100 : 0,
              totalStudents: testResults.length,
              completedStudents: testResults.length,
              topStudent: 'N/A',
              createdAt: test.createdAt,
              session: test.session || 'Unknown',
              term: test.term || 'Unknown',
              status: test.status || 'unknown',
              totalMarks: test.totalMarks || 100,
              passingMarks: test.passingMarks || 50,
              hasResults: testResults.length > 0
            };
          });
          
          // Only keep tests with results
          const validAnalytics = fallbackAnalytics.filter(a => a.totalStudents > 0);
          
          console.log('✅ Fallback analytics created:', {
            count: validAnalytics.length,
            sample: validAnalytics[0]
          });
          
          setAnalytics(validAnalytics);
          setError(null);
          setSuccess(`Fallback analytics created from ${validAnalytics.length} tests`);
        }
      } catch (fallbackErr) {
        console.log('❌ Fallback also failed:', fallbackErr.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch teacher's results
  const fetchResults = async () => {
    try {
      logDebug('Fetching teacher results', {});
      
      // Try teacher-specific endpoint
      const res = await api.get('/api/results/teacher');
      
      let resultsData = [];
      if (res.data && res.data.results) resultsData = res.data.results;
      else if (res.data && res.data.data) resultsData = res.data.data;
      else if (Array.isArray(res.data)) resultsData = res.data;
      
      resultsData = Array.isArray(resultsData) 
        ? resultsData.map(result => ({
            ...result,
            score: result.score || 0,
            percentage: result.percentage || 0,
            timeSpent: result.timeSpent || 0
          }))
        : [];
      
      logDebug('Results fetched', { count: resultsData.length });
      setResults(resultsData);
      
    } catch (err) {
      console.error('❌ Fetch results error:', err);
      setResults([]);
    }
  };

  // Fetch teacher's questions
  const fetchQuestions = async () => {
    try {
      logDebug('Fetching teacher questions', {});
      const res = await api.get('/api/teacher/questions');
      
      let questionsData = [];
      if (res.data && res.data.questions) questionsData = res.data.questions;
      else if (res.data && res.data.data) questionsData = res.data.data;
      else if (Array.isArray(res.data)) questionsData = res.data;
      
      questionsData = Array.isArray(questionsData) ? questionsData : [];
      logDebug('Questions fetched', { count: questionsData.length });
      setQuestions(questionsData);
      
    } catch (err) {
      console.error('❌ Fetch questions error:', err);
      setQuestions([]);
    }
  };

  // Fetch teacher's assignments
  const fetchAssignments = async () => {
    try {
      logDebug('Fetching teacher assignments', { teacherId: user?.id });
      const res = await api.get(`/api/users/teachers/${user?.id}/assignments`);
      
      let assignmentsData = [];
      if (res.data && res.data.assignments) assignmentsData = res.data.assignments;
      else if (res.data && res.data.data) assignmentsData = res.data.data;
      
      assignmentsData = Array.isArray(assignmentsData) ? assignmentsData : [];
      logDebug('Assignments fetched', { count: assignmentsData.length });
      setAssignments(assignmentsData);
      
    } catch (err) {
      console.error('❌ Fetch assignments error:', err);
      setAssignments([]);
    }
  };

  // Fetch all data for teacher
  const fetchAllData = async (forceRefresh = false) => {
    if (!user || user.role !== 'teacher') {
      if (!user) {
        setError('Please log in to access this page.');
        navigate('/login');
      }
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      logDebug('Loading all teacher data for', { username: user.username });
      
      // Fetch all data in parallel but handle analytics specially
      await Promise.allSettled([
        fetchTests(),
        fetchQuestions(),
        fetchResults(),
        fetchAssignments(),
        fetchAnalytics(forceRefresh) // This handles its own loading state
      ]);
      
      logDebug('All data loaded', {
        tests: tests.length,
        questions: questions.length,
        results: results.length,
        analytics: analytics.length,
        assignments: assignments.length
      });
      
    } catch (err) {
      console.error('❌ Error in fetchAllData:', err);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        navigate('/login');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to access this data.');
      } else {
        setError('Failed to load data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Initialize data fetching
  useEffect(() => {
    if (user && user.role === 'teacher') {
      fetchAllData();
    }
  }, [user?.id]);

  // Function to refetch all data
  const refetchAll = async () => {
    logDebug('Refetching all data', {});
    await fetchAllData(true);
  };

  // Function to manually fetch analytics
  const refreshAnalytics = async () => {
    await fetchAnalytics(true);
  };

  return {
    // Data
    tests,
    questions,
    results,
    analytics,
    analyticsSummary,
    assignments,
    
    // State
    loading,
    error,
    success,
    lastUpdated,
    
    // Setters
    setError,
    setSuccess,
    
    // Fetch functions
    fetchTests,
    fetchQuestions,
    fetchResults,
    fetchAnalytics,
    fetchAssignments,
    
    // Special functions
    fetchAllData,
    refetchAll,
    refreshAnalytics,
    
    // User info
    user,
    navigate,
  };
};

export default useTeacherData;