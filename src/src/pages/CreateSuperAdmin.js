// pages/CreateSuperAdmin.js
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiUser, FiShield, FiCheck, FiX, FiAlertCircle, FiCheckCircle,
  FiLock, FiMail, FiStar, FiAlertTriangle
} from 'react-icons/fi';

const CreateSuperAdmin = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  
  // Super Admin data
  const [superAdminData, setSuperAdminData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    name: '',
    surname: '',
    role: 'super_admin',
    active: true
  });
  
  // Form validation
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!superAdminData.username.trim()) newErrors.username = 'Username is required';
    if (!superAdminData.password.trim()) newErrors.password = 'Password is required';
    if (superAdminData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (!superAdminData.confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm password';
    if (superAdminData.password !== superAdminData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!superAdminData.email.trim()) newErrors.email = 'Email is required';
    if (!superAdminData.name.trim()) newErrors.name = 'Name is required';
    if (!superAdminData.surname.trim()) newErrors.surname = 'Surname is required';
    if (confirmation !== 'I UNDERSTAND') newErrors.confirmation = 'Please type the confirmation text exactly';
    
    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (superAdminData.email && !emailRegex.test(superAdminData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      const cleanedUsername = superAdminData.username.replace(/\s+/g, '_').toLowerCase();
      
      const response = await axios.post('http://localhost:5000/api/users', {
        username: cleanedUsername,
        password: superAdminData.password,
        email: superAdminData.email,
        name: superAdminData.name,
        surname: superAdminData.surname,
        role: 'super_admin',
        active: superAdminData.active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Super Admin created successfully!');
      
      // Reset form
      setSuperAdminData({
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        name: '',
        surname: '',
        role: 'super_admin',
        active: true
      });
      setConfirmation('');
      
      // Navigate back after 2 seconds
      setTimeout(() => {
        navigate('/admin/users');
      }, 2000);
      
    } catch (err) {
      console.error('Error creating super admin:', err);
      setError(err.response?.data?.message || 'Failed to create super admin');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'super_admin') {
    return (
      <div style={styles.authRequired}>
        <div style={styles.errorMessage}>
          <FiAlertCircle /> Access Denied - Only existing Super Admins can create new Super Admins
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <FiStar /> Create New Super Admin
        </h1>
        <p style={styles.subtitle}>Create a user with full system access and control</p>
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
        {/* Super Admin Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FiUser /> Super Admin Information
          </h3>
          
          <div style={styles.warningBanner}>
            <FiAlertTriangle />
            <div>
              <strong>Super Admin Warning</strong>
              <p>Super Admins have complete access to ALL system functions and data. Use with extreme caution.</p>
            </div>
          </div>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label>Username *</label>
              <input
                type="text"
                value={superAdminData.username}
                onChange={(e) => setSuperAdminData({...superAdminData, username: e.target.value})}
                placeholder="super_admin"
                style={{...styles.input, ...(errors.username && styles.inputError)}}
              />
              {errors.username && <span style={styles.errorText}>{errors.username}</span>}
              <small style={styles.helpText}>No spaces allowed. Use underscores if needed.</small>
            </div>
            
            <div style={styles.formGroup}>
              <label>Email *</label>
              <input
                type="email"
                value={superAdminData.email}
                onChange={(e) => setSuperAdminData({...superAdminData, email: e.target.value})}
                placeholder="superadmin@school.com"
                style={{...styles.input, ...(errors.email && styles.inputError)}}
              />
              {errors.email && <span style={styles.errorText}>{errors.email}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label>Name *</label>
              <input
                type="text"
                value={superAdminData.name}
                onChange={(e) => setSuperAdminData({...superAdminData, name: e.target.value})}
                placeholder="John"
                style={{...styles.input, ...(errors.name && styles.inputError)}}
              />
              {errors.name && <span style={styles.errorText}>{errors.name}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label>Surname *</label>
              <input
                type="text"
                value={superAdminData.surname}
                onChange={(e) => setSuperAdminData({...superAdminData, surname: e.target.value})}
                placeholder="Doe"
                style={{...styles.input, ...(errors.surname && styles.inputError)}}
              />
              {errors.surname && <span style={styles.errorText}>{errors.surname}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label>Password *</label>
              <input
                type="password"
                value={superAdminData.password}
                onChange={(e) => setSuperAdminData({...superAdminData, password: e.target.value})}
                placeholder="••••••••"
                style={{...styles.input, ...(errors.password && styles.inputError)}}
              />
              {errors.password && <span style={styles.errorText}>{errors.password}</span>}
              <small style={styles.helpText}>Minimum 8 characters</small>
            </div>
            
            <div style={styles.formGroup}>
              <label>Confirm Password *</label>
              <input
                type="password"
                value={superAdminData.confirmPassword}
                onChange={(e) => setSuperAdminData({...superAdminData, confirmPassword: e.target.value})}
                placeholder="••••••••"
                style={{...styles.input, ...(errors.confirmPassword && styles.inputError)}}
              />
              {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label>Status</label>
              <select
                value={superAdminData.active}
                onChange={(e) => setSuperAdminData({...superAdminData, active: e.target.value === 'true'})}
                style={styles.select}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Super Admin Privileges */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FiShield /> Super Admin Privileges
          </h3>
          
          <div style={styles.privilegesGrid}>
            <div style={styles.privilegeCard}>
              <div style={styles.privilegeIcon}>
                <FiShield />
              </div>
              <h4>Full System Access</h4>
              <p>Unrestricted access to all modules, data, and system settings</p>
            </div>
            
            <div style={styles.privilegeCard}>
              <div style={styles.privilegeIcon}>
                <FiUser />
              </div>
              <h4>User Management</h4>
              <p>Create, edit, and delete any user including other admins</p>
            </div>
            
            <div style={styles.privilegeCard}>
              <div style={styles.privilegeIcon}>
                <FiLock />
              </div>
              <h4>Security Override</h4>
              <p>Bypass all permission checks and security restrictions</p>
            </div>
          </div>
        </div>

        {/* Confirmation */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FiAlertTriangle /> Final Confirmation
          </h3>
          
          <div style={styles.confirmationWarning}>
            <p>
              <strong>IMPORTANT:</strong> Creating a Super Admin grants them complete control over the system. 
              This action cannot be undone. Only trusted individuals should be given this level of access.
            </p>
            
            <div style={styles.confirmationInput}>
              <label>
                Type <strong>"I UNDERSTAND"</strong> to confirm:
                <input
                  type="text"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="I UNDERSTAND"
                  style={{...styles.input, ...(errors.confirmation && styles.inputError)}}
                />
              </label>
              {errors.confirmation && <span style={styles.errorText}>{errors.confirmation}</span>}
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
                <FiCheck /> Create Super Admin
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
    color: '#B22222',
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
    color: '#B22222',
    margin: '0 0 20px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  warningBanner: {
    backgroundColor: '#FFF3CD',
    border: '1px solid #FFEAA7',
    color: '#856404',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
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
  privilegesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  privilegeCard: {
    backgroundColor: '#F8F9FA',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center'
  },
  privilegeIcon: {
    fontSize: '32px',
    color: '#B22222',
    marginBottom: '12px'
  },
  confirmationWarning: {
    backgroundColor: '#FFF3F3',
    border: '1px solid #FFCCCC',
    padding: '20px',
    borderRadius: '8px'
  },
  confirmationInput: {
    marginTop: '20px'
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
    backgroundColor: '#B22222',
    color: 'white',
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
`;
document.head.appendChild(styleSheet);

export default CreateSuperAdmin;