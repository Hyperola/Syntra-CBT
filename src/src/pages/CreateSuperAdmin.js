// pages/CreateSuperAdmin.js - UPDATED VERSION FOR firstName/lastName
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiUser, FiShield, FiCheck, FiX, FiAlertCircle, FiCheckCircle,
  FiLock, FiMail, FiStar, FiAlertTriangle, FiUpload, FiImage, FiLoader, FiXCircle
} from 'react-icons/fi';

const CreateSuperAdmin = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  
  // Super Admin data - MATCHING BACKEND EXPECTATIONS
  const [superAdminData, setSuperAdminData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    firstName: '',
    middleName: '',  // Added middleName field
    lastName: '',
    role: 'super_admin',
    active: true,
    profileImage: null
  });
  
  // Image upload state
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form validation
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    // Basic validation
    if (!superAdminData.username.trim()) newErrors.username = 'Username is required';
    if (!superAdminData.password.trim()) newErrors.password = 'Password is required';
    if (superAdminData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!superAdminData.confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm password';
    if (superAdminData.password !== superAdminData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!superAdminData.email.trim()) newErrors.email = 'Email is required';
    if (!superAdminData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!superAdminData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (confirmation !== 'I UNDERSTAND') newErrors.confirmation = 'Please type the confirmation text exactly';
    
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(superAdminData.username.replace(/\s+/g, '_'))) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores. No spaces allowed.';
    }
    
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (superAdminData.email && !emailRegex.test(superAdminData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;
    
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, GIF, WebP).');
      return;
    }
    
    if (file.size > maxSize) {
      setError('Image size must be less than 5MB.');
      return;
    }
    
    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      setProfileImage(file);
    } catch (err) {
      setError('Failed to process image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfileImage = () => {
    setProfileImage(null);
    setImagePreview(null);
    setSuperAdminData(prev => ({ ...prev, profileImage: null }));
  };

  const cleanUsername = (username) => {
    if (!username) return '';
    const cleaned = username.replace(/\s+/g, '_').toLowerCase();
    return cleaned.replace(/[^a-zA-Z0-9_]/g, '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const token = localStorage.getItem('token');
      
      // Clean username
      const cleanedUsername = cleanUsername(superAdminData.username);
      
      // Build super admin data - MATCHING BACKEND EXPECTATIONS
      const superAdminDataToSend = {
        username: cleanedUsername,
        password: superAdminData.password,
        email: superAdminData.email.trim().toLowerCase(),
        firstName: superAdminData.firstName.trim(),
        lastName: superAdminData.lastName.trim(),
        middleName: superAdminData.middleName.trim() || undefined, // Optional field
        role: 'super_admin',
        active: superAdminData.active
      };
      
      console.log('📤 Creating super admin with data:', JSON.stringify(superAdminDataToSend, null, 2));
      
      // Step 1: Create the super admin
      const response = await axios.post('http://localhost:5000/api/users', 
        superAdminDataToSend, 
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      console.log('✅ API Response:', response.data);
      
      const superAdminId = response.data.user?._id || response.data.data?._id || response.data._id;
      
      // Step 2: Upload profile image if selected
      if (profileImage && superAdminId) {
        const formDataImage = new FormData();
        formDataImage.append('profileImage', profileImage);
        
        try {
          await axios.post(
            `http://localhost:5000/api/users/${superAdminId}/upload-profile-image`,
            formDataImage,
            {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              },
              timeout: 15000
            }
          );
          console.log('✅ Profile image uploaded successfully');
        } catch (imageErr) {
          console.warn('⚠️ Could not upload profile image:', imageErr.response?.data || imageErr.message);
          // Continue even if image upload fails
        }
      }
      
      setSuccess('Super Admin created successfully! Redirecting...');
      
      // Reset form
      setSuperAdminData({
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        firstName: '',
        middleName: '',
        lastName: '',
        role: 'super_admin',
        active: true,
        profileImage: null
      });
      setConfirmation('');
      setProfileImage(null);
      setImagePreview(null);
      
      // Navigate back after 2 seconds
      setTimeout(() => {
        navigate('/admin/users');
      }, 2000);
      
    } catch (err) {
      console.error('❌ Error creating super admin:', err);
      console.error('❌ Error response:', err.response?.data);
      
      let errorMessage = 'Failed to create super admin';
      
      if (err.response?.data) {
        if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
        if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          errorMessage = `${errorMessage}: ${err.response.data.errors.join(', ')}`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Update field handler for cleaner code
  const handleFieldChange = (field, value) => {
    setSuperAdminData(prev => ({
      ...prev,
      [field]: value
    }));
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
          <FiAlertCircle /> <strong>Error:</strong> {error}
        </div>
      )}
      
      {success && (
        <div style={styles.successMessage}>
          <FiCheckCircle /> {success}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Profile Image Upload Section */}
        <div style={styles.imageUploadSection}>
          <h3 style={styles.sectionTitle}>Profile Image</h3>
          <div style={styles.imageUploadContainer}>
            <div style={styles.imagePreviewArea}>
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" style={styles.imagePreview} />
              ) : (
                <div style={styles.imagePlaceholder}>
                  <FiImage size={40} color="#718096" />
                  <span style={styles.placeholderText}>No Image</span>
                </div>
              )}
            </div>
            <div style={styles.imageUploadControls}>
              <input
                type="file"
                id="profileImage"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={(e) => handleImageUpload(e.target.files[0])}
                style={{ display: 'none' }}
                disabled={uploadingImage}
              />
              <label htmlFor="profileImage" style={styles.uploadButton}>
                {uploadingImage ? (
                  <>
                    <FiLoader style={{animation: 'spin 1s linear infinite'}} />
                    Uploading...
                  </>
                ) : imagePreview ? (
                  <>
                    <FiUpload /> Change Photo
                  </>
                ) : (
                  <>
                    <FiUpload /> Upload Photo
                  </>
                )}
              </label>
              {imagePreview && (
                <button
                  type="button"
                  onClick={removeProfileImage}
                  style={styles.removeImageButton}
                  disabled={uploadingImage}
                >
                  <FiXCircle /> Remove
                </button>
              )}
              <div style={styles.imageUploadInfo}>
                <small>JPG, PNG, GIF, WebP up to 5MB</small>
              </div>
            </div>
          </div>
        </div>

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
              <label style={styles.formLabel}>
                Username <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={superAdminData.username}
                onChange={(e) => handleFieldChange('username', e.target.value)}
                placeholder="super_admin"
                style={{...styles.input, ...(errors.username && styles.inputError)}}
              />
              {errors.username && <span style={styles.errorText}>{errors.username}</span>}
              <small style={styles.helpText}>No spaces allowed. Use underscores if needed.</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Email <span style={styles.required}>*</span>
              </label>
              <input
                type="email"
                value={superAdminData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="superadmin@school.com"
                style={{...styles.input, ...(errors.email && styles.inputError)}}
              />
              {errors.email && <span style={styles.errorText}>{errors.email}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                First Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={superAdminData.firstName}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                placeholder="Ibrahim"
                style={{...styles.input, ...(errors.firstName && styles.inputError)}}
              />
              {errors.firstName && <span style={styles.errorText}>{errors.firstName}</span>}
              <small style={styles.helpText}>First name is required</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Middle Name
              </label>
              <input
                type="text"
                value={superAdminData.middleName}
                onChange={(e) => handleFieldChange('middleName', e.target.value)}
                placeholder="(Optional)"
                style={styles.input}
              />
              <small style={styles.helpText}>Optional middle name</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Last Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={superAdminData.lastName}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                placeholder="Amao"
                style={{...styles.input, ...(errors.lastName && styles.inputError)}}
              />
              {errors.lastName && <span style={styles.errorText}>{errors.lastName}</span>}
              <small style={styles.helpText}>Last name is required</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Password <span style={styles.required}>*</span>
              </label>
              <input
                type="password"
                value={superAdminData.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                placeholder="••••••••"
                style={{...styles.input, ...(errors.password && styles.inputError)}}
              />
              {errors.password && <span style={styles.errorText}>{errors.password}</span>}
              <small style={styles.helpText}>Minimum 6 characters</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Confirm Password <span style={styles.required}>*</span>
              </label>
              <input
                type="password"
                value={superAdminData.confirmPassword}
                onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                placeholder="••••••••"
                style={{...styles.input, ...(errors.confirmPassword && styles.inputError)}}
              />
              {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Status</label>
              <select
                value={superAdminData.active}
                onChange={(e) => handleFieldChange('active', e.target.value === 'true')}
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
              <label style={styles.formLabel}>
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
            disabled={loading || uploadingImage}
          >
            <FiX /> Cancel
          </button>
          <button
            type="submit"
            style={styles.submitButton}
            disabled={loading || uploadingImage}
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
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: '#F5F7FA',
    minHeight: '100vh'
  },
  header: {
    marginBottom: '32px',
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#E53E3E',
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  subtitle: {
    color: '#718096',
    margin: 0,
    fontSize: '16px'
  },
  authRequired: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
    backgroundColor: '#F5F7FA'
  },
  errorMessage: {
    backgroundColor: '#FED7D7',
    color: '#9B2C2C',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
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
    gap: '12px',
    fontWeight: '500',
    borderLeft: '4px solid #38A169'
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
    borderBottom: '1px solid #E2E8F0'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2D3748',
    margin: '0 0 20px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '2px solid #E53E3E',
    paddingBottom: '8px'
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
  // Image Upload Styles
  imageUploadSection: {
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: '#F5F7FA',
    borderRadius: '8px',
    border: '1px solid #E2E8F0'
  },
  imageUploadContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  imagePreviewArea: {
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    backgroundColor: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '2px dashed #CBD5E0'
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  imagePlaceholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  placeholderText: {
    fontSize: '12px',
    color: '#718096'
  },
  imageUploadControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    flex: 1
  },
  uploadButton: {
    padding: '10px 20px',
    backgroundColor: '#3182CE',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'center',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#2C5282',
      transform: 'translateY(-2px)'
    }
  },
  removeImageButton: {
    padding: '10px 20px',
    backgroundColor: '#FED7D7',
    color: '#9B2C2C',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'center',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#FEB2B2',
      transform: 'translateY(-2px)'
    }
  },
  imageUploadInfo: {
    color: '#718096',
    fontSize: '12px',
    textAlign: 'center'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  formLabel: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#2D3748'
  },
  required: {
    color: '#E53E3E',
    marginLeft: '2px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '4px',
    fontSize: '14px',
    transition: 'border-color 0.2s',
    backgroundColor: 'white',
    color: '#2D3748',
    '&:focus': {
      outline: 'none',
      borderColor: '#3182CE',
      boxShadow: '0 0 0 3px rgba(49, 130, 206, 0.1)'
    }
  },
  inputError: {
    borderColor: '#E53E3E',
    backgroundColor: '#FFF5F5'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#2D3748',
    cursor: 'pointer',
    '&:focus': {
      outline: 'none',
      borderColor: '#3182CE',
      boxShadow: '0 0 0 3px rgba(49, 130, 206, 0.1)'
    }
  },
  errorText: {
    color: '#E53E3E',
    fontSize: '12px',
    marginTop: '4px',
    display: 'block'
  },
  helpText: {
    color: '#718096',
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
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    transition: 'all 0.2s',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    }
  },
  privilegeIcon: {
    fontSize: '32px',
    color: '#E53E3E',
    marginBottom: '12px'
  },
  confirmationWarning: {
    backgroundColor: '#FFF5F5',
    border: '1px solid #FED7D7',
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
    backgroundColor: '#718096',
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
    '&:hover:not(:disabled)': {
      backgroundColor: '#4A5568',
      transform: 'translateY(-2px)'
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  submitButton: {
    padding: '12px 24px',
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
    '&:hover:not(:disabled)': {
      backgroundColor: '#C53030',
      transform: 'translateY(-2px)'
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  }
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @media (max-width: 768px) {
    .imageUploadContainer {
      flex-direction: column;
      text-align: center;
    }
    
    .imagePreviewArea {
      margin: 0 auto;
    }
    
    .privilegesGrid {
      grid-template-columns: 1fr;
    }
    
    .formActions {
      flex-direction: column;
    }
    
    .submitButton, .cancelButton {
      width: 100%;
      justify-content: center;
    }
  }
`;
document.head.appendChild(styleSheet);

export default CreateSuperAdmin;