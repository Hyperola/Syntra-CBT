import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FiAlertTriangle, 
  FiUsers, 
  FiClipboard, 
  FiBarChart, 
  FiCalendar,
  FiHome,
  FiBook,
  FiDownload,
  FiTrendingUp,
  FiUserCheck
} from 'react-icons/fi';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    classes: 0,
    students: 0,
    teachers: 0,
    tests: 0,
    sessions: 0
  });
  const [recentTests, setRecentTests] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      console.log('🔍 Fetching dashboard data...');
      
      // Fetch data with individual error handling for each endpoint
      let classes = [];
      let users = [];
      let tests = [];
      let sessions = [];

      // Fetch classes
      try {
        const classesRes = await axios.get('https://waec-gfv0.onrender.com/api/classes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        classes = classesRes.data || [];
        console.log('✅ Classes loaded:', classes.length);
      } catch (err) {
        console.warn('❌ Classes API error:', err.message);
      }

      // Fetch users - with multiple fallback attempts
      try {
        // First try the main users endpoint
        const usersRes = await axios.get('https://waec-gfv0.onrender.com/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        // Handle both array and paginated response formats
        if (Array.isArray(usersRes.data)) {
          users = usersRes.data;
        } else if (usersRes.data && usersRes.data.users) {
          users = usersRes.data.users;
        } else {
          users = [];
        }
        console.log('✅ Users loaded via main endpoint:', users.length);
        
      } catch (err) {
        console.warn('❌ Main users API error:', err.message);
        
        // Try debug endpoint as fallback
        try {
          const debugRes = await axios.get('https://waec-gfv0.onrender.com/api/users/debug/all');
          users = debugRes.data.users || [];
          console.log('✅ Users loaded via debug endpoint:', users.length);
        } catch (debugErr) {
          console.warn('❌ Debug users API also failed:', debugErr.message);
          users = [];
        }
      }

      // Fetch tests
      try {
        const testsRes = await axios.get('https://waec-gfv0.onrender.com/api/tests/admin', {
          headers: { Authorization: `Bearer ${token}` },
        });
        tests = testsRes.data || [];
        console.log('✅ Tests loaded:', tests.length);
      } catch (err) {
        console.warn('❌ Tests API error:', err.message);
        tests = [];
      }

      // Fetch sessions
      try {
        const sessionsRes = await axios.get('https://waec-gfv0.onrender.com/api/sessions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        sessions = sessionsRes.data || [];
        console.log('✅ Sessions loaded:', sessions.length);
      } catch (err) {
        console.warn('❌ Sessions API error:', err.message);
        sessions = [];
      }

      // Calculate stats with smart fallbacks
      const studentCount = users.length > 0 
        ? users.filter(u => u && u.role === 'student').length 
        : classes.reduce((total, cls) => total + (cls.currentStudents || 0), 0);

      const teacherCount = users.length > 0
        ? users.filter(u => u && u.role === 'teacher').length
        : classes.reduce((total, cls) => total + (cls.teachersCount || 1), 0);

      setStats({
        classes: classes.length,
        students: studentCount,
        teachers: teacherCount,
        tests: tests.length,
        sessions: sessions.length
      });

      // Get recent tests
      setRecentTests(tests.slice(0, 5));
      
      // Get upcoming sessions
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 30);
      const upcoming = sessions
        .filter(session => session.startDate && new Date(session.startDate) <= nextWeek)
        .slice(0, 5);
      setUpcomingSessions(upcoming);

      // Show info if using estimated data
      if (users.length === 0) {
        setError('Note: User counts are estimated from class data. Users API configuration in progress.');
      } else {
        setError(null);
      }

    } catch (err) {
      console.error('Dashboard error:', err);
      setError('Some dashboard data failed to load, but you can still use available features.');
    }
    setLoading(false);
  };

  const handleApproveTest = async (testId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `https://waec-gfv0.onrender.com/api/tests/${testId}/approve`,
        { status: 'approved' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchDashboardData(); // Refresh data
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve test.');
    }
  };

  const quickActions = [
    { 
      title: 'Student Promotion', 
      desc: 'Promote students to next classes', 
      path: '/admin/promotion', 
      icon: <FiUserCheck />,
      color: '#10B981'
    },
    { 
      title: 'Manage Classes', 
      desc: 'Add or edit classes and subjects', 
      path: '/admin/classes', 
      icon: <FiBook />,
      color: '#3B82F6'
    },
    { 
      title: 'User Management', 
      desc: 'Manage all user accounts', 
      path: '/admin/users', 
      icon: <FiUsers />,
      color: '#8B5CF6'
    },
    { 
      title: 'Test Management', 
      desc: 'Review and approve tests', 
      path: '/admin/tests', 
      icon: <FiClipboard />,
      color: '#F59E0B'
    },
    { 
      title: 'Academic Records', 
      desc: 'View student academic records', 
      path: '/admin/academic-records', 
      icon: <FiTrendingUp />,
      color: '#EC4899'
    },
    { 
      title: 'Sessions/Terms', 
      desc: 'Manage academic sessions', 
      path: '/admin/sessions', 
      icon: <FiCalendar />,
      color: '#6B7280'
    }
  ];

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div style={styles.accessDenied}>
        <h2>Access Restricted</h2>
        <p>This page is only available to administrators.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {error && (
        <div style={{
          ...styles.message,
          ...(error.includes('estimated') ? styles.warningMessage : styles.errorMessage)
        }}>
          <FiAlertTriangle style={styles.alertIcon} />
          <span>{error}</span>
          <button 
            onClick={() => setError(null)} 
            style={styles.alertClose}
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>
            <FiHome style={styles.headerIcon} />
            Admin Dashboard
          </h1>
          <p style={styles.headerSubtitle}>
            Welcome back, {user.name}! Here's what's happening at Sanniville Academy today.
            {user.role === 'super_admin' && ' (Super Admin Mode)'}
          </p>
        </div>
        <div style={styles.headerStats}>
          <div style={styles.headerStat}>
            <span style={styles.headerStatLabel}>Total Students</span>
            <span style={styles.headerStatValue}>{stats.students}</span>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIconWrapper, backgroundColor: '#DBEAFE' }}>
            <FiBook style={{ ...styles.statIcon, color: '#3B82F6' }} />
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statTitle}>Classes</h3>
            <p style={styles.statValue}>{stats.classes}</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIconWrapper, backgroundColor: '#DCFCE7' }}>
            <FiUsers style={{ ...styles.statIcon, color: '#10B981' }} />
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statTitle}>Students</h3>
            <p style={styles.statValue}>{stats.students}</p>
            {stats.students === 0 && (
              <span style={styles.estimateBadge}>Estimated</span>
            )}
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIconWrapper, backgroundColor: '#FEF3C7' }}>
            <FiClipboard style={{ ...styles.statIcon, color: '#F59E0B' }} />
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statTitle}>Total Tests</h3>
            <p style={styles.statValue}>{stats.tests}</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIconWrapper, backgroundColor: '#E0E7FF' }}>
            <FiCalendar style={{ ...styles.statIcon, color: '#8B5CF6' }} />
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statTitle}>Academic Sessions</h3>
            <p style={styles.statValue}>{stats.sessions}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Quick Actions</h2>
        <div style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <div 
              key={index} 
              style={styles.actionCard}
              onClick={() => navigate(action.path)}
            >
              <div style={{...styles.actionIcon, color: action.color}}>
                {action.icon}
              </div>
              <div style={styles.actionContent}>
                <h3 style={styles.actionTitle}>{action.title}</h3>
                <p style={styles.actionDesc}>{action.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.columns}>
        {/* Recent Tests */}
        <div style={styles.column}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Recent Tests</h3>
            <div style={styles.list}>
              {recentTests.length > 0 ? recentTests.map((test) => (
                <div key={test._id} style={styles.listItem}>
                  <div style={styles.listItemContent}>
                    <strong style={styles.listItemTitle}>{test.title}</strong>
                    <span style={styles.listItemMeta}>{test.subject} • {test.class}</span>
                    <span style={{
                      ...styles.statusBadge,
                      ...(test.status === 'approved' ? styles.statusApproved : 
                           test.status === 'draft' || test.status === 'pending' ? styles.statusPending : 
                           styles.statusDraft)
                    }}>
                      {test.status}
                    </span>
                  </div>
                  <div style={styles.listItemActions}>
                    <button
                      onClick={() => navigate(`/admin/tests/${test._id}`)}
                      style={styles.smallButton}
                    >
                      View
                    </button>
                    {(test.status === 'draft' || test.status === 'pending') && (
                      <button
                        onClick={() => handleApproveTest(test._id)}
                        style={styles.smallButtonPrimary}
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              )) : (
                <p style={styles.noData}>No tests found</p>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div style={styles.column}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Upcoming Sessions</h3>
            <div style={styles.list}>
              {upcomingSessions.length > 0 ? upcomingSessions.map((session) => (
                <div key={session._id} style={styles.listItem}>
                  <div style={styles.listItemContent}>
                    <strong style={styles.listItemTitle}>{session.name || 'Academic Session'}</strong>
                    <span style={styles.listItemMeta}>
                      {session.startDate ? new Date(session.startDate).toLocaleDateString() : 'No date'} • {session.term || 'No term'}
                    </span>
                    <span style={styles.listItemMeta}>{session.description || 'Academic session'}</span>
                  </div>
                  <button
                    onClick={() => navigate('/admin/sessions')}
                    style={styles.smallButton}
                  >
                    View
                  </button>
                </div>
              )) : (
                <p style={styles.noData}>No upcoming sessions</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '0',
    fontFamily: '"Fredoka", sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2c3e50',
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: {
    fontSize: '32px',
  },
  headerSubtitle: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0,
  },
  headerStats: {
    display: 'flex',
    gap: '20px',
  },
  headerStat: {
    textAlign: 'right',
  },
  headerStatLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '4px',
  },
  headerStatValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: '700',
    color: '#2c3e50',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  },
  statIconWrapper: {
    padding: '12px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    fontSize: '24px',
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#64748b',
    margin: '0 0 8px 0',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  estimateBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontSize: '10px',
    borderRadius: '8px',
    fontWeight: '600',
    marginTop: '4px',
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#2c3e50',
    margin: '0 0 20px 0',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  actionIcon: {
    fontSize: '24px',
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#f8fafc',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: '0 0 8px 0',
  },
  actionDesc: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.4',
  },
  columns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  listItem: {
    backgroundColor: '#FFFFFF',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: '4px',
  },
  listItemMeta: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '4px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: '600',
    borderRadius: '8px',
    textTransform: 'capitalize',
  },
  statusApproved: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
  },
  statusDraft: {
    backgroundColor: '#F3F4F6',
    color: '#374151',
  },
  listItemActions: {
    display: 'flex',
    gap: '8px',
    marginLeft: '12px',
  },
  smallButton: {
    padding: '6px 12px',
    backgroundColor: '#f8fafc',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  smallButtonPrimary: {
    padding: '6px 12px',
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  message: {
    padding: '15px',
    margin: '15px 0',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorMessage: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    border: '1px solid #FECACA',
  },
  warningMessage: {
    backgroundColor: '#FFFBEB',
    color: '#92400E',
    border: '1px solid #FCD34D',
  },
  alertIcon: {
    fontSize: '20px',
    marginRight: '12px',
  },
  alertClose: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0',
    width: '24px',
    height: '24px',
  },
  noData: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: '14px',
    padding: '40px 20px',
  },
  accessDenied: {
    textAlign: 'center',
    padding: '4rem',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    maxWidth: '600px',
    margin: '2rem auto',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: '#64748b',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #3B82F6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
};

// Add CSS for spinner animation
const spinnerStyles = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// Inject styles
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(spinnerStyles, styleSheet.cssRules.length);

export default AdminDashboard;