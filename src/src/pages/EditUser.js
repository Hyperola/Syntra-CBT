// pages/EditUser.js - UPDATED WITH SINGLE REQUEST PROFILE IMAGE UPLOAD
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronLeft,
  FiLoader,
  FiX,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiBook,
  FiUsers,
  FiShield,
  FiStar,
  FiLock,
  FiSave,
  FiUpload,
  FiImage,
  FiXCircle,
  FiBookOpen,
  FiPlus,
  FiX as FiClose
} from 'react-icons/fi';

const EditUser = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, token } = useContext(AuthContext);
  
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
    profileImage: '',
    dateOfBirth: '',
    address: '',
    phoneNumber: '',
    sex: '',
    age: '',
    active: true,
    adminPermissions: []
  });
  
  // Image upload state - UPDATED WITH SINGLE REQUEST APPROACH
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [classes, setClasses] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [teacherAssignmentModal, setTeacherAssignmentModal] = useState({
    open: false,
    selectedClass: '',
    selectedSubjects: []
  });
  const [availableSubjectsForAssignment, setAvailableSubjectsForAssignment] = useState([]);
  const [loadingAssignmentSubjects, setLoadingAssignmentSubjects] = useState(false);
  
  const adminPermissionOptions = [
    { value: 'MANAGE_USERS', label: 'Manage Users' },
    { value: 'APPROVE_TESTS', label: 'Approve Tests' },
    { value: 'MANAGE_RESULTS', label: 'Manage Results' },
    { value: 'SYSTEM_CONFIG', label: 'System Configuration' },
    { value: 'VIEW_ANALYTICS', label: 'View Analytics' },
    { value: 'MANAGE_ADMINS', label: 'Manage Admins' }
  ];

  useEffect(() => {
    // Check permissions
    if (!authUser) return;
    
    if (authUser.role !== 'super_admin' && 
        !(authUser.role === 'admin' && authUser.adminPermissions?.includes('MANAGE_USERS')) &&
        authUser.role !== 'teacher') {
      navigate('/admin/users');
      return;
    }
    
    fetchUserData();
    fetchClasses();
  }, [userId, authUser]);

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const authToken = token || localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/classes', {
        headers: { Authorization: `Bearer ${authToken}` },
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
      setError('Failed to load classes.');
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchUserData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const authToken = token || localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      
      if (response.data && response.data.success && response.data.user) {
        const user = response.data.user;
        
        // Check if user can edit this user
        if (authUser.role === 'teacher' && user.role !== 'student') {
          setError('Teachers can only edit students.');
          navigate('/admin/users');
          return;
        }
        
        if (authUser.role === 'admin' && user.role === 'super_admin') {
          setError('Admins cannot edit super admins.');
          navigate('/admin/users');
          return;
        }
        
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
        
        // Extract teacher assignments
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
              subjectId: subjectId,
              subjectName: subjectName
            };
          }).filter(sub => sub.subjectId) || [];
          
          return {
            classId: assignmentClassId,
            className: className,
            subjects: subjects
          };
        }).filter(assignment => assignment.classId && assignment.subjects.length > 0) || [];
        
        // Handle profile image - check for base64 string or URL
        const profileImageData = user.profileImage || user.profilePicture || '';
        
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
          picture: profileImageData ? 'Existing Image' : null,
          profileImage: profileImageData,
          dateOfBirth: formattedDate,
          address: user.address || '',
          phoneNumber: user.phoneNumber || '',
          sex: user.sex || '',
          age: user.age || calculateAge(user.dateOfBirth) || '',
          active: user.active !== false,
          adminPermissions: user.adminPermissions || []
        });
        
        // Set image preview - UPDATED
        if (user.profileImage) {
          // Check if it's a base64 string or URL
          if (user.profileImage.startsWith('data:image/')) {
            // It's already a base64 image
            setImagePreview(user.profileImage);
          } else if (user.profileImage.startsWith('http')) {
            // It's a URL
            setImagePreview(user.profileImage);
          } else {
            // It might be a filename, construct URL
            const imageUrl = `http://localhost:5000/uploads/profiles/${user.profileImage}`;
            setImagePreview(imageUrl);
          }
        } else if (user.profileImageUrl) {
          setImagePreview(user.profileImageUrl);
        }
        
        // Load class subjects if student
        if (classId && user.role === 'student') {
          await fetchClassSubjects(classId);
        }
        
      } else {
        setError('User not found.');
        navigate('/admin/users');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to load user data.';
      setError(errorMsg);
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassSubjects = async (classId) => {
    if (!classId) {
      setClassSubjects([]);
      return;
    }

    setLoadingSubjects(true);
    try {
      const authToken = token || localStorage.getItem('token');
      
      let subjectsList = [];
      
      try {
        const res = await axios.get(`http://localhost:5000/api/classes/${classId}/subjects`, {
          headers: { Authorization: `Bearer ${authToken}` },
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
          headers: { Authorization: `Bearer ${authToken}` },
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
      const authToken = token || localStorage.getItem('token');
      
      let subjectsList = [];
      
      try {
        const res = await axios.get(`http://localhost:5000/api/classes/${classId}/subjects`, {
          headers: { Authorization: `Bearer ${authToken}` },
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
          headers: { Authorization: `Bearer ${authToken}` },
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

  // Helper function to convert image to base64 - FROM CREATEADMIN.JS
  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
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

  const cleanUsername = (username) => {
    if (!username) return '';
    const cleaned = username.replace(/\s+/g, '_').toLowerCase();
    return cleaned.replace(/[^a-zA-Z0-9_]/g, '');
  };

  const validateForm = () => {
    const cleanedUsername = cleanUsername(formData.username);
    
    if (!cleanedUsername.trim()) return 'Username is required.';
    if (!formData.email.trim()) return 'Email is required.';
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

  // UPDATED: Handle image upload with base64 conversion
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
    
    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB (increased from 2MB to match createadmin.js)
    
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, GIF, WebP).');
      return;
    }
    
    if (file.size > maxSize) {
      setError('Image size must be less than 5MB.');
      return;
    }
    
    setUploadingImage(true);
    setError(null);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      // Store the actual File object
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
    setFormData(prev => ({ ...prev, picture: null, profileImage: '' }));
  };

  const handleDateOfBirthChange = (dateString) => {
    const age = calculateAge(dateString);
    setFormData(prev => ({
      ...prev,
      dateOfBirth: dateString,
      age: age || ''
    }));
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

    const existingIndex = formData.teacherAssignments.findIndex(
      assignment => assignment.classId === teacherAssignmentModal.selectedClass
    );

    if (existingIndex >= 0) {
      const updatedAssignments = [...formData.teacherAssignments];
      updatedAssignments[existingIndex] = newAssignment;
      setFormData(prev => ({
        ...prev,
        teacherAssignments: updatedAssignments
      }));
    } else {
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

  // UPDATED: Handle submit with single request including base64 image
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const authToken = token || localStorage.getItem('token');
      if (!authToken) {
        throw new Error('No authentication token found.');
      }
      
      const cleanedUsername = cleanUsername(formData.username);
      
      // Convert image to base64 if exists
      let profileImageBase64 = null;
      if (profileImage) {
        try {
          profileImageBase64 = await convertImageToBase64(profileImage);
          console.log('✅ Image converted to base64, length:', profileImageBase64.length);
        } catch (imageErr) {
          console.warn('⚠️ Could not convert image to base64:', imageErr);
          // Continue without image - don't fail the whole request
        }
      }
      
      // Build user data
      const userData = {
        username: cleanedUsername,
        email: formData.email.trim(),
        firstName: formData.firstName.trim(),
        middleName: formData.middleName?.trim() || '',
        lastName: formData.lastName.trim(),
        role: formData.role,
        active: formData.active,
        dateOfBirth: formData.dateOfBirth || null,
        address: formData.address?.trim() || null,
        phoneNumber: formData.phoneNumber?.trim() || null,
        sex: formData.sex || null,
        age: formData.age ? parseInt(formData.age) : null,
        parentEmail: formData.parentEmail?.trim() || null,
        parentPhoneNumber: formData.parentPhoneNumber?.trim() || null,
        adminPermissions: formData.role === 'admin' ? formData.adminPermissions : []
      };
      
      // Add password only if provided
      if (formData.password && formData.password.trim()) {
        userData.password = formData.password;
      }
      
      // Add profile image as base64 if available
      if (profileImageBase64) {
        userData.profileImage = profileImageBase64;
        console.log('📸 New image included as base64, size:', profileImageBase64.length);
      } else if (formData.profileImage && !profileImage) {
        // Keep existing image if no new one uploaded
        userData.profileImage = formData.profileImage;
        console.log('🖼️ Keeping existing profile image');
      }
      
      // Handle role-specific fields
      if (formData.role === 'student') {
        userData.class = formData.class || null;
        userData.studentId = formData.studentId?.trim() || null;
        
        // Handle student enrolled subjects
        if (formData.selectedSubjects.length > 0) {
          userData.enrolledSubjects = formData.selectedSubjects.map(subjectId => {
            const subject = classSubjects.find(s => s.id === subjectId);
            return {
              subject: subjectId,
              subjectName: subject?.name || 'Unknown Subject',
              isCore: subject?.isCore || false
            };
          });
        } else {
          userData.enrolledSubjects = [];
        }
      }
      
      if (formData.role === 'teacher') {
        userData.class = formData.class || null;
        
        // Send teacher assignments in correct format
        if (formData.teacherAssignments.length > 0) {
          userData.teacherAssignments = formData.teacherAssignments.map(assignment => ({
            class: assignment.classId,
            subjects: assignment.subjects.map(subject => ({
              subject: subject.subjectId
            }))
          }));
        } else {
          userData.teacherAssignments = [];
        }
        
        console.log('📤 Teacher assignments to send:', userData.teacherAssignments);
      }
      
      if (formData.role === 'admin' || formData.role === 'super_admin') {
        delete userData.class;
        delete userData.studentId;
      }
      
      console.log('🔄 Final user data to update (SINGLE REQUEST):', {
        ...userData,
        profileImage: userData.profileImage ? 'BASE64_IMAGE_INCLUDED' : 'NO_IMAGE',
        password: formData.password ? '***' : 'NOT_CHANGED'
      });
      
      // SINGLE REQUEST: Update user with profile image in one request
      const response = await axios.put(
        `http://localhost:5000/api/users/${userId}`, 
        userData, 
        {
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      console.log('✅ User update response:', {
        success: response.data.success,
        message: response.data.message
      });
      
      if (response.data.success) {
        setSuccess('User updated successfully with profile image! Redirecting...');
        
        // Navigate back after success
        setTimeout(() => {
          navigate(`/admin/users/${userId}`);
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to update user');
      }
      
    } catch (err) {
      console.error('❌ Error updating user:', err);
      
      if (err.response) {
        console.error('📡 Response error details:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
        
        if (err.response.status === 400) {
          const errorMsg = err.response.data.message || 'Validation error. Please check the form.';
          setError(errorMsg);
        } else if (err.response.status === 401) {
          setError('Authentication failed. Please log in again.');
          setTimeout(() => navigate('/login'), 2000);
        } else if (err.response.status === 403) {
          setError('Permission denied. You do not have access to edit this user.');
        } else if (err.response.status === 409) {
          setError('User with this username or email already exists.');
        } else {
          setError(err.response.data?.message || `Server error: ${err.response.status}`);
        }
      } else if (err.request) {
        console.error('🌐 Network error details:', err.request);
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading user data...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <main style={styles.main}>
        {/* Header */}
        <div style={styles.header}>
          <button
            onClick={() => navigate(`/admin/users/${userId}`)}
            style={styles.backButton}
          >
            <FiChevronLeft /> Back to User Details
          </button>
          
          <div>
            <h1 style={styles.title}>Edit User</h1>
            <p style={styles.subtitle}>Edit user information and settings</p>
          </div>
        </div>

        {/* Messages */}
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

        {/* Edit Form */}
        <div style={styles.formContainer}>
          <form onSubmit={handleSubmit}>
            {/* Profile Image Upload Section - UPDATED */}
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
                    disabled={uploadingImage || saving}
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
                      disabled={uploadingImage || saving}
                    >
                      <FiXCircle /> Remove
                    </button>
                  )}
                  <div style={styles.imageUploadInfo}>
                    <small>JPG, PNG, GIF, WebP up to 5MB</small>
                    <br />
                    <small>Image will be saved with user update</small>
                    {formData.profileImage && !imagePreview && (
                      <small style={{ display: 'block', color: '#D69E2E', marginTop: '4px' }}>
                        Existing image will be kept
                      </small>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.formGrid}>
              {/* Basic Information Section */}
              <div style={styles.formSection}>
                <h4 style={styles.sectionTitle}>
                  <FiUser /> Basic Information
                </h4>
                
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
                      disabled={saving}
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
                      disabled={saving}
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
                      disabled={saving}
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
                      disabled={saving}
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
                      disabled={saving}
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
                      disabled={saving}
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
                      disabled={saving}
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
                      disabled={saving || (authUser.role !== 'super_admin' && formData.role === 'super_admin')}
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                      {authUser.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                    </select>
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Status</label>
                    <select
                      value={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
                      style={styles.formInput}
                      disabled={saving}
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div style={styles.formSection}>
                <h4 style={styles.sectionTitle}>
                  <FiMail /> Contact Information
                </h4>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g., +2341234567890"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      style={styles.formInput}
                      disabled={saving}
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
                      disabled={saving}
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
                    {formData.role === 'student' ? <FiBook /> : <FiUsers />}
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
                          disabled={saving}
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
                          disabled={saving}
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
                      disabled={loadingClasses || saving}
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
                          disabled={saving}
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
                                      disabled={saving}
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
                                    disabled={saving}
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
                          disabled={saving}
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
                  <h4 style={styles.sectionTitle}>
                    <FiShield /> Admin Permissions
                  </h4>
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
                          disabled={saving}
                        />
                        <span>{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Personal Information */}
              <div style={styles.formSection}>
                <h4 style={styles.sectionTitle}>
                  <FiCalendar /> Personal Information
                </h4>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleDateOfBirthChange(e.target.value)}
                      style={styles.formInput}
                      disabled={saving}
                    />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Age</label>
                    <input
                      type="number"
                      value={formData.age}
                      readOnly
                      style={{...styles.formInput, backgroundColor: '#F5F7FA'}}
                      disabled={saving}
                    />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Sex</label>
                    <select
                      value={formData.sex}
                      onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                      style={styles.formInput}
                      disabled={saving}
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
                disabled={saving || uploadingImage}
                style={styles.submitButton}
              >
                {saving ? (
                  <>
                    <div style={styles.savingSpinner}></div> Updating...
                  </>
                ) : (
                  <>
                    <FiSave /> Update User
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => navigate(`/admin/users/${userId}`)}
                style={styles.cancelButton}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Teacher Assignment Modal */}
      {teacherAssignmentModal.open && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modalContent, maxWidth: '600px'}}>
            <div style={styles.modalHeader}>
              <h3 style={{color: '#2D3748', margin: 0}}>Add Teacher Assignment</h3>
              <button onClick={closeTeacherAssignmentModal} style={styles.modalCloseButton}>
                <FiClose />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Select Class</label>
                <select
                  value={teacherAssignmentModal.selectedClass}
                  onChange={(e) => handleAssignmentClassChange(e.target.value)}
                  style={styles.formInput}
                  disabled={loadingAssignmentSubjects || saving}
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
                              disabled={saving}
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
                disabled={!teacherAssignmentModal.selectedClass || teacherAssignmentModal.selectedSubjects.length === 0 || saving}
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

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F5F7FA',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
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
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px',
    display: 'inline-block'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  backButton: {
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
    '&:hover': {
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
  formContainer: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
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
    gap: '20px',
    flexWrap: 'wrap'
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
    flex: 1,
    minWidth: '200px'
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
    paddingBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
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
  loadingSubjects: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#F5F7FA',
    borderRadius: '4px',
    color: '#718096',
    fontSize: '14px'
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
    '&:hover:not(:disabled)': {
      backgroundColor: '#FED7D7'
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
    '&:hover:not(:disabled)': {
      backgroundColor: '#3A4218',
      transform: 'translateY(-2px)'
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed'
    }
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    justifyContent: 'flex-end',
    paddingTop: '20px',
    borderTop: '1px solid #E2E8F0'
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
    '&:hover:not(:disabled)': {
      backgroundColor: '#4A5568',
      transform: 'translateY(-2px)'
    },
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed'
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

// Add CSS for animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  input[type="checkbox"] {
    cursor: pointer;
    accent-color: #3182CE;
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .main {
      padding: 16px;
    }
    
    .header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    
    .imageUploadContainer {
      flex-direction: column;
      text-align: center;
    }
    
    .imagePreviewArea {
      margin: 0 auto;
    }
    
    .formRow {
      grid-templateColumns: 1fr;
    }
    
    .formActions {
      flex-direction: column;
    }
    
    .submitButton, .cancelButton {
      width: 100%;
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
    
    .title {
      font-size: 24px;
    }
    
    .subtitle {
      font-size: 14px;
    }
    
    .formSection {
      padding: 16px;
    }
    
    .sectionTitle {
      font-size: 15px;
    }
  }
`;
document.head.appendChild(styleSheet);

export default EditUser;