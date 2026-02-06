import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FiHome, FiUsers, FiBook, FiClipboard, FiCalendar, 
  FiTrendingUp, FiUserCheck, FiAlertTriangle, FiRefreshCw,
  FiEye, FiCheck, FiSettings, FiBarChart2, FiClock,
  FiChevronRight, FiDatabase, FiFileText, FiUser,
  FiActivity, FiLayers, FiZap, FiAward, FiTarget,
  FiUserPlus, FiLink
} from 'react-icons/fi';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [data, setData] = useState({
    stats: { classes: 0, students: 0, teachers: 0, tests: 0, sessions: 0, parents: 0, childrenLinked: 0 },
    recentTests: [],
    upcomingSessions: [],
    userStats: {
      total: 0,
      byRole: {},
      active: 0,
      inactive: 0,
      parents: 0,
      activeParents: 0,
      childrenLinked: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Helper function to extract data from API responses
  const extractDataFromResponse = (response, key) => {
    if (!response || !response.data) return [];
    
    const data = response.data;
    
    // Handle users API response
    if (key === 'users' && data.users && Array.isArray(data.users)) {
      return data.users;
    }
    
    // Handle users API response with pagination
    if (key === 'users' && data.pagination && data.users && Array.isArray(data.users)) {
      return data.users;
    }
    
    // Handle tests API response - FIXED VERSION
    if (key === 'tests') {
      // First check for success response with tests array
      if (data.success && data.tests && Array.isArray(data.tests)) {
        console.log('✅ Found tests in data.tests:', data.tests.length);
        return data.tests;
      }
      
      // Check if tests is directly an array
      if (data.tests && Array.isArray(data.tests)) {
        console.log('✅ Found tests array directly:', data.tests.length);
        return data.tests;
      }
      
      // Check for data.data array
      if (data.data && Array.isArray(data.data)) {
        console.log('✅ Found tests in data.data:', data.data.length);
        return data.data;
      }
      
      // Check if response is directly an array
      if (Array.isArray(data)) {
        console.log('✅ Response is directly an array:', data.length);
        return data;
      }
      
      // Check for pagination response
      if (data.data && data.data.tests && Array.isArray(data.data.tests)) {
        console.log('✅ Found tests in data.data.tests:', data.data.tests.length);
        return data.data.tests;
      }
      
      // Check for legacy response format
      if (data[key] && Array.isArray(data[key])) {
        console.log('✅ Found tests in data[key]:', data[key].length);
        return data[key];
      }
      
      console.log('⚠️ No tests found in response:', data);
      return [];
    }
    
    // Handle other response structures
    if (data.success && data[key]) {
      return Array.isArray(data[key]) ? data[key] : [];
    }
    
    if (Array.isArray(data)) {
      return data;
    }
    
    if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    
    if (data[key] && Array.isArray(data[key])) {
      return data[key];
    }
    
    // If it's a single object with the key, wrap it in an array
    if (data[key] && typeof data[key] === 'object') {
      return [data[key]];
    }
    
    return [];
  };

  // Helper function to safely get class name from test
  const getClassName = (test) => {
    if (!test) return 'All Classes';
    
    // If class is an object with name property
    if (test.class && typeof test.class === 'object' && test.class.name) {
      return test.class.name;
    }
    
    // If class is a string
    if (typeof test.class === 'string') {
      return test.class;
    }
    
    // If className exists
    if (test.className) {
      return test.className;
    }
    
    // If class has _id (object without name)
    if (test.class && typeof test.class === 'object' && test.class._id) {
      return 'Class ID: ' + test.class._id.toString().substring(0, 8) + '...';
    }
    
    return 'All Classes';
  };

  // Fetch dashboard data - UPDATED WITH PARENT STATS
  const fetchDashboardData = useCallback(async () => {
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Make API calls
      let classes = [], userStats = {}, tests = [], sessions = [];
      
      // 1. Fetch classes
      try {
        const classesRes = await axios.get(`${API_BASE_URL}/api/classes?limit=20`, { 
          headers,
          timeout: 10000
        });
        classes = extractDataFromResponse(classesRes, 'classes');
        console.log('✅ Classes fetched:', classes.length);
      } catch (err) {
        console.error('❌ Classes fetch error:', err.message);
      }

      // 2. Fetch user statistics - UPDATED TO INCLUDE PARENTS
      try {
        const usersRes = await axios.get(`${API_BASE_URL}/api/users?limit=1000`, { 
          headers,
          timeout: 8000 
        });
        
        // Extract users from response
        let users = [];
        if (usersRes.data?.users && Array.isArray(usersRes.data.users)) {
          users = usersRes.data.users;
        } else if (usersRes.data?.success && usersRes.data.users && Array.isArray(usersRes.data.users)) {
          users = usersRes.data.users;
        } else if (Array.isArray(usersRes.data)) {
          users = usersRes.data;
        } else if (usersRes.data?.data && Array.isArray(usersRes.data.data)) {
          users = usersRes.data.data;
        }
        
        if (users.length > 0) {
          // Calculate statistics from the user data
          const students = users.filter(u => u?.role === 'student').length;
          const teachers = users.filter(u => u?.role === 'teacher').length;
          const parents = users.filter(u => u?.role === 'parent').length; // NEW
          const admins = users.filter(u => u?.role === 'admin' || u?.role === 'super_admin').length;
          const activeUsers = users.filter(u => u?.active === true).length;
          const inactiveUsers = users.filter(u => u?.active === false).length;
          
          // Calculate children linked to parents - NEW
          let totalChildrenLinked = 0;
          users.forEach(u => {
            if (u?.role === 'parent' && u.children && Array.isArray(u.children)) {
              totalChildrenLinked += u.children.length;
            }
          });
          
          userStats = {
            total: users.length,
            students,
            teachers,
            parents, // NEW
            admins,
            active: activeUsers,
            inactive: inactiveUsers,
            childrenLinked: totalChildrenLinked, // NEW
            byRole: {
              student: students,
              teacher: teachers,
              parent: parents, // NEW
              admin: admins
            }
          };
        } else {
          // Set default stats if no users found
          userStats = {
            total: 0,
            students: 0,
            teachers: 0,
            parents: 0, // NEW
            admins: 0,
            active: 0,
            inactive: 0,
            childrenLinked: 0, // NEW
            byRole: {
              student: 0,
              teacher: 0,
              parent: 0, // NEW
              admin: 0
            }
          };
        }
        
        console.log('✅ Users fetched:', users.length);
      } catch (err) {
        console.error('❌ Users fetch error:', err.message);
        // Set default stats
        userStats = {
          total: 0,
          students: 0,
          teachers: 0,
          parents: 0, // NEW
          admins: 0,
          active: 0,
          inactive: 0,
          childrenLinked: 0, // NEW
          byRole: {
            student: 0,
            teacher: 0,
            parent: 0, // NEW
            admin: 0
          }
        };
      }

      // 3. Fetch tests
      try {
        console.log('🔍 Fetching tests from:', `${API_BASE_URL}/api/tests`);
        
        const testsRes = await axios.get(`${API_BASE_URL}/api/tests`, { 
          headers,
          timeout: 8000 
        });
        
        console.log('📊 Tests API Response:', {
          status: testsRes.status,
          dataKeys: Object.keys(testsRes.data || {}),
          hasSuccess: testsRes.data?.success,
          hasTests: testsRes.data?.tests,
          hasData: testsRes.data?.data,
          responseSample: testsRes.data
        });
        
        tests = extractDataFromResponse(testsRes, 'tests');
        
        console.log('✅ Tests fetched:', tests.length);
      } catch (err) {
        console.error('❌ Tests fetch error:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          config: err.config?.url
        });
        tests = [];
      }

      // 4. Fetch sessions
      try {
        const sessionsRes = await axios.get(`${API_BASE_URL}/api/sessions?limit=10`, { 
          headers,
          timeout: 8000 
        });
        sessions = extractDataFromResponse(sessionsRes, 'sessions');
        console.log('✅ Sessions fetched:', sessions.length);
      } catch (err) {
        console.error('❌ Sessions fetch error:', err.message);
      }

      // Calculate statistics from fetched data
      const students = userStats.students || 0;
      const teachers = userStats.teachers || 0;
      const parents = userStats.parents || 0; // NEW
      const totalUsers = userStats.total || (students + teachers + parents);

      // Get upcoming sessions (next 30 days)
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const upcoming = Array.isArray(sessions) ? sessions
        .filter(session => {
          if (!session.startDate) return false;
          try {
            const sessionDate = new Date(session.startDate);
            return sessionDate >= now && sessionDate <= thirtyDaysFromNow;
          } catch (e) {
            return false;
          }
        })
        .sort((a, b) => {
          try {
            return new Date(a.startDate) - new Date(b.startDate);
          } catch (e) {
            return 0;
          }
        })
        .slice(0, 5)
        : [];

      // Get recent tests (last 5)
      const recentTests = Array.isArray(tests) ? tests
        .sort((a, b) => {
          try {
            const dateA = a.createdAt || a.updatedAt || a.date || 0;
            const dateB = b.createdAt || b.updatedAt || b.date || 0;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          } catch (e) {
            console.error('Sort error:', e);
            return 0;
          }
        })
        .slice(0, 5)
        : [];

      console.log('📊 Recent tests:', recentTests.length);

      // Update state with calculated data
      setData({
        stats: { 
          classes: Array.isArray(classes) ? classes.length : 0, 
          students, 
          teachers, 
          tests: Array.isArray(tests) ? tests.length : 0, 
          sessions: Array.isArray(sessions) ? sessions.length : 0,
          parents, // NEW
          childrenLinked: userStats.childrenLinked || 0 // NEW
        },
        recentTests,
        upcomingSessions: upcoming,
        userStats: {
          total: totalUsers,
          students,
          teachers,
          parents, // NEW
          admins: userStats.admins || 0,
          active: userStats.active || 0,
          inactive: userStats.inactive || 0,
          childrenLinked: userStats.childrenLinked || 0, // NEW
          byRole: {
            student: students,
            teacher: teachers,
            parent: parents, // NEW
            admin: userStats.admins || 0
          }
        }
      });

      setLastUpdated(new Date());
      console.log('✅ Dashboard data updated successfully');

    } catch (err) {
      console.error('💥 Dashboard fetch error:', err);
      setError('Failed to load dashboard data. Some features may be limited.');
    } finally {
      setLoading(false);
    }
  }, [user, API_BASE_URL]);

  useEffect(() => { 
    fetchDashboardData(); 
  }, [fetchDashboardData]);

  // Get status badge styling
  const getStatusStyle = (status) => {
    const statusLower = (status || '').toLowerCase();
    
    switch (statusLower) {
      case 'approved':
        return { bg: '#D1FAE5', color: '#065F46', border: '#A7F3D0', icon: '✓' };
      case 'draft':
        return { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', icon: '📝' };
      case 'pending':
        return { bg: '#DBEAFE', color: '#1E40AF', border: '#BFDBFE', icon: '⏳' };
      case 'scheduled':
        return { bg: '#E0E7FF', color: '#3730A3', border: '#C7D2FE', icon: '📅' };
      case 'active':
        return { bg: '#DCFCE7', color: '#166534', border: '#BBF7D0', icon: '▶️' };
      case 'completed':
        return { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB', icon: '✅' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB', icon: '❓' };
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Format time ago
  const timeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 },
      { label: 'second', seconds: 1 }
    ];
    
    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) {
        return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
      }
    }
    
    return 'just now';
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinnerContainer}>
          <FiRefreshCw style={styles.loadingSpinner} />
        </div>
        <p style={styles.loadingText}>Loading Dashboard Data...</p>
        <div style={styles.loadingDetails}>
          <p style={styles.loadingSubtext}>Fetching system statistics</p>
        </div>
      </div>
    );
  }

  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    return (
      <div style={styles.accessDenied}>
        <div style={styles.accessDeniedContent}>
          <FiAlertTriangle style={styles.accessDeniedIcon} />
          <h2 style={styles.accessDeniedTitle}>Access Denied</h2>
          <p style={styles.accessDeniedText}>
            Administrator access required. You need to be an admin or super admin to view this page.
          </p>
          <div style={styles.accessDeniedActions}>
            <button 
              onClick={() => navigate('/login')}
              style={styles.loginButton}
            >
              Go to Login
            </button>
            <button 
              onClick={() => navigate('/')}
              style={styles.homeButton}
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {error && (
        <div style={styles.errorBanner}>
          <div style={styles.errorContent}>
            <FiAlertTriangle style={styles.errorIcon} />
            <div style={styles.errorTextContent}>
              <strong style={styles.errorTitle}>Warning</strong>
              <span style={styles.errorText}>{error}</span>
            </div>
          </div>
          <button 
            onClick={() => setError('')} 
            style={styles.errorClose}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.titleSection}>
              <div style={styles.titleIconContainer}>
                <FiHome style={styles.titleIcon} />
              </div>
              <div>
                <h1 style={styles.title}>Admin Dashboard</h1>
                <p style={styles.subtitle}>
                  Welcome back, <strong style={styles.userName}>{user.name || user.username || 'Admin'}</strong>
                  {user.role === 'super_admin' && (
                    <span style={styles.superAdminBadge}>
                      <FiAward style={styles.badgeIcon} /> Super Admin
                    </span>
                  )}
                </p>
              </div>
            </div>
            {lastUpdated && (
              <p style={styles.lastUpdated}>
                Last updated: {timeAgo(lastUpdated)}
              </p>
            )}
          </div>
          <div style={styles.headerRight}>
            <div style={styles.headerActions}>
              <button 
                onClick={fetchDashboardData} 
                style={styles.refreshButton}
                disabled={loading}
                title="Refresh dashboard data"
              >
                <FiRefreshCw style={loading ? styles.refreshSpinner : styles.refreshIcon} />
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button 
                onClick={() => navigate('/admin/settings')}
                style={styles.settingsButton}
                title="System settings"
              >
                <FiSettings />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards - UPDATED WITH PARENT STATS */}
        <div style={styles.statsGrid}>
          {[
            { 
              label: 'Classes', 
              value: data.stats.classes, 
              icon: FiBook, 
              color: '#4B5320',
              description: 'Active classes',
              change: '+2%',
              trend: 'up'
            },
            { 
              label: 'Students', 
              value: data.stats.students, 
              icon: FiUsers, 
              color: '#2563EB',
              description: 'Enrolled students',
              change: '+12%',
              trend: 'up'
            },
            { 
              label: 'Teachers', 
              value: data.stats.teachers, 
              icon: FiUserCheck, 
              color: '#059669',
              description: 'Teaching staff',
              change: '+5%',
              trend: 'up'
            },
            { 
              label: 'Parents', 
              value: data.stats.parents, 
              icon: FiUser, 
              color: '#805AD5',
              description: 'Registered parents',
              change: data.stats.parents > 0 ? '+5%' : '0%',
              trend: data.stats.parents > 0 ? 'up' : 'neutral'
            },
            { 
              label: 'Linked Children', 
              value: data.stats.childrenLinked, 
              icon: FiLink, 
              color: '#00B5D8',
              description: 'Children linked',
              change: data.stats.childrenLinked > 0 ? '+8%' : '0%',
              trend: data.stats.childrenLinked > 0 ? 'up' : 'neutral'
            },
            { 
              label: 'Tests', 
              value: data.stats.tests, 
              icon: FiClipboard, 
              color: '#D97706',
              description: 'Total tests',
              change: data.stats.tests > 0 ? '+8%' : '0%',
              trend: data.stats.tests > 0 ? 'up' : 'neutral'
            },
            { 
              label: 'Sessions', 
              value: data.stats.sessions, 
              icon: FiCalendar, 
              color: '#7C3AED',
              description: 'Academic sessions',
              change: '+8%',
              trend: 'up'
            },
          ].map((stat, index) => (
            <div key={index} style={styles.statCard}>
              <div style={styles.statCardInner}>
                <div style={{...styles.statIconContainer, borderColor: stat.color}}>
                  <stat.icon style={{...styles.statIcon, color: stat.color}} />
                </div>
                <div style={styles.statContent}>
                  <p style={styles.statLabel}>{stat.label}</p>
                  <div style={styles.statValueRow}>
                    <p style={styles.statValue}>{stat.value.toLocaleString()}</p>
                    <span style={{
                      ...styles.statChange,
                      color: stat.trend === 'up' ? '#059669' : 
                             stat.trend === 'down' ? '#DC2626' : '#6B7280'
                    }}>
                      {stat.change}
                    </span>
                  </div>
                  <p style={styles.statDescription}>{stat.description}</p>
                </div>
              </div>
              <div style={styles.statCardFooter}>
                <button 
                  onClick={() => {
                    if (stat.label === 'Classes') navigate('/admin/classes');
                    if (stat.label === 'Students' || stat.label === 'Teachers' || stat.label === 'Parents') navigate('/admin/users');
                    if (stat.label === 'Tests') navigate('/admin/tests');
                    if (stat.label === 'Sessions') navigate('/admin/sessions');
                    if (stat.label === 'Linked Children') navigate('/admin/users?role=parent');
                  }}
                  style={styles.statCardButton}
                >
                  View Details <FiChevronRight />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions - UPDATED WITH PARENT ACTIONS */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionTitleRow}>
              <FiZap style={styles.sectionIcon} />
              <h3 style={styles.sectionTitle}>Quick Actions</h3>
            </div>
            <p style={styles.sectionSubtitle}>Manage your system efficiently with one click</p>
          </div>
          <div style={styles.actionsGrid}>
            {[
              { 
                title: 'Manage Users', 
                icon: FiUsers, 
                path: '/admin/users', 
                description: 'Add, edit, and manage all users',
                color: '#2563EB',
                count: data.userStats.total
              },
              { 
                title: 'Manage Parents', 
                icon: FiUser, 
                path: '/admin/users?role=parent', 
                description: 'View and manage parent accounts',
                color: '#805AD5',
                count: data.userStats.byRole.parent || 0
              },
              { 
                title: 'Create Parent', 
                icon: FiUserPlus, 
                path: '/admin/users/create-parent', 
                description: 'Create new parent account',
                color: '#9F7AEA'
              },
              { 
                title: 'Manage Classes', 
                icon: FiBook, 
                path: '/admin/classes', 
                description: 'View and edit all classes',
                color: '#4B5320',
                count: data.stats.classes
              },
              { 
                title: 'Promotion Panel', 
                icon: FiUserCheck, 
                path: '/admin/promotion', 
                description: 'Manage student promotions',
                color: '#059669'
              },
              { 
                title: 'Review Tests', 
                icon: FiClipboard, 
                path: '/admin/tests', 
                description: 'Approve and schedule tests',
                color: '#D97706',
                count: data.stats.tests
              },
              { 
                title: 'Academic Results', 
                icon: FiTrendingUp, 
                path: '/admin/results', 
                description: 'View and analyze results',
                color: '#7C3AED'
              },
              { 
                title: 'Session Schedules', 
                icon: FiCalendar, 
                path: '/admin/sessions', 
                description: 'Manage academic sessions',
                color: '#DC2626',
                count: data.stats.sessions
              },
              { 
                title: 'System Analytics', 
                icon: FiBarChart2, 
                path: '/admin/analytics', 
                description: 'View system analytics',
                color: '#0891B2'
              },
              { 
                title: 'Data Exports', 
                icon: FiDatabase, 
                path: '/admin/exports', 
                description: 'Export system data',
                color: '#475569'
              },
            ].map((action, index) => (
              <button 
                key={index}
                onClick={() => navigate(action.path)}
                style={styles.actionCard}
                title={action.description}
              >
                <div style={styles.actionCardHeader}>
                  <div style={{...styles.actionIconContainer, backgroundColor: `${action.color}15`}}>
                    <action.icon style={{...styles.actionIcon, color: action.color}} />
                  </div>
                  {action.count !== undefined && (
                    <div style={{...styles.actionCountBadge, backgroundColor: action.color}}>
                      {action.count}
                    </div>
                  )}
                </div>
                <div style={styles.actionContent}>
                  <h4 style={styles.actionTitle}>{action.title}</h4>
                  <p style={styles.actionDescription}>{action.description}</p>
                </div>
                <div style={styles.actionArrowContainer}>
                  <FiChevronRight style={styles.actionArrow} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={styles.columns}>
          {/* Recent Tests */}
          <div style={styles.column}>
            <div style={styles.columnHeader}>
              <div style={styles.columnIconContainer}>
                <FiClipboard style={styles.columnIcon} />
              </div>
              <div>
                <h3 style={styles.columnTitle}>Recent Tests</h3>
                <p style={styles.columnSubtitle}>{data.recentTests.length} recent tests</p>
              </div>
            </div>
            <div style={styles.columnContent}>
              {data.recentTests.length > 0 ? (
                <div style={styles.testList}>
                  {data.recentTests.map(test => {
                    const statusStyle = getStatusStyle(test.status);
                    const className = getClassName(test);
                    
                    return (
                      <div key={test._id || test.id} style={styles.testCard}>
                        <div style={styles.testInfo}>
                          <div style={styles.testHeader}>
                            <h4 style={styles.testTitle}>{test.title || 'Untitled Test'}</h4>
                            <span style={{
                              ...styles.statusBadge,
                              backgroundColor: statusStyle.bg,
                              color: statusStyle.color,
                              borderColor: statusStyle.border
                            }}>
                              <span style={styles.statusIcon}>{statusStyle.icon}</span>
                              {test.status || 'draft'}
                            </span>
                          </div>
                          <p style={styles.testMeta}>
                            <FiBook style={styles.metaIcon} />
                            {test.subject || 'General'} • {className}
                          </p>
                          <div style={styles.testFooter}>
                            <span style={styles.testDate}>
                              <FiClock style={styles.footerIcon} />
                              {formatDate(test.createdAt || test.updatedAt || test.date)}
                            </span>
                            {test.questions && (
                              <span style={styles.testQuestions}>
                                <FiFileText style={styles.footerIcon} />
                                {test.questions.length || 0} questions
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={styles.testActions}>
                          <button 
                            onClick={() => navigate(`/admin/tests/${test._id || test.id}`)}
                            style={styles.viewButton}
                            title="View test details"
                          >
                            <FiEye /> View
                          </button>
                          {(test.status === 'draft' || test.status === 'pending') && (
                            <button 
                              onClick={() => {
                                // approveTest(test._id || test.id);
                                alert('Approve functionality would go here');
                              }}
                              style={styles.approveButton}
                              title="Approve this test"
                            >
                              <FiCheck /> Approve
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={styles.emptyState}>
                  <FiClipboard style={styles.emptyIcon} />
                  <p style={styles.emptyText}>No recent tests found</p>
                  <p style={styles.emptySubtext}>Tests created will appear here</p>
                  <button 
                    onClick={() => navigate('/admin/tests')}
                    style={styles.manageButton}
                  >
                    <FiClipboard /> Go to Tests Management
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Sessions */}
          <div style={styles.column}>
            <div style={styles.columnHeader}>
              <div style={styles.columnIconContainer}>
                <FiCalendar style={styles.columnIcon} />
              </div>
              <div>
                <h3 style={styles.columnTitle}>Upcoming Sessions</h3>
                <p style={styles.columnSubtitle}>{data.upcomingSessions.length} sessions scheduled</p>
              </div>
            </div>
            <div style={styles.columnContent}>
              {data.upcomingSessions.length > 0 ? (
                <div style={styles.sessionList}>
                  {data.upcomingSessions.map(session => {
                    // Safely get session class name
                    let sessionClassName = 'Not specified';
                    if (session.class) {
                      if (typeof session.class === 'object' && session.class.name) {
                        sessionClassName = session.class.name;
                      } else if (typeof session.class === 'string') {
                        sessionClassName = session.class;
                      } else {
                        sessionClassName = 'Class ID: ' + (session.class._id || session.class).toString().substring(0, 8) + '...';
                      }
                    }
                    
                    return (
                      <div key={session._id || session.id} style={styles.sessionCard}>
                        <div style={styles.sessionInfo}>
                          <div style={styles.sessionHeader}>
                            <h4 style={styles.sessionTitle}>
                              {session.sessionName || session.name || 'Academic Session'}
                            </h4>
                            <span style={styles.sessionStatus}>
                              Upcoming
                            </span>
                          </div>
                          <p style={styles.sessionMeta}>
                            <FiClock style={styles.metaIcon} />
                            {formatDate(session.startDate)}
                            {session.term && ` • Term: ${session.term}`}
                          </p>
                          {session.description && (
                            <p style={styles.sessionDescription}>
                              {session.description.length > 100 
                                ? `${session.description.substring(0, 100)}...` 
                                : session.description}
                            </p>
                          )}
                          {session.class && (
                            <div style={styles.sessionFooter}>
                              <span style={styles.sessionClass}>
                                <FiBook style={styles.footerIcon} />
                                Class: {sessionClassName}
                              </span>
                              <span style={styles.sessionDuration}>
                                <FiClock style={styles.footerIcon} />
                                {session.duration || 'Not specified'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={styles.emptyState}>
                  <FiCalendar style={styles.emptyIcon} />
                  <p style={styles.emptyText}>No upcoming sessions scheduled</p>
                  <p style={styles.emptySubtext}>Schedule sessions to appear here</p>
                  <button 
                    onClick={() => navigate('/admin/sessions')}
                    style={styles.manageButton}
                  >
                    <FiCalendar /> Schedule New Session
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Summary - UPDATED WITH PARENT DISTRIBUTION */}
        <div style={styles.summary}>
          <div style={styles.summaryHeader}>
            <div style={styles.summaryTitleRow}>
              <FiTarget style={styles.summaryIcon} />
              <h3 style={styles.summaryTitle}>System Summary</h3>
            </div>
            <p style={styles.summarySubtitle}>Current system status and performance metrics</p>
          </div>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryCardHeader}>
                <FiUser style={styles.summaryCardIcon} />
                <h4 style={styles.summaryCardTitle}>User Distribution</h4>
              </div>
              <div style={styles.summaryCardContent}>
                <div style={styles.distributionItem}>
                  <span style={styles.distributionLabel}>Students:</span>
                  <span style={styles.distributionValue}>{data.userStats.byRole.student || 0}</span>
                  <div style={styles.distributionBarContainer}>
                    <div 
                      style={{
                        ...styles.distributionBar,
                        width: `${((data.userStats.byRole.student || 0) / Math.max(data.userStats.total, 1)) * 100}%`,
                        backgroundColor: '#2563EB'
                      }}
                    />
                  </div>
                </div>
                <div style={styles.distributionItem}>
                  <span style={styles.distributionLabel}>Teachers:</span>
                  <span style={styles.distributionValue}>{data.userStats.byRole.teacher || 0}</span>
                  <div style={styles.distributionBarContainer}>
                    <div 
                      style={{
                        ...styles.distributionBar,
                        width: `${((data.userStats.byRole.teacher || 0) / Math.max(data.userStats.total, 1)) * 100}%`,
                        backgroundColor: '#059669'
                      }}
                    />
                  </div>
                </div>
                <div style={styles.distributionItem}>
                  <span style={styles.distributionLabel}>Parents:</span>
                  <span style={styles.distributionValue}>{data.userStats.byRole.parent || 0}</span>
                  <div style={styles.distributionBarContainer}>
                    <div 
                      style={{
                        ...styles.distributionBar,
                        width: `${((data.userStats.byRole.parent || 0) / Math.max(data.userStats.total, 1)) * 100}%`,
                        backgroundColor: '#805AD5'
                      }}
                    />
                  </div>
                </div>
                <div style={styles.distributionItem}>
                  <span style={styles.distributionLabel}>Admins:</span>
                  <span style={styles.distributionValue}>{data.userStats.byRole.admin || 0}</span>
                  <div style={styles.distributionBarContainer}>
                    <div 
                      style={{
                        ...styles.distributionBar,
                        width: `${((data.userStats.byRole.admin || 0) / Math.max(data.userStats.total, 1)) * 100}%`,
                        backgroundColor: '#D97706'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryCardHeader}>
                <FiActivity style={styles.summaryCardIcon} />
                <h4 style={styles.summaryCardTitle}>System Status</h4>
              </div>
              <div style={styles.summaryCardContent}>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Total Users:</span>
                  <span style={styles.statusValue}>
                    {data.userStats.total.toLocaleString()}
                  </span>
                </div>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Last Updated:</span>
                  <span style={styles.statusValue}>
                    {lastUpdated ? timeAgo(lastUpdated) : 'Never'}
                  </span>
                </div>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>User Role:</span>
                  <span style={{
                    ...styles.statusValue,
                    color: user.role === 'super_admin' ? '#DC2626' : '#059669'
                  }}>
                    {user.role.toUpperCase()}
                  </span>
                </div>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Total Data Points:</span>
                  <span style={styles.statusValue}>
                    {Object.values(data.stats).reduce((a, b) => a + b, 0).toLocaleString()}
                  </span>
                </div>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Children Linked:</span>
                  <span style={styles.statusValue}>
                    {data.stats.childrenLinked.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryCardHeader}>
                <FiTrendingUp style={styles.summaryCardIcon} />
                <h4 style={styles.summaryCardTitle}>Quick Stats</h4>
              </div>
              <div style={styles.summaryCardContent}>
                <div style={styles.quickStat}>
                  <div style={styles.quickStatIconContainer}>
                    <FiLayers style={styles.quickStatIcon} />
                  </div>
                  <div style={styles.quickStatContent}>
                    <span style={styles.quickStatValue}>{data.stats.classes}</span>
                    <span style={styles.quickStatLabel}>Active Classes</span>
                  </div>
                </div>
                <div style={styles.quickStat}>
                  <div style={styles.quickStatIconContainer}>
                    <FiClipboard style={styles.quickStatIcon} />
                  </div>
                  <div style={styles.quickStatContent}>
                    <span style={styles.quickStatValue}>{data.stats.tests}</span>
                    <span style={styles.quickStatLabel}>Total Tests</span>
                  </div>
                </div>
                <div style={styles.quickStat}>
                  <div style={styles.quickStatIconContainer}>
                    <FiUser style={styles.quickStatIcon} />
                  </div>
                  <div style={styles.quickStatContent}>
                    <span style={styles.quickStatValue}>{data.stats.parents}</span>
                    <span style={styles.quickStatLabel}>Parents</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            System Dashboard • {new Date().getFullYear()} • Version 1.0.0
          </p>
          <p style={styles.footerSubtext}>
            Last full sync: {lastUpdated ? lastUpdated.toLocaleString() : 'Never'}
          </p>
        </div>
      </div>
    </div>
  );
};

// Styles (same as before)
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F8FAFC',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  content: {
    maxWidth: '1600px',
    margin: '0 auto',
    padding: '24px'
  },
  
  // Header styles (same as before)
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  headerLeft: {
    flex: 1
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '8px'
  },
  titleIconContainer: {
    width: '56px',
    height: '56px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    border: '1px solid #E5E7EB'
  },
  titleIcon: {
    fontSize: '28px',
    color: '#D4A017'
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    color: '#1F2937',
    margin: '0 0 4px 0',
    background: 'linear-gradient(135deg, #1F2937 0%, #4B5563 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    color: '#6B7280',
    margin: 0,
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  userName: {
    color: '#1F2937',
    fontWeight: '600'
  },
  superAdminBadge: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 8px',
    borderRadius: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    border: '1px solid #FDE68A'
  },
  badgeIcon: {
    fontSize: '12px'
  },
  lastUpdated: {
    fontSize: '14px',
    color: '#9CA3AF',
    margin: '8px 0 0 0',
    fontStyle: 'italic'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  refreshButton: {
    padding: '12px 24px',
    backgroundColor: '#FFFFFF',
    color: '#4B5320',
    border: '2px solid #D4A017',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#FEF3C7',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    },
    ':disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
      transform: 'none'
    }
  },
  refreshIcon: {
    fontSize: '16px'
  },
  refreshSpinner: {
    fontSize: '16px',
    animation: 'spin 1s linear infinite'
  },
  settingsButton: {
    width: '48px',
    height: '48px',
    backgroundColor: '#FFFFFF',
    color: '#6B7280',
    border: '1px solid #E5E7EB',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#F3F4F6',
      color: '#4B5320',
      transform: 'translateY(-2px)'
    }
  },
  
  // Stats Cards styles (same as before)
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '24px',
    marginBottom: '40px'
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 12px 20px -1px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.08)'
    }
  },
  statCardInner: {
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  statIconContainer: {
    width: '64px',
    height: '64px',
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid',
    flexShrink: 0
  },
  statIcon: {
    fontSize: '28px'
  },
  statContent: {
    flex: 1,
    minWidth: 0
  },
  statLabel: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 8px 0',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    marginBottom: '4px'
  },
  statValue: {
    fontSize: '36px',
    fontWeight: '800',
    color: '#1F2937',
    margin: 0,
    lineHeight: 1
  },
  statChange: {
    fontSize: '14px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.04)'
  },
  statDescription: {
    fontSize: '12px',
    color: '#9CA3AF',
    margin: 0
  },
  statCardFooter: {
    padding: '16px 24px',
    backgroundColor: '#F9FAFB',
    borderTop: '1px solid #E5E7EB'
  },
  statCardButton: {
    width: '100%',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#4B5320',
    border: '1px solid #D4A017',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#D4A017',
      color: '#FFFFFF'
    }
  },
  
  // Sections styles (same as before)
  section: {
    marginBottom: '48px'
  },
  sectionHeader: {
    marginBottom: '24px'
  },
  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px'
  },
  sectionIcon: {
    fontSize: '24px',
    color: '#D4A017'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1F2937',
    margin: 0
  },
  sectionSubtitle: {
    fontSize: '16px',
    color: '#6B7280',
    margin: 0
  },
  
  // Quick Actions styles (same as before)
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px'
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
      borderColor: '#D4A017'
    },
    ':before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      backgroundColor: '#D4A017',
      opacity: 0,
      transition: 'opacity 0.2s ease'
    },
    ':hover:before': {
      opacity: 1
    }
  },
  actionCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  actionIconContainer: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionIcon: {
    fontSize: '24px'
  },
  actionCountBadge: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#FFFFFF',
    padding: '4px 8px',
    borderRadius: '12px',
    minWidth: '32px',
    textAlign: 'center'
  },
  actionContent: {
    flex: 1,
    textAlign: 'left'
  },
  actionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1F2937',
    margin: '0 0 8px 0'
  },
  actionDescription: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0,
    lineHeight: 1.5
  },
  actionArrowContainer: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  actionArrow: {
    fontSize: '20px',
    color: '#9CA3AF',
    transition: 'transform 0.2s ease'
  },
  
  // Columns styles (same as before)
  columns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px',
    marginBottom: '48px'
  },
  column: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },
  columnHeader: {
    padding: '24px 24px 16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    borderBottom: '1px solid #E5E7EB'
  },
  columnIconContainer: {
    width: '48px',
    height: '48px',
    backgroundColor: '#FEF3C7',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  columnIcon: {
    fontSize: '24px',
    color: '#D4A017'
  },
  columnTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1F2937',
    margin: '0 0 4px 0'
  },
  columnSubtitle: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0
  },
  columnContent: {
    padding: '24px'
  },
  
  // Test Cards styles (same as before)
  testList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  testCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px',
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#F3F4F6',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
    }
  },
  testInfo: {
    flex: 1,
    minWidth: 0
  },
  testHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '12px'
  },
  testTitle: {
    fontWeight: '600',
    color: '#1F2937',
    margin: 0,
    fontSize: '16px',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  statusBadge: {
    fontSize: '12px',
    padding: '6px 12px',
    borderRadius: '20px',
    fontWeight: '600',
    border: '1px solid',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0
  },
  statusIcon: {
    fontSize: '14px'
  },
  testMeta: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 12px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  metaIcon: {
    fontSize: '14px',
    flexShrink: 0
  },
  testFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap'
  },
  footerIcon: {
    fontSize: '12px',
    marginRight: '4px',
    color: '#9CA3AF'
  },
  testDate: {
    fontSize: '12px',
    color: '#9CA3AF',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  testQuestions: {
    fontSize: '12px',
    color: '#9CA3AF',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  testActions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
    marginLeft: '16px'
  },
  viewButton: {
    padding: '8px 16px',
    fontSize: '12px',
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#2563EB',
      transform: 'translateY(-1px)'
    }
  },
  approveButton: {
    padding: '8px 16px',
    fontSize: '12px',
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#059669',
      transform: 'translateY(-1px)'
    }
  },
  
  // Session Cards styles (same as before)
  sessionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  sessionCard: {
    padding: '20px',
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#F3F4F6',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
    }
  },
  sessionInfo: {
    width: '100%'
  },
  sessionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '12px'
  },
  sessionTitle: {
    fontWeight: '600',
    color: '#1F2937',
    margin: '0 8px 0 0',
    fontSize: '16px',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  sessionStatus: {
    fontSize: '12px',
    padding: '6px 12px',
    borderRadius: '20px',
    fontWeight: '600',
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
    border: '1px solid #BFDBFE',
    flexShrink: 0
  },
  sessionMeta: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 12px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  sessionDescription: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '12px 0',
    lineHeight: 1.5
  },
  sessionFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    marginTop: '12px'
  },
  sessionClass: {
    fontSize: '12px',
    color: '#9CA3AF',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  sessionDuration: {
    fontSize: '12px',
    color: '#9CA3AF',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  
  // Buttons styles (same as before)
  manageButton: {
    width: '100%',
    marginTop: '20px',
    padding: '12px 24px',
    backgroundColor: '#D4A017',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#B38A14',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }
  },
  
  // Empty States styles (same as before)
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    color: '#9CA3AF'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    opacity: 0.5
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 8px 0',
    color: '#6B7280'
  },
  emptySubtext: {
    fontSize: '14px',
    margin: '0 0 24px 0',
    color: '#9CA3AF'
  },
  
  // Summary styles (same as before)
  summary: {
    backgroundColor: '#FFFFFF',
    padding: '32px',
    borderRadius: '16px',
    border: '1px solid #E5E7EB',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    marginBottom: '48px'
  },
  summaryHeader: {
    marginBottom: '32px'
  },
  summaryTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px'
  },
  summaryIcon: {
    fontSize: '24px',
    color: '#D4A017'
  },
  summaryTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1F2937',
    margin: 0
  },
  summarySubtitle: {
    fontSize: '16px',
    color: '#6B7280',
    margin: 0
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px'
  },
  summaryCard: {
    backgroundColor: '#F9FAFB',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #E5E7EB'
  },
  summaryCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px'
  },
  summaryCardIcon: {
    fontSize: '20px',
    color: '#4B5320'
  },
  summaryCardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1F2937',
    margin: 0
  },
  summaryCardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  
  // Distribution Items styles (same as before)
  distributionItem: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    alignItems: 'center',
    gap: '12px'
  },
  distributionLabel: {
    fontSize: '14px',
    color: '#6B7280',
    fontWeight: '500'
  },
  distributionValue: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'right'
  },
  distributionBarContainer: {
    gridColumn: '1 / -1',
    height: '8px',
    backgroundColor: '#E5E7EB',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  distributionBar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease'
  },
  
  // Status Items styles (same as before)
  statusItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #E5E7EB',
    ':last-child': {
      borderBottom: 'none'
    }
  },
  statusLabel: {
    fontSize: '14px',
    color: '#6B7280',
    fontWeight: '500'
  },
  statusValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1F2937'
  },
  
  // Quick Stats styles (same as before)
  quickStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    border: '1px solid #E5E7EB'
  },
  quickStatIconContainer: {
    width: '48px',
    height: '48px',
    backgroundColor: '#FEF3C7',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  quickStatIcon: {
    fontSize: '20px',
    color: '#D4A017'
  },
  quickStatContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  quickStatValue: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#1F2937',
    lineHeight: 1
  },
  quickStatLabel: {
    fontSize: '12px',
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  
  // Footer styles (same as before)
  footer: {
    textAlign: 'center',
    padding: '24px',
    color: '#6B7280',
    borderTop: '1px solid #E5E7EB',
    marginTop: '32px'
  },
  footerText: {
    fontSize: '14px',
    margin: '0 0 8px 0',
    fontWeight: '500'
  },
  footerSubtext: {
    fontSize: '12px',
    margin: 0,
    color: '#9CA3AF'
  },
  
  // Error States styles (same as before)
  errorBanner: {
    marginBottom: '24px',
    padding: '16px 20px',
    backgroundColor: '#FED7D7',
    border: '1px solid #FECACA',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
  },
  errorContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1
  },
  errorIcon: {
    fontSize: '24px',
    color: '#DC2626',
    flexShrink: 0
  },
  errorTextContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1
  },
  errorTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#DC2626',
    margin: 0
  },
  errorText: {
    fontSize: '14px',
    color: '#991B1B',
    margin: 0
  },
  errorClose: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#DC2626',
    padding: '0',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
    flexShrink: 0,
    ':hover': {
      backgroundColor: '#FECACA'
    }
  },
  
  // Loading State styles (same as before)
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#F8FAFC',
    padding: '24px',
    textAlign: 'center'
  },
  loadingSpinnerContainer: {
    width: '80px',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '24px'
  },
  loadingSpinner: {
    fontSize: '64px',
    animation: 'spin 1s linear infinite',
    color: '#D4A017'
  },
  loadingText: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0 0 16px 0'
  },
  loadingDetails: {
    maxWidth: '400px',
    width: '100%'
  },
  loadingSubtext: {
    fontSize: '16px',
    color: '#6B7280',
    margin: '0 0 20px 0'
  },
  
  // Access Denied styles (same as before)
  accessDenied: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#F8FAFC',
    padding: '24px'
  },
  accessDeniedContent: {
    textAlign: 'center',
    padding: '48px',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    border: '1px solid #E5E7EB',
    maxWidth: '500px',
    width: '100%'
  },
  accessDeniedIcon: {
    fontSize: '80px',
    color: '#DC2626',
    marginBottom: '32px'
  },
  accessDeniedTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1F2937',
    margin: '0 0 16px 0'
  },
  accessDeniedText: {
    fontSize: '18px',
    color: '#6B7280',
    margin: '0 0 32px 0',
    lineHeight: 1.6
  },
  accessDeniedActions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center'
  },
  loginButton: {
    padding: '14px 32px',
    backgroundColor: '#D4A017',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#B38A14',
      transform: 'translateY(-2px)'
    }
  },
  homeButton: {
    padding: '14px 32px',
    backgroundColor: '#F3F4F6',
    color: '#4B5320',
    border: '2px solid #D4A017',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#D4A017',
      color: '#FFFFFF'
    }
  }
};

// Add CSS animations
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  styleSheet.insertRule(`
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `, styleSheet.cssRules.length);
  
  styleSheet.insertRule(`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `, styleSheet.cssRules.length);
  
  styleSheet.insertRule(`
    .stat-card {
      animation: fadeIn 0.5s ease-out;
    }
  `, styleSheet.cssRules.length);
}

export default AdminDashboard;