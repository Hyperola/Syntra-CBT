import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import { 
  FiSave, FiX, FiPlus, FiAlertCircle, 
  FiCheckCircle, FiChevronRight, FiClock, FiBook, 
  FiCalendar, FiUsers, FiFileText, FiRefreshCcw,
  FiEdit2, FiEye, FiList, FiHelpCircle,
  FiChevronDown, FiChevronUp, FiInfo, FiSettings,
  FiArrowLeft
} from 'react-icons/fi';
import { BsCardChecklist, BsQuestionCircle } from 'react-icons/bs';
import { MdOutlineQuiz } from 'react-icons/md';

const TestCreation = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { testId } = useParams();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeSession, setActiveSession] = useState('');
  const [activeTerm, setActiveTerm] = useState('');
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testDetails, setTestDetails] = useState(null);
  
  const [formData, setFormData] = useState({
    title: 'Continuous Assessment 1 (CA 1)',
    subject: '',
    class: '',
    instructions: 'Answer all questions. No cheating allowed.',
    duration: 60,
    randomize: false,
    session: '',
    term: '',
    questionCount: 0,
    totalMarks: 20,
    passingMarks: 8,
    allowRetakes: false,
    maxAttempts: 1,
    status: 'draft',
    showResults: false,
    shuffleQuestions: false,
    shuffleOptions: false,
    showProgress: true,
    allowReview: false,
    requireFullScreen: false,
    disableCopyPaste: false
  });

  // Check if user is authorized
  useEffect(() => {
    if (!user || (user.role !== 'teacher' && user.role !== 'admin' && user.role !== 'super_admin')) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch active session and term
  const fetchActiveSession = async () => {
    try {
      setSessionLoading(true);
      console.log('📅 Fetching active session from /api/sessions/active...');
      
      const res = await api.get('/api/sessions/active');
      console.log('✅ Active session response:', res.data);
      
      if (res.data && res.data.activeTerm) {
        setActiveSession(res.data.activeTerm.session);
        setActiveTerm(res.data.activeTerm.term);
        
        setFormData(prev => ({
          ...prev,
          session: res.data.activeTerm.session,
          term: res.data.activeTerm.term
        }));
        
        console.log('🎯 Session set:', {
          session: res.data.activeTerm.session,
          term: res.data.activeTerm.term
        });
      } else if (res.data && res.data.session) {
        setActiveSession(res.data.session);
        setActiveTerm(res.data.term);
        
        setFormData(prev => ({
          ...prev,
          session: res.data.session,
          term: res.data.term
        }));
        
        console.log('🎯 Session set (alt format):', {
          session: res.data.session,
          term: res.data.term
        });
      } else {
        throw new Error('No session data in response');
      }
    } catch (err) {
      console.error('❌ Error fetching active session:', err);
      console.log('🔄 Using fallback session calculation...');
      
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      
      let term;
      if (month >= 1 && month <= 4) term = 'First Term';
      else if (month >= 5 && month <= 8) term = 'Second Term';
      else term = 'Third Term';
      
      const session = `${year-1}/${year}`;
      
      console.log('📅 Fallback session:', { session, term });
      
      setActiveSession(session);
      setActiveTerm(term);
      
      setFormData(prev => ({
        ...prev,
        session: session,
        term: term
      }));
    } finally {
      setSessionLoading(false);
    }
  };

  // Refresh session
  const handleRefreshSession = async () => {
    setError(null);
    await fetchActiveSession();
  };

  // Fetch teacher's assigned classes and subjects
  const fetchTeacherAssignments = async () => {
    if (user?.role !== 'teacher') return;
    
    try {
      const teacherId = user._id || user.id;
      console.log('👨‍🏫 Fetching teacher assignments for teacher ID:', teacherId);
      
      if (!teacherId) {
        console.error('❌ No teacher ID found in user object');
        setError('Teacher ID not found. Please log in again.');
        return;
      }
      
      const res = await api.get(`/api/users/teachers/${teacherId}/assignments`);
      console.log('✅ Teacher assignments response:', res.data);
      
      if (res.data.success && res.data.assignments) {
        const classes = [];
        const subjectsMap = new Map();
        
        res.data.assignments.forEach((assignment, index) => {
          console.log(`📝 Processing assignment ${index + 1}:`, assignment);
          
          if (assignment.class) {
            const classId = assignment.class._id || assignment.class;
            const className = assignment.class.name || assignment.class;
            
            const classObj = {
              id: classId,
              name: className,
              level: assignment.class.level || '',
              stream: assignment.class.stream || '',
              displayName: `${assignment.class.level || ''} ${assignment.class.name || ''} ${assignment.class.stream ? `(${assignment.class.stream})` : ''}`.trim()
            };
            
            console.log('🏫 Class object:', classObj);
            classes.push(classObj);
            
            if (assignment.subjects && Array.isArray(assignment.subjects)) {
              assignment.subjects.forEach((subject, subIndex) => {
                if (!subject) return;
                
                const subjectId = subject._id || subject;
                const subjectName = subject.name || subject;
                const key = `${classId}-${subjectId}`;
                
                console.log(`📚 Subject ${subIndex + 1} for class ${classObj.displayName}:`, {
                  subjectId,
                  subjectName,
                  key
                });
                
                if (!subjectsMap.has(key)) {
                  subjectsMap.set(key, {
                    classId,
                    className,
                    subjectId,
                    subjectName,
                    displayName: subjectName
                  });
                }
              });
            }
          }
        });
        
        const uniqueClasses = Array.from(new Map(classes.map(cls => [cls.id, cls])).values());
        const subjects = Array.from(subjectsMap.values());
        
        console.log('📚 Processed assignments:', {
          classes: uniqueClasses,
          subjects: subjects,
          classesCount: uniqueClasses.length,
          subjectsCount: subjects.length
        });
        
        setTeacherClasses(uniqueClasses);
        setTeacherSubjects(subjects);
        
        if (uniqueClasses.length === 1 && subjects.length === 1) {
          const singleClass = uniqueClasses[0];
          const singleSubject = subjects[0];
          
          console.log('🎯 Auto-selecting single class/subject:', {
            class: singleClass,
            subject: singleSubject
          });
          
          setFormData(prev => ({
            ...prev,
            class: singleClass.id,
            subject: singleSubject.subjectName
          }));
        }
      }
    } catch (err) {
      console.error('❌ Error fetching teacher assignments:', err);
      
      if (user.subjects && Array.isArray(user.subjects)) {
        console.log('🔄 Using user.subjects from context:', user.subjects);
        
        const classes = [];
        const subjects = [];
        const seenClasses = new Set();
        const seenSubjects = new Set();
        
        user.subjects.forEach(subject => {
          if (!subject) return;
          
          const classId = subject.class || subject.classId;
          const className = subject.className || subject.class;
          const subjectId = subject.subject || subject.subjectId;
          const subjectName = subject.subjectName || subject.subject;
          
          if (classId && !seenClasses.has(classId)) {
            seenClasses.add(classId);
            classes.push({
              id: classId,
              name: className || classId,
              displayName: className || classId
            });
          }
          
          if (subjectId && classId) {
            const key = `${classId}-${subjectId}`;
            if (!seenSubjects.has(key)) {
              seenSubjects.add(key);
              subjects.push({
                classId,
                className: className || classId,
                subjectId,
                subjectName,
                displayName: subjectName || subjectId
              });
            }
          }
        });
        
        setTeacherClasses(classes);
        setTeacherSubjects(subjects);
        
        if (classes.length === 1 && subjects.length === 1) {
          setFormData(prev => ({
            ...prev,
            class: classes[0].id,
            subject: subjects[0].subjectName
          }));
        }
      } else {
        setError('Failed to load teacher assignments. Please refresh or contact admin.');
      }
    }
  };

  // Fetch all classes and subjects for admin
  const fetchAllClassesSubjects = async () => {
    try {
      console.log('👨‍💼 Fetching all classes and subjects for admin...');
      
      const classesRes = await api.get('/api/classes');
      console.log('📚 All classes response:', classesRes.data);
      
      if (classesRes.data.success && classesRes.data.classes) {
        const classes = classesRes.data.classes.map(cls => ({
          id: cls._id || cls.id,
          name: cls.name,
          level: cls.level || '',
          stream: cls.stream || '',
          displayName: `${cls.level || ''} ${cls.name} ${cls.stream ? `(${cls.stream})` : ''}`.trim()
        }));
        
        setTeacherClasses(classes);
      }
      
      const subjectsRes = await api.get('/api/subjects');
      console.log('📝 All subjects response:', subjectsRes.data);
      
      if (subjectsRes.data.success && subjectsRes.data.subjects) {
        const formattedSubjects = subjectsRes.data.subjects.map(subject => ({
          id: subject._id || subject.id,
          name: subject.name,
          displayName: subject.name,
          classId: subject.class || subject.classId
        }));
        
        setAllSubjects(formattedSubjects);
        setTeacherSubjects(formattedSubjects);
      }
      
    } catch (err) {
      console.error('❌ Error fetching admin data:', err);
      setError('Failed to load classes and subjects. Please try again.');
    }
  };

  // Fetch test if editing
  const fetchTest = async () => {
    if (!testId) return;
    
    try {
      setLoading(true);
      const res = await api.get(`/api/tests/${testId}`);
      console.log('📝 Fetched test data:', res.data);
      
      const testData = res.data.test || res.data;
      setTestDetails(testData);
      
      const passingMarks = testData.passingMarks || Math.ceil((testData.totalMarks || 20) * 0.4);
      
      setFormData({
        title: testData.title || '',
        subject: testData.subject || '',
        class: testData.class?._id || testData.class || '',
        instructions: testData.instructions || 'Answer all questions. No cheating allowed.',
        duration: testData.duration || 60,
        randomize: testData.randomize || false,
        session: testData.session || activeSession || '',
        term: testData.term || activeTerm || '',
        questionCount: testData.questionCount || 0,
        totalMarks: testData.totalMarks || 20,
        passingMarks: passingMarks,
        allowRetakes: testData.allowRetakes || false,
        maxAttempts: testData.maxAttempts || 1,
        status: testData.status || 'draft',
        showResults: testData.showResults || false,
        shuffleQuestions: testData.settings?.shuffleQuestions || false,
        shuffleOptions: testData.settings?.shuffleOptions || false,
        showProgress: testData.settings?.showProgress !== undefined ? testData.settings.showProgress : true,
        allowReview: testData.settings?.allowReview || false,
        requireFullScreen: testData.settings?.requireFullScreen || false,
        disableCopyPaste: testData.settings?.disableCopyPaste || false
      });
      
      setIsEditMode(true);
      
    } catch (err) {
      console.error('❌ Error fetching test:', err);
      setError(err.response?.data?.error || 'Failed to load test');
    } finally {
      setLoading(false);
    }
  };

  // Initialize data
  useEffect(() => {
    fetchActiveSession();
  }, []);

  useEffect(() => {
    if (user) {
      console.log('🎯 User changed:', {
        id: user._id,
        role: user.role,
        username: user.username,
        subjects: user.subjects
      });
      
      if (user.role === 'teacher') {
        fetchTeacherAssignments();
      } else if (user.role === 'admin' || user.role === 'super_admin') {
        fetchAllClassesSubjects();
      }
    }
  }, [user]);

  useEffect(() => {
    if (testId && user && activeSession) {
      fetchTest();
    }
  }, [testId, user, activeSession]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'title') {
      let totalMarks, passingMarks;
      
      if (value.includes('CA')) {
        totalMarks = 20;
        passingMarks = Math.ceil(totalMarks * 0.4);
      } else if (value === 'Examination') {
        totalMarks = 60;
        passingMarks = Math.ceil(totalMarks * 0.4);
      } else {
        totalMarks = formData.totalMarks || 20;
        passingMarks = formData.passingMarks || 8;
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        totalMarks,
        passingMarks,
        questionCount: 0
      }));
    } else if (name === 'class') {
      setFormData(prev => ({
        ...prev,
        class: value,
        subject: '',
        questionCount: 0
      }));
    } else if (name === 'totalMarks') {
      const total = parseInt(value) || 20;
      const passing = Math.min(formData.passingMarks || 8, total);
      
      setFormData(prev => ({
        ...prev,
        totalMarks: total,
        passingMarks: passing
      }));
    } else if (name === 'passingMarks') {
      const passing = parseInt(value) || 8;
      setFormData(prev => ({
        ...prev,
        passingMarks: Math.min(passing, prev.totalMarks || 20)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.title.trim()) {
      errors.push('Test title is required');
    }
    if (!formData.subject) {
      errors.push('Subject is required');
    }
    if (!formData.class) {
      errors.push('Class is required');
    }
    if (!formData.duration || formData.duration < 1) {
      errors.push('Duration must be at least 1 minute');
    }
    if (!formData.session) {
      errors.push('Session is required');
    }
    if (!formData.term) {
      errors.push('Term is required');
    }
    
    const passingMarks = formData.passingMarks || 8;
    const totalMarks = formData.totalMarks || 20;
    
    if (passingMarks > totalMarks) {
      errors.push(`Passing marks (${passingMarks}) cannot exceed total marks (${totalMarks})`);
    }
    
    if (errors.length > 0) {
      setError(errors.join('. '));
      return false;
    }
    
    return true;
  };

  // Check teacher permissions before submitting
  const checkTeacherPermissions = () => {
    if (user.role !== 'teacher') return true;
    
    console.log('🔍 Checking teacher permissions before submit:', {
      teacherId: user._id,
      username: user.username,
      userSubjects: user.subjects,
      selectedClass: formData.class,
      selectedSubject: formData.subject,
      teacherSubjects: teacherSubjects
    });
    
    const hasAccess = teacherSubjects.some(subject => {
      const classMatch = subject.classId === formData.class;
      const subjectMatch = subject.subjectName === formData.subject;
      
      console.log('📋 Comparing:', {
        teacherSubject: subject,
        selected: { class: formData.class, subject: formData.subject },
        classMatch,
        subjectMatch,
        fullMatch: classMatch && subjectMatch
      });
      
      return classMatch && subjectMatch;
    });
    
    if (!hasAccess) {
      console.warn('❌ Teacher does not have access to selected subject/class');
      
      setDebugInfo({
        teacherSubjects,
        selectedClass: formData.class,
        selectedSubject: formData.subject,
        teacherClasses,
        userSubjects: user.subjects
      });
      
      return false;
    }
    
    console.log('✅ Teacher has access to selected subject/class');
    return true;
  };

  const handleSubmit = async (e, action = 'save') => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setDebugInfo(null);
    
    if (!validateForm()) return;
    
    if (user.role === 'teacher' && !checkTeacherPermissions()) {
      setError('You are not assigned to teach this subject/class combination. Please select a different subject or class.');
      return;
    }
    
    let totalMarks, passingMarks;
    
    if (formData.title.includes('CA')) {
      totalMarks = 20;
      passingMarks = 8;
    } else if (formData.title === 'Examination') {
      totalMarks = 60;
      passingMarks = 24;
    } else {
      totalMarks = parseInt(formData.totalMarks) || 20;
      const calculatedPassing = parseInt(formData.passingMarks) || Math.ceil(totalMarks * 0.4);
      passingMarks = Math.min(calculatedPassing, totalMarks);
    }
    
    // Prepare test data
    const testData = {
      title: formData.title,
      subject: formData.subject,
      class: formData.class,
      instructions: formData.instructions,
      duration: parseInt(formData.duration),
      randomize: formData.randomize,
      session: formData.session || activeSession,
      term: formData.term || activeTerm,
      questionCount: formData.questionCount || 0,
      totalMarks: totalMarks,
      passingMarks: passingMarks,
      allowRetakes: formData.allowRetakes,
      maxAttempts: formData.maxAttempts,
      status: formData.status,
      showResults: formData.showResults,
      settings: {
        shuffleQuestions: formData.shuffleQuestions,
        shuffleOptions: formData.shuffleOptions,
        showProgress: formData.showProgress,
        allowReview: formData.allowReview,
        requireFullScreen: formData.requireFullScreen,
        disableCopyPaste: formData.disableCopyPaste
      }
    };
    
    console.log('📤 Submitting test data:', JSON.stringify(testData, null, 2));
    
    try {
      setSaving(true);
      
      let response;
      if (testId) {
        // Update existing test
        response = await api.put(`/api/tests/${testId}`, testData);
        console.log('✅ Test updated:', response.data);
        
        if (action === 'saveAndAddQuestions') {
          setSuccess('Test updated successfully! Redirecting to add questions...');
          setTimeout(() => {
            navigate(`/teacher/test-creation/${testId}/questions`);
          }, 1500);
        } else {
          setSuccess('Test updated successfully!');
        }
      } else {
        // Create new test
        console.log('🚀 Creating new test...');
        response = await api.post('/api/tests', testData);
        console.log('✅ Test created:', response.data);
        
        const createdTestId = response.data.test?._id || response.data._id;
        
        if (createdTestId) {
          if (action === 'saveAndAddQuestions') {
            setSuccess('Test created successfully! Redirecting to add questions...');
            setTimeout(() => {
              navigate(`/teacher/test-creation/${createdTestId}/questions`);
            }, 1500);
          } else {
            setSuccess(`Test created successfully! Test ID: ${createdTestId}`);
            setTimeout(() => {
              navigate(`/teacher/test-creation/${createdTestId}`);
            }, 2000);
          }
        } else {
          setSuccess('Test created successfully!');
          setTimeout(() => {
            navigate('/teacher/tests');
          }, 1500);
        }
      }
      
    } catch (err) {
      console.error('❌ Error saving test:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config
      });
      
      if (err.response?.status === 403) {
        if (err.response?.data?.error?.includes('Not assigned')) {
          setError('You are not assigned to teach this subject/class combination. Please contact administrator to update your assignments.');
        } else {
          setError('Permission denied. You may not have permission to create tests. Contact administrator.');
        }
      } else if (err.response?.status === 400) {
        const errorMsg = err.response?.data?.error || 'Validation failed';
        
        if (errorMsg.includes('Passing marks cannot exceed total marks')) {
          setError(`Validation Error: Passing marks (${testData.passingMarks}) cannot exceed total marks (${testData.totalMarks}). Please adjust the passing marks.`);
        } else {
          setError(`Validation Error: ${errorMsg}. Please check all fields and try again.`);
        }
        
        if (err.response?.data?.errors) {
          console.log('🔍 Detailed validation errors:', err.response.data.errors);
        }
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to save test. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestions = () => {
    if (testId) {
      navigate(`/teacher/test-creation/${testId}/questions`);
    } else {
      setError('Please save the test first before adding questions');
    }
  };

  const handleSaveAndAddQuestions = (e) => {
    handleSubmit(e, 'saveAndAddQuestions');
  };

  const handleManageTest = () => {
    navigate('/teacher/tests');
  };

  const handlePreviewTest = () => {
    if (!testId) {
      setError('Test must be saved first');
      return;
    }
    navigate(`/teacher/test-preview/${testId}`);
  };

  const handleViewQuestions = () => {
    if (!testId) {
      setError('Test must be saved first');
      return;
    }
    navigate(`/teacher/test-creation/${testId}/questions`);
  };

  // Get subjects for selected class
  const getSubjectsForClass = () => {
    if (!formData.class) return [];
    
    if (user.role === 'teacher') {
      const filtered = teacherSubjects.filter(sub => {
        const matches = sub.classId === formData.class;
        return matches;
      });
      
      return filtered.map(sub => ({
        id: sub.subjectId,
        name: sub.subjectName,
        displayName: sub.displayName
      }));
    } else {
      return allSubjects.filter(sub => sub.classId === formData.class);
    }
  };

  const getClassName = (classId) => {
    const cls = teacherClasses.find(c => c.id === classId);
    return cls ? cls.displayName || cls.name : classId;
  };

  // Debug function to check assignments
  const checkAssignments = () => {
    console.log('🔍 Debug assignments:', {
      teacherClasses,
      teacherSubjects,
      formData,
      userSubjects: user.subjects,
      allSubjects
    });
    
    alert(`Teacher Classes: ${teacherClasses.length}\nTeacher Subjects: ${teacherSubjects.length}\nSelected Class: ${formData.class}\nSelected Subject: ${formData.subject}`);
  };

  const toggleAdvancedSettings = () => {
    setShowAdvanced(!showAdvanced);
  };

  // Fix for button navigation issues
  const handleCancel = () => {
    if (testId) {
      navigate(`/teacher/tests`);
    } else {
      navigate('/teacher/tests');
    }
  };

  if (loading && testId) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading test data...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.titleRow}>
            <button
              onClick={() => navigate('/teacher/tests')}
              style={styles.backButtonSmall}
              title="Back to tests"
            >
              <FiArrowLeft />
            </button>
            <MdOutlineQuiz style={styles.titleIcon} />
            <h1 style={styles.headerTitle}>
              {testId ? 'Edit Test' : 'Create New Test'}
            </h1>
            {testId && (
              <span style={styles.testIdBadge}>
                <FiInfo size={12} /> ID: {testId}
              </span>
            )}
          </div>
          <div style={styles.headerSubtitle}>
            <div style={styles.sessionInfo}>
              <FiCalendar style={styles.sessionIcon} />
              <span>Academic Session: </span>
              {sessionLoading ? (
                <span style={styles.loadingTextSmall}>Loading...</span>
              ) : (
                <>
                  <strong style={styles.sessionValue}>{activeSession}</strong>
                  <span style={styles.termBadge}>{activeTerm}</span>
                  <button
                    onClick={handleRefreshSession}
                    style={styles.refreshSessionButton}
                    title="Refresh session"
                    disabled={sessionLoading}
                  >
                    <FiRefreshCcw size={14} />
                  </button>
                </>
              )}
            </div>
            <div style={styles.userInfo}>
              <span>Teacher: {user?.username} ({user?.role})</span>
              {teacherClasses.length > 0 && (
                <span style={styles.classCount}>
                  {teacherClasses.length} class{teacherClasses.length !== 1 ? 'es' : ''} assigned
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={checkAssignments}
            style={styles.debugButton}
            title="Debug assignments"
          >
            <FiInfo size={14} /> Debug
          </button>
          <button
            onClick={handleCancel}
            style={styles.cancelButtonHeader}
          >
            <FiX /> Cancel
          </button>
        </div>
      </div>

      {error && (
        <div style={styles.alertError}>
          <FiAlertCircle style={styles.alertIcon} />
          <div style={styles.alertContent}>
            <span style={styles.alertText}>{error}</span>
            {debugInfo && (
              <div style={styles.debugInfo}>
                <details>
                  <summary style={styles.debugSummary}>Debug Info</summary>
                  <pre style={styles.debugPre}>
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
          <button
            onClick={() => setError(null)}
            style={styles.alertCloseButton}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div style={styles.alertSuccess}>
          <FiCheckCircle style={styles.alertIcon} />
          <span style={styles.alertText}>{success}</span>
          <button
            onClick={() => setSuccess(null)}
            style={styles.alertCloseButton}
          >
            ×
          </button>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, 'save')} style={styles.form}>
        {/* Basic Information Section */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <FiFileText style={styles.sectionIcon} />
            Basic Information
          </h3>
          
          <div style={styles.formGrid}>
            {/* Test Title */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <BsQuestionCircle style={styles.labelIcon} />
                Test Title <span style={styles.required}>*</span>
              </label>
              <select
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                style={styles.select}
                required
              >
                <option value="Continuous Assessment 1 (CA 1)">CA 1 - Continuous Assessment 1 (20 marks)</option>
                <option value="Continuous Assessment 2 (CA 2)">CA 2 - Continuous Assessment 2 (20 marks)</option>
                <option value="Examination">Examination (60 marks)</option>
                <option value="Custom">Custom Test</option>
              </select>
              {formData.title && formData.title !== 'Custom' && (
                <div style={styles.marksInfo}>
                  <span>Total Marks: <strong>{formData.totalMarks}</strong></span>
                  <span>Passing: <strong>{formData.passingMarks}</strong> ({(formData.passingMarks/formData.totalMarks*100).toFixed(0)}%)</span>
                </div>
              )}
              {formData.title === 'Custom' && (
                <div style={styles.customTitleInput}>
                  <div style={styles.formGroup}>
                    <label style={styles.smallLabel}>Custom Title:</label>
                    <input
                      type="text"
                      placeholder="Enter custom test title"
                      style={styles.input}
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div style={styles.customMarksInput}>
                    <div style={styles.formGroup}>
                      <label style={styles.smallLabel}>Total Marks:</label>
                      <input
                        type="number"
                        name="totalMarks"
                        value={formData.totalMarks}
                        onChange={handleInputChange}
                        style={styles.smallInput}
                        min="1"
                        max="1000"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.smallLabel}>Passing Marks:</label>
                      <input
                        type="number"
                        name="passingMarks"
                        value={formData.passingMarks}
                        onChange={handleInputChange}
                        style={styles.smallInput}
                        min="1"
                        max={formData.totalMarks}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Class Selection */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <FiUsers style={styles.labelIcon} />
                Class <span style={styles.required}>*</span>
              </label>
              <select
                name="class"
                value={formData.class}
                onChange={handleInputChange}
                style={styles.select}
                required
              >
                <option value="">Select Class</option>
                {teacherClasses.map((cls, index) => (
                  <option key={cls.id || index} value={cls.id}>
                    {cls.displayName || cls.name}
                  </option>
                ))}
              </select>
              {teacherClasses.length === 0 && user?.role === 'teacher' && (
                <div style={styles.warningText}>
                  <FiAlertCircle size={12} /> No classes assigned. Contact administrator.
                </div>
              )}
              {formData.class && (
                <div style={styles.selectedInfo}>
                  Selected: {getClassName(formData.class)}
                </div>
              )}
            </div>

            {/* Subject Selection */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <FiBook style={styles.labelIcon} />
                Subject <span style={styles.required}>*</span>
              </label>
              <select
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                style={styles.select}
                required
                disabled={!formData.class}
              >
                <option value="">
                  {formData.class ? 'Select Subject' : 'Select Class First'}
                </option>
                {getSubjectsForClass().map((subject, index) => (
                  <option key={subject.id || index} value={subject.name}>
                    {subject.displayName || subject.name}
                  </option>
                ))}
              </select>
              {formData.class && getSubjectsForClass().length === 0 && (
                <div style={styles.warningText}>
                  <FiAlertCircle size={12} /> No subjects available for this class
                </div>
              )}
              {formData.subject && (
                <div style={styles.selectedInfo}>
                  Selected: {formData.subject}
                </div>
              )}
            </div>

            {/* Duration */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                <FiClock style={styles.labelIcon} />
                Duration (minutes) <span style={styles.required}>*</span>
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                style={styles.input}
                min="1"
                max="480"
                required
              />
              <div style={styles.durationHelp}>
                {formData.duration < 30 && 'Quick test'}
                {formData.duration >= 30 && formData.duration < 60 && 'Standard test'}
                {formData.duration >= 60 && formData.duration < 120 && 'Extended test'}
                {formData.duration >= 120 && 'Long test'}
              </div>
            </div>

            {/* Session */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Session</label>
              <div style={styles.readonlyInput}>
                <input
                  type="text"
                  value={activeSession || 'Loading...'}
                  readOnly
                  style={styles.inputReadonly}
                />
                <input type="hidden" name="session" value={activeSession} />
              </div>
            </div>

            {/* Term */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Term</label>
              <div style={styles.readonlyInput}>
                <input
                  type="text"
                  value={activeTerm || 'Loading...'}
                  readOnly
                  style={styles.inputReadonly}
                />
                <input type="hidden" name="term" value={activeTerm} />
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              <FiFileText style={styles.labelIcon} />
              Instructions
            </label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleInputChange}
              style={styles.textarea}
              rows="3"
              placeholder="Enter test instructions for students..."
              maxLength="2000"
            />
            <div style={styles.charCount}>
              {formData.instructions.length}/2000 characters
            </div>
          </div>
        </div>

        {/* Test Settings Section */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>
              <FiSettings style={styles.sectionIcon} />
              Test Settings
            </h3>
            <button
              type="button"
              onClick={toggleAdvancedSettings}
              style={styles.toggleButton}
            >
              {showAdvanced ? (
                <>
                  <FiChevronUp /> Hide Advanced
                </>
              ) : (
                <>
                  <FiChevronDown /> Show Advanced
                </>
              )}
            </button>
          </div>
          
          <div style={styles.settingsGrid}>
            <div style={styles.checkboxGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="randomize"
                  checked={formData.randomize}
                  onChange={handleInputChange}
                  style={styles.checkbox}
                />
                Randomize Question Order
              </label>
              
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="showResults"
                  checked={formData.showResults}
                  onChange={handleInputChange}
                  style={styles.checkbox}
                />
                Show Results Immediately
              </label>
              
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="allowRetakes"
                  checked={formData.allowRetakes}
                  onChange={handleInputChange}
                  style={styles.checkbox}
                />
                Allow Retakes
              </label>
              
              {formData.allowRetakes && (
                <div style={styles.inlineField}>
                  <label style={styles.smallLabel}>Max Attempts:</label>
                  <input
                    type="number"
                    name="maxAttempts"
                    value={formData.maxAttempts}
                    onChange={handleInputChange}
                    style={styles.smallInput}
                    min="1"
                    max="10"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div style={styles.advancedSection}>
              <h4 style={styles.advancedTitle}>Advanced Settings</h4>
              <div style={styles.advancedGrid}>
                <div style={styles.checkboxGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="shuffleQuestions"
                      checked={formData.shuffleQuestions}
                      onChange={handleInputChange}
                      style={styles.checkbox}
                    />
                    Shuffle Questions
                  </label>
                  
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="shuffleOptions"
                      checked={formData.shuffleOptions}
                      onChange={handleInputChange}
                      style={styles.checkbox}
                    />
                    Shuffle Options (MCQ)
                  </label>
                  
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="showProgress"
                      checked={formData.showProgress}
                      onChange={handleInputChange}
                      style={styles.checkbox}
                    />
                    Show Progress Bar
                  </label>
                  
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="allowReview"
                      checked={formData.allowReview}
                      onChange={handleInputChange}
                      style={styles.checkbox}
                    />
                    Allow Review After Submit
                  </label>
                  
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="requireFullScreen"
                      checked={formData.requireFullScreen}
                      onChange={handleInputChange}
                      style={styles.checkbox}
                    />
                    Require Full Screen
                  </label>
                  
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      name="disableCopyPaste"
                      checked={formData.disableCopyPaste}
                      onChange={handleInputChange}
                      style={styles.checkbox}
                    />
                    Disable Copy/Paste
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Test Actions Section */}
        <div style={styles.actionsSection}>
          <div style={styles.actionsHeader}>
            <h3 style={styles.sectionTitle}>
              <BsCardChecklist style={styles.sectionIcon} />
              Test Actions
            </h3>
            <div style={styles.testStats}>
              <div style={styles.statItem}>
                <span>Questions:</span>
                <strong>{formData.questionCount || 0}</strong>
              </div>
              <div style={styles.statItem}>
                <span>Status:</span>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: formData.status === 'draft' ? '#FEF3C7' :
                                  formData.status === 'approved' ? '#D1FAE5' :
                                  formData.status === 'scheduled' ? '#DBEAFE' : '#E5E7EB',
                  color: formData.status === 'draft' ? '#92400E' :
                         formData.status === 'approved' ? '#065F46' :
                         formData.status === 'scheduled' ? '#1E40AF' : '#374151'
                }}>
                  {formData.status || 'draft'}
                </span>
              </div>
              <div style={styles.statItem}>
                <span>Total Marks:</span>
                <strong>{formData.totalMarks}</strong>
              </div>
            </div>
          </div>
          
          <div style={styles.actionsGrid}>
            {/* Save Test Button */}
            <div style={styles.actionCard}>
              <div style={styles.actionIconPrimary}>
                <FiSave size={24} />
              </div>
              <div style={styles.actionContent}>
                <h4 style={styles.actionTitle}>Save Test</h4>
                <p style={styles.actionDescription}>
                  Save the test as a draft. You can add questions later.
                </p>
              </div>
              <button
                type="submit"
                style={styles.actionButtonPrimary}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div style={styles.buttonSpinner}></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <FiSave />
                    {testId ? 'Update Test' : 'Save as Draft'}
                  </>
                )}
              </button>
            </div>

            {/* Save & Add Questions Button */}
            <div style={styles.actionCard}>
              <div style={styles.actionIconSecondary}>
                <FiPlus size={24} />
              </div>
              <div style={styles.actionContent}>
                <h4 style={styles.actionTitle}>Save & Add Questions</h4>
                <p style={styles.actionDescription}>
                  Save test and go directly to add questions page.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveAndAddQuestions}
                style={styles.actionButtonSecondary}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div style={styles.buttonSpinner}></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <FiPlus />
                    Save & Add Questions
                  </>
                )}
              </button>
            </div>

            {/* Add Questions Button (only for existing tests) */}
            {testId && (
              <div style={styles.actionCard}>
                <div style={styles.actionIconAccent}>
                  <BsQuestionCircle size={24} />
                </div>
                <div style={styles.actionContent}>
                  <h4 style={styles.actionTitle}>Manage Questions</h4>
                  <p style={styles.actionDescription}>
                    Add, edit, or remove questions from this test.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleViewQuestions}
                  style={styles.actionButtonAccent}
                >
                  <BsQuestionCircle />
                  {formData.questionCount > 0 ? 'View Questions' : 'Add Questions'}
                </button>
              </div>
            )}

            {/* Preview Test Button */}
            <div style={styles.actionCard}>
              <div style={styles.actionIconInfo}>
                <FiEye size={24} />
              </div>
              <div style={styles.actionContent}>
                <h4 style={styles.actionTitle}>Preview Test</h4>
                <p style={styles.actionDescription}>
                  Preview how the test will appear to students.
                </p>
              </div>
              <button
                type="button"
                onClick={handlePreviewTest}
                style={{
                  ...styles.actionButtonInfo,
                  opacity: !testId ? 0.6 : 1,
                  cursor: !testId ? 'not-allowed' : 'pointer'
                }}
                disabled={!testId}
                title={!testId ? 'Save test first' : 'Preview test'}
              >
                <FiEye />
                Preview
              </button>
            </div>
          </div>
          
          <div style={styles.workflowInfo}>
            <h4 style={styles.workflowTitle}>Test Creation Workflow:</h4>
            <ol style={styles.workflowSteps}>
              <li><strong>Step 1:</strong> Fill in basic test information</li>
              <li><strong>Step 2:</strong> Save test as draft</li>
              <li><strong>Step 3:</strong> Add questions using "Save & Add Questions" or "Manage Questions"</li>
              <li><strong>Step 4:</strong> Preview test to see how it looks</li>
              <li><strong>Step 5:</strong> Submit for approval when ready</li>
            </ol>
            <div style={styles.note}>
              <FiInfo style={styles.noteIcon} />
              <strong>Note:</strong> You need at least 1 question to submit for approval.
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div style={styles.formActions}>
          <button
            type="button"
            onClick={handleCancel}
            style={styles.cancelButton}
            disabled={saving}
          >
            <FiX /> Cancel
          </button>
          <div style={styles.submitButtons}>
            <button
              type="submit"
              style={styles.saveButton}
              disabled={saving}
            >
              {saving ? (
                <>
                  <div style={styles.buttonSpinnerSmall}></div>
                  {testId ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <FiSave />
                  {testId ? 'Update Test' : 'Save as Draft'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSaveAndAddQuestions}
              style={styles.saveAndAddButton}
              disabled={saving}
            >
              <FiPlus />
              {testId ? 'Update & Add Questions' : 'Save & Add Questions'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    color: '#6B7280',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #E5E7EB',
    borderTop: '4px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
  loadingText: {
    fontSize: '14px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid #E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  backButtonSmall: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: '#4B5320',
    border: '1px solid #4B5320',
    padding: '8px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
  },
  titleIcon: {
    fontSize: '32px',
    color: '#4B5320',
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1F2937',
    margin: 0,
  },
  testIdBadge: {
    backgroundColor: '#E5E7EB',
    color: '#6B7280',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  headerSubtitle: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sessionInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#F9FAFB',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    fontSize: '14px',
    color: '#4B5563',
  },
  sessionIcon: {
    fontSize: '16px',
    color: '#4B5320',
  },
  sessionValue: {
    fontWeight: '600',
    color: '#1F2937',
  },
  termBadge: {
    backgroundColor: '#4B5320',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
  },
  refreshSessionButton: {
    background: 'none',
    border: 'none',
    color: '#4B5320',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    fontSize: '13px',
    color: '#6B7280',
  },
  classCount: {
    backgroundColor: '#E0E7FF',
    color: '#3730A3',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
  },
  headerActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  debugButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
    border: '1px solid #D1D5DB',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  cancelButtonHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'transparent',
    color: '#6B7280',
    border: '1px solid #D1D5DB',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  loadingTextSmall: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  alertError: {
    backgroundColor: '#FEF2F2',
    border: '1px solid #FCA5A5',
    color: '#DC2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  alertSuccess: {
    backgroundColor: '#D1FAE5',
    border: '1px solid #6EE7B7',
    color: '#065F46',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  alertIcon: {
    fontSize: '20px',
    flexShrink: 0,
    marginTop: '2px',
  },
  alertContent: {
    flex: 1,
  },
  alertText: {
    display: 'block',
    marginBottom: '8px',
  },
  debugInfo: {
    marginTop: '8px',
    fontSize: '12px',
  },
  debugSummary: {
    cursor: 'pointer',
    color: '#92400E',
    fontWeight: '500',
  },
  debugPre: {
    backgroundColor: '#FFFBEB',
    border: '1px solid #F59E0B',
    borderRadius: '4px',
    padding: '8px',
    marginTop: '4px',
    fontSize: '11px',
    overflow: 'auto',
    maxHeight: '200px',
  },
  alertCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: 'inherit',
    opacity: 0.7,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  section: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #E5E7EB',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1F2937',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sectionIcon: {
    color: '#4B5320',
    fontSize: '18px',
  },
  toggleButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'transparent',
    color: '#4B5320',
    border: '1px solid #4B5320',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  labelIcon: {
    fontSize: '14px',
    color: '#4B5320',
  },
  required: {
    color: '#DC2626',
  },
  warningText: {
    fontSize: '12px',
    color: '#DC2626',
    marginTop: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  selectedInfo: {
    fontSize: '12px',
    color: '#4B5320',
    marginTop: '4px',
    fontStyle: 'italic',
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white',
    transition: 'all 0.2s',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
  },
  smallInput: {
    padding: '8px 10px',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    fontSize: '14px',
    width: '100%',
  },
  readonlyInput: {
    position: 'relative',
  },
  inputReadonly: {
    padding: '10px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
    width: '100%',
    boxSizing: 'border-box',
  },
  marksInfo: {
    fontSize: '12px',
    color: '#4B5320',
    marginTop: '4px',
    display: 'flex',
    gap: '12px',
  },
  customTitleInput: {
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  customMarksInput: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginTop: '10px',
  },
  durationHelp: {
    fontSize: '12px',
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: '4px',
  },
  textarea: {
    padding: '12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    minHeight: '80px',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: '1.5',
  },
  charCount: {
    textAlign: 'right',
    fontSize: '12px',
    color: '#9CA3AF',
    marginTop: '4px',
  },
  settingsGrid: {
    marginBottom: '20px',
  },
  advancedSection: {
    backgroundColor: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '16px',
  },
  advancedTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    margin: '0 0 12px 0',
  },
  advancedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '12px',
  },
  checkboxGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    alignItems: 'center',
  },
  inlineField: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: '8px',
  },
  smallLabel: {
    fontSize: '14px',
    color: '#374151',
    marginBottom: '4px',
    display: 'block',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
    userSelect: 'none',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    accentColor: '#4B5320',
  },
  actionsSection: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #E5E7EB',
  },
  actionsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  testStats: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#4B5563',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  actionCard: {
    backgroundColor: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '16px',
    transition: 'all 0.2s',
  },
  actionIconPrimary: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#4B5320',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  actionIconSecondary: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#D4A017',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  actionIconAccent: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#2c3e50',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  actionIconInfo: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#64748B',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1F2937',
    margin: '0 0 8px 0',
  },
  actionDescription: {
    fontSize: '14px',
    color: '#6B7280',
    lineHeight: '1.5',
    margin: 0,
  },
  actionButtonPrimary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    width: '100%',
    transition: 'all 0.2s',
  },
  actionButtonSecondary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: '#D4A017',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    width: '100%',
    transition: 'all 0.2s',
  },
  actionButtonAccent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: '#2c3e50',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    width: '100%',
    transition: 'all 0.2s',
  },
  actionButtonInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    backgroundColor: '#64748B',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    width: '100%',
    transition: 'all 0.2s',
  },
  workflowInfo: {
    backgroundColor: '#F0F7E6',
    border: '1px solid #4B5320',
    borderRadius: '8px',
    padding: '20px',
    marginTop: '20px',
  },
  workflowTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 12px 0',
  },
  workflowSteps: {
    margin: 0,
    paddingLeft: '20px',
    color: '#374151',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  note: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#FFFBEB',
    border: '1px solid #F59E0B',
    borderRadius: '6px',
    padding: '12px',
    marginTop: '16px',
    fontSize: '13px',
    color: '#92400E',
  },
  noteIcon: {
    fontSize: '16px',
    flexShrink: 0,
  },
  formActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '24px',
    borderTop: '1px solid #E5E7EB',
  },
  cancelButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'transparent',
    color: '#6B7280',
    border: '1px solid #D1D5DB',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  submitButtons: {
    display: 'flex',
    gap: '12px',
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s',
    minWidth: '150px',
    justifyContent: 'center',
  },
  saveAndAddButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#D4A017',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s',
    minWidth: '200px',
    justifyContent: 'center',
  },
  buttonSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  buttonSpinnerSmall: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

export default TestCreation;