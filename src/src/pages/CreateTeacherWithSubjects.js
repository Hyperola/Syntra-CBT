// pages/CreateTeacherWithSubjects.js - FIXED VERSION
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiUser, FiBook, FiCheck, FiX, FiPlus, FiTrash2,
  FiChevronDown, FiChevronUp, FiAlertCircle, FiCheckCircle,
  FiLock, FiMail, FiPhone, FiLoader, FiAlertTriangle
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
    active: true
  });
  
  // Class and subject assignments
  const [classes, setClasses] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState({});
  const [assignments, setAssignments] = useState([]); // [{ classId, subjectIds: [] }]
  const [expandedAssignment, setExpandedAssignment] = useState(null);
  
  // Form validation
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchClasses();
  }, []);

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
      setError('Failed to load classes. Please try again.');
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
        
        return subjectsList;
      }
      return [];
    } catch (err) {
      console.error('Error fetching class subjects:', err);
      return [];
    }
  };

  const addAssignment = () => {
    setAssignments([...assignments, { classId: '', subjectIds: [] }]);
  };

  const removeAssignment = (index) => {
    const newAssignments = [...assignments];
    const removedClassId = newAssignments[index].classId;
    newAssignments.splice(index, 1);
    setAssignments(newAssignments);
    
    if (expandedAssignment === index) {
      setExpandedAssignment(null);
    }
    
    // Clean up available subjects for removed class
    if (removedClassId) {
      const newAvailableSubjects = { ...availableSubjects };
      delete newAvailableSubjects[removedClassId];
      setAvailableSubjects(newAvailableSubjects);
    }
  };

  const updateAssignment = async (index, field, value) => {
    const newAssignments = [...assignments];
    newAssignments[index] = { ...newAssignments[index], [field]: value };
    setAssignments(newAssignments);
    
    // If class changed, fetch subjects
    if (field === 'classId' && value) {
      const subjects = await fetchClassSubjects(value);
      setAvailableSubjects(prev => ({
        ...prev,
        [value]: subjects
      }));
      
      // Clear subject selections when class changes
      newAssignments[index].subjectIds = [];
      setAssignments(newAssignments);
    }
  };

  const toggleSubjectSelection = (classId, subjectId) => {
    const assignmentIndex = assignments.findIndex(a => a.classId === classId);
    if (assignmentIndex === -1) return;
    
    const assignment = assignments[assignmentIndex];
    const isSelected = assignment.subjectIds.includes(subjectId);
    
    const newSubjectIds = isSelected
      ? assignment.subjectIds.filter(id => id !== subjectId)
      : [...assignment.subjectIds, subjectId];
    
    updateAssignment(assignmentIndex, 'subjectIds', newSubjectIds);
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
    
    // Assignment validation
    assignments.forEach((assignment, index) => {
      if (!assignment.classId) {
        newErrors[`assignment_${index}_class`] = 'Class is required';
      }
      if (!assignment.subjectIds || assignment.subjectIds.length === 0) {
        newErrors[`assignment_${index}_subjects`] = 'At least one subject is required';
      }
    });
    
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
      
      // Format teacherAssignments to match your User model EXACTLY
      const formattedTeacherAssignments = [];

      for (const assignment of assignments) {
        if (assignment.classId && assignment.subjectIds.length > 0) {
          // Find the class object
          const classObj = classes.find(c => c._id === assignment.classId);
          const className = classObj ? classObj.name : 'Unknown Class';
          
          // Get subject names
          const classSubjects = availableSubjects[assignment.classId] || [];
          
          formattedTeacherAssignments.push({
            class: assignment.classId,  // Field name should be "class" not "classId"
            className: className,      // Add className for compatibility
            subjects: assignment.subjectIds.map(subjectId => {
              const subject = classSubjects.find(s => s.id === subjectId);
              return {
                subject: subjectId,      // Subject ID
                subjectName: subject ? subject.name : 'Unknown Subject',
                assignedAt: new Date()
              };
            }),
            assignedAt: new Date()
          });
        }
      }
      
      // Build teacher data according to your backend format
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
        teacherAssignments: formattedTeacherAssignments, // Correct format
        
        // For backward compatibility with old subjects field:
        subjects: formattedTeacherAssignments.flatMap(assignment => {
          return assignment.subjects.map(subject => ({
            subject: subject.subjectName,
            class: assignment.className,
            classId: assignment.class,
            assignedDate: new Date(),
            isActive: true
          }));
        })
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
        active: true
      });
      setAssignments([]);
      setExpandedAssignment(null);
      setAvailableSubjects({});
      
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
              <label>Primary Class (Optional)</label>
              <select
                value={teacherData.class}
                onChange={(e) => setTeacherData({...teacherData, class: e.target.value})}
                style={styles.select}
              >
                <option value="">Select Primary Class</option>
                {classes.map(cls => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name} {cls.level ? `(${cls.level})` : ''}
                  </option>
                ))}
              </select>
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

        {/* Subject Assignments */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>
              <FiBook /> Subject Assignments
            </h3>
            <button
              type="button"
              onClick={addAssignment}
              style={styles.addButton}
              disabled={loading}
            >
              <FiPlus /> Add Class Assignment
            </button>
          </div>
          
          <p style={styles.helpText}>
            Assign this teacher to teach subjects in different classes. A teacher can teach multiple subjects in multiple classes.
          </p>
          
          {assignments.length === 0 ? (
            <div style={styles.emptyAssignments}>
              <p>No assignments yet. Click "Add Class Assignment" to get started.</p>
            </div>
          ) : (
            assignments.map((assignment, index) => (
              <div key={index} style={styles.assignmentCard}>
                <div 
                  style={styles.assignmentHeader}
                  onClick={() => setExpandedAssignment(expandedAssignment === index ? null : index)}
                >
                  <div style={styles.assignmentInfo}>
                    <h4 style={styles.assignmentTitle}>
                      Assignment {index + 1}
                      {assignment.classId && classes.find(c => c._id === assignment.classId) && (
                        <span style={styles.className}>
                          - {classes.find(c => c._id === assignment.classId).name}
                        </span>
                      )}
                    </h4>
                    {assignment.subjectIds.length > 0 && (
                      <span style={styles.subjectCount}>
                        {assignment.subjectIds.length} subject(s) selected
                      </span>
                    )}
                  </div>
                  <div style={styles.assignmentActions}>
                    <button
                      type="button"
                      onClick={() => removeAssignment(index)}
                      style={styles.removeAssignmentButton}
                      disabled={loading}
                    >
                      <FiTrash2 />
                    </button>
                    <button
                      type="button"
                      style={styles.expandButton}
                    >
                      {expandedAssignment === index ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                  </div>
                </div>
                
                {expandedAssignment === index && (
                  <div style={styles.assignmentDetails}>
                    {/* Class Selection */}
                    <div style={styles.formGroup}>
                      <label>Class *</label>
                      <select
                        value={assignment.classId}
                        onChange={(e) => updateAssignment(index, 'classId', e.target.value)}
                        style={{...styles.select, ...(errors[`assignment_${index}_class`] && styles.inputError)}}
                        disabled={loading}
                      >
                        <option value="">Select a class</option>
                        {classes.map(cls => (
                          <option key={cls._id} value={cls._id}>
                            {cls.name} {cls.level ? `(${cls.level})` : ''}
                          </option>
                        ))}
                      </select>
                      {errors[`assignment_${index}_class`] && (
                        <span style={styles.errorText}>{errors[`assignment_${index}_class`]}</span>
                      )}
                    </div>
                    
                    {/* Subject Selection (only if class is selected) */}
                    {assignment.classId && availableSubjects[assignment.classId] && availableSubjects[assignment.classId].length > 0 && (
                      <div style={styles.formGroup}>
                        <label>Select Subjects *</label>
                        {errors[`assignment_${index}_subjects`] && (
                          <span style={styles.errorText}>{errors[`assignment_${index}_subjects`]}</span>
                        )}
                        <div style={styles.subjectsGrid}>
                          {availableSubjects[assignment.classId].map(subject => (
                            <label key={subject.id} style={styles.subjectCheckbox}>
                              <input
                                type="checkbox"
                                checked={assignment.subjectIds.includes(subject.id)}
                                onChange={() => toggleSubjectSelection(assignment.classId, subject.id)}
                                style={styles.checkbox}
                                disabled={loading}
                              />
                              <div style={styles.subjectCheckboxContent}>
                                <span style={styles.subjectName}>{subject.name}</span>
                                {subject.code && (
                                  <span style={styles.subjectCode}>{subject.code}</span>
                                )}
                                {subject.isCore && (
                                  <span style={styles.coreBadge}>Core</span>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                        <small style={styles.helpText}>
                          {assignment.subjectIds.length} subject(s) selected
                        </small>
                      </div>
                    )}
                    
                    {/* Loading indicator for subjects */}
                    {assignment.classId && (!availableSubjects[assignment.classId] || availableSubjects[assignment.classId].length === 0) && (
                      <div style={styles.loadingSubjects}>
                        <div style={styles.spinner}></div>
                        <p>Loading subjects for this class...</p>
                      </div>
                    )}
                    
                    {/* No subjects available */}
                    {assignment.classId && availableSubjects[assignment.classId] && availableSubjects[assignment.classId].length === 0 && (
                      <div style={styles.noSubjectsMessage}>
                        <p>No subjects available for this class. Please add subjects to the class first.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
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
  assignmentCard: {
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    marginBottom: '16px',
    overflow: 'hidden',
    backgroundColor: 'white'
  },
  assignmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#F8F9FA',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  assignmentInfo: {
    flex: 1
  },
  assignmentTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 4px 0'
  },
  className: {
    color: '#4B5320',
    fontWeight: '500',
    marginLeft: '8px'
  },
  subjectCount: {
    fontSize: '14px',
    color: '#666'
  },
  assignmentActions: {
    display: 'flex',
    gap: '8px'
  },
  removeAssignmentButton: {
    padding: '8px',
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s'
  },
  expandButton: {
    padding: '8px',
    backgroundColor: '#EDF2F7',
    color: '#4A5568',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s'
  },
  assignmentDetails: {
    padding: '20px',
    backgroundColor: 'white',
    borderTop: '1px solid #E0E0E0'
  },
  subjectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
    marginTop: '12px',
    maxHeight: '300px',
    overflowY: 'auto',
    padding: '10px',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
    backgroundColor: '#F8F9FA'
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
    gap: '4px'
  },
  subjectName: {
    fontWeight: '500',
    fontSize: '14px'
  },
  subjectCode: {
    fontSize: '12px',
    color: '#666'
  },
  coreBadge: {
    fontSize: '11px',
    color: '#228B22',
    backgroundColor: '#E6FFE6',
    padding: '2px 6px',
    borderRadius: '10px',
    alignSelf: 'flex-start',
    fontWeight: '500'
  },
  loadingSubjects: {
    textAlign: 'center',
    padding: '20px',
    color: '#666',
    backgroundColor: '#F8F9FA',
    borderRadius: '6px',
    border: '1px dashed #D0D0D0'
  },
  noSubjectsMessage: {
    padding: '12px',
    backgroundColor: '#FFF3CD',
    border: '1px solid #FFEAA7',
    borderRadius: '4px',
    color: '#856404',
    fontSize: '14px'
  },
  spinner: {
    width: '30px',
    height: '30px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 10px auto'
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
    background-color: #F0FFF4;
    border-color: #4B5320;
  }
  
  .assignmentHeader:hover {
    background-color: #F0F0F0;
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
  
  .expandButton:hover:not(:disabled) {
    background-color: #E2E8F0;
  }
  
  .cancelButton:hover:not(:disabled) {
    background-color: #5A6268;
  }
  
  .submitButton:hover:not(:disabled) {
    background-color: #C09015;
  }
  
  .closeMessageButton:hover {
    background-color: rgba(0,0,0,0.1);
  }
  
  .backButton:hover:not(:disabled) {
    background-color: #5A6268;
  }
`;
document.head.appendChild(styleSheet);

export default CreateTeacherWithSubjects;