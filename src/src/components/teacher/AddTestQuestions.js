import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiSave, FiX, FiAlertTriangle, FiCheckCircle,
  FiPlus, FiRefreshCw, FiFileText, FiList,
  FiCheck, FiClock, FiHash, FiBook, FiUsers,
  FiSearch, FiFilter, FiMaximize2, FiMinimize2,
  FiChevronLeft, FiChevronRight, FiArrowUp, FiArrowDown
} from 'react-icons/fi';

const AddTestQuestions = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [questionMarks, setQuestionMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showCompactHeader, setShowCompactHeader] = useState(false);
  const questionsPerPage = 24; // Increased from 12 to 24

  // Brand colors
  const brandColors = {
    primary: '#4B5320',
    primaryLight: '#6B7A32',
    primaryDark: '#3A4220',
    secondary: '#F0F4F8',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    background: '#F9FAFB',
    card: '#FFFFFF',
    text: '#111827',
    textLight: '#6B7280',
    border: '#E5E7EB'
  };

  // Get token function
  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('authToken');
  };

  // Calculate required marks based on test type
  const getRequiredMarks = () => {
    if (!test?.title) return 60; // Default to Examination
    const title = test.title.toLowerCase();
    return title.includes('ca') ? 20 : 60;
  };

  // Fetch test details
  const fetchTestDetails = async () => {
    setFetching(true);
    setError('');
    
    try {
      const token = getToken();
      if (!token) throw new Error('No authentication token found');

      const response = await axios.get(`/api/tests/${testId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const testData = response.data.test || response.data;
      if (!testData) throw new Error('No test data found');

      const processedTest = {
        ...testData,
        _id: testData._id,
        title: testData.title || 'Untitled Test',
        subject: testData.subject || '',
        className: testData.class?.name || testData.class || '',
        duration: testData.duration || 0,
        questions: testData.questions || [],
        questionMarks: testData.questionMarks || []
      };

      console.log('Test loaded:', {
        id: processedTest._id,
        title: processedTest.title,
        subject: processedTest.subject,
        className: processedTest.className,
        requiredMarks: getRequiredMarks()
      });

      setTest(processedTest);

      // Set existing selections if any
      if (processedTest.questions && processedTest.questions.length > 0) {
        console.log('Found existing questions:', processedTest.questions.length);
        setSelectedQuestions(processedTest.questions);
        const marks = {};
        processedTest.questions.forEach((qId, index) => {
          marks[qId] = processedTest.questionMarks?.[index] || 1;
        });
        setQuestionMarks(marks);
      }

    } catch (err) {
      console.error('Error fetching test:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setFetching(false);
    }
  };

  // Fetch teacher's questions
  const fetchTeacherQuestions = async () => {
    if (!test) {
      console.log('No test data yet, skipping question fetch');
      return;
    }

    console.log('Fetching questions for:', {
      subject: test.subject,
      className: test.className,
      testId: test._id
    });

    try {
      const token = getToken();
      if (!token) throw new Error('No authentication token found');

      const response = await axios.get('/api/teacher/questions', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const allQuestions = response.data.questions || [];
      console.log('Total questions from API:', allQuestions.length);
      
      // Filter questions by subject and class
      const filtered = allQuestions.filter(q => {
        const qClass = q.class?.name || q.class || q.className || '';
        const matchesSubject = q.subject === test.subject;
        const matchesClass = qClass.toLowerCase() === (test.className || '').toLowerCase();
        
        return matchesSubject && matchesClass;
      });

      console.log('Filtered questions:', filtered.length);
      
      setQuestions(filtered);
      setFilteredQuestions(filtered);

      if (filtered.length === 0) {
        console.warn('No questions found matching criteria');
        setError(`No questions found for ${test.subject} (${test.className}). Please add questions first.`);
      } else {
        setError('');
      }

    } catch (err) {
      console.error('Error fetching questions:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load questions');
    }
  };

  // Apply filters and search
  useEffect(() => {
    if (!questions.length) return;

    let result = questions;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(q => 
        q.text?.toLowerCase().includes(term) ||
        q.topic?.toLowerCase().includes(term) ||
        q.subject?.toLowerCase().includes(term)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      result = result.filter(q => q.type === filterType);
    }

    setFilteredQuestions(result);
    setCurrentPage(1);
  }, [questions, searchTerm, filterType]);

  // Handle scroll events for sticky header
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsScrolled(scrollTop > 100);
      setShowCompactHeader(scrollTop > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate pagination
  const indexOfLastQuestion = currentPage * questionsPerPage;
  const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage;
  const currentQuestions = filteredQuestions.slice(indexOfFirstQuestion, indexOfLastQuestion);
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);

  // Initial data fetching
  useEffect(() => {
    if (testId) {
      console.log('Component mounted, fetching test:', testId);
      fetchTestDetails();
    } else {
      setError('Invalid test ID');
      setFetching(false);
    }
  }, [testId]);

  // Fetch questions when test is loaded
  useEffect(() => {
    if (test && test.subject && test.className) {
      console.log('Test loaded, fetching questions...');
      fetchTeacherQuestions();
    }
  }, [test]);

  // Handle question selection - FLEXIBLE VERSION
  const handleQuestionToggle = (questionId) => {
    console.log('Toggling question:', questionId, {
      currentlySelected: selectedQuestions.includes(questionId),
      selectedCount: selectedQuestions.length
    });
    
    if (selectedQuestions.includes(questionId)) {
      // Remove question
      setSelectedQuestions(prev => prev.filter(id => id !== questionId));
      setQuestionMarks(prev => {
        const newMarks = { ...prev };
        delete newMarks[questionId];
        return newMarks;
      });
      console.log('Question removed:', questionId);
      setError(''); // Clear error when removing
    } else {
      // Add question - NO LIMIT on number of questions
      setSelectedQuestions(prev => [...prev, questionId]);
      setQuestionMarks(prev => ({ ...prev, [questionId]: 1 }));
      setError('');
      console.log('Question added:', questionId);
    }
  };

  // Handle mark change
  const handleMarkChange = (questionId, value) => {
    const markValue = Math.max(1, Math.min(10, parseInt(value) || 1));
    console.log('Changing mark for', questionId, 'to', markValue);
    setQuestionMarks(prev => ({ ...prev, [questionId]: markValue }));
  };

  // Calculate current total marks
  const calculateTotalMarks = () => {
    return Object.values(questionMarks).reduce((sum, mark) => sum + mark, 0);
  };

  // Save questions to test
  const handleSaveQuestions = async () => {
    console.log('Saving questions...', {
      testId: test?._id,
      selectedCount: selectedQuestions.length,
      totalMarks: calculateTotalMarks(),
      requiredMarks: getRequiredMarks()
    });

    if (!test?._id) {
      setError('Test not loaded');
      return;
    }

    // Check if at least one question is selected
    if (selectedQuestions.length === 0) {
      setError('Please select at least one question');
      return;
    }

    const totalMarks = calculateTotalMarks();
    const requiredMarks = getRequiredMarks();
    
    if (totalMarks !== requiredMarks) {
      setError(`Total marks must be exactly ${requiredMarks}. Current: ${totalMarks}`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = getToken();
      if (!token) throw new Error('No authentication token found');

      const payload = {
        questions: selectedQuestions,
        questionMarks: selectedQuestions.map(qId => questionMarks[qId] || 1)
      };

      console.log('Saving payload:', payload);

      const response = await axios.put(`/api/tests/${test._id}/questions`, payload, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Save response:', response.data);
      
      if (response.data.success) {
        setSuccess('Questions saved successfully! Redirecting...');
        setTimeout(() => navigate('/teacher/tests'), 1500);
      } else {
        throw new Error(response.data.error || 'Unknown error');
      }

    } catch (err) {
      console.error('Save error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save questions');
    } finally {
      setLoading(false);
    }
  };

  // Clear all selections
  const handleClearAll = () => {
    console.log('Clearing all selections');
    setSelectedQuestions([]);
    setQuestionMarks({});
    setError('');
    setSuccess('');
  };

  // Get unique question types for filter
  const questionTypes = ['all', ...new Set(questions.map(q => q.type).filter(Boolean))];

  // Calculate progress
  const totalMarks = calculateTotalMarks();
  const requiredMarks = getRequiredMarks();
  const progress = Math.min(100, (totalMarks / requiredMarks) * 100);

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  // Styles
  const styles = {
    container: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      backgroundColor: brandColors.background,
      minHeight: '100vh',
      paddingTop: '80px', // Add padding for fixed header
    },

    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      backgroundColor: brandColors.background
    },

    spinner: {
      width: '50px',
      height: '50px',
      border: `3px solid ${brandColors.border}`,
      borderTop: `3px solid ${brandColors.primary}`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '16px'
    },

    loadingText: {
      color: brandColors.textLight,
      fontSize: '14px'
    },

    // Main header (original position)
    header: {
      backgroundColor: brandColors.card,
      borderRadius: '12px',
      padding: '24px',
      margin: '20px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      border: `1px solid ${brandColors.border}`,
      position: 'relative',
      zIndex: 10
    },

    // Compact header (sticky when scrolling)
    stickyHeader: {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      backgroundColor: brandColors.card,
      borderBottom: `1px solid ${brandColors.border}`,
      padding: showCompactHeader ? '12px 20px' : '16px 20px',
      zIndex: 1000,
      boxShadow: isScrolled ? '0 2px 8px rgba(0, 0, 0, 0.1)' : 'none',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },

    compactHeaderContent: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flex: 1,
      overflow: 'hidden'
    },

    compactHeaderLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: '0'
    },

    compactIcon: {
      fontSize: '20px',
      color: brandColors.primary,
      flexShrink: 0
    },

    compactTitle: {
      fontSize: showCompactHeader ? '14px' : '16px',
      fontWeight: '600',
      color: brandColors.text,
      margin: '0',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },

    compactInfo: {
      fontSize: '12px',
      color: brandColors.textLight,
      margin: '0',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },

    compactProgress: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginLeft: '20px',
      minWidth: '200px'
    },

    compactProgressBar: {
      flex: 1,
      height: '6px',
      backgroundColor: brandColors.border,
      borderRadius: '3px',
      overflow: 'hidden',
      minWidth: '100px'
    },

    compactProgressFill: {
      height: '100%',
      width: `${progress}%`,
      backgroundColor: progress === 100 ? brandColors.success : brandColors.primary,
      borderRadius: '3px',
      transition: 'width 0.3s ease'
    },

    compactProgressText: {
      fontSize: '12px',
      fontWeight: '600',
      color: brandColors.primary,
      whiteSpace: 'nowrap'
    },

    headerContent: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    },

    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },

    headerIcon: {
      fontSize: '32px',
      color: brandColors.primary
    },

    title: {
      fontSize: '24px',
      fontWeight: '700',
      color: brandColors.text,
      margin: '0 0 4px 0'
    },

    subtitle: {
      fontSize: '14px',
      color: brandColors.textLight,
      margin: 0
    },

    headerActions: {
      display: 'flex',
      gap: '12px'
    },

    secondaryButton: {
      backgroundColor: 'transparent',
      color: brandColors.textLight,
      border: `1px solid ${brandColors.border}`,
      padding: '10px 20px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: brandColors.background
      }
    },

    testInfo: {
      backgroundColor: brandColors.background,
      borderRadius: '8px',
      padding: '16px',
      marginTop: '16px',
      border: `1px solid ${brandColors.border}`
    },

    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px'
    },

    infoItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      color: brandColors.text
    },

    // Progress section (sticky)
    progressSection: {
      backgroundColor: brandColors.card,
      borderRadius: '12px',
      padding: '20px',
      margin: '0 20px 20px 20px',
      border: `1px solid ${brandColors.border}`,
      position: 'sticky',
      top: isScrolled ? (showCompactHeader ? '52px' : '60px') : '80px',
      zIndex: 50,
      boxShadow: isScrolled ? '0 4px 6px rgba(0, 0, 0, 0.05)' : 'none'
    },

    progressHeader: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px'
    },

    progressTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: brandColors.text,
      margin: '0 0 4px 0'
    },

    progressSubtitle: {
      fontSize: '14px',
      color: brandColors.textLight,
      margin: 0
    },

    clearButton: {
      backgroundColor: 'transparent',
      color: brandColors.error,
      border: `1px solid ${brandColors.error}`,
      padding: '8px 16px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '14px',
      transition: 'all 0.2s',
      '&:hover:not(:disabled)': {
        backgroundColor: '#FEF2F2'
      },
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed'
      }
    },

    progressBar: {
      height: '8px',
      backgroundColor: brandColors.border,
      borderRadius: '4px',
      overflow: 'hidden',
      marginBottom: '8px'
    },

    progressFill: {
      height: '100%',
      width: `${progress}%`,
      backgroundColor: progress === 100 ? brandColors.success : brandColors.primary,
      borderRadius: '4px',
      transition: 'width 0.3s ease'
    },

    progressLabels: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '12px',
      color: brandColors.textLight
    },

    alertError: {
      backgroundColor: '#FEF2F2',
      border: `1px solid #FECACA`,
      color: brandColors.error,
      borderRadius: '8px',
      padding: '16px',
      margin: '0 20px 20px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '14px'
    },

    alertSuccess: {
      backgroundColor: '#D1FAE5',
      border: `1px solid #A7F3D0`,
      color: brandColors.success,
      borderRadius: '8px',
      padding: '16px',
      margin: '0 20px 20px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '14px'
    },

    mainContent: {
      display: 'flex',
      flexDirection: 'row',
      gap: '20px',
      margin: '0 20px',
      minHeight: 'calc(100vh - 300px)'
    },

    questionsPanel: {
      backgroundColor: brandColors.card,
      borderRadius: '12px',
      padding: '20px',
      border: `1px solid ${brandColors.border}`,
      flex: 3, // Increased from 2 to 3
      minHeight: '600px',
      overflow: 'auto'
    },

    panelHeader: {
      marginBottom: '20px',
      position: 'sticky',
      top: '0',
      backgroundColor: brandColors.card,
      padding: '10px 0',
      zIndex: 5
    },

    panelTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: brandColors.text,
      margin: '0 0 4px 0'
    },

    panelSubtitle: {
      fontSize: '14px',
      color: brandColors.textLight,
      margin: 0
    },

    controls: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '12px',
      marginTop: '16px',
      flexWrap: 'wrap'
    },

    searchBox: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: brandColors.background,
      border: `1px solid ${brandColors.border}`,
      borderRadius: '8px',
      padding: '8px 12px',
      flex: 1,
      minWidth: '200px'
    },

    searchInput: {
      border: 'none',
      backgroundColor: 'transparent',
      fontSize: '14px',
      color: brandColors.text,
      width: '100%',
      marginLeft: '8px',
      outline: 'none',
      '&::placeholder': {
        color: brandColors.textLight
      }
    },

    filterBox: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: brandColors.background,
      border: `1px solid ${brandColors.border}`,
      borderRadius: '8px',
      padding: '8px 12px',
      minWidth: '120px'
    },

    filterSelect: {
      border: 'none',
      backgroundColor: 'transparent',
      fontSize: '14px',
      color: brandColors.text,
      width: '100%',
      marginLeft: '8px',
      outline: 'none',
      cursor: 'pointer'
    },

    viewToggle: {
      display: 'flex',
      backgroundColor: brandColors.background,
      border: `1px solid ${brandColors.border}`,
      borderRadius: '8px',
      overflow: 'hidden'
    },

    viewButton: (active) => ({
      backgroundColor: active ? brandColors.primary : 'transparent',
      color: active ? '#FFFFFF' : brandColors.textLight,
      border: 'none',
      padding: '8px 12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: active ? brandColors.primaryDark : brandColors.border
      }
    }),

    iconButton: {
      backgroundColor: brandColors.background,
      color: brandColors.primary,
      border: `1px solid ${brandColors.border}`,
      padding: '8px',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: brandColors.border
      }
    },

    primaryButtonSmall: {
      backgroundColor: brandColors.primary,
      color: '#FFFFFF',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: brandColors.primaryDark
      }
    },

    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      minHeight: '300px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    },

    emptyIcon: {
      fontSize: '48px',
      color: brandColors.border,
      marginBottom: '16px'
    },

    primaryButton: {
      backgroundColor: brandColors.primary,
      color: '#FFFFFF',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: '16px auto 0',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: brandColors.primaryDark
      }
    },

    // Compact question grid with more columns
    questionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '12px',
      marginBottom: '24px'
    },

    // Compact question card
    questionCard: (isSelected) => ({
      backgroundColor: isSelected ? '#F0F4F8' : brandColors.card,
      border: `2px solid ${isSelected ? brandColors.primary : brandColors.border}`,
      borderRadius: '8px',
      padding: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      position: 'relative',
      zIndex: 1,
      height: '180px', // Fixed height for consistency
      display: 'flex',
      flexDirection: 'column',
      '&:hover': {
        borderColor: brandColors.primary,
        boxShadow: `0 2px 8px rgba(75, 83, 32, 0.1)`
      }
    }),

    selectionIndicator: (isSelected) => ({
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      backgroundColor: isSelected ? brandColors.primary : brandColors.card,
      border: `2px solid ${isSelected ? brandColors.primary : brandColors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#FFFFFF',
      fontSize: '10px',
      position: 'absolute',
      top: '12px',
      right: '12px',
      flexShrink: 0
    }),

    questionContent: {
      marginTop: '4px',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    },

    questionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '8px',
      gap: '8px'
    },

    questionNumber: {
      fontSize: '11px',
      fontWeight: '600',
      color: brandColors.textLight,
      flexShrink: 0
    },

    questionMeta: {
      display: 'flex',
      gap: '4px',
      flexWrap: 'wrap',
      justifyContent: 'flex-end'
    },

    questionType: (type) => ({
      fontSize: '10px',
      fontWeight: '500',
      color: '#6B7280',
      backgroundColor: '#F3F4F6',
      padding: '2px 6px',
      borderRadius: '10px',
      textTransform: 'uppercase',
      lineHeight: '1'
    }),

    questionDifficulty: (difficulty) => ({
      fontSize: '10px',
      fontWeight: '500',
      color: difficulty === 'Hard' ? '#DC2626' : 
             difficulty === 'Easy' ? '#10B981' : '#D97706',
      backgroundColor: difficulty === 'Hard' ? '#FEF2F2' : 
                      difficulty === 'Easy' ? '#D1FAE5' : '#FEF3C7',
      padding: '2px 6px',
      borderRadius: '10px',
      lineHeight: '1'
    }),

    questionText: {
      fontSize: '13px',
      color: brandColors.text,
      lineHeight: '1.4',
      margin: '0 0 8px 0',
      flex: 1,
      overflow: 'hidden',
      display: '-webkit-box',
      WebkitLineClamp: '2',
      WebkitBoxOrient: 'vertical'
    },

    optionPreview: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginBottom: '3px'
    },

    optionLetter: {
      fontSize: '10px',
      fontWeight: '600',
      color: brandColors.primary,
      backgroundColor: '#F0F4F8',
      width: '16px',
      height: '16px',
      borderRadius: '3px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },

    optionText: {
      fontSize: '11px',
      color: brandColors.textLight,
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },

    questionFooter: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: '8px',
      marginTop: '8px',
      borderTop: '1px solid #F3F4F6',
      flexShrink: 0
    },

    correctAnswer: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      color: brandColors.textLight,
      '& strong': {
        color: '#059669',
        marginLeft: '2px',
        fontSize: '11px'
      }
    },

    marksInputContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },

    marksInput: {
      width: '45px',
      padding: '3px 6px',
      border: `1px solid ${brandColors.border}`,
      borderRadius: '4px',
      fontSize: '11px',
      textAlign: 'center',
      outline: 'none',
      '&:focus': {
        borderColor: brandColors.primary
      }
    },

    marksLabel: {
      fontSize: '10px',
      color: brandColors.textLight
    },

    marksStatic: {
      fontSize: '11px',
      color: brandColors.textLight,
      whiteSpace: 'nowrap'
    },

    pagination: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '12px',
      marginTop: '20px',
      paddingTop: '20px',
      borderTop: `1px solid ${brandColors.border}`,
      position: 'sticky',
      bottom: '0',
      backgroundColor: brandColors.card,
      paddingBottom: '10px',
      zIndex: 5
    },

    pageButton: {
      backgroundColor: brandColors.background,
      color: brandColors.text,
      border: `1px solid ${brandColors.border}`,
      padding: '6px 12px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'all 0.2s',
      '&:hover:not(:disabled)': {
        backgroundColor: brandColors.border
      },
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed'
      }
    },

    pageNumbers: {
      display: 'flex',
      gap: '3px'
    },

    pageNumber: (active) => ({
      backgroundColor: active ? brandColors.primary : 'transparent',
      color: active ? '#FFFFFF' : brandColors.text,
      border: `1px solid ${active ? brandColors.primary : brandColors.border}`,
      width: '32px',
      height: '32px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: active ? brandColors.primaryDark : brandColors.background
      }
    }),

    summaryPanel: {
      width: '350px',
      flexShrink: 0
    },

    summaryCard: {
      backgroundColor: brandColors.card,
      borderRadius: '12px',
      padding: '20px',
      border: `1px solid ${brandColors.border}`,
      position: 'sticky',
      top: isScrolled ? (showCompactHeader ? '52px' : '60px') : '80px',
      maxHeight: 'calc(100vh - 100px)',
      overflow: 'auto',
      zIndex: 50
    },

    summaryTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: brandColors.text,
      margin: '0 0 20px 0',
      paddingBottom: '16px',
      borderBottom: `1px solid ${brandColors.border}`,
      position: 'sticky',
      top: '0',
      backgroundColor: brandColors.card,
      zIndex: 2
    },

    summaryStats: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      marginBottom: '20px'
    },

    statItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },

    statCircle: (isComplete) => ({
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: isComplete ? '#D1FAE5' : '#F0F4F8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      fontWeight: '700',
      color: isComplete ? '#059669' : brandColors.primary,
      flexShrink: 0
    }),

    statLabel: {
      fontSize: '13px',
      fontWeight: '600',
      color: brandColors.text,
      margin: '0 0 2px 0'
    },

    statDescription: {
      fontSize: '12px',
      color: brandColors.textLight,
      margin: 0
    },

    selectionList: {
      marginBottom: '20px',
      flex: 1,
      minHeight: '200px'
    },

    selectionTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: brandColors.text,
      margin: '0 0 12px 0'
    },

    emptySelection: {
      textAlign: 'center',
      padding: '20px',
      backgroundColor: brandColors.background,
      borderRadius: '8px',
      '& p': {
        fontSize: '13px',
        color: brandColors.textLight,
        margin: '0 0 4px 0',
        '&:last-child': {
          fontSize: '11px',
          color: '#9CA3AF'
        }
      }
    },

    selectedQuestionsList: {
      maxHeight: '200px',
      overflowY: 'auto',
      backgroundColor: brandColors.background,
      borderRadius: '8px',
      padding: '4px'
    },

    selectedQuestionItem: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      padding: '8px',
      borderBottom: `1px solid ${brandColors.border}`,
      '&:last-child': {
        borderBottom: 'none'
      }
    },

    selectedNumber: {
      backgroundColor: brandColors.primary,
      color: '#FFFFFF',
      width: '22px',
      height: '22px',
      borderRadius: '5px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      fontWeight: '600',
      flexShrink: 0
    },

    selectedContent: {
      flex: 1,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '8px'
    },

    selectedText: {
      fontSize: '12px',
      color: brandColors.primary,
      flex: 1,
      marginRight: '8px',
      lineHeight: '1.4',
      overflow: 'hidden',
      display: '-webkit-box',
      WebkitLineClamp: '2',
      WebkitBoxOrient: 'vertical'
    },

    selectedMarks: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      flexShrink: 0
    },

    smallMarksInput: {
      width: '35px',
      padding: '3px',
      border: `1px solid ${brandColors.border}`,
      borderRadius: '4px',
      fontSize: '11px',
      textAlign: 'center',
      outline: 'none',
      '&:focus': {
        borderColor: brandColors.primary
      }
    },

    requirements: {
      backgroundColor: brandColors.background,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '20px'
    },

    requirementsTitle: {
      fontSize: '12px',
      fontWeight: '600',
      color: brandColors.textLight,
      textTransform: 'uppercase',
      margin: '0 0 8px 0'
    },

    requirementsList: {
      listStyle: 'none',
      padding: 0,
      margin: 0
    },

    requirementItem: (isMet) => ({
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginBottom: '6px',
      color: isMet ? '#059669' : brandColors.textLight
    }),

    saveButton: (isReady) => ({
      backgroundColor: isReady ? brandColors.primary : brandColors.border,
      color: isReady ? '#FFFFFF' : brandColors.textLight,
      border: 'none',
      padding: '12px',
      borderRadius: '8px',
      cursor: isReady ? 'pointer' : 'not-allowed',
      fontWeight: '500',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      width: '100%',
      transition: 'all 0.2s',
      '&:hover': isReady && {
        backgroundColor: brandColors.primaryDark
      }
    }),

    buttonSpinner: {
      width: '16px',
      height: '16px',
      border: '2px solid rgba(255,255,255,0.3)',
      borderTop: '2px solid #FFFFFF',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },

    // Scroll buttons
    scrollButtons: {
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      zIndex: 1000
    },

    scrollButton: {
      backgroundColor: brandColors.primary,
      color: '#FFFFFF',
      border: 'none',
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: brandColors.primaryDark,
        transform: 'translateY(-2px)'
      }
    },

    quickNav: {
      display: 'flex',
      gap: '8px',
      marginTop: '12px',
      flexWrap: 'wrap'
    },

    quickNavButton: {
      backgroundColor: brandColors.background,
      color: brandColors.textLight,
      border: `1px solid ${brandColors.border}`,
      padding: '4px 8px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '11px',
      transition: 'all 0.2s',
      '&:hover': {
        backgroundColor: brandColors.border,
        color: brandColors.text
      }
    }
  };

  // Loading state
  if (fetching) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading test details...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Sticky Compact Header */}
      {isScrolled && (
        <div style={styles.stickyHeader}>
          <div style={styles.compactHeaderContent}>
            <div style={styles.compactHeaderLeft}>
              <FiFileText style={styles.compactIcon} />
              <div style={{ minWidth: '0' }}>
                <h3 style={styles.compactTitle}>{test?.title || 'Add Questions'}</h3>
                <p style={styles.compactInfo}>
                  {test?.subject} • {test?.className} • {selectedQuestions.length} questions selected
                </p>
              </div>
            </div>
            <div style={styles.compactProgress}>
              <div style={styles.compactProgressBar}>
                <div style={styles.compactProgressFill} />
              </div>
              <span style={styles.compactProgressText}>
                {totalMarks}/{requiredMarks} marks
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate('/teacher/tests')}
            style={{
              ...styles.secondaryButton,
              padding: '6px 12px',
              fontSize: '12px'
            }}
          >
            <FiX /> Cancel
          </button>
        </div>
      )}

      {/* Main Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <FiFileText style={styles.headerIcon} />
            <div>
              <h1 style={styles.title}>Add Questions to Test</h1>
              <p style={styles.subtitle}>
                {test?.title} • {test?.subject} • {test?.className}
              </p>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button
              onClick={() => navigate('/teacher/tests')}
              style={styles.secondaryButton}
            >
              <FiX /> Cancel
            </button>
          </div>
        </div>

        {/* Test Info */}
        {test && (
          <div style={styles.testInfo}>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <FiBook /> <span>Subject:</span> {test.subject || 'N/A'}
              </div>
              <div style={styles.infoItem}>
                <FiUsers /> <span>Class:</span> {test.className || 'N/A'}
              </div>
              <div style={styles.infoItem}>
                <FiHash /> <span>Required Marks:</span> {requiredMarks} total
              </div>
              <div style={styles.infoItem}>
                <FiClock /> <span>Duration:</span> {test.duration} mins
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Progress Bar */}
      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <div>
            <h3 style={styles.progressTitle}>Selection Progress</h3>
            <p style={styles.progressSubtitle}>
              {selectedQuestions.length} questions selected • {totalMarks} of {requiredMarks} marks
              {totalMarks === requiredMarks && (
                <span style={{ color: brandColors.success, fontWeight: '600', marginLeft: '10px' }}>
                  ✓ Marks requirement met
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleClearAll}
            disabled={selectedQuestions.length === 0}
            style={styles.clearButton}
          >
            Clear All
          </button>
        </div>
        <div style={styles.progressBar}>
          <div style={styles.progressFill} />
        </div>
        <div style={styles.progressLabels}>
          <span>0 marks</span>
          <span>{totalMarks}/{requiredMarks} marks</span>
          <span>{requiredMarks} marks</span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={styles.alertError}>
          <FiAlertTriangle /> {error}
        </div>
      )}
      {success && (
        <div style={styles.alertSuccess}>
          <FiCheckCircle /> {success}
        </div>
      )}

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Left Panel - Questions */}
        <div style={styles.questionsPanel}>
          <div style={styles.panelHeader}>
            <div>
              <h3 style={styles.panelTitle}>Available Questions</h3>
              <p style={styles.panelSubtitle}>
                {filteredQuestions.length} questions • Page {currentPage} of {totalPages} • Showing {questionsPerPage} per page
                <span style={{ color: brandColors.primary, marginLeft: '10px' }}>
                  Select questions that total {requiredMarks} marks
                </span>
              </p>
            </div>
            
            {/* Quick Navigation */}
            <div style={styles.quickNav}>
              <button 
                onClick={() => setFilterType('all')}
                style={styles.quickNavButton}
              >
                All Types
              </button>
              {questionTypes.filter(t => t !== 'all').map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  style={{
                    ...styles.quickNavButton,
                    backgroundColor: filterType === type ? brandColors.primary : styles.quickNavButton.backgroundColor,
                    color: filterType === type ? '#FFFFFF' : styles.quickNavButton.color
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
            
            {/* Controls */}
            <div style={styles.controls}>
              {/* Search */}
              <div style={styles.searchBox}>
                <FiSearch />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.searchInput}
                />
              </div>

              {/* Filter */}
              <div style={styles.filterBox}>
                <FiFilter />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={styles.filterSelect}
                >
                  {questionTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Toggle */}
              <div style={styles.viewToggle}>
                <button
                  onClick={() => setViewMode('grid')}
                  style={styles.viewButton(viewMode === 'grid')}
                  title="Grid View"
                >
                  <FiMaximize2 />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  style={styles.viewButton(viewMode === 'list')}
                  title="List View"
                >
                  <FiList />
                </button>
              </div>

              {/* Refresh */}
              <button
                onClick={fetchTeacherQuestions}
                style={styles.iconButton}
                title="Refresh Questions"
              >
                <FiRefreshCw />
              </button>

              {/* Add New */}
              <button
                onClick={() => navigate('/teacher/add-question')}
                style={styles.primaryButtonSmall}
                title="Add New Question"
              >
                <FiPlus /> New
              </button>
            </div>
          </div>

          {/* Questions Grid */}
          {currentQuestions.length === 0 ? (
            <div style={styles.emptyState}>
              <FiAlertTriangle style={styles.emptyIcon} />
              <h4>No questions found</h4>
              <p>
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : `Add questions for ${test?.subject} (${test?.className}) first`
                }
              </p>
              <button
                onClick={() => navigate('/teacher/add-question')}
                style={styles.primaryButton}
              >
                <FiPlus /> Add New Question
              </button>
            </div>
          ) : (
            <>
              <div style={styles.questionsGrid}>
                {currentQuestions.map((question, index) => {
                  const isSelected = selectedQuestions.includes(question._id);
                  
                  return (
                    <div
                      key={question._id}
                      style={styles.questionCard(isSelected)}
                      onClick={() => {
                        console.log('Card clicked:', question._id);
                        handleQuestionToggle(question._id);
                      }}
                    >
                      {/* Selection Indicator */}
                      <div style={styles.selectionIndicator(isSelected)}>
                        {isSelected && <FiCheck />}
                      </div>

                      {/* Question Content */}
                      <div style={styles.questionContent}>
                        <div style={styles.questionHeader}>
                          <span style={styles.questionNumber}>
                            Q{indexOfFirstQuestion + index + 1}
                          </span>
                          <div style={styles.questionMeta}>
                            <span style={styles.questionType(question.type)}>
                              {question.type || 'MCQ'}
                            </span>
                            <span style={styles.questionDifficulty(question.difficulty)}>
                              {question.difficulty || 'Medium'}
                            </span>
                          </div>
                        </div>

                        <p style={styles.questionText}>
                          {question.text?.substring(0, 120)}
                          {question.text?.length > 120 ? '...' : ''}
                        </p>

                        {question.options?.slice(0, 2).map((opt, idx) => (
                          <div key={idx} style={styles.optionPreview}>
                            <span style={styles.optionLetter}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span style={styles.optionText}>
                              {opt.substring(0, 40)}
                              {opt.length > 40 ? '...' : ''}
                            </span>
                          </div>
                        ))}

                        <div style={styles.questionFooter}>
                          <div style={styles.correctAnswer}>
                            <span>Ans:</span>
                            <strong>{question.correctAnswer}</strong>
                          </div>
                          
                          {isSelected ? (
                            <div style={styles.marksInputContainer}>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={questionMarks[question._id] || 1}
                                onChange={(e) => handleMarkChange(question._id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                style={styles.marksInput}
                              />
                              <span style={styles.marksLabel}>pts</span>
                            </div>
                          ) : (
                            <div style={styles.marksStatic}>
                              <span>1 pt</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={styles.pagination}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={styles.pageButton}
                  >
                    <FiChevronLeft /> Previous
                  </button>
                  
                  <div style={styles.pageNumbers}>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          style={styles.pageNumber(currentPage === pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    style={styles.pageButton}
                  >
                    Next <FiChevronRight />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Panel - Summary */}
        <div style={styles.summaryPanel}>
          <div style={styles.summaryCard}>
            <h3 style={styles.summaryTitle}>Selection Summary</h3>
            
            {/* Stats */}
            <div style={styles.summaryStats}>
              <div style={styles.statItem}>
                <div style={styles.statCircle(false)}>
                  {selectedQuestions.length}
                </div>
                <div>
                  <p style={styles.statLabel}>Questions</p>
                  <p style={styles.statDescription}>
                    Selected
                  </p>
                </div>
              </div>
              
              <div style={styles.statItem}>
                <div style={styles.statCircle(totalMarks === requiredMarks)}>
                  {totalMarks}
                </div>
                <div>
                  <p style={styles.statLabel}>Total Marks</p>
                  <p style={styles.statDescription}>
                    of {requiredMarks} required
                    {totalMarks === requiredMarks && (
                      <span style={{ color: '#059669', fontWeight: '600' }}> ✓</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Selected Questions List */}
            <div style={styles.selectionList}>
              <h4 style={styles.selectionTitle}>Selected Questions</h4>
              
              {selectedQuestions.length === 0 ? (
                <div style={styles.emptySelection}>
                  <p>No questions selected yet</p>
                  <p>Click on questions to select them</p>
                </div>
              ) : (
                <div style={styles.selectedQuestionsList}>
                  {selectedQuestions.map((qId, index) => {
                    const question = questions.find(q => q._id === qId);
                    return (
                      <div key={qId} style={styles.selectedQuestionItem}>
                        <div style={styles.selectedNumber}>
                          {index + 1}
                        </div>
                        <div style={styles.selectedContent}>
                          <p style={styles.selectedText}>
                            {question?.text?.substring(0, 60)}
                            {question?.text?.length > 60 ? '...' : ''}
                          </p>
                          <div style={styles.selectedMarks}>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={questionMarks[qId] || 1}
                              onChange={(e) => handleMarkChange(qId, e.target.value)}
                              style={styles.smallMarksInput}
                            />
                            <span style={{ fontSize: '11px' }}>pts</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Requirements */}
            <div style={styles.requirements}>
              <h4 style={styles.requirementsTitle}>Requirements</h4>
              <ul style={styles.requirementsList}>
                <li style={styles.requirementItem(
                  selectedQuestions.length > 0
                )}>
                  {selectedQuestions.length > 0 ? '✓' : '○'}
                  Select at least one question
                </li>
                <li style={styles.requirementItem(
                  totalMarks === requiredMarks
                )}>
                  {totalMarks === requiredMarks ? '✓' : '○'}
                  Total marks must be {requiredMarks}
                </li>
              </ul>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveQuestions}
              disabled={
                loading ||
                selectedQuestions.length === 0 ||
                totalMarks !== requiredMarks
              }
              style={styles.saveButton(
                selectedQuestions.length > 0 && 
                totalMarks === requiredMarks
              )}
            >
              {loading ? (
                <>
                  <div style={styles.buttonSpinner}></div>
                  Saving...
                </>
              ) : (
                <>
                  <FiSave /> Save Questions
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Scroll Buttons */}
      <div style={styles.scrollButtons}>
        <button onClick={scrollToTop} style={styles.scrollButton} title="Scroll to top">
          <FiArrowUp />
        </button>
        <button onClick={scrollToBottom} style={styles.scrollButton} title="Scroll to bottom">
          <FiArrowDown />
        </button>
      </div>
    </div>
  );
};

// Add CSS animation
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  styleSheet.insertRule(`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `, styleSheet.cssRules.length);
}

export default AddTestQuestions;