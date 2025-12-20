import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiBell,
  FiBook,
  FiClock,
  FiCheckCircle,
  FiBarChart2,
  FiCalendar,
  FiPlay,
  FiChevronRight,
  FiAward,
  FiAlertCircle,
  FiEye,
  FiUsers,
  FiTrendingUp,
  FiActivity,
  FiCalendar as FiCalendarIcon,
  FiAlertTriangle,
  FiXCircle
} from 'react-icons/fi';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTests: 0,
    completedTests: 0,
    timeSpent: 0,
    availableTests: 0,
    upcomingTests: 0
  });
  const [availableTests, setAvailableTests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [completedTests, setCompletedTests] = useState([]);
  const [upcomingTests, setUpcomingTests] = useState([]);

  const brandColors = {
    primary: '#4B5320',
    secondary: '#D4A017',
    accent: '#228B22',
    light: '#F5F5DC',
    dark: '#2C3E50',
    danger: '#DC3545',
    success: '#28A745',
    warning: '#FFC107',
    info: '#17A2B8'
  };

  // Helper function to compare IDs
  const compareIds = (id1, id2) => {
    if (!id1 || !id2) return false;
    return id1.toString() === id2.toString();
  };

  // Helper function to extract class name from user object
  const getUserClassName = () => {
    if (!user) return 'Not assigned';
    
    if (typeof user.class === 'string') return user.class;
    
    if (user.class && typeof user.class === 'object' && user.class.fullName) {
      return user.class.fullName;
    }
    
    if (user.class && typeof user.class === 'object' && user.class.name) {
      return user.class.name;
    }
    
    if (user.className && typeof user.className === 'string') return user.className;
    
    return 'Not assigned';
  };

  // Helper function to extract subject name
  const getSubjectName = (subject) => {
    if (!subject) return 'General';
    
    if (typeof subject === 'string') return subject;
    
    if (subject && typeof subject === 'object' && subject.name) {
      return subject.name;
    }
    
    return 'General';
  };

  // Helper to get student's batch for a test
  const getStudentBatch = (test, studentId) => {
    if (!test.batches || !Array.isArray(test.batches)) return null;
    
    return test.batches.find(batch => {
      if (!batch.students || !Array.isArray(batch.students)) return false;
      
      return batch.students.some(student => {
        if (typeof student === 'object') {
          return compareIds(student._id, studentId) || compareIds(student.id, studentId);
        } else {
          return compareIds(student, studentId);
        }
      });
    });
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      setLoading(true);
      try {
        // Fetch all tests
        const testsRes = await axios.get('http://localhost:5000/api/tests', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('Dashboard - Raw tests data:', testsRes.data);

        // Handle different response formats
        let allTests = [];
        if (Array.isArray(testsRes.data)) {
          allTests = testsRes.data;
        } else if (testsRes.data.tests && Array.isArray(testsRes.data.tests)) {
          allTests = testsRes.data.tests;
        } else if (testsRes.data.success && testsRes.data.tests && Array.isArray(testsRes.data.tests)) {
          allTests = testsRes.data.tests;
        }

        console.log('Dashboard - All tests parsed:', allTests.length);

        if (user?.role === 'student') {
          const studentId = user.userId || user._id;
          console.log('Dashboard - Student ID:', studentId);

          // Fetch student's submissions
          let submissions = [];
          try {
            const submissionsRes = await axios.get('http://localhost:5000/api/tests/submissions/student', {
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            console.log('Dashboard - Submissions response:', submissionsRes.data);
            
            if (submissionsRes.data) {
              let submissionsData = submissionsRes.data;
              
              if (Array.isArray(submissionsData)) {
                submissions = submissionsData;
              } else if (submissionsData.submissions && Array.isArray(submissionsData.submissions)) {
                submissions = submissionsData.submissions;
              } else if (submissionsData.success && submissionsData.submissions && Array.isArray(submissionsData.submissions)) {
                submissions = submissionsData.submissions;
              } else if (Array.isArray(submissionsData)) {
                submissions = submissionsData;
              }
            }
          } catch (submissionErr) {
            console.log('Dashboard - Failed to fetch submissions:', submissionErr.message);
          }

          console.log('Dashboard - Submissions found:', submissions.length);

          // Create map of submitted test IDs
          const submittedTestIds = new Set();
          const submissionDetails = {};
          
          submissions.forEach(submission => {
            if (submission.testId) {
              const testId = submission.testId._id || submission.testId;
              submittedTestIds.add(testId);
              submissionDetails[testId] = {
                submittedAt: submission.submittedAt,
                attemptNumber: submission.attemptNumber || 1
              };
            }
          });

          console.log('Dashboard - Submitted test IDs:', Array.from(submittedTestIds));

          // Filter tests for current student
          const studentTests = allTests.filter(test => {
            return !!getStudentBatch(test, studentId);
          });

          console.log('Dashboard - Student tests found:', studentTests.length);

          const now = new Date();
          let availableTestsList = [];
          let completedTestsList = [];
          let upcomingTestsList = [];

          // Categorize tests based on schedule, submission status, and batch end time
          studentTests.forEach(test => {
            const studentBatch = getStudentBatch(test, studentId);
            if (!studentBatch) return;

            const batchStart = studentBatch.schedule?.start ? new Date(studentBatch.schedule.start) : null;
            const batchEnd = studentBatch.schedule?.end ? new Date(studentBatch.schedule.end) : null;
            const testId = test._id.toString();
            
            // Check if student has submitted this test
            const hasSubmitted = submittedTestIds.has(testId);
            
            // Check if batch has ended (even if student didn't take it)
            const batchEnded = batchEnd && now > batchEnd;
            
            // Test is considered completed if:
            // 1. Student has submitted it, OR
            // 2. The batch has ended (even if student didn't take it)
            const isCompleted = hasSubmitted || batchEnded;
            
            // Test is available if:
            // 1. Batch has started
            // 2. Batch hasn't ended
            // 3. Student hasn't submitted it yet
            // 4. Test is scheduled
            const isAvailable = batchStart && batchEnd && 
                               now >= batchStart && now <= batchEnd && 
                               !hasSubmitted && test.status === 'scheduled';
            
            // Test is upcoming if:
            // 1. Batch hasn't started yet
            // 2. Test is scheduled
            const isUpcoming = batchStart && now < batchStart && test.status === 'scheduled';

            if (isCompleted) {
              const submissionDetail = submissionDetails[testId];
              completedTestsList.push({
                testId: test._id,
                testTitle: test.title,
                testSubject: getSubjectName(test.subject),
                testClass: test.class?.name || test.class,
                submittedAt: submissionDetail?.submittedAt || (batchEnded ? batchEnd : new Date().toISOString()),
                attemptNumber: submissionDetail?.attemptNumber || 1,
                status: hasSubmitted ? 'submitted' : 'missed',
                batchEnded: batchEnded,
                batchName: studentBatch.name
              });
            } else if (isAvailable) {
              availableTestsList.push({
                ...test,
                studentBatch: studentBatch,
                timeRemaining: formatTimeRemaining(batchEnd)
              });
            } else if (isUpcoming) {
              upcomingTestsList.push({
                ...test,
                studentBatch: studentBatch,
                startsIn: formatTimeRemaining(batchStart)
              });
            }
          });

          console.log('Dashboard - Available tests:', availableTestsList.length);
          console.log('Dashboard - Completed tests:', completedTestsList.length);
          console.log('Dashboard - Upcoming tests:', upcomingTestsList.length);

          // Sort completed tests by date (most recent first)
          completedTestsList.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

          // Set states
          setAvailableTests(availableTestsList.slice(0, 3));
          setCompletedTests(completedTestsList);
          setUpcomingTests(upcomingTestsList.slice(0, 3));

          // Set recent activity from completed tests (both submitted and missed)
          const activity = completedTestsList
            .slice(0, 5)
            .map(test => {
              let action = '';
              let description = '';
              let icon = '';
              let color = '';
              
              if (test.status === 'submitted') {
                action = 'Completed test';
                description = `${test.testTitle} - ${test.testSubject}`;
                icon = '✓';
                color = brandColors.success;
              } else {
                action = 'Missed test deadline';
                description = `${test.testTitle} - ${test.testSubject}`;
                icon = '⏰';
                color = brandColors.warning;
              }
              
              return {
                _id: test.testId + '-' + test.attemptNumber,
                action: action,
                description: description,
                subject: test.testSubject,
                status: test.status,
                time: formatTimeAgo(test.submittedAt),
                icon: icon,
                color: color
              };
            });

          setRecentActivity(activity);

          // Calculate stats
          const submittedTests = completedTestsList.filter(t => t.status === 'submitted');
          const estimatedTimeSpent = submittedTests.length * 60; // Assuming 60 minutes per test

          setStats({
            totalTests: studentTests.length,
            completedTests: completedTestsList.length,
            availableTests: availableTestsList.length,
            upcomingTests: upcomingTestsList.length,
            timeSpent: estimatedTimeSpent
          });

          // Extract upcoming deadlines from upcoming tests
          const deadlines = [];
          upcomingTestsList.forEach(test => {
            if (test.studentBatch?.schedule?.start) {
              deadlines.push({
                _id: test._id + '-start',
                testId: test._id,
                title: test.title,
                subject: getSubjectName(test.subject),
                dueDate: test.studentBatch.schedule.start,
                batchName: test.studentBatch.name,
                type: 'test_start',
                startsIn: test.startsIn
              });
            }
            if (test.studentBatch?.schedule?.end) {
              deadlines.push({
                _id: test._id + '-end',
                testId: test._id,
                title: test.title,
                subject: getSubjectName(test.subject),
                dueDate: test.studentBatch.schedule.end,
                batchName: test.studentBatch.name,
                type: 'test_end'
              });
            }
          });

          // Also add deadlines for available tests (end times)
          availableTestsList.forEach(test => {
            if (test.studentBatch?.schedule?.end) {
              deadlines.push({
                _id: test._id + '-end-available',
                testId: test._id,
                title: test.title,
                subject: getSubjectName(test.subject),
                dueDate: test.studentBatch.schedule.end,
                batchName: test.studentBatch.name,
                type: 'test_end',
                timeRemaining: test.timeRemaining
              });
            }
          });

          // Sort by date and take the nearest 3
          deadlines.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
          setUpcomingDeadlines(deadlines.slice(0, 3));

        } else {
          // For teachers/admins
          const completedTestsCount = allTests.filter(test => test.status === 'completed').length;
          const availableTestsCount = allTests.filter(test => test.status === 'scheduled' || test.status === 'active').length;
          const draftTestsCount = allTests.filter(test => test.status === 'draft').length;
          
          setStats({
            totalTests: allTests.length,
            completedTests: completedTestsCount,
            availableTests: availableTestsCount,
            upcomingTests: 0,
            timeSpent: 0
          });

          // For teachers/admins, show all active/scheduled tests as available
          const available = allTests.filter(test => 
            test.status === 'active' || test.status === 'scheduled'
          ).slice(0, 3);
          setAvailableTests(available);

          // Set recent activity for teachers/admins
          const activity = allTests
            .filter(test => test.status === 'completed')
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
            .slice(0, 5)
            .map(test => ({
              _id: test._id,
              action: 'Test completed',
              description: `${test.title} - ${getSubjectName(test.subject)}`,
              subject: getSubjectName(test.subject),
              time: formatTimeAgo(test.updatedAt || test.createdAt),
              icon: '✓',
              color: brandColors.success
            }));

          setRecentActivity(activity);
        }

        // Generate notifications based on user role and test status
        const generateNotifications = () => {
          const notificationsList = [];
          
          if (user?.role === 'student') {
            // Student notifications
            if (availableTests.length > 0) {
              notificationsList.push({
                _id: 'notif-available-tests',
                title: 'New Tests Available',
                message: `You have ${availableTests.length} test${availableTests.length > 1 ? 's' : ''} available to take`,
                type: 'test_available',
                read: false,
                createdAt: new Date().toISOString(),
                link: '/tests'
              });
            }

            if (completedTests.length > 0) {
              const submittedTests = completedTests.filter(t => t.status === 'submitted');
              if (submittedTests.length > 0) {
                const latestTest = submittedTests[0];
                notificationsList.push({
                  _id: 'notif-latest-result',
                  title: 'Test Submitted',
                  message: `You have submitted "${latestTest.testTitle}"`,
                  type: 'result',
                  read: false,
                  createdAt: latestTest.submittedAt || new Date().toISOString(),
                  link: '/results'
                });
              }
              
              // Check for missed tests
              const missedTests = completedTests.filter(t => t.status === 'missed');
              if (missedTests.length > 0) {
                notificationsList.push({
                  _id: 'notif-missed-tests',
                  title: 'Missed Test Deadlines',
                  message: `You missed ${missedTests.length} test${missedTests.length > 1 ? 's' : ''}`,
                  type: 'warning',
                  read: false,
                  createdAt: new Date().toISOString(),
                  link: '/tests'
                });
              }
            }

            if (upcomingDeadlines.length > 0) {
              const nearestDeadline = upcomingDeadlines[0];
              notificationsList.push({
                _id: 'notif-upcoming-deadline',
                title: 'Upcoming Test',
                message: `${nearestDeadline.title} ${nearestDeadline.type === 'test_start' ? 'starts' : 'ends'} ${nearestDeadline.startsIn || nearestDeadline.timeRemaining || 'soon'}`,
                type: 'reminder',
                read: false,
                createdAt: new Date().toISOString(),
                link: `/test/${nearestDeadline.testId}`
              });
            }
          } else if (user?.role === 'teacher') {
            // Teacher notifications
            const teacherTests = allTests.filter(t => t.createdBy === user._id);
            const draftTests = teacherTests.filter(t => t.status === 'draft');
            const pendingApproval = teacherTests.filter(t => t.status === 'draft' && t.requiresApproval);

            if (draftTests.length > 0) {
              notificationsList.push({
                _id: 'notif-draft-tests',
                title: 'Draft Tests',
                message: `You have ${draftTests.length} draft test${draftTests.length > 1 ? 's' : ''} to complete`,
                type: 'draft',
                read: false,
                createdAt: new Date().toISOString(),
                link: '/tests'
              });
            }

            if (pendingApproval.length > 0) {
              notificationsList.push({
                _id: 'notif-pending-approval',
                title: 'Tests Pending Approval',
                message: `${pendingApproval.length} test${pendingApproval.length > 1 ? 's' : ''} awaiting admin approval`,
                type: 'approval',
                read: false,
                createdAt: new Date().toISOString(),
                link: '/tests'
              });
            }
            
            // Completed tests that need grading
            const completedTeacherTests = teacherTests.filter(t => t.status === 'completed');
            if (completedTeacherTests.length > 0) {
              notificationsList.push({
                _id: 'notif-completed-tests',
                title: 'Tests Completed',
                message: `${completedTeacherTests.length} test${completedTeacherTests.length > 1 ? 's' : ''} have been completed by students`,
                type: 'completed',
                read: false,
                createdAt: new Date().toISOString(),
                link: '/test/results'
              });
            }
          }

          // Add welcome notification
          notificationsList.push({
            _id: 'notif-welcome',
            title: 'Welcome to Exam System',
            message: `Welcome back, ${user?.name || user?.username || 'User'}!`,
            type: 'welcome',
            read: true,
            createdAt: new Date().toISOString()
          });

          return notificationsList;
        };

        setNotifications(generateNotifications());

      } catch (error) {
        console.error('Dashboard - Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Refresh data every 2 minutes
    const interval = setInterval(fetchDashboardData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [navigate, user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatTime = (minutes) => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Recently';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'No date';
    
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatTimeRemaining = (endTime) => {
    if (!endTime) return 'N/A';
    try {
      const now = new Date();
      const end = new Date(endTime);
      if (isNaN(end.getTime())) return 'N/A';
      
      const diffMinutes = Math.max(0, Math.floor((end - now) / 60000));
      
      if (diffMinutes >= 60 * 24) {
        const days = Math.floor(diffMinutes / (60 * 24));
        const hours = Math.floor((diffMinutes % (60 * 24)) / 60);
        return `${days}d ${hours}h`;
      } else if (diffMinutes >= 60) {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        return `${hours}h ${mins}m`;
      }
      return `${diffMinutes}m`;
    } catch (e) {
      return 'N/A';
    }
  };

  const startTest = async (testId, testTitle) => {
    try {
      const token = localStorage.getItem('token');
      
      // First check if student can take the test
      const canTakeRes = await axios.get(`http://localhost:5000/api/tests/${testId}/can-take`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!canTakeRes.data.canTake) {
        alert(canTakeRes.data.reason || 'You cannot take this test at the moment.');
        return;
      }

      // Navigate to test taking page
      navigate(`/student/test/${testId}`);
      
    } catch (error) {
      console.error('Error starting test:', error);
      alert(error.response?.data?.error || error.message || 'Failed to start test');
    }
  };

  const viewTestResults = (testId) => {
    navigate(`/student/test/results/${testId}`);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={{ color: brandColors.primary, marginTop: '20px' }}>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.welcomeText}>
            {getGreeting()}, <span style={{ color: brandColors.primary }}>{user?.name || user?.username || 'Student'}!</span>
          </h1>
          <p style={styles.subtitle}>Welcome to your learning dashboard</p>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.userInfo}>
            <span style={styles.userRole}>{user?.role?.toUpperCase() || 'STUDENT'}</span>
            <span style={styles.userClass}>{getUserClassName()}</span>
          </div>
          <button 
            style={styles.viewProfileBtn}
            onClick={() => navigate('/profile')}
          >
            View Profile
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: `${brandColors.primary}15` }}>
            <FiBook size={24} color={brandColors.primary} />
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{stats.totalTests || 0}</h3>
            <p style={styles.statLabel}>Total Assigned Tests</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: `${brandColors.success}15` }}>
            <FiCheckCircle size={24} color={brandColors.success} />
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{stats.completedTests || 0}</h3>
            <p style={styles.statLabel}>Completed</p>
            <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
              {completedTests.filter(t => t.status === 'submitted').length} submitted • 
              {completedTests.filter(t => t.status === 'missed').length} missed
            </p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: `${brandColors.info}15` }}>
            <FiClock size={24} color={brandColors.info} />
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{formatTime(stats.timeSpent)}</h3>
            <p style={styles.statLabel}>Total Time Spent</p>
            <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
              On all tests
            </p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: `${brandColors.secondary}15` }}>
            <FiBarChart2 size={24} color={brandColors.secondary} />
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{stats.availableTests || 0}</h3>
            <p style={styles.statLabel}>Available Now</p>
            <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
              {stats.upcomingTests || 0} upcoming
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Left Column */}
        <div style={styles.leftColumn}>
          {/* Available Tests */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>
                <FiBook style={{ marginRight: '10px' }} />
                Available Tests (Right Now)
              </h3>
              <button 
                style={styles.viewAllBtn}
                onClick={() => navigate('/tests')}
              >
                View All <FiChevronRight />
              </button>
            </div>

            {availableTests.length > 0 ? (
              <div style={styles.testsList}>
                {availableTests.map((test) => {
                  const studentBatch = test.studentBatch || test.batches?.[0];
                  const timeRemaining = test.timeRemaining || 'N/A';
                  
                  return (
                    <div key={test._id} style={styles.testCard}>
                      <div style={styles.testHeader}>
                        <div>
                          <h4 style={styles.testName}>{test.title}</h4>
                          <p style={styles.testDescription}>
                            {test.description || `Complete this ${getSubjectName(test.subject)} test`}
                          </p>
                        </div>
                        <div style={styles.testBadges}>
                          <span style={styles.testBadge}>
                            {getSubjectName(test.subject)}
                          </span>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: `${brandColors.success}20`,
                            color: brandColors.success
                          }}>
                            Available Now
                          </span>
                        </div>
                      </div>
                      <div style={styles.testDetails}>
                        <div style={styles.testDetail}>
                          <FiClock size={14} />
                          <span>{test.duration || 60} mins</span>
                        </div>
                        <div style={styles.testDetail}>
                          <FiBook size={14} />
                          <span>{test.questions?.length || 0} questions</span>
                        </div>
                        <div style={styles.testDetail}>
                          <FiAward size={14} />
                          <span>{test.totalMarks || 0} marks</span>
                        </div>
                        {timeRemaining !== 'N/A' && (
                          <div style={styles.testDetail}>
                            <FiClock size={14} />
                            <span>Ends in: {timeRemaining}</span>
                          </div>
                        )}
                      </div>
                      <div style={styles.testActions}>
                        {user?.role === 'student' ? (
                          <>
                            <button 
                              style={styles.startTestBtn}
                              onClick={() => startTest(test._id, test.title)}
                            >
                              <FiPlay size={16} />
                              Start Test Now
                            </button>
                            <button 
                              style={styles.previewBtn}
                              onClick={() => navigate(`/test/preview/${test._id}`)}
                            >
                              <FiEye size={16} />
                              Preview
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              style={styles.startTestBtn}
                              onClick={() => navigate(`/test/${test._id}/results`)}
                            >
                              <FiBarChart2 size={16} />
                              Results
                            </button>
                            <button 
                              style={styles.previewBtn}
                              onClick={() => navigate(`/test/${test._id}/edit`)}
                            >
                              <FiEye size={16} />
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <FiBook size={48} color="#CBD5E0" />
                <p style={styles.emptyStateText}>No tests available at the moment</p>
                <p style={styles.emptyStateSubtext}>
                  {user?.role === 'student' 
                    ? 'You have completed all available tests or no tests are scheduled for you right now.'
                    : 'No tests are currently active or scheduled.'}
                </p>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>
                <FiActivity style={{ marginRight: '10px' }} />
                Recent Activity
              </h3>
              {user?.role === 'student' && recentActivity.length > 0 && (
                <button 
                  style={styles.viewAllBtn}
                  onClick={() => navigate('/activity')}
                >
                  View All <FiChevronRight />
                </button>
              )}
            </div>
            <div style={styles.activityList}>
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity._id} style={styles.activityItem}>
                    <div style={{
                      ...styles.activityIcon,
                      backgroundColor: activity.color + '20',
                      color: activity.color
                    }}>
                      {activity.status === 'submitted' ? (
                        <FiCheckCircle size={16} color={activity.color} />
                      ) : activity.status === 'missed' ? (
                        <FiXCircle size={16} color={activity.color} />
                      ) : (
                        <FiActivity size={16} color={activity.color} />
                      )}
                    </div>
                    <div style={styles.activityContent}>
                      <p style={styles.activityText}>
                        {activity.description || activity.action}
                      </p>
                      <span style={styles.activityTime}>{activity.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.emptyStateSmall}>
                  <FiActivity size={32} color="#CBD5E0" />
                  <p style={styles.emptyStateText}>
                    {user?.role === 'student' 
                      ? 'No test activity yet' 
                      : 'No recent activity'}
                  </p>
                  {user?.role === 'student' && (
                    <p style={styles.emptyStateSubtext}>Complete a test to see your activity here</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={styles.rightColumn}>
          {/* Notifications */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>
                <FiBell style={{ marginRight: '10px' }} />
                Notifications
                {notifications.filter(n => !n.read).length > 0 && (
                  <span style={styles.notificationBadge}>
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </h3>
              <button 
                style={styles.viewAllBtn}
                onClick={() => navigate('/notifications')}
              >
                View All <FiChevronRight />
              </button>
            </div>

            <div style={styles.notificationsList}>
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div 
                    key={notification._id} 
                    style={{
                      ...styles.notificationItem,
                      backgroundColor: !notification.read ? `${brandColors.primary}08` : 'transparent',
                      cursor: notification.link ? 'pointer' : 'default'
                    }}
                    onClick={() => {
                      if (notification.link) {
                        navigate(notification.link);
                      }
                    }}
                  >
                    <div style={styles.notificationIcon}>
                      {notification.type === 'test_available' ? (
                        <FiBook size={16} color={brandColors.primary} />
                      ) : notification.type === 'result' ? (
                        <FiBarChart2 size={16} color={brandColors.success} />
                      ) : notification.type === 'reminder' ? (
                        <FiClock size={16} color={brandColors.warning} />
                      ) : notification.type === 'warning' ? (
                        <FiAlertTriangle size={16} color={brandColors.danger} />
                      ) : (
                        <FiBell size={16} color={brandColors.info} />
                      )}
                    </div>
                    <div style={styles.notificationContent}>
                      <p style={styles.notificationTitle}>{notification.title}</p>
                      <p style={styles.notificationMessage}>{notification.message}</p>
                      <span style={styles.notificationTime}>
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                    {!notification.read && (
                      <div style={styles.unreadDot}></div>
                    )}
                  </div>
                ))
              ) : (
                <div style={styles.emptyStateSmall}>
                  <p style={styles.emptyStateText}>No notifications</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>
                <FiAlertCircle style={{ marginRight: '10px' }} />
                Quick Actions
              </h3>
            </div>
            <div style={styles.actionsGrid}>
              {user?.role === 'student' ? (
                <>
                  <button 
                    style={styles.actionBtn}
                    onClick={() => navigate('/tests')}
                  >
                    <FiBook size={20} />
                    <span>All My Tests</span>
                  </button>
                  <button 
                    style={styles.actionBtn}
                    onClick={() => navigate('/activity')}
                  >
                    <FiActivity size={20} />
                    <span>My Activity</span>
                  </button>
                  <button 
                    style={styles.actionBtn}
                    onClick={() => navigate('/schedule')}
                  >
                    <FiCalendar size={20} />
                    <span>Test Schedule</span>
                  </button>
                  <button 
                    style={styles.actionBtn}
                    onClick={() => navigate('/profile')}
                  >
                    <FiAward size={20} />
                    <span>My Profile</span>
                  </button>
                </>
              ) : user?.role === 'teacher' ? (
                <>
                  <button 
                    style={styles.actionBtn}
                    onClick={() => navigate('/tests/create')}
                  >
                    <FiBook size={20} />
                    <span>Create Test</span>
                  </button>
                  <button 
                    style={styles.actionBtn}
                    onClick={() => navigate('/tests')}
                  >
                    <FiBook size={20} />
                    <span>My Tests</span>
                  </button>
                  <button 
                    style={styles.actionBtn}
                    onClick={() => navigate('/questions')}
                  >
                    <FiBook size={20} />
                    <span>Questions</span>
                  </button>
                  <button 
                    style={styles.actionBtn}
                    onClick={() => navigate('/students')}
                  >
                    <FiUsers size={20} />
                    <span>Students</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    style={styles.actionBtn}
                    onClick={() => navigate('/tests')}
                  >
                    <FiBook size={20} />
                    <span>All Tests</span>
                  </button>
                  <button 
                    style={styles.actionBtn}
                    onClick={() => navigate('/users')}
                  >
                    <FiUsers size={20} />
                    <span>Users</span>
                  </button>
                  <button 
                    style={styles.actionBtn}
                    onClick={() => navigate('/analytics')}
                  >
                    <FiBarChart2 size={20} />
                    <span>Analytics</span>
                  </button>
                  <button 
                    style={styles.actionBtn}
                    onClick={() => navigate('/settings')}
                  >
                    <FiAward size={20} />
                    <span>Settings</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>
                <FiCalendar style={{ marginRight: '10px' }} />
                Upcoming Deadlines
              </h3>
              {upcomingDeadlines.length > 0 && (
                <button 
                  style={styles.viewAllBtn}
                  onClick={() => navigate('/schedule')}
                >
                  View All <FiChevronRight />
                </button>
              )}
            </div>
            <div style={styles.deadlineList}>
              {upcomingDeadlines.length > 0 ? (
                upcomingDeadlines.map((deadline) => (
                  <div key={deadline._id} style={styles.deadlineItem}>
                    <div style={{
                      ...styles.deadlineDate,
                      backgroundColor: deadline.type === 'test_start' ? brandColors.primary : brandColors.warning
                    }}>
                      <span style={styles.deadlineDay}>
                        {new Date(deadline.dueDate).getDate()}
                      </span>
                      <span style={styles.deadlineMonth}>
                        {new Date(deadline.dueDate).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                      </span>
                    </div>
                    <div style={styles.deadlineContent}>
                      <p style={styles.deadlineTitle}>
                        {deadline.title}
                        <span style={styles.deadlineType}>
                          {deadline.type === 'test_start' ? ' starts' : ' ends'}
                        </span>
                      </p>
                      <span style={styles.deadlineTime}>
                        {formatDateTime(deadline.dueDate)}
                      </span>
                      {deadline.subject && (
                        <span style={styles.deadlineSubject}>{deadline.subject}</span>
                      )}
                      {deadline.batchName && (
                        <span style={styles.deadlineBatch}>Batch: {deadline.batchName}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={styles.emptyStateSmall}>
                  <FiCalendar size={32} color="#CBD5E0" />
                  <p style={styles.emptyStateText}>No upcoming deadlines</p>
                  {user?.role === 'student' && (
                    <p style={styles.emptyStateSubtext}>All scheduled tests have been completed or are currently available</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '30px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    backgroundColor: '#f8f9fa',
    minHeight: '100vh'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8f9fa'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  welcomeText: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#2C3E50',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#6c757d',
    margin: 0
  },
  headerRight: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'flex-end'
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px'
  },
  userRole: {
    fontSize: '12px',
    color: '#4B5320',
    fontWeight: '600',
    backgroundColor: '#F5F5DC',
    padding: '4px 12px',
    borderRadius: '20px'
  },
  userClass: {
    fontSize: '14px',
    color: '#6c757d'
  },
  viewProfileBtn: {
    backgroundColor: '#D4A017',
    color: '#4B5320',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s ease'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e9ecef',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
  },
  statIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statContent: {
    flex: 1
  },
  statNumber: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#4B5320',
    margin: '0 0 4px 0'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6c757d',
    margin: 0
  },
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '24px',
    '@media (min-width: 1200px)': {
      gridTemplateColumns: '1.5fr 1fr'
    }
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e9ecef'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4B5320',
    margin: 0,
    display: 'flex',
    alignItems: 'center'
  },
  viewAllBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#D4A017',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'color 0.3s ease'
  },
  testsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  testCard: {
    border: '1px solid #e9ecef',
    borderRadius: '10px',
    padding: '20px',
    transition: 'all 0.3s ease'
  },
  testHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  testName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2C3E50',
    margin: '0 0 4px 0'
  },
  testDescription: {
    fontSize: '14px',
    color: '#6c757d',
    margin: '0 0 8px 0',
    maxWidth: '500px'
  },
  testBadges: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    alignItems: 'flex-end'
  },
  testBadge: {
    backgroundColor: '#F5F5DC',
    color: '#4B5320',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 10px',
    borderRadius: '20px',
    whiteSpace: 'nowrap'
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '2px 8px',
    borderRadius: '10px',
    textTransform: 'uppercase'
  },
  testDetails: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '16px'
  },
  testDetail: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#6c757d'
  },
  testActions: {
    display: 'flex',
    gap: '12px'
  },
  startTestBtn: {
    backgroundColor: '#D4A017',
    color: '#4B5320',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.3s ease',
    flex: 1
  },
  previewBtn: {
    backgroundColor: 'transparent',
    color: '#4B5320',
    border: '1px solid #D4A017',
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.3s ease',
    flex: 1
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center'
  },
  emptyStateSmall: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    textAlign: 'center',
    gap: '8px'
  },
  emptyStateText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#4B5320',
    margin: 0
  },
  emptyStateSubtext: {
    fontSize: '14px',
    color: '#6c757d',
    margin: 0,
    textAlign: 'center'
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  activityItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
    transition: 'all 0.3s ease'
  },
  activityIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  activityContent: {
    flex: 1
  },
  activityText: {
    fontSize: '14px',
    color: '#2C3E50',
    margin: '0 0 4px 0'
  },
  activityTime: {
    fontSize: '12px',
    color: '#6c757d'
  },
  notificationBadge: {
    backgroundColor: '#DC3545',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '8px'
  },
  notificationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  notificationItem: {
    padding: '12px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    transition: 'all 0.3s ease'
  },
  notificationIcon: {
    marginTop: '2px',
    flexShrink: 0
  },
  notificationContent: {
    flex: 1
  },
  notificationTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2C3E50',
    margin: '0 0 4px 0'
  },
  notificationMessage: {
    fontSize: '14px',
    color: '#6c757d',
    margin: '0 0 4px 0'
  },
  notificationTime: {
    fontSize: '12px',
    color: '#6c757d'
  },
  unreadDot: {
    width: '8px',
    height: '8px',
    backgroundColor: '#D4A017',
    borderRadius: '50%',
    marginTop: '8px',
    flexShrink: 0
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px'
  },
  actionBtn: {
    backgroundColor: '#F5F5DC',
    color: '#4B5320',
    border: 'none',
    padding: '16px 12px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  },
  deadlineList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  deadlineItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px',
    borderRadius: '8px',
    backgroundColor: '#F8F9FA',
    transition: 'all 0.3s ease'
  },
  deadlineDate: {
    color: 'white',
    padding: '8px',
    borderRadius: '6px',
    textAlign: 'center',
    minWidth: '50px',
    flexShrink: 0
  },
  deadlineDay: {
    fontSize: '18px',
    fontWeight: '700',
    display: 'block'
  },
  deadlineMonth: {
    fontSize: '12px',
    display: 'block'
  },
  deadlineContent: {
    flex: 1
  },
  deadlineTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2C3E50',
    margin: '0 0 4px 0'
  },
  deadlineType: {
    fontSize: '12px',
    color: '#6c757d',
    marginLeft: '4px'
  },
  deadlineTime: {
    fontSize: '12px',
    color: '#6c757d',
    display: 'block',
    marginBottom: '2px'
  },
  deadlineSubject: {
    fontSize: '12px',
    color: '#4B5320',
    backgroundColor: '#F5F5DC',
    padding: '2px 8px',
    borderRadius: '10px',
    display: 'inline-block',
    marginRight: '6px'
  },
  deadlineBatch: {
    fontSize: '12px',
    color: '#6c757d',
    fontStyle: 'italic'
  }
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .stat-card:hover {
    transform: translateY(-2px);
    boxShadow: 0 4px 12px rgba(0,0,0,0.12);
  }

  .test-card:hover {
    boxShadow: 0 4px 12px rgba(0,0,0,0.1);
    border-color: #D4A017;
  }

  .start-test-btn:hover {
    background-color: #C69500;
    transform: translateY(-1px);
  }

  .preview-btn:hover {
    background-color: #4B5320;
    color: white;
  }

  .view-profile-btn:hover {
    background-color: #C69500;
  }

  .view-all-btn:hover {
    color: #C69500;
  }

  .action-btn:hover {
    background-color: #e6e6c3;
    transform: translateY(-1px);
  }

  .notification-item:hover {
    background-color: #f8f9fa;
  }

  .activity-item:hover {
    background-color: #f8f9fa;
  }

  .deadline-item:hover {
    background-color: #f0f0f0;
  }
`;
document.head.appendChild(styleSheet);

export default Dashboard;