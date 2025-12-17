import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  FiAlertTriangle, FiCheckCircle, FiEye, FiCalendar, FiBarChart, 
  FiSearch, FiTrash2, FiClock, FiUsers, FiEdit, FiCheck, FiX, 
  FiRefreshCw, FiCheckSquare, FiChevronDown, FiChevronUp, 
  FiUser, FiList, FiFileText, FiSend, FiArchive, FiExternalLink
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
  const [classes, setClasses] = useState([]);
  const [approvingId, setApprovingId] = useState(null);
  const [expandedTestId, setExpandedTestId] = useState(null);
  const [batchDetails, setBatchDetails] = useState({});
  const [loadingBatches, setLoadingBatches] = useState({});

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'teacher')) {
      fetchTests();
      fetchClasses();
    }
  }, [user]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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
      
      // Determine which endpoint to use based on user role
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
      
      // FIXED: Properly handle API response format
      const data = res.data;
      if (data.success) {
        setTests(data.tests || []);
        console.log('Tests loaded:', data.tests?.length || 0);
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

  // Fetch detailed batch information with student details
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
            return res.data.user;
          } catch (err) {
            console.error(`Error fetching student ${studentId}:`, err);
            return { _id: studentId, username: 'Unknown', name: 'Unknown Student' };
          }
        })
      );
      return studentDetails;
    } catch (err) {
      console.error('Error fetching student details:', err);
      return null;
    }
  };

  // Toggle test expansion
  const toggleTestExpansion = async (testId) => {
    if (expandedTestId === testId) {
      setExpandedTestId(null);
    } else {
      setExpandedTestId(testId);
      
      // Fetch batch details if not already loaded
      const test = tests.find(t => t._id === testId);
      if (test && test.batches && test.batches.length > 0) {
        setLoadingBatches(prev => ({ ...prev, [testId]: true }));
        
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

  // Get batch status
  const getBatchStatus = (batch) => {
    const now = new Date();
    const start = new Date(batch.schedule.start);
    const end = new Date(batch.schedule.end);
    
    if (!batch.isActive) return { status: 'cancelled', label: 'Cancelled', color: '#DC2626', bg: '#FEE2E2' };
    if (now < start) return { status: 'upcoming', label: 'Upcoming', color: '#D97706', bg: '#FEF3C7' };
    if (now >= start && now <= end) return { status: 'active', label: 'Active', color: '#059669', bg: '#D1FAE5' };
    if (now > end) return { status: 'completed', label: 'Completed', color: '#6B7280', bg: '#F3F4F6' };
    
    return { status: 'unknown', label: 'Unknown', color: '#6B7280', bg: '#F3F4F6' };
  };

  // Helper function to get class name from test
  const getClassName = (test) => {
    if (!test.class) return 'No Class';
    
    // If class is an object with name property
    if (typeof test.class === 'object' && test.class !== null) {
      return test.class.name || test.class._id || 'Unknown Class';
    }
    
    // If class is a string (might be ObjectId or class name)
    if (typeof test.class === 'string') {
      // Check if it's an ObjectId (24 hex characters)
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(test.class);
      if (isObjectId) {
        // Try to find class name from classes array
        const foundClass = classes.find(c => c._id === test.class);
        return foundClass ? foundClass.name : test.class;
      }
      // If not ObjectId, assume it's already a class name
      return test.class;
    }
    
    return 'Unknown Class';
  };

  // Approve test (Admin/Super Admin only)
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
      
      // Update the test in state immediately
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
      
      // Check for specific error messages
      if (err.response?.data?.error?.includes('Cannot change status from')) {
        setError(`Cannot approve test: ${err.response.data.error}`);
      } else if (err.response?.data?.error?.includes('cannot be approved')) {
        setError(`Test cannot be approved: ${err.response.data.error}`);
      }
    } finally {
      setApprovingId(null);
    }
  };

  // Schedule test (Admin/Super Admin only)
  const handleScheduleTest = async (testId) => {
    navigate(`/admin/tests/${testId}/schedule`);
  };

  // Unapprove test (move from approved back to draft)
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
      
      // Update the test in state
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

  // Complete test (admin only)
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
      
      // Update the test in state
      setTests(tests.map(test => 
        test._id === testId 
          ? { ...test, status: 'completed' }
          : test
      ));
      
    } catch (err) {
      console.error('Complete test error:', err);
      const errorMessage = err.response?.data?.error || 
                          'Failed to complete test';
      setError(errorMessage);
    }
  };

  // Publish test (Teacher only - for their own tests)
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
      
      // Update the test in state
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

  // DELETE TEST
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

  // VIEW TEST DETAILS - Navigate to test preview/edit page
  const handleViewTest = (test) => {
    // Navigate to test preview page with test data
    navigate(`/admin/tests/${test._id}/preview`, { 
      state: { 
        test,
        canEdit: canEditTest(test)
      }
    });
  };

  // EDIT TEST - Navigate to test editor
  const handleEditTest = (testId) => {
    navigate(`/admin/tests/${testId}/edit`);
  };

  // Filter tests based on search and filters
  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title?.toLowerCase().includes(search.toLowerCase()) || 
                         test.subject?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || test.status === filterStatus;
    
    // Handle class filtering properly
    let matchesClass = true;
    if (filterClass !== 'all') {
      const className = getClassName(test);
      const classId = getClassId(test);
      matchesClass = className === filterClass || classId === filterClass;
    }
    
    return matchesSearch && matchesStatus && matchesClass;
  });

  // Get unique classes for filter dropdown - using class names
  const uniqueClasses = [...new Set(tests.map(test => getClassName(test)).filter(Boolean))];

  // Check if user has permission to manage tests
  const canManageTests = () => {
    if (!user) return false;
    return user.role === 'super_admin' || user.role === 'admin' || user.role === 'teacher';
  };

  // Check if user can approve tests
  const canApproveTests = () => {
    if (!user) return false;
    return user.role === 'super_admin' || 
          (user.role === 'admin' && user.adminPermissions?.includes('APPROVE_TESTS'));
  };

  // Check if user can schedule tests
  const canScheduleTests = () => {
    if (!user) return false;
    return user.role === 'super_admin' || 
          (user.role === 'admin' && user.adminPermissions?.includes('MANAGE_TESTS'));
  };

  // Check if user can delete tests
  const canDeleteTest = (test) => {
    if (!user) return false;
    
    if (user.role === 'super_admin') return true;
    if (user.role === 'admin' && user.adminPermissions?.includes('MANAGE_TESTS')) return true;
    
    // Teachers can only delete their own draft tests
    if (user.role === 'teacher' && test.createdBy?._id === user._id && test.status === 'draft') {
      return true;
    }
    
    return false;
  };

  // Check if user can edit test
  const canEditTest = (test) => {
    if (!user) return false;
    
    if (user.role === 'super_admin') return true;
    if (user.role === 'admin' && user.adminPermissions?.includes('MANAGE_TESTS')) return true;
    
    // Teachers can only edit their own draft tests
    if (user.role === 'teacher' && test.createdBy?._id === user._id && test.status === 'draft') {
      return true;
    }
    
    return false;
  };

  // Get status badge color
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

  // Check if test can be approved
  const canBeApproved = (test) => {
    // Admin can approve draft or submitted tests
    return (test.status === 'draft' || test.status === 'submitted') && 
           test.questionCount > 0;
  };

  // Check if test can be scheduled
  const canBeScheduled = (test) => {
    return test.status === 'approved';
  };

  // Get approval eligibility message
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

  // Format date
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

  // Helper function to get class ID for filtering
  const getClassId = (test) => {
    if (!test.class) return null;
    
    if (typeof test.class === 'object' && test.class !== null) {
      return test.class._id || test.class;
    }
    
    return test.class;
  };

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
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {/* Only show Create Test button for teachers */}
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

        {/* Test Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #D4A017'
          }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Draft Tests</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#D4A017' }}>
              {tests.filter(t => t.status === 'draft').length}
            </div>
          </div>
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #0066CC'
          }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Submitted</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0066CC' }}>
              {tests.filter(t => t.status === 'submitted').length}
            </div>
          </div>
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #228B22'
          }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Approved</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#228B22' }}>
              {tests.filter(t => t.status === 'approved').length}
            </div>
          </div>
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #0C5460'
          }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Scheduled</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0C5460' }}>
              {tests.filter(t => t.status === 'scheduled').length}
            </div>
          </div>
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #155724'
          }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Active</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#155724' }}>
              {tests.filter(t => t.status === 'active').length}
            </div>
          </div>
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #383D41'
          }}>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>Completed</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#383D41' }}>
              {tests.filter(t => t.status === 'completed').length}
            </div>
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
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {filteredTests.map(test => {
              const statusInfo = getStatusColor(test.status);
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
                      
                      {hasBatches && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: '#6B7280',
                          fontSize: '14px'
                        }}>
                          <FiList style={{ flexShrink: 0 }} />
                          <span>Total Students: {
                            test.batches.reduce((total, batch) => total + (batch.students?.length || 0), 0)
                          }</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - CLEANED UP VERSION */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      {/* VIEW/PREVIEW Button - Enhanced */}
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

                      {/* EDIT Button - Only for draft tests */}
                      {canEdit && (
                        <button
                          onClick={() => handleEditTest(test._id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#17a2b8',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          <FiEdit /> Edit Test
                        </button>
                      )}

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

                      {/* ADMIN/SUPER ADMIN ACTIONS - SIMPLIFIED */}
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

                          {/* Complete Test Button - Only show for active tests */}
                          {test.status === 'active' && (
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
                                  
                                  {/* Batch Actions - SIMPLIFIED */}
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
                                          backgroundColor: '#F8F9FA',
                                          borderRadius: '4px'
                                        }}>
                                          <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            backgroundColor: '#E5E7EB',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#6B7280',
                                            fontSize: '12px',
                                            fontWeight: '600'
                                          }}>
                                            {student.name?.[0]?.toUpperCase() || student.username?.[0]?.toUpperCase() || 'S'}
                                          </div>
                                          <div>
                                            <div style={{
                                              fontSize: '13px',
                                              fontWeight: '500',
                                              color: '#374151'
                                            }}>
                                              {student.name || student.username}
                                            </div>
                                            <div style={{
                                              fontSize: '11px',
                                              color: '#6B7280'
                                            }}>
                                              {student.email || student.username}
                                            </div>
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