import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FiCalendar, 
  FiClock, 
  FiBookOpen, 
  FiUsers, 
  FiChevronLeft,
  FiFilter,
  FiDownload,
  FiBell,
  FiShare2,
  FiAlertCircle
} from 'react-icons/fi';

const ParentUpcomingTests = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [upcomingTests, setUpcomingTests] = useState([]);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('all');
  const [filteredTests, setFilteredTests] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchUpcomingTests();
    fetchChildren();
  }, []);

  useEffect(() => {
    filterTests();
  }, [selectedChild, upcomingTests]);

  const fetchUpcomingTests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/tests/parent/upcoming-tests', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setUpcomingTests(response.data.upcomingTests || []);
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Error fetching upcoming tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildren = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/parents/children', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        setChildren(response.data.children || []);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  const filterTests = () => {
    if (selectedChild === 'all') {
      setFilteredTests(upcomingTests);
    } else {
      const filtered = upcomingTests.filter(test =>
        test.assignedChildren.some(child => child.id === selectedChild)
      );
      setFilteredTests(filtered);
    }
  };

  const getSubjectIcon = (subject) => {
    const iconMap = {
      'mathematics': '🧮',
      'english': '📚',
      'science': '🔬',
      'physics': '⚛️',
      'chemistry': '🧪',
      'biology': '🧬',
      'history': '📜',
      'geography': '🌍',
      'computer': '💻',
      'french': '🇫🇷',
      'art': '🎨',
      'music': '🎵',
      'pe': '⚽'
    };
    
    const lowerSubject = subject.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (lowerSubject.includes(key)) {
        return icon;
      }
    }
    return '📝';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
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

  const getDaysUntil = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Past';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
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
        <p>Loading upcoming tests...</p>
      </div>
    );
  }

  return (
    <div style={styles.container(brandColors)}>
      {/* Header */}
      <div style={styles.header(brandColors)}>
        <button 
          onClick={() => navigate('/parent/dashboard')}
          style={styles.backButton(brandColors)}
        >
          <FiChevronLeft size={20} /> Back to Dashboard
        </button>
        <h1 style={styles.headerTitle}>Upcoming Tests</h1>
        <p style={styles.headerSubtitle}>
          Track and remind your children about upcoming assessments
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={styles.summarySection}>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard(brandColors.primary)}>
              <FiCalendar size={24} />
              <div>
                <h3>{summary.totalUpcomingTests}</h3>
                <p>Total Tests</p>
              </div>
            </div>
            <div style={styles.summaryCard(brandColors.secondary)}>
              <FiUsers size={24} />
              <div>
                <h3>{summary.childrenWithTests}</h3>
                <p>Children with Tests</p>
              </div>
            </div>
            <div style={styles.summaryCard(brandColors.accent)}>
              <FiClock size={24} />
              <div>
                <h3>{summary.upcomingThisWeek}</h3>
                <p>This Week</p>
              </div>
            </div>
            <div style={styles.summaryCard('#17A2B8')}>
              <FiBookOpen size={24} />
              <div>
                <h3>{summary.totalSubjects}</h3>
                <p>Subjects</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={styles.filterSection(brandColors)}>
        <div style={styles.filterHeader}>
          <FiFilter size={20} />
          <h3>Filter Tests</h3>
        </div>
        <div style={styles.filterControls}>
          <div style={styles.childFilter}>
            <label>Show tests for:</label>
            <select 
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              style={styles.selectInput(brandColors)}
            >
              <option value="all">All Children</option>
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.filterActions}>
            <button style={styles.filterButton(brandColors)}>
              <FiBell size={16} /> Set Reminders
            </button>
            <button style={styles.filterButton(brandColors)}>
              <FiShare2 size={16} /> Share Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Tests List */}
      <div style={styles.testsSection}>
        <h2 style={styles.sectionTitle}>
          {selectedChild === 'all' ? 'All Upcoming Tests' : 'Tests for Selected Child'}
          <span style={styles.testCount}> ({filteredTests.length})</span>
        </h2>
        
        {filteredTests.length === 0 ? (
          <div style={styles.emptyState(brandColors)}>
            <FiAlertCircle size={48} />
            <h3>No upcoming tests found</h3>
            <p>There are no tests scheduled for the selected period</p>
          </div>
        ) : (
          <div style={styles.testsGrid}>
            {filteredTests.map((test, index) => (
              <div key={index} style={styles.testCard(brandColors)}>
                <div style={styles.testCardHeader}>
                  <div style={styles.testSubject}>
                    <span style={styles.subjectIcon}>
                      {getSubjectIcon(test.subject)}
                    </span>
                    <h3 style={styles.testTitle}>{test.title}</h3>
                  </div>
                  <div style={styles.testMeta}>
                    <span style={styles.testSubjectBadge(test.subject)}>
                      {test.subject}
                    </span>
                    <span style={styles.testDays(getDaysUntil(test.schedule.start))}>
                      {getDaysUntil(test.schedule.start)}
                    </span>
                  </div>
                </div>
                
                <div style={styles.testDetails}>
                  <div style={styles.detailItem}>
                    <FiCalendar size={16} />
                    <span>{formatDate(test.schedule.start)}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <FiClock size={16} />
                    <span>{formatTime(test.schedule.start)} - {formatTime(test.schedule.end)}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <FiBookOpen size={16} />
                    <span>{test.questionCount} questions • {test.totalMarks} marks</span>
                  </div>
                  <div style={styles.detailItem}>
                    <FiUsers size={16} />
                    <span>Class: {test.class?.name || test.class}</span>
                  </div>
                </div>
                
                <div style={styles.testChildren}>
                  <p style={styles.childrenLabel}>Assigned to:</p>
                  <div style={styles.childrenList}>
                    {test.assignedChildren.map((child, idx) => (
                      <span key={idx} style={styles.childTag}>
                        {child.name}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div style={styles.testActions}>
                  <button 
                    style={styles.remindButton(brandColors)}
                    onClick={() => {/* Implement reminder */}}
                  >
                    <FiBell size={16} /> Set Reminder
                  </button>
                  <button 
                    style={styles.viewButton(brandColors)}
                    onClick={() => navigate(`/parent/test/${test.testId}`)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div style={styles.tipsSection(brandColors)}>
        <h3 style={styles.tipsTitle}>Tips for Parents</h3>
        <div style={styles.tipsGrid}>
          <div style={styles.tipCard}>
            <h4>📚 Create Study Schedule</h4>
            <p>Help your child create a study plan for upcoming tests</p>
          </div>
          <div style={styles.tipCard}>
            <h4>⏰ Set Reminders</h4>
            <p>Set reminders for test dates to avoid last-minute rush</p>
          </div>
          <div style={styles.tipCard}>
            <h4>💬 Discuss with Teachers</h4>
            <p>Communicate with teachers about test preparation</p>
          </div>
          <div style={styles.tipCard}>
            <h4>🎯 Focus on Weak Areas</h4>
            <p>Identify and focus on subjects where your child needs improvement</p>
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
    marginBottom: '15px',
    opacity: 0.9,
    '&:hover': {
      opacity: 1
    }
  }),
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
  summarySection: {
    marginBottom: '25px'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px'
  },
  summaryCard: (color) => ({
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    padding: '25px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderLeft: `4px solid ${color}`
  }),
  filterSection: (colors) => ({
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  }),
  filterHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    color: '#1F2937'
  },
  filterControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px'
  },
  childFilter: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  selectInput: (colors) => ({
    padding: '10px 15px',
    borderRadius: '6px',
    border: `1px solid ${colors.light}`,
    backgroundColor: '#FFFFFF',
    color: colors.dark,
    fontSize: '14px',
    minWidth: '200px'
  }),
  filterActions: {
    display: 'flex',
    gap: '10px'
  },
  filterButton: (colors) => ({
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
  testsSection: {
    marginBottom: '30px'
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0 0 20px 0'
  },
  testCount: {
    color: '#6B7280',
    fontWeight: '400'
  },
  emptyState: (colors) => ({
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    padding: '60px 40px',
    textAlign: 'center',
    border: `2px dashed ${colors.light}`
  }),
  testsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  testCard: (colors) => ({
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    padding: '25px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    border: `1px solid ${colors.light}`,
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 8px 25px rgba(0,0,0,0.12)'
    }
  }),
  testCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px'
  },
  testSubject: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  subjectIcon: {
    fontSize: '24px'
  },
  testTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0'
  },
  testMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px'
  },
  testSubjectBadge: (subject) => ({
    backgroundColor: getSubjectColor(subject) + '20',
    color: getSubjectColor(subject),
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500'
  }),
  testDays: (daysText) => ({
    backgroundColor: getDaysColor(daysText) + '20',
    color: getDaysColor(daysText),
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600'
  }),
  testDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px'
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    color: '#4B5563'
  },
  testChildren: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px'
  },
  childrenLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#6B7280',
    margin: '0 0 10px 0'
  },
  childrenList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  childTag: {
    backgroundColor: '#E5E7EB',
    color: '#374151',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px'
  },
  testActions: {
    display: 'flex',
    gap: '10px'
  },
  remindButton: (colors) => ({
    backgroundColor: colors.secondary + '20',
    color: colors.secondary,
    border: `1px solid ${colors.secondary}`,
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: colors.secondary,
      color: '#FFFFFF'
    }
  }),
  viewButton: (colors) => ({
    backgroundColor: colors.primary,
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    flex: 1,
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: colors.dark
    }
  }),
  tipsSection: (colors) => ({
    backgroundColor: colors.cardBg,
    borderRadius: '12px',
    padding: '30px',
    border: `1px solid ${colors.light}`
  }),
  tipsTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0 0 20px 0'
  },
  tipsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  tipCard: {
    backgroundColor: '#F9FAFB',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #E5E7EB'
  }
};

// Helper functions for colors
function getSubjectColor(subject) {
  const colorMap = {
    'mathematics': '#3B82F6',
    'english': '#10B981',
    'science': '#8B5CF6',
    'physics': '#EF4444',
    'chemistry': '#F59E0B',
    'biology': '#84CC16',
    'history': '#EC4899',
    'geography': '#06B6D4',
    'computer': '#6366F1',
    'french': '#8B4513'
  };
  
  const lowerSubject = subject.toLowerCase();
  for (const [key, color] of Object.entries(colorMap)) {
    if (lowerSubject.includes(key)) {
      return color;
    }
  }
  return '#6B7280';
}

function getDaysColor(daysText) {
  if (daysText === 'Today') return '#DC2626';
  if (daysText === 'Tomorrow') return '#F59E0B';
  if (daysText === 'Past') return '#6B7280';
  return '#10B981';
}

export default ParentUpcomingTests;