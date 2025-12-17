import React from 'react';
import { useNavigate } from 'react-router-dom';
import useTeacherData from '../../hooks/useTeacherData';
import { FiPlus, FiBook, FiBarChart2, FiEdit2, FiAlertTriangle, FiCheckCircle, FiUsers, FiFileText, FiCalendar, FiGrid, FiActivity, FiTrendingUp } from 'react-icons/fi';

const Dashboard = () => {
  const { user, tests, questions, error, success, setError } = useTeacherData();
  const navigate = useNavigate();

  const handleEditTest = (testId) => {
    if (!testId || !/^[0-9a-fA-F]{24}$/.test(testId)) {
      console.error('Edit test error: Invalid testId:', testId);
      setError('Invalid test ID. Please select a valid test.');
      return;
    }
    navigate(`/teacher/test-creation/${testId}`);
  };

  const handleViewResults = (testId) => {
    console.log('Dashboard - Navigating to results for testId:', testId);
    if (!testId || !/^[0-9a-fA-F]{24}$/.test(testId)) {
      console.error('View results error: Invalid testId:', testId);
      setError('Invalid test ID. Please select a valid test.');
      return;
    }
    navigate(`/teacher/test-results/${testId}`);
  };

  // Calculate active and upcoming tests based on batches
  const activeTestsCount = tests.filter(t => 
    t.status === 'scheduled' && 
    t.batches?.some(batch => 
      batch.schedule?.start && 
      batch.schedule?.end && 
      new Date() >= new Date(batch.schedule.start) && 
      new Date() <= new Date(batch.schedule.end)
    )
  ).length;

  const upcomingTestsCount = tests.filter(t => 
    t.status === 'scheduled' && 
    t.batches?.some(batch => 
      batch.schedule?.start && 
      new Date(batch.schedule.start) > new Date()
    )
  ).length;

  const completedTestsCount = tests.filter(t => 
    t.status === 'completed' || 
    t.batches?.every(batch => 
      batch.schedule?.end && 
      new Date(batch.schedule.end) < new Date()
    )
  ).length;

  // Your brand colors
  const brandColors = {
    primary: '#4B5320', // Army green
    secondary: '#D4A017', // Golden rod
    accent: '#8B4513', // Saddle brown
    light: '#F5F5DC', // Beige
    dark: '#2C3E50', // Dark blue
    success: '#28A745',
    warning: '#FFC107',
    danger: '#DC3545',
    info: '#17A2B8',
    background: '#F8F9FA',
    cardBg: '#FFFFFF'
  };

  const quickActions = [
    {
      label: 'Create Test',
      icon: <FiPlus size={20} />,
      action: () => navigate('/teacher/test-creation'),
      color: brandColors.primary,
      description: 'Design new assessments'
    },
    {
      label: 'Add Question',
      icon: <FiFileText size={20} />,
      action: () => navigate('/teacher/add-question'),
      color: brandColors.secondary,
      description: 'Expand question bank'
    },
    {
      label: 'Manage Tests',
      icon: <FiBook size={20} />,
      action: () => navigate('/teacher/tests'),
      color: brandColors.accent,
      description: 'View all assessments'
    },
    {
      label: 'Analytics',
      icon: <FiBarChart2 size={20} />,
      action: () => navigate('/teacher/analytics'),
      color: brandColors.info,
      description: 'Performance insights'
    }
  ];

  const statsCards = [
    {
      title: 'Active Tests',
      value: activeTestsCount,
      icon: <FiActivity size={20} />,
      color: brandColors.success,
      bgColor: '#E6FFE6'
    },
    {
      title: 'Question Bank',
      value: questions.length,
      icon: <FiFileText size={20} />,
      color: brandColors.info,
      bgColor: '#D1ECF1'
    },
    {
      title: 'Upcoming Tests',
      value: upcomingTestsCount,
      icon: <FiCalendar size={20} />,
      color: brandColors.warning,
      bgColor: '#FFF3CD'
    },
    {
      title: 'Completed',
      value: completedTestsCount,
      icon: <FiTrendingUp size={20} />,
      color: brandColors.primary,
      bgColor: '#F0F4FF'
    }
  ];

  return (
    <div style={styles.container(brandColors)}>
      {/* Header */}
      <div style={styles.header(brandColors)}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.headerTitle}>Educator Dashboard</h1>
            <p style={styles.headerSubtitle}>
              Welcome back, <span style={styles.userName}>{user.name} {user.surname}</span>
            </p>
          </div>
          <div style={styles.headerStats}>
            <div style={styles.headerStatItem(brandColors)}>
              <FiBook style={styles.headerStatIcon} />
              <div>
                <span style={styles.headerStatValue}>{activeTestsCount}</span>
                <span style={styles.headerStatLabel}>Active Tests</span>
              </div>
            </div>
            <div style={styles.headerStatItem(brandColors)}>
              <FiUsers style={styles.headerStatIcon} />
              <div>
                <span style={styles.headerStatValue}>{questions.length}</span>
                <span style={styles.headerStatLabel}>Questions</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div style={styles.alertsContainer}>
        {error && (
          <div style={styles.alertError(brandColors)}>
            <FiAlertTriangle style={styles.alertIcon} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div style={styles.alertSuccess(brandColors)}>
            <FiCheckCircle style={styles.alertIcon} />
            <span>{success}</span>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={styles.section(brandColors)}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle(brandColors)}>Quick Actions</h2>
          <p style={styles.sectionDescription}>Perform common tasks quickly</p>
        </div>
        <div style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              style={styles.actionButton(action.color, brandColors)}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={styles.actionIconContainer(action.color)}>
                {action.icon}
              </div>
              <div style={styles.actionContent}>
                <h3 style={styles.actionTitle}>{action.label}</h3>
                <p style={styles.actionDescription}>{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div style={styles.statsSection(brandColors)}>
        <div style={styles.statsHeader}>
          <h2 style={styles.sectionTitle(brandColors)}>Overview</h2>
          <p style={styles.sectionDescription}>Your teaching metrics at a glance</p>
        </div>
        <div style={styles.statsGrid}>
          {statsCards.map((stat, index) => (
            <div 
              key={index} 
              style={styles.statCard(stat.bgColor, brandColors)}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={styles.statIconContainer(stat.color)}>
                {stat.icon}
              </div>
              <div style={styles.statContent}>
                <h3 style={styles.statTitle}>{stat.title}</h3>
                <p style={styles.statValue}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={styles.twoColumnLayout}>
        {/* Recent Tests */}
        <div style={styles.mainColumn}>
          <div style={styles.section(brandColors)}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle(brandColors)}>Recent Tests</h2>
              <button 
                onClick={() => navigate('/teacher/tests')} 
                style={styles.viewAllButton(brandColors)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brandColors.primary}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                View All
              </button>
            </div>
            {tests.length > 0 ? (
              <div style={styles.testList}>
                {tests.slice(0, 5).map(test => (
                  <div 
                    key={test._id} 
                    style={styles.testCard(brandColors)}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                  >
                    <div style={styles.testCardContent}>
                      <div style={styles.testHeader}>
                        <h3 style={styles.testTitle}>{test.title}</h3>
                        <span style={styles.testStatus(test.status, brandColors)}>
                          {test.status}
                        </span>
                      </div>
                      <p style={styles.testMeta}>
                        <span style={styles.testSubject}>{test.subject}</span> • 
                        <span style={styles.testClass}> {test.class}</span>
                      </p>
                      {test.batches?.length > 0 && (
                        <div style={styles.testSchedule}>
                          <FiCalendar size={14} />
                          <span style={styles.testDates}>
                            {new Date(test.batches[0].schedule.start).toLocaleDateString()} -{' '}
                            {new Date(test.batches[0].schedule.end).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div style={styles.testActions}>
                        <button 
                          onClick={() => handleEditTest(test._id)} 
                          style={styles.testActionButton(brandColors.secondary)}
                        >
                          <FiEdit2 size={16} /> Manage
                        </button>
                        <button 
                          onClick={() => handleViewResults(test._id)} 
                          style={styles.testActionButton(brandColors.primary)}
                        >
                          <FiUsers size={16} /> Results
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyState(brandColors)}>
                <div style={styles.emptyStateIcon}>
                  <FiBook size={48} />
                </div>
                <h3 style={styles.emptyStateTitle}>No tests created yet</h3>
                <p style={styles.emptyStateDescription}>
                  Start by creating your first assessment
                </p>
                <button 
                  onClick={() => navigate('/teacher/test-creation')} 
                  style={styles.primaryButton(brandColors)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brandColors.accent}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = brandColors.secondary}
                >
                  <FiPlus size={18} /> Create Your First Test
                </button>
              </div>
            )}
          </div>

          {/* Your Subjects */}
          <div style={styles.section(brandColors)}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle(brandColors)}>Your Subjects</h2>
              <p style={styles.sectionDescription}>Subjects you're currently teaching</p>
            </div>
            {user.subjects && user.subjects.length > 0 ? (
              <div style={styles.subjectsGrid}>
                {user.subjects.map((sub, index) => (
                  <div 
                    key={index} 
                    style={styles.subjectCard(brandColors)}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={styles.subjectIcon(brandColors.secondary)}>
                      <FiBook size={20} />
                    </div>
                    <div style={styles.subjectContent}>
                      <h4 style={styles.subjectTitle}>{sub.subject}</h4>
                      <p style={styles.subjectClass}>{sub.class}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyStateSmall}>
                <p style={styles.noSubjects}>No subjects assigned</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={styles.sidebar}>
          {/* Analytics Card */}
          <div style={styles.section(brandColors)}>
            <div style={styles.analyticsCard(brandColors)}>
              <div style={styles.analyticsIconContainer(brandColors)}>
                <FiBarChart2 size={32} />
              </div>
              <h3 style={styles.analyticsTitle}>Performance Analytics</h3>
              <p style={styles.analyticsDescription}>
                Track student performance, identify trends, and get insights to improve your teaching.
              </p>
              <button 
                onClick={() => navigate('/teacher/analytics')} 
                style={styles.analyticsButton(brandColors)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brandColors.primary}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = brandColors.secondary}
              >
                <FiBarChart2 size={18} /> Open Analytics
              </button>
            </div>
          </div>

          {/* Quick Tips */}
          <div style={styles.section(brandColors)}>
            <h3 style={styles.sectionTitle(brandColors)}>Quick Tips</h3>
            <div style={styles.tipsList}>
              <div style={styles.tipItem}>
                <div style={styles.tipIcon(brandColors.success)}>
                  <FiCheckCircle size={16} />
                </div>
                <span style={styles.tipText}>Regularly update your question bank</span>
              </div>
              <div style={styles.tipItem}>
                <div style={styles.tipIcon(brandColors.info)}>
                  <FiCalendar size={16} />
                </div>
                <span style={styles.tipText}>Schedule tests at least 3 days in advance</span>
              </div>
              <div style={styles.tipItem}>
                <div style={styles.tipIcon(brandColors.warning)}>
                  <FiAlertTriangle size={16} />
                </div>
                <span style={styles.tipText}>Review test results within 24 hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Responsive Styles with Brand Colors
const styles = {
  container: (colors) => ({
    fontFamily: '"Segoe UI", "Roboto", sans-serif',
    minHeight: '100vh',
    backgroundColor: colors.background,
    padding: '20px',
    '@media (max-width: 768px)': {
      padding: '15px',
    },
    '@media (max-width: 480px)': {
      padding: '10px',
    },
  }),

  // Header
  header: (colors) => ({
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.dark} 100%)`,
    color: '#FFFFFF',
    borderRadius: '12px',
    marginBottom: '25px',
    padding: '30px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    '@media (max-width: 768px)': {
      padding: '20px',
    },
  }),
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '20px',
    },
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    '@media (max-width: 768px)': {
      fontSize: '24px',
    },
  },
  headerSubtitle: {
    fontSize: '16px',
    margin: '0',
    color: 'rgba(255, 255, 255, 0.9)',
    '@media (max-width: 768px)': {
      fontSize: '14px',
    },
  },
  userName: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerStats: {
    display: 'flex',
    gap: '20px',
    '@media (max-width: 768px)': {
      width: '100%',
      justifyContent: 'space-between',
    },
  },
  headerStatItem: (colors) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    backdropFilter: 'blur(10px)',
    '@media (max-width: 480px)': {
      padding: '10px 15px',
    },
  }),
  headerStatIcon: {
    color: '#D4A017',
    fontSize: '24px',
  },
  headerStatValue: {
    fontSize: '24px',
    fontWeight: '700',
    display: 'block',
    lineHeight: '1',
  },
  headerStatLabel: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.8)',
    display: 'block',
    marginTop: '4px',
  },

  // Alerts
  alertsContainer: {
    marginBottom: '25px',
  },
  alertError: (colors) => ({
    backgroundColor: '#FEF2F2',
    color: colors.danger,
    borderLeft: '4px solid ' + colors.danger,
    padding: '16px 20px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '15px',
  }),
  alertSuccess: (colors) => ({
    backgroundColor: '#F0FFF4',
    color: colors.success,
    borderLeft: '4px solid ' + colors.success,
    padding: '16px 20px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '15px',
  }),
  alertIcon: {
    fontSize: '20px',
    flexShrink: '0',
  },

  // Sections
  section: (colors) => ({
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '25px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    border: '1px solid rgba(0,0,0,0.05)',
    transition: 'transform 0.3s ease',
    '@media (max-width: 768px)': {
      padding: '20px',
    },
  }),
  sectionHeader: {
    marginBottom: '25px',
  },
  sectionTitle: (colors) => ({
    color: colors.dark,
    fontSize: '20px',
    fontWeight: '600',
    margin: '0 0 8px 0',
  }),
  sectionDescription: {
    color: '#6B7280',
    fontSize: '14px',
    margin: '0',
  },

  // Quick Actions
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    },
    '@media (max-width: 480px)': {
      gridTemplateColumns: '1fr',
    },
  },
  actionButton: (color, colors) => ({
    backgroundColor: colors.cardBg,
    color: colors.dark,
    border: 'none',
    padding: '25px 20px',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    textAlign: 'left',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderLeft: `4px solid ${color}`,
    '@media (max-width: 768px)': {
      padding: '20px 15px',
    },
  }),
  actionIconContainer: (color) => ({
    backgroundColor: color + '20',
    color: color,
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: '0',
    '@media (max-width: 768px)': {
      width: '40px',
      height: '40px',
    },
  }),
  actionContent: {
    flex: '1',
  },
  actionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 4px 0',
    color: '#1F2937',
  },
  actionDescription: {
    fontSize: '13px',
    color: '#6B7280',
    margin: '0',
  },

  // Stats
  statsSection: (colors) => ({
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '25px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    '@media (max-width: 768px)': {
      padding: '20px',
    },
  }),
  statsHeader: {
    marginBottom: '25px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    '@media (max-width: 480px)': {
      gridTemplateColumns: '1fr',
    },
  },
  statCard: (bgColor, colors) => ({
    backgroundColor: bgColor,
    padding: '25px 20px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    transition: 'all 0.3s ease',
    border: `1px solid ${colors.light}`,
    '@media (max-width: 768px)': {
      padding: '20px 15px',
    },
  }),
  statIconContainer: (color) => ({
    backgroundColor: color + '20',
    color: color,
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: '0',
    '@media (max-width: 768px)': {
      width: '40px',
      height: '40px',
    },
  }),
  statContent: {
    flex: '1',
  },
  statTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#6B7280',
    margin: '0 0 8px 0',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1F2937',
    margin: '0',
    '@media (max-width: 768px)': {
      fontSize: '24px',
    },
  },

  // Two Column Layout
  twoColumnLayout: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '25px',
    '@media (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
    },
  },
  mainColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px',
  },

  // Recent Tests
  testList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  testCard: (colors) => ({
    backgroundColor: colors.cardBg,
    border: `1px solid ${colors.light}`,
    borderRadius: '10px',
    padding: '20px',
    transition: 'all 0.3s ease',
    '&:hover': {
      borderColor: colors.secondary,
    },
  }),
  testCardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  testHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '15px',
  },
  testTitle: {
    color: '#1F2937',
    fontSize: '16px',
    fontWeight: '600',
    margin: '0',
    flex: '1',
  },
  testStatus: (status, colors) => ({
    backgroundColor: status === 'active' ? colors.success + '20' : 
                    status === 'scheduled' ? colors.warning + '20' : colors.info + '20',
    color: status === 'active' ? colors.success : 
           status === 'scheduled' ? colors.warning : colors.info,
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  }),
  testMeta: {
    color: '#6B7280',
    fontSize: '14px',
    margin: '0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  testSubject: {
    fontWeight: '500',
  },
  testClass: {
    color: '#9CA3AF',
  },
  testSchedule: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#9CA3AF',
    fontSize: '13px',
  },
  testDates: {
    fontSize: '13px',
  },
  testActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
  },
  testActionButton: (color) => ({
    backgroundColor: color + '20',
    color: color,
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: color,
      color: '#FFFFFF',
    },
  }),

  // Subjects
  subjectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    },
  },
  subjectCard: (colors) => ({
    backgroundColor: colors.cardBg,
    border: `1px solid ${colors.light}`,
    borderRadius: '10px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    transition: 'all 0.3s ease',
    '&:hover': {
      borderColor: colors.secondary,
    },
  }),
  subjectIcon: (color) => ({
    backgroundColor: color + '20',
    color: color,
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: '0',
  }),
  subjectContent: {
    flex: '1',
  },
  subjectTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0 0 4px 0',
  },
  subjectClass: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0',
  },

  // Analytics Card
  analyticsCard: (colors) => ({
    backgroundColor: colors.cardBg,
    border: `1px solid ${colors.light}`,
    borderRadius: '10px',
    padding: '30px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  }),
  analyticsIconContainer: (colors) => ({
    backgroundColor: colors.secondary + '20',
    color: colors.secondary,
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  analyticsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0',
  },
  analyticsDescription: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0',
    lineHeight: '1.6',
  },
  analyticsButton: (colors) => ({
    backgroundColor: colors.secondary,
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  }),

  // Tips
  tipsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  tipItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  tipIcon: (color) => ({
    color: color,
    width: '24px',
    height: '24px',
    flexShrink: '0',
    marginTop: '2px',
  }),
  tipText: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0',
    lineHeight: '1.5',
  },

  // Buttons
  viewAllButton: (colors) => ({
    backgroundColor: 'transparent',
    color: colors.secondary,
    border: `1px solid ${colors.secondary}`,
    padding: '8px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    transition: 'all 0.3s ease',
  }),
  primaryButton: (colors) => ({
    backgroundColor: colors.secondary,
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  }),

  // Empty States
  emptyState: (colors) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
    backgroundColor: colors.background,
    borderRadius: '10px',
    border: `2px dashed ${colors.light}`,
  }),
  emptyStateSmall: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backgroundColor: '#F8F9FA',
    borderRadius: '8px',
    border: '1px dashed #D1D5DB',
  },
  emptyStateIcon: {
    color: '#9CA3AF',
    marginBottom: '20px',
  },
  emptyStateTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0 0 8px 0',
  },
  emptyStateDescription: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 20px 0',
  },
  noSubjects: {
    color: '#6B7280',
    fontSize: '14px',
  },
};

// Add responsive styles to elements
const applyResponsiveStyles = () => {
  const elements = document.querySelectorAll('[data-responsive]');
  elements.forEach(el => {
    const width = window.innerWidth;
    if (width < 768) {
      el.style.padding = '15px';
    }
    if (width < 480) {
      el.style.padding = '10px';
    }
  });
};

export default Dashboard;