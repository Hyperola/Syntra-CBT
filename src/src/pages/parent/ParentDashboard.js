import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FiUsers, 
  FiBarChart2, 
  FiCalendar, 
  FiFileText, 
  FiMessageSquare, 
  FiUser, 
  FiLogOut,
  FiChevronRight,
  FiTrendingUp,
  FiAlertCircle,
  FiCheckCircle,
  FiBell,
  FiClock,
  FiBookOpen,
  FiTarget
} from 'react-icons/fi';

const ParentDashboard = () => {
  const navigate = useNavigate();
  const [parentData, setParentData] = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upcomingTests, setUpcomingTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [feedback, setFeedback] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [stats, setStats] = useState({
    totalChildren: 0,
    recentResults: [],
    unreadFeedback: 0,
    upcomingTests: 0,
    averageScore: 0
  });

  // Brand colors matching the teacher dashboard
  const brandColors = {
    primary: '#4B5320',
    secondary: '#D4A017',
    accent: '#8B4513',
    light: '#F5F5DC',
    dark: '#2C3E50',
    success: '#28A745',
    warning: '#FFC107',
    danger: '#DC3545',
    info: '#17A2B8',
    background: '#F8F9FA',
    cardBg: '#FFFFFF'
  };

  useEffect(() => {
    fetchParentData();
    fetchFeedback();
  }, []);

  const fetchParentData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/parents/dashboard', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setParentData(response.data.parent);
        setChildren(response.data.dashboard?.children || []);
        
        // Get recent results for all children
        const allRecentResults = response.data.dashboard?.recentResults || [];
        
        // Calculate average score if we have results
        let totalScore = 0;
        let resultCount = 0;
        
        allRecentResults.forEach(result => {
          // Try to calculate percentage from total marks
          if (result.totalMarks && result.totalPossibleMarks) {
            const percentage = (result.totalMarks / result.totalPossibleMarks) * 100;
            totalScore += percentage;
            resultCount++;
          }
        });
        
        const averageScore = resultCount > 0 ? Math.round(totalScore / resultCount) : 0;
        
        setStats({
          totalChildren: response.data.dashboard?.totalChildren || children.length,
          recentResults: allRecentResults,
          unreadFeedback: response.data.dashboard?.unreadFeedbackCount || 0,
          upcomingTests: 0,
          averageScore: averageScore
        });
      }
    } catch (error) {
      console.error('Error fetching parent data:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async () => {
    try {
      setLoadingFeedback(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/parents/feedback', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setFeedback(response.data.feedback || []);
        setStats(prev => ({
          ...prev,
          unreadFeedback: response.data.unreadCount || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role');
      sessionStorage.clear();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  const handleViewChildResults = (childId) => {
    navigate(`/parent/child/${childId}/results`);
  };

  const handleViewAllChildren = () => {
    navigate('/parent/children');
  };

  const handleViewFeedback = () => {
    navigate('/parent/feedback');
  };

  const handleViewProfile = () => {
    navigate('/parent/profile');
  };

  const handleViewChildUpcomingTests = (childId) => {
    navigate(`/parent/child/${childId}/upcoming-tests`);
  };

  const getDaysUntil = (dateString) => {
    const testDate = new Date(dateString);
    const today = new Date();
    const diffTime = testDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return 'Past';
    return `${diffDays} days`;
  };

  const getGradeColor = (grade) => {
    if (!grade) return brandColors.dark;
    switch(grade.toUpperCase()) {
      case 'A': return brandColors.success;
      case 'B': return brandColors.info;
      case 'C': return brandColors.warning;
      case 'D': return '#FF9800';
      case 'E': return brandColors.danger;
      case 'F': return '#C62828';
      default: return brandColors.dark;
    }
  };

  const getSubjectScore = (result) => {
    if (result.subjects && result.subjects.length > 0) {
      const subject = result.subjects[0];
      return subject.marks || subject.score || 'N/A';
    }
    return 'N/A';
  };

  const getTestStatus = (test) => {
    const now = new Date();
    const startDate = new Date(test.schedule?.start);
    
    if (startDate > now) {
      const diffDays = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) return 'Tomorrow';
      if (diffDays <= 3) return 'Soon';
      return 'Upcoming';
    }
    return 'Ongoing';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Tomorrow': return brandColors.warning;
      case 'Soon': return brandColors.info;
      case 'Upcoming': return brandColors.success;
      case 'Ongoing': return brandColors.secondary;
      default: return brandColors.dark;
    }
  };

  const quickActions = [
    {
      label: 'View All Children',
      icon: <FiUsers size={20} />,
      action: handleViewAllChildren,
      color: brandColors.primary,
      description: 'Access all children profiles'
    },
    {
      label: 'View Feedback',
      icon: <FiMessageSquare size={20} />,
      action: handleViewFeedback,
      color: brandColors.accent,
      description: 'View teacher feedback and messages'
    },
    {
      label: 'My Profile',
      icon: <FiUser size={20} />,
      action: handleViewProfile,
      color: brandColors.info,
      description: 'Update your account details'
    }
  ];

  const statsCards = [
    {
      title: 'My Children',
      value: children.length,
      icon: <FiUsers size={20} />,
      color: brandColors.primary,
      bgColor: '#F0F4FF'
    },
    {
      title: 'Unread Feedback',
      value: stats.unreadFeedback,
      icon: <FiMessageSquare size={20} />,
      color: brandColors.info,
      bgColor: '#D1ECF1'
    },
    {
      title: 'Avg Score',
      value: `${stats.averageScore}%`,
      icon: <FiTrendingUp size={20} />,
      color: brandColors.success,
      bgColor: '#E6FFE6'
    }
  ];

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingSpinner}></div>
          <h3 style={styles.loadingText}>Loading your dashboard...</h3>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container(brandColors)}>
      {/* Header */}
      <div style={styles.header(brandColors)}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.headerTitle}>Parent Portal</h1>
            <p style={styles.headerSubtitle}>
              Welcome back, <span style={styles.userName}>{parentData?.name || 'Parent'}</span>
              <span style={styles.parentCode}> • Parent Code: {parentData?.parentCode || 'N/A'}</span>
            </p>
          </div>
          <div style={styles.headerActions}>
            <div style={styles.headerStats}>
              <div style={styles.headerStatItem(brandColors)}>
                <FiUsers style={styles.headerStatIcon} />
                <div>
                  <span style={styles.headerStatValue}>{children.length}</span>
                  <span style={styles.headerStatLabel}>Children</span>
                </div>
              </div>
              <div style={styles.headerStatItem(brandColors)}>
                <FiMessageSquare style={styles.headerStatIcon} />
                <div>
                  <span style={styles.headerStatValue}>{stats.unreadFeedback}</span>
                  <span style={styles.headerStatLabel}>Unread Feedback</span>
                </div>
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              style={styles.logoutButton(brandColors)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brandColors.accent}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <FiLogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div style={styles.statsSection(brandColors)}>
        <div style={styles.statsHeader}>
          <h2 style={styles.sectionTitle(brandColors)}>Overview</h2>
          <p style={styles.sectionDescription}>Your parenting metrics at a glance</p>
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

      {/* Quick Actions */}
      <div style={styles.section(brandColors)}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle(brandColors)}>Quick Actions</h2>
          <p style={styles.sectionDescription}>Access common features quickly</p>
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
              <FiChevronRight style={styles.actionArrow} />
            </button>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={styles.twoColumnLayout}>
        {/* Main Column - Children Section */}
        <div style={styles.mainColumn}>
          {/* My Children Section */}
          <div style={styles.section(brandColors)}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle(brandColors)}>My Children ({children.length})</h2>
              {children.length > 0 && (
                <button 
                  onClick={handleViewAllChildren} 
                  style={styles.viewAllButton(brandColors)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brandColors.primary}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  View All
                </button>
              )}
            </div>
            
            {children.length === 0 ? (
              <div style={styles.emptyState(brandColors)}>
                <div style={styles.emptyStateIcon}>
                  <FiUsers size={48} />
                </div>
                <h3 style={styles.emptyStateTitle}>No children assigned yet</h3>
                <p style={styles.emptyStateDescription}>
                  Contact school administration to add children to your account
                </p>
                <button 
                  onClick={handleViewFeedback} 
                  style={styles.primaryButton(brandColors)}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brandColors.accent}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = brandColors.secondary}
                >
                  <FiMessageSquare size={18} /> Contact Administration
                </button>
              </div>
            ) : (
              <div style={styles.childrenList}>
                {children.slice(0, 3).map(child => {
                  // Find recent result for this child
                  const childResults = stats.recentResults.filter(r => 
                    r.student?._id === child.id || r.student?.id === child.id
                  );
                  const recentGrade = childResults.length > 0 ? childResults[0].overallGrade : null;
                  
                  return (
                    <div 
                      key={child.id} 
                      style={styles.childCard(brandColors)}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                      <div style={styles.childCardContent}>
                        <div style={styles.childHeader}>
                          <div style={styles.childAvatar(brandColors)}>
                            {child.name?.charAt(0) || child.firstName?.charAt(0) || 'C'}
                          </div>
                          <div style={styles.childInfo}>
                            <h3 style={styles.childName}>{child.name || `${child.firstName} ${child.lastName}`}</h3>
                            <p style={styles.childDetails}>
                              ID: {child.studentId || 'N/A'} • Class: {child.className || child.class?.name || 'N/A'}
                            </p>
                          </div>
                          {recentGrade && (
                            <div style={styles.childGrade(getGradeColor(recentGrade))}>
                              {recentGrade}
                            </div>
                          )}
                        </div>
                        <div style={styles.childActions}>
                          <button 
                            onClick={() => handleViewChildResults(child.id)} 
                            style={styles.childActionButton(brandColors.primary)}
                          >
                            <FiBarChart2 size={16} /> View Results
                          </button>
                          <button 
                            onClick={() => navigate(`/parent/child/${child.id}/progress`)} 
                            style={styles.childActionButton(brandColors.info)}
                          >
                            <FiTrendingUp size={16} /> Progress
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Results Section */}
          <div style={styles.section(brandColors)}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle(brandColors)}>Recent Exam Results</h2>
              <p style={styles.sectionDescription}>Latest academic performance</p>
            </div>
            
            {stats.recentResults.length === 0 ? (
              <div style={styles.emptyStateSmall(brandColors)}>
                <p style={styles.noResults}>No recent exam results available</p>
              </div>
            ) : (
              <>
                <div style={styles.resultsTable}>
                  <div style={styles.tableHeader}>
                    <div style={styles.tableHeaderCell}>Student</div>
                    <div style={styles.tableHeaderCell}>Exam</div>
                    <div style={styles.tableHeaderCell}>Term/Year</div>
                    <div style={styles.tableHeaderCell}>Score</div>
                    <div style={styles.tableHeaderCell}>Grade</div>
                  </div>
                  {stats.recentResults.slice(0, 5).map((result, index) => {
                    let percentage = 'N/A';
                    if (result.totalMarks && result.totalPossibleMarks) {
                      percentage = Math.round((result.totalMarks / result.totalPossibleMarks) * 100);
                    }
                    
                    return (
                      <div 
                        key={index} 
                        style={styles.tableRow(brandColors)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brandColors.light}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = brandColors.cardBg}
                        onClick={() => navigate(`/parent/result/${result._id || result.id}`)}
                      >
                        <div style={styles.tableCell}>
                          <strong>{result.student?.firstName || 'Student'}</strong>
                        </div>
                        <div style={styles.tableCell}>{result.examType || 'Exam'}</div>
                        <div style={styles.tableCell}>Term {result.term} {result.year}</div>
                        <div style={styles.tableCell}>
                          {result.totalMarks ? `${result.totalMarks}/${result.totalPossibleMarks}` : percentage}%
                        </div>
                        <div style={styles.tableCell}>
                          <span style={styles.resultGrade(getGradeColor(result.overallGrade))}>
                            {result.overallGrade}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {stats.recentResults.length > 5 && (
                  <div style={styles.viewMoreContainer}>
                    <button 
                      onClick={() => navigate('/parent/results')} 
                      style={styles.secondaryButton(brandColors)}
                    >
                      View All Results ({stats.recentResults.length})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Sidebar - Feedback Section */}
        <div style={styles.sidebar}>
          {/* Feedback Card */}
          <div style={styles.section(brandColors)}>
            <div style={styles.upcomingCard(brandColors)}>
              <div style={styles.upcomingIconContainer(brandColors)}>
                <FiMessageSquare size={32} />
              </div>
              <h3 style={styles.upcomingTitle}>Feedback</h3>
              <p style={styles.upcomingDescription}>
                Recent feedback from teachers
              </p>
              
              {loadingFeedback ? (
                <div style={styles.loadingSmall}>
                  <div style={styles.loadingSpinnerSmall}></div>
                  <p>Loading feedback...</p>
                </div>
              ) : feedback.length > 0 ? (
                <>
                  <div style={styles.upcomingCount(brandColors)}>
                    <span style={styles.upcomingNumber}>{stats.unreadFeedback}</span>
                    <span style={styles.upcomingLabel}>unread messages</span>
                  </div>
                  
                  <div style={styles.feedbackList}>
                    {feedback.slice(0, 3).map((item, index) => (
                      <div key={index} style={styles.feedbackItem}>
                        <div style={styles.feedbackInfo}>
                          <div style={styles.feedbackHeader}>
                            <span style={styles.feedbackSubject}>
                              {item.subject || 'General Feedback'}
                            </span>
                            {!item.isRead && (
                              <span style={styles.feedbackUnread(brandColors)}>
                                Unread
                              </span>
                            )}
                          </div>
                          <p style={styles.feedbackTitle}>{item.title || 'Feedback'}</p>
                          <div style={styles.feedbackMeta}>
                            <span style={styles.feedbackMetaItem}>
                              <FiClock size={12} /> {new Date(item.date || item.createdAt).toLocaleDateString()}
                            </span>
                            <span style={styles.feedbackMetaItem}>
                              <FiUsers size={12} /> {item.teacher?.name || 'Teacher'}
                            </span>
                          </div>
                          <div style={styles.feedbackChildren}>
                            <span style={styles.feedbackChildTag}>
                              {item.student?.name || 'Child'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p style={styles.noUpcoming}>No feedback available</p>
              )}
              
              <button 
                onClick={handleViewFeedback} 
                style={styles.upcomingButton(brandColors)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brandColors.primary}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = brandColors.secondary}
              >
                <FiMessageSquare size={18} /> View All Feedback
              </button>
            </div>
          </div>

          {/* Quick Tips */}
          <div style={styles.section(brandColors)}>
            <h3 style={styles.sectionTitle(brandColors)}>Parenting Tips</h3>
            <div style={styles.tipsList}>
              <div style={styles.tipItem}>
                <div style={styles.tipIcon(brandColors.success)}>
                  <FiCheckCircle size={16} />
                </div>
                <span style={styles.tipText}>Regularly check teacher feedback</span>
              </div>
              <div style={styles.tipItem}>
                <div style={styles.tipIcon(brandColors.info)}>
                  <FiMessageSquare size={16} />
                </div>
                <span style={styles.tipText}>Communicate with teachers about progress</span>
              </div>
              <div style={styles.tipItem}>
                <div style={styles.tipIcon(brandColors.warning)}>
                  <FiAlertCircle size={16} />
                </div>
                <span style={styles.tipText}>Monitor exam results and grades</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Updated Styles
const styles = {
  container: (colors) => ({
    fontFamily: '"Segoe UI", "Roboto", sans-serif',
    minHeight: '100vh',
    backgroundColor: colors.background,
    padding: '20px'
  }),

  // Loading States
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#F8F9FA'
  },
  loadingContent: {
    textAlign: 'center'
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  loadingSpinnerSmall: {
    width: '20px',
    height: '20px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '10px'
  },
  loadingSmall: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    color: '#6B7280',
    fontSize: '14px'
  },
  loadingText: {
    color: '#4B5320',
    fontSize: '18px',
    fontWeight: '500'
  },

  // Header
  header: (colors) => ({
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.dark} 100%)`,
    color: '#FFFFFF',
    borderRadius: '12px',
    marginBottom: '25px',
    padding: '30px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  }),
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 8px 0'
  },
  headerSubtitle: {
    fontSize: '16px',
    margin: '0',
    color: 'rgba(255, 255, 255, 0.9)'
  },
  userName: {
    fontWeight: '600',
    color: '#FFFFFF'
  },
  parentCode: {
    opacity: '0.8',
    fontSize: '14px'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  headerStats: {
    display: 'flex',
    gap: '20px'
  },
  headerStatItem: (colors) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    backdropFilter: 'blur(10px)'
  }),
  headerStatIcon: {
    color: '#D4A017',
    fontSize: '24px'
  },
  headerStatValue: {
    fontSize: '24px',
    fontWeight: '700',
    display: 'block',
    lineHeight: '1'
  },
  headerStatLabel: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.8)',
    display: 'block',
    marginTop: '4px'
  },
  logoutButton: (colors) => ({
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  }),

  // Sections
  section: (colors) => ({
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '25px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    border: '1px solid rgba(0,0,0,0.05)',
    transition: 'transform 0.3s ease'
  }),
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '25px'
  },
  sectionTitle: (colors) => ({
    color: colors.dark,
    fontSize: '20px',
    fontWeight: '600',
    margin: '0'
  }),
  sectionDescription: {
    color: '#6B7280',
    fontSize: '14px',
    margin: '8px 0 0 0'
  },
  viewAllButton: (colors) => ({
    backgroundColor: 'transparent',
    color: colors.secondary,
    border: `1px solid ${colors.secondary}`,
    padding: '8px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    transition: 'all 0.3s ease'
  }),

  // Stats Overview
  statsSection: (colors) => ({
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '25px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
  }),
  statsHeader: {
    marginBottom: '25px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px'
  },
  statCard: (bgColor, colors) => ({
    backgroundColor: bgColor,
    padding: '25px 20px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    transition: 'all 0.3s ease',
    border: `1px solid ${colors.light}`
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
    flexShrink: '0'
  }),
  statContent: {
    flex: '1'
  },
  statTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#6B7280',
    margin: '0 0 8px 0'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1F2937',
    margin: '0'
  },

  // Quick Actions
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
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
    borderLeft: `4px solid ${color}`
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
    flexShrink: '0'
  }),
  actionContent: {
    flex: '1'
  },
  actionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 4px 0',
    color: '#1F2937'
  },
  actionDescription: {
    fontSize: '13px',
    color: '#6B7280',
    margin: '0'
  },
  actionArrow: {
    color: '#9CA3AF',
    marginLeft: 'auto',
    flexShrink: '0'
  },

  // Two Column Layout
  twoColumnLayout: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '25px',
    '@media (max-width: 1200px)': {
      gridTemplateColumns: '1fr'
    }
  },
  mainColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },

  // Children List
  childrenList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  childCard: (colors) => ({
    backgroundColor: colors.cardBg,
    border: `1px solid ${colors.light}`,
    borderRadius: '10px',
    padding: '20px',
    transition: 'all 0.3s ease',
    '&:hover': {
      borderColor: colors.secondary
    }
  }),
  childCardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  childHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  childAvatar: (colors) => ({
    backgroundColor: colors.secondary + '20',
    color: colors.secondary,
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    flexShrink: '0'
  }),
  childInfo: {
    flex: '1'
  },
  childName: {
    color: '#1F2937',
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 4px 0'
  },
  childDetails: {
    color: '#6B7280',
    fontSize: '14px',
    margin: '0'
  },
  childGrade: (color) => ({
    backgroundColor: color + '20',
    color: color,
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '16px',
    fontWeight: 'bold',
    minWidth: '50px',
    textAlign: 'center'
  }),
  childActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  childActionButton: (color) => ({
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
      color: '#FFFFFF'
    }
  }),

  // Results Table
  resultsTable: {
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr',
    backgroundColor: '#F9FAFB',
    padding: '12px 16px',
    borderBottom: '1px solid #E5E7EB',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr 1fr 1fr'
    }
  },
  tableHeaderCell: {
    fontWeight: '600',
    color: '#374151',
    fontSize: '14px',
    textAlign: 'left'
  },
  tableRow: (colors) => ({
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    borderBottom: `1px solid ${colors.light}`,
    '&:last-child': {
      borderBottom: 'none'
    },
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr 1fr 1fr'
    }
  }),
  tableCell: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#4B5563'
  },
  resultGrade: (color) => ({
    backgroundColor: color + '20',
    color: color,
    padding: '4px 12px',
    borderRadius: '4px',
    fontWeight: '600',
    fontSize: '14px',
    minWidth: '40px',
    textAlign: 'center'
  }),
  viewMoreContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px'
  },

  // Feedback Card
  upcomingCard: (colors) => ({
    backgroundColor: colors.cardBg,
    border: `1px solid ${colors.light}`,
    borderRadius: '10px',
    padding: '25px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px'
  }),
  upcomingIconContainer: (colors) => ({
    backgroundColor: colors.secondary + '20',
    color: colors.secondary,
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }),
  upcomingTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0'
  },
  upcomingDescription: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0',
    lineHeight: '1.6',
    textAlign: 'center'
  },
  upcomingCount: (colors) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  }),
  upcomingNumber: {
    fontSize: '36px',
    fontWeight: '700',
    color: "#1F2937"
  },
  upcomingLabel: {
    fontSize: '14px',
    color: '#6B7280'
  },
  noUpcoming: {
    color: '#9CA3AF',
    fontSize: '14px',
    fontStyle: 'italic',
    textAlign: 'center'
  },
  upcomingButton: (colors) => ({
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
    width: '100%',
    justifyContent: 'center'
  }),

  // Feedback List
  feedbackList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%'
  },
  feedbackItem: {
    backgroundColor: '#F8F9FA',
    border: '1px solid #E9ECEF',
    borderRadius: '8px',
    padding: '12px',
    transition: 'all 0.2s ease'
  },
  feedbackInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  feedbackHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  feedbackSubject: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#4B5320',
    backgroundColor: '#F0F4FF',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  feedbackUnread: (colors) => ({
    fontSize: '11px',
    fontWeight: '500',
    color: colors.warning,
    backgroundColor: colors.warning + '20',
    padding: '4px 8px',
    borderRadius: '4px'
  }),
  feedbackTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1F2937',
    margin: '0',
    lineHeight: '1.4'
  },
  feedbackMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px',
    color: '#6B7280'
  },
  feedbackMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  feedbackChildren: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '4px'
  },
  feedbackChildTag: {
    fontSize: '11px',
    color: '#FFFFFF',
    backgroundColor: '#4B5320',
    padding: '2px 8px',
    borderRadius: '12px'
  },

  // Tips
  tipsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  tipItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  tipIcon: (color) => ({
    color: color,
    width: '24px',
    height: '24px',
    flexShrink: '0',
    marginTop: '2px'
  }),
  tipText: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0',
    lineHeight: '1.5'
  },

  // Buttons
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
    transition: 'all 0.3s ease'
  }),
  secondaryButton: (colors) => ({
    backgroundColor: 'transparent',
    color: colors.secondary,
    border: `1px solid ${colors.secondary}`,
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: colors.secondary,
      color: '#FFFFFF'
    }
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
    border: `2px dashed ${colors.light}`
  }),
  emptyStateSmall: (colors) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px',
    backgroundColor: colors.background,
    borderRadius: '8px',
    border: `1px dashed ${colors.light}`
  }),
  emptyStateIcon: {
    color: '#9CA3AF',
    marginBottom: '20px'
  },
  emptyStateTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0 0 8px 0'
  },
  emptyStateDescription: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 20px 0'
  },
  noResults: {
    color: '#6B7280',
    fontSize: '14px',
    fontStyle: 'italic'
  }
};

// Add CSS animation
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

export default ParentDashboard;