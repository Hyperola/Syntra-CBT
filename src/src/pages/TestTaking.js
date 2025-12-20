import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  FiClock, FiCheckCircle, FiArrowLeft, FiFlag, FiHelpCircle,
  FiBook, FiAlertCircle, FiSave, FiSend,
  FiList, FiChevronLeft, FiChevronRight, FiMaximize, FiZap,
  FiTarget, FiCheck, FiUser, FiHome, FiRefreshCw, FiChevronsRight,
  FiMinimize, FiX, FiPlay, FiPause, FiLock, FiAlertTriangle,
  FiCalendar, FiBarChart2, FiChevronDown, FiChevronUp,
  FiChevronUpCircle, FiChevronDownCircle, FiCheckSquare,
  FiSquare, FiExternalLink, FiCornerDownRight, FiCornerUpLeft,
  FiMessageSquare, FiUploadCloud, FiShield, FiInfo
} from 'react-icons/fi';
import axios from 'axios';

// Modern Color Palette
const COLORS = {
  primary: '#4B5320',
  primaryLight: '#5D6522',
  primaryLighter: '#ECFDF5',
  primaryDark: '#3A4019',
  secondary: '#10B981',
  secondaryLight: '#D1FAE5',
  secondaryDark: '#059669',
  accent: '#F59E0B',
  accentLight: '#FEF3C7',
  accentDark: '#D97706',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  white: '#FFFFFF',
  lightGray: '#F9FAFB',
  gray: '#6B7280',
  darkGray: '#374151',
  dark: '#111827',
  border: '#E5E7EB',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

const TestTaking = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const instructionsContentRef = useRef(null);
  const questionBodyRef = useRef(null);
  
  // Main States
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
  const [isPaused, setIsPaused] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [progressSaved, setProgressSaved] = useState(true);
  const [navigationMode, setNavigationMode] = useState('standard');
  const [compactMode, setCompactMode] = useState(false);

  // Initialize test
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    initializeTest();
  }, [testId, user, navigate]);

  // Timer management
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

  // Auto-save progress
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

  // Adjust layout based on question size
  useEffect(() => {
    const checkLayout = () => {
      if (questionBodyRef.current) {
        const questionHeight = questionBodyRef.current.scrollHeight;
        const containerHeight = window.innerHeight - 180; // Account for header/footer
        setCompactMode(questionHeight > containerHeight * 0.8);
      }
    };
    
    checkLayout();
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, [currentQuestion, questions]);

  // API Functions
  const initializeTest = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const canTakeRes = await axios.get(`http://localhost:5000/api/tests/${testId}/can-take`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!canTakeRes.data.canTake) {
        throw new Error(canTakeRes.data.reason || 'You cannot take this test at the moment.');
      }

      await axios.post(`http://localhost:5000/api/tests/${testId}/start`, {}, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const testRes = await axios.get(`http://localhost:5000/api/tests/${testId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setTest(testRes.data.test);

      const questionsRes = await axios.get(`http://localhost:5000/api/tests/${testId}/questions`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setQuestions(questionsRes.data.questions || []);

      const durationSeconds = (testRes.data.test.duration || 60) * 60;
      setTimeLeft(durationSeconds);
      setTestStarted(true);
      
    } catch (err) {
      console.error('Error initializing test:', err);
      setError(err.message || 'Failed to initialize test');
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
      
      await axios.post(`http://localhost:5000/api/tests/${testId}/save-progress`, progressData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setProgressSaved(true);
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
      
      if (response.data.success) {
        navigate('/student/dashboard', {
          state: {
            message: 'Test submitted successfully!',
            testTitle: test?.title,
            timestamp: new Date().toISOString()
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

  const navigateToQuestion = (index) => {
    setCurrentQuestion(index);
    if (navigationMode === 'review') {
      setNavigationMode('standard');
    }
  };

  const getFilteredQuestions = () => {
    switch (navigationMode) {
      case 'marked':
        return markedQuestions;
      case 'review':
        return questions
          .map((q, idx) => ({ idx, status: getQuestionStatus(idx) }))
          .filter(q => q.status === 'answered' || markedQuestions.includes(q.idx))
          .map(q => q.idx);
      default:
        return questions.map((_, idx) => idx);
    }
  };

  // Modern Styles
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: COLORS.lightGray,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display: 'flex',
      flexDirection: 'column',
    },

    // Loading Screen
    loadingScreen: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
    },
    loadingContent: {
      textAlign: 'center',
      color: COLORS.white,
    },
    spinner: {
      width: '60px',
      height: '60px',
      border: '4px solid rgba(255,255,255,0.3)',
      borderTopColor: COLORS.white,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      margin: '0 auto 24px',
    },
    loadingTitle: {
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '8px',
    },
    loadingText: {
      fontSize: '14px',
      opacity: 0.9,
    },

    // Error Screen
    errorScreen: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    },
    errorCard: {
      maxWidth: '500px',
      padding: '32px',
      backgroundColor: COLORS.white,
      borderRadius: '16px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      textAlign: 'center',
    },
    errorIcon: {
      margin: '0 auto 20px',
      color: COLORS.danger,
    },
    errorTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: COLORS.danger,
      marginBottom: '12px',
    },
    errorMessage: {
      color: COLORS.gray,
      marginBottom: '24px',
      lineHeight: 1.5,
      fontSize: '14px',
    },
    errorActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
    },

    // Instructions Modal - FIXED SCROLLING
    instructionsModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: COLORS.overlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      backdropFilter: 'blur(8px)',
    },
    instructionsContent: {
      maxWidth: '800px',
      width: '100%',
      maxHeight: '90vh',
      backgroundColor: COLORS.white,
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
    },
    instructionsHeader: {
      padding: '24px 32px',
      background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
      color: COLORS.white,
      flexShrink: 0,
    },
    instructionsTitle: {
      fontSize: '22px', // Reduced from 28px
      fontWeight: '700',
      marginBottom: '6px',
    },
    instructionsSubtitle: {
      fontSize: '14px', // Reduced from 16px
      opacity: 0.9,
    },
    instructionsBody: {
      padding: '24px 32px',
      overflowY: 'auto',
      flex: 1,
      maxHeight: 'calc(90vh - 200px)',
    },
    instructionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
    },
    instructionCard: {
      padding: '20px',
      backgroundColor: COLORS.lightGray,
      borderRadius: '12px',
      textAlign: 'center',
      transition: 'transform 0.2s',
      cursor: 'default',
      '&:hover': {
        transform: 'translateY(-2px)',
      },
    },
    instructionIcon: {
      width: '48px',
      height: '48px',
      margin: '0 auto 12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      fontSize: '20px',
    },
    instructionTitle: {
      fontSize: '14px', // Reduced
      fontWeight: '600',
      marginBottom: '6px',
      color: COLORS.dark,
    },
    instructionText: {
      fontSize: '13px', // Reduced
      color: COLORS.gray,
    },
    guidelinesSection: {
      backgroundColor: COLORS.lightGray,
      padding: '20px',
      borderRadius: '12px',
      marginBottom: '20px',
    },
    guidelinesTitle: {
      fontSize: '16px', // Reduced
      fontWeight: '600',
      color: COLORS.primary,
      marginBottom: '12px',
    },
    guidelinesList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    },
    guidelineItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      color: COLORS.darkGray,
      fontSize: '13px', // Reduced
    },
    guidelineIcon: {
      color: COLORS.secondary,
      flexShrink: 0,
      marginTop: '2px',
      fontSize: '14px',
    },
    warningSection: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '16px',
      backgroundColor: `${COLORS.warning}10`,
      border: `1px solid ${COLORS.warning}`,
      borderRadius: '12px',
      color: COLORS.warning,
      marginTop: '20px',
      fontSize: '13px',
    },
    instructionsFooter: {
      padding: '20px 32px',
      borderTop: `1px solid ${COLORS.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexShrink: 0,
    },

    // Header
    header: {
      backgroundColor: COLORS.white,
      padding: '16px 24px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '20px',
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flex: 1,
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 14px',
      backgroundColor: COLORS.lightGray,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      color: COLORS.primary,
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontSize: '13px',
      '&:hover': {
        backgroundColor: `${COLORS.primary}10`,
      },
    },
    testInfo: {
      flex: 1,
    },
    testTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: COLORS.dark,
      marginBottom: '2px',
    },
    testMeta: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      fontSize: '12px',
      color: COLORS.gray,
    },
    metaItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 8px',
      backgroundColor: COLORS.lightGray,
      borderRadius: '12px',
    },
    timerSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    timerCard: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      background: timeWarning ? `linear-gradient(135deg, ${COLORS.warning} 0%, ${COLORS.accentDark} 100%)` : `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
      color: COLORS.white,
      borderRadius: '10px',
      fontWeight: '600',
      minWidth: '120px',
      fontSize: '14px',
      position: 'relative',
      overflow: 'hidden',
    },
    timerWarning: {
      position: 'absolute',
      top: '-6px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: COLORS.warning,
      color: COLORS.white,
      padding: '3px 8px',
      borderRadius: '8px',
      fontSize: '10px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '3px',
      whiteSpace: 'nowrap',
      animation: 'pulse 1.5s infinite',
    },
    headerControls: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    controlButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '36px',
      height: '36px',
      backgroundColor: COLORS.lightGray,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      color: COLORS.primary,
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontSize: '16px',
      '&:hover': {
        backgroundColor: `${COLORS.primary}10`,
      },
    },

    // Main Content - COMPACT LAYOUT
    mainContent: {
      flex: 1,
      display: 'flex',
      padding: '16px',
      gap: '16px',
      maxWidth: '1400px',
      margin: '0 auto',
      width: '100%',
      height: compactMode ? 'calc(100vh - 140px)' : 'auto',
      minHeight: compactMode ? 'calc(100vh - 140px)' : 'auto',
    },
    questionArea: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      minWidth: 0,
      height: compactMode ? '100%' : 'auto',
    },
    questionCard: {
      flex: 1,
      backgroundColor: COLORS.white,
      borderRadius: '12px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: compactMode ? 'calc(100% - 70px)' : 'auto',
    },
    questionHeader: {
      padding: '16px 20px',
      borderBottom: `1px solid ${COLORS.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: COLORS.lightGray,
      flexShrink: 0,
    },
    questionNav: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    questionNumber: {
      fontSize: '16px',
      fontWeight: '600',
      color: COLORS.primary,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    questionTotal: {
      fontSize: '13px',
      color: COLORS.gray,
      fontWeight: '500',
    },
    questionActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    actionButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      backgroundColor: 'transparent',
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      color: COLORS.darkGray,
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontSize: '13px',
      '&:hover': {
        backgroundColor: COLORS.lightGray,
      },
    },
    questionBody: {
      flex: 1,
      padding: compactMode ? '20px' : '24px',
      overflowY: compactMode ? 'auto' : 'visible',
      display: 'flex',
      flexDirection: 'column',
    },
    questionText: {
      fontSize: compactMode ? '16px' : '17px',
      lineHeight: 1.5,
      color: COLORS.dark,
      marginBottom: '24px',
      fontWeight: '500',
      flexShrink: 0,
    },
    optionsGrid: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: compactMode ? '10px' : '12px',
      maxHeight: compactMode ? 'calc(100% - 60px)' : 'none',
      overflowY: compactMode ? 'auto' : 'visible',
    },
    optionItem: {
      display: 'flex',
      alignItems: 'center',
      padding: compactMode ? '14px' : '16px',
      border: `2px solid ${COLORS.border}`,
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: COLORS.white,
      flexShrink: 0,
      minHeight: compactMode ? '56px' : '60px',
      '&:hover': {
        borderColor: COLORS.primary,
      },
    },
    optionLetter: {
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      backgroundColor: COLORS.lightGray,
      color: COLORS.darkGray,
      fontWeight: '600',
      fontSize: '14px',
      marginRight: '12px',
      flexShrink: 0,
    },
    optionText: {
      flex: 1,
      fontSize: compactMode ? '14px' : '15px',
      lineHeight: 1.4,
      color: COLORS.darkGray,
      wordBreak: 'break-word',
    },
    optionCheck: {
      marginLeft: '8px',
      color: COLORS.success,
      fontSize: '18px',
      flexShrink: 0,
    },
    navigationButtons: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      backgroundColor: COLORS.white,
      borderRadius: '12px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      flexShrink: 0,
      marginTop: 'auto',
    },
    pageIndicator: {
      fontSize: '14px',
      color: COLORS.gray,
      fontWeight: '500',
    },

    // Sidebar
    sidebar: {
      width: compactMode ? '280px' : '300px',
      backgroundColor: COLORS.white,
      borderRadius: '12px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      flexShrink: 0,
      height: compactMode ? '100%' : 'auto',
    },
    sidebarHeader: {
      padding: '16px 20px',
      borderBottom: `1px solid ${COLORS.border}`,
      backgroundColor: COLORS.lightGray,
    },
    sidebarTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: COLORS.primary,
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    filterTabs: {
      display: 'flex',
      gap: '6px',
      marginBottom: '12px',
    },
    filterTab: {
      flex: 1,
      padding: '8px',
      textAlign: 'center',
      backgroundColor: COLORS.white,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    questionsGrid: {
      flex: 1,
      padding: '12px',
      overflowY: 'auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
      gap: '8px',
    },
    gridButton: {
      position: 'relative',
      width: '100%',
      aspectRatio: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      border: `2px solid ${COLORS.border}`,
      backgroundColor: COLORS.white,
      color: COLORS.darkGray,
      fontWeight: '600',
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      overflow: 'hidden',
      '&:hover': {
        transform: 'scale(1.05)',
      },
    },
    flagIndicator: {
      position: 'absolute',
      top: '3px',
      right: '3px',
      fontSize: '9px',
      color: COLORS.accent,
    },
    sidebarFooter: {
      padding: '16px',
      borderTop: `1px solid ${COLORS.border}`,
      backgroundColor: COLORS.lightGray,
    },
    legend: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px',
      color: COLORS.gray,
    },
    legendDot: {
      width: '10px',
      height: '10px',
      borderRadius: '2px',
      flexShrink: 0,
    },

    // Footer
    footer: {
      padding: '12px 24px',
      backgroundColor: COLORS.white,
      borderTop: `1px solid ${COLORS.border}`,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
      position: 'sticky',
      bottom: 0,
      zIndex: 99,
    },
    footerContent: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      maxWidth: '1400px',
      margin: '0 auto',
    },
    progressStats: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    statItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13px',
      color: COLORS.darkGray,
    },
    statBadge: {
      width: '28px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '6px',
      fontWeight: '600',
      fontSize: '13px',
    },
    footerActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    footerButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 16px',
      backgroundColor: COLORS.lightGray,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      color: COLORS.primary,
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      fontSize: '13px',
      '&:hover': {
        backgroundColor: `${COLORS.primary}10`,
      },
    },
    submitButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 24px',
      background: `linear-gradient(135deg, ${COLORS.success} 0%, ${COLORS.secondaryDark} 100%)`,
      color: COLORS.white,
      border: 'none',
      borderRadius: '10px',
      fontWeight: '600',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
      },
    },

    // Confirmation Modal
    confirmationModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: COLORS.overlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      backdropFilter: 'blur(8px)',
    },
    confirmationContent: {
      maxWidth: '500px',
      width: '100%',
      backgroundColor: COLORS.white,
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
    },
    confirmationHeader: {
      padding: '24px 24px 16px',
      textAlign: 'center',
    },
    confirmationIcon: {
      margin: '0 auto 16px',
      color: COLORS.warning,
    },
    confirmationTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: COLORS.dark,
      marginBottom: '8px',
    },
    confirmationText: {
      fontSize: '14px',
      color: COLORS.gray,
      lineHeight: 1.5,
    },
    confirmationStats: {
      padding: '16px 24px',
      backgroundColor: COLORS.lightGray,
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
    },
    statCard: {
      backgroundColor: COLORS.white,
      padding: '16px',
      borderRadius: '10px',
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    },
    statValue: {
      fontSize: '20px',
      fontWeight: '700',
      color: COLORS.primary,
      marginBottom: '4px',
    },
    statLabel: {
      fontSize: '11px',
      color: COLORS.gray,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      fontWeight: '600',
    },
    confirmationFooter: {
      padding: '20px 24px',
      borderTop: `1px solid ${COLORS.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    // Pause Overlay
    pauseOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: COLORS.overlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(8px)',
    },
    pauseModal: {
      padding: '32px',
      backgroundColor: COLORS.white,
      borderRadius: '16px',
      textAlign: 'center',
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      maxWidth: '400px',
      width: '100%',
    },
    pauseIcon: {
      margin: '0 auto 16px',
      color: COLORS.primary,
    },
    pauseTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: COLORS.dark,
      marginBottom: '8px',
    },
    pauseText: {
      fontSize: '14px',
      color: COLORS.gray,
      marginBottom: '24px',
    },

    // Summary Panel
    summaryPanel: {
      marginTop: '12px',
      backgroundColor: COLORS.white,
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      border: `1px solid ${COLORS.border}`,
    },
    summaryHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
    },
    summaryTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: COLORS.primary,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    summaryStats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '12px',
    },
    summaryCard: {
      backgroundColor: COLORS.lightGray,
      padding: '12px',
      borderRadius: '8px',
      textAlign: 'center',
      transition: 'transform 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
      },
    },
    summaryValue: {
      fontSize: '20px',
      fontWeight: '700',
      color: COLORS.primary,
      marginBottom: '4px',
    },
    summaryLabel: {
      fontSize: '11px',
      color: COLORS.gray,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      fontWeight: '600',
    },
  };

  // Button Styles
  const buttonStyles = {
    primary: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 24px',
      background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`,
      color: COLORS.white,
      border: 'none',
      borderRadius: '10px',
      fontWeight: '600',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 20px rgba(75, 83, 32, 0.3)',
      },
      '&:active': {
        transform: 'translateY(0)',
      },
      '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
        transform: 'none',
      },
    },
    secondary: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 24px',
      backgroundColor: COLORS.white,
      border: `2px solid ${COLORS.primary}`,
      color: COLORS.primary,
      borderRadius: '10px',
      fontWeight: '600',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: `${COLORS.primary}10`,
        transform: 'translateY(-2px)',
      },
      '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
        transform: 'none',
      },
    },
    danger: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px 24px',
      background: `linear-gradient(135deg, ${COLORS.danger} 0%, #DC2626 100%)`,
      color: COLORS.white,
      border: 'none',
      borderRadius: '10px',
      fontWeight: '600',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)',
      },
    },
  };

  // UI Components
  const LoadingScreen = () => (
    <div style={styles.loadingScreen}>
      <div style={styles.loadingContent}>
        <div style={styles.spinner}></div>
        <h2 style={styles.loadingTitle}>Loading Test...</h2>
        <p style={styles.loadingText}>Preparing your testing environment</p>
      </div>
    </div>
  );

  const ErrorScreen = () => (
    <div style={styles.errorScreen}>
      <div style={styles.errorCard}>
        <FiAlertCircle size={40} style={styles.errorIcon} />
        <h2 style={styles.errorTitle}>Unable to Load Test</h2>
        <p style={styles.errorMessage}>
          {error || 'An error occurred while loading the test. Please try again.'}
        </p>
        <div style={styles.errorActions}>
          <button style={buttonStyles.primary} onClick={initializeTest}>
            <FiRefreshCw /> Retry
          </button>
          <button style={buttonStyles.secondary} onClick={() => navigate('/student/dashboard')}>
            <FiHome /> Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  const InstructionsModal = () => {
    const instructionCards = [
      {
        icon: <FiClock />,
        title: 'Duration',
        text: `${test?.duration || 60} minutes`,
        color: COLORS.primary,
      },
      {
        icon: <FiBook />,
        title: 'Questions',
        text: `${questions.length} total`,
        color: COLORS.secondary,
      },
      {
        icon: <FiFlag />,
        title: 'Mark for Review',
        text: 'Flag questions to review later',
        color: COLORS.accent,
      },
      {
        icon: <FiSave />,
        title: 'Auto-save',
        text: 'Progress saved automatically',
        color: COLORS.success,
      },
    ];

    return (
      <div style={styles.instructionsModal}>
        <div style={styles.instructionsContent}>
          <div style={styles.instructionsHeader}>
            <h2 style={styles.instructionsTitle}>{test?.title}</h2>
            <p style={styles.instructionsSubtitle}>Computer Based Test Instructions</p>
          </div>
          <div 
            ref={instructionsContentRef}
            style={styles.instructionsBody}
            onScroll={(e) => {
              // Prevent auto-scroll issue
              e.stopPropagation();
            }}
          >
            <div style={styles.instructionsGrid}>
              {instructionCards.map((card, index) => (
                <div key={index} style={styles.instructionCard}>
                  <div style={{
                    ...styles.instructionIcon,
                    backgroundColor: `${card.color}15`,
                    color: card.color,
                  }}>
                    {card.icon}
                  </div>
                  <h3 style={styles.instructionTitle}>{card.title}</h3>
                  <p style={styles.instructionText}>{card.text}</p>
                </div>
              ))}
            </div>
            <div style={styles.guidelinesSection}>
              <h3 style={styles.guidelinesTitle}>Test Guidelines</h3>
              <div style={styles.guidelinesList}>
                <div style={styles.guidelineItem}>
                  <FiCheckCircle style={styles.guidelineIcon} />
                  <span>Read each question carefully before answering</span>
                </div>
                <div style={styles.guidelineItem}>
                  <FiCheckCircle style={styles.guidelineIcon} />
                  <span>You can navigate between questions freely</span>
                </div>
                <div style={styles.guidelineItem}>
                  <FiCheckCircle style={styles.guidelineIcon} />
                  <span>Mark questions for review if unsure</span>
                </div>
                <div style={styles.guidelineItem}>
                  <FiCheckCircle style={styles.guidelineIcon} />
                  <span>Submit only when you're ready</span>
                </div>
                <div style={styles.guidelineItem}>
                  <FiCheckCircle style={styles.guidelineIcon} />
                  <span>Timer will auto-submit when time expires</span>
                </div>
              </div>
            </div>
            <div style={styles.warningSection}>
              <FiAlertTriangle size={16} />
              <div>
                <strong>Important:</strong> Do not refresh the page or close the browser during the test.
                Any attempt to cheat will result in disqualification.
              </div>
            </div>
          </div>
          <div style={styles.instructionsFooter}>
            <button style={buttonStyles.secondary} onClick={() => navigate('/student/dashboard')}>
              <FiArrowLeft /> Cancel
            </button>
            <button style={buttonStyles.primary} onClick={() => setShowInstructions(false)}>
              <FiPlay /> Begin Test
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ConfirmationModal = () => {
    const answeredCount = Object.keys(answers).length;
    const markedCount = markedQuestions.length;
    const pendingCount = questions.length - answeredCount;

    return (
      <div style={styles.confirmationModal}>
        <div style={styles.confirmationContent}>
          <div style={styles.confirmationHeader}>
            <FiAlertTriangle size={40} style={styles.confirmationIcon} />
            <h2 style={styles.confirmationTitle}>Submit Test?</h2>
            <p style={styles.confirmationText}>
              Are you sure you want to submit your test? This action cannot be undone.
            </p>
          </div>
          <div style={styles.confirmationStats}>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{answeredCount}</div>
                <div style={styles.statLabel}>Answered</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{markedCount}</div>
                <div style={styles.statLabel}>Marked</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{pendingCount}</div>
                <div style={styles.statLabel}>Pending</div>
              </div>
            </div>
          </div>
          {submissionError && (
            <div style={{
              padding: '12px 24px',
              backgroundColor: `${COLORS.danger}10`,
              color: COLORS.danger,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <FiAlertCircle /> {submissionError}
            </div>
          )}
          <div style={styles.confirmationFooter}>
            <button 
              style={buttonStyles.secondary} 
              onClick={() => setShowConfirmation(false)}
              disabled={isSubmitted}
            >
              <FiX /> Cancel
            </button>
            <button 
              style={buttonStyles.danger} 
              onClick={submitTest}
              disabled={isSubmitted}
            >
              {isSubmitted ? (
                <>
                  <div style={{
                    width: '14px',
                    height: '14px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: COLORS.white,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Submitting...
                </>
              ) : (
                <>
                  <FiSend /> Submit Test
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const QuestionDisplay = () => {
    const question = questions[currentQuestion];
    if (!question) return null;

    const status = getQuestionStatus(currentQuestion);
    const isMarked = markedQuestions.includes(currentQuestion);
    const selectedAnswer = answers[question._id];

    return (
      <div style={styles.questionCard}>
        <div style={styles.questionHeader}>
          <div style={styles.questionNav}>
            <div style={styles.questionNumber}>
              Question {currentQuestion + 1}
              <span style={styles.questionTotal}>/{questions.length}</span>
            </div>
            <div style={{
              padding: '4px 8px',
              backgroundColor: status === 'answered' ? `${COLORS.success}15` : 
                             status === 'marked' ? `${COLORS.accent}15` : `${COLORS.gray}15`,
              color: status === 'answered' ? COLORS.success : 
                     status === 'marked' ? COLORS.accent : COLORS.gray,
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
            }}>
              {status}
            </div>
          </div>
          <div style={styles.questionActions}>
            <button
              style={styles.actionButton}
              onClick={() => toggleMarkQuestion(currentQuestion)}
            >
              <FiFlag color={isMarked ? COLORS.accent : COLORS.gray} />
              {isMarked ? 'Unmark' : 'Mark'}
            </button>
            <div style={{
              ...styles.actionButton,
              backgroundColor: `${COLORS.secondary}15`,
              borderColor: COLORS.secondary,
              color: COLORS.secondary,
            }}>
              <FiTarget /> {question.marks || 1} Point{question.marks !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div ref={questionBodyRef} style={styles.questionBody}>
          <div style={styles.questionText}>{question.text}</div>
          <div style={styles.optionsGrid}>
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              return (
                <div
                  key={index}
                  style={{
                    ...styles.optionItem,
                    borderColor: isSelected ? COLORS.primary : COLORS.border,
                    backgroundColor: isSelected ? `${COLORS.primary}05` : COLORS.white,
                  }}
                  onClick={() => handleAnswerSelect(question._id, index)}
                >
                  <div style={{
                    ...styles.optionLetter,
                    backgroundColor: isSelected ? COLORS.primary : COLORS.lightGray,
                    color: isSelected ? COLORS.white : COLORS.darkGray,
                  }}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div style={styles.optionText}>{option}</div>
                  {isSelected && (
                    <FiCheck style={styles.optionCheck} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const NavigationButtons = () => (
    <div style={styles.navigationButtons}>
      <button
        style={{
          ...buttonStyles.secondary,
          opacity: currentQuestion === 0 ? 0.5 : 1,
          cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
          padding: '10px 20px',
          fontSize: '13px',
        }}
        disabled={currentQuestion === 0}
        onClick={() => setCurrentQuestion(prev => prev - 1)}
      >
        <FiChevronLeft /> Previous
      </button>
      <div style={styles.pageIndicator}>
        Question {currentQuestion + 1} of {questions.length}
      </div>
      {currentQuestion === questions.length - 1 ? (
        <button 
          style={{
            ...buttonStyles.primary,
            padding: '10px 20px',
            fontSize: '13px',
          }} 
          onClick={() => setShowConfirmation(true)}
        >
          <FiSend /> Submit Test
        </button>
      ) : (
        <button
          style={{
            ...buttonStyles.primary,
            padding: '10px 20px',
            fontSize: '13px',
          }}
          onClick={() => setCurrentQuestion(prev => prev + 1)}
        >
          Next <FiChevronRight />
        </button>
      )}
    </div>
  );

  const QuestionSidebar = () => {
    const filteredQuestions = getFilteredQuestions();
    
    return (
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarTitle}>
            Questions
            <button 
              style={styles.controlButton}
              onClick={() => setSidebarOpen(false)}
            >
              <FiChevronLeft />
            </button>
          </div>
          <div style={styles.filterTabs}>
            <button
              style={{
                ...styles.filterTab,
                backgroundColor: navigationMode === 'standard' ? COLORS.primary : COLORS.white,
                color: navigationMode === 'standard' ? COLORS.white : COLORS.darkGray,
                borderColor: navigationMode === 'standard' ? COLORS.primary : COLORS.border,
              }}
              onClick={() => setNavigationMode('standard')}
            >
              All
            </button>
            <button
              style={{
                ...styles.filterTab,
                backgroundColor: navigationMode === 'marked' ? COLORS.accent : COLORS.white,
                color: navigationMode === 'marked' ? COLORS.white : COLORS.darkGray,
                borderColor: navigationMode === 'marked' ? COLORS.accent : COLORS.border,
              }}
              onClick={() => setNavigationMode('marked')}
            >
              Marked
            </button>
            <button
              style={{
                ...styles.filterTab,
                backgroundColor: navigationMode === 'review' ? COLORS.secondary : COLORS.white,
                color: navigationMode === 'review' ? COLORS.white : COLORS.darkGray,
                borderColor: navigationMode === 'review' ? COLORS.secondary : COLORS.border,
              }}
              onClick={() => setNavigationMode('review')}
            >
              Review
            </button>
          </div>
        </div>
        <div style={styles.questionsGrid}>
          {(navigationMode === 'standard' ? questions.map((_, idx) => idx) : filteredQuestions).map((questionIndex) => {
            const status = getQuestionStatus(questionIndex);
            const isMarked = markedQuestions.includes(questionIndex);
            const isCurrent = currentQuestion === questionIndex;
            
            let backgroundColor = COLORS.white;
            let borderColor = COLORS.border;
            let color = COLORS.darkGray;
            
            if (isCurrent) {
              backgroundColor = `${COLORS.primary}15`;
              borderColor = COLORS.primary;
            }
            
            if (status === 'answered') {
              borderColor = COLORS.secondary;
            } else if (status === 'marked') {
              borderColor = COLORS.accent;
            }
            
            return (
              <button
                key={questionIndex}
                style={{
                  ...styles.gridButton,
                  backgroundColor,
                  borderColor,
                  color,
                }}
                onClick={() => navigateToQuestion(questionIndex)}
              >
                {questionIndex + 1}
                {isMarked && (
                  <FiFlag size={8} style={styles.flagIndicator} />
                )}
              </button>
            );
          })}
        </div>
        <div style={styles.sidebarFooter}>
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: COLORS.secondary }}></div>
              <span>Answered</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: COLORS.accent }}></div>
              <span>Marked</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: COLORS.primary }}></div>
              <span>Current</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: COLORS.border }}></div>
              <span>Unanswered</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const SummaryPanel = () => {
    const answeredCount = Object.keys(answers).length;
    const markedCount = markedQuestions.length;
    const pendingCount = questions.length - answeredCount;
    const progressPercentage = Math.round((answeredCount / questions.length) * 100);

    return (
      <div style={styles.summaryPanel}>
        <div style={styles.summaryHeader}>
          <div style={styles.summaryTitle}>
            <FiBarChart2 /> Test Progress
          </div>
          <button 
            style={styles.controlButton}
            onClick={() => setShowSummary(false)}
          >
            <FiChevronUp />
          </button>
        </div>
        <div style={styles.summaryStats}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryValue}>{progressPercentage}%</div>
            <div style={styles.summaryLabel}>Progress</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={{ ...styles.summaryValue, color: COLORS.success }}>{answeredCount}</div>
            <div style={styles.summaryLabel}>Answered</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={{ ...styles.summaryValue, color: COLORS.accent }}>{markedCount}</div>
            <div style={styles.summaryLabel}>Marked</div>
          </div>
          <div style={styles.summaryCard}>
            <div style={{ ...styles.summaryValue, color: pendingCount > 0 ? COLORS.danger : COLORS.gray }}>
              {pendingCount}
            </div>
            <div style={styles.summaryLabel}>Pending</div>
          </div>
        </div>
        <button 
          style={{
            ...buttonStyles.secondary,
            marginTop: '12px',
            width: '100%',
            justifyContent: 'center',
            padding: '8px',
            fontSize: '12px',
          }}
          onClick={saveProgress}
        >
          <FiSave /> {progressSaved ? 'Progress Saved' : 'Save Progress Now'}
        </button>
      </div>
    );
  };

  const PauseOverlay = () => (
    <div style={styles.pauseOverlay}>
      <div style={styles.pauseModal}>
        <FiLock size={40} style={styles.pauseIcon} />
        <h2 style={styles.pauseTitle}>Test Paused</h2>
        <p style={styles.pauseText}>
          Your test timer has been paused. You can resume when ready.
        </p>
        <button style={buttonStyles.primary} onClick={() => setIsPaused(false)}>
          <FiPlay /> Resume Test
        </button>
      </div>
    </div>
  );

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen />;

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backButton} onClick={() => navigate('/student/dashboard')}>
            <FiArrowLeft /> Dashboard
          </button>
          <div style={styles.testInfo}>
            <h1 style={styles.testTitle}>{test?.title}</h1>
            <div style={styles.testMeta}>
              <span style={styles.metaItem}>
                <FiBook size={10} /> {test?.subject}
              </span>
              <span style={styles.metaItem}>
                <FiUser size={10} /> {test?.class?.name || 'All Classes'}
              </span>
              <span style={styles.metaItem}>
                <FiCalendar size={10} /> Computer Based Test
              </span>
            </div>
          </div>
        </div>
        <div style={styles.timerSection}>
          <div style={styles.timerCard}>
            <FiClock size={14} />
            {formatTime(timeLeft)}
            {timeWarning && (
              <div style={styles.timerWarning}>
                <FiAlertTriangle size={8} /> Time Running Out!
              </div>
            )}
          </div>
          <button style={styles.controlButton} onClick={togglePause}>
            {isPaused ? <FiPlay /> : <FiPause />}
          </button>
        </div>
        <div style={styles.headerControls}>
          <button style={styles.controlButton} onClick={saveProgress}>
            <FiSave color={progressSaved ? COLORS.success : COLORS.primary} />
          </button>
          <button style={styles.controlButton} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <FiList />
          </button>
          <button style={styles.controlButton} onClick={toggleFullscreen}>
            {isFullscreen ? <FiMinimize /> : <FiMaximize />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.mainContent}>
        <div style={styles.questionArea}>
          <QuestionDisplay />
          <NavigationButtons />
        </div>
        {sidebarOpen && <QuestionSidebar />}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.progressStats}>
            <div style={styles.statItem}>
              <div style={{ ...styles.statBadge, backgroundColor: `${COLORS.success}15`, color: COLORS.success }}>
                {Object.keys(answers).length}
              </div>
              <span>Answered</span>
            </div>
            <div style={styles.statItem}>
              <div style={{ ...styles.statBadge, backgroundColor: `${COLORS.accent}15`, color: COLORS.accent }}>
                {markedQuestions.length}
              </div>
              <span>Marked</span>
            </div>
            <div style={styles.statItem}>
              <div style={{ ...styles.statBadge, backgroundColor: `${COLORS.gray}15`, color: COLORS.gray }}>
                {questions.length - Object.keys(answers).length}
              </div>
              <span>Pending</span>
            </div>
            <div style={styles.statItem}>
              <div style={{ ...styles.statBadge, backgroundColor: `${COLORS.primary}15`, color: COLORS.primary }}>
                {formatTime(timeLeft)}
              </div>
              <span>Time Left</span>
            </div>
          </div>
          <div style={styles.footerActions}>
            <button style={styles.footerButton} onClick={() => setShowSummary(!showSummary)}>
              {showSummary ? <FiChevronDown /> : <FiChevronUp />} Summary
            </button>
            <button style={styles.footerButton} onClick={() => setShowInstructions(true)}>
              <FiHelpCircle /> Help
            </button>
            <button style={styles.submitButton} onClick={() => setShowConfirmation(true)}>
              <FiSend /> Submit Test
            </button>
          </div>
        </div>
        {showSummary && <SummaryPanel />}
      </footer>

      {/* Modals & Overlays */}
      {showInstructions && <InstructionsModal />}
      {showConfirmation && <ConfirmationModal />}
      {isPaused && <PauseOverlay />}

      {/* Global Styles */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          overflow: ${showInstructions || isPaused || showConfirmation ? 'hidden' : 'auto'};
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: ${COLORS.lightGray};
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb {
          background: ${COLORS.gray};
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${COLORS.darkGray};
        }
        button {
          outline: none;
          font-family: inherit;
          cursor: pointer;
        }
        button:hover {
          transition: all 0.2s ease;
        }
        button:disabled {
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default TestTaking;