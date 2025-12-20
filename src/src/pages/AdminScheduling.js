import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import {
  FiSave, FiX, FiAlertTriangle, FiCheckCircle, FiUsers,
  FiCalendar, FiFileText, FiClock, FiInfo, FiBook,
  FiBookOpen, FiRefreshCw, FiSearch, FiPlus, FiTrash2, FiEye,
  FiChevronRight, FiChevronLeft, FiGrid, FiList,
  FiUserPlus, FiExternalLink, FiDownload, FiShare2, FiEdit,
  FiShuffle
} from 'react-icons/fi';
import {
  FaUserGraduate, FaChalkboardTeacher, FaRegCalendarAlt,
  FaClipboardList, FaRegClock, FaExclamationCircle
} from 'react-icons/fa';

const AdminScheduling = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { testId: urlTestId } = useParams();
  
  // State
  const [tests, setTests] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedTestId, setSelectedTestId] = useState(urlTestId || null);
  const [batches, setBatches] = useState([{ 
    name: 'Batch A', 
    students: [], 
    schedule: { 
      start: '', 
      end: '',
      duration: 60
    } 
  }]);
  const [selectedTestDetails, setSelectedTestDetails] = useState(null);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [refreshingStudents, setRefreshingStudents] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'grid' or 'list'
  const [showBatchDetails, setShowBatchDetails] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Helper function to normalize class IDs for comparison
  const normalizeClassId = (classData) => {
    if (!classData) return null;
    
    // If it's already a string, return it
    if (typeof classData === 'string') return classData;
    
    // If it's an object with _id
    if (classData._id) return classData._id.toString();
    
    // If it's an object with id
    if (classData.id) return classData.id.toString();
    
    // Try to convert to string
    try {
      return classData.toString();
    } catch (err) {
      console.error('Error normalizing class ID:', classData, err);
      return null;
    }
  };

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchData();
  }, [user, navigate, urlTestId]);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login again.');
      navigate('/login');
      return;
    }
    
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      setError('Access restricted to admins and super admins.');
      setLoading(false);
      return;
    }
    
    try {
      console.log('🔍 Fetching data for scheduling...');
      
      // Try to get students with proper enrollment data
      let studentsRes;
      let studentsData = [];
      
      try {
        // First try to get all students with their class data
        studentsRes = await axios.get('http://localhost:5000/api/users?role=student', { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        console.log('✅ Used /api/users?role=student endpoint');
        
        if (studentsRes.data.success && studentsRes.data.users) {
          studentsData = studentsRes.data.users;
        } else if (Array.isArray(studentsRes.data)) {
          studentsData = studentsRes.data;
        } else if (studentsRes.data.students) {
          studentsData = studentsRes.data.students;
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        throw error;
      }
      
      // Fetch tests and classes in parallel
      const [testsRes, classesRes] = await Promise.all([
        axios.get('http://localhost:5000/api/tests?status=approved', { 
          headers: { Authorization: `Bearer ${token}` } 
        }),
        axios.get('http://localhost:5000/api/classes', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      // Process tests data
      let testsData = [];
      if (Array.isArray(testsRes.data)) {
        testsData = testsRes.data;
      } else if (testsRes.data.tests && Array.isArray(testsRes.data.tests)) {
        testsData = testsRes.data.tests;
      } else if (testsRes.data.success && testsRes.data.tests && Array.isArray(testsRes.data.tests)) {
        testsData = testsRes.data.tests;
      }
      
      // Filter and map approved tests
      const approvedTests = testsData
        .filter(t => t.status === 'approved')
        .map(test => {
          let className = test.class;
          let classId = test.class;
          
          if (classesRes.data?.classes && Array.isArray(classesRes.data.classes)) {
            const classObj = classesRes.data.classes.find(c => 
              c._id === test.class || c.name === test.class || c.shortName === test.class
            );
            if (classObj) {
              className = classObj.name;
              classId = classObj._id;
            }
          }
          return {
            ...test,
            className: className,
            classId: classId,
            displayClass: className
          };
        });
      
      setTests(approvedTests);
      
      // Process students data - FIXED: Properly handle enrollment data
      const formattedStudents = studentsData.map(student => {
        console.log('📋 Processing student:', {
          username: student.username,
          name: student.name,
          class: student.class,
          enrolledSubjects: student.enrolledSubjects,
          subjects: student.subjects
        });
        
        // Try multiple ways to get enrollment data
        let enrollmentData = [];
        
        // Method 1: enrolledSubjects array
        if (student.enrolledSubjects && Array.isArray(student.enrolledSubjects)) {
          enrollmentData = student.enrolledSubjects.map(sub => ({
            subject: sub.subject?._id || sub.subject || '',
            subjectName: sub.subject?.name || sub.subjectName || '',
            class: sub.class?._id || sub.class || '',
            className: sub.class?.name || sub.className || '',
            isCore: sub.isCore || false
          }));
        }
        // Method 2: subjects array (old format)
        else if (student.subjects && Array.isArray(student.subjects)) {
          enrollmentData = student.subjects.map(sub => ({
            subject: sub.subject || '',
            subjectName: sub.subject || '',
            class: sub.class || '',
            className: sub.class || '',
            isCore: false
          }));
        }
        // Method 3: Check if student has class field
        else if (student.class) {
          // If student has a class but no subjects, we'll assume they're enrolled in all class subjects
          enrollmentData = [{
            subject: '',
            subjectName: 'All Subjects',
            class: student.class?._id || student.class,
            className: student.class?.name || student.className || '',
            isCore: false
          }];
        }
        
        return {
          ...student,
          enrolledSubjects: enrollmentData,
          class: student.class?._id || student.class || student.classId,
          className: student.class?.name || student.className || student.class
        };
      });
      
      setStudents(formattedStudents);
      
      // Process classes data
      let classesData = [];
      if (Array.isArray(classesRes.data)) {
        classesData = classesRes.data;
      } else if (classesRes.data.classes && Array.isArray(classesRes.data.classes)) {
        classesData = classesRes.data.classes;
      } else if (classesRes.data.success && classesRes.data.classes && Array.isArray(classesRes.data.classes)) {
        classesData = classesRes.data.classes;
      }
      
      setClasses(classesData);
      
      // Auto-select test from URL
      if (urlTestId && approvedTests.length > 0) {
        const test = approvedTests.find(t => t._id === urlTestId);
        if (test) {
          setSelectedTestDetails(test);
          setSelectedTestId(urlTestId);
          loadTestBatches(urlTestId);
          updateEligibleStudents(test, formattedStudents, classesData);
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('AdminScheduling - Error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to load data.');
      setLoading(false);
    }
  };

  const refreshEligibleStudents = async () => {
    if (!selectedTestDetails) return;
    
    setRefreshingStudents(true);
    try {
      await fetchData(); // Re-fetch all data
      setSuccess('Students list refreshed successfully.');
    } catch (err) {
      console.error('Error refreshing students:', err);
      setError('Failed to refresh students list.');
    }
    setRefreshingStudents(false);
  };

  // FIXED: isStudentEnrolled function with normalized class comparison
  const isStudentEnrolled = (student) => {
    if (!selectedTestDetails) return false;
    
    const testClassId = normalizeClassId(selectedTestDetails.class) || normalizeClassId(selectedTestDetails.classId);
    
    return student.enrolledSubjects?.some(sub => {
      // Subject matching
      const subjectMatch = 
        sub.subject === selectedTestDetails.subject ||
        sub.subjectName === selectedTestDetails.subject ||
        (sub.subject?._id && sub.subject._id.toString() === selectedTestDetails.subject) ||
        (sub.subject?.name === selectedTestDetails.subject);
      
      // FIXED: Use normalized class IDs for comparison
      const subClassId = normalizeClassId(sub.class);
      const classMatch = subClassId === testClassId;
      
      console.log('🔍 FIXED Enrollment check:', {
        student: student.username,
        subjectMatch,
        classMatch,
        subClass: sub.class,
        subClassId,
        testClassId,
        subSubjectName: sub.subjectName,
        testSubject: selectedTestDetails.subject
      });
      
      return subjectMatch && classMatch;
    });
  };

  const updateEligibleStudents = (test, customStudentsList = null, customClassesList = null) => {
    if (!test) {
      setEligibleStudents([]);
      return [];
    }
    
    const studentsToCheck = customStudentsList || students;
    const classesToCheck = customClassesList || classes;
    const testSubject = test.subject;
    const testClassId = normalizeClassId(test.class) || normalizeClassId(test.classId);
    
    console.log('🔍 Finding eligible students for test:', {
      testSubject,
      testClassId,
      totalStudents: studentsToCheck.length
    });
    
    const eligible = studentsToCheck.filter(student => {
      const studentClassId = normalizeClassId(student.class);
      
      console.log(`👤 Checking student: ${student.username} (${student.name})`, {
        studentClassId,
        testClassId,
        enrolledSubjects: student.enrolledSubjects
      });
      
      // Check 1: Is student in the right class?
      const classMatches = studentClassId === testClassId;
      
      if (!classMatches) {
        console.log(`✗ ${student.username}: Not in the right class`);
        return false;
      }
      
      // Check 2: Is student enrolled in the test subject?
      if (!student.enrolledSubjects || student.enrolledSubjects.length === 0) {
        console.log(`⚠️ ${student.username}: No enrollment data, but in right class`);
        return true; // Include for admin verification
      }
      
      // Check if enrolled in the subject with proper class matching
      const hasSubject = student.enrolledSubjects.some(sub => {
        const subjectMatch = 
          sub.subject === testSubject ||
          sub.subjectName === testSubject ||
          sub.subjectName?.toLowerCase() === testSubject?.toLowerCase();
        
        const subClassId = normalizeClassId(sub.class);
        const classMatch = subClassId === testClassId;
        
        if (subjectMatch && classMatch) {
          console.log(`✓ ${student.username}: Has subject ${testSubject} for correct class`);
        }
        return subjectMatch && classMatch;
      });
      
      if (!hasSubject) {
        console.log(`⚠️ ${student.username}: Not enrolled in ${testSubject} for this class`);
        // Still include for admin to decide
        return true;
      }
      
      return hasSubject;
    });
    
    console.log('✅ Eligible students found:', {
      count: eligible.length,
      students: eligible.map(s => s.username)
    });
    
    setEligibleStudents(eligible);
    return eligible;
  };

  const handleAddBatch = () => {
    const newBatchName = `Batch ${String.fromCharCode(65 + batches.length)}`;
    setBatches([...batches, { 
      name: newBatchName, 
      students: [], 
      schedule: { 
        start: '', 
        end: '',
        duration: selectedTestDetails?.duration || 60
      } 
    }]);
    setSuccess(`Added new ${newBatchName}`);
  };

  const handleRemoveBatch = (index) => {
    if (batches.length === 1) {
      setError('At least one batch is required.');
      return;
    }
    
    const batchName = batches[index].name;
    const newBatches = batches.filter((_, i) => i !== index);
    
    // Rename remaining batches
    const renamedBatches = newBatches.map((batch, i) => ({
      ...batch,
      name: `Batch ${String.fromCharCode(65 + i)}`
    }));
    
    setBatches(renamedBatches);
    setSuccess(`Removed ${batchName}`);
  };

  const handleBatchChange = (index, field, value) => {
    const newBatches = [...batches];
    if (field === 'students') {
      newBatches[index].students = value;
    } else if (field === 'start' || field === 'end') {
      newBatches[index].schedule[field] = value;
      // Auto-calculate end time if start is set and duration exists
      if (field === 'start' && value && selectedTestDetails?.duration) {
        const startTime = new Date(value);
        const endTime = new Date(startTime.getTime() + selectedTestDetails.duration * 60000);
        newBatches[index].schedule.end = endTime.toISOString().slice(0, 16);
      }
    } else if (field === 'name') {
      newBatches[index][field] = value;
    }
    setBatches(newBatches);
  };

  const handleTestSelect = (testId) => {
    setSelectedTestId(testId);
    const test = tests.find(t => t._id === testId);
    if (test) {
      setSelectedTestDetails(test);
      updateEligibleStudents(test);
      setBatches([{ 
        name: 'Batch A', 
        students: [], 
        schedule: { 
          start: '', 
          end: '',
          duration: test.duration 
        } 
      }]);
    }
    setError(null);
    setSuccess(null);
    setSearchTerm('');
  };

  const loadTestBatches = (testId) => {
    const test = tests.find(t => t._id === testId);
    if (test) {
      setSelectedTestDetails(test);
      updateEligibleStudents(test);
      
      if (test.batches?.length > 0) {
        setBatches(test.batches.map(b => ({
          name: b.name,
          students: b.students.map(id => id.toString ? id.toString() : id),
          schedule: {
            start: b.schedule.start ? new Date(b.schedule.start).toISOString().slice(0, 16) : '',
            end: b.schedule.end ? new Date(b.schedule.end).toISOString().slice(0, 16) : '',
            duration: test.duration
          },
        })));
      } else {
        setBatches([{ 
          name: 'Batch A', 
          students: [], 
          schedule: { 
            start: '', 
            end: '',
            duration: test.duration 
          } 
        }]);
      }
    }
  };

  // Function to randomly distribute students into batches
  const randomlyDistributeStudents = () => {
    if (!eligibleStudents.length) {
      setError('No eligible students to distribute.');
      return;
    }
    
    if (batches.length === 0) {
      setError('Please create at least one batch first.');
      return;
    }
    
    // Get only enrolled students
    const enrolledStudents = eligibleStudents.filter(student => 
      isStudentEnrolled(student)
    );
    
    if (enrolledStudents.length === 0) {
      setError('No students are properly enrolled in this test. Please enroll students first.');
      return;
    }
    
    // Shuffle the enrolled students array
    const shuffledStudents = [...enrolledStudents].sort(() => Math.random() - 0.5);
    
    // Create new batches with empty student arrays
    const newBatches = batches.map(batch => ({
      ...batch,
      students: []
    }));
    
    // Distribute students evenly across batches
    shuffledStudents.forEach((student, index) => {
      const batchIndex = index % newBatches.length;
      newBatches[batchIndex].students.push(student._id);
    });
    
    setBatches(newBatches);
    setSuccess(`Randomly distributed ${enrolledStudents.length} students across ${batches.length} batches.`);
  };

  // FIXED: handleSubmit with proper error handling
  const handleSubmit = async () => {
    if (!selectedTestId) {
      setError('Please select a test to schedule.');
      return;
    }
    
    if (!selectedTestDetails) {
      setError('Test details not found. Please refresh the page.');
      return;
    }
    
    // Validate batches - use shorter duration (max 24 hours)
    const invalidBatches = batches.filter(b => {
      if (!b.schedule.start || !b.schedule.end) {
        return true;
      }
      const start = new Date(b.schedule.start);
      const end = new Date(b.schedule.end);
      const durationHours = (end - start) / (1000 * 60 * 60);
      
      // Check: start must be in future, end after start, max 24 hours
      return start <= new Date() || start >= end || durationHours > 24;
    });
    
    if (invalidBatches.length > 0) {
      setError('All batches must have valid start and end dates/times. Start time must be in the future, end time must be after start time, and maximum duration is 24 hours.');
      return;
    }
    
    // Get normalized test class ID
    const testClassId = normalizeClassId(selectedTestDetails.class) || normalizeClassId(selectedTestDetails.classId);
    
    // Validate each student is properly enrolled
    const enrollmentErrors = [];
    batches.forEach(batch => {
      batch.students.forEach(studentId => {
        const student = eligibleStudents.find(s => s._id === studentId);
        if (student) {
          // FIXED: Use normalized class comparison
          const isActuallyEnrolled = student.enrolledSubjects?.some(sub => {
            // Subject matching
            const subjectMatch = 
              sub.subject === selectedTestDetails.subject ||
              sub.subjectName === selectedTestDetails.subject ||
              (sub.subject?._id && sub.subject._id.toString() === selectedTestDetails.subject);
            
            // FIXED: Use normalized class IDs
            const subClassId = normalizeClassId(sub.class);
            const classMatch = subClassId === testClassId;
            
            console.log('🔍 Enrollment validation check:', {
              student: student.username,
              subSubject: sub.subject,
              subSubjectName: sub.subjectName,
              testSubject: selectedTestDetails.subject,
              subjectMatch,
              subClassId,
              testClassId,
              classMatch,
              fullyMatches: subjectMatch && classMatch
            });
            
            return subjectMatch && classMatch;
          });
          
          if (!isActuallyEnrolled) {
            enrollmentErrors.push({
              batch: batch.name,
              student: student.username,
              name: student.name,
              subject: selectedTestDetails.subject,
              class: selectedTestDetails.className
            });
          }
        }
      });
    });

    if (enrollmentErrors.length > 0) {
      const errorList = enrollmentErrors.map(err => 
        `• ${err.name} (${err.student}) in ${err.batch}`
      ).join('\n');
      
      const errorMsg = `Cannot schedule test. The following students are NOT enrolled in ${selectedTestDetails.subject}:\n\n${errorList}\n\nPlease enroll them first or remove them from batches.`;
      setError(errorMsg);
      
      // Optionally, scroll to top to show error
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const token = localStorage.getItem('token');
      const payload = {
        status: 'scheduled',
        batches: batches.map(b => {
          // Safely parse dates
          let startDate, endDate;
          try {
            startDate = b.schedule.start ? new Date(b.schedule.start) : null;
            endDate = b.schedule.end ? new Date(b.schedule.end) : null;
          } catch (err) {
            console.log('Date parsing error:', err);
            startDate = null;
            endDate = null;
          }
          
          return {
            name: b.name,
            students: b.students,
            schedule: {
              start: startDate && !isNaN(startDate.getTime()) ? startDate.toISOString() : null,
              end: endDate && !isNaN(endDate.getTime()) ? endDate.toISOString() : null,
            },
          };
        }).filter(b => b.schedule.start && b.schedule.end),
      };
      
      console.log('📤 Sending schedule payload:', JSON.stringify(payload, null, 2));
      console.log('Selected test:', {
        id: selectedTestDetails._id,
        title: selectedTestDetails.title,
        subject: selectedTestDetails.subject,
        class: selectedTestDetails.class,
        className: selectedTestDetails.className,
        status: selectedTestDetails.status,
        duration: selectedTestDetails.duration
      });
      
      const response = await axios.put(
        `http://localhost:5000/api/tests/${selectedTestId}/schedule`, 
        payload, 
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );
      
      console.log('✅ Schedule response:', response.data);
      
      setSuccess('Test scheduled successfully! Redirecting to tests list...');
      
      setTimeout(() => {
        navigate('/admin/tests', { 
          state: { success: `Test "${selectedTestDetails.title}" has been scheduled successfully!` } 
        });
      }, 2000);
      
    } catch (err) {
      console.error('❌ AdminScheduling - FULL ERROR:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        config: err.config,
        request: err.request
      });
      
      // Try to extract the exact error message
      let errorMessage = 'Failed to schedule test. ';
      
      if (err.response?.data) {
        console.log('🔍 SERVER RESPONSE DATA:', err.response.data);
        
        // Log the exact error structure
        console.log('🔍 ERROR STRUCTURE:', {
          keys: Object.keys(err.response.data),
          isArray: Array.isArray(err.response.data),
          type: typeof err.response.data,
          raw: err.response.data
        });
        
        if (err.response.data.error) {
          errorMessage += `Error: ${err.response.data.error}`;
        } else if (err.response.data.message) {
          errorMessage += `Message: ${err.response.data.message}`;
        } else if (err.response.data.details) {
          errorMessage += `Details: ${JSON.stringify(err.response.data.details)}`;
        } else if (typeof err.response.data === 'string') {
          errorMessage += err.response.data;
        } else if (Array.isArray(err.response.data) && err.response.data.length > 0) {
          // Handle array of errors
          errorMessage += err.response.data.map(e => e.msg || e.message || e).join(', ');
        } else if (err.response.data.errors) {
          // Handle validation errors
          const errors = err.response.data.errors;
          errorMessage += Object.keys(errors).map(key => `${key}: ${errors[key]}`).join(', ');
        } else {
          // Try to stringify whatever we got
          try {
            errorMessage += JSON.stringify(err.response.data);
          } catch (e) {
            errorMessage += 'Unknown server error';
          }
        }
      } else if (err.message) {
        errorMessage += err.message;
      }
      
      setError(errorMessage);
      
      // Also log the exact payload for debugging
      console.log('🔍 FAILED PAYLOAD ANALYSIS:', {
        testId: selectedTestId,
        testDetails: selectedTestDetails,
        batches: batches.map(b => ({
          name: b.name,
          studentCount: b.students.length,
          students: b.students,
          schedule: {
            start: b.schedule.start,
            end: b.schedule.end,
            duration: calculateBatchDuration(b)
          }
        }))
      });
    }
    
    setIsSubmitting(false);
  };

  const getClassName = (classValue) => {
    if (!classValue) return 'Not Assigned';
    
    if (typeof classValue === 'string' && !classValue.match(/^[0-9a-fA-F]{24}$/)) {
      return classValue;
    }
    
    const classObj = classes.find(c => 
      c._id === classValue || c.name === classValue || c.shortName === classValue
    );
    
    return classObj ? classObj.name : classValue;
  };

  const filteredStudents = eligibleStudents.filter(student => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (student.name && student.name.toLowerCase().includes(searchLower)) ||
      (student.username && student.username.toLowerCase().includes(searchLower)) ||
      (student.rollNumber && student.rollNumber.toLowerCase().includes(searchLower))
    );
  });

  const toggleBatchDetails = (index) => {
    setShowBatchDetails(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const calculateBatchDuration = (batch) => {
    if (!batch.schedule.start || !batch.schedule.end) return 0;
    const start = new Date(batch.schedule.start);
    const end = new Date(batch.schedule.end);
    return Math.round((end - start) / (1000 * 60)); // minutes
  };

  // Manual enrollment function
  const manualEnrollStudent = async (studentId) => {
    if (!selectedTestDetails) {
      setError('Please select a test first.');
      return;
    }

    const token = localStorage.getItem('token');
    const student = eligibleStudents.find(s => s._id === studentId);
    
    if (!student) {
      setError('Student not found.');
      return;
    }
    
    try {
      console.log('🛠️ Manual enrollment for student:', {
        studentId: student._id,
        username: student.username,
        testSubject: selectedTestDetails.subject,
        testClass: selectedTestDetails.class
      });
      
      // Direct API call to enroll student
      const response = await axios.post(
        `http://localhost:5000/api/users/${student._id}/enroll-subjects`,
        {
          subjectIds: [] // Empty array means enroll in all core subjects
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        console.log('✅ Manual enrollment successful:', response.data);
        setSuccess(`Student ${student.username} enrolled in subjects successfully!`);
        
        // Refresh data
        setTimeout(() => {
          refreshEligibleStudents();
        }, 1000);
      } else {
        setError('Failed to enroll student.');
      }
      
    } catch (error) {
      console.error('Manual enrollment error:', error.response?.data || error.message);
      setError(`Failed to enroll student: ${error.response?.data?.message || error.message}`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingSpinner}></div>
          <h3 style={styles.loadingTitle}>Loading Scheduling Data</h3>
          <p style={styles.loadingText}>Fetching tests, students, and classes...</p>
        </div>
      </div>
    );
  }

  // Access denied state
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div style={styles.accessDenied}>
        <FiAlertTriangle style={styles.accessDeniedIcon} />
        <h2 style={styles.accessDeniedTitle}>Access Restricted</h2>
        <p style={styles.accessDeniedText}>This page is only available to administrators.</p>
        <button 
          onClick={() => navigate('/login')} 
          style={styles.loginButton}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <FiCalendar style={styles.headerIcon} />
            <div>
              <h1 style={styles.headerTitle}>Test Scheduling</h1>
              <p style={styles.headerSubtitle}>Schedule and manage test batches for students</p>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button
              onClick={() => navigate('/admin/tests')}
              style={styles.backButton}
            >
              <FiChevronLeft style={{ marginRight: '8px' }} />
              Back to Tests
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={styles.alertError}>
          <div style={styles.alertContent}>
            <FiAlertTriangle style={styles.alertIcon} />
            <div style={styles.alertText}>
              <strong>Error:</strong> {error}
            </div>
          </div>
          <button 
            onClick={() => setError(null)} 
            style={styles.alertClose}
          >
            ×
          </button>
        </div>
      )}
      
      {success && (
        <div style={styles.alertSuccess}>
          <div style={styles.alertContent}>
            <FiCheckCircle style={styles.alertIcon} />
            <div style={styles.alertText}>
              <strong>Success:</strong> {success}
            </div>
          </div>
          <button 
            onClick={() => setSuccess(null)} 
            style={styles.alertClose}
          >
            ×
          </button>
        </div>
      )}

      <div style={{
        ...styles.mainContent,
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        {/* Left Panel - Test Selection */}
        <div style={{
          ...styles.leftPanel,
          width: isMobile ? '100%' : '35%',
          marginBottom: isMobile ? '20px' : 0
        }}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <FiFileText style={styles.cardIcon} />
              <h3 style={styles.cardTitle}>Select Test</h3>
            </div>
            <div style={styles.cardBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <FiBook style={{ marginRight: '8px' }} />
                  Approved Tests
                  <span style={styles.required}>*</span>
                </label>
                <div style={styles.selectWrapper}>
                  <select
                    value={selectedTestId || ''}
                    onChange={(e) => handleTestSelect(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">-- Select a test --</option>
                    {tests.length === 0 ? (
                      <option value="" disabled>No approved tests available</option>
                    ) : (
                      tests.map(test => (
                        <option key={test._id} value={test._id}>
                          {test.title} - {test.subject} ({getClassName(test.class)})
                        </option>
                      ))
                    )}
                  </select>
                  <FiChevronRight style={styles.selectArrow} />
                </div>
                <p style={styles.helperText}>
                  Only approved tests are available for scheduling
                </p>
              </div>

              {selectedTestDetails && (
                <div style={styles.testPreview}>
                  <div style={styles.testPreviewHeader}>
                    <h4 style={styles.testPreviewTitle}>
                      <FiInfo style={{ marginRight: '8px' }} />
                      Test Details
                    </h4>
                    <span style={styles.testStatus}>Approved</span>
                  </div>
                  <div style={styles.testPreviewGrid}>
                    <div style={styles.testPreviewItem}>
                      <span style={styles.testPreviewLabel}>Title:</span>
                      <span style={styles.testPreviewValue}>{selectedTestDetails.title}</span>
                    </div>
                    <div style={styles.testPreviewItem}>
                      <span style={styles.testPreviewLabel}>Subject:</span>
                      <span style={styles.testPreviewValue}>
                        <FiBook style={styles.testPreviewIcon} />
                        {selectedTestDetails.subject}
                      </span>
                    </div>
                    <div style={styles.testPreviewItem}>
                      <span style={styles.testPreviewLabel}>Class:</span>
                      <span style={styles.testPreviewValue}>
                        <FiBookOpen style={styles.testPreviewIcon} />
                        {getClassName(selectedTestDetails.class)}
                      </span>
                    </div>
                    <div style={styles.testPreviewItem}>
                      <span style={styles.testPreviewLabel}>Duration:</span>
                      <span style={styles.testPreviewValue}>
                        <FaRegClock style={styles.testPreviewIcon} />
                        {selectedTestDetails.duration} minutes
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Student Statistics */}
          {selectedTestDetails && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <FiUsers style={styles.cardIcon} />
                <h3 style={styles.cardTitle}>Student Statistics</h3>
                <button 
                  onClick={refreshEligibleStudents}
                  style={styles.refreshButton}
                  disabled={refreshingStudents}
                  title="Refresh students"
                >
                  <FiRefreshCw style={{ 
                    animation: refreshingStudents ? 'spin 1s linear infinite' : 'none' 
                  }} />
                </button>
              </div>
              <div style={styles.cardBody}>
                <div style={styles.statsGrid}>
                  <div style={styles.statCard}>
                    <div style={styles.statIconContainer}>
                      <FaUserGraduate style={styles.statIcon} />
                    </div>
                    <div style={styles.statContent}>
                      <div style={styles.statNumber}>{eligibleStudents.length}</div>
                      <div style={styles.statLabel}>Eligible Students</div>
                    </div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statIconContainer}>
                      <FaClipboardList style={styles.statIcon} />
                    </div>
                    <div style={styles.statContent}>
                      <div style={styles.statNumber}>{batches.length}</div>
                      <div style={styles.statLabel}>Batches</div>
                    </div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statIconContainer}>
                      <FaRegCalendarAlt style={styles.statIcon} />
                    </div>
                    <div style={styles.statContent}>
                      <div style={styles.statNumber}>
                        {batches.reduce((sum, batch) => sum + batch.students.length, 0)}
                      </div>
                      <div style={styles.statLabel}>Total Assigned</div>
                    </div>
                  </div>
                </div>
                
                <div style={styles.searchContainer}>
                  <FiSearch style={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                  />
                </div>
                
                {eligibleStudents.length === 0 ? (
                  <div style={styles.emptyState}>
                    <FiUsers style={styles.emptyStateIcon} />
                    <h4 style={styles.emptyStateTitle}>No Eligible Students</h4>
                    <p style={styles.emptyStateText}>
                      No students found for {selectedTestDetails?.subject} - {getClassName(selectedTestDetails?.class)}
                    </p>
                  </div>
                ) : (
                  <div style={styles.viewToggle}>
                    <button
                      onClick={() => setViewMode('grid')}
                      style={{
                        ...styles.viewToggleButton,
                        ...(viewMode === 'grid' ? styles.viewToggleActive : {})
                      }}
                    >
                      <FiGrid /> Grid
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      style={{
                        ...styles.viewToggleButton,
                        ...(viewMode === 'list' ? styles.viewToggleActive : {})
                      }}
                    >
                      <FiList /> List
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Batch Management */}
        <div style={{
          ...styles.rightPanel,
          width: isMobile ? '100%' : '65%'
        }}>
          {selectedTestDetails ? (
            <>
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <FaClipboardList style={styles.cardIcon} />
                  <h3 style={styles.cardTitle}>Batch Management</h3>
                  <div style={styles.cardActions}>
                    <button
                      onClick={randomlyDistributeStudents}
                      style={styles.randomDistributeButton}
                      disabled={eligibleStudents.length === 0}
                      title="Randomly distribute students into batches"
                    >
                      <FiShuffle style={{ marginRight: '8px' }} />
                      Randomly Distribute
                    </button>
                    <button
                      onClick={handleAddBatch}
                      style={styles.addBatchButton}
                    >
                      <FiPlus style={{ marginRight: '8px' }} />
                      Add Batch
                    </button>
                  </div>
                </div>
                
                <div style={styles.cardBody}>
                  {batches.length === 0 ? (
                    <div style={styles.emptyState}>
                      <FiUsers style={styles.emptyStateIcon} />
                      <h4 style={styles.emptyStateTitle}>No Batches Created</h4>
                      <p style={styles.emptyStateText}>
                        Add a batch to start scheduling students for this test.
                      </p>
                      <button
                        onClick={handleAddBatch}
                        style={styles.primaryButton}
                      >
                        <FiPlus style={{ marginRight: '8px' }} />
                        Create First Batch
                      </button>
                    </div>
                  ) : (
                    <div style={styles.batchesContainer}>
                      {batches.map((batch, index) => (
                        <div key={index} style={styles.batchCard}>
                          <div style={styles.batchHeader}>
                            <div style={styles.batchTitleSection}>
                              <h4 style={styles.batchTitle}>
                                {batch.name}
                                <span style={styles.batchCount}>
                                  ({batch.students.length} students)
                                </span>
                              </h4>
                              {batch.schedule.start && (
                                <span style={styles.batchTime}>
                                  <FiClock style={{ marginRight: '5px' }} />
                                  {new Date(batch.schedule.start).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div style={styles.batchActions}>
                              <button
                                onClick={() => toggleBatchDetails(index)}
                                style={styles.batchActionButton}
                                title={showBatchDetails[index] ? "Hide details" : "Show details"}
                              >
                                <FiEye />
                              </button>
                              {batches.length > 1 && (
                                <button
                                  onClick={() => handleRemoveBatch(index)}
                                  style={styles.batchActionButtonDanger}
                                  title="Remove batch"
                                >
                                  <FiTrash2 />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div style={styles.batchContent}>
                            {/* Schedule Inputs */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                              gap: '1rem',
                              marginBottom: '1.5rem'
                            }}>
                              <div style={styles.formGroup}>
                                <label style={styles.label}>
                                  <FiClock style={{ marginRight: '8px' }} />
                                  Start Date & Time<span style={styles.required}>*</span>
                                </label>
                                <input
                                  type="datetime-local"
                                  value={batch.schedule.start}
                                  onChange={(e) => handleBatchChange(index, 'start', e.target.value)}
                                  required
                                  style={styles.input}
                                  min={new Date().toISOString().slice(0, 16)}
                                />
                                <p style={styles.helperText}>
                                  Must be in the future
                                </p>
                              </div>
                              
                              <div style={styles.formGroup}>
                                <label style={styles.label}>
                                  <FiClock style={{ marginRight: '8px' }} />
                                  End Date & Time<span style={styles.required}>*</span>
                                </label>
                                <input
                                  type="datetime-local"
                                  value={batch.schedule.end}
                                  onChange={(e) => handleBatchChange(index, 'end', e.target.value)}
                                  required
                                  style={styles.input}
                                  min={batch.schedule.start || new Date().toISOString().slice(0, 16)}
                                />
                                <p style={styles.helperText}>
                                  Max 24 hours from start
                                </p>
                              </div>
                            </div>
                            
                            {/* Student Selection */}
                            <div style={styles.formGroup}>
                              <label style={styles.label}>
                                <FiUsers style={{ marginRight: '8px' }} />
                                Select Students for {batch.name}
                                <span style={styles.selectedCount}>
                                  {batch.students.length} selected
                                </span>
                              </label>
                              
                              {eligibleStudents.length > 0 ? (
                                <div style={styles.studentSelector}>
                                  <div style={styles.studentSelectorHeader}>
                                    <span style={styles.studentCount}>
                                      {filteredStudents.length} students available
                                    </span>
                                    <button
                                      onClick={() => {
                                        const allStudentIds = filteredStudents.map(s => s._id);
                                        handleBatchChange(index, 'students', allStudentIds);
                                      }}
                                      style={styles.selectAllButton}
                                    >
                                      <FiUserPlus style={{ marginRight: '5px' }} />
                                      Select All
                                    </button>
                                  </div>
                                  
                                  <div style={styles.studentList}>
                                    {filteredStudents.map((student, studentIndex) => {
                                      const isActuallyEnrolled = isStudentEnrolled(student);
                                      const isSelected = batch.students.includes(student._id);
                                      
                                      return (
                                        <div
                                          key={student._id}
                                          style={{
                                            ...styles.studentItem,
                                            opacity: isActuallyEnrolled ? 1 : 0.6,
                                            backgroundColor: !isActuallyEnrolled && isSelected ? '#fef2f2' : 'transparent',
                                            borderBottom: studentIndex === filteredStudents.length - 1 ? 'none' : '1px solid #f1f5f9'
                                          }}
                                          title={!isActuallyEnrolled ? 
                                            `Student is NOT enrolled in ${selectedTestDetails.subject}. Click the warning icon to fix.` : 
                                            'Ready for scheduling'}
                                        >
                                          <label style={styles.studentCheckbox}>
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={(e) => {
                                                if (!isActuallyEnrolled && e.target.checked) {
                                                  // Warn admin if trying to select unenrolled student
                                                  if (!window.confirm(`⚠️ WARNING: ${student.name} is NOT enrolled in ${selectedTestDetails.subject}.\n\nWould you like to enroll them first?`)) {
                                                    return;
                                                  }
                                                }
                                                const newStudents = e.target.checked
                                                  ? [...batch.students, student._id]
                                                  : batch.students.filter(id => id !== student._id);
                                                handleBatchChange(index, 'students', newStudents);
                                              }}
                                              style={styles.checkboxInput}
                                            />
                                            <span style={{
                                              ...styles.checkboxCustom,
                                              backgroundColor: isSelected ? (isActuallyEnrolled ? '#4B5320' : '#dc2626') : 'transparent',
                                              borderColor: isSelected ? (isActuallyEnrolled ? '#4B5320' : '#dc2626') : '#cbd5e1'
                                            }}>
                                              {isSelected && (
                                                <span style={styles.checkmark}>&#10003;</span>
                                              )}
                                            </span>
                                          </label>
                                          <div style={styles.studentInfo}>
                                            <div style={styles.studentName}>
                                              {student.name || student.username}
                                              {!isActuallyEnrolled && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`Enroll ${student.name} in ${selectedTestDetails.subject}?`)) {
                                                      manualEnrollStudent(student._id);
                                                    }
                                                  }}
                                                  style={{
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    color: '#dc2626',
                                                    cursor: 'pointer',
                                                    marginLeft: '8px',
                                                    padding: '2px'
                                                  }}
                                                  title="Click to enroll student in this subject"
                                                >
                                                  <FaExclamationCircle style={{ fontSize: '14px' }} />
                                                </button>
                                              )}
                                            </div>
                                            <div style={styles.studentDetails}>
                                              <span style={styles.studentUsername}>
                                                {student.username}
                                              </span>
                                              <span style={styles.studentSeparator}>•</span>
                                              <span style={styles.studentClass}>
                                                {student.className || 'No Class'}
                                              </span>
                                              <span style={styles.studentSeparator}>•</span>
                                              <span style={{
                                                ...styles.enrollmentStatus,
                                                backgroundColor: isActuallyEnrolled ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                                                color: isActuallyEnrolled ? '#16a34a' : '#dc2626'
                                              }}>
                                                {isActuallyEnrolled ? 'Enrolled' : 'Not Enrolled'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div style={styles.noStudents}>
                                  <FiAlertTriangle style={{ marginRight: '10px' }} />
                                  No eligible students found for this test
                                </div>
                              )}
                            </div>
                            
                            {/* Batch Summary (Collapsible) */}
                            {showBatchDetails[index] && batch.students.length > 0 && (
                              <div style={styles.batchSummary}>
                                <h5 style={styles.batchSummaryTitle}>
                                  <FiInfo style={{ marginRight: '8px' }} />
                                  Batch Summary
                                </h5>
                                <div style={{
                                  display: 'grid',
                                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                                  gap: '1rem',
                                  marginTop: '1rem'
                                }}>
                                  <div style={styles.summaryItem}>
                                    <span style={styles.summaryLabel}>Students:</span>
                                    <span style={styles.summaryValue}>{batch.students.length}</span>
                                  </div>
                                  <div style={styles.summaryItem}>
                                    <span style={styles.summaryLabel}>Duration:</span>
                                    <span style={styles.summaryValue}>
                                      {calculateBatchDuration(batch)} minutes
                                    </span>
                                  </div>
                                  <div style={styles.summaryItem}>
                                    <span style={styles.summaryLabel}>Start:</span>
                                    <span style={styles.summaryValue}>
                                      {batch.schedule.start 
                                        ? new Date(batch.schedule.start).toLocaleString() 
                                        : 'Not set'}
                                    </span>
                                  </div>
                                  <div style={styles.summaryItem}>
                                    <span style={styles.summaryLabel}>End:</span>
                                    <span style={styles.summaryValue}>
                                      {batch.schedule.end 
                                        ? new Date(batch.schedule.end).toLocaleString() 
                                        : 'Not set'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div style={styles.actionBar}>
                <button
                  type="button"
                  onClick={() => navigate('/admin/tests')}
                  style={styles.cancelButton}
                  disabled={isSubmitting}
                >
                  <FiX style={{ marginRight: '8px' }} />
                  Cancel
                </button>
                
                <div style={styles.spacer}></div>
                
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !selectedTestId || eligibleStudents.length === 0}
                  style={{
                    ...styles.submitButton,
                    opacity: (selectedTestId && !isSubmitting && eligibleStudents.length > 0) ? 1 : 0.5,
                    cursor: (selectedTestId && !isSubmitting && eligibleStudents.length > 0) ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div style={styles.spinnerSmall}></div>
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <FiSave style={{ marginRight: '8px' }} />
                      Schedule Test
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div style={styles.emptyStateCard}>
              <FiCalendar style={styles.emptyStateIconLarge} />
              <h3 style={styles.emptyStateTitleLarge}>No Test Selected</h3>
              <p style={styles.emptyStateTextLarge}>
                Select a test from the left panel to start scheduling batches for students.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Styles object with added styles for the random distribute button
const styles = {
  container: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    color: '#334155',
  },
  
  // Loading State
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  loadingContent: {
    textAlign: 'center',
    padding: '3rem',
    maxWidth: '400px',
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1.5rem',
  },
  loadingTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.5rem',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '0.95rem',
  },
  
  // Access Denied
  accessDenied: {
    textAlign: 'center',
    padding: '4rem 1rem',
    maxWidth: '500px',
    margin: '0 auto',
  },
  accessDeniedIcon: {
    fontSize: '64px',
    color: '#dc2626',
    marginBottom: '1rem',
  },
  accessDeniedTitle: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem',
  },
  accessDeniedText: {
    color: '#64748b',
    fontSize: '1rem',
    marginBottom: '2rem',
  },
  loginButton: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '1rem',
    transition: 'background-color 0.2s',
  },
  
  // Header
  header: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #e2e8f0',
    padding: '1.25rem 1.5rem',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  headerIcon: {
    fontSize: '32px',
    color: '#4B5320',
  },
  headerTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
    lineHeight: '1.2',
  },
  headerSubtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
    padding: '0.625rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.875rem',
  },
  
  // Alerts
  alertError: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderLeft: '4px solid #dc2626',
    padding: '1rem 1.25rem',
    margin: '1.5rem auto',
    maxWidth: '1400px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertSuccess: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderLeft: '4px solid #16a34a',
    padding: '1rem 1.25rem',
    margin: '1.5rem auto',
    maxWidth: '1400px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flex: 1,
  },
  alertIcon: {
    fontSize: '20px',
    flexShrink: 0,
  },
  alertText: {
    fontSize: '0.875rem',
    lineHeight: '1.4',
  },
  alertClose: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '0 0.25rem',
  },
  
  // Main Content
  mainContent: {
    display: 'flex',
    gap: '1.5rem',
    maxWidth: '1400px',
    margin: '1.5rem auto',
    padding: '0 1.5rem',
  },
  leftPanel: {
    flex: 1,
  },
  rightPanel: {
    flex: 2,
  },
  
  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    marginBottom: '1.5rem',
  },
  cardHeader: {
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    padding: '1.25rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  cardIcon: {
    fontSize: '20px',
    color: '#4B5320',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
    flex: 1,
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  cardBody: {
    padding: '1.5rem',
  },
  
  // Form Elements
  formGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    color: '#334155',
    fontWeight: '500',
    fontSize: '0.875rem',
    marginBottom: '0.5rem',
  },
  required: {
    color: '#dc2626',
    marginLeft: '4px',
  },
  selectWrapper: {
    position: 'relative',
  },
  select: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '0.875rem',
    backgroundColor: '#FFFFFF',
    appearance: 'none',
    cursor: 'pointer',
  },
  selectArrow: {
    position: 'absolute',
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
    pointerEvents: 'none',
  },
  helperText: {
    color: '#64748b',
    fontSize: '0.75rem',
    marginTop: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '0.875rem',
    backgroundColor: '#FFFFFF',
  },
  
  // Test Preview
  testPreview: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '1.25rem',
    marginTop: '1.5rem',
    border: '1px solid #e2e8f0',
  },
  testPreviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  testPreviewTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
  },
  testStatus: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  testPreviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
  },
  testPreviewItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  testPreviewLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '500',
  },
  testPreviewValue: {
    fontSize: '0.875rem',
    color: '#334155',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  testPreviewIcon: {
    fontSize: '14px',
    color: '#4B5320',
  },
  
  // Statistics
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  statCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  statIconContainer: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    fontSize: '20px',
  },
  statContent: {
    flex: 1,
  },
  statNumber: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: '1',
    marginBottom: '0.25rem',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '500',
  },
  refreshButton: {
    backgroundColor: 'transparent',
    border: '1px solid #cbd5e1',
    color: '#64748b',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  
  // Random Distribute Button
  randomDistributeButton: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    color: '#FFFFFF',
    border: 'none',
    padding: '0.625rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.875rem',
    transition: 'background-color 0.2s',
  },
  
  // Add Batch Button
  addBatchButton: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    padding: '0.625rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.875rem',
  },
  
  // Search
  searchContainer: {
    position: 'relative',
    marginBottom: '1rem',
  },
  searchIcon: {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
    fontSize: '16px',
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 2.75rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '0.875rem',
    backgroundColor: '#FFFFFF',
  },
  
  // View Toggle
  viewToggle: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  viewToggleButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    border: '1px solid #cbd5e1',
    padding: '0.5rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  viewToggleActive: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: '1px solid #4B5320',
  },
  
  // Empty States
  emptyState: {
    textAlign: 'center',
    padding: '2rem 1rem',
    color: '#64748b',
  },
  emptyStateIcon: {
    fontSize: '48px',
    color: '#cbd5e1',
    marginBottom: '1rem',
  },
  emptyStateTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '0.5rem',
  },
  emptyStateText: {
    fontSize: '0.875rem',
    lineHeight: '1.5',
    marginBottom: '1.5rem',
  },
  emptyStateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '3rem 2rem',
    textAlign: 'center',
  },
  emptyStateIconLarge: {
    fontSize: '64px',
    color: '#cbd5e1',
    marginBottom: '1.5rem',
  },
  emptyStateTitleLarge: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '0.75rem',
  },
  emptyStateTextLarge: {
    fontSize: '1rem',
    color: '#64748b',
    lineHeight: '1.5',
    maxWidth: '400px',
    margin: '0 auto',
  },
  
  // Batch Management
  batchesContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  batchCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  batchHeader: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #e2e8f0',
    padding: '1rem 1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  batchTitleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  batchTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  batchCount: {
    fontSize: '0.875rem',
    fontWeight: '400',
    color: '#64748b',
  },
  batchTime: {
    fontSize: '0.75rem',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
  },
  batchActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  batchActionButton: {
    backgroundColor: 'transparent',
    border: '1px solid #cbd5e1',
    color: '#64748b',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  batchActionButtonDanger: {
    backgroundColor: 'transparent',
    border: '1px solid #fecaca',
    color: '#dc2626',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  batchContent: {
    padding: '1.25rem',
  },
  
  // Student Selection
  selectedCount: {
    fontSize: '0.75rem',
    fontWeight: '400',
    color: '#64748b',
    marginLeft: 'auto',
  },
  studentSelector: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  studentSelectorHeader: {
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    padding: '0.75rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  studentCount: {
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#475569',
  },
  selectAllButton: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: '#4B5320',
    border: '1px solid #4B5320',
    padding: '0.375rem 0.75rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  studentList: {
    maxHeight: '300px',
    overflowY: 'auto',
  },
  studentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    transition: 'background-color 0.2s',
  },
  studentCheckbox: {
    position: 'relative',
    cursor: 'pointer',
  },
  checkboxInput: {
    position: 'absolute',
    opacity: 0,
    cursor: 'pointer',
    width: '18px',
    height: '18px',
  },
  checkboxCustom: {
    width: '18px',
    height: '18px',
    border: '2px solid #cbd5e1',
    borderRadius: '4px',
    display: 'inline-block',
    position: 'relative',
    transition: 'all 0.2s',
  },
  checkmark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: '0.25rem',
    display: 'flex',
    alignItems: 'center',
  },
  studentDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: '#64748b',
    flexWrap: 'wrap',
  },
  studentUsername: {
    fontFamily: 'monospace',
  },
  studentSeparator: {
    color: '#cbd5e1',
  },
  studentClass: {
    fontStyle: 'italic',
  },
  enrollmentStatus: {
    fontSize: '0.7rem',
    fontWeight: '500',
    padding: '1px 4px',
    borderRadius: '4px',
  },
  noStudents: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    backgroundColor: '#fef2f2',
    border: '1px dashed #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '0.875rem',
  },
  
  // Batch Summary
  batchSummary: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '1.25rem',
    marginTop: '1.5rem',
  },
  batchSummaryTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #f1f5f9',
  },
  summaryLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
  },
  summaryValue: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#1e293b',
  },
  
  // Action Bar
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #e2e8f0',
    borderRadius: '0 0 12px 12px',
    flexWrap: 'wrap',
  },
  cancelButton: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: '#475569',
    border: '1px solid #cbd5e1',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.875rem',
  },
  spacer: {
    flex: 1,
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    padding: '0.75rem 2rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.875rem',
    transition: 'opacity 0.2s',
  },
  spinnerSmall: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #FFFFFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px',
  },
  
  // Buttons
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.875rem',
  },
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default AdminScheduling;