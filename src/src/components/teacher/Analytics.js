import React, { useState, useEffect } from 'react';
import useTeacherData from '../../hooks/useTeacherData';
import { 
  FiBarChart2, FiAlertTriangle, FiCheckCircle, FiAward, FiUsers, 
  FiBook, FiClock, FiTrendingUp, FiTrendingDown, FiActivity, 
  FiTarget, FiPercent, FiCalendar, FiFilter, FiDownload, 
  FiRefreshCw, FiGrid, FiPieChart, FiBarChart
} from 'react-icons/fi';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement, 
  PointElement,
  Title,
  Filler
} from 'chart.js';

ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale, 
  LinearScale, BarElement, LineElement, PointElement,
  Title, Filler
);

const Analytics = () => {
  const { analytics, tests, results, error, success, loading } = useTeacherData();
  const [timeFilter, setTimeFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [viewMode, setViewMode] = useState('overview');

  // Brand colors
  const brandColors = {
    primary: '#4B5320',      // Army green
    secondary: '#D4A017',    // Golden rod
    accent: '#8B4513',       // Saddle brown
    light: '#F5F5DC',        // Beige
    dark: '#2C3E50',         // Dark blue
    success: '#28A745',
    warning: '#FFC107',
    danger: '#DC3545',
    info: '#17A2B8',
    background: '#F8F9FA',
    cardBg: '#FFFFFF',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280'
  };

  // Log analytics to debug
  console.log('Analytics prop:', analytics);

  // Filter analytics based on selected filters
  const filteredAnalytics = React.useMemo(() => {
    let filtered = [...analytics];
    
    if (timeFilter !== 'all') {
      const currentDate = new Date();
      const filterDate = new Date();
      
      switch(timeFilter) {
        case 'week':
          filterDate.setDate(filterDate.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(filterDate.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(filterDate.getMonth() - 3);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(a => new Date(a.createdAt) >= filterDate);
    }
    
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(a => a.subject === subjectFilter);
    }
    
    return filtered;
  }, [analytics, timeFilter, subjectFilter]);

  // Get unique subjects for filter
  const subjects = React.useMemo(() => {
    const subjectSet = new Set(analytics.map(a => a.subject));
    return ['all', ...Array.from(subjectSet)];
  }, [analytics]);

  // Calculate overview metrics
  const overviewMetrics = React.useMemo(() => {
    const metrics = {
      averageScore: 0,
      totalStudents: results.length,
      testsCompleted: tests.length,
      avgTimeSpent: 0,
      passRate: 0,
      improvement: 0
    };

    if (filteredAnalytics.length > 0) {
      // Average score
      const totalScore = filteredAnalytics.reduce((sum, a) => sum + parseFloat(a.averageScore || 0), 0);
      metrics.averageScore = (totalScore / filteredAnalytics.length).toFixed(2);
      
      // Pass rate (assuming passing is 50%)
      const passingTests = filteredAnalytics.filter(a => parseFloat(a.averageScore) >= 50).length;
      metrics.passRate = filteredAnalytics.length > 0 ? 
        ((passingTests / filteredAnalytics.length) * 100).toFixed(2) : 0;
      
      // Improvement trend
      if (filteredAnalytics.length >= 2) {
        const scores = filteredAnalytics.map(a => parseFloat(a.averageScore));
        const firstHalfAvg = scores.slice(0, Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(scores.length / 2);
        const secondHalfAvg = scores.slice(Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(scores.length / 2);
        metrics.improvement = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg * 100).toFixed(2);
      }
    }

    // Average time spent
    if (tests.length > 0) {
      const totalTime = tests.reduce((sum, t) => sum + (t.duration || 0), 0);
      metrics.avgTimeSpent = (totalTime / tests.length).toFixed(0);
    }

    return metrics;
  }, [filteredAnalytics, tests, results]);

  // Chart data
  const performanceData = {
    labels: filteredAnalytics.map(a => `${a.subject} (${a.class})`),
    datasets: [{
      label: 'Average Score',
      data: filteredAnalytics.map(a => a.averageScore),
      backgroundColor: [
        brandColors.primary,
        brandColors.secondary,
        brandColors.accent,
        brandColors.info,
        brandColors.success,
        brandColors.warning
      ],
      borderColor: [
        brandColors.dark,
        brandColors.dark,
        brandColors.dark,
        brandColors.dark,
        brandColors.dark,
        brandColors.dark
      ],
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const testTrendsData = {
    labels: filteredAnalytics.map(a => a.testTitle),
    datasets: [
      {
        label: 'Completion Rate',
        data: filteredAnalytics.map(a => a.completionRate),
        backgroundColor: brandColors.primary + '80',
        borderColor: brandColors.primary,
        borderWidth: 2,
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Average Score',
        data: filteredAnalytics.map(a => a.averageScore),
        backgroundColor: brandColors.secondary + '80',
        borderColor: brandColors.secondary,
        borderWidth: 2,
        tension: 0.3,
        fill: true,
      }
    ],
  };

  const studentPerformanceData = {
    labels: ['Top Performers (≥75%)', 'Average (50-74%)', 'Needs Improvement (<50%)'],
    datasets: [{
      label: 'Student Distribution',
      data: [
        results.filter(r => r.score >= 75).length,
        results.filter(r => r.score >= 50 && r.score < 75).length,
        results.filter(r => r.score < 50).length,
      ],
      backgroundColor: [
        brandColors.success,
        brandColors.secondary,
        brandColors.danger
      ],
      borderColor: [
        brandColors.dark,
        brandColors.dark,
        brandColors.dark
      ],
      borderWidth: 1,
    }],
  };

  // Chart options
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
        }
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.label}: ${context.raw}%`;
          },
        },
      },
    },
    cutout: '65%',
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function (value) {
            return value + '%';
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    },
    plugins: {
      legend: { 
        position: 'bottom',
        labels: {
          padding: 20,
        }
      },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function (value) {
            return value + '%';
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    },
    plugins: {
      legend: { 
        position: 'bottom',
        labels: {
          padding: 20,
        }
      },
    },
  };

  // Metrics cards
  const metricCards = [
    {
      title: 'Average Score',
      value: `${overviewMetrics.averageScore}%`,
      icon: <FiAward size={20} />,
      color: brandColors.primary,
      bgColor: brandColors.primary + '20',
      trend: parseFloat(overviewMetrics.improvement),
    },
    {
      title: 'Students Assessed',
      value: overviewMetrics.totalStudents,
      icon: <FiUsers size={20} />,
      color: brandColors.secondary,
      bgColor: brandColors.secondary + '20',
    },
    {
      title: 'Tests Completed',
      value: overviewMetrics.testsCompleted,
      icon: <FiBook size={20} />,
      color: brandColors.accent,
      bgColor: brandColors.accent + '20',
    },
    {
      title: 'Pass Rate',
      value: `${overviewMetrics.passRate}%`,
      icon: <FiPercent size={20} />,
      color: brandColors.success,
      bgColor: brandColors.success + '20',
    },
    {
      title: 'Avg. Time Spent',
      value: `${overviewMetrics.avgTimeSpent} min`,
      icon: <FiClock size={20} />,
      color: brandColors.info,
      bgColor: brandColors.info + '20',
    },
    {
      title: 'Improvement Trend',
      value: `${Math.abs(overviewMetrics.improvement)}%`,
      icon: parseFloat(overviewMetrics.improvement) >= 0 ? 
        <FiTrendingUp size={20} /> : <FiTrendingDown size={20} />,
      color: parseFloat(overviewMetrics.improvement) >= 0 ? 
        brandColors.success : brandColors.danger,
      bgColor: parseFloat(overviewMetrics.improvement) >= 0 ? 
        brandColors.success + '20' : brandColors.danger + '20',
    },
  ];

  // Handle export
  const handleExport = () => {
    const data = {
      overview: overviewMetrics,
      analytics: filteredAnalytics,
      generatedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.container(brandColors)}>
      {/* Header */}
      <div style={styles.header(brandColors)}>
        <div style={styles.headerContent}>
          <div style={styles.headerMain}>
            <div style={styles.headerIconContainer}>
              <FiBarChart2 style={styles.headerIcon} />
            </div>
            <div>
              <h1 style={styles.headerTitle}>Performance Analytics</h1>
              <p style={styles.headerSubtitle}>
                Insights and metrics for your classes • {filteredAnalytics.length} tests analyzed
              </p>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button 
              onClick={handleExport}
              style={styles.exportButton(brandColors)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brandColors.primary}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = brandColors.secondary}
            >
              <FiDownload size={16} /> Export Data
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filtersSection(brandColors)}>
        <div style={styles.filtersGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Time Period</label>
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value)}
              style={styles.filterSelect(brandColors)}
            >
              <option value="all">All Time</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
            </select>
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Subject</label>
            <select 
              value={subjectFilter} 
              onChange={(e) => setSubjectFilter(e.target.value)}
              style={styles.filterSelect(brandColors)}
            >
              {subjects.map(subject => (
                <option key={subject} value={subject}>
                  {subject === 'all' ? 'All Subjects' : subject}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>View Mode</label>
            <div style={styles.viewModeButtons}>
              <button
                onClick={() => setViewMode('overview')}
                style={{
                  ...styles.viewModeButton,
                  backgroundColor: viewMode === 'overview' ? brandColors.primary : brandColors.light,
                  color: viewMode === 'overview' ? '#FFFFFF' : brandColors.textPrimary,
                }}
              >
                <FiGrid size={16} /> Overview
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                style={{
                  ...styles.viewModeButton,
                  backgroundColor: viewMode === 'detailed' ? brandColors.primary : brandColors.light,
                  color: viewMode === 'detailed' ? '#FFFFFF' : brandColors.textPrimary,
                }}
              >
                <FiPieChart size={16} /> Detailed
              </button>
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

      {/* Content */}
      <div style={styles.content}>
        {loading ? (
          <div style={styles.loadingState(brandColors)}>
            <div style={styles.loadingSpinner}></div>
            <h3 style={styles.loadingText}>Loading Analytics...</h3>
          </div>
        ) : filteredAnalytics.length === 0 ? (
          <div style={styles.emptyState(brandColors)}>
            <div style={styles.emptyStateIcon(brandColors)}>
              <FiBarChart2 size={48} />
            </div>
            <h3 style={styles.emptyStateTitle}>No Analytics Data Available</h3>
            <p style={styles.emptyStateText}>
              Run tests and collect student responses to generate performance insights.
            </p>
            <button 
              style={styles.primaryButton(brandColors)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brandColors.primary}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = brandColors.secondary}
            >
              <FiRefreshCw size={16} /> Refresh Data
            </button>
          </div>
        ) : (
          <>
            {/* Overview Metrics */}
            <div style={styles.metricsGrid}>
              {metricCards.map((metric, index) => (
                <div 
                  key={index} 
                  style={styles.metricCard(metric.bgColor, metric.color, brandColors)}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={styles.metricHeader}>
                    <div style={styles.metricIconContainer(metric.bgColor)}>
                      {metric.icon}
                    </div>
                    {metric.trend !== undefined && (
                      <div style={{
                        ...styles.trendBadge,
                        backgroundColor: metric.trend >= 0 ? brandColors.success : brandColors.danger,
                        color: '#FFFFFF'
                      }}>
                        {metric.trend >= 0 ? '+' : ''}{metric.trend}%
                        {metric.trend >= 0 ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
                      </div>
                    )}
                  </div>
                  <h3 style={styles.metricTitle}>{metric.title}</h3>
                  <p style={styles.metricValue}>{metric.value}</p>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div style={styles.chartsSection}>
              <div style={styles.chartCard(brandColors)}>
                <div style={styles.chartHeader}>
                  <h3 style={styles.chartTitle}>Performance by Subject</h3>
                  <div style={styles.chartLegend}>
                    <span style={styles.legendItem}>
                      <span style={{...styles.legendDot, backgroundColor: brandColors.primary}}></span>
                      Average Score
                    </span>
                  </div>
                </div>
                <div style={styles.chartContainer}>
                  <Bar data={performanceData} options={barOptions} />
                </div>
              </div>

              <div style={styles.chartsGrid}>
                <div style={styles.chartCard(brandColors)}>
                  <div style={styles.chartHeader}>
                    <h3 style={styles.chartTitle}>Test Trends</h3>
                    <div style={styles.chartLegend}>
                      <span style={styles.legendItem}>
                        <span style={{...styles.legendDot, backgroundColor: brandColors.primary}}></span>
                        Completion Rate
                      </span>
                      <span style={styles.legendItem}>
                        <span style={{...styles.legendDot, backgroundColor: brandColors.secondary}}></span>
                        Average Score
                      </span>
                    </div>
                  </div>
                  <div style={styles.chartContainer}>
                    <Line data={testTrendsData} options={lineOptions} />
                  </div>
                </div>

                <div style={styles.chartCard(brandColors)}>
                  <div style={styles.chartHeader}>
                    <h3 style={styles.chartTitle}>Student Distribution</h3>
                  </div>
                  <div style={styles.chartContainer}>
                    <Doughnut data={studentPerformanceData} options={doughnutOptions} />
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Metrics Table */}
            {viewMode === 'detailed' && (
              <div style={styles.metricsSection(brandColors)}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle(brandColors)}>Detailed Test Metrics</h2>
                  <p style={styles.sectionDescription}>
                    Performance breakdown for each test
                  </p>
                </div>
                <div style={styles.metricsTableContainer}>
                  <table style={styles.metricsTable(brandColors)}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader(brandColors)}>Test Title</th>
                        <th style={styles.tableHeader(brandColors)}>Subject</th>
                        <th style={styles.tableHeader(brandColors)}>Class</th>
                        <th style={styles.tableHeader(brandColors)}>Average Score</th>
                        <th style={styles.tableHeader(brandColors)}>Completion Rate</th>
                        <th style={styles.tableHeader(brandColors)}>Top Student</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAnalytics.map((metric, index) => (
                        <tr 
                          key={index} 
                          style={styles.tableRow(brandColors)}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brandColors.light}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={styles.tableCell}>{metric.testTitle}</td>
                          <td style={styles.tableCell}>
                            <span style={styles.subjectBadge(brandColors)}>
                              {metric.subject}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            <span style={styles.classBadge(brandColors)}>
                              {metric.class}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            <span style={{
                              ...styles.scoreBadge,
                              backgroundColor: getScoreColor(metric.averageScore, brandColors),
                              color: '#FFFFFF'
                            }}>
                              {metric.averageScore}%
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            <div style={styles.progressBar}>
                              <div 
                                style={{
                                  ...styles.progressFill,
                                  width: `${metric.completionRate}%`,
                                  backgroundColor: getCompletionColor(metric.completionRate, brandColors)
                                }}
                              />
                              <span style={styles.progressText}>{metric.completionRate}%</span>
                            </div>
                          </td>
                          <td style={styles.tableCell}>
                            <div style={styles.studentInfo}>
                              <FiAward size={14} style={{color: brandColors.secondary}} />
                              <span>{metric.topStudent}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Helper functions
const getScoreColor = (score, colors) => {
  if (score >= 75) return colors.success;
  if (score >= 50) return colors.secondary;
  return colors.danger;
};

const getCompletionColor = (rate, colors) => {
  if (rate >= 90) return colors.success;
  if (rate >= 70) return colors.secondary;
  return colors.danger;
};

// Responsive Styles
const styles = {
  container: (colors) => ({
    fontFamily: '"Segoe UI", "Roboto", "Inter", sans-serif',
    minHeight: '100vh',
    backgroundColor: colors.background,
    '@media (max-width: 768px)': {
      padding: '10px',
    },
  }),

  // Header
  header: (colors) => ({
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.dark} 100%)`,
    color: '#FFFFFF',
    borderRadius: '12px',
    margin: '20px',
    padding: '30px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    '@media (max-width: 768px)': {
      margin: '10px',
      padding: '20px',
    },
  }),
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      gap: '15px',
    },
  },
  headerMain: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '20px',
    flex: 1,
  },
  headerIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
    '@media (max-width: 768px)': {
      width: '50px',
      height: '50px',
    },
  },
  headerIcon: {
    fontSize: '28px',
    color: colors => colors.secondary,
    '@media (max-width: 768px)': {
      fontSize: '24px',
    },
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 8px 0',
    '@media (max-width: 768px)': {
      fontSize: '24px',
    },
    '@media (max-width: 480px)': {
      fontSize: '20px',
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
  headerActions: {
    display: 'flex',
    gap: '10px',
    '@media (max-width: 768px)': {
      width: '100%',
    },
  },
  exportButton: (colors) => ({
    backgroundColor: colors.secondary,
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    '@media (max-width: 768px)': {
      width: '100%',
      justifyContent: 'center',
    },
  }),

  // Filters
  filtersSection: (colors) => ({
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    margin: '20px',
    padding: '25px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    '@media (max-width: 768px)': {
      margin: '10px',
      padding: '20px',
    },
  }),
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: colors => colors.textPrimary,
  },
  filterSelect: (colors) => ({
    padding: '10px 12px',
    border: `1px solid ${colors.light}`,
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: colors.cardBg,
    color: colors.textPrimary,
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    '&:focus': {
      borderColor: colors.primary,
      boxShadow: `0 0 0 3px ${colors.primary}20`,
    },
  }),
  viewModeButtons: {
    display: 'flex',
    gap: '10px',
    '@media (max-width: 480px)': {
      flexDirection: 'column',
    },
  },
  viewModeButton: {
    flex: 1,
    padding: '10px 16px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    '@media (max-width: 480px)': {
      width: '100%',
    },
  },

  // Alerts
  alertsContainer: {
    margin: '0 20px 20px',
    '@media (max-width: 768px)': {
      margin: '0 10px 15px',
    },
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
  }),
  alertIcon: {
    fontSize: '20px',
    flexShrink: '0',
  },

  // Content
  content: {
    margin: '0 20px 20px',
    '@media (max-width: 768px)': {
      margin: '0 10px 15px',
    },
  },

  // Loading State
  loadingState: (colors) => ({
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    padding: '60px 40px',
    textAlign: 'center',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  }),
  loadingSpinner: {
    display: 'inline-block',
    width: '50px',
    height: '50px',
    border: `4px solid ${colors => colors.light}`,
    borderTop: `4px solid ${colors => colors.primary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  loadingText: {
    color: colors => colors.textPrimary,
    fontSize: '18px',
    fontWeight: '500',
  },

  // Empty State
  emptyState: (colors) => ({
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    padding: '60px 40px',
    textAlign: 'center',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  }),
  emptyStateIcon: (colors) => ({
    color: colors.secondary,
    fontSize: '48px',
    marginBottom: '20px',
  }),
  emptyStateTitle: {
    color: colors => colors.textPrimary,
    fontSize: '24px',
    fontWeight: '600',
    margin: '0 0 10px 0',
  },
  emptyStateText: {
    color: colors => colors.textSecondary,
    fontSize: '16px',
    margin: '0 0 30px 0',
    maxWidth: '400px',
    margin: '0 auto 30px',
  },
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

  // Metrics Grid
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
    '@media (max-width: 480px)': {
      gridTemplateColumns: '1fr',
    },
  },
  metricCard: (bgColor, iconColor, colors) => ({
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    border: `1px solid ${colors.light}`,
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      height: '4px',
      backgroundColor: iconColor,
    },
  }),
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  metricIconContainer: (bgColor) => ({
    backgroundColor: bgColor,
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors => colors.textPrimary,
  }),
  trendBadge: {
    padding: '4px 8px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  metricTitle: {
    fontSize: '14px',
    fontWeight: '500',
    color: colors => colors.textSecondary,
    margin: '0 0 10px 0',
  },
  metricValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: colors => colors.textPrimary,
    margin: '0',
    lineHeight: '1',
  },

  // Charts Section
  chartsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  chartCard: (colors) => ({
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    border: `1px solid ${colors.light}`,
  }),
  chartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    '@media (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '15px',
    },
  },
  chartTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: colors => colors.textPrimary,
    margin: '0',
  },
  chartLegend: {
    display: 'flex',
    gap: '20px',
    '@media (max-width: 480px)': {
      flexDirection: 'column',
      gap: '10px',
    },
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: colors => colors.textSecondary,
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  chartContainer: {
    height: '300px',
    position: 'relative',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '30px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },

  // Metrics Table
  metricsSection: (colors) => ({
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    marginTop: '30px',
  }),
  sectionHeader: {
    marginBottom: '25px',
  },
  sectionTitle: (colors) => ({
    fontSize: '20px',
    fontWeight: '600',
    color: colors.textPrimary,
    margin: '0 0 8px 0',
  }),
  sectionDescription: {
    fontSize: '14px',
    color: colors => colors.textSecondary,
    margin: '0',
  },
  metricsTableContainer: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: `1px solid ${colors => colors.light}`,
  },
  metricsTable: (colors) => ({
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '800px',
  }),
  tableHeader: (colors) => ({
    backgroundColor: colors.light,
    padding: '16px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '14px',
    color: colors.textPrimary,
    borderBottom: `1px solid ${colors.light}`,
  }),
  tableRow: (colors) => ({
    borderBottom: `1px solid ${colors.light}`,
    transition: 'all 0.3s ease',
  }),
  tableCell: {
    padding: '16px',
    fontSize: '14px',
    color: colors => colors.textPrimary,
  },
  subjectBadge: (colors) => ({
    backgroundColor: colors.primary + '20',
    color: colors.primary,
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
  }),
  classBadge: (colors) => ({
    backgroundColor: colors.secondary + '20',
    color: colors.secondary,
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
  }),
  scoreBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block',
  },
  progressBar: {
    width: '100%',
    height: '24px',
    backgroundColor: colors => colors.light,
    borderRadius: '12px',
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '12px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '12px',
    fontWeight: '500',
    color: '#FFFFFF',
    textShadow: '1px 1px 1px rgba(0,0,0,0.3)',
  },
  studentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
};

// Add CSS for animations
const styleTag = document.createElement('style');
styleTag.innerHTML = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @media (max-width: 768px) {
    body {
      font-size: 14px;
    }
  }
`;
document.head.appendChild(styleTag);

export default Analytics;