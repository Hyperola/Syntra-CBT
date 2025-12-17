import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  FiUser,
  FiMail,
  FiLock,
  FiSave,
  FiEdit,
  FiX,
  FiCalendar,
  FiPhone,
  FiMapPin,
  FiBook,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi';

const Profile = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    email: '',
    phoneNumber: '',
    address: '',
    dateOfBirth: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Brand colors
  const colors = {
    primary: '#4B5320',
    secondary: '#D4A017',
    accent: '#228B22',
    light: '#F5F5DC',
    background: '#F8F9FA',
    white: '#FFFFFF',
    dark: '#2C3E50',
    gray: '#6B7280',
    danger: '#DC3545',
    success: '#28A745'
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/users/profile/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setProfile(response.data.user);
        setFormData({
          name: response.data.user.name || '',
          surname: response.data.user.surname || '',
          email: response.data.user.email || '',
          phoneNumber: response.data.user.phoneNumber || '',
          address: response.data.user.address || '',
          dateOfBirth: response.data.user.dateOfBirth ? 
            new Date(response.data.user.dateOfBirth).toISOString().split('T')[0] : '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
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
    setError(null);
    setSuccess(null);

    // Basic validation
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const updateData = {
        name: formData.name,
        surname: formData.surname,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        dateOfBirth: formData.dateOfBirth
      };

      // Only include password fields if they're being changed
      if (formData.newPassword && formData.currentPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const response = await axios.put(
        'http://localhost:5000/api/users/profile/me',
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setSuccess('Profile updated successfully!');
        setProfile(response.data.user);
        setEditing(false);
        // Clear password fields
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error.response) {
        setError(error.response.data.message || 'Failed to update profile');
      } else {
        setError('Network error. Please try again.');
      }
    }
  };

  const calculateAge = (dateString) => {
    if (!dateString) return '';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={{ color: colors.primary, marginTop: '20px' }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <FiUser style={{ marginRight: '12px' }} />
          My Profile
        </h1>
        <p style={styles.subtitle}>
          Manage your personal information and account settings
        </p>
      </div>

      {/* Error & Success Messages */}
      {error && (
        <div style={styles.errorAlert}>
          <FiAlertCircle style={{ marginRight: '10px', flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={styles.closeButton}>
            <FiX />
          </button>
        </div>
      )}

      {success && (
        <div style={styles.successAlert}>
          <FiCheckCircle style={{ marginRight: '10px', flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{success}</span>
          <button onClick={() => setSuccess(null)} style={styles.closeButton}>
            <FiX />
          </button>
        </div>
      )}

      {/* Profile Form */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Personal Information</h2>
          {!editing ? (
            <button 
              onClick={() => setEditing(true)}
              style={styles.editButton}
            >
              <FiEdit style={{ marginRight: '8px' }} />
              Edit Profile
            </button>
          ) : (
            <button 
              onClick={() => {
                setEditing(false);
                // Reset form data from profile
                if (profile) {
                  setFormData({
                    name: profile.name || '',
                    surname: profile.surname || '',
                    email: profile.email || '',
                    phoneNumber: profile.phoneNumber || '',
                    address: profile.address || '',
                    dateOfBirth: profile.dateOfBirth ? 
                      new Date(profile.dateOfBirth).toISOString().split('T')[0] : '',
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }
              }}
              style={styles.cancelButton}
            >
              <FiX style={{ marginRight: '8px' }} />
              Cancel
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Personal Info Section */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Basic Information</h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <FiUser style={{ marginRight: '8px' }} />
                  First Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                  disabled={!editing}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <FiUser style={{ marginRight: '8px' }} />
                  Last Name *
                </label>
                <input
                  type="text"
                  name="surname"
                  value={formData.surname}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                  disabled={!editing}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <FiMail style={{ marginRight: '8px' }} />
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                  disabled={!editing}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <FiPhone style={{ marginRight: '8px' }} />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  style={styles.input}
                  disabled={!editing}
                  placeholder="+234 800 000 0000"
                />
              </div>
            </div>
          </div>

          {/* Additional Info Section */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Additional Information</h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <FiCalendar style={{ marginRight: '8px' }} />
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  style={styles.input}
                  disabled={!editing}
                />
                {formData.dateOfBirth && (
                  <span style={styles.helperText}>
                    Age: {calculateAge(formData.dateOfBirth)} years
                  </span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <FiMapPin style={{ marginRight: '8px' }} />
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  style={styles.input}
                  disabled={!editing}
                  placeholder="Enter your address"
                />
              </div>
            </div>
          </div>

          {/* Password Change Section - Only show when editing */}
          {editing && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Change Password</h3>
              <p style={styles.sectionDescription}>
                Leave blank if you don't want to change your password
              </p>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <FiLock style={{ marginRight: '8px' }} />
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="Enter current password"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <FiLock style={{ marginRight: '8px' }} />
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="At least 6 characters"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <FiLock style={{ marginRight: '8px' }} />
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Read-only info when not editing */}
          {!editing && profile && (
            <div style={styles.readOnlyInfo}>
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Username:</span>
                  <span style={styles.infoValue}>{profile.username}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Student ID:</span>
                  <span style={styles.infoValue}>{profile.studentId || 'Not assigned'}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Role:</span>
                  <span style={styles.infoValue}>
                    {profile.role === 'student' ? 'Student' : profile.role}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Class:</span>
                  <span style={styles.infoValue}>
                    {profile.className || profile.class?.name || 'Not assigned'}
                  </span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Status:</span>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: profile.active ? '#D1FAE5' : '#FEE2E2',
                    color: profile.active ? '#065F46' : '#991B1B'
                  }}>
                    {profile.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          {editing && (
            <div style={styles.submitSection}>
              <button type="submit" style={styles.submitButton}>
                <FiSave style={{ marginRight: '8px' }} />
                Save Changes
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    backgroundColor: '#F8F9FA',
    minHeight: '100vh'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#F8F9FA'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #E5E7EB',
    borderTop: '4px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    marginBottom: '32px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#4B5320',
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center'
  },
  subtitle: {
    fontSize: '16px',
    color: '#6B7280',
    margin: 0
  },
  errorAlert: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid #FECACA',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  successAlert: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid #A7F3D0',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    padding: '2px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    maxWidth: '1000px',
    margin: '0 auto'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    paddingBottom: '20px',
    borderBottom: '1px solid #E5E7EB'
  },
  cardTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#4B5320',
    margin: 0
  },
  editButton: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease'
  },
  cancelButton: {
    backgroundColor: '#6B7280',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease'
  },
  section: {
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid #E5E7EB'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 20px 0'
  },
  sectionDescription: {
    fontSize: '14px',
    color: '#6B7280',
    marginBottom: '20px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: '#FFFFFF',
    transition: 'all 0.2s ease'
  },
  helperText: {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '4px',
    display: 'block'
  },
  readOnlyInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    padding: '24px',
    marginTop: '24px'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px'
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  infoLabel: {
    fontSize: '12px',
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  infoValue: {
    fontSize: '16px',
    color: '#374151',
    fontWeight: '500'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600'
  },
  submitSection: {
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #E5E7EB',
    textAlign: 'right'
  },
  submitButton: {
    backgroundColor: '#D4A017',
    color: '#4B5320',
    border: 'none',
    padding: '12px 32px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    transition: 'all 0.2s ease'
  }
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .edit-button:hover {
    background-color: #3A4520;
    transform: translateY(-1px);
  }

  .cancel-button:hover {
    background-color: #4B5563;
    transform: translateY(-1px);
  }

  .submit-button:hover {
    background-color: #C69500;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(212, 160, 23, 0.2);
  }

  input:disabled {
    background-color: #F3F4F6;
    color: #6B7280;
    cursor: not-allowed;
  }

  input:not(:disabled):hover {
    border-color: #9CA3AF;
  }

  input:not(:disabled):focus {
    outline: none;
    border-color: #D4A017;
    box-shadow: 0 0 0 3px rgba(212, 160, 23, 0.1);
  }
`;
document.head.appendChild(styleSheet);

export default Profile;