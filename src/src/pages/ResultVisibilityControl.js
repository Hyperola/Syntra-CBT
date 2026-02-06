import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { 
  FiEye, 
  FiEyeOff, 
  FiClock, 
  FiFilter, 
  FiCalendar, 
  FiSearch, 
  FiRefreshCw,
  FiCheck,
  FiX,
  FiDownload,
  FiUsers,
  FiChevronDown,
  FiUser,
  FiFileText,
  FiFile,
  FiBook,
  FiGrid
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const ResultVisibilityControl = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('results');
  
  // Results State
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [reportCards, setReportCards] = useState([]);
  const [reportCardsLoading, setReportCardsLoading] = useState(false);
  
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedResults, setSelectedResults] = useState([]);
  const [selectedReportCards, setSelectedReportCards] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [notifyParents, setNotifyParents] = useState(true);
  
  const [stats, setStats] = useState({
    total: 0,
    visible: 0,
    hidden: 0,
    scheduled: 0
  });
  
  const [reportCardStats, setReportCardStats] = useState({
    total: 0,
    visible: 0,
    hidden: 0,
    scheduled: 0,
    withReportCards: 0
  });
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [filters, setFilters] = useState({
    class: '',
    examType: '',
    term: '',
    year: '',
    visibility: 'all'
  });
  
  const [reportCardFilters, setReportCardFilters] = useState({
    class: '',
    term: '',
    year: '',
    visibility: 'all',
    hasReportCard: 'all'
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [currentReportCardPage, setCurrentReportCardPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReportCardPages, setTotalReportCardPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalReportCards, setTotalReportCards] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchReportCardTerm, setSearchReportCardTerm] = useState('');
  
  const [studentsMap, setStudentsMap] = useState({});
  const [availableClasses, setAvailableClasses] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [uniqueExamTypes, setUniqueExamTypes] = useState([]);
  const [uniqueTerms, setUniqueTerms] = useState([]);
  const [uniqueYears, setUniqueYears] = useState([]);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const hasAdminAccess = user && (user.role === 'admin' || user.role === 'super_admin');

  useEffect(() => {
    if (user && hasAdminAccess) {
      if (activeTab === 'results') {
        fetchResults();
        fetchResultsStats();
        fetchAvailableClasses();
      } else {
        fetchReportCards();
        fetchReportCardStats();
      }
    }
  }, [user, hasAdminAccess, activeTab]);

  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
    
    if (activeTab === 'results' && results.length > 0) {
      extractUniqueValues();
    }
  }, [results, activeTab]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const fetchAvailableClasses = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/assignment/classes`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success && Array.isArray(response.data.classes)) {
        setAvailableClasses(response.data.classes);
      } else if (Array.isArray(response.data)) {
        setAvailableClasses(response.data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      setAvailableClasses([]);
    }
  };

  const extractUniqueValues = () => {
    if (results.length > 0) {
      // Extract unique exam types
      const examTypes = [...new Set(results.map(r => r.testTitle).filter(Boolean))].sort();
      setUniqueExamTypes(examTypes);
      
      // Extract unique terms
      const terms = [...new Set(results.map(r => r.term).filter(Boolean))].sort();
      setUniqueTerms(terms);
      
      // Extract unique years/sessions
      const years = [...new Set(results.map(r => r.session).filter(Boolean))].sort();
      setUniqueYears(years);
    }
  };

  const fetchStudentDetails = async (studentId) => {
    if (!studentId) return null;
    
    if (studentsMap[studentId]) {
      return studentsMap[studentId];
    }
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/${studentId}`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success && response.data.user) {
        const student = response.data.user;
        setStudentsMap(prev => ({
          ...prev,
          [studentId]: student
        }));
        return student;
      }
      return null;
    } catch (err) {
      console.error('Error fetching student details:', err);
      return null;
    }
  };

  const fetchStudentsForResults = async (results) => {
    const studentIds = results
      .map(result => result.userId || result.student?._id)
      .filter(id => id && !studentsMap[id]);
    
    if (studentIds.length === 0) return;
    
    try {
      const uniqueIds = [...new Set(studentIds)];
      const promises = uniqueIds.map(id => fetchStudentDetails(id));
      await Promise.all(promises);
    } catch (err) {
      console.error('Error batch fetching students:', err);
    }
  };

  const fetchResults = async (page = 1) => {
    if (!hasAdminAccess) {
      setError('Admin access required to view result visibility controls.');
      return;
    }

    setResultsLoading(true);
    clearMessages();
    
    try {
      const params = new URLSearchParams();
      if (filters.class) params.append('class', filters.class);
      if (filters.examType) params.append('examType', filters.examType);
      if (filters.term) params.append('term', filters.term);
      if (filters.year) params.append('year', filters.year);
      if (filters.visibility !== 'all') {
        params.append('visible', filters.visibility === 'visible' ? 'true' : 'false');
      }
      if (searchTerm) params.append('search', searchTerm);
      params.append('page', page);
      params.append('limit', 20);

      const response = await axios.get(`${API_BASE_URL}/api/users/admin/results/visibility?${params}`, {
        headers: getAuthHeaders()
      });

      console.log('Results fetched successfully:', response.data);
      
      const resultsData = response.data.results || [];
      setResults(resultsData);
      setSelectedResults([]);
      
      fetchStudentsForResults(resultsData);
      
      if (response.data.pagination) {
        setCurrentPage(response.data.pagination.currentPage);
        setTotalPages(response.data.pagination.totalPages);
        setTotalResults(response.data.pagination.totalResults);
      } else {
        setTotalResults(resultsData.length);
      }
      
      if (response.data.stats) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error('Error fetching results:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.response?.statusText || 
                          'Failed to load results';
      setError(`Error ${err.response?.status || 'Unknown'}: ${errorMessage}`);
    } finally {
      setResultsLoading(false);
    }
  };

  const fetchResultsStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/admin/results/visibility-stats`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.stats) {
        setStats({
          total: response.data.stats.total || 0,
          visible: response.data.stats.visible || 0,
          hidden: response.data.stats.hidden || 0,
          scheduled: response.data.stats.scheduled || 0
        });
      }
    } catch (err) {
      console.error('Error fetching results stats:', err);
    }
  };

  const fetchReportCards = async (page = 1) => {
    if (!hasAdminAccess) {
      setError('Admin access required to view report card visibility controls.');
      return;
    }

    setReportCardsLoading(true);
    clearMessages();
    
    try {
      const params = new URLSearchParams();
      if (reportCardFilters.class) params.append('class', reportCardFilters.class);
      if (reportCardFilters.term) params.append('term', reportCardFilters.term);
      if (reportCardFilters.year) params.append('year', reportCardFilters.year);
      if (reportCardFilters.visibility !== 'all') {
        params.append('visible', reportCardFilters.visibility === 'visible' ? 'true' : 'false');
      }
      if (reportCardFilters.hasReportCard !== 'all') {
        params.append('hasReportCard', reportCardFilters.hasReportCard);
      }
      if (searchReportCardTerm) params.append('search', searchReportCardTerm);
      params.append('page', page);
      params.append('limit', 20);

      const response = await axios.get(`${API_BASE_URL}/api/users/admin/report-cards/visibility?${params}`, {
        headers: getAuthHeaders()
      });

      console.log('Report cards fetched successfully:', response.data);
      
      const reportCardsData = response.data.reportCards || [];
      setReportCards(reportCardsData);
      setSelectedReportCards([]);
      
      // Fetch student details
      const studentIds = reportCardsData.map(rc => rc._id);
      const uniqueIds = [...new Set(studentIds.filter(id => !studentsMap[id]))];
      if (uniqueIds.length > 0) {
        const promises = uniqueIds.map(id => fetchStudentDetails(id));
        await Promise.all(promises);
      }
      
      if (response.data.pagination) {
        setCurrentReportCardPage(response.data.pagination.currentPage);
        setTotalReportCardPages(response.data.pagination.totalPages);
        setTotalReportCards(response.data.pagination.totalStudents || response.data.pagination.totalResults);
      } else {
        setTotalReportCards(reportCardsData.length);
      }
      
      if (response.data.stats) {
        setReportCardStats({
          total: response.data.stats.totalStudents || 0,
          visible: response.data.stats.visibleToParents || response.data.stats.visibleReportCards || 0,
          hidden: response.data.stats.hidden || 0,
          scheduled: response.data.stats.scheduled || 0,
          withReportCards: response.data.stats.withReportCards || 0
        });
      }
    } catch (err) {
      console.error('Error fetching report cards:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to load report cards';
      setError(`Error ${err.response?.status || 'Unknown'}: ${errorMessage}`);
    } finally {
      setReportCardsLoading(false);
    }
  };

  const fetchReportCardStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/admin/report-cards/visibility-stats`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.stats) {
        setReportCardStats({
          total: response.data.stats.totalStudents || 0,
          visible: response.data.stats.visibleReportCards || 0,
          hidden: response.data.stats.withoutReportCards || 0,
          scheduled: response.data.stats.scheduledReportCards || 0,
          withReportCards: response.data.stats.studentsWithReportCards || 0
        });
      }
    } catch (err) {
      console.error('Error fetching report card stats:', err);
    }
  };

  const getStudentInfo = (item, isReportCard = false) => {
    const studentId = isReportCard ? item._id : (item.userId || item.student?._id);
    
    if (!studentId) {
      return {
        name: 'Unknown Student',
        id: '',
        initials: 'US',
        studentObject: null
      };
    }
    
    const student = studentsMap[studentId];
    
    if (student) {
      const firstName = student.firstName || student.name || '';
      const lastName = student.lastName || student.surname || '';
      const fullName = `${firstName} ${lastName}`.trim() || student.username || 'Unknown Student';
      const studentIdNum = student.studentId || student.username || '';
      
      const initials = fullName.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2) || 'US';
      
      return {
        name: fullName,
        id: studentIdNum,
        initials: initials,
        studentObject: student,
        studentId: studentId
      };
    }
    
    return {
      name: isReportCard ? item.displayName || `Student ${studentId.substring(0, 6)}...` : `Student ${studentId.substring(0, 6)}...`,
      id: isReportCard ? item.studentId || studentId.substring(0, 8) : studentId.substring(0, 8),
      initials: '??',
      studentId: studentId,
      studentObject: null
    };
  };

  const toggleResultVisibility = async (resultId, makeVisible) => {
    if (!hasAdminAccess) {
      setError('Admin access required to modify result visibility.');
      return;
    }

    setActionLoading(true);
    clearMessages();
    
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/users/admin/results/${resultId}/visibility`,
        { 
          isVisible: makeVisible, 
          notifyParents: notifyParents 
        },
        { headers: getAuthHeaders() }
      );

      console.log('Result visibility toggled:', response.data);
      
      setResults(prev => prev.map(result => 
        result._id === resultId 
          ? { 
              ...result, 
              isVisibleToParent: makeVisible, 
              scheduledVisibility: null, 
              lastUpdated: new Date().toISOString() 
            }
          : result
      ));

      setSuccess(`Result ${makeVisible ? 'made visible' : 'hidden'} successfully!`);
      fetchResultsStats();
    } catch (err) {
      console.error('Error toggling result visibility:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to update visibility';
      setError(`Error: ${errorMessage}`);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleReportCardVisibility = async (studentId, makeVisible) => {
    if (!hasAdminAccess) {
      setError('Admin access required to modify report card visibility.');
      return;
    }

    setActionLoading(true);
    clearMessages();
    
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/users/admin/report-cards/${studentId}/visibility`,
        { 
          isVisible: makeVisible, 
          notifyParents: notifyParents
        },
        { headers: getAuthHeaders() }
      );

      console.log('Report card visibility toggled:', response.data);
      
      setReportCards(prev => prev.map(reportCard => 
        reportCard._id === studentId 
          ? { 
              ...reportCard, 
              visibility: {
                ...reportCard.visibility,
                isVisibleToParent: makeVisible,
                scheduledVisibility: null
              }
            }
          : reportCard
      ));

      setSuccess(`Report card ${makeVisible ? 'made visible' : 'hidden'} successfully!`);
      fetchReportCardStats();
    } catch (err) {
      console.error('Error toggling report card visibility:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to update visibility';
      setError(`Error: ${errorMessage}`);
    } finally {
      setActionLoading(false);
    }
  };

  const scheduleResultVisibility = async () => {
    if (!scheduleDate) {
      setError('Please select a date');
      return;
    }

    if (selectedResults.length === 0) {
      setError('Please select at least one result to schedule');
      return;
    }

    setActionLoading(true);
    clearMessages();
    
    try {
      const scheduledDateTime = `${scheduleDate}T${scheduleTime}:00`;
      
      const response = await axios.post(
        `${API_BASE_URL}/api/users/admin/results/schedule-visibility`,
        {
          resultIds: selectedResults,
          scheduledDate: scheduledDateTime,
          notifyParents: notifyParents
        },
        { headers: getAuthHeaders() }
      );

      console.log('Result visibility scheduled:', response.data);
      
      setResults(prev => prev.map(result => 
        selectedResults.includes(result._id)
          ? { 
              ...result, 
              scheduledVisibility: scheduledDateTime,
              isVisibleToParent: false 
            }
          : result
      ));

      setShowScheduleModal(false);
      setSelectedResults([]);
      setSuccess(`Result visibility scheduled for ${format(parseISO(scheduledDateTime), 'PPP p')}`);
      fetchResultsStats();
    } catch (err) {
      console.error('Error scheduling result visibility:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to schedule visibility';
      setError(`Error: ${errorMessage}`);
    } finally {
      setActionLoading(false);
    }
  };

  const scheduleReportCardVisibility = async () => {
    if (!scheduleDate) {
      setError('Please select a date');
      return;
    }

    if (selectedReportCards.length === 0) {
      setError('Please select at least one report card to schedule');
      return;
    }

    setActionLoading(true);
    clearMessages();
    
    try {
      const scheduledDateTime = `${scheduleDate}T${scheduleTime}:00`;
      
      const response = await axios.put(
        `${API_BASE_URL}/api/users/admin/report-cards/bulk-visibility`,
        {
          studentIds: selectedReportCards,
          scheduledDate: scheduledDateTime,
          notifyParents: notifyParents,
          isVisible: false
        },
        { headers: getAuthHeaders() }
      );

      console.log('Report card visibility scheduled:', response.data);
      
      setReportCards(prev => prev.map(reportCard => 
        selectedReportCards.includes(reportCard._id)
          ? { 
              ...reportCard, 
              visibility: {
                ...reportCard.visibility,
                scheduledVisibility: scheduledDateTime,
                isVisibleToParent: false
              }
            }
          : reportCard
      ));

      setShowScheduleModal(false);
      setSelectedReportCards([]);
      setSuccess(`Report card visibility scheduled for ${format(parseISO(scheduledDateTime), 'PPP p')}`);
      fetchReportCardStats();
    } catch (err) {
      console.error('Error scheduling report card visibility:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to schedule visibility';
      setError(`Error: ${errorMessage}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (activeTab === 'results') {
      if (selectedResults.length === 0 || !bulkAction) {
        setError('Please select results and choose an action');
        return;
      }

      if (bulkAction === 'schedule') {
        setShowScheduleModal(true);
        return;
      }

      const makeVisible = bulkAction === 'show';
      setActionLoading(true);
      clearMessages();
      
      try {
        const response = await axios.put(
          `${API_BASE_URL}/api/users/admin/results/bulk-visibility`,
          {
            resultIds: selectedResults,
            isVisible: makeVisible,
            notifyParents: notifyParents
          },
          { headers: getAuthHeaders() }
        );

        console.log('Bulk result action completed:', response.data);
        
        setResults(prev => prev.map(result => 
          selectedResults.includes(result._id)
            ? { 
                ...result, 
                isVisibleToParent: makeVisible,
                scheduledVisibility: null,
                lastUpdated: new Date().toISOString() 
              }
            : result
        ));

        setSelectedResults([]);
        setBulkAction('');
        setSuccess(`Bulk action completed: ${selectedResults.length} results ${makeVisible ? 'made visible' : 'hidden'}`);
        fetchResultsStats();
      } catch (err) {
        console.error('Error performing bulk result action:', err);
        const errorMessage = err.response?.data?.error || 
                            err.response?.data?.message || 
                            'Failed to perform bulk action';
        setError(`Error: ${errorMessage}`);
      } finally {
        setActionLoading(false);
      }
    } else {
      if (selectedReportCards.length === 0 || !bulkAction) {
        setError('Please select report cards and choose an action');
        return;
      }

      if (bulkAction === 'schedule') {
        setShowScheduleModal(true);
        return;
      }

      const makeVisible = bulkAction === 'show';
      setActionLoading(true);
      clearMessages();
      
      try {
        const response = await axios.put(
          `${API_BASE_URL}/api/users/admin/report-cards/bulk-visibility`,
          {
            studentIds: selectedReportCards,
            isVisible: makeVisible,
            notifyParents: notifyParents
          },
          { headers: getAuthHeaders() }
        );

        console.log('Bulk report card action completed:', response.data);
        
        setReportCards(prev => prev.map(reportCard => 
          selectedReportCards.includes(reportCard._id)
            ? { 
                ...reportCard, 
                visibility: {
                  ...reportCard.visibility,
                  isVisibleToParent: makeVisible,
                  scheduledVisibility: null
                }
              }
            : reportCard
        ));

        setSelectedReportCards([]);
        setBulkAction('');
        setSuccess(`Bulk action completed: ${selectedReportCards.length} report cards ${makeVisible ? 'made visible' : 'hidden'}`);
        fetchReportCardStats();
      } catch (err) {
        console.error('Error performing bulk report card action:', err);
        const errorMessage = err.response?.data?.error || 
                            err.response?.data?.message || 
                            'Failed to perform bulk action';
        setError(`Error: ${errorMessage}`);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const getVisibilityBadgeStyle = (item, isReportCard = false) => {
    const visibility = isReportCard ? item.visibility : item;
    
    if (visibility.scheduledVisibility && !visibility.isVisibleToParent) {
      return { backgroundColor: '#FFFBF0', color: '#D4A017', border: '1px solid #FDE68A' };
    }
    return visibility.isVisibleToParent 
      ? { backgroundColor: '#E6FFE6', color: '#228B22', border: '1px solid #228B22' }
      : { backgroundColor: '#F8F9FA', color: '#6B7280', border: '1px solid #D1D5DB' };
  };

  const getVisibilityText = (item, isReportCard = false) => {
    const visibility = isReportCard ? item.visibility : item;
    
    if (visibility.scheduledVisibility && !visibility.isVisibleToParent) {
      return `Scheduled (${format(parseISO(visibility.scheduledVisibility), 'MMM dd')})`;
    }
    return visibility.isVisibleToParent ? 'Visible' : 'Hidden';
  };

  const handleViewReport = async (item, isReportCard = false) => {
    const studentInfo = getStudentInfo(item, isReportCard);
    
    if (!studentInfo.studentId && !studentInfo.studentObject?._id) {
      setError('Cannot generate report: Student information not available');
      return;
    }
    
    setSelectedStudent({
      studentId: studentInfo.studentObject?._id || studentInfo.studentId,
      studentName: studentInfo.name,
      session: isReportCard ? item.stats?.lastResultSession : item.session,
      term: isReportCard ? item.stats?.lastResultTerm : item.term,
      className: isReportCard ? item.className : item.className
    });
    setShowReportModal(true);
  };

  const generateReportCard = () => {
    if (!selectedStudent) return;
    
    const { studentId, session, term } = selectedStudent;
    
    const reportUrl = `${API_BASE_URL}/api/results/export/report/${studentId}/${encodeURIComponent(session)}/${encodeURIComponent(term)}`;
    
    const token = localStorage.getItem('token');
    const authUrl = `${reportUrl}?token=${token}`;
    
    window.open(authUrl, '_blank');
    setShowReportModal(false);
  };

  const handleResultsPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchResults(newPage);
    }
  };

  const handleReportCardPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalReportCardPages) {
      fetchReportCards(newPage);
    }
  };

  const handleResultsSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchResults(1);
  };

  const handleReportCardSearch = (e) => {
    e.preventDefault();
    setCurrentReportCardPage(1);
    fetchReportCards(1);
  };

  const clearResultsFilters = () => {
    setFilters({
      class: '',
      examType: '',
      term: '',
      year: '',
      visibility: 'all'
    });
    setSearchTerm('');
    setCurrentPage(1);
    fetchResults(1);
  };

  const clearReportCardFilters = () => {
    setReportCardFilters({
      class: '',
      term: '',
      year: '',
      visibility: 'all',
      hasReportCard: 'all'
    });
    setSearchReportCardTerm('');
    setCurrentReportCardPage(1);
    fetchReportCards(1);
  };

  const filteredResults = results.filter(result => {
    if (filters.class && result.className !== filters.class) return false;
    if (filters.examType && result.testTitle !== filters.examType) return false;
    if (filters.term && result.term?.toString() !== filters.term) return false;
    if (filters.year && result.session?.toString() !== filters.year) return false;
    if (filters.visibility === 'visible' && !result.isVisibleToParent) return false;
    if (filters.visibility === 'hidden' && result.isVisibleToParent) return false;
    if (filters.visibility === 'scheduled' && (!result.scheduledVisibility || result.isVisibleToParent)) return false;
    return true;
  });

  const filteredReportCards = reportCards.filter(reportCard => {
    if (reportCardFilters.class && reportCard.className !== reportCardFilters.class) return false;
    if (reportCardFilters.term && reportCard.stats?.lastResultTerm !== reportCardFilters.term) return false;
    if (reportCardFilters.year) {
      const lastSession = reportCard.stats?.lastResultSession;
      if (!lastSession || !lastSession.includes(reportCardFilters.year)) return false;
    }
    if (reportCardFilters.visibility === 'visible' && !reportCard.visibility?.isVisibleToParent) return false;
    if (reportCardFilters.visibility === 'hidden' && reportCard.visibility?.isVisibleToParent) return false;
    if (reportCardFilters.hasReportCard === 'true' && !reportCard.canGenerateReportCard) return false;
    if (reportCardFilters.hasReportCard === 'false' && reportCard.canGenerateReportCard) return false;
    return true;
  });

  const getUniqueReportCardClasses = () => {
    if (availableClasses.length > 0) {
      return availableClasses;
    }
    return [...new Set(reportCards.map(rc => rc.className).filter(Boolean))].sort();
  };

  const handleSelectAll = (e, isReportCard = false) => {
    if (isReportCard) {
      if (e.target.checked) {
        setSelectedReportCards(filteredReportCards.map(rc => rc._id));
      } else {
        setSelectedReportCards([]);
      }
    } else {
      if (e.target.checked) {
        setSelectedResults(filteredResults.map(r => r._id));
      } else {
        setSelectedResults([]);
      }
    }
  };

  const handleSelectResult = (resultId, isReportCard = false) => {
    if (isReportCard) {
      setSelectedReportCards(prev => 
        prev.includes(resultId) 
          ? prev.filter(id => id !== resultId)
          : [...prev, resultId]
      );
    } else {
      setSelectedResults(prev => 
        prev.includes(resultId) 
          ? prev.filter(id => id !== resultId)
          : [...prev, resultId]
      );
    }
  };

  const loading = activeTab === 'results' ? resultsLoading : reportCardsLoading;
  const currentData = activeTab === 'results' ? results : reportCards;
  const currentTotal = activeTab === 'results' ? totalResults : totalReportCards;

  if (loading && currentData.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>
          Loading {activeTab === 'results' ? 'result' : 'report card'} visibility controls...
        </p>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div style={styles.accessDenied}>
        <div style={styles.accessDeniedIcon}>🔒</div>
        <h3 style={styles.accessDeniedTitle}>Access Denied</h3>
        <p style={styles.accessDeniedText}>
          Visibility controls are only available to administrators.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header Section */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <FiGrid style={styles.titleIcon} />
          Result Visibility Control
        </h1>
        <p style={styles.subtitle}>
          Manage when parents can view exam results and report cards. Set visibility schedules and control access.
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabContainer}>
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === 'results' ? styles.activeTabButton : {})
            }}
            onClick={() => setActiveTab('results')}
          >
            <FiBook style={styles.tabIcon} />
            Results Visibility
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === 'report-cards' ? styles.activeTabButton : {})
            }}
            onClick={() => setActiveTab('report-cards')}
          >
            <FiFileText style={styles.tabIcon} />
            Report Cards Visibility
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        {activeTab === 'results' ? (
          <>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>📊</div>
              <div style={styles.statValue}>{stats.total}</div>
              <div style={styles.statLabel}>Total Results</div>
            </div>
            
            <div style={{...styles.statCard, borderColor: '#228B22'}}>
              <div style={{...styles.statIcon, color: '#228B22'}}>👁️</div>
              <div style={styles.statValue}>{stats.visible}</div>
              <div style={styles.statLabel}>Visible to Parents</div>
            </div>
            
            <div style={{...styles.statCard, borderColor: '#6B7280'}}>
              <div style={{...styles.statIcon, color: '#6B7280'}}>👁️‍🗨️</div>
              <div style={styles.statValue}>{stats.hidden}</div>
              <div style={styles.statLabel}>Hidden</div>
            </div>
            
            <div style={{...styles.statCard, borderColor: '#D4A017'}}>
              <div style={{...styles.statIcon, color: '#D4A017'}}>⏰</div>
              <div style={styles.statValue}>{stats.scheduled}</div>
              <div style={styles.statLabel}>Scheduled</div>
            </div>
          </>
        ) : (
          <>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>👥</div>
              <div style={styles.statValue}>{reportCardStats.total}</div>
              <div style={styles.statLabel}>Total Students</div>
            </div>
            
            <div style={{...styles.statCard, borderColor: '#228B22'}}>
              <div style={{...styles.statIcon, color: '#228B22'}}>📄</div>
              <div style={styles.statValue}>{reportCardStats.withReportCards}</div>
              <div style={styles.statLabel}>With Report Cards</div>
            </div>
            
            <div style={{...styles.statCard, borderColor: '#6B7280'}}>
              <div style={{...styles.statIcon, color: '#6B7280'}}>👁️‍🗨️</div>
              <div style={styles.statValue}>{reportCardStats.visible}</div>
              <div style={styles.statLabel}>Visible</div>
            </div>
            
            <div style={{...styles.statCard, borderColor: '#D4A017'}}>
              <div style={{...styles.statIcon, color: '#D4A017'}}>⏰</div>
              <div style={styles.statValue}>{reportCardStats.scheduled}</div>
              <div style={styles.statLabel}>Scheduled</div>
            </div>
          </>
        )}
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div style={styles.errorMessage}>
          <span style={{ whiteSpace: 'pre-line' }}>❌ {error}</span>
          <button onClick={clearMessages} style={styles.closeButton}>×</button>
        </div>
      )}
      
      {success && (
        <div style={styles.successMessage}>
          <span>✅ {success}</span>
          <button onClick={clearMessages} style={styles.closeButton}>×</button>
        </div>
      )}

      {/* Search Bar */}
      <div style={styles.searchContainer}>
        {activeTab === 'results' ? (
          <>
            <form onSubmit={handleResultsSearch} style={styles.searchForm}>
              <div style={styles.searchInputGroup}>
                <FiSearch style={styles.searchIcon} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by student name, ID, or class..."
                  style={styles.searchInput}
                />
                <button type="submit" style={styles.searchButton}>
                  Search
                </button>
              </div>
            </form>
            <button onClick={clearResultsFilters} style={styles.clearFiltersButton}>
              <FiRefreshCw /> Clear All Filters
            </button>
          </>
        ) : (
          <>
            <form onSubmit={handleReportCardSearch} style={styles.searchForm}>
              <div style={styles.searchInputGroup}>
                <FiSearch style={styles.searchIcon} />
                <input
                  type="text"
                  value={searchReportCardTerm}
                  onChange={(e) => setSearchReportCardTerm(e.target.value)}
                  placeholder="Search by student name, ID, or class..."
                  style={styles.searchInput}
                />
                <button type="submit" style={styles.searchButton}>
                  Search
                </button>
              </div>
            </form>
            <button onClick={clearReportCardFilters} style={styles.clearFiltersButton}>
              <FiRefreshCw /> Clear All Filters
            </button>
          </>
        )}
      </div>

      {/* Control Panel */}
      <div style={styles.controlPanel}>
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>
            <FiFilter style={styles.panelIcon} />
            {activeTab === 'results' ? 'Results' : 'Report Cards'} Visibility Controls
          </h3>
          
          <div style={styles.bulkActions}>
            {activeTab === 'results' ? (
              selectedResults.length > 0 && (
                <span style={styles.selectedCount}>
                  {selectedResults.length} selected
                </span>
              )
            ) : (
              selectedReportCards.length > 0 && (
                <span style={styles.selectedCount}>
                  {selectedReportCards.length} selected
                </span>
              )
            )}
            
            <select 
              value={bulkAction} 
              onChange={(e) => setBulkAction(e.target.value)}
              style={styles.bulkSelect}
              disabled={actionLoading || (activeTab === 'results' ? selectedResults.length === 0 : selectedReportCards.length === 0)}
            >
              <option value="">Bulk Actions...</option>
              <option value="show">Make Visible</option>
              <option value="hide">Hide from Parents</option>
              <option value="schedule">Schedule Visibility</option>
            </select>
            
            <button 
              onClick={handleBulkAction}
              style={{
                ...styles.primaryButton,
                ...(actionLoading || !bulkAction || (activeTab === 'results' ? selectedResults.length === 0 : selectedReportCards.length === 0) ? styles.disabledButton : {})
              }}
              disabled={actionLoading || !bulkAction || (activeTab === 'results' ? selectedResults.length === 0 : selectedReportCards.length === 0)}
            >
              <FiCheck /> Apply
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filtersSection}>
          <h4 style={styles.filtersTitle}>
            <FiSearch /> Filter {activeTab === 'results' ? 'Results' : 'Report Cards'}
          </h4>
          
          {activeTab === 'results' ? (
            <div style={styles.filtersGrid}>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Class</label>
                <select 
                  value={filters.class} 
                  onChange={(e) => setFilters({...filters, class: e.target.value})}
                  style={styles.filterSelect}
                  disabled={actionLoading}
                >
                  <option value="">All Classes</option>
                  {availableClasses.map(cls => (
                    <option key={cls.id || cls._id || cls} value={cls.name || cls}>
                      {cls.name || cls.shortName || cls}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Exam Type</label>
                <select 
                  value={filters.examType} 
                  onChange={(e) => setFilters({...filters, examType: e.target.value})}
                  style={styles.filterSelect}
                  disabled={actionLoading}
                >
                  <option value="">All Exam Types</option>
                  {uniqueExamTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Term</label>
                <select 
                  value={filters.term} 
                  onChange={(e) => setFilters({...filters, term: e.target.value})}
                  style={styles.filterSelect}
                  disabled={actionLoading}
                >
                  <option value="">All Terms</option>
                  {uniqueTerms.map(term => (
                    <option key={term} value={term}>Term {term}</option>
                  ))}
                </select>
              </div>
              
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Year/Session</label>
                <select 
                  value={filters.year} 
                  onChange={(e) => setFilters({...filters, year: e.target.value})}
                  style={styles.filterSelect}
                  disabled={actionLoading}
                >
                  <option value="">All Years</option>
                  {uniqueYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Visibility Status</label>
                <select 
                  value={filters.visibility} 
                  onChange={(e) => setFilters({...filters, visibility: e.target.value})}
                  style={styles.filterSelect}
                  disabled={actionLoading}
                >
                  <option value="all">All Results</option>
                  <option value="visible">Visible Only</option>
                  <option value="hidden">Hidden Only</option>
                  <option value="scheduled">Scheduled Only</option>
                </select>
              </div>
            </div>
          ) : (
            <div style={styles.filtersGrid}>
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Class</label>
                <select 
                  value={reportCardFilters.class} 
                  onChange={(e) => setReportCardFilters({...reportCardFilters, class: e.target.value})}
                  style={styles.filterSelect}
                  disabled={actionLoading}
                >
                  <option value="">All Classes</option>
                  {getUniqueReportCardClasses().map((cls, index) => (
                    <option key={cls.id || cls._id || index} value={cls.name || cls}>
                      {cls.name || cls.shortName || cls}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Term</label>
                <select 
                  value={reportCardFilters.term} 
                  onChange={(e) => setReportCardFilters({...reportCardFilters, term: e.target.value})}
                  style={styles.filterSelect}
                  disabled={actionLoading}
                >
                  <option value="">All Terms</option>
                  <option value="First Term">First Term</option>
                  <option value="Second Term">Second Term</option>
                  <option value="Third Term">Third Term</option>
                  <option value="1">Term 1</option>
                  <option value="2">Term 2</option>
                  <option value="3">Term 3</option>
                </select>
              </div>
              
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Year/Session</label>
                <input
                  type="text"
                  value={reportCardFilters.year}
                  onChange={(e) => setReportCardFilters({...reportCardFilters, year: e.target.value})}
                  placeholder="e.g., 2025/2026"
                  style={styles.filterInput}
                  disabled={actionLoading}
                />
              </div>
              
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Visibility Status</label>
                <select 
                  value={reportCardFilters.visibility} 
                  onChange={(e) => setReportCardFilters({...reportCardFilters, visibility: e.target.value})}
                  style={styles.filterSelect}
                  disabled={actionLoading}
                >
                  <option value="all">All Students</option>
                  <option value="visible">Visible Only</option>
                  <option value="hidden">Hidden Only</option>
                </select>
              </div>
              
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Report Card Status</label>
                <select 
                  value={reportCardFilters.hasReportCard} 
                  onChange={(e) => setReportCardFilters({...reportCardFilters, hasReportCard: e.target.value})}
                  style={styles.filterSelect}
                  disabled={actionLoading}
                >
                  <option value="all">All Students</option>
                  <option value="true">With Report Cards</option>
                  <option value="false">Without Report Cards</option>
                </select>
              </div>
            </div>
          )}
          
          <div style={styles.filterActions}>
            <label style={styles.notifyToggle}>
              <input 
                type="checkbox" 
                checked={notifyParents} 
                onChange={(e) => setNotifyParents(e.target.checked)}
                style={{ cursor: 'pointer', marginRight: '8px' }}
                disabled={actionLoading}
              />
              Notify parents via email when visibility changes
            </label>
            
            <button 
              onClick={() => activeTab === 'results' ? fetchResults(currentPage) : fetchReportCards(currentReportCardPage)}
              disabled={actionLoading || loading}
              style={styles.secondaryButton}
            >
              <FiRefreshCw /> Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results/Report Cards Table */}
      <div style={styles.resultsContainer}>
        <div style={styles.tableHeader}>
          <h3 style={styles.tableTitle}>
            {activeTab === 'results' ? 'Results' : 'Report Cards'} ({currentTotal})
            <span style={styles.tableSubtitle}>
              Showing page {activeTab === 'results' ? currentPage : currentReportCardPage} of {activeTab === 'results' ? totalPages : totalReportCardPages}
            </span>
          </h3>
          <div style={styles.tableActions}>
            {currentData.length > 0 && (
              <button 
                onClick={() => activeTab === 'results' ? fetchResults(currentPage) : fetchReportCards(currentReportCardPage)} 
                disabled={loading}
                style={styles.refreshButton}
              >
                ↻ Refresh
              </button>
            )}
          </div>
        </div>
        
        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.loadingSpinner}></div>
            <p>Loading {activeTab === 'results' ? 'results' : 'report cards'}...</p>
          </div>
        ) : currentData.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              {activeTab === 'results' ? '📊' : '📄'}
            </div>
            <h4 style={styles.emptyTitle}>
              No {activeTab === 'results' ? 'Results' : 'Report Cards'} Found
            </h4>
            <p style={styles.emptyText}>
              {activeTab === 'results' 
                ? (searchTerm || Object.values(filters).some(f => f) 
                    ? 'Try adjusting your search or filters.' 
                    : 'No results available.') 
                : (searchReportCardTerm || Object.values(reportCardFilters).some(f => f) 
                    ? 'Try adjusting your search or filters.' 
                    : 'No report cards available.')}
            </p>
            <button 
              onClick={() => activeTab === 'results' ? fetchResults() : fetchReportCards()} 
              style={styles.primaryButton}
            >
              <FiRefreshCw /> Load {activeTab === 'results' ? 'Results' : 'Report Cards'}
            </button>
          </div>
        ) : (
          <>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        onChange={(e) => handleSelectAll(e, activeTab === 'report-cards')}
                        checked={activeTab === 'results' 
                          ? selectedResults.length === filteredResults.length && filteredResults.length > 0
                          : selectedReportCards.length === filteredReportCards.length && filteredReportCards.length > 0}
                        disabled={actionLoading}
                      />
                    </th>
                    <th>Student</th>
                    {activeTab === 'results' ? (
                      <>
                        <th>Exam Details</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th>Published</th>
                      </>
                    ) : (
                      <>
                        <th>Class</th>
                        <th>Report Card Status</th>
                        <th>Results Count</th>
                        <th>Visibility</th>
                        <th>Last Updated</th>
                      </>
                    )}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTab === 'results' 
                    ? filteredResults.map((result) => {
                        const studentInfo = getStudentInfo(result, false);
                        return (
                          <tr key={result._id} style={styles.tableRow}>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={selectedResults.includes(result._id)}
                                onChange={() => handleSelectResult(result._id, false)}
                                disabled={actionLoading}
                              />
                            </td>
                            <td>
                              <div style={styles.studentCell}>
                                <div style={styles.avatar}>
                                  {studentInfo.initials}
                                </div>
                                <div>
                                  <div style={styles.studentName}>
                                    {studentInfo.name}
                                    {!studentsMap[result.userId] && (
                                      <span style={styles.fetchingIndicator}> (fetching...)</span>
                                    )}
                                  </div>
                                  <div style={styles.studentId}>
                                    {studentInfo.id} • {result.className || 'No Class'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={styles.examInfo}>
                                <strong>{result.testTitle || 'Exam'}</strong>
                                <div style={styles.examDetails}>
                                  {result.subject || 'Subject'} • Term {result.term} • {result.session}
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={styles.scoreCell}>
                                <span style={styles.scoreValue}>
                                  {result.score || 0}/{result.totalMarks || 100}
                                </span>
                                <span style={styles.scorePercentage}>
                                  ({result.percentage?.toFixed(1) || '0.0'}%)
                                </span>
                              </div>
                            </td>
                            <td>
                              <span style={{
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: '600',
                                display: 'inline-block',
                                marginBottom: '4px',
                                ...getVisibilityBadgeStyle(result, false)
                              }}>
                                {getVisibilityText(result, false)}
                              </span>
                              {result.lastUpdated && (
                                <div style={styles.updateTime}>
                                  Updated: {format(new Date(result.lastUpdated), 'MMM dd, HH:mm')}
                                </div>
                              )}
                              {result.scheduledVisibility && (
                                <div style={styles.scheduleTime}>
                                  Scheduled: {format(parseISO(result.scheduledVisibility), 'MMM dd, HH:mm')}
                                </div>
                              )}
                            </td>
                            <td>
                              {result.lastUpdated 
                                ? format(new Date(result.lastUpdated), 'MMM dd, yyyy')
                                : 'Not published'}
                            </td>
                            <td>
                              <div style={styles.actionButtons}>
                                {!result.isVisibleToParent ? (
                                  <button
                                    onClick={() => toggleResultVisibility(result._id, true)}
                                    disabled={actionLoading}
                                    style={{
                                      ...styles.showButton,
                                      backgroundColor: '#228B22',
                                      color: '#FFFFFF'
                                    }}
                                    title="Make visible to parents"
                                  >
                                    <FiEye /> Show
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => toggleResultVisibility(result._id, false)}
                                    disabled={actionLoading}
                                    style={{
                                      ...styles.hideButton,
                                      backgroundColor: '#6B7280',
                                      color: '#FFFFFF'
                                    }}
                                    title="Hide from parents"
                                  >
                                    <FiEyeOff /> Hide
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedResults([result._id]);
                                    setShowScheduleModal(true);
                                  }}
                                  disabled={actionLoading}
                                  style={{
                                    ...styles.scheduleButton,
                                    backgroundColor: '#FFFFFF',
                                    color: '#D4A017',
                                    border: '1px solid #D4A017'
                                  }}
                                  title="Schedule visibility"
                                >
                                  <FiClock /> Schedule
                                </button>
                                <button
                                  onClick={() => handleViewReport(result, false)}
                                  disabled={actionLoading}
                                  style={{
                                    ...styles.reportButton,
                                    backgroundColor: '#4B5320',
                                    color: '#FFFFFF'
                                  }}
                                  title="View report card"
                                >
                                  <FiFile /> Report
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    : filteredReportCards.map((reportCard) => {
                        const studentInfo = getStudentInfo(reportCard, true);
                        return (
                          <tr key={reportCard._id} style={styles.tableRow}>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={selectedReportCards.includes(reportCard._id)}
                                onChange={() => handleSelectResult(reportCard._id, true)}
                                disabled={actionLoading}
                              />
                            </td>
                            <td>
                              <div style={styles.studentCell}>
                                <div style={styles.avatar}>
                                  {studentInfo.initials}
                                </div>
                                <div>
                                  <div style={styles.studentName}>
                                    {studentInfo.name}
                                    {!studentsMap[reportCard._id] && (
                                      <span style={styles.fetchingIndicator}> (fetching...)</span>
                                    )}
                                  </div>
                                  <div style={styles.studentId}>
                                    {studentInfo.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div style={styles.classInfo}>
                                <strong>{reportCard.className || 'No Class'}</strong>
                                <div style={styles.classDetails}>
                                  Level: {reportCard.classLevel || 'N/A'}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: '600',
                                display: 'inline-block',
                                backgroundColor: reportCard.canGenerateReportCard ? '#E6FFE6' : '#F8F9FA',
                                color: reportCard.canGenerateReportCard ? '#228B22' : '#6B7280',
                                border: reportCard.canGenerateReportCard ? '1px solid #228B22' : '1px solid #D1D5DB'
                              }}>
                                {reportCard.canGenerateReportCard ? 'Available' : 'Not Available'}
                              </span>
                            </td>
                            <td>
                              <div style={styles.resultsCount}>
                                <strong>{reportCard.stats?.totalResults || 0}</strong>
                                <div style={styles.resultsDetails}>
                                  Visible: {reportCard.stats?.visibleResults || 0}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: '600',
                                display: 'inline-block',
                                marginBottom: '4px',
                                ...getVisibilityBadgeStyle(reportCard, true)
                              }}>
                                {getVisibilityText(reportCard, true)}
                              </span>
                              {reportCard.visibility?.lastUpdated && (
                                <div style={styles.updateTime}>
                                  Updated: {format(new Date(reportCard.visibility.lastUpdated), 'MMM dd, HH:mm')}
                                </div>
                              )}
                              {reportCard.visibility?.scheduledVisibility && (
                                <div style={styles.scheduleTime}>
                                  Scheduled: {format(parseISO(reportCard.visibility.scheduledVisibility), 'MMM dd, HH:mm')}
                                </div>
                              )}
                            </td>
                            <td>
                              {reportCard.stats?.lastResultDate 
                                ? format(new Date(reportCard.stats.lastResultDate), 'MMM dd, yyyy')
                                : 'No results'}
                            </td>
                            <td>
                              <div style={styles.actionButtons}>
                                {!reportCard.visibility?.isVisibleToParent ? (
                                  <button
                                    onClick={() => toggleReportCardVisibility(reportCard._id, true)}
                                    disabled={actionLoading}
                                    style={{
                                      ...styles.showButton,
                                      backgroundColor: '#228B22',
                                      color: '#FFFFFF'
                                    }}
                                    title="Make report card visible to parents"
                                  >
                                    <FiEye /> Show
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => toggleReportCardVisibility(reportCard._id, false)}
                                    disabled={actionLoading}
                                    style={{
                                      ...styles.hideButton,
                                      backgroundColor: '#6B7280',
                                      color: '#FFFFFF'
                                    }}
                                    title="Hide report card from parents"
                                  >
                                    <FiEyeOff /> Hide
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedReportCards([reportCard._id]);
                                    setShowScheduleModal(true);
                                  }}
                                  disabled={actionLoading}
                                  style={{
                                    ...styles.scheduleButton,
                                    backgroundColor: '#FFFFFF',
                                    color: '#D4A017',
                                    border: '1px solid #D4A017'
                                  }}
                                  title="Schedule visibility"
                                >
                                  <FiClock /> Schedule
                                </button>
                                {reportCard.canGenerateReportCard && (
                                  <button
                                    onClick={() => handleViewReport(reportCard, true)}
                                    disabled={actionLoading}
                                    style={{
                                      ...styles.reportButton,
                                      backgroundColor: '#4B5320',
                                      color: '#FFFFFF'
                                    }}
                                    title="Generate report card"
                                  >
                                    <FiDownload /> Generate
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {(activeTab === 'results' ? totalPages : totalReportCardPages) > 1 && (
              <div style={styles.pagination}>
                <button
                  onClick={() => activeTab === 'results' 
                    ? handleResultsPageChange(currentPage - 1)
                    : handleReportCardPageChange(currentReportCardPage - 1)
                  }
                  disabled={(activeTab === 'results' ? currentPage === 1 : currentReportCardPage === 1) || loading}
                  style={styles.paginationButton}
                >
                  Previous
                </button>
                
                <div style={styles.pageNumbers}>
                  {Array.from({ length: Math.min(5, activeTab === 'results' ? totalPages : totalReportCardPages) }, (_, i) => {
                    const totalPagesCount = activeTab === 'results' ? totalPages : totalReportCardPages;
                    const currentPageNum = activeTab === 'results' ? currentPage : currentReportCardPage;
                    
                    let pageNum;
                    if (totalPagesCount <= 5) {
                      pageNum = i + 1;
                    } else if (currentPageNum <= 3) {
                      pageNum = i + 1;
                    } else if (currentPageNum >= totalPagesCount - 2) {
                      pageNum = totalPagesCount - 4 + i;
                    } else {
                      pageNum = currentPageNum - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => activeTab === 'results' 
                          ? handleResultsPageChange(pageNum)
                          : handleReportCardPageChange(pageNum)
                        }
                        style={{
                          ...styles.pageButton,
                          ...((activeTab === 'results' ? currentPage === pageNum : currentReportCardPage === pageNum) 
                            ? { backgroundColor: '#D4A017', color: '#FFFFFF', borderColor: '#D4A017' } 
                            : {})
                        }}
                        disabled={loading}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => activeTab === 'results' 
                    ? handleResultsPageChange(currentPage + 1)
                    : handleReportCardPageChange(currentReportCardPage + 1)
                  }
                  disabled={(activeTab === 'results' ? currentPage === totalPages : currentReportCardPage === totalReportCardPages) || loading}
                  style={styles.paginationButton}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div style={styles.modalOverlay} onClick={() => !actionLoading && setShowScheduleModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <FiCalendar /> Schedule Visibility
              </h3>
              <button 
                onClick={() => !actionLoading && setShowScheduleModal(false)} 
                style={styles.modalClose}
                disabled={actionLoading}
              >
                ×
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <p style={styles.modalText}>
                Schedule visibility for {activeTab === 'results' ? selectedResults.length : selectedReportCards.length} selected {activeTab === 'results' ? 'result(s)' : 'report card(s)'}
              </p>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  style={styles.formInput}
                  min={new Date().toISOString().split('T')[0]}
                  disabled={actionLoading}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  style={styles.formInput}
                  disabled={actionLoading}
                />
              </div>
              
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={notifyParents}
                  onChange={(e) => setNotifyParents(e.target.checked)}
                  disabled={actionLoading}
                  style={{ marginRight: '8px' }}
                />
                Notify parents when {activeTab === 'results' ? 'results' : 'report cards'} become visible
              </label>
            </div>
            
            <div style={styles.modalActions}>
              <button
                onClick={() => !actionLoading && setShowScheduleModal(false)}
                disabled={actionLoading}
                style={styles.secondaryButton}
              >
                Cancel
              </button>
              <button
                onClick={activeTab === 'results' ? scheduleResultVisibility : scheduleReportCardVisibility}
                disabled={actionLoading || !scheduleDate}
                style={{
                  ...styles.primaryButton,
                  ...(actionLoading || !scheduleDate ? styles.disabledButton : {})
                }}
              >
                {actionLoading ? 'Scheduling...' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Card Modal */}
      {showReportModal && selectedStudent && (
        <div style={styles.modalOverlay} onClick={() => setShowReportModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <FiFileText /> Generate Report Card
              </h3>
              <button 
                onClick={() => setShowReportModal(false)} 
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <p style={styles.modalText}>
                Generate a detailed report card for:
              </p>
              
              <div style={styles.reportInfo}>
                <div style={styles.reportInfoRow}>
                  <span style={styles.reportInfoLabel}>Student:</span>
                  <span style={styles.reportInfoValue}>{selectedStudent.studentName}</span>
                </div>
                <div style={styles.reportInfoRow}>
                  <span style={styles.reportInfoLabel}>Class:</span>
                  <span style={styles.reportInfoValue}>{selectedStudent.className}</span>
                </div>
                <div style={styles.reportInfoRow}>
                  <span style={styles.reportInfoLabel}>Session:</span>
                  <span style={styles.reportInfoValue}>{selectedStudent.session}</span>
                </div>
                <div style={styles.reportInfoRow}>
                  <span style={styles.reportInfoLabel}>Term:</span>
                  <span style={styles.reportInfoValue}>{selectedStudent.term}</span>
                </div>
              </div>
              
              <div style={styles.reportWarning}>
                <p style={styles.warningText}>
                  <strong>Note:</strong> This will generate a PDF report card that includes:
                </p>
                <ul style={styles.warningList}>
                  <li>All test results for the selected term</li>
                  <li>Subject-wise performance analysis</li>
                  <li>Overall grade and percentage</li>
                  <li>Teacher comments section</li>
                </ul>
                <p style={styles.warningText}>
                  The report will open in a new tab as a downloadable PDF.
                </p>
              </div>
            </div>
            
            <div style={styles.modalActions}>
              <button
                onClick={() => setShowReportModal(false)}
                style={styles.secondaryButton}
              >
                Cancel
              </button>
              <button
                onClick={generateReportCard}
                style={styles.primaryButton}
              >
                <FiDownload /> Generate Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#F8F9FA',
    minHeight: '100vh'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    backgroundColor: '#F8F9FA'
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #D4A017',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  loadingText: {
    color: '#4B5320',
    fontSize: '16px'
  },
  accessDenied: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#F8F9FA',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  accessDeniedIcon: {
    fontSize: '64px',
    marginBottom: '20px',
    color: '#6B7280'
  },
  accessDeniedTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#4B5320',
    marginBottom: '12px'
  },
  accessDeniedText: {
    fontSize: '16px',
    color: '#6B7280',
    maxWidth: '400px',
    lineHeight: '1.5'
  },
  header: {
    marginBottom: '24px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#4B5320',
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  titleIcon: {
    fontSize: '32px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#6B7280',
    margin: 0,
    maxWidth: '600px'
  },
  tabContainer: {
    marginBottom: '24px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #E5E7EB',
    overflow: 'hidden'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #E5E7EB'
  },
  tabButton: {
    flex: 1,
    padding: '16px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    fontSize: '16px',
    fontWeight: '600',
    color: '#6B7280',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  activeTabButton: {
    color: '#4B5320',
    borderBottom: '3px solid #D4A017',
    backgroundColor: '#FFFBF0'
  },
  tabIcon: {
    fontSize: '18px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '20px',
    marginBottom: '32px'
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #E5E7EB',
    textAlign: 'center'
  },
  statIcon: {
    fontSize: '32px',
    marginBottom: '12px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#4B5320',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  errorMessage: {
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    borderLeft: '4px solid #B22222',
    padding: '16px',
    marginBottom: '20px',
    borderRadius: '4px',
    fontSize: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  successMessage: {
    backgroundColor: '#E6FFE6',
    color: '#228B22',
    borderLeft: '4px solid #228B22',
    padding: '16px',
    marginBottom: '20px',
    borderRadius: '4px',
    fontSize: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '20px',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%'
  },
  searchContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '16px'
  },
  searchForm: {
    flex: '1',
    minWidth: '300px'
  },
  searchInputGroup: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    overflow: 'hidden'
  },
  searchIcon: {
    fontSize: '20px',
    color: '#6B7280',
    marginLeft: '12px'
  },
  searchInput: {
    flex: '1',
    padding: '12px 16px',
    border: 'none',
    fontSize: '14px',
    color: '#4B5320',
    outline: 'none'
  },
  searchButton: {
    padding: '12px 24px',
    backgroundColor: '#D4A017',
    color: '#4B5320',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px'
  },
  clearFiltersButton: {
    padding: '10px 16px',
    backgroundColor: '#F8F9FA',
    color: '#4B5320',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  controlPanel: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #E5E7EB',
    marginBottom: '32px'
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  panelTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#4B5320',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  panelIcon: {
    fontSize: '20px'
  },
  bulkActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  selectedCount: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#D4A017',
    backgroundColor: '#FFFBF0',
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #FDE68A'
  },
  bulkSelect: {
    padding: '10px 36px 10px 16px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    fontSize: '14px',
    color: '#4B5320',
    cursor: 'pointer',
    minWidth: '180px'
  },
  filtersSection: {
    marginTop: '24px'
  },
  filtersTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '16px',
    marginBottom: '24px'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4B5320'
  },
  filterSelect: {
    padding: '10px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    fontSize: '14px',
    color: '#4B5320',
    cursor: 'pointer'
  },
  filterInput: {
    padding: '10px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    fontSize: '14px',
    color: '#4B5320'
  },
  filterActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '20px',
    borderTop: '1px solid #E5E7EB'
  },
  notifyToggle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#4B5320',
    cursor: 'pointer'
  },
  primaryButton: {
    padding: '10px 20px',
    backgroundColor: '#D4A017',
    color: '#4B5320',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minWidth: '120px'
  },
  secondaryButton: {
    padding: '10px 20px',
    backgroundColor: '#6B7280',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minWidth: '120px'
  },
  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  resultsContainer: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #E5E7EB'
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  tableTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#4B5320',
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  tableSubtitle: {
    fontSize: '12px',
    color: '#6B7280',
    fontWeight: 'normal'
  },
  tableActions: {
    display: 'flex',
    gap: '12px'
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#F8F9FA',
    color: '#4B5320',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  loadingState: {
    textAlign: 'center',
    color: '#6B7280',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  emptyState: {
    textAlign: 'center',
    color: '#6B7280',
    padding: '60px 40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4B5320',
    margin: 0
  },
  emptyText: {
    fontSize: '14px',
    lineHeight: '1.5',
    maxWidth: '400px',
    margin: '0 0 20px 0'
  },
  tableContainer: {
    overflowX: 'auto',
    marginBottom: '24px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableRow: {
    borderBottom: '1px solid #E5E7EB'
  },
  studentCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 0'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#D4A017',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    flexShrink: 0
  },
  studentName: {
    fontWeight: '600',
    color: '#4B5320',
    marginBottom: '4px'
  },
  studentId: {
    fontSize: '12px',
    color: '#6B7280'
  },
  fetchingIndicator: {
    fontSize: '11px',
    color: '#9CA3AF',
    fontStyle: 'italic'
  },
  examInfo: {
    padding: '16px 0'
  },
  examDetails: {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '4px'
  },
  classInfo: {
    padding: '16px 0'
  },
  classDetails: {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '4px'
  },
  resultsCount: {
    padding: '16px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  resultsDetails: {
    fontSize: '12px',
    color: '#6B7280'
  },
  scoreCell: {
    padding: '16px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  scoreValue: {
    fontWeight: '600',
    color: '#4B5320'
  },
  scorePercentage: {
    fontSize: '12px',
    color: '#6B7280'
  },
  updateTime: {
    fontSize: '11px',
    color: '#9CA3AF',
    marginTop: '2px'
  },
  scheduleTime: {
    fontSize: '11px',
    color: '#D4A017',
    marginTop: '2px',
    fontWeight: '500'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    padding: '16px 0'
  },
  showButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    minWidth: '80px',
    justifyContent: 'center'
  },
  hideButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    minWidth: '80px',
    justifyContent: 'center'
  },
  scheduleButton: {
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    minWidth: '100px',
    justifyContent: 'center'
  },
  reportButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    minWidth: '90px',
    justifyContent: 'center'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    paddingTop: '20px',
    borderTop: '1px solid #E5E7EB'
  },
  paginationButton: {
    padding: '8px 16px',
    backgroundColor: '#F8F9FA',
    color: '#4B5320',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  pageNumbers: {
    display: 'flex',
    gap: '8px'
  },
  pageButton: {
    padding: '8px 12px',
    backgroundColor: '#F8F9FA',
    color: '#4B5320',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    minWidth: '40px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#4B5320',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#6B7280',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%'
  },
  modalBody: {
    marginBottom: '24px'
  },
  modalText: {
    fontSize: '14px',
    color: '#4B5320',
    marginBottom: '20px'
  },
  reportInfo: {
    backgroundColor: '#F8F9FA',
    padding: '16px',
    borderRadius: '6px',
    marginBottom: '20px'
  },
  reportInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  reportInfoLabel: {
    fontSize: '14px',
    color: '#6B7280',
    fontWeight: '500'
  },
  reportInfoValue: {
    fontSize: '14px',
    color: '#4B5320',
    fontWeight: '600'
  },
  reportWarning: {
    backgroundColor: '#FFFBF0',
    border: '1px solid #FDE68A',
    padding: '16px',
    borderRadius: '6px',
    marginBottom: '16px'
  },
  warningText: {
    fontSize: '13px',
    color: '#92400E',
    marginBottom: '8px',
    lineHeight: '1.5'
  },
  warningList: {
    fontSize: '13px',
    color: '#92400E',
    marginLeft: '20px',
    marginBottom: '8px'
  },
  formGroup: {
    marginBottom: '16px'
  },
  formLabel: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#4B5320'
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#FFFFFF',
    color: '#4B5320'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#4B5320',
    cursor: 'pointer'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  }
};

export default ResultVisibilityControl;