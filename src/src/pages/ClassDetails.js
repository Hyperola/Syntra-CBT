// pages/ClassDetails.js
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiArrowLeft, FiUsers, FiBook, FiCalendar, FiClock,
  FiUser, FiMapPin, FiMail, FiPhone, FiCheckCircle,
  FiXCircle, FiEdit, FiTrash2, FiRefreshCw, FiAlertCircle,
FiChevronRight
} from 'react-icons/fi';

const ClassDetails = () => {
  const { classId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [currentClass, setCurrentClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Fetch class details
  const fetchClassDetails = async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch class details
      const classResponse = await axios.get(
        `http://localhost:5000/api/classes/${classId}`,
        { headers }
      );
      setCurrentClass(classResponse.data.class || classResponse.data);

      // Fetch class subjects
      const subjectsResponse = await axios.get(
        `http://localhost:5000/api/class-subjects/class/${classId}`,
        { headers }
      );
      setSubjects(subjectsResponse.data.subjects || []);

      // Fetch students
      const studentsResponse = await axios.get(
        `http://localhost:5000/api/users?role=student&class=${classId}`,
        { headers }
      );
      setStudents(studentsResponse.data || []);

    } catch (err) {
      setError('Failed to load class details');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) {
      fetchClassDetails();
    }
  }, [classId]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading class details...</p>
      </div>
    );
  }

  if (!currentClass) {
    return (
      <div style={styles.errorContainer}>
        <FiAlertCircle style={styles.errorIcon} />
        <h3>Class Not Found</h3>
        <p>The requested class could not be found.</p>
        <button
          onClick={() => navigate('/admin/classes')}
          style={styles.backButton}
        >
          <FiArrowLeft /> Back to Classes
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          onClick={() => navigate('/admin/classes')}
          style={styles.backButton}
        >
          <FiArrowLeft /> Back to Classes
        </button>
        
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>{currentClass.fullName || currentClass.name}</h1>
            <div style={styles.subtitle}>
              <span style={styles.levelBadge}>{currentClass.level}</span>
              <span>• Class ID: {currentClass._id?.substring(0, 8)}...</span>
            </div>
          </div>
          
          <div style={styles.headerActions}>
            <button
              onClick={() => navigate(`/admin/classes/${classId}/edit`)}
              style={styles.editButton}
            >
              <FiEdit /> Edit Class
            </button>
            <button
              onClick={() => navigate(`/admin/classes/${classId}/subjects`)}
              style={styles.subjectsButton}
            >
              <FiBook /> Manage Subjects
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            ...styles.tab,
            backgroundColor: activeTab === 'overview' ? '#D4A017' : 'transparent',
            color: activeTab === 'overview' ? '#FFFFFF' : '#4B5320'
          }}
        >
          <FiUsers /> Overview
        </button>
        <button
          onClick={() => setActiveTab('students')}
          style={{
            ...styles.tab,
            backgroundColor: activeTab === 'students' ? '#D4A017' : 'transparent',
            color: activeTab === 'students' ? '#FFFFFF' : '#4B5320'
          }}
        >
          <FiUser /> Students ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          style={{
            ...styles.tab,
            backgroundColor: activeTab === 'subjects' ? '#D4A017' : 'transparent',
            color: activeTab === 'subjects' ? '#FFFFFF' : '#4B5320'
          }}
        >
          <FiBook /> Subjects ({subjects.length})
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'overview' && (
          <div style={styles.overview}>
            {/* Stats */}
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>
                  <FiUsers />
                </div>
                <div>
                  <h3 style={styles.statNumber}>{students.length}</h3>
                  <p style={styles.statLabel}>Students</p>
                </div>
              </div>
              
              <div style={styles.statCard}>
                <div style={styles.statIcon}>
                  <FiBook />
                </div>
                <div>
                  <h3 style={styles.statNumber}>{subjects.length}</h3>
                  <p style={styles.statLabel}>Subjects</p>
                </div>
              </div>
              
              <div style={styles.statCard}>
                <div style={styles.statIcon}>
                  <FiCalendar />
                </div>
                <div>
                  <h3 style={styles.statNumber}>{currentClass.capacity || 40}</h3>
                  <p style={styles.statLabel}>Capacity</p>
                </div>
              </div>
              
              <div style={styles.statCard}>
                <div style={styles.statIcon}>
                  {currentClass.isActive ? <FiCheckCircle /> : <FiXCircle />}
                </div>
                <div>
                  <h3 style={styles.statNumber}>
                    {currentClass.isActive ? 'Active' : 'Inactive'}
                  </h3>
                  <p style={styles.statLabel}>Status</p>
                </div>
              </div>
            </div>

            {/* Class Details */}
            <div style={styles.detailsCard}>
              <h3 style={styles.detailsTitle}>Class Information</h3>
              <div style={styles.detailsGrid}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Class Name:</span>
                  <span style={styles.detailValue}>{currentClass.name}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Full Name:</span>
                  <span style={styles.detailValue}>{currentClass.fullName}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Level:</span>
                  <span style={styles.detailValue}>{currentClass.level}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Stream:</span>
                  <span style={styles.detailValue}>{currentClass.stream || 'None'}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Academic Year:</span>
                  <span style={styles.detailValue}>{currentClass.academicYear}</span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Created:</span>
                  <span style={styles.detailValue}>
                    {new Date(currentClass.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div style={styles.studentsTab}>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Student ID</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(student => (
                    <tr key={student._id}>
                      <td>
                        <div style={styles.studentName}>
                          {student.name} {student.surname}
                        </div>
                      </td>
                      <td>{student.studentId || 'N/A'}</td>
                      <td>{student.email}</td>
                      <td>{student.phoneNumber || 'N/A'}</td>
                      <td>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: student.active ? '#E6FFE6' : '#FFF3CD',
                          color: student.active ? '#228B22' : '#D4A017'
                        }}>
                          {student.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => navigate(`/admin/users/${student._id}`)}
                          style={styles.viewButton}
                        >
                          <FiChevronRight /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div style={styles.subjectsTab}>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Code</th>
                    <th>Category</th>
                    <th>Teacher</th>
                    <th>Periods</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(subject => (
                    <tr key={subject._id}>
                      <td>{subject.subject?.name || subject.name}</td>
                      <td>{subject.subject?.code || subject.code}</td>
                      <td>{subject.subject?.category || subject.category}</td>
                      <td>
                        {subject.teacher ? 
                          `${subject.teacher.firstName} ${subject.teacher.lastName}` : 
                          'Not Assigned'
                        }
                      </td>
                      <td>{subject.periodCount || 3}</td>
                      <td>
                        <button
                          style={styles.removeButton}
                          onClick={() => {
                            // Add remove functionality
                          }}
                        >
                          <FiTrash2 /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F8F9FA',
    padding: '24px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: '#4B5320'
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    textAlign: 'center',
    padding: '40px'
  },
  errorIcon: {
    fontSize: '60px',
    color: '#E53E3E',
    marginBottom: '20px'
  },
  header: {
    marginBottom: '24px'
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px'
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2D3748',
    margin: '0 0 8px 0'
  },
  subtitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: '#718096',
    fontSize: '16px'
  },
  levelBadge: {
    padding: '6px 16px',
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  editButton: {
    padding: '10px 20px',
    backgroundColor: '#D4A017',
    color: '#4B5320',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  subjectsButton: {
    padding: '10px 20px',
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '2px solid #E2E8F0',
    paddingBottom: '8px'
  },
  tab: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  overview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  statCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  statIcon: {
    padding: '12px',
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    borderRadius: '10px',
    fontSize: '24px'
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2D3748',
    margin: '0 0 4px 0'
  },
  statLabel: {
    fontSize: '14px',
    color: '#718096',
    margin: 0
  },
  detailsCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: '12px',
    padding: '24px'
  },
  detailsTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2D3748',
    margin: '0 0 20px 0'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  detailLabel: {
    fontSize: '14px',
    color: '#718096',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: '16px',
    color: '#2D3748',
    fontWeight: '600'
  },
  studentsTab: {},
  subjectsTab: {},
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableTh: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600'
  },
  tableTd: {
    padding: '12px',
    borderBottom: '1px solid #E2E8F0'
  },
  studentName: {
    fontWeight: '600',
    color: '#2D3748'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600'
  },
  viewButton: {
    padding: '6px 12px',
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  removeButton: {
    padding: '6px 12px',
    backgroundColor: '#FED7D7',
    color: '#C53030',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  table th, table td {
    padding: 12px;
    border-bottom: 1px solid #E2E8F0;
    text-align: left;
  }
  
  table th {
    background-color: #4B5320;
    color: #FFFFFF;
    font-weight: 600;
  }
  
  table tr:hover {
    background-color: #F7FAFC;
  }
`;
document.head.appendChild(styleSheet);

export default ClassDetails;