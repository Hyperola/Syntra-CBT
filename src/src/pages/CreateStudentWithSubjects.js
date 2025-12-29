// pages/CreateStudentWithSubjects.js - UPDATED WITH NEW FIELD STRUCTURE
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
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Student basic info - UPDATED TO NEW FIELD STRUCTURE
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
    picture: null
  });
  
  // Image upload state
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Class and subject data
  const [classes, setClasses] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]); // Both core and elective subjects
  
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
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/classes', {
        headers: { Authorization: `Bearer ${token}` }
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

  const fetchClassSubjects = async (classId) => {
    try {
      const token = localStorage.getItem('token');
      
      let subjectsList = [];
      
      try {
        const res = await axios.get(`http://localhost:5000/api/classes/${classId}/subjects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data && Array.isArray(res.data.subjects)) {
          subjectsList = res.data.subjects;
        } else if (res.data && res.data.success && Array.isArray(res.data.data)) {
          subjectsList = res.data.data;
        } else if (Array.isArray(res.data)) {
          subjectsList = res.data;
        }
      } catch (firstErr) {
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
      
      const subjectsListFormatted = subjectsList.map(sub => ({
        id: sub._id || sub.id || sub.subjectId,
        _id: sub._id || sub.id || sub.subjectId,
        name: sub.name || sub.displayName || 'Unknown Subject',
        code: sub.code || '',
        isCore: sub.isCore || false
      }));
      
      setClassSubjects(subjectsListFormatted);
      
      // Auto-select core subjects
      const coreSubjectIds = subjectsListFormatted
        .filter(subject => subject.isCore)
        .map(subject => subject.id);
      
      // Start with core subjects selected
      setSelectedSubjects(coreSubjectIds);
    } catch (err) {
      console.error('Error fetching class subjects:', err);
      setClassSubjects([]);
      setSelectedSubjects([]);
    }
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
      setStudentData(prev => ({ ...prev, picture: file.name }));
    } catch (err) {
      setError('Failed to process image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfileImage = () => {
    setProfileImage(null);
    setImagePreview(null);
    setStudentData(prev => ({ ...prev, picture: null }));
  };

  const toggleSubjectSelection = (subjectId) => {
    const subject = classSubjects.find(s => s.id === subjectId);
    if (subject && subject.isCore) {
      // Core subjects cannot be deselected
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
      if (!token) {
        throw new Error('No authentication token found.');
      }
      
      const cleanedUsername = cleanUsername(studentData.username);
      
      // Get core and elective subjects
      const coreSubjects = classSubjects.filter(subject => subject.isCore);
      const electiveSubjects = classSubjects.filter(subject => !subject.isCore);
      
      // Only include selected elective subjects
      const electiveSubjectIds = electiveSubjects
        .filter(subject => selectedSubjects.includes(subject.id))
        .map(subject => subject.id);
      
      // Build student data with new field structure
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
        // Send only elective subjects - backend will add core subjects automatically
        enrolledSubjects: electiveSubjectIds
      };
      
      console.log('📤 Creating student with data:', studentDataToSend);
      
      // Step 1: Create the student
      const response = await axios.post('http://localhost:5000/api/users', 
        studentDataToSend, 
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const studentId = response.data.data?._id || response.data._id;
      
      // Step 2: Upload profile image if selected
      if (profileImage && studentId) {
        const formDataImage = new FormData();
        formDataImage.append('profileImage', profileImage);
        
        try {
          await axios.post(
            `http://localhost:5000/api/users/${studentId}/upload-profile-image`,
            formDataImage,
            {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              }
            }
          );
          console.log('✅ Profile image uploaded successfully');
        } catch (imageErr) {
          console.warn('⚠️ Could not upload profile image:', imageErr);
          // Continue even if image upload fails
        }
      }
      
      console.log('✅ Student created:', response.data);
      
      // Show success message with details
      const coreCount = coreSubjects.length;
      const electiveCount = electiveSubjectIds.length;
      setSuccess(`Student created successfully! Enrolled in ${coreCount} core subjects and ${electiveCount} elective subjects.`);
      
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
        picture: null
      });
      setSelectedSubjects([]);
      setClassSubjects([]);
      setProfileImage(null);
      setImagePreview(null);
      
      // Navigate back after 3 seconds
      setTimeout(() => {
        navigate('/admin/users');
      }, 3000);
      
    } catch (err) {
      console.error('❌ Error creating student:', err);
      
      if (err.response) {
        console.error('Response error details:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          headers: err.response.headers
        });
        
        let errorMessage = 'Server error occurred';
        if (err.response.data) {
          if (err.response.data.message) {
            errorMessage = err.response.data.message;
          } else if (err.response.data.error) {
            errorMessage = err.response.data.error;
          } else if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
            errorMessage = err.response.data.errors.join(', ');
          } else if (typeof err.response.data === 'object') {
            errorMessage = JSON.stringify(err.response.data);
          }
        }
        setError(`Server Error (${err.response.status}): ${errorMessage}`);
      } else if (err.request) {
        console.error('Request error details:', err.request);
        setError('No response from server. Please check your network connection.');
      } else {
        console.error('Error details:', err.message);
        setError(`Request Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const getCoreSubjects = () => {
    return classSubjects.filter(subject => subject.isCore);
  };

  const getElectiveSubjects = () => {
    return classSubjects.filter(subject => !subject.isCore);
  };

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div style={styles.authRequired}>
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
                value={studentData.username}
                onChange={(e) => setStudentData({...studentData, username: e.target.value})}
                placeholder="john_doe"
                style={{...styles.input, ...(errors.username && styles.inputError)}}
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
                value={studentData.email}
                onChange={(e) => setStudentData({...studentData, email: e.target.value})}
                placeholder="john@school.com"
                style={{...styles.input, ...(errors.email && styles.inputError)}}
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
                value={studentData.firstName}
                onChange={(e) => setStudentData({...studentData, firstName: e.target.value})}
                placeholder="John"
                style={{...styles.input, ...(errors.firstName && styles.inputError)}}
              />
              {errors.firstName && <span style={styles.errorText}>{errors.firstName}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Middle Name</label>
              <input
                type="text"
                value={studentData.middleName}
                onChange={(e) => setStudentData({...studentData, middleName: e.target.value})}
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
                value={studentData.lastName}
                onChange={(e) => setStudentData({...studentData, lastName: e.target.value})}
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
                value={studentData.password}
                onChange={(e) => setStudentData({...studentData, password: e.target.value})}
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
                value={studentData.confirmPassword}
                onChange={(e) => setStudentData({...studentData, confirmPassword: e.target.value})}
                placeholder="••••••••"
                style={{...styles.input, ...(errors.confirmPassword && styles.inputError)}}
              />
              {errors.confirmPassword && <span style={styles.errorText}>{errors.confirmPassword}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Student ID</label>
              <input
                type="text"
                value={studentData.studentId}
                onChange={(e) => setStudentData({...studentData, studentId: e.target.value})}
                placeholder="STU001"
                style={styles.input}
              />
              <small style={styles.helpText}>Optional - must be unique if provided</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>
                Class <span style={styles.required}>*</span>
              </label>
              <select
                value={studentData.class}
                onChange={(e) => setStudentData({...studentData, class: e.target.value})}
                style={{...styles.select, ...(errors.class && styles.inputError)}}
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
                value={studentData.parentEmail}
                onChange={(e) => setStudentData({...studentData, parentEmail: e.target.value})}
                placeholder="parent@email.com"
                style={{...styles.input, ...(errors.parentEmail && styles.inputError)}}
              />
              {errors.parentEmail && <span style={styles.errorText}>{errors.parentEmail}</span>}
              <small style={styles.helpText}>Either student email or parent email is required</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Parent Phone Number</label>
              <input
                type="tel"
                value={studentData.parentPhoneNumber}
                onChange={(e) => setStudentData({...studentData, parentPhoneNumber: e.target.value})}
                placeholder="+1234567890"
                style={styles.input}
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
                value={studentData.dateOfBirth}
                onChange={(e) => handleDateOfBirthChange(e.target.value)}
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Age</label>
              <input
                type="number"
                value={studentData.age}
                readOnly
                style={{...styles.input, backgroundColor: '#F5F7FA'}}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Sex</label>
              <select
                value={studentData.sex}
                onChange={(e) => setStudentData({...studentData, sex: e.target.value})}
                style={styles.select}
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
                value={studentData.address}
                onChange={(e) => setStudentData({...studentData, address: e.target.value})}
                placeholder="123 Main Street"
                style={{...styles.input, ...(errors.address && styles.inputError)}}
              />
              {errors.address && <span style={styles.errorText}>{errors.address}</span>}
              <small style={styles.helpText}>Home address is required for students</small>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Phone Number</label>
              <input
                type="tel"
                value={studentData.phoneNumber}
                onChange={(e) => setStudentData({...studentData, phoneNumber: e.target.value})}
                placeholder="+1234567890"
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Status</label>
              <select
                value={studentData.active}
                onChange={(e) => setStudentData({...studentData, active: e.target.value === 'true'})}
                style={styles.select}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
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
                Core subjects are automatically enrolled. Select elective subjects below.
              </p>
            </div>
            
            {/* Core Subjects (Auto-enrolled) */}
            {getCoreSubjects().length > 0 && (
              <div style={styles.subjectGroup}>
                <h4 style={styles.subjectGroupTitle}>Core Subjects (Required)</h4>
                <div style={styles.coreSubjectsList}>
                  {getCoreSubjects().map(subject => (
                    <div key={subject.id} style={styles.coreSubjectItem}>
                      <span style={styles.subjectName}>
                        {subject.name}
                        {subject.code && ` (${subject.code})`}
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
                        disabled={subject.isCore}
                      />
                      <div style={styles.subjectCheckboxContent}>
                        <span style={styles.subjectName}>{subject.name}</span>
                        {subject.code && (
                          <span style={styles.subjectCode}>{subject.code}</span>
                        )}
                        <span style={styles.electiveBadge}>Elective</span>
                      </div>
                    </label>
                  ))}
                </div>
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
                  <span style={styles.summaryLabel}>Core Subjects:</span>
                  <span style={styles.summaryValue}>{getCoreSubjects().length}</span>
                </div>
                <div style={styles.summaryStat}>
                  <span style={styles.summaryLabel}>Elective Subjects:</span>
                  <span style={styles.summaryValue}>
                    {selectedSubjects.length - getCoreSubjects().length}
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
    cursor: 'pointer',
    transition: 'border-color 0.2s',
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
  coreSubjectsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '24px'
  },
  coreSubjectItem: {
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
    '&:hover': {
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