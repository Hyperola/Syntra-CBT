// components/Analytics.js - UPDATED TO USE PROPER DATA STRUCTURE
import React, { useState, useEffect, useMemo } from 'react';
import useTeacherData from '../../hooks/useTeacherData';
import { 
  FiBarChart2, FiAlertTriangle, FiCheckCircle, FiAward, FiUsers, 
  FiBook, FiClock, FiTrendingUp, FiTrendingDown, FiActivity, 
  FiTarget, FiPercent, FiCalendar, FiFilter, FiDownload, 
  FiRefreshCw, FiGrid, FiPieChart, FiBarChart, FiInfo
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
  const { 
    analytics, 
    analyticsSummary,
    tests, 
    results, 
    error, 
    success, 
    loading, 
    lastUpdated,
    refreshAnalytics,
    refetchAll 
  } = useTeacherData();
  
  const [timeFilter, setTimeFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [viewMode, setViewMode] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Brand colors
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
    cardBg: '#FFFFFF',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280'
  };

  // Debug real data
  useEffect(() => {
    console.log('📊 ANALYTICS COMPONENT DEBUG:', {
      analyticsCount: analytics?.length,
      analyticsSummary: analyticsSummary,
      testsCount: tests?.length,
      resultsCount: results?.length,
      loading,
      error,
      lastUpdated,
      analyticsSample: analytics?.[0]
    });
    
    if (analytics?.length > 0) {
      console.log('📊 ANALYTICS DATA SAMPLE:', {
        firstTest: analytics[0],
        scores: analytics.map(a => a.averageScore),
        classes: analytics.map(a => a.class),
        hasClassNames: analytics.every(a => a.class && !a.class.includes('ObjectId'))
      });
    }
  }, [analytics, analyticsSummary, tests, results, loading, error, lastUpdated]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAnalytics();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter analytics based on selected filters
  const filteredAnalytics = useMemo(() => {
    if (!analytics || !Array.isArray(analytics)) return [];
    
    let filtered = [...analytics];
    
    // Filter by time
    if (timeFilter !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch(timeFilter) {
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(a => {
        if (!a.createdAt) return true;
        const testDate = new Date(a.createdAt);
        return testDate >= cutoffDate;
      });
    }
    
    // Filter by subject
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(a => a.subject === subjectFilter);
    }
    
    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [analytics, timeFilter, subjectFilter]);

  // Get unique subjects for filter dropdown
  const subjects = useMemo(() => {
    if (!analytics || !Array.isArray(analytics)) return ['all'];
    
    const subjectSet = new Set();
    analytics.forEach(a => {
      if (a.subject && a.subject.trim()) {
        subjectSet.add(a.subject);
      }
    });
    
    return ['all', ...Array.from(subjectSet).sort()];
  }, [analytics]);

  // Calculate overview metrics - USING ANALYTICS SUMMARY IF AVAILABLE
  const overviewMetrics = useMemo(() => {
    // Use analyticsSummary if available
    if (analyticsSummary) {
      return {
        averageScore: analyticsSummary.overallAverageScore || 0,
        totalStudents: analyticsSummary.totalStudents || 0,
        testsCompleted: analyticsSummary.totalTests || 0,
        avgTimeSpent: analyticsSummary.avgTimeSpent || 0,
        passRate: analyticsSummary.passRate || 0,
        improvement: analyticsSummary.improvement || 0
      };
    }
    
    // Fallback to calculating from filtered analytics
    const metrics = {
      averageScore: 0,
      totalStudents: 0,
      testsCompleted: 0,
      avgTimeSpent: 0,
      passRate: 0,
      improvement: 0
    };

    if (filteredAnalytics.length > 0) {
      // Average score
      const validScores = filteredAnalytics
        .map(a => a.averageScore)
        .filter(score => !isNaN(score) && score > 0);
      
      if (validScores.length > 0) {
        const totalScore = validScores.reduce((sum, score) => sum + score, 0);
        metrics.averageScore = parseFloat((totalScore / validScores.length).toFixed(2));
      }
      
      // Total students (sum of all test students)
      const totalStudents = filteredAnalytics
        .map(a => a.totalStudents || 0)
        .reduce((sum, count) => sum + count, 0);
      metrics.totalStudents = totalStudents;
      
      // Tests with students
      metrics.testsCompleted = filteredAnalytics.filter(a => a.totalStudents > 0).length;
      
      // Pass rate (tests with average score >= 50%)
      const passingTests = filteredAnalytics.filter(a => a.averageScore >= 50).length;
      metrics.passRate = filteredAnalytics.length > 0 ? 
        parseFloat(((passingTests / filteredAnalytics.length) * 100).toFixed(2)) : 0;
      
      // Improvement trend (compare first 3 vs last 3 tests by date)
      if (filteredAnalytics.length >= 6) {
        const sortedByDate = [...filteredAnalytics].sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
        
        const firstThree = sortedByDate.slice(0, 3);
        const lastThree = sortedByDate.slice(-3);
        
        const firstAvg = firstThree.reduce((sum, t) => sum + (t.averageScore || 0), 0) / firstThree.length;
        const lastAvg = lastThree.reduce((sum, t) => sum + (t.averageScore || 0), 0) / lastThree.length;
        
        if (firstAvg > 0) {
          metrics.improvement = parseFloat(((lastAvg - firstAvg) / firstAvg * 100).toFixed(2));
        }
      }
    }

    // Calculate average time spent from results
    if (results && results.length > 0) {
      const timeResults = results.filter(r => r.timeSpent && r.timeSpent > 0);
      if (timeResults.length > 0) {
        const totalTime = timeResults.reduce((sum, r) => sum + (r.timeSpent || 0), 0);
        metrics.avgTimeSpent = parseFloat((totalTime / timeResults.length).toFixed(0));
      }
    }

    return metrics;
  }, [analyticsSummary, filteredAnalytics, results]);

  // Prepare chart data
  const performanceData = useMemo(() => {
    const topTests = filteredAnalytics
      .filter(a => a.averageScore > 0)
      .slice(0, 8);
    
    return {
      labels: topTests.map(a => {
        const label = a.subject || 'Unknown';
        const maxLength = 15;
        return label.length > maxLength ? label.substring(0, maxLength) + '...' : label;
      }),
      datasets: [{
        label: 'Average Score (%)',
        data: topTests.map(a => a.averageScore || 0),
        backgroundColor: topTests.map((_, index) => {
          const colors = [
            brandColors.primary,
            brandColors.secondary,
            brandColors.accent,
            brandColors.success,
            brandColors.info,
            brandColors.warning,
            brandColors.primary + 'CC',
            brandColors.secondary + 'CC'
          ];
          return colors[index % colors.length];
        }),
        borderColor: brandColors.dark,
        borderWidth: 1,
        borderRadius: 4,
      }],
    };
  }, [filteredAnalytics, brandColors]);

  const testTrendsData = useMemo(() => {
    const recentTests = filteredAnalytics.slice(0, 6);
    
    return {
      labels: recentTests.map(a => {
        const title = a.testTitle || 'Test';
        const maxLength = 20;
        return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
      }),
      datasets: [
        {
          label: 'Completion Rate (%)',
          data: recentTests.map(a => a.completionRate || 0),
          backgroundColor: brandColors.primary + '40',
          borderColor: brandColors.primary,
          borderWidth: 2,
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Average Score (%)',
          data: recentTests.map(a => a.averageScore || 0),
          backgroundColor: brandColors.secondary + '40',
          borderColor: brandColors.secondary,
          borderWidth: 2,
          tension: 0.3,
          fill: true,
        }
      ],
    };
  }, [filteredAnalytics, brandColors]);

  const studentPerformanceData = useMemo(() => {
    if (!results || results.length === 0) {
      return {
        labels: ['No Data Available'],
        datasets: [{
          label: 'Student Distribution',
          data: [100],
          backgroundColor: [brandColors.light],
          borderColor: [brandColors.dark],
          borderWidth: 1,
        }],
      };
    }
    
    // Calculate distribution from real results
    const excellent = results.filter(r => (r.score || 0) >= 90).length;
    const good = results.filter(r => (r.score || 0) >= 75 && (r.score || 0) < 90).length;
    const average = results.filter(r => (r.score || 0) >= 50 && (r.score || 0) < 75).length;
    const poor = results.filter(r => (r.score || 0) < 50).length;
    
    return {
      labels: ['Top Performers (≥90%)', 'Good (75-89%)', 'Average (50-74%)', 'Needs Improvement (<50%)'],
      datasets: [{
        label: 'Student Distribution',
        data: [excellent, good, average, poor],
        backgroundColor: [
          brandColors.success,
          brandColors.secondary,
          brandColors.warning,
          brandColors.danger
        ],
        borderColor: [
          brandColors.dark,
          brandColors.dark,
          brandColors.dark,
          brandColors.dark
        ],
        borderWidth: 1,
      }],
    };
  }, [results, brandColors]);

  // Chart options (same as before)
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top',
        labels: {
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          },
          font: {
            size: 11
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        }
      },
      x: {
        ticks: {
          font: {
            size: 11
          },
          maxRotation: 45,
          minRotation: 45
        },
        grid: {
          display: false,
        }
      }
    },
  };

  const lineOptions = {
    ...barOptions,
    scales: {
      ...barOptions.scales,
      x: {
        ...barOptions.scales.x,
        ticks: {
          ...barOptions.scales.x.ticks,
          maxRotation: 0,
          minRotation: 0
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${context.raw} students (${percentage}%)`;
          }
        }
      }
    },
    cutout: '65%',
  };

  // Metrics cards - USING REAL DATA
  const metricCards = [
    {
      id: 'averageScore',
      title: 'Average Score',
      value: `${overviewMetrics.averageScore}%`,
      icon: <FiAward size={20} />,
      color: brandColors.primary,
      bgColor: brandColors.primary + '20',
      trend: parseFloat(overviewMetrics.improvement) || 0,
      description: 'Average score across all tests'
    },
    {
      id: 'studentsAssessed',
      title: 'Students Assessed',
      value: overviewMetrics.totalStudents.toLocaleString(),
      icon: <FiUsers size={20} />,
      color: brandColors.secondary,
      bgColor: brandColors.secondary + '20',
      description: 'Total students who participated'
    },
    {
      id: 'testsCompleted',
      title: 'Tests Conducted',
      value: overviewMetrics.testsCompleted,
      icon: <FiBook size={20} />,
      color: brandColors.accent,
      bgColor: brandColors.accent + '20',
      description: 'Tests with student participation'
    },
    {
      id: 'passRate',
      title: 'Pass Rate',
      value: `${overviewMetrics.passRate}%`,
      icon: <FiPercent size={20} />,
      color: brandColors.success,
      bgColor: brandColors.success + '20',
      description: 'Tests with average score ≥ 50%'
    },
    {
      id: 'avgTimeSpent',
      title: 'Avg. Time Spent',
      value: `${overviewMetrics.avgTimeSpent} min`,
      icon: <FiClock size={20} />,
      color: brandColors.info,
      bgColor: brandColors.info + '20',
      description: 'Average time per test'
    },
    {
      id: 'improvementTrend',
      title: 'Improvement Trend',
      value: `${Math.abs(overviewMetrics.improvement)}%`,
      icon: parseFloat(overviewMetrics.improvement) >= 0 ? 
        <FiTrendingUp size={20} /> : <FiTrendingDown size={20} />,
      color: parseFloat(overviewMetrics.improvement) >= 0 ? 
        brandColors.success : brandColors.danger,
      bgColor: parseFloat(overviewMetrics.improvement) >= 0 ? 
        brandColors.success + '20' : brandColors.danger + '20',
      description: parseFloat(overviewMetrics.improvement) >= 0 ? 
        'Performance improvement' : 'Performance decline'
    },
  ];

  // Handle export REAL DATA
  const handleExport = () => {
    const data = {
      analytics: filteredAnalytics,
      overview: overviewMetrics,
      summary: analyticsSummary,
      generatedAt: new Date().toISOString(),
      lastUpdated: lastUpdated?.toISOString(),
      filters: { timeFilter, subjectFilter, viewMode }
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

  // Helper functions
  const getScoreColor = (score) => {
    const numScore = parseFloat(score || 0);
    if (numScore >= 75) return brandColors.success;
    if (numScore >= 50) return brandColors.secondary;
    return brandColors.danger;
  };

  const getCompletionColor = (rate) => {
    const numRate = parseFloat(rate || 0);
    if (numRate >= 90) return brandColors.success;
    if (numRate >= 70) return brandColors.secondary;
    return brandColors.danger;
  };

  // Render loading state
  if (loading && analytics.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        backgroundColor: brandColors.background
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid ' + brandColors.light,
          borderTop: '4px solid ' + brandColors.primary,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px',
        }}></div>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '500',
          marginBottom: '10px',
          color: brandColors.textPrimary,
        }}>Loading Real Analytics Data...</h3>
        <p style={{
          fontSize: '14px',
          color: brandColors.textSecondary,
        }}>Fetching from database</p>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: '"Segoe UI", "Roboto", "Inter", sans-serif',
      minHeight: '100vh',
      backgroundColor: brandColors.background,
      padding: '20px',
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.dark} 100%)`,
        color: '#FFFFFF',
        borderRadius: '12px',
        marginBottom: '20px',
        padding: '30px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '20px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '20px',
            flex: 1,
          }}>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
            }}>
              <FiBarChart2 style={{ fontSize: '28px', color: brandColors.secondary }} />
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>
                Performance Analytics
              </h1>
              <p style={{ fontSize: '16px', margin: '0', color: 'rgba(255, 255, 255, 0.9)' }}>
                Real data insights • {filteredAnalytics.length} tests • {overviewMetrics.totalStudents} students
                {lastUpdated && ` • Updated ${new Date(lastUpdated).toLocaleTimeString()}`}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{
                backgroundColor: brandColors.light,
                color: brandColors.textPrimary,
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                opacity: isRefreshing ? 0.7 : 1,
              }}
            >
              <FiRefreshCw size={16} style={{ 
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
              }} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button 
              onClick={handleExport}
              style={{
                backgroundColor: brandColors.secondary,
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
              }}
            >
              <FiDownload size={16} /> Export Real Data
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div style={{ marginBottom: '20px' }}>
        {error && (
          <div style={{
            backgroundColor: '#FEF2F2',
            color: brandColors.danger,
            borderLeft: '4px solid ' + brandColors.danger,
            padding: '16px 20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <FiAlertTriangle size={20} />
            <span>{error}</span>
            <button 
              onClick={handleRefresh}
              style={{
                marginLeft: 'auto',
                backgroundColor: 'transparent',
                color: 'inherit',
                border: '1px solid currentColor',
                padding: '4px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
              }}
            >
              Retry
            </button>
          </div>
        )}
        {success && (
          <div style={{
            backgroundColor: '#F0FFF4',
            color: brandColors.success,
            borderLeft: '4px solid ' + brandColors.success,
            padding: '16px 20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <FiCheckCircle size={20} />
            <span>{success}</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: brandColors.cardBg,
        borderRadius: '12px',
        marginBottom: '20px',
        padding: '25px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500', color: brandColors.textPrimary }}>
              Time Period
            </label>
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{
                padding: '10px 12px',
                border: `1px solid ${brandColors.light}`,
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: brandColors.cardBg,
                color: brandColors.textPrimary,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Time</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500', color: brandColors.textPrimary }}>
              Subject
            </label>
            <select 
              value={subjectFilter} 
              onChange={(e) => setSubjectFilter(e.target.value)}
              style={{
                padding: '10px 12px',
                border: `1px solid ${brandColors.light}`,
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: brandColors.cardBg,
                color: brandColors.textPrimary,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {subjects.map(subject => (
                <option key={subject} value={subject}>
                  {subject === 'all' ? 'All Subjects' : subject}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: '500', color: brandColors.textPrimary }}>
              Data View
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setViewMode('overview')}
                style={{
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
                  backgroundColor: viewMode === 'overview' ? brandColors.primary : brandColors.light,
                  color: viewMode === 'overview' ? '#FFFFFF' : brandColors.textPrimary,
                }}
              >
                <FiGrid size={16} /> Overview
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                style={{
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

      {/* Content */}
      <div>
        {filteredAnalytics.length === 0 ? (
          <div style={{
            backgroundColor: brandColors.cardBg,
            borderRadius: '12px',
            padding: '60px 40px',
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}>
            <div style={{ color: brandColors.secondary, fontSize: '48px', marginBottom: '20px' }}>
              <FiBarChart2 size={48} />
            </div>
            <h3 style={{ color: brandColors.textPrimary, fontSize: '24px', fontWeight: '600', margin: '0 0 10px 0' }}>
              {analytics.length === 0 ? 'No Analytics Data Available' : 'No Data Matches Filters'}
            </h3>
            <p style={{ color: brandColors.textSecondary, fontSize: '16px', margin: '0 0 30px 0', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
              {analytics.length === 0 
                ? 'You haven\'t conducted any tests yet. Create and administer tests to generate real analytics.'
                : 'Try changing your filter settings or create new tests.'}
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                onClick={handleRefresh}
                style={{
                  backgroundColor: brandColors.secondary,
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
                }}
              >
                <FiRefreshCw size={16} /> Refresh Data
              </button>
              <button 
                onClick={() => window.location.href = '/teacher/tests'}
                style={{
                  backgroundColor: brandColors.light,
                  color: brandColors.textPrimary,
                  border: `1px solid ${brandColors.light}`,
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FiBook size={16} /> Go to Tests
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Real Data Metrics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '30px',
            }}>
              {metricCards.map((metric) => (
                <div 
                  key={metric.id} 
                  style={{
                    backgroundColor: brandColors.cardBg,
                    borderRadius: '12px',
                    padding: '25px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    border: `1px solid ${brandColors.light}`,
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: 'help',
                  }}
                  title={metric.description}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div style={{ backgroundColor: metric.bgColor, width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {metric.icon}
                    </div>
                    {metric.trend !== 0 && (
                      <div style={{
                        padding: '4px 8px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '500',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: metric.trend >= 0 ? brandColors.success : brandColors.danger,
                        color: '#FFFFFF'
                      }}>
                        {metric.trend >= 0 ? '+' : ''}{metric.trend}%
                        {metric.trend >= 0 ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
                      </div>
                    )}
                  </div>
                  <h3 style={{ fontSize: '14px', fontWeight: '500', color: brandColors.textSecondary, margin: '0 0 10px 0' }}>
                    {metric.title}
                  </h3>
                  <p style={{ fontSize: '32px', fontWeight: '700', color: brandColors.textPrimary, margin: '0', lineHeight: '1' }}>
                    {metric.value}
                  </p>
                  <p style={{ fontSize: '12px', color: brandColors.textSecondary, marginTop: '8px', marginBottom: '0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FiInfo size={12} /> {metric.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {/* Performance by Subject */}
              <div style={{
                backgroundColor: brandColors.cardBg,
                borderRadius: '12px',
                padding: '25px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                border: `1px solid ${brandColors.light}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', color: brandColors.textPrimary, margin: '0' }}>
                    Performance by Subject
                  </h3>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: brandColors.textSecondary }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: brandColors.primary }}></div>
                      Average Score (%)
                    </div>
                  </div>
                </div>
                <div style={{ height: '300px', position: 'relative' }}>
                  {filteredAnalytics.length > 0 ? (
                    <Bar data={performanceData} options={barOptions} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: brandColors.textSecondary, fontSize: '16px', fontStyle: 'italic' }}>
                      No test data available
                    </div>
                  )}
                </div>
              </div>

              {/* Charts Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '30px',
              }}>
                {/* Test Trends */}
                <div style={{
                  backgroundColor: brandColors.cardBg,
                  borderRadius: '12px',
                  padding: '25px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  border: `1px solid ${brandColors.light}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: brandColors.textPrimary, margin: '0' }}>
                      Test Trends
                    </h3>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: brandColors.textSecondary }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: brandColors.primary }}></div>
                        Completion Rate
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: brandColors.textSecondary }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: brandColors.secondary }}></div>
                        Average Score
                      </div>
                    </div>
                  </div>
                  <div style={{ height: '300px', position: 'relative' }}>
                    {filteredAnalytics.length > 0 ? (
                      <Line data={testTrendsData} options={lineOptions} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: brandColors.textSecondary, fontSize: '16px', fontStyle: 'italic' }}>
                        No trend data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Student Distribution */}
                <div style={{
                  backgroundColor: brandColors.cardBg,
                  borderRadius: '12px',
                  padding: '25px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  border: `1px solid ${brandColors.light}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: brandColors.textPrimary, margin: '0' }}>
                        Student Performance Distribution
                      </h3>
                      <p style={{ fontSize: '14px', color: brandColors.textSecondary, margin: '5px 0 0 0' }}>
                        Based on {results?.length || 0} test results
                      </p>
                    </div>
                  </div>
                  <div style={{ height: '300px', position: 'relative' }}>
                    {results && results.length > 0 ? (
                      <Doughnut data={studentPerformanceData} options={doughnutOptions} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: brandColors.textSecondary, fontSize: '16px', fontStyle: 'italic' }}>
                        No student results available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Test Metrics Table */}
            {viewMode === 'detailed' && (
              <div style={{
                backgroundColor: brandColors.cardBg,
                borderRadius: '12px',
                padding: '25px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                marginTop: '30px',
              }}>
                <div style={{ marginBottom: '25px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '600', color: brandColors.textPrimary, margin: '0 0 8px 0' }}>
                    Detailed Test Metrics
                  </h2>
                  <p style={{ fontSize: '14px', color: brandColors.textSecondary, margin: '0' }}>
                    Real data from {filteredAnalytics.length} tests
                  </p>
                </div>
                <div style={{ overflowX: 'auto', borderRadius: '8px', border: `1px solid ${brandColors.light}` }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead>
                      <tr>
                        <th style={{ backgroundColor: brandColors.light, padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: brandColors.textPrimary, borderBottom: `1px solid ${brandColors.light}` }}>
                          Test Title
                        </th>
                        <th style={{ backgroundColor: brandColors.light, padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: brandColors.textPrimary, borderBottom: `1px solid ${brandColors.light}` }}>
                          Subject
                        </th>
                        <th style={{ backgroundColor: brandColors.light, padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: brandColors.textPrimary, borderBottom: `1px solid ${brandColors.light}` }}>
                          Class
                        </th>
                        <th style={{ backgroundColor: brandColors.light, padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: brandColors.textPrimary, borderBottom: `1px solid ${brandColors.light}` }}>
                          Avg. Score
                        </th>
                        <th style={{ backgroundColor: brandColors.light, padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: brandColors.textPrimary, borderBottom: `1px solid ${brandColors.light}` }}>
                          Completion
                        </th>
                        <th style={{ backgroundColor: brandColors.light, padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: brandColors.textPrimary, borderBottom: `1px solid ${brandColors.light}` }}>
                          Students
                        </th>
                        <th style={{ backgroundColor: brandColors.light, padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: brandColors.textPrimary, borderBottom: `1px solid ${brandColors.light}` }}>
                          Top Performer
                        </th>
                        <th style={{ backgroundColor: brandColors.light, padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: brandColors.textPrimary, borderBottom: `1px solid ${brandColors.light}` }}>
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAnalytics.map((test, index) => (
                        <tr key={test.testId || index} style={{ 
                          borderBottom: `1px solid ${brandColors.light}`,
                          ':hover': { backgroundColor: brandColors.light }
                        }}>
                          <td style={{ padding: '16px', fontSize: '14px', color: brandColors.textPrimary, borderBottom: `1px solid ${brandColors.light}` }}>
                            <strong>{test.testTitle}</strong>
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: brandColors.textPrimary, borderBottom: `1px solid ${brandColors.light}` }}>
                            <span style={{
                              backgroundColor: brandColors.primary + '20',
                              color: brandColors.primary,
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}>
                              {test.subject}
                            </span>
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: brandColors.textPrimary, borderBottom: `1px solid ${brandColors.light}` }}>
                            <span style={{
                              backgroundColor: brandColors.secondary + '20',
                              color: brandColors.secondary,
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}>
                              {test.class || test.className || 'Unknown'}
                            </span>
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: brandColors.textPrimary, borderBottom: `1px solid ${brandColors.light}` }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '500',
                              backgroundColor: getScoreColor(test.averageScore),
                              color: '#FFFFFF',
                              display: 'inline-block',
                            }}>
                              {test.averageScore.toFixed(1)}%
                            </span>
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: brandColors.textPrimary, borderBottom: `1px solid ${brandColors.light}` }}>
                            <div style={{ width: '100%', height: '24px', backgroundColor: brandColors.light, borderRadius: '12px', position: 'relative', overflow: 'hidden' }}>
                              <div 
                                style={{
                                  height: '100%',
                                  borderRadius: '12px',
                                  width: `${test.completionRate}%`,
                                  backgroundColor: getCompletionColor(test.completionRate),
                                }}
                              />
                              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '12px', fontWeight: '500', color: '#FFFFFF', textShadow: '1px 1px 1px rgba(0,0,0,0.3)' }}>
                                {test.completionRate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: brandColors.textPrimary, borderBottom: `1px solid ${brandColors.light}` }}>
                            <span style={{ fontWeight: '600', color: brandColors.primary }}>
                              {test.totalStudents}
                            </span>
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: brandColors.textPrimary, borderBottom: `1px solid ${brandColors.light}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <FiAward size={14} style={{ color: brandColors.secondary }} />
                              <span>{test.topStudent}</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: brandColors.textPrimary, borderBottom: `1px solid ${brandColors.light}` }}>
                            {new Date(test.createdAt).toLocaleDateString()}
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

// Add CSS animation
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