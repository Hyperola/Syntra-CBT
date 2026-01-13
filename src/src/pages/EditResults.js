// pages/editresults.js - REDESIGNED WITH BRAND COLORS
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useResultEditing } from '../hooks/useResultEditing';
import { 
  FiDownload, 
  FiSearch, 
  FiFilter, 
  FiRefreshCw, 
  FiTrash2, 
  FiEye, 
  FiEdit, 
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiAlertTriangle,
  FiUser,
  FiBook,
  FiBookOpen,
  FiCalendar,
  FiBarChart2,
  FiEdit2,
  FiCheckCircle,
  FiClock,
  FiSliders,
  FiGrid,
  FiList,
  FiPercent,
  FiStar,
  FiUsers,
  FiTrendingUp,
  FiTrendingDown,
  FiAward,
  FiActivity,
  FiHelpCircle
} from 'react-icons/fi';

// Brand Colors - MOVED TO TOP
const brandColors = {
  armyGreen: '#4B5320',    // Army Green
  brightGreen: '#7CFC00',   // Bright Green (Lawn Green)
  orange: '#FFA500',        // Orange
  lightBg: '#f9faf7',       // Light background
  cardBg: '#ffffff',        // Card background
  border: '#e5e7de',        // Border color
  textPrimary: '#2c3e1c',   // Primary text
  textSecondary: '#5a6c47', // Secondary text
  textMuted: '#8a9a6e',     // Muted text
  success: '#45a049',       // Success color
  warning: '#ff9800',       // Warning color
  danger: '#f44336',        // Danger color
  info: '#2196f3'           // Info color
};

