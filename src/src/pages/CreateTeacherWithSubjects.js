// pages/CreateTeacherWithSubjects.js - UPDATED WITH CORRECT SUBJECT FETCHING
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiUser, FiBook, FiCheck, FiX, FiPlus, FiTrash2,
  FiChevronDown, FiChevronUp, FiAlertCircle, FiCheckCircle,
  FiLock, FiMail, FiPhone, FiLoader, FiAlertTriangle,
  FiXCircle, FiSave, FiUpload, FiImage, FiMapPin, FiCalendar
} from 'react-icons/fi';

const CreateTeacherWithSubjects = () => {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Teacher basic info
  const [teacherData, setTeacherData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    firstName: '',
    middleName: '',
    lastName: '',
    phoneNumber: '',
    class: '',
    active: true,
    dateOfBirth: '',
    address: '',
    sex: '',
    age: '',
  });
  
  // Image upload state
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Class and subject assignments
  const [classes, setClasses] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [teacherAssignmentModal, setTeacherAssignmentModal] = useState({
    open: false,
    selectedClass: '',
    selectedSubjects: []
  });
  const [availableSubjectsForAssignment, setAvailableSubjectsForAssignment] = useState([]);
  const [loadingAssignmentSubjects, setLoadingAssignmentSubjects] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [subjectCache, setSubjectCache] = useState({});
  
  // Form validation
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoadingClasses(true);
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
      setError('Failed to load classes. Please try again.');
      setClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  // UPDATED: Fetch subjects for a specific class using correct endpoint
  const fetchAssignmentSubjects = async (classId) => {
    if (!classId) {
      setAvailableSubjectsForAssignment([]);
      return;
    }

    setLoadingAssignmentSubjects(true);
    try {
      const authToken = token || localStorage.getItem('token');
      
      console.log('🔍 Fetching subjects for class:', classId);
      
      // FIXED: Use the correct class-subjects endpoint
      const res = await axios.get(`http://localhost:5000/api/class-subjects/class/${classId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log('📚 Subjects API response:', res.data);
      
      let subjectsList = [];
      
      // Handle different response formats
      if (res.data && Array.isArray(res.data.subjects)) {
        subjectsList = res.data.subjects;
      } else if (res.data && Array.isArray(res.data)) {
        subjectsList = res.data;
      } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
        subjectsList = res.data.data;
      }
      
      console.log('📦 Extracted subjects list:', subjectsList);
      
      // Format subjects properly
      const formattedSubjects = subjectsList.map(subjectItem => {
        // Extract subject data from different response structures
        const subject = subjectItem.subject || subjectItem;
        const assignmentId = subjectItem._id || subjectItem.id;
        
        return {
          id: assignmentId, // Use the assignment ID for tracking
          subjectId: subject?._id || subject?.id, // The actual subject ID
          name: subject?.name || subjectItem.name || 'Unknown Subject',
          code: subject?.code || subjectItem.code || '',
          isCompulsory: subjectItem.isCompulsory || false,
          isCore: subjectItem.isCore || subjectItem.isCompulsory || false,
          periodCount: subjectItem.periodCount || 0,
          teacher: subjectItem.teacher
        };
      }).filter(sub => sub.id && sub.name);
      
      console.log('✨ Formatted subjects:', formattedSubjects);
      
      setAvailableSubjectsForAssignment(formattedSubjects);
      
      // Update cache
      const newCache = { ...subjectCache };
      formattedSubjects.forEach(sub => {
        if (sub.id && sub.name) {
          newCache[sub.id] = sub.name;
        }
      });
      setSubjectCache(newCache);
      
    } catch (err) {
      console.error('❌ Error fetching assignment subjects:', err);
      
      // Try alternative endpoint as fallback
      try {
        const authToken = token || localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/classes/${classId}/subjects`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        let subjectsList = [];
        if (res.data && Array.isArray(res.data.subjects)) {
          subjectsList = res.data.subjects;
        } else if (res.data && Array.isArray(res.data)) {
          subjectsList = res.data;
        }
        
        const formattedSubjects = subjectsList.map(subject => ({
          id: subject._id || subject.id || subject.subject?._id || subject.subjectId,
          subjectId: subject.subject?._id || subject.subjectId,
          name: subject.name || subject.subject?.name || 'Unknown Subject',
          code: subject.code || subject.subject?.code || '',
          isCore: subject.isCore || false
        })).filter(Boolean);
        
        setAvailableSubjectsForAssignment(formattedSubjects);
        
        const newCache = { ...subjectCache };
        formattedSubjects.forEach(sub => {
          if (sub.id && sub.name) {
            newCache[sub.id] = sub.name;
          }
        });
        setSubjectCache(newCache);
        
      } catch (fallbackErr) {
        console.error('❌ Fallback also failed:', fallbackErr);
        setError('Failed to load subjects for this class.');
        setAvailableSubjectsForAssignment([]);
      }
    } finally {
      setLoadingAssignmentSubjects(false);
    }
  };

  const openTeacherAssignmentModal = () => {
    setTeacherAssignmentModal({
      open: true,
      selectedClass: '',
      selectedSubjects: []
    });
  };

  const closeTeacherAssignmentModal = () => {
    setTeacherAssignmentModal({
      open: false,
      selectedClass: '',
      selectedSubjects: []
    });
    setAvailableSubjectsForAssignment([]);
  };

  const handleAssignmentClassChange = async (classId) => {
    setTeacherAssignmentModal(prev => ({
      ...prev,
      selectedClass: classId,
      selectedSubjects: []
    }));

    await fetchAssignmentSubjects(classId);
  };

  const handleAssignmentSubjectToggle = (subjectAssignmentId) => {
    setTeacherAssignmentModal(prev => {
      const isSelected = prev.selectedSubjects.includes(subjectAssignmentId);
      return {
        ...prev,
        selectedSubjects: isSelected 
          ? prev.selectedSubjects.filter(id => id !== subjectAssignmentId)
          : [...prev.selectedSubjects, subjectAssignmentId]
      };
    });
  };

  const addTeacherAssignment = async () => {
    if (!teacherAssignmentModal.selectedClass || teacherAssignmentModal.selectedSubjects.length === 0) {
      setError('Please select a class and at least one subject');
      return;
    }

    const selectedClass = classes.find(c => c._id === teacherAssignmentModal.selectedClass);
    if (!selectedClass) return;

    try {
      const authToken = token || localStorage.getItem('token');
      
      // Get subject details for selected assignment IDs
      const subjectPromises = teacherAssignmentModal.selectedSubjects.map(async (assignmentId) => {
        const subjectInfo = availableSubjectsForAssignment.find(sub => sub.id === assignmentId);
        
        if (subjectInfo) {
          return {
            id: assignmentId, // This is the class-subject assignment ID
            subjectId: subjectInfo.subjectId, // The actual subject ID
            name: subjectInfo.name,
            isCompulsory: subjectInfo.isCompulsory,
            isCore: subjectInfo.isCore
          };
        }
        
        // Fallback if subject info not in cache
        return {
          id: assignmentId,
          subjectId: assignmentId,
          name: subjectCache[assignmentId] || `Subject ${assignmentId.substring(0, 4)}...`,
          isCompulsory: false,
          isCore: false
        };
      });

      const subjectsWithDetails = await Promise.all(subjectPromises);

      const newAssignment = {
        class: teacherAssignmentModal.selectedClass,
        className: selectedClass.name,
        subjects: subjectsWithDetails.map(subject => ({
          assignmentId: subject.id, // The class-subject assignment ID
          subjectId: subject.subjectId, // The actual subject ID
          subjectName: subject.name,
          isCompulsory: subject.isCompulsory,
          isCore: subject.isCore
        }))
      };

      // Check if this class already has assignments
      const existingIndex = teacherAssignments.findIndex(
        assignment => assignment.class === teacherAssignmentModal.selectedClass
      );

      let updatedAssignments;
      if (existingIndex >= 0) {
        updatedAssignments = [...teacherAssignments];
        const existingAssignment = updatedAssignments[existingIndex];
        
        // Check for duplicate subjects
        const existingSubjectIds = existingAssignment.subjects.map(s => s.assignmentId);
        const newSubjects = newAssignment.subjects.filter(
          subject => !existingSubjectIds.includes(subject.assignmentId)
        );
        
        if (newSubjects.length > 0) {
          updatedAssignments[existingIndex] = {
            ...existingAssignment,
            subjects: [...existingAssignment.subjects, ...newSubjects]
          };
        } else {
          setError('All selected subjects are already assigned to this class.');
          return;
        }
      } else {
        updatedAssignments = [...teacherAssignments, newAssignment];
      }

      setTeacherAssignments(updatedAssignments);
      closeTeacherAssignmentModal();
      
      setSuccess(`Added ${subjectsWithDetails.length} subject(s) to ${selectedClass.name}`);
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error adding assignment:', err);
      setError('Failed to process assignment. Please try again.');
    }
  };

  const removeTeacherAssignment = (classId) => {
    setTeacherAssignments(prev => 
      prev.filter(assignment => assignment.class !== classId)
    );
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
    setTeacherData(prev => ({
      ...prev,
      dateOfBirth: dateString,
      age: age || ''
    }));
  };

  const cleanUsername = (username) => {
    if (!username) return '';
    const cleaned = username.replace(/\s+/g, '_').toLowerCase();
    return cleaned.replace(/[^a-zA-Z0-9_]/g, '');
  };

  const validateForm = () => {
    const newErrors = {};
    const cleanedUsername = cleanUsername(teacherData.username);
    
    if (!cleanedUsername.trim()) newErrors.username = 'Username is required';
    if (!teacherData.password.trim()) newErrors.password = 'Password is required';
    if (teacherData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!teacherData.confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm password';
    if (teacherData.password !== teacherData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!teacherData.email.trim()) newErrors.email = 'Email is required';
    if (!teacherData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!teacherData.lastName.trim()) newErrors.lastName = 'Last name is required';
    
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(cleanedUsername)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores. No spaces allowed.';
    }
    
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (teacherData.email && !emailRegex.test(teacherData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (teacherAssignments.length === 0) {
      newErrors.teacherAssignments = 'At least one class assignment is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit with single request including base64 image
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
      
      const cleanedUsername = cleanUsername(teacherData.username);
      
      // Convert image to base64 if exists
      let profileImageBase64 = null;
      if (profileImage) {
        try {
          profileImageBase64 = await convertImageToBase64(profileImage);
          console.log('✅ Image converted to base64, length:', profileImageBase64.length);
        } catch (imageErr) {
          console.warn('⚠️ Could not convert image to base64:', imageErr);
        }
      }
      
      // Format teacher assignments correctly for backend
      const formattedAssignments = teacherAssignments.map(assignment => {
        const classObj = classes.find(c => c._id === assignment.class);
        
        return {
          class: assignment.class,
          subjects: assignment.subjects.map(subject => ({
            // Send the class-subject assignment ID
            assignmentId: subject.assignmentId,
            // Also send the subject ID
            subjectId: subject.subjectId,
            subjectName: subject.subjectName
          }))
        };
      });
      
      console.log('📤 Formatted assignments for backend:', JSON.stringify(formattedAssignments, null, 2));
      
      // Build teacher data with profile image as base64
      const teacherDataToSend = {
        username: cleanedUsername,
        password: teacherData.password,
        email: teacherData.email.trim().toLowerCase(),
        firstName: teacherData.firstName.trim(),
        middleName: teacherData.middleName?.trim() || '',
        lastName: teacherData.lastName.trim(),
        role: 'teacher',
        class: teacherData.class || undefined,
        phoneNumber: teacherData.phoneNumber?.trim() || undefined,
        active: teacherData.active,
        dateOfBirth: teacherData.dateOfBirth || undefined,
        address: teacherData.address?.trim() || undefined,
        sex: teacherData.sex || undefined,
        age: teacherData.age ? parseInt(teacherData.age) : undefined,
        teacherAssignments: formattedAssignments,
        // Add profile image as base64 if available
        ...(profileImageBase64 && { profileImage: profileImageBase64 })
      };
      
      console.log('📤 Creating teacher with data:', {
        ...teacherDataToSend,
        password: '***',
        profileImage: profileImageBase64 ? 'BASE64_IMAGE_INCLUDED' : 'NO_IMAGE',
      });
      
      // Create teacher in one request
      const response = await axios.post('http://localhost:5000/api/users', 
        teacherDataToSend, 
        {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      console.log('✅ Teacher creation response:', {
        success: response.data.success,
        userId: response.data.user?._id || response.data.data?._id
      });
      
      if (response.data.success) {
        setSuccess('Teacher created successfully with assignments and profile image! Redirecting...');
        
        // Reset form
        setTeacherData({
          username: '',
          password: '',
          confirmPassword: '',
          email: '',
          firstName: '',
          middleName: '',
          lastName: '',
          phoneNumber: '',
          class: '',
          active: true,
          dateOfBirth: '',
          address: '',
          sex: '',
          age: '',
        });
        setTeacherAssignments([]);
        setProfileImage(null);
        setImagePreview(null);
        setSubjectCache({});
        setErrors({});
        
        // Navigate back after 2 seconds
        setTimeout(() => {
          navigate('/admin/users');
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to create teacher');
      }
      
    } catch (err) {
      console.error('❌ Error creating teacher:', err);
      
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
              if (errorMsg.includes('profile image')) validationErrors.profileImage = errorMsg;
            });
            setErrors(validationErrors);
          }
        } else if (err.response.status === 401) {
          setError('Authentication failed. Please log in again.');
          setTimeout(() => navigate('/login'), 2000);
        } else if (err.response.status === 403) {
          setError('Permission denied. You do not have access to create teachers.');
        } else if (err.response.status === 409) {
          setError('User with this username or email already exists.');
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
    setTeacherData(prev => ({
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

  const getClassName = (classId) => {
    const classObj = classes.find(c => c._id === classId);
    return classObj ? classObj.name : 'Unknown Class';
  };

  const getSubjectName = (subjectId) => {
    return subjectCache[subjectId] || `Subject ${subjectId?.substring(0, 4)}...`;
  };

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div style={styles.container}>
        <div style={styles.errorMessage}>
          <FiAlertTriangle /> Access Denied - Admin access required
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Create New Teacher</h1>
        <p style={styles.subtitle}>Add teacher information and assign subjects</p>
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
            Image will be sent as base64 in the same request with teacher data.
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
                <small>Image will be saved with teacher creation</small>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Teacher Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FiUser /> Teacher Information
          </h3>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Username <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="username"
                value={teacherData.username}
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
                Email <span style={styles.required}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={teacherData.email}
                onChange={handleInputChange}
                placeholder="john@school.com"
                style={{...styles.input, ...(errors.email && styles.inputError)}}
                disabled={loading}
                autoComplete="email"
              />
              {errors.email && <span style={styles.errorText}>{errors.email}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                First Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={teacherData.firstName}
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
                value={teacherData.middleName}
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
                value={teacherData.lastName}
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
                value={teacherData.password}
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
                value={teacherData.confirmPassword}
                onChange={handleInputChange}
                placeholder="••••••••"
                style={{...styles.input, ...(errors.confirmPassword && styles.inputError)}}
                disabled={loading}
                autoComplete="new-password"
              />
              {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={teacherData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+1234567890"
                style={styles.input}
                disabled={loading}
                autoComplete="tel"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={teacherData.dateOfBirth}
                onChange={(e) => handleDateOfBirthChange(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Age</label>
              <input
                type="number"
                value={teacherData.age}
                readOnly
                style={{...styles.input, backgroundColor: '#F5F7FA'}}
                disabled={loading}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Sex</label>
              <select
                name="sex"
                value={teacherData.sex}
                onChange={handleInputChange}
                style={styles.select}
                disabled={loading}
              >
                <option value="">Select Sex</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Address</label>
              <input
                type="text"
                name="address"
                value={teacherData.address}
                onChange={handleInputChange}
                placeholder="e.g., 123 Main St"
                style={styles.input}
                disabled={loading}
                autoComplete="street-address"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Primary Class (Optional)</label>
              <select
                name="class"
                value={teacherData.class}
                onChange={handleInputChange}
                style={styles.select}
                disabled={loadingClasses || loading}
              >
                <option value="">Select Primary Class</option>
                {classes.map(cls => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name} {cls.level ? `(${cls.level})` : ''}
                  </option>
                ))}
              </select>
              {loadingClasses && <small style={styles.loadingText}>Loading classes...</small>}
              <small style={styles.helpText}>For timetable purposes. Teachers can teach multiple classes.</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Status</label>
              <select
                name="active"
                value={teacherData.active}
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

        {/* Teacher Assignments Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>
              <FiBook /> Teacher Assignments <span style={styles.required}>*</span>
            </h3>
            {errors.teacherAssignments && (
              <span style={styles.errorText}>{errors.teacherAssignments}</span>
            )}
            <button
              type="button"
              onClick={openTeacherAssignmentModal}
              style={styles.addButton}
              disabled={loading}
            >
              <FiPlus /> Add Assignment
            </button>
          </div>
          
          <p style={styles.helpText}>
            Assign this teacher to teach subjects in different classes. A teacher can teach multiple subjects in multiple classes.
          </p>
          
          {teacherAssignments.length === 0 ? (
            <div style={styles.emptyAssignments}>
              <p>No assignments yet. Click "Add Assignment" to get started.</p>
            </div>
          ) : (
            <div style={styles.assignmentsContainer}>
              {teacherAssignments.map((assignment, index) => (
                <div key={index} style={styles.assignmentItem}>
                  <div style={styles.assignmentHeader}>
                    <strong>{getClassName(assignment.class)}</strong>
                    <button
                      type="button"
                      onClick={() => removeTeacherAssignment(assignment.class)}
                      style={styles.removeAssignmentButton}
                      disabled={loading}
                    >
                      <FiXCircle />
                    </button>
                  </div>
                  <div style={styles.assignmentSubjects}>
                    {assignment.subjects.map((subject, subIndex) => (
                      <span key={subIndex} style={styles.assignmentSubjectBadge}>
                        {subject.subjectName || getSubjectName(subject.assignmentId)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
                <FiCheck /> Create Teacher
              </>
            )}
          </button>
        </div>
      </form>

      {/* Teacher Assignment Modal */}
      {teacherAssignmentModal.open && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modalContent, maxWidth: '600px'}}>
            <div style={styles.modalHeader}>
              <h3 style={{color: '#2D3748', margin: 0}}>Add Teacher Assignment</h3>
              <button onClick={closeTeacherAssignmentModal} style={styles.modalCloseButton}>
                <FiX />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Select Class</label>
                <select
                  value={teacherAssignmentModal.selectedClass}
                  onChange={(e) => handleAssignmentClassChange(e.target.value)}
                  style={styles.input}
                  disabled={loadingAssignmentSubjects || loading}
                >
                  <option value="">Select a Class</option>
                  {classes.map(cls => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {teacherAssignmentModal.selectedClass && (
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>
                    Select Subjects for {getClassName(teacherAssignmentModal.selectedClass)}
                  </label>
                  {loadingAssignmentSubjects ? (
                    <div style={styles.loadingSubjects}>
                      <div style={styles.smallSpinner}></div>
                      <span>Loading subjects...</span>
                    </div>
                  ) : availableSubjectsForAssignment.length > 0 ? (
                    <>
                      <div style={styles.subjectsSelectionGrid}>
                        {availableSubjectsForAssignment.map((subject, index) => (
                          <label key={subject.id || index} style={styles.subjectCheckbox}>
                            <input
                              type="checkbox"
                              checked={teacherAssignmentModal.selectedSubjects.includes(subject.id)}
                              onChange={() => handleAssignmentSubjectToggle(subject.id)}
                              disabled={loading}
                            />
                            <span>
                              {subject.name} 
                              {subject.code && ` (${subject.code})`}
                              {subject.isCore && <span style={styles.coreBadge}>Core</span>}
                              {subject.teacher && (
                                <span style={styles.teacherBadge}>Already has teacher</span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                      <small style={{ color: '#718096', fontSize: '12px' }}>
                        {teacherAssignmentModal.selectedSubjects.length} subject(s) selected
                        {teacherAssignmentModal.selectedSubjects.length > 0 && 
                          availableSubjectsForAssignment.some(sub => 
                            teacherAssignmentModal.selectedSubjects.includes(sub.id) && sub.teacher
                          ) && 
                          <span style={{ color: '#D69E2E', marginLeft: '10px' }}>
                            ⚠️ Some subjects already have teachers assigned
                          </span>
                        }
                      </small>
                    </>
                  ) : (
                    <div style={styles.noSubjectsMessage}>
                      <p>No subjects available for this class. Please add subjects to the class first.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={addTeacherAssignment}
                disabled={!teacherAssignmentModal.selectedClass || teacherAssignmentModal.selectedSubjects.length === 0 || loading}
                style={styles.modalSubmitButton}
              >
                <FiSave /> Add Assignment
              </button>
              <button onClick={closeTeacherAssignmentModal} style={styles.modalCancelButton}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '16px'
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
  helpText: {
    color: '#718096',
    fontSize: '14px',
    margin: '0 0 20px 0',
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
    transition: 'border-color 0.2s',
    cursor: 'pointer',
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
  loadingText: {
    fontSize: '12px',
    color: '#D69E2E',
    marginLeft: '8px'
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#4B5320',
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
      backgroundColor: '#3A4218',
      transform: 'translateY(-2px)'
    },
    ':disabled': {
      opacity: 0.6,
      cursor: 'not-allowed'
    }
  },
  emptyAssignments: {
    backgroundColor: '#F5F7FA',
    padding: '24px',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#718096',
    border: '1px dashed #CBD5E0'
  },
  assignmentsContainer: {
    border: '1px solid #E2E8F0',
    borderRadius: '4px',
    padding: '12px',
    backgroundColor: 'white'
  },
  assignmentItem: {
    marginBottom: '12px',
    padding: '12px',
    border: '1px solid #E2E8F0',
    borderRadius: '4px',
    backgroundColor: '#F5F7FA'
  },
  assignmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  removeAssignmentButton: {
    background: 'none',
    border: 'none',
    color: '#E53E3E',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    borderRadius: '4px',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#FED7D7',
      transform: 'translateY(-2px)'
    },
    ':disabled': {
      opacity: 0.6,
      cursor: 'not-allowed'
    }
  },
  assignmentSubjects: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px'
  },
  assignmentSubjectBadge: {
    fontSize: '12px',
    backgroundColor: '#E3F2FD',
    color: '#1565C0',
    padding: '4px 8px',
    borderRadius: '12px'
  },
  subjectsSelectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '10px',
    maxHeight: '300px',
    overflowY: 'auto',
    padding: '10px',
    border: '1px solid #E2E8F0',
    borderRadius: '4px',
    backgroundColor: 'white'
  },
  subjectCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    padding: '8px',
    border: '1px solid #E2E8F0',
    borderRadius: '4px',
    backgroundColor: '#F5F7FA',
    cursor: 'pointer',
    color: '#2D3748',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#F0F4F8',
      borderColor: '#CBD5E0'
    }
  },
  coreBadge: {
    fontSize: '10px',
    color: '#22543D',
    backgroundColor: '#C6F6D5',
    padding: '2px 6px',
    borderRadius: '10px',
    marginLeft: '4px',
    fontWeight: '500'
  },
  teacherBadge: {
    fontSize: '10px',
    color: '#D69E2E',
    backgroundColor: '#FFF3CD',
    padding: '2px 6px',
    borderRadius: '10px',
    marginLeft: '4px',
    fontWeight: '500'
  },
  loadingSubjects: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#F5F7FA',
    borderRadius: '4px',
    color: '#718096',
    fontSize: '14px'
  },
  noSubjectsMessage: {
    padding: '10px',
    backgroundColor: '#FFF3CD',
    border: '1px solid #FFEAA7',
    borderRadius: '4px',
    color: '#856404',
    fontSize: '14px'
  },
  smallSpinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #f3f3f3',
    borderTop: '2px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '10px'
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
      cursor: 'not-allowed',
      backgroundColor: '#D69E2E'
    }
  },
  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(2px)'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#718096',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    ':hover': {
      backgroundColor: '#F5F7FA'
    }
  },
  modalBody: {
    padding: '20px'
  },
  modalFooter: {
    padding: '20px',
    borderTop: '1px solid #E2E8F0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  modalSubmitButton: {
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
    ':hover': {
      backgroundColor: '#B7791F',
      transform: 'translateY(-2px)',
      color: 'white'
    },
    ':disabled': {
      opacity: 0.6,
      cursor: 'not-allowed'
    }
  },
  modalCancelButton: {
    padding: '10px 20px',
    backgroundColor: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#4A5568',
      transform: 'translateY(-2px)'
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
    
    .sectionHeader {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .addButton {
      width: 100%;
      justify-content: center;
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

export default CreateTeacherWithSubjects;