// pages/CreateStudentWithSubjects.js - UPDATED WITH CORRECT SUBJECT FORMATTING
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiUser, FiBook, FiCheck, FiX, FiAlertCircle, FiCheckCircle,
  FiLoader, FiCalendar, FiPhone, FiMapPin, FiUsers, FiLock, FiMail,
  FiUpload, FiImage, FiXCircle
} from 'react-icons/fi';

const CreateStudentWithSubjects = () => {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Student basic info
  const [studentData, setStudentData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    firstName: '',
    middleName: '',
    lastName: '',
    studentId: '',
    parentEmail: '',
    parentPhoneNumber: '',
    dateOfBirth: '',
    address: '',
    phoneNumber: '',
    sex: '',
    age: '',
    class: '',
    active: true,
  });
  
  // Image upload state
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Class and subject data
  const [classes, setClasses] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  
  // Form validation
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (studentData.class) {
      fetchClassSubjects(studentData.class);
    } else {
      setClassSubjects([]);
      setSelectedSubjects([]);
    }
  }, [studentData.class]);

  const fetchClasses = async () => {
    try {
      const authToken = token || localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/classes', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      let classesData = [];
      if (res.data && Array.isArray(res.data.classes)) {
        classesData = res.data.classes;
      } else if (res.data && res.data.success && Array.isArray(res.data.data)) {
        classesData = res.data.data;
      } else if (Array.isArray(res.data)) {
        classesData = res.data;
      }
      
      const formattedClasses = classesData.map(cls => {
        if (!cls) return null;
        
        const classId = cls._id || cls.id;
        let className = cls.name || cls.fullName || `Class ${classId?.substring(0, 4)}...`;
        
        if (cls.level && cls.stream) {
          className = `${cls.level} ${cls.stream}`;
        } else if (cls.level) {
          className = cls.level;
        } else if (cls.shortName) {
          className = cls.shortName;
        }
        
        return {
          _id: classId,
          id: classId,
          name: className,
          label: className,
          fullName: cls.fullName || className,
          shortName: cls.shortName || '',
          level: cls.level || ''
        };
      }).filter(Boolean);
      
      setClasses(formattedClasses);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setClasses([]);
    }
  };

  // UPDATED: Fetch subjects for a specific class
  const fetchClassSubjects = async (classId) => {
    try {
      const authToken = token || localStorage.getItem('token');
      
      console.log('🔍 Fetching subjects for class:', classId);
      
      // Try multiple endpoints to get subjects
      let subjectsList = [];
      
      try {
        // First try the subjects-by-class endpoint
        const res = await axios.get(`http://localhost:5000/api/subjects/class/${classId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('📚 Subjects API response:', res.data);
        
        // Handle different response formats
        if (res.data && Array.isArray(res.data.subjects)) {
          subjectsList = res.data.subjects;
        } else if (res.data && Array.isArray(res.data)) {
          subjectsList = res.data;
        } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
          subjectsList = res.data.data;
        } else if (res.data && res.data.success && Array.isArray(res.data.subjects)) {
          subjectsList = res.data.subjects;
        }
      } catch (firstErr) {
        console.log('First endpoint failed, trying class-subjects endpoint:', firstErr.message);
        
        // Try class-subjects endpoint as fallback
        const res2 = await axios.get(`http://localhost:5000/api/class-subjects/class/${classId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (res2.data && Array.isArray(res2.data.subjects)) {
          subjectsList = res2.data.subjects;
        } else if (res2.data && Array.isArray(res2.data)) {
          subjectsList = res2.data;
        }
      }
      
      console.log('📦 Extracted subjects list:', subjectsList);
      
      // Process subjects - get actual subject data
      const subjectsListFormatted = subjectsList.map(item => {
        // Extract subject from the item
        const subject = item.subject || item;
        
        return {
          id: subject._id || subject.id, // Use the actual subject ID
          name: subject.name || 'Unknown Subject',
          code: subject.code || '',
          isCompulsory: item.isCompulsory || item.isCore || false,
          isCore: item.isCore || item.isCompulsory || false,
          periodCount: item.periodCount || 0,
          teacher: item.teacher
        };
      }).filter(sub => sub.id && sub.name);
      
      console.log('✨ Formatted subjects for student enrollment:', subjectsListFormatted);
      
      setClassSubjects(subjectsListFormatted);
      
      // Auto-select compulsory subjects (core subjects)
      const compulsorySubjectIds = subjectsListFormatted
        .filter(subject => subject.isCompulsory || subject.isCore)
        .map(subject => subject.id);
      
      // Start with compulsory subjects selected
      setSelectedSubjects(compulsorySubjectIds);
      
    } catch (err) {
      console.error('❌ Error fetching class subjects:', err);
      
      // If all endpoints fail, try to get subjects from all subjects list
      try {
        const authToken = token || localStorage.getItem('token');
        const allSubjectsRes = await axios.get('http://localhost:5000/api/subjects', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        let allSubjects = [];
        if (allSubjectsRes.data && Array.isArray(allSubjectsRes.data.subjects)) {
          allSubjects = allSubjectsRes.data.subjects;
        } else if (allSubjectsRes.data && Array.isArray(allSubjectsRes.data)) {
          allSubjects = allSubjectsRes.data;
        } else if (allSubjectsRes.data && allSubjectsRes.data.success && Array.isArray(allSubjectsRes.data.data)) {
          allSubjects = allSubjectsRes.data.data;
        }
        
        // Just show some subjects (can't know which are for this class)
        const subjectsListFormatted = allSubjects.map(subject => ({
          id: subject._id || subject.id,
          name: subject.name || 'Subject',
          code: subject.code || '',
          isCompulsory: false,
          isCore: false,
          periodCount: 0
        }));
        
        setClassSubjects(subjectsListFormatted);
        setSelectedSubjects([]);
        
      } catch (fallbackErr) {
        console.error('❌ Fallback also failed:', fallbackErr);
        setClassSubjects([]);
        setSelectedSubjects([]);
      }
    }
  };

  // Helper function to convert image to base64
  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Handle image upload with base64 conversion
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

  const toggleSubjectSelection = (subjectId) => {
    const subject = classSubjects.find(s => s.id === subjectId);
    if (subject && (subject.isCompulsory || subject.isCore)) {
      // Compulsory/core subjects cannot be deselected
      return;
    }
    
    setSelectedSubjects(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };

  const cleanUsername = (username) => {
    if (!username) return '';
    const cleaned = username.replace(/\s+/g, '_').toLowerCase();
    return cleaned.replace(/[^a-zA-Z0-9_]/g, '');
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return '';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleDateOfBirthChange = (dateString) => {
    const age = calculateAge(dateString);
    setStudentData(prev => ({
      ...prev,
      dateOfBirth: dateString,
      age: age || ''
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    const cleanedUsername = cleanUsername(studentData.username);
    
    // Basic student info validation
    if (!cleanedUsername.trim()) newErrors.username = 'Username is required';
    if (!studentData.password.trim()) newErrors.password = 'Password is required';
    if (studentData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!studentData.confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm password';
    if (studentData.password !== studentData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    // Email validation - Either student email or parent email is required
    if (!studentData.email.trim() && !studentData.parentEmail?.trim()) {
      newErrors.email = 'Either student email or parent email is required';
    }
    
    // Email format validation if provided
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (studentData.email && studentData.email.trim() && !emailRegex.test(studentData.email)) {
      newErrors.email = 'Please enter a valid student email address';
    }
    if (studentData.parentEmail && studentData.parentEmail.trim() && !emailRegex.test(studentData.parentEmail)) {
      newErrors.parentEmail = 'Please enter a valid parent email address';
    }
    
    if (!studentData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!studentData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!studentData.class) newErrors.class = 'Class is required';
    
    // Address validation for students
    if (!studentData.address?.trim()) newErrors.address = 'Home address is required for students';
    
    // Username format validation
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(cleanedUsername)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores. No spaces allowed.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // UPDATED: Handle submit with correct subject format
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
        throw new Error('No authentication token found.');
      }
      
      const cleanedUsername = cleanUsername(studentData.username);
      
      // Convert image to base64 if exists
      let profileImageBase64 = null;
      if (profileImage) {
        try {
          profileImageBase64 = await convertImageToBase64(profileImage);
          console.log('✅ Image converted to base64, length:', profileImageBase64?.length || 0);
        } catch (imageErr) {
          console.warn('⚠️ Could not convert image to base64:', imageErr);
        }
      }
      
      // Get compulsory (core) and elective subjects
      const compulsorySubjects = classSubjects.filter(subject => subject.isCompulsory || subject.isCore);
      const electiveSubjects = classSubjects.filter(subject => !subject.isCompulsory && !subject.isCore);
      
      // Only include selected elective subjects
      const electiveSubjectIds = electiveSubjects
        .filter(subject => selectedSubjects.includes(subject.id))
        .map(subject => subject.id); // Send just the subject ID
      
      // Combine compulsory and selected elective subjects - FIXED: Send subject IDs only
      const allSelectedSubjectIds = [
        ...compulsorySubjects.map(subject => subject.id),
        ...electiveSubjectIds
      ];
      
      console.log('📤 Formatted subjects for backend:', allSelectedSubjectIds);
      
      // Build student data with profile image as base64
      const studentDataToSend = {
        username: cleanedUsername,
        password: studentData.password,
        email: studentData.email.trim() || undefined,
        firstName: studentData.firstName.trim(),
        middleName: studentData.middleName?.trim() || '',
        lastName: studentData.lastName.trim(),
        role: 'student',
        class: studentData.class,
        studentId: studentData.studentId?.trim() || undefined,
        dateOfBirth: studentData.dateOfBirth || undefined,
        address: studentData.address?.trim() || undefined,
        phoneNumber: studentData.phoneNumber?.trim() || undefined,
        sex: studentData.sex || undefined,
        age: studentData.age ? parseInt(studentData.age) : undefined,
        active: studentData.active,
        parentEmail: studentData.parentEmail?.trim() || undefined,
        parentPhoneNumber: studentData.parentPhoneNumber?.trim() || undefined,
        // FIXED: Send enrolledSubjects as array of subject IDs only (not objects)
        enrolledSubjects: allSelectedSubjectIds,
        // Add profile image as base64 if available
        ...(profileImageBase64 && { profileImage: profileImageBase64 })
      };
      
      console.log('📤 Creating student with data:', {
        ...studentDataToSend,
        password: '***',
        profileImage: profileImageBase64 ? 'BASE64_IMAGE_INCLUDED' : 'NO_IMAGE',
        enrolledSubjects: studentDataToSend.enrolledSubjects.length,
        enrolledSubjectsSample: studentDataToSend.enrolledSubjects.slice(0, 3)
      });
      
      // Create student in one request
      const response = await axios.post('http://localhost:5000/api/users', 
        studentDataToSend, 
        {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      console.log('✅ Student creation response:', {
        success: response.data.success,
        userId: response.data.user?._id || response.data.data?._id,
        message: response.data.message
      });
      
      if (response.data.success) {
        const compulsoryCount = compulsorySubjects.length;
        const electiveCount = electiveSubjectIds.length;
        setSuccess(`Student created successfully with profile image! Enrolled in ${compulsoryCount} compulsory subjects and ${electiveCount} elective subjects. Redirecting...`);
        
        // Reset form
        setStudentData({
          username: '',
          password: '',
          confirmPassword: '',
          email: '',
          firstName: '',
          middleName: '',
          lastName: '',
          studentId: '',
          parentEmail: '',
          parentPhoneNumber: '',
          dateOfBirth: '',
          address: '',
          phoneNumber: '',
          sex: '',
          age: '',
          class: '',
          active: true,
        });
        setSelectedSubjects([]);
        setClassSubjects([]);
        setProfileImage(null);
        setImagePreview(null);
        
        // Navigate back after 2 seconds
        setTimeout(() => {
          navigate('/admin/users');
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to create student');
      }
      
    } catch (err) {
      console.error('❌ Error creating student:', err);
      
      if (err.response) {
        console.error('📡 Response error details:', {
          status: err.response.status,
          data: err.response.data
        });
        
        if (err.response.status === 400) {
          const errorMsg = err.response.data.message || 'Validation error. Please check the form.';
          setError(errorMsg);
          
          if (err.response.data.errors) {
            const validationErrors = {};
            err.response.data.errors.forEach(errorMsg => {
              if (errorMsg.includes('Username')) validationErrors.username = errorMsg;
              if (errorMsg.includes('Email')) validationErrors.email = errorMsg;
              if (errorMsg.includes('Password')) validationErrors.password = errorMsg;
              if (errorMsg.includes('First name')) validationErrors.firstName = errorMsg;
              if (errorMsg.includes('Last name')) validationErrors.lastName = errorMsg;
              if (errorMsg.includes('address')) validationErrors.address = errorMsg;
              if (errorMsg.includes('profile image')) validationErrors.profileImage = errorMsg;
            });
            setErrors(validationErrors);
          }
        } else if (err.response.status === 401) {
          setError('Authentication failed. Please log in again.');
          setTimeout(() => navigate('/login'), 2000);
        } else if (err.response.status === 403) {
          setError('Permission denied. You do not have access to create students.');
        } else if (err.response.status === 409) {
          setError('User with this username or email already exists.');
        } else if (err.response.status === 500) {
          // Show more detailed error for 500
          const serverError = err.response.data?.error || err.response.data?.message;
          setError(`Server error: ${serverError || 'Internal server error. Please check server logs.'}`);
        } else {
          setError(err.response.data?.message || `Server error: ${err.response.status}`);
        }
      } else if (err.request) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStudentData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const getCompulsorySubjects = () => {
    return classSubjects.filter(subject => subject.isCompulsory || subject.isCore);
  };

  const getElectiveSubjects = () => {
    return classSubjects.filter(subject => !subject.isCompulsory && !subject.isCore);
  };

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div style={styles.container}>
        <div style={styles.errorMessage}>
          <FiAlertCircle /> Access Denied - Admin access required
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Create New Student</h1>
        <p style={styles.subtitle}>Add student information and enroll in subjects</p>
        <button 
          onClick={() => navigate('/admin/users')} 
          style={styles.backButton}
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
        {/* Profile Image Upload Section */}
        <div style={styles.imageUploadSection}>
          <h3 style={styles.sectionTitle}>Profile Image (Optional)</h3>
          <p style={styles.imageUploadHelp}>
            Image will be sent as base64 in the same request with student data.
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
                <small>Image will be saved with student creation</small>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Student Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FiUser /> Student Information
          </h3>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Username <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="username"
                value={studentData.username}
                onChange={handleInputChange}
                placeholder="john_doe"
                style={{...styles.input, ...(errors.username && styles.inputError)}}
                disabled={loading}
                autoComplete="new-username"
              />
              {errors.username && <span style={styles.errorText}>{errors.username}</span>}
              <small style={styles.helpText}>No spaces allowed. Use underscores if needed.</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Student Email
              </label>
              <input
                type="email"
                name="email"
                value={studentData.email}
                onChange={handleInputChange}
                placeholder="john@school.com"
                style={{...styles.input, ...(errors.email && styles.inputError)}}
                disabled={loading}
                autoComplete="email"
              />
              {errors.email && <span style={styles.errorText}>{errors.email}</span>}
              <small style={styles.helpText}>Either student email or parent email is required</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                First Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={studentData.firstName}
                onChange={handleInputChange}
                placeholder="John"
                style={{...styles.input, ...(errors.firstName && styles.inputError)}}
                disabled={loading}
                autoComplete="given-name"
              />
              {errors.firstName && <span style={styles.errorText}>{errors.firstName}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Middle Name</label>
              <input
                type="text"
                name="middleName"
                value={studentData.middleName}
                onChange={handleInputChange}
                placeholder="Michael (optional)"
                style={styles.input}
                disabled={loading}
                autoComplete="additional-name"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Last Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={studentData.lastName}
                onChange={handleInputChange}
                placeholder="Doe"
                style={{...styles.input, ...(errors.lastName && styles.inputError)}}
                disabled={loading}
                autoComplete="family-name"
              />
              {errors.lastName && <span style={styles.errorText}>{errors.lastName}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Password <span style={styles.required}>*</span>
              </label>
              <input
                type="password"
                name="password"
                value={studentData.password}
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
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Confirm Password <span style={styles.required}>*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={studentData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••••"
                style={{...styles.input, ...(errors.confirmPassword && styles.inputError)}}
                disabled={loading}
                autoComplete="new-password"
              />
              {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Student ID</label>
              <input
                type="text"
                name="studentId"
                value={studentData.studentId}
                onChange={handleInputChange}
                placeholder="STU001"
                style={styles.input}
                disabled={loading}
              />
              <small style={styles.helpText}>Optional - must be unique if provided</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Class <span style={styles.required}>*</span>
              </label>
              <select
                name="class"
                value={studentData.class}
                onChange={handleInputChange}
                style={{...styles.select, ...(errors.class && styles.inputError)}}
                disabled={loading}
              >
                <option value="">Select a class</option>
                {classes.map(cls => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name} {cls.level ? `(${cls.level})` : ''}
                  </option>
                ))}
              </select>
              {errors.class && <span style={styles.errorText}>{errors.class}</span>}
            </div>
          </div>
        </div>

        {/* Parent Contact Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FiUser /> Parent/Guardian Contact Information
          </h3>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Parent Email</label>
              <input
                type="email"
                name="parentEmail"
                value={studentData.parentEmail}
                onChange={handleInputChange}
                placeholder="parent@email.com"
                style={{...styles.input, ...(errors.parentEmail && styles.inputError)}}
                disabled={loading}
              />
              {errors.parentEmail && <span style={styles.errorText}>{errors.parentEmail}</span>}
              <small style={styles.helpText}>Either student email or parent email is required</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Parent Phone Number</label>
              <input
                type="tel"
                name="parentPhoneNumber"
                value={studentData.parentPhoneNumber}
                onChange={handleInputChange}
                placeholder="+1234567890"
                style={styles.input}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FiUser /> Personal Information
          </h3>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={studentData.dateOfBirth}
                onChange={(e) => handleDateOfBirthChange(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Age</label>
              <input
                type="number"
                value={studentData.age}
                readOnly
                style={{...styles.input, backgroundColor: '#F5F7FA'}}
                disabled={loading}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Sex</label>
              <select
                name="sex"
                value={studentData.sex}
                onChange={handleInputChange}
                style={styles.select}
                disabled={loading}
              >
                <option value="">Select sex</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Home Address <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="address"
                value={studentData.address}
                onChange={handleInputChange}
                placeholder="123 Main Street"
                style={{...styles.input, ...(errors.address && styles.inputError)}}
                disabled={loading}
                autoComplete="street-address"
              />
              {errors.address && <span style={styles.errorText}>{errors.address}</span>}
              <small style={styles.helpText}>Home address is required for students</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={studentData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+1234567890"
                style={styles.input}
                disabled={loading}
                autoComplete="tel"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Status</label>
              <select
                name="active"
                value={studentData.active}
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

        {/* Subject Enrollment */}
        {studentData.class && classSubjects.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <FiBook /> Subject Enrollment
            </h3>
            
            <div style={styles.classInfo}>
              <h4 style={styles.className}>{classes.find(c => c._id === studentData.class)?.name}</h4>
              <p style={styles.classDescription}>
                Compulsory subjects are automatically enrolled. Select elective subjects below.
              </p>
            </div>
            
            {/* Compulsory Subjects (Auto-enrolled) */}
            {getCompulsorySubjects().length > 0 && (
              <div style={styles.subjectGroup}>
                <h4 style={styles.subjectGroupTitle}>Compulsory Subjects (Required)</h4>
                <div style={styles.compulsorySubjectsList}>
                  {getCompulsorySubjects().map(subject => (
                    <div key={subject.id} style={styles.compulsorySubjectItem}>
                      <span style={styles.subjectName}>
                        {subject.name}
                        {subject.code && ` (${subject.code})`}
                        {subject.teacher && (
                          <span style={styles.teacherInfo}> - Teacher: {subject.teacher?.firstName || subject.teacher?.username || 'Not Assigned'}</span>
                        )}
                      </span>
                      <span style={styles.requiredBadge}>Required</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Elective Subjects (Selectable) */}
            {getElectiveSubjects().length > 0 && (
              <div style={styles.subjectGroup}>
                <h4 style={styles.subjectGroupTitle}>Elective Subjects (Optional)</h4>
                <div style={styles.electiveSubjectsGrid}>
                  {getElectiveSubjects().map(subject => (
                    <label key={subject.id} style={styles.subjectCheckbox}>
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(subject.id)}
                        onChange={() => toggleSubjectSelection(subject.id)}
                        style={styles.checkbox}
                        disabled={loading}
                      />
                      <div style={styles.subjectCheckboxContent}>
                        <span style={styles.subjectName}>{subject.name}</span>
                        {subject.code && (
                          <span style={styles.subjectCode}>{subject.code}</span>
                        )}
                        {subject.teacher && (
                          <span style={styles.teacherInfo}>
                            Teacher: {subject.teacher?.firstName || subject.teacher?.username || 'Not Assigned'}
                          </span>
                        )}
                        <span style={styles.electiveBadge}>Elective</span>
                      </div>
                    </label>
                  ))}
                </div>
                <small style={styles.electiveHelpText}>
                  Select elective subjects. All compulsory subjects are automatically selected.
                </small>
              </div>
            )}
            
            {/* Summary */}
            <div style={styles.summary}>
              <h4>Enrollment Summary</h4>
              <div style={styles.summaryStats}>
                <div style={styles.summaryStat}>
                  <span style={styles.summaryLabel}>Total Subjects:</span>
                  <span style={styles.summaryValue}>{selectedSubjects.length}</span>
                </div>
                <div style={styles.summaryStat}>
                  <span style={styles.summaryLabel}>Compulsory:</span>
                  <span style={styles.summaryValue}>{getCompulsorySubjects().length}</span>
                </div>
                <div style={styles.summaryStat}>
                  <span style={styles.summaryLabel}>Elective:</span>
                  <span style={styles.summaryValue}>
                    {selectedSubjects.length - getCompulsorySubjects().length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading indicator for subjects */}
        {studentData.class && classSubjects.length === 0 && (
          <div style={styles.loadingSubjects}>
            <div style={styles.spinner}></div>
            <p>Loading subjects for {classes.find(c => c._id === studentData.class)?.name}...</p>
          </div>
        )}

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
                <FiCheck /> Create Student
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
    ':hover': {
      backgroundColor: '#4A5568',
      transform: 'translateY(-2px)'
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
  closeMessageButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    ':hover': {
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
    ':hover': {
      backgroundColor: '#2C5282',
      transform: 'translateY(-2px)'
    },
    ':disabled': {
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
    ':hover': {
      backgroundColor: '#FEB2B2',
      transform: 'translateY(-2px)'
    },
    ':disabled': {
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
    color: '#2D3748',
    ':focus': {
      outline: 'none',
      borderColor: '#3182CE',
      boxShadow: '0 0 0 3px rgba(49, 130, 206, 0.1)'
    },
    ':disabled': {
      backgroundColor: '#F5F7FA',
      cursor: 'not-allowed'
    }
  },
  inputError: {
    borderColor: '#E53E3E',
    backgroundColor: '#FFF5F5',
    border: '1px solid #E53E3E'
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
    transition: 'border-color 0.2s',
    ':focus': {
      outline: 'none',
      borderColor: '#3182CE',
      boxShadow: '0 0 0 3px rgba(49, 130, 206, 0.1)'
    },
    ':disabled': {
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
  classInfo: {
    backgroundColor: '#F5F7FA',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px'
  },
  className: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 8px 0'
  },
  classDescription: {
    color: '#718096',
    margin: 0,
    fontSize: '14px'
  },
  subjectGroup: {
    marginBottom: '24px'
  },
  subjectGroupTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2D3748',
    margin: '0 0 16px 0'
  },
  compulsorySubjectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '24px'
  },
  compulsorySubjectItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: '#F0FFF4',
    border: '1px solid #C8E6C9',
    borderRadius: '6px',
    color: '#2D3748'
  },
  subjectName: {
    fontWeight: '500'
  },
  teacherInfo: {
    fontSize: '12px',
    color: '#718096',
    fontStyle: 'italic'
  },
  requiredBadge: {
    padding: '4px 8px',
    backgroundColor: '#C6F6D5',
    color: '#22543D',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  },
  electiveSubjectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px'
  },
  subjectCheckbox: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '12px',
    border: '2px solid #E2E8F0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: 'white',
    color: '#2D3748',
    ':hover': {
      borderColor: '#CBD5E0',
      backgroundColor: '#F7FAFC'
    }
  },
  checkbox: {
    marginRight: '10px',
    marginTop: '3px',
    cursor: 'pointer',
    accentColor: '#3182CE'
  },
  subjectCheckboxContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1
  },
  subjectCode: {
    fontSize: '12px',
    color: '#718096'
  },
  electiveBadge: {
    fontSize: '11px',
    color: '#D69E2E',
    backgroundColor: '#FFF3CD',
    padding: '2px 6px',
    borderRadius: '10px',
    alignSelf: 'flex-start',
    marginTop: '4px',
    fontWeight: '500'
  },
  electiveHelpText: {
    color: '#718096',
    fontSize: '13px',
    marginTop: '8px',
    display: 'block'
  },
  summary: {
    backgroundColor: '#F5F7FA',
    padding: '20px',
    borderRadius: '8px',
    marginTop: '24px'
  },
  summaryStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginTop: '12px'
  },
  summaryStat: {
    textAlign: 'center'
  },
  summaryLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#718096',
    marginBottom: '4px'
  },
  summaryValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: '600',
    color: '#4B5320'
  },
  loadingSubjects: {
    textAlign: 'center',
    padding: '40px',
    color: '#718096'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px auto'
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
    ':hover': {
      backgroundColor: '#4A5568',
      transform: 'translateY(-2px)'
    },
    ':disabled': {
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
    ':hover': {
      backgroundColor: '#B7791F',
      transform: 'translateY(-2px)',
      color: 'white'
    },
    ':disabled': {
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
  
  .subjectCheckbox input[type="checkbox"]:checked + div {
    background-color: #FFF3CD;
    border-color: #D69E2E;
  }
  
  .subjectCheckbox input[type="checkbox"]:disabled + div {
    opacity: 0.6;
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
    
    .electiveSubjectsGrid {
      grid-template-columns: 1fr;
    }
    
    .summaryStats {
      grid-template-columns: 1fr;
    }
  }
`;
document.head.appendChild(styleSheet);

export default CreateStudentWithSubjects;