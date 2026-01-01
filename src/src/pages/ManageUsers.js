// pages/ManageUsers.js - UPDATED WITH PROFILE IMAGE UPLOAD AND TEACHER ASSIGNMENTS
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
  FiPlus,
  FiUpload,
  FiImage,
  FiCamera,
  FiAlertCircle,
  FiCheck
} from 'react-icons/fi';

const ManageUsers = () => {
  const { user: authUser } = useContext(AuthContext);
  const [tab, setTab] = useState('view');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    firstName: '',
    middleName: '',
    lastName: '',
    role: 'student',
    class: '',
    studentId: '',
    parentEmail: '',
    parentPhoneNumber: '',
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
  
  // Profile Image State (from createadmin.js)
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
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
  const [debugMode, setDebugMode] = useState(false);

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

      setClasses(formattedClasses);
    } catch (err) {
      console.error('Error fetching classes:', err);
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
      
      setAvailableSubjectsForAssignment(formattedSubjects);
      
    } catch (err) {
      console.error('Error fetching assignment subjects:', err);
      setError('Failed to load subjects for assignment.');
      setAvailableSubjectsForAssignment([]);
    } finally {
      setLoadingAssignmentSubjects(false);
    }
  };

  // UPDATED: Profile image handling from createadmin.js
  const getProfileImageUrl = (user) => {
    if (!user) return null;
    
    // Check if user has profileImage field
    if (user.profileImage && user.profileImage !== 'null' && user.profileImage !== 'undefined') {
      // If it's a full URL, return it
      if (user.profileImage.startsWith('http')) {
        return user.profileImage;
      }
      // If it's just a filename, prepend the path
      if (!user.profileImage.includes('/')) {
        return `http://localhost:5000/uploads/profiles/${user.profileImage}`;
      }
    }
    
    // Check other possible fields
    const imageFields = ['profilePicture', 'picture', 'photo'];
    for (const field of imageFields) {
      if (user[field] && user[field] !== 'null' && user[field] !== 'undefined') {
        const imageValue = user[field];
        if (!imageValue.includes('/')) {
          return `http://localhost:5000/uploads/profiles/${imageValue}`;
        }
      }
    }
    
    return null; // No image found
  };

  // Helper function to convert image to base64 (from createadmin.js)
  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Image upload handler (from createadmin.js)
  const handleImageUpload = async (file) => {
    if (!file) {
      console.log('⚠️ No file selected');
      return;
    }
    
    console.log('📁 File selected:', {
      name: file.name,
      size: file.size,
      type: file.type,
      isFile: file instanceof File
    });
    
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB
    
    if (!validTypes.includes(file.type)) {
      setError('Please upload JPG, PNG, GIF, or WebP only.');
      return;
    }
    
    if (file.size > maxSize) {
      setError('Image must be under 2MB.');
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
      setSuccess('Image ready for upload.');
      
    } catch (err) {
      console.error('Error processing image:', err);
      setError('Failed to process image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfileImage = () => {
    setProfileImage(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, picture: null }));
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit
      };
      
      if (filterRole) params.role = filterRole;
      if (searchTerm) params.search = searchTerm;
      
      console.log('📡 Fetching users from API...');
      const res = await axios.get('http://localhost:5000/api/users', {
        headers: { Authorization: `Bearer ${token}` },
        params: params
      });

      console.log('✅ API Response received:', {
        success: res.data.success,
        totalUsers: res.data.pagination?.totalUsers,
        usersCount: res.data.users?.length
      });

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
        setError('Invalid data format from server.');
        setUsers([]);
        return;
      }

      const validUsers = usersData.map(user => {
        if (!user || typeof user !== 'object') return null;
        
        const userId = user._id || user.id || user.userId;
        if (!userId) return null;
        
        let classInfo = null;
        if (user.class) {
          if (typeof user.class === 'object') {
            classInfo = user.class;
          } else if (typeof user.class === 'string') {
            classInfo = classes.find(c => c._id === user.class) || { _id: user.class, name: 'Unknown Class' };
          }
        }
        
        const fullName = `${user.firstName || user.name || ''} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName || user.surname || ''}`.trim();
        
        const profileImageUrl = getProfileImageUrl(user);
        
        return {
          ...user,
          _id: userId,
          id: userId,
          firstName: user.firstName || user.name || '',
          middleName: user.middleName || '',
          lastName: user.lastName || user.surname || '',
          fullName: fullName,
          className: classInfo?.name || 
                    (user.class && typeof user.class === 'object' 
                      ? (user.class.name || user.class.fullName || user.class.label)
                      : (typeof user.class === 'string' ? user.class : 'N/A')),
          classInfo: classInfo,
          profilePicture: user.profilePicture || user.profileImage || user.picture,
          profileImage: user.profileImage || user.profilePicture || user.picture,
          profileImageUrl: profileImageUrl,
          teacherAssignments: user.teacherAssignments || [],
          enrolledSubjects: user.enrolledSubjects || []
        };
      }).filter(Boolean);
      
      const usersWithImages = validUsers.filter(u => u.profileImageUrl).length;
      console.log(`📊 Users with profile images: ${usersWithImages}/${validUsers.length}`);
      
      setUsers(validUsers);
      setPagination(prev => ({
        ...prev,
        totalPages: paginationData.totalPages || prev.totalPages,
        totalUsers: paginationData.totalUsers || prev.totalUsers
      }));
      setApiDebug(`Fetched ${validUsers.length} users (${usersWithImages} with images)`);
    } catch (err) {
      console.error('❌ Error fetching users:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to load users.';
      setError(errorMsg);
      setApiDebug(`Error: ${errorMsg}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = async (classId) => {
    setFormData(prev => ({
      ...prev,
      class: classId,
      selectedSubjects: []
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

  // UPDATED: Add teacher assignment (from createteacherwithassignment.js)
  const addTeacherAssignment = () => {
    if (!teacherAssignmentModal.selectedClass || teacherAssignmentModal.selectedSubjects.length === 0) {
      setError('Please select a class and at least one subject');
      return;
    }

    const selectedClass = classes.find(c => c._id === teacherAssignmentModal.selectedClass);
    if (!selectedClass) return;

    // Format assignment according to backend expectations (from createteacherwithassignment.js)
    const newAssignment = {
      classId: teacherAssignmentModal.selectedClass,
      className: selectedClass.name,
      subjects: teacherAssignmentModal.selectedSubjects.map(subjectId => {
        const subject = availableSubjectsForAssignment.find(s => s.id === subjectId);
        return {
          subject: subjectId,  // Backend expects 'subject' (ObjectId)
          subjectName: subject?.name || 'Unknown Subject'  // Backend expects 'subjectName' (String)
        };
      })
    };

    const existingIndex = formData.teacherAssignments.findIndex(
      assignment => assignment.classId === teacherAssignmentModal.selectedClass
    );

    if (existingIndex >= 0) {
      const updatedAssignments = [...formData.teacherAssignments];
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
        setFormData(prev => ({
          ...prev,
          teacherAssignments: updatedAssignments
        }));
      } else {
        setError('All selected subjects are already assigned to this class.');
        return;
      }
    } else {
      setFormData(prev => ({
        ...prev,
        teacherAssignments: [...prev.teacherAssignments, newAssignment]
      }));
    }

    closeTeacherAssignmentModal();
    setSuccess(`Added ${newAssignment.subjects.length} subject(s) to ${selectedClass.name}`);
    setTimeout(() => setSuccess(null), 3000);
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
    if (!formData.firstName.trim()) return 'First name is required.';
    if (!formData.lastName.trim()) return 'Last name is required.';
    
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(cleanedUsername)) {
      return 'Username can only contain letters, numbers, and underscores. No spaces allowed.';
    }
    
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(formData.email)) {
      return 'Please enter a valid email address.';
    }

    if (formData.role === 'student' && !formData.class) {
      return 'Class is required for students.';
    }

    if (formData.role === 'student' && !formData.address?.trim()) {
      return 'Home address is required for students.';
    }

    if (formData.role === 'student' && !formData.email.trim() && !formData.parentEmail?.trim()) {
      return 'Either student email or parent email is required.';
    }

    return null;
  };

  // UPDATED: Main update user function with profile image and teacher assignments
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
      
      // UPDATED: Convert image to base64 if exists (from createadmin.js)
      let profileImageBase64 = null;
      if (profileImage && profileImage instanceof File) {
        try {
          profileImageBase64 = await convertImageToBase64(profileImage);
          console.log('✅ Image converted to base64, length:', profileImageBase64.length);
        } catch (imageErr) {
          console.warn('⚠️ Could not convert image to base64:', imageErr);
          // Continue without image
        }
      }
      
      // Build user data matching User model structure (from createadmin.js)
      const userDataToSend = {
        username: cleanedUsername,
        email: formData.email.trim().toLowerCase(),
        firstName: formData.firstName.trim(),
        middleName: formData.middleName?.trim() || '',
        lastName: formData.lastName.trim(),
        role: formData.role,
        active: formData.active,
        dateOfBirth: formData.dateOfBirth || undefined,
        address: formData.address?.trim() || undefined,
        phoneNumber: formData.phoneNumber?.trim() || undefined,
        sex: formData.sex || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        parentEmail: formData.parentEmail?.trim() || undefined,
        parentPhoneNumber: formData.parentPhoneNumber?.trim() || undefined,
        studentId: formData.studentId?.trim() || undefined,
        // Add profile image as base64 if available
        ...(profileImageBase64 && { profileImage: profileImageBase64 })
      };
      
      // Add password only if provided (for updates)
      if (formData.password && formData.password.trim()) {
        userDataToSend.password = formData.password;
      }
      
      // Handle role-specific fields
      if (formData.role === 'student') {
        if (formData.class) userDataToSend.class = formData.class;
        
        // Handle student enrolled subjects
        if (formData.selectedSubjects.length > 0) {
          const enrolledSubjects = formData.selectedSubjects.map(subjectId => {
            const subject = classSubjects.find(s => s.id === subjectId);
            return {
              subject: subjectId,
              subjectName: subject?.name || 'Unknown Subject',
              isCore: subject?.isCore || false
            };
          });
          userDataToSend.enrolledSubjects = enrolledSubjects;
        }
      }
      
      if (formData.role === 'teacher') {
        if (formData.class) userDataToSend.class = formData.class;
        
        // UPDATED: Format teacher assignments (from createteacherwithassignment.js)
        if (formData.teacherAssignments.length > 0) {
          // Format assignments as backend expects: class and subjects array with subject and subjectName
          const formattedAssignments = formData.teacherAssignments.map(assignment => ({
            class: assignment.classId,  // Must be 'class' not 'classId'
            subjects: assignment.subjects.map(subject => ({
              subject: subject.subject,  // Must be 'subject' not 'subjectId'
              subjectName: subject.subjectName
            }))
          }));
          
          console.log('📤 Formatted teacher assignments for update:', JSON.stringify(formattedAssignments, null, 2));
          userDataToSend.teacherAssignments = formattedAssignments;
        }
      }
      
      if (formData.role === 'admin' || formData.role === 'super_admin') {
        if (formData.adminPermissions.length > 0) {
          userDataToSend.adminPermissions = formData.adminPermissions;
        }
      }
      
      console.log('🔄 Updating user with data:', {
        ...userDataToSend,
        password: userDataToSend.password ? '***' : 'NOT_CHANGED',
        profileImage: profileImageBase64 ? 'BASE64_IMAGE_INCLUDED' : 'NO_IMAGE'
      });
      
      // Update user data
      const response = await axios.put(
        `http://localhost:5000/api/users/${editUserId}`, 
        userDataToSend, 
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ User update response:', response.data);
      
      setSuccess('User updated successfully with profile image!');
      
      // Reset form and fetch updated users
      setTimeout(() => {
        setEditUserId(null);
        resetForm();
        fetchUsers();
      }, 1500);
      
    } catch (err) {
      console.error('❌ Error updating user:', err);
      
      let errorMessage = 'Failed to update user.';
      if (err.response) {
        console.error('Server response:', err.response.data);
        if (err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data && err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data && err.response.data.errors) {
          errorMessage = Object.values(err.response.data.errors).join(', ');
        }
      } else if (err.message) {
        errorMessage = err.message;
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
      firstName: '',
      middleName: '',
      lastName: '',
      role: 'student',
      class: '',
      studentId: '',
      parentEmail: '',
      parentPhoneNumber: '',
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
    setProfileImage(null);
    setImagePreview(null);
    setClassSubjects([]);
    setEditUserId(null);
  };

  const handleEditUser = async (user) => {
    if (!user || !user._id) {
      setError('Invalid user data');
      return;
    }
    
    setEditUserId(user._id);
    
    let formattedDate = '';
    if (user.dateOfBirth) {
      const date = new Date(user.dateOfBirth);
      formattedDate = date.toISOString().split('T')[0];
    }
    
    const enrolledSubjectIds = user.enrolledSubjects?.map(sub => 
      sub.subject?._id || sub.subject || sub.subjectId
    ).filter(Boolean) || [];
    
    let classId = '';
    if (user.class) {
      if (typeof user.class === 'object') {
        classId = user.class._id || user.class.id;
      } else if (typeof user.class === 'string') {
        classId = user.class;
      }
    }
    
    // UPDATED: Properly extract teacher assignments (from createteacherwithassignment.js)
    const teacherAssignments = user.teacherAssignments?.map(assignment => {
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
      
      const classObj = classes.find(c => c._id === assignmentClassId);
      const className = assignment.className || classObj?.name || 'Unknown Class';
      
      // Extract subjects properly
      const subjects = assignment.subjects?.map(sub => {
        let subjectId = '';
        let subjectName = '';
        
        if (sub.subject) {
          if (typeof sub.subject === 'object') {
            subjectId = sub.subject._id || sub.subject.id;
            subjectName = sub.subject.name || sub.subject.subjectName || 'Unknown Subject';
          } else {
            subjectId = sub.subject;
            subjectName = sub.subjectName || 'Unknown Subject';
          }
        } else {
          subjectId = sub.subjectId || '';
          subjectName = sub.subjectName || 'Unknown Subject';
        }
        
        return {
          subject: subjectId,
          subjectName: subjectName
        };
      }).filter(sub => sub.subject) || [];
      
      return {
        classId: assignmentClassId,
        className: className,
        subjects: subjects
      };
    }).filter(assignment => assignment.classId && assignment.subjects.length > 0) || [];
    
    setFormData({
      username: user.username || '',
      password: '',
      confirmPassword: '',
      email: user.email || '',
      firstName: user.firstName || user.name || '',
      middleName: user.middleName || '',
      lastName: user.lastName || user.surname || '',
      role: user.role || 'student',
      class: classId,
      studentId: user.studentId || '',
      parentEmail: user.parentEmail || '',
      parentPhoneNumber: user.parentPhoneNumber || '',
      selectedSubjects: enrolledSubjectIds,
      teacherAssignments: teacherAssignments,
      picture: user.profileImage || user.profilePicture || user.picture || null,
      dateOfBirth: formattedDate,
      address: user.address || '',
      phoneNumber: user.phoneNumber || '',
      sex: user.sex || '',
      age: user.age || calculateAge(user.dateOfBirth) || '',
      active: user.active !== false,
      adminPermissions: user.adminPermissions || []
    });
    
    console.log('📝 Editing user with assignments:', {
      originalAssignments: user.teacherAssignments,
      parsedAssignments: teacherAssignments
    });
    
    // UPDATED: Set image preview from user's profile image
    if (user.profileImageUrl) {
      console.log('✅ Setting image preview from profileImageUrl:', user.profileImageUrl);
      setImagePreview(user.profileImageUrl);
    } else if (user.profileImage) {
      const imageUrl = getProfileImageUrl(user);
      if (imageUrl) {
        console.log('✅ Setting image preview from getProfileImageUrl:', imageUrl);
        setImagePreview(imageUrl);
      } else {
        console.log('ℹ️ No profile image found for user');
        setImagePreview(null);
      }
    } else {
      console.log('ℹ️ No profile image found for user');
      setImagePreview(null);
    }
    
    setProfileImage(null);
    
    if (classId && user.role === 'student') {
      await fetchClassSubjects(classId);
    } else {
      setClassSubjects([]);
    }
    
    // Switch to edit mode
    setTab('edit');
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
      (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchLower)) ||
      (user.email && user.email.toLowerCase().includes(searchLower)) ||
      (user.studentId && user.studentId.toLowerCase().includes(searchLower)) ||
      (user.fullName && user.fullName.toLowerCase().includes(searchLower));
    
    const matchesRole = filterRole === '' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

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
      return user.role === 'student';
    }
    return false;
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
          </div>
        </div>

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
                backgroundColor: '#D69E2E',
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
                      <th style={styles.tableHeader}>Profile</th>
                      <th style={styles.tableHeader}>Username</th>
                      <th style={styles.tableHeader}>Email</th>
                      <th style={styles.tableHeader}>Name</th>
                      <th style={styles.tableHeader}>Role</th>
                      <th style={styles.tableHeader}>Class</th>
                      <th style={styles.tableHeader}>Assignments/Subjects</th>
                      <th style={styles.tableHeader}>Status</th>
                      <th style={styles.tableHeader}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <React.Fragment key={user._id}>
                        <tr style={{ 
                          backgroundColor: user.active ? 'transparent' : '#FFF3F3'
                        }}>
                          <td>
                            <div style={{ position: 'relative', width: '50px', height: '50px' }}>
                              {user.profileImageUrl ? (
                                <>
                                  <img 
                                    src={user.profileImageUrl} 
                                    alt="Profile" 
                                    style={styles.profileImage}
                                    onError={(e) => {
                                      console.warn('❌ Failed to load profile image for', user.username, 'URL:', user.profileImageUrl);
                                      e.target.style.display = 'none';
                                      const initialsId = `initials-${user._id}`;
                                      const initialsEl = document.getElementById(initialsId);
                                      if (initialsEl) {
                                        initialsEl.style.display = 'flex';
                                      }
                                    }}
                                  />
                                  <div 
                                    id={`initials-${user._id}`}
                                    style={{
                                      ...styles.profileInitials,
                                      display: 'none',
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '100%',
                                      height: '100%',
                                      zIndex: 1
                                    }}
                                  >
                                    {user.firstName?.charAt(0) || '?'}{user.lastName?.charAt(0) || ''}
                                  </div>
                                </>
                              ) : (
                                <div style={styles.profileInitials}>
                                  {user.firstName?.charAt(0) || '?'}{user.lastName?.charAt(0) || ''}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={styles.tableCell}>{user.username || 'N/A'}</td>
                          <td style={styles.tableCell}>{user.email || 'N/A'}</td>
                          <td style={styles.tableCell}>
                            {user.firstName || ''} {user.middleName ? user.middleName + ' ' : ''}{user.lastName || ''}
                          </td>
                          <td style={styles.tableCell}>
                            <span style={{
                              ...styles.roleBadge,
                              backgroundColor: 
                                user.role === 'super_admin' ? '#E53E3E' :
                                user.role === 'admin' ? '#3182CE' :
                                user.role === 'teacher' ? '#38A169' : '#D69E2E'
                            }}>
                              {user.role || 'unknown'}
                            </span>
                          </td>
                          <td style={styles.tableCell}>{getClassDisplayName(user)}</td>
                          <td style={styles.tableCell}>
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
                          <td style={styles.tableCell}>
                            <span style={{
                              ...styles.statusBadge,
                              backgroundColor: user.active ? '#E6FFE6' : '#FFF3CD',
                              color: user.active ? '#228B22' : '#D69E2E'
                            }}>
                              {user.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
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
                <h3 style={{color: '#2D3748', margin: 0}}>
                  Edit User: {formData.firstName} {formData.lastName} ({formData.role})
                </h3>
                <button 
                  onClick={() => { setEditUserId(null); resetForm(); }} 
                  style={styles.modalCloseButton}
                >
                  <FiX />
                </button>
              </div>
              
              <div style={styles.modalBody}>
                <form onSubmit={handleUpdateUser}>
                  {/* UPDATED: Profile Image Upload Section (from createadmin.js) */}
                  <div style={styles.imageUploadSection}>
                    <h4 style={styles.sectionTitle}>Profile Image (Optional)</h4>
                    <p style={styles.imageUploadHelp}>
                      Image will be sent as base64 in the same request with user data.
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
                          <small>JPG, PNG, GIF, WebP up to 2MB</small>
                          <br />
                          <small style={{ color: '#D69E2E' }}>
                            Current image: {formData.picture || 'None'}
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={styles.formGrid}>
                    <div style={styles.formSection}>
                      <h4 style={styles.sectionTitle}>Basic Information</h4>
                      <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            Username <span style={styles.required}>*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., john_doe (no spaces)"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                            style={styles.formInput}
                          />
                          <small style={styles.helpText}>
                            Username will be converted to lowercase with underscores instead of spaces
                          </small>
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            Email <span style={styles.required}>*</span>
                          </label>
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
                          <label style={styles.formLabel}>Password (Leave blank to keep current)</label>
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
                          <label style={styles.formLabel}>Confirm Password</label>
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
                          <label style={styles.formLabel}>
                            First Name <span style={styles.required}>*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., John"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            required
                            style={styles.formInput}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Middle Name</label>
                          <input
                            type="text"
                            placeholder="e.g., Michael (optional)"
                            value={formData.middleName}
                            onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                            style={styles.formInput}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            Last Name <span style={styles.required}>*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., Doe"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            required
                            style={styles.formInput}
                          />
                        </div>
                      </div>

                      <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            Role <span style={styles.required}>*</span>
                          </label>
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
                          <label style={styles.formLabel}>Status</label>
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

                    {/* Contact Information Section */}
                    <div style={styles.formSection}>
                      <h4 style={styles.sectionTitle}>Contact Information</h4>
                      
                      <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Phone Number</label>
                          <input
                            type="tel"
                            placeholder="e.g., +2341234567890"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            style={styles.formInput}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
                            {formData.role === 'student' ? 'Home Address' : 'Address'} 
                            {formData.role === 'student' && <span style={styles.required}> *</span>}
                          </label>
                          <input
                            type="text"
                            placeholder="e.g., 123 Main Street"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            required={formData.role === 'student'}
                            style={styles.formInput}
                          />
                          {formData.role === 'student' && (
                            <small style={styles.helpText}>Home address is required for students</small>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Role-specific Information */}
                    {(formData.role === 'student' || formData.role === 'teacher') && (
                      <div style={styles.formSection}>
                        <h4 style={styles.sectionTitle}>
                          {formData.role === 'student' ? 'Student Information' : 'Teacher Information'}
                        </h4>
                        
                        {formData.role === 'student' && (
                          <div style={styles.formRow}>
                            <div style={styles.formGroup}>
                              <label style={styles.formLabel}>Parent Email</label>
                              <input
                                type="email"
                                placeholder="e.g., parent@email.com"
                                value={formData.parentEmail}
                                onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                                style={styles.formInput}
                              />
                              <small style={styles.helpText}>
                                Either student email or parent email is required
                              </small>
                            </div>
                            <div style={styles.formGroup}>
                              <label style={styles.formLabel}>Parent Phone Number</label>
                              <input
                                type="tel"
                                placeholder="e.g., +2341234567890"
                                value={formData.parentPhoneNumber}
                                onChange={(e) => setFormData({ ...formData, parentPhoneNumber: e.target.value })}
                                style={styles.formInput}
                              />
                            </div>
                          </div>
                        )}
                        
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>
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
                              backgroundColor: loadingClasses ? '#F5F7FA' : '#FFFFFF'
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
                            <small style={styles.helpText}>
                              Primary class for timetable purposes
                            </small>
                          )}
                        </div>

                        {formData.role === 'student' && (
                          <>
                            <div style={styles.formGroup}>
                              <label style={styles.formLabel}>Student ID</label>
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
                                <label style={styles.formLabel}>Select Subjects to Enroll In</label>
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
                                    <small style={styles.helpText}>
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
                            <label style={styles.formLabel}>Teacher Assignments</label>
                            <div style={styles.assignmentsContainer}>
                              {formData.teacherAssignments.length === 0 ? (
                                <p style={{ color: '#718096', fontStyle: 'italic' }}>No assignments yet</p>
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
                        <h4 style={styles.sectionTitle}>Admin Permissions</h4>
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
                      <h4 style={styles.sectionTitle}>Personal Information</h4>
                      <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Date of Birth</label>
                          <input
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={(e) => handleDateOfBirthChange(e.target.value)}
                            style={styles.formInput}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Age</label>
                          <input
                            type="number"
                            value={formData.age}
                            readOnly
                            style={{...styles.formInput, backgroundColor: '#F5F7FA'}}
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.formLabel}>Sex</label>
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
                    </div>
                  </div>

                  <div style={styles.formActions}>
                    <button
                      type="submit"
                      disabled={loading || uploadingImage}
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
                    <label style={styles.formLabel}>
                      Select Subjects for {classes.find(c => c._id === teacherAssignmentModal.selectedClass)?.name}
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
                              />
                              <span>
                                {subject.name} 
                                {subject.code && ` (${subject.code})`}
                                {subject.isCore && <span style={styles.coreFormBadge}>Core</span>}
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
      </main>
    </div>
  );
};

// Styles (with added styles for image upload)
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F5F7FA',
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
    color: '#718096',
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
    backgroundColor: '#E53E3E',
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
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    '&:hover': {
      backgroundColor: '#C53030',
      transform: 'translateY(-2px)'
    }
  },
  createAdminButton: {
    padding: '10px 20px',
    backgroundColor: '#3182CE',
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
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    '&:hover': {
      backgroundColor: '#2C5282',
      transform: 'translateY(-2px)'
    }
  },
  createTeacherButton: {
    padding: '10px 20px',
    backgroundColor: '#38A169',
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
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    '&:hover': {
      backgroundColor: '#2F855A',
      transform: 'translateY(-2px)'
    }
  },
  createStudentButton: {
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
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    '&:hover': {
      backgroundColor: '#B7791F',
      transform: 'translateY(-2px)',
      color: 'white'
    }
  },
  exportButton: {
    padding: '10px 20px',
    backgroundColor: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    '&:hover': {
      backgroundColor: '#4A5568',
      transform: 'translateY(-2px)'
    }
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
    '&:hover': {
      backgroundColor: 'rgba(0,0,0,0.1)'
    }
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
    transition: 'all 0.2s',
    backgroundColor: '#D69E2E',
    color: '#4B5320',
    '&:hover': {
      backgroundColor: '#B7791F',
      transform: 'translateY(-2px)',
      color: 'white'
    }
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
    color: '#718096',
    fontSize: '16px'
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px 12px 40px',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#2D3748',
    backgroundColor: 'white',
    transition: 'border-color 0.2s',
    '&:focus': {
      outline: 'none',
      borderColor: '#3182CE',
      boxShadow: '0 0 0 3px rgba(49, 130, 206, 0.1)'
    }
  },
  filterSelect: {
    padding: '12px 16px',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '150px',
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
  refreshButton: {
    padding: '12px 16px',
    backgroundColor: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: '120px',
    justifyContent: 'center',
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
    backgroundColor: '#F5F7FA',
    borderRadius: '4px',
    color: '#718096',
    fontSize: '14px'
  },
  emptyState: {
    backgroundColor: 'white',
    padding: '48px 24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center',
    color: '#718096'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5
  },
  tableContainer: {
    overflowX: 'auto',
    marginBottom: '24px',
    borderRadius: '6px',
    border: '1px solid #E2E8F0'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableHeader: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    fontWeight: '600',
    padding: '12px',
    border: '1px solid #E2E8F0',
    textAlign: 'left',
    position: 'sticky',
    top: 0
  },
  tableCell: {
    padding: '12px',
    border: '1px solid #E2E8F0',
    color: '#2D3748'
  },
  profileImage: {
    width: '50px',
    height: '50px',
    objectFit: 'cover',
    borderRadius: '50%',
    border: '2px solid #D69E2E',
    display: 'block',
    position: 'relative',
    zIndex: 2
  },
  profileInitials: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#4B5320',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 'bold',
    border: '2px solid #D69E2E'
  },
  roleBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#FFFFFF',
    display: 'inline-block',
    minWidth: '70px',
    textAlign: 'center'
  },
  subjectsBadge: {
    fontSize: '12px',
    color: '#718096',
    padding: '4px 8px',
    backgroundColor: '#F5F7FA',
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
    marginLeft: '8px',
    '&:hover': {
      color: '#D69E2E'
    }
  },
  expandedDetails: {
    backgroundColor: '#F5F7FA',
    padding: '16px',
    borderTop: '2px solid #E2E8F0'
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
    borderBottom: '1px dashed #E2E8F0'
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
    border: '1px solid #E2E8F0',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    color: '#2D3748'
  },
  coreBadge: {
    fontSize: '10px',
    color: '#22543D',
    backgroundColor: '#C6F6D5',
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
    backgroundColor: '#718096',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#4A5568',
      transform: 'translateY(-2px)'
    }
  },
  editButton: {
    padding: '6px 12px',
    backgroundColor: '#D69E2E',
    color: '#4B5320',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#B7791F',
      transform: 'translateY(-2px)',
      color: 'white'
    }
  },
  deleteButton: {
    padding: '6px 12px',
    backgroundColor: '#E53E3E',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#C53030',
      transform: 'translateY(-2px)'
    }
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #E2E8F0'
  },
  pageButton: {
    padding: '8px 16px',
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
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
  pageInfo: {
    fontSize: '14px',
    color: '#718096'
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
  },
  // UPDATED: Image Upload Styles (from createadmin.js)
  imageUploadSection: {
    marginBottom: '24px',
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
    textAlign: 'center'
  },
  // Form Styles
  formGrid: {
    display: 'grid',
    gap: '24px'
  },
  formSection: {
    padding: '20px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    backgroundColor: '#FAFAFA'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2D3748',
    margin: '0 0 16px 0',
    borderBottom: '2px solid #D69E2E',
    paddingBottom: '8px'
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
  formInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
    color: '#2D3748',
    backgroundColor: 'white',
    transition: 'border-color 0.2s, box-shadow 0.2s',
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
  helpText: {
    color: '#718096',
    fontSize: '12px',
    marginTop: '4px',
    display: 'block'
  },
  loadingText: {
    fontSize: '12px',
    color: '#D69E2E',
    marginLeft: '8px'
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
    backgroundColor: '#F8F9FA',
    cursor: 'pointer',
    color: '#2D3748',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#F0F4F8',
      borderColor: '#CBD5E0'
    }
  },
  coreFormBadge: {
    fontSize: '10px',
    color: '#22543D',
    backgroundColor: '#C6F6D5',
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
    border: '1px solid #E2E8F0',
    borderRadius: '4px',
    backgroundColor: 'white',
    cursor: 'pointer',
    color: '#2D3748',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#F5F7FA',
      borderColor: '#CBD5E0'
    }
  },
  assignmentsContainer: {
    border: '1px solid #E2E8F0',
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
    border: '1px solid #E2E8F0',
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
    color: '#E53E3E',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    borderRadius: '4px',
    '&:hover': {
      backgroundColor: '#FED7D7'
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
    justifyContent: 'center',
    transition: 'all 0.2s',
    '&:hover': {
      backgroundColor: '#3A4218',
      transform: 'translateY(-2px)'
    }
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    justifyContent: 'flex-end'
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
    justifyContent: 'center',
    minWidth: '150px',
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
  cancelButton: {
    padding: '12px 24px',
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
  },
  authRequiredContainer: {
    minHeight: '100vh',
    backgroundColor: '#F5F7FA',
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
  
  table tr:nth-child(even) {
    background-color: #F8F9FA;
  }
  
  table tr:hover {
    background-color: #F0F4F8;
  }
  
  input[type="checkbox"] {
    cursor: pointer;
    accent-color: #3182CE;
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
      width: 100%;
      justify-content: center;
    }
    
    .actionButtons {
      flex-direction: column;
      gap: 4px;
    }
    
    .formRow {
      grid-templateColumns: 1fr;
    }
    
    .modalContent {
      width: 95%;
      margin: 10px;
    }
    
    .imageUploadContainer {
      flex-direction: column;
      text-align: center;
    }
    
    .imagePreviewArea {
      margin: 0 auto;
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