import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ParentProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    notificationPreferences: {
      emailNotifications: {
        academicUpdates: true,
        behaviorAlerts: true,
        attendanceAlerts: true,
        examResults: true,
        schoolEvents: true
      },
      smsNotifications: {
        urgentAlerts: true,
        attendanceAlerts: true
      }
    }
  });

  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    },
    header: {
      backgroundColor: '#4B5320',
      color: 'white',
      padding: '25px',
      borderRadius: '10px',
      marginBottom: '30px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '15px'
    },
    headerTitle: {
      fontSize: '28px',
      fontWeight: 'bold',
      margin: 0
    },
    backButton: {
      backgroundColor: '#66FF66',
      color: '#333',
      border: 'none',
      padding: '12px 25px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s'
    },
    contentWrapper: {
      display: 'grid',
      gridTemplateColumns: '1fr 2fr',
      gap: '30px',
      '@media (max-width: 768px)': {
        gridTemplateColumns: '1fr'
      }
    },
    profileCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '30px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      textAlign: 'center',
      borderTop: '5px solid #66FF66'
    },
    profileHeader: {
      marginBottom: '25px'
    },
    profileAvatar: {
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      backgroundColor: '#4B5320',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '48px',
      fontWeight: 'bold',
      margin: '0 auto 20px',
      border: '5px solid #66FF66',
      overflow: 'hidden'
    },
    profileName: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: '5px'
    },
    profileRole: {
      fontSize: '16px',
      color: '#666',
      backgroundColor: '#f0f8f0',
      padding: '5px 15px',
      borderRadius: '20px',
      display: 'inline-block',
      marginBottom: '15px'
    },
    parentCode: {
      fontSize: '18px',
      color: '#4B5320',
      fontWeight: 'bold',
      marginTop: '10px',
      padding: '10px',
      backgroundColor: '#f0f8f0',
      borderRadius: '8px'
    },
    infoCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '30px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      borderTop: '5px solid #4B5320'
    },
    cardTitle: {
      fontSize: '22px',
      fontWeight: 'bold',
      color: '#4B5320',
      marginBottom: '25px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '25px'
    },
    infoGroup: {
      marginBottom: '25px'
    },
    infoLabel: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '600',
      color: '#666',
      fontSize: '14px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    infoValue: {
      fontSize: '18px',
      color: '#333',
      padding: '12px 15px',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
      minHeight: '50px',
      display: 'flex',
      alignItems: 'center'
    },
    editInput: {
      width: '100%',
      padding: '12px 15px',
      border: '2px solid #ddd',
      borderRadius: '8px',
      fontSize: '16px',
      transition: 'border-color 0.3s'
    },
    textArea: {
      minHeight: '100px',
      resize: 'vertical',
      fontFamily: 'inherit'
    },
    notificationSection: {
      marginTop: '30px',
      paddingTop: '30px',
      borderTop: '2px solid #eee'
    },
    notificationGroup: {
      marginBottom: '20px'
    },
    notificationLabel: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '10px',
      padding: '10px',
      backgroundColor: '#f0f8f0',
      borderRadius: '8px'
    },
    notificationName: {
      fontWeight: 'bold',
      color: '#4B5320'
    },
    notificationDescription: {
      fontSize: '12px',
      color: '#666',
      marginTop: '3px'
    },
    toggleSwitch: {
      position: 'relative',
      display: 'inline-block',
      width: '50px',
      height: '24px'
    },
    toggleSlider: {
      position: 'absolute',
      cursor: 'pointer',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#ccc',
      transition: '.4s',
      borderRadius: '24px'
    },
    toggleSliderBefore: {
      position: 'absolute',
      content: '""',
      height: '16px',
      width: '16px',
      left: '4px',
      bottom: '4px',
      backgroundColor: 'white',
      transition: '.4s',
      borderRadius: '50%'
    },
    toggleChecked: {
      backgroundColor: '#66FF66'
    },
    toggleCheckedBefore: {
      transform: 'translateX(26px)'
    },
    actionButtons: {
      display: 'flex',
      gap: '15px',
      marginTop: '40px',
      justifyContent: 'flex-end',
      flexWrap: 'wrap'
    },
    editButton: {
      backgroundColor: '#4B5320',
      color: 'white',
      border: 'none',
      padding: '15px 35px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontSize: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px',
      minWidth: '180px',
      transition: 'all 0.3s'
    },
    saveButton: {
      backgroundColor: '#66FF66',
      color: '#333'
    },
    cancelButton: {
      backgroundColor: '#666',
      color: 'white'
    },
    loading: {
      textAlign: 'center',
      padding: '50px',
      fontSize: '18px',
      color: '#666'
    },
    errorMessage: {
      backgroundColor: '#ffebee',
      color: '#c62828',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #ff4444',
      animation: 'fadeIn 0.3s ease-in'
    },
    successMessage: {
      backgroundColor: '#e8f5e8',
      color: '#2e7d32',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #66FF66',
      animation: 'fadeIn 0.3s ease-in'
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/parents/profile', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.profile) {
        setProfile(response.data.profile);
        setFormData({
          phone: response.data.profile.phone || '',
          address: response.data.profile.address || '',
          notificationPreferences: response.data.profile.notificationPreferences || {
            emailNotifications: {
              academicUpdates: true,
              behaviorAlerts: true,
              attendanceAlerts: true,
              examResults: true,
              schoolEvents: true
            },
            smsNotifications: {
              urgentAlerts: true,
              attendanceAlerts: true
            }
          }
        });
      } else {
        setError('Profile data not found');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError(error.response?.data?.message || 'Failed to load profile');
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

  const handleNotificationToggle = (category, key) => {
    setFormData(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [category]: {
          ...prev.notificationPreferences[category],
          [key]: !prev.notificationPreferences[category][key]
        }
      }
    }));
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      setSuccess(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.put('/api/parents/profile', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.profile) {
        setProfile(prev => ({
          ...prev,
          phone: formData.phone,
          address: formData.address,
          notificationPreferences: formData.notificationPreferences
        }));
        
        setEditing(false);
        setSuccess('Profile updated successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'P';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const notificationOptions = {
    emailNotifications: [
      { key: 'academicUpdates', label: 'Academic Updates', description: 'Test results, assignments, progress reports' },
      { key: 'behaviorAlerts', label: 'Behavior Alerts', description: 'Behavioral incidents and updates' },
      { key: 'attendanceAlerts', label: 'Attendance Alerts', description: 'Absences and tardiness notifications' },
      { key: 'examResults', label: 'Exam Results', description: 'When new exam results are published' },
      { key: 'schoolEvents', label: 'School Events', description: 'Upcoming events and activities' }
    ],
    smsNotifications: [
      { key: 'urgentAlerts', label: 'Urgent Alerts', description: 'Emergency notifications and important updates' },
      { key: 'attendanceAlerts', label: 'Attendance Alerts', description: 'Daily attendance reports' }
    ]
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>My Profile</h1>
        <button
          onClick={() => navigate('/parent/dashboard')}
          style={styles.backButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div style={styles.errorMessage}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {success && (
        <div style={styles.successMessage}>
          <strong>Success!</strong> {success}
        </div>
      )}

      {/* Profile Content */}
      <div style={styles.contentWrapper}>
        {/* Left Column - Profile Overview */}
        <div style={styles.profileCard}>
          <div style={styles.profileHeader}>
            <div style={styles.profileAvatar}>
              {profile?.profileImage ? (
                <img 
                  src={`${process.env.REACT_APP_API_URL || ''}/uploads/profiles/${profile.profileImage}`} 
                  alt={profile.name}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.textContent = getInitials(profile?.name);
                  }}
                />
              ) : (
                getInitials(profile?.name)
              )}
            </div>
            <div style={styles.profileName}>{profile?.name || 'Parent Name'}</div>
            <div style={styles.profileRole}>Parent</div>
            <div style={styles.parentCode}>
              Parent Code: {profile?.parentCode || 'N/A'}
            </div>
          </div>

          <div style={{ textAlign: 'left', marginTop: '20px' }}>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Account Created</div>
              <div style={{ fontSize: '14px', color: '#333' }}>
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Last Login</div>
              <div style={{ fontSize: '14px', color: '#333' }}>
                {profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}>Email</div>
              <div style={{ fontSize: '14px', color: '#333', wordBreak: 'break-word' }}>
                {profile?.email || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Detailed Information */}
        <div style={styles.infoCard}>
          <h3 style={styles.cardTitle}>
            {editing ? '✏️ Edit Profile' : '👤 Personal Information'}
          </h3>

          <div style={styles.infoGrid}>
            <div style={styles.infoGroup}>
              <label style={styles.infoLabel}>Phone Number</label>
              {editing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                  style={styles.editInput}
                />
              ) : (
                <div style={styles.infoValue}>
                  {profile?.phone || 'Not provided'}
                </div>
              )}
            </div>

            <div style={styles.infoGroup}>
              <label style={styles.infoLabel}>Address</label>
              {editing ? (
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter your address"
                  style={{...styles.editInput, ...styles.textArea}}
                  rows={4}
                />
              ) : (
                <div style={styles.infoValue}>
                  {profile?.address || 'Not provided'}
                </div>
              )}
            </div>
          </div>

          {/* Notification Preferences */}
          <div style={styles.notificationSection}>
            <h3 style={{ ...styles.cardTitle, marginBottom: '15px' }}>🔔 Notification Preferences</h3>
            
            <div style={styles.infoGroup}>
              <h4 style={{ color: '#4B5320', marginBottom: '15px' }}>Email Notifications</h4>
              {notificationOptions.emailNotifications.map((option) => (
                <div key={option.key} style={styles.notificationLabel}>
                  <div>
                    <div style={styles.notificationName}>{option.label}</div>
                    <div style={styles.notificationDescription}>{option.description}</div>
                  </div>
                  <label style={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={formData.notificationPreferences.emailNotifications[option.key]}
                      onChange={() => handleNotificationToggle('emailNotifications', option.key)}
                      style={{ display: 'none' }}
                      disabled={!editing}
                    />
                    <span style={{
                      ...styles.toggleSlider,
                      ...(formData.notificationPreferences.emailNotifications[option.key] ? styles.toggleChecked : {}),
                      ...(!editing ? { cursor: 'not-allowed', opacity: 0.6 } : {})
                    }}>
                      <span style={{
                        ...styles.toggleSliderBefore,
                        ...(formData.notificationPreferences.emailNotifications[option.key] ? styles.toggleCheckedBefore : {})
                      }} />
                    </span>
                  </label>
                </div>
              ))}
            </div>

            <div style={styles.infoGroup}>
              <h4 style={{ color: '#4B5320', marginBottom: '15px' }}>SMS Notifications</h4>
              {notificationOptions.smsNotifications.map((option) => (
                <div key={option.key} style={styles.notificationLabel}>
                  <div>
                    <div style={styles.notificationName}>{option.label}</div>
                    <div style={styles.notificationDescription}>{option.description}</div>
                  </div>
                  <label style={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={formData.notificationPreferences.smsNotifications[option.key]}
                      onChange={() => handleNotificationToggle('smsNotifications', option.key)}
                      style={{ display: 'none' }}
                      disabled={!editing}
                    />
                    <span style={{
                      ...styles.toggleSlider,
                      ...(formData.notificationPreferences.smsNotifications[option.key] ? styles.toggleChecked : {}),
                      ...(!editing ? { cursor: 'not-allowed', opacity: 0.6 } : {})
                    }}>
                      <span style={{
                        ...styles.toggleSliderBefore,
                        ...(formData.notificationPreferences.smsNotifications[option.key] ? styles.toggleCheckedBefore : {})
                      }} />
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            {editing ? (
              <>
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      phone: profile?.phone || '',
                      address: profile?.address || '',
                      notificationPreferences: profile?.notificationPreferences || formData.notificationPreferences
                    });
                    setError(null);
                    setSuccess(null);
                  }}
                  style={{...styles.editButton, ...styles.cancelButton}}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  style={{...styles.editButton, ...styles.saveButton}}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  💾 Save Changes
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                style={styles.editButton}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          input:focus, textarea:focus {
            border-color: #66FF66 !important;
            outline: none;
            box-shadow: 0 0 0 2px rgba(102, 255, 102, 0.2);
          }
          
          button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          
          @media (max-width: 768px) {
            .content-wrapper {
              grid-template-columns: 1fr !important;
              gap: 20px !important;
            }
            
            .header {
              padding: 15px !important;
              flex-direction: column;
              text-align: center;
            }
            
            .action-buttons {
              flex-direction: column;
            }
            
            .edit-button {
              width: 100%;
              min-width: auto !important;
            }
            
            .info-grid {
              grid-template-columns: 1fr !important;
              gap: 15px !important;
            }
          }
          
          @media (max-width: 480px) {
            .container {
              padding: 10px !important;
            }
            
            .profile-card, .info-card {
              padding: 20px !important;
            }
            
            .profile-avatar {
              width: 80px !important;
              height: 80px !important;
              font-size: 32px !important;
            }
            
            .profile-name {
              font-size: 22px !important;
            }
            
            .card-title {
              font-size: 18px !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default ParentProfile;