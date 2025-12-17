// pages/ManageUsers.js - COMPLETE UPDATED VERSION WITH CORRECT TEACHER ENDPOINTS
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiEye,
  FiUsers,
  FiSearch,
  FiTrash2,
  FiEdit,
  FiRefreshCw,
  FiX,
  FiUser,
  FiCalendar,
  FiDownload,
  FiLoader,
  FiBook,
  FiChevronDown,
  FiChevronUp,
  FiXCircle,
  FiSave,
  FiShield,
  FiStar,
  FiMail,
  FiPhone,
  FiMapPin,
  FiLock,
  FiBookOpen,
  FiPlus
} from 'react-icons/fi';

const ManageUsers = () => {
  const { user: authUser } = useContext(AuthContext);
  const [tab, setTab] = useState('view');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    name: '',
    surname: '',
    role: 'student',
    class: '',
    studentId: '',
    selectedSubjects: [],
    teacherAssignments: [],
    picture: null,
    dateOfBirth: '',
    address: '',
    phoneNumber: '',
    sex: '',
    age: '',
    active: true,
    adminPermissions: []
  });
  const [editUserId, setEditUserId] = useState(null);
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [classSubjects, setClassSubjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [apiDebug, setApiDebug] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    limit: 10
  });
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [teacherAssignmentModal, setTeacherAssignmentModal] = useState({
    open: false,
    selectedClass: '',
    selectedSubjects: []
  });
  const [availableSubjectsForAssignment, setAvailableSubjectsForAssignment] = useState([]);
  const [loadingAssignmentSubjects, setLoadingAssignmentSubjects] = useState(false);

  const navigate = useNavigate();

  const adminPermissionOptions = [
    { value: 'MANAGE_USERS', label: 'Manage Users' },
    { value: 'APPROVE_TESTS', label: 'Approve Tests' },
    { value: 'MANAGE_RESULTS', label: 'Manage Results' },
    { value: 'SYSTEM_CONFIG', label: 'System Configuration' },
    { value: 'VIEW_ANALYTICS', label: 'View Analytics' },
    { value: 'MANAGE_ADMINS', label: 'Manage Admins' }
  ];

  useEffect(() => {
    if (authUser && (authUser.role === 'admin' || authUser.role === 'super_admin' || authUser.role === 'teacher')) {
      fetchUsers();
      fetchClasses();
    }
  }, [authUser, pagination.currentPage, filterRole, searchTerm]);

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('📚 Raw classes API response:', res.data);
      
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
        
        const classId = cls._id || cls.id || cls.classId;
        let className = cls.name || cls.fullName || cls.label || `Class ${classId?.substring(0, 4)}...`;
        
        // Build descriptive name if we have level and stream
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
          level: cls.level || '',
          stream: cls.stream || '',
          capacity: cls.capacity || 40,
          isActive: cls.isActive !== false,
          original: cls
        };
      }).filter(Boolean);

      console.log('📚 Formatted classes:', formattedClasses);
      setClasses(formattedClasses);
    } catch (err) {
      console.error('📚 Error fetching classes:', err);
      setError('Failed to load classes. Please try again.');
      setClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchClassSubjects = async (classId) => {
    if (!classId) {
      setClassSubjects([]);
      return;
    }

    setLoadingSubjects(true);
    try {
      const token = localStorage.getItem('token');
      
      // Try different API endpoints for fetching subjects
      let subjectsList = [];
      
      try {
        // First try: Get subjects for specific class
        const res = await axios.get(`http://localhost:5000/api/classes/${classId}/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        console.log('📚 Subjects for class response:', res.data);
        
        if (res.data && Array.isArray(res.data.subjects)) {
          subjectsList = res.data.subjects;
        } else if (res.data && res.data.success && Array.isArray(res.data.data)) {
          subjectsList = res.data.data;
        } else if (Array.isArray(res.data)) {
          subjectsList = res.data;
        }
      } catch (firstErr) {
        console.log('First API attempt failed, trying alternative...', firstErr);
        
        // Second try: Get all subjects and filter by classId
        const res = await axios.get('http://localhost:5000/api/subjects', {
          headers: { Authorization: `Bearer ${token}` },
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
      
      const formattedSubjects = subjectsList.map(sub => {
        return {
          id: sub._id || sub.id || sub.subjectId,
          _id: sub._id || sub.id || sub.subjectId,
          name: sub.name || sub.displayName || sub.subjectName || 'Unknown Subject',
          code: sub.code || sub.subjectCode || '',
          displayName: sub.displayName || sub.name,
          isCore: sub.isCore || false,
          classId: sub.classId || sub.class || classId
        };
      }).filter(Boolean);
      
      console.log('📚 Formatted subjects for class', classId, ':', formattedSubjects);
      setClassSubjects(formattedSubjects);
      
    } catch (err) {
      console.error('Error fetching class subjects:', err);
      setError('Failed to load subjects for this class.');
      setClassSubjects([]);
    } finally {
      setLoadingSubjects(false);
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
        const res = await axios.get(`http://localhost:5000/api/classes/${classId}/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.data && Array.isArray(res.data.subjects)) {
          subjectsList = res.data.subjects;
        } else if (res.data && res.data.success && Array.isArray(res.data.data)) {
          subjectsList = res.data.data;
        } else if (Array.isArray(res.data)) {
          subjectsList = res.data;
        }
      } catch (firstErr) {
        console.log('First API attempt failed, trying alternative...', firstErr);
        
        const res = await axios.get('http://localhost:5000/api/subjects', {
          headers: { Authorization: `Bearer ${token}` },
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

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      console.log('👥 Fetching users with pagination:', pagination);
      
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit
      };
      
      if (filterRole) params.role = filterRole;
      if (searchTerm) params.search = searchTerm;
      
      const res = await axios.get('http://localhost:5000/api/users', {
        headers: { Authorization: `Bearer ${token}` },
        params: params
      });

      console.log('👥 Users API response:', res.data);

      let usersData = [];
      let paginationData = {};
      
      if (res.data && Array.isArray(res.data.users)) {
        usersData = res.data.users;
        paginationData = res.data.pagination || pagination;
      } else if (res.data && res.data.success && Array.isArray(res.data.data)) {
        usersData = res.data.data;
      } else if (Array.isArray(res.data)) {
        usersData = res.data;
      } else {
        console.error('👥 Unexpected users response:', res.data);
        setError('Invalid data format from server.');
        setUsers([]);
        return;
      }

      const validUsers = usersData.map(user => {
        if (!user || typeof user !== 'object') return null;
        
        const userId = user._id || user.id || user.userId;
        if (!userId) return null;
        
        // Get class info
        let classInfo = null;
        if (user.class) {
          if (typeof user.class === 'object') {
            classInfo = user.class;
          } else if (typeof user.class === 'string') {
            // Try to find class in classes list
            classInfo = classes.find(c => c._id === user.class) || { _id: user.class, name: 'Unknown Class' };
          }
        }
        
        // Log teacher assignments for debugging
        if (user.role === 'teacher' && user.teacherAssignments) {
          console.log(`👨‍🏫 Teacher ${user.name} assignments:`, user.teacherAssignments);
        }
        
        return {
          ...user,
          _id: userId,
          id: userId,
          fullName: user.fullName || `${user.name || ''} ${user.surname || ''}`.trim(),
          className: classInfo?.name || 
                    (user.class && typeof user.class === 'object' 
                      ? (user.class.name || user.class.fullName || user.class.label)
                      : (typeof user.class === 'string' ? user.class : 'N/A')),
          classInfo: classInfo,
          profilePicture: user.picture || user.profilePicture,
          teacherAssignments: user.teacherAssignments || [],
          enrolledSubjects: user.enrolledSubjects || []
        };
      }).filter(Boolean);
      
      console.log('👥 Valid users loaded:', validUsers.length);
      
      // Debug: Check if teacher assignments are coming through
      const teachers = validUsers.filter(u => u.role === 'teacher');
      console.log(`👨‍🏫 Found ${teachers.length} teachers with assignments:`, 
        teachers.map(t => ({
          name: t.name,
          assignmentCount: t.teacherAssignments?.length || 0,
          assignments: t.teacherAssignments
        }))
      );
      
      setUsers(validUsers);
      setPagination(prev => ({
        ...prev,
        totalPages: paginationData.totalPages || prev.totalPages,
        totalUsers: paginationData.totalUsers || prev.totalUsers
      }));
      setApiDebug(`Fetched ${validUsers.length} users successfully`);
    } catch (err) {
      console.error('👥 Error fetching users:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to load users.';
      setError(errorMsg);
      setApiDebug(`Error: ${errorMsg}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = async (classId) => {
    console.log('📚 Class changed to:', classId);
    
    setFormData(prev => ({
      ...prev,
      class: classId,
      selectedSubjects: [] // Clear selected subjects when class changes
    }));
    
    await fetchClassSubjects(classId);
  };

  const handleStudentSubjectSelection = (subjectId) => {
    setFormData(prev => {
      const isSelected = prev.selectedSubjects.includes(subjectId);
      if (isSelected) {
        return {
          ...prev,
          selectedSubjects: prev.selectedSubjects.filter(id => id !== subjectId)
        };
      } else {
        return {
          ...prev,
          selectedSubjects: [...prev.selectedSubjects, subjectId]
        };
      }
    });
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
    const existingIndex = formData.teacherAssignments.findIndex(
      assignment => assignment.classId === teacherAssignmentModal.selectedClass
    );

    if (existingIndex >= 0) {
      // Update existing assignment
      const updatedAssignments = [...formData.teacherAssignments];
      updatedAssignments[existingIndex] = newAssignment;
      setFormData(prev => ({
        ...prev,
        teacherAssignments: updatedAssignments
      }));
    } else {
      // Add new assignment
      setFormData(prev => ({
        ...prev,
        teacherAssignments: [...prev.teacherAssignments, newAssignment]
      }));
    }

    closeTeacherAssignmentModal();
  };

  const removeTeacherAssignment = (classId) => {
    setFormData(prev => ({
      ...prev,
      teacherAssignments: prev.teacherAssignments.filter(assignment => assignment.classId !== classId)
    }));
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
    setFormData(prev => ({
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
    const cleanedUsername = cleanUsername(formData.username);
    
    if (!cleanedUsername.trim()) return 'Username is required.';
    if (!formData.email.trim()) return 'Email is required.';
    if (!formData.password && !editUserId) return 'Password is required.';
    if (formData.password && formData.password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      return 'Passwords do not match.';
    }
    if (!formData.name.trim()) return 'Name is required.';
    if (!formData.surname.trim()) return 'Surname is required.';
    
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(cleanedUsername)) {
      return 'Username can only contain letters, numbers, and underscores. No spaces allowed.';
    }
    
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(formData.email)) {
      return 'Please enter a valid email address.';
    }

    // For students, class is required
    if (formData.role === 'student' && !formData.class) {
      return 'Class is required for students.';
    }

    return null;
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
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
      
      const cleanedUsername = cleanUsername(formData.username);
      
      // Build user data for update
      const userData = {
        username: cleanedUsername,
        email: formData.email.trim(),
        name: formData.name.trim(),
        surname: formData.surname.trim(),
        role: formData.role,
        active: formData.active,
        dateOfBirth: formData.dateOfBirth || null,
        address: formData.address?.trim() || null,
        phoneNumber: formData.phoneNumber?.trim() || null,
        sex: formData.sex || null,
        age: formData.age ? parseInt(formData.age) : null,
        adminPermissions: formData.role === 'admin' ? formData.adminPermissions : []
      };
      
      // Add password only if provided
      if (formData.password && formData.password.trim()) {
        userData.password = formData.password;
      }
      
      // Handle role-specific fields
      if (formData.role === 'student') {
        userData.class = formData.class || null;
        userData.studentId = formData.studentId?.trim() || null;
        
        // Handle subject enrollment if subjects are selected
        if (formData.class && formData.selectedSubjects.length > 0) {
          try {
            await axios.post(
              `http://localhost:5000/api/students/${editUserId}/enroll-subjects`,
              { subjectIds: formData.selectedSubjects },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch (enrollErr) {
            console.warn('Could not enroll in subjects:', enrollErr);
          }
        }
      }
      
      if (formData.role === 'teacher') {
        userData.class = formData.class || null;
        
        console.log('📤 Teacher assignments to save:', formData.teacherAssignments);
        
        // IMPORTANT: Save teacher assignments in user document
        if (formData.teacherAssignments.length > 0) {
          // Format assignments for the User model
          const formattedAssignments = formData.teacherAssignments.map(assignment => ({
            class: assignment.classId,
            className: assignment.className,
            subjects: assignment.subjects.map(subject => ({
              subject: subject.subjectId,
              subjectName: subject.subjectName
            }))
          }));
          
          userData.teacherAssignments = formattedAssignments;
          console.log('📤 Formatted assignments for User model:', formattedAssignments);
        } else {
          // If no assignments, send empty array to clear existing ones
          userData.teacherAssignments = [];
        }
      }
      
      // For admins, don't send class or studentId
      if (formData.role === 'admin' || formData.role === 'super_admin') {
        delete userData.class;
        delete userData.studentId;
      }
      
      console.log('📤 Updating user with complete data:', userData);
      
      // Update the user with ALL data including assignments
      const response = await axios.put(
        `http://localhost:5000/api/users/${editUserId}`, 
        userData, 
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ User update response:', response.data);
      
      // If teacher has assignments, also use the teacher-specific endpoint for redundancy
      if (formData.role === 'teacher' && formData.teacherAssignments.length > 0) {
        try {
          console.log('📤 Also updating via teacher assignment API...');
          
          // First clear existing assignments by updating with empty array
          await axios.put(
            `http://localhost:5000/api/users/${editUserId}`,
            { teacherAssignments: [] },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          console.log('✅ Cleared existing assignments');
          
          // Then add new assignments one by one using teacher endpoint
          for (const assignment of formData.teacherAssignments) {
            const subjectIds = assignment.subjects.map(subject => subject.subjectId);
            
            console.log(`📤 Assigning ${subjectIds.length} subjects to class ${assignment.classId}`);
            
            await axios.post(
              `http://localhost:5000/api/users/teachers/${editUserId}/assign-subjects`,
              { 
                classId: assignment.classId, 
                subjectIds: subjectIds
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            console.log(`✅ Assigned subjects for class ${assignment.classId}`);
          }
          
          console.log('✅ All teacher assignments updated successfully via teacher API');
        } catch (assignErr) {
          console.error('❌ Error updating via teacher API:', assignErr);
          // Don't throw error here - the user was already updated successfully
          if (assignErr.response) {
            console.error('Teacher API error response:', assignErr.response.data);
          }
        }
      }
      
      setSuccess('User updated successfully!');
      setEditUserId(null);
      resetForm();
      
      // Wait a bit and refresh users
      setTimeout(() => {
        fetchUsers();
      }, 1000);
      
    } catch (err) {
      console.error('❌ Error updating user:', err);
      
      let errorMessage = 'Failed to update user.';
      if (err.response) {
        if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data && err.response.data.error) {
          errorMessage = err.response.data.error;
        }
        console.error('Server response:', err.response.data);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
      email: '',
      name: '',
      surname: '',
      role: 'student',
      class: '',
      studentId: '',
      selectedSubjects: [],
      teacherAssignments: [],
      picture: null,
      dateOfBirth: '',
      address: '',
      phoneNumber: '',
      sex: '',
      age: '',
      active: true,
      adminPermissions: []
    });
    setClassSubjects([]);
    setEditUserId(null);
  };

  const handleEditUser = async (user) => {
    if (!user || !user._id) {
      setError('Invalid user data');
      return;
    }

    console.log('✏️ Editing user:', user);
    
    setEditUserId(user._id);
    
    // Format date of birth
    let formattedDate = '';
    if (user.dateOfBirth) {
      const date = new Date(user.dateOfBirth);
      formattedDate = date.toISOString().split('T')[0];
    }
    
    // Get enrolled subjects for students
    const enrolledSubjectIds = user.enrolledSubjects?.map(sub => 
      sub.subject?._id || sub.subject || sub.subjectId
    ).filter(Boolean) || [];
    
    // Get class ID - handle both object and string formats
    let classId = '';
    if (user.class) {
      if (typeof user.class === 'object') {
        classId = user.class._id || user.class.id;
      } else if (typeof user.class === 'string') {
        classId = user.class;
      }
    }
    
    // Get teacher assignments from user object
    const teacherAssignments = user.teacherAssignments?.map(assignment => {
      // Extract class ID - handle different formats
      let assignmentClassId = '';
      if (assignment.class) {
        if (typeof assignment.class === 'object') {
          assignmentClassId = assignment.class._id || assignment.class.id;
        } else {
          assignmentClassId = assignment.class;
        }
      } else {
        assignmentClassId = assignment.classId || '';
      }
      
      // Find class name
      const classObj = classes.find(c => c._id === assignmentClassId);
      const className = assignment.className || classObj?.name || 'Unknown Class';
      
      return {
        classId: assignmentClassId,
        className: className,
        subjects: assignment.subjects?.map(sub => ({
          subjectId: sub.subject?._id || sub.subject || sub.subjectId,
          subjectName: sub.subjectName || (sub.subject?.name || 'Unknown Subject')
        })) || []
      };
    }).filter(assignment => assignment.classId) || []; // Filter out assignments without classId
    
    console.log('📝 User data for edit:', {
      username: user.username,
      email: user.email,
      name: user.name,
      surname: user.surname,
      role: user.role,
      classId: classId,
      studentId: user.studentId,
      enrolledSubjects: user.enrolledSubjects,
      enrolledSubjectIds: enrolledSubjectIds,
      teacherAssignments: user.teacherAssignments, // Original from API
      formattedTeacherAssignments: teacherAssignments, // Formatted for form
      dateOfBirth: user.dateOfBirth,
      formattedDate: formattedDate,
      address: user.address,
      phoneNumber: user.phoneNumber,
      sex: user.sex,
      age: user.age,
      active: user.active,
      adminPermissions: user.adminPermissions || []
    });
    
    // Set form data
    setFormData({
      username: user.username || '',
      password: '',
      confirmPassword: '',
      email: user.email || '',
      name: user.name || '',
      surname: user.surname || '',
      role: user.role || 'student',
      class: classId,
      studentId: user.studentId || '',
      selectedSubjects: enrolledSubjectIds,
      teacherAssignments: teacherAssignments,
      picture: null,
      dateOfBirth: formattedDate,
      address: user.address || '',
      phoneNumber: user.phoneNumber || '',
      sex: user.sex || '',
      age: user.age || calculateAge(user.dateOfBirth) || '',
      active: user.active !== false,
      adminPermissions: user.adminPermissions || []
    });
    
    // If user has a class, fetch its subjects (for students)
    if (classId && user.role === 'student') {
      console.log('📚 Fetching subjects for class:', classId);
      await fetchClassSubjects(classId);
    } else {
      setClassSubjects([]);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('User deleted successfully.');
      fetchUsers();
      setError(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.response?.data?.error || 'Failed to delete user.');
    }
    setLoading(false);
  };

  const handleViewProfile = (user) => {
    if (!user || !user._id) {
      setError('Invalid user data');
      return;
    }
    navigate(`/admin/users/${user._id}`);
  };

  const handleExportUsers = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/users/export', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setSuccess('Users exported successfully.');
    } catch (err) {
      console.error('Error exporting users:', err);
      setError('Failed to export users.');
    }
    setExporting(false);
  };

  const testTeacherAssignmentApi = async (teacherId) => {
    if (!teacherId) {
      setError('No teacher ID provided');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      console.log('🧪 Testing teacher assignment API for teacher:', teacherId);
      
      // Test 1: Get current assignments via teacher endpoint
      const getRes = await axios.get(
        `http://localhost:5000/api/users/teachers/${teacherId}/assignments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('📋 Current assignments from teacher endpoint:', getRes.data);
      
      // Test 2: Add a test assignment
      const testClassId = classes[0]?._id;
      const testSubjectId = availableSubjectsForAssignment[0]?.id;
      
      if (testClassId && testSubjectId) {
        console.log('🧪 Adding test assignment via teacher endpoint...');
        
        const assignRes = await axios.post(
          `http://localhost:5000/api/users/teachers/${teacherId}/assign-subjects`,
          { 
            classId: testClassId, 
            subjectIds: [testSubjectId]
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('✅ Test assignment added via teacher endpoint:', assignRes.data);
        
        // Test 3: Verify assignment was added via user endpoint
        const verifyRes = await axios.get(
          `http://localhost:5000/api/users/${teacherId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('✅ Verified assignments in user data:', verifyRes.data.teacherAssignments);
        
        setSuccess('Teacher assignment API test successful!');
        fetchUsers();
      } else {
        setError('Need at least one class and subject to test');
      }
      
    } catch (err) {
      console.error('❌ Teacher assignment API test failed:', err);
      if (err.response) {
        console.error('Error response:', err.response.data);
        setError(`API Error: ${err.response.data.message || err.response.statusText}`);
      } else {
        setError('Network error testing teacher assignment API');
      }
    } finally {
      setLoading(false);
    }
  };

  const getTeacherAssignmentsDisplay = (teacher) => {
    if (!teacher || !Array.isArray(teacher.teacherAssignments)) return [];
    
    return teacher.teacherAssignments.map(assignment => ({
      classId: assignment.class?._id || assignment.class || assignment.classId,
      className: assignment.className || (assignment.class?.name || 'Unknown Class'),
      subjects: assignment.subjects?.map(sub => ({
        id: sub.subject?._id || sub.subject || sub.subjectId,
        name: sub.subjectName || (sub.subject?.name || 'Unknown Subject')
      })) || []
    }));
  };

  const getStudentEnrolledSubjectsDisplay = (student) => {
    if (!student || !Array.isArray(student.enrolledSubjects)) return [];
    
    return student.enrolledSubjects.map(enrolled => ({
      subjectId: enrolled.subject?._id || enrolled.subject || enrolled.subjectId,
      subjectName: enrolled.subjectName || (enrolled.subject?.name || 'Unknown Subject'),
      className: enrolled.className || (enrolled.class?.name || 'Unknown Class'),
      isCore: enrolled.isCore || false
    }));
  };

  const filteredUsers = users.filter(user => {
    if (!user || !user._id) return false;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      (user.username && user.username.toLowerCase().includes(searchLower)) ||
      (user.name && user.name.toLowerCase().includes(searchLower)) ||
      (user.surname && user.surname.toLowerCase().includes(searchLower)) ||
      (user.email && user.email.toLowerCase().includes(searchLower)) ||
      (user.studentId && user.studentId.toLowerCase().includes(searchLower)) ||
      (user.fullName && user.fullName.toLowerCase().includes(searchLower));
    
    const matchesRole = filterRole === '' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const canManageUsers = () => {
    return authUser && (
      authUser.role === 'super_admin' || 
      (authUser.role === 'admin' && authUser.adminPermissions?.includes('MANAGE_USERS')) ||
      authUser.role === 'teacher'
    );
  };

  const canCreateAdmin = () => {
    return authUser && authUser.role === 'super_admin';
  };

  const canCreateSuperAdmin = () => {
    return authUser && authUser.role === 'super_admin';
  };

  const canDeleteUser = (user) => {
    if (!authUser || !user) return false;
    if (authUser.role === 'super_admin') return user.role !== 'super_admin';
    if (authUser.role === 'admin' && authUser.adminPermissions?.includes('MANAGE_USERS')) {
      return user.role !== 'super_admin' && user.role !== 'admin';
    }
    return false;
  };

  const canEditUser = (user) => {
    if (!authUser || !user) return false;
    if (authUser.role === 'super_admin') return true;
    if (authUser.role === 'admin' && authUser.adminPermissions?.includes('MANAGE_USERS')) {
      return user.role !== 'super_admin';
    }
    if (authUser.role === 'teacher') {
      return user.role === 'student'; // Teachers can edit only students
    }
    return false;
  };

  const canAssignSubjects = (user) => {
    if (!authUser || !user) return false;
    return (authUser.role === 'super_admin' || 
           (authUser.role === 'admin' && authUser.adminPermissions?.includes('MANAGE_USERS'))) &&
           user.role === 'teacher';
  };

  const canEnrollStudent = (user) => {
    if (!authUser || !user) return false;
    return (authUser.role === 'super_admin' || 
           (authUser.role === 'admin' && authUser.adminPermissions?.includes('MANAGE_USERS'))) &&
           user.role === 'student' && user.class;
  };

  const getProfilePictureUrl = (picture) => {
    if (!picture) return null;
    if (picture.startsWith('http')) return picture;
    return `http://localhost:5000/uploads/${picture}`;
  };

  const getClassDisplayName = (user) => {
    if (!user) return 'N/A';
    if (user.className) return user.className;
    if (user.class && typeof user.class === 'object') {
      return user.class.name || user.class.fullName || user.class.label || 'N/A';
    }
    if (user.class) {
      const foundClass = classes.find(c => c._id === user.class);
      return foundClass ? foundClass.name : 'N/A';
    }
    return 'N/A';
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
  };

  if (!authUser || !canManageUsers()) {
    return (
      <div style={styles.authRequiredContainer}>
        <div style={styles.authErrorMessage}>
          <FiAlertTriangle style={styles.errorIcon} />
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Access Denied</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>You don't have permission to manage users.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Manage Users</h1>
            <p style={styles.subtitle}>
              {authUser.role === 'teacher' 
                ? 'View and manage students' 
                : 'Create, edit, and manage all users'}
            </p>
          </div>
          
          <div style={styles.headerActions}>
            {canCreateSuperAdmin() && (
              <button
                style={styles.createSuperAdminButton}
                onClick={() => navigate('/admin/users/create-super-admin')}
                title="Create Super Admin"
              >
                <FiStar /> Create Super Admin
              </button>
            )}
            
            {canCreateAdmin() && (
              <button
                style={styles.createAdminButton}
                onClick={() => navigate('/admin/users/create-admin')}
                title="Create Admin"
              >
                <FiShield /> Create Admin
              </button>
            )}
            
            {(authUser.role === 'admin' || authUser.role === 'super_admin') && (
              <>
                <button
                  style={styles.createTeacherButton}
                  onClick={() => navigate('/admin/users/create-teacher')}
                  title="Create Teacher"
                >
                  <FiUser /> Create Teacher
                </button>
                <button
                  style={styles.createStudentButton}
                  onClick={() => navigate('/admin/users/create-student')}
                  title="Create Student"
                >
                  <FiUsers /> Create Student
                </button>
              </>
            )}
            
            <button
              style={styles.exportButton}
              onClick={handleExportUsers}
              disabled={exporting}
              title="Export users to CSV"
            >
              <FiDownload /> {exporting ? 'Exporting...' : 'Export Users'}
            </button>
            
            <button
              style={styles.testAssignmentButton}
              onClick={() => {
                const teacher = users.find(u => u.role === 'teacher');
                if (teacher) {
                  testTeacherAssignmentApi(teacher._id);
                } else {
                  setError('No teacher found to test');
                }
              }}
              disabled={loading}
              title="Test Teacher Assignment API"
            >
              <FiLoader /> Test Assignments
            </button>
          </div>
        </div>

        {apiDebug && (
          <div style={styles.debugInfo}>
            <small>API Debug: {apiDebug}</small>
          </div>
        )}

        {error && (
          <div style={styles.errorMessage}>
            <FiAlertTriangle /> {error}
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

        <div style={styles.tabsContainer}>
          <div style={styles.tabButtons}>
            <button
              onClick={() => { setTab('view'); resetForm(); }}
              style={{
                ...styles.tabButton,
                backgroundColor: '#D4A017',
                color: '#000000',
              }}
            >
              <FiUsers /> View Users ({pagination.totalUsers})
            </button>
          </div>
        </div>

        <div style={styles.viewContainer}>
          <div style={styles.filtersContainer}>
            <div style={styles.searchBox}>
              <FiSearch style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by username, name, email, or student ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPagination(prev => ({ ...prev, currentPage: 1 }));
                }}
                style={styles.searchInput}
              />
            </div>
            
            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                setPagination(prev => ({ ...prev, currentPage: 1 }));
              }}
              style={styles.filterSelect}
            >
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
              {canCreateAdmin() && <option value="super_admin">Super Admin</option>}
            </select>

            <button
              onClick={fetchUsers}
              disabled={loading}
              style={styles.refreshButton}
            >
              {loading ? <FiLoader style={{animation: 'spin 1s linear infinite'}} /> : <FiRefreshCw />} 
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {loading && users.length === 0 ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingSpinner}></div>
              <p>Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={styles.emptyState}>
              <FiUsers style={styles.emptyIcon} />
              <h3>No Users Found</h3>
              <p>
                {users.length === 0 ? 'No users have been created yet.' : 'No users match your search criteria.'}
              </p>
            </div>
          ) : (
            <>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Profile</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Class</th>
                      <th>Assignments/Subjects</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <React.Fragment key={user._id}>
                        <tr style={{ 
                          backgroundColor: user.active ? 'transparent' : '#FFF3F3'
                        }}>
                          <td>
                            {user.profilePicture ? (
                              <img 
                                src={getProfilePictureUrl(user.profilePicture)} 
                                alt="Profile" 
                                style={styles.profileImage}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div style={styles.profileInitials}>
                              {user.name?.charAt(0) || '?'}{user.surname?.charAt(0) || ''}
                            </div>
                          </td>
                          <td>{user.username || 'N/A'}</td>
                          <td>{user.email || 'N/A'}</td>
                          <td>{user.name || ''} {user.surname || ''}</td>
                          <td>
                            <span style={{
                              ...styles.roleBadge,
                              backgroundColor: 
                                user.role === 'super_admin' ? '#FF6B6B' :
                                user.role === 'admin' ? '#4ECDC4' :
                                user.role === 'teacher' ? '#45B7D1' : '#96CEB4'
                            }}>
                              {user.role || 'unknown'}
                            </span>
                          </td>
                          <td>{getClassDisplayName(user)}</td>
                          <td>
                            {user.role === 'teacher' ? (
                              <div>
                                <span style={styles.subjectsBadge}>
                                  {user.teacherAssignments?.length || 0} assignment(s)
                                </span>
                                {user.teacherAssignments?.length > 0 && (
                                  <button
                                    onClick={() => setExpandedUser(expandedUser === user._id ? null : user._id)}
                                    style={styles.toggleAssignmentsButton}
                                  >
                                    {expandedUser === user._id ? <FiChevronUp /> : <FiChevronDown />}
                                  </button>
                                )}
                              </div>
                            ) : user.role === 'student' ? (
                              <div>
                                <span style={styles.subjectsBadge}>
                                  {user.enrolledSubjects?.length || 0} subject(s)
                                </span>
                                {user.enrolledSubjects?.length > 0 && (
                                  <button
                                    onClick={() => setExpandedUser(expandedUser === user._id ? null : user._id)}
                                    style={styles.toggleAssignmentsButton}
                                  >
                                    {expandedUser === user._id ? <FiChevronUp /> : <FiChevronDown />}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span style={styles.subjectsBadge}>N/A</span>
                            )}
                          </td>
                          <td>
                            <span style={{
                              ...styles.statusBadge,
                              backgroundColor: user.active ? '#E6FFE6' : '#FFF3CD',
                              color: user.active ? '#228B22' : '#D4A017'
                            }}>
                              {user.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <div style={styles.actionButtons}>
                              <button
                                onClick={() => handleViewProfile(user)}
                                style={styles.viewButton}
                              >
                                <FiEye /> View
                              </button>
                              {canEditUser(user) && (
                                <button
                                  onClick={() => handleEditUser(user)}
                                  style={styles.editButton}
                                >
                                  <FiEdit /> Edit
                                </button>
                              )}
                              {canDeleteUser(user) && (
                                <button
                                  onClick={() => handleDeleteUser(user._id)}
                                  style={styles.deleteButton}
                                >
                                  <FiTrash2 /> Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expanded details row */}
                        {expandedUser === user._id && (
                          <tr>
                            <td colSpan="9" style={styles.expandedDetails}>
                              {user.role === 'teacher' ? (
                                <div>
                                  <h4 style={styles.detailsTitle}>Teacher Assignments</h4>
                                  {getTeacherAssignmentsDisplay(user).length > 0 ? (
                                    getTeacherAssignmentsDisplay(user).map((assignment, idx) => (
                                      <div key={idx} style={styles.assignmentGroup}>
                                        <strong>{assignment.className}:</strong>
                                        <div style={styles.assignmentSubjects}>
                                          {assignment.subjects.map((subject, subIdx) => (
                                            <span key={subIdx} style={styles.assignmentSubject}>
                                              {subject.name}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <p>No assignments yet.</p>
                                  )}
                                </div>
                              ) : user.role === 'student' ? (
                                <div>
                                  <h4 style={styles.detailsTitle}>Enrolled Subjects</h4>
                                  {getStudentEnrolledSubjectsDisplay(user).length > 0 ? (
                                    <div style={styles.enrolledSubjectsGrid}>
                                      {getStudentEnrolledSubjectsDisplay(user).map((subject, idx) => (
                                        <span key={idx} style={{
                                          ...styles.enrolledSubject,
                                          backgroundColor: subject.isCore ? '#E6FFE6' : '#FFF3CD'
                                        }}>
                                          {subject.subjectName}
                                          {subject.isCore && <span style={styles.coreBadge}>Core</span>}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p>Not enrolled in any subjects yet.</p>
                                  )}
                                </div>
                              ) : user.role === 'admin' ? (
                                <div>
                                  <h4 style={styles.detailsTitle}>Admin Permissions</h4>
                                  {user.adminPermissions?.length > 0 ? (
                                    <div style={styles.permissionsList}>
                                      {user.adminPermissions.map((perm, idx) => (
                                        <span key={idx} style={styles.permissionBadge}>
                                          {adminPermissionOptions.find(p => p.value === perm)?.label || perm}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p>No specific permissions assigned.</p>
                                  )}
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div style={styles.pagination}>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    style={styles.pageButton}
                  >
                    Previous
                  </button>
                  
                  <span style={styles.pageInfo}>
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    style={styles.pageButton}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Edit User Modal */}
        {editUserId && (
          <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto'}}>
              <div style={styles.modalHeader}>
                <h3>Edit User: {formData.name} {formData.surname} ({formData.role})</h3>
                <button 
                  onClick={() => { setEditUserId(null); resetForm(); }} 
                  style={styles.modalCloseButton}
                >
                  <FiX />
                </button>
              </div>
              
              <div style={styles.modalBody}>
                <form onSubmit={handleUpdateUser}>
                  <div style={styles.formGrid}>
                    <div style={styles.formSection}>
                      <h3 style={styles.sectionTitle}>Basic Information</h3>
                      <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                          <label>Username *</label>
                          <input
                            type="text"
                            placeholder="e.g., john_doe (no spaces)"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                            style={styles.formInput}
                          />
                          <small style={{ color: '#666', fontSize: '12px' }}>
                            Username will be converted to lowercase with underscores instead of spaces
                          </small>
                        </div>
                        <div style={styles.formGroup}>
                          <label>Email *</label>
                          <input
                            type="email"
                            placeholder="e.g., john@school.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            style={styles.formInput}
                          />
                        </div>
                      </div>

                      <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                          <label>Password (Leave blank to keep current)</label>
                          <input
                            type="password"
                            placeholder="Enter new password (min 6 characters)"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            minLength={6}
                            style={styles.formInput}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label>Confirm Password</label>
                          <input
                            type="password"
                            placeholder="Confirm new password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            style={styles.formInput}
                          />
                        </div>
                      </div>

                      <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                          <label>Name *</label>
                          <input
                            type="text"
                            placeholder="e.g., John"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            style={styles.formInput}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label>Surname *</label>
                          <input
                            type="text"
                            placeholder="e.g., Doe"
                            value={formData.surname}
                            onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                            required
                            style={styles.formInput}
                          />
                        </div>
                      </div>

                      <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                          <label>Role *</label>
                          <select
                            value={formData.role}
                            onChange={(e) => {
                              const newRole = e.target.value;
                              setFormData({ 
                                ...formData, 
                                role: newRole, 
                                adminPermissions: newRole === 'admin' ? formData.adminPermissions : [],
                                class: newRole === 'student' || newRole === 'teacher' ? formData.class : '',
                                selectedSubjects: newRole === 'student' ? formData.selectedSubjects : [],
                                teacherAssignments: newRole === 'teacher' ? formData.teacherAssignments : []
                              });
                              if (newRole !== 'student' && newRole !== 'teacher') {
                                setClassSubjects([]);
                              }
                            }}
                            required
                            style={styles.formInput}
                          >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                            {canCreateAdmin() && <option value="super_admin">Super Admin</option>}
                          </select>
                        </div>
                        <div style={styles.formGroup}>
                          <label>Status</label>
                          <select
                            value={formData.active}
                            onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
                            style={styles.formInput}
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {(formData.role === 'student' || formData.role === 'teacher') && (
                      <div style={styles.formSection}>
                        <h3 style={styles.sectionTitle}>
                          {formData.role === 'student' ? 'Student Information' : 'Teacher Information'}
                        </h3>
                        
                        <div style={styles.formGroup}>
                          <label>
                            {formData.role === 'teacher' ? 'Primary Class (Optional)' : 'Class *'}
                            {loadingClasses && (
                              <span style={styles.loadingText}>
                                Loading classes...
                              </span>
                            )}
                          </label>
                          <select
                            value={formData.class}
                            onChange={(e) => handleClassChange(e.target.value)}
                            required={formData.role === 'student'}
                            disabled={loadingClasses}
                            style={{
                              ...styles.formInput,
                              backgroundColor: loadingClasses ? '#F0F0F0' : '#FFFFFF'
                            }}
                          >
                            <option value="">
                              {loadingClasses ? 'Loading classes...' : 'Select Class'}
                            </option>
                            {classes.map(cls => (
                              <option key={cls._id} value={cls._id}>
                                {cls.name}
                              </option>
                            ))}
                          </select>
                          {formData.role === 'teacher' && (
                            <small style={{ color: '#666', fontSize: '12px' }}>
                              Primary class for timetable purposes
                            </small>
                          )}
                        </div>

                        {formData.role === 'student' && (
                          <>
                            <div style={styles.formGroup}>
                              <label>Student ID</label>
                              <input
                                type="text"
                                placeholder="e.g., STU001"
                                value={formData.studentId}
                                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                                style={styles.formInput}
                              />
                            </div>

                            {/* Student Subject Selection */}
                            {formData.class && (
                              <div style={styles.formGroup}>
                                <label>Select Subjects to Enroll In</label>
                                {loadingSubjects ? (
                                  <div style={styles.loadingSubjects}>
                                    <div style={styles.smallSpinner}></div>
                                    <span>Loading subjects...</span>
                                  </div>
                                ) : classSubjects.length > 0 ? (
                                  <>
                                    <div style={styles.subjectsSelectionGrid}>
                                      {classSubjects.map((subject, index) => (
                                        <label key={subject.id || index} style={styles.subjectCheckbox}>
                                          <input
                                            type="checkbox"
                                            checked={formData.selectedSubjects.includes(subject.id)}
                                            onChange={() => handleStudentSubjectSelection(subject.id)}
                                          />
                                          <span>
                                            {subject.name} 
                                            {subject.code && ` (${subject.code})`}
                                            {subject.isCore && <span style={styles.coreFormBadge}>Core</span>}
                                          </span>
                                        </label>
                                      ))}
                                    </div>
                                    <small style={{ color: '#666', fontSize: '12px' }}>
                                      Select the subjects this student will take. Core subjects are required. 
                                      Currently selected: {formData.selectedSubjects.length}
                                    </small>
                                  </>
                                ) : (
                                  <div style={styles.noSubjectsMessage}>
                                    <p>No subjects available for this class.</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}

                        {formData.role === 'teacher' && (
                          <div style={styles.formGroup}>
                            <label>Teacher Assignments</label>
                            <div style={styles.assignmentsContainer}>
                              {formData.teacherAssignments.length === 0 ? (
                                <p style={{ color: '#666', fontStyle: 'italic' }}>No assignments yet</p>
                              ) : (
                                <div style={styles.assignmentsList}>
                                  {formData.teacherAssignments.map((assignment, index) => (
                                    <div key={index} style={styles.assignmentItem}>
                                      <div style={styles.assignmentHeader}>
                                        <strong>{assignment.className}</strong>
                                        <button
                                          type="button"
                                          onClick={() => removeTeacherAssignment(assignment.classId)}
                                          style={styles.removeAssignmentButton}
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
                              <button
                                type="button"
                                onClick={openTeacherAssignmentModal}
                                style={styles.addAssignmentButton}
                              >
                                <FiPlus /> Add Assignment
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {formData.role === 'admin' && (
                      <div style={styles.formSection}>
                        <h3 style={styles.sectionTitle}>Admin Permissions</h3>
                        <div style={styles.permissionsGrid}>
                          {adminPermissionOptions.map(perm => (
                            <label key={perm.value} style={styles.permissionCheckbox}>
                              <input
                                type="checkbox"
                                checked={formData.adminPermissions.includes(perm.value)}
                                onChange={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    adminPermissions: prev.adminPermissions.includes(perm.value)
                                      ? prev.adminPermissions.filter(p => p !== perm.value)
                                      : [...prev.adminPermissions, perm.value],
                                  }));
                                }}
                              />
                              <span>{perm.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={styles.formSection}>
                      <h3 style={styles.sectionTitle}>Personal Information</h3>
                      <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                          <label>Date of Birth</label>
                          <input
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) => handleDateOfBirthChange(e.target.value)}
                            style={styles.formInput}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label>Age</label>
                          <input
                            type="number"
                            value={formData.age}
                            readOnly
                            style={{...styles.formInput, backgroundColor: '#F0F0F0'}}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label>Sex</label>
                          <select
                            value={formData.sex}
                            onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                            style={styles.formInput}
                          >
                            <option value="">Select Sex</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div style={styles.formGroup}>
                        <label>Address</label>
                        <input
                          type="text"
                          placeholder="e.g., 123 Main St"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          style={styles.formInput}
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label>Phone Number</label>
                        <input
                          type="tel"
                          placeholder="e.g., +2341234567890"
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                          style={styles.formInput}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={styles.formActions}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={styles.submitButton}
                    >
                      {loading ? (
                        <>
                          <div style={styles.savingSpinner}></div> Updating...
                        </>
                      ) : 'Update User'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditUserId(null); resetForm(); }}
                      style={styles.cancelButton}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

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
                    style={styles.formInput}
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
                              />
                              <span>
                                {subject.name} 
                                {subject.code && ` (${subject.code})`}
                                {subject.isCore && <span style={styles.coreFormBadge}>Core</span>}
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
      </main>
    </div>
  );
};

// Styles remain the same as before...
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F8F9FA',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#4B5320',
    margin: '0 0 8px 0'
  },
  subtitle: {
    color: '#6B7280',
    margin: 0,
    fontSize: '16px'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  createSuperAdminButton: {
    padding: '10px 20px',
    backgroundColor: '#B22222',
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
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  createAdminButton: {
    padding: '10px 20px',
    backgroundColor: '#4ECDC4',
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
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  createTeacherButton: {
    padding: '10px 20px',
    backgroundColor: '#45B7D1',
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
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  createStudentButton: {
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
    gap: '8px',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  exportButton: {
    padding: '10px 20px',
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  testAssignmentButton: {
    padding: '10px 20px',
    backgroundColor: '#8B4513',
    color: 'white',
    padding: '10px 20px',
    backgroundColor: '#8B4513',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  debugInfo: {
    backgroundColor: '#EDF2F7',
    color: '#4A5568',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '12px',
    borderLeft: '4px solid #D4A017'
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
  tabsContainer: {
    marginBottom: '24px'
  },
  tabButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  tabButton: {
    padding: '12px 24px',
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
  viewContainer: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  filtersContainer: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  searchBox: {
    position: 'relative',
    minWidth: '300px',
    flex: 1
  },
  searchIcon: {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#6B7280',
    fontSize: '16px'
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px 12px 40px',
    border: '1px solid #D3D3D3',
    borderRadius: '6px',
    fontSize: '14px'
  },
  filterSelect: {
    padding: '12px 16px',
    border: '1px solid #D3D3D3',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '150px',
    backgroundColor: 'white'
  },
  refreshButton: {
    padding: '12px 16px',
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '120px',
    justifyContent: 'center'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    color: '#4B5320'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
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
  savingSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #f3f3f3',
    borderTop: '2px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px',
    display: 'inline-block'
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
  emptyState: {
    backgroundColor: 'white',
    padding: '48px 24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center',
    color: '#6B7280'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5
  },
  tableContainer: {
    overflowX: 'auto',
    marginBottom: '24px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    border: '1px solid #E0E0E0',
    fontSize: '14px'
  },
  profileImage: {
    width: '40px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: '50%',
    border: '2px solid #D4A017'
  },
  profileInitials: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#4B5320',
    color: 'white',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  roleBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#000000',
    display: 'inline-block',
    minWidth: '70px',
    textAlign: 'center'
  },
  subjectsBadge: {
    fontSize: '12px',
    color: '#666',
    padding: '4px 8px',
    backgroundColor: '#F0F0F0',
    borderRadius: '4px',
    display: 'inline-block'
  },
  toggleAssignmentsButton: {
    background: 'none',
    border: 'none',
    color: '#4B5320',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px',
    marginLeft: '8px'
  },
  expandedDetails: {
    backgroundColor: '#F8F9FA',
    padding: '16px',
    borderTop: '2px solid #E0E0E0'
  },
  detailsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 12px 0'
  },
  assignmentGroup: {
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px dashed #E0E0E0'
  },
  assignmentSubjects: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '8px'
  },
  assignmentSubject: {
    fontSize: '12px',
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    padding: '4px 8px',
    borderRadius: '12px',
    border: '1px solid #C8E6C9'
  },
  enrolledSubjectsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  enrolledSubject: {
    fontSize: '12px',
    padding: '6px 12px',
    borderRadius: '16px',
    border: '1px solid #E0E0E0',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  },
  coreBadge: {
    fontSize: '10px',
    color: '#228B22',
    backgroundColor: '#E6FFE6',
    padding: '2px 6px',
    borderRadius: '10px',
    fontWeight: '500'
  },
  permissionsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },
  permissionBadge: {
    fontSize: '12px',
    color: '#4B5320',
    backgroundColor: '#FFF3CD',
    padding: '6px 12px',
    borderRadius: '16px',
    fontWeight: '500'
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block',
    minWidth: '60px',
    textAlign: 'center'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px'
  },
  viewButton: {
    padding: '6px 12px',
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  editButton: {
    padding: '6px 12px',
    backgroundColor: '#D4A017',
    color: '#4B5320',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  deleteButton: {
    padding: '6px 12px',
    backgroundColor: '#B22222',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #E0E0E0'
  },
  pageButton: {
    padding: '8px 16px',
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  pageInfo: {
    fontSize: '14px',
    color: '#666'
  },
  formGrid: {
    display: 'grid',
    gap: '24px'
  },
  formSection: {
    padding: '20px',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    backgroundColor: '#FAFAFA'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 16px 0'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px'
  },
  formGroup: {
    marginBottom: '16px'
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #D3D3D3',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  loadingText: {
    fontSize: '12px',
    color: '#D4A017',
    marginLeft: '8px'
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
  coreFormBadge: {
    fontSize: '10px',
    color: '#228B22',
    backgroundColor: '#E6FFE6',
    padding: '2px 6px',
    borderRadius: '10px',
    marginLeft: '4px',
    fontWeight: '500'
  },
  noSubjectsMessage: {
    padding: '10px',
    backgroundColor: '#FFF3CD',
    border: '1px solid #FFEAA7',
    borderRadius: '4px',
    color: '#856404',
    fontSize: '14px'
  },
  permissionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px'
  },
  permissionCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    padding: '8px',
    border: '1px solid #E0E0E0',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  assignmentsContainer: {
    border: '1px solid #E0E0E0',
    borderRadius: '4px',
    padding: '12px',
    backgroundColor: 'white'
  },
  assignmentsList: {
    marginBottom: '12px'
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
  addAssignmentButton: {
    padding: '8px 16px',
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    justifyContent: 'center'
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    justifyContent: 'flex-end'
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
    justifyContent: 'center',
    minWidth: '150px'
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
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
  },
  authRequiredContainer: {
    minHeight: '100vh',
    backgroundColor: '#F8F9FA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  authErrorMessage: {
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '400px'
  },
  errorIcon: {
    fontSize: '24px',
    flexShrink: 0
  }
};

// Add CSS for animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  table th, table td {
    padding: 12px;
    border: 1px solid #E0E0E0;
    text-align: left;
    vertical-align: middle;
  }
  
  table th {
    background-color: #4B5320;
    color: #FFFFFF;
    font-weight: 600;
    position: sticky;
    top: 0;
  }
  
  table tr:nth-child(even) {
    background-color: #F8F9FA;
  }
  
  table tr:hover {
    background-color: #F0F0F0;
  }
  
  input[type="checkbox"] {
    cursor: pointer;
  }
  
  /* Add hover effects to buttons */
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
  
  .createSuperAdminButton:hover:not(:disabled) {
    background-color: #9A1C1C;
  }
  
  .createAdminButton:hover:not(:disabled) {
    background-color: #3DBDB5;
  }
  
  .createTeacherButton:hover:not(:disabled) {
    background-color: #38A5C1;
  }
  
  .createStudentButton:hover:not(:disabled) {
    background-color: #C09015;
  }
  
  .exportButton:hover:not(:disabled) {
    background-color: #5A6268;
  }
  
  .testAssignmentButton:hover:not(:disabled) {
    background-color: #7A3A13;
  }
  
  .submitButton:hover:not(:disabled) {
    background-color: #C09015;
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .headerActions {
      flex-direction: column;
      width: 100%;
    }
    
    .headerActions button {
      width: 100%;
      justify-content: center;
    }
    
    .filtersContainer {
      flex-direction: column;
    }
    
    .searchBox {
      min-width: 100%;
    }
    
    .tabButtons {
      flex-direction: column;
    }
    
    .tabButton {
      width: '100%';
      justify-content: 'center';
    }
    
    .actionButtons {
      flex-direction: column;
      gap: 4px;
    }
    
    .formRow {
      grid-template-columns: 1fr;
    }
    
    .modalContent {
      width: 95%;
      margin: 10px;
    }
  }
  
  @media (max-width: 480px) {
    .main {
      padding: 12px;
    }
    
    .tableContainer {
      font-size: 12px;
    }
    
    .profileImage, .profileInitials {
      width: 32px;
      height: 32px;
      font-size: 12px;
    }
    
    .formActions {
      flex-direction: column;
    }
    
    .submitButton, .cancelButton {
      width: 100%;
    }
  }
`;
document.head.appendChild(styleSheet);

export default ManageUsers;