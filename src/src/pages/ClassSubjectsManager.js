// pages/ClassSubjectsManager.js
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FiBook, FiUsers, FiLink, FiLink2, FiCheck, FiX, 
  FiSearch, FiFilter, FiPlus, FiTrash2, FiEdit,
  FiChevronRight, FiAlertCircle, FiCheckCircle,
  FiRefreshCw, FiGrid, FiList, FiArrowLeft,
  FiEye, FiUser, FiCalendar, FiClock, FiCheckSquare,
  FiSquare
} from 'react-icons/fi';

const ClassSubjectsManager = () => {
  const { classId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [currentClass, setCurrentClass] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  // Get auth token
  const getAuthToken = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication failed. Please log in again.');
      return null;
    }
    return token;
  };

  // API call wrapper
  const apiCall = async (url, options = {}) => {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const config = {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        ...options
      };
      const response = await axios(url, config);
      return response;
    } catch (err) {
      console.error('API call failed:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Network error. Please check your connection.');
      }
      return null;
    }
  };

  // Fetch class details
  const fetchClassDetails = async () => {
    setLoading(true);
    try {
      console.log(`🔄 Fetching class details for: ${classId}`);
      
      // Fetch class details
      const classResponse = await apiCall(`http://localhost:5000/api/classes/${classId}`);
      if (classResponse?.data) {
        console.log('✅ Class details:', classResponse.data);
        setCurrentClass(classResponse.data.class || classResponse.data);
      } else {
        setError('Class not found');
        return;
      }

      // Fetch all subjects
      const subjectsResponse = await apiCall('http://localhost:5000/api/subjects');
      if (subjectsResponse?.data) {
        const subjectsData = Array.isArray(subjectsResponse.data) 
          ? subjectsResponse.data 
          : subjectsResponse.data.subjects || [];
        setSubjects(subjectsData);
        console.log('✅ Subjects loaded:', subjectsData.length);
      }

      // Fetch class subjects
      const classSubjectsResponse = await apiCall(`http://localhost:5000/api/class-subjects/class/${classId}`);
      if (classSubjectsResponse?.data) {
        console.log('✅ Class subjects:', classSubjectsResponse.data);
        const classSubs = classSubjectsResponse.data.subjects || classSubjectsResponse.data.assignments || [];
        setClassSubjects(classSubs);
        
        // Pre-select assigned subjects
        const assignedSubjectIds = classSubs.map(cs => cs.subject?.id || cs.subject?._id).filter(id => id);
        setSelectedSubjects(assignedSubjectIds);
      }

    } catch (err) {
      console.error('❌ Error fetching data:', err);
      setError('Failed to load class and subject data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (classId) {
      fetchClassDetails();
    }
  }, [classId]);

  // Toggle subject selection
  const toggleSubjectSelection = (subjectId) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };

  // Bulk assign subjects
  const handleBulkAssign = async () => {
    if (!currentClass || selectedSubjects.length === 0) {
      setError('Please select at least one subject');
      return;
    }

    setLoading(true);
    try {
      const response = await apiCall(
        `http://localhost:5000/api/class-subjects/class/${classId}/bulk`,
        {
          method: 'POST',
          data: { subjectIds: selectedSubjects }
        }
      );

      if (response) {
        setSuccess(`Successfully assigned ${selectedSubjects.length} subjects to class`);
        await fetchClassDetails(); // Refresh data
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign subjects');
    } finally {
      setLoading(false);
    }
  };

  // Remove subject assignment
  const handleRemoveAssignment = async (assignmentId, subjectName) => {
    if (!window.confirm(`Remove "${subjectName}" from class?`)) return;

    setLoading(true);
    try {
      const response = await apiCall(
        `http://localhost:5000/api/class-subjects/assignment/${assignmentId}`,
        { method: 'DELETE' }
      );

      if (response) {
        setSuccess('Subject removed from class');
        await fetchClassDetails(); // Refresh data
      }
    } catch (err) {
      setError('Failed to remove subject');
    } finally {
      setLoading(false);
    }
  };

  // Remove all assignments
  const handleRemoveAll = async () => {
    if (classSubjects.length === 0) {
      setError('No subjects assigned to remove');
      return;
    }

    if (!window.confirm(`Remove ALL ${classSubjects.length} subjects from "${currentClass.name}"?`)) return;

    setLoading(true);
    try {
      // Remove each assignment individually
      const removePromises = classSubjects.map(cs => 
        apiCall(`http://localhost:5000/api/class-subjects/assignment/${cs.id}`, { method: 'DELETE' })
      );
      
      await Promise.all(removePromises);
      setSuccess(`All ${classSubjects.length} subjects removed from class`);
      await fetchClassDetails(); // Refresh data
    } catch (err) {
      setError('Failed to remove some subjects');
    } finally {
      setLoading(false);
    }
  };

  // Check if subject is assigned
  const isSubjectAssigned = (subjectId) => {
    return classSubjects.some(cs => 
      cs.subject?.id === subjectId || cs.subject?._id === subjectId
    );
  };

  // Get unique categories
  const categories = ['all', ...new Set(subjects.map(subject => subject.category).filter(Boolean))];

  // Filter subjects
  const filteredSubjects = subjects.filter(subject => {
    if (!subject || !subject.name) return false;
    
    const matchesSearch = subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (subject.code && subject.code.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || subject.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get level color
  const getLevelColor = (level) => {
    switch (level) {
      case 'Primary': return { bg: '#E6FFE6', color: '#228B22' };
      case 'Junior Secondary': return { bg: '#D1ECF1', color: '#0C5460' };
      case 'Senior Secondary': return { bg: '#E2E3E5', color: '#383D41' };
      case 'JSS1': case 'JSS2': case 'JSS3': return { bg: '#D1ECF1', color: '#0C5460' };
      case 'SSS1': case 'SSS2': case 'SSS3': return { bg: '#E2E3E5', color: '#383D41' };
      default: return { bg: '#F8F9FA', color: '#6C757D' };
    }
  };

  // Loading state
  if (loading && !currentClass) {
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
            <h1 style={styles.title}>
              Manage Subjects for {currentClass.fullName || currentClass.name}
            </h1>
            <p style={styles.subtitle}>
              Assign and manage subjects for this class
            </p>
          </div>
          
          <div style={styles.headerActions}>
            <button
              onClick={fetchClassDetails}
              disabled={loading}
              style={styles.refreshButton}
            >
              <FiRefreshCw /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={styles.errorMessage}>
          <FiAlertCircle /> {error}
        </div>
      )}
      {success && (
        <div style={styles.successMessage}>
          <FiCheckCircle /> {success}
        </div>
      )}

      {/* Class Info Card */}
      <div style={styles.classInfoCard}>
        <div style={styles.classInfoHeader}>
          <div style={styles.classInfoTitle}>
            <h2 style={styles.className}>{currentClass.fullName || currentClass.name}</h2>
            <div style={{
              ...styles.levelBadge,
              backgroundColor: getLevelColor(currentClass.level).bg,
              color: getLevelColor(currentClass.level).color
            }}>
              {currentClass.level}
            </div>
          </div>
          <div style={styles.classStats}>
            <div style={styles.stat}>
              <FiBook />
              <span>{classSubjects.length} Subjects</span>
            </div>
            <div style={styles.stat}>
              <FiUsers />
              <span>{currentClass.studentCount || 0} Students</span>
            </div>
          </div>
        </div>
        
        <div style={styles.classActions}>
          <button
            onClick={handleBulkAssign}
            disabled={loading || selectedSubjects.length === 0}
            style={styles.assignButton}
          >
            <FiPlus /> Assign Selected ({selectedSubjects.length})
          </button>
          <button
            onClick={handleRemoveAll}
            disabled={loading || classSubjects.length === 0}
            style={styles.removeButton}
          >
            <FiTrash2 /> Remove All
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.contentGrid}>
        {/* Available Subjects */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>
              <FiBook /> Available Subjects ({filteredSubjects.length})
            </h3>
            
            {/* Filters */}
            <div style={styles.filters}>
              <div style={styles.searchBox}>
                <FiSearch style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
              
              <div style={styles.filterGroup}>
                <FiFilter style={styles.filterIcon} />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">All Categories</option>
                  {categories.filter(cat => cat !== 'all').map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={styles.viewToggle}>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    ...styles.viewButton,
                    backgroundColor: viewMode === 'grid' ? '#D4A017' : '#EDF2F7',
                    color: viewMode === 'grid' ? '#FFFFFF' : '#4A5568'
                  }}
                >
                  <FiGrid />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    ...styles.viewButton,
                    backgroundColor: viewMode === 'list' ? '#D4A017' : '#EDF2F7',
                    color: viewMode === 'list' ? '#FFFFFF' : '#4A5568'
                  }}
                >
                  <FiList />
                </button>
              </div>
            </div>
          </div>

          {/* Subjects Grid/List */}
          <div style={styles.subjectsContainer}>
            {filteredSubjects.length === 0 ? (
              <div style={styles.emptyState}>
                <FiBook style={styles.emptyIcon} />
                <p>No subjects found matching your criteria</p>
              </div>
            ) : (
              <div style={viewMode === 'grid' ? styles.gridView : styles.listView}>
                {filteredSubjects.map(subject => {
                  const isAssigned = isSubjectAssigned(subject.id || subject._id);
                  const isSelected = selectedSubjects.includes(subject.id || subject._id);
                  
                  return (
                    <div
                      key={subject.id || subject._id}
                      style={{
                        ...styles.subjectCard,
                        backgroundColor: isAssigned ? '#F0FFF4' : '#FFFFFF',
                        borderColor: isAssigned ? '#C6F6D5' : '#E2E8F0'
                      }}
                    >
                      <div style={styles.subjectCardHeader}>
                        <div style={styles.subjectInfo}>
                          <div style={styles.subjectTitle}>
                            <h4 style={styles.subjectName}>{subject.name}</h4>
                            {subject.code && (
                              <span style={styles.subjectCode}>{subject.code}</span>
                            )}
                          </div>
                          <p style={styles.subjectDescription}>
                            {subject.description || 'No description provided'}
                          </p>
                          
                          <div style={styles.subjectMeta}>
                            <span style={styles.subjectCategory}>
                              {subject.category || 'Uncategorized'}
                            </span>
                            {isAssigned && (
                              <span style={styles.assignedBadge}>
                                <FiCheck /> Assigned
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => toggleSubjectSelection(subject.id || subject._id)}
                          style={{
                            ...styles.selectButton,
                            backgroundColor: isSelected ? '#D4A017' : '#EDF2F7',
                            color: isSelected ? '#FFFFFF' : '#4A5568'
                          }}
                        >
                          {isSelected ? <FiCheckSquare /> : <FiSquare />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Assigned Subjects */}
        <div style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>
              <FiLink /> Assigned Subjects ({classSubjects.length})
            </h3>
          </div>

          <div style={styles.assignedSubjects}>
            {classSubjects.length === 0 ? (
              <div style={styles.emptyState}>
                <FiLink style={styles.emptyIcon} />
                <p>No subjects assigned to this class yet</p>
              </div>
            ) : (
              <div style={styles.assignedList}>
                {classSubjects.map(cs => {
                  const subject = cs.subject || {};
                  return (
                    <div key={cs.id} style={styles.assignedItem}>
                      <div style={styles.assignedInfo}>
                        <h5 style={styles.assignedName}>{subject.name}</h5>
                        <div style={styles.assignedMeta}>
                          {subject.code && (
                            <span style={styles.assignedCode}>{subject.code}</span>
                          )}
                          {subject.category && (
                            <span style={styles.assignedCategory}>{subject.category}</span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleRemoveAssignment(cs.id, subject.name)}
                        disabled={loading}
                        style={styles.removeAssignedButton}
                      >
                        <FiX /> Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
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
  backButton: {
    padding: '12px 24px',
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
    textDecoration: 'none',
    marginBottom: '20px'
  },
  header: {
    marginBottom: '24px'
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
    color: '#718096',
    margin: 0,
    fontSize: '16px'
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  errorMessage: {
    backgroundColor: '#FFF5F5',
    color: '#C53030',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  successMessage: {
    backgroundColor: '#F0FFF4',
    color: '#276749',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  classInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '24px'
  },
  classInfoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  classInfoTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  className: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2D3748',
    margin: 0
  },
  levelBadge: {
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600'
  },
  classStats: {
    display: 'flex',
    gap: '20px'
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#718096',
    fontSize: '14px'
  },
  classActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  assignButton: {
    padding: '12px 24px',
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
  removeButton: {
    padding: '12px 24px',
    backgroundColor: '#E53E3E',
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
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px'
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  sectionHeader: {
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2D3748',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  filters: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  searchBox: {
    position: 'relative',
    flex: 1,
    minWidth: '200px'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#A0AEC0'
  },
  searchInput: {
    width: '100%',
    padding: '10px 10px 10px 36px',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    fontSize: '14px'
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  filterIcon: {
    color: '#718096'
  },
  filterSelect: {
    padding: '10px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '150px'
  },
  viewToggle: {
    display: 'flex',
    gap: '4px'
  },
  viewButton: {
    padding: '10px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  subjectsContainer: {
    maxHeight: '500px',
    overflowY: 'auto'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#718096'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5
  },
  gridView: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px'
  },
  listView: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  subjectCard: {
    padding: '20px',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    transition: 'all 0.2s'
  },
  subjectCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px'
  },
  subjectInfo: {
    flex: 1
  },
  subjectTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
    flexWrap: 'wrap'
  },
  subjectName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2D3748',
    margin: 0
  },
  subjectCode: {
    padding: '4px 8px',
    backgroundColor: '#EDF2F7',
    color: '#4A5568',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600'
  },
  subjectDescription: {
    fontSize: '14px',
    color: '#718096',
    margin: '0 0 12px 0',
    lineHeight: '1.5'
  },
  subjectMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  subjectCategory: {
    padding: '4px 12px',
    backgroundColor: '#EBF8FF',
    color: '#2C5282',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600'
  },
  assignedBadge: {
    padding: '4px 12px',
    backgroundColor: '#C6F6D5',
    color: '#276749',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  selectButton: {
    padding: '10px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  assignedSubjects: {
    maxHeight: '500px',
    overflowY: 'auto'
  },
  assignedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  assignedItem: {
    padding: '16px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  assignedInfo: {
    flex: 1
  },
  assignedName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2D3748',
    margin: '0 0 8px 0'
  },
  assignedMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  assignedCode: {
    fontSize: '12px',
    color: '#718096'
  },
  assignedCategory: {
    padding: '4px 8px',
    backgroundColor: '#F0FFF4',
    color: '#38A169',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600'
  },
  removeAssignedButton: {
    padding: '8px 16px',
    backgroundColor: '#FED7D7',
    color: '#C53030',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default ClassSubjectsManager;