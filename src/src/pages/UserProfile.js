// UserProfile.js - FIXED VERSION
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiUser, FiMail, FiBook, FiCalendar, FiPhone,
  FiMapPin, FiEdit, FiArrowLeft, FiCheckCircle,
  FiAlertCircle, FiLock, FiUsers, FiBookOpen
} from 'react-icons/fi';

const UserProfile = () => {
  const { user: currentUser } = useContext(AuthContext);
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state for editing
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phoneNumber: '',
    address: '',
    class: '',
    studentId: '',
    teacherId: '',
    dateOfBirth: '',
    sex: '',
    active: true
  });

  // Check if we're on create-teacher or create-student routes
  const isCreateRoute = id === 'create-teacher' || id === 'create-student';
  
  useEffect(() => {
    if (isCreateRoute) {
      // Don't fetch user data for create routes
      setLoading(false);
      setUserData(null);
      return;
    }
    
    if (id) {
      fetchUser();
    }
  }, [id]);

  const fetchUser = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found.');
      }

      // CORRECT ENDPOINT - Use /api/users/:id with the actual user ID
      const response = await axios.get(`http://localhost:5000/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.user) {
        setUserData(response.data.user);
        setFormData({
          name: response.data.user.name || '',
          surname: response.data.user.surname || '',
          email: response.data.user.email || '',
          phoneNumber: response.data.user.phoneNumber || '',
          address: response.data.user.address || '',
          class: response.data.user.class || '',
          studentId: response.data.user.studentId || '',
          teacherId: response.data.user.teacherId || '',
          dateOfBirth: response.data.user.dateOfBirth ? 
            new Date(response.data.user.dateOfBirth).toISOString().split('T')[0] : '',
          sex: response.data.user.sex || '',
          active: response.data.user.active || true
        });
      } else {
        throw new Error('User not found');
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      
      if (err.response) {
        setError(`Server Error (${err.response.status}): ${err.response.data?.message || 'Failed to fetch user'}`);
      } else if (err.request) {
        setError('No response from server. Please check your network connection.');
      } else {
        setError(`Request Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      
      // Prepare update data
      const updateData = {};
      Object.keys(formData).forEach(key => {
        if (formData[key] !== userData[key]) {
          updateData[key] = formData[key];
        }
      });
      
      if (Object.keys(updateData).length === 0) {
        setIsEditing(false);
        return;
      }
      
      const response = await axios.put(
        `http://localhost:5000/api/users/${id}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        setSuccess('User updated successfully!');
        setUserData(response.data.user);
        setIsEditing(false);
        
        // Refresh data
        setTimeout(fetchUser, 1000);
      }
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found.');
      
      await axios.delete(`http://localhost:5000/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      navigate('/admin/users');
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  // If we're on a create route, show appropriate message
  if (isCreateRoute) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate(-1)} style={styles.backButton}>
            <FiArrowLeft /> Back
          </button>
          <h1 style={styles.title}>
            {id === 'create-teacher' ? 'Create New Teacher' : 'Create New Student'}
          </h1>
        </div>
        <div style={styles.content}>
          <p>This is the form for creating a new {id === 'create-teacher' ? 'teacher' : 'student'}.</p>
          <p>Please fill out the form to create a new user.</p>
          <button 
            onClick={() => navigate('/admin/users')}
            style={styles.primaryButton}
          >
            Back to Users List
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading user data...</p>
        </div>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button onClick={() => navigate('/admin/users')} style={styles.backButton}>
            <FiArrowLeft /> Back to Users
          </button>
        </div>
        <div style={styles.errorContainer}>
          <FiAlertCircle size={48} color="#B22222" />
          <h3>Error Loading User</h3>
          <p>{error}</p>
          <button onClick={() => navigate('/admin/users')} style={styles.primaryButton}>
            Back to Users List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/admin/users')} style={styles.backButton}>
          <FiArrowLeft /> Back to Users
        </button>
        
        <div style={styles.headerActions}>
          {currentUser && 
           (currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
            <>
              <button onClick={handleEditToggle} style={styles.editButton}>
                <FiEdit /> {isEditing ? 'Cancel Edit' : 'Edit User'}
              </button>
              <button 
                onClick={handleDeleteUser} 
                style={styles.deleteButton}
                disabled={userData?._id === currentUser?._id}
              >
                Delete User
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div style={styles.errorMessage}>
          <FiAlertCircle /> {error}
          <button onClick={() => setError(null)} style={styles.closeMessageButton}>
            &times;
          </button>
        </div>
      )}
      
      {success && (
        <div style={styles.successMessage}>
          <FiCheckCircle /> {success}
          <button onClick={() => setSuccess(null)} style={styles.closeMessageButton}>
            &times;
          </button>
        </div>
      )}

      <div style={styles.profileCard}>
        <div style={styles.profileHeader}>
          <div style={styles.avatar}>
            <FiUser size={40} />
          </div>
          <div style={styles.profileInfo}>
            <h2 style={styles.userName}>
              {userData?.name} {userData?.surname}
            </h2>
            <p style={styles.userRole}>
              <span style={{
                ...styles.roleBadge,
                backgroundColor: userData?.role === 'admin' ? '#4B5320' : 
                                userData?.role === 'teacher' ? '#D4A017' : 
                                userData?.role === 'student' ? '#228B22' : '#6B7280'
              }}>
                {userData?.role?.charAt(0).toUpperCase() + userData?.role?.slice(1)}
              </span>
              {userData?.active ? (
                <span style={{...styles.statusBadge, backgroundColor: '#E6FFE6', color: '#228B22'}}>
                  Active
                </span>
              ) : (
                <span style={{...styles.statusBadge, backgroundColor: '#FFF3F3', color: '#B22222'}}>
                  Inactive
                </span>
              )}
            </p>
            <p style={styles.userId}>ID: {userData?._id}</p>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} style={styles.editForm}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                />
              </div>
              
              <div style={styles.formGroup}>
                <label>Surname</label>
                <input
                  type="text"
                  name="surname"
                  value={formData.surname}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                />
              </div>
              
              <div style={styles.formGroup}>
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                />
              </div>
              
              <div style={styles.formGroup}>
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label>Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label>Sex</label>
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleInputChange}
                  style={styles.input}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div style={styles.formGroup}>
                <label>Status</label>
                <select
                  name="active"
                  value={formData.active}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    active: e.target.value === 'true'
                  }))}
                  style={styles.input}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            
            <div style={styles.formActions}>
              <button type="button" onClick={() => setIsEditing(false)} style={styles.cancelButton}>
                Cancel
              </button>
              <button type="submit" style={styles.saveButton}>
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div style={styles.profileDetails}>
            <div style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <FiMail style={styles.detailIcon} />
                <div>
                  <h4>Email</h4>
                  <p>{userData?.email}</p>
                </div>
              </div>
              
              <div style={styles.detailItem}>
                <FiPhone style={styles.detailIcon} />
                <div>
                  <h4>Phone</h4>
                  <p>{userData?.phoneNumber || 'Not provided'}</p>
                </div>
              </div>
              
              <div style={styles.detailItem}>
                <FiMapPin style={styles.detailIcon} />
                <div>
                  <h4>Address</h4>
                  <p>{userData?.address || 'Not provided'}</p>
                </div>
              </div>
              
              <div style={styles.detailItem}>
                <FiCalendar style={styles.detailIcon} />
                <div>
                  <h4>Date of Birth</h4>
                  <p>{userData?.dateOfBirth ? 
                    new Date(userData.dateOfBirth).toLocaleDateString() : 'Not provided'}
                  </p>
                </div>
              </div>
              
              <div style={styles.detailItem}>
                <FiUser style={styles.detailIcon} />
                <div>
                  <h4>Sex</h4>
                  <p>{userData?.sex ? 
                    userData.sex.charAt(0).toUpperCase() + userData.sex.slice(1) : 
                    'Not provided'}
                  </p>
                </div>
              </div>
              
              {userData?.role === 'student' && userData?.studentId && (
                <div style={styles.detailItem}>
                  <FiBook style={styles.detailIcon} />
                  <div>
                    <h4>Student ID</h4>
                    <p>{userData.studentId}</p>
                  </div>
                </div>
              )}
              
              {userData?.role === 'teacher' && userData?.teacherId && (
                <div style={styles.detailItem}>
                  <FiUsers style={styles.detailIcon} />
                  <div>
                    <h4>Teacher ID</h4>
                    <p>{userData.teacherId}</p>
                  </div>
                </div>
              )}
              
              {userData?.class && (
                <div style={styles.detailItem}>
                  <FiBookOpen style={styles.detailIcon} />
                  <div>
                    <h4>Class</h4>
                    <p>{userData.class}</p>
                  </div>
                </div>
              )}
            </div>
            
            {userData?.role === 'student' && userData?.enrolledSubjects && userData.enrolledSubjects.length > 0 && (
              <div style={styles.subjectsSection}>
                <h3>Enrolled Subjects</h3>
                <div style={styles.subjectsList}>
                  {userData.enrolledSubjects.map((enrollment, index) => (
                    <div key={index} style={styles.subjectItem}>
                      <span>{enrollment.subject?.name || `Subject ${index + 1}`}</span>
                      <small>Class: {enrollment.class || 'N/A'}</small>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {userData?.role === 'teacher' && userData?.teacherAssignments && userData.teacherAssignments.length > 0 && (
              <div style={styles.assignmentsSection}>
                <h3>Teaching Assignments</h3>
                <div style={styles.assignmentsList}>
                  {userData.teacherAssignments.map((assignment, index) => (
                    <div key={index} style={styles.assignmentItem}>
                      <h4>Class: {assignment.classId || 'N/A'}</h4>
                      <div style={styles.assignmentSubjects}>
                        {assignment.subjectIds?.map((subjectId, subIndex) => (
                          <span key={subIndex} style={styles.subjectTag}>
                            Subject {subIndex + 1}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#EDF2F7',
    color: '#4A5568',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
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
  deleteButton: {
    padding: '10px 20px',
    backgroundColor: '#B22222',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    opacity: 0.9,
    transition: 'opacity 0.2s'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#4B5320',
    margin: '0'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    gap: '16px',
    textAlign: 'center',
    padding: '24px',
    backgroundColor: '#FFF3F3',
    borderRadius: '8px'
  },
  errorMessage: {
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    fontWeight: '500'
  },
  successMessage: {
    backgroundColor: '#E6FFE6',
    color: '#228B22',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    fontWeight: '500'
  },
  closeMessageButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '20px',
    padding: '4px',
    borderRadius: '4px'
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid #E0E0E0'
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#EDF2F7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4A5568',
    fontSize: '32px'
  },
  profileInfo: {
    flex: 1
  },
  userName: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 8px 0'
  },
  userRole: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '0 0 8px 0'
  },
  roleBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600'
  },
  userId: {
    color: '#666',
    fontSize: '14px',
    margin: 0
  },
  editForm: {
    maxWidth: '800px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '24px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #D0D0D0',
    borderRadius: '6px',
    fontSize: '14px',
    marginTop: '4px'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '16px',
    marginTop: '32px'
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  saveButton: {
    padding: '12px 24px',
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  profileDetails: {
    marginTop: '24px'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px'
  },
  detailItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#F8F9FA',
    borderRadius: '8px'
  },
  detailIcon: {
    color: '#4B5320',
    fontSize: '20px',
    flexShrink: 0,
    marginTop: '4px'
  },
  subjectsSection: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #E0E0E0'
  },
  assignmentsSection: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #E0E0E0'
  },
  subjectsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
    marginTop: '16px'
  },
  assignmentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '16px'
  },
  subjectItem: {
    padding: '12px',
    backgroundColor: '#F0FFF4',
    border: '1px solid #C8E6C9',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  assignmentItem: {
    padding: '16px',
    backgroundColor: '#FFF3CD',
    border: '1px solid #FFEAA7',
    borderRadius: '6px'
  },
  assignmentSubjects: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px'
  },
  subjectTag: {
    padding: '4px 8px',
    backgroundColor: '#F0FFF4',
    color: '#228B22',
    borderRadius: '12px',
    fontSize: '12px'
  },
  primaryButton: {
    padding: '12px 24px',
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'inline-block',
    marginTop: '16px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  content: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center'
  }
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .deleteButton:hover:not(:disabled) {
    opacity: 1;
  }
  
  .deleteButton:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
document.head.appendChild(styleSheet);

export default UserProfile;