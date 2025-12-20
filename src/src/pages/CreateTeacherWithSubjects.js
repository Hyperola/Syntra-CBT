// pages/CreateTeacherWithSubjects.js - UPDATED TO MATCH MANAGEUSERS.JS FORMAT
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiUser, FiBook, FiCheck, FiX, FiPlus, FiTrash2,
  FiChevronDown, FiChevronUp, FiAlertCircle, FiCheckCircle,
  FiLock, FiMail, FiPhone, FiLoader, FiAlertTriangle,
  FiXCircle, FiSave
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
    name: '',
    surname: '',
    phoneNumber: '',
    class: '', // Primary class (optional)
    active: true,
    dateOfBirth: '',
    address: '',
    sex: '',
    age: ''
  });
  
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
  
  // Form validation
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoadingClasses(true);
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
        const res = await axios.get(`http://localhost:5000/api/users/assignment/classes/${classId}/subjects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data && res.data.subjects) {
          subjectsList = res.data.subjects;
        } else if (res.data && res.data.success && Array.isArray(res.data.data)) {
          subjectsList = res.data.data;
        }
      } catch (firstErr) {
        console.log('First API attempt failed, trying alternative...', firstErr);
        
        // Try alternative endpoint
        const res = await axios.get(`http://localhost:5000/api/classes/${classId}/subjects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data && Array.isArray(res.data.subjects)) {
          subjectsList = res.data.subjects;
        } else if (res.data && res.data.success && Array.isArray(res.data.data)) {
          subjectsList = res.data.data;
        }
      }
      
      const formattedSubjects = subjectsList.map(sub => ({
        id: sub._id || sub.id || sub.subjectId,
        _id: sub._id || sub.id || sub.subjectId,
        name: sub.name || sub.displayName || sub.subjectName || 'Unknown Subject',
        code: sub.code || sub.subjectCode || '',
        isCore: sub.isCore || false
      })).filter(Boolean);
      
      console.log('📚 Assignment subjects for class', classId, ':', formattedSubjects);
      setAvailableSubjectsForAssignment(formattedSubjects);
      
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

  const addTeacherAssignment = () => {
    if (!teacherAssignmentModal.selectedClass || teacherAssignmentModal.selectedSubjects.length === 0) {
      setError('Please select a class and at least one subject');
      return;
    }

    const selectedClass = classes.find(c => c._id === teacherAssignmentModal.selectedClass);
    if (!selectedClass) return;

    const newAssignment = {
      classId: teacherAssignmentModal.selectedClass,
      className: selectedClass.name,
      subjects: teacherAssignmentModal.selectedSubjects.map(subjectId => {
        const subject = availableSubjectsForAssignment.find(s => s.id === subjectId);
        return {
          subjectId: subjectId,
          subjectName: subject?.name || 'Unknown Subject'
        };
      })
    };

    // Check if this class is already assigned
    const existingIndex = teacherAssignments.findIndex(
      assignment => assignment.classId === teacherAssignmentModal.selectedClass
    );

    if (existingIndex >= 0) {
      // Update existing assignment
      const updatedAssignments = [...teacherAssignments];
      updatedAssignments[existingIndex] = newAssignment;
      setTeacherAssignments(updatedAssignments);
    } else {
      // Add new assignment
      setTeacherAssignments([...teacherAssignments, newAssignment]);
    }

    closeTeacherAssignmentModal();
  };

  const removeTeacherAssignment = (classId) => {
    setTeacherAssignments(prev => 
      prev.filter(assignment => assignment.classId !== classId)
    );
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
    
    // Basic teacher info validation
    if (!cleanedUsername.trim()) newErrors.username = 'Username is required';
    if (!teacherData.password.trim()) newErrors.password = 'Password is required';
    if (teacherData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!teacherData.confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm password';
    if (teacherData.password !== teacherData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!teacherData.email.trim()) newErrors.email = 'Email is required';
    if (!teacherData.name.trim()) newErrors.name = 'Name is required';
    if (!teacherData.surname.trim()) newErrors.surname = 'Surname is required';
    
    // Username format validation
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(cleanedUsername)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores. No spaces allowed.';
    }
    
    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (teacherData.email && !emailRegex.test(teacherData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Teacher assignments validation
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
      
      // Format teacher assignments exactly like ManageUsers.js does
      const formattedAssignments = teacherAssignments.map(assignment => ({
        class: assignment.classId,
        className: assignment.className,
        subjects: assignment.subjects.map(subject => ({
          subject: subject.subjectId,
          subjectName: subject.subjectName
        }))
      }));
      
      // Build teacher data according to your backend POST /users format
      const teacherDataToSend = {
        username: cleanedUsername,
        password: teacherData.password,
        email: teacherData.email.trim().toLowerCase(),
        name: teacherData.name.trim(),
        surname: teacherData.surname.trim(),
        role: 'teacher',
        class: teacherData.class || undefined,
        phoneNumber: teacherData.phoneNumber?.trim() || undefined,
        active: teacherData.active,
        dateOfBirth: teacherData.dateOfBirth || undefined,
        address: teacherData.address?.trim() || undefined,
        sex: teacherData.sex || undefined,
        age: teacherData.age ? parseInt(teacherData.age) : undefined,
        teacherAssignments: formattedAssignments
      };
      
      console.log('📤 Creating teacher with data:', JSON.stringify(teacherDataToSend, null, 2));
      
      // Create the teacher in one API call
      const response = await axios.post('http://localhost:5000/api/users', 
        teacherDataToSend, 
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Teacher created successfully:', response.data);
      setSuccess('Teacher created successfully!');
      
      // Reset form
      setTeacherData({
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        name: '',
        surname: '',
        phoneNumber: '',
        class: '',
        active: true,
        dateOfBirth: '',
        address: '',
        sex: '',
        age: ''
      });
      setTeacherAssignments([]);
      
      // Navigate back after 2 seconds
      setTimeout(() => {
        navigate('/admin/users');
      }, 2000);
      
    } catch (err) {
      console.error('❌ Error creating teacher:', err);
      
      if (err.response) {
        console.error('❌ Server error details:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
        
        let errorMessage = 'Server error occurred';
        if (err.response.data) {
          if (err.response.data.message) {
            errorMessage = err.response.data.message;
          } else if (err.response.data.error) {
            errorMessage = err.response.data.error;
          } else if (err.response.data.errors) {
            // Handle validation errors
            errorMessage = Object.values(err.response.data.errors).join(', ');
          }
        }
        setError(`Server Error (${err.response.status}): ${errorMessage}`);
      } else {
        setError(`Request Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Check authorization
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
        {/* Basic Teacher Information */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FiUser /> Teacher Information
          </h3>
          
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label>Username *</label>
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
              <label>Email *</label>
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
              <label>Name *</label>
              <input
                type="text"
                value={teacherData.name}
                onChange={(e) => setTeacherData({...teacherData, name: e.target.value})}
                placeholder="John"
                style={{...styles.input, ...(errors.name && styles.inputError)}}
              />
              {errors.name && <span style={styles.errorText}>{errors.name}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label>Surname *</label>
              <input
                type="text"
                value={teacherData.surname}
                onChange={(e) => setTeacherData({...teacherData, surname: e.target.value})}
                placeholder="Doe"
                style={{...styles.input, ...(errors.surname && styles.inputError)}}
              />
              {errors.surname && <span style={styles.errorText}>{errors.surname}</span>}
            </div>
            
            <div style={styles.formGroup}>
              <label>Password *</label>
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
              <label>Confirm Password *</label>
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
              <label>Phone Number</label>
              <input
                type="tel"
                value={teacherData.phoneNumber}
                onChange={(e) => setTeacherData({...teacherData, phoneNumber: e.target.value})}
                placeholder="+1234567890"
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label>Date of Birth</label>
              <input
                type="date"
                value={teacherData.dateOfBirth}
                onChange={(e) => handleDateOfBirthChange(e.target.value)}
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label>Age</label>
              <input
                type="number"
                value={teacherData.age}
                readOnly
                style={{...styles.input, backgroundColor: '#F0F0F0'}}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label>Sex</label>
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
              <label>Address</label>
              <input
                type="text"
                value={teacherData.address}
                onChange={(e) => setTeacherData({...teacherData, address: e.target.value})}
                placeholder="e.g., 123 Main St"
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label>Primary Class (Optional)</label>
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
              <label>Status</label>
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

        {/* Teacher Assignments Section - Matching ManageUsers.js format */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>
              <FiBook /> Teacher Assignments *
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
                    <strong>{assignment.className}</strong>
                    <button
                      type="button"
                      onClick={() => removeTeacherAssignment(assignment.classId)}
                      style={styles.removeAssignmentButton}
                      disabled={loading}
                    >
                      <FiXCircle />
                    </button>
                  </div>
                  <div style={styles.assignmentSubjects}>
                    {assignment.subjects.map((subject, subIndex) => (
                      <span key={subIndex} style={styles.assignmentSubjectBadge}>
                        {subject.subjectName}
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
              <h3>Add Teacher Assignment</h3>
              <button onClick={closeTeacherAssignmentModal} style={styles.modalCloseButton}>
                <FiX />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label>Select Class</label>
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
                  <label>Select Subjects for {classes.find(c => c._id === teacherAssignmentModal.selectedClass)?.name}</label>
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
                      <small style={{ color: '#666', fontSize: '12px' }}>
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
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
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
    padding: '24px',
    backgroundColor: '#F8F9FA'
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
    fontWeight: '500',
    border: '1px solid #FFCCCC'
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
    fontWeight: '500',
    border: '1px solid #C8E6C9'
  },
  closeMessageButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s'
  },
  form: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    border: '1px solid #E0E0E0'
  },
  section: {
    marginBottom: '32px',
    paddingBottom: '24px',
    borderBottom: '1px solid #E0E0E0'
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
    fontSize: '20px',
    fontWeight: '600',
    color: '#4B5320',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  helpText: {
    color: '#666',
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
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #D0D0D0',
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    backgroundColor: 'white'
  },
  inputError: {
    borderColor: '#B22222',
    backgroundColor: '#FFF9F9',
    border: '1px solid #B22222'
  },
  select: {
    width: '100%',
    padding: '12px',
    border: '1px solid #D0D0D0',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    transition: 'border-color 0.2s'
  },
  errorText: {
    color: '#B22222',
    fontSize: '12px',
    marginTop: '4px',
    display: 'block'
  },
  loadingText: {
    fontSize: '12px',
    color: '#D4A017',
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
    transition: 'all 0.2s'
  },
  emptyAssignments: {
    backgroundColor: '#F8F9FA',
    padding: '24px',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#666',
    border: '1px dashed #D0D0D0'
  },
  assignmentsContainer: {
    border: '1px solid #E0E0E0',
    borderRadius: '4px',
    padding: '12px',
    backgroundColor: 'white'
  },
  assignmentItem: {
    marginBottom: '12px',
    padding: '12px',
    border: '1px solid #E0E0E0',
    borderRadius: '4px',
    backgroundColor: '#F8F9FA'
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
    color: '#B22222',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px'
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
    border: '1px solid #E0E0E0',
    borderRadius: '4px',
    backgroundColor: 'white'
  },
  subjectCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    padding: '8px',
    border: '1px solid #E0E0E0',
    borderRadius: '4px',
    backgroundColor: '#F8F9FA',
    cursor: 'pointer'
  },
  coreBadge: {
    fontSize: '10px',
    color: '#228B22',
    backgroundColor: '#E6FFE6',
    padding: '2px 6px',
    borderRadius: '10px',
    marginLeft: '4px',
    fontWeight: '500'
  },
  loadingSubjects: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#F8F9FA',
    borderRadius: '4px',
    color: '#666',
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
    borderTop: '1px solid #E0E0E0'
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
    transition: 'all 0.2s'
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
    transition: 'all 0.2s'
  },
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
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '500px'
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #E0E0E0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#666',
    cursor: 'pointer',
    padding: '4px'
  },
  modalBody: {
    padding: '20px'
  },
  modalFooter: {
    padding: '20px',
    borderTop: '1px solid #E0E0E0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  modalSubmitButton: {
    padding: '10px 20px',
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
  },
  modalCancelButton: {
    padding: '10px 20px',
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
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
  
  .addButton:hover:not(:disabled) {
    background-color: #3A4218;
  }
  
  .removeAssignmentButton:hover:not(:disabled) {
    background-color: #FFE6E6;
  }
  
  .cancelButton:hover:not(:disabled) {
    background-color: #5A6268;
  }
  
  .submitButton:hover:not(:disabled) {
    background-color: #C09015;
  }
  
  .modalSubmitButton:hover:not(:disabled) {
    background-color: #C09015;
  }
  
  .modalCancelButton:hover:not(:disabled) {
    background-color: #5A6268;
  }
  
  .closeMessageButton:hover {
    background-color: rgba(0,0,0,0.1);
  }
  
  .backButton:hover:not(:disabled) {
    background-color: #5A6268;
  }
  
  .subjectCheckbox:hover {
    background-color: #F0F0F0;
  }
`;
document.head.appendChild(styleSheet);

export default CreateTeacherWithSubjects;