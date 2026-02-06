import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FiCalendar, 
  FiClock, 
  FiBookOpen, 
  FiChevronLeft,
  FiDownload,
  FiPrinter,
  FiShare2,
  FiBell,
  FiAlertCircle,
  FiCheckCircle,
  FiTrendingUp
} from 'react-icons/fi';

const ChildUpcomingTests = () => {
  const { childId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState(null);
  const [upcomingTests, setUpcomingTests] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (childId) {
      fetchChildTests();
      fetchChildDetails();
    }
  }, [childId]);

  const fetchChildDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/parents/children/${childId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setChild(response.data.child);
      }
    } catch (error) {
      console.error('Error fetching child details:', error);
    }
  };

  const fetchChildTests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/parents/children/${childId}/upcoming-tests?limit=50`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setUpcomingTests(response.data.tests || []);
        setStats(response.data.statistics);
      }
    } catch (error) {
      console.error('Error fetching child tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#10B981';
      case 'upcoming': return '#F59E0B';
      case 'completed': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const brandColors = {
    primary: '#4B5320',
    secondary: '#D4A017',
    accent: '#8B4513',
    light: '#F5F5DC',
    dark: '#2C3E50',
    background: '#F8F9FA',
    cardBg: '#FFFFFF'
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading tests...</p>
      </div>
    );
  }

  return (
    <div style={styles.container(brandColors)}>
      {/* Header */}
      <div style={styles.header(brandColors)}>
        <button 
          onClick={() => navigate('/parent/upcoming-tests')}
          style={styles.backButton(brandColors)}
        >
          <FiChevronLeft size={20} /> Back to All Tests
        </button>
        
        <div style={styles.childHeader}>
          <div style={styles.childInfo}>
            <h1 style={styles.headerTitle}>
              Upcoming Tests for {child?.name || 'Child'}
            </h1>
            <p style={styles.headerSubtitle}>
              Student ID: {child?.studentId} • Class: {child?.className}
            </p>
          </div>
          
          <div style={styles.childStats}>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{stats?.total || 0}</span>
              <span style={styles.statLabel}>Total Tests</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{stats?.upcoming || 0}</span>
              <span style={styles.statLabel}>Upcoming</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{stats?.active || 0}</span>
              <span style={styles.statLabel}>Active Now</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div style={styles.actionBar(brandColors)}>
        <div style={styles.actionButtons}>
          <button style={styles.actionButton(brandColors)}>
            <FiBell size={16} /> Set All Reminders
          </button>
          <button style={styles.actionButton(brandColors)}>
            <FiPrinter size={16} /> Print Schedule
          </button>
          <button style={styles.actionButton(brandColors)}>
            <FiShare2 size={16} /> Share with Child
          </button>
        </div>
        
        <div style={styles.exportButtons}>
          <button style={styles.exportButton(brandColors)}>
            <FiDownload size={16} /> Export as PDF
          </button>
        </div>
      </div>

      {/* Subject Breakdown */}
      {stats?.subjects && stats.subjects.length > 0 && (
        <div style={styles.subjectsSection(brandColors)}>
          <h3 style={styles.sectionTitle}>Test Subjects</h3>
          <div style={styles.subjectsGrid}>
            {stats.subjects.map((subject, index) => (
              <div key={index} style={styles.subjectCard}>
                <h4 style={styles.subjectName}>{subject.subject}</h4>
                <p style={styles.subjectCount}>{subject.count} test(s)</p>
                <div style={styles.subjectProgress}>
                  <div 
                    style={styles.progressBar(brandColors.secondary, subject.percentage)}
                  ></div>
                </div>
                <span style={styles.subjectPercentage}>{subject.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tests List */}
      <div style={styles.testsSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>All Scheduled Tests</h2>
          <div style={styles.testFilters}>
            <select style={styles.filterSelect(brandColors)}>
              <option>Sort by Date</option>
              <option>Sort by Subject</option>
              <option>Sort by Status</option>
            </select>
          </div>
        </div>

        {upcomingTests.length === 0 ? (
          <div style={styles.emptyState(brandColors)}>
            <FiAlertCircle size={48} />
            <h3>No tests scheduled</h3>
            <p>There are no upcoming tests for {child?.name}</p>
          </div>
        ) : (
          <div style={styles.testsTable}>
            <div style={styles.tableHeader}>
              <div style={styles.tableCell}>Test</div>
              <div style={styles.tableCell}>Subject</div>
              <div style={styles.tableCell}>Date & Time</div>
              <div style={styles.tableCell}>Duration</div>
              <div style={styles.tableCell}>Marks</div>
              <div style={styles.tableCell}>Status</div>
              <div style={styles.tableCell}>Actions</div>
            </div>
            
            {upcomingTests.map((test, index) => (
              <div key={index} style={styles.tableRow(brandColors)}>
                <div style={styles.tableCell}>
                  <strong>{test.title}</strong>
                  <p style={styles.testClass}>{test.class?.name || test.class}</p>
                </div>
                <div style={styles.tableCell}>
                  <span style={styles.subjectBadge(test.subject)}>
                    {test.subject}
                  </span>
                </div>
                <div style={styles.tableCell}>
                  <div>{formatDate(test.batchInfo?.start)}</div>
                  <div style={styles.testTime}>
                    {formatTime(test.batchInfo?.start)} - {formatTime(test.batchInfo?.end)}
                  </div>
                  {test.daysUntil !== null && (
                    <div style={styles.daysUntil(test.daysUntil)}>
                      {test.daysUntil === 0 ? 'Today' : 
                       test.daysUntil === 1 ? 'Tomorrow' : 
                       `In ${test.daysUntil} days`}
                    </div>
                  )}
                </div>
                <div style={styles.tableCell}>
                  {test.batchInfo?.durationHours || test.duration} min
                </div>
                <div style={styles.tableCell}>
                  {test.totalMarks} marks
                  <div style={styles.passingMarks}>
                    Pass: {test.passingMarks}
                  </div>
                </div>
                <div style={styles.tableCell}>
                  <span style={styles.statusBadge(getStatusColor(test.status))}>
                    {test.status}
                  </span>
                </div>
                <div style={styles.tableCell}>
                  <div style={styles.actionButtons}>
                    <button 
                      style={styles.smallButton(brandColors.secondary)}
                      onClick={() => {/* Set reminder */}}
                    >
                      <FiBell size={14} />
                    </button>
                    <button 
                      style={styles.smallButton(brandColors.primary)}
                      onClick={() => navigate(`/parent/test/${test.testId}`)}
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Study Tips */}
      <div style={styles.tipsSection(brandColors)}>
        <div style={styles.tipsHeader}>
          <FiTrendingUp size={24} />
          <h3>Study Tips for {child?.name}</h3>
        </div>
        <div style={styles.tipsContent}>
          <div style={styles.tipItem}>
            <FiCheckCircle size={18} />
            <span>Create a study schedule with breaks</span>
          </div>
          <div style={styles.tipItem}>
            <FiCheckCircle size={18} />
            <span>Focus on one subject at a time</span>
          </div>
          <div style={styles.tipItem}>
            <FiCheckCircle size={18} />
            <span>Use practice tests to prepare</span>
          </div>
          <div style={styles.tipItem}>
            <FiCheckCircle size={18} />
            <span>Ensure good sleep before test day</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: (colors) => ({
    fontFamily: '"Segoe UI", "Roboto", sans-serif',
    minHeight: '100vh',
    backgroundColor: colors.background,
    padding: '20px'
  }),
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#F8F9FA'
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  header: (colors) => ({
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.dark} 100%)`,
    color: '#FFFFFF',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '25px'
  }),
  backButton: (colors) => ({
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    marginBottom: '20px',
    opacity: 0.9,
    '&:hover': {
      opacity: 1
    }
  }),
  childHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  },
  childInfo: {
    flex: 1
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 8px 0'
  },
  headerSubtitle: {
    fontSize: '16px',
    margin: '0',
    opacity: 0.9
  },
  childStats: {
    display: 'flex',
    gap: '30px'
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    display: 'block'
  },
  statLabel: {
    fontSize: '14px',
    opacity: 0.8,
    marginTop: '4px'
  },
  actionBar: (colors) => ({
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '25px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  }),
  actionButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  actionButton: (colors) => ({
    backgroundColor: colors.light,
    color: colors.dark,
    border: `1px solid ${colors.light}`,
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: colors.secondary,
      color: '#FFFFFF'
    }
  }),
  exportButtons: {
    display: 'flex',
    gap: '10px'
  },
  exportButton: (colors) => ({
    backgroundColor: colors.primary,
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: colors.dark
    }
  }),
  subjectsSection: (colors) => ({
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  }),
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0 0 20px 0'
  },
  subjectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '20px'
  },
  subjectCard: {
    backgroundColor: '#F9FAFB',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #E5E7EB'
  },
  subjectName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0 0 8px 0'
  },
  subjectCount: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 12px 0'
  },
  subjectProgress: {
    height: '6px',
    backgroundColor: '#E5E7EB',
    borderRadius: '3px',
    marginBottom: '8px',
    overflow: 'hidden'
  },
  progressBar: (color, percentage) => ({
    height: '100%',
    backgroundColor: color,
    width: `${percentage}%`,
    borderRadius: '3px'
  }),
  subjectPercentage: {
    fontSize: '12px',
    color: '#6B7280',
    fontWeight: '500'
  },
  testsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  testFilters: {
    display: 'flex',
    gap: '10px'
  },
  filterSelect: (colors) => ({
    padding: '8px 16px',
    borderRadius: '6px',
    border: `1px solid ${colors.light}`,
    backgroundColor: '#FFFFFF',
    color: colors.dark,
    fontSize: '14px'
  }),
  emptyState: (colors) => ({
    backgroundColor: colors.background,
    borderRadius: '8px',
    padding: '60px 40px',
    textAlign: 'center',
    border: `2px dashed ${colors.light}`
  }),
  testsTable: {
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1fr 1fr 1fr',
    backgroundColor: '#F9FAFB',
    padding: '15px 20px',
    borderBottom: '1px solid #E5E7EB'
  },
  tableRow: (colors) => ({
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1fr 1fr 1fr',
    padding: '20px',
    borderBottom: `1px solid ${colors.light}`,
    '&:last-child': {
      borderBottom: 'none'
    }
  }),
  tableCell: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    fontSize: '14px',
    color: '#4B5563'
  },
  testClass: {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '4px'
  },
  subjectBadge: (subject) => ({
    backgroundColor: getSubjectColor(subject) + '20',
    color: getSubjectColor(subject),
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    width: 'fit-content'
  }),
  testTime: {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '4px'
  },
  daysUntil: (days) => ({
    fontSize: '11px',
    color: getDaysColor(days),
    fontWeight: '600',
    marginTop: '4px'
  }),
  passingMarks: {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '4px'
  },
  statusBadge: (color) => ({
    backgroundColor: color + '20',
    color: color,
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    width: 'fit-content'
  }),
  actionButtons: {
    display: 'flex',
    gap: '8px'
  },
  smallButton: (color) => ({
    backgroundColor: color + '20',
    color: color,
    border: `1px solid ${color}`,
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: color,
      color: '#FFFFFF'
    }
  }),
  tipsSection: (colors) => ({
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    padding: '25px',
    border: `1px solid ${colors.light}`
  }),
  tipsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    color: '#1F2937'
  },
  tipsContent: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '15px'
  },
  tipItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    color: '#4B5563'
  }
};

// Helper functions
function getSubjectColor(subject) {
  const colorMap = {
    'mathematics': '#3B82F6',
    'english': '#10B981',
    'science': '#8B5CF6',
    'physics': '#EF4444',
    'chemistry': '#F59E0B',
    'biology': '#84CC16'
  };
  
  const lowerSubject = subject.toLowerCase();
  for (const [key, color] of Object.entries(colorMap)) {
    if (lowerSubject.includes(key)) {
      return color;
    }
  }
  return '#6B7280';
}

function getDaysColor(days) {
  if (days === 0) return '#DC2626';
  if (days <= 3) return '#F59E0B';
  if (days <= 7) return '#10B981';
  return '#6B7280';
}

export default ChildUpcomingTests;