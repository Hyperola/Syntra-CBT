// pages/ManageClasses.js - UPDATED VERSION (Fixed API endpoints)
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiEye,
  FiUsers,
  FiBook,
  FiSearch,
  FiTrash2,
  FiEdit,
  FiPlus,
  FiRefreshCw,
  FiUserPlus,
  FiBookOpen,
  FiChevronDown,
  FiChevronUp,
  FiX,
  FiUser,
  FiLoader,
  FiInfo,
  FiUserCheck,
  FiUserX,
  FiUserMinus,
  FiChevronRight,
  FiUsers as FiTeachers,
  FiBriefcase,
  FiDownload,
  FiSliders,
  FiGrid,
  FiHash,
  FiArchive,
  FiFileText,
  FiClock,
  FiBookmark,
  FiList,
  FiPackage
} from 'react-icons/fi';

const ManageClasses = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(location.state?.success || null);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStream, setFilterStream] = useState('all');
  const [filterActive, setFilterActive] = useState('active');
  const [expandedClass, setExpandedClass] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(null);
  const [showStudentsModal, setShowStudentsModal] = useState(null);
  const [showSubjectTeachersModal, setShowSubjectTeachersModal] = useState(null);
  const [showAssignTeacherModal, setShowAssignTeacherModal] = useState(null);
  const [showStreamStats, setShowStreamStats] = useState(false);
  const [showAddSubjectsModal, setShowAddSubjectsModal] = useState(null);
  const [showRemoveSubjectModal, setShowRemoveSubjectModal] = useState(null);
  
  // Class details states
  const [classDetails, setClassDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [classStudents, setClassStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [classSubjectTeachers, setClassSubjectTeachers] = useState([]);
  const [loadingSubjectTeachers, setLoadingSubjectTeachers] = useState(false);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [availableStreams, setAvailableStreams] = useState([]);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [streamStatistics, setStreamStatistics] = useState({});
  const [subjectAssignments, setSubjectAssignments] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  
  // Subject management states
  const [allSubjects, setAllSubjects] = useState([]);
  const [loadingAllSubjects, setLoadingAllSubjects] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [assignSubjectsLoading, setAssignSubjectsLoading] = useState(false);
  const [subjectToRemove, setSubjectToRemove] = useState(null);
  
  // Assignment states
  const [assigningSubject, setAssigningSubject] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [assignTeacherLoading, setAssignTeacherLoading] = useState(false);
  
  const [newClassData, setNewClassData] = useState({
    name: '',
    shortName: '',
    level: 'JSS1',
    stream: '',
    section: '',
    capacity: 40,
    classTeacherId: ''
  });

  const levels = ['JSS1', 'JSS2', 'JSS3', 'SSS1', 'SSS2', 'SSS3'];
  const streams = [
    'GOLD', 'SILVER', 'DIAMOND', 'PEARL', 'RUBY', 'SAPPHIRE', 'EMERALD',
    'SCIENCE', 'ARTS', 'COMMERCIAL', 'TECHNICAL', 'BUSINESS', 'ADMINISTRATION',
    'AGRICULTURE', 'HOME_ECONOMICS', 'GENERAL'
  ];

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'teacher')) {
      fetchClasses();
    }
  }, [user]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Calculate stream statistics
  const calculateStreamStats = (classesData) => {
    const stats = {};
    classesData.forEach(cls => {
      if (cls.stream) {
        if (!stats[cls.stream]) {
          stats[cls.stream] = {
            count: 0,
            levels: new Set()
          };
        }
        stats[cls.stream].count++;
        if (cls.level) stats[cls.stream].levels.add(cls.level);
      }
    });
    
    // Convert Set to Array
    Object.keys(stats).forEach(stream => {
      stats[stream].levels = Array.from(stats[stream].levels);
    });
    
    return stats;
  };

  // Format class name
  const formatClassName = (clsData) => {
    if (clsData.fullName) return clsData.fullName;
    
    const parts = [clsData.level];
    if (clsData.stream) parts.push(clsData.stream);
    if (clsData.section && clsData.section.trim() !== '') parts.push(`(${clsData.section})`);
    return parts.join(' ');
  };

  // Fetch all classes
  const fetchClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let classesData = [];
      if (res.data && Array.isArray(res.data.classes)) {
        classesData = res.data.classes;
      } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
        classesData = res.data.data;
      } else if (Array.isArray(res.data)) {
        classesData = res.data;
      }
      
      // Format classes
      const formattedClasses = await Promise.all(classesData.map(async (cls) => {
        const classId = cls._id || cls.id;
        
        // Get class teacher details if assigned
        let classTeacher = null;
        let classTeacherName = 'Not Assigned';
        if (cls.classTeacher) {
          try {
            const teacherRes = await axios.get(`http://localhost:5000/api/users/${cls.classTeacher}`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (teacherRes.data.success) {
              classTeacher = teacherRes.data.user;
              classTeacherName = `${classTeacher.firstName} ${classTeacher.lastName}`.trim() || classTeacher.username;
            }
          } catch (err) {
            console.error('Error fetching class teacher:', err);
          }
        }
        
        return {
          ...cls,
          id: classId,
          classTeacher: classTeacher,
          classTeacherName: classTeacherName,
          displayName: formatClassName(cls),
          isActive: cls.isActive !== false
        };
      }));
      
      setClasses(formattedClasses);
      
      // Calculate stream statistics
      setStreamStatistics(calculateStreamStats(formattedClasses));
      
    } catch (err) {
      console.error('Fetch classes error:', err);
      setError(err.response?.data?.message || 'Failed to load classes');
    }
    setLoading(false);
  };

  // Fetch available streams for a level
  const fetchAvailableStreams = async (level) => {
    setLoadingStreams(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/classes/streams/available', {
        params: { level },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setAvailableStreams(res.data.availableStreams || []);
      } else {
        setAvailableStreams([]);
      }
    } catch (err) {
      console.error('Error fetching available streams:', err);
      setAvailableStreams([]);
    } finally {
      setLoadingStreams(false);
    }
  };

  // Fetch all available subjects
  const fetchAllSubjects = async () => {
    setLoadingAllSubjects(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/subjects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let subjectsData = [];
      if (res.data && Array.isArray(res.data.subjects)) {
        subjectsData = res.data.subjects;
      } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
        subjectsData = res.data.data;
      } else if (Array.isArray(res.data)) {
        subjectsData = res.data;
      }
      
      setAllSubjects(subjectsData);
    } catch (err) {
      console.error('Error fetching all subjects:', err);
      setError(err.response?.data?.message || 'Failed to load subjects');
    } finally {
      setLoadingAllSubjects(false);
    }
  };

  // Fetch subjects for a specific class
  const fetchClassSubjects = async (classId) => {
    setLoadingSubjects(true);
    try {
      const token = localStorage.getItem('token');
      // FIXED: Use correct class-subjects endpoint
      const res = await axios.get(`http://localhost:5000/api/class-subjects/class/${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let subjectsData = [];
      if (res.data && Array.isArray(res.data.subjects)) {
        subjectsData = res.data.subjects;
      } else if (res.data && Array.isArray(res.data)) {
        subjectsData = res.data;
      } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
        subjectsData = res.data.data;
      }
      
      setSubjectAssignments(subjectsData);
      
      // Also fetch all subjects to show which ones are not assigned
      await fetchAllSubjects();
      
    } catch (err) {
      console.error('Error fetching class subjects:', err);
      setError(err.response?.data?.message || 'Failed to load class subjects');
    } finally {
      setLoadingSubjects(false);
    }
  };

  // Fetch unassigned subjects for a class
  const fetchUnassignedSubjects = async (classId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/class-subjects/class/${classId}/unassigned`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data && res.data.unassignedSubjects) {
        return res.data.unassignedSubjects;
      }
      return [];
    } catch (err) {
      console.error('Error fetching unassigned subjects:', err);
      return [];
    }
  };

  // Open add subjects modal
  const openAddSubjectsModal = async (classId, className) => {
    setShowAddSubjectsModal({ classId, className });
    
    // Fetch currently assigned subjects
    await fetchClassSubjects(classId);
    
    // Fetch unassigned subjects directly from API
    const unassigned = await fetchUnassignedSubjects(classId);
    setAllSubjects(unassigned);
    
    setSelectedSubjects([]);
  };

  // Open remove subject modal
  const openRemoveSubjectModal = (subject, classId, className) => {
    setSubjectToRemove(subject);
    setShowRemoveSubjectModal({ classId, className });
  };

  // Add subjects to class
  const handleAddSubjects = async () => {
    if (!showAddSubjectsModal || selectedSubjects.length === 0) {
      setError('Please select at least one subject to add');
      return;
    }

    setAssignSubjectsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { classId } = showAddSubjectsModal;
      
      // FIXED: Use correct class-subjects endpoint
      const response = await axios.post(`http://localhost:5000/api/class-subjects/class/${classId}/bulk`, {
        subjectIds: selectedSubjects,
        isCompulsory: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 201) {
        setSuccess(`${selectedSubjects.length} subject(s) added successfully`);
        
        // Refresh subjects list
        await fetchClassSubjects(classId);
        // Refresh subject teachers if modal is open
        if (showSubjectTeachersModal === classId) {
          await fetchSubjectTeachers(classId);
        }
        // Refresh class details if modal is open
        if (showDetailsModal) {
          await fetchClassDetails(classId);
        }
        
        setShowAddSubjectsModal(null);
        setSelectedSubjects([]);
      }
    } catch (err) {
      console.error('Add subjects error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to add subjects');
    } finally {
      setAssignSubjectsLoading(false);
    }
  };

  // Remove subject from class
  const handleRemoveSubject = async () => {
    if (!showRemoveSubjectModal || !subjectToRemove) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const { classId } = showRemoveSubjectModal;
      
      // Find the assignment ID from the subjectToRemove
      const assignmentId = subjectToRemove.id || subjectToRemove._id;
      
      if (!assignmentId) {
        setError('Cannot find subject assignment');
        return;
      }

      // FIXED: Use correct class-subjects endpoint
      const response = await axios.delete(`http://localhost:5000/api/class-subjects/assignment/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200) {
        setSuccess(`Subject "${subjectToRemove.name || subjectToRemove.subject?.name}" removed successfully`);
        
        // Refresh subjects list
        await fetchClassSubjects(classId);
        // Refresh subject teachers if modal is open
        if (showSubjectTeachersModal === classId) {
          await fetchSubjectTeachers(classId);
        }
        // Refresh class details if modal is open
        if (showDetailsModal) {
          await fetchClassDetails(classId);
        }
        
        setShowRemoveSubjectModal(null);
        setSubjectToRemove(null);
      }
    } catch (err) {
      console.error('Remove subject error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to remove subject');
    }
  };

  // Validate class data before submission
  const validateClassData = (data) => {
    const errors = [];
    
    if (!data.name || data.name.trim() === '') {
      errors.push('Class name is required');
    }
    
    if (!data.shortName || data.shortName.trim() === '') {
      errors.push('Short name is required');
    }
    
    if (!data.level) {
      errors.push('Level is required');
    }
    
    // CRITICAL: Stream validation
    if (!data.stream || data.stream.trim() === '') {
      errors.push('Stream name is required');
    } else if (data.stream.length < 2) {
      errors.push('Stream name must be at least 2 characters');
    }
    
    if (data.capacity && (data.capacity < 1 || data.capacity > 100)) {
      errors.push('Capacity must be between 1 and 100');
    }
    
    return errors;
  };

  // Check for duplicate stream (UPDATED TO HANDLE NULL SECTIONS)
  const checkDuplicateStream = async (level, stream, section = '') => {
    try {
      const token = localStorage.getItem('token');
      
      // Prepare params - send null for empty sections
      const params = {
        level,
        stream,
        section: section && section.trim() !== '' ? section : null
      };
      
      // Remove empty params
      Object.keys(params).forEach(key => {
        if (params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });
      
      const res = await axios.get(`http://localhost:5000/api/classes/check-duplicate`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return res.data.exists || false;
    } catch (err) {
      console.error('Duplicate check error:', err);
      return false;
    }
  };

  // Fetch detailed class information for modal
  const fetchClassDetails = async (classId) => {
    setLoadingDetails(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch class details
      const classRes = await axios.get(`http://localhost:5000/api/classes/${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let classData = classRes.data.class || classRes.data || classRes.data?.data;
      if (!classData) {
        throw new Error('Class not found');
      }
      
      // Get class teacher details if assigned
      if (classData.classTeacher) {
        try {
          const teacherRes = await axios.get(`http://localhost:5000/api/users/${classData.classTeacher}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (teacherRes.data.success) {
            classData.classTeacher = teacherRes.data.user;
            classData.classTeacherName = `${teacherRes.data.user.firstName} ${teacherRes.data.user.lastName}`.trim() || teacherRes.data.user.username;
          }
        } catch (err) {
          console.error('Error fetching class teacher details:', err);
          classData.classTeacherName = 'Teacher not found';
        }
      } else {
        classData.classTeacherName = 'Not Assigned';
      }
      
      // Get subject assignments
      let subjectAssignments = [];
      try {
        // FIXED: Use correct class-subjects endpoint
        const subjectsRes = await axios.get(`http://localhost:5000/api/class-subjects/class/${classId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (subjectsRes.data && Array.isArray(subjectsRes.data.subjects)) {
          subjectAssignments = subjectsRes.data.subjects;
        } else if (subjectsRes.data && Array.isArray(subjectsRes.data)) {
          subjectAssignments = subjectsRes.data;
        } else if (subjectsRes.data && subjectsRes.data.data && Array.isArray(subjectsRes.data.data)) {
          subjectAssignments = subjectsRes.data.data;
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
      }
      
      // Get subject teachers
      let subjectsWithTeachers = [];
      try {
        const teacherRes = await axios.get(`http://localhost:5000/api/users/subject-teachers/class/${classId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (teacherRes.data && teacherRes.data.subjectTeachers && Array.isArray(teacherRes.data.subjectTeachers)) {
          // Map subject teachers to subjects
          subjectAssignments.forEach(subject => {
            const subjectId = subject._id || subject.id || subject.subject?._id || subject.subjectId;
            let teacher = null;
            let teacherName = 'Not Assigned';
            
            for (const teacherData of teacherRes.data.subjectTeachers) {
              if (teacherData.subjects && teacherData.subjects.some(s => 
                (s.id || s._id || s.subject?.id || s.subject?._id) === subjectId
              )) {
                teacher = teacherData.teacher;
                teacherName = teacher ? 
                  `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.username : 
                  'Not Assigned';
                break;
              }
            }
            
            subjectsWithTeachers.push({
              ...subject,
              id: subjectId,
              name: subject.name || subject.subject?.name,
              code: subject.code || subject.subject?.code,
              teacher: teacher,
              teacherName: teacherName
            });
          });
        } else {
          // No teachers assigned yet
          subjectsWithTeachers = subjectAssignments.map(subject => ({
            ...subject,
            id: subject._id || subject.id || subject.subject?._id || subject.subjectId,
            name: subject.name || subject.subject?.name,
            code: subject.code || subject.subject?.code,
            teacher: null,
            teacherName: 'Not Assigned'
          }));
        }
      } catch (err) {
        console.error('Error fetching subject teachers:', err);
        // If error, just show subjects without teachers
        subjectsWithTeachers = subjectAssignments.map(subject => ({
          ...subject,
          id: subject._id || subject.id || subject.subject?._id || subject.subjectId,
          name: subject.name || subject.subject?.name,
          code: subject.code || subject.subject?.code,
          teacher: null,
          teacherName: 'Not Assigned'
        }));
      }
      
      const fullClassDetails = {
        ...classData,
        id: classId,
        subjectAssignments: subjectsWithTeachers,
        createdAt: classData.createdAt ? new Date(classData.createdAt).toLocaleDateString() : 'N/A'
      };
      
      setClassDetails(fullClassDetails);
      setShowDetailsModal(true);
      
    } catch (err) {
      console.error('Fetch class details error:', err);
      setError(err.response?.data?.message || 'Failed to load class details');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Fetch students in a class
  const fetchClassStudents = async (classId) => {
    setLoadingStudents(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/classes/${classId}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let students = [];
      if (res.data && res.data.students && Array.isArray(res.data.students)) {
        students = res.data.students;
      } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
        students = res.data.data;
      } else if (Array.isArray(res.data)) {
        students = res.data;
      }
      
      // Format student names properly
      const formattedStudents = students.map(student => ({
        ...student,
        id: student._id || student.id,
        displayName: student.name || 
                    `${student.firstName || ''} ${student.lastName || ''}`.trim() || 
                    student.username,
        studentId: student.studentId || 'N/A'
      }));
      
      setClassStudents(formattedStudents);
      setShowStudentsModal(classId);
      
      // Get class info for modal title
      const classData = classes.find(c => c.id === classId);
      if (classData) {
        setClassDetails(classData);
      }
      
    } catch (err) {
      console.error('Fetch class students error:', err);
      setError(err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Fetch subject teachers for a class
  const fetchSubjectTeachers = async (classId) => {
    setLoadingSubjectTeachers(true);
    try {
      const token = localStorage.getItem('token');
      
      // Get class details
      const classRes = await axios.get(`http://localhost:5000/api/classes/${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const classData = classRes.data.class || classRes.data;
      
      // Get subject assignments
      let subjects = [];
      try {
        // FIXED: Use correct class-subjects endpoint
        const subjectsRes = await axios.get(`http://localhost:5000/api/class-subjects/class/${classId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (subjectsRes.data && Array.isArray(subjectsRes.data.subjects)) {
          subjects = subjectsRes.data.subjects;
        } else if (subjectsRes.data && Array.isArray(subjectsRes.data)) {
          subjects = subjectsRes.data;
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
      }
      
      // Get subject teachers
      let subjectsWithTeachers = [];
      try {
        const teacherRes = await axios.get(`http://localhost:5000/api/users/subject-teachers/class/${classId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (teacherRes.data && teacherRes.data.subjectTeachers && Array.isArray(teacherRes.data.subjectTeachers)) {
          // Map teachers to subjects
          subjects.forEach(subject => {
            const subjectId = subject._id || subject.id || subject.subject?._id || subject.subjectId;
            let teacher = null;
            let teacherName = 'Not Assigned';
            
            for (const teacherData of teacherRes.data.subjectTeachers) {
              if (teacherData.subjects && teacherData.subjects.some(s => 
                (s.id || s._id || s.subject?.id || s.subject?._id) === subjectId
              )) {
                teacher = teacherData.teacher;
                teacherName = teacher ? 
                  `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.username : 
                  'Not Assigned';
                break;
              }
            }
            
            subjectsWithTeachers.push({
              ...subject,
              id: subjectId,
              name: subject.name || subject.subject?.name,
              code: subject.code || subject.subject?.code,
              teacher: teacher,
              teacherName: teacherName
            });
          });
        } else {
          // No teachers assigned
          subjectsWithTeachers = subjects.map(subject => ({
            ...subject,
            id: subject._id || subject.id || subject.subject?._id || subject.subjectId,
            name: subject.name || subject.subject?.name,
            code: subject.code || subject.subject?.code,
            teacher: null,
            teacherName: 'Not Assigned'
          }));
        }
      } catch (err) {
        console.error('Error fetching subject teachers:', err);
        // If error, show subjects without teachers
        subjectsWithTeachers = subjects.map(subject => ({
          ...subject,
          id: subject._id || subject.id || subject.subject?._id || subject.subjectId,
          name: subject.name || subject.subject?.name,
          code: subject.code || subject.subject?.code,
          teacher: null,
          teacherName: 'Not Assigned'
        }));
      }
      
      setClassSubjectTeachers(subjectsWithTeachers);
      setClassDetails(classData);
      setShowSubjectTeachersModal(classId);
      
    } catch (err) {
      console.error('Fetch subject teachers error:', err);
      setError(err.response?.data?.message || 'Failed to load subject teachers');
    } finally {
      setLoadingSubjectTeachers(false);
    }
  };

  // Fetch available teachers for assignment
  const fetchAvailableTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/users/teachers/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let teachersData = [];
      if (res.data && res.data.teachers && Array.isArray(res.data.teachers)) {
        teachersData = res.data.teachers;
      } else if (res.data && Array.isArray(res.data)) {
        teachersData = res.data;
      }
      
      setAvailableTeachers(teachersData);
    } catch (err) {
      console.error('Fetch teachers error:', err);
      setError(err.response?.data?.message || 'Failed to load teachers');
    } finally {
      setLoadingTeachers(false);
    }
  };

  // Open assign teacher modal for a subject
  const openAssignTeacherModal = (subject, classId) => {
    setAssigningSubject(subject);
    fetchAvailableTeachers();
    setSelectedTeacher(subject.teacher?.id || subject.teacher?._id || '');
    setShowAssignTeacherModal({
      classId,
      subjectId: subject.id || subject._id,
      subjectName: subject.name
    });
  };

  // Assign teacher to a subject
  const handleAssignTeacher = async () => {
    if (!showAssignTeacherModal || !selectedTeacher) {
      setError('Please select a teacher');
      return;
    }

    setAssignTeacherLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { classId, subjectId } = showAssignTeacherModal;
      
      // FIXED: Use correct class-subjects endpoint
      const response = await axios.post(`http://localhost:5000/api/class-subjects/assignment/${subjectId}/teacher`, {
        teacherId: selectedTeacher
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200) {
        const teacher = availableTeachers.find(t => (t.id || t._id) === selectedTeacher);
        const teacherName = teacher ? (teacher.name || teacher.displayName || teacher.username) : 'Teacher';
        
        setSuccess(`Teacher ${teacherName} assigned to ${showAssignTeacherModal.subjectName}`);
        
        // Refresh subject teachers list
        await fetchSubjectTeachers(classId);
        // Refresh class details if modal is open
        if (showDetailsModal) {
          await fetchClassDetails(classId);
        }
        
        setShowAssignTeacherModal(null);
        setSelectedTeacher('');
        setAssigningSubject(null);
      }
    } catch (err) {
      console.error('Assign teacher error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to assign teacher');
    } finally {
      setAssignTeacherLoading(false);
    }
  };

  // Remove teacher from a subject
  const handleRemoveTeacher = async (classId, subjectId, subjectName) => {
    if (!window.confirm(`Are you sure you want to remove the teacher from ${subjectName}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Get current teacher for this subject
      const subjectTeacher = classSubjectTeachers.find(st => 
        (st.id || st._id) === subjectId
      );
      
      if (!subjectTeacher || !subjectTeacher.teacher) {
        setError('No teacher assigned to this subject');
        return;
      }

      const teacherId = subjectTeacher.teacher.id || subjectTeacher.teacher._id;
      const assignmentId = subjectId; // Use subject assignment ID

      // FIXED: Remove teacher by updating assignment with null teacher
      const response = await axios.put(`http://localhost:5000/api/class-subjects/assignment/${assignmentId}`, {
        teacherId: null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200) {
        setSuccess(`Teacher removed from ${subjectName}`);
        // Refresh the list
        await fetchSubjectTeachers(classId);
        // Refresh class details if modal is open
        if (showDetailsModal) {
          await fetchClassDetails(classId);
        }
      }
    } catch (err) {
      console.error('Remove teacher error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to remove teacher');
    }
  };

  // Assign class teacher
  const handleAssignClassTeacher = async (classId, teacherId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`http://localhost:5000/api/classes/${classId}`, {
        classTeacher: teacherId || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const teacher = teacherId ? 
          availableTeachers.find(t => (t.id || t._id) === teacherId) : null;
        
        if (teacherId) {
          setSuccess(`Class teacher assigned: ${teacher?.name || teacher?.username}`);
        } else {
          setSuccess('Class teacher removed');
        }
        
        fetchClasses(); // Refresh classes list
        if (showDetailsModal) {
          fetchClassDetails(classId); // Refresh details modal
        }
      }
    } catch (err) {
      console.error('Assign class teacher error:', err);
      setError(err.response?.data?.message || 'Failed to assign class teacher');
    }
  };

  // Delete class permanently
  const handleDeleteClass = async (classId, className) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`http://localhost:5000/api/classes/${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSuccess(`Class "${className}" deleted successfully`);
        setClasses(prevClasses => prevClasses.filter(cls => 
          cls.id !== classId
        ));
        setShowDeleteModal(null);
      }
    } catch (err) {
      console.error('Delete class error:', err);
      setError(err.response?.data?.message || 'Failed to delete class');
    }
  };

  // Create new class (UPDATED TO HANDLE NULL SECTIONS)
  const handleCreateClass = async (e) => {
    e.preventDefault();
    
    // Validate data
    const validationErrors = validateClassData(newClassData);
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }
    
    // Check for duplicate stream
    try {
      const isDuplicate = await checkDuplicateStream(
        newClassData.level,
        newClassData.stream.trim().toUpperCase(),
        newClassData.section || '' // Send empty string, backend will convert to null
      );
      
      if (isDuplicate) {
        setError(`A ${newClassData.level} ${newClassData.stream} class already exists. Please use a different stream name.`);
        return;
      }
    } catch (err) {
      console.error('Duplicate check failed:', err);
      // Continue anyway, backend will catch duplicates
    }
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const classData = {
        ...newClassData,
        stream: newClassData.stream.trim().toUpperCase(),
        section: newClassData.section && newClassData.section.trim() !== '' 
          ? newClassData.section.trim().toUpperCase() 
          : null // Send null for empty sections
      };
      
      // Remove empty properties
      Object.keys(classData).forEach(key => {
        if (classData[key] === null || classData[key] === undefined || classData[key] === '') {
          delete classData[key];
        }
      });
      
      const res = await axios.post('http://localhost:5000/api/classes', classData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setSuccess('Class created successfully');
        setShowCreateModal(false);
        setNewClassData({
          name: '',
          shortName: '',
          level: 'JSS1',
          stream: '',
          section: '',
          capacity: 40,
          classTeacherId: ''
        });
        fetchClasses();
      }
    } catch (err) {
      console.error('Create class error:', err);
      let errorMsg = err.response?.data?.message || 'Failed to create class';
      
      // Handle duplicate key errors
      if (err.response?.data?.details?.includes('already exists')) {
        errorMsg = err.response.data.details;
      } else if (err.code === 11000) {
        errorMsg = 'A class with this combination already exists. Please use a different stream name.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Filter classes based on search and filters
  const filteredClasses = classes.filter(cls => {
    if (!cls) return false;
    
    const className = cls.displayName || cls.name || '';
    const classLevel = cls.level || '';
    const classStream = cls.stream || '';
    const classTeacher = cls.classTeacherName || '';
    const shortName = cls.shortName || '';
    
    const matchesSearch = className.toLowerCase().includes(search.toLowerCase()) ||
                         classLevel.toLowerCase().includes(search.toLowerCase()) ||
                         classStream.toLowerCase().includes(search.toLowerCase()) ||
                         classTeacher.toLowerCase().includes(search.toLowerCase()) ||
                         shortName.toLowerCase().includes(search.toLowerCase());
    
    const matchesLevel = filterLevel === 'all' || cls.level === filterLevel;
    const matchesStream = filterStream === 'all' || cls.stream === filterStream;
    const matchesActive = filterActive === 'all' || 
                          (filterActive === 'active' && cls.isActive) ||
                          (filterActive === 'inactive' && !cls.isActive);
    
    return matchesSearch && matchesLevel && matchesStream && matchesActive;
  });

  // Get unique streams from classes
  const uniqueStreams = [...new Set(classes.map(cls => cls.stream).filter(Boolean))];

  // Stream color mapping
  const streamColors = {
    'GOLD': '#D4A017',
    'SILVER': '#C0C0C0',
    'DIAMOND': '#00CED1',
    'PEARL': '#F0E68C',
    'RUBY': '#E0115F',
    'SAPPHIRE': '#0F52BA',
    'EMERALD': '#50C878',
    'SCIENCE': '#0066CC',
    'ARTS': '#CC0066',
    'COMMERCIAL': '#009900',
    'TECHNICAL': '#FF6600',
    'BUSINESS': '#800080',
    'ADMINISTRATION': '#008080',
    'AGRICULTURE': '#228B22',
    'HOME_ECONOMICS': '#FF69B4',
    'GENERAL': '#808080'
  };

  // Get stream color
  const getStreamColor = (stream) => {
    return streamColors[stream] || '#4B5320';
  };

  // Handle level change in create modal
  const handleLevelChange = (level) => {
    setNewClassData({...newClassData, level});
    fetchAvailableStreams(level);
  };

  // Get subjects already assigned to the class
  const getAssignedSubjectIds = () => {
    return subjectAssignments.map(subject => 
      subject.id || subject._id || subject.subjectId || subject.subject?._id || subject.subject?.id
    ).filter(Boolean);
  };

  // Get available subjects (not already assigned)
  const getAvailableSubjects = () => {
    const assignedIds = getAssignedSubjectIds();
    return allSubjects.filter(subject => {
      const subjectId = subject.id || subject._id;
      return !assignedIds.includes(subjectId);
    });
  };

  // Toggle subject selection
  const toggleSubjectSelection = (subjectId) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };

  if (!user || !(user.role === 'admin' || user.role === 'super_admin' || user.role === 'teacher')) {
    return (
      <div style={styles.container}>
        <div style={styles.authErrorMessage}>
          <FiAlertTriangle style={styles.errorIcon} />
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#333' }}>Access Denied</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#333' }}>You don't have permission to manage classes.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <main style={styles.main}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Manage Classes</h1>
            <p style={styles.subtitle}>
              {user.role === 'teacher' 
                ? 'View and manage your assigned classes' 
                : 'Create, edit, and manage all classes'}
            </p>
          </div>
          
          <div style={styles.headerActions}>
            {(user.role === 'admin' || user.role === 'super_admin') && (
              <button
                style={styles.createButton}
                onClick={() => {
                  setShowCreateModal(true);
                  fetchAvailableStreams('JSS1');
                }}
              >
                <FiPlus /> Create New Class
              </button>
            )}
            <button
              style={styles.statButton}
              onClick={() => setShowStreamStats(!showStreamStats)}
            >
              <FiGrid /> Stream Stats
            </button>
            <button
              style={styles.refreshButton}
              onClick={fetchClasses}
              disabled={loading}
            >
              <FiRefreshCw /> Refresh
            </button>
          </div>
        </div>

        {/* Stream Statistics Panel */}
        {showStreamStats && Object.keys(streamStatistics).length > 0 && (
          <div style={styles.statsPanel}>
            <div style={styles.statsHeader}>
              <h3 style={styles.statsTitle}>
                <FiGrid /> Stream Statistics
              </h3>
              <button
                style={styles.closeStatsButton}
                onClick={() => setShowStreamStats(false)}
              >
                <FiX />
              </button>
            </div>
            <div style={styles.statsGrid}>
              {Object.entries(streamStatistics).map(([stream, data]) => (
                <div key={stream} style={{
                  ...styles.statCard,
                  borderLeft: `4px solid ${getStreamColor(stream)}`
                }}>
                  <div style={styles.statHeader}>
                    <span style={styles.statStream} className="stream-badge">
                      {stream}
                    </span>
                    <span style={styles.statCount}>{data.count} classes</span>
                  </div>
                  <div style={styles.statDetails}>
                    <div style={styles.statRow}>
                      <span style={styles.statLabel}>Levels:</span>
                      <span style={styles.statValue}>
                        {data.levels.slice(0, 3).join(', ')}
                        {data.levels.length > 3 && '...'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div style={styles.errorMessage}>
            <FiAlertTriangle style={{ color: '#B22222', fontSize: '16px' }} /> 
            <span style={{ flex: 1, color: '#B22222', fontSize: '14px' }}>{error}</span>
            <button onClick={() => setError(null)} style={styles.closeMessageButton}>
              <FiX />
            </button>
          </div>
        )}
        {success && (
          <div style={styles.successMessage}>
            <FiCheckCircle style={{ color: '#228B22', fontSize: '16px' }} /> 
            <span style={{ flex: 1, color: '#228B22', fontSize: '14px' }}>{success}</span>
            <button onClick={() => setSuccess(null)} style={styles.closeMessageButton}>
              <FiX />
            </button>
          </div>
        )}

        {/* Filters */}
        <div style={styles.filtersContainer}>
          <div style={styles.searchBox}>
            <FiSearch style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search classes by name, level, stream, or teacher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          
          <div style={styles.filterGroup}>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Levels</option>
              {levels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          
          <div style={styles.filterGroup}>
            <select
              value={filterStream}
              onChange={(e) => setFilterStream(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Streams</option>
              {uniqueStreams.map(stream => (
                <option key={stream} value={stream}>{stream}</option>
              ))}
            </select>
          </div>
          
          <div style={styles.filterGroup}>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          <button
            onClick={fetchClasses}
            style={styles.refreshButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> Loading...
              </>
            ) : (
              <>
                <FiRefreshCw /> Refresh
              </>
            )}
          </button>
        </div>

        {/* Classes Summary */}
        <div style={styles.summaryBar}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Total Classes:</span>
            <span style={styles.summaryValue}>{filteredClasses.length}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Active:</span>
            <span style={styles.summaryValue}>
              {filteredClasses.filter(c => c.isActive).length}
            </span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Unique Streams:</span>
            <span style={styles.summaryValue}>
              {uniqueStreams.length}
            </span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>JSS Classes:</span>
            <span style={styles.summaryValue}>
              {filteredClasses.filter(c => c.level && c.level.startsWith('JSS')).length}
            </span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>SSS Classes:</span>
            <span style={styles.summaryValue}>
              {filteredClasses.filter(c => c.level && c.level.startsWith('SSS')).length}
            </span>
          </div>
        </div>

        {/* Classes Grid */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner}></div>
            <p style={{ color: '#333', fontSize: '14px' }}>Loading classes...</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div style={styles.emptyState}>
            <FiBookOpen style={styles.emptyIcon} />
            <h3 style={{ color: '#333', fontSize: '18px' }}>No Classes Found</h3>
            <p style={{ color: '#666', fontSize: '14px' }}>
              {classes.length === 0 ? 'No classes have been created yet.' : 'No classes match your search criteria.'}
            </p>
            {(user.role === 'admin' || user.role === 'super_admin') && (
              <button
                style={styles.createButton}
                onClick={() => {
                  setShowCreateModal(true);
                  fetchAvailableStreams('JSS1');
                }}
              >
                Create Your First Class
              </button>
            )}
          </div>
        ) : (
          <div style={styles.classesGrid}>
            {filteredClasses.map(cls => {
              const classId = cls.id;
              const className = cls.displayName || cls.name || 'Unnamed Class';
              const streamColor = getStreamColor(cls.stream);
              
              return (
                <div key={classId} style={styles.classCard}>
                  {/* Class Header */}
                  <div style={styles.classHeader} onClick={() => setExpandedClass(expandedClass === classId ? null : classId)}>
                    <div style={styles.classInfo}>
                      <div style={styles.classTitleRow}>
                        <h3 style={styles.className}>{className}</h3>
                        {cls.stream && (
                          <span style={{
                            ...styles.streamBadge,
                            backgroundColor: streamColor,
                            color: cls.stream === 'SILVER' || cls.stream === 'PEARL' ? '#333' : 'white'
                          }}>
                            {cls.stream}
                          </span>
                        )}
                      </div>
                      <div style={styles.classMeta}>
                        <span style={styles.classShortName}>{cls.shortName || cls.level}</span>
                        <span style={styles.classStat}>
                          <FiUser style={{ color: '#4B5320', fontSize: '14px' }} /> 
                          <span style={{ color: '#333', fontSize: '13px' }}>{cls.classTeacherName || 'Not Assigned'}</span>
                        </span>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: cls.isActive ? '#E6FFE6' : '#FFF3CD',
                          color: cls.isActive ? '#228B22' : '#D4A017'
                        }}>
                          {cls.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <button
                      style={styles.expandButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedClass(expandedClass === classId ? null : classId);
                      }}
                    >
                      {expandedClass === classId ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                  </div>

                  {/* Class Details (Expanded) */}
                  {expandedClass === classId && (
                    <div style={styles.classDetails}>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Full Name:</span>
                        <span style={styles.detailValue}>{className}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Level:</span>
                        <span style={styles.detailValue}>{cls.level}</span>
                      </div>
                      {cls.stream && (
                        <div style={styles.detailRow}>
                          <span style={styles.detailLabel}>Stream:</span>
                          <span style={styles.detailValue}>{cls.stream}</span>
                        </div>
                      )}
                      {/* UPDATED SECTION DISPLAY */}
                      {cls.section && cls.section.trim() !== '' ? (
                        <div style={styles.detailRow}>
                          <span style={styles.detailLabel}>Section:</span>
                          <span style={styles.detailValue}>{cls.section}</span>
                        </div>
                      ) : (
                        <div style={styles.detailRow}>
                          <span style={styles.detailLabel}>Section:</span>
                          <span style={styles.detailValue}>No Section</span>
                        </div>
                      )}
                      
                      {/* Class Teacher */}
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Class Teacher:</span>
                        <div style={styles.teacherInfo}>
                          <span style={styles.detailValue}>{cls.classTeacherName || 'Not Assigned'}</span>
                          {(user.role === 'admin' || user.role === 'super_admin') && (
                            <div style={styles.teacherActions}>
                              <button
                                style={{...styles.smallButton, ...styles.assignTeacherButton}}
                                onClick={async () => {
                                  await fetchAvailableTeachers();
                                  setShowAssignTeacherModal({
                                    classId: classId,
                                    isClassTeacher: true,
                                    currentTeacher: cls.classTeacher?.id || cls.classTeacher?._id
                                  });
                                }}
                              >
                                <FiUserPlus /> {cls.classTeacher ? 'Change' : 'Assign'}
                              </button>
                              {cls.classTeacher && (
                                <button
                                  style={{...styles.smallButton, ...styles.removeTeacherButton}}
                                  onClick={() => handleAssignClassTeacher(classId, null)}
                                >
                                  <FiUserMinus /> Remove
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Capacity:</span>
                        <span style={styles.detailValue}>{cls.capacity || 40} students</span>
                      </div>
                      
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Created:</span>
                        <span style={styles.detailValue}>
                          {cls.createdAt ? new Date(cls.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div style={styles.classActions}>
                        <button
                          style={{...styles.actionButton, ...styles.viewButton}}
                          onClick={() => fetchClassDetails(classId)}
                          disabled={loadingDetails}
                        >
                          <FiEye /> {loadingDetails ? 'Loading...' : 'Details'}
                        </button>
                        
                        <button
                          style={{...styles.actionButton, ...styles.viewStudentsButton}}
                          onClick={() => fetchClassStudents(classId)}
                          disabled={loadingStudents}
                        >
                          <FiUsers /> Students
                        </button>
                        
                        <button
                          style={{...styles.actionButton, ...styles.manageSubjectsButton}}
                          onClick={() => fetchSubjectTeachers(classId)}
                          disabled={loadingSubjectTeachers}
                        >
                          <FiTeachers /> Subjects
                        </button>
                        
                        {(user.role === 'admin' || user.role === 'super_admin') && (
                          <>
                            <button
                              style={{...styles.actionButton, ...styles.addSubjectsButton}}
                              onClick={() => openAddSubjectsModal(classId, className)}
                            >
                              <FiBookmark /> Add Subjects
                            </button>
                            
                            <button
                              style={{...styles.actionButton, ...styles.editButton}}
                              onClick={() => navigate(`/admin/classes/${classId}/edit`)}
                            >
                              <FiEdit /> Edit
                            </button>

                            <button
                              style={{...styles.actionButton, ...styles.deleteButton}}
                              onClick={() => setShowDeleteModal({ 
                                id: classId, 
                                name: className
                              })}
                            >
                              <FiTrash2 /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Class Details Modal */}
        {showDetailsModal && classDetails && (
          <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '900px'}}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>Class Details</h2>
                  <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                    {classDetails.name} - Complete Information
                  </p>
                </div>
                <button 
                  style={styles.closeModalButton}
                  onClick={() => {
                    setShowDetailsModal(false);
                    setClassDetails(null);
                  }}
                >
                  <FiX />
                </button>
              </div>
              
              {loadingDetails ? (
                <div style={styles.loadingContainer}>
                  <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: '28px', color: '#4B5320' }} />
                  <p style={{ color: '#333', fontSize: '14px' }}>Loading class details...</p>
                </div>
              ) : (
                <>
                  <div style={styles.statsBar}>
                    {classDetails.stream && (
                      <span style={styles.statItem}>
                        <FiHash style={{ color: '#4B5320' }} /> 
                        <span style={{ color: '#333', fontSize: '13px' }}>Stream: {classDetails.stream}</span>
                      </span>
                    )}
                    <span style={styles.statItem}>
                      <FiBook style={{ color: '#4B5320' }} /> 
                      <span style={{ color: '#333', fontSize: '13px' }}>Subjects: {classDetails.subjectAssignments?.length || 0}</span>
                    </span>
                    <span style={styles.statItem}>
                      <FiClock style={{ color: '#4B5320' }} /> 
                      <span style={{ color: '#333', fontSize: '13px' }}>Created: {classDetails.createdAt || 'N/A'}</span>
                    </span>
                  </div>
                  
                  {/* Class Information Section */}
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Class Information</h3>
                    <div style={styles.infoGrid}>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Class Name:</span>
                        <span style={styles.infoValue}>{classDetails.name}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Short Name:</span>
                        <span style={styles.infoValue}>{classDetails.shortName || 'N/A'}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Level:</span>
                        <span style={styles.infoValue}>{classDetails.level}</span>
                      </div>
                      {classDetails.stream && (
                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>Stream:</span>
                          <span style={styles.infoValue}>{classDetails.stream}</span>
                        </div>
                      )}
                      {/* UPDATED SECTION DISPLAY */}
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Section:</span>
                        <span style={styles.infoValue}>
                          {classDetails.section && classDetails.section.trim() !== '' ? classDetails.section : 'No Section'}
                        </span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Capacity:</span>
                        <span style={styles.infoValue}>{classDetails.capacity || 40}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Class Teacher:</span>
                        <span style={styles.infoValue}>{classDetails.classTeacherName || 'Not Assigned'}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Created Date:</span>
                        <span style={styles.infoValue}>{classDetails.createdAt || 'N/A'}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Status:</span>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: classDetails.isActive ? '#E6FFE6' : '#FFF3CD',
                          color: classDetails.isActive ? '#228B22' : '#D4A017',
                          fontSize: '12px',
                          padding: '3px 8px'
                        }}>
                          {classDetails.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subjects Section */}
                  {classDetails.subjectAssignments && classDetails.subjectAssignments.length > 0 && (
                    <div style={styles.section}>
                      <div style={styles.sectionHeader}>
                        <h3 style={styles.sectionTitle}>Subjects ({classDetails.subjectAssignments.length})</h3>
                        <div style={styles.sectionHeaderActions}>
                          <button
                            style={{...styles.assignButton, ...styles.addSubjectsButton}}
                            onClick={() => {
                              setShowDetailsModal(false);
                              setTimeout(() => openAddSubjectsModal(classDetails.id, classDetails.name), 300);
                            }}
                          >
                            <FiBookmark /> Add More Subjects
                          </button>
                          <button
                            style={styles.assignButton}
                            onClick={() => {
                              setShowDetailsModal(false);
                              setTimeout(() => fetchSubjectTeachers(classDetails.id), 300);
                            }}
                          >
                            <FiUserPlus /> Manage Teachers
                          </button>
                        </div>
                      </div>
                      <div style={styles.subjectsGrid}>
                        {classDetails.subjectAssignments.map((subject, index) => (
                          <div key={subject.id || index} style={styles.subjectCard}>
                            <div style={styles.subjectHeader}>
                              <h4 style={styles.subjectName}>
                                {subject.name}
                                {subject.code && (
                                  <span style={styles.subjectCode}> ({subject.code})</span>
                                )}
                              </h4>
                              <span style={{
                                ...styles.teacherStatus,
                                backgroundColor: subject.teacher ? '#E6FFE6' : '#FFF3CD',
                                color: subject.teacher ? '#228B22' : '#D4A017'
                              }}>
                                {subject.teacher ? 'Teacher Assigned' : 'No Teacher'}
                              </span>
                            </div>
                            <div style={styles.subjectDetails}>
                              <div style={styles.subjectInfo}>
                                <span style={styles.subjectInfoLabel}>Teacher:</span>
                                <span style={styles.subjectInfoValue}>{subject.teacherName}</span>
                              </div>
                              <div style={styles.subjectActions}>
                                {(user.role === 'admin' || user.role === 'super_admin') && (
                                  <>
                                    <button
                                      style={{...styles.smallButton, ...styles.changeTeacherButton}}
                                      onClick={() => openAssignTeacherModal(subject, classDetails.id)}
                                    >
                                      <FiUserPlus /> Change
                                    </button>
                                    {subject.teacher && (
                                      <button
                                        style={{...styles.smallButton, ...styles.removeTeacherButton}}
                                        onClick={() => handleRemoveTeacher(classDetails.id, subject.id, subject.name)}
                                      >
                                        <FiUserX /> Remove
                                      </button>
                                    )}
                                    <button
                                      style={{...styles.smallButton, ...styles.removeSubjectButton}}
                                      onClick={() => openRemoveSubjectModal(subject, classDetails.id, classDetails.name)}
                                    >
                                      <FiTrash2 /> Remove Subject
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Quick Actions */}
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Quick Actions</h3>
                    <div style={styles.actionButtons}>
                      <button
                        style={{...styles.actionButton, ...styles.viewStudentsButton}}
                        onClick={() => {
                          setShowDetailsModal(false);
                          setTimeout(() => fetchClassStudents(classDetails.id), 300);
                        }}
                      >
                        <FiUsers /> View Students
                      </button>
                      <button
                        style={{...styles.actionButton, ...styles.manageSubjectsButton}}
                        onClick={() => {
                          setShowDetailsModal(false);
                          setTimeout(() => fetchSubjectTeachers(classDetails.id), 300);
                        }}
                      >
                        <FiTeachers /> Manage Subject Teachers
                      </button>
                      <button
                        style={{...styles.actionButton, ...styles.addSubjectsButton}}
                        onClick={() => {
                          setShowDetailsModal(false);
                          setTimeout(() => openAddSubjectsModal(classDetails.id, classDetails.name), 300);
                        }}
                      >
                        <FiBookmark /> Add Subjects
                      </button>
                      {(user.role === 'admin' || user.role === 'super_admin') && (
                        <>
                          <button
                            style={{...styles.actionButton, ...styles.editButton}}
                            onClick={() => navigate(`/admin/classes/${classDetails.id}/edit`)}
                          >
                            <FiEdit /> Edit Class
                          </button>
                          <button
                            style={{...styles.actionButton, ...styles.deleteButton}}
                            onClick={() => {
                              setShowDetailsModal(false);
                              setTimeout(() => setShowDeleteModal({
                                id: classDetails.id,
                                name: classDetails.name
                              }), 300);
                            }}
                          >
                            <FiTrash2 /> Delete Class
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Students Modal */}
        {showStudentsModal && (
          <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '800px'}}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>
                    Students in {classDetails?.name || 'Class'}
                  </h2>
                  <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                    Total: {classStudents.length} students
                  </p>
                </div>
                <button 
                  style={styles.closeModalButton}
                  onClick={() => {
                    setShowStudentsModal(false);
                    setClassStudents([]);
                  }}
                >
                  <FiX />
                </button>
              </div>
              
              {loadingStudents ? (
                <div style={styles.loadingContainer}>
                  <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: '28px', color: '#4B5320' }} />
                  <p style={{ color: '#333', fontSize: '14px' }}>Loading students...</p>
                </div>
              ) : classStudents.length === 0 ? (
                <div style={{...styles.emptyState, padding: '30px 20px'}}>
                  <FiUsers style={{ fontSize: '40px', color: '#666', marginBottom: '16px' }} />
                  <h3 style={{ color: '#333', fontSize: '18px' }}>No Students Found</h3>
                  <p style={{ color: '#666', fontSize: '14px' }}>This class currently has no students enrolled.</p>
                </div>
              ) : (
                <>
                  <div style={styles.statsBar}>
                    <span style={styles.statItem}>
                      <FiUsers style={{ color: '#4B5320' }} /> 
                      <span style={{ color: '#333', fontSize: '13px' }}>Total: {classStudents.length}</span>
                    </span>
                  </div>
                  
                  <div style={styles.studentsTableContainer}>
                    <table style={styles.studentsTable}>
                      <thead>
                        <tr>
                          <th style={styles.tableHeader}>#</th>
                          <th style={styles.tableHeader}>Student Name</th>
                          <th style={styles.tableHeader}>Student ID</th>
                          <th style={styles.tableHeader}>Username</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents.map((student, index) => (
                          <tr key={student.id} style={styles.tableRow}>
                            <td style={styles.tableCell}>{index + 1}</td>
                            <td style={styles.tableCell}>
                              <div style={styles.studentCell}>
                                <FiUser style={{ color: '#4B5320', marginRight: '8px', fontSize: '14px' }} />
                                <span style={{ color: '#333', fontSize: '14px' }}>
                                  {student.displayName}
                                </span>
                              </div>
                            </td>
                            <td style={styles.tableCell}>
                              <span style={{ color: '#333', fontSize: '14px' }}>{student.studentId || 'N/A'}</span>
                            </td>
                            <td style={styles.tableCell}>
                              <span style={{ color: '#333', fontSize: '14px' }}>{student.username || 'N/A'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Subject Teachers Modal */}
        {showSubjectTeachersModal && (
          <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '900px'}}>
              <div style={styles.modalHeader}>
                <div>
                  <h2 style={styles.modalTitle}>
                    Subject Teachers - {classDetails?.name || 'Class'}
                  </h2>
                  <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                    View and manage subject teachers for this class
                  </p>
                </div>
                <button 
                  style={styles.closeModalButton}
                  onClick={() => {
                    setShowSubjectTeachersModal(false);
                    setClassSubjectTeachers([]);
                  }}
                >
                  <FiX />
                </button>
              </div>
              
              {loadingSubjectTeachers ? (
                <div style={styles.loadingContainer}>
                  <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: '28px', color: '#4B5320' }} />
                  <p style={{ color: '#333', fontSize: '14px' }}>Loading subject teachers...</p>
                </div>
              ) : classSubjectTeachers.length === 0 ? (
                <div style={{...styles.emptyState, padding: '30px 20px'}}>
                  <FiBriefcase style={{ fontSize: '40px', color: '#666', marginBottom: '16px' }} />
                  <h3 style={{ color: '#333', fontSize: '18px' }}>No Subjects Found</h3>
                  <p style={{ color: '#666', fontSize: '14px' }}>No subjects have been assigned to this class yet.</p>
                  <button
                    style={styles.addSubjectsButton}
                    onClick={() => {
                      setShowSubjectTeachersModal(false);
                      setTimeout(() => openAddSubjectsModal(showSubjectTeachersModal, classDetails?.name), 300);
                    }}
                  >
                    <FiBookmark /> Add Subjects
                  </button>
                </div>
              ) : (
                <>
                  <div style={styles.statsBar}>
                    <span style={styles.statItem}>
                      <FiBook style={{ color: '#4B5320' }} /> 
                      <span style={{ color: '#333', fontSize: '13px' }}>Subjects: {classSubjectTeachers.length}</span>
                    </span>
                    <span style={styles.statItem}>
                      <FiUserCheck style={{ color: '#4B5320' }} /> 
                      <span style={{ color: '#333', fontSize: '13px' }}>Teachers Assigned: {
                        classSubjectTeachers.filter(st => st.teacher).length
                      }</span>
                    </span>
                    <span style={styles.statItem}>
                      <FiUserX style={{ color: '#4B5320' }} /> 
                      <span style={{ color: '#333', fontSize: '13px' }}>Unassigned: {
                        classSubjectTeachers.filter(st => !st.teacher).length
                      }</span>
                    </span>
                  </div>
                  
                  <div style={styles.subjectTeachersContainer}>
                    {classSubjectTeachers.map((subject, index) => {
                      const subjectId = subject.id;
                      const subjectName = subject.name;
                      const teacher = subject.teacher;
                      const teacherName = subject.teacherName;
                      
                      return (
                        <div key={subjectId || index} style={styles.subjectTeacherCard}>
                          <div style={styles.subjectTeacherHeader}>
                            <div style={styles.subjectTeacherInfo}>
                              <h4 style={styles.subjectTeacherName}>
                                {subjectName}
                                {subject.code && (
                                  <span style={styles.subjectTeacherCode}> ({subject.code})</span>
                                )}
                              </h4>
                              <div style={styles.subjectTeacherMeta}>
                                <span style={styles.teacherNameBadge}>
                                  <FiUser style={{ fontSize: '11px' }} /> {teacherName}
                                </span>
                              </div>
                            </div>
                            <div style={styles.subjectTeacherActions}>
                              {(user.role === 'admin' || user.role === 'super_admin') && (
                                <>
                                  <button
                                    style={{...styles.smallButton, ...styles.assignTeacherButton}}
                                    onClick={() => openAssignTeacherModal(subject, showSubjectTeachersModal)}
                                  >
                                    <FiUserPlus /> {teacher ? 'Change Teacher' : 'Assign Teacher'}
                                  </button>
                                  {teacher && (
                                    <button
                                      style={{...styles.smallButton, ...styles.removeTeacherButton}}
                                      onClick={() => handleRemoveTeacher(
                                        showSubjectTeachersModal,
                                        subjectId,
                                        subjectName
                                      )}
                                    >
                                      <FiUserX /> Remove
                                    </button>
                                  )}
                                  <button
                                    style={{...styles.smallButton, ...styles.removeSubjectButton}}
                                    onClick={() => openRemoveSubjectModal(subject, showSubjectTeachersModal, classDetails?.name)}
                                  >
                                    <FiTrash2 /> Remove Subject
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {(user.role === 'admin' || user.role === 'super_admin') && (
                    <div style={styles.modalFooter}>
                      <div style={styles.footerActions}>
                        <button
                          style={{...styles.addSubjectsButton, marginRight: '10px'}}
                          onClick={() => {
                            setShowSubjectTeachersModal(false);
                            setTimeout(() => openAddSubjectsModal(showSubjectTeachersModal, classDetails?.name), 300);
                          }}
                        >
                          <FiBookmark /> Add More Subjects
                        </button>
                        <div style={styles.footerText}>
                          <FiInfo style={{ fontSize: '12px', marginRight: '6px', color: '#4B5320' }} />
                          Click "Assign Teacher" to assign a teacher to a subject
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Add Subjects Modal */}
        {showAddSubjectsModal && (
          <div style={styles.modalOverlay}>
            <div style={{...styles.modalContent, maxWidth: '800px'}}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  Add Subjects to {showAddSubjectsModal.className}
                </h2>
                <button 
                  style={styles.closeModalButton}
                  onClick={() => {
                    setShowAddSubjectsModal(null);
                    setSelectedSubjects([]);
                  }}
                >
                  <FiX />
                </button>
              </div>
              
              {loadingAllSubjects || loadingSubjects ? (
                <div style={styles.loadingContainer}>
                  <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: '28px', color: '#4B5320' }} />
                  <p style={{ color: '#333', fontSize: '14px' }}>Loading subjects...</p>
                </div>
              ) : (
                <>
                  <div style={styles.statsBar}>
                    <span style={styles.statItem}>
                      <FiBook style={{ color: '#4B5320' }} /> 
                      <span style={{ color: '#333', fontSize: '13px' }}>Total Subjects: {allSubjects.length}</span>
                    </span>
                    <span style={styles.statItem}>
                      <FiList style={{ color: '#4B5320' }} /> 
                      <span style={{ color: '#333', fontSize: '13px' }}>Already Assigned: {subjectAssignments.length}</span>
                    </span>
                    <span style={styles.statItem}>
                      <FiPackage style={{ color: '#4B5320' }} /> 
                      <span style={{ color: '#333', fontSize: '13px' }}>Available: {getAvailableSubjects().length}</span>
                    </span>
                  </div>
                  
                  {getAvailableSubjects().length === 0 ? (
                    <div style={{...styles.emptyState, padding: '20px'}}>
                      <FiBook style={{ fontSize: '30px', color: '#666', marginBottom: '12px' }} />
                      <h3 style={{ color: '#333', fontSize: '16px' }}>No Subjects Available</h3>
                      <p style={{ color: '#666', fontSize: '13px' }}>All subjects have already been assigned to this class.</p>
                    </div>
                  ) : (
                    <>
                      <div style={styles.formGroup}>
                        <label style={styles.formLabel}>
                          Select Subjects to Add ({selectedSubjects.length} selected)
                        </label>
                        <div style={styles.subjectsListContainer}>
                          {getAvailableSubjects().map(subject => {
                            const subjectId = subject.id || subject._id;
                            const isSelected = selectedSubjects.includes(subjectId);
                            
                            return (
                              <div 
                                key={subjectId} 
                                style={{
                                  ...styles.subjectItem,
                                  backgroundColor: isSelected ? '#E6FFE6' : 'white',
                                  borderColor: isSelected ? '#228B22' : '#E0E0E0'
                                }}
                                onClick={() => toggleSubjectSelection(subjectId)}
                              >
                                <div style={styles.subjectItemContent}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSubjectSelection(subjectId)}
                                    style={styles.checkboxInput}
                                  />
                                  <div style={styles.subjectItemInfo}>
                                    <span style={styles.subjectItemName}>
                                      {subject.name}
                                      {subject.code && (
                                        <span style={styles.subjectItemCode}> ({subject.code})</span>
                                      )}
                                    </span>
                                    <span style={styles.subjectItemDescription}>
                                      {subject.description || 'No description'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <small style={{fontSize: '11px', color: '#666', marginTop: '8px', display: 'block'}}>
                          Click on subjects to select/deselect them. Selected subjects will be added to the class.
                        </small>
                      </div>
                      
                      <div style={styles.modalActions}>
                        <button 
                          style={styles.cancelButton}
                          onClick={() => {
                            setShowAddSubjectsModal(null);
                            setSelectedSubjects([]);
                          }}
                          disabled={assignSubjectsLoading}
                        >
                          Cancel
                        </button>
                        <button
                          style={styles.submitButton}
                          onClick={handleAddSubjects}
                          disabled={assignSubjectsLoading || selectedSubjects.length === 0}
                        >
                          {assignSubjectsLoading ? (
                            <>
                              <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> Adding...
                            </>
                          ) : (
                            `Add ${selectedSubjects.length} Subject(s)`
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Remove Subject Confirmation Modal */}
        {showRemoveSubjectModal && subjectToRemove && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <h2 style={styles.modalTitle}>Remove Subject</h2>
              
              <div style={styles.warningBox}>
                <FiAlertTriangle style={styles.warningIcon} />
                <div>
                  <h4 style={styles.warningTitle}>Confirm Removal</h4>
                  <p style={styles.warningText}>
                    Are you sure you want to remove "{subjectToRemove.name || subjectToRemove.subject?.name}" 
                    from {showRemoveSubjectModal.className}?
                    
                    {subjectToRemove.teacher && (
                      <strong style={{ display: 'block', marginTop: '8px', color: '#B22222' }}>
                        Note: This will also remove the assigned teacher ({subjectToRemove.teacherName}) from this subject.
                      </strong>
                    )}
                  </p>
                </div>
              </div>
              
              <div style={styles.modalActions}>
                <button 
                  style={styles.cancelButton}
                  onClick={() => {
                    setShowRemoveSubjectModal(null);
                    setSubjectToRemove(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  style={styles.deleteButton}
                  onClick={handleRemoveSubject}
                >
                  Remove Subject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Teacher Modal */}
        {showAssignTeacherModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {showAssignTeacherModal.isClassTeacher 
                    ? 'Assign Class Teacher' 
                    : `Assign Teacher to ${showAssignTeacherModal.subjectName || 'Subject'}`}
                </h2>
                <button 
                  style={styles.closeModalButton}
                  onClick={() => {
                    setShowAssignTeacherModal(null);
                    setSelectedTeacher('');
                  }}
                >
                  <FiX />
                </button>
              </div>
              
              {loadingTeachers ? (
                <div style={styles.loadingContainer}>
                  <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: '28px', color: '#4B5320' }} />
                  <p style={{ color: '#333', fontSize: '14px' }}>Loading teachers...</p>
                </div>
              ) : availableTeachers.length === 0 ? (
                <div style={{...styles.emptyState, padding: '20px'}}>
                  <FiUsers style={{ fontSize: '30px', color: '#666', marginBottom: '12px' }} />
                  <h3 style={{ color: '#333', fontSize: '16px' }}>No Teachers Available</h3>
                  <p style={{ color: '#666', fontSize: '13px' }}>No teachers found. Please create teachers first.</p>
                </div>
              ) : (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      Select Teacher
                    </label>
                    <select
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      style={styles.formInput}
                    >
                      <option value="">-- Select a teacher --</option>
                      {availableTeachers.map(teacher => (
                        <option key={teacher.id || teacher._id} value={teacher.id || teacher._id}>
                          {teacher.name || teacher.displayName || teacher.username}
                          {teacher.email && ` - ${teacher.email}`}
                        </option>
                      ))}
                    </select>
                    
                    {selectedTeacher && (
                      <div style={styles.teacherInfoBox}>
                        <div style={styles.teacherInfoRow}>
                          <FiUser style={{ fontSize: '12px', color: '#4B5320' }} />
                          <span style={{ fontSize: '12px', color: '#333', marginLeft: '5px' }}>
                            {availableTeachers.find(t => (t.id || t._id) === selectedTeacher)?.name || ''}
                          </span>
                        </div>
                        <div style={styles.teacherInfoRow}>
                          <FiFileText style={{ fontSize: '12px', color: '#4B5320' }} />
                          <span style={{ fontSize: '12px', color: '#333', marginLeft: '5px' }}>
                            {availableTeachers.find(t => (t.id || t._id) === selectedTeacher)?.email || 'No email'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {!showAssignTeacherModal.isClassTeacher && showAssignTeacherModal.subjectName && (
                    <div style={styles.formGroup}>
                      <label style={styles.formLabel}>Subject Information</label>
                      <div style={styles.subjectInfoBox}>
                        <div style={styles.subjectInfoRow}>
                          <span style={styles.subjectInfoLabel}>Subject:</span>
                          <span style={styles.subjectInfoValue}>{showAssignTeacherModal.subjectName}</span>
                        </div>
                        <div style={styles.subjectInfoRow}>
                          <span style={styles.subjectInfoLabel}>Class:</span>
                          <span style={styles.subjectInfoValue}>{classDetails?.name || 'Unknown Class'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div style={styles.modalActions}>
                    <button 
                      style={styles.cancelButton}
                      onClick={() => {
                        setShowAssignTeacherModal(null);
                        setSelectedTeacher('');
                      }}
                      disabled={assignTeacherLoading}
                    >
                      Cancel
                    </button>
                    <button
                      style={styles.submitButton}
                      onClick={() => {
                        if (showAssignTeacherModal.isClassTeacher) {
                          handleAssignClassTeacher(
                            showAssignTeacherModal.classId,
                            selectedTeacher
                          );
                          setShowAssignTeacherModal(null);
                        } else {
                          handleAssignTeacher();
                        }
                      }}
                      disabled={assignTeacherLoading || !selectedTeacher}
                    >
                      {assignTeacherLoading ? (
                        <>
                          <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> Assigning...
                        </>
                      ) : (
                        'Assign Teacher'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <h2 style={styles.modalTitle}>Delete Class</h2>
              
              <div style={styles.warningBox}>
                <FiAlertTriangle style={styles.warningIcon} />
                <div>
                  <h4 style={styles.warningTitle}>Confirm Deletion</h4>
                  <p style={styles.warningText}>
                    Are you sure you want to delete "{showDeleteModal.name}"?
                    This action cannot be undone. All class data including subject assignments will be permanently removed.
                  </p>
                </div>
              </div>
              <div style={styles.modalActions}>
                <button 
                  style={styles.cancelButton}
                  onClick={() => setShowDeleteModal(null)}
                >
                  Cancel
                </button>
                <button 
                  style={styles.deleteButton}
                  onClick={() => handleDeleteClass(showDeleteModal.id, showDeleteModal.name)}
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Class Modal - UPDATED FOR NULL SECTIONS */}
        {showCreateModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Create New Class</h2>
                <button 
                  style={styles.closeModalButton}
                  onClick={() => setShowCreateModal(false)}
                >
                  <FiX />
                </button>
              </div>
              
              <form onSubmit={handleCreateClass}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Class Name *</label>
                  <input
                    type="text"
                    value={newClassData.name}
                    onChange={(e) => setNewClassData({...newClassData, name: e.target.value})}
                    placeholder="e.g., JSS1 SILVER"
                    required
                    style={styles.formInput}
                  />
                </div>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Short Name *</label>
                    <input
                      type="text"
                      value={newClassData.shortName}
                      onChange={(e) => setNewClassData({...newClassData, shortName: e.target.value})}
                      placeholder="e.g., J1S"
                      required
                      style={styles.formInput}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Level *</label>
                    <select
                      value={newClassData.level}
                      onChange={(e) => handleLevelChange(e.target.value)}
                      required
                      style={styles.formInput}
                    >
                      {levels.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Stream *</label>
                    <div style={styles.streamInputContainer}>
                      <input
                        type="text"
                        value={newClassData.stream}
                        onChange={(e) => setNewClassData({...newClassData, stream: e.target.value})}
                        placeholder="e.g., GOLD, SILVER, SCIENCE"
                        required
                        style={{...styles.formInput, flex: 1}}
                      />
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setNewClassData({...newClassData, stream: e.target.value});
                          }
                        }}
                        style={{...styles.formInput, width: '120px'}}
                      >
                        <option value="">Suggestions</option>
                        {availableStreams.map(stream => (
                          <option key={stream} value={stream}>{stream}</option>
                        ))}
                      </select>
                    </div>
                    <small style={{fontSize: '11px', color: '#666', marginTop: '3px', display: 'block'}}>
                      Required. Try: {availableStreams.slice(0, 3).join(', ')}...
                      {loadingStreams && ' (Loading suggestions...)'}
                    </small>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Section (Optional)</label>
                    <input
                      type="text"
                      value={newClassData.section}
                      onChange={(e) => setNewClassData({...newClassData, section: e.target.value})}
                      placeholder="Leave empty for no section, or enter A, B, C..."
                      style={styles.formInput}
                    />
                    <small style={{fontSize: '11px', color: '#666', marginTop: '3px', display: 'block'}}>
                      Leave empty if this class doesn't have sections
                    </small>
                  </div>
                </div>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Capacity</label>
                    <input
                      type="number"
                      value={newClassData.capacity}
                      onChange={(e) => setNewClassData({...newClassData, capacity: parseInt(e.target.value) || 40})}
                      min="1"
                      max="100"
                      style={styles.formInput}
                    />
                  </div>
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Class Teacher (Optional)</label>
                  <input
                    type="text"
                    value={newClassData.classTeacherId}
                    onChange={(e) => setNewClassData({...newClassData, classTeacherId: e.target.value})}
                    placeholder="Teacher ID (optional)"
                    style={styles.formInput}
                  />
                  <small style={{fontSize: '11px', color: '#666', marginTop: '3px', display: 'block'}}>
                    Leave empty to assign later
                  </small>
                </div>
                
                <div style={styles.formGroup}>
                  <div style={styles.validationNote}>
                    <FiInfo style={{ fontSize: '12px', color: '#4B5320', marginRight: '5px' }} />
                    <span style={{ fontSize: '12px', color: '#333' }}>
                      Classes are unique by level + stream + section combination. 
                      Multiple classes can have no section (null). Example: 
                      JSS1 GOLD (no section) and JSS1 SILVER (no section) can both exist.
                    </span>
                  </div>
                </div>
                
                <div style={styles.modalActions}>
                  <button 
                    type="button" 
                    style={styles.cancelButton}
                    onClick={() => setShowCreateModal(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    style={styles.submitButton}
                    disabled={loading || !newClassData.name || !newClassData.level || !newClassData.shortName || !newClassData.stream}
                  >
                    {loading ? (
                      <>
                        <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> Creating...
                      </>
                    ) : (
                      'Create Class'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F5F5F5'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '15px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  title: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#4B5320',
    margin: '0 0 5px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#333',
    margin: '0'
  },
  createButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 4px rgba(75, 83, 32, 0.2)',
    ':hover': {
      backgroundColor: '#3A4220',
      transform: 'translateY(-1px)'
    }
  },
  refreshButton: {
    backgroundColor: '#E0E0E0',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#D0D0D0'
    }
  },
  statButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#3A4220'
    }
  },
  filtersContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '25px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  searchBox: {
    position: 'relative',
    flex: '1',
    minWidth: '200px'
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#666',
    fontSize: '16px'
  },
  searchInput: {
    width: '100%',
    padding: '10px 10px 10px 35px',
    borderRadius: '6px',
    border: '1px solid #DDD',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#333',
    boxSizing: 'border-box',
    '::placeholder': {
      color: '#999',
      fontSize: '13px'
    }
  },
  filterSelect: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #DDD',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#333',
    minWidth: '140px'
  },
  summaryBar: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    flexWrap: 'wrap'
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    padding: '5px 10px',
    backgroundColor: '#F8F9FA',
    borderRadius: '5px',
    border: '1px solid #E0E0E0',
    minWidth: '150px'
  },
  summaryLabel: {
    fontSize: '11px',
    color: '#666',
    fontWeight: '500'
  },
  summaryValue: {
    fontSize: '16px',
    color: '#4B5320',
    fontWeight: '700'
  },
  statsPanel: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    overflow: 'hidden'
  },
  statsHeader: {
    padding: '12px 15px',
    backgroundColor: '#4B5320',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  closeStatsButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    ':hover': {
      backgroundColor: 'rgba(255,255,255,0.1)'
    }
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '12px',
    padding: '15px'
  },
  statCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: '6px',
    padding: '12px',
    border: '1px solid #E0E0E0'
  },
  statHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  statStream: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#333',
    textTransform: 'uppercase'
  },
  statCount: {
    fontSize: '11px',
    backgroundColor: '#E0E0E0',
    color: '#333',
    padding: '2px 8px',
    borderRadius: '10px'
  },
  statDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statLabel: {
    fontSize: '11px',
    color: '#666'
  },
  statValue: {
    fontSize: '12px',
    color: '#333',
    fontWeight: '500'
  },
  errorMessage: {
    backgroundColor: '#FFE6E6',
    color: '#B22222',
    padding: '12px 15px',
    borderRadius: '6px',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    position: 'relative'
  },
  successMessage: {
    backgroundColor: '#E6FFE6',
    color: '#228B22',
    padding: '12px 15px',
    borderRadius: '6px',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    position: 'relative'
  },
  closeMessageButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    marginLeft: 'auto',
    fontSize: '16px',
    padding: '0'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '50px 15px'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #E0E0E0',
    borderTop: '3px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '15px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '50px 15px',
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
  },
  emptyIcon: {
    fontSize: '52px',
    color: '#4B5320',
    marginBottom: '15px',
    opacity: '0.5'
  },
  classesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '15px'
  },
  classCard: {
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    ':hover': {
      boxShadow: '0 3px 10px rgba(0,0,0,0.15)',
      transform: 'translateY(-1px)'
    }
  },
  classHeader: {
    padding: '15px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderBottom: '1px solid #E0E0E0'
  },
  classInfo: {
    flex: '1'
  },
  classTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
    flexWrap: 'wrap'
  },
  className: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0'
  },
  streamBadge: {
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  classMeta: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  classShortName: {
    backgroundColor: '#4B5320',
    color: 'white',
    padding: '3px 10px',
    borderRadius: '15px',
    fontSize: '12px',
    fontWeight: '600'
  },
  classStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#333'
  },
  statusBadge: {
    padding: '3px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600'
  },
  expandButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    color: '#4B5320',
    padding: '4px',
    borderRadius: '4px',
    ':hover': {
      backgroundColor: '#F0F0F0'
    }
  },
  classDetails: {
    padding: '15px',
    backgroundColor: 'white'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    paddingBottom: '10px',
    borderBottom: '1px solid #F0F0F0'
  },
  detailLabel: {
    fontWeight: '600',
    color: '#333',
    fontSize: '13px'
  },
  detailValue: {
    color: '#333',
    fontSize: '13px',
    fontWeight: '500'
  },
  teacherInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  teacherActions: {
    display: 'flex',
    gap: '4px'
  },
  smallButton: {
    padding: '3px 6px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    transition: 'all 0.3s ease'
  },
  assignTeacherButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    ':hover': {
      backgroundColor: '#3A4220'
    }
  },
  removeTeacherButton: {
    backgroundColor: '#B22222',
    color: 'white',
    ':hover': {
      backgroundColor: '#9A1F1F'
    }
  },
  removeSubjectButton: {
    backgroundColor: '#D4A017',
    color: 'white',
    ':hover': {
      backgroundColor: '#B38C14'
    }
  },
  classActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '15px'
  },
  actionButton: {
    flex: '1',
    minWidth: '100px',
    padding: '6px 10px',
    border: 'none',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    transition: 'all 0.3s ease'
  },
  viewButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    ':hover': {
      backgroundColor: '#3A4220'
    }
  },
  viewStudentsButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    ':hover': {
      backgroundColor: '#3A4220'
    }
  },
  manageSubjectsButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    ':hover': {
      backgroundColor: '#3A4220'
    }
  },
  addSubjectsButton: {
    backgroundColor: '#228B22',
    color: 'white',
    ':hover': {
      backgroundColor: '#1C7A1C'
    }
  },
  editButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    ':hover': {
      backgroundColor: '#3A4220'
    }
  },
  deleteButton: {
    backgroundColor: '#B22222',
    color: 'white',
    ':hover': {
      backgroundColor: '#9A1F1F'
    }
  },
  modalOverlay: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '1000',
    padding: '15px'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '25px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#4B5320',
    margin: '0'
  },
  closeModalButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#666',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    ':hover': {
      backgroundColor: '#F0F0F0'
    }
  },
  statsBar: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: '#F8F9FA',
    borderRadius: '6px',
    border: '1px solid #E0E0E0',
    flexWrap: 'wrap'
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: '600'
  },
  studentsTableContainer: {
    overflowX: 'auto',
    marginBottom: '15px',
    borderRadius: '6px',
    border: '1px solid #E0E0E0'
  },
  studentsTable: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    backgroundColor: '#4B5320',
    color: 'white',
    padding: '10px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '13px',
    position: 'sticky',
    top: '0',
    borderBottom: '1px solid #E0E0E0'
  },
  tableRow: {
    borderBottom: '1px solid #E0E0E0',
    ':hover': {
      backgroundColor: '#F8F9FA'
    }
  },
  tableCell: {
    padding: '10px',
    fontSize: '13px',
    color: '#333'
  },
  studentCell: {
    display: 'flex',
    alignItems: 'center'
  },
  subjectTeachersContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '15px',
    maxHeight: '400px',
    overflowY: 'auto',
    padding: '5px'
  },
  subjectTeacherCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #E0E0E0',
    overflow: 'hidden',
    transition: 'all 0.3s ease'
  },
  subjectTeacherHeader: {
    padding: '12px 15px',
    backgroundColor: '#F8F9FA',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #E0E0E0'
  },
  subjectTeacherInfo: {
    flex: '1'
  },
  subjectTeacherName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 6px 0'
  },
  subjectTeacherCode: {
    fontSize: '12px',
    color: '#666',
    fontWeight: 'normal'
  },
  subjectTeacherMeta: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  teacherNameBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 8px',
    backgroundColor: '#E6F4FF',
    color: '#0066CC',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '500'
  },
  subjectTeacherActions: {
    display: 'flex',
    gap: '8px'
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '15px',
    paddingTop: '15px',
    borderTop: '1px solid #E0E0E0'
  },
  footerActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%'
  },
  footerText: {
    fontSize: '13px',
    color: '#333',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center'
  },
  formGroup: {
    marginBottom: '15px'
  },
  formLabel: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '600',
    color: '#333',
    fontSize: '13px'
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #DDD',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#333',
    boxSizing: 'border-box',
    '::placeholder': {
      color: '#999',
      fontSize: '13px'
    }
  },
  streamInputContainer: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px'
  },
  cancelButton: {
    flex: '1',
    backgroundColor: '#E0E0E0',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    padding: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#D0D0D0'
    }
  },
  submitButton: {
    flex: '1',
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#3A4220'
    },
    ':disabled': {
      backgroundColor: '#CCCCCC',
      cursor: 'not-allowed'
    }
  },
  deleteButton: {
    flex: '1',
    backgroundColor: '#B22222',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#9A1F1F'
    }
  },
  warningBox: {
    backgroundColor: '#FFE6E6',
    border: '1px solid #B22222',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px'
  },
  warningIcon: {
    color: '#B22222',
    fontSize: '20px',
    marginTop: '2px'
  },
  warningTitle: {
    color: '#B22222',
    margin: '0 0 6px 0',
    fontSize: '14px',
    fontWeight: '600'
  },
  warningText: {
    color: '#333',
    margin: '0',
    fontSize: '13px',
    lineHeight: '1.4'
  },
  authErrorMessage: {
    backgroundColor: '#FFF3CD',
    color: '#333',
    padding: '15px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '400px',
    border: '1px solid #D4A017'
  },
  errorIcon: {
    fontSize: '20px',
    color: '#D4A017'
  },
  teacherInfoBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: '6px',
    padding: '10px',
    marginTop: '10px',
    border: '1px solid #E0E0E0'
  },
  teacherInfoRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '5px',
    ':last-child': {
      marginBottom: '0'
    }
  },
  subjectInfoBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: '6px',
    padding: '10px',
    border: '1px solid #E0E0E0'
  },
  subjectInfoRow: {
    display: 'flex',
    marginBottom: '5px',
    ':last-child': {
      marginBottom: '0'
    }
  },
  subjectInfoLabel: {
    fontWeight: '600',
    color: '#333',
    fontSize: '12px',
    width: '80px'
  },
  subjectInfoValue: {
    color: '#333',
    fontSize: '12px',
    flex: '1'
  },
  validationNote: {
    backgroundColor: '#F0F8FF',
    border: '1px solid #B0C4DE',
    borderRadius: '6px',
    padding: '8px',
    display: 'flex',
    alignItems: 'flex-start',
    fontSize: '12px'
  },
  // New styles for class details modal
  section: {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: '#F8F9FA',
    borderRadius: '6px',
    border: '1px solid #E0E0E0'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  sectionHeaderActions: {
    display: 'flex',
    gap: '8px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px'
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px'
  },
  infoLabel: {
    fontSize: '12px',
    color: '#666',
    fontWeight: '500'
  },
  infoValue: {
    fontSize: '13px',
    color: '#333',
    fontWeight: '600'
  },
  assignButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#3A4220'
    }
  },
  subjectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '12px'
  },
  subjectCard: {
    backgroundColor: 'white',
    borderRadius: '6px',
    padding: '12px',
    border: '1px solid #E0E0E0',
    transition: 'all 0.3s ease',
    ':hover': {
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }
  },
  subjectHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px'
  },
  subjectName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    margin: '0'
  },
  subjectCode: {
    fontSize: '12px',
    color: '#666',
    fontWeight: 'normal'
  },
  teacherStatus: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600'
  },
  subjectDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  subjectInfo: {
    flex: '1'
  },
  subjectInfoLabel: {
    fontSize: '11px',
    color: '#666',
    display: 'block'
  },
  subjectInfoValue: {
    fontSize: '12px',
    color: '#333',
    fontWeight: '600'
  },
  subjectActions: {
    display: 'flex',
    gap: '5px'
  },
  changeTeacherButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    padding: '3px 8px',
    fontSize: '11px',
    ':hover': {
      backgroundColor: '#3A4220'
    }
  },
  actionButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px'
  },
  // Styles for add subjects modal
  subjectsListContainer: {
    maxHeight: '300px',
    overflowY: 'auto',
    border: '1px solid #E0E0E0',
    borderRadius: '6px',
    padding: '5px'
  },
  subjectItem: {
    padding: '10px',
    marginBottom: '5px',
    border: '1px solid #E0E0E0',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#F8F9FA'
    },
    ':lastChild': {
      marginBottom: '0'
    }
  },
  subjectItemContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  checkboxInput: {
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  subjectItemInfo: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  subjectItemName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333'
  },
  subjectItemCode: {
    fontSize: '12px',
    color: '#666',
    fontWeight: 'normal'
  },
  subjectItemDescription: {
    fontSize: '12px',
    color: '#666'
  }
};

// Add CSS for spin animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .stream-badge {
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }
`;
document.head.appendChild(style);

export default ManageClasses;