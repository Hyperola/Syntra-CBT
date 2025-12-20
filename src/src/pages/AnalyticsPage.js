import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { 
  FiUsers, 
  FiBook, 
  FiClipboard, 
  FiAward, 
  FiUserCheck,
  FiBarChart2,
  FiTrendingUp,
  FiActivity,
  FiAlertCircle,
  FiTarget,
  FiTrendingDown,
  FiClock,
  FiPieChart,
  FiBookOpen,
  FiStar,
  FiFilter,
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiInfo,
  FiDatabase,
  FiGlobe,
  FiEye,
  FiDownload,
  FiCalendar,
  FiHome
} from 'react-icons/fi';

const AnalyticsPage = () => {
  const { user } = useContext(AuthContext);
  
  // State for different data types
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [institutionalData, setInstitutionalData] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalTests: 0,
    totalExams: 0,
    totalResults: 0,
    overallAverageScore: 0,
    passRate: 0,
    activeUsers: 0,
  });
  
  const [testAnalytics, setTestAnalytics] = useState([]);
  const [classPerformance, setClassPerformance] = useState([]);
  const [subjectPerformance, setSubjectPerformance] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  
  const [filters, setFilters] = useState({
    timeRange: 'all',
    classFilter: 'all',
    subjectFilter: 'all',
    viewType: 'overview'
  });
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('institutional');

  // Fetch institutional analytics data for admin
  useEffect(() => {
    console.log('📊 Admin AnalyticsPage mounted, user:', user);
    
    const fetchAdminAnalytics = async () => {
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        console.log('📊 User not authorized for admin analytics');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('📊 No token found');
        setError('Authentication required');
        setLoading(false);
        return;
      }

      try {
        console.log('📊 Fetching ADMIN analytics data...');
        
        // Fetch institutional overview
        const overviewResponse = await axios.get('http://localhost:5000/api/analytics/overview', {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          },
        });
        
        console.log('📊 Overview Response:', overviewResponse.data);
        
        if (overviewResponse.data.success) {
          const overview = overviewResponse.data.overview;
          setInstitutionalData({
            totalStudents: overview.totalStudents || 0,
            totalTeachers: overview.totalTeachers || 0,
            totalClasses: overview.totalClasses || 0,
            totalTests: overview.totalTests || 0,
            totalExams: overview.totalExams || 0,
            totalResults: overview.totalResults || 0,
            overallAverageScore: overview.averageScore || 0,
            passRate: overview.completionRate || 0,
            activeUsers: overview.activeUsers || 0,
          });
          
          if (overviewResponse.data.recentTests) {
            setTestAnalytics(overviewResponse.data.recentTests);
          }
        }

        // Fetch class performance data
        try {
          const classesResponse = await axios.get('http://localhost:5000/api/analytics/classes', {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
          });
          
          if (classesResponse.data.success && classesResponse.data.classes) {
            setClassPerformance(classesResponse.data.classes);
          }
        } catch (classError) {
          console.warn('Could not fetch class performance:', classError.message);
        }

        // Fetch subject performance
        try {
          const subjectsResponse = await axios.get('http://localhost:5000/api/analytics/subjects', {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
          });
          
          if (subjectsResponse.data.success && subjectsResponse.data.subjects) {
            setSubjectPerformance(subjectsResponse.data.subjects);
          }
        } catch (subjectError) {
          console.warn('Could not fetch subject performance:', subjectError.message);
        }

        // Fetch recent activity
        try {
          const activityResponse = await axios.get('http://localhost:5000/api/analytics/activity', {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
          });
          
          if (activityResponse.data.success && activityResponse.data.activity) {
            setRecentActivity(activityResponse.data.activity);
          }
        } catch (activityError) {
          console.warn('Could not fetch recent activity:', activityError.message);
        }

        console.log('📊 Admin data loaded successfully');
        
      } catch (err) {
        console.error('❌ Error fetching admin analytics:', {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data
        });
        
        // Try teacher endpoint as fallback
        try {
          console.log('📊 Trying teacher endpoint as fallback...');
          const fallbackResponse = await axios.get('http://localhost:5000/api/analytics/teacher', {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
          });
          
          if (fallbackResponse.data.success) {
            const data = fallbackResponse.data;
            setInstitutionalData({
              totalStudents: data.summary?.totalStudents || 0,
              totalTeachers: 1,
              totalClasses: data.teacherInfo?.assignedClasses?.length || 0,
              totalTests: data.summary?.totalTests || 0,
              totalExams: data.analytics?.filter(a => a.type === 'exam').length || 0,
              totalResults: data.summary?.totalResults || 0,
              overallAverageScore: data.summary?.overallAverageScore || 0,
              passRate: data.summary?.passRate || 0,
              activeUsers: data.summary?.totalStudents || 0,
            });
            setTestAnalytics(data.analytics || []);
          }
        } catch (fallbackErr) {
          setError(fallbackErr.response?.data?.error || fallbackErr.message || 'Failed to load analytics data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAdminAnalytics();
  }, [user]);

  // Refresh data function
  const refreshData = async () => {
    setRefreshing(true);
    const token = localStorage.getItem('token');
    
    try {
      console.log('🔄 Refreshing admin analytics data...');
      const response = await axios.get('http://localhost:5000/api/analytics/overview', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
      });
      
      if (response.data.success) {
        const overview = response.data.overview;
        setInstitutionalData({
          totalStudents: overview.totalStudents || institutionalData.totalStudents,
          totalTeachers: overview.totalTeachers || institutionalData.totalTeachers,
          totalClasses: overview.totalClasses || institutionalData.totalClasses,
          totalTests: overview.totalTests || institutionalData.totalTests,
          totalExams: overview.totalExams || institutionalData.totalExams,
          totalResults: overview.totalResults || institutionalData.totalResults,
          overallAverageScore: overview.averageScore || institutionalData.overallAverageScore,
          passRate: overview.completionRate || institutionalData.passRate,
          activeUsers: overview.activeUsers || institutionalData.activeUsers,
        });
        console.log('✅ Admin data refreshed successfully');
      }
    } catch (err) {
      console.error('❌ Error refreshing admin data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate institutional metrics
  const calculateMetrics = () => {
    const completionRate = institutionalData.totalTests > 0 
      ? (institutionalData.totalResults / (institutionalData.totalTests * 10)) * 100 
      : 0;
    
    const studentTeacherRatio = institutionalData.totalTeachers > 0 
      ? (institutionalData.totalStudents / institutionalData.totalTeachers).toFixed(1)
      : 0;
    
    const testPerStudent = institutionalData.totalStudents > 0 
      ? (institutionalData.totalTests / institutionalData.totalStudents).toFixed(1)
      : 0;
    
    return {
      completionRate: Math.min(completionRate, 100),
      studentTeacherRatio,
      testPerStudent,
      avgScore: institutionalData.overallAverageScore,
      passRate: institutionalData.passRate
    };
  };

  const metrics = calculateMetrics();

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Format number with commas
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Get performance color
  const getPerformanceColor = (score) => {
    if (score >= 80) return '#10B981'; // Green
    if (score >= 60) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };


  return (
    <div style={styles.container}>
      {/* Admin Analytics Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>
            <FiDatabase style={styles.titleIcon} />
            Institutional Analytics Dashboard
            {user?.role === 'super_admin' && (
              <span style={styles.superAdminBadge}>Super Admin</span>
            )}
          </h1>
          <p style={styles.pageSubtitle}>
            Welcome, {user?.name || user?.username} ({user?.role})
            <span style={styles.timestamp}>
              • Data as of {new Date().toLocaleDateString()}
            </span>
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={refreshData}
            disabled={refreshing}
            style={styles.refreshButton}
          >
            <FiRefreshCw style={{...styles.buttonIcon, animation: refreshing ? 'spin 1s linear infinite' : 'none'}} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <button
            style={styles.exportButton}
            onClick={() => alert('Export feature coming soon!')}
          >
            <FiDownload style={styles.buttonIcon} />
            Export Report
          </button>
        </div>
      </div>

      {/* Admin Role Badge */}
      <div style={styles.adminBadge}>
        <FiGlobe style={{ marginRight: 8 }} />
        <span>Institutional View • {user?.role === 'super_admin' ? 'Full System Access' : 'Administrative Access'}</span>
      </div>

      {/* Tabs for different views */}
      <div style={styles.tabsContainer}>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'institutional' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('institutional')}
        >
          <FiHome style={styles.tabIcon} />
          Institutional Overview
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'performance' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('performance')}
        >
          <FiBarChart2 style={styles.tabIcon} />
          Performance Analytics
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'classes' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('classes')}
        >
          <FiBook style={styles.tabIcon} />
          Class Analytics
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'activity' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('activity')}
        >
          <FiActivity style={styles.tabIcon} />
          Recent Activity
        </button>
      </div>

      {/* Institutional Overview Tab */}
      {activeTab === 'institutional' && (
        <>
          {/* Key Metrics Grid */}
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.cardHeader}>
                <div style={{...styles.cardIcon, backgroundColor: '#E3F2FD'}}>
                  <FiUsers style={{ color: '#1976D2', fontSize: 24 }} />
                </div>
                <div style={styles.cardStats}>
                  <h3 style={styles.cardTitle}>Total Students</h3>
                  <div style={styles.cardValue}>{formatNumber(institutionalData.totalStudents)}</div>
                  <div style={styles.cardSubtext}>Registered in system</div>
                </div>
              </div>
              <div style={styles.cardFooter}>
                <span style={styles.cardTrend}>
                  <FiTrendingUp style={{ marginRight: 4 }} />
                  Active Users: {formatNumber(institutionalData.activeUsers)}
                </span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.cardHeader}>
                <div style={{...styles.cardIcon, backgroundColor: '#F3E5F5'}}>
                  <FiUserCheck style={{ color: '#7B1FA2', fontSize: 24 }} />
                </div>
                <div style={styles.cardStats}>
                  <h3 style={styles.cardTitle}>Total Teachers</h3>
                  <div style={styles.cardValue}>{formatNumber(institutionalData.totalTeachers)}</div>
                  <div style={styles.cardSubtext}>Teaching staff</div>
                </div>
              </div>
              <div style={styles.cardFooter}>
                <span style={styles.cardTrend}>
                  Student-Teacher Ratio: {metrics.studentTeacherRatio}:1
                </span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.cardHeader}>
                <div style={{...styles.cardIcon, backgroundColor: '#E8F5E9'}}>
                  <FiBook style={{ color: '#388E3C', fontSize: 24 }} />
                </div>
                <div style={styles.cardStats}>
                  <h3 style={styles.cardTitle}>Total Classes</h3>
                  <div style={styles.cardValue}>{formatNumber(institutionalData.totalClasses)}</div>
                  <div style={styles.cardSubtext}>Active classes</div>
                </div>
              </div>
              <div style={styles.cardFooter}>
                <span style={styles.cardTrend}>
                  Avg. Students per Class: {institutionalData.totalClasses > 0 
                    ? Math.round(institutionalData.totalStudents / institutionalData.totalClasses) 
                    : 0}
                </span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.cardHeader}>
                <div style={{...styles.cardIcon, backgroundColor: '#FFF3E0'}}>
                  <FiClipboard style={{ color: '#F57C00', fontSize: 24 }} />
                </div>
                <div style={styles.cardStats}>
                  <h3 style={styles.cardTitle}>Total Assessments</h3>
                  <div style={styles.cardValue}>{formatNumber(institutionalData.totalTests + institutionalData.totalExams)}</div>
                  <div style={styles.cardSubtext}>
                    {institutionalData.totalTests} tests • {institutionalData.totalExams} exams
                  </div>
                </div>
              </div>
              <div style={styles.cardFooter}>
                <span style={styles.cardTrend}>
                  <FiTrendingUp style={{ marginRight: 4 }} />
                  {formatNumber(institutionalData.totalResults)} results recorded
                </span>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div style={styles.performanceSection}>
            <h2 style={styles.sectionTitle}>
              <FiTarget style={styles.sectionIcon} />
              Institutional Performance
            </h2>
            <div style={styles.performanceGrid}>
              <div style={styles.performanceCard}>
                <div style={styles.performanceHeader}>
                  <span style={styles.performanceLabel}>Overall Average Score</span>
                  <span style={{
                    ...styles.performanceValue,
                    color: getPerformanceColor(metrics.avgScore)
                  }}>
                    {metrics.avgScore.toFixed(1)}%
                  </span>
                </div>
                <div style={styles.progressBar}>
                  <div 
                    style={{
                      ...styles.progressFill,
                      width: `${Math.min(metrics.avgScore, 100)}%`,
                      backgroundColor: getPerformanceColor(metrics.avgScore)
                    }}
                  />
                </div>
                <div style={styles.performanceSubtext}>
                  Across all assessments
                </div>
              </div>

              <div style={styles.performanceCard}>
                <div style={styles.performanceHeader}>
                  <span style={styles.performanceLabel}>Completion Rate</span>
                  <span style={{
                    ...styles.performanceValue,
                    color: getPerformanceColor(metrics.completionRate)
                  }}>
                    {metrics.completionRate.toFixed(1)}%
                  </span>
                </div>
                <div style={styles.progressBar}>
                  <div 
                    style={{
                      ...styles.progressFill,
                      width: `${Math.min(metrics.completionRate, 100)}%`,
                      backgroundColor: getPerformanceColor(metrics.completionRate)
                    }}
                  />
                </div>
                <div style={styles.performanceSubtext}>
                  Tests completed vs assigned
                </div>
              </div>

              <div style={styles.performanceCard}>
                <div style={styles.performanceHeader}>
                  <span style={styles.performanceLabel}>Pass Rate</span>
                  <span style={{
                    ...styles.performanceValue,
                    color: getPerformanceColor(metrics.passRate)
                  }}>
                    {metrics.passRate.toFixed(1)}%
                  </span>
                </div>
                <div style={styles.progressBar}>
                  <div 
                    style={{
                      ...styles.progressFill,
                      width: `${Math.min(metrics.passRate, 100)}%`,
                      backgroundColor: getPerformanceColor(metrics.passRate)
                    }}
                  />
                </div>
                <div style={styles.performanceSubtext}>
                  Students passing assessments
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Performance Analytics Tab */}
      {activeTab === 'performance' && (
        <div style={styles.performanceTab}>
          <h2 style={styles.sectionTitle}>
            <FiBarChart2 style={styles.sectionIcon} />
            Detailed Performance Analytics
          </h2>
          
          {testAnalytics.length === 0 ? (
            <div style={styles.emptyState}>
              <FiAlertCircle style={styles.emptyIcon} />
              <h3 style={styles.emptyTitle}>No performance data available</h3>
              <p style={styles.emptyText}>Assessment data will appear here once tests are created and taken.</p>
            </div>
          ) : (
            <div style={styles.analyticsTableContainer}>
              <div style={styles.tableHeaderRow}>
                <h3 style={styles.tableTitle}>Recent Assessments</h3>
                <select
                  value={filters.timeRange}
                  onChange={(e) => handleFilterChange('timeRange', e.target.value)}
                  style={styles.timeFilter}
                >
                  <option value="all">All Time</option>
                  <option value="week">Past Week</option>
                  <option value="month">Past Month</option>
                  <option value="year">Past Year</option>
                </select>
              </div>
              
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>Assessment</th>
                      <th style={styles.tableHeader}>Type</th>
                      <th style={styles.tableHeader}>Class</th>
                      <th style={styles.tableHeader}>Avg Score</th>
                      <th style={styles.tableHeader}>Participation</th>
                      <th style={styles.tableHeader}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testAnalytics.slice(0, 10).map((test, idx) => (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.tableCell}>
                          <div style={styles.testName}>{test.title || 'Untitled Test'}</div>
                          <div style={styles.testSubject}>{test.subject || 'General'}</div>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.typeBadge,
                            backgroundColor: test.type === 'exam' ? '#F3E5F5' : '#E3F2FD',
                            color: test.type === 'exam' ? '#7B1FA2' : '#1976D2'
                          }}>
                            {test.type || 'test'}
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          {test.class?.name || test.class || 'N/A'}
                        </td>
                        <td style={styles.tableCell}>
                          <div style={{
                            ...styles.scoreDisplay,
                            color: getPerformanceColor(test.averageScore || 0)
                          }}>
                            {(test.averageScore || 0).toFixed(1)}%
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.participationBar}>
                            <div 
                              style={{
                                ...styles.participationFill,
                                width: `${Math.min((test.completionRate || 0), 100)}%`,
                                backgroundColor: (test.completionRate || 0) >= 70 ? '#10B981' : 
                                                (test.completionRate || 0) >= 40 ? '#F59E0B' : '#EF4444'
                              }}
                            />
                          </div>
                          <span style={styles.participationText}>
                            {(test.completionRate || 0).toFixed(0)}%
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: test.status === 'completed' ? '#D1FAE5' : 
                                           test.status === 'active' ? '#DBEAFE' : '#FEF3C7',
                            color: test.status === 'completed' ? '#065F46' : 
                                   test.status === 'active' ? '#1E40AF' : '#92400E'
                          }}>
                            {test.status || 'unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Class Analytics Tab */}
      {activeTab === 'classes' && (
        <div style={styles.classesTab}>
          <h2 style={styles.sectionTitle}>
            <FiBook style={styles.sectionIcon} />
            Class Performance Overview
          </h2>
          
          {classPerformance.length === 0 ? (
            <div style={styles.emptyState}>
              <FiAlertCircle style={styles.emptyIcon} />
              <h3 style={styles.emptyTitle}>No class data available</h3>
              <p style={styles.emptyText}>Class performance data will appear here once assessments are completed.</p>
            </div>
          ) : (
            <div style={styles.classesGrid}>
              {classPerformance.map((classItem, idx) => (
                <div key={idx} style={styles.classCard}>
                  <div style={styles.classHeader}>
                    <div style={styles.classIcon}>
                      <FiBook style={{ color: '#4B5320' }} />
                    </div>
                    <div>
                      <h3 style={styles.className}>{classItem.name || `Class ${idx + 1}`}</h3>
                      <p style={styles.classInfo}>
                        {classItem.studentCount || 0} students • {classItem.testCount || 0} assessments
                      </p>
                    </div>
                  </div>
                  <div style={styles.classStats}>
                    <div style={styles.classStat}>
                      <span style={styles.statLabel}>Avg Score</span>
                      <span style={{
                        ...styles.statValue,
                        color: getPerformanceColor(classItem.averageScore || 0)
                      }}>
                        {(classItem.averageScore || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div style={styles.classStat}>
                      <span style={styles.statLabel}>Pass Rate</span>
                      <span style={{
                        ...styles.statValue,
                        color: getPerformanceColor(classItem.passRate || 0)
                      }}>
                        {(classItem.passRate || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div style={styles.classStat}>
                      <span style={styles.statLabel}>Completion</span>
                      <span style={{
                        ...styles.statValue,
                        color: getPerformanceColor(classItem.completionRate || 0)
                      }}>
                        {(classItem.completionRate || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div style={styles.classProgress}>
                    <div style={styles.progressLabel}>Performance Trend</div>
                    <div style={styles.trendIndicator}>
                      <FiTrendingUp style={{ 
                        color: (classItem.trend || 0) >= 0 ? '#10B981' : '#EF4444',
                        marginRight: 8
                      }} />
                      <span style={{
                        color: (classItem.trend || 0) >= 0 ? '#10B981' : '#EF4444',
                        fontWeight: '600'
                      }}>
                        {(classItem.trend || 0) >= 0 ? '+' : ''}{(classItem.trend || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Activity Tab */}
      {activeTab === 'activity' && (
        <div style={styles.activityTab}>
          <h2 style={styles.sectionTitle}>
            <FiActivity style={styles.sectionIcon} />
            System Activity Log
          </h2>
          
          {recentActivity.length === 0 ? (
            <div style={styles.emptyState}>
              <FiAlertCircle style={styles.emptyIcon} />
              <h3 style={styles.emptyTitle}>No recent activity</h3>
              <p style={styles.emptyText}>System activity will appear here as users interact with the platform.</p>
            </div>
          ) : (
            <div style={styles.activityList}>
              {recentActivity.map((activity, idx) => (
                <div key={idx} style={styles.activityItem}>
                  <div style={styles.activityIcon}>
                    {activity.type === 'test' && <FiClipboard />}
                    {activity.type === 'result' && <FiAward />}
                    {activity.type === 'user' && <FiUserCheck />}
                    {activity.type === 'class' && <FiBook />}
                  </div>
                  <div style={styles.activityContent}>
                    <div style={styles.activityTitle}>{activity.title}</div>
                    <div style={styles.activityDetails}>
                      <span style={styles.activityUser}>{activity.user}</span>
                      <span style={styles.activityTime}>{activity.time}</span>
                    </div>
                  </div>
                  <div style={styles.activityStatus}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: activity.status === 'success' ? '#D1FAE5' : 
                                     activity.status === 'warning' ? '#FEF3C7' : '#FEE2E2',
                      color: activity.status === 'success' ? '#065F46' : 
                             activity.status === 'warning' ? '#92400E' : '#991B1B'
                    }}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Data Summary Footer */}
      <div style={styles.summaryFooter}>
        <div style={styles.summaryInfo}>
          <FiInfo style={{ marginRight: 8, color: '#6B7280' }} />
          <span style={styles.summaryText}>
            Data updated: {new Date().toLocaleString()}
          </span>
        </div>
        <div style={styles.summaryStats}>
          <span style={styles.statItem}>
            <FiEye style={{ marginRight: 4 }} />
            Admin View
          </span>
          <span style={styles.statItem}>
            <FiDatabase style={{ marginRight: 4 }} />
            Real-time Data
          </span>
          <span style={styles.statItem}>
            <FiCalendar style={{ marginRight: 4 }} />
            {new Date().getFullYear()}
          </span>
        </div>
      </div>

      <style jsx="true">{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    fontFamily: '"Fredoka", sans-serif',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '40px',
  },
  retryButton: {
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: '#1976D2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  superAdminBadge: {
    fontSize: '12px',
    backgroundColor: '#D4A017',
    color: '#000000',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: '600',
    marginLeft: '8px',
  },
  titleIcon: {
    fontSize: '28px',
    color: '#1976D2',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#64748B',
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  timestamp: {
    fontSize: '12px',
    color: '#9CA3AF',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#1976D2',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background-color 0.2s',
  },
  exportButton: {
    padding: '10px 20px',
    backgroundColor: '#10B981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background-color 0.2s',
  },
  buttonIcon: {
    fontSize: '16px',
  },
  adminBadge: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: '8px 16px',
    borderRadius: '6px',
    marginBottom: '24px',
    border: '1px solid #E0F2FE',
    fontSize: '14px',
    color: '#0369A1',
    fontWeight: '500',
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: '4px',
    flexWrap: 'wrap',
  },
  tabButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px 6px 0 0',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6B7280',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  activeTab: {
    backgroundColor: '#1976D2',
    color: 'white',
  },
  tabIcon: {
    fontSize: '16px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #E5E7EB',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '12px',
  },
  cardIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardStats: {
    flex: 1,
  },
  cardTitle: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0,
    marginBottom: '4px',
  },
  cardValue: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#1F2937',
  },
  cardSubtext: {
    fontSize: '12px',
    color: '#9CA3AF',
    marginTop: '4px',
  },
  cardFooter: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #E5E7EB',
  },
  cardTrend: {
    fontSize: '12px',
    color: '#6B7280',
    display: 'flex',
    alignItems: 'center',
  },
  performanceSection: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: 0,
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sectionIcon: {
    fontSize: '20px',
    color: '#1976D2',
  },
  performanceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  performanceCard: {
    padding: '20px',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    backgroundColor: '#F9FAFB',
  },
  performanceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  performanceLabel: {
    fontSize: '14px',
    color: '#6B7280',
    fontWeight: '500',
  },
  performanceValue: {
    fontSize: '24px',
    fontWeight: '600',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#E5E7EB',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
  },
  performanceSubtext: {
    fontSize: '12px',
    color: '#9CA3AF',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px 24px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
  },
  emptyIcon: {
    fontSize: '48px',
    color: '#9CA3AF',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#6B7280',
    margin: 0,
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#9CA3AF',
    margin: 0,
  },
  analyticsTableContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  tableHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  tableTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: 0,
  },
  timeFilter: {
    padding: '8px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#1F2937',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  tableHeader: {
    padding: '16px 12px',
    textAlign: 'left',
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
    fontWeight: '600',
    borderBottom: '1px solid #E5E7EB',
    whiteSpace: 'nowrap',
  },
  tableRow: {
    borderBottom: '1px solid #E5E7EB',
    transition: 'background-color 0.2s',
  },
  tableCell: {
    padding: '16px 12px',
    verticalAlign: 'middle',
  },
  testName: {
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: '4px',
  },
  testSubject: {
    fontSize: '12px',
    color: '#6B7280',
  },
  typeBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block',
  },
  scoreDisplay: {
    fontSize: '16px',
    fontWeight: '600',
    textAlign: 'center',
  },
  participationBar: {
    width: '80px',
    height: '6px',
    backgroundColor: '#E5E7EB',
    borderRadius: '3px',
    overflow: 'hidden',
    display: 'inline-block',
    marginRight: '8px',
  },
  participationFill: {
    height: '100%',
    borderRadius: '3px',
  },
  participationText: {
    fontSize: '12px',
    color: '#6B7280',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block',
  },
  classesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
  },
  classCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #E5E7EB',
  },
  classHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px',
  },
  classIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    backgroundColor: '#F0F9FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  className: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: 0,
    marginBottom: '4px',
  },
  classInfo: {
    fontSize: '12px',
    color: '#6B7280',
    margin: 0,
  },
  classStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '16px',
  },
  classStat: {
    textAlign: 'center',
  },
  statLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#6B7280',
    marginBottom: '4px',
  },
  statValue: {
    display: 'block',
    fontSize: '18px',
    fontWeight: '600',
  },
  classProgress: {
    paddingTop: '16px',
    borderTop: '1px solid #E5E7EB',
  },
  progressLabel: {
    fontSize: '12px',
    color: '#6B7280',
    marginBottom: '8px',
  },
  trendIndicator: {
    display: 'flex',
    alignItems: 'center',
  },
  activityList: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: '1px solid #E5E7EB',
  },
  activityIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: '#F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '16px',
    fontSize: '18px',
    color: '#4B5320',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: '4px',
  },
  activityDetails: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#6B7280',
  },
  activityUser: {
    fontWeight: '500',
  },
  activityTime: {
    color: '#9CA3AF',
  },
  activityStatus: {
    marginLeft: '16px',
  },
  summaryFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '32px',
    paddingTop: '20px',
    borderTop: '1px solid #E5E7EB',
    fontSize: '14px',
    color: '#6B7280',
  },
  summaryInfo: {
    display: 'flex',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: '12px',
  },
  summaryStats: {
    display: 'flex',
    gap: '16px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
  },
};

export default AnalyticsPage;