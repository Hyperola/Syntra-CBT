// pages/CreateAdmin.js - UPDATED WITH SINGLE REQUEST PROFILE IMAGE UPLOAD
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiUser, FiShield, FiCheck, FiX, FiAlertCircle, FiCheckCircle,
  FiLock, FiMail, FiUserPlus, FiUpload, FiImage, FiLoader, FiXCircle
} from 'react-icons/fi';

const CreateAdmin = () => {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Admin data - UPDATED TO MATCH USER MODEL STRUCTURE
  const [adminData, setAdminData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    firstName: '',
    middleName: '',
    lastName: '',
    adminPermissions: [
      'VIEW_ANALYTICS',
      'MANAGE_USERS'
    ],
    active: true,
    role: 'admin',
    address: '',
    phoneNumber: '',
    sex: '',
  });
  
  // Image upload state
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
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

  const sexOptions = [
    { value: '', label: 'Select gender' },
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ];

  // Check if user is super admin
  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      navigate('/admin/users');
    }
  }, [user, navigate]);

  // Helper function to convert image to base64
  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Basic validation
    if (!adminData.username.trim()) newErrors.username = 'Username is required';
    if (!adminData.password.trim()) newErrors.password = 'Password is required';
    if (adminData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!adminData.confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm password';
    if (adminData.password !== adminData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!adminData.email.trim()) newErrors.email = 'Email is required';
    if (!adminData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!adminData.lastName.trim()) newErrors.lastName = 'Last name is required';
    
    // Username format validation
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(adminData.username.replace(/\s+/g, '_'))) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores. No spaces allowed.';
    }
    
    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (adminData.email && !emailRegex.test(adminData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Phone number validation (if provided)
    if (adminData.phoneNumber && !/^\+?[\d\s\-()]+$/.test(adminData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
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
    try {
      // Create preview
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
      const authToken = token || localStorage.getItem('token');
      
      if (!authToken) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      // Clean username
      const cleanedUsername = cleanUsername(adminData.username);
      
      // Convert image to base64 if exists
      let profileImageBase64 = null;
      if (profileImage) {
        try {
          profileImageBase64 = await convertImageToBase64(profileImage);
          console.log('✅ Image converted to base64, length:', profileImageBase64.length);
        } catch (imageErr) {
          console.warn('⚠️ Could not convert image to base64:', imageErr);
          // Continue without image - don't fail the whole request
        }
      }
      
      // Build admin data matching User model structure - INCLUDING profileImage as base64
      const adminDataToSend = {
        username: cleanedUsername,
        password: adminData.password,
        email: adminData.email.trim().toLowerCase(),
        name: adminData.firstName.trim(), // For backward compatibility
        surname: adminData.lastName.trim(), // For backward compatibility
        firstName: adminData.firstName.trim(),
        middleName: adminData.middleName?.trim() || '',
        lastName: adminData.lastName.trim(),
        role: 'admin',
        adminPermissions: adminData.adminPermissions,
        active: adminData.active,
        address: adminData.address?.trim() || undefined,
        phoneNumber: adminData.phoneNumber?.trim() || undefined,
        sex: adminData.sex || undefined,
        createdBy: user.id,
        // Add profile image as base64 if available
        ...(profileImageBase64 && { profileImage: profileImageBase64 })
      };
      
      console.log('📤 Creating admin with data (SINGLE REQUEST):', {
        ...adminDataToSend,
        password: '***',
        profileImage: profileImageBase64 ? 'BASE64_IMAGE_INCLUDED' : 'NO_IMAGE',
        adminPermissions: adminDataToSend.adminPermissions
      });
      
      // SINGLE REQUEST: Create admin with profile image in one request
      const response = await axios.post('http://localhost:5000/api/users', 
        adminDataToSend, 
        {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      console.log('✅ Admin creation response:', {
        success: response.data.success,
        userId: response.data.user?._id || response.data.data?._id
      });
      
      if (response.data.success) {
        setSuccess('Admin created successfully with profile image! Redirecting...');
        
        // Reset form
        setAdminData({
          username: '',
          password: '',
          confirmPassword: '',
          email: '',
          firstName: '',
          middleName: '',
          lastName: '',
          adminPermissions: ['VIEW_ANALYTICS', 'MANAGE_USERS'],
          active: true,
          role: 'admin',
          address: '',
          phoneNumber: '',
          sex: '',
        });
        setProfileImage(null);
        setImagePreview(null);
        
        // Navigate back after 2 seconds
        setTimeout(() => {
          navigate('/admin/users');
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to create admin');
      }
      
    } catch (err) {
      console.error('❌ Error creating admin:', err);
      
      if (err.response) {
        console.error('📡 Response error details:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
        
        if (err.response.status === 400) {
          const errorMsg = err.response.data.message || 'Validation error. Please check the form.';
          setError(errorMsg);
          
          // Handle validation errors
          if (err.response.data.errors) {
            const validationErrors = {};
            err.response.data.errors.forEach(errorMsg => {
              if (errorMsg.includes('Username')) validationErrors.username = errorMsg;
              if (errorMsg.includes('Email')) validationErrors.email = errorMsg;
              if (errorMsg.includes('Password')) validationErrors.password = errorMsg;
              if (errorMsg.includes('First name')) validationErrors.firstName = errorMsg;
              if (errorMsg.includes('Last name')) validationErrors.lastName = errorMsg;
              if (errorMsg.includes('profile image')) validationErrors.profileImage = errorMsg;
            });
            setErrors(validationErrors);
          }
        } else if (err.response.status === 401) {
          setError('Authentication failed. Please log in again.');
          setTimeout(() => navigate('/login'), 2000);
        } else if (err.response.status === 403) {
          setError('Permission denied. You do not have access to create admins.');
        } else if (err.response.status === 409) {
          setError('User with this username or email already exists.');
        } else {
          setError(err.response.data?.message || `Server error: ${err.response.status}`);
        }
      } else if (err.request) {
        console.error('🌐 Network error details:', err.request);
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAdminData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  if (!user || user.role !== 'super_admin') {
    return (
      <div style={styles.authRequired}>
        <div style={styles.errorMessage}>
          <FiAlertCircle /> Access Denied - Super Admin access required
        </div>
        <button
          onClick={() => navigate('/admin/users')}
          style={styles.backButton}
        >
          <FiX /> Back to Users
        </button>
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
        <button
          onClick={() => navigate('/admin/users')}
          style={styles.backButton}
        >
          <FiX /> Back to Users
        </button>
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
        {/* Profile Image Upload Section */}
        <div style={styles.imageUploadSection}>
          <h3 style={styles.sectionTitle}>Profile Image (Optional)</h3>
          <p style={styles.imageUploadHelp}>
            Image will be sent as base64 in the same request with admin data.
          </p>
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
                disabled={uploadingImage || loading}
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
                  disabled={uploadingImage || loading}
                >
                  <FiXCircle /> Remove
                </button>
              )}
              <div style={styles.imageUploadInfo}>
                <small>JPG, PNG, GIF, WebP up to 5MB</small>
                <br />
                <small>Image will be saved with admin creation</small>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Admin Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FiUser /> Admin Information
          </h3>
          
          <div style={styles.formGrid}>
            {/* Username */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Username <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="username"
                value={adminData.username}
                onChange={handleInputChange}
                placeholder="admin_user"
                style={{...styles.input, ...(errors.username && styles.inputError)}}
                disabled={loading}
                autoComplete="new-username"
              />
              {errors.username && <span style={styles.errorText}>{errors.username}</span>}
              <small style={styles.helpText}>No spaces allowed. Use underscores if needed.</small>
            </div>
            
            {/* Email */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Email <span style={styles.required}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={adminData.email}
                onChange={handleInputChange}
                placeholder="admin@school.com"
                style={{...styles.input, ...(errors.email && styles.inputError)}}
                disabled={loading}
                autoComplete="email"
              />
              {errors.email && <span style={styles.errorText}>{errors.email}</span>}
            </div>
            
            {/* First Name */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                First Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={adminData.firstName}
                onChange={handleInputChange}
                placeholder="John"
                style={{...styles.input, ...(errors.firstName && styles.inputError)}}
                disabled={loading}
                autoComplete="given-name"
              />
              {errors.firstName && <span style={styles.errorText}>{errors.firstName}</span>}
            </div>
            
            {/* Middle Name */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Middle Name</label>
              <input
                type="text"
                name="middleName"
                value={adminData.middleName}
                onChange={handleInputChange}
                placeholder="Michael (optional)"
                style={styles.input}
                disabled={loading}
                autoComplete="additional-name"
              />
            </div>
            
            {/* Last Name */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Last Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={adminData.lastName}
                onChange={handleInputChange}
                placeholder="Doe"
                style={{...styles.input, ...(errors.lastName && styles.inputError)}}
                disabled={loading}
                autoComplete="family-name"
              />
              {errors.lastName && <span style={styles.errorText}>{errors.lastName}</span>}
            </div>
            
            {/* Password */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Password <span style={styles.required}>*</span>
              </label>
              <input
                type="password"
                name="password"
                value={adminData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                style={{...styles.input, ...(errors.password && styles.inputError)}}
                disabled={loading}
                autoComplete="new-password"
                minLength="6"
              />
              {errors.password && <span style={styles.errorText}>{errors.password}</span>}
              <small style={styles.helpText}>Minimum 6 characters</small>
            </div>
            
            {/* Confirm Password */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Confirm Password <span style={styles.required}>*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={adminData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••••"
                style={{...styles.input, ...(errors.confirmPassword && styles.inputError)}}
                disabled={loading}
                autoComplete="new-password"
              />
              {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
            </div>
            
            {/* Phone Number */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Phone Number</label>
              <input
                type="text"
                name="phoneNumber"
                value={adminData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+1234567890"
                style={{...styles.input, ...(errors.phoneNumber && styles.inputError)}}
                disabled={loading}
                autoComplete="tel"
              />
              {errors.phoneNumber && <span style={styles.errorText}>{errors.phoneNumber}</span>}
            </div>
            
            {/* Gender */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Gender</label>
              <select
                name="sex"
                value={adminData.sex}
                onChange={handleInputChange}
                style={styles.select}
                disabled={loading}
              >
                {sexOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Address */}
            <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
              <label style={styles.formLabel}>Address</label>
              <textarea
                name="address"
                value={adminData.address}
                onChange={handleInputChange}
                placeholder="Enter address"
                style={styles.textarea}
                disabled={loading}
                rows={3}
                autoComplete="street-address"
              />
            </div>
            
            {/* Status */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Status</label>
              <select
                name="active"
                value={adminData.active}
                onChange={handleInputChange}
                style={styles.select}
                disabled={loading}
              >
                <option value={true}>Active</option>
                <option value={false}>Inactive</option>
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
              <label 
                key={permission.value} 
                style={{
                  ...styles.permissionLabel,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={adminData.adminPermissions.includes(permission.value)}
                  onChange={() => !loading && handlePermissionToggle(permission.value)}
                  style={styles.checkbox}
                  disabled={loading}
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
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: '#F5F7FA',
    minHeight: '100vh'
  },
  header: {
    marginBottom: '32px',
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    position: 'relative'
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
    color: '#718096',
    margin: 0,
    fontSize: '16px'
  },
  backButton: {
    position: 'absolute',
    top: '24px',
    right: '24px',
    padding: '8px 16px',
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
    '&:hover': {
      backgroundColor: '#4A5568',
      transform: 'translateY(-2px)'
    }
  },
  authRequired: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
    gap: '20px'
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
    borderBottom: '2px solid #D69E2E',
    paddingBottom: '8px'
  },
  // Image Upload Styles
  imageUploadSection: {
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: '#F5F7FA',
    borderRadius: '8px',
    border: '1px solid #E2E8F0'
  },
  imageUploadHelp: {
    color: '#718096',
    fontSize: '14px',
    marginBottom: '16px',
    fontStyle: 'italic'
  },
  imageUploadContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    '@media (max-width: 768px)': {
      flexDirection: 'column'
    }
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
    border: '2px dashed #CBD5E0',
    flexShrink: 0
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
    width: 'fit-content',
    '&:hover:not(:disabled)': {
      backgroundColor: '#2C5282',
      transform: 'translateY(-2px)'
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
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
    width: 'fit-content',
    '&:hover:not(:disabled)': {
      backgroundColor: '#FEB2B2',
      transform: 'translateY(-2px)'
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  imageUploadInfo: {
    color: '#718096',
    fontSize: '12px',
    lineHeight: '1.5'
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
    transition: 'border-color 0.2s, box-shadow 0.2s',
    backgroundColor: 'white',
    boxSizing: 'border-box',
    color: '#2D3748',
    '&:focus': {
      outline: 'none',
      borderColor: '#3182CE',
      boxShadow: '0 0 0 3px rgba(49, 130, 206, 0.1)'
    },
    '&:disabled': {
      backgroundColor: '#F5F7FA',
      cursor: 'not-allowed'
    }
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '4px',
    fontSize: '14px',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    backgroundColor: 'white',
    boxSizing: 'border-box',
    color: '#2D3748',
    fontFamily: 'inherit',
    resize: 'vertical',
    '&:focus': {
      outline: 'none',
      borderColor: '#3182CE',
      boxShadow: '0 0 0 3px rgba(49, 130, 206, 0.1)'
    },
    '&:disabled': {
      backgroundColor: '#F5F7FA',
      cursor: 'not-allowed'
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
    cursor: 'pointer',
    color: '#2D3748',
    '&:focus': {
      outline: 'none',
      borderColor: '#3182CE',
      boxShadow: '0 0 0 3px rgba(49, 130, 206, 0.1)'
    },
    '&:disabled': {
      backgroundColor: '#F5F7FA',
      cursor: 'not-allowed'
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
  permissionsHelp: {
    color: '#718096',
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
    border: '2px solid #E2E8F0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#2D3748',
    '&:hover': {
      borderColor: '#3182CE',
      backgroundColor: '#F7FAFC'
    }
  },
  checkbox: {
    marginRight: '12px',
    marginTop: '4px',
    cursor: 'pointer',
    accentColor: '#3182CE'
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
    color: '#2D3748'
  },
  warningText: {
    color: '#E53E3E',
    fontSize: '12px'
  },
  selectedPermissions: {
    backgroundColor: '#F5F7FA',
    padding: '20px',
    borderRadius: '8px',
    marginTop: '20px'
  },
  permissionsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '12px'
  },
  permissionBadge: {
    padding: '6px 12px',
    backgroundColor: '#D69E2E',
    color: '#4B5320',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block'
  },
  spinnerSmall: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
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
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #E2E8F0'
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
    '&:hover:not(:disabled)': {
      backgroundColor: '#B7791F',
      transform: 'translateY(-2px)',
      color: 'white'
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
      backgroundColor: '#D69E2E'
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
  
  .permissionLabel input[type="checkbox"]:checked + div {
    border-color: #3182CE;
  }
  
  .permissionLabel input[type="checkbox"]:checked {
    accent-color: #3182CE;
  }
  
  input:disabled, select:disabled, textarea:disabled {
    background-color: #F5F7FA;
    cursor: not-allowed;
  }
  
  @media (max-width: 768px) {
    .imageUploadContainer {
      flex-direction: column;
      text-align: center;
    }
    
    .imagePreviewArea {
      margin: 0 auto;
    }
    
    .formActions {
      flex-direction: column;
    }
    
    .submitButton, .cancelButton {
      width: 100%;
      justify-content: center;
    }
    
    .permissionsGrid {
      grid-template-columns: 1fr;
    }
    
    .backButton {
      position: relative;
      top: auto;
      right: auto;
      margin-top: 16px;
    }
    
    .formGrid {
      grid-template-columns: 1fr;
    }
  }
`;
document.head.appendChild(styleSheet);

export default CreateAdmin;