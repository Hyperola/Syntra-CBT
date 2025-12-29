// pages/CreateTeacherWithSubjects.js - UPDATED WITH CORRECT ASSIGNMENT SAVING
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
  const { user } = useContext(AuthContext);
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
    picture: null
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
  const [subjectCache, setSubjectCache] = useState({}); // Cache for subject names
  
  // Form validation
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/classes', {
        headers: { Authorization: `Bearer ${token}` }
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

  const fetchAssignmentSubjects = async (classId) => {
    if (!classId) {
      setAvailableSubjectsForAssignment([]);
      return;
    }

    setLoadingAssignmentSubjects(true);
    try {
      const token = localStorage.getItem('token');
      
      let subjectsList = [];
      
      try {
        // Try the new endpoint first
        const res = await axios.get(`http://localhost:5000/api/users/assignment/classes/${classId}/subjects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data && Array.isArray(res.data.subjects)) {
          subjectsList = res.data.subjects;
        } else if (res.data && res.data.success && Array.isArray(res.data.data)) {
          subjectsList = res.data.data;
        }
      } catch (firstErr) {
        console.warn('Assignment subjects API failed, trying alternative...');
        try {
          // Try class subjects endpoint
          const res = await axios.get(`http://localhost:5000/api/classes/${classId}/subjects`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (res.data && Array.isArray(res.data.subjects)) {
            subjectsList = res.data.subjects;
          } else if (res.data && res.data.success && Array.isArray(res.data.data)) {
            subjectsList = res.data.data;
          }
        } catch (secondErr) {
          console.warn('Second API failed, trying all subjects...');
          const res = await axios.get('http://localhost:5000/api/subjects', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (res.data && Array.isArray(res.data.subjects)) {
            subjectsList = res.data.subjects.filter(sub => 
              sub.classId === classId || sub.class === classId || 
              (sub.classes && sub.classes.includes(classId))
            );
          } else if (res.data && res.data.success && Array.isArray(res.data.data)) {
            subjectsList = res.data.data.filter(sub => 
              sub.classId === classId || sub.class === classId || 
              (sub.classes && sub.classes.includes(classId))
            );
          } else if (Array.isArray(res.data)) {
            subjectsList = res.data.filter(sub => 
              sub.classId === classId || sub.class === classId || 
              (sub.classes && sub.classes.includes(classId))
            );
          }
        }
      }
      
      const formattedSubjects = subjectsList.map(sub => ({
        id: sub._id || sub.id || sub.subjectId,
        _id: sub._id || sub.id || sub.subjectId,
        name: sub.name || sub.displayName || sub.subjectName || sub.subject?.name || 'Unknown Subject',
        code: sub.code || sub.subjectCode || '',
        isCore: sub.isCore || false
      })).filter(Boolean);
      
      setAvailableSubjectsForAssignment(formattedSubjects);
      
      // Cache subject names for later use
      const newCache = { ...subjectCache };
      formattedSubjects.forEach(sub => {
        if (sub.id && sub.name) {
          newCache[sub.id] = sub.name;
        }
      });
      setSubjectCache(newCache);
      
    } catch (err) {
      console.error('Error fetching assignment subjects:', err);
      setError('Failed to load subjects for assignment.');
      setAvailableSubjectsForAssignment([]);
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

  const handleAssignmentSubjectToggle = (subjectId) => {
    setTeacherAssignmentModal(prev => {
      const isSelected = prev.selectedSubjects.includes(subjectId);
      return {
        ...prev,
        selectedSubjects: isSelected 
          ? prev.selectedSubjects.filter(id => id !== subjectId)
          : [...prev.selectedSubjects, subjectId]
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
      // First, get subject names from backend for accuracy
      const token = localStorage.getItem('token');
      const subjectPromises = teacherAssignmentModal.selectedSubjects.map(async (subjectId) => {
        try {
          const res = await axios.get(`http://localhost:5000/api/subjects/${subjectId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (res.data && res.data.subject) {
            return {
              id: subjectId,
              name: res.data.subject.name || res.data.subject.displayName || 'Unknown Subject'
            };
          }
        } catch (err) {
          console.warn(`Could not fetch subject ${subjectId}:`, err.message);
          return {
            id: subjectId,
            name: subjectCache[subjectId] || `Subject ${subjectId}`
          };
        }
      });

      const subjectsWithNames = await Promise.all(subjectPromises);

      // Format assignment according to backend expectations
      const newAssignment = {
        class: teacherAssignmentModal.selectedClass, // Backend expects 'class' (ObjectId)
        subjects: subjectsWithNames.map(subject => ({
          subject: subject.id, // Backend expects 'subject' (ObjectId)
          subjectName: subject.name // Backend expects 'subjectName' (String)
        }))
      };

      // Check if this class is already assigned
      const existingIndex = teacherAssignments.findIndex(
        assignment => assignment.class === teacherAssignmentModal.selectedClass
      );

      let updatedAssignments;
      if (existingIndex >= 0) {
        // Update existing assignment - merge subjects
        updatedAssignments = [...teacherAssignments];
        const existingAssignment = updatedAssignments[existingIndex];
        
        // Combine subjects, avoiding duplicates
        const existingSubjectIds = existingAssignment.subjects.map(s => s.subject);
        const newSubjects = newAssignment.subjects.filter(
          subject => !existingSubjectIds.includes(subject.subject)
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
        // Add new assignment
        updatedAssignments = [...teacherAssignments, newAssignment];
      }

      setTeacherAssignments(updatedAssignments);
      closeTeacherAssignmentModal();
      
      setSuccess(`Added ${subjectsWithNames.length} subject(s) to ${selectedClass.name}`);
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error adding assignment:', err);
      setError('Failed to fetch subject details. Please try again.');
    }
  };

  const removeTeacherAssignment = (classId) => {
    setTeacherAssignments(prev => 
      prev.filter(assignment => assignment.class !== classId)
    );
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
      setTeacherData(prev => ({ ...prev, picture: file.name }));
    } catch (err) {
      setError('Failed to process image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfileImage = () => {
    setProfileImage(null);
    setImagePreview(null);
    setTeacherData(prev => ({ ...prev, picture: null }));
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
      if (!token) {
        throw new Error('No authentication token found.');
      }
      
      const cleanedUsername = cleanUsername(teacherData.username);
      
      // FORMAT TEACHER ASSIGNMENTS CORRECTLY
      // This is the key fix - match backend expectations exactly
      const formattedAssignments = teacherAssignments.map(assignment => {
        // Get class name for this assignment
        const classObj = classes.find(c => c._id === assignment.class);
        const className = classObj ? classObj.name : 'Unknown Class';
        
        return {
          class: assignment.class, // ObjectId
          subjects: assignment.subjects.map(subject => ({
            subject: subject.subject, // ObjectId
            subjectName: subject.subjectName // String
          }))
        };
      });
      
      console.log('📤 Formatted assignments for backend:', JSON.stringify(formattedAssignments, null, 2));
      
      // Build teacher data according to backend expectations
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
        teacherAssignments: formattedAssignments // This is the key field
      };
      
      console.log('📤 Creating teacher with data:', JSON.stringify(teacherDataToSend, null, 2));
      
      // Step 1: Create the teacher with all data including assignments
      const response = await axios.post('http://localhost:5000/api/users', 
        teacherDataToSend, 
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      
      console.log('✅ Teacher created successfully:', response.data);
      
      const teacherId = response.data.user?._id || response.data.data?._id || response.data._id || response.data.id;
      
      if (!teacherId) {
        throw new Error('Could not retrieve teacher ID from response');
      }
      
      // Step 2: Upload profile image if selected
      if (profileImage && teacherId) {
        try {
          // Convert image to base64
          const reader = new FileReader();
          const base64Image = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(profileImage);
          });
          
          // Send base64 image with user update
          await axios.put(
            `http://localhost:5000/api/users/${teacherId}`,
            { profileImage: base64Image },
            {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log('✅ Profile image uploaded successfully');
        } catch (imageErr) {
          console.warn('⚠️ Could not upload profile image:', imageErr.message);
          // Continue even if image upload fails
        }
      }
      
      setSuccess('Teacher created successfully with assignments!');
      
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
        picture: null
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
      
    } catch (err) {
      console.error('❌ Error creating teacher:', err);
      
      let errorMessage = 'Failed to create teacher';
      
      if (err.response) {
        console.error('❌ Server error details:', err.response.data);
        
        if (err.response.data) {
          if (err.response.data.message) {
            errorMessage = err.response.data.message;
          } else if (err.response.data.error) {
            errorMessage = err.response.data.error;
          } else if (err.response.data.errors) {
            errorMessage = Object.values(err.response.data.errors).join(', ');
          } else if (typeof err.response.data === 'string') {
            errorMessage = err.response.data;
          }
        }
        setError(`Server Error (${err.response.status}): ${errorMessage}`);
      } else if (err.request) {
        setError('Network error. Please check your connection.');
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
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
                value={teacherData.username}
                onChange={(e) => setTeacherData({...teacherData, username: e.target.value})}
                placeholder="john_doe"
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
                value={teacherData.email}
                onChange={(e) => setTeacherData({...teacherData, email: e.target.value})}
                placeholder="john@school.com"
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
                value={teacherData.firstName}
                onChange={(e) => setTeacherData({...teacherData, firstName: e.target.value})}
                placeholder="John"
                style={{...styles.input, ...(errors.firstName && styles.inputError)}}
              />
              {errors.firstName && <span style={styles.errorText}>{errors.firstName}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Middle Name</label>
              <input
                type="text"
                value={teacherData.middleName}
                onChange={(e) => setTeacherData({...teacherData, middleName: e.target.value})}
                placeholder="Michael (optional)"
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Last Name <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={teacherData.lastName}
                onChange={(e) => setTeacherData({...teacherData, lastName: e.target.value})}
                placeholder="Doe"
                style={{...styles.input, ...(errors.lastName && styles.inputError)}}
              />
              {errors.lastName && <span style={styles.errorText}>{errors.lastName}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Password <span style={styles.required}>*</span>
              </label>
              <input
                type="password"
                value={teacherData.password}
                onChange={(e) => setTeacherData({...teacherData, password: e.target.value})}
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
                value={teacherData.confirmPassword}
                onChange={(e) => setTeacherData({...teacherData, confirmPassword: e.target.value})}
                placeholder="••••••••"
                style={{...styles.input, ...(errors.confirmPassword && styles.inputError)}}
              />
              {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Phone Number</label>
              <input
                type="tel"
                value={teacherData.phoneNumber}
                onChange={(e) => setTeacherData({...teacherData, phoneNumber: e.target.value})}
                placeholder="+1234567890"
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Date of Birth</label>
              <input
                type="date"
                value={teacherData.dateOfBirth}
                onChange={(e) => handleDateOfBirthChange(e.target.value)}
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Age</label>
              <input
                type="number"
                value={teacherData.age}
                readOnly
                style={{...styles.input, backgroundColor: '#F5F7FA'}}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Sex</label>
              <select
                value={teacherData.sex}
                onChange={(e) => setTeacherData({...teacherData, sex: e.target.value})}
                style={styles.select}
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
                value={teacherData.address}
                onChange={(e) => setTeacherData({...teacherData, address: e.target.value})}
                placeholder="e.g., 123 Main St"
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Primary Class (Optional)</label>
              <select
                value={teacherData.class}
                onChange={(e) => setTeacherData({...teacherData, class: e.target.value})}
                style={styles.select}
                disabled={loadingClasses}
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
                value={teacherData.active}
                onChange={(e) => setTeacherData({...teacherData, active: e.target.value === 'true'})}
                style={styles.select}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
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
                        {subject.subjectName || getSubjectName(subject.subject)}
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
                  disabled={loadingAssignmentSubjects}
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
                            </span>
                          </label>
                        ))}
                      </div>
                      <small style={{ color: '#718096', fontSize: '12px' }}>
                        {teacherAssignmentModal.selectedSubjects.length} subject(s) selected
                      </small>
                    </>
                  ) : (
                    <div style={styles.noSubjectsMessage}>
                      <p>No subjects available for this class.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                onClick={addTeacherAssignment}
                disabled={!teacherAssignmentModal.selectedClass || teacherAssignmentModal.selectedSubjects.length === 0}
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
    '&:hover': {
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
    '&:focus': {
      outline: 'none',
      borderColor: '#3182CE',
      boxShadow: '0 0 0 3px rgba(49, 130, 206, 0.1)'
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
  loadingText: {
    fontSize: '12px',
    color: '#D69E2E',
    marginLeft: '8px'
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
    '&:hover:not(:disabled)': {
      backgroundColor: '#3A4218',
      transform: 'translateY(-2px)'
    },
    '&:disabled': {
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
    '&:hover:not(:disabled)': {
      backgroundColor: '#FED7D7',
      transform: 'translateY(-2px)'
    },
    '&:disabled': {
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
    '&:hover': {
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
    '&:hover': {
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
    '&:hover:not(:disabled)': {
      backgroundColor: '#B7791F',
      transform: 'translateY(-2px)',
      color: 'white'
    },
    '&:disabled': {
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
    '&:hover': {
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
  
  button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    transition: all 0.2s ease;
  }
  
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
  
  input[type="checkbox"] {
    cursor: pointer;
    accent-color: #3182CE;
  }
  
  .subjectCheckbox input[type="checkbox"]:checked + span {
    font-weight: 600;
    color: #2D3748;
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