// Teacher TestResults page - REDESIGNED WITH IMPROVED COLORS
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { 
  FiDownload, 
  FiSearch, 
  FiArrowUp, 
  FiArrowDown, 
  FiChevronDown, 
  FiChevronUp, 
  FiArrowLeft,
  FiRefreshCw,
  FiEdit,
  FiUser,
  FiBarChart2,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiPercent,
  FiAward,
  FiTrendingUp,
  FiTrendingDown,
  FiEye,
  FiCalendar,
  FiChevronRight,
  FiFileText,
  FiUsers,
  FiBook,
  FiHash,
  FiFilter
} from 'react-icons/fi';

const TestResults = () => {
  const { testId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedResult, setExpandedResult] = useState(null);
  const [editingResultId, setEditingResultId] = useState(null);
  const [editScore, setEditScore] = useState('');
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({
    average: 0,
    highest: 0,
    lowest: 100,
    passRate: 0,
    totalStudents: 0,
    aboveAverage: 0
  });
  const [activeFilter, setActiveFilter] = useState('all');

  // Enhanced color palette
  const colors = {
    // Primary palette
    primary: '#4B5320',        // Army Green
    primaryLight: '#6B7A32',   // Lighter green
    primaryLighter: '#8B9A44', // Even lighter
    primaryDark: '#3A431A',    // Darker green
    
    // Secondary palette
    secondary: '#D4A017',      // Golden rod
    secondaryLight: '#E8B850',
    secondaryLighter: '#F0D080',
    secondaryDark: '#B8860B',
    
    // Status colors
    success: '#28a745',
    successLight: '#4cd964',
    successLighter: 'rgba(76, 217, 100, 0.1)',
    warning: '#ffc107',
    warningLight: '#ffd54f',
    warningLighter: 'rgba(255, 213, 79, 0.1)',
    danger: '#dc3545',
    dangerLight: '#ff6b6b',
    dangerLighter: 'rgba(255, 107, 107, 0.1)',
    info: '#17a2b8',
    infoLight: '#4dc0e0',
    infoLighter: 'rgba(77, 192, 224, 0.1)',
    
    // Neutral colors
    dark: '#2c3e50',
    light: '#f8f9fa',
    gray50: '#fafbfc',
    gray100: '#f8f9fa',
    gray200: '#e9ecef',
    gray300: '#dee2e6',
    gray400: '#ced4da',
    gray500: '#adb5bd',
    gray600: '#6c757d',
    gray700: '#495057',
    gray800: '#343a40',
    gray900: '#212529',
    white: '#ffffff',
    
    // Text colors
    textPrimary: '#2c3e50',
    textSecondary: '#5a6c7d',
    textTertiary: '#6c757d',
    
    // Border colors
    border: '#e1e5eb',
    borderLight: '#f0f4f8',
    
    // Background colors
    background: '#f5f7fa',
    cardBackground: '#ffffff',
    
    // Gradients
    gradientPrimary: 'linear-gradient(135deg, #4B5320 0%, #3A431A 100%)',
    gradientSuccess: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
    gradientWarning: 'linear-gradient(135deg, #ffc107 0%, #ffa500 100%)',
    gradientDanger: 'linear-gradient(135deg, #dc3545 0%, #ff6b6b 100%)',
    gradientInfo: 'linear-gradient(135deg, #17a2b8 0%, #4dc0e0 100%)',
    gradientLight: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
  };

  // Typography scale
  const typography = {
    xs: '11px',
    sm: '13px',
    base: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px',
    '4xl': '32px'
  };

  // Main container styles
  const containerStyle = {
    backgroundColor: colors.background,
    minHeight: '100vh',
    padding: '20px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: typography.base,
    lineHeight: '1.5'
  };

  // Loading state styles
  const loadingContainerStyle = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.gradientLight
  };

  const spinnerStyle = {
    width: '56px',
    height: '56px',
    border: '3px solid rgba(75, 83, 32, 0.1)',
    borderTop: '3px solid ' + colors.primary,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  };

  const loadingTextStyle = {
    fontSize: typography.xl,
    fontWeight: '600',
    color: colors.primary,
    margin: '0 0 6px 0'
  };

  const loadingSubtextStyle = {
    fontSize: typography.sm,
    color: colors.textTertiary,
    opacity: '0.8'
  };

  // Error state styles
  const errorContainerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.gradientLight
  };

  const errorCardStyle = {
    backgroundColor: colors.cardBackground,
    padding: '36px',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    textAlign: 'center',
    maxWidth: '480px',
    border: `1px solid ${colors.danger}20`
  };

  const errorActionsStyle = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '24px'
  };

  // Button styles
  const createButtonStyle = (type, disabled = false) => {
    const baseStyle = {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s ease',
      opacity: disabled ? 0.6 : 1,
      fontSize: typography.sm
    };

    const styles = {
      primary: {
        ...baseStyle,
        backgroundColor: colors.primary,
        color: colors.white,
        ':hover': disabled ? {} : {
          backgroundColor: colors.primaryDark,
          transform: 'translateY(-1px)',
          boxShadow: `0 4px 12px ${colors.primary}20`
        }
      },
      secondary: {
        ...baseStyle,
        backgroundColor: colors.secondary,
        color: colors.white,
        ':hover': disabled ? {} : {
          backgroundColor: colors.secondaryDark,
          transform: 'translateY(-1px)',
          boxShadow: `0 4px 12px ${colors.secondary}20`
        }
      },
      success: {
        ...baseStyle,
        backgroundColor: colors.success,
        color: colors.white,
        ':hover': disabled ? {} : {
          backgroundColor: '#1e7e34',
          transform: 'translateY(-1px)',
          boxShadow: `0 4px 12px ${colors.success}20`
        }
      },
      warning: {
        ...baseStyle,
        backgroundColor: colors.warning,
        color: colors.gray900,
        ':hover': disabled ? {} : {
          backgroundColor: '#e0a800',
          transform: 'translateY(-1px)',
          boxShadow: `0 4px 12px ${colors.warning}20`
        }
      },
      danger: {
        ...baseStyle,
        backgroundColor: colors.danger,
        color: colors.white,
        ':hover': disabled ? {} : {
          backgroundColor: '#c82333',
          transform: 'translateY(-1px)',
          boxShadow: `0 4px 12px ${colors.danger}20`
        }
      },
      info: {
        ...baseStyle,
        backgroundColor: colors.info,
        color: colors.white,
        ':hover': disabled ? {} : {
          backgroundColor: '#138496',
          transform: 'translateY(-1px)',
          boxShadow: `0 4px 12px ${colors.info}20`
        }
      },
      outline: {
        ...baseStyle,
        backgroundColor: 'transparent',
        color: colors.primary,
        border: `1px solid ${colors.primary}`,
        ':hover': disabled ? {} : {
          backgroundColor: `${colors.primary}08`,
          transform: 'translateY(-1px)'
        }
      },
      ghost: {
        ...baseStyle,
        backgroundColor: 'transparent',
        color: colors.textSecondary,
        border: `1px solid ${colors.border}`,
        ':hover': disabled ? {} : {
          backgroundColor: colors.gray100,
          transform: 'translateY(-1px)'
        }
      }
    };

    return styles[type] || baseStyle;
  };

  // Card styles
  const cardStyle = {
    backgroundColor: colors.cardBackground,
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 16px rgba(0, 0, 0, 0.06)',
    marginBottom: '20px',
    border: `1px solid ${colors.border}`
  };

  // Navigation bar styles
  const navBarStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '16px'
  };

  const breadcrumbStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: colors.textTertiary,
    fontSize: typography.sm
  };

  // Test header styles
  const testHeaderStyle = {
    background: colors.gradientPrimary,
    borderRadius: '12px',
    padding: '28px',
    marginBottom: '20px',
    color: colors.white,
    boxShadow: '0 4px 24px rgba(75, 83, 32, 0.15)'
  };

  // Stat card styles
  const statCardStyle = (type) => {
    const colorsMap = {
      average: colors.primary,
      pass: colors.success,
      high: colors.secondary,
      above: colors.info,
      low: colors.warning
    };
    
    const bgColor = colorsMap[type] || colors.primary;
    
    return {
      backgroundColor: colors.cardBackground,
      borderRadius: '10px',
      padding: '18px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      transition: 'all 0.2s ease',
      borderLeft: `3px solid ${bgColor}`,
      border: `1px solid ${colors.border}`,
      ':hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        borderColor: bgColor + '40'
      }
    };
  };

  // Table styles
  const tableHeaderStyle = {
    display: 'grid',
    gridTemplateColumns: '2fr 1.5fr 1fr 1fr 120px',
    backgroundColor: colors.gray50,
    padding: '14px 20px',
    borderBottom: `1px solid ${colors.border}`,
    fontWeight: '600',
    color: colors.primary,
    fontSize: typography.sm,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const tableRowStyle = {
    display: 'grid',
    gridTemplateColumns: '2fr 1.5fr 1fr 1fr 120px',
    padding: '18px 20px',
    alignItems: 'center',
    borderBottom: `1px solid ${colors.borderLight}`,
    transition: 'background-color 0.2s ease',
    ':hover': {
      backgroundColor: colors.gray50
    }
  };

  // Student info styles
  const studentInfoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  };

  const studentAvatarStyle = (color) => ({
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: typography.lg,
    color: colors.white,
    backgroundColor: color,
    flexShrink: '0'
  });

  // Grade badge styles
  const gradeBadgeStyle = (percentage) => {
    const getColor = () => {
      if (percentage >= 80) return colors.success;
      if (percentage >= 60) return colors.info;
      if (percentage >= 40) return colors.warning;
      return colors.danger;
    };
    
    const color = getColor();
    
    return {
      width: '36px',
      height: '36px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '700',
      fontSize: typography.base,
      backgroundColor: color + '15',
      color: color,
      border: `1px solid ${color}30`
    };
  };

  // Answer card styles
  const answerCardStyle = (isCorrect) => ({
    backgroundColor: colors.cardBackground,
    borderRadius: '10px',
    padding: '18px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    border: `1px solid ${isCorrect ? colors.success + '30' : colors.danger + '30'}`,
    background: isCorrect ? 
      `linear-gradient(135deg, ${colors.successLighter} 0%, rgba(40, 167, 69, 0.05) 100%)` : 
      `linear-gradient(135deg, ${colors.dangerLighter} 0%, rgba(220, 53, 69, 0.05) 100%)`,
    transition: 'all 0.2s ease',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
    }
  });

  const checkTeacherAccess = (teacher, testData) => {
    if (!teacher || !testData) return false;
    
    if (teacher.role === 'admin' || teacher.role === 'super_admin') {
      return true;
    }
    
    if (testData.createdBy && testData.createdBy._id && 
        testData.createdBy._id.toString() === teacher.id.toString()) {
      return true;
    }
    
    return true;
  };

  useEffect(() => {
    const fetchResults = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again.');
        navigate('/login');
        return;
      }
      
      try {
        const testRes = await axios.get(`http://localhost:5000/api/tests/${testId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const testData = testRes.data.test || testRes.data;
        setTest(testData);
        
        const isTeacher = user.role === 'teacher';
        const isAdmin = user.role === 'admin' || user.role === 'super_admin';
        
        if (!isTeacher && !isAdmin) {
          setError('Access restricted to teachers and administrators only.');
          setLoading(false);
          return;
        }
        
        if (isTeacher) {
          checkTeacherAccess(user, testData);
        }
        
        const resultsRes = await axios.get(`http://localhost:5000/api/results/test/${testId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        let resultsData = [];
        if (resultsRes.data.results) {
          resultsData = resultsRes.data.results;
        } else if (Array.isArray(resultsRes.data)) {
          resultsData = resultsRes.data;
        }
        
        setResults(resultsData);
        calculateStats(resultsData);
        setLoading(false);
      } catch (err) {
        console.error('TestResults - Error:', err);
        
        if (err.response?.status === 403) {
          setError('You do not have permission to view these results.');
        } else if (err.response?.status === 404) {
          setError('Test or results not found.');
        } else {
          setError(err.response?.data?.error || 'Failed to load results.');
        }
        setLoading(false);
      }
    };

    if (user && (user.role === 'teacher' || user.role === 'admin' || user.role === 'super_admin')) {
      fetchResults();
    } else {
      setError('Access restricted to authorized users.');
      setLoading(false);
    }
  }, [testId, user, navigate]);

  const calculateStats = (resultsData) => {
    if (!resultsData.length) return;
    
    const scores = resultsData.map(r => r.score);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const passMark = (test?.totalMarks || 100) * 0.4;
    const passed = scores.filter(score => score >= passMark).length;
    const passRate = (passed / scores.length) * 100;
    const aboveAverage = scores.filter(score => score >= average).length;
    
    setStats({
      average: average.toFixed(1),
      highest,
      lowest,
      passRate: passRate.toFixed(1),
      totalStudents: scores.length,
      aboveAverage
    });
  };

  const handleSaveScore = async (resultId) => {
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      setError('Only administrators can edit scores.');
      return;
    }

    const newScore = parseFloat(editScore);
    if (isNaN(newScore) || newScore < 0) {
      setError('Please enter a valid score.');
      return;
    }

    if (newScore > (test?.totalMarks || 100)) {
      setError(`Score cannot exceed ${test?.totalMarks || 100}.`);
      return;
    }

    setEditing(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/results/${resultId}`, {
        score: newScore
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updatedResults = results.map(r => 
        r._id === resultId ? { ...r, score: newScore } : r
      );
      
      setResults(updatedResults);
      calculateStats(updatedResults);
      setEditingResultId(null);
      setEditScore('');
      setError(null);
    } catch (err) {
      console.error('Error updating score:', err);
      setError(err.response?.data?.error || 'Failed to update score.');
    } finally {
      setEditing(false);
    }
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 80) return colors.success;
    if (percentage >= 60) return colors.info;
    if (percentage >= 40) return colors.warning;
    return colors.danger;
  };

  const getGradeLetter = (percentage) => {
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const getPerformanceIcon = (percentage) => {
    if (percentage >= 70) return <FiTrendingUp />;
    if (percentage >= 40) return <FiTrendingUp />;
    return <FiTrendingDown />;
  };

  const filteredResults = results
    .filter(result => {
      if (!result?.userId) return false;
      
      if (activeFilter === 'passing') {
        const percentage = (result.score / (test?.totalMarks || 100)) * 100;
        return percentage >= 40;
      }
      if (activeFilter === 'failing') {
        const percentage = (result.score / (test?.totalMarks || 100)) * 100;
        return percentage < 40;
      }
      
      return true;
    })
    .filter(result => 
      result?.userId && 
      (result.userId.name || result.userId.username || '')
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const fieldA = sortField === 'score' ? a.score : new Date(a.submittedAt);
      const fieldB = sortField === 'score' ? b.score : new Date(b.submittedAt);
      return sortOrder === 'asc' ? fieldA - fieldB : fieldB - fieldA;
    });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleDetails = (resultId) => {
    setExpandedResult(expandedResult === resultId ? null : resultId);
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Username', 'Score', 'Total Marks', 'Percentage', 'Grade', 'Submitted At'];
    const rows = results.map(result => {
      const percentage = (result.score / (test?.totalMarks || 100)) * 100;
      const grade = percentage >= 80 ? 'A' : 
                    percentage >= 70 ? 'B' : 
                    percentage >= 60 ? 'C' : 
                    percentage >= 40 ? 'D' : 'F';
      
      return [
        result.userId.name || result.userId.username,
        result.userId.username,
        result.score,
        result.totalMarks || test?.totalMarks || 100,
        percentage.toFixed(2),
        grade,
        new Date(result.submittedAt).toLocaleString(),
      ];
    });
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${test?.title || 'test'}_results.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const refreshResults = () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    axios.get(`http://localhost:5000/api/results/test/${testId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then(response => {
      let resultsData = [];
      if (response.data.results) {
        resultsData = response.data.results;
      } else if (Array.isArray(response.data)) {
        resultsData = response.data;
      }
      setResults(resultsData);
      calculateStats(resultsData);
      setLoading(false);
    })
    .catch(err => {
      console.error('Error refreshing results:', err);
      setError('Failed to refresh results.');
      setLoading(false);
    });
  };

  if (loading) {
    return (
      <div style={loadingContainerStyle}>
        <div style={spinnerStyle}></div>
        <p style={loadingTextStyle}>Loading Test Results...</p>
        <p style={loadingSubtextStyle}>Preparing detailed analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={errorContainerStyle}>
        <div style={errorCardStyle}>
          <div style={{ fontSize: '40px', marginBottom: '16px', color: colors.danger }}>⚠️</div>
          <h3 style={{ color: colors.danger, margin: '0 0 12px 0', fontSize: typography.xl }}>
            Unable to Load Results
          </h3>
          <p style={{ color: colors.textSecondary, margin: '0 0 24px 0', lineHeight: '1.6', fontSize: typography.sm }}>{error}</p>
          <div style={errorActionsStyle}>
            <button
              onClick={() => navigate(-1)}
              style={createButtonStyle('primary')}
            >
              <FiArrowLeft /> Go Back
            </button>
            <button
              onClick={refreshResults}
              style={createButtonStyle('outline')}
            >
              <FiRefreshCw /> Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Navigation Bar */}
      <div style={navBarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(-1)}
            style={createButtonStyle('ghost')}
          >
            <FiArrowLeft /> Back
          </button>
          <div style={breadcrumbStyle}>
            <span style={{ color: colors.textTertiary }}>Tests</span>
            <FiChevronRight size={14} />
            <span style={{ color: colors.textSecondary }}>{test?.subject}</span>
            <FiChevronRight size={14} />
            <span style={{ color: colors.primary, fontWeight: '600' }}>{test?.title}</span>
          </div>
        </div>
        <div>
          <div style={{
            backgroundColor: colors.primary + '08',
            color: colors.primary,
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: typography.sm,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: `1px solid ${colors.primary}20`
          }}>
            <FiCalendar size={14} />
            <span>Test: {new Date(test?.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Test Header */}
      <div style={testHeaderStyle}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ 
                fontSize: typography.xs, 
                opacity: '0.9', 
                fontWeight: '500', 
                textTransform: 'uppercase', 
                letterSpacing: '1px',
                display: 'inline-block',
                marginBottom: '8px'
              }}>
                {test?.subject}
              </span>
              <h1 style={{ 
                fontSize: typography['3xl'], 
                fontWeight: '700', 
                margin: '0 0 16px 0',
                lineHeight: '1.2'
              }}>
                {test?.title}
              </h1>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: typography.sm,
                backdropFilter: 'blur(10px)'
              }}>
                <FiUser size={14} /> Class: {test?.class?.name || test?.class}
              </span>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: typography.sm,
                backdropFilter: 'blur(10px)'
              }}>
                <FiClock size={14} /> Duration: {test?.duration} min
              </span>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: typography.sm,
                backdropFilter: 'blur(10px)'
              }}>
                <FiFileText size={14} /> Marks: {test?.totalMarks || 100}
              </span>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: typography.sm,
                backdropFilter: 'blur(10px)'
              }}>
                <FiHash size={14} /> Questions: {test?.questions?.length || 0}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={refreshResults}
              style={createButtonStyle('outline')}
            >
              <FiRefreshCw size={16} />
              <span>Refresh</span>
            </button>
            <button
              onClick={exportToCSV}
              style={createButtonStyle('secondary')}
            >
              <FiDownload size={16} />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div style={cardStyle}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <h2 style={{ 
            margin: 0, 
            color: colors.textPrimary, 
            fontSize: typography.lg, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            fontWeight: '600'
          }}>
            <FiBarChart2 size={18} /> Performance Overview
          </h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{
              backgroundColor: colors.gray100,
              color: colors.primary,
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: typography.sm,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: `1px solid ${colors.border}`
            }}>
              <FiUsers size={14} /> {results.length} Students
            </span>
            <span style={{
              backgroundColor: colors.gray100,
              color: colors.primary,
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: typography.sm,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: `1px solid ${colors.border}`
            }}>
              <FiPercent size={14} /> {test?.totalMarks || 100} Total Marks
            </span>
          </div>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '16px' 
        }}>
          {/* Average Score Card */}
          <div style={statCardStyle('average')}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: colors.white,
              backgroundColor: colors.primary
            }}>
              <FiBarChart2 />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: typography['2xl'], 
                fontWeight: '700', 
                color: colors.textPrimary, 
                lineHeight: '1', 
                marginBottom: '2px' 
              }}>
                {stats.average}
              </div>
              <div style={{ fontSize: typography.sm, color: colors.textTertiary, marginBottom: '6px' }}>
                Average Score
              </div>
              <div style={{ fontSize: typography.xs, fontWeight: '600' }}>
                {parseFloat(stats.average) > (test?.totalMarks || 100) / 2 ? 
                  <span style={{ color: colors.success, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiTrendingUp size={12} /> Good
                  </span> : 
                  <span style={{ color: colors.danger, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiTrendingDown size={12} /> Needs Work
                  </span>
                }
              </div>
            </div>
          </div>
          
          {/* Pass Rate Card */}
          <div style={statCardStyle('pass')}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: colors.white,
              backgroundColor: colors.success
            }}>
              <FiPercent />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: typography['2xl'], 
                fontWeight: '700', 
                color: colors.textPrimary, 
                lineHeight: '1', 
                marginBottom: '2px' 
              }}>
                {stats.passRate}%
              </div>
              <div style={{ fontSize: typography.sm, color: colors.textTertiary, marginBottom: '6px' }}>
                Pass Rate
              </div>
              <div style={{ height: '4px', backgroundColor: colors.gray200, borderRadius: '2px', overflow: 'hidden', marginTop: '6px' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    background: colors.gradientSuccess, 
                    borderRadius: '2px', 
                    transition: 'width 0.6s ease',
                    width: `${stats.passRate}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Highest Score Card */}
          <div style={statCardStyle('high')}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: colors.white,
              backgroundColor: colors.secondary
            }}>
              <FiAward />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: typography['2xl'], 
                fontWeight: '700', 
                color: colors.textPrimary, 
                lineHeight: '1', 
                marginBottom: '2px' 
              }}>
                {stats.highest}
              </div>
              <div style={{ fontSize: typography.sm, color: colors.textTertiary, marginBottom: '6px' }}>
                Highest Score
              </div>
              <div style={{ fontSize: typography.xs, color: colors.textTertiary }}>
                <span>Class Best</span>
              </div>
            </div>
          </div>
          
          {/* Above Average Card */}
          <div style={statCardStyle('above')}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              color: colors.white,
              backgroundColor: colors.info
            }}>
              <FiTrendingUp />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: typography['2xl'], 
                fontWeight: '700', 
                color: colors.textPrimary, 
                lineHeight: '1', 
                marginBottom: '2px' 
              }}>
                {stats.aboveAverage}
              </div>
              <div style={{ fontSize: typography.sm, color: colors.textTertiary, marginBottom: '6px' }}>
                Above Average
              </div>
              <div style={{ fontSize: typography.xs, color: colors.textTertiary }}>
                {Math.round((stats.aboveAverage / stats.totalStudents) * 100)}% of class
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div style={cardStyle}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <h2 style={{ 
            margin: 0, 
            color: colors.textPrimary, 
            fontSize: typography.lg, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            fontWeight: '600'
          }}>
            <FiUsers size={18} /> Student Results
          </h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Box */}
            <div style={{ position: 'relative', width: '240px' }}>
              <FiSearch style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.gray500,
                fontSize: '16px'
              }} />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  fontSize: typography.sm,
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  backgroundColor: colors.cardBackground,
                  ':focus': {
                    borderColor: colors.primary,
                    backgroundColor: colors.white,
                    boxShadow: `0 0 0 3px ${colors.primary}08`
                  }
                }}
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: colors.gray300,
                    border: 'none',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: typography.xs,
                    color: colors.gray600
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Filters */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setActiveFilter('all')}
                style={{
                  padding: '6px 12px',
                  border: `1px solid ${activeFilter === 'all' ? colors.primary : colors.border}`,
                  background: activeFilter === 'all' ? colors.primary + '08' : colors.cardBackground,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: typography.sm,
                  fontWeight: '500',
                  color: activeFilter === 'all' ? colors.primary : colors.textSecondary,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FiFilter size={12} /> All
              </button>
              <button
                onClick={() => setActiveFilter('passing')}
                style={{
                  padding: '6px 12px',
                  border: `1px solid ${activeFilter === 'passing' ? colors.success : colors.border}`,
                  background: activeFilter === 'passing' ? colors.success + '08' : colors.cardBackground,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: typography.sm,
                  fontWeight: '500',
                  color: activeFilter === 'passing' ? colors.success : colors.textSecondary,
                  transition: 'all 0.2s ease'
                }}
              >
                Passing
              </button>
              <button
                onClick={() => setActiveFilter('failing')}
                style={{
                  padding: '6px 12px',
                  border: `1px solid ${activeFilter === 'failing' ? colors.danger : colors.border}`,
                  background: activeFilter === 'failing' ? colors.danger + '08' : colors.cardBackground,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: typography.sm,
                  fontWeight: '500',
                  color: activeFilter === 'failing' ? colors.danger : colors.textSecondary,
                  transition: 'all 0.2s ease'
                }}
              >
                Needs Help
              </button>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div style={{ 
          border: `1px solid ${colors.border}`, 
          borderRadius: '10px', 
          overflow: 'hidden', 
          marginBottom: '20px' 
        }}>
          {/* Table Header */}
          <div style={tableHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
              <span>Student</span>
              <button 
                onClick={() => handleSort('name')}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: sortField === 'name' ? colors.primary : colors.gray500,
                  fontSize: typography.xs,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: sortField === 'name' ? colors.primary + '08' : 'transparent',
                  ':hover': {
                    color: colors.primary,
                    backgroundColor: colors.primary + '08'
                  }
                }}
              >
                Name {sortField === 'name' && (sortOrder === 'asc' ? <FiArrowUp size={10} /> : <FiArrowDown size={10} />)}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
              <span>Score</span>
              <button 
                onClick={() => handleSort('score')}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: sortField === 'score' ? colors.primary : colors.gray500,
                  fontSize: typography.xs,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: sortField === 'score' ? colors.primary + '08' : 'transparent',
                  ':hover': {
                    color: colors.primary,
                    backgroundColor: colors.primary + '08'
                  }
                }}
              >
                Score {sortField === 'score' && (sortOrder === 'asc' ? <FiArrowUp size={10} /> : <FiArrowDown size={10} />)}
              </button>
            </div>
            <div style={{ padding: '0 8px' }}>Grade</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
              <span>Submitted</span>
              <button 
                onClick={() => handleSort('submittedAt')}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: sortField === 'submittedAt' ? colors.primary : colors.gray500,
                  fontSize: typography.xs,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: sortField === 'submittedAt' ? colors.primary + '08' : 'transparent',
                  ':hover': {
                    color: colors.primary,
                    backgroundColor: colors.primary + '08'
                  }
                }}
              >
                Date {sortField === 'submittedAt' && (sortOrder === 'asc' ? <FiArrowUp size={10} /> : <FiArrowDown size={10} />)}
              </button>
            </div>
            <div style={{ padding: '0 8px' }}>Actions</div>
          </div>

          {/* Table Body */}
          <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
            {filteredResults.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: colors.gray500 }}>
                <div style={{ fontSize: '40px', marginBottom: '12px', opacity: '0.5' }}>📊</div>
                <h3 style={{ margin: '0 0 6px 0', color: colors.gray600, fontSize: typography.lg }}>No Results Found</h3>
                <p style={{ fontSize: typography.sm }}>Try adjusting your search or filters</p>
              </div>
            ) : (
              filteredResults.map((result) => {
                const percentage = (result.score / (test?.totalMarks || 100)) * 100;
                const gradeColor = getGradeColor(percentage);
                const gradeLetter = getGradeLetter(percentage);
                
                return (
                  <div key={result._id} style={{
                    borderBottom: `1px solid ${colors.borderLight}`,
                    transition: 'background-color 0.2s ease',
                    ':hover': {
                      backgroundColor: colors.gray50
                    },
                    ':last-child': {
                      borderBottom: 'none'
                    }
                  }}>
                    <div style={tableRowStyle}>
                      {/* Student Cell */}
                      <div style={{ padding: '0 8px' }}>
                        <div style={studentInfoStyle}>
                          <div style={studentAvatarStyle(gradeColor)}>
                            {result.userId?.name?.[0]?.toUpperCase() || 
                             result.userId?.username?.[0]?.toUpperCase() || 'S'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: '2px', fontSize: typography.base }}>
                              {result.userId?.name || result.userId?.username}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', fontSize: typography.xs, color: colors.textTertiary }}>
                              <span className="student-id">
                                {result.userId?.studentId || 'ID: N/A'}
                              </span>
                              <span className="student-performance" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {getPerformanceIcon(percentage)}
                                {percentage >= 70 ? 'Good' : percentage >= 40 ? 'Average' : 'Needs Help'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Score Cell */}
                      <div style={{ padding: '0 8px' }}>
                        {editingResultId === result._id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="number"
                              value={editScore}
                              onChange={(e) => setEditScore(e.target.value)}
                              style={{
                                width: '70px',
                                padding: '6px 10px',
                                border: `1px solid ${colors.primary}`,
                                borderRadius: '6px',
                                fontSize: typography.sm,
                                fontWeight: '600',
                                outline: 'none',
                                textAlign: 'center'
                              }}
                              min="0"
                              max={test?.totalMarks || 100}
                              step="0.5"
                            />
                            <span style={{ color: colors.textTertiary, fontWeight: '500', fontSize: typography.sm }}>
                              / {test?.totalMarks || 100}
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => handleSaveScore(result._id)}
                                disabled={editing}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: editing ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: typography.sm,
                                  transition: 'all 0.2s ease',
                                  backgroundColor: colors.success,
                                  color: colors.white,
                                  opacity: editing ? 0.6 : 1,
                                  ':hover': editing ? {} : {
                                    transform: 'translateY(-1px)',
                                    boxShadow: `0 2px 6px ${colors.success}40`
                                  }
                                }}
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => {
                                  setEditingResultId(null);
                                  setEditScore('');
                                }}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: typography.sm,
                                  transition: 'all 0.2s ease',
                                  backgroundColor: colors.danger,
                                  color: colors.white,
                                  ':hover': {
                                    transform: 'translateY(-1px)',
                                    boxShadow: `0 2px 6px ${colors.danger}40`
                                  }
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ fontSize: typography.lg, fontWeight: '700', color: gradeColor }}>
                              {result.score}
                              <span style={{ fontSize: typography.sm, fontWeight: '500', color: colors.textTertiary }}>
                                {' '}/ {test?.totalMarks || 100}
                              </span>
                            </div>
                            <div style={{ fontSize: typography.xs, color: colors.textTertiary }}>
                              {percentage.toFixed(1)}%
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Grade Cell */}
                      <div style={{ padding: '0 8px' }}>
                        <div style={gradeBadgeStyle(percentage)}>
                          {gradeLetter}
                        </div>
                      </div>
                      
                      {/* Submitted Cell */}
                      <div style={{ padding: '0 8px' }}>
                        <div style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: '2px', fontSize: typography.sm }}>
                          {new Date(result.submittedAt).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: typography.xs, color: colors.textTertiary }}>
                          {new Date(result.submittedAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                      
                      {/* Actions Cell */}
                      <div style={{ padding: '0 8px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => toggleDetails(result._id)}
                            style={{
                              backgroundColor: colors.primary,
                              color: colors.white,
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: typography.sm,
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s ease',
                              ':hover': {
                                backgroundColor: colors.primaryDark,
                                transform: 'translateY(-1px)',
                                boxShadow: `0 2px 8px ${colors.primary}20`
                              }
                            }}
                          >
                            <FiEye size={14} /> View
                          </button>
                          
                          {(user.role === 'admin' || user.role === 'super_admin') && (
                            editingResultId !== result._id ? (
                              <button
                                onClick={() => {
                                  setEditingResultId(result._id);
                                  setEditScore(result.score.toString());
                                }}
                                style={{
                                  backgroundColor: colors.warning,
                                  color: colors.white,
                                  border: 'none',
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s ease',
                                  ':hover': {
                                    backgroundColor: '#e0a800',
                                    transform: 'translateY(-1px)',
                                    boxShadow: `0 2px 8px ${colors.warning}20`
                                  }
                                }}
                              >
                                <FiEdit size={14} />
                              </button>
                            ) : (
                              <div style={{ 
                                fontSize: typography.xs, 
                                color: colors.warning, 
                                fontWeight: '500',
                                animation: 'pulse 1.5s infinite',
                                display: 'flex',
                                alignItems: 'center',
                                height: '36px'
                              }}>
                                Editing...
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {expandedResult === result._id && (
                      <div style={{
                        backgroundColor: colors.gray50,
                        borderTop: `1px solid ${colors.border}`,
                        animation: 'slideDown 0.2s ease'
                      }}>
                        <div style={{ padding: '24px' }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            marginBottom: '20px',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}>
                            <h4 style={{ 
                              margin: 0, 
                              color: colors.textPrimary, 
                              fontSize: typography.base, 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              fontWeight: '600'
                            }}>
                              <FiEye size={16} /> Detailed Answers - {result.userId?.name || result.userId?.username}
                              <span style={{
                                fontSize: typography.xs,
                                color: colors.primary,
                                backgroundColor: colors.primary + '08',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontWeight: '600',
                                border: `1px solid ${colors.primary}20`
                              }}>
                                Score: {result.score}/{test?.totalMarks || 100} ({percentage.toFixed(1)}%)
                              </span>
                            </h4>
                          </div>
                          
                          {result.answers && typeof result.answers === 'object' && (
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                              gap: '16px' 
                            }}>
                              {Object.entries(result.answers).map(([questionId, selectedAnswer], index) => {
                                const question = test?.questions?.find(q => q._id?.toString() === questionId);
                                const isCorrect = selectedAnswer === question?.correctAnswer;
                                
                                return (
                                  <div 
                                    key={index}
                                    style={answerCardStyle(isCorrect)}
                                  >
                                    <div style={{ 
                                      display: 'flex', 
                                      justifyContent: 'space-between', 
                                      alignItems: 'center', 
                                      marginBottom: '12px' 
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                          backgroundColor: colors.primary,
                                          color: colors.white,
                                          width: '28px',
                                          height: '28px',
                                          borderRadius: '6px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontWeight: '600',
                                          fontSize: typography.sm
                                        }}>
                                          Q{index + 1}
                                        </span>
                                        <span style={{
                                          fontSize: typography.xs,
                                          fontWeight: '600',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          color: isCorrect ? colors.success : colors.danger
                                        }}>
                                          {isCorrect ? (
                                            <><FiCheckCircle size={12} /> Correct</>
                                          ) : (
                                            <><FiXCircle size={12} /> Incorrect</>
                                          )}
                                        </span>
                                      </div>
                                      <div style={{ 
                                        fontSize: typography.xs, 
                                        color: colors.textTertiary, 
                                        backgroundColor: colors.gray100, 
                                        padding: '2px 6px', 
                                        borderRadius: '4px' 
                                      }}>
                                        1 Point
                                      </div>
                                    </div>
                                    <div style={{ 
                                      margin: '0 0 16px 0', 
                                      color: colors.textPrimary, 
                                      lineHeight: '1.5', 
                                      fontSize: typography.sm 
                                    }}>
                                      {question?.text || 'Question text not available'}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: typography.xs, color: colors.textTertiary, fontWeight: '500' }}>
                                          Student's Answer:
                                        </span>
                                        <span style={{
                                          fontSize: typography.sm,
                                          fontWeight: '600',
                                          color: isCorrect ? colors.success : colors.danger
                                        }}>
                                          {selectedAnswer || 'Not answered'}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: typography.xs, color: colors.textTertiary, fontWeight: '500' }}>
                                          Correct Answer:
                                        </span>
                                        <span style={{
                                          fontSize: typography.sm,
                                          fontWeight: '600',
                                          color: colors.success
                                        }}>
                                          {question?.correctAnswer || 'N/A'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {/* Footer Stats */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '16px 0',
          borderTop: `1px solid ${colors.border}`, 
          marginTop: '20px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: typography.xs, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Showing:
              </span>
              <span style={{ fontSize: typography.base, fontWeight: '600', color: colors.primary }}>
                {filteredResults.length} of {results.length} students
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: typography.xs, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Class Average:
              </span>
              <span style={{ fontSize: typography.base, fontWeight: '600', color: colors.primary }}>
                {stats.average} points
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: typography.xs, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Success Rate:
              </span>
              <span style={{ fontSize: typography.base, fontWeight: '600', color: colors.primary }}>
                {stats.passRate}%
              </span>
            </div>
          </div>
          <div>
            <button
              onClick={exportToCSV}
              style={createButtonStyle('outline')}
            >
              <FiDownload size={16} /> Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Global CSS Animation */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        /* Custom scrollbar */
        div[style*="max-height"]::-webkit-scrollbar {
          width: 6px;
        }
        
        div[style*="max-height"]::-webkit-scrollbar-track {
          background: ${colors.gray100};
          border-radius: 10px;
        }
        
        div[style*="max-height"]::-webkit-scrollbar-thumb {
          background: ${colors.gray400};
          border-radius: 10px;
        }
        
        div[style*="max-height"]::-webkit-scrollbar-thumb:hover {
          background: ${colors.gray500};
        }
        
        /* Responsive Design */
        @media (max-width: 1200px) {
          .stats-cards {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .table-header,
          .row-main {
            grid-template-columns: 2fr 1fr 80px 1fr 120px;
          }
        }
        
        @media (max-width: 992px) {
          .test-header-content {
            flex-direction: column;
            gap: 16px;
          }
          
          .overview-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .section-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .section-controls {
            width: 100%;
          }
          
          .search-box {
            width: 100%;
          }
          
          .answers-grid {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 768px) {
          .nav-bar {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .nav-left {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          
          .stats-cards {
            grid-template-columns: 1fr;
          }
          
          .table-header,
          .row-main {
            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }
          
          .header-cell {
            justify-content: flex-start;
          }
          
          .filters {
            width: 100%;
            overflow-x: auto;
            padding-bottom: 6px;
          }
          
          .table-footer {
            flex-direction: column;
            gap: 16px;
            align-items: flex-start;
          }
          
          .footer-stats {
            width: 100%;
            flex-direction: column;
            gap: 12px;
          }
        }
        
        @media (max-width: 480px) {
          .test-results {
            padding: 16px;
          }
          
          .test-header {
            padding: 20px;
          }
          
          .test-title {
            font-size: 20px;
          }
          
          .test-details {
            flex-direction: column;
            gap: 6px;
          }
          
          .action-group {
            width: 100%;
          }
          
          .btn-action {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default TestResults;