const EditResults = () => {
  const { user } = useContext(AuthContext);
  const [results, setResults] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [viewMode, setViewMode] = useState('table');
  const [expandedDetails, setExpandedDetails] = useState({});
  const [studentDetails, setStudentDetails] = useState({}); // Cache for student details
  const navigate = useNavigate();

  // Use the reusable editing hook
  const {
    editingResultId,
    editScore,
    setEditScore,
    loading: editingLoading,
    error: editingError,
    success: editingSuccess,
    setError: setEditingError,
    setSuccess: setEditingSuccess,
    startEditing,
    cancelEditing,
    saveScore
  } = useResultEditing();

  useEffect(() => {
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      navigate('/login');
      return;
    }
    fetchTests();
    fetchAllResults();
  }, []);

  // Function to fetch student details by ID
  const fetchStudentDetails = async (studentId) => {
    if (!studentId || studentDetails[studentId]) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/users/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.data.success && response.data.user) {
        setStudentDetails(prev => ({
          ...prev,
          [studentId]: response.data.user
        }));
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
    }
  };

  const fetchTests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/tests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      let testsData = [];
      if (res.data.success && res.data.tests) {
        testsData = res.data.tests;
      } else if (Array.isArray(res.data)) {
        testsData = res.data;
      }
      
      setTests(testsData);
      setEditingError(null);
    } catch (err) {
      console.error('Error fetching tests:', err);
      setEditingError(err.response?.data?.error || 'Failed to load tests.');
    }
  };

  const fetchAllResults = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/results', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: currentPage,
          limit: itemsPerPage,
          subject: filterSubject || undefined,
          class: filterClass || undefined,
          session: filterSession || undefined
        }
      });
      
      console.log('All Results API response:', res.data);
      
      const resultsData = res.data.results || [];
      setResults(resultsData);
      
      // Fetch student details for all results
      resultsData.forEach(result => {
        if (result.userId && typeof result.userId === 'string') {
          fetchStudentDetails(result.userId);
        }
      });
      
      setEditingError(null);
    } catch (err) {
      console.error('Error fetching results:', err);
      setEditingError(err.response?.data?.error || 'Failed to load results.');
    } finally {
      setLoading(false);
    }
  };

  // Improved function to get student name with multiple fallbacks
  const getStudentName = (result) => {
    try {
      // If userId is an object with student details
      if (result.userId && typeof result.userId === 'object') {
        const user = result.userId;
        if (user.name) return user.name;
        if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
        if (user.firstName) return user.firstName;
        if (user.username) return user.username;
      }
      
      // If userId is a string ID, check cached student details
      if (result.userId && typeof result.userId === 'string') {
        const cachedStudent = studentDetails[result.userId];
        if (cachedStudent) {
          if (cachedStudent.name) return cachedStudent.name;
          if (cachedStudent.firstName && cachedStudent.lastName) return `${cachedStudent.firstName} ${cachedStudent.lastName}`;
          if (cachedStudent.firstName) return cachedStudent.firstName;
          if (cachedStudent.username) return cachedStudent.username;
        }
        
        // If not cached yet, trigger fetch and return placeholder
        if (!studentDetails[result.userId]) {
          fetchStudentDetails(result.userId);
        }
        return 'Loading...';
      }
      
      // Check for student data in other fields
      if (result.student) {
        if (typeof result.student === 'object') {
          if (result.student.name) return result.student.name;
          if (result.student.firstName && result.student.lastName) return `${result.student.firstName} ${result.student.lastName}`;
          if (result.student.username) return result.student.username;
        }
      }
      
      // Final fallback
      return 'Unknown Student';
    } catch (error) {
      console.error('Error getting student name:', error);
      return 'Unknown Student';
    }
  };

  // Get student ID
  const getStudentId = (result) => {
    try {
      if (result.userId && typeof result.userId === 'object') {
        return result.userId.studentId || result.userId.username || 'N/A';
      }
      
      if (result.userId && typeof result.userId === 'string') {
        const cachedStudent = studentDetails[result.userId];
        if (cachedStudent) {
          return cachedStudent.studentId || cachedStudent.username || 'N/A';
        }
        return result.userId.substring(0, 8) + '...';
      }
      
      if (result.student && typeof result.student === 'object') {
        return result.student.studentId || result.student.username || 'N/A';
      }
      
      return 'N/A';
    } catch (error) {
      return 'N/A';
    }
  };

  // Get student profile image
  const getStudentProfileImage = (result) => {
    try {
      if (result.userId && typeof result.userId === 'object') {
        return result.userId.profileImage || result.userId.profilePicture;
      }
      
      if (result.userId && typeof result.userId === 'string') {
        const cachedStudent = studentDetails[result.userId];
        if (cachedStudent) {
          return cachedStudent.profileImage || cachedStudent.profilePicture;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleSaveScore = async (resultId) => {
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      setEditingError('Only administrators can edit scores.');
      return;
    }

    await saveScore(resultId, (updatedResultId, newScore) => {
      setResults(results.map(r => 
        r._id === updatedResultId ? { ...r, score: newScore } : r
      ));
    });
  };

  const handleViewTestResults = async (test) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const resultsRes = await axios.get(`http://localhost:5000/api/results/test/${test._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      let resultsData = [];
      if (resultsRes.data.results) {
        resultsData = resultsRes.data.results;
      } else if (Array.isArray(resultsRes.data)) {
        resultsData = resultsRes.data;
      }
      
      // Fetch student details for test results
      resultsData.forEach(result => {
        if (result.userId && typeof result.userId === 'string') {
          fetchStudentDetails(result.userId);
        }
      });
      
      setSelectedTest({ 
        test, 
        results: resultsData,
        statistics: resultsRes.data.statistics || {}
      });
      setEditingError(null);
    } catch (err) {
      console.error('Error fetching test results:', err);
      setEditingError(err.response?.data?.error || 'Failed to load test results.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResult = async (resultId) => {
    if (!window.confirm('Are you sure you want to delete this result? This action cannot be undone.')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/results/${resultId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setResults(results.filter(r => r._id !== resultId));
      
      if (selectedTest) {
        setSelectedTest({
          ...selectedTest,
          results: selectedTest.results.filter(r => r._id !== resultId)
        });
      }
      
      setEditingSuccess('Result deleted successfully.');
      setEditingError(null);
    } catch (err) {
      console.error('Error deleting result:', err);
      setEditingError(err.response?.data?.error || 'Failed to delete result.');
    }
  };

  const closeTestResults = () => {
    setSelectedTest(null);
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Student ID', 'Test', 'Subject', 'Class', 'Session', 'Score', 'Total Marks', 'Percentage', 'Grade', 'Submitted At'];
    const rows = results.map(result => [
      getStudentName(result),
      getStudentId(result),
      result.testId?.title || 'N/A',
      result.subject || 'N/A',
      result.class?.name || result.class || 'N/A',
      result.session || 'N/A',
      result.score || 0,
      result.totalMarks || 0,
      result.percentage || 0,
      result.grade || 'N/A',
      new Date(result.submittedAt).toLocaleString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `results_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterSubject('');
    setFilterClass('');
    setFilterSession('');
    setCurrentPage(1);
  };

  const refreshData = () => {
    fetchTests();
    fetchAllResults();
  };

  const toggleDetails = (resultId) => {
    setExpandedDetails(prev => ({
      ...prev,
      [resultId]: !prev[resultId]
    }));
  };

  // Calculate percentage
  const calculatePercentage = (result) => {
    if (result.percentage !== undefined) {
      return Math.round(result.percentage);
    }
    
    const totalMarks = result.totalMarks || 100;
    if (totalMarks > 0 && result.score !== undefined) {
      return Math.round((result.score / totalMarks) * 100);
    }
    
    return 0;
  };

  // Get percentage color
  const getPercentageColor = (percentage) => {
    if (percentage >= 80) return brandColors.success;
    if (percentage >= 60) return brandColors.brightGreen;
    if (percentage >= 50) return brandColors.orange;
    if (percentage >= 40) return '#ff6b35';
    return brandColors.danger;
  };

  // Get grade color
  const getGradeColor = (grade) => {
    if (!grade) return brandColors.textMuted;
    switch(grade.toUpperCase()) {
      case 'A': return brandColors.success;
      case 'B': return brandColors.brightGreen;
      case 'C': return brandColors.orange;
      case 'D': return '#ff6b35';
      case 'E': 
      case 'F': return brandColors.danger;
      default: return brandColors.textMuted;
    }
  };

  // Filter results based on search and filters
  const filteredResults = results.filter(result => {
    const studentName = getStudentName(result).toLowerCase();
    const studentId = getStudentId(result).toLowerCase();
    
    const matchesSearch = searchTerm === '' || 
      studentName.includes(searchTerm.toLowerCase()) ||
      studentId.includes(searchTerm.toLowerCase()) ||
      (result.testId?.title && result.testId.title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSubject = filterSubject === '' || result.subject === filterSubject;
    const matchesClass = filterClass === '' || 
      result.class?.name === filterClass || 
      result.class === filterClass;
    const matchesSession = filterSession === '' || result.session === filterSession;
    
    return matchesSearch && matchesSubject && matchesClass && matchesSession;
  });

  // Get unique values for filters
  const uniqueSubjects = [...new Set(results.map(r => r.subject).filter(Boolean))];
  const uniqueClasses = [...new Set(results.map(r => r.class?.name || r.class).filter(Boolean))];
  const uniqueSessions = [...new Set(results.map(r => r.session).filter(Boolean))];

  // Calculate statistics
  const stats = {
    totalResults: filteredResults.length,
    averageScore: filteredResults.length > 0 
      ? (filteredResults.reduce((sum, r) => sum + (r.score || 0), 0) / filteredResults.length).toFixed(1)
      : 0,
    averagePercentage: filteredResults.length > 0
      ? (filteredResults.reduce((sum, r) => sum + calculatePercentage(r), 0) / filteredResults.length).toFixed(1)
      : 0,
    highestScore: filteredResults.length > 0
      ? Math.max(...filteredResults.map(r => r.score || 0))
      : 0,
    lowestScore: filteredResults.length > 0
      ? Math.min(...filteredResults.map(r => r.score || 0))
      : 0
  };

  if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
    return (
      <div style={styles.accessDeniedContainer}>
        <div style={styles.accessDeniedCard}>
          <FiAlertTriangle size={32} style={{ color: brandColors.danger }} />
          <h3>Access Denied</h3>
          <p>Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerText}>
            <h1>Edit Results</h1>
            <p>Manage and edit test results with precision</p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            style={styles.backButton}
          >
            <FiChevronLeft size={18} />
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Messages */}
      {editingError && (
        <div style={styles.alertError}>
          <FiAlertTriangle size={18} />
          <div>
            <strong>Error:</strong> {editingError}
          </div>
        </div>
      )}
      
      {editingSuccess && (
        <div style={styles.alertSuccess}>
          <FiCheckCircle size={18} />
          <div>
            <strong>Success:</strong> {editingSuccess}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, background: brandColors.armyGreen}}>
            <FiBook size={24} />
          </div>
          <div style={styles.statContent}>
            <h3>{stats.totalResults}</h3>
            <p>Total Results</p>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, background: brandColors.brightGreen}}>
            <FiTrendingUp size={24} />
          </div>
          <div style={styles.statContent}>
            <h3>{stats.averageScore}</h3>
            <p>Average Score</p>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, background: brandColors.orange}}>
            <FiPercent size={24} />
          </div>
          <div style={styles.statContent}>
            <h3>{stats.averagePercentage}%</h3>
            <p>Average %</p>
          </div>
        </div>
        
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, background: brandColors.info}}>
            <FiAward size={24} />
          </div>
          <div style={styles.statContent}>
            <h3>{stats.highestScore}</h3>
            <p>Highest Score</p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div style={styles.filtersSection}>
        <div style={styles.filtersHeader}>
          <h3><FiFilter size={18} /> Filters & Controls</h3>
          <div style={styles.filtersActions}>
            <button
              onClick={refreshData}
              style={styles.btnSecondary}
            >
              <FiRefreshCw /> Refresh
            </button>
            <button
              onClick={resetFilters}
              style={styles.btnSecondary}
            >
              Clear Filters
            </button>
            <button
              onClick={exportToCSV}
              style={styles.btnSuccess}
            >
              <FiDownload /> Export CSV
            </button>
          </div>
        </div>
        
        <div style={styles.filtersGrid}>
          <div style={styles.filterGroup}>
            <label>Search Students</label>
            <div style={styles.searchInputWrapper}>
              <FiSearch style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by student name, ID, or test..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>
          
          <div style={styles.filterGroup}>
            <label>Subject</label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Subjects</option>
              {uniqueSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          
          <div style={styles.filterGroup}>
            <label>Class</label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          
          <div style={styles.filterGroup}>
            <label>Session</label>
            <select
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="">All Sessions</option>
              {uniqueSessions.map(session => (
                <option key={session} value={session}>{session}</option>
              ))}
            </select>
          </div>
        </div>

        {/* View Toggle */}
        <div style={styles.viewToggleSection}>
          <div style={styles.viewToggleButtons}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                ...styles.viewToggleBtn,
                ...(viewMode === 'table' ? styles.viewToggleBtnActive : {})
              }}
            >
              <FiList size={16} />
              Table View
            </button>
            <button
              onClick={() => setViewMode('card')}
              style={{
                ...styles.viewToggleBtn,
                ...(viewMode === 'card' ? styles.viewToggleBtnActive : {})
              }}
            >
              <FiGrid size={16} />
              Card View
            </button>
          </div>
          
          <div style={styles.pageSizeSelector}>
            <span>Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              style={styles.pageSizeSelect}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>results per page</span>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div style={styles.resultsSection}>
        <div style={styles.sectionHeader}>
          <h3>Student Results ({filteredResults.length})</h3>
          <div style={styles.sectionSubtitle}>
            <FiBarChart2 size={16} />
            Showing {Math.min(filteredResults.length, itemsPerPage)} results
          </div>
        </div>
        
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner}></div>
            <p>Loading results...</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div style={styles.emptyState}>
            <FiBook size={48} style={{ color: brandColors.textMuted }} />
            <h4>No results found</h4>
            <p>Try adjusting your filters or search terms</p>
            <button onClick={resetFilters} style={styles.btnPrimary}>
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <>
            {/* Table View */}
            <div style={styles.tableContainer}>
              <table style={styles.resultsTable}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Test</th>
                    <th>Subject</th>
                    <th>Class</th>
                    <th>Score</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((result) => {
                    const percentage = calculatePercentage(result);
                    const gradeColor = getGradeColor(result.grade);
                    const percentageColor = getPercentageColor(percentage);
                    
                    return (
                      <tr key={result._id} style={styles.tableRow}>
                        <td style={styles.tableCell}>
                          <div style={styles.studentCell}>
                            <div style={styles.studentAvatar}>
                              <FiUser size={16} />
                            </div>
                            <div style={styles.studentInfo}>
                              <strong>{getStudentName(result)}</strong>
                              <span style={styles.studentId}>
                                {getStudentId(result)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.testInfo}>
                            {result.testId?.title || 'Unknown Test'}
                            {result.testId?.type && (
                              <span style={styles.testType}>{result.testId.type}</span>
                            )}
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={styles.subjectBadge}>
                            {result.subject || 'N/A'}
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={styles.classBadge}>
                            {result.class?.name || result.class || 'N/A'}
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          {editingResultId === result._id ? (
                            <div style={styles.scoreEditor}>
                              <input
                                type="number"
                                value={editScore}
                                onChange={(e) => setEditScore(e.target.value)}
                                min="0"
                                max={result.totalMarks || result.testId?.totalMarks || 100}
                                style={styles.scoreInput}
                              />
                              <div style={styles.scoreActions}>
                                <button
                                  onClick={() => handleSaveScore(result._id)}
                                  disabled={editingLoading}
                                  style={styles.btnSuccess}
                                >
                                  {editingLoading ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  style={styles.btnSecondary}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={styles.scoreDisplay}>
                              <div style={styles.scoreValue}>
                                {result.score || 0} / {result.totalMarks || result.testId?.totalMarks || 100}
                              </div>
                              <div style={styles.scoreDetails}>
                                <span style={{...styles.scorePercentage, color: percentageColor}}>
                                  {percentage}%
                                </span>
                                {result.grade && (
                                  <span style={{...styles.scoreGrade, background: gradeColor}}>
                                    {result.grade}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.dateCell}>
                            <div style={styles.dateMain}>
                              {new Date(result.submittedAt).toLocaleDateString()}
                            </div>
                            <div style={styles.dateTime}>
                              {new Date(result.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.actionButtons}>
                            <button
                              onClick={() => handleViewTestResults({ 
                                _id: result.testId?._id || result.testId, 
                                title: result.testId?.title || 'Unknown Test' 
                              })}
                              style={styles.btnPrimary}
                              title="View test results"
                            >
                              <FiEye size={14} />
                            </button>
                            <button
                              onClick={() => startEditing(result)}
                              style={styles.btnWarning}
                              title="Edit score"
                              disabled={editingResultId === result._id}
                            >
                              <FiEdit size={14} />
                            </button>
                            {user.role === 'super_admin' && (
                              <button
                                onClick={() => handleDeleteResult(result._id)}
                                style={styles.btnDanger}
                                title="Delete result"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* Card View */
          <div style={styles.cardsGrid}>
            {filteredResults.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((result) => {
              const percentage = calculatePercentage(result);
              const gradeColor = getGradeColor(result.grade);
              const percentageColor = getPercentageColor(percentage);
              
              return (
                <div key={result._id} style={styles.resultCard}>
                  <div style={styles.cardHeader}>
                    <div style={styles.cardStudent}>
                      <div style={styles.studentAvatarLarge}>
                        <FiUser size={20} />
                      </div>
                      <div style={styles.studentInfoLarge}>
                        <h4>{getStudentName(result)}</h4>
                        <p>{getStudentId(result)}</p>
                      </div>
                    </div>
                    <div style={styles.cardStatus}>
                      {result.passed ? (
                        <span style={styles.statusPassed}>Passed</span>
                      ) : (
                        <span style={styles.statusFailed}>Failed</span>
                      )}
                    </div>
                  </div>
                  
                  <div style={styles.cardContent}>
                    <div style={styles.cardRow}>
                      <div style={styles.cardLabel}>
                        <FiBook size={14} />
                        <span>Test:</span>
                      </div>
                      <div style={styles.cardValue}>{result.testId?.title || 'Unknown'}</div>
                    </div>
                    
                    <div style={styles.cardRow}>
                      <div style={styles.cardLabel}>
                        <FiBookOpen size={14} />
                        <span>Subject:</span>
                      </div>
                      <div style={styles.cardValue}>{result.subject || 'N/A'}</div>
                    </div>
                    
                    <div style={styles.cardRow}>
                      <div style={styles.cardLabel}>
                        <FiGrid size={14} />
                        <span>Class:</span>
                      </div>
                      <div style={styles.cardValue}>{result.class?.name || result.class || 'N/A'}</div>
                    </div>
                    
                    <div style={styles.cardRow}>
                      <div style={styles.cardLabel}>
                        <FiCalendar size={14} />
                        <span>Session:</span>
                      </div>
                      <div style={styles.cardValue}>{result.session || 'N/A'}</div>
                    </div>
                    
                    <div style={styles.cardScoreSection}>
                      <div style={styles.scoreMain}>
                        <div style={styles.scoreLabel}>Score</div>
                        <div style={styles.scoreValueLarge}>
                          {result.score || 0} / {result.totalMarks || 100}
                        </div>
                      </div>
                      <div style={styles.scoreDetails}>
                        <div style={{...styles.scorePercentageLarge, color: percentageColor}}>
                          <FiPercent size={14} />
                          {percentage}%
                        </div>
                        {result.grade && (
                          <div style={{...styles.scoreGradeLarge, color: gradeColor}}>
                            <FiStar size={14} />
                            {result.grade}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div style={styles.cardFooter}>
                    <div style={styles.cardDate}>
                      <FiClock size={12} />
                      {new Date(result.submittedAt).toLocaleDateString()}
                    </div>
                    <div style={styles.cardActions}>
                      <button
                        onClick={() => handleViewTestResults({ 
                          _id: result.testId?._id || result.testId, 
                          title: result.testId?.title || 'Unknown Test' 
                        })}
                        style={styles.btnPrimary}
                      >
                        <FiEye size={14} />
                      </button>
                      <button
                        onClick={() => startEditing(result)}
                        style={styles.btnWarning}
                        disabled={editingResultId === result._id}
                      >
                        <FiEdit size={14} />
                      </button>
                      {user.role === 'super_admin' && (
                        <button
                          onClick={() => handleDeleteResult(result._id)}
                          style={styles.btnDanger}
                        >
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {editingResultId === result._id && (
                    <div style={styles.cardEditor}>
                      <div style={styles.editorHeader}>
                        <FiEdit2 size={16} />
                        <span>Edit Score</span>
                      </div>
                      <div style={styles.editorBody}>
                        <input
                          type="number"
                          value={editScore}
                          onChange={(e) => setEditScore(e.target.value)}
                          min="0"
                          max={result.totalMarks || 100}
                          style={styles.editorInput}
                          placeholder="Enter score"
                        />
                        <div style={styles.editorActions}>
                          <button
                            onClick={() => handleSaveScore(result._id)}
                            disabled={editingLoading}
                            style={styles.btnSuccess}
                          >
                            {editingLoading ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={cancelEditing}
                            style={styles.btnSecondary}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Pagination */}
        {filteredResults.length > itemsPerPage && (
          <div style={styles.pagination}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={styles.paginationBtn}
            >
              <FiChevronLeft size={18} />
              Previous
            </button>
            
            <div style={styles.paginationInfo}>
              Page {currentPage} of {Math.ceil(filteredResults.length / itemsPerPage)}
            </div>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredResults.length / itemsPerPage), p + 1))}
              disabled={currentPage >= Math.ceil(filteredResults.length / itemsPerPage)}
              style={styles.paginationBtn}
            >
              Next
              <FiChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Test Results Modal */}
      {selectedTest && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContainer}>
            <div style={styles.modalHeader}>
              <h3>
                <FiBarChart2 size={20} />
                Results for: {selectedTest.test.title}
              </h3>
              <button
                onClick={closeTestResults}
                style={styles.modalClose}
              >
                <FiX size={24} />
              </button>
            </div>
            
            {selectedTest.statistics && Object.keys(selectedTest.statistics).length > 0 && (
              <div style={styles.modalStats}>
                <h4>Test Statistics</h4>
                <div style={styles.statsGridSmall}>
                  <div style={styles.statItem}>
                    <div style={styles.statNumber}>{selectedTest.statistics.totalStudents || 0}</div>
                    <div style={styles.statLabel}>Total Students</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={{...styles.statNumber, color: brandColors.success}}>
                      {selectedTest.statistics.averageScore || 0}%
                    </div>
                    <div style={styles.statLabel}>Average Score</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={{...styles.statNumber, color: brandColors.brightGreen}}>
                      {selectedTest.statistics.highestScore || 0}%
                    </div>
                    <div style={styles.statLabel}>Highest Score</div>
                  </div>
                  <div style={styles.statItem}>
                    <div style={{...styles.statNumber, color: brandColors.danger}}>
                      {selectedTest.statistics.lowestScore || 0}%
                    </div>
                    <div style={styles.statLabel}>Lowest Score</div>
                  </div>
                </div>
              </div>
            )}
            
            <div style={styles.modalContent}>
              {selectedTest.results.length === 0 ? (
                <div style={styles.emptyState}>
                  <FiBook size={32} style={{ color: brandColors.textMuted }} />
                  <p>No results found for this test.</p>
                </div>
              ) : (
                selectedTest.results.map((result) => {
                  const percentage = calculatePercentage(result);
                  
                  return (
                    <div key={result._id} style={styles.modalResultItem}>
                      <div style={styles.modalResultHeader}>
                        <div style={styles.modalStudentInfo}>
                          <strong>{getStudentName(result)}</strong>
                          <div style={styles.modalScoreInfo}>
                            Score: {result.score} / {result.totalMarks}
                            <span style={styles.modalPercentage}>
                              ({percentage}%)
                            </span>
                          </div>
                        </div>
                        <div style={styles.modalResultActions}>
                          <button
                            onClick={() => startEditing(result)}
                            style={styles.btnWarning}
                            disabled={editingResultId === result._id}
                          >
                            <FiEdit size={14} /> Edit Score
                          </button>
                          {user.role === 'super_admin' && (
                            <button
                              onClick={() => handleDeleteResult(result._id)}
                              style={styles.btnDanger}
                            >
                              <FiTrash2 size={14} /> Delete
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {expandedDetails[result._id] && result.questionAnalysis && result.questionAnalysis.length > 0 && (
                        <div style={styles.questionAnalysis}>
                          <h5>Question Analysis</h5>
                          <div style={styles.questionsGrid}>
                            {result.questionAnalysis.map((qa, index) => (
                              <div key={index} style={{
                                ...styles.questionCard,
                                borderLeftColor: qa.isCorrect ? brandColors.success : brandColors.danger,
                                background: qa.isCorrect ? 'rgba(69, 160, 73, 0.05)' : 'rgba(244, 67, 54, 0.05)'
                              }}>
                                <div style={styles.questionHeader}>
                                  <span style={styles.questionNumber}>Q{index + 1}</span>
                                  <span style={{
                                    ...styles.questionStatus,
                                    background: qa.isCorrect ? 'rgba(69, 160, 73, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                                    color: qa.isCorrect ? brandColors.success : brandColors.danger
                                  }}>
                                    {qa.isCorrect ? 'Correct' : 'Incorrect'}
                                  </span>
                                </div>
                                <div style={styles.questionText}>
                                  {qa.questionText?.substring(0, 80)}...
                                </div>
                                <div style={styles.questionAnswers}>
                                  <div style={styles.answerRow}>
                                    <span style={styles.answerLabel}>Selected:</span>
                                    <span style={{...styles.answerValue, color: brandColors.danger}}>{qa.selectedAnswer}</span>
                                  </div>
                                  <div style={styles.answerRow}>
                                    <span style={styles.answerLabel}>Correct:</span>
                                    <span style={{...styles.answerValue, color: brandColors.success}}>{qa.correctAnswer}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div style={styles.modalResultFooter}>
                        <button
                          onClick={() => toggleDetails(result._id)}
                          style={styles.btnSecondary}
                        >
                          {expandedDetails[result._id] ? 'Hide Details' : 'Show Details'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Edit Score Section in Modal */}
            {editingResultId && selectedTest.results.some(r => r._id === editingResultId) && (
              <div style={styles.modalEditor}>
                <div style={styles.editorInfo}>
                  <strong>Editing Score for:</strong> {
                    getStudentName(selectedTest.results.find(r => r._id === editingResultId))
                  }
                </div>
                <div style={styles.editorControls}>
                  <input
                    type="number"
                    value={editScore}
                    onChange={(e) => setEditScore(e.target.value)}
                    min="0"
                    max={selectedTest.results.find(r => r._id === editingResultId)?.totalMarks || 100}
                    style={styles.modalScoreInput}
                  />
                  <button
                    onClick={() => handleSaveScore(editingResultId)}
                    disabled={editingLoading}
                    style={styles.btnSuccess}
                  >
                    {editingLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    style={styles.btnSecondary}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Styles Object - Now properly references brandColors
const styles = {
  container: {
    minHeight: '100vh',
    background: brandColors.lightBg,
    padding: '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  header: {
    background: brandColors.armyGreen,
    color: 'white',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '24px',
    boxShadow: '0 4px 12px rgba(75, 83, 32, 0.2)'
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerText: {
    flex: 1
  },
  backButton: {
    background: brandColors.orange,
    color: brandColors.armyGreen,
    border: 'none',
    padding: '12px 24px',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  },
  alertError: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    borderRadius: '10px',
    marginBottom: '24px',
    fontSize: '14px',
    background: '#ffebee',
    color: '#c62828',
    borderLeft: `4px solid ${brandColors.danger}`
  },
  alertSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    borderRadius: '10px',
    marginBottom: '24px',
    fontSize: '14px',
    background: '#e8f5e8',
    color: '#2e7d32',
    borderLeft: `4px solid ${brandColors.success}`
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '24px'
  },
  statCard: {
    background: brandColors.cardBg,
    border: `2px solid ${brandColors.border}`,
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'transform 0.3s ease'
  },
  statIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    flexShrink: 0
  },
  statContent: {
    flex: 1
  },
  filtersSection: {
    background: brandColors.cardBg,
    border: `2px solid ${brandColors.border}`,
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  filtersHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: `2px solid ${brandColors.border}`
  },
  filtersActions: {
    display: 'flex',
    gap: '12px'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '24px'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  searchInputWrapper: {
    position: 'relative'
  },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: brandColors.textMuted,
    fontSize: '16px'
  },
  searchInput: {
    width: '100%',
    padding: '14px 16px 14px 44px',
    border: `2px solid ${brandColors.border}`,
    borderRadius: '10px',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    background: brandColors.lightBg,
    color: brandColors.textPrimary
  },
  filterSelect: {
    width: '100%',
    padding: '14px 16px',
    border: `2px solid ${brandColors.border}`,
    borderRadius: '10px',
    fontSize: '14px',
    background: brandColors.lightBg,
    color: brandColors.textPrimary,
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  viewToggleSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '20px',
    borderTop: `2px solid ${brandColors.border}`
  },
  viewToggleButtons: {
    display: 'flex',
    gap: '10px'
  },
  viewToggleBtn: {
    padding: '12px 20px',
    border: `2px solid ${brandColors.border}`,
    borderRadius: '10px',
    background: brandColors.lightBg,
    color: brandColors.textSecondary,
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.3s ease'
  },
  viewToggleBtnActive: {
    background: brandColors.armyGreen,
    color: 'white',
    borderColor: brandColors.armyGreen,
    boxShadow: '0 2px 8px rgba(75, 83, 32, 0.2)'
  },
  pageSizeSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    color: brandColors.textSecondary
  },
  pageSizeSelect: {
    padding: '10px 14px',
    border: `2px solid ${brandColors.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    background: brandColors.lightBg,
    color: brandColors.textPrimary,
    cursor: 'pointer'
  },
  resultsSection: {
    background: brandColors.cardBg,
    border: `2px solid ${brandColors.border}`,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  sectionHeader: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: `2px solid ${brandColors.border}`
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px'
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: `4px solid ${brandColors.border}`,
    borderTop: `4px solid ${brandColors.armyGreen}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: brandColors.textMuted
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '10px',
    border: `2px solid ${brandColors.border}`
  },
  resultsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1000px'
  },
  tableRow: {
    borderBottom: `2px solid ${brandColors.border}`,
    transition: 'background-color 0.2s ease'
  },
  tableCell: {
    padding: '18px 16px',
    fontSize: '14px',
    color: brandColors.textPrimary
  },
  studentCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  studentAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: brandColors.armyGreen,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    flexShrink: 0
  },
  studentInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  studentId: {
    fontSize: '12px',
    color: brandColors.textMuted,
    background: brandColors.lightBg,
    padding: '4px 10px',
    borderRadius: '6px',
    display: 'inline-block',
    width: 'fit-content'
  },
  testInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  testType: {
    fontSize: '12px',
    color: brandColors.orange,
    background: 'rgba(255, 165, 0, 0.1)',
    padding: '4px 10px',
    borderRadius: '6px',
    width: 'fit-content',
    fontWeight: '600'
  },
  subjectBadge: {
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    width: 'fit-content',
    display: 'inline-block',
    background: 'rgba(75, 83, 32, 0.1)',
    color: brandColors.armyGreen
  },
  classBadge: {
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    width: 'fit-content',
    display: 'inline-block',
    background: 'rgba(255, 165, 0, 0.1)',
    color: '#cc8400'
  },
  scoreDisplay: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  scoreValue: {
    fontWeight: '700',
    fontSize: '16px',
    color: brandColors.textPrimary
  },
  scoreDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '13px'
  },
  scoreEditor: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  scoreInput: {
    padding: '10px 14px',
    border: `2px solid ${brandColors.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    width: '100px',
    background: brandColors.lightBg,
    color: brandColors.textPrimary
  },
  scoreActions: {
    display: 'flex',
    gap: '10px'
  },
  dateCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  dateMain: {
    fontSize: '14px',
    color: brandColors.textPrimary,
    fontWeight: '500'
  },
  dateTime: {
    fontSize: '12px',
    color: brandColors.textMuted
  },
  actionButtons: {
    display: 'flex',
    gap: '10px'
  },
  btnPrimary: {
    background: brandColors.armyGreen,
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  },
  btnSecondary: {
    background: brandColors.lightBg,
    color: brandColors.textSecondary,
    border: `2px solid ${brandColors.border}`,
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  },
  btnSuccess: {
    background: brandColors.success,
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  },
  btnWarning: {
    background: brandColors.orange,
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  },
  btnDanger: {
    background: brandColors.danger,
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '24px'
  },
  resultCard: {
    background: brandColors.cardBg,
    border: `2px solid ${brandColors.border}`,
    borderRadius: '12px',
    padding: '24px',
    transition: 'all 0.3s ease'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px'
  },
  cardStudent: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  studentAvatarLarge: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: brandColors.armyGreen,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    flexShrink: 0
  },
  studentInfoLarge: {
    display: 'flex',
    flexDirection: 'column'
  },
  cardStatus: {
    fontSize: '12px',
    fontWeight: '600'
  },
  statusPassed: {
    background: 'rgba(69, 160, 73, 0.1)',
    color: brandColors.success,
    padding: '6px 12px',
    borderRadius: '6px'
  },
  statusFailed: {
    background: 'rgba(244, 67, 54, 0.1)',
    color: brandColors.danger,
    padding: '6px 12px',
    borderRadius: '6px'
  },
  cardContent: {
    marginBottom: '20px'
  },
  cardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: `1px solid ${brandColors.border}`
  },
  cardLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: brandColors.textSecondary,
    fontSize: '13px'
  },
  cardValue: {
    color: brandColors.textPrimary,
    fontWeight: '500',
    fontSize: '13px'
  },
  cardScoreSection: {
    marginTop: '20px',
    padding: '16px',
    background: brandColors.lightBg,
    borderRadius: '10px'
  },
  scoreMain: {
    textAlign: 'center',
    marginBottom: '12px'
  },
  scoreLabel: {
    fontSize: '12px',
    color: brandColors.textSecondary,
    marginBottom: '4px'
  },
  scoreValueLarge: {
    fontSize: '24px',
    fontWeight: '700',
    color: brandColors.textPrimary
  },
  scoreDetails: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    alignItems: 'center'
  },
  scorePercentageLarge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: '600'
  },
  scoreGradeLarge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: '600'
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: `2px solid ${brandColors.border}`
  },
  cardDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: brandColors.textMuted
  },
  cardActions: {
    display: 'flex',
    gap: '8px'
  },
  cardEditor: {
    marginTop: '20px',
    padding: '16px',
    background: brandColors.lightBg,
    borderRadius: '10px',
    border: `2px solid ${brandColors.border}`
  },
  editorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
    color: brandColors.textPrimary,
    fontWeight: '600'
  },
  editorBody: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  editorInput: {
    flex: 1,
    padding: '10px 14px',
    border: `2px solid ${brandColors.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white',
    color: brandColors.textPrimary
  },
  editorActions: {
    display: 'flex',
    gap: '8px'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px',
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: `2px solid ${brandColors.border}`
  },
  paginationBtn: {
    background: brandColors.lightBg,
    color: brandColors.textSecondary,
    border: `2px solid ${brandColors.border}`,
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  },
  paginationInfo: {
    color: brandColors.textSecondary,
    fontSize: '14px',
    fontWeight: '500'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContainer: {
    background: brandColors.cardBg,
    borderRadius: '12px',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
  },
  modalHeader: {
    background: brandColors.armyGreen,
    color: 'white',
    padding: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalClose: {
    background: 'transparent',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background 0.2s ease'
  },
  modalStats: {
    padding: '20px 24px',
    borderBottom: `2px solid ${brandColors.border}`
  },
  statsGridSmall: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginTop: '16px'
  },
  statItem: {
    textAlign: 'center'
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '4px'
  },
  statLabel: {
    fontSize: '12px',
    color: brandColors.textSecondary
  },
  modalContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px'
  },
  modalResultItem: {
    background: brandColors.lightBg,
    border: `2px solid ${brandColors.border}`,
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '16px',
    transition: 'all 0.3s ease'
  },
  modalResultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  modalStudentInfo: {
    flex: 1
  },
  modalScoreInfo: {
    fontSize: '14px',
    color: brandColors.textSecondary,
    marginTop: '4px'
  },
  modalPercentage: {
    marginLeft: '8px',
    fontWeight: '600'
  },
  modalResultActions: {
    display: 'flex',
    gap: '10px'
  },
  modalResultFooter: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: `1px solid ${brandColors.border}`
  },
  questionAnalysis: {
    marginTop: '20px',
    padding: '20px',
    background: 'white',
    borderRadius: '8px',
    border: `1px solid ${brandColors.border}`
  },
  questionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '12px',
    marginTop: '16px'
  },
  questionCard: {
    padding: '16px',
    borderRadius: '8px',
    borderLeft: `4px solid ${brandColors.border}`
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  questionNumber: {
    fontWeight: '600',
    color: brandColors.textPrimary
  },
  questionStatus: {
    fontSize: '11px',
    padding: '3px 8px',
    borderRadius: '4px',
    fontWeight: '600'
  },
  questionText: {
    fontSize: '12px',
    color: brandColors.textSecondary,
    marginBottom: '12px',
    lineHeight: '1.4'
  },
  questionAnswers: {
    fontSize: '11px'
  },
  answerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px'
  },
  answerLabel: {
    color: brandColors.textMuted
  },
  answerValue: {
    fontWeight: '600'
  },
  modalEditor: {
    padding: '20px 24px',
    background: brandColors.lightBg,
    borderTop: `2px solid ${brandColors.border}`
  },
  editorInfo: {
    marginBottom: '12px',
    color: brandColors.textPrimary,
    fontSize: '14px'
  },
  editorControls: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  modalScoreInput: {
    padding: '10px 14px',
    border: `2px solid ${brandColors.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    width: '100px',
    background: 'white',
    color: brandColors.textPrimary
  },
  accessDeniedContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  accessDeniedCard: {
    background: 'rgba(255, 255, 255, 0.95)',
    color: brandColors.danger,
    padding: '40px',
    borderRadius: '20px',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    maxWidth: '400px',
    width: '90%'
  }
};

// Add CSS animation for spinner
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

// Add hover effects for buttons
const addButtonHoverEffects = () => {
  const buttonStyles = {
    '.btn-primary:hover': {
      background: '#3a431a',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(75, 83, 32, 0.2)'
    },
    '.btn-secondary:hover': {
      background: brandColors.border,
      transform: 'translateY(-1px)'
    },
    '.btn-success:hover': {
      background: '#3d8b40',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(69, 160, 73, 0.3)'
    },
    '.btn-warning:hover': {
      background: '#cc8400',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(255, 165, 0, 0.3)'
    },
    '.btn-danger:hover': {
      background: '#d32f2f',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)'
    },
    '.result-card:hover': {
      borderColor: brandColors.armyGreen,
      boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
      transform: 'translateY(-2px)'
    },
    '.stat-card:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    '.modal-result-item:hover': {
      borderColor: brandColors.armyGreen,
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    },
    '.back-button:hover': {
      background: '#ff8c00',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(255, 165, 0, 0.3)'
    }
  };

  Object.entries(buttonStyles).forEach(([selector, styles]) => {
    const rule = `${selector} { ${Object.entries(styles).map(([prop, value]) => `${prop}: ${value}`).join('; ')} }`;
    styleSheet.insertRule(rule, styleSheet.cssRules.length);
  });
};

// Initialize hover effects
addButtonHoverEffects();

export default EditResults;