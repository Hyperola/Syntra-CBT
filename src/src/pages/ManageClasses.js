// pages/ManageClasses.js - COMPLETE UPDATED VERSION WITH ALL FIXES
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
  FiCalendar,
  FiLoader,
  FiLink,
  FiInfo,
  FiList,
  FiUserCheck,
  FiUserX,
  FiUserMinus,
  FiAward,
  FiChevronRight,
  FiUsers as FiTeachers,
  FiBriefcase,
  FiStar,
  FiDownload,
  FiSliders,
  FiBookmark,
  FiMail,
  FiClock,
  FiCheckSquare,
  FiXCircle
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
  const [expandedClass, setExpandedClass] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(null);
  const [showStudentsModal, setShowStudentsModal] = useState(null);
  const [showSubjectTeachersModal, setShowSubjectTeachersModal] = useState(null);
  const [showAssignTeacherModal, setShowAssignTeacherModal] = useState(null);
  
  // Class details states
  const [classDetails, setClassDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [classStudents, setClassStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [classSubjectTeachers, setClassSubjectTeachers] = useState([]);
  const [loadingSubjectTeachers, setLoadingSubjectTeachers] = useState(false);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  
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

  // Fetch all classes with student counts
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
      
      // Format classes with proper data including student counts
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
        
        // Get student count - FIXED: Using correct endpoint
        let studentCount = 0;
        try {
          const studentRes = await axios.get(`http://localhost:5000/api/classes/${classId}/students/count`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          
          if (studentRes.data && typeof studentRes.data.count === 'number') {
            studentCount = studentRes.data.count;
          } else if (studentRes.data && typeof studentRes.data === 'number') {
            studentCount = studentRes.data;
          } else if (studentRes.data && studentRes.data.total) {
            studentCount = studentRes.data.total;
          }
        } catch (err) {
          console.error('Error fetching student count:', err);
          // Try alternative endpoint
          try {
            const altRes = await axios.get(`http://localhost:5000/api/classes/${classId}/students`, {
              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            if (altRes.data && Array.isArray(altRes.data)) {
              studentCount = altRes.data.length;
            } else if (altRes.data && Array.isArray(altRes.data.students)) {
              studentCount = altRes.data.students.length;
            }
          } catch (altErr) {
            console.error('Alternative student count failed:', altErr);
          }
        }
        
        return {
          ...cls,
          id: classId,
          studentCount: studentCount,
          classTeacher: classTeacher,
          classTeacherName: classTeacherName,
          isActive: cls.isActive !== false
        };
      }));
      
      setClasses(formattedClasses);
    } catch (err) {
      console.error('Fetch classes error:', err);
      setError(err.response?.data?.message || 'Failed to load classes');
    }
    setLoading(false);
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
        const subjectsRes = await axios.get(`http://localhost:5000/api/classes/${classId}/subjects`, {
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
      
      // Get student count
      let studentCount = 0;
      try {
        const countRes = await axios.get(`http://localhost:5000/api/classes/${classId}/students/count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (countRes.data && typeof countRes.data.count === 'number') {
          studentCount = countRes.data.count;
        } else if (countRes.data && typeof countRes.data === 'number') {
          studentCount = countRes.data;
        }
      } catch (err) {
        console.error('Error fetching student count:', err);
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
        studentCount: studentCount,
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
        const subjectsRes = await axios.get(`http://localhost:5000/api/classes/${classId}/subjects`, {
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
      
      const response = await axios.post('http://localhost:5000/api/users/subject-teachers/assign', {
        teacherId: selectedTeacher,
        classId: classId,
        subjectIds: [subjectId]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
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
      setError(err.response?.data?.message || 'Failed to assign teacher');
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

      // Remove teacher assignment
      const response = await axios.delete(`http://localhost:5000/api/users/teachers/${teacherId}/remove-assignment`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          classId: classId,
          subjectId: subjectId
        }
      });

      if (response.data.success) {
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
      setError(err.response?.data?.message || 'Failed to remove teacher');
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

  // Create new class
  const handleCreateClass = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/classes', newClassData, {
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
      setError(err.response?.data?.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  // Filter classes based on search and level
  const filteredClasses = classes.filter(cls => {
    if (!cls) return false;
    
    const className = cls.name || '';
    const classLevel = cls.level || '';
    const classTeacher = cls.classTeacherName || '';
    const shortName = cls.shortName || '';
    
    const matchesSearch = className.toLowerCase().includes(search.toLowerCase()) ||
                         classLevel.toLowerCase().includes(search.toLowerCase()) ||
                         classTeacher.toLowerCase().includes(search.toLowerCase()) ||
                         shortName.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = filterLevel === 'all' || cls.level === filterLevel;
    
    return matchesSearch && matchesLevel;
  });

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
                onClick={() => setShowCreateModal(true)}
              >
                <FiPlus /> Create New Class
              </button>
            )}
            <button
              style={styles.refreshButton}
              onClick={fetchClasses}
              disabled={loading}
            >
              <FiRefreshCw /> Refresh
            </button>
          </div>
        </div>

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
              placeholder="Search classes by name, level, or teacher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          
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
                onClick={() => setShowCreateModal(true)}
              >
                Create Your First Class
              </button>
            )}
          </div>
        ) : (
          <div style={styles.classesGrid}>
            {filteredClasses.map(cls => {
              const classId = cls.id;
              const className = cls.name || 'Unnamed Class';
              const fullName = cls.fullName || `${cls.level || ''}${cls.stream ? ` ${cls.stream}` : ''}${cls.section ? ` (${cls.section})` : ''}`;
              const studentCount = cls.studentCount || 0;
              const capacity = cls.capacity || 40;
              const utilization = capacity > 0 ? Math.round((studentCount / capacity) * 100) : 0;
              const utilizationColor = utilization >= 90 ? '#B22222' : utilization >= 75 ? '#D4A017' : '#228B22';
              
              return (
                <div key={classId} style={styles.classCard}>
                  {/* Class Header */}
                  <div style={styles.classHeader} onClick={() => setExpandedClass(expandedClass === classId ? null : classId)}>
                    <div style={styles.classInfo}>
                      <h3 style={styles.className}>{fullName}</h3>
                      <div style={styles.classMeta}>
                        <span style={styles.classShortName}>{cls.shortName || cls.level}</span>
                        <span style={styles.classStat}>
                          <FiUsers style={{ color: '#4B5320', fontSize: '14px' }} /> 
                          <span style={{ color: '#333', fontSize: '13px' }}>{studentCount}/{capacity}</span>
                        </span>
                        <span style={styles.classStat}>
                          <FiUser style={{ color: '#4B5320', fontSize: '14px' }} /> 
                          <span style={{ color: '#333', fontSize: '13px' }}>{cls.classTeacherName || 'Not Assigned'}</span>
                        </span>
                        <span style={{
                          ...styles.utilizationBadge,
                          backgroundColor: utilizationColor,
                          color: 'white'
                        }}>
                          {utilization}% full
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
                        <span style={styles.detailLabel}>Class Name:</span>
                        <span style={styles.detailValue}>{className}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Level:</span>
                        <span style={styles.detailValue}>{cls.level}</span>
                      </div>
                      
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
                        <span style={styles.detailLabel}>Status:</span>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: cls.isActive ? '#E6FFE6' : '#FFF3CD',
                          color: cls.isActive ? '#228B22' : '#D4A017'
                        }}>
                          {cls.isActive ? 'Active' : 'Inactive'}
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
                          <FiTeachers /> Subject Teachers
                        </button>
                        
                        {(user.role === 'admin' || user.role === 'super_admin') && (
                          <>
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
                    <span style={styles.statItem}>
                      <FiUsers style={{ color: '#4B5320' }} /> 
                      <span style={{ color: '#333', fontSize: '13px' }}>Students: {classDetails.studentCount || 0}</span>
                    </span>
                    <span style={styles.statItem}>
                      <FiBook style={{ color: '#4B5320' }} /> 
                      <span style={{ color: '#333', fontSize: '13px' }}>Subjects: {classDetails.subjectAssignments?.length || 0}</span>
                    </span>
                    <span style={styles.statItem}>
                      <FiClock style={{ color: '#4B5320' }} /> 
                      <span style={{ color: '#333', fontSize: '13px' }}>Created: {classDetails.createdAt}</span>
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
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Stream:</span>
                        <span style={styles.infoValue}>{classDetails.stream || 'N/A'}</span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Section:</span>
                        <span style={styles.infoValue}>{classDetails.section || 'N/A'}</span>
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
                              {subject.teacher && (
                                <div style={styles.subjectActions}>
                                  <button
                                    style={{...styles.smallButton, ...styles.changeTeacherButton}}
                                    onClick={() => openAssignTeacherModal(subject, classDetails.id)}
                                  >
                                    <FiUserPlus /> Change
                                  </button>
                                  <button
                                    style={{...styles.smallButton, ...styles.removeTeacherButton}}
                                    onClick={() => handleRemoveTeacher(classDetails.id, subject.id, subject.name)}
                                  >
                                    <FiUserX /> Remove
                                  </button>
                                </div>
                              )}
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
                </div>
              ) : (
                <>
                  <div style={styles.statsBar}>
                    <span style={styles.statItem}>
                      <FiBook style={{ color: '#4B5320' }} /> 
                      <span style={{ color: '#333', fontSize: '13px' }}>Subjects: {classSubjectTeachers.length}</span>
                    </span>
                    <span style={styles.statItem}>
                      <FiCheckSquare style={{ color: '#4B5320' }} /> 
                      <span style={{ color: '#333', fontSize: '13px' }}>Teachers Assigned: {
                        classSubjectTeachers.filter(st => st.teacher).length
                      }</span>
                    </span>
                    <span style={styles.statItem}>
                      <FiXCircle style={{ color: '#4B5320' }} /> 
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
                      <div style={styles.footerText}>
                        <FiInfo style={{ fontSize: '12px', marginRight: '6px', color: '#4B5320' }} />
                        Click "Assign Teacher" to assign a teacher to a subject
                      </div>
                    </div>
                  )}
                </>
              )}
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
                          <FiMail style={{ fontSize: '12px', color: '#4B5320' }} />
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
                    This action cannot be undone. All class data including student enrollments and subject assignments will be permanently removed.
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

        {/* Create Class Modal */}
        {showCreateModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <h2 style={styles.modalTitle}>Create New Class</h2>
              
              <form onSubmit={handleCreateClass}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Class Name *</label>
                  <input
                    type="text"
                    value={newClassData.name}
                    onChange={(e) => setNewClassData({...newClassData, name: e.target.value})}
                    placeholder="e.g., JSS1 A"
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
                      placeholder="e.g., J1A"
                      required
                      style={styles.formInput}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Level *</label>
                    <select
                      value={newClassData.level}
                      onChange={(e) => setNewClassData({...newClassData, level: e.target.value})}
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
                    <label style={styles.formLabel}>Stream (Optional)</label>
                    <input
                      type="text"
                      value={newClassData.stream}
                      onChange={(e) => setNewClassData({...newClassData, stream: e.target.value})}
                      placeholder="e.g., SCIENCE, ARTS"
                      style={styles.formInput}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Section (Optional)</label>
                    <input
                      type="text"
                      value={newClassData.section}
                      onChange={(e) => setNewClassData({...newClassData, section: e.target.value})}
                      placeholder="e.g., A, B, C"
                      style={styles.formInput}
                    />
                  </div>
                </div>
                
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
                    disabled={loading || !newClassData.name || !newClassData.level || !newClassData.shortName}
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
  filtersContainer: {
    display: 'flex',
    gap: '12px',
    marginBottom: '25px',
    flexWrap: 'wrap',
    alignItems: 'center'
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
  className: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 6px 0'
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
  utilizationBadge: {
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
  statusBadge: {
    padding: '3px 10px',
    borderRadius: '15px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase'
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
    border: '1px solid #E0E0E0'
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
  }
};

// Add CSS for spin animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default ManageClasses;