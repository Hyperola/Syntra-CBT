// AnalyticsPage.js - UPDATED WITHOUT TEST STATUS TAB AND PASS RATES
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { 
  FiUsers, 
  FiBook, 
  FiClipboard, 
  FiUserCheck,
  FiBarChart2,
  FiTrendingUp,
  FiRefreshCw,
  FiAlertCircle,
  FiHome,
  FiTarget,
  FiActivity,
  FiPercent,
  FiAward,
  FiCheckSquare,
  FiFileText,
  FiChevronRight,
  FiPlayCircle,
  FiClock,
  FiCheck,
  FiX
} from 'react-icons/fi';

// Brand Colors
const BRAND_COLORS = {
  armyGreen: '#4B5320',
  brightGreen: '#00FF00',
  orange: '#FFA500',
  lightBg: '#F8F9FA',
  darkText: '#2C3E50',
  lightText: '#6C757D'
};

const AnalyticsPage = () => {
  const { user } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [statusSummary, setStatusSummary] = useState(null);
  
  // Data state
  const [overviewData, setOverviewData] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalTests: 0,
    totalResults: 0,
    averageScore: 0,
    averageScoreFormatted: '0/100',
    activeUsers: 0,
    completionRate: 0
  });
  
  const [recentTests, setRecentTests] = useState([]);
  const [performanceTrend, setPerformanceTrend] = useState([]);
  const [testScoresSummary, setTestScoresSummary] = useState(null);
  const [detailedTests, setDetailedTests] = useState([]);

  // Test API connection
  const testAPIConnection = async () => {
    try {
      console.log('Testing API connection...');
      const response = await axios.get('http://localhost:5000/api/analytics/health');
      console.log('API Health:', response.data);
      return response.data.success;
    } catch (err) {
      console.log('API test failed:', err.message);
      return false;
    }
  };

  // Fetch real data - UPDATED WITHOUT PASS RATES
  const fetchRealData = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('No token found');
      setError('Please login to view analytics');
      return false;
    }

    try {
      console.log('Fetching real analytics data...');
      
      // Fetch overview
      const overviewResponse = await axios.get('http://localhost:5000/api/analytics/overview', {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (overviewResponse.data.success) {
        const overview = overviewResponse.data.overview;
        console.log('Overview data received:', overview);
        
        setOverviewData({
          totalStudents: overview.totalStudents || 0,
          totalTeachers: overview.totalTeachers || 0,
          totalClasses: overview.totalClasses || 0,
          totalTests: overview.totalTests || 0,
          totalResults: overview.totalResults || 0,
          averageScore: overview.averageScore || 0,
          averageScoreFormatted: overview.averageScoreFormatted || '0/100',
          activeUsers: overview.activeUsers || 0,
          completionRate: overview.completionRate || 0
        });
        
        // Set recent tests if available
        if (overviewResponse.data.recentTests) {
          setRecentTests(overviewResponse.data.recentTests);
        }
        
        setError(null);
        return true;
      } else {
        setError('Failed to fetch data from server');
        return false;
      }
    } catch (err) {
      console.log('Failed to fetch real data:', err.message);
      console.log('Error details:', err.response?.data);
      
      if (err.response?.status === 403) {
        setError('Admin access required. Please login as admin.');
      } else if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError('Failed to connect to server. Please check if server is running.');
      }
      return false;
    }
  };

  // Fetch performance trend
  const fetchPerformanceTrend = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await axios.get('http://localhost:5000/api/analytics/performance-trend?months=6', {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setPerformanceTrend(response.data.trendData);
      }
    } catch (err) {
      console.log('Failed to fetch performance trend:', err.message);
    }
  };

  // Fetch detailed test scores
  const fetchDetailedTests = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await axios.get('http://localhost:5000/api/analytics/recent-tests-detailed?limit=10', {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setDetailedTests(response.data.tests);
      }
    } catch (err) {
      console.log('Failed to fetch detailed tests:', err.message);
    }
  };

  // Fetch test scores summary
  const fetchTestScoresSummary = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await axios.get('http://localhost:5000/api/analytics/test-scores-summary', {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setTestScoresSummary(response.data.summary);
      }
    } catch (err) {
      console.log('Failed to fetch test scores summary:', err.message);
    }
  };

  // NEW: Fetch test status summary
  const fetchStatusSummary = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await axios.get('http://localhost:5000/api/analytics/test-status-summary', {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setStatusSummary(response.data.statusSummary);
      }
    } catch (err) {
      console.log('Failed to fetch status summary:', err.message);
    }
  };

  // Load data - UPDATED
  useEffect(() => {
    console.log('📊 AnalyticsPage mounted, user role:', user?.role);
    
    const loadData = async () => {
      if (!user) {
        setError('Please login to view analytics');
        setLoading(false);
        return;
      }

      // Check if user is admin/teacher
      if (!['admin', 'super_admin', 'teacher'].includes(user.role)) {
        setError('Access denied. Admin or teacher role required.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      // Test API connection
      const apiAvailable = await testAPIConnection();
      
      if (apiAvailable) {
        // Try to fetch real data
        const realDataSuccess = await fetchRealData();
        
        if (realDataSuccess) {
          // Fetch additional data
          await Promise.all([
            fetchPerformanceTrend(),
            fetchDetailedTests(),
            fetchTestScoresSummary(),
            fetchStatusSummary()
          ]);
        } else {
          setError('Connected to API but could not fetch data');
        }
      } else {
        setError('API unavailable. Please check if server is running on port 5000.');
      }
      
      setLoading(false);
    };

    loadData();
  }, [user]);

  // Refresh data - UPDATED
  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchRealData(),
      fetchPerformanceTrend(),
      fetchDetailedTests(),
      fetchTestScoresSummary(),
      fetchStatusSummary()
    ]);
    setRefreshing(false);
  };

  // Format number
  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Get score color based on value
  const getScoreColor = (score, totalMarks = 100) => {
    const percentage = (score / totalMarks) * 100;
    if (percentage >= 70) return '#00FF00';
    if (percentage >= 50) return '#FFA500';
    return '#DC3545';
  };

  // Get test type icon
  const getTestTypeIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'exam':
        return <FiFileText style={{ color: '#7B1FA2' }} />;
      case 'ca':
        return <FiCheckSquare style={{ color: '#1976D2' }} />;
      case 'assignment':
        return <FiFileText style={{ color: '#388E3C' }} />;
      case 'quiz':
        return <FiAward style={{ color: '#F57C00' }} />;
      default:
        return <FiClipboard style={{ color: '#4B5320' }} />;
    }
  };

  // Get status badge style - UPDATED WITH MORE STATUSES
  const getStatusStyle = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed':
        return { 
          bg: 'rgba(46, 125, 50, 0.1)', 
          color: '#2E7D32', 
          icon: <FiCheck />,
          label: 'Completed'
        };
      case 'active':
        return { 
          bg: 'rgba(25, 118, 210, 0.1)', 
          color: '#1976D2', 
          icon: <FiPlayCircle />,
          label: 'Active'
        };
      case 'scheduled':
        return { 
          bg: 'rgba(245, 124, 0, 0.1)', 
          color: '#F57C00', 
          icon: <FiClock />,
          label: 'Scheduled'
        };
      case 'draft':
        return { 
          bg: 'rgba(117, 117, 117, 0.1)', 
          color: '#757575', 
          icon: <FiFileText />,
          label: 'Draft'
        };
      case 'approved':
        return { 
          bg: 'rgba(102, 187, 106, 0.1)', 
          color: '#66BB6A', 
          icon: <FiCheck />,
          label: 'Approved'
        };
      case 'cancelled':
        return { 
          bg: 'rgba(211, 47, 47, 0.1)', 
          color: '#D32F2F', 
          icon: <FiX />,
          label: 'Cancelled'
        };
      default:
        return { 
          bg: 'rgba(117, 117, 117, 0.1)', 
          color: '#757575', 
          icon: <FiFileText />,
          label: status || 'Unknown'
        };
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading Analytics Data...</p>
        <p style={styles.loadingSubtext}>Fetching scores and status...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>
            <FiActivity style={styles.titleIcon} />
            Analytics Dashboard
          </h1>
          <p style={styles.pageSubtitle}>
            Welcome, {user?.name || user?.username} • {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={refreshData}
            disabled={refreshing}
            style={styles.refreshButton}
          >
            <FiRefreshCw style={{ 
              marginRight: 8,
              animation: refreshing ? 'spin 1s linear infinite' : 'none'
            }} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={styles.errorBanner}>
          <FiAlertCircle style={{ marginRight: 8, fontSize: 18 }} />
          <div>
            <strong>Error:</strong> {error}
            <div style={styles.errorHelp}>
              Check if: 1) Server is running on port 5000, 2) Database is connected, 3) You're logged in as admin
            </div>
          </div>
        </div>
      )}

      {/* Welcome message for non-admin */}
      {user && user.role === 'teacher' && (
        <div style={styles.infoBanner}>
          <FiAlertCircle style={{ marginRight: 8 }} />
          <span>Teacher Analytics View • Showing only your class data</span>
        </div>
      )}

      {/* Tabs - REMOVED STATUS TAB */}
      <div style={styles.tabsContainer}>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'overview' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('overview')}
        >
          <FiHome style={styles.tabIcon} />
          Overview
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'scores' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('scores')}
        >
          <FiTarget style={styles.tabIcon} />
          Test Scores
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'performance' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('performance')}
        >
          <FiBarChart2 style={styles.tabIcon} />
          Performance
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(activeTab === 'tests' ? styles.activeTab : {})
          }}
          onClick={() => setActiveTab('tests')}
        >
          <FiClipboard style={styles.tabIcon} />
          Recent Tests
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics */}
          <div style={styles.metricsGrid}>
            <MetricCard
              title="Total Students"
              value={formatNumber(overviewData.totalStudents)}
              icon={<FiUsers />}
              color="#4B5320"
              subtext={`${formatNumber(overviewData.activeUsers)} active users`}
            />
            
            <MetricCard
              title="Teachers"
              value={formatNumber(overviewData.totalTeachers)}
              icon={<FiUserCheck />}
              color="#00FF00"
              subtext="Teaching staff"
            />
            
            <MetricCard
              title="Classes"
              value={formatNumber(overviewData.totalClasses)}
              icon={<FiBook />}
              color="#FFA500"
              subtext="Active classes"
            />
            
            <MetricCard
              title="Tests & Exams"
              value={formatNumber(overviewData.totalTests)}
              icon={<FiClipboard />}
              color="#6B8E23"
              subtext={`${formatNumber(overviewData.totalResults)} results submitted`}
            />
          </div>

          {/* Performance Metrics - WITHOUT PASS RATE */}
          <div style={styles.performanceSection}>
            <h2 style={styles.sectionTitle}>
              <FiTarget style={styles.sectionIcon} />
              Performance Metrics
            </h2>
            
            <div style={styles.performanceGrid}>
              <PerformanceCard
                title="Average Score"
                value={overviewData.averageScoreFormatted}
                progress={overviewData.averageScore}
                color={overviewData.averageScore >= 70 ? '#00FF00' : '#FFA500'}
                icon={<FiPercent />}
                subtext="Formatted as score/total"
              />
              
              <PerformanceCard
                title="Completion Rate"
                value={`${overviewData.completionRate.toFixed(1)}%`}
                progress={overviewData.completionRate}
                color={overviewData.completionRate >= 80 ? '#00FF00' : '#FFA500'}
                icon={<FiCheckSquare />}
                subtext="Tests with results"
              />
            </div>
          </div>

          {/* Test Status Summary */}
          {statusSummary && (
            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>
                <FiActivity style={styles.summaryIcon} />
                Test Status Summary
              </h3>
              <div style={styles.statusGrid}>
                {Object.entries(statusSummary.counts || {}).map(([status, count]) => {
                  if (count === 0) return null;
                  const statusStyle = getStatusStyle(status);
                  const percentage = statusSummary.totalTests > 0 
                    ? ((count / statusSummary.totalTests) * 100).toFixed(1) 
                    : '0';
                  
                  return (
                    <div key={status} style={styles.statusCard}>
                      <div style={styles.statusHeader}>
                        <div style={{
                          ...styles.statusIcon,
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.color
                        }}>
                          {statusStyle.icon}
                        </div>
                        <div style={styles.statusContent}>
                          <div style={styles.statusName}>{statusStyle.label}</div>
                          <div style={styles.statusCount}>{count} tests</div>
                        </div>
                      </div>
                      <div style={styles.statusPercentage}>
                        {percentage}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Test Stats - WITHOUT PASS RATE */}
          {testScoresSummary && testScoresSummary.overall && (
            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>
                <FiAward style={styles.summaryIcon} />
                Test Score Summary
              </h3>
              <div style={styles.quickStats}>
                <div style={styles.quickStat}>
                  <div style={styles.quickStatLabel}>Total Tests with Results</div>
                  <div style={styles.quickStatValue}>
                    {testScoresSummary.overall.totalTests || 0}
                  </div>
                </div>
                <div style={styles.quickStat}>
                  <div style={styles.quickStatLabel}>Average Score</div>
                  <div style={styles.quickStatValue}>
                    {testScoresSummary.overall.averageScoreFormatted || '0/100'}
                  </div>
                </div>
                <div style={styles.quickStat}>
                  <div style={styles.quickStatLabel}>Total Students</div>
                  <div style={styles.quickStatValue}>
                    {formatNumber(testScoresSummary.overall.totalStudents || 0)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data Summary - WITHOUT PASS RATE */}
          <div style={styles.summaryCard}>
            <h3 style={styles.summaryTitle}>
              <FiActivity style={styles.summaryIcon} />
              Data Summary
            </h3>
            <div style={styles.summaryGrid}>
              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>Student-Teacher Ratio</div>
                <div style={styles.summaryValue}>
                  {overviewData.totalTeachers > 0 
                    ? (overviewData.totalStudents / overviewData.totalTeachers).toFixed(1) 
                    : 'N/A'}:1
                </div>
              </div>
              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>Results per Student</div>
                <div style={styles.summaryValue}>
                  {overviewData.totalStudents > 0 
                    ? (overviewData.totalResults / overviewData.totalStudents).toFixed(1) 
                    : 'N/A'}
                </div>
              </div>
              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>Active Users</div>
                <div style={styles.summaryValue}>
                  {formatNumber(overviewData.activeUsers)} / {formatNumber(overviewData.totalStudents + overviewData.totalTeachers)}
                </div>
              </div>
              <div style={styles.summaryItem}>
                <div style={styles.summaryLabel}>Completion Rate</div>
                <div style={styles.summaryValue}>
                  {overviewData.completionRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Test Scores Tab - UPDATED WITHOUT PASS RATES */}
      {activeTab === 'scores' && (
        <div style={styles.scoresTab}>
          <h2 style={styles.sectionTitle}>
            <FiTarget style={styles.sectionIcon} />
            Test Scores Analysis
          </h2>
          
          {detailedTests.length > 0 ? (
            <>
              {/* Score Summary Cards WITHOUT PASS RATES */}
              <div style={styles.scoreSummaryGrid}>
                {detailedTests.slice(0, 4).map((test, index) => (
                  <div key={test.id || index} style={styles.scoreCard}>
                    <div style={styles.scoreCardHeader}>
                      <div style={styles.testTypeBadge}>
                        {getTestTypeIcon(test.type)}
                        <span style={styles.testTypeText}>{test.type}</span>
                      </div>
                      <div style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusStyle(test.status).bg,
                        color: getStatusStyle(test.status).color
                      }}>
                        {getStatusStyle(test.status).icon}
                        <span style={{ marginLeft: 4 }}>{test.status}</span>
                      </div>
                    </div>
                    
                    <h3 style={styles.scoreCardTitle}>{test.title}</h3>
                    <div style={styles.scoreCardSubtitle}>
                      {test.subject} • {test.class}
                    </div>
                    
                    <div style={styles.scoreCardStats}>
                      <div style={styles.scoreStat}>
                        <div style={styles.scoreStatLabel}>Average Score</div>
                        <div style={{
                          ...styles.scoreStatValue,
                          color: getScoreColor(parseInt(test.stats?.averageScoreFormatted?.split('/')[0] || 0), test.totalMarks)
                        }}>
                          {test.stats?.averageScoreFormatted || '0/100'}
                        </div>
                      </div>
                      
                      <div style={styles.scoreStatRow}>
                        <div style={styles.scoreStatItem}>
                          <div style={styles.scoreStatItemLabel}>Highest</div>
                          <div style={styles.scoreStatItemValue}>
                            {test.stats?.highestScore || 0}/{test.totalMarks}
                          </div>
                        </div>
                        <div style={styles.scoreStatItem}>
                          <div style={styles.scoreStatItemLabel}>Lowest</div>
                          <div style={styles.scoreStatItemValue}>
                            {test.stats?.lowestScore || 0}/{test.totalMarks}
                          </div>
                        </div>
                      </div>
                      
                      {/* Student Count */}
                      <div style={styles.studentCountSection}>
                        <div style={styles.studentCountLabel}>
                          <FiUsers style={{ marginRight: 6 }} />
                          Students
                        </div>
                        <div style={styles.studentCountValue}>
                          {test.stats?.totalStudents || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Detailed Table WITHOUT PASS RATE COLUMN */}
              <div style={styles.detailedTableSection}>
                <h3 style={styles.tableSectionTitle}>
                  <FiClipboard style={{ marginRight: 8 }} />
                  All Test Scores
                </h3>
                <div style={styles.tableContainer}>
                  <table style={styles.detailedTable}>
                    <thead>
                      <tr>
                        <th style={styles.detailedTableHeader}>Test</th>
                        <th style={styles.detailedTableHeader}>Type</th>
                        <th style={styles.detailedTableHeader}>Subject/Class</th>
                        <th style={styles.detailedTableHeader}>Avg Score</th>
                        <th style={styles.detailedTableHeader}>Students</th>
                        <th style={styles.detailedTableHeader}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedTests.map((test, index) => {
                        const avgScore = parseInt(test.stats?.averageScoreFormatted?.split('/')[0] || 0);
                        
                        return (
                          <tr key={test.id || index} style={styles.detailedTableRow}>
                            <td style={styles.detailedTableCell}>
                              <div style={styles.testInfo}>
                                <div style={styles.testTitle}>{test.title}</div>
                                <div style={styles.testDate}>
                                  {new Date(test.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </td>
                            <td style={styles.detailedTableCell}>
                              <div style={styles.typeCell}>
                                {getTestTypeIcon(test.type)}
                                <span style={{ marginLeft: 6 }}>{test.type}</span>
                              </div>
                            </td>
                            <td style={styles.detailedTableCell}>
                              <div style={styles.subjectClassCell}>
                                <div style={styles.subjectBadge}>{test.subject}</div>
                                <div style={styles.classText}>{test.class}</div>
                              </div>
                            </td>
                            <td style={styles.detailedTableCell}>
                              <div style={{
                                ...styles.scoreCell,
                                backgroundColor: getScoreColor(avgScore, test.totalMarks) + '20',
                                color: getScoreColor(avgScore, test.totalMarks)
                              }}>
                                {test.stats?.averageScoreFormatted || '0/100'}
                              </div>
                            </td>
                            <td style={styles.detailedTableCell}>
                              <div style={styles.studentsCell}>
                                <div style={styles.studentsCount}>
                                  <FiUsers style={{ marginRight: 6, fontSize: 14 }} />
                                  {test.stats?.totalStudents || 0}
                                </div>
                              </div>
                            </td>
                            <td style={styles.detailedTableCell}>
                              <div style={{
                                ...styles.statusCell,
                                backgroundColor: getStatusStyle(test.status).bg,
                                color: getStatusStyle(test.status).color
                              }}>
                                {getStatusStyle(test.status).icon}
                                <span style={{ marginLeft: 4 }}>{test.status}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div style={styles.emptyState}>
              <FiTarget style={{ fontSize: 48, color: '#6C757D', marginBottom: 16 }} />
              <p style={styles.emptyText}>No test score data available</p>
              <p style={styles.emptySubtext}>Test scores will appear here as tests are completed</p>
              <button onClick={refreshData} style={styles.retryButton}>
                <FiRefreshCw style={{ marginRight: 8 }} />
                Refresh Data
              </button>
            </div>
          )}
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div style={styles.performanceTab}>
          <h2 style={styles.sectionTitle}>
            <FiTrendingUp style={styles.sectionIcon} />
            Performance Trend (Last 6 Months)
          </h2>
          
          {performanceTrend.length > 0 ? (
            <div style={styles.chartCard}>
              <div style={styles.chartContainer}>
                {performanceTrend.map((item, index) => (
                  <div key={index} style={styles.barItem}>
                    <div style={styles.barLabel}>{item.month}</div>
                    <div style={styles.barWrapper}>
                      <div 
                        style={{
                          ...styles.bar,
                          width: `${Math.min(item.score, 100)}%`,
                          backgroundColor: item.score >= 70 ? '#00FF00' : 
                                         item.score >= 50 ? '#FFA500' : '#DC3545'
                        }}
                      />
                      <div style={styles.barValue}>{item.score.toFixed(1)}%</div>
                    </div>
                    <div style={styles.barSubtext}>{item.testsTaken || 0} tests</div>
                  </div>
                ))}
              </div>
              
              {performanceTrend.length > 0 && (
                <div style={styles.trendSummary}>
                  <div style={styles.trendItem}>
                    <div style={styles.trendLabel}>Current Score</div>
                    <div style={styles.trendValue}>
                      {performanceTrend[performanceTrend.length - 1]?.score?.toFixed(1) || 0}%
                    </div>
                  </div>
                  <div style={styles.trendItem}>
                    <div style={styles.trendLabel}>Highest Score</div>
                    <div style={styles.trendValue}>
                      {Math.max(...performanceTrend.map(d => d.score || 0)).toFixed(1)}%
                    </div>
                  </div>
                  <div style={styles.trendItem}>
                    <div style={styles.trendLabel}>Average</div>
                    <div style={styles.trendValue}>
                      {(performanceTrend.reduce((sum, d) => sum + (d.score || 0), 0) / performanceTrend.length).toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <FiBarChart2 style={{ fontSize: 48, color: '#6C757D', marginBottom: 16 }} />
              <p style={styles.emptyText}>No performance data available yet</p>
              <p style={styles.emptySubtext}>Performance data will appear here as tests are completed</p>
              <button onClick={refreshData} style={styles.retryButton}>
                <FiRefreshCw style={{ marginRight: 8 }} />
                Refresh Data
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tests Tab - UPDATED WITHOUT PASS RATE COLUMN */}
      {activeTab === 'tests' && (
        <div style={styles.testsTab}>
          <h2 style={styles.sectionTitle}>
            <FiClipboard style={styles.sectionIcon} />
            Recent Tests & Exams
          </h2>
          
          {recentTests.length > 0 ? (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>Test Title</th>
                    <th style={styles.tableHeader}>Type</th>
                    <th style={styles.tableHeader}>Subject/Class</th>
                    <th style={styles.tableHeader}>Avg Score</th>
                    <th style={styles.tableHeader}>Status</th>
                    <th style={styles.tableHeader}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTests.map((test, index) => {
                    const scoreParts = test.averageScoreFormatted?.split('/') || ['0', '100'];
                    const actualScore = parseInt(scoreParts[0]);
                    const totalMarks = parseInt(scoreParts[1]) || test.totalMarks || 100;
                    const percentage = totalMarks > 0 ? (actualScore / totalMarks) * 100 : 0;
                    const statusStyle = getStatusStyle(test.status);
                    
                    return (
                      <tr key={test.id || index} style={styles.tableRow}>
                        <td style={styles.tableCell}>
                          <div style={styles.testTitle}>{test.title || 'Untitled Test'}</div>
                          <div style={styles.testCreator}>
                            By: {test.createdBy || 'Unknown'}
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.typeCell}>
                            {getTestTypeIcon(test.type)}
                            <span style={{ marginLeft: 6 }}>{test.type}</span>
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.subjectClass}>
                            <div style={styles.subjectBadge}>{test.subject}</div>
                            <div style={styles.classText}>{test.class}</div>
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={{
                            ...styles.scoreDisplay,
                            backgroundColor: getScoreColor(actualScore, totalMarks) + '20',
                            color: getScoreColor(actualScore, totalMarks)
                          }}>
                            <div style={styles.scoreValue}>
                              {test.averageScoreFormatted || '0/100'}
                            </div>
                            <div style={styles.scorePercentage}>
                              ({percentage.toFixed(1)}%)
                            </div>
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={{
                            ...styles.statusDisplay,
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color
                          }}>
                            {statusStyle.icon}
                            <span style={{ marginLeft: 4 }}>{test.status}</span>
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={styles.dateCell}>
                            {test.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <FiClipboard style={{ fontSize: 48, color: '#6C757D', marginBottom: 16 }} />
              <p style={styles.emptyText}>No recent tests found</p>
              <p style={styles.emptySubtext}>Tests will appear here as they are created and completed</p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.footerInfo}>
          <span style={styles.footerText}>
            Data Source: School Database • 
            Last Updated: {new Date().toLocaleTimeString()} • 
            Average Score: {overviewData.averageScoreFormatted}
          </span>
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, icon, color, subtext }) => (
  <div style={styles.metricCard}>
    <div style={styles.metricHeader}>
      <div style={{...styles.metricIcon, backgroundColor: `${color}20`}}>
        {React.cloneElement(icon, { style: { color, fontSize: 24 } })}
      </div>
      <div style={styles.metricContent}>
        <h3 style={styles.metricTitle}>{title}</h3>
        <div style={styles.metricValue}>{value}</div>
        {subtext && <div style={styles.metricSubtext}>{subtext}</div>}
      </div>
    </div>
  </div>
);

// Performance Card Component
const PerformanceCard = ({ title, value, progress, color, icon, subtext }) => (
  <div style={styles.perfCard}>
    <div style={styles.perfHeader}>
      <div style={styles.perfTitleWrapper}>
        {icon && React.cloneElement(icon, { 
          style: { color, marginRight: 8, fontSize: 16 } 
        })}
        <span style={styles.perfTitle}>{title}</span>
      </div>
      <span style={styles.perfValue}>{value}</span>
    </div>
    {progress !== undefined && (
      <div style={styles.progressContainer}>
        <div style={styles.progressBar}>
          <div 
            style={{
              ...styles.progressFill,
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: color
            }}
          />
        </div>
        <div style={styles.progressLabel}>{progress.toFixed(1)}%</div>
      </div>
    )}
    {subtext && <div style={styles.perfSubtext}>{subtext}</div>}
  </div>
);

const styles = {
  container: {
    fontFamily: '"Fredoka", sans-serif',
    backgroundColor: '#F8F9FA',
    minHeight: '100vh',
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    textAlign: 'center',
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #F8F9FA',
    borderTop: '5px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  loadingText: {
    color: '#2C3E50',
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  loadingSubtext: {
    color: '#6C757D',
    fontSize: '14px',
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#4B5320',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  titleIcon: {
    fontSize: '28px',
    color: '#4B5320',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#6C757D',
    marginTop: '8px',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#3a4420',
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
    }
  },
  errorBanner: {
    backgroundColor: '#F8D7DA',
    border: '1px solid #F5C6CB',
    color: '#721C24',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'flex-start',
    fontSize: '14px',
  },
  errorHelp: {
    fontSize: '12px',
    color: '#856404',
    marginTop: '8px',
    fontStyle: 'italic',
  },
  infoBanner: {
    backgroundColor: '#D1ECF1',
    border: '1px solid #BEE5EB',
    color: '#0C5460',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '30px',
    borderBottom: '2px solid rgba(75, 83, 32, 0.1)',
    paddingBottom: '4px',
    flexWrap: 'wrap',
    overflowX: 'auto',
  },
  tabButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px 6px 0 0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#6C757D',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    '&:hover': {
      backgroundColor: 'rgba(75, 83, 32, 0.05)',
    }
  },
  activeTab: {
    backgroundColor: '#4B5320',
    color: 'white',
    '&:hover': {
      backgroundColor: '#4B5320',
    }
  },
  tabIcon: {
    fontSize: '16px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '30px',
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid rgba(75, 83, 32, 0.1)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
    }
  },
  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  metricIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricContent: {
    flex: 1,
    minWidth: 0,
  },
  metricTitle: {
    fontSize: '13px',
    color: '#6C757D',
    margin: 0,
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#4B5320',
    margin: '4px 0',
    lineHeight: 1.2,
  },
  metricSubtext: {
    fontSize: '13px',
    color: '#6C757D',
    marginTop: '4px',
  },
  performanceSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '28px',
    marginBottom: '30px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#4B5320',
    margin: 0,
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sectionIcon: {
    fontSize: '22px',
    color: '#4B5320',
  },
  performanceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  perfCard: {
    padding: '24px',
    border: '1px solid rgba(75, 83, 32, 0.15)',
    borderRadius: '10px',
    backgroundColor: '#F8F9FA',
  },
  perfHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  perfTitleWrapper: {
    display: 'flex',
    alignItems: 'center',
  },
  perfTitle: {
    fontSize: '15px',
    color: '#6C757D',
    fontWeight: '600',
  },
  perfValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#4B5320',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginTop: '12px',
  },
  progressBar: {
    flex: 1,
    height: '10px',
    backgroundColor: 'rgba(75, 83, 32, 0.1)',
    borderRadius: '5px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '5px',
    transition: 'width 0.3s ease',
  },
  progressLabel: {
    width: '60px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#4B5320',
    textAlign: 'right',
  },
  perfSubtext: {
    fontSize: '13px',
    color: '#6C757D',
    marginTop: '12px',
  },
  // Status Grid
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    marginTop: '20px',
  },
  statusCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: '#F8F9FA',
    borderRadius: '10px',
    border: '1px solid rgba(75, 83, 32, 0.1)',
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  statusContent: {
    flex: 1,
  },
  statusName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4B5320',
    marginBottom: '2px',
  },
  statusCount: {
    fontSize: '12px',
    color: '#6C757D',
  },
  statusPercentage: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#4B5320',
  },
  // Quick Stats
  quickStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginTop: '20px',
  },
  quickStat: {
    padding: '16px',
    backgroundColor: '#F8F9FA',
    borderRadius: '8px',
    border: '1px solid rgba(75, 83, 32, 0.1)',
    textAlign: 'center',
  },
  quickStatLabel: {
    fontSize: '13px',
    color: '#6C757D',
    marginBottom: '8px',
    fontWeight: '600',
  },
  quickStatValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#4B5320',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '30px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid rgba(75, 83, 32, 0.1)',
  },
  summaryTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4B5320',
    margin: 0,
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  summaryIcon: {
    fontSize: '18px',
    color: '#4B5320',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  summaryItem: {
    padding: '16px',
    backgroundColor: '#F8F9FA',
    borderRadius: '8px',
    border: '1px solid rgba(75, 83, 32, 0.1)',
  },
  summaryLabel: {
    fontSize: '13px',
    color: '#6C757D',
    marginBottom: '8px',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#4B5320',
  },
  // Scores Tab Styles
  scoresTab: {
    marginBottom: '30px',
  },
  scoreSummaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '30px',
  },
  scoreCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid rgba(75, 83, 32, 0.1)',
  },
  scoreCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  testTypeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'rgba(75, 83, 32, 0.1)',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#4B5320',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
  },
  testTypeText: {
    marginLeft: '4px',
  },
  scoreCardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2C3E50',
    margin: '0 0 8px 0',
  },
  scoreCardSubtitle: {
    fontSize: '14px',
    color: '#6C757D',
    marginBottom: '20px',
  },
  scoreCardStats: {
    marginTop: '20px',
  },
  scoreStat: {
    marginBottom: '16px',
  },
  scoreStatLabel: {
    fontSize: '13px',
    color: '#6C757D',
    marginBottom: '4px',
    fontWeight: '500',
  },
  scoreStatValue: {
    fontSize: '32px',
    fontWeight: '700',
  },
  scoreStatRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '16px',
  },
  scoreStatItem: {
    flex: 1,
  },
  scoreStatItemLabel: {
    fontSize: '12px',
    color: '#6C757D',
    marginBottom: '4px',
  },
  scoreStatItemValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#4B5320',
  },
  studentCountSection: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(75, 83, 32, 0.1)',
  },
  studentCountLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: '600',
    color: '#4B5320',
    marginBottom: '8px',
  },
  studentCountValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#4B5320',
  },
  detailedTableSection: {
    marginTop: '30px',
  },
  tableSectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    overflowX: 'auto',
  },
  detailedTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  detailedTableHeader: {
    padding: '16px',
    textAlign: 'left',
    backgroundColor: '#F8F9FA',
    color: '#4B5320',
    fontWeight: '600',
    borderBottom: '2px solid #4B5320',
    whiteSpace: 'nowrap',
  },
  detailedTableRow: {
    borderBottom: '1px solid rgba(75, 83, 32, 0.1)',
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: 'rgba(75, 83, 32, 0.02)',
    }
  },
  detailedTableCell: {
    padding: '16px',
    verticalAlign: 'middle',
  },
  testInfo: {
    minWidth: '200px',
  },
  testTitle: {
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: '4px',
  },
  testDate: {
    fontSize: '12px',
    color: '#6C757D',
  },
  typeCell: {
    display: 'flex',
    alignItems: 'center',
  },
  subjectClassCell: {
    minWidth: '150px',
  },
  subjectBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: 'rgba(75, 83, 32, 0.1)',
    color: '#4B5320',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    marginBottom: '4px',
  },
  classText: {
    fontSize: '13px',
    color: '#6C757D',
  },
  scoreCell: {
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    display: 'inline-block',
  },
  studentsCell: {
    display: 'flex',
    alignItems: 'center',
  },
  studentsCount: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: '600',
    color: '#4B5320',
  },
  statusCell: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  // Performance Tab Styles
  performanceTab: {
    marginBottom: '30px',
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '28px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    marginBottom: '24px',
  },
  chartContainer: {
    padding: '10px 0 30px 0',
  },
  barItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '20px',
  },
  barLabel: {
    width: '100px',
    fontSize: '14px',
    color: '#6C757D',
    fontWeight: '500',
    flexShrink: 0,
  },
  barWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  bar: {
    height: '24px',
    borderRadius: '6px',
    transition: 'width 0.3s ease',
  },
  barValue: {
    width: '60px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#4B5320',
    textAlign: 'right',
    flexShrink: 0,
  },
  barSubtext: {
    width: '100px',
    fontSize: '13px',
    color: '#6C757D',
    textAlign: 'right',
    flexShrink: 0,
  },
  trendSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginTop: '30px',
    paddingTop: '30px',
    borderTop: '1px solid rgba(75, 83, 32, 0.1)',
  },
  trendItem: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#F8F9FA',
    borderRadius: '8px',
  },
  trendLabel: {
    fontSize: '14px',
    color: '#6C757D',
    marginBottom: '8px',
    fontWeight: '500',
  },
  trendValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#4B5320',
  },
  // Tests Tab Styles
  testsTab: {
    marginBottom: '30px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  tableHeader: {
    padding: '16px',
    textAlign: 'left',
    backgroundColor: '#F8F9FA',
    color: '#4B5320',
    fontWeight: '600',
    borderBottom: '2px solid #4B5320',
    whiteSpace: 'nowrap',
  },
  tableRow: {
    borderBottom: '1px solid rgba(75, 83, 32, 0.1)',
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: 'rgba(75, 83, 32, 0.02)',
    }
  },
  tableCell: {
    padding: '16px',
    verticalAlign: 'middle',
  },
  subjectClass: {
    minWidth: '150px',
  },
  scoreDisplay: {
    padding: '10px 16px',
    borderRadius: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: '16px',
    fontWeight: '700',
  },
  scorePercentage: {
    fontSize: '12px',
    opacity: 0.8,
  },
  statusDisplay: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  dateCell: {
    fontSize: '13px',
    color: '#6C757D',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 40px',
    color: '#6C757D',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  },
  emptyText: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '14px',
    marginBottom: '24px',
    maxWidth: '500px',
    margin: '0 auto 24px',
  },
  retryButton: {
    padding: '12px 24px',
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#3a4420',
    }
  },
  footer: {
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(75, 83, 32, 0.2)',
  },
  footerInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: '13px',
    color: '#6C757D',
    textAlign: 'center',
  },
};

// Add CSS animation for spinner
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

export default AnalyticsPage;