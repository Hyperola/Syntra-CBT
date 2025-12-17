import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { 
  FiHome, 
  FiBook, 
  FiUser, 
  FiLogOut, 
  FiMenu, 
  FiX,
  FiBell,
  FiChevronRight,
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiClock,
  FiSettings,
  FiCalendar,
  FiCheckCircle,
  FiPlayCircle,
  FiArrowRight,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiAlertCircle,
  FiTrendingUp,
  FiTarget,
  FiClock as FiClockIcon,
  FiStar,
  FiActivity,
  FiCheckSquare,
  FiAlertTriangle,
  FiChevronDown,
  FiChevronUp,
  FiEye,
  FiZap
} from 'react-icons/fi';

const StudentHome = ({ children }) => {
  const { user, logout } = useContext(AuthContext); // Changed from setUser to logout
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [tests, setTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [filteredTests, setFilteredTests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedTest, setExpandedTest] = useState(null);
  const [testStats, setTestStats] = useState({
    total: 0,
    active: 0,
    upcoming: 0,
    completed: 0,
    averageScore: 0,
    highestScore: 0,
    timeSpent: '0h',
    streak: 0,
    totalMarks: 0
  });

  // Brand colors - Army Green with Orange and Light Green
  const colors = {
    primary: '#4B5320',      // Army Green (main brand)
    secondary: '#FF8C00',    // Dark Orange (accent)
    accent: '#90EE90',       // Light Green (secondary accent)
    light: '#FFF8DC',        // Cornsilk (light background)
    background: '#F8F9FA',   // Light Gray
    white: '#FFFFFF',
    dark: '#1A202C',
    gray: '#718096',
    lightGray: '#E2E8F0',
    danger: '#DC2626',       // Red
    success: '#059669',      // Emerald
    info: '#2563EB',         // Blue
    warning: '#D97706',      // Amber
    purple: '#7C3AED'        // Purple
  };

  // Gradient backgrounds using brand colors
  const gradients = {
    primary: 'linear-gradient(135deg, #4B5320 0%, #3A4420 100%)',
    secondary: 'linear-gradient(135deg, #FF8C00 0%, #FFA500 100%)',
    accent: 'linear-gradient(135deg, #90EE90 0%, #98FB98 100%)',
    success: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    info: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
    warning: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
    dark: 'linear-gradient(135deg, #1A202C 0%, #2D3748 100%)'
  };

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again.');
        setLoading(false);
        navigate('/login');
        return;
      }
      try {
        const res = await fetch('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to verify user');
        // Don't call setUser here - AuthContext should handle this
        setLoading(false);
        fetchTests();
      } catch (err) {
        setError(err.message);
        setLoading(false);
        navigate('/login');
      }
    };
    
    if (!user) {
      verifyUser();
    } else {
      setLoading(false);
      fetchTests();
    }

    // Set mock notifications
    setNotifications([
      { id: 1, message: 'Mathematics test starts in 2 hours', time: '2h ago', read: false, type: 'warning' },
      { id: 2, message: 'You scored 92% in Physics', time: '1 day ago', read: true, type: 'success' },
      { id: 3, message: 'New English practice test available', time: '2 days ago', read: true, type: 'info' },
      { id: 4, message: 'Try our new Practice Mock Tests!', time: 'Just now', read: false, type: 'accent' }
    ]);
  }, [user, navigate]);

  useEffect(() => {
    console.log('Location changed to:', location.pathname);
  }, [location]);

  const fetchTests = async () => {
    if (!user) return;
    
    setLoadingTests(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/tests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tests');
      }
      
      const data = await response.json();
      
      if (data.success && data.tests) {
        const processedTests = processTests(data.tests);
        setTests(processedTests);
        setFilteredTests(processedTests);
        calculateTestStats(processedTests);
      }
    } catch (err) {
      console.error('Error fetching tests:', err);
      setError('Failed to load tests. Please try again.');
    } finally {
      setLoadingTests(false);
    }
  };

  const processTests = (testsData) => {
    const now = new Date();
    return testsData.map(test => {
      let status = 'scheduled';
      let startDate = null;
      let endDate = null;
      let isActive = false;
      let timeRemaining = null;
      let isAvailable = false;
      
      if (test.batches && test.batches.length > 0) {
        const studentBatch = test.batches.find(batch => 
          batch.students && batch.students.some(s => {
            const studentId = s._id || s;
            return studentId.toString() === (user._id || user.id).toString();
          })
        );
        
        if (studentBatch && studentBatch.schedule) {
          startDate = new Date(studentBatch.schedule.start);
          endDate = new Date(studentBatch.schedule.end);
          
          if (now >= startDate && now <= endDate && studentBatch.isActive) {
            status = 'active';
            isActive = true;
            isAvailable = true;
            timeRemaining = endDate - now;
          } else if (now < startDate && studentBatch.isActive) {
            status = 'upcoming';
            timeRemaining = startDate - now;
          } else if (now > endDate) {
            status = 'completed';
          }
        }
      }
      
      return {
        ...test,
        status,
        startDate,
        endDate,
        isActive,
        isAvailable,
        timeRemaining,
        batch: test.batches ? test.batches[0] : null
      };
    });
  };

  const calculateTestStats = (testsData) => {
    const now = new Date();
    let active = 0;
    let upcoming = 0;
    let completed = 0;
    let totalMarks = 0;
    let totalAttempts = 0;
    let highestScore = 0;
    let totalTime = 0;

    testsData.forEach(test => {
      switch (test.status) {
        case 'active':
          active++;
          break;
        case 'upcoming':
          upcoming++;
          break;
        case 'completed':
          completed++;
          break;
      }

      if (test.analytics && test.analytics.averageScore) {
        const score = test.analytics.averageScore;
        totalMarks += score;
        totalAttempts++;
        if (score > highestScore) highestScore = score;
      }

      totalTime += test.duration || 0;
    });

    const averageScore = totalAttempts > 0 ? Math.round(totalMarks / totalAttempts) : 0;
    const timeSpent = Math.round(totalTime / 60);

    setTestStats({
      total: testsData.length,
      active,
      upcoming,
      completed,
      averageScore,
      highestScore,
      timeSpent: `${timeSpent}h`,
      streak: Math.floor(Math.random() * 14) + 1,
      totalMarks: totalAttempts
    });
  };

  useEffect(() => {
    let results = tests;
    
    if (searchTerm) {
      results = results.filter(test => 
        test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        test.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (test.class?.name || test.class || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== 'all') {
      results = results.filter(test => test.status === filterStatus);
    }
    
    setFilteredTests(results);
  }, [searchTerm, filterStatus, tests]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeRemaining = (ms) => {
    if (!ms) return null;
    
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return colors.success;
      case 'upcoming': return colors.warning;
      case 'completed': return colors.info;
      case 'scheduled': return colors.secondary;
      default: return colors.gray;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <FiPlayCircle />;
      case 'upcoming': return <FiCalendar />;
      case 'completed': return <FiCheckCircle />;
      case 'scheduled': return <FiClock />;
      default: return <FiClock />;
    }
  };

  const navItems = [
    { path: '/student/dashboard', icon: <FiHome />, label: 'Dashboard' },
    { path: '/student/tests', icon: <FiBook />, label: 'All Tests' },
    { path: '/student/mock-tests', icon: <FiBookOpen />, label: 'Practice Mock Tests' },
    { path: '/student/profile', icon: <FiUser />, label: 'Profile' },
  ];

  const statCards = [
    {
      title: 'Active Tests',
      value: testStats.active,
      icon: <FiActivity />,
      color: colors.white,
      gradient: gradients.secondary,
      change: `${testStats.active > 0 ? 'Ready to take' : 'No active tests'}`
    },
    {
      title: 'Upcoming Tests',
      value: testStats.upcoming,
      icon: <FiCalendar />,
      color: colors.white,
      gradient: gradients.warning,
      change: testStats.upcoming > 0 ? 'Scheduled' : 'None scheduled'
    },
    {
      title: 'Avg Score',
      value: `${testStats.averageScore}%`,
      icon: <FiTrendingUp />,
      color: colors.white,
      gradient: gradients.success,
      change: testStats.totalMarks > 0 ? `Based on ${testStats.totalMarks} tests` : 'Take tests to see score'
    },
    {
      title: 'Study Streak',
      value: `${testStats.streak} days`,
      icon: <FiTarget />,
      color: colors.white,
      gradient: gradients.info,
      change: 'Keep the streak going!'
    }
  ];

  const filterOptions = [
    { value: 'all', label: 'All Tests' },
    { value: 'active', label: 'Active Now' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'completed', label: 'Completed' }
  ];

  const handleNavigation = (path) => {
    console.log('Navigating to:', path);
    setSidebarOpen(false);
    navigate(path);
  };

  const handleStartTest = (testId) => {
    navigate(`/student/test/${testId}`);
  };

  const handleLogout = () => {
    // Use logout function from AuthContext
    if (logout) {
      logout();
    } else {
      // Fallback if logout function doesn't exist
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const refreshTests = () => {
    fetchTests();
  };

  const toggleTestDetails = (testId) => {
    setExpandedTest(expandedTest === testId ? null : testId);
  };

  const handleViewResults = (testId) => {
    navigate(`/student/results/${testId}`);
  };

  const shouldShowDashboard = () => {
    const dashboardPaths = ['/student', '/student/dashboard'];
    return dashboardPaths.includes(location.pathname) && !children;
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '3px solid #E2E8F0',
            borderTop: `3px solid ${colors.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <h3 style={{ color: colors.primary, marginBottom: '8px' }}>Loading your dashboard</h3>
          <p style={{ color: colors.gray }}>Preparing your learning environment...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'student') {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      }}>
        <div style={{ textAlign: 'center', padding: '40px', maxWidth: '400px' }}>
          <FiAlertCircle size={64} color={colors.danger} />
          <h2 style={{ color: colors.dark, margin: '24px 0 12px' }}>Access Restricted</h2>
          <p style={{ color: colors.gray, marginBottom: '24px' }}>This area is for registered students only.</p>
          <button 
            onClick={() => navigate('/login')}
            style={{
              backgroundColor: colors.primary,
              color: colors.white,
              border: 'none',
              padding: '12px 32px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#3A4420';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = colors.primary;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.background,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      position: 'relative'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: colors.white,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: '64px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: '100%',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: colors.primary,
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(75, 83, 32, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '20px', fontWeight: '700', color: colors.primary }}>WAEC</span>
                <span style={{ fontSize: '20px', fontWeight: '700', color: colors.secondary }}>•</span>
                <span style={{ fontSize: '16px', fontWeight: '600', color: colors.secondary }}>CBT</span>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, maxWidth: '500px', margin: '0 24px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <FiSearch style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#A0AEC0'
              }} />
              <input
                type="text"
                placeholder="Search tests, subjects, or classes..."
                style={{
                  width: '100%',
                  padding: '10px 16px 10px 40px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F7FAFC',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={(e) => {
                  e.target.style.backgroundColor = colors.white;
                  e.target.style.borderColor = colors.primary;
                  e.target.style.boxShadow = '0 0 0 3px rgba(75, 83, 32, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.backgroundColor = '#F7FAFC';
                  e.target.style.borderColor = '#E2E8F0';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#A0AEC0',
                    cursor: 'pointer',
                    fontSize: '20px',
                    padding: '0'
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={refreshTests}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: colors.primary,
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(75, 83, 32, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              disabled={loadingTests}
            >
              <FiRefreshCw size={18} style={loadingTests ? { animation: 'spin 1s linear infinite' } : {}} />
            </button>

            <div style={{ position: 'relative' }}>
              <button style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: colors.primary,
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(75, 83, 32, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              >
                <FiBell size={20} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    backgroundColor: colors.danger,
                    color: colors.white,
                    fontSize: '10px',
                    fontWeight: '700',
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.primary,
                fontWeight: '600',
                fontSize: '14px',
                backgroundColor: colors.accent
              }}>
                {user.name ? user.name.charAt(0).toUpperCase() : <FiUser size={16} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: colors.primary }}>
                  {user.name || user.username}
                </span>
                <span style={{ fontSize: '12px', color: colors.gray }}>Student</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 199
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '280px',
        backgroundColor: colors.white,
        boxShadow: '2px 0 20px rgba(0, 0, 0, 0.1)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.3s ease',
        overflowY: 'auto',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '32px 24px 24px',
            background: gradients.primary,
            color: colors.white
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.primary,
                fontWeight: '600',
                fontSize: '32px',
                marginBottom: '16px',
                border: '3px solid rgba(255, 255, 255, 0.3)',
                backgroundColor: colors.accent
              }}>
                {user.name ? user.name.charAt(0).toUpperCase() : <FiUser size={24} />}
              </div>
              <div style={{ width: '100%' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: colors.white, margin: '0 0 4px 0' }}>
                  {user.name || user.username}
                </h3>
                <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', margin: '0 0 12px 0' }}>
                  {user.email || 'student@example.com'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '12px', color: 'rgba(255, 255, 255, 0.9)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiStar size={12} /> Level {Math.floor(testStats.averageScore / 20) + 1}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiAward size={12} /> {testStats.streak} day streak
                  </span>
                </div>
              </div>
            </div>
          </div>

          <nav style={{ flex: 1, padding: '24px 0' }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <div
                  key={item.path}
                  style={{ textDecoration: 'none', display: 'block' }}
                  onClick={() => handleNavigation(item.path)}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '14px 24px',
                    backgroundColor: isActive ? 'rgba(75, 83, 32, 0.08)' : 'transparent',
                    color: isActive ? colors.primary : '#4A5568',
                    fontSize: '14px',
                    fontWeight: isActive ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(75, 83, 32, 0.05)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  >
                    <span style={{ marginRight: '12px', display: 'flex', alignItems: 'center', fontSize: '18px' }}>
                      {item.icon}
                    </span>
                    <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                    {isActive && (
                      <div style={{
                        position: 'absolute',
                        right: '0',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '4px',
                        height: '20px',
                        backgroundColor: colors.secondary,
                        borderRadius: '2px'
                      }} />
                    )}
                  </div>
                </div>
              );
            })}
          </nav>

          <div style={{ padding: '20px 24px', borderTop: '1px solid #E2E8F0' }}>
            <h4 style={{
              fontSize: '12px',
              fontWeight: '600',
              color: colors.gray,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '16px'
            }}>Quick Overview</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>{testStats.total}</div>
                <div style={{ fontSize: '11px', color: colors.gray }}>Total Tests</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: colors.secondary, marginBottom: '4px' }}>
                  {testStats.completed}
                </div>
                <div style={{ fontSize: '11px', color: colors.gray }}>Completed</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: colors.accent, marginBottom: '4px' }}>
                  {testStats.timeSpent}
                </div>
                <div style={{ fontSize: '11px', color: colors.gray }}>Time Spent</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '20px 24px', borderTop: '1px solid #E2E8F0' }}>
            <button onClick={handleLogout} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '12px',
              backgroundColor: 'transparent',
              border: '1px solid #E2E8F0',
              color: colors.primary,
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(75, 83, 32, 0.05)';
              e.currentTarget.style.borderColor = colors.primary;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}
            >
              <FiLogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        marginLeft: '0',
        marginTop: '64px',
        minHeight: 'calc(100vh - 64px)',
        padding: '24px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {/* Render children if they exist, otherwise render dashboard */}
          {children ? (
            children
          ) : shouldShowDashboard() ? (
            <>
              {/* Welcome Section */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '32px',
                padding: '32px',
                backgroundColor: colors.white,
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(75, 83, 32, 0.1)',
                border: `1px solid ${colors.accent}20`
              }}>
                <div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px'}}>
                    <h1 style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      color: colors.primary,
                      margin: 0,
                      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      Welcome back, {user.name?.split(' ')[0] || 'Student'}!
                    </h1>
                    <span style={{ fontSize: '28px' }}>👋</span>
                  </div>
                  <p style={{
                    fontSize: '16px',
                    color: colors.gray,
                    maxWidth: '600px',
                    marginTop: '8px'
                  }}>
                    {testStats.active > 0 
                      ? `🎯 You have ${testStats.active} active test${testStats.active > 1 ? 's' : ''} ready to take`
                      : testStats.upcoming > 0
                      ? `📅 You have ${testStats.upcoming} upcoming test${testStats.upcoming > 1 ? 's' : ''} scheduled`
                      : 'No tests scheduled yet'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => navigate('/student/mock-tests')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: colors.secondary,
                      color: colors.white,
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(255, 140, 0, 0.3)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#E67E00';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 140, 0, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = colors.secondary;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 140, 0, 0.3)';
                    }}
                  >
                    <FiBookOpen style={{ marginRight: '8px' }} />
                    Practice Mock Tests
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
              }}>
                {statCards.map((stat, index) => (
                  <div 
                    key={index} 
                    style={{
                      padding: '24px',
                      borderRadius: '16px',
                      color: colors.white,
                      position: 'relative',
                      overflow: 'hidden',
                      minHeight: '140px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      background: stat.gradient,
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ position: 'absolute', top: '20px', right: '20px', opacity: 0.2 }}>
                      <div style={{ fontSize: '64px', opacity: 0.3, color: stat.color }}>
                        {stat.icon}
                      </div>
                    </div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ fontSize: '32px', fontWeight: '800', marginBottom: '4px' }}>{stat.value}</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', opacity: 0.9, marginBottom: '8px' }}>
                        {stat.title}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.8 }}>{stat.change}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Practice Mock Tests Feature Card */}
              <div style={{
                backgroundColor: colors.white,
                borderRadius: '16px',
                padding: '32px',
                marginBottom: '32px',
                boxShadow: '0 4px 20px rgba(75, 83, 32, 0.1)',
                border: `2px dashed ${colors.accent}`,
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FFF9 100%)'
              }}>
                <div style={{
                  maxWidth: '600px',
                  margin: '0 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center'
                }}>
                  <FiZap size={48} color={colors.secondary} />
                  <h3 style={{ margin: '16px 0 8px', color: colors.dark }}>New: Practice Mock Tests</h3>
                  <p style={{ color: colors.gray, marginBottom: '16px', textAlign: 'center', lineHeight: '1.6' }}>
                    Take unlimited practice tests without any pressure.<br />
                    Choose from 5 subjects and 3 difficulty levels.<br />
                    <strong>No scores recorded, just pure learning!</strong>
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button 
                      onClick={() => navigate('/student/mock-tests')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: colors.primary,
                        color: colors.white,
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(75, 83, 32, 0.3)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#3A4420';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(75, 83, 32, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = colors.primary;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(75, 83, 32, 0.3)';
                      }}
                    >
                      <FiBookOpen style={{ marginRight: '8px' }} />
                      Start Practicing
                    </button>
                    <button 
                      onClick={() => navigate('/student/mock-tests')}
                      style={{
                        backgroundColor: 'transparent',
                        color: colors.primary,
                        border: `1px solid ${colors.primary}`,
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = colors.primary;
                        e.currentTarget.style.color = colors.white;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = colors.primary;
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      Learn More
                    </button>
                  </div>
                </div>
              </div>

              {/* Tests Section */}
              <div style={{
                backgroundColor: colors.white,
                borderRadius: '16px',
                padding: '32px',
                marginBottom: '32px',
                boxShadow: '0 4px 20px rgba(75, 83, 32, 0.1)',
                border: `1px solid ${colors.accent}20`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: colors.primary,
                      margin: '0 0 8px 0',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <FiBook style={{marginRight: '10px', color: colors.primary}} />
                      Your Scheduled Tests
                    </h2>
                    <p style={{ fontSize: '14px', color: colors.gray, margin: 0 }}>
                      {filteredTests.length} test{filteredTests.length !== 1 ? 's' : ''} found
                      {searchTerm && ` for "${searchTerm}"`}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FiFilter style={{ color: colors.gray }} />
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.primary}`,
                          backgroundColor: colors.white,
                          fontSize: '14px',
                          color: colors.primary,
                          outline: 'none',
                          cursor: 'pointer',
                          fontWeight: '500',
                          minWidth: '150px'
                        }}
                      >
                        {filterOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {loadingTests ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: colors.gray }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '3px solid #E2E8F0',
                      borderTop: `3px solid ${colors.primary}`,
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '16px'
                    }}></div>
                    <p>Loading tests...</p>
                  </div>
                ) : filteredTests.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.gray }}>
                    <FiBook size={48} color={colors.lightGray} />
                    <h3 style={{ color: colors.dark, margin: '16px 0 8px' }}>No tests found</h3>
                    <p style={{ color: colors.gray, marginBottom: '24px' }}>
                      {searchTerm 
                        ? 'Try a different search term'
                        : 'No tests available at the moment. Try our Practice Mock Tests!'}
                    </p>
                    {searchTerm ? (
                      <button 
                        onClick={() => setSearchTerm('')}
                        style={{
                          backgroundColor: 'transparent',
                          color: colors.primary,
                          border: `1px solid ${colors.primary}`,
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = colors.primary;
                          e.currentTarget.style.color = colors.white;
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = colors.primary;
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        Clear search
                      </button>
                    ) : (
                      <button 
                        onClick={() => navigate('/student/mock-tests')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: colors.accent,
                          color: colors.primary,
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 4px 12px rgba(144, 238, 144, 0.3)'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = '#7DCE7D';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(144, 238, 144, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = colors.accent;
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(144, 238, 144, 0.3)';
                        }}
                      >
                        <FiBookOpen style={{ marginRight: '8px' }} />
                        Try Mock Tests
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                      gap: '24px'
                    }}>
                      {filteredTests.map((test) => {
                        const statusColor = getStatusColor(test.status);
                        const timeRemaining = test.timeRemaining ? formatTimeRemaining(test.timeRemaining) : null;
                        const isExpanded = expandedTest === test._id;
                        
                        return (
                          <div 
                            key={test._id} 
                            style={{
                              backgroundColor: colors.white,
                              border: `1px solid ${statusColor}40`,
                              borderRadius: '16px',
                              overflow: 'hidden',
                              transition: 'all 0.3s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              boxShadow: `0 4px 20px ${statusColor}20`
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.transform = 'translateY(-4px)';
                              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.15)';
                              e.currentTarget.style.borderColor = colors.secondary;
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = `0 4px 20px ${statusColor}20`;
                              e.currentTarget.style.borderColor = `${statusColor}40`;
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              padding: '20px 20px 16px',
                              borderBottom: '1px solid #E2E8F0'
                            }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '6px 12px',
                                  borderRadius: '20px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  backgroundColor: statusColor,
                                  color: colors.white
                                }}>
                                  {getStatusIcon(test.status)}
                                  <span style={{ marginLeft: '6px' }}>
                                    {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                                  </span>
                                </span>
                                <span style={{
                                  padding: '6px 12px',
                                  borderRadius: '20px',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  backgroundColor: `${colors.accent}30`,
                                  color: colors.primary
                                }}>
                                  {test.subject}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {timeRemaining && (
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    fontSize: '12px',
                                    color: colors.secondary,
                                    fontWeight: '600',
                                    backgroundColor: `${colors.secondary}10`,
                                    padding: '4px 8px',
                                    borderRadius: '12px'
                                  }}>
                                    <FiClockIcon size={12} />
                                    <span style={{ marginLeft: '4px' }}>{timeRemaining}</span>
                                  </div>
                                )}
                                <button
                                  onClick={() => toggleTestDetails(test._id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: colors.primary,
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                                </button>
                              </div>
                            </div>

                            <div style={{ padding: '20px', flex: 1 }}>
                              <h3 style={{
                                fontSize: '18px',
                                fontWeight: '600',
                                color: colors.dark,
                                margin: '0 0 16px 0',
                                lineHeight: 1.3
                              }}>{test.title}</h3>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '12px',
                                marginBottom: '20px'
                              }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '12px', color: colors.gray, marginBottom: '4px' }}>Class:</span>
                                  <span style={{ fontSize: '14px', fontWeight: '600', color: colors.primary }}>
                                    {test.class?.name || test.class || 'N/A'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '12px', color: colors.gray, marginBottom: '4px' }}>Duration:</span>
                                  <span style={{ fontSize: '14px', fontWeight: '600', color: colors.primary }}>
                                    {test.duration} minutes
                                  </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '12px', color: colors.gray, marginBottom: '4px' }}>Questions:</span>
                                  <span style={{ fontSize: '14px', fontWeight: '600', color: colors.primary }}>
                                    {test.questionCount || 'N/A'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '12px', color: colors.gray, marginBottom: '4px' }}>Total Marks:</span>
                                  <span style={{ fontSize: '14px', fontWeight: '600', color: colors.primary }}>
                                    {test.totalMarks || 'N/A'}
                                  </span>
                                </div>
                              </div>

                              {isExpanded && test.instructions && (
                                <div style={{
                                  marginTop: '20px',
                                  padding: '16px',
                                  backgroundColor: colors.light,
                                  borderRadius: '8px',
                                  borderLeft: `4px solid ${colors.secondary}`
                                }}>
                                  <h4 style={{
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: colors.dark,
                                    margin: '0 0 8px 0',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}>
                                    <FiAlertTriangle style={{marginRight: '8px', color: colors.warning}} />
                                    Instructions
                                  </h4>
                                  <p style={{ fontSize: '13px', color: colors.gray, lineHeight: 1.5, margin: 0 }}>
                                    {test.instructions}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div style={{
                              padding: '16px 20px',
                              borderTop: '1px solid #E2E8F0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div style={{ flex: 1 }}>
                                {test.batch && test.batch.schedule && (
                                  <div style={{ fontSize: '13px' }}>
                                    <div style={{ marginBottom: '4px', color: '#4A5568', display: 'flex', alignItems: 'center' }}>
                                      <FiCalendar size={14} style={{marginRight: '6px', color: colors.gray}} />
                                      <span>Starts: {formatDate(test.batch.schedule.start)}</span>
                                    </div>
                                    <div style={{ color: '#4A5568', display: 'flex', alignItems: 'center' }}>
                                      <FiClock size={14} style={{marginRight: '6px', color: colors.gray}} />
                                      <span>Ends: {formatDate(test.batch.schedule.end)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div style={{ flexShrink: 0 }}>
                                {test.status === 'active' ? (
                                  <button 
                                    onClick={() => handleStartTest(test._id)}
                                    style={{
                                      padding: '10px 20px',
                                      borderRadius: '8px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      fontSize: '14px',
                                      border: 'none',
                                      transition: 'all 0.2s ease',
                                      display: 'flex',
                                      alignItems: 'center',
                                      minWidth: '140px',
                                      justifyContent: 'center',
                                      backgroundColor: colors.primary,
                                      color: colors.white,
                                      boxShadow: '0 4px 12px rgba(75, 83, 32, 0.3)'
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.backgroundColor = '#3A4420';
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(75, 83, 32, 0.4)';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = colors.primary;
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(75, 83, 32, 0.3)';
                                    }}
                                  >
                                    <FiPlayCircle style={{ marginRight: '8px' }} />
                                    Start Test
                                  </button>
                                ) : test.status === 'upcoming' ? (
                                  <button 
                                    onClick={() => navigate(`/student/test/${test._id}`)}
                                    style={{
                                      padding: '10px 20px',
                                      borderRadius: '8px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      fontSize: '14px',
                                      border: 'none',
                                      transition: 'all 0.2s ease',
                                      display: 'flex',
                                      alignItems: 'center',
                                      minWidth: '140px',
                                      justifyContent: 'center',
                                      backgroundColor: colors.secondary,
                                      color: colors.white,
                                      boxShadow: '0 4px 12px rgba(255, 140, 0, 0.3)'
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.backgroundColor = '#E67E00';
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 140, 0, 0.4)';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = colors.secondary;
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 140, 0, 0.3)';
                                    }}
                                  >
                                    <FiEye style={{ marginRight: '8px' }} />
                                    View Details
                                  </button>
                                ) : test.status === 'completed' ? (
                                  <button 
                                    onClick={() => handleViewResults(test._id)}
                                    style={{
                                      padding: '10px 20px',
                                      borderRadius: '8px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      fontSize: '14px',
                                      border: 'none',
                                      transition: 'all 0.2s ease',
                                      display: 'flex',
                                      alignItems: 'center',
                                      minWidth: '140px',
                                      justifyContent: 'center',
                                      backgroundColor: colors.accent,
                                      color: colors.primary,
                                      boxShadow: '0 4px 12px rgba(144, 238, 144, 0.3)'
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.backgroundColor = '#7DCE7D';
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(144, 238, 144, 0.4)';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = colors.accent;
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(144, 238, 144, 0.3)';
                                    }}
                                  >
                                    <FiCheckSquare style={{ marginRight: '8px' }} />
                                    View Results
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => navigate(`/student/test/${test._id}`)}
                                    style={{
                                      padding: '10px 20px',
                                      borderRadius: '8px',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      fontSize: '14px',
                                      border: 'none',
                                      transition: 'all 0.2s ease',
                                      display: 'flex',
                                      alignItems: 'center',
                                      minWidth: '140px',
                                      justifyContent: 'center',
                                      backgroundColor: colors.secondary,
                                      color: colors.white,
                                      boxShadow: '0 4px 12px rgba(255, 140, 0, 0.3)'
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.backgroundColor = '#E67E00';
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 140, 0, 0.4)';
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.backgroundColor = colors.secondary;
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 140, 0, 0.3)';
                                    }}
                                  >
                                    <FiEye style={{ marginRight: '8px' }} />
                                    Preview
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {filteredTests.length > 0 && filteredTests.length < tests.length && (
                      <div style={{ textAlign: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #E2E8F0' }}>
                        <button 
                          onClick={() => navigate('/student/tests')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            backgroundColor: 'transparent',
                            color: colors.primary,
                            border: `1px solid ${colors.primary}`,
                            padding: '10px 24px',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = colors.primary;
                            e.currentTarget.style.color = colors.white;
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = colors.primary;
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          View All {tests.length} Tests
                          <FiArrowRight style={{ marginLeft: '8px' }} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Performance Section */}
              <div style={{
                backgroundColor: colors.white,
                borderRadius: '16px',
                padding: '32px',
                boxShadow: '0 4px 20px rgba(75, 83, 32, 0.1)',
                border: `1px solid ${colors.accent}20`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: colors.primary,
                    margin: '0 0 8px 0',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <FiTrendingUp style={{marginRight: '10px', color: colors.primary}} />
                    Your Performance
                  </h2>
                  <button 
                    onClick={() => navigate('/student/results')}
                    style={{
                      backgroundColor: 'transparent',
                      color: colors.primary,
                      border: `1px solid ${colors.primary}`,
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = colors.primary;
                      e.currentTarget.style.color = colors.white;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = colors.primary;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    View Details
                  </button>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '20px',
                  marginTop: '24px'
                }}>
                  <div style={{
                    padding: '24px',
                    backgroundColor: '#F7FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.borderColor = colors.accent;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                  }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <FiTrendingUp size={20} color={colors.success} />
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.dark, margin: 0 }}>Average Score</h3>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: colors.primary, marginBottom: '8px' }}>
                      {testStats.averageScore}%
                    </div>
                    <div style={{ fontSize: '14px', color: colors.gray }}>
                      <span style={{ color: colors.success, fontWeight: '600' }}>↑ 5%</span> from last month
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '24px',
                    backgroundColor: '#F7FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.borderColor = colors.accent;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                  }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <FiTarget size={20} color={colors.secondary} />
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.dark, margin: 0 }}>Highest Score</h3>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: colors.primary, marginBottom: '8px' }}>
                      {testStats.highestScore}%
                    </div>
                    <div style={{ fontSize: '14px', color: colors.gray }}>
                      In {tests.find(t => t.analytics?.averageScore === testStats.highestScore)?.subject || 'Mathematics'}
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '24px',
                    backgroundColor: '#F7FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.borderColor = colors.accent;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                  }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <FiClockIcon size={20} color={colors.info} />
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.dark, margin: 0 }}>Time Spent</h3>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: colors.primary, marginBottom: '8px' }}>
                      {testStats.timeSpent}
                    </div>
                    <div style={{ fontSize: '14px', color: colors.gray }}>Total study time this month</div>
                  </div>
                  
                  <div style={{
                    padding: '24px',
                    backgroundColor: '#F7FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.borderColor = colors.accent;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                  }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <FiAward size={20} color={colors.accent} />
                      <h3 style={{ fontSize: '16px', fontWeight: '600', color: colors.dark, margin: 0 }}>Achievements</h3>
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: colors.primary, marginBottom: '8px' }}>
                      {testStats.completed}
                    </div>
                    <div style={{ fontSize: '14px', color: colors.gray }}>Tests completed successfully</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              textAlign: 'center',
              backgroundColor: colors.white,
              borderRadius: '16px',
              padding: '40px',
              boxShadow: '0 4px 20px rgba(75, 83, 32, 0.1)',
              border: `1px solid ${colors.accent}20`
            }}>
              <h2 style={{ color: colors.dark, marginBottom: '16px' }}>No content to display</h2>
              <p style={{ color: colors.gray, marginBottom: '24px' }}>Please select a menu option from the sidebar.</p>
              <button onClick={() => navigate('/student/dashboard')} style={{
                backgroundColor: colors.primary,
                color: colors.white,
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                marginTop: '20px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#3A4420';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(75, 83, 32, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = colors.primary;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentHome;