// pages/CreateAdmin.js
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiUser, FiShield, FiCheck, FiX, FiAlertCircle, FiCheckCircle,
  FiLock, FiMail, FiUserPlus
} from 'react-icons/fi';

const CreateAdmin = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Admin data
  const [adminData, setAdminData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    name: '',
    surname: '',
    adminPermissions: [
      'VIEW_ANALYTICS',
      'MANAGE_USERS'
    ],
    active: true,
    role: 'admin'
  });
  
  // Form validation
  const [errors, setErrors] = useState({});

  const adminPermissionOptions = [
    { value: 'MANAGE_USERS', label: 'Manage Users' },
    { value: 'APPROVE_TESTS', label: 'Approve Tests' },
    { value: 'MANAGE_RESULTS', label: 'Manage Results' },
    { value: 'SYSTEM_CONFIG', label: 'System Configuration' },
    { value: 'VIEW_ANALYTICS', label: 'View Analytics' },
    { value: 'MANAGE_ADMINS', label: 'Manage Admins' }
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (!adminData.username.trim()) newErrors.username = 'Username is required';
    if (!adminData.password.trim()) newErrors.password = 'Password is required';
    if (adminData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!adminData.confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm password';
    if (adminData.password !== adminData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!adminData.email.trim()) newErrors.email = 'Email is required';
    if (!adminData.name.trim()) newErrors.name = 'Name is required';
    if (!adminData.surname.trim()) newErrors.surname = 'Surname is required';
    
    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (adminData.email && !emailRegex.test(adminData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePermissionToggle = (permission) => {
    setAdminData(prev => ({
      ...prev,
      adminPermissions: prev.adminPermissions.includes(permission)
        ? prev.adminPermissions.filter(p => p !== permission)
        : [...prev.adminPermissions, permission]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      // Clean username (remove spaces, convert to lowercase)
      const cleanedUsername = adminData.username.replace(/\s+/g, '_').toLowerCase();
      
      const response = await axios.post('http://localhost:5000/api/users', {
        username: cleanedUsername,
        password: adminData.password,
        email: adminData.email,
        name: adminData.name,
        surname: adminData.surname,
        role: 'admin',
        adminPermissions: adminData.adminPermissions,
        active: adminData.active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Admin created successfully!');
      
      // Reset form
      setAdminData({
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        name: '',
        surname: '',
        adminPermissions: ['VIEW_ANALYTICS', 'MANAGE_USERS'],
        active: true,
        role: 'admin'
      });
      
      // Navigate back after 2 seconds
      setTimeout(() => {
        navigate('/admin/users');
      }, 2000);
      
    } catch (err) {
      console.error('Error creating admin:', err);
      setError(err.response?.data?.message || 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'super_admin') {
    return (
      <div style={styles.authRequired}>
        <div style={styles.errorMessage}>
          <FiAlertCircle /> Access Denied - Super Admin access required
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <FiUserPlus /> Create New Admin
        </h1>
        <p style={styles.subtitle}>Add administrative user with specific permissions</p>
      </div>

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

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Basic Admin Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FiUser /> Admin Information
          </h3>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label>Username *</label>
              <input
                type="text"
                value={adminData.username}
                onChange={(e) => setAdminData({...adminData, username: e.target.value})}
                placeholder="admin_user"
                style={{...styles.input, ...(errors.username && styles.inputError)}}
              />
              {errors.username && <span style={styles.errorText}>{errors.username}</span>}
              <small style={styles.helpText}>No spaces allowed. Use underscores if needed.</small>
            </div>
            
            <div style={styles.formGroup}>
              <label>Email *</label>
              <input
                type="email"
                value={adminData.email}
                onChange={(e) => setAdminData({...adminData, email: e.target.value})}
                placeholder="admin@school.com"
                style={{...styles.input, ...(errors.email && styles.inputError)}}
              />
              {errors.email && <span style={styles.errorText}>{errors.email}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label>Name *</label>
              <input
                type="text"
                value={adminData.name}
                onChange={(e) => setAdminData({...adminData, name: e.target.value})}
                placeholder="John"
                style={{...styles.input, ...(errors.name && styles.inputError)}}
              />
              {errors.name && <span style={styles.errorText}>{errors.name}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label>Surname *</label>
              <input
                type="text"
                value={adminData.surname}
                onChange={(e) => setAdminData({...adminData, surname: e.target.value})}
                placeholder="Doe"
                style={{...styles.input, ...(errors.surname && styles.inputError)}}
              />
              {errors.surname && <span style={styles.errorText}>{errors.surname}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label>Password *</label>
              <input
                type="password"
                value={adminData.password}
                onChange={(e) => setAdminData({...adminData, password: e.target.value})}
                placeholder="••••••••"
                style={{...styles.input, ...(errors.password && styles.inputError)}}
              />
              {errors.password && <span style={styles.errorText}>{errors.password}</span>}
              <small style={styles.helpText}>Minimum 6 characters</small>
            </div>
            
            <div style={styles.formGroup}>
              <label>Confirm Password *</label>
              <input
                type="password"
                value={adminData.confirmPassword}
                onChange={(e) => setAdminData({...adminData, confirmPassword: e.target.value})}
                placeholder="••••••••"
                style={{...styles.input, ...(errors.confirmPassword && styles.inputError)}}
              />
              {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label>Status</label>
              <select
                value={adminData.active}
                onChange={(e) => setAdminData({...adminData, active: e.target.value === 'true'})}
                style={styles.select}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Admin Permissions */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FiShield /> Admin Permissions
          </h3>
          <p style={styles.permissionsHelp}>
            Select the permissions this admin should have. All admins can view basic analytics.
          </p>
          
          <div style={styles.permissionsGrid}>
            {adminPermissionOptions.map(permission => (
              <label key={permission.value} style={styles.permissionLabel}>
                <input
                  type="checkbox"
                  checked={adminData.adminPermissions.includes(permission.value)}
                  onChange={() => handlePermissionToggle(permission.value)}
                  style={styles.checkbox}
                />
                <div style={styles.permissionContent}>
                  <span style={styles.permissionName}>{permission.label}</span>
                  {permission.value === 'MANAGE_ADMINS' && (
                    <small style={styles.warningText}>Warning: Can manage other admins</small>
                  )}
                </div>
              </label>
            ))}
          </div>
          
          <div style={styles.selectedPermissions}>
            <h4>Selected Permissions ({adminData.adminPermissions.length})</h4>
            <div style={styles.permissionsList}>
              {adminData.adminPermissions.map(perm => (
                <span key={perm} style={styles.permissionBadge}>
                  {adminPermissionOptions.find(p => p.value === perm)?.label || perm}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div style={styles.formActions}>
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            style={styles.cancelButton}
            disabled={loading}
          >
            <FiX /> Cancel
          </button>
          <button
            type="submit"
            style={styles.submitButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <div style={styles.spinnerSmall}></div> Creating...
              </>
            ) : (
              <>
                <FiCheck /> Create Admin
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  header: {
    marginBottom: '32px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#4B5320',
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  subtitle: {
    color: '#666',
    margin: 0,
    fontSize: '16px'
  },
  authRequired: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px'
  },
  errorMessage: {
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
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
    gap: '12px',
    fontWeight: '500'
  },
  form: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  section: {
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid #E0E0E0'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 20px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px'
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
    transition: 'border-color 0.2s'
  },
  inputError: {
    borderColor: '#B22222',
    backgroundColor: '#FFF9F9'
  },
  select: {
    width: '100%',
    padding: '12px',
    border: '1px solid #D0D0D0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white'
  },
  errorText: {
    color: '#B22222',
    fontSize: '12px',
    marginTop: '4px',
    display: 'block'
  },
  helpText: {
    color: '#666',
    fontSize: '12px',
    marginTop: '4px',
    display: 'block'
  },
  permissionsHelp: {
    color: '#666',
    fontSize: '14px',
    margin: '0 0 20px 0',
    lineHeight: '1.5'
  },
  permissionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  permissionLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '16px',
    border: '2px solid #E0E0E0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  checkbox: {
    marginRight: '12px',
    marginTop: '4px'
  },
  permissionContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1
  },
  permissionName: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#333'
  },
  warningText: {
    color: '#B22222',
    fontSize: '12px'
  },
  selectedPermissions: {
    backgroundColor: '#F8F9FA',
    padding: '20px',
    borderRadius: '8px'
  },
  permissionsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px'
  },
  permissionBadge: {
    padding: '6px 12px',
    backgroundColor: '#D4A017',
    color: '#4B5320',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '500'
  },
  spinnerSmall: {
    width: '16px',
    height: '16px',
    border: '2px solid #f3f3f3',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px',
    display: 'inline-block'
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
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  submitButton: {
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
  }
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .permissionLabel input[type="checkbox"]:checked + div {
    border-color: #4B5320;
  }
  
  .permissionLabel input[type="checkbox"]:checked {
    accent-color: #4B5320;
  }
`;
document.head.appendChild(styleSheet);

export default CreateAdmin;