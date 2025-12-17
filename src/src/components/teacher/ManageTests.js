import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useTeacherData from '../../hooks/useTeacherData';
import api from '../../api/axios';
import { 
  FiEdit2, 
  FiPlusCircle, 
  FiTrash2, 
  FiBook, 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiAward, 
  FiRefreshCw,
  FiClock,
  FiUsers,
  FiCalendar,
  FiList,
  FiFileText,
  FiPlayCircle,
  FiCheck,
  FiEye,
  FiLock
} from 'react-icons/fi';

const ManageTests = () => {
  const { tests: initialTests, fetchTests, error, success, setError, setSuccess, navigate } = useTeacherData();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [classes, setClasses] = useState({});
  const [subjects, setSubjects] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  // Sync with hook data
  useEffect(() => {
    setTests(initialTests);
    // Fetch assignments and class/subject names when tests are loaded
    if (initialTests.length > 0) {
      fetchAssignments();
      fetchClassAndSubjectNames();
    }
  }, [initialTests]);

  // Debug: Log test data structure
  useEffect(() => {
    if (initialTests.length > 0) {
      console.log('Test data sample:', initialTests[0]);
      console.log('Class value:', initialTests[0].class, 'Type:', typeof initialTests[0].class, 'Is ObjectId?', initialTests[0].class && /^[0-9a-fA-F]{24}$/.test(initialTests[0].class));
      console.log('Subject value:', initialTests[0].subject, 'Type:', typeof initialTests[0].subject, 'Is ObjectId?', initialTests[0].subject && /^[0-9a-fA-F]{24}$/.test(initialTests[0].subject));
    }
  }, [initialTests]);

  // Fetch teacher's assignments
  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const teacherId = user?.id || user?._id;
      
      if (!teacherId) return;

      const response = await api.get(`/api/users/teachers/${teacherId}/assignments`);
      console.log('Assignments response:', response.data);
      
      if (response.data.success && response.data.assignments) {
        setAssignments(response.data.assignments || []);
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
    }
  };

  // Fetch class and subject names for ObjectIds - SIMPLIFIED DEBUG VERSION
  const fetchClassAndSubjectNames = async () => {
    try {
      setIsFetchingDetails(true);
      const classMap = {};
      const subjectMap = {};

      // Extract all unique classes and subjects from tests
      const uniqueClasses = [...new Set(initialTests
        .filter(test => test.class)
        .map(test => test.class))];

      const uniqueSubjects = [...new Set(initialTests
        .filter(test => test.subject)
        .map(test => test.subject))];

      console.log('=== DEBUG: Fetching class/subject names ===');
      console.log('Unique classes:', uniqueClasses);
      console.log('Unique subjects:', uniqueSubjects);

      // Try multiple approaches to get class names
      for (const classId of uniqueClasses) {
        // Check if it's an ObjectId
        const isObjectId = typeof classId === 'string' && /^[0-9a-fA-F]{24}$/.test(classId);
        
        if (isObjectId) {
          console.log(`Fetching class name for ObjectId: ${classId}`);
          
          // APPROACH 1: Try standard API endpoint
          try {
            const response = await api.get(`/api/classes/${classId}`);
            console.log(`API response for class ${classId}:`, response.data);
            if (response.data) {
              // Try different possible response structures
              if (response.data.name) {
                classMap[classId] = response.data.name;
                console.log(`Found class name via /api/classes/: ${response.data.name}`);
              } else if (response.data.className) {
                classMap[classId] = response.data.className;
                console.log(`Found class name via className: ${response.data.className}`);
              } else if (response.data.class) {
                classMap[classId] = response.data.class.name || response.data.class;
                console.log(`Found class name via class object: ${classMap[classId]}`);
              } else if (response.data.data?.name) {
                classMap[classId] = response.data.data.name;
                console.log(`Found class name via data.name: ${response.data.data.name}`);
              } else {
                console.log(`No name found in response for class ${classId}`);
                classMap[classId] = 'Unknown Class';
              }
            }
          } catch (err) {
            console.error(`Error with /api/classes/${classId}:`, err.response?.data || err.message);
            
            // APPROACH 2: Try alternative endpoint
            try {
              const response2 = await api.get(`/api/class/${classId}`);
              console.log(`Alternative API response for class ${classId}:`, response2.data);
              if (response2.data && response2.data.name) {
                classMap[classId] = response2.data.name;
                console.log(`Found via alternative endpoint: ${response2.data.name}`);
              }
            } catch (err2) {
              console.error(`Error with /api/class/${classId}:`, err2.message);
              
              // APPROACH 3: Check assignments for this class
              const assignmentWithClass = assignments.find(a => 
                (a.class && a.class._id === classId) || 
                (a.classId === classId) ||
                (a.class && typeof a.class === 'string' && a.class === classId)
              );
              
              if (assignmentWithClass) {
                if (assignmentWithClass.class && typeof assignmentWithClass.class === 'object') {
                  classMap[classId] = assignmentWithClass.class.name || 'Class from Assignment';
                  console.log(`Found in assignments: ${classMap[classId]}`);
                } else if (assignmentWithClass.className) {
                  classMap[classId] = assignmentWithClass.className;
                  console.log(`Found via className in assignments: ${assignmentWithClass.className}`);
                }
              }
              
              // If still not found, mark as unknown
              if (!classMap[classId]) {
                classMap[classId] = 'Unknown Class';
                console.log(`Could not find name for class ${classId}`);
              }
            }
          }
        } else {
          // Not an ObjectId, use string directly
          classMap[classId] = String(classId);
          console.log(`Using string class directly: ${classId}`);
        }
      }

      // Try multiple approaches to get subject names
      for (const subjectId of uniqueSubjects) {
        // Check if it's an ObjectId
        const isObjectId = typeof subjectId === 'string' && /^[0-9a-fA-F]{24}$/.test(subjectId);
        
        if (isObjectId) {
          console.log(`Fetching subject name for ObjectId: ${subjectId}`);
          
          // APPROACH 1: Try standard API endpoint
          try {
            const response = await api.get(`/api/subjects/${subjectId}`);
            console.log(`API response for subject ${subjectId}:`, response.data);
            if (response.data) {
              // Try different possible response structures
              if (response.data.name) {
                subjectMap[subjectId] = response.data.name;
                console.log(`Found subject name via /api/subjects/: ${response.data.name}`);
              } else if (response.data.subjectName) {
                subjectMap[subjectId] = response.data.subjectName;
                console.log(`Found subject name via subjectName: ${response.data.subjectName}`);
              } else if (response.data.subject) {
                subjectMap[subjectId] = response.data.subject.name || response.data.subject;
                console.log(`Found subject name via subject object: ${subjectMap[subjectId]}`);
              } else if (response.data.data?.name) {
                subjectMap[subjectId] = response.data.data.name;
                console.log(`Found subject name via data.name: ${response.data.data.name}`);
              } else {
                console.log(`No name found in response for subject ${subjectId}`);
                subjectMap[subjectId] = 'Unknown Subject';
              }
            }
          } catch (err) {
            console.error(`Error with /api/subjects/${subjectId}:`, err.response?.data || err.message);
            
            // APPROACH 2: Try alternative endpoint
            try {
              const response2 = await api.get(`/api/subject/${subjectId}`);
              console.log(`Alternative API response for subject ${subjectId}:`, response2.data);
              if (response2.data && response2.data.name) {
                subjectMap[subjectId] = response2.data.name;
                console.log(`Found via alternative endpoint: ${response2.data.name}`);
              }
            } catch (err2) {
              console.error(`Error with /api/subject/${subjectId}:`, err2.message);
              
              // APPROACH 3: Check assignments for this subject
              for (const assignment of assignments) {
                if (assignment.subjects && Array.isArray(assignment.subjects)) {
                  const subjectInAssignment = assignment.subjects.find(s => 
                    (s._id === subjectId) || 
                    (s.id === subjectId) ||
                    (typeof s === 'string' && s === subjectId)
                  );
                  
                  if (subjectInAssignment) {
                    if (typeof subjectInAssignment === 'object') {
                      subjectMap[subjectId] = subjectInAssignment.name || 'Subject from Assignment';
                      console.log(`Found in assignments: ${subjectMap[subjectId]}`);
                      break;
                    } else if (typeof subjectInAssignment === 'string') {
                      subjectMap[subjectId] = subjectInAssignment;
                      console.log(`Found string subject in assignments: ${subjectInAssignment}`);
                      break;
                    }
                  }
                }
              }
              
              // If still not found, mark as unknown
              if (!subjectMap[subjectId]) {
                subjectMap[subjectId] = 'Unknown Subject';
                console.log(`Could not find name for subject ${subjectId}`);
              }
            }
          }
        } else {
          // Not an ObjectId, use string directly
          subjectMap[subjectId] = String(subjectId);
          console.log(`Using string subject directly: ${subjectId}`);
        }
      }

      console.log('=== DEBUG: Final class map ===', classMap);
      console.log('=== DEBUG: Final subject map ===', subjectMap);

      setClasses(classMap);
      setSubjects(subjectMap);

    } catch (err) {
      console.error('Error fetching class/subject names:', err);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  // Helper function to get class name - SIMPLIFIED
  const getClassName = (classId) => {
    if (!classId) return 'No Class';
    
    console.log('getClassName called with:', classId, 'Type:', typeof classId);
    
    // Check if we have it cached
    if (classes[classId]) {
      console.log('Found in cache:', classes[classId]);
      return classes[classId];
    }
    
    // Check if it's an ObjectId
    const isObjectId = typeof classId === 'string' && /^[0-9a-fA-F]{24}$/.test(classId);
    
    if (isObjectId) {
      // Trigger fetch if not already fetching
      if (!isFetchingDetails) {
        console.log('Triggering fetch for class:', classId);
        setTimeout(() => fetchClassAndSubjectNames(), 100);
      }
      return 'Loading...';
    } else {
      // Not an ObjectId, just return as string
      return String(classId);
    }
  };

  // Helper function to get subject name - SIMPLIFIED
  const getSubjectName = (subjectId) => {
    if (!subjectId) return 'No Subject';
    
    console.log('getSubjectName called with:', subjectId, 'Type:', typeof subjectId);
    
    // Check if we have it cached
    if (subjects[subjectId]) {
      console.log('Found in cache:', subjects[subjectId]);
      return subjects[subjectId];
    }
    
    // Check if it's an ObjectId
    const isObjectId = typeof subjectId === 'string' && /^[0-9a-fA-F]{24}$/.test(subjectId);
    
    if (isObjectId) {
      // Trigger fetch if not already fetching
      if (!isFetchingDetails) {
        console.log('Triggering fetch for subject:', subjectId);
        setTimeout(() => fetchClassAndSubjectNames(), 100);
      }
      return 'Loading...';
    } else {
      // Not an ObjectId, just return as string
      return String(subjectId);
    }
  };

  // ... rest of your component remains the same (checkTestRequirements, handleEditTest, etc.)

  // Check test validation before navigation
  const checkTestRequirements = (test) => {
    if (!test.subject || !test.class) {
      return 'Test is missing subject or class information. Please edit the test first.';
    }
    if (!test.questionCount || test.questionCount < 1) {
      return 'Test must have at least 1 question required. Please edit the test first.';
    }
    return null;
  };

  const handleEditTest = (testId) => {
    if (!testId) {
      console.error('Edit test error: No testId provided');
      setError('Invalid test ID.');
      return;
    }
    navigate(`/teacher/test-creation/${testId}`);
  };

  const handleAddQuestions = (testId, test) => {
    if (!testId) {
      console.error('Add questions error: No testId provided');
      setError('Invalid test ID.');
      return;
    }
    
    const validationError = checkTestRequirements(test);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    if (test.status === 'approved') {
      setError('Cannot edit questions for an approved test. Please contact admin.');
      return;
    }
    
    if (test.questions && test.questions.length > 0) {
      if (!window.confirm(`This test already has ${test.questions.length} questions. Do you want to replace them?`)) {
        return;
      }
    }
    
    navigate(`/teacher/add-test-questions/${testId}`);
  };

  const handleViewTest = (testId) => {
    if (!testId) {
      console.error('View test error: No testId provided');
      setError('Invalid test ID.');
      return;
    }
    navigate(`/teacher/test-view/${testId}`);
  };

  const handleDeleteTest = async (id, status) => {
    if (status === 'approved') {
      setError('Cannot delete an approved test.');
      return;
    }
    
    if (status !== 'draft') {
      setError('Cannot delete a test that is scheduled or completed.');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this test? This action cannot be undone.')) return;
    
    setDeletingId(id);
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await api.delete(`/api/tests/${id}`);
      setSuccess('Test deleted successfully.');
      fetchTests();
      fetchAssignments();
      fetchClassAndSubjectNames();
    } catch (err) {
      console.error('Delete test error:', err.response?.data || err.message);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError(err.response?.data?.error || 'Failed to delete test. Please try again.');
      }
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  };

  const handleRefresh = () => {
    setError(null);
    setSuccess(null);
    fetchTests();
    fetchAssignments();
    fetchClassAndSubjectNames();
  };

  // Enhanced status badge that includes approved status
  const getStatusBadge = (batches, status) => {
    // Check if test is approved
    if (status === 'approved') {
      return { 
        text: 'Approved', 
        color: '#059669', 
        bgColor: '#D1FAE5', 
        icon: FiCheck,
        description: 'Approved by admin'
      };
    }
    
    if (!batches || !Array.isArray(batches) || batches.length === 0) {
      return { 
        text: 'Draft', 
        color: '#718096', 
        bgColor: '#EDF2F7', 
        icon: FiBook,
        description: 'Test is in draft mode'
      };
    }
    
    const now = new Date();
    const isActive = batches.some(batch => {
      if (!batch.schedule || !batch.schedule.start || !batch.schedule.end) return false;
      const start = new Date(batch.schedule.start);
      const end = new Date(batch.schedule.end);
      return now >= start && now <= end;
    });
    
    const isUpcoming = batches.some(batch => {
      if (!batch.schedule || !batch.schedule.start) return false;
      return new Date(batch.schedule.start) > now;
    });
    
    const isCompleted = batches.some(batch => {
      if (!batch.schedule || !batch.schedule.end) return false;
      return new Date(batch.schedule.end) < now;
    });
    
    if (isActive) {
      return { 
        text: 'Active', 
        color: '#28a745', 
        bgColor: '#d4edda', 
        icon: FiClock,
        description: 'Test is currently active'
      };
    } else if (isUpcoming) {
      return { 
        text: 'Scheduled', 
        color: '#007bff', 
        bgColor: '#cce5ff', 
        icon: FiCalendar,
        description: 'Test is scheduled for future'
      };
    } else if (isCompleted) {
      return { 
        text: 'Completed', 
        color: '#6c757d', 
        bgColor: '#e2e3e5', 
        icon: FiCheckCircle,
        description: 'Test has been completed'
      };
    } else {
      return { 
        text: status?.charAt(0).toUpperCase() + status?.slice(1) || 'Draft', 
        color: '#718096', 
        bgColor: '#EDF2F7', 
        icon: FiBook,
        description: 'Test is in draft mode'
      };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return '';
    }
  };

  // Calculate statistics including approved tests
  const calculateStats = () => {
    const total = tests.length;
    const approved = tests.filter(t => t.status === 'approved').length;
    const scheduled = tests.filter(t => getStatusBadge(t.batches, t.status).text === 'Scheduled').length;
    const active = tests.filter(t => getStatusBadge(t.batches, t.status).text === 'Active').length;
    const completed = tests.filter(t => getStatusBadge(t.batches, t.status).text === 'Completed').length;
    const draft = total - approved - scheduled - active - completed;
    
    return { total, approved, scheduled, active, completed, draft };
  };

  const stats = calculateStats();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.headerTitle}>Manage Tests</h2>
          <p style={styles.headerSubtitle}>View and manage all your created tests</p>
        </div>
        <div style={styles.headerActions}>
          <button 
            onClick={() => navigate('/teacher/test-creation')} 
            style={styles.createTestButton}
          >
            <FiPlusCircle style={styles.buttonIcon} />
            Create New Test
          </button>
          <button onClick={handleRefresh} style={styles.refreshButton}>
            <FiRefreshCw style={styles.buttonIcon} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={styles.alertError}>
          <FiAlertTriangle style={styles.alertIcon} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div style={styles.alertSuccess}>
          <FiCheckCircle style={styles.alertIcon} />
          <span>{success}</span>
        </div>
      )}

      {/* Enhanced Statistics with Approved count */}
      <div style={styles.statsContainer}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}><FiBook /></div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{stats.total}</div>
            <div style={styles.statLabel}>Total Tests</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, backgroundColor: '#D1FAE5', color: '#059669'}}>
            <FiCheck />
          </div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{stats.approved}</div>
            <div style={styles.statLabel}>Approved</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, backgroundColor: '#cce5ff', color: '#007bff'}}>
            <FiCalendar />
          </div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{stats.scheduled}</div>
            <div style={styles.statLabel}>Scheduled</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{...styles.statIcon, backgroundColor: '#d4edda', color: '#28a745'}}>
            <FiClock />
          </div>
          <div style={styles.statContent}>
            <div style={styles.statNumber}>{stats.active}</div>
            <div style={styles.statLabel}>Active</div>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        {loading && !deletingId ? (
          <div style={styles.loading}>Loading Tests...</div>
        ) : tests.length === 0 ? (
          <div style={styles.emptyState}>
            <FiBook style={styles.emptyIcon} />
            <h3 style={styles.emptyTitle}>No Tests Found</h3>
            <p style={styles.emptyText}>Create your first test to get started</p>
            <button onClick={() => navigate('/teacher/test-creation')} style={styles.createButton}>
              <FiPlusCircle style={styles.buttonIcon} />
              Create New Test
            </button>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Test Title</th>
                  <th style={styles.tableHeader}>Subject & Class</th>
                  <th style={styles.tableHeader}>Schedule</th>
                  <th style={styles.tableHeader}>Status</th>
                  <th style={styles.tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tests.map(test => {
                  const status = getStatusBadge(test.batches, test.status);
                  const StatusIcon = status.icon;
                  const isApproved = test.status === 'approved';
                  
                  const firstBatch = test.batches && test.batches.length > 0 ? test.batches[0] : null;
                  
                  const isReadyForQuestions = !isApproved && test.subject && test.class && test.questionCount > 0;
                  const hasQuestions = test.questions && test.questions.length > 0;
                  const isTestComplete = hasQuestions && test.questions.length >= test.questionCount;
                  
                  return (
                    <tr key={test._id} style={styles.tableRow}>
                      <td style={styles.tableCell}>
                        <div style={styles.testTitle}>
                          {test.title}
                          {isApproved && (
                            <span style={styles.approvedTag}>
                              <FiCheck size={12} /> Approved
                            </span>
                          )}
                        </div>
                        <div style={styles.testMeta}>
                          <span style={styles.testSession}>{test.session || 'No Session'}</span>
                          {test.duration && (
                            <span style={styles.testDuration}> • {test.duration} mins</span>
                          )}
                          <div style={styles.questionInfo}>
                            <FiFileText style={styles.smallIcon} />
                            {hasQuestions ? `${test.questions.length}/${test.questionCount} questions` : 'No questions added'}
                            {isTestComplete && (
                              <span style={styles.completeBadge}>✓ Complete</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={styles.subjectClassInfo}>
                          <span style={styles.subjectBadge}>{getSubjectName(test.subject)}</span>
                          <span style={styles.classBadge}>{getClassName(test.class)}</span>
                        </div>
                        {test.questionCount > 0 && (
                          <div style={styles.questionCount}>
                            {test.questionCount} questions required • {test.totalMarks || 0} marks total
                          </div>
                        )}
                      </td>
                      <td style={styles.tableCell}>
                        {firstBatch && firstBatch.schedule ? (
                          <div style={styles.scheduleInfo}>
                            <div style={styles.scheduleDate}>
                              {formatDate(firstBatch.schedule.start)}
                            </div>
                            <div style={styles.scheduleTime}>
                              {formatTime(firstBatch.schedule.start)} - {formatTime(firstBatch.schedule.end)}
                            </div>
                            {test.batches.length > 1 && (
                              <div style={styles.additionalBatches}>
                                +{test.batches.length - 1} more batch{test.batches.length > 2 ? 'es' : ''}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={styles.noSchedule}>Not scheduled</span>
                        )}
                      </td>
                      <td style={styles.tableCell}>
                        <div style={{...styles.statusBadge, backgroundColor: status.bgColor, color: status.color }}>
                          <StatusIcon style={styles.statusIcon} />
                          <span>{status.text}</span>
                        </div>
                        <div style={styles.statusDescription}>{status.description}</div>
                        {firstBatch && firstBatch.students && (
                          <div style={styles.studentCount}>
                            <FiUsers style={styles.smallIcon} />
                            {firstBatch.students.length} students
                          </div>
                        )}
                      </td>
                      <td style={styles.tableCell}>
                        <div style={styles.actionButtons}>
                          {!isApproved && (
                            <button
                              onClick={() => handleEditTest(test._id)}
                              style={styles.editButton}
                              title="Edit Test"
                            >
                              <FiEdit2 />
                            </button>
                          )}
                          
                          {isReadyForQuestions && (
                            <button
                              onClick={() => handleAddQuestions(test._id, test)}
                              style={{
                                ...styles.questionsButton,
                                backgroundColor: hasQuestions ? '#D4A017' : '#4B5320'
                              }}
                              title={hasQuestions ? "Edit Questions" : "Add Questions"}
                            >
                              <FiList />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleViewTest(test._id)}
                            style={styles.viewButton}
                            title="View Test"
                          >
                            <FiEye />
                          </button>
                          
                          <Link
                            to={`/teacher/test-results/${test._id}`}
                            style={styles.resultsButton}
                            title="View Results"
                          >
                            <FiAward />
                          </Link>
                          
                          {!isApproved && test.status === 'draft' && (
                            <button
                              onClick={() => handleDeleteTest(test._id, test.status)}
                              disabled={loading && deletingId === test._id}
                              style={styles.deleteButton}
                              title="Delete Test"
                            >
                              <FiTrash2 />
                            </button>
                          )}
                          
                          {isApproved && (
                            <div style={styles.lockIcon} title="Approved - Cannot edit">
                              <FiLock />
                            </div>
                          )}
                        </div>
                        <div style={styles.createdDate}>
                          Created: {formatDate(test.createdAt)}
                        </div>
                        {!isReadyForQuestions && test.status === 'draft' && (
                          <div style={styles.warningText}>
                            ⚠️ Needs subject/class
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Show teacher's assignments if available */}
      {assignments.length > 0 && (
        <div style={styles.assignmentsSection}>
          <h4 style={styles.assignmentsTitle}>Your Teaching Assignments</h4>
          <div style={styles.assignmentsList}>
            {assignments.map((assignment, index) => (
              <div key={index} style={styles.assignmentChip}>
                <span style={styles.assignmentClass}>
                  {typeof assignment.class === 'object' 
                    ? assignment.class.name 
                    : assignment.className || 'Class'}
                </span>
                {assignment.subjects?.length > 0 && (
                  <span style={styles.assignmentSubjects}>
                    • {assignment.subjects.map(s => s.name).join(', ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ... styles remain the same ...

const styles = {
  container: {
    fontFamily: 'sans-serif',
    backgroundColor: '#f8f9fa',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  headerTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0 0 5px 0',
    color: '#4B5320',
  },
  headerSubtitle: {
    fontSize: '16px',
    margin: '0',
    color: '#666',
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  createTestButton: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  },
  refreshButton: {
    backgroundColor: '#D4A017',
    color: '#000000',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  },
  alertError: {
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    borderLeft: '4px solid #B22222',
    padding: '15px',
    marginBottom: '25px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  alertSuccess: {
    backgroundColor: '#d4edda',
    color: '#155724',
    borderLeft: '4px solid #28a745',
    padding: '15px',
    marginBottom: '25px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  alertIcon: {
    fontSize: '20px',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  statIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '8px',
    backgroundColor: '#EDF2F7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#4B5320',
  },
  statContent: {
    flex: 1,
  },
  statNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#4B5320',
    marginBottom: '5px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '25px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#4B5320',
    fontSize: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '4rem',
    color: '#D4A017',
    marginBottom: '1rem',
  },
  emptyTitle: {
    color: '#4B5320',
    fontSize: '1.5rem',
    margin: '0 0 0.5rem',
  },
  emptyText: {
    color: '#666',
    fontSize: '1rem',
    margin: '0 0 1.5rem',
  },
  createButton: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '0 auto',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    padding: '15px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '14px',
  },
  tableRow: {
    borderBottom: '1px solid #E0E0E0',
    transition: 'background-color 0.2s ease',
  },
  tableRowHover: {
    backgroundColor: '#f8f9fa',
  },
  tableCell: {
    padding: '15px',
    verticalAlign: 'top',
  },
  testTitle: {
    fontWeight: '600',
    color: '#4B5320',
    marginBottom: '5px',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  approvedTag: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  testMeta: {
    fontSize: '14px',
    color: '#718096',
  },
  testSession: {
    fontWeight: '500',
  },
  testDuration: {
    color: '#666',
  },
  questionInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '5px',
    fontSize: '12px',
    color: '#4B5320',
  },
  completeBadge: {
    backgroundColor: '#d4edda',
    color: '#28a745',
    padding: '2px 6px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '600',
  },
  subjectClassInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    marginBottom: '8px',
  },
  subjectBadge: {
    backgroundColor: '#E6FFFA',
    color: '#234E52',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    display: 'inline-block',
    width: 'fit-content',
  },
  classBadge: {
    backgroundColor: '#EBF8FF',
    color: '#2C5282',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    display: 'inline-block',
    width: 'fit-content',
  },
  questionCount: {
    fontSize: '13px',
    color: '#718096',
    marginTop: '5px',
  },
  scheduleInfo: {
    fontSize: '14px',
  },
  scheduleDate: {
    fontWeight: '500',
    color: '#4B5320',
    marginBottom: '2px',
  },
  scheduleTime: {
    color: '#666',
    fontSize: '13px',
    marginBottom: '5px',
  },
  additionalBatches: {
    fontSize: '12px',
    color: '#D4A017',
    fontWeight: '500',
  },
  noSchedule: {
    fontSize: '14px',
    color: '#718096',
    fontStyle: 'italic',
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    marginBottom: '5px',
  },
  statusIcon: {
    fontSize: '14px',
  },
  statusDescription: {
    fontSize: '11px',
    color: '#94A3B8',
    marginTop: '2px',
  },
  studentCount: {
    fontSize: '12px',
    color: '#718096',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '4px',
  },
  smallIcon: {
    fontSize: '12px',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  editButton: {
    backgroundColor: '#D4A017',
    color: '#4B5320',
    border: 'none',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    transition: 'all 0.3s ease',
  },
  questionsButton: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    transition: 'all 0.3s ease',
  },
  viewButton: {
    backgroundColor: '#007bff',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    transition: 'all 0.3s ease',
  },
  resultsButton: {
    backgroundColor: '#28a745',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
  },
  deleteButton: {
    backgroundColor: '#B22222',
    color: '#FFFFFF',
    border: 'none',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    transition: 'all 0.3s ease',
  },
  lockIcon: {
    padding: '8px',
    color: '#059669',
    opacity: 0.8,
  },
  createdDate: {
    fontSize: '12px',
    color: '#718096',
    fontStyle: 'italic',
  },
  warningText: {
    fontSize: '10px',
    color: '#D4A017',
    marginTop: '4px',
    fontWeight: '600',
  },
  buttonIcon: {
    fontSize: '16px',
  },
  assignmentsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '20px',
    marginTop: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  assignmentsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 15px 0',
  },
  assignmentsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  assignmentChip: {
    backgroundColor: '#F1F5F9',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    color: '#475569',
  },
  assignmentClass: {
    fontWeight: '600',
    color: '#4B5320',
    marginRight: '8px',
  },
  assignmentSubjects: {
    fontSize: '13px',
    color: '#64748B',
  },
};

export default ManageTests;