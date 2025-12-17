import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {
  FiBell, FiLock, FiGlobe, FiMoon, FiSun,
  FiDownload, FiTrash2, FiSave, FiEye, FiEyeOff,
  FiMail, FiCalendar, FiFileText, FiUsers,
  FiShield, FiDatabase, FiRefreshCw, FiSettings
} from 'react-icons/fi';
import { AuthContext } from '../../context/AuthContext';

const TeacherSettings = () => {
  const { user, updateUserPreferences } = useContext(AuthContext);
  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: true,
      testReminders: true,
      assignmentDeadlines: true,
      resultNotifications: true,
      systemUpdates: true
    },
    privacy: {
      profileVisibility: 'students', // 'public', 'students', 'private'
      showEmail: true,
      showPhone: false,
      showSubjects: true
    },
    preferences: {
      theme: 'light', // 'light', 'dark', 'auto'
      language: 'en', // 'en', 'fr', 'es'
      timezone: 'UTC+1', // Common Nigerian timezones
      fontSize: 'medium', // 'small', 'medium', 'large'
      questionView: 'list' // 'list', 'grid'
    },
    data: {
      autoSave: true,
      backupInterval: 'weekly', // 'daily', 'weekly', 'monthly'
      exportFormat: 'csv' // 'csv', 'json', 'pdf'
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Brand Colors
  const colors = {
    forestGreen: '#4B5320',
    gold: '#D4A017',
    lightGold: '#FFD700',
    darkGold: '#B8860B',
    white: '#FFFFFF',
    lightGray: '#F8F9FA',
    mediumGray: '#E9ECEF',
    darkGray: '#6C757D',
    errorRed: '#DC3545',
    successGreen: '#28A745',
    warningYellow: '#FFC107',
    infoBlue: '#17A2B8'
  };

  // Timezone options for Nigeria/West Africa
  const timezoneOptions = [
    { value: 'UTC+1', label: 'West Africa Time (UTC+1)', region: 'Lagos, Abuja' },
    { value: 'UTC+0', label: 'Greenwich Mean Time (UTC+0)', region: 'London, Accra' },
    { value: 'UTC-5', label: 'Eastern Time (UTC-5)', region: 'New York, Washington' },
    { value: 'UTC+2', label: 'Central Africa Time (UTC+2)', region: 'Cairo, Johannesburg' },
    { value: 'UTC+5:30', label: 'India Standard Time (UTC+5:30)', region: 'New Delhi, Mumbai' }
  ];

  // Language options
  const languageOptions = [
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'fr', label: 'Français', flag: '🇫🇷' },
    { value: 'es', label: 'Español', flag: '🇪🇸' },
    { value: 'ar', label: 'العربية', flag: '🇸🇦' }
  ];

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Try to fetch from API
      const response = await axios.get('http://localhost:5000/api/teacher/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success && response.data.settings) {
        setSettings(response.data.settings);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      
      // Use localStorage as fallback
      const savedSettings = localStorage.getItem('teacherSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      } else {
        // Initialize with user preferences if available
        if (user?.preferences) {
          setSettings(prev => ({
            ...prev,
            preferences: {
              ...prev.preferences,
              ...user.preferences
            }
          }));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (category, setting) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [setting]: !settings[category][setting]
      }
    };
    setSettings(newSettings);
    
    // Auto-save for some settings
    if (category === 'preferences' || category === 'notifications') {
      saveToLocalStorage(newSettings);
    }
  };

  const handleSelectChange = (category, setting, value) => {
    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [setting]: value
      }
    };
    setSettings(newSettings);
    
    // Apply theme change immediately
    if (category === 'preferences' && setting === 'theme') {
      applyTheme(value);
    }
    
    // Auto-save
    saveToLocalStorage(newSettings);
  };

  const saveToLocalStorage = (settingsToSave) => {
    localStorage.setItem('teacherSettings', JSON.stringify(settingsToSave));
  };

  const applyTheme = (theme) => {
    if (theme === 'dark') {
      document.documentElement.style.setProperty('--bg-primary', '#1a202c');
      document.documentElement.style.setProperty('--text-primary', '#ffffff');
    } else {
      document.documentElement.style.setProperty('--bg-primary', '#ffffff');
      document.documentElement.style.setProperty('--text-primary', '#000000');
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      
      const token = localStorage.getItem('token');
      const response = await axios.put(
        'http://localhost:5000/api/teacher/settings',
        settings,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: 'Settings saved successfully!' 
        });
        
        // Update user context if available
        if (updateUserPreferences) {
          updateUserPreferences(settings.preferences);
        }
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to save settings. Please try again.' 
      });
      
      // Fallback to localStorage
      saveToLocalStorage(settings);
      setMessage({ 
        type: 'info', 
        text: 'Settings saved locally (offline mode)' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match!' });
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long!' });
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/teacher/change-password',
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordForm(false);
        
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to change password. Please check your current password.' 
      });
    }
  };

  const exportData = async (format = 'csv') => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/teacher/export?format=${format}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `teacher-data-${timestamp}.${format}`;
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setMessage({ type: 'success', text: `Data exported as ${format.toUpperCase()} successfully!` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Error exporting data:', err);
      setMessage({ type: 'error', text: 'Failed to export data. Please try again.' });
    }
  };

  const clearCache = () => {
    if (window.confirm('Are you sure? This will clear all locally stored data and log you out.')) {
      localStorage.removeItem('teacherSettings');
      localStorage.removeItem('questionDrafts');
      localStorage.removeItem('testDrafts');
      sessionStorage.clear();
      
      // Keep only the token for now
      const token = localStorage.getItem('token');
      localStorage.clear();
      localStorage.setItem('token', token);
      
      setMessage({ type: 'success', text: 'Cache cleared successfully! Page will refresh.' });
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const resetToDefaults = () => {
    if (window.confirm('Reset all settings to default values?')) {
      const defaults = {
        notifications: {
          emailNotifications: true,
          testReminders: true,
          assignmentDeadlines: true,
          resultNotifications: true,
          systemUpdates: true
        },
        privacy: {
          profileVisibility: 'students',
          showEmail: true,
          showPhone: false,
          showSubjects: true
        },
        preferences: {
          theme: 'light',
          language: 'en',
          timezone: 'UTC+1',
          fontSize: 'medium',
          questionView: 'list'
        },
        data: {
          autoSave: true,
          backupInterval: 'weekly',
          exportFormat: 'csv'
        }
      };
      setSettings(defaults);
      setMessage({ type: 'info', text: 'Settings reset to defaults. Click Save to apply.' });
    }
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '40px', 
        backgroundColor: colors.white,
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: `4px solid ${colors.forestGreen}`,
          borderTop: `4px solid ${colors.gold}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p style={{ 
          color: colors.forestGreen, 
          fontSize: '16px',
          fontWeight: '500'
        }}>
          Loading settings...
        </p>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundColor: colors.white,
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: colors.forestGreen,
        padding: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          backgroundColor: colors.gold,
          borderRadius: '50%',
          opacity: '0.1'
        }}></div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          position: 'relative',
          zIndex: 1
        }}>
          <div>
            <h2 style={{ 
              fontSize: '24px',
              fontWeight: '700',
              color: colors.white,
              margin: '0 0 8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <FiSettings />
              Settings & Preferences
            </h2>
            <p style={{ 
              color: colors.lightGold,
              fontSize: '14px',
              margin: 0,
              opacity: 0.9
            }}>
              Customize your teaching experience
            </p>
          </div>
          
          <button
            onClick={resetToDefaults}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: colors.white,
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            <FiRefreshCw />
            Reset Defaults
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div style={{ padding: '30px' }}>
        {/* Message Display */}
        {message.text && (
          <div style={{
            padding: '16px',
            backgroundColor: message.type === 'success' ? '#F0FFF4' : 
                           message.type === 'error' ? '#FFF5F5' : '#E6F3FF',
            border: `1px solid ${message.type === 'success' ? '#C6F6D5' : 
                     message.type === 'error' ? '#FED7D7' : '#B3E0FF'}`,
            borderRadius: '8px',
            color: message.type === 'success' ? colors.successGreen : 
                   message.type === 'error' ? colors.errorRed : colors.infoBlue,
            marginBottom: '25px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            animation: 'slideIn 0.3s ease'
          }}>
            <span>{message.text}</span>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '20px',
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ×
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gap: '40px' }}>
          {/* Notifications Section */}
          <div style={{
            backgroundColor: colors.lightGray,
            borderRadius: '12px',
            padding: '25px',
            border: `1px solid ${colors.mediumGray}`
          }}>
            <h3 style={{ 
              fontSize: '18px',
              fontWeight: '600',
              color: colors.forestGreen,
              marginBottom: '25px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <FiBell />
              Notifications
            </h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              {Object.entries(settings.notifications).map(([key, value]) => {
                const labels = {
                  emailNotifications: 'Email Notifications',
                  testReminders: 'Test Reminders',
                  assignmentDeadlines: 'Assignment Deadlines',
                  resultNotifications: 'Result Notifications',
                  systemUpdates: 'System Updates'
                };
                
                const descriptions = {
                  emailNotifications: 'Receive notifications via email',
                  testReminders: 'Get reminders for upcoming tests',
                  assignmentDeadlines: 'Alerts for assignment deadlines',
                  resultNotifications: 'Notifications when results are ready',
                  systemUpdates: 'Important system announcements'
                };
                
                const icons = {
                  emailNotifications: FiMail,
                  testReminders: FiCalendar,
                  assignmentDeadlines: FiFileText,
                  resultNotifications: FiUsers,
                  systemUpdates: FiBell
                };
                
                const Icon = icons[key];
                
                return (
                  <div key={key} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    backgroundColor: colors.white,
                    borderRadius: '8px',
                    border: `1px solid ${colors.mediumGray}`,
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        backgroundColor: colors.lightGray,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: colors.forestGreen
                      }}>
                        <Icon />
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: '15px',
                          fontWeight: '600',
                          color: colors.forestGreen,
                          marginBottom: '4px'
                        }}>
                          {labels[key]}
                        </div>
                        <div style={{ fontSize: '13px', color: colors.darkGray }}>
                          {descriptions[key]}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('notifications', key)}
                      style={{
                        width: '52px',
                        height: '28px',
                        backgroundColor: value ? colors.forestGreen : colors.mediumGray,
                        border: 'none',
                        borderRadius: '14px',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '3px',
                        left: value ? '27px' : '3px',
                        width: '22px',
                        height: '22px',
                        backgroundColor: colors.white,
                        borderRadius: '50%',
                        transition: 'left 0.3s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Privacy & Security Section */}
          <div style={{
            backgroundColor: colors.lightGray,
            borderRadius: '12px',
            padding: '25px',
            border: `1px solid ${colors.mediumGray}`
          }}>
            <h3 style={{ 
              fontSize: '18px',
              fontWeight: '600',
              color: colors.forestGreen,
              marginBottom: '25px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <FiShield />
              Privacy & Security
            </h3>
            
            {/* Privacy Settings */}
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ 
                fontSize: '16px',
                fontWeight: '600',
                color: colors.darkGray,
                marginBottom: '15px'
              }}>
                Profile Visibility
              </h4>
              <div style={{ display: 'grid', gap: '15px' }}>
                {Object.entries(settings.privacy).map(([key, value]) => {
                  if (key === 'profileVisibility') {
                    return (
                      <div key={key} style={{
                        backgroundColor: colors.white,
                        padding: '15px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.mediumGray}`
                      }}>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '14px',
                          fontWeight: '600',
                          color: colors.forestGreen,
                          marginBottom: '10px'
                        }}>
                          Profile Visibility
                        </label>
                        <select
                          value={value}
                          onChange={(e) => handleSelectChange('privacy', key, e.target.value)}
                          style={{
                            width: '100%',
                            maxWidth: '300px',
                            padding: '10px 12px',
                            border: `1px solid ${colors.mediumGray}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                            backgroundColor: colors.white,
                            color: colors.forestGreen
                          }}
                        >
                          <option value="private">Private (Only me)</option>
                          <option value="students">Students Only</option>
                          <option value="public">Public (Everyone)</option>
                        </select>
                        <p style={{ 
                          fontSize: '13px', 
                          color: colors.darkGray,
                          marginTop: '8px'
                        }}>
                          Controls who can see your teacher profile
                        </p>
                      </div>
                    );
                  }
                  
                  const labels = {
                    showEmail: 'Show Email Address',
                    showPhone: 'Show Phone Number',
                    showSubjects: 'Show Teaching Subjects'
                  };
                  
                  return (
                    <div key={key} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '15px',
                      backgroundColor: colors.white,
                      borderRadius: '8px',
                      border: `1px solid ${colors.mediumGray}`
                    }}>
                      <div>
                        <div style={{ 
                          fontSize: '15px',
                          fontWeight: '600',
                          color: colors.forestGreen,
                          marginBottom: '4px'
                        }}>
                          {labels[key]}
                        </div>
                        <div style={{ fontSize: '13px', color: colors.darkGray }}>
                          {key === 'showEmail' && 'Allow others to see your email'}
                          {key === 'showPhone' && 'Allow others to see your phone number'}
                          {key === 'showSubjects' && 'Show the subjects you teach'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle('privacy', key)}
                        style={{
                          width: '52px',
                          height: '28px',
                          backgroundColor: value ? colors.infoBlue : colors.mediumGray,
                          border: 'none',
                          borderRadius: '14px',
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div style={{
                          position: 'absolute',
                          top: '3px',
                          left: value ? '27px' : '3px',
                          width: '22px',
                          height: '22px',
                          backgroundColor: colors.white,
                          borderRadius: '50%',
                          transition: 'left 0.3s ease',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Change Password */}
            {showPasswordForm ? (
              <div style={{
                backgroundColor: colors.white,
                padding: '25px',
                borderRadius: '8px',
                border: `1px solid ${colors.mediumGray}`,
                marginBottom: '20px'
              }}>
                <h4 style={{ 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.forestGreen,
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <FiLock />
                  Change Password
                </h4>
                
                <form onSubmit={changePassword} style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '14px',
                      fontWeight: '600',
                      color: colors.forestGreen,
                      marginBottom: '8px'
                    }}>
                      Current Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showOldPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value
                        })}
                        style={{
                          width: '100%',
                          padding: '12px 40px 12px 12px',
                          border: `1px solid ${colors.mediumGray}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: colors.white
                        }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: colors.darkGray,
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        {showOldPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '14px',
                      fontWeight: '600',
                      color: colors.forestGreen,
                      marginBottom: '8px'
                    }}>
                      New Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value
                        })}
                        style={{
                          width: '100%',
                          padding: '12px 40px 12px 12px',
                          border: `1px solid ${colors.mediumGray}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: colors.white
                        }}
                        required
                        minLength="8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: colors.darkGray,
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        {showNewPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                    <p style={{ fontSize: '12px', color: colors.darkGray, marginTop: '4px' }}>
                      Must be at least 8 characters long
                    </p>
                  </div>
                  
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '14px',
                      fontWeight: '600',
                      color: colors.forestGreen,
                      marginBottom: '8px'
                    }}>
                      Confirm New Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value
                        })}
                        style={{
                          width: '100%',
                          padding: '12px 40px 12px 12px',
                          border: `1px solid ${colors.mediumGray}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: colors.white
                        }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: colors.darkGray,
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm(false)}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: colors.white,
                        color: colors.darkGray,
                        border: `1px solid ${colors.mediumGray}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.lightGray;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = colors.white;
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '10px 20px',
                        backgroundColor: colors.forestGreen,
                        color: colors.white,
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#3a4220';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = colors.forestGreen;
                      }}
                    >
                      Change Password
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <button
                onClick={() => setShowPasswordForm(true)}
                style={{
                  width: '100%',
                  padding: '15px',
                  backgroundColor: colors.white,
                  color: colors.forestGreen,
                  border: `2px dashed ${colors.mediumGray}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.lightGray;
                  e.currentTarget.style.borderColor = colors.gold;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = colors.white;
                  e.currentTarget.style.borderColor = colors.mediumGray;
                }}
              >
                <FiLock />
                Change Password
              </button>
            )}
          </div>

          {/* Preferences Section */}
          <div style={{
            backgroundColor: colors.lightGray,
            borderRadius: '12px',
            padding: '25px',
            border: `1px solid ${colors.mediumGray}`
          }}>
            <h3 style={{ 
              fontSize: '18px',
              fontWeight: '600',
              color: colors.forestGreen,
              marginBottom: '25px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <FiGlobe />
              Preferences
            </h3>
            
            <div style={{ display: 'grid', gap: '25px' }}>
              {/* Theme */}
              <div style={{
                backgroundColor: colors.white,
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${colors.mediumGray}`
              }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '15px',
                  fontWeight: '600',
                  color: colors.forestGreen,
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  {settings.preferences.theme === 'dark' ? <FiMoon /> : <FiSun />}
                  Theme
                </label>
                <div style={{ display: 'flex', gap: '15px' }}>
                  {['light', 'dark', 'auto'].map((theme) => (
                    <button
                      key={theme}
                      onClick={() => handleSelectChange('preferences', 'theme', theme)}
                      style={{
                        flex: 1,
                        padding: '15px',
                        backgroundColor: settings.preferences.theme === theme ? colors.forestGreen : colors.lightGray,
                        color: settings.preferences.theme === theme ? colors.white : colors.forestGreen,
                        border: `1px solid ${settings.preferences.theme === theme ? colors.forestGreen : colors.mediumGray}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (settings.preferences.theme !== theme) {
                          e.currentTarget.style.backgroundColor = colors.mediumGray;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (settings.preferences.theme !== theme) {
                          e.currentTarget.style.backgroundColor = colors.lightGray;
                        }
                      }}
                    >
                      {theme === 'light' && <FiSun />}
                      {theme === 'dark' && <FiMoon />}
                      {theme === 'auto' && '🔄'}
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Language and Timezone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                <div style={{
                  backgroundColor: colors.white,
                  padding: '20px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.mediumGray}`
                }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '15px',
                    fontWeight: '600',
                    color: colors.forestGreen,
                    marginBottom: '15px'
                  }}>
                    Language
                  </label>
                  <select
                    value={settings.preferences.language}
                    onChange={(e) => handleSelectChange('preferences', 'language', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${colors.mediumGray}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: colors.white,
                      color: colors.forestGreen
                    }}
                  >
                    {languageOptions.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.flag} {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div style={{
                  backgroundColor: colors.white,
                  padding: '20px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.mediumGray}`
                }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '15px',
                    fontWeight: '600',
                    color: colors.forestGreen,
                    marginBottom: '15px'
                  }}>
                    Timezone
                  </label>
                  <select
                    value={settings.preferences.timezone}
                    onChange={(e) => handleSelectChange('preferences', 'timezone', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${colors.mediumGray}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: colors.white,
                      color: colors.forestGreen
                    }}
                  >
                    {timezoneOptions.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  <p style={{ 
                    fontSize: '13px', 
                    color: colors.darkGray,
                    marginTop: '8px'
                  }}>
                    {timezoneOptions.find(t => t.value === settings.preferences.timezone)?.region}
                  </p>
                </div>
              </div>
              
              {/* Font Size and Question View */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                <div style={{
                  backgroundColor: colors.white,
                  padding: '20px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.mediumGray}`
                }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '15px',
                    fontWeight: '600',
                    color: colors.forestGreen,
                    marginBottom: '15px'
                  }}>
                    Font Size
                  </label>
                  <select
                    value={settings.preferences.fontSize}
                    onChange={(e) => handleSelectChange('preferences', 'fontSize', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${colors.mediumGray}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: colors.white,
                      color: colors.forestGreen
                    }}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                
                <div style={{
                  backgroundColor: colors.white,
                  padding: '20px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.mediumGray}`
                }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '15px',
                    fontWeight: '600',
                    color: colors.forestGreen,
                    marginBottom: '15px'
                  }}>
                    Question View
                  </label>
                  <select
                    value={settings.preferences.questionView}
                    onChange={(e) => handleSelectChange('preferences', 'questionView', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${colors.mediumGray}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: colors.white,
                      color: colors.forestGreen
                    }}
                  >
                    <option value="list">List View</option>
                    <option value="grid">Grid View</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Data Management Section */}
          <div style={{
            backgroundColor: colors.lightGray,
            borderRadius: '12px',
            padding: '25px',
            border: `1px solid ${colors.mediumGray}`
          }}>
            <h3 style={{ 
              fontSize: '18px',
              fontWeight: '600',
              color: colors.forestGreen,
              marginBottom: '25px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <FiDatabase />
              Data Management
            </h3>
            
            <div style={{ display: 'grid', gap: '25px' }}>
              {/* Auto-save Settings */}
              <div style={{
                backgroundColor: colors.white,
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${colors.mediumGray}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ 
                      fontSize: '15px',
                      fontWeight: '600',
                      color: colors.forestGreen,
                      marginBottom: '4px'
                    }}>
                      Auto-save Drafts
                    </div>
                    <div style={{ fontSize: '13px', color: colors.darkGray }}>
                      Automatically save questions and tests as drafts
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle('data', 'autoSave')}
                    style={{
                      width: '52px',
                      height: '28px',
                      backgroundColor: settings.data.autoSave ? colors.successGreen : colors.mediumGray,
                      border: 'none',
                      borderRadius: '14px',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '3px',
                      left: settings.data.autoSave ? '27px' : '3px',
                      width: '22px',
                      height: '22px',
                      backgroundColor: colors.white,
                      borderRadius: '50%',
                      transition: 'left 0.3s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </button>
                </div>
              </div>
              
              {/* Export Options */}
              <div style={{
                backgroundColor: colors.white,
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${colors.mediumGray}`
              }}>
                <h4 style={{ 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.forestGreen,
                  marginBottom: '15px'
                }}>
                  Export Data
                </h4>
                <p style={{ 
                  fontSize: '14px',
                  color: colors.darkGray,
                  marginBottom: '20px'
                }}>
                  Export your questions, tests, and student data
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                  {['csv', 'json', 'pdf'].map((format) => (
                    <button
                      key={format}
                      onClick={() => exportData(format)}
                      style={{
                        padding: '12px 20px',
                        backgroundColor: colors.lightGray,
                        color: colors.forestGreen,
                        border: `1px solid ${colors.mediumGray}`,
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.mediumGray;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = colors.lightGray;
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <FiDownload />
                      Export as {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Clear Cache */}
              <div style={{
                backgroundColor: colors.white,
                padding: '20px',
                borderRadius: '8px',
                border: `1px solid ${colors.mediumGray}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ 
                      fontSize: '15px',
                      fontWeight: '600',
                      color: colors.forestGreen,
                      marginBottom: '4px'
                    }}>
                      Clear Local Cache
                    </div>
                    <div style={{ fontSize: '13px', color: colors.darkGray }}>
                      Clear all locally stored data and drafts
                    </div>
                  </div>
                  <button
                    onClick={clearCache}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#FFF5F5',
                      color: colors.errorRed,
                      border: `1px solid ${colors.errorRed}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFE5E5';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFF5F5';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <FiTrash2 />
                    Clear Cache
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div style={{ 
            paddingTop: '30px',
            borderTop: `1px solid ${colors.mediumGray}`,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '20px'
          }}>
            <span style={{ 
              fontSize: '14px',
              color: colors.darkGray,
              fontStyle: 'italic'
            }}>
              Settings are automatically saved locally
            </span>
            <button
              onClick={saveSettings}
              disabled={saving}
              style={{
                padding: '14px 30px',
                backgroundColor: saving ? colors.mediumGray : colors.forestGreen,
                color: colors.white,
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                minWidth: '150px',
                opacity: saving ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!saving) {
                  e.currentTarget.style.backgroundColor = '#3a4220';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!saving) {
                  e.currentTarget.style.backgroundColor = colors.forestGreen;
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <FiSave />
              {saving ? 'Saving...' : 'Save All Settings'}
            </button>
          </div>
        </div>
      </div>
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          select:focus {
            outline: none;
            border-color: ${colors.forestGreen} !important;
            box-shadow: 0 0 0 3px rgba(75, 83, 32, 0.1);
          }
          input:focus {
            outline: none;
            border-color: ${colors.forestGreen} !important;
            box-shadow: 0 0 0 3px rgba(75, 83, 32, 0.1);
          }
        `}
      </style>
    </div>
  );
};

export default TeacherSettings;