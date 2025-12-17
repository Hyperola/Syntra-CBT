import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { FiSearch, FiFilter, FiCalendar, FiClock, FiUsers, FiEdit2, FiEye, FiPlus, FiBarChart2 } from 'react-icons/fi';
import { BsCardChecklist } from 'react-icons/bs';

const Tests = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Your brand colors
  const brandColors = {
    primary: '#4B5320', // Army Green
    secondary: '#D4A017', // Golden Rod
    accent: '#2c3e50', // Dark Blue
    light: '#F8F9FA',
    white: '#FFFFFF',
    dark: '#1E293B',
    gray: '#64748B',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  };

  useEffect(() => {
    const fetchTests = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again.');
        setLoading(false);
        navigate('/login');
        return;
      }
      
      try {
        setLoading(true);
        console.log('Tests - Fetching tests for user:', user?.username);
        
        const res = await axios.get('http://localhost:5000/api/tests', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        console.log('Tests - Fetched tests:', res.data);
        
        // Process the data to match expected format
        const processedTests = Array.isArray(res.data) ? res.data.map(test => ({
          ...test,
          _id: test._id || test.id,
          title: test.title || 'Untitled Test',
          subject: test.subject || '',
          class: test.class?.name || test.class || '',
          duration: test.duration || 60,
          questionCount: test.questionCount || 0,
          totalMarks: test.totalMarks || 0,
          passingMarks: test.passingMarks || 0,
          status: test.status || 'draft',
          // Convert batches to availability format for display
          availability: test.batches && test.batches.length > 0 ? {
            start: test.batches[0]?.schedule?.start,
            end: test.batches[0]?.schedule?.end
          } : null,
          createdBy: test.createdBy || {},
          approvedBy: test.approvedBy || null,
          approvedAt: test.approvedAt || null
        })) : [];
        
        setTests(processedTests);
        setError(null);
      } catch (err) {
        console.error('Tests - Error:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to load tests. Please try again.');
        setTests([]);
      } finally {
        setLoading(false);
      }
    };

    if (user && (user.role === 'teacher' || user.role === 'admin' || user.role === 'super_admin')) {
      fetchTests();
    } else {
      setLoading(false);
    }
  }, [user, navigate]);

  // Filter and search tests
  const filteredTests = tests.filter(test => {
    const matchesSearch = !searchTerm || 
      test.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.class?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSubject = !filterSubject || test.subject === filterSubject;
    const matchesClass = !filterClass || test.class === filterClass;
    const matchesStatus = !filterStatus || test.status === filterStatus;

    // Filter by active tab
    const now = new Date();
    if (activeTab === 'active') {
      return test.status === 'active' || 
             (test.availability?.start && new Date(test.availability.start) <= now && 
              test.availability?.end && new Date(test.availability.end) >= now) ||
             (test.status === 'scheduled' && test.isActive);
    } else if (activeTab === 'upcoming') {
      return test.status === 'scheduled' || 
             (test.availability?.start && new Date(test.availability.start) > now) ||
             (test.isUpcoming);
    } else if (activeTab === 'completed') {
      return test.status === 'completed' || 
             (test.availability?.end && new Date(test.availability.end) < now);
    } else if (activeTab === 'draft') {
      return test.status === 'draft';
    } else if (activeTab === 'approved') {
      return test.status === 'approved';
    }

    return matchesSearch && matchesSubject && matchesClass && matchesStatus;
  });

  // Extract unique subjects, classes, and statuses for filters
  const subjectOptions = [...new Set(tests.map(test => test.subject).filter(Boolean))];
  const classOptions = [...new Set(tests.map(test => test.class).filter(Boolean))];
  const statusOptions = ['draft', 'approved', 'scheduled', 'active', 'completed'];

  // Calculate test statistics
  const draftTestsCount = tests.filter(test => test.status === 'draft').length;
  const approvedTestsCount = tests.filter(test => test.status === 'approved').length;
  const activeTestsCount = tests.filter(test => {
    const now = new Date();
    return test.status === 'active' || 
           (test.availability?.start && new Date(test.availability.start) <= now && 
            test.availability?.end && new Date(test.availability.end) >= now);
  }).length;
  const upcomingTestsCount = tests.filter(test => {
    const now = new Date();
    return test.status === 'scheduled' || 
           (test.availability?.start && new Date(test.availability.start) > now);
  }).length;
  const completedTestsCount = tests.filter(test => {
    const now = new Date();
    return test.status === 'completed' || 
           (test.availability?.end && new Date(test.availability.end) < now);
  }).length;

  // Handle test creation
  const handleCreateTest = () => {
    navigate('/teacher/test-creation');
  };

  // Handle test editing
  const handleEditTest = (testId) => {
    navigate(`/teacher/test-creation/${testId}`);
  };

  // Handle test preview
  const handlePreviewTest = (testId) => {
    navigate(`/teacher/test-preview/${testId}`);
  };

  // Handle view results
  const handleViewResults = (testId) => {
    navigate(`/teacher/test-results/${testId}`);
  };

  // Get status badge style
  const getStatusBadge = (test) => {
    const status = test.status || 'draft';
    const now = new Date();
    
    // Check if test is actually active based on schedule
    if (status === 'scheduled' && test.availability) {
      if (test.availability.start && new Date(test.availability.start) <= now &&
          test.availability.end && new Date(test.availability.end) >= now) {
        return { label: 'Active', color: '#10B981' };
      }
      if (test.availability.start && new Date(test.availability.start) > now) {
        return { label: 'Upcoming', color: '#F59E0B' };
      }
    }
    
    switch (status) {
      case 'draft':
        return { label: 'Draft', color: '#64748B' };
      case 'approved':
        return { label: 'Approved', color: '#3B82F6' };
      case 'scheduled':
        return { label: 'Scheduled', color: '#8B5CF6' };
      case 'active':
        return { label: 'Active', color: '#10B981' };
      case 'completed':
        return { label: 'Completed', color: '#EF4444' };
      case 'cancelled':
        return { label: 'Cancelled', color: '#6B7280' };
      default:
        return { label: status, color: '#64748B' };
    }
  };

  // Check user role
  if (!user || (user.role !== 'teacher' && user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div style={styles.accessDenied(brandColors)}>
        <div style={styles.accessDeniedContent}>
          <h3 style={styles.accessDeniedTitle}>Access Restricted</h3>
          <p style={styles.accessDeniedText}>This section is available to teachers and administrators only.</p>
          <button
            onClick={() => navigate('/login')}
            style={styles.primaryButton(brandColors)}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container(brandColors)}>
      {/* Header Section */}
      <div style={styles.header(brandColors)}>
        <div>
          <h1 style={styles.headerTitle}>Test Management</h1>
          <p style={styles.headerSubtitle}>Create, manage, and view results for your assessments</p>
        </div>
        {user.role === 'teacher' && (
          <button
            onClick={handleCreateTest}
            style={styles.createButton(brandColors)}
          >
            <FiPlus /> Create New Test
          </button>
        )}
      </div>

      {/* Stats Overview */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard(brandColors, 'primary')}>
          <div style={styles.statIcon(brandColors.primary)}>
            <BsCardChecklist size={24} />
          </div>
          <div>
            <p style={styles.statLabel}>Total Tests</p>
            <h3 style={styles.statValue}>{tests.length}</h3>
          </div>
        </div>
        <div style={styles.statCard(brandColors, 'gray')}>
          <div style={styles.statIcon(brandColors.gray)}>
            <FiEdit2 size={24} />
          </div>
          <div>
            <p style={styles.statLabel}>Drafts</p>
            <h3 style={styles.statValue}>{draftTestsCount}</h3>
          </div>
        </div>
        <div style={styles.statCard(brandColors, 'accent')}>
          <div style={styles.statIcon(brandColors.accent)}>
            <FiCalendar size={24} />
          </div>
          <div>
            <p style={styles.statLabel}>Active</p>
            <h3 style={styles.statValue}>{activeTestsCount}</h3>
          </div>
        </div>
        <div style={styles.statCard(brandColors, 'success')}>
          <div style={styles.statIcon(brandColors.success)}>
            <FiBarChart2 size={24} />
          </div>
          <div>
            <p style={styles.statLabel}>Completed</p>
            <h3 style={styles.statValue}>{completedTestsCount}</h3>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div style={styles.controlsSection(brandColors)}>
        {/* Tabs */}
        <div style={styles.tabsContainer}>
          <button
            onClick={() => setActiveTab('all')}
            style={activeTab === 'all' ? styles.activeTab(brandColors) : styles.tabButton}
          >
            All Tests ({tests.length})
          </button>
          <button
            onClick={() => setActiveTab('draft')}
            style={activeTab === 'draft' ? styles.activeTab(brandColors) : styles.tabButton}
          >
            Draft ({draftTestsCount})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            style={activeTab === 'approved' ? styles.activeTab(brandColors) : styles.tabButton}
          >
            Approved ({approvedTestsCount})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            style={activeTab === 'active' ? styles.activeTab(brandColors) : styles.tabButton}
          >
            Active ({activeTestsCount})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            style={activeTab === 'upcoming' ? styles.activeTab(brandColors) : styles.tabButton}
          >
            Upcoming ({upcomingTestsCount})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            style={activeTab === 'completed' ? styles.activeTab(brandColors) : styles.tabButton}
          >
            Completed ({completedTestsCount})
          </button>
        </div>

        {/* Search and Filters */}
        <div style={styles.searchFilters}>
          <div style={styles.searchContainer}>
            <FiSearch style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search tests by title, subject, or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput(brandColors)}
            />
          </div>

          <div style={styles.filterGroup}>
            <FiFilter style={styles.filterIcon} />
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              style={styles.selectInput(brandColors)}
            >
              <option value="">All Subjects</option>
              {subjectOptions.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <FiUsers style={styles.filterIcon} />
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              style={styles.selectInput(brandColors)}
            >
              <option value="">All Classes</option>
              {classOptions.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={styles.selectInput(brandColors)}
            >
              <option value="">All Status</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.errorAlert(brandColors)}>
          <p style={styles.errorText}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={styles.retryButton(brandColors)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner(brandColors)}></div>
          <p style={styles.loadingText}>Loading tests...</p>
        </div>
      ) : (
        /* Tests Grid */
        <div style={styles.testsGrid}>
          {filteredTests.length === 0 ? (
            <div style={styles.emptyState(brandColors)}>
              <div style={styles.emptyIcon}>
                <BsCardChecklist size={48} />
              </div>
              <h3 style={styles.emptyTitle}>No Tests Found</h3>
              <p style={styles.emptyText}>
                {searchTerm || filterSubject || filterClass || filterStatus
                  ? 'No tests match your current filters.' 
                  : 'No tests available yet.'}
              </p>
              <div style={styles.emptyActions}>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterSubject('');
                    setFilterClass('');
                    setFilterStatus('');
                    setActiveTab('all');
                  }}
                  style={styles.secondaryButton(brandColors)}
                >
                  Clear Filters
                </button>
                {user.role === 'teacher' && (
                  <button
                    onClick={handleCreateTest}
                    style={styles.primaryButton(brandColors)}
                  >
                    <FiPlus /> Create New Test
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredTests.map(test => {
              const statusBadge = getStatusBadge(test);
              
              return (
                <div key={test._id} style={styles.testCard(brandColors)}>
                  <div style={styles.testCardHeader}>
                    <div style={styles.testIcon}>
                      <BsCardChecklist size={20} />
                    </div>
                    <div style={styles.testInfo}>
                      <h3 style={styles.testTitle}>{test.title || 'Untitled Test'}</h3>
                      <div style={styles.testMeta}>
                        <span style={styles.testSubject}>{test.subject || 'No Subject'}</span>
                        <span style={styles.testSeparator}>•</span>
                        <span style={styles.testClass}>{test.class || 'No Class'}</span>
                      </div>
                    </div>
                    <div style={styles.testStatus({ color: statusBadge.color })}>
                      {statusBadge.label}
                    </div>
                  </div>

                  <div style={styles.testDetails}>
                    <div style={styles.testDetail}>
                      <FiClock size={14} />
                      <span>{test.duration || 60} min</span>
                    </div>
                    <div style={styles.testDetail}>
                      <BsCardChecklist size={14} />
                      <span>{test.questionCount || 0} questions</span>
                    </div>
                    <div style={styles.testDetail}>
                      <FiBarChart2 size={14} />
                      <span>{test.totalMarks || 0} marks</span>
                    </div>
                  </div>

                  {test.availability?.start && test.availability?.end && (
                    <div style={styles.testSchedule}>
                      <div style={styles.scheduleDetail}>
                        <FiCalendar size={12} />
                        <span>Start: {new Date(test.availability.start).toLocaleDateString()}</span>
                      </div>
                      <div style={styles.scheduleDetail}>
                        <FiCalendar size={12} />
                        <span>End: {new Date(test.availability.end).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}

                  <div style={styles.testActions}>
                    {user.role === 'teacher' && test.status === 'draft' && (
                      <button
                        onClick={() => handleEditTest(test._id)}
                        style={styles.actionButton(brandColors, 'secondary')}
                      >
                        <FiEdit2 /> Edit
                      </button>
                    )}
                    <button
                      onClick={() => handlePreviewTest(test._id)}
                      style={styles.actionButton(brandColors, 'accent')}
                    >
                      <FiEye /> Preview
                    </button>
                    {(test.status === 'completed' || test.status === 'active') && (
                      <button
                        onClick={() => handleViewResults(test._id)}
                        style={styles.actionButton(brandColors, 'primary')}
                      >
                        <FiBarChart2 /> Results
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// Styles (keep your existing styles, just add the new ones below)
const styles = {
  // ... (keep all your existing styles) ...

  testSchedule: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#F8FAFC',
    borderRadius: '8px',
    fontSize: '12px',
  },

  scheduleDetail: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#64748B',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  testStatus: (status) => ({
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 12px',
    borderRadius: '20px',
    backgroundColor: `${status.color}15`,
    color: status.color,
    whiteSpace: 'nowrap',
    border: `1px solid ${status.color}30`,
  }),
};

// Add CSS animation
if (typeof document !== 'undefined') {
  const styleSheet = document.styleSheets[0];
  const keyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  `;
  try {
    styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
  } catch (e) {
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);
  }
}

export default Tests;