// hooks/useTeacherData.js - FINAL FIXED VERSION
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
      return testsData;
      
    } catch (err) {
      console.error('❌ Fetch tests error:', err);
      setTests([]);
      return [];
    }
  };

  // Fetch teacher's analytics - IMPROVED VERSION
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
      
      // First, always fetch tests and results to have fallback data ready
      const [testsData, resultsData] = await Promise.all([
        fetchTests(),
        fetchResults()
      ]);
      
      // Try the real analytics endpoint
      try {
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
              class: className,
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
          return;
          
        } else {
          throw new Error(res.data?.error || 'Failed to fetch analytics');
        }
        
      } catch (apiError) {
        console.error('❌ ANALYTICS API ERROR:', {
          message: apiError.message,
          response: apiError.response?.data,
          status: apiError.response?.status,
        });
        
        // If we have API error, use fallback from tests and results
        console.log('🔄 Using fallback: Creating analytics from tests and results...');
        
        if (testsData.length > 0) {
          const fallbackAnalytics = testsData.map(test => {
            // Find results for this test
            const testResults = resultsData.filter(r => {
              if (!r.testId) return false;
              const testId = r.testId._id ? r.testId._id.toString() : r.testId.toString();
              const currentTestId = test._id ? test._id.toString() : test.testId;
              return testId === currentTestId;
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
            
            // Get class name from className field if available
            if (test.className && typeof test.className === 'string') {
              className = test.className;
            }
            
            return {
              testId: test._id || test.testId,
              testTitle: test.title || 'Untitled Test',
              subject: test.subject || 'Unknown Subject',
              class: className,
              className: className,
              averageScore: parseFloat(averageScorePercent.toFixed(2)),
              completionRate: testResults.length > 0 ? 100 : 0,
              totalStudents: testResults.length,
              completedStudents: testResults.length,
              topStudent: testResults.length > 0 ? 
                (testResults.sort((a, b) => (b.score || 0) - (a.score || 0))[0]?.studentName || 'N/A') : 'N/A',
              createdAt: test.createdAt || new Date(),
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
          
          console.log('null', {
            count: validAnalytics.length,
            sample: validAnalytics[0]
          });
          
          setAnalytics(validAnalytics);
          setAnalyticsSummary({
            overallAverageScore: validAnalytics.length > 0 ? 
              parseFloat((validAnalytics.reduce((sum, a) => sum + a.averageScore, 0) / validAnalytics.length).toFixed(2)) : 0,
            totalStudents: validAnalytics.reduce((sum, a) => sum + a.totalStudents, 0),
            totalTests: validAnalytics.length,
            passRate: validAnalytics.length > 0 ? 
              parseFloat(((validAnalytics.filter(a => a.averageScore >= 50).length / validAnalytics.length) * 100).toFixed(2)) : 0
          });
          setError(null);

          setLastUpdated(new Date());
        } else {
          setAnalytics([]);
          setAnalyticsSummary(null);
          setSuccess('No test data available for analytics');
        }
      }
      
    } catch (err) {
      console.error('❌ FETCH ANALYTICS ERROR:', err.message);
      
      // Set user-friendly error message
      setError('Unable to load analytics. Showing available test data instead.');
      
      // Set empty data but don't navigate away
      setAnalytics([]);
      setAnalyticsSummary(null);
      
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
            timeSpent: result.timeSpent || 0,
            studentName: result.studentName || result.student?.name || 'Unknown Student',
            testId: result.testId || result.test?._id
          }))
        : [];
      
      logDebug('Results fetched', { count: resultsData.length });
      setResults(resultsData);
      return resultsData;
      
    } catch (err) {
      console.error('❌ Fetch results error:', err);
      setResults([]);
      return [];
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
      return questionsData;
      
    } catch (err) {
      console.error('❌ Fetch questions error:', err);
      setQuestions([]);
      return [];
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
      return assignmentsData;
      
    } catch (err) {
      console.error('❌ Fetch assignments error:', err);
      setAssignments([]);
      return [];
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
      
      // Fetch all data in parallel
      await Promise.allSettled([
        fetchTests(),
        fetchQuestions(),
        fetchResults(),
        fetchAssignments(),
        fetchAnalytics(forceRefresh)
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
      
      // Don't show error if analytics failed but other data loaded
      if (err.message && !err.message.includes('analytics')) {
        setError('Some data failed to load. Please try refreshing.');
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