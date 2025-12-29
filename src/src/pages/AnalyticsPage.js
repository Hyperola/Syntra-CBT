// REPLACE your AnalyticsPage.js with this version (no recharts):

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
  FiHome,
  FiDollarSign,
  FiPercent,
  FiClock as FiTime,
  FiBarChart
} from 'react-icons/fi';

// Brand Colors
const BRAND_COLORS = {
  armyGreen: '#4B5320',
  brightGreen: '#00FF00',
  orange: '#FFA500',
  darkArmy: '#3A4520',
  lightArmy: '#6B8E23',
  successGreen: '#28A745',
  warningOrange: '#FFC107',
  dangerRed: '#DC3545',
  infoBlue: '#17A2B8',
  lightBg: '#F8F9FA',
  darkText: '#2C3E50',
  lightText: '#6C757D'
};

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
    revenue: 0,
    attendanceRate: 0,
    completionRate: 0
  });
  
  const [testAnalytics, setTestAnalytics] = useState([]);
  const [classPerformance, setClassPerformance] = useState([]);
  const [subjectPerformance, setSubjectPerformance] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  
  // Simple data states (no complex chart data)
  const [performanceTrend, setPerformanceTrend] = useState([]);
  const [subjectDistribution, setSubjectDistribution] = useState([]);
  const [classDistribution, setClassDistribution] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  
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
            passRate: overview.passRate || 0,
            activeUsers: overview.activeUsers || 0,
            revenue: overview.revenue || 0,
            attendanceRate: overview.attendanceRate || 0,
            completionRate: overview.completionRate || 0
          });
          
          if (overviewResponse.data.recentTests) {
            setTestAnalytics(overviewResponse.data.recentTests);
          }

          // Fetch additional data from other endpoints
          try {
            // Performance trend
            const trendResponse = await axios.get('http://localhost:5000/api/analytics/performance-trend', {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (trendResponse.data.success) {
              setPerformanceTrend(trendResponse.data.trendData);
            }
          } catch (trendErr) {
            console.log('Performance trend not available:', trendErr.message);
          }

          try {
            // Subject distribution
            const subjectResponse = await axios.get('http://localhost:5000/api/analytics/subject-distribution', {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (subjectResponse.data.success) {
              setSubjectDistribution(subjectResponse.data.distributionData);
            }
          } catch (subjectErr) {
            console.log('Subject distribution not available:', subjectErr.message);
          }

          try {
            // Class distribution
            const classResponse = await axios.get('http://localhost:5000/api/analytics/class-distribution', {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (classResponse.data.success) {
              setClassDistribution(classResponse.data.distributionData);
            }
          } catch (classErr) {
            console.log('Class distribution not available:', classErr.message);
          }

          try {
            // Revenue data
            const revenueResponse = await axios.get('http://localhost:5000/api/analytics/revenue-data', {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (revenueResponse.data.success) {
              setRevenueData(revenueResponse.data.revenueData);
            }
          } catch (revenueErr) {
            console.log('Revenue data not available:', revenueErr.message);
          }

          try {
            // Class performance
            const classesResponse = await axios.get('http://localhost:5000/api/analytics/classes', {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (classesResponse.data.success) {
              setClassPerformance(classesResponse.data.classes);
            }
          } catch (classErr) {
            console.log('Class performance not available:', classErr.message);
          }

          try {
            // Subject performance
            const subjectsResponse = await axios.get('http://localhost:5000/api/analytics/subjects', {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (subjectsResponse.data.success) {
              setSubjectPerformance(subjectsResponse.data.subjects);
            }
          } catch (subjectErr) {
            console.log('Subject performance not available:', subjectErr.message);
          }

          try {
            // Recent activity
            const activityResponse = await axios.get('http://localhost:5000/api/analytics/activity', {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (activityResponse.data.success) {
              setRecentActivity(activityResponse.data.activity);
            }
          } catch (activityErr) {
            console.log('Recent activity not available:', activityErr.message);
          }
        }

        console.log('📊 Admin data loaded successfully');
        
      } catch (err) {
        console.error('❌ Error fetching admin analytics:', {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data
        });
        
        setError('Failed to load analytics data. Please try again.');
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
        setInstitutionalData(prev => ({
          ...prev,
          totalStudents: overview.totalStudents || prev.totalStudents,
          totalTeachers: overview.totalTeachers || prev.totalTeachers,
          totalClasses: overview.totalClasses || prev.totalClasses,
          totalTests: overview.totalTests || prev.totalTests,
          totalExams: overview.totalExams || prev.totalExams,
          totalResults: overview.totalResults || prev.totalResults,
          overallAverageScore: overview.averageScore || prev.overallAverageScore,
          passRate: overview.passRate || prev.passRate,
          activeUsers: overview.activeUsers || prev.activeUsers,
        }));
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
      passRate: institutionalData.passRate,
      attendance: institutionalData.attendanceRate,
      revenueGrowth: 12.5
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

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Get performance color
  const getPerformanceColor = (score) => {
    if (score >= 85) return BRAND_COLORS.brightGreen;
    if (score >= 70) return BRAND_COLORS.orange;
    return BRAND_COLORS.dangerRed;
  };

  // Simple chart rendering functions
  const renderSimpleBarChart = (data, labelKey, valueKey, color = BRAND_COLORS.armyGreen) => {
    const maxValue = Math.max(...data.map(item => item[valueKey]));
    
    return (
      <div style={styles.simpleChartContainer}>
        {data.map((item, index) => (
          <div key={index} style={styles.barChartItem}>
            <div style={styles.barLabel}>{item[labelKey]}</div>
            <div style={styles.barContainer}>
              <div 
                style={{
                  ...styles.bar,
                  width: `${(item[valueKey] / maxValue) * 100}%`,
                  backgroundColor: color
                }}
              />
              <div style={styles.barValue}>{item[valueKey]}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSimplePieChart = (data) => {
    return (
      <div style={styles.pieChartContainer}>
        {data.map((item, index) => (
          <div key={index} style={styles.pieItem}>
            <div style={{ ...styles.pieColor, backgroundColor: item.color }} />
            <div style={styles.pieLabel}>{item.subject}</div>
            <div style={styles.pieValue}>{item.value}%</div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading Institutional Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <FiAlertCircle style={styles.errorIcon} />
        <h3 style={styles.errorTitle}>Error Loading Analytics</h3>
        <p style={styles.errorText}>{error}</p>
        <button onClick={refreshData} style={styles.retryButton}>
          <FiRefreshCw style={{ marginRight: 8 }} />
          Retry
        </button>
      </div>
    );
  }

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
              • Last updated: {new Date().toLocaleTimeString()}
            </span>
          </p>
        </div>
        <div style={styles.headerActions}>
          <div style={styles.filterGroup}>
            <select
              value={filters.timeRange}
              onChange={(e) => handleFilterChange('timeRange', e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <FiFilter style={styles.filterIcon} />
          </div>
          <button
            onClick={refreshData}
            disabled={refreshing}
            style={styles.refreshButton}
          >
            <FiRefreshCw style={{...styles.buttonIcon, animation: refreshing ? 'spin 1s linear infinite' : 'none'}} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
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
                <div style={{...styles.cardIcon, backgroundColor: '#E8F5E9'}}>
                  <FiUsers style={{ color: BRAND_COLORS.armyGreen, fontSize: 24 }} />
                </div>
                <div style={styles.cardStats}>
                  <h3 style={styles.cardTitle}>Total Students</h3>
                  <div style={styles.cardValue}>{formatNumber(institutionalData.totalStudents)}</div>
                  <div style={styles.cardSubtext}>
                    <FiUserCheck style={{ marginRight: 4 }} />
                    {institutionalData.activeUsers} Active
                  </div>
                </div>
              </div>
              <div style={styles.cardFooter}>
                <span style={styles.cardTrend}>
                  <FiTrendingUp style={{ marginRight: 4, color: BRAND_COLORS.brightGreen }} />
                  Registered in system
                </span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.cardHeader}>
                <div style={{...styles.cardIcon, backgroundColor: '#FFF3E0'}}>
                  <FiUserCheck style={{ color: BRAND_COLORS.orange, fontSize: 24 }} />
                </div>
                <div style={styles.cardStats}>
                  <h3 style={styles.cardTitle}>Teaching Staff</h3>
                  <div style={styles.cardValue}>{formatNumber(institutionalData.totalTeachers)}</div>
                  <div style={styles.cardSubtext}>Qualified Educators</div>
                </div>
              </div>
              <div style={styles.cardFooter}>
                <span style={styles.cardTrend}>
                  Ratio: {metrics.studentTeacherRatio}:1
                </span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.cardHeader}>
                <div style={{...styles.cardIcon, backgroundColor: '#E3F2FD'}}>
                  <FiBook style={{ color: BRAND_COLORS.infoBlue, fontSize: 24 }} />
                </div>
                <div style={styles.cardStats}>
                  <h3 style={styles.cardTitle}>Active Classes</h3>
                  <div style={styles.cardValue}>{formatNumber(institutionalData.totalClasses)}</div>
                  <div style={styles.cardSubtext}>Across all levels</div>
                </div>
              </div>
              <div style={styles.cardFooter}>
                <span style={styles.cardTrend}>
                  Organized learning groups
                </span>
              </div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.cardHeader}>
                <div style={{...styles.cardIcon, backgroundColor: '#F3E5F5'}}>
                  <FiClipboard style={{ color: '#7B1FA2', fontSize: 24 }} />
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
                  <FiTrendingUp style={{ marginRight: 4, color: BRAND_COLORS.brightGreen }} />
                  {formatNumber(institutionalData.totalResults)} results
                </span>
              </div>
            </div>
          </div>

          {/* Simple Charts Section */}
          <div style={styles.chartsSection}>
            <div style={styles.chartRow}>
              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>
                  <FiTrendingUp style={styles.chartIcon} />
                  Performance Trend
                </h3>
                {performanceTrend.length > 0 ? (
                  renderSimpleBarChart(performanceTrend.slice(-6), 'month', 'score', BRAND_COLORS.armyGreen)
                ) : (
                  <div style={styles.noDataMessage}>
                    <FiBarChart style={styles.noDataIcon} />
                    <p>Performance data will appear as tests are taken</p>
                  </div>
                )}
              </div>

              <div style={styles.chartCard}>
                <h3 style={styles.chartTitle}>
                  <FiPieChart style={styles.chartIcon} />
                  Subject Distribution
                </h3>
                {subjectDistribution.length > 0 ? (
                  renderSimplePieChart(subjectDistribution)
                ) : (
                  <div style={styles.noDataMessage}>
                    <FiBook style={styles.noDataIcon} />
                    <p>Subject data loading...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div style={styles.performanceSection}>
            <h2 style={styles.sectionTitle}>
              <FiTarget style={styles.sectionIcon} />
              Key Performance Indicators
            </h2>
            <div style={styles.performanceGrid}>
              <div style={styles.performanceCard}>
                <div style={styles.performanceHeader}>
                  <span style={styles.performanceLabel}>Overall Academic Score</span>
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
                  Average across all subjects
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

              <div style={styles.performanceCard}>
                <div style={styles.performanceHeader}>
                  <span style={styles.performanceLabel}>Attendance Rate</span>
                  <span style={{
                    ...styles.performanceValue,
                    color: getPerformanceColor(metrics.attendance)
                  }}>
                    {metrics.attendance.toFixed(1)}%
                  </span>
                </div>
                <div style={styles.progressBar}>
                  <div 
                    style={{
                      ...styles.progressFill,
                      width: `${Math.min(metrics.attendance, 100)}%`,
                      backgroundColor: getPerformanceColor(metrics.attendance)
                    }}
                  />
                </div>
                <div style={styles.performanceSubtext}>
                  Current month average
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
            Performance Analytics
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
              </div>
              
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>Assessment</th>
                      <th style={styles.tableHeader}>Type</th>
                      <th style={styles.tableHeader}>Class</th>
                      <th style={styles.tableHeader}>Avg Score</th>
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
            Class Performance
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
                      <FiBook style={{ color: BRAND_COLORS.armyGreen }} />
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
              {recentActivity.slice(0, 10).map((activity, idx) => (
                <div key={idx} style={styles.activityItem}>
                  <div style={{
                    ...styles.activityIcon,
                    backgroundColor: activity.type === 'test' ? '#E8F5E9' :
                                    activity.type === 'result' ? '#E3F2FD' :
                                    activity.type === 'user' ? '#FFF3E0' : '#F3E5F5'
                  }}>
                    {activity.type === 'test' && <FiClipboard style={{ color: BRAND_COLORS.armyGreen }} />}
                    {activity.type === 'result' && <FiAward style={{ color: BRAND_COLORS.orange }} />}
                    {activity.type === 'user' && <FiUserCheck style={{ color: BRAND_COLORS.infoBlue }} />}
                    {activity.type === 'class' && <FiBook style={{ color: '#7B1FA2' }} />}
                  </div>
                  <div style={styles.activityContent}>
                    <div style={styles.activityTitle}>{activity.title}</div>
                    <div style={styles.activityDetails}>
                      <span style={styles.activityUser}>{activity.user}</span>
                      <span style={styles.activityTime}>{activity.time}</span>
                    </div>
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
          <FiInfo style={{ marginRight: 8, color: BRAND_COLORS.lightText }} />
          <span style={styles.summaryText}>
            Data updated: {new Date().toLocaleString()} • Institutional View
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
    backgroundColor: BRAND_COLORS.lightBg,
    minHeight: '100vh',
    padding: '20px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: `5px solid ${BRAND_COLORS.lightBg}`,
    borderTop: `5px solid ${BRAND_COLORS.armyGreen}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  loadingText: {
    color: BRAND_COLORS.darkText,
    fontSize: '16px',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    maxWidth: '500px',
    margin: '100px auto',
  },
  errorIcon: {
    fontSize: '48px',
    color: BRAND_COLORS.dangerRed,
    marginBottom: '16px',
  },
  errorTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: BRAND_COLORS.darkText,
    marginBottom: '8px',
  },
  errorText: {
    fontSize: '14px',
    color: BRAND_COLORS.lightText,
    marginBottom: '24px',
  },
  retryButton: {
    padding: '12px 24px',
    backgroundColor: BRAND_COLORS.armyGreen,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    width: '150px',
    margin: '0 auto',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: BRAND_COLORS.armyGreen,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  superAdminBadge: {
    fontSize: '12px',
    backgroundColor: BRAND_COLORS.orange,
    color: 'white',
    padding: '4px 8px',
    borderRadius: '20px',
    fontWeight: '600',
    marginLeft: '8px',
  },
  titleIcon: {
    fontSize: '32px',
    color: BRAND_COLORS.armyGreen,
  },
  pageSubtitle: {
    fontSize: '14px',
    color: BRAND_COLORS.lightText,
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  timestamp: {
    fontSize: '12px',
    color: BRAND_COLORS.lightText,
    opacity: 0.8,
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'white',
    padding: '8px 12px',
    borderRadius: '6px',
    border: `1px solid ${BRAND_COLORS.armyGreen}20`,
  },
  filterSelect: {
    padding: '8px 12px',
    border: 'none',
    backgroundColor: 'transparent',
    fontSize: '14px',
    color: BRAND_COLORS.darkText,
    minWidth: '120px',
    outline: 'none',
  },
  filterIcon: {
    color: BRAND_COLORS.armyGreen,
  },
  refreshButton: {
    padding: '12px 24px',
    backgroundColor: BRAND_COLORS.armyGreen,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    boxShadow: `0 4px 6px ${BRAND_COLORS.armyGreen}30`,
  },
  buttonIcon: {
    fontSize: '16px',
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '30px',
    borderBottom: `2px solid ${BRAND_COLORS.armyGreen}20`,
    paddingBottom: '4px',
    flexWrap: 'wrap',
  },
  tabButton: {
    padding: '14px 28px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    fontSize: '14px',
    fontWeight: '600',
    color: BRAND_COLORS.lightText,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  },
  activeTab: {
    backgroundColor: BRAND_COLORS.armyGreen,
    color: 'white',
    boxShadow: `0 4px 12px ${BRAND_COLORS.armyGreen}40`,
  },
  tabIcon: {
    fontSize: '18px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '40px',
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: `1px solid ${BRAND_COLORS.armyGreen}20`,
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '16px',
  },
  cardIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardStats: {
    flex: 1,
  },
  cardTitle: {
    fontSize: '14px',
    color: BRAND_COLORS.lightText,
    margin: 0,
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  cardValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: BRAND_COLORS.armyGreen,
    margin: '4px 0',
  },
  cardSubtext: {
    fontSize: '13px',
    color: BRAND_COLORS.lightText,
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  cardFooter: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: `1px solid ${BRAND_COLORS.armyGreen}20`,
  },
  cardTrend: {
    fontSize: '13px',
    color: BRAND_COLORS.lightText,
    display: 'flex',
    alignItems: 'center',
    fontWeight: '500',
  },
  chartsSection: {
    marginBottom: '40px',
  },
  chartRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
    gap: '24px',
    marginBottom: '24px',
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: `1px solid ${BRAND_COLORS.armyGreen}20`,
  },
  chartTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: BRAND_COLORS.armyGreen,
    margin: 0,
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  chartIcon: {
    fontSize: '20px',
    color: BRAND_COLORS.armyGreen,
  },
  simpleChartContainer: {
    padding: '10px 0',
  },
  barChartItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
    gap: '10px',
  },
  barLabel: {
    width: '80px',
    fontSize: '12px',
    color: BRAND_COLORS.lightText,
  },
  barContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  bar: {
    height: '20px',
    borderRadius: '4px',
    transition: 'width 0.5s ease',
  },
  barValue: {
    width: '40px',
    fontSize: '12px',
    fontWeight: '600',
    color: BRAND_COLORS.armyGreen,
    textAlign: 'right',
  },
  pieChartContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  pieItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 0',
    borderBottom: `1px solid ${BRAND_COLORS.armyGreen}10`,
  },
  pieColor: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
  },
  pieLabel: {
    flex: 1,
    fontSize: '14px',
    color: BRAND_COLORS.darkText,
  },
  pieValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: BRAND_COLORS.armyGreen,
  },
  noDataMessage: {
    height: '200px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: BRAND_COLORS.lightText,
  },
  noDataIcon: {
    fontSize: '48px',
    color: `${BRAND_COLORS.armyGreen}30`,
    marginBottom: '16px',
  },
  performanceSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '30px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: `1px solid ${BRAND_COLORS.armyGreen}20`,
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: BRAND_COLORS.armyGreen,
    margin: 0,
    marginBottom: '30px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sectionIcon: {
    fontSize: '24px',
    color: BRAND_COLORS.armyGreen,
  },
  performanceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  performanceCard: {
    padding: '24px',
    border: `1px solid ${BRAND_COLORS.armyGreen}20`,
    borderRadius: '12px',
    backgroundColor: BRAND_COLORS.lightBg,
  },
  performanceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  performanceLabel: {
    fontSize: '14px',
    color: BRAND_COLORS.lightText,
    fontWeight: '600',
  },
  performanceValue: {
    fontSize: '28px',
    fontWeight: '700',
  },
  progressBar: {
    height: '10px',
    backgroundColor: `${BRAND_COLORS.armyGreen}20`,
    borderRadius: '5px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '5px',
    transition: 'width 0.5s ease',
  },
  performanceSubtext: {
    fontSize: '13px',
    color: BRAND_COLORS.lightText,
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 30px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: `2px dashed ${BRAND_COLORS.armyGreen}30`,
    margin: '40px 0',
  },
  emptyIcon: {
    fontSize: '64px',
    color: `${BRAND_COLORS.armyGreen}50`,
    marginBottom: '20px',
  },
  emptyTitle: {
    fontSize: '22px',
    fontWeight: '600',
    color: BRAND_COLORS.darkText,
    margin: 0,
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '15px',
    color: BRAND_COLORS.lightText,
    margin: 0,
    maxWidth: '400px',
    margin: '0 auto',
  },
  analyticsTableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    marginBottom: '30px',
  },
  tableHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  tableTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: BRAND_COLORS.armyGreen,
    margin: 0,
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0',
    fontSize: '14px',
  },
  tableHeader: {
    padding: '18px 16px',
    textAlign: 'left',
    backgroundColor: BRAND_COLORS.lightBg,
    color: BRAND_COLORS.armyGreen,
    fontWeight: '600',
    borderBottom: `2px solid ${BRAND_COLORS.armyGreen}`,
    whiteSpace: 'nowrap',
  },
  tableRow: {
    borderBottom: `1px solid ${BRAND_COLORS.armyGreen}20`,
    transition: 'background-color 0.2s',
  },
  tableCell: {
    padding: '18px 16px',
    verticalAlign: 'middle',
  },
  testName: {
    fontWeight: '600',
    color: BRAND_COLORS.darkText,
    marginBottom: '4px',
  },
  testSubject: {
    fontSize: '13px',
    color: BRAND_COLORS.lightText,
  },
  typeBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  scoreDisplay: {
    fontSize: '18px',
    fontWeight: '700',
    textAlign: 'center',
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
  },
  classesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
  },
  classCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: `1px solid ${BRAND_COLORS.armyGreen}20`,
  },
  classHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '20px',
  },
  classIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    backgroundColor: `${BRAND_COLORS.armyGreen}15`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
  },
  className: {
    fontSize: '20px',
    fontWeight: '600',
    color: BRAND_COLORS.armyGreen,
    margin: 0,
    marginBottom: '4px',
  },
  classInfo: {
    fontSize: '14px',
    color: BRAND_COLORS.lightText,
    margin: 0,
  },
  classStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginBottom: '20px',
  },
  classStat: {
    textAlign: 'center',
  },
  statLabel: {
    display: 'block',
    fontSize: '13px',
    color: BRAND_COLORS.lightText,
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statValue: {
    display: 'block',
    fontSize: '20px',
    fontWeight: '700',
  },
  activityList: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    borderBottom: `1px solid ${BRAND_COLORS.armyGreen}20`,
    transition: 'background-color 0.3s ease',
  },
  activityIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '20px',
    fontSize: '24px',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: BRAND_COLORS.darkText,
    marginBottom: '8px',
  },
  activityDetails: {
    display: 'flex',
    gap: '20px',
    fontSize: '14px',
    color: BRAND_COLORS.lightText,
  },
  activityUser: {
    fontWeight: '500',
    color: BRAND_COLORS.armyGreen,
  },
  activityTime: {
    color: BRAND_COLORS.lightText,
  },
  summaryFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '40px',
    paddingTop: '24px',
    borderTop: `2px solid ${BRAND_COLORS.armyGreen}20`,
    fontSize: '14px',
    color: BRAND_COLORS.lightText,
  },
  summaryInfo: {
    display: 'flex',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: '14px',
    color: BRAND_COLORS.lightText,
  },
};

export default AnalyticsPage;