import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  FiClock, FiCheckCircle, FiArrowLeft, FiFlag, FiHelpCircle,
  FiBook, FiAlertCircle, FiSave, FiSend,
  FiList, FiChevronLeft, FiChevronRight, FiMaximize, FiZap,
  FiTarget, FiCheck, FiUser, FiHome, FiRefreshCw, FiChevronsRight,
  FiMinimize, FiX, FiPlay, FiPause, FiLock, FiAlertTriangle,
  FiCalendar, FiBarChart2, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import axios from 'axios';

// Brand colors - moved outside component for global access
const COLORS = {
  primary: '#4B5320', // Army Green
  primaryLight: '#5D6522',
  primaryDark: '#3A4019',
  secondary: '#90EE90', // Light Green
  secondaryDark: '#7CCD7C',
  accent: '#FFA500', // Orange
  accentLight: '#FFB74D',
  accentDark: '#FF9800',
  danger: '#DC2626',
  warning: '#F59E0B',
  success: '#10B981',
  dark: '#1F2937',
  gray: '#6B7280',
  lightGray: '#E5E7EB',
  background: '#F8F9FA',
  white: '#FFFFFF',
  paper: '#F5F5F0',
  border: '#D1D5DB'
};

const TestTaking = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  // Use COLORS instead of colors
  const colors = COLORS;

  // State
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [markedQuestions, setMarkedQuestions] = useState([]);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [timeWarning, setTimeWarning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);
  const [serverLogs, setServerLogs] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [progressSaved, setProgressSaved] = useState(true);

  // Effects
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    initializeTest();
  }, [testId, user, navigate]);

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && testStarted && !isPaused && !isSubmitted) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 300) setTimeWarning(true);
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
        setElapsedTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, testStarted, isPaused, isSubmitted]);

  // Auto-save progress every 30 seconds
  useEffect(() => {
    if (testStarted && !isSubmitted) {
      const saveInterval = setInterval(() => {
        saveProgress();
      }, 30000);
      return () => clearInterval(saveInterval);
    }
  }, [testStarted, isSubmitted, answers, elapsedTime]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // API Functions
  const initializeTest = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Check if student can take the test
      const canTakeRes = await axios.get(`http://localhost:5000/api/tests/${testId}/can-take`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!canTakeRes.data.canTake) {
        throw new Error(canTakeRes.data.reason || 'You cannot take this test at the moment.');
      }

      // Start test session (simple version - just marks as started)
      const startRes = await axios.post(`http://localhost:5000/api/tests/${testId}/start`, {}, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!startRes.data.success) {
        throw new Error('Failed to start test session');
      }

      // Load test details
      const testRes = await axios.get(`http://localhost:5000/api/tests/${testId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setTest(testRes.data.test);
      
      // Load questions
      const questionsRes = await axios.get(`http://localhost:5000/api/tests/${testId}/questions`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setQuestions(questionsRes.data.questions || []);
      
      // Set duration
      const durationSeconds = (testRes.data.test.duration || 60) * 60;
      setTimeLeft(durationSeconds);
      
      setTestStarted(true);
      
    } catch (err) {
      console.error('Error initializing test:', err);
      setError(err.message);
      alert(`Cannot start test: ${err.message}`);
      navigate('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const progressData = {
        answers,
        currentQuestion,
        markedQuestions,
        elapsedTime
      };
      
      const res = await axios.post(`http://localhost:5000/api/tests/${testId}/save-progress`, progressData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.data.success) {
        setProgressSaved(true);
      }
    } catch (err) {
      console.warn('Failed to save progress:', err);
      setProgressSaved(false);
    }
  };

  const submitTest = async () => {
    try {
      setIsSubmitted(true);
      const token = localStorage.getItem('token');
      
      const submissionData = {
        answers: Object.keys(answers).reduce((acc, qId) => {
          if (answers[qId] !== undefined && answers[qId] !== null) {
            acc[qId] = String(answers[qId]);
          }
          return acc;
        }, {}),
        timeSpent: elapsedTime
      };
      
      const response = await axios.post(`http://localhost:5000/api/tests/${testId}/submit`, submissionData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = response.data;
      
      if (result.success) {
        navigate(`/student/test/results/${testId}`, {
          state: {
            result: result.result,
            testTitle: test?.title
          }
        });
      }
      
    } catch (err) {
      console.error('Submit error:', err);
      setSubmissionError(err.response?.data?.error || err.message);
      setIsSubmitted(false);
    }
  };

  const handleAutoSubmit = () => {
    if (window.confirm('Time is up! Your test will be submitted automatically.')) {
      submitTest();
    } else {
      submitTest();
    }
  };

  // Helper Functions
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (questionId, optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
    setProgressSaved(false);
  };

  const toggleMarkQuestion = (index) => {
    setMarkedQuestions(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
    setProgressSaved(false);
  };

  const getQuestionStatus = (index) => {
    const question = questions[index];
    if (!question) return 'unanswered';
    if (answers[question._id] !== undefined) return 'answered';
    if (markedQuestions.includes(index)) return 'marked';
    return 'unanswered';
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const togglePause = () => {
    if (isPaused) {
      if (window.confirm('Resume test? Timer will continue.')) {
        setIsPaused(false);
      }
    } else {
      setIsPaused(true);
    }
  };

  // Styles object - using COLORS directly
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: COLORS.background,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      overflow: 'hidden'
    },

    // Loading Screen
    loadingScreen: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`
    },
    loadingContainer: {
      textAlign: 'center',
      color: COLORS.white
    },
    spinner: {
      width: '60px',
      height: '60px',
      border: `4px solid rgba(255, 255, 255, 0.3)`,
      borderTop: `4px solid ${COLORS.white}`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      margin: '0 auto 24px'
    },
    loadingTitle: {
      fontSize: '24px',
      fontWeight: '700',
      margin: '0 0 8px 0'
    },
    loadingSubtitle: {
      fontSize: '16px',
      opacity: 0.9,
      margin: '0 0 24px 0'
    },
    loadingProgress: {
      width: '200px',
      height: '4px',
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      borderRadius: '2px',
      margin: '0 auto'
    },
    loadingBar: {
      width: '60%',
      height: '100%',
      backgroundColor: COLORS.white,
      borderRadius: '2px',
      animation: 'pulse 2s infinite'
    },

    // Error Screen
    errorScreen: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px'
    },
    errorContainer: {
      textAlign: 'center',
      maxWidth: '500px',
      padding: '48px',
      backgroundColor: COLORS.white,
      borderRadius: '12px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
    },
    errorTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: COLORS.dark,
      margin: '24px 0 12px'
    },
    errorMessage: {
      fontSize: '16px',
      color: COLORS.gray,
      marginBottom: '32px'
    },
    errorButtons: {
      display: 'flex',
      gap: '16px',
      justifyContent: 'center'
    },

    // Modal Styles
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      backdropFilter: 'blur(4px)'
    },
    modalContent: {
      backgroundColor: COLORS.white,
      borderRadius: '12px',
      maxWidth: '800px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'hidden',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
    },
    modalHeader: {
      padding: '32px 40px',
      color: COLORS.white,
      position: 'relative'
    },
    modalTitle: {
      fontSize: '28px',
      fontWeight: '800',
      margin: '0 0 4px 0'
    },
    modalSubtitle: {
      fontSize: '16px',
      opacity: 0.9
    },
    testBadge: {
      position: 'absolute',
      right: '40px',
      top: '32px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: '600'
    },

    // Instructions
    instructionsContent: {
      padding: '32px 40px',
      overflowY: 'auto',
      maxHeight: 'calc(90vh - 200px)'
    },
    instructionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px',
      marginBottom: '32px'
    },
    instructionCard: {
      padding: '20px',
      backgroundColor: COLORS.background,
      borderRadius: '8px',
      textAlign: 'center'
    },
    instructionIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px',
      fontSize: '20px'
    },
    guidelines: {
      marginTop: '32px'
    },
    guidelinesTitle: {
      fontSize: '18px',
      fontWeight: '700',
      color: COLORS.primary,
      marginBottom: '16px'
    },
    guidelinesList: {
      lineHeight: 1.8,
      paddingLeft: '20px',
      marginBottom: '24px'
    },
    warningBox: {
      display: 'flex',
      alignItems: 'center',
      padding: '16px',
      backgroundColor: `${COLORS.warning}20`,
      border: `1px solid ${COLORS.warning}40`,
      borderRadius: '8px',
      color: COLORS.warning,
      fontSize: '14px'
    },
    modalFooter: {
      padding: '24px 40px',
      borderTop: `1px solid ${COLORS.border}`,
      display: 'flex',
      justifyContent: 'center',
      gap: '16px'
    },

    // Confirmation Modal
    confirmationHeader: {
      padding: '32px 32px 24px',
      textAlign: 'center'
    },
    confirmationTitle: {
      fontSize: '24px',
      fontWeight: '800',
      color: COLORS.dark,
      margin: '16px 0 8px 0'
    },
    confirmationText: {
      fontSize: '14px',
      color: COLORS.gray,
      lineHeight: 1.6,
      margin: 0
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '20px',
      padding: '0 32px 32px'
    },
    statItem: {
      textAlign: 'center'
    },
    statNumber: {
      fontSize: '32px',
      fontWeight: '800',
      color: COLORS.primary,
      marginBottom: '4px'
    },
    statLabel: {
      fontSize: '12px',
      color: COLORS.gray,
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    errorAlert: {
      padding: '12px 32px',
      backgroundColor: `${COLORS.danger}20`,
      color: COLORS.danger,
      borderRadius: '8px',
      fontSize: '14px',
      margin: '0 32px 24px'
    },
    confirmationFooter: {
      padding: '24px 32px',
      borderTop: `1px solid ${COLORS.border}`,
      display: 'flex',
      justifyContent: 'center',
      gap: '16px'
    },

    // Header
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      backgroundColor: COLORS.white,
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px'
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      backgroundColor: 'transparent',
      border: `1px solid ${COLORS.border}`,
      borderRadius: '6px',
      color: COLORS.primary,
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px'
    },
    testInfo: {
      display: 'flex',
      flexDirection: 'column'
    },
    testTitle: {
      fontSize: '16px',
      fontWeight: '700',
      color: COLORS.dark,
      margin: '0 0 4px 0'
    },
    testMeta: {
      display: 'flex',
      gap: '12px',
      fontSize: '12px',
      color: COLORS.gray
    },
    testMetaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      backgroundColor: COLORS.background,
      padding: '4px 8px',
      borderRadius: '4px'
    },
    timerContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    timer: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      borderRadius: '25px',
      fontWeight: '600',
      fontSize: '16px',
      color: COLORS.white,
      position: 'relative'
    },
    timeWarning: {
      position: 'absolute',
      top: '-18px',
      fontSize: '11px',
      fontWeight: '600',
      animation: 'pulse 1s infinite',
      backgroundColor: COLORS.warning,
      padding: '2px 8px',
      borderRadius: '10px',
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    pauseButton: {
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.primary,
      color: COLORS.white,
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer'
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    iconButton: {
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      color: COLORS.primary,
      cursor: 'pointer'
    },

    // Main Content
    mainContent: {
      padding: '20px',
      maxWidth: '1400px',
      margin: '0 auto',
      width: '100%'
    },
    contentWrapper: {
      display: 'flex',
      gap: '20px',
      position: 'relative'
    },
    questionSection: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column'
    },
    sidebar: {
      width: '260px'
    },

    // Question Display
    questionDisplay: {
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 300px)',
      backgroundColor: COLORS.white,
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden'
    },
    questionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '16px',
      borderBottom: `1px solid ${COLORS.border}`
    },
    questionInfo: {
      display: 'flex',
      alignItems: 'baseline',
      gap: '8px'
    },
    questionNumber: {
      fontSize: '18px',
      fontWeight: '800',
      color: COLORS.primary
    },
    questionTotal: {
      fontSize: '14px',
      color: COLORS.gray,
      fontWeight: '600'
    },
    statusBadge: {
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'uppercase',
      marginLeft: '12px'
    },
    questionActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    marksBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      backgroundColor: COLORS.background,
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: '600',
      color: COLORS.dark
    },
    markButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      borderRadius: '20px',
      border: `1px solid ${COLORS.border}`,
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '13px',
      backgroundColor: 'transparent'
    },
    questionContent: {
      flex: 1,
      overflowY: 'auto',
      paddingRight: '8px'
    },
    questionText: {
      fontSize: '16px',
      lineHeight: 1.6,
      color: COLORS.dark,
      margin: '0 0 24px 0',
      padding: '20px',
      backgroundColor: COLORS.background,
      borderRadius: '8px',
      borderLeft: `4px solid ${COLORS.primary}`,
      minHeight: '80px'
    },
    optionsGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '10px',
      marginTop: '16px'
    },
    optionCard: {
      display: 'flex',
      alignItems: 'center',
      padding: '16px',
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textAlign: 'left',
      minHeight: '60px'
    },
    optionLetter: {
      width: '36px',
      height: '36px',
      minWidth: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px',
      fontWeight: '700',
      fontSize: '14px',
      border: `2px solid ${COLORS.border}`,
      marginRight: '16px'
    },
    optionText: {
      flex: 1,
      fontSize: '15px',
      lineHeight: 1.5,
      color: COLORS.dark
    },
    optionCheck: {
      marginLeft: '12px',
      color: COLORS.primary
    },

    // Navigation Buttons
    navButtons: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: COLORS.white,
      borderRadius: '8px',
      padding: '16px 20px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      marginTop: '16px'
    },
    navButtonPrev: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      borderRadius: '6px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px',
      border: 'none',
      minWidth: '120px',
      justifyContent: 'center',
      backgroundColor: COLORS.background,
      color: COLORS.primary,
      border: `1px solid ${COLORS.border}`
    },
    pageInfo: {
      flex: 1,
      textAlign: 'center',
      fontSize: '14px',
      color: COLORS.gray,
      fontWeight: '600'
    },
    navButtonNext: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      borderRadius: '6px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px',
      border: 'none',
      minWidth: '120px',
      justifyContent: 'center',
      backgroundColor: COLORS.primary,
      color: COLORS.white
    },
    submitButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 20px',
      borderRadius: '6px',
      fontWeight: '700',
      cursor: 'pointer',
      fontSize: '14px',
      border: 'none',
      minWidth: '140px',
      justifyContent: 'center',
      backgroundColor: COLORS.accent,
      color: COLORS.white,
      textTransform: 'uppercase'
    },

    // Question Navigator
    navigator: {
      backgroundColor: COLORS.white,
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 280px)',
      position: 'sticky',
      top: '100px'
    },
    navigatorHeader: {
      padding: '16px',
      borderBottom: `1px solid ${COLORS.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    questionGrid: {
      flex: 1,
      overflowY: 'auto',
      padding: '12px',
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '6px'
    },
    questionButton: {
      padding: '10px',
      borderRadius: '6px',
      border: `1px solid ${COLORS.border}`,
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '13px',
      transition: 'all 0.2s ease',
      position: 'relative',
      overflow: 'hidden',
      borderBottomWidth: '3px'
    },
    markedIndicator: {
      position: 'absolute',
      bottom: '2px',
      right: '2px',
      color: COLORS.accent
    },
    legend: {
      padding: '12px 16px',
      borderTop: `1px solid ${COLORS.border}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      fontSize: '11px'
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    legendDot: {
      width: '10px',
      height: '10px',
      borderRadius: '2px'
    },

    // Sidebar Toggle
    sidebarToggle: {
      position: 'fixed',
      right: '0',
      top: '50%',
      transform: 'translateY(-50%)',
      backgroundColor: COLORS.primary,
      color: COLORS.white,
      border: 'none',
      width: '32px',
      height: '80px',
      borderRadius: '16px 0 0 16px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      zIndex: 90
    },

    // Footer
    footer: {
      backgroundColor: COLORS.white,
      borderTop: `1px solid ${COLORS.border}`,
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 99
    },
    footerContent: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 24px',
      maxWidth: '1400px',
      margin: '0 auto',
      width: '100%'
    },
    footerStats: {
      display: 'flex',
      gap: '20px',
      fontSize: '13px',
      color: COLORS.gray
    },
    footerActions: {
      display: 'flex',
      gap: '12px'
    },
    footerButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      borderRadius: '6px',
      border: `1px solid ${COLORS.border}`,
      fontWeight: '500',
      cursor: 'pointer',
      fontSize: '13px',
      backgroundColor: 'transparent',
      color: COLORS.primary
    },

    // Summary Panel
    summaryPanel: {
      padding: '16px 24px',
      borderTop: `1px solid ${COLORS.border}`,
      backgroundColor: COLORS.background,
      animation: 'slideUp 0.3s ease'
    },
    summaryHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px'
    },
    summaryStats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      marginBottom: '16px'
    },
    summaryStat: {
      textAlign: 'center'
    },
    summaryNumber: {
      fontSize: '24px',
      fontWeight: '800',
      color: COLORS.primary,
      marginBottom: '4px'
    },
    summaryLabel: {
      fontSize: '12px',
      color: COLORS.gray,
      textTransform: 'uppercase'
    },
    saveButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      borderRadius: '6px',
      border: `1px solid ${COLORS.success}`,
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '13px',
      backgroundColor: `${COLORS.success}20`,
      color: COLORS.success,
      margin: '0 auto'
    },

    // Pause Overlay
    pauseOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    },
    pauseModal: {
      textAlign: 'center',
      backgroundColor: COLORS.white,
      padding: '40px',
      borderRadius: '12px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
    },

    // Button Styles
    buttonPrimary: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
      color: COLORS.white,
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.2s ease'
    },
    buttonSecondary: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      backgroundColor: 'transparent',
      color: COLORS.primary,
      border: `1px solid ${COLORS.primary}`,
      padding: '12px 24px',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.2s ease'
    },
    buttonBegin: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: `linear-gradient(135deg, ${COLORS.secondaryDark} 0%, ${COLORS.success} 100%)`,
      color: COLORS.white,
      border: 'none',
      padding: '16px 32px',
      borderRadius: '8px',
      fontWeight: '700',
      cursor: 'pointer',
      fontSize: '16px',
      transition: 'all 0.2s ease',
      textTransform: 'uppercase'
    },
    buttonSubmit: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.accentDark} 100%)`,
      color: COLORS.white,
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      fontWeight: '700',
      cursor: 'pointer',
      fontSize: '14px',
      textTransform: 'uppercase'
    }
  };

  // UI Components
  const LoadingScreen = () => (
    <div style={styles.loadingScreen}>
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <h3 style={styles.loadingTitle}>Loading Examination...</h3>
        <p style={styles.loadingSubtitle}>Preparing your test environment</p>
        <div style={styles.loadingProgress}>
          <div style={styles.loadingBar}></div>
        </div>
      </div>
    </div>
  );

  const ErrorScreen = () => (
    <div style={styles.errorScreen}>
      <div style={styles.errorContainer}>
        <FiAlertCircle size={64} color={COLORS.danger} />
        <h2 style={styles.errorTitle}>Unable to Load Test</h2>
        <p style={styles.errorMessage}>{error}</p>
        <div style={styles.errorButtons}>
          <button style={styles.buttonPrimary} onClick={initializeTest}>
            <FiRefreshCw /> Retry
          </button>
          <button style={styles.buttonSecondary} onClick={() => navigate('/student/dashboard')}>
            <FiHome /> Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  const InstructionsModal = () => (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        <div style={{
          ...styles.modalHeader,
          background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`
        }}>
          <div>
            <h2 style={styles.modalTitle}>COMPUTER BASED TEST</h2>
            <p style={styles.modalSubtitle}>{test?.title}</p>
          </div>
          <div style={styles.testBadge}>
            <FiClock /> {test?.duration || 60} minutes
          </div>
        </div>
        
        <div style={styles.instructionsContent}>
          <div style={styles.instructionsGrid}>
            <div style={styles.instructionCard}>
              <div style={{...styles.instructionIcon, backgroundColor: `${COLORS.primary}20`}}>
                <FiClock color={COLORS.primary} />
              </div>
              <h4>Time Limit</h4>
              <p>{test?.duration || 60} minutes total</p>
            </div>
            
            <div style={styles.instructionCard}>
              <div style={{...styles.instructionIcon, backgroundColor: `${COLORS.secondary}20`}}>
                <FiBook color={COLORS.secondaryDark} />
              </div>
              <h4>Questions</h4>
              <p>{questions.length} total questions</p>
            </div>
            
            <div style={styles.instructionCard}>
              <div style={{...styles.instructionIcon, backgroundColor: `${COLORS.accent}20`}}>
                <FiFlag color={COLORS.accent} />
              </div>
              <h4>Navigation</h4>
              <p>Mark questions for review</p>
            </div>
            
            <div style={styles.instructionCard}>
              <div style={{...styles.instructionIcon, backgroundColor: `${COLORS.success}20`}}>
                <FiSave color={COLORS.success} />
              </div>
              <h4>Auto-save</h4>
              <p>Progress saved automatically</p>
            </div>
          </div>
          
          <div style={styles.guidelines}>
            <h3 style={styles.guidelinesTitle}>EXAMINATION RULES</h3>
            <ul style={styles.guidelinesList}>
              <li>Do not refresh or close the browser during the test</li>
              <li>Timer starts when you click "Begin Examination"</li>
              <li>All answers are saved automatically</li>
              <li>Use "Mark for Review" to flag questions</li>
              <li>You can navigate between questions freely</li>
              <li>Submit only when you are completely finished</li>
              <li>Fullscreen mode is recommended for better focus</li>
            </ul>
            
            <div style={styles.warningBox}>
              <FiAlertTriangle style={{marginRight: '10px'}} />
              <span><strong>Warning:</strong> Any attempt to cheat will result in automatic disqualification</span>
            </div>
          </div>
        </div>
        
        <div style={styles.modalFooter}>
          <button style={styles.buttonSecondary} onClick={() => navigate('/student/dashboard')}>
            <FiArrowLeft /> Cancel
          </button>
          <button style={styles.buttonBegin} onClick={() => setShowInstructions(false)}>
            <FiPlay /> BEGIN EXAMINATION
          </button>
        </div>
      </div>
    </div>
  );

  const ConfirmationModal = () => {
    const answered = Object.keys(answers).length;
    const pending = questions.length - answered;
    
    return (
      <div style={styles.modalOverlay}>
        <div style={{...styles.modalContent, maxWidth: '600px'}}>
          <div style={styles.confirmationHeader}>
            <FiAlertTriangle size={48} color={COLORS.warning} />
            <h2 style={styles.confirmationTitle}>SUBMIT EXAMINATION?</h2>
            <p style={styles.confirmationText}>
              Please confirm you want to submit your test. This action cannot be undone.
            </p>
          </div>
          
          <div style={styles.statsGrid}>
            <div style={styles.statItem}>
              <div style={styles.statNumber}>{answered}</div>
              <div style={styles.statLabel}>Answered</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statNumber}>{markedQuestions.length}</div>
              <div style={styles.statLabel}>Marked</div>
            </div>
            <div style={styles.statItem}>
              <div style={styles.statNumber}>{pending}</div>
              <div style={styles.statLabel}>Pending</div>
            </div>
          </div>
          
          {submissionError && (
            <div style={styles.errorAlert}>
              <strong>Error:</strong> {submissionError}
            </div>
          )}
          
          <div style={styles.confirmationFooter}>
            <button 
              style={styles.buttonSecondary}
              onClick={() => setShowConfirmation(false)}
              disabled={isSubmitted}
            >
              Continue Test
            </button>
            <button 
              style={{...styles.buttonSubmit, backgroundColor: COLORS.warning}}
              onClick={submitTest}
              disabled={isSubmitted}
            >
              {isSubmitted ? 'Submitting...' : 'SUBMIT TEST'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const TimerDisplay = () => (
    <div style={{
      ...styles.timer,
      backgroundColor: timeWarning ? COLORS.warning : COLORS.primary,
      boxShadow: timeWarning ? `0 4px 20px ${COLORS.warning}40` : `0 4px 20px ${COLORS.primary}40`
    }}>
      <FiClock />
      <span style={{ fontVariant: 'tabular-nums', fontWeight: '700' }}>
        {formatTime(timeLeft)}
      </span>
      {timeWarning && (
        <div style={styles.timeWarning}>
          <FiAlertTriangle size={12} /> Time running out!
        </div>
      )}
    </div>
  );

  const QuestionNavigator = () => (
    <div style={styles.navigator}>
      <div style={styles.navigatorHeader}>
        <h3>Question Navigator</h3>
        <button onClick={() => setSidebarOpen(false)}>
          <FiChevronLeft />
        </button>
      </div>
      
      <div style={styles.questionGrid}>
        {questions.map((_, index) => {
          const status = getQuestionStatus(index);
          return (
            <button
              key={index}
              style={{
                ...styles.questionButton,
                borderColor: currentQuestion === index ? COLORS.primary : COLORS.border,
                backgroundColor: currentQuestion === index ? `${COLORS.primary}10` : COLORS.white,
                color: currentQuestion === index ? COLORS.primary : COLORS.dark,
                borderBottomColor: 
                  status === 'answered' ? COLORS.secondaryDark :
                  status === 'marked' ? COLORS.accent : COLORS.border
              }}
              onClick={() => {
                setCurrentQuestion(index);
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              title={`Question ${index + 1}`}
            >
              {index + 1}
              {status === 'marked' && (
                <FiFlag size={10} style={styles.markedIndicator} />
              )}
            </button>
          );
        })}
      </div>
      
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{...styles.legendDot, backgroundColor: COLORS.secondaryDark}}></div>
          <span>Answered</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{...styles.legendDot, backgroundColor: COLORS.accent}}></div>
          <span>Marked</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{...styles.legendDot, backgroundColor: COLORS.border}}></div>
          <span>Unanswered</span>
        </div>
      </div>
    </div>
  );

  const QuestionDisplay = () => {
    const question = questions[currentQuestion];
    const status = getQuestionStatus(currentQuestion);
    
    return (
      <div style={styles.questionDisplay}>
        <div style={styles.questionHeader}>
          <div style={styles.questionInfo}>
            <span style={styles.questionNumber}>QUESTION {currentQuestion + 1}</span>
            <span style={styles.questionTotal}>of {questions.length}</span>
            <div style={{
              ...styles.statusBadge,
              backgroundColor: status === 'answered' ? `${COLORS.secondary}30` : 
                              status === 'marked' ? `${COLORS.accent}30` : `${COLORS.lightGray}30`,
              color: status === 'answered' ? COLORS.secondaryDark : 
                    status === 'marked' ? COLORS.accent : COLORS.gray
            }}>
              {status === 'answered' ? 'ANSWERED' : status === 'marked' ? 'MARKED' : 'NOT ANSWERED'}
            </div>
          </div>
          
          <div style={styles.questionActions}>
            <div style={styles.marksBadge}>
              <FiTarget /> {question?.marks || 1} mark{question?.marks !== 1 ? 's' : ''}
            </div>
            <button
              style={{
                ...styles.markButton,
                borderColor: status === 'marked' ? COLORS.accent : COLORS.border,
                backgroundColor: status === 'marked' ? `${COLORS.accent}20` : 'transparent',
                color: status === 'marked' ? COLORS.accent : COLORS.gray
              }}
              onClick={() => toggleMarkQuestion(currentQuestion)}
            >
              <FiFlag /> {status === 'marked' ? 'MARKED' : 'MARK'}
            </button>
          </div>
        </div>
        
        <div style={styles.questionContent}>
          <div style={styles.questionText}>
            {question?.text}
          </div>
          
          {question?.options && question.options.length > 0 && (
            <div style={styles.optionsGrid}>
              {question.options.map((option, idx) => {
                const isSelected = answers[question._id] === idx;
                return (
                  <div
                    key={idx}
                    style={{
                      ...styles.optionCard,
                      borderColor: isSelected ? COLORS.primary : COLORS.border,
                      backgroundColor: isSelected ? `${COLORS.primary}10` : COLORS.white,
                      boxShadow: isSelected ? `0 4px 12px ${COLORS.primary}20` : 'none'
                    }}
                    onClick={() => handleAnswerSelect(question._id, idx)}
                  >
                    <div style={{
                      ...styles.optionLetter,
                      backgroundColor: isSelected ? COLORS.primary : COLORS.white,
                      color: isSelected ? COLORS.white : COLORS.primary,
                      borderColor: isSelected ? COLORS.primary : COLORS.border
                    }}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <div style={styles.optionText}>{option}</div>
                    {isSelected && (
                      <div style={styles.optionCheck}>
                        <FiCheck color={COLORS.primary} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const NavigationButtons = () => (
    <div style={styles.navButtons}>
      <button
        style={{
          ...styles.navButtonPrev,
          opacity: currentQuestion === 0 ? 0.5 : 1
        }}
        onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
        disabled={currentQuestion === 0}
      >
        <FiChevronLeft /> Previous
      </button>
      
      <div style={styles.pageInfo}>
        <span>Question {currentQuestion + 1} of {questions.length}</span>
      </div>
      
      {currentQuestion < questions.length - 1 ? (
        <button
          style={styles.navButtonNext}
          onClick={() => setCurrentQuestion(prev => Math.min(questions.length - 1, prev + 1))}
        >
          Next <FiChevronRight />
        </button>
      ) : (
        <button
          style={styles.submitButton}
          onClick={() => setShowConfirmation(true)}
        >
          <FiSend /> SUBMIT TEST
        </button>
      )}
    </div>
  );

  const SummaryPanel = () => (
    <div style={styles.summaryPanel}>
      <div style={styles.summaryHeader}>
        <h3>Test Summary</h3>
        <button onClick={() => setShowSummary(false)}>
          <FiChevronUp />
        </button>
      </div>
      <div style={styles.summaryStats}>
        <div style={styles.summaryStat}>
          <div style={styles.summaryNumber}>{Object.keys(answers).length}</div>
          <div style={styles.summaryLabel}>Answered</div>
        </div>
        <div style={styles.summaryStat}>
          <div style={styles.summaryNumber}>{markedQuestions.length}</div>
          <div style={styles.summaryLabel}>Marked</div>
        </div>
        <div style={styles.summaryStat}>
          <div style={styles.summaryNumber}>{questions.length - Object.keys(answers).length}</div>
          <div style={styles.summaryLabel}>Remaining</div>
        </div>
        <div style={styles.summaryStat}>
          <div style={styles.summaryNumber}>{Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}</div>
          <div style={styles.summaryLabel}>Time Used</div>
        </div>
      </div>
      <button 
        style={styles.saveButton}
        onClick={saveProgress}
        title={progressSaved ? "Progress saved" : "Save progress"}
      >
        <FiSave /> {progressSaved ? "Saved" : "Save Now"}
      </button>
    </div>
  );

  // Main Render
  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen />;

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backButton} onClick={() => navigate('/student/dashboard')}>
            <FiArrowLeft /> Exit
          </button>
          <div style={styles.testInfo}>
            <h1 style={styles.testTitle}>{test?.title}</h1>
            <div style={styles.testMeta}>
              <span style={styles.testMetaItem}>
                <FiBook /> {test?.subject}
              </span>
              <span style={styles.testMetaItem}>
                <FiUser /> {test?.class?.name || 'General'}
              </span>
              <span style={styles.testMetaItem}>
                <FiCalendar /> CBT Examination
              </span>
            </div>
          </div>
        </div>
        
        <div style={styles.timerContainer}>
          <TimerDisplay />
          <button 
            style={styles.pauseButton}
            onClick={togglePause}
            title={isPaused ? "Resume test" : "Pause test"}
          >
            {isPaused ? <FiPlay /> : <FiPause />}
          </button>
        </div>
        
        <div style={styles.headerRight}>
          <button 
            style={styles.iconButton}
            onClick={saveProgress}
            title={progressSaved ? "Progress saved" : "Save progress"}
          >
            <FiSave style={progressSaved ? {color: COLORS.success} : {}} />
          </button>
          <button 
            style={styles.iconButton}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Navigator"
          >
            <FiList />
          </button>
          <button 
            style={styles.iconButton}
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <FiMinimize /> : <FiMaximize />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.mainContent}>
        <div style={styles.contentWrapper}>
          {/* Left Content */}
          <div style={styles.questionSection}>
            <QuestionDisplay />
            <NavigationButtons />
          </div>
          
          {/* Right Sidebar */}
          {sidebarOpen && (
            <div style={styles.sidebar}>
              <QuestionNavigator />
            </div>
          )}
          
          {/* Sidebar Toggle */}
          {!sidebarOpen && (
            <button 
              style={styles.sidebarToggle}
              onClick={() => setSidebarOpen(true)}
            >
              <FiChevronsRight />
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerStats}>
            <span>Answered: {Object.keys(answers).length}</span>
            <span>Marked: {markedQuestions.length}</span>
            <span>Remaining: {questions.length - Object.keys(answers).length}</span>
            <span>Time: {formatTime(timeLeft)}</span>
          </div>
          <div style={styles.footerActions}>
            <button
              style={styles.footerButton}
              onClick={() => setShowSummary(!showSummary)}
            >
              {showSummary ? <FiChevronDown /> : <FiBarChart2 />}
              {showSummary ? 'Hide Summary' : 'Show Summary'}
            </button>
            <button
              style={styles.footerButton}
              onClick={() => setShowInstructions(true)}
            >
              <FiHelpCircle /> Instructions
            </button>
          </div>
        </div>
        
        {showSummary && <SummaryPanel />}
        
        {isPaused && (
          <div style={styles.pauseOverlay}>
            <div style={styles.pauseModal}>
              <FiLock size={48} color={COLORS.primary} />
              <h3>TEST PAUSED</h3>
              <p>Timer has been paused. Click resume to continue.</p>
              <button style={styles.buttonPrimary} onClick={() => setIsPaused(false)}>
                <FiPlay /> Resume Test
              </button>
            </div>
          </div>
        )}
      </footer>

      {/* Modals */}
      {showInstructions && <InstructionsModal />}
      {showConfirmation && <ConfirmationModal />}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: ${COLORS.lightGray};
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: ${COLORS.gray};
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: ${COLORS.dark};
        }
        
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        button:hover:not(:disabled) {
          transform: translateY(-2px);
          transition: transform 0.2s ease;
        }
      `}</style>
    </div>
  );
};

export default TestTaking;