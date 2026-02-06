// pages/CreateParent.js - FINAL VERSION WITH ALL FIXES
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiUser, FiUsers, FiCheck, FiX, FiPlus, FiTrash2,
  FiSearch, FiAlertCircle, FiCheckCircle, FiLock,
  FiMail, FiPhone, FiMapPin, FiLoader, FiAlertTriangle,
  FiXCircle, FiSave, FiUserPlus, FiHome, FiKey, FiImage,
  FiUpload, FiEye, FiEyeOff, FiBell, FiCalendar, FiRefreshCw
} from 'react-icons/fi';

const CreateParent = () => {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Parent basic info
  const [parentData, setParentData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phoneNumber: '',
    address: '',
    password: '',
    confirmPassword: '',
    active: true,
    role: 'parent',
    notificationPreferences: {
      email: true,
      sms: false,
      push: true,
      frequency: 'immediate'
    }
  });
  
  // Profile image state
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Children assignment state
  const [availableStudents, setAvailableStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedChildren, setSelectedChildren] = useState([]);
  const [searchStudent, setSearchStudent] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // Form validation
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    fetchAvailableStudents();
  }, []);

  // Convert image to base64
  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Handle image upload
  const handleImageUpload = async (file) => {
    if (!file) return;
    
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

  // Fetch all available students
  const fetchAvailableStudents = async () => {
    setLoadingStudents(true);
    try {
      const authToken = token || localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/users?role=student&active=true&limit=1000', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      let students = [];
      if (response.data && Array.isArray(response.data.users)) {
        students = response.data.users;
      } else if (response.data && response.data.success && Array.isArray(response.data.data)) {
        students = response.data.data;
      } else if (Array.isArray(response.data)) {
        students = response.data;
      }
      
      console.log('📊 Raw students data:', students.length, 'students found');
      
      // Process students with proper class name handling
      const processedStudents = await Promise.all(students.map(async (student) => {
        // Get current class name from student data
        let className = student.className || 'Unassigned';
        
        // If class is populated, get the latest name
        if (student.class && student.class.name) {
          className = student.class.name || student.class.fullName || student.class.shortName || className;
        }
        
        // Check if student has been promoted (look for promotion data)
        if (student.class && student.class._id) {
          try {
            const classResponse = await axios.get(`http://localhost:5000/api/classes/${student.class._id}`, {
              headers: { Authorization: `Bearer ${authToken}` }
            });
            
            if (classResponse.data && classResponse.data.class) {
              const classData = classResponse.data.class;
              className = classData.name || classData.fullName || classData.shortName || className;
              console.log('🎓 Updated class for student', student.studentId, ':', className);
            }
          } catch (err) {
            console.log('⚠️ Could not fetch class details for student', student.studentId);
          }
        }
        
        return {
          _id: student._id,
          id: student._id,
          name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown Student',
          studentId: student.studentId || `STU-${(student._id || '').toString().substring(0, 6)}`,
          className: className,
          class: student.class?._id || student.class || null,
          email: student.email || '',
          phoneNumber: student.phoneNumber || '',
          profileImage: student.profileImage
        };
      }));
      
      // Filter out students already selected
      const selectedIds = selectedChildren.map(child => child._id);
      const filteredAvailable = processedStudents.filter(student => !selectedIds.includes(student._id));
      
      setAvailableStudents(filteredAvailable);
      setFilteredStudents(filteredAvailable);
      
      console.log('✅ Students loaded:', {
        total: processedStudents.length,
        available: filteredAvailable.length,
        selected: selectedChildren.length
      });
      
    } catch (err) {
      console.error('❌ Error fetching students:', err);
      setError('Failed to load students. Please try again.');
      setAvailableStudents([]);
      setFilteredStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Filter students based on search
  useEffect(() => {
    if (searchStudent.trim() === '') {
      setFilteredStudents(availableStudents);
    } else {
      const searchTerm = searchStudent.toLowerCase();
      const filtered = availableStudents.filter(student =>
        student.name.toLowerCase().includes(searchTerm) ||
        student.studentId.toLowerCase().includes(searchTerm) ||
        student.className.toLowerCase().includes(searchTerm) ||
        (student.email && student.email.toLowerCase().includes(searchTerm))
      );
      setFilteredStudents(filtered);
    }
  }, [searchStudent, availableStudents]);

  // Handle parent form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setParentData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Handle notification preferences
  const handleNotificationChange = (field, value) => {
    setParentData(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [field]: field === 'frequency' ? value : value === 'true' || value === true
      }
    }));
  };

  // Generate username from first and last name
  const generateUsername = () => {
    if (parentData.firstName && parentData.lastName && !touched.username) {
      const firstName = parentData.firstName.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z]/g, '')
        .substring(0, 15);
      
      const lastName = parentData.lastName.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z]/g, '')
        .substring(0, 10);
      
      const username = `${firstName}.${lastName}`.toLowerCase();
      setParentData(prev => ({ ...prev, username }));
      
      if (errors.username) {
        setErrors(prev => ({ ...prev, username: null }));
      }
    }
  };

  // Handle student selection - FIXED DUPLICATION ISSUE
  const handleStudentSelect = (student) => {
    // Check if already selected using the actual ID
    const isAlreadySelected = selectedChildren.some(child => 
      child._id === student._id || child.id === student._id || child._id === student.id
    );
    
    if (isAlreadySelected) {
      console.log('⚠️ Student already selected:', student.name);
      return;
    }
    
    // Add to selected children
    setSelectedChildren(prev => [...prev, student]);
    
    // Remove from available list
    const newAvailable = availableStudents.filter(s => 
      s._id !== student._id && s.id !== student._id && s._id !== student.id
    );
    setAvailableStudents(newAvailable);
    
    // Update filtered list
    const newFiltered = newAvailable.filter(s => 
      s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchStudent.toLowerCase())
    );
    setFilteredStudents(newFiltered);
    
    console.log('✅ Student selected:', student.name);
  };

  // Remove child from selection - FIXED
  const removeChild = (studentId) => {
    const removedChild = selectedChildren.find(child => 
      child._id === studentId || child.id === studentId
    );
    
    if (!removedChild) {
      console.log('⚠️ Child not found for removal:', studentId);
      return;
    }
    
    // Remove from selected children
    setSelectedChildren(prev => prev.filter(child => 
      child._id !== studentId && child.id !== studentId
    ));
    
    // Add back to available list if not already there
    const childExistsInAvailable = availableStudents.some(s => 
      s._id === removedChild._id || s.id === removedChild._id
    );
    
    if (!childExistsInAvailable) {
      setAvailableStudents(prev => [...prev, removedChild]);
      
      // Update filtered list
      const newFiltered = [...availableStudents, removedChild].filter(s => 
        s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchStudent.toLowerCase())
      );
      setFilteredStudents(newFiltered);
    }
    
    console.log('🗑️ Student removed:', removedChild.name);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    if (!parentData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!parentData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!parentData.username.trim()) newErrors.username = 'Username is required';
    if (!parentData.email.trim()) newErrors.email = 'Email is required';
    if (!parentData.password.trim()) newErrors.password = 'Password is required';
    if (!parentData.confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm password';
    
    // Password validation
    if (parentData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (parentData.password !== parentData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (parentData.email && !emailRegex.test(parentData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Username format validation
    const usernameRegex = /^[a-zA-Z0-9_.]+$/;
    if (parentData.username && !usernameRegex.test(parentData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, dots, and underscores';
    }
    
    // Phone validation (optional)
    if (parentData.phoneNumber && !/^[\d\s\-\+\(\)]+$/.test(parentData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }
    
    // At least one child is recommended (warning, not error)
    if (selectedChildren.length === 0) {
      newErrors.children = 'Adding at least one child is recommended for parent accounts';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission - UPDATED API ENDPOINT
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const authToken = token || localStorage.getItem('token');
      if (!authToken) {
        throw new Error('No authentication token found.');
      }
      
      // Convert image to base64 if exists
      let profileImageBase64 = null;
      if (profileImage) {
        try {
          profileImageBase64 = await convertImageToBase64(profileImage);
          console.log('✅ Image converted to base64');
        } catch (imageErr) {
          console.warn('⚠️ Could not convert image to base64:', imageErr);
        }
      }
      
      // Prepare parent data
      const parentDataToSend = {
        firstName: parentData.firstName.trim(),
        lastName: parentData.lastName.trim(),
        username: parentData.username.trim().toLowerCase(),
        email: parentData.email.trim().toLowerCase(),
        phoneNumber: parentData.phoneNumber?.trim() || undefined,
        address: parentData.address?.trim() || undefined,
        password: parentData.password,
        role: 'parent', // Explicitly set role
        active: parentData.active,
        children: selectedChildren.map(child => child._id),
        notificationPreferences: parentData.notificationPreferences,
        // Add profile image as base64 if available
        ...(profileImageBase64 && { profileImage: profileImageBase64 })
      };
      
      console.log('📤 Creating parent with data:', {
        ...parentDataToSend,
        password: '***',
        childrenCount: selectedChildren.length,
        childrenIds: selectedChildren.map(child => child._id),
        profileImage: profileImageBase64 ? 'BASE64_IMAGE_INCLUDED' : 'NO_IMAGE'
      });
      
      // Create parent account - UPDATED ENDPOINT
      const response = await axios.post('http://localhost:5000/api/users/admin/create-parent', 
        parentDataToSend, 
        {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      console.log('✅ Parent creation response:', response.data);
      
      if (response.data.success || response.data.user) {
        const parentCode = response.data.user?.parentCode || 
                          response.data.data?.parentCode || 
                          response.data.parentCode ||
                          'Generated by system';
        
        setSuccess(`Parent created successfully! ${parentCode ? `Parent Code: ${parentCode}. ` : ''}Redirecting...`);
        
        // Reset form
        setParentData({
          firstName: '',
          lastName: '',
          username: '',
          email: '',
          phoneNumber: '',
          address: '',
          password: '',
          confirmPassword: '',
          active: true,
          role: 'parent',
          notificationPreferences: {
            email: true,
            sms: false,
            push: true,
            frequency: 'immediate'
          }
        });
        setSelectedChildren([]);
        setProfileImage(null);
        setImagePreview(null);
        setSearchStudent('');
        setErrors({});
        setTouched({});
        
        // Navigate back after 3 seconds
        setTimeout(() => {
          navigate('/admin/users');
        }, 3000);
      } else {
        setError(response.data.message || 'Failed to create parent');
      }
      
    } catch (err) {
      console.error('❌ Error creating parent:', err);
      
      if (err.response) {
        console.error('📡 Response error details:', {
          status: err.response.status,
          data: err.response.data,
          statusText: err.response.statusText
        });
        
        if (err.response.status === 400) {
          // Handle role validation error specifically
          if (err.response.data.message && err.response.data.message.includes('role')) {
            setError('Role validation error. "parent" is not a valid role in the system. Please update the backend validation.');
          } else {
            const errorMsg = err.response.data.message || 'Validation error. Please check the form.';
            setError(errorMsg);
          }
          
          // Handle validation errors
          if (err.response.data.errors) {
            const validationErrors = {};
            if (Array.isArray(err.response.data.errors)) {
              err.response.data.errors.forEach(errorMsg => {
                if (errorMsg.includes('Username')) validationErrors.username = errorMsg;
                if (errorMsg.includes('Email')) validationErrors.email = errorMsg;
                if (errorMsg.includes('Password')) validationErrors.password = errorMsg;
                if (errorMsg.includes('First name')) validationErrors.firstName = errorMsg;
                if (errorMsg.includes('Last name')) validationErrors.lastName = errorMsg;
                if (errorMsg.includes('profile image')) validationErrors.profileImage = errorMsg;
                if (errorMsg.includes('role')) validationErrors.role = errorMsg;
              });
            } else if (typeof err.response.data.errors === 'object') {
              Object.entries(err.response.data.errors).forEach(([field, message]) => {
                validationErrors[field] = message;
              });
            }
            setErrors(validationErrors);
          }
        } else if (err.response.status === 401) {
          setError('Authentication failed. Please log in again.');
          setTimeout(() => navigate('/login'), 2000);
        } else if (err.response.status === 403) {
          setError('Permission denied. You do not have access to create parents.');
        } else if (err.response.status === 409) {
          setError('User with this username or email already exists.');
        } else {
          setError(err.response.data?.message || `Server error: ${err.response.status}`);
        }
      } else if (err.request) {
        console.error('🌐 Network error:', err.request);
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchStudent(e.target.value);
  };

  // Clear all selected children
  const clearAllChildren = () => {
    if (selectedChildren.length === 0) return;
    
    // Add all selected children back to available list
    setAvailableStudents(prev => [...prev, ...selectedChildren]);
    setFilteredStudents(prev => [...prev, ...selectedChildren]);
    setSelectedChildren([]);
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Toggle confirm password visibility
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Check if user has admin access
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div style={styles.authRequired}>
        <div style={styles.errorMessage}>
          <FiAlertTriangle /> Access Denied - Admin access required
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Create New Parent Account</h1>
        <p style={styles.subtitle}>Add parent information and assign children</p>
        <button 
          onClick={() => navigate('/admin/users')} 
          style={styles.backButton}
          disabled={loading}
        >
          ← Back to Users
        </button>
      </div>

      {error && (
        <div style={styles.errorMessage}>
          <FiAlertCircle /> {error}
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

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Profile Image Section */}
        <div style={styles.imageUploadSection}>
          <h3 style={styles.sectionTitle}>
            <FiImage /> Profile Image (Optional)
          </h3>
          <div style={styles.imageUploadContainer}>
            <div style={styles.imagePreviewArea}>
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" style={styles.imagePreview} />
              ) : (
                <div style={styles.imagePlaceholder}>
                  <FiUser size={40} color="#718096" />
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
                <small>Image will be saved with parent creation</small>
              </div>
            </div>
          </div>
        </div>

        {/* Parent Information Section */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FiUser /> Parent Information
          </h3>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                First Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={parentData.firstName}
                onChange={handleInputChange}
                onBlur={generateUsername}
                placeholder="John"
                style={{...styles.input, ...(errors.firstName && styles.inputError)}}
                disabled={loading}
                autoComplete="given-name"
              />
              {errors.firstName && <span style={styles.errorText}>{errors.firstName}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Last Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={parentData.lastName}
                onChange={handleInputChange}
                onBlur={generateUsername}
                placeholder="Doe"
                style={{...styles.input, ...(errors.lastName && styles.inputError)}}
                disabled={loading}
                autoComplete="family-name"
              />
              {errors.lastName && <span style={styles.errorText}>{errors.lastName}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Username <span style={styles.required}>*</span>
              </label>
              <div style={styles.inputWithInfo}>
                <input
                  type="text"
                  name="username"
                  value={parentData.username}
                  onChange={handleInputChange}
                  placeholder="john.doe"
                  style={{...styles.input, ...(errors.username && styles.inputError)}}
                  disabled={loading}
                  autoComplete="username"
                  onFocus={() => setTouched(prev => ({ ...prev, username: true }))}
                />
                {!touched.username && parentData.firstName && parentData.lastName && (
                  <small style={styles.autoGenInfo}>Auto-generated</small>
                )}
              </div>
              {errors.username && <span style={styles.errorText}>{errors.username}</span>}
              <small style={styles.helpText}>Auto-generated from name. Can be edited.</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Email <span style={styles.required}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={parentData.email}
                onChange={handleInputChange}
                placeholder="john@example.com"
                style={{...styles.input, ...(errors.email && styles.inputError)}}
                disabled={loading}
                autoComplete="email"
              />
              {errors.email && <span style={styles.errorText}>{errors.email}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={parentData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+1234567890"
                style={{...styles.input, ...(errors.phoneNumber && styles.inputError)}}
                disabled={loading}
                autoComplete="tel"
              />
              {errors.phoneNumber && <span style={styles.errorText}>{errors.phoneNumber}</span>}
              <small style={styles.helpText}>Optional - for SMS notifications</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Address</label>
              <textarea
                name="address"
                value={parentData.address}
                onChange={handleInputChange}
                placeholder="123 Main St, City, Country"
                style={{...styles.input, minHeight: '80px', ...(errors.address && styles.inputError)}}
                rows="3"
                disabled={loading}
                autoComplete="street-address"
              />
              {errors.address && <span style={styles.errorText}>{errors.address}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Password <span style={styles.required}>*</span>
              </label>
              <div style={styles.passwordInputContainer}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={parentData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  style={{...styles.input, ...(errors.password && styles.inputError)}}
                  disabled={loading}
                  autoComplete="new-password"
                  minLength="6"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  style={styles.passwordToggleButton}
                  disabled={loading}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.password && <span style={styles.errorText}>{errors.password}</span>}
              <small style={styles.helpText}>Minimum 6 characters</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Confirm Password <span style={styles.required}>*</span>
              </label>
              <div style={styles.passwordInputContainer}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={parentData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  style={{...styles.input, ...(errors.confirmPassword && styles.inputError)}}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  style={styles.passwordToggleButton}
                  disabled={loading}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Account Status</label>
              <select
                name="active"
                value={parentData.active}
                onChange={handleInputChange}
                style={styles.select}
                disabled={loading}
              >
                <option value={true}>Active</option>
                <option value={false}>Inactive</option>
              </select>
              <small style={styles.helpText}>Active parents can log in and receive notifications</small>
            </div>
          </div>
        </div>

        {/* Notification Preferences Section */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FiBell /> Notification Preferences
          </h3>
          
          <div style={styles.preferencesGrid}>
            <div style={styles.preferenceGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={parentData.notificationPreferences.email}
                  onChange={(e) => handleNotificationChange('email', e.target.checked)}
                  disabled={loading}
                  style={styles.checkbox}
                />
                <span>Email Notifications</span>
              </label>
              <small style={styles.helpText}>Receive notifications via email</small>
            </div>
            
            <div style={styles.preferenceGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={parentData.notificationPreferences.sms}
                  onChange={(e) => handleNotificationChange('sms', e.target.checked)}
                  disabled={loading}
                  style={styles.checkbox}
                />
                <span>SMS Notifications</span>
              </label>
              <small style={styles.helpText}>Receive notifications via SMS (requires phone number)</small>
            </div>
            
            <div style={styles.preferenceGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={parentData.notificationPreferences.push}
                  onChange={(e) => handleNotificationChange('push', e.target.checked)}
                  disabled={loading}
                  style={styles.checkbox}
                />
                <span>Push Notifications</span>
              </label>
              <small style={styles.helpText}>Receive push notifications in app</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Notification Frequency</label>
              <select
                value={parentData.notificationPreferences.frequency}
                onChange={(e) => handleNotificationChange('frequency', e.target.value)}
                style={styles.select}
                disabled={loading}
              >
                <option value="immediate">Immediate</option>
                <option value="daily">Daily Summary</option>
                <option value="weekly">Weekly Summary</option>
              </select>
              <small style={styles.helpText}>How often to receive notifications</small>
            </div>
          </div>
        </div>

        {/* Children Assignment Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>
              <FiUsers /> Assign Children
            </h3>
            <div style={styles.sectionHeaderRight}>
              {selectedChildren.length > 0 && (
                <div style={styles.selectedCount}>
                  {selectedChildren.length} child{selectedChildren.length !== 1 ? 'ren' : ''} selected
                </div>
              )}
              {selectedChildren.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllChildren}
                  style={styles.clearAllButtonSmall}
                  disabled={loading}
                >
                  <FiX /> Clear All
                </button>
              )}
            </div>
          </div>
          
          <p style={styles.helpText}>
            Search and select students to assign as children to this parent. Parents can monitor their children's progress and receive notifications.
          </p>
          
          {errors.children && (
            <div style={styles.warningMessage}>
              <FiAlertTriangle style={{ color: '#D69E2E' }} /> {errors.children}
            </div>
          )}
          
          {/* Search Bar */}
          <div style={styles.searchContainer}>
            <div style={styles.searchBox}>
              <FiSearch style={styles.searchIcon} />
              <input
                type="text"
                value={searchStudent}
                onChange={handleSearchChange}
                placeholder="Search students by name, ID, or class..."
                style={styles.searchInput}
                disabled={loading || loadingStudents}
              />
              {loadingStudents && (
                <div style={styles.smallSpinner}></div>
              )}
            </div>
            <button
              type="button"
              onClick={fetchAvailableStudents}
              style={styles.refreshButton}
              disabled={loading || loadingStudents}
            >
              <FiRefreshCw /> Refresh
            </button>
          </div>
          
          {/* Students List and Selected Children */}
          <div style={styles.childrenSelectionGrid}>
            {/* Available Students */}
            <div style={styles.studentsListContainer}>
              <div style={styles.listHeader}>
                <h4 style={styles.listTitle}>
                  Available Students {filteredStudents.length > 0 && `(${filteredStudents.length})`}
                </h4>
              </div>
              
              {loadingStudents ? (
                <div style={styles.loadingContainer}>
                  <div style={styles.spinnerSmall}></div>
                  <span>Loading students...</span>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div style={styles.emptyList}>
                  {searchStudent ? (
                    <>
                      <p>No students found matching "{searchStudent}"</p>
                      <button 
                        type="button" 
                        onClick={() => setSearchStudent('')}
                        style={styles.clearSearchButton}
                      >
                        Clear Search
                      </button>
                    </>
                  ) : (
                    <>
                      <p>No students available</p>
                      <small>All students may already be assigned to other parents</small>
                    </>
                  )}
                </div>
              ) : (
                <div style={styles.studentsList}>
                  {filteredStudents.map((student, index) => (
                    <div 
                      key={`available-${student._id || student.id}-${index}`} 
                      style={styles.studentItem}
                      onClick={() => handleStudentSelect(student)}
                    >
                      <div style={styles.studentInfo}>
                        <div style={styles.studentName}>{student.name}</div>
                        <div style={styles.studentDetails}>
                          <span style={styles.studentId}>ID: {student.studentId}</span>
                          <span style={styles.studentClass}>Class: {student.className}</span>
                        </div>
                        {student.email && (
                          <div style={styles.studentEmail}>
                            <FiMail size={12} /> {student.email}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStudentSelect(student);
                        }}
                        style={styles.addStudentButton}
                        disabled={loading}
                      >
                        <FiUserPlus />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Selected Children */}
            <div style={styles.selectedChildrenContainer}>
              <div style={styles.listHeader}>
                <h4 style={styles.listTitle}>
                  Selected Children {selectedChildren.length > 0 && `(${selectedChildren.length})`}
                </h4>
              </div>
              
              {selectedChildren.length === 0 ? (
                <div style={styles.emptySelected}>
                  <FiUsers size={40} color="#CBD5E0" />
                  <p>No children selected yet</p>
                  <small>Select students from the list on the left</small>
                </div>
              ) : (
                <div style={styles.selectedChildrenList}>
                  {selectedChildren.map((child, index) => (
                    <div key={`selected-${child._id || child.id}-${index}`} style={styles.selectedChildItem}>
                      <div style={styles.selectedChildInfo}>
                        <div style={styles.selectedChildName}>{child.name}</div>
                        <div style={styles.selectedChildDetails}>
                          <span>ID: {child.studentId}</span>
                          <span>Class: {child.className}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeChild(child._id || child.id)}
                        style={styles.removeChildButton}
                        disabled={loading}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
            disabled={loading || uploadingImage}
          >
            {loading ? (
              <>
                <div style={styles.spinnerSmall}></div> Creating...
              </>
            ) : (
              <>
                <FiCheck /> Create Parent Account
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
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: '#F5F7FA',
    minHeight: '100vh'
  },
  header: {
    marginBottom: '32px',
    position: 'relative'
  },
  backButton: {
    position: 'absolute',
    top: '0',
    right: '0',
    padding: '8px 16px',
    backgroundColor: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    '&:hover:not(:disabled)': {
      backgroundColor: '#4A5568',
      transform: 'translateY(-2px)'
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed'
    }
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#4B5320',
    margin: '0 0 8px 0'
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
  warningMessage: {
    backgroundColor: '#FEFCBF',
    color: '#744210',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
  },
  closeMessageButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: 'rgba(0,0,0,0.1)'
    }
  },
  form: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    border: '1px solid #E2E8F0'
  },
  section: {
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid #E2E8F0',
    '&:last-child': {
      borderBottom: 'none'
    }
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  sectionHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2D3748',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '2px solid #D69E2E',
    paddingBottom: '8px'
  },
  selectedCount: {
    backgroundColor: '#E6FFFA',
    color: '#234E52',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600'
  },
  clearAllButtonSmall: {
    backgroundColor: '#FED7D7',
    color: '#9B2C2C',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s',
    '&:hover:not(:disabled)': {
      backgroundColor: '#FEB2B2'
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed'
    }
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
  inputWithInfo: {
    position: 'relative'
  },
  autoGenInfo: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '11px',
    color: '#38A169',
    backgroundColor: '#C6F6D5',
    padding: '2px 6px',
    borderRadius: '3px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '4px',
    fontSize: '14px',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    backgroundColor: 'white',
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
  inputError: {
    borderColor: '#E53E3E',
    backgroundColor: '#FFF5F5'
  },
  passwordInputContainer: {
    position: 'relative',
    width: '100%'
  },
  passwordToggleButton: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#718096',
    cursor: 'pointer',
    padding: '4px',
    '&:hover': {
      color: '#4A5568'
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#2D3748',
    transition: 'border-color 0.2s',
    cursor: 'pointer',
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
    display: 'block',
    lineHeight: '1.4'
  },
  preferencesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '20px'
  },
  preferenceGroup: {
    marginBottom: '15px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#2D3748',
    cursor: 'pointer',
    marginBottom: '4px'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: '#3182CE'
  },
  searchContainer: {
    marginBottom: '20px',
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  searchBox: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: 1
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: '#718096',
    fontSize: '18px'
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 40px',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'all 0.2s',
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
  refreshButton: {
    padding: '10px 16px',
    backgroundColor: '#E2E8F0',
    color: '#4A5568',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    '&:hover:not(:disabled)': {
      backgroundColor: '#CBD5E0',
      transform: 'translateY(-2px)'
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  clearSearchButton: {
    padding: '6px 12px',
    backgroundColor: '#E2E8F0',
    color: '#4A5568',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    marginTop: '8px',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#CBD5E0'
    }
  },
  smallSpinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #f3f3f3',
    borderTop: '2px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginLeft: '10px'
  },
  childrenSelectionGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr'
    }
  },
  studentsListContainer: {
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '400px'
  },
  selectedChildrenContainer: {
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '400px'
  },
  listHeader: {
    backgroundColor: '#F5F7FA',
    borderBottom: '1px solid #E2E8F0'
  },
  listTitle: {
    color: '#2D3748',
    padding: '12px 16px',
    margin: 0,
    fontSize: '16px',
    fontWeight: '600'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: '#718096',
    fontSize: '14px',
    gap: '12px',
    flex: 1
  },
  emptyList: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#718096',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptySelected: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#718096',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    flex: 1
  },
  studentsList: {
    overflowY: 'auto',
    flex: 1
  },
  studentItem: {
    padding: '12px 16px',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#F7FAFC'
    },
    '&:last-child': {
      borderBottom: 'none'
    }
  },
  studentInfo: {
    flex: 1
  },
  studentName: {
    fontWeight: '600',
    color: '#2D3748',
    fontSize: '14px',
    marginBottom: '2px'
  },
  studentDetails: {
    fontSize: '12px',
    color: '#718096',
    marginBottom: '2px',
    display: 'flex',
    gap: '12px'
  },
  studentId: {
    backgroundColor: '#EDF2F7',
    padding: '1px 6px',
    borderRadius: '3px'
  },
  studentClass: {
    backgroundColor: '#E6FFFA',
    padding: '1px 6px',
    borderRadius: '3px',
    color: '#234E52'
  },
  studentEmail: {
    fontSize: '11px',
    color: '#4A5568',
    fontStyle: 'italic',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '2px'
  },
  addStudentButton: {
    backgroundColor: '#38A169',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    flexShrink: 0,
    '&:hover:not(:disabled)': {
      backgroundColor: '#2F855A',
      transform: 'translateY(-2px)'
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  selectedChildrenList: {
    overflowY: 'auto',
    flex: 1
  },
  selectedChildItem: {
    padding: '12px 16px',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FFF4',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: '#E6FFFA'
    },
    '&:last-child': {
      borderBottom: 'none'
    }
  },
  selectedChildInfo: {
    flex: 1
  },
  selectedChildName: {
    fontWeight: '600',
    color: '#22543D',
    fontSize: '14px',
    marginBottom: '2px'
  },
  selectedChildDetails: {
    fontSize: '12px',
    color: '#38A169',
    display: 'flex',
    gap: '12px'
  },
  removeChildButton: {
    backgroundColor: '#FED7D7',
    color: '#9B2C2C',
    border: 'none',
    borderRadius: '4px',
    padding: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    flexShrink: 0,
    '&:hover:not(:disabled)': {
      backgroundColor: '#FEB2B2',
      transform: 'translateY(-2px)'
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
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
  }
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    transition: all 0.2s ease;
  }
  
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
  
  input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: #3182CE;
    box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
  }
  
  textarea {
    resize: vertical;
    min-height: 80px;
    font-family: inherit;
  }
  
  .studentItem, .selectedChildItem {
    transition: all 0.2s ease;
  }
  
  @media (max-width: 768px) {
    .childrenSelectionGrid {
      grid-template-columns: 1fr !important;
    }
    
    .sectionHeader {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .sectionHeaderRight {
      width: 100%;
      justify-content: space-between;
    }
    
    .formActions {
      flex-direction: column;
    }
    
    .submitButton, .cancelButton {
      width: 100%;
      justify-content: center;
    }
    
    .imageUploadContainer {
      flex-direction: column;
      text-align: center;
    }
    
    .imagePreviewArea {
      margin: 0 auto;
    }
    
    .searchContainer {
      flex-direction: column;
    }
    
    .searchBox, .refreshButton {
      width: 100%;
    }
  }
  
  @media (max-width: 480px) {
    .form {
      padding: 20px !important;
    }
    
    .formGrid {
      grid-template-columns: 1fr !important;
    }
    
    .preferencesGrid {
      grid-template-columns: 1fr !important;
    }
    
    .studentDetails, .selectedChildDetails {
      flex-direction: column;
      gap: 4px;
    }
  }
  
  /* Smooth scrolling */
  html {
    scroll-behavior: smooth;
  }
  
  /* Custom scrollbar */
  .studentsList, .selectedChildrenList {
    scrollbar-width: thin;
    scrollbar-color: #CBD5E0 #F5F7FA;
  }
  
  .studentsList::-webkit-scrollbar, .selectedChildrenList::-webkit-scrollbar {
    width: 6px;
  }
  
  .studentsList::-webkit-scrollbar-track, .selectedChildrenList::-webkit-scrollbar-track {
    background: #F5F7FA;
  }
  
  .studentsList::-webkit-scrollbar-thumb, .selectedChildrenList::-webkit-scrollbar-thumb {
    background-color: #CBD5E0;
    border-radius: 3px;
  }
`;
document.head.appendChild(styleSheet);

export default CreateParent;