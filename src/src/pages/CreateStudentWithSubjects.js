// pages/CreateStudentWithSubjects.js - UPDATED WITH FIXED DATA STRUCTURE
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiUser, FiBook, FiCheck, FiX, FiAlertCircle, FiCheckCircle,
  FiLoader, FiCalendar, FiPhone, FiMapPin, FiUsers, FiLock, FiMail
} from 'react-icons/fi';

const CreateStudentWithSubjects = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Student basic info - ALIGNED WITH USER MODEL
  const [studentData, setStudentData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    name: '',
    surname: '',
    studentId: '',
    dateOfBirth: '',
    address: '',
    phoneNumber: '',
    sex: '',
    age: '',
    class: '',
    active: true
  });
  
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
      const res = await axios.get('http://localhost:5000/api/users/assignment/classes', {
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
        const className = cls.name || cls.fullName || `Class ${classId?.substring(0, 4)}...`;
        
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
      const res = await axios.get(`http://localhost:5000/api/users/assignment/classes/${classId}/subjects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data && res.data.subjects) {
        const subjectsList = res.data.subjects.map(sub => ({
          id: sub._id || sub.id,
          _id: sub._id || sub.id,
          name: sub.name || sub.displayName || 'Unknown Subject',
          code: sub.code || '',
          isCore: sub.isCore || false
        }));
        
        setClassSubjects(subjectsList);
        
        // Auto-select core subjects
        const coreSubjectIds = subjectsList
          .filter(subject => subject.isCore)
          .map(subject => subject.id);
        
        // Start with core subjects selected
        setSelectedSubjects(coreSubjectIds);
      } else {
        setClassSubjects([]);
        setSelectedSubjects([]);
      }
    } catch (err) {
      console.error('Error fetching class subjects:', err);
      setClassSubjects([]);
      setSelectedSubjects([]);
    }
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
    if (!studentData.email.trim()) newErrors.email = 'Email is required';
    if (!studentData.name.trim()) newErrors.name = 'Name is required';
    if (!studentData.surname.trim()) newErrors.surname = 'Surname is required';
    if (!studentData.class) newErrors.class = 'Class is required';
    
    // Username format validation
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(cleanedUsername)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores. No spaces allowed.';
    }
    
    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (studentData.email && !emailRegex.test(studentData.email)) {
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
      
      // Build student data according to User model
      const studentDataToSend = {
        username: cleanedUsername,
        password: studentData.password,
        email: studentData.email.trim(),
        name: studentData.name.trim(),
        surname: studentData.surname.trim(),
        role: 'student',
        class: studentData.class,
        studentId: studentData.studentId?.trim() || undefined,
        dateOfBirth: studentData.dateOfBirth || null,
        address: studentData.address?.trim() || null,
        phoneNumber: studentData.phoneNumber?.trim() || null,
        sex: studentData.sex || null,
        age: studentData.age ? parseInt(studentData.age) : null,
        active: studentData.active,
        // Send only elective subjects - backend will add core subjects automatically
        enrolledSubjects: electiveSubjectIds
      };
      
      console.log('📤 Creating student with data:', studentDataToSend);
      
      const response = await axios.post('http://localhost:5000/api/users', 
        studentDataToSend, 
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
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
        name: '',
        surname: '',
        studentId: '',
        dateOfBirth: '',
        address: '',
        phoneNumber: '',
        sex: '',
        age: '',
        class: '',
        active: true
      });
      setSelectedSubjects([]);
      setClassSubjects([]);
      
      // Navigate back after 3 seconds
      setTimeout(() => {
        navigate('/admin/users');
      }, 3000);
      
    } catch (err) {
      console.error('❌ Error creating student:', err);
      
      // Enhanced error logging
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
            // Try to stringify the entire response data
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
        {/* Basic Student Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FiUser /> Student Information
          </h3>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label>Username *</label>
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
              <label>Email *</label>
              <input
                type="email"
                value={studentData.email}
                onChange={(e) => setStudentData({...studentData, email: e.target.value})}
                placeholder="john@school.com"
                style={{...styles.input, ...(errors.email && styles.inputError)}}
              />
              {errors.email && <span style={styles.errorText}>{errors.email}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label>Name *</label>
              <input
                type="text"
                value={studentData.name}
                onChange={(e) => setStudentData({...studentData, name: e.target.value})}
                placeholder="John"
                style={{...styles.input, ...(errors.name && styles.inputError)}}
              />
              {errors.name && <span style={styles.errorText}>{errors.name}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label>Surname *</label>
              <input
                type="text"
                value={studentData.surname}
                onChange={(e) => setStudentData({...studentData, surname: e.target.value})}
                placeholder="Doe"
                style={{...styles.input, ...(errors.surname && styles.inputError)}}
              />
              {errors.surname && <span style={styles.errorText}>{errors.surname}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label>Password *</label>
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
              <label>Confirm Password *</label>
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
              <label>Student ID</label>
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
              <label>Class *</label>
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

        {/* Personal Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FiUser /> Personal Information
          </h3>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label>Date of Birth</label>
              <input
                type="date"
                value={studentData.dateOfBirth}
                onChange={(e) => handleDateOfBirthChange(e.target.value)}
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label>Age</label>
              <input
                type="number"
                value={studentData.age}
                readOnly
                style={{...styles.input, backgroundColor: '#F0F0F0'}}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label>Sex</label>
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
              <label>Phone Number</label>
              <input
                type="tel"
                value={studentData.phoneNumber}
                onChange={(e) => setStudentData({...studentData, phoneNumber: e.target.value})}
                placeholder="+1234567890"
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label>Address</label>
              <input
                type="text"
                value={studentData.address}
                onChange={(e) => setStudentData({...studentData, address: e.target.value})}
                placeholder="123 Main Street"
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label>Status</label>
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
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  header: {
    marginBottom: '32px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#4B5320',
    margin: '0 0 8px 0'
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
    justifyContent: 'space-between',
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
    justifyContent: 'space-between',
    gap: '12px',
    fontWeight: '500'
  },
  closeMessageButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    borderRadius: '4px'
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
  classInfo: {
    backgroundColor: '#F8F9FA',
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
    color: '#666',
    margin: 0,
    fontSize: '14px'
  },
  subjectGroup: {
    marginBottom: '24px'
  },
  subjectGroupTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
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
    borderRadius: '6px'
  },
  subjectName: {
    fontWeight: '500'
  },
  requiredBadge: {
    padding: '4px 8px',
    backgroundColor: '#E6FFE6',
    color: '#228B22',
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
    border: '2px solid #E0E0E0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: 'white'
  },
  checkbox: {
    marginRight: '10px',
    marginTop: '3px',
    cursor: 'pointer'
  },
  subjectCheckboxContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1
  },
  subjectCode: {
    fontSize: '12px',
    color: '#666'
  },
  electiveBadge: {
    fontSize: '11px',
    color: '#D4A017',
    backgroundColor: '#FFF3CD',
    padding: '2px 6px',
    borderRadius: '10px',
    alignSelf: 'flex-start',
    marginTop: '4px'
  },
  summary: {
    backgroundColor: '#F8F9FA',
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
    color: '#666',
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
    color: '#666'
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
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background-color 0.2s'
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
    gap: '8px',
    transition: 'background-color 0.2s'
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
    border-color: #D4A017;
  }
  
  .subjectCheckbox input[type="checkbox"]:disabled + div {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
document.head.appendChild(styleSheet);

// Add hover effects
const hoverStyles = document.createElement('style');
hoverStyles.textContent = `
  .cancelButton:hover {
    background-color: #4B5563;
  }
  
  .submitButton:hover {
    background-color: #B8860B;
  }
  
  .subjectCheckbox:hover {
    border-color: #D4A017;
    background-color: #FFF9E6;
  }
  
  .subjectCheckbox input[type="checkbox"]:checked + div {
    background-color: #FFF3CD;
    border-color: #D4A017;
  }
`;
document.head.appendChild(hoverStyles);

export default CreateStudentWithSubjects;