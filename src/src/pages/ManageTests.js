import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  FiAlertTriangle, FiCheckCircle, FiEye, FiCalendar, FiBarChart, 
  FiSearch, FiTrash2, FiClock, FiUsers, FiEdit, FiCheck, FiX, 
  FiRefreshCw, FiCheckSquare, FiChevronDown, FiChevronUp, 
  FiUser, FiList, FiFileText, FiSend, FiArchive, FiExternalLink,
  FiBookOpen, FiFilter, FiUpload
} from 'react-icons/fi';

const ManageTests = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [tests, setTests] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(location.state?.success || null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterSession, setFilterSession] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [classes, setClasses] = useState([]);
  const [approvingId, setApprovingId] = useState(null);
  const [expandedTestId, setExpandedTestId] = useState(null);
  const [batchDetails, setBatchDetails] = useState({});
  const [loadingBatches, setLoadingBatches] = useState({});
  const [testStatuses, setTestStatuses] = useState({});
  const [submissionStats, setSubmissionStats] = useState({}); // NEW: Store submission stats
  
  // Get current academic year and term for default filtering
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const getCurrentSession = () => `${currentYear}/${currentYear + 1}`;
  const getCurrentTerm = () => {
    if (currentMonth >= 1 && currentMonth <= 4) return 'First Term';
    if (currentMonth >= 5 && currentMonth <= 8) return 'Second Term';
    return 'Third Term';
  };

  // Available sessions and terms for filtering
  const availableSessions = Array.from({ length: 5 }, (_, i) => {
    const year = currentYear - 2 + i;
    return `${year}/${year + 1}`;
  }).reverse();

  const availableTerms = ['First Term', 'Second Term', 'Third Term'];

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'teacher')) {
      fetchTests();
      fetchClasses();
    }
  }, [user]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (tests.length === 0) return;
    
    // 🔥 FETCH SUBMISSION STATS FOR ALL TESTS
    tests.forEach(test => {
      if (test.status === 'completed' || test.status === 'scheduled' || test.status === 'active') {
        fetchTestSubmissionStats(test._id);
      }
    });
    
    // Real-time status updates
    const interval = setInterval(() => {
      const updatedStatuses = {};
      tests.forEach(test => {
        updatedStatuses[test._id] = calculateRealTimeStatus(test);
      });
      setTestStatuses(updatedStatuses);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [tests]);

  // 🔥 NEW FUNCTION: Fetch submission stats for a test
  const fetchTestSubmissionStats = async (testId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/tests/${testId}/submission-stats`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (res.data.success) {
        setSubmissionStats(prev => ({
          ...prev,
          [testId]: res.data.stats
        }));
        
        console.log('📊 Submission stats loaded for test:', testId, res.data.stats);
      }
    } catch (err) {
      console.error(`Error fetching submission stats for test ${testId}:`, err);
      // Set default stats if API fails
      setSubmissionStats(prev => ({
        ...prev,
        [testId]: {
          totalAssignedStudents: 0,
          submittedCount: 0,
          pendingCount: 0,
          submissionRate: 0
        }
      }));
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasses(res.data.classes || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      let endpoint = 'http://localhost:5000/api/tests';
      
      if (user.role === 'admin' || user.role === 'super_admin') {
        endpoint = 'http://localhost:5000/api/tests';
      } else if (user.role === 'teacher') {
        endpoint = 'http://localhost:5000/api/tests';
      }

      console.log('Fetching tests from:', endpoint);
      
      const res = await axios.get(endpoint, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      console.log('API Response:', res.data);
      
      const data = res.data;
      if (data.success) {
        const testsData = data.tests || [];
        setTests(testsData);
        
        const computedStatuses = {};
        testsData.forEach(test => {
          const computedStatus = calculateRealTimeStatus(test);
          computedStatuses[test._id] = computedStatus;
        });
        setTestStatuses(computedStatuses);
        
        console.log('Tests loaded:', testsData.length);
      } else {
        setTests([]);
        setError(data.error || 'Failed to load tests');
      }
      
    } catch (err) {
      console.error('Fetch tests error:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to load tests. Please check your connection.';
      setError(errorMessage);
      setTests([]);
    }
    setLoading(false);
  };

  const calculateRealTimeStatus = (test) => {
    const now = new Date();
    
    // Get stats from submissionStats if available
    const stats = submissionStats[test._id];
    if (stats) {
      const totalStudents = stats.totalAssignedStudents;
      const submittedCount = stats.submittedCount;
      
      return {
        status: test.status,
        activeStudents: stats.pendingCount,
        submittedStudents: submittedCount,
        totalStudents: totalStudents,
        isActive: test.status === 'active',
        hasActiveBatches: test.status === 'active',
        hasUpcomingBatches: test.status === 'scheduled',
        allBatchesElapsed: test.status === 'completed',
        submissionRate: stats.submissionRate
      };
    }
    
    // Fallback to old logic if stats not available
    if (test.status === 'completed') {
      return {
        status: 'completed',
        activeStudents: 0,
        submittedStudents: 0,
        totalStudents: getTotalStudents(test),
        isActive: false,
        hasActiveBatches: false,
        hasUpcomingBatches: false,
        allBatchesElapsed: true
      };
    }
    
    if (!test.batches || test.batches.length === 0) {
      return {
        status: test.status,
        activeStudents: 0,
        submittedStudents: 0,
        totalStudents: 0,
        isActive: false,
        hasActiveBatches: false,
        hasUpcomingBatches: false,
        allBatchesElapsed: true
      };
    }
    
    let hasActiveBatches = false;
    let hasUpcomingBatches = false;
    let allBatchesElapsed = true;
    let activeStudentsCount = 0;
    
    test.batches.forEach(batch => {
      if (!batch.isActive) return;
      
      const start = new Date(batch.schedule.start);
      const end = new Date(batch.schedule.end);
      
      if (now >= start && now <= end) {
        hasActiveBatches = true;
        allBatchesElapsed = false;
        const batchStudents = batch.students?.length || 0;
        activeStudentsCount += batchStudents;
      } else if (now < start) {
        hasUpcomingBatches = true;
        allBatchesElapsed = false;
      }
    });
    
    let overallStatus = test.status;
    
    if (allBatchesElapsed && test.batches.length > 0) {
      overallStatus = 'completed';
    } else if (hasActiveBatches) {
      overallStatus = 'active';
    } else if (test.status === 'scheduled' && !hasActiveBatches && !hasUpcomingBatches) {
      overallStatus = 'completed';
    }
    
    return {
      status: overallStatus,
      activeStudents: activeStudentsCount,
      submittedStudents: 0, // Will be updated by submissionStats
      totalStudents: getTotalStudents(test),
      isActive: hasActiveBatches,
      hasActiveBatches,
      hasUpcomingBatches,
      allBatchesElapsed
    };
  };

  const getTotalStudents = (test) => {
    if (!test.batches || test.batches.length === 0) return 0;
    return test.batches.reduce((total, batch) => {
      return total + (batch.students?.length || 0);
    }, 0);
  };

  // 🔥 UPDATED: Get submission stats directly from submissionStats
  const getSubmissionStats = (test) => {
    const stats = submissionStats[test._id];
    
    if (stats) {
      return {
        submitted: stats.submittedCount,
        active: stats.pendingCount,
        total: stats.totalAssignedStudents,
        percentage: stats.submissionRate,
        totalAssigned: stats.totalAssignedStudents,
        pendingCount: stats.pendingCount,
        submissionRate: stats.submissionRate
      };
    }
    
    // Fallback if stats not loaded yet
    const computed = testStatuses[test._id];
    if (computed) {
      return {
        submitted: computed.submittedStudents,
        active: computed.activeStudents,
        total: computed.totalStudents,
        percentage: computed.totalStudents > 0 ? 
          Math.round((computed.submittedStudents / computed.totalStudents) * 100) : 0
      };
    }
    
    return { 
      submitted: 0, 
      active: 0, 
      total: 0, 
      percentage: 0,
      totalAssigned: 0,
      pendingCount: 0,
      submissionRate: 0
    };
  };

  const fetchBatchDetails = async (testId, batch) => {
    if (!batch || !batch.students || batch.students.length === 0) return null;
    
    try {
      const token = localStorage.getItem('token');
      const studentDetails = await Promise.all(
        batch.students.map(async (studentId) => {
          try {
            const res = await axios.get(`http://localhost:5000/api/users/${studentId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            const hasSubmitted = batch.submittedStudents?.includes(studentId) || false;
            
            // Try to get submission details
            let submissionDetails = null;
            if (hasSubmitted) {
              try {
                const submissionRes = await axios.get(
                  `http://localhost:5000/api/results/test/${testId}/student/${studentId}`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                if (submissionRes.data.success) {
                  submissionDetails = submissionRes.data.result;
                }
              } catch (err) {
                console.log(`No detailed submission found for student ${studentId}`);
              }
            }
            
            return {
              ...res.data.user,
              hasSubmitted,
              submittedAt: submissionDetails?.submittedAt || null,
              score: submissionDetails?.score || null,
              totalScore: submissionDetails?.totalScore || null
            };
          } catch (err) {
            console.error(`Error fetching student ${studentId}:`, err);
            return { 
              _id: studentId, 
              username: 'Unknown', 
              name: 'Unknown Student',
              hasSubmitted: false,
              submittedAt: null
            };
          }
        })
      );
      return studentDetails;
    } catch (err) {
      console.error('Error fetching student details:', err);
      return null;
    }
  };

  const toggleTestExpansion = async (testId) => {
    if (expandedTestId === testId) {
      setExpandedTestId(null);
    } else {
      setExpandedTestId(testId);
      
      const test = tests.find(t => t._id === testId);
      if (test && test.batches && test.batches.length > 0) {
        setLoadingBatches(prev => ({ ...prev, [testId]: true }));
        
        // 🔥 Refresh submission stats when expanding
        await fetchTestSubmissionStats(testId);
        
        const details = {};
        for (const batch of test.batches) {
          const studentDetails = await fetchBatchDetails(testId, batch);
          details[batch._id || batch.name] = {
            ...batch,
            studentDetails: studentDetails || []
          };
        }
        
        setBatchDetails(prev => ({
          ...prev,
          [testId]: details
        }));
        setLoadingBatches(prev => ({ ...prev, [testId]: false }));
      }
    }
  };

  const getBatchStatus = (batch) => {
    const now = new Date();
    const start = new Date(batch.schedule.start);
    const end = new Date(batch.schedule.end);
    
    if (!batch.isActive) return { status: 'cancelled', label: 'Cancelled', color: '#DC2626', bg: '#FEE2E2' };
    
    if (now < start) return { 
      status: 'upcoming', 
      label: 'Upcoming', 
      color: '#D97706', 
      bg: '#FEF3C7'
    };
    
    if (now >= start && now <= end) return { 
      status: 'active', 
      label: 'Active', 
      color: '#059669', 
      bg: '#D1FAE5'
    };
    
    if (now > end) return { 
      status: 'completed', 
      label: 'Completed', 
      color: '#6B7280', 
      bg: '#F3F4F6'
    };
    
    return { 
      status: 'unknown', 
      label: 'Unknown', 
      color: '#6B7280', 
      bg: '#F3F4F6'
    };
  };

  const getClassName = (test) => {
    if (!test.class) return 'No Class';
    
    if (typeof test.class === 'object' && test.class !== null) {
      return test.class.name || test.class._id || 'Unknown Class';
    }
    
    if (typeof test.class === 'string') {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(test.class);
      if (isObjectId) {
        const foundClass = classes.find(c => c._id === test.class);
        return foundClass ? foundClass.name : test.class;
      }
      return test.class;
    }
    
    return 'Unknown Class';
  };

  const getClassId = (test) => {
    if (!test.class) return null;
    
    if (typeof test.class === 'object' && test.class !== null) {
      return test.class._id || test.class;
    }
    
    return test.class;
  };

  const getDisplayStatus = (test) => {
    const computed = testStatuses[test._id];
    return computed ? computed.status : test.status;
  };

  const autoCompleteTest = async (testId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/tests/${testId}/status`,
        { status: 'completed' },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      setTests(tests.map(test => 
        test._id === testId 
          ? { ...test, status: 'completed' }
          : test
      ));
      
      // 🔥 Refresh submission stats after completion
      await fetchTestSubmissionStats(testId);
      
    } catch (err) {
      console.error('Error auto-completing test:', err);
    }
  };

  const handleApproveTest = async (testId, testTitle) => {
    if (!window.confirm(`Are you sure you want to approve "${testTitle}"? This will allow it to be scheduled for students.`)) {
      return;
    }

    setApprovingId(testId);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `http://localhost:5000/api/tests/${testId}/approve`,
        {},
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      console.log('Approve response:', res.data);
      setSuccess(`Test "${testTitle}" approved successfully! You can now schedule it.`);
      setError(null);
      
      setTests(tests.map(test => 
        test._id === testId 
          ? { ...test, status: 'approved', approvedBy: user.id, approvedAt: new Date() }
          : test
      ));
      
    } catch (err) {
      console.error('Approve test error:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to approve test.';
      setError(errorMessage);
      
      if (err.response?.data?.error?.includes('Cannot change status from')) {
        setError(`Cannot approve test: ${err.response.data.error}`);
      } else if (err.response?.data?.error?.includes('cannot be approved')) {
        setError(`Test cannot be approved: ${err.response.data.error}`);
      }
    } finally {
      setApprovingId(null);
    }
  };

  const handleScheduleTest = async (testId) => {
    navigate(`/admin/tests/${testId}/schedule`);
  };

  const handleUnapproveTest = async (testId, testTitle) => {
    if (!window.confirm(`Unapprove "${testTitle}"? This will change status from approved back to draft.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `http://localhost:5000/api/tests/${testId}/status`,
        { 
          status: 'draft'
        },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      console.log('Unapprove response:', res.data);
      setSuccess(`"${testTitle}" unapproved and moved back to drafts.`);
      setError(null);
      
      setTests(tests.map(test => 
        test._id === testId 
          ? { ...test, status: 'draft' }
          : test
      ));
      
    } catch (err) {
      console.error('Unapprove test error:', err);
      const errorMessage = err.response?.data?.error || 
                          'Failed to unapprove test';
      setError(errorMessage);
    }
  };

  const handleCompleteTest = async (testId, testTitle) => {
    if (!window.confirm(`Mark test "${testTitle}" as completed? This will end the test for all students.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `http://localhost:5000/api/tests/${testId}/status`,
        { status: 'completed' },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      setSuccess(`Test "${testTitle}" marked as completed.`);
      setError(null);
      
      const updatedTests = tests.map(test => 
        test._id === testId 
          ? { ...test, status: 'completed' }
          : test
      );
      setTests(updatedTests);
      
      // 🔥 Refresh submission stats after completion
      await fetchTestSubmissionStats(testId);
      
    } catch (err) {
      console.error('Complete test error:', err);
      const errorMessage = err.response?.data?.error || 
                          'Failed to complete test';
      setError(errorMessage);
    }
  };

  const handlePublishTest = async (testId, testTitle) => {
    if (!window.confirm(`Submit "${testTitle}" for admin approval?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `http://localhost:5000/api/tests/${testId}`,
        { status: 'submitted' },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      setSuccess(`"${testTitle}" submitted for admin approval.`);
      setError(null);
      
      setTests(tests.map(test => 
        test._id === testId 
          ? { ...test, status: 'submitted' }
          : test
      ));
      
    } catch (err) {
      console.error('Publish test error:', err);
      const errorMessage = err.response?.data?.error || 
                          'Failed to submit test for approval';
      setError(errorMessage);
    }
  };

  const handleDelete = async (testId, testTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${testTitle}"? This will also delete all related results and cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/tests/${testId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      setTests(tests.filter(test => test._id !== testId));
      
      // Remove submission stats for deleted test
      setSubmissionStats(prev => {
        const newStats = { ...prev };
        delete newStats[testId];
        return newStats;
      });
      
      setSuccess(`"${testTitle}" deleted successfully.`);
      setError(null);
    } catch (err) {
      console.error('Delete test error:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to delete test.';
      setError(errorMessage);
    }
  };

  const handleViewTest = (test) => {
    navigate(`/admin/tests/${test._id}/preview`, { 
      state: { 
        test,
        canEdit: canEditTest(test)
      }
    });
  };



  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title?.toLowerCase().includes(search.toLowerCase()) || 
                         test.subject?.toLowerCase().includes(search.toLowerCase());
    const displayStatus = getDisplayStatus(test);
    const matchesStatus = filterStatus === 'all' || displayStatus === filterStatus;
    
    let matchesClass = true;
    if (filterClass !== 'all') {
      const className = getClassName(test);
      const classId = getClassId(test);
      matchesClass = className === filterClass || classId === filterClass;
    }
    
    // Session filtering
    let matchesSession = true;
    if (filterSession) {
      matchesSession = test.session === filterSession;
    }
    
    // Term filtering
    let matchesTerm = true;
    if (filterTerm) {
      matchesTerm = test.term === filterTerm;
    }
    
    return matchesSearch && matchesStatus && matchesClass && matchesSession && matchesTerm;
  });

  const uniqueClasses = [...new Set(tests.map(test => getClassName(test)).filter(Boolean))];
  const uniqueSessions = [...new Set(tests.map(test => test.session).filter(Boolean))];
  const uniqueTerms = [...new Set(tests.map(test => test.term).filter(Boolean))];

  const canManageTests = () => {
    if (!user) return false;
    return user.role === 'super_admin' || user.role === 'admin' || user.role === 'teacher';
  };

  const canApproveTests = () => {
    if (!user) return false;
    return user.role === 'super_admin' || 
          (user.role === 'admin' && user.adminPermissions?.includes('APPROVE_TESTS'));
  };

  const canScheduleTests = () => {
    if (!user) return false;
    return user.role === 'super_admin' || 
          (user.role === 'admin' && user.adminPermissions?.includes('MANAGE_TESTS'));
  };

  const canDeleteTest = (test) => {
    if (!user) return false;
    
    if (user.role === 'super_admin') return true;
    if (user.role === 'admin' && user.adminPermissions?.includes('MANAGE_TESTS')) return true;
    
    if (user.role === 'teacher' && test.createdBy?._id === user._id && test.status === 'draft') {
      return true;
    }
    
    return false;
  };

  const canEditTest = (test) => {
    if (!user) return false;
    
    if (user.role === 'super_admin') return true;
    if (user.role === 'admin' && user.adminPermissions?.includes('MANAGE_TESTS')) return true;
    
    if (user.role === 'teacher' && test.createdBy?._id === user._id && test.status === 'draft') {
      return true;
    }
    
    return false;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return { bg: '#FFF3CD', color: '#D4A017', label: 'Draft', icon: '📝' };
      case 'submitted': return { bg: '#E6F7FF', color: '#0066CC', label: 'Submitted', icon: '📤' };
      case 'approved': return { bg: '#E6FFE6', color: '#228B22', label: 'Approved', icon: '✅' };
      case 'scheduled': return { bg: '#D1ECF1', color: '#0C5460', label: 'Scheduled', icon: '📅' };
      case 'active': return { bg: '#D4EDDA', color: '#155724', label: 'Active', icon: '⚡' };
      case 'completed': return { bg: '#E2E3E5', color: '#383D41', label: 'Completed', icon: '🏁' };
      default: return { bg: '#F8F9FA', color: '#6C757D', label: status, icon: '❓' };
    }
  };

  const canBeApproved = (test) => {
    return (test.status === 'draft' || test.status === 'submitted') && 
           test.questionCount > 0;
  };

  const canBeScheduled = (test) => {
    return test.status === 'approved';
  };

  const getApprovalMessage = (test) => {
    if (test.status !== 'draft' && test.status !== 'submitted') {
      return `Test is ${test.status}, cannot be approved`;
    }
    if (test.questionCount === 0) {
      return 'No questions added';
    }
    if (test.questions?.length === 0) {
      return 'No questions assigned';
    }
    return 'Ready for approval';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 🔥 UPDATED: Get submission stats from submissionStats state
  const getTestSubmissionStats = (test) => {
    return getSubmissionStats(test);
  };

  const getTestStats = () => {
    const stats = {
      draft: 0,
      submitted: 0,
      approved: 0,
      scheduled: 0,
      active: 0,
      completed: 0
    };
    
    tests.forEach(test => {
      const status = getDisplayStatus(test);
      stats[status] = (stats[status] || 0) + 1;
    });
    
    return stats;
  };

  // 🔥 CALCULATE TOTAL SUBMISSIONS FOR CARDS
  const calculateCardStats = () => {
    let totalAssigned = 0;
    let totalSubmitted = 0;
    let totalActive = 0;
    
    // Only count for scheduled, active, and completed tests
    tests.forEach(test => {
      const status = getDisplayStatus(test);
      if (status === 'scheduled' || status === 'active' || status === 'completed') {
        const stats = getSubmissionStats(test);
        totalAssigned += stats.totalAssigned || 0;
        totalSubmitted += stats.submitted || 0;
        totalActive += stats.active || 0;
      }
    });
    
    const submissionRate = totalAssigned > 0 ? Math.round((totalSubmitted / totalAssigned) * 100) : 0;
    
    return {
      totalAssigned,
      totalSubmitted,
      totalActive,
      submissionRate
    };
  };

  const cardStats = calculateCardStats();
  const testStats = getTestStats();

  if (!user || !canManageTests()) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: '#FFF3F3',
          color: '#B22222',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: 'sans-serif',
          maxWidth: '400px'
        }}>
          <FiAlertTriangle style={{ fontSize: '24px', flexShrink: 0 }} />
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Access Denied</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>You don't have permission to manage tests.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F8F9FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          color: '#4B5320',
          fontFamily: 'sans-serif',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '16px', marginBottom: '16px' }}>Loading tests...</div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #4B5320',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8F9FA',
      fontFamily: 'sans-serif'
    }}>
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#4B5320',
              margin: '0 0 8px 0'
            }}>
              Manage Tests
            </h1>
            <p style={{
              color: '#6B7280',
              margin: 0,
              fontSize: '16px'
            }}>
              {user.role === 'teacher' 
                ? 'Create and manage your tests' 
                : 'Approve, schedule, and monitor tests'}
            </p>
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '8px',
              fontSize: '14px',
              color: '#6B7280'
            }}>
              <span>Default filter: Current Session ({getCurrentSession()})</span>
              {filterSession && (
                <button
                  onClick={() => {
                    setFilterSession('');
                    setFilterTerm('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#D4A017',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textDecoration: 'underline'
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {user.role === 'teacher' && (
              <button
                onClick={() => navigate('/admin/create-test')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#D4A017',
                  color: '#4B5320',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <FiCalendar /> Create New Test
              </button>
            )}
            
            <button
              onClick={fetchTests}
              style={{
                padding: '12px 16px',
                backgroundColor: '#6B7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FiRefreshCw /> Refresh
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            backgroundColor: '#FFF3F3',
            color: '#B22222',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <FiAlertTriangle style={{ fontSize: '20px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div style={{
            backgroundColor: '#E6FFE6',
            color: '#228B22',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <FiCheckCircle style={{ fontSize: '20px', flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* 🔥 UPDATED TEST STATS WITH SUBMISSION COUNTS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Draft Tests Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #D4A017'
          }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Draft Tests</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#D4A017' }}>
              {testStats.draft}
            </div>
          </div>
          
          {/* Submitted Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #0066CC'
          }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Submitted</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066CC' }}>
              {testStats.submitted}
            </div>
          </div>
          
          {/* Approved Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #228B22'
          }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Approved</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#228B22' }}>
              {testStats.approved}
            </div>
          </div>
          
          {/* 🔥 TOTAL ASSIGNED STUDENTS CARD */}
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #0C5460'
          }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Total Assigned</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0C5460' }}>
              {cardStats.totalAssigned}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              Students assigned to tests
            </div>
          </div>
          
          {/* 🔥 TOTAL SUBMISSIONS CARD */}
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #155724'
          }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Submissions</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#155724' }}>
              {cardStats.totalSubmitted}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              {cardStats.submissionRate}% submission rate
            </div>
          </div>
          
          {/* Active Tests Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #383D41'
          }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Active Tests</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#383D41' }}>
              {testStats.active}
            </div>
            {cardStats.totalActive > 0 && (
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                {cardStats.totalActive} students taking tests
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
            <input
              type="text"
              placeholder="Search by title or subject..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 40px',
                border: '1px solid #D3D3D3',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                transition: 'border-color 0.2s'
              }}
            />
            <FiSearch style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6B7280',
              fontSize: '16px'
            }} />
          </div>
          
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '1px solid #D3D3D3',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              minWidth: '150px',
              backgroundColor: 'white'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          
          <select
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '1px solid #D3D3D3',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              minWidth: '150px',
              backgroundColor: 'white'
            }}
          >
            <option value="all">All Classes</option>
            {uniqueClasses.map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>

          {/* Session Filter */}
          <div style={{ position: 'relative' }}>
            <FiBookOpen style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6B7280',
              fontSize: '16px',
              zIndex: 1
            }} />
            <select
              value={filterSession}
              onChange={e => setFilterSession(e.target.value)}
              style={{
                padding: '12px 16px 12px 40px',
                border: '1px solid #D3D3D3',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                minWidth: '150px',
                backgroundColor: 'white',
                appearance: 'none'
              }}
            >
              <option value="">All Sessions</option>
              {availableSessions.map(session => (
                <option key={session} value={session}>{session}</option>
              ))}
              {uniqueSessions
                .filter(session => !availableSessions.includes(session))
                .map(session => (
                  <option key={session} value={session}>{session}</option>
                ))}
            </select>
          </div>

          {/* Term Filter */}
          <select
            value={filterTerm}
            onChange={e => setFilterTerm(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '1px solid #D3D3D3',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              minWidth: '150px',
              backgroundColor: 'white'
            }}
          >
            <option value="">All Terms</option>
            {availableTerms.map(term => (
              <option key={term} value={term}>{term}</option>
            ))}
            {uniqueTerms
              .filter(term => !availableTerms.includes(term))
              .map(term => (
                <option key={term} value={term}>{term}</option>
              ))}
          </select>
        </div>

        {/* Tests List */}
        {filteredTests.length === 0 ? (
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '48px 24px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center',
            color: '#6B7280'
          }}>
            <FiUsers style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>No Tests Found</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>
              {tests.length === 0 ? 'No tests have been created yet.' : 'No tests match your search criteria.'}
            </p>
            {user.role === 'teacher' && (
              <button
                onClick={() => navigate('/admin/create-test')}
                style={{
                  marginTop: '16px',
                  padding: '10px 20px',
                  backgroundColor: '#D4A017',
                  color: '#4B5320',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Create Your First Test
              </button>
            )}
            {filterSession && (
              <button
                onClick={() => {
                  setFilterSession('');
                  setFilterTerm('');
                }}
                style={{
                  marginTop: '16px',
                  marginLeft: '8px',
                  padding: '10px 20px',
                  backgroundColor: '#6B7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Clear Session/Term Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {filteredTests.map(test => {
              const displayStatus = getDisplayStatus(test);
              const statusInfo = getStatusColor(displayStatus);
              const stats = getTestSubmissionStats(test); // 🔥 Get updated stats
              const isTestOwner = user.role === 'teacher' && test.createdBy?._id === user._id;
              const isEligibleForApproval = canBeApproved(test);
              const approvalMessage = getApprovalMessage(test);
              const className = getClassName(test);
              const hasBatches = test.batches && test.batches.length > 0;
              const isExpanded = expandedTestId === test._id;
              const canDelete = canDeleteTest(test);
              const canEdit = canEditTest(test);
              
              return (
                <div key={test._id} style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  border: `1px solid ${statusInfo.color}20`,
                  overflow: 'hidden'
                }}>
                  {/* Test Header */}
                  <div style={{
                    padding: '20px',
                    cursor: hasBatches ? 'pointer' : 'default',
                    borderBottom: isExpanded ? '1px solid #E5E7EB' : 'none'
                  }} onClick={() => hasBatches && toggleTestExpansion(test._id)}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '8px'
                        }}>
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: '#4B5320',
                            margin: 0,
                            lineHeight: '1.4'
                          }}>
                            {test.title}
                          </h3>
                          <div style={{
                            backgroundColor: statusInfo.bg,
                            color: statusInfo.color,
                            padding: '4px 12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>{statusInfo.icon}</span>
                            <span>{statusInfo.label}</span>
                          </div>
                        </div>
                        
                        {/* Session and Term Badges */}
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          alignItems: 'center',
                          marginBottom: '12px'
                        }}>
                          {test.session && (
                            <span style={{
                              color: '#D4A017',
                              fontSize: '13px',
                              backgroundColor: '#FFF8E1',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: '500'
                            }}>
                              <FiBookOpen size={12} />
                              {test.session}
                            </span>
                          )}
                          {test.term && (
                            <span style={{
                              color: '#4B5320',
                              fontSize: '13px',
                              backgroundColor: '#E8F5E9',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontWeight: '500'
                            }}>
                              {test.term}
                            </span>
                          )}
                        </div>

                        {/* 🔥 Submission progress for scheduled/active/completed tests */}
                        {(displayStatus === 'scheduled' || displayStatus === 'active' || displayStatus === 'completed') && stats.total > 0 && (
                          <div style={{
                            marginBottom: '12px',
                            maxWidth: '300px'
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '13px',
                              color: '#6B7280',
                              marginBottom: '4px'
                            }}>
                              <span>Submissions: {stats.submitted}/{stats.total}</span>
                              <span>{stats.percentage}%</span>
                            </div>
                            <div style={{
                              height: '6px',
                              backgroundColor: '#E5E7EB',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${stats.percentage}%`,
                                height: '100%',
                                backgroundColor: displayStatus === 'active' ? '#059669' : 
                                              displayStatus === 'completed' ? '#383D41' : '#0C5460',
                                transition: 'width 0.3s ease'
                              }}></div>
                            </div>
                            {displayStatus === 'active' && stats.active > 0 && (
                              <div style={{
                                fontSize: '12px',
                                color: '#D97706',
                                marginTop: '4px'
                              }}>
                                {stats.active} student{stats.active !== 1 ? 's' : ''} currently taking test
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          alignItems: 'center',
                          marginBottom: '12px'
                        }}>
                          <span style={{
                            color: '#6B7280',
                            fontSize: '14px',
                            backgroundColor: '#F8F9FA',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}>
                            {test.subject}
                          </span>
                          <span style={{
                            color: '#6B7280',
                            fontSize: '14px',
                            backgroundColor: '#F8F9FA',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}>
                            {className}
                          </span>
                          {hasBatches && (
                            <span style={{
                              color: '#6B7280',
                              fontSize: '14px',
                              backgroundColor: '#E6F7FF',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <FiUsers size={14} />
                              {test.batches.length} Batch{test.batches.length !== 1 ? 'es' : ''}
                              {stats.total > 0 && (
                                <span style={{ marginLeft: '4px', color: '#059669' }}>
                                  ({stats.submitted}/{stats.total})
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {hasBatches && (
                        <button
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#6B7280',
                            cursor: 'pointer',
                            padding: '4px',
                            fontSize: '20px',
                            marginLeft: '8px'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTestExpansion(test._id);
                          }}
                        >
                          {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      )}
                    </div>

                    {/* Test Details */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '12px',
                      marginBottom: '16px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#6B7280',
                        fontSize: '14px'
                      }}>
                        <FiUsers style={{ flexShrink: 0 }} />
                        <span>By: {test.createdBy?.username || test.createdBy?.name || 'Unknown'}</span>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#6B7280',
                        fontSize: '14px'
                      }}>
                        <FiClock style={{ flexShrink: 0 }} />
                        <span>{test.duration} mins • {test.totalMarks || 'N/A'} marks</span>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#6B7280',
                        fontSize: '14px'
                      }}>
                        <span>Questions:</span>
                        <span style={{ 
                          fontWeight: test.questions?.length >= test.questionCount ? '600' : '400',
                          color: test.questions?.length >= test.questionCount ? '#228B22' : '#D4A017'
                        }}>
                          {test.questions?.length || 0}/{test.questionCount || 0}
                        </span>
                      </div>
                      
                      {/* 🔥 Show submission stats for scheduled/active/completed tests */}
                      {(displayStatus === 'scheduled' || displayStatus === 'active' || displayStatus === 'completed') && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: '#6B7280',
                          fontSize: '14px'
                        }}>
                          <FiUpload style={{ flexShrink: 0, color: stats.percentage > 50 ? '#228B22' : '#D97706' }} />
                          <span style={{ fontWeight: '500', color: stats.percentage > 50 ? '#228B22' : '#D97706' }}>
                            {stats.submitted}/{stats.totalAssigned || stats.total} submitted
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      {/* VIEW/PREVIEW Button */}
                      <button
                        onClick={() => handleViewTest(test)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          backgroundColor: '#6B7280',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        <FiEye /> Preview Test
                      </button>

                      {/* Results Button */}
                      <button
                        onClick={() => navigate(`/admin/results/${test._id}`)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          backgroundColor: '#D4A017',
                          color: '#4B5320',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        <FiBarChart /> Results
                      </button>

                    

                      {/* DELETE Button */}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(test._id, test.title)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#dc3545',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          <FiTrash2 /> Delete
                        </button>
                      )}

                      {/* TEACHER: Submit for Approval */}
                      {user.role === 'teacher' && isTestOwner && test.status === 'draft' && (
                        <button
                          onClick={() => handlePublishTest(test._id, test.title)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#28a745',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          <FiSend /> Submit for Approval
                        </button>
                      )}

                      {/* ADMIN/SUPER ADMIN ACTIONS */}
                      {(user.role === 'admin' || user.role === 'super_admin') && (
                        <>
                          {/* Approve Button */}
                          {isEligibleForApproval && canApproveTests() && (
                            <button
                              onClick={() => handleApproveTest(test._id, test.title)}
                              disabled={approvingId === test._id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                backgroundColor: '#28a745',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                opacity: approvingId === test._id ? 0.7 : 1
                              }}
                            >
                              {approvingId === test._id ? (
                                <>
                                  <div style={{
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid #ffffff',
                                    borderTop: '2px solid transparent',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                  }}></div>
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <FiCheckSquare /> Approve
                                </>
                              )}
                            </button>
                          )}

                          {/* Schedule Button */}
                          {test.status === 'approved' && canScheduleTests() && (
                            <button
                              onClick={() => handleScheduleTest(test._id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                backgroundColor: '#007bff',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                              }}
                            >
                              <FiCalendar /> Schedule
                            </button>
                          )}

                          {/* Complete Test Button */}
                          {displayStatus === 'active' && (
                            <button
                              onClick={() => handleCompleteTest(test._id, test.title)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                backgroundColor: '#DC2626',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500'
                              }}
                            >
                              <FiArchive /> Complete Test
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded Batch Details */}
                  {isExpanded && hasBatches && (
                    <div style={{
                      padding: '20px',
                      backgroundColor: '#F9FAFB',
                      borderTop: '1px solid #E5E7EB'
                    }}>
                      {loadingBatches[test._id] ? (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          padding: '20px'
                        }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            border: '2px solid #f3f3f3',
                            borderTop: '2px solid #4B5320',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }}></div>
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px'
                        }}>
                          <h4 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#4B5320',
                            margin: '0 0 8px 0'
                          }}>
                            Batches ({test.batches.length})
                          </h4>
                          
                          {test.batches.map((batch, index) => {
                            const batchStatus = getBatchStatus(batch);
                            const batchKey = batch._id || batch.name;
                            const batchDetailsData = batchDetails[test._id]?.[batchKey];
                            const studentCount = batch.students?.length || 0;
                            
                            return (
                              <div key={batchKey} style={{
                                backgroundColor: '#FFFFFF',
                                padding: '16px',
                                borderRadius: '6px',
                                border: '1px solid #E5E7EB',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                              }}>
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start',
                                  marginBottom: '12px'
                                }}>
                                  <div>
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      marginBottom: '8px'
                                    }}>
                                      <h5 style={{
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        color: '#374151',
                                        margin: 0
                                      }}>
                                        {batch.name}
                                      </h5>
                                      <span style={{
                                        backgroundColor: batchStatus.bg,
                                        color: batchStatus.color,
                                        padding: '2px 8px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        borderRadius: '4px'
                                      }}>
                                        {batchStatus.label}
                                      </span>
                                    </div>
                                    
                                    <div style={{
                                      display: 'flex',
                                      gap: '16px',
                                      flexWrap: 'wrap'
                                    }}>
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        color: '#6B7280',
                                        fontSize: '13px'
                                      }}>
                                        <FiUsers size={12} />
                                        <span>{studentCount} student{studentCount !== 1 ? 's' : ''}</span>
                                      </div>
                                      
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        color: '#6B7280',
                                        fontSize: '13px'
                                      }}>
                                        <FiClock size={12} />
                                        <span>Start: {formatDate(batch.schedule.start)}</span>
                                      </div>
                                      
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        color: '#6B7280',
                                        fontSize: '13px'
                                      }}>
                                        <FiClock size={12} />
                                        <span>End: {formatDate(batch.schedule.end)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {(user.role === 'admin' || user.role === 'super_admin') && (
                                    <div style={{
                                      display: 'flex',
                                      gap: '8px'
                                    }}>
                                      <button
                                        onClick={() => navigate(`/admin/results?test=${test._id}&batch=${batchKey}`)}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '6px 12px',
                                          backgroundColor: '#6B7280',
                                          color: '#FFFFFF',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: '12px',
                                          fontWeight: '500'
                                        }}
                                      >
                                        <FiFileText size={12} /> View Submissions
                                      </button>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Student List */}
                                {batchDetailsData?.studentDetails && (
                                  <div style={{
                                    marginTop: '12px',
                                    borderTop: '1px solid #E5E7EB',
                                    paddingTop: '12px'
                                  }}>
                                    <h6 style={{
                                      fontSize: '14px',
                                      fontWeight: '600',
                                      color: '#6B7280',
                                      margin: '0 0 8px 0'
                                    }}>
                                      Students ({studentCount})
                                    </h6>
                                    
                                    <div style={{
                                      display: 'grid',
                                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                      gap: '8px',
                                      maxHeight: '200px',
                                      overflowY: 'auto',
                                      padding: '8px'
                                    }}>
                                      {batchDetailsData.studentDetails.map((student, idx) => (
                                        <div key={student._id} style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          padding: '8px',
                                          backgroundColor: student.hasSubmitted ? '#E6FFE6' : '#F8F9FA',
                                          borderRadius: '4px',
                                          borderLeft: `3px solid ${student.hasSubmitted ? '#28a745' : '#6B7280'}`
                                        }}>
                                          <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            backgroundColor: student.hasSubmitted ? '#D1FAE5' : '#E5E7EB',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: student.hasSubmitted ? '#059669' : '#6B7280',
                                            fontSize: '12px',
                                            fontWeight: '600'
                                          }}>
                                            {student.name?.[0]?.toUpperCase() || student.username?.[0]?.toUpperCase() || 'S'}
                                          </div>
                                          <div style={{ flex: 1 }}>
                                            <div style={{
                                              fontSize: '13px',
                                              fontWeight: '500',
                                              color: '#374151',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center'
                                            }}>
                                              <span>{student.name || student.username}</span>
                                              {student.hasSubmitted && (
                                                <span style={{
                                                  fontSize: '10px',
                                                  color: '#28a745',
                                                  backgroundColor: '#D1FAE5',
                                                  padding: '2px 6px',
                                                  borderRadius: '3px',
                                                  fontWeight: '600'
                                                }}>
                                                  Submitted
                                                </span>
                                              )}
                                            </div>
                                            <div style={{
                                              fontSize: '11px',
                                              color: '#6B7280'
                                            }}>
                                              {student.email || student.username}
                                            </div>
                                            {student.hasSubmitted && student.submittedAt && (
                                              <div style={{
                                                fontSize: '10px',
                                                color: '#6B7280',
                                                marginTop: '2px'
                                              }}>
                                                Submitted: {formatDate(student.submittedAt)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          button:hover:not(:disabled) {
            opacity: 0.9;
            transform: translateY(-1px);
            transition: all 0.2s ease;
          }
          
          button:active:not(:disabled) {
            transform: translateY(0);
          }
          
          button:disabled {
            cursor: not-allowed;
            opacity: 0.6;
          }
        `}
      </style>
    </div>
  );
};

export default ManageTests;