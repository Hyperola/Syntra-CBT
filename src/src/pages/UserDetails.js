// pages/UserDetails.js
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiBook,
  FiUsers,
  FiShield,
  FiStar,
  FiLock,
  FiChevronLeft,
  FiEdit,
  FiTrash2,
  FiRefreshCw,
  FiLoader,
  FiAlertTriangle,
  FiCheckCircle,
  FiX,
  FiImage,
  FiUpload,
  FiXCircle,
  FiBookOpen,
  FiActivity
} from 'react-icons/fi';

const UserDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  useEffect(() => {
    // Add CSS for animations
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @media (max-width: 768px) {
        .header {
          flex-direction: column;
          align-items: flex-start;
        }
        
        .headerActions {
          width: 100%;
          justify-content: flex-start;
        }
        
        .profileHeader {
          flex-direction: column;
          text-align: center;
        }
        
        .userMeta {
          justify-content: center;
        }
        
        .detailsGrid {
          grid-template-columns: 1fr;
        }
        
        .detailItem {
          flex-direction: column;
          gap: 4px;
        }
        
        .detailLabel, .detailValue {
          text-align: left;
          width: 100%;
        }
        
        .permissionsList {
          justify-content: flex-start;
        }
      }
      
      @media (max-width: 480px) {
        .main {
          padding: 16px;
        }
        
        .headerActions {
          flex-direction: column;
        }
        
        .headerActions button {
          width: 100%;
          justify-content: center;
        }
      }
    `;
    document.head.appendChild(styleSheet);
    
    // Cleanup
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  const fetchUserDetails = async () => {
    setLoading(true);
    setError(null);
    setImageError(false);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.data && response.data.success) {
        setUser(response.data.user);
        console.log('User details loaded:', response.data.user);
        
        // Load profile image preview if exists
        const profilePic = response.data.user.profileImage || response.data.user.profilePicture;
        if (profilePic) {
          const imageUrl = getProfilePictureUrl(profilePic);
          setImagePreview(imageUrl);
        } else {
          setImagePreview(null);
        }
      } else {
        setError('User not found or invalid response');
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to load user details.';
      setError(errorMsg);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const getProfilePictureUrl = (picture) => {
    if (!picture) return null;
    
    // Check if the picture is a valid image path
    if (typeof picture !== 'string') return null;
    
    // If it's already a full URL
    if (picture.startsWith('http')) return picture;
    
    // If it's a filename with path, construct the URL
    if (picture.includes('/')) {
      return `http://localhost:5000${picture}`;
    }
    
    // Default: assume it's in the profiles folder
    return `http://localhost:5000/uploads/profiles/${picture}`;
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    
    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, GIF, WebP).');
      return;
    }
    
    if (file.size > maxSize) {
      setError('Image size must be less than 5MB.');
      return;
    }
    
    setUploadingImage(true);
    setError(null);
    setImageError(false);
    try {
      const formData = new FormData();
      formData.append('profileImage', file);
      
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/users/${userId}/upload-profile-image`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      if (response.data.success) {
        setSuccess('Profile image updated successfully!');
        // Update user data
        setUser(prev => ({
          ...prev,
          profileImage: response.data.profileImage,
          profileImageUrl: response.data.profileImageUrl
        }));
        
        // Update preview
        const newImageUrl = getProfilePictureUrl(response.data.profileImage);
        setImagePreview(newImageUrl);
        setProfileImage(null);
        
        // Refresh user data after a moment
        setTimeout(() => {
          fetchUserDetails();
        }, 1000);
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err.response?.data?.message || 'Failed to upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageError = () => {
    console.warn('Failed to load profile image, falling back to initials');
    setImageError(true);
    setImagePreview(null);
  };

  const removeProfileImage = async () => {
    if (!window.confirm('Are you sure you want to remove the profile image?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `http://localhost:5000/api/users/${userId}/remove-profile-image`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setSuccess('Profile image removed successfully!');
        setUser(prev => ({
          ...prev,
          profileImage: null,
          profileImageUrl: null
        }));
        setImagePreview(null);
        setProfileImage(null);
        setImageError(false);
      }
    } catch (err) {
      console.error('Error removing image:', err);
      setError(err.response?.data?.message || 'Failed to remove image.');
    }
  };

  const handleDeleteUser = async () => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setSuccess('User deleted successfully!');
      setTimeout(() => {
        navigate('/admin/users');
      }, 1500);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const handleEditUser = () => {
    // Navigate to edit page with user data
    navigate(`/admin/users/edit/${userId}`);
  };

  const canEditUser = () => {
    if (!authUser || !user) return false;
    if (authUser.role === 'super_admin') return true;
    if (authUser.role === 'admin' && authUser.adminPermissions?.includes('MANAGE_USERS')) {
      return user.role !== 'super_admin';
    }
    if (authUser.role === 'teacher') {
      return user.role === 'student';
    }
    return false;
  };

  const canDeleteUser = () => {
    if (!authUser || !user) return false;
    if (authUser.role === 'super_admin') return user.role !== 'super_admin';
    if (authUser.role === 'admin' && authUser.adminPermissions?.includes('MANAGE_USERS')) {
      return user.role !== 'super_admin' && user.role !== 'admin';
    }
    return false;
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin': return '#E53E3E';
      case 'admin': return '#3182CE';
      case 'teacher': return '#38A169';
      case 'student': return '#D69E2E';
      default: return '#718096';
    }
  };

  const getStatusBadgeColor = (active) => {
    return active ? '#228B22' : '#D4A017';
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading user details...</p>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorMessage}>
          <FiAlertTriangle style={styles.errorIcon} />
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Error Loading User</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
            <button
              onClick={() => navigate('/admin/users')}
              style={styles.backButton}
            >
              <FiChevronLeft /> Back to Users
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorMessage}>
          <FiAlertTriangle style={styles.errorIcon} />
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>User Not Found</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>The requested user could not be found.</p>
            <button
              onClick={() => navigate('/admin/users')}
              style={styles.backButton}
            >
              <FiChevronLeft /> Back to Users
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <main style={styles.main}>
        {/* Header */}
        <div style={styles.header}>
          <button
            onClick={() => navigate('/admin/users')}
            style={styles.backButton}
          >
            <FiChevronLeft /> Back to Users
          </button>
          
          <div style={styles.headerActions}>
            {canEditUser() && (
              <button
                onClick={handleEditUser}
                style={styles.editButton}
              >
                <FiEdit /> Edit User
              </button>
            )}
            {canDeleteUser() && (
              <button
                onClick={handleDeleteUser}
                style={styles.deleteButton}
              >
                <FiTrash2 /> Delete User
              </button>
            )}
            <button
              onClick={fetchUserDetails}
              disabled={loading}
              style={styles.refreshButton}
            >
              {loading ? <FiLoader style={{animation: 'spin 1s linear infinite'}} /> : <FiRefreshCw />} 
              Refresh
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div style={styles.errorMessageBanner}>
            <FiAlertTriangle /> {error}
            <button onClick={() => setError(null)} style={styles.closeMessageButton}>
              <FiX />
            </button>
          </div>
        )}
        {success && (
          <div style={styles.successMessage}>
            <FiCheckCircle /> {success}
            <button onClick={() => setSuccess(null)} style={styles.closeMessageButton}>
              <FiX />
            </button>
          </div>
        )}

        <div style={styles.content}>
          {/* Profile Card */}
          <div style={styles.profileCard}>
            <div style={styles.profileHeader}>
              <div style={styles.profileImageSection}>
                <div style={styles.imageContainer}>
                  {imagePreview && !imageError ? (
                    <img 
                      src={imagePreview} 
                      alt="Profile" 
                      style={styles.profileImage}
                      onError={handleImageError}
                    />
                  ) : (
                    <div style={styles.profileInitials}>
                      {user.firstName?.charAt(0) || '?'}{user.lastName?.charAt(0) || ''}
                    </div>
                  )}
                </div>
                
                <div style={styles.imageUploadSection}>
                  <input
                    type="file"
                    id="profileImageUpload"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(e) => handleImageUpload(e.target.files[0])}
                    style={{ display: 'none' }}
                    disabled={uploadingImage}
                  />
                  <label htmlFor="profileImageUpload" style={styles.uploadButton}>
                    {uploadingImage ? (
                      <>
                        <FiLoader style={{animation: 'spin 1s linear infinite'}} />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FiUpload /> {imagePreview ? 'Change Photo' : 'Upload Photo'}
                      </>
                    )}
                  </label>
                  {imagePreview && !imageError && (
                    <button
                      onClick={removeProfileImage}
                      style={styles.removeImageButton}
                      disabled={uploadingImage}
                    >
                      <FiXCircle /> Remove Photo
                    </button>
                  )}
                  <div style={styles.imageUploadInfo}>
                    <small>JPG, PNG, GIF, WebP up to 5MB</small>
                  </div>
                </div>
              </div>
              
              <div style={styles.profileInfo}>
                <h1 style={styles.userName}>
                  {user.firstName || ''} {user.middleName ? user.middleName + ' ' : ''}{user.lastName || ''}
                </h1>
                <div style={styles.userMeta}>
                  <span style={{
                    ...styles.roleBadge,
                    backgroundColor: getRoleBadgeColor(user.role)
                  }}>
                    {user.role ? user.role.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                  </span>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: user.active ? '#E6FFE6' : '#FFF3CD',
                    color: getStatusBadgeColor(user.active)
                  }}>
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                  {user.username && (
                    <span style={styles.usernameBadge}>
                      @{user.username}
                    </span>
                  )}
                  {user.userId && (
                    <span style={styles.userIdBadge}>
                      ID: {user.userId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* User Details Grid */}
          <div style={styles.detailsGrid}>
            {/* Personal Information */}
            <div style={styles.detailsCard}>
              <h3 style={styles.cardTitle}>
                <FiUser /> Personal Information
              </h3>
              <div style={styles.detailsList}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Full Name:</span>
                  <span style={styles.detailValue}>
                    {user.firstName || ''} {user.middleName ? user.middleName + ' ' : ''}{user.lastName || ''}
                  </span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Date of Birth:</span>
                  <span style={styles.detailValue}>
                    {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not specified'}
                  </span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Age:</span>
                  <span style={styles.detailValue}>
                    {user.age || 'Not specified'}
                  </span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Gender:</span>
                  <span style={styles.detailValue}>
                    {user.sex ? user.sex.charAt(0).toUpperCase() + user.sex.slice(1) : 'Not specified'}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div style={styles.detailsCard}>
              <h3 style={styles.cardTitle}>
                <FiMail /> Contact Information
              </h3>
              <div style={styles.detailsList}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Email:</span>
                  <span style={styles.detailValue}>
                    {user.email || 'Not specified'}
                  </span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Phone:</span>
                  <span style={styles.detailValue}>
                    {user.phoneNumber || 'Not specified'}
                  </span>
                </div>
                {user.role === 'student' && (
                  <>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Parent Email:</span>
                      <span style={styles.detailValue}>
                        {user.parentEmail || 'Not specified'}
                      </span>
                    </div>
                    <div style={styles.detailItem}>
                      <span style={styles.detailLabel}>Parent Phone:</span>
                      <span style={styles.detailValue}>
                        {user.parentPhoneNumber || 'Not specified'}
                      </span>
                    </div>
                  </>
                )}
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Address:</span>
                  <span style={styles.detailValue}>
                    {user.address || 'Not specified'}
                  </span>
                </div>
              </div>
            </div>

            {/* Role Specific Information */}
            {user.role === 'student' && (
              <div style={styles.detailsCard}>
                <h3 style={styles.cardTitle}>
                  <FiBook /> Student Information
                </h3>
                <div style={styles.detailsList}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Student ID:</span>
                    <span style={styles.detailValue}>
                      {user.studentId || 'Not assigned'}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Class:</span>
                    <span style={styles.detailValue}>
                      {user.className || (user.class?.name || 'Not assigned')}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Class ID:</span>
                    <span style={styles.detailValue}>
                      {user.classId || 'Not assigned'}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Enrolled Subjects:</span>
                    <span style={styles.detailValue}>
                      {user.enrolledSubjects?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {user.role === 'teacher' && (
              <div style={styles.detailsCard}>
                <h3 style={styles.cardTitle}>
                  <FiUsers /> Teacher Information
                </h3>
                <div style={styles.detailsList}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Primary Class:</span>
                    <span style={styles.detailValue}>
                      {user.className || (user.class?.name || 'Not assigned')}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Class ID:</span>
                    <span style={styles.detailValue}>
                      {user.classId || 'Not assigned'}
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Assignments:</span>
                    <span style={styles.detailValue}>
                      {user.teacherAssignments?.length || 0} class(es)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {user.role === 'admin' && (
              <div style={styles.detailsCard}>
                <h3 style={styles.cardTitle}>
                  <FiShield /> Admin Information
                </h3>
                <div style={styles.detailsList}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Permissions:</span>
                    <div style={styles.permissionsList}>
                      {user.adminPermissions?.length > 0 ? (
                        user.adminPermissions.map((perm, idx) => (
                          <span key={idx} style={styles.permissionBadge}>
                            {perm.replace('_', ' ')}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#718096' }}>No specific permissions</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {user.role === 'super_admin' && (
              <div style={styles.detailsCard}>
                <h3 style={styles.cardTitle}>
                  <FiStar /> Super Admin Information
                </h3>
                <div style={styles.detailsList}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Role:</span>
                    <span style={styles.detailValue}>
                      Full system access
                    </span>
                  </div>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Permissions:</span>
                    <span style={styles.detailValue}>
                      All permissions granted
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* System Information */}
            <div style={styles.detailsCard}>
              <h3 style={styles.cardTitle}>
                <FiActivity /> System Information
              </h3>
              <div style={styles.detailsList}>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>User ID:</span>
                  <span style={styles.detailValue}>
                    {user._id || 'N/A'}
                  </span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Username:</span>
                  <span style={styles.detailValue}>
                    {user.username || 'Not set'}
                  </span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Account Created:</span>
                  <span style={styles.detailValue}>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Unknown'}
                  </span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Last Updated:</span>
                  <span style={styles.detailValue}>
                    {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Never'}
                  </span>
                </div>
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Account Status:</span>
                  <span style={styles.detailValue}>
                    <span style={{
                      color: user.active ? '#38A169' : '#D69E2E',
                      fontWeight: '600'
                    }}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Sections */}
          {user.role === 'teacher' && user.teacherAssignments?.length > 0 && (
            <div style={styles.detailedSection}>
              <h3 style={styles.sectionTitle}>
                <FiBookOpen /> Teacher Assignments
              </h3>
              <div style={styles.assignmentsGrid}>
                {user.teacherAssignments.map((assignment, idx) => (
                  <div key={idx} style={styles.assignmentCard}>
                    <h4 style={styles.assignmentTitle}>
                      {assignment.className || assignment.class?.name || 'Unknown Class'}
                    </h4>
                    <div style={styles.assignmentSubjects}>
                      {assignment.subjects?.map((subject, subIdx) => (
                        <span key={subIdx} style={styles.subjectBadge}>
                          {subject.subjectName || subject.subject?.name || 'Unknown Subject'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {user.role === 'student' && user.enrolledSubjects?.length > 0 && (
            <div style={styles.detailedSection}>
              <h3 style={styles.sectionTitle}>
                <FiBook /> Enrolled Subjects
              </h3>
              <div style={styles.subjectsGrid}>
                {user.enrolledSubjects.map((subject, idx) => (
                  <div key={idx} style={styles.subjectCard}>
                    <h4 style={styles.subjectTitle}>
                      {subject.subjectName || subject.subject?.name || 'Unknown Subject'}
                    </h4>
                    <div style={styles.subjectDetails}>
                      <span style={styles.subjectMeta}>
                        {subject.isCore ? 'Core Subject' : 'Elective Subject'}
                      </span>
                      <span style={styles.subjectMeta}>
                        Class: {subject.className || subject.class?.name || 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F5F7FA',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    color: '#4B5320'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  errorContainer: {
    minHeight: '100vh',
    backgroundColor: '#F5F7FA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  errorMessage: {
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '400px'
  },
  errorIcon: {
    fontSize: '24px',
    flexShrink: 0
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#4A5568',
      transform: 'translateY(-2px)'
    }
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  editButton: {
    padding: '10px 20px',
    backgroundColor: '#D69E2E',
    color: '#4B5320',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#B7791F',
      transform: 'translateY(-2px)',
      color: 'white'
    }
  },
  deleteButton: {
    padding: '10px 20px',
    backgroundColor: '#E53E3E',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#C53030',
      transform: 'translateY(-2px)'
    }
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#3182CE',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#2C5282',
      transform: 'translateY(-2px)'
    }
  },
  errorMessageBanner: {
    backgroundColor: '#FED7D7',
    color: '#9B2C2C',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    fontWeight: '500',
    borderLeft: '4px solid #E53E3E'
  },
  successMessage: {
    backgroundColor: '#C6F6D5',
    color: '#22543D',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    fontWeight: '500',
    borderLeft: '4px solid #38A169'
  },
  closeMessageButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    borderRadius: '4px',
    '&:hover': {
      backgroundColor: 'rgba(0,0,0,0.1)'
    }
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  profileCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    flexWrap: 'wrap'
  },
  profileImageSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px'
  },
  imageContainer: {
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    overflow: 'hidden',
    backgroundColor: '#F5F7FA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '3px solid #D69E2E'
  },
  profileImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  profileInitials: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4B5320',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    fontWeight: 'bold'
  },
  imageUploadSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  uploadButton: {
    padding: '8px 16px',
    backgroundColor: '#3182CE',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#2C5282',
      transform: 'translateY(-2px)'
    }
  },
  removeImageButton: {
    padding: '8px 16px',
    backgroundColor: '#FED7D7',
    color: '#9B2C2C',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#FEB2B2',
      transform: 'translateY(-2px)'
    }
  },
  imageUploadInfo: {
    color: '#718096',
    fontSize: '12px'
  },
  profileInfo: {
    flex: 1
  },
  userName: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#2D3748',
    margin: '0 0 12px 0'
  },
  userMeta: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  roleBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    display: 'inline-block',
    textTransform: 'capitalize'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    display: 'inline-block'
  },
  usernameBadge: {
    padding: '6px 12px',
    backgroundColor: '#EDF2F7',
    color: '#4A5568',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500'
  },
  userIdBadge: {
    padding: '6px 12px',
    backgroundColor: '#E6FFFA',
    color: '#234E52',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    fontFamily: 'monospace'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px'
  },
  detailsCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2D3748',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '2px solid #D69E2E',
    paddingBottom: '8px'
  },
  detailsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '8px 0',
    borderBottom: '1px solid #EDF2F7'
  },
  detailLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4A5568',
    minWidth: '140px'
  },
  detailValue: {
    fontSize: '14px',
    color: '#2D3748',
    textAlign: 'right',
    flex: 1
  },
  permissionsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    justifyContent: 'flex-end'
  },
  permissionBadge: {
    fontSize: '12px',
    color: '#4B5320',
    backgroundColor: '#FFF3CD',
    padding: '4px 8px',
    borderRadius: '12px',
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  detailedSection: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2D3748',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  assignmentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px'
  },
  assignmentCard: {
    backgroundColor: '#F8F9FA',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #E2E8F0'
  },
  assignmentTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2D3748',
    margin: '0 0 12px 0'
  },
  assignmentSubjects: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  subjectBadge: {
    fontSize: '12px',
    backgroundColor: '#E3F2FD',
    color: '#1565C0',
    padding: '4px 8px',
    borderRadius: '12px',
    border: '1px solid #BBDEFB'
  },
  subjectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px'
  },
  subjectCard: {
    backgroundColor: '#F8F9FA',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #E2E8F0'
  },
  subjectTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2D3748',
    margin: '0 0 8px 0'
  },
  subjectDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: '#718096'
  },
  subjectMeta: {
    padding: '2px 8px',
    backgroundColor: '#EDF2F7',
    borderRadius: '4px'
  }
};

export default UserDetails;