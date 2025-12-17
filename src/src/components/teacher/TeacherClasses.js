// components/teacher/TeacherClasses.js
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { 
  FiBook,
  FiRefreshCw,
  FiBookOpen,
  FiUsers,
  FiCalendar,
  FiChevronRight,
  FiClipboard,
  FiAward
} from 'react-icons/fi';

const TeacherClasses = () => {
  const { user } = useContext(AuthContext);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Your brand color palette
  const colors = {
    primary: '#4B5320',        // Military green - primary brand color
    primaryLight: '#6B7A30',   // Lighter green
    primaryDark: '#2F3A14',    // Darker green
    secondary: '#D4A017',      // Gold accent
    lightBg: '#F8FAFC',        // Light background
    white: '#FFFFFF',
    cardBg: '#FFFFFF',
    textPrimary: '#1E293B',    // Dark text
    textSecondary: '#64748B',  // Medium text
    textLight: '#94A3B8',      // Light text
    border: '#E2E8F0',
    success: '#10B981',        // Green for success
    error: '#EF4444',          // Red for errors
    warning: '#F59E0B'         // Orange for warnings
  };

  useEffect(() => {
    fetchTeacherAssignments();
  }, []);

  const fetchTeacherAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const teacherId = user?.id || user?._id;
      
      if (!teacherId) {
        throw new Error('Please log in again to continue.');
      }
      
      const endpoint = `http://localhost:5000/api/users/teachers/${teacherId}/assignments`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Unable to load assignments. Please try again.');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAssignments(data.assignments || []);
      } else {
        throw new Error(data.message || 'Failed to fetch assignments');
      }
      
    } catch (err) {
      setError(err.message);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    if (assignments.length === 0) return null;
    
    const totalClasses = assignments.length;
    const totalSubjects = assignments.reduce((total, assignment) => 
      total + (assignment.subjectCount || assignment.subjects?.length || 0), 0
    );
    const totalStudents = assignments.reduce((total, assignment) => 
      total + (assignment.studentCount || assignment.class?.studentCount || 0), 0
    );
    
    return { totalClasses, totalSubjects, totalStudents };
  };

  const summary = calculateSummary();

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>My Classes</h1>
            <p style={styles.subtitle}>View your teaching assignments</p>
          </div>
        </div>
        
        <div style={styles.loadingState}>
          <div style={styles.loadingSpinner}>
            <div style={styles.spinner}></div>
          </div>
          <p style={styles.loadingText}>Loading your classes...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>My Classes</h1>
          <p style={styles.subtitle}>View your teaching assignments</p>
        </div>
        
        <button 
          onClick={fetchTeacherAssignments} 
          style={styles.refreshBtn}
          disabled={loading}
        >
          <FiRefreshCw size={18} style={{ marginRight: 8 }} />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={styles.errorCard}>
          <div style={styles.errorContent}>
            <div style={styles.errorIcon}>⚠️</div>
            <div>
              <h3 style={styles.errorTitle}>Unable to Load Data</h3>
              <p style={styles.errorText}>{error}</p>
            </div>
          </div>
          <button 
            onClick={fetchTeacherAssignments}
            style={styles.errorRetryBtn}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryIconBox} className="class-icon">
              <FiBookOpen size={24} color={colors.primary} />
            </div>
            <div style={styles.summaryContent}>
              <h3 style={styles.summaryNumber}>{summary.totalClasses}</h3>
              <p style={styles.summaryLabel}>Classes</p>
            </div>
          </div>
          
          <div style={styles.summaryCard}>
            <div style={styles.summaryIconBox} className="subject-icon">
              <FiBook size={24} color={colors.primary} />
            </div>
            <div style={styles.summaryContent}>
              <h3 style={styles.summaryNumber}>{summary.totalSubjects}</h3>
              <p style={styles.summaryLabel}>Subjects</p>
            </div>
          </div>
          
          <div style={styles.summaryCard}>
            <div style={styles.summaryIconBox} className="student-icon">
              <FiUsers size={24} color={colors.primary} />
            </div>
            <div style={styles.summaryContent}>
              <h3 style={styles.summaryNumber}>{summary.totalStudents}</h3>
              <p style={styles.summaryLabel}>Students</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={styles.contentSection}>
        {assignments.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <FiClipboard size={64} color={colors.textLight} />
            </div>
            <h3 style={styles.emptyTitle}>No Assignments Yet</h3>
            <p style={styles.emptyText}>
              You haven't been assigned to any classes yet.
            </p>
            <p style={styles.emptySubtext}>
              Contact your administrator to get started with teaching assignments.
            </p>
          </div>
        ) : (
          <>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Teaching Assignments</h2>
              <span style={styles.sectionCount}>{assignments.length} classes</span>
            </div>
            
            <div style={styles.assignmentsGrid}>
              {assignments.map((assignment, index) => (
                <AssignmentCard 
                  key={assignment._id || index} 
                  assignment={assignment} 
                  colors={colors}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Assignment Card Component
const AssignmentCard = ({ assignment, colors }) => {
  const getClassName = () => {
    if (!assignment) return 'Class';
    if (typeof assignment.class === 'string') return assignment.class;
    if (assignment.class?.name) return assignment.class.name;
    if (assignment.className) return assignment.className;
    return 'Class';
  };

  const getClassCode = () => {
    if (!assignment) return null;
    if (assignment.class?.shortName) return assignment.class.shortName;
    if (assignment.class?.code) return assignment.class.code;
    return null;
  };

  const getSubjects = () => {
    if (!assignment.subjects || !Array.isArray(assignment.subjects)) {
      return [];
    }
    return assignment.subjects;
  };

  const getAssignedDate = () => {
    return assignment.assignedAt || assignment.assignedDate;
  };

  const className = getClassName();
  const classCode = getClassCode();
  const subjects = getSubjects();
  const assignedDate = getAssignedDate();
  const studentCount = assignment.studentCount || assignment.class?.studentCount || 0;

  return (
    <div style={styles.assignmentCard}>
      {/* Card Header */}
      <div style={styles.cardHeader}>
        <div style={styles.classInfo}>
          <h3 style={styles.className}>{className}</h3>
          {classCode && (
            <span style={styles.classCode}>{classCode}</span>
          )}
        </div>
        <div style={styles.statusBadge}>
          <span style={styles.statusDot}></span>
          Active
        </div>
      </div>

      {/* Subjects */}
      <div style={styles.subjectsSection}>
        <div style={styles.sectionLabel}>
          <FiBook size={14} />
          <span>Subjects</span>
        </div>
        <div style={styles.subjectsList}>
          {subjects.length === 0 ? (
            <p style={styles.noSubjects}>No subjects assigned</p>
          ) : (
            subjects.map((subject, idx) => (
              <div key={subject._id || idx} style={styles.subjectItem}>
                <span style={styles.subjectName}>{subject.name}</span>
                {subject.code && (
                  <span style={styles.subjectCode}>({subject.code})</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div style={styles.cardFooter}>
        <div style={styles.footerStats}>
          <div style={styles.statItem}>
            <FiUsers size={14} style={{ marginRight: 6 }} />
            <span>{studentCount} students</span>
          </div>
          <div style={styles.statItem}>
            <FiCalendar size={14} style={{ marginRight: 6 }} />
            <span>Assigned {formatDate(assignedDate)}</span>
          </div>
        </div>
        
        <button style={styles.viewDetailsBtn}>
          View Details
          <FiChevronRight size={16} style={{ marginLeft: 8 }} />
        </button>
      </div>
    </div>
  );
};

// Format date for card
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return 'over a year ago';
};

// Styles
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1E293B',
    margin: '0 0 8px 0',
    lineHeight: 1.2,
  },
  
  subtitle: {
    fontSize: '16px',
    color: '#64748B',
    margin: 0,
    fontWeight: '400',
  },
  
  refreshBtn: {
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(75, 83, 32, 0.1)',
    ':hover': {
      backgroundColor: '#3A4219',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 8px rgba(75, 83, 32, 0.2)',
    },
    ':active': {
      transform: 'translateY(0)',
    },
    ':disabled': {
      backgroundColor: '#CBD5E1',
      cursor: 'not-allowed',
      transform: 'none',
      boxShadow: 'none',
    },
  },
  
  errorCard: {
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  
  errorContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
  },
  
  errorIcon: {
    fontSize: '24px',
  },
  
  errorTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#DC2626',
    margin: '0 0 4px 0',
  },
  
  errorText: {
    fontSize: '14px',
    color: '#991B1B',
    margin: 0,
  },
  
  errorRetryBtn: {
    backgroundColor: '#DC2626',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#B91C1C',
    },
  },
  
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    border: '1px solid #E2E8F0',
    transition: 'all 0.3s ease',
    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    },
  },
  
  summaryIconBox: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  
  summaryContent: {
    flex: 1,
  },
  
  summaryNumber: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#1E293B',
    margin: '0 0 4px 0',
    lineHeight: 1,
  },
  
  summaryLabel: {
    fontSize: '14px',
    color: '#64748B',
    margin: 0,
    fontWeight: '500',
  },
  
  contentSection: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    border: '1px solid #E2E8F0',
  },
  
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1E293B',
    margin: 0,
  },
  
  sectionCount: {
    fontSize: '14px',
    color: '#64748B',
    fontWeight: '500',
    backgroundColor: '#F1F5F9',
    padding: '6px 12px',
    borderRadius: '20px',
  },
  
  assignmentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '24px',
  },
  
  assignmentCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #E2E8F0',
    transition: 'all 0.3s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
      borderColor: '#4B5320',
    },
  },
  
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  
  classInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  
  className: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1E293B',
    margin: 0,
  },
  
  classCode: {
    fontSize: '14px',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    padding: '4px 10px',
    borderRadius: '6px',
    fontWeight: '500',
  },
  
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#047857',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: '6px 12px',
    borderRadius: '20px',
  },
  
  statusDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#10B981',
    borderRadius: '50%',
  },
  
  subjectsSection: {
    marginBottom: '20px',
  },
  
  sectionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#475569',
    marginBottom: '12px',
  },
  
  subjectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  
  subjectItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    backgroundColor: '#F8FAFC',
    borderRadius: '8px',
    borderLeft: '3px solid #4B5320',
  },
  
  subjectName: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#1E293B',
  },
  
  subjectCode: {
    fontSize: '13px',
    color: '#64748B',
    fontStyle: 'italic',
  },
  
  noSubjects: {
    fontSize: '14px',
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '12px',
  },
  
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '20px',
    borderTop: '1px solid #E2E8F0',
  },
  
  footerStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  
  statItem: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#64748B',
  },
  
  viewDetailsBtn: {
    backgroundColor: 'transparent',
    color: '#4B5320',
    border: '1px solid #4B5320',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#4B5320',
      color: 'white',
    },
  },
  
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  
  loadingSpinner: {
    marginBottom: '20px',
  },
  
  spinner: {
    width: '48px',
    height: '48px',
    border: '3px solid #F1F5F9',
    borderTop: '3px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  
  loadingText: {
    fontSize: '16px',
    color: '#64748B',
  },
  
  emptyState: {
    textAlign: 'center',
    padding: '64px 40px',
  },
  
  emptyIcon: {
    marginBottom: '24px',
    opacity: 0.5,
  },
  
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1E293B',
    margin: '0 0 12px 0',
  },
  
  emptyText: {
    fontSize: '16px',
    color: '#64748B',
    margin: '0 0 8px 0',
    maxWidth: '400px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  
  emptySubtext: {
    fontSize: '14px',
    color: '#94A3B8',
    margin: 0,
  },
};

// Add CSS animations
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

// Add icon colors
styleSheet.insertRule(`
  .class-icon {
    background-color: rgba(75, 83, 32, 0.1);
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  .subject-icon {
    background-color: rgba(212, 160, 23, 0.1);
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  .student-icon {
    background-color: rgba(16, 185, 129, 0.1);
  }
`, styleSheet.cssRules.length);

export default TeacherClasses;