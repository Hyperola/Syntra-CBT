import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

// Army Green color palette
const ARMY_GREEN = '#4B5320'; // Primary Army Green
const ARMY_GREEN_DARK = '#3A4422'; // Darker shade for hover
const ARMY_GREEN_LIGHT = '#6B7A30'; // Lighter shade
const ARMY_GREEN_BG = '#F8F9F0'; // Light background
const SUCCESS_GREEN = '#27AE60';
const WARNING_ORANGE = '#F39C12';
const ERROR_RED = '#B22222';
const TEXT_DARK = '#2C3E50';
const TEXT_MEDIUM = '#7F8C8D';
const TEXT_LIGHT = '#E8E8E8';
const WHITE = '#FFFFFF';

const Tests = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [activeTab, setActiveTab] = useState('available');
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [submissionStatus, setSubmissionStatus] = useState({});
  const [submissionDetails, setSubmissionDetails] = useState({});
  const [forceRefresh, setForceRefresh] = useState(0);
  const [allClassesData, setAllClassesData] = useState([]); // Store all class data

  // Helper function to compare IDs
  const compareIds = (id1, id2) => {
    if (!id1 || !id2) return false;
    return id1.toString() === id2.toString();
  };

  // Helper function to get class name from test
  const getClassName = (test) => {
    if (!test.class) return 'No Class';
    
    console.log('Getting class name for test:', {
      testId: test._id,
      classValue: test.class,
      type: typeof test.class
    });
    
    // If class is an object with name property
    if (typeof test.class === 'object' && test.class !== null) {
      const className = test.class.name || test.class._id || 'Unknown Class';
      console.log('Class is object, name:', className);
      return className;
    }
    
    // If class is a string
    if (typeof test.class === 'string') {
      // Check if it's an ObjectId (24 hex characters)
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(test.class);
      if (isObjectId) {
        // Try to find class name from allClassesData
        const foundClass = allClassesData.find(c => 
          compareIds(c._id, test.class) || compareIds(c.id, test.class)
        );
        const className = foundClass ? foundClass.name : test.class;
        console.log('Class is ObjectId, found:', foundClass, 'name:', className);
        return className;
      }
      // If not ObjectId, assume it's already a class name
      console.log('Class is string name:', test.class);
      return test.class;
    }
    
    console.log('Unknown class type, returning default');
    return 'Unknown Class';
  };

  // Helper function to get class ID for filtering
  const getClassId = (test) => {
    if (!test.class) return null;
    
    if (typeof test.class === 'object' && test.class !== null) {
      return test.class._id || test.class;
    }
    
    return test.class;
  };

  // Fetch all classes from API
  const fetchAllClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/classes', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAllClassesData(data.classes || []);
        console.log('Fetched classes:', data.classes);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  // Fetch all tests and submissions
  useEffect(() => {
    if (!user || user.role !== 'student') return;

    const fetchAllTests = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again.');
        toast.error('Please login again.', { position: 'top-right', autoClose: 5000 });
        setLoading(false);
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First fetch all classes
        await fetchAllClasses();

        // Fetch all tests
        const testsRes = await fetch('http://localhost:5000/api/tests', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });

        if (!testsRes.ok) {
          const errorData = await testsRes.json();
          throw new Error(errorData.error || 'Failed to fetch tests');
        }

        const testsData = await testsRes.json();
        
        // Handle different response formats
        let allTests = [];
        if (Array.isArray(testsData)) {
          allTests = testsData;
        } else if (testsData.tests && Array.isArray(testsData.tests)) {
          allTests = testsData.tests;
        } else if (testsData.success && testsData.tests && Array.isArray(testsData.tests)) {
          allTests = testsData.tests;
        }

        console.log('Raw tests data:', allTests);

        // Fetch student's submissions
        let submissions = [];
        const studentId = user.userId || user._id;
        
        // Try different submission endpoints
        const submissionEndpoints = [
          'http://localhost:5000/api/submissions/student',
          `http://localhost:5000/api/submissions/student/${studentId}`,
          'http://localhost:5000/api/submissions'
        ];

        for (const endpoint of submissionEndpoints) {
          try {
            const submissionsRes = await fetch(endpoint, {
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
            });
            
            if (submissionsRes.ok) {
              const submissionsData = await submissionsRes.json();
              
              if (Array.isArray(submissionsData)) {
                submissions = submissionsData;
                break;
              } else if (submissionsData.submissions && Array.isArray(submissionsData.submissions)) {
                submissions = submissionsData.submissions;
                break;
              } else if (submissionsData.success && submissionsData.submissions && Array.isArray(submissionsData.submissions)) {
                submissions = submissionsData.submissions;
                break;
              }
            }
          } catch (submissionErr) {
            // Silently continue to next endpoint
          }
        }

        // Create submission status map and details map
        const statusMap = {};
        const detailsMap = {};
        
        submissions.forEach(submission => {
          if (submission.testId) {
            const testId = submission.testId._id || submission.testId;
            statusMap[testId] = submission.status || 'submitted';
            detailsMap[testId] = {
              submittedAt: submission.submittedAt,
              score: submission.score,
              totalMarks: submission.totalMarks,
              percentage: submission.percentage
            };
          }
        });
        
        setSubmissionStatus(statusMap);
        setSubmissionDetails(detailsMap);

        // Filter tests for current student
        const studentTests = allTests.filter(test => {
          // Check if student is in any batch of this test
          const studentBatch = test.batches?.find(batch => {
            if (!batch.students || !Array.isArray(batch.students)) {
              return false;
            }
            
            return batch.students.some(student => {
              if (typeof student === 'object') {
                return compareIds(student._id, studentId) || compareIds(student.id, studentId);
              } else {
                return compareIds(student, studentId);
              }
            });
          });
          
          return !!studentBatch;
        });

        // Set all tests
        setTests(studentTests);
        console.log('Student tests after filtering:', studentTests);

        // Extract unique subjects and classes using helper functions
        const uniqueSubjects = [...new Set(studentTests.map(test => test.subject).filter(Boolean))];
        
        // Use getClassName to extract proper class names
        const classNames = studentTests.map(test => {
          const className = getClassName(test);
          console.log(`Test ${test._id} - class:`, test.class, '-> name:', className);
          return className;
        }).filter(Boolean);
        const uniqueClasses = [...new Set(classNames)];
        
        console.log('Unique subjects:', uniqueSubjects);
        console.log('Unique classes:', uniqueClasses);
        
        setSubjects(uniqueSubjects);
        setClasses(uniqueClasses);

        setLoading(false);
      } catch (err) {
        setError(err.message);
        toast.error(err.message || 'Failed to load tests', { 
          position: 'top-right', 
          autoClose: 5000 
        });
        setLoading(false);
      }
    };

    fetchAllTests();
  }, [user, navigate, forceRefresh]);

  // Filter and organize tests based on active tab
  useEffect(() => {
    if (!tests.length) {
      setFilteredTests([]);
      return;
    }

    const studentId = user?.userId || user?._id;
    const now = new Date();

    const filtered = tests.filter(test => {
      // Apply subject filter
      if (filterSubject && test.subject !== filterSubject) return false;
      
      // Apply class filter using getClassName
      if (filterClass) {
        const className = getClassName(test);
        if (className !== filterClass) return false;
      }

      // Find student's batch
      const studentBatch = test.batches?.find(batch => {
        if (!batch.students || !Array.isArray(batch.students)) return false;
        
        return batch.students.some(student => {
          if (typeof student === 'object') {
            return compareIds(student._id, studentId) || compareIds(student.id, studentId);
          } else {
            return compareIds(student, studentId);
          }
        });
      });

      if (!studentBatch) return false;

      const batchStart = studentBatch.schedule?.start ? new Date(studentBatch.schedule.start) : null;
      const batchEnd = studentBatch.schedule?.end ? new Date(studentBatch.schedule.end) : null;
      const hasSubmitted = submissionStatus[test._id] === 'submitted' || 
                          submissionStatus[test._id] === 'completed' ||
                          submissionStatus[test._id] === 'graded';

      // Categorize based on active tab
      switch (activeTab) {
        case 'available':
          // Available if test is scheduled, within schedule, and not submitted
          return test.status === 'scheduled' && 
                 batchStart && batchEnd &&
                 now >= batchStart && 
                 now <= batchEnd && 
                 !hasSubmitted;

        case 'upcoming':
          // Upcoming if test is scheduled and hasn't started yet
          return test.status === 'scheduled' && 
                 batchStart &&
                 now < batchStart && 
                 !hasSubmitted;

        case 'completed':
          // Completed if test was submitted OR if test has ended
          return hasSubmitted || 
                 (batchEnd && now > batchEnd && test.status === 'scheduled');

        default:
          return false;
      }
    });

    // Sort based on tab
    const sorted = [...filtered].sort((a, b) => {
      const batchA = a.batches?.find(batch => 
        batch.students?.some(student => {
          if (typeof student === 'object') {
            return compareIds(student._id, studentId) || compareIds(student.id, studentId);
          } else {
            return compareIds(student, studentId);
          }
        })
      );
      
      const batchB = b.batches?.find(batch => 
        batch.students?.some(student => {
          if (typeof student === 'object') {
            return compareIds(student._id, studentId) || compareIds(student.id, studentId);
          } else {
            return compareIds(student, studentId);
          }
        })
      );

      switch (activeTab) {
        case 'available':
          // Sort by time remaining (ascending)
          const endA = batchA?.schedule?.end ? new Date(batchA.schedule.end) : new Date(0);
          const endB = batchB?.schedule?.end ? new Date(batchB.schedule.end) : new Date(0);
          const timeRemainingA = Math.max(0, endA - now);
          const timeRemainingB = Math.max(0, endB - now);
          return timeRemainingA - timeRemainingB;

        case 'upcoming':
          // Sort by start time (ascending)
          const startA = batchA?.schedule?.start ? new Date(batchA.schedule.start) : new Date(0);
          const startB = batchB?.schedule?.start ? new Date(batchB.schedule.start) : new Date(0);
          return startA - startB;

        case 'completed':
          // Sort by submission time (descending) or end time
          const submissionA = submissionDetails[a._id]?.submittedAt || 
                            (batchA?.schedule?.end ? new Date(batchA.schedule.end) : new Date(0));
          const submissionB = submissionDetails[b._id]?.submittedAt || 
                            (batchB?.schedule?.end ? new Date(batchB.schedule.end) : new Date(0));
          return new Date(submissionB) - new Date(submissionA);

        default:
          return 0;
      }
    });

    setFilteredTests(sorted);
  }, [tests, activeTab, filterSubject, filterClass, submissionStatus, submissionDetails, user]);

  const handleTakeTest = async (testId, testTitle) => {
    try {
      const token = localStorage.getItem('token');
      
      // First check if student can take the test
      const canTakeRes = await fetch(`http://localhost:5000/api/tests/${testId}/can-take`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      const canTakeData = await canTakeRes.json();
      
      if (!canTakeRes.ok) {
        throw new Error(canTakeData.error || 'Cannot take test at this time');
      }

      if (!canTakeData.canTake) {
        toast.error(canTakeData.reason || 'You cannot take this test', { 
          position: 'top-right', 
          autoClose: 5000 
        });
        return;
      }

      // Fetch test details
      const testRes = await fetch(`http://localhost:5000/api/tests/${testId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      const testData = await testRes.json();
      
      if (!testRes.ok) {
        throw new Error(testData.error || `Failed to access test`);
      }

      if (!testData.test || testData.test.questions?.length === 0) {
        throw new Error(`Test "${testTitle}" has no valid questions.`);
      }

      navigate(`/student/test/${testId}`);
      
    } catch (err) {
      toast.error(err.message || 'Failed to start test', { 
        position: 'top-right', 
        autoClose: 5000 
      });
    }
  };

  const handleViewResults = (testId) => {
    navigate(`/student/results/${testId}`);
  };

  const resetFilters = () => {
    setFilterSubject('');
    setFilterClass('');
  };

  const refreshTests = () => {
    setForceRefresh(prev => prev + 1);
    toast.info('Refreshing tests...', { position: 'top-right', autoClose: 2000 });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'N/A';
    }
  };

  const formatTimeRemaining = (endTime) => {
    if (!endTime) return 'N/A';
    try {
      const now = new Date();
      const end = new Date(endTime);
      if (isNaN(end.getTime())) return 'N/A';
      
      const diffMinutes = Math.max(0, Math.floor((end - now) / 60000));
      
      if (diffMinutes >= 60) {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        return `${hours}h ${mins}m`;
      }
      return `${diffMinutes}m`;
    } catch (e) {
      return 'N/A';
    }
  };

  if (!user || user.role !== 'student') {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: ARMY_GREEN_BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontFamily: "'Roboto', sans-serif"
      }}>
        <p style={{
          color: ERROR_RED,
          fontSize: '18px',
          fontWeight: '600'
        }}>Access restricted to students.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: ARMY_GREEN_BG,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontFamily: "'Roboto', sans-serif"
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #f3f3f3',
          borderTop: `4px solid ${ARMY_GREEN}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <p style={{
          color: ARMY_GREEN,
          fontSize: '18px',
          fontWeight: '600'
        }}>Loading your tests...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: ARMY_GREEN_BG,
      padding: '30px',
      fontFamily: "'Roboto', sans-serif"
    }}>
      <ToastContainer />
      
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: TEXT_DARK,
              marginBottom: '8px'
            }}>My Tests</h1>
            <p style={{
              color: TEXT_MEDIUM,
              fontSize: '16px'
            }}>
              {activeTab === 'available' && `${filteredTests.length} test(s) available now`}
              {activeTab === 'upcoming' && `${filteredTests.length} test(s) upcoming`}
              {activeTab === 'completed' && `${filteredTests.length} test(s) completed`}
            </p>
          </div>

          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            <button
              onClick={refreshTests}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: ARMY_GREEN_LIGHT,
                color: WHITE,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = ARMY_GREEN;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = ARMY_GREEN_LIGHT;
              }}
            >
              ↻ Refresh
            </button>

            <div style={{
              display: 'flex',
              gap: '10px',
              backgroundColor: WHITE,
              padding: '8px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              {['available', 'upcoming', 'completed'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    backgroundColor: activeTab === tab ? ARMY_GREEN : 'transparent',
                    color: activeTab === tab ? WHITE : TEXT_MEDIUM,
                    textTransform: 'capitalize'
                  }}
                  onMouseOver={(e) => {
                    if (activeTab !== tab) {
                      e.currentTarget.style.backgroundColor = ARMY_GREEN_BG;
                    }
                  }}
                  onMouseOut={(e) => {
                    if (activeTab !== tab) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#FFF3F3',
            borderLeft: `4px solid ${ERROR_RED}`,
            color: ERROR_RED,
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <p style={{ fontSize: '14px' }}>Error: {error}</p>
            <button
              onClick={() => setError(null)}
              style={{
                color: ERROR_RED,
                fontWeight: '600',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Filters Section */}
        <div style={{
          backgroundColor: WHITE,
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '20px'
          }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: TEXT_DARK,
                marginBottom: '8px'
              }}>
                Subject
              </label>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `2px solid ${TEXT_LIGHT}`,
                  fontSize: '14px',
                  backgroundColor: WHITE,
                  color: TEXT_DARK,
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => (e.target.style.borderColor = ARMY_GREEN)}
                onBlur={(e) => (e.target.style.borderColor = TEXT_LIGHT)}
              >
                <option value="">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: TEXT_DARK,
                marginBottom: '8px'
              }}>
                Class
              </label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `2px solid ${TEXT_LIGHT}`,
                  fontSize: '14px',
                  backgroundColor: WHITE,
                  color: TEXT_DARK,
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => (e.target.style.borderColor = ARMY_GREEN)}
                onBlur={(e) => (e.target.style.borderColor = TEXT_LIGHT)}
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={resetFilters}
              style={{
                backgroundColor: 'transparent',
                color: ARMY_GREEN,
                padding: '10px 20px',
                borderRadius: '8px',
                border: `2px solid ${ARMY_GREEN}`,
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = ARMY_GREEN;
                e.currentTarget.style.color = WHITE;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = ARMY_GREEN;
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Show all tests if filtered is empty but we have tests */}
        {tests.length > 0 && filteredTests.length === 0 ? (
          <div style={{
            backgroundColor: WHITE,
            padding: '40px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '30px'
          }}>
            <div style={{
              fontSize: '48px',
              color: TEXT_LIGHT,
              marginBottom: '20px'
            }}>
              🔍
            </div>
            <p style={{
              fontSize: '20px',
              fontWeight: '600',
              color: TEXT_DARK,
              marginBottom: '12px'
            }}>
              No tests match the current filters
            </p>
            <p style={{
              fontSize: '16px',
              color: TEXT_MEDIUM,
              marginBottom: '20px'
            }}>
              You have {tests.length} assigned test(s), but none match the "{activeTab}" category with your current filters.
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '15px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setActiveTab('available')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `2px solid ${ARMY_GREEN}`,
                  backgroundColor: ARMY_GREEN,
                  color: WHITE,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = ARMY_GREEN_DARK;
                  e.currentTarget.style.borderColor = ARMY_GREEN_DARK;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = ARMY_GREEN;
                  e.currentTarget.style.borderColor = ARMY_GREEN;
                }}
              >
                Check Available Tests
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `2px solid ${SUCCESS_GREEN}`,
                  backgroundColor: SUCCESS_GREEN,
                  color: WHITE,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#219653';
                  e.currentTarget.style.borderColor = '#219653';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = SUCCESS_GREEN;
                  e.currentTarget.style.borderColor = SUCCESS_GREEN;
                }}
              >
                Check Completed Tests
              </button>
              <button
                onClick={resetFilters}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `2px solid ${ARMY_GREEN_LIGHT}`,
                  backgroundColor: ARMY_GREEN_LIGHT,
                  color: WHITE,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = ARMY_GREEN;
                  e.currentTarget.style.borderColor = ARMY_GREEN;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = ARMY_GREEN_LIGHT;
                  e.currentTarget.style.borderColor = ARMY_GREEN_LIGHT;
                }}
              >
                Reset All Filters
              </button>
            </div>
          </div>
        ) : null}

        {/* Tests Grid */}
        {filteredTests.length === 0 && tests.length === 0 ? (
          <div style={{
            backgroundColor: WHITE,
            padding: '60px 40px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              fontSize: '48px',
              color: TEXT_LIGHT,
              marginBottom: '20px'
            }}>
              📝
            </div>
            <p style={{
              fontSize: '20px',
              fontWeight: '600',
              color: TEXT_DARK,
              marginBottom: '12px'
            }}>
              No tests assigned yet
            </p>
            <p style={{
              fontSize: '16px',
              color: TEXT_MEDIUM
            }}>
              You don't have any tests assigned to you at the moment.
            </p>
          </div>
        ) : filteredTests.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '24px'
          }}>
            {filteredTests.map(test => {
              const isAvailable = activeTab === 'available';
              const isCompleted = activeTab === 'completed';
              
              // Find student's batch for this test
              const studentId = user?.userId || user?._id;
              const studentBatch = test.batches?.find(batch => {
                if (!batch.students || !Array.isArray(batch.students)) return false;
                
                return batch.students.some(student => {
                  if (typeof student === 'object') {
                    return compareIds(student._id, studentId) || compareIds(student.id, studentId);
                  } else {
                    return compareIds(student, studentId);
                  }
                });
              });
              
              const hasSubmitted = submissionStatus[test._id] === 'submitted' || 
                                  submissionStatus[test._id] === 'completed' ||
                                  submissionStatus[test._id] === 'graded';
              const submissionDetail = submissionDetails[test._id];
              const className = getClassName(test); // Get the class name
              
              return (
                <div
                  key={test._id}
                  style={{
                    backgroundColor: WHITE,
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    position: 'relative',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    border: `2px solid ${isAvailable ? ARMY_GREEN : isCompleted ? SUCCESS_GREEN : WARNING_ORANGE}`
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '20px'
                  }}>
                    <div>
                      <span style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: isAvailable ? ARMY_GREEN : isCompleted ? SUCCESS_GREEN : WARNING_ORANGE,
                        color: WHITE,
                        marginBottom: '12px'
                      }}>
                        {isAvailable ? 'Available Now' : isCompleted ? 'Completed' : 'Upcoming'}
                      </span>
                      <h3 style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: TEXT_DARK,
                        marginBottom: '8px'
                      }}>{test.title}</h3>
                      <p style={{
                        fontSize: '14px',
                        color: TEXT_MEDIUM,
                        marginBottom: '4px'
                      }}>
                        {test.subject} • {className} • {test.session || ''}
                      </p>
                      {isCompleted && submissionDetail && (
                        <div style={{
                          fontSize: '14px',
                          color: SUCCESS_GREEN,
                          fontWeight: '600',
                          marginTop: '8px'
                        }}>
                          Score: {submissionDetail.score || 0}/{submissionDetail.totalMarks || test.totalMarks || 0} 
                          ({submissionDetail.percentage ? Math.round(submissionDetail.percentage) : 0}%)
                        </div>
                      )}
                    </div>
                    <div style={{
                      textAlign: 'right'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        color: TEXT_MEDIUM,
                        marginBottom: '8px'
                      }}>
                        Duration: {test.duration || 0} mins
                      </div>
                      {isAvailable && studentBatch?.schedule?.end && (
                        <div style={{
                          fontSize: '12px',
                          color: ERROR_RED,
                          fontWeight: '600'
                        }}>
                          ⏰ Ends in {formatTimeRemaining(studentBatch.schedule.end)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: ARMY_GREEN_BG,
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px'
                    }}>
                      <div>
                        <div style={{
                          fontSize: '12px',
                          color: TEXT_MEDIUM,
                          marginBottom: '4px'
                        }}>Batch</div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: TEXT_DARK
                        }}>{studentBatch?.name || 'Default Batch'}</div>
                      </div>
                      <div>
                        <div style={{
                          fontSize: '12px',
                          color: TEXT_MEDIUM,
                          marginBottom: '4px'
                        }}>Questions</div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: TEXT_DARK
                        }}>{test.questions?.length || 0}</div>
                      </div>
                      <div>
                        <div style={{
                          fontSize: '12px',
                          color: TEXT_MEDIUM,
                          marginBottom: '4px'
                        }}>Start Time</div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: TEXT_DARK
                        }}>
                          {studentBatch ? formatDate(studentBatch.schedule?.start) : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div style={{
                          fontSize: '12px',
                          color: TEXT_MEDIUM,
                          marginBottom: '4px'
                        }}>End Time</div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: TEXT_DARK
                        }}>
                          {studentBatch ? formatDate(studentBatch.schedule?.end) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isCompleted ? (
                    <button
                      onClick={() => handleViewResults(test._id)}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background-color 0.3s ease',
                        backgroundColor: SUCCESS_GREEN,
                        color: WHITE
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#219653';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = SUCCESS_GREEN;
                      }}
                    >
                      View Results
                    </button>
                  ) : (
                    <button
                      onClick={() => handleTakeTest(test._id, test.title)}
                      disabled={!isAvailable || hasSubmitted}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: (isAvailable && !hasSubmitted) ? 'pointer' : 'not-allowed',
                        transition: 'all 0.3s ease',
                        backgroundColor: (isAvailable && !hasSubmitted) ? ARMY_GREEN : TEXT_LIGHT,
                        color: (isAvailable && !hasSubmitted) ? WHITE : TEXT_MEDIUM
                      }}
                      onMouseOver={(e) => {
                        if (isAvailable && !hasSubmitted) {
                          e.currentTarget.style.backgroundColor = ARMY_GREEN_DARK;
                        }
                      }}
                      onMouseOut={(e) => {
                        if (isAvailable && !hasSubmitted) {
                          e.currentTarget.style.backgroundColor = ARMY_GREEN;
                        }
                      }}
                    >
                      {isAvailable ? 'Start Test' : `Starts ${studentBatch ? formatDate(studentBatch.schedule?.start) : 'Soon'}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Tests;