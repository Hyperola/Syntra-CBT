import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';

// Configure axios
axios.defaults.baseURL = 'http://localhost:5000';
axios.defaults.withCredentials = true;

const ManageQuestions = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, error: authError } = useContext(AuthContext);
  
  const [questions, setQuestions] = useState([]);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalQuestions: 0,
    hasNext: false,
    hasPrev: false
  });
  const [itemsPerPage] = useState(20); // Fixed at 20 per page

  // Helper function to extract subject string from object or string
  const getSubjectString = (subject) => {
    if (!subject) return '';
    if (typeof subject === 'string') return subject;
    return subject.name || subject.subject || subject.subjectName || '';
  };

  // Helper function to extract class string from object or string
  const getClassString = (cls) => {
    if (!cls) return '';
    if (typeof cls === 'string') return cls;
    return cls.name || cls.className || cls.class || '';
  };

  // Get token from localStorage
  const getToken = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    return token ? token.replace('Bearer ', '').trim() : null;
  };

  // Fetch questions from API with pagination
  const fetchQuestions = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await axios.get('/api/teacher/questions', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          page: page,
          limit: itemsPerPage,
          subject: filterSubject || undefined,
          class: filterClass || undefined
        }
      });

      if (response.data.success && Array.isArray(response.data.questions)) {
        setQuestions(response.data.questions);
        
        // Update pagination info from backend
        if (response.data.pagination) {
          setPagination({
            currentPage: response.data.pagination.currentPage || page,
            totalPages: response.data.pagination.totalPages || 1,
            totalQuestions: response.data.pagination.totalQuestions || 0,
            hasNext: response.data.pagination.hasNext || false,
            hasPrev: response.data.pagination.hasPrev || false
          });
        }
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      console.error('Fetch questions error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch questions.');
      
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch questions on component mount or when filters change
  useEffect(() => {
    if (user && user.role === 'teacher') {
      fetchQuestions(1); // Always start from page 1 when filters change
    }
  }, [user, filterSubject, filterClass]); // Refetch when filters change

  // Trigger MathJax typesetting when questions load
  useEffect(() => {
    if (window.MathJax && questions.length > 0) {
      window.MathJax.typesetPromise();
    }
  }, [questions]);

  // Pagination handlers
  const handleNextPage = () => {
    if (pagination.hasNext) {
      fetchQuestions(pagination.currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (pagination.hasPrev) {
      fetchQuestions(pagination.currentPage - 1);
    }
  };

  const handlePageClick = (page) => {
    fetchQuestions(page);
  };

  // Get unique subjects from questions and user data
  const getSubjectOptions = () => {
    const questionSubjects = questions.map(q => getSubjectString(q.subject)).filter(Boolean);
    
    // Extract subjects from user data
    const userSubjects = [];
    
    // From user.subjects array
    if (user?.subjects && Array.isArray(user.subjects)) {
      user.subjects.forEach(subject => {
        const subjectName = getSubjectString(subject);
        if (subjectName) {
          userSubjects.push(subjectName);
        }
      });
    }
    
    // From teacherAssignments
    if (user?.teacherAssignments && Array.isArray(user.teacherAssignments)) {
      user.teacherAssignments.forEach(assignment => {
        if (assignment?.subjects && Array.isArray(assignment.subjects)) {
          assignment.subjects.forEach(subject => {
            const subjectName = getSubjectString(subject);
            if (subjectName) {
              userSubjects.push(subjectName);
            }
          });
        }
      });
    }
    
    return [...new Set([...questionSubjects, ...userSubjects])].filter(Boolean);
  };

  // Get unique classes from questions and user data
  const getClassOptions = () => {
    const questionClasses = questions.map(q => getClassString(q.class)).filter(Boolean);
    
    // Extract classes from user data
    const userClasses = [];
    
    // From user.subjects array
    if (user?.subjects && Array.isArray(user.subjects)) {
      user.subjects.forEach(subject => {
        const className = getClassString(subject.class || subject.className);
        if (className) {
          userClasses.push(className);
        }
      });
    }
    
    // From teacherAssignments
    if (user?.teacherAssignments && Array.isArray(user.teacherAssignments)) {
      user.teacherAssignments.forEach(assignment => {
        const className = getClassString(assignment.className || assignment.class);
        if (className) {
          userClasses.push(className);
        }
      });
    }
    
    return [...new Set([...questionClasses, ...userClasses])].filter(Boolean);
  };

  const handleEditQuestion = (question) => {
    navigate('/teacher/add-question', {
      state: {
        editQuestionId: question._id,
        questionForm: {
          subject: getSubjectString(question.subject),
          class: getClassString(question.class),
          text: question.text,
          options: question.options,
          correctAnswer: question.correctAnswer,
          marks: question.marks || 1,
          formula: question.formula || '',
          saveToBank: question.saveToBank !== false,
        },
      },
    });
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      await axios.delete(`/api/teacher/questions/${id}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setSuccess('Question deleted successfully.');
      // Refresh the current page after deletion
      fetchQuestions(pagination.currentPage);
      
    } catch (err) {
      console.error('Delete question error:', err);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        navigate('/login');
      } else if (err.response?.status === 404) {
        setError('Question not found. It may have already been deleted.');
        // Refresh the list
        fetchQuestions(pagination.currentPage);
      } else {
        setError(err.response?.data?.error || 'Failed to delete question. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportQuestions = () => {
    setError(null);
    setSuccess(null);
    
    try {
      // Export all questions (not just current page)
      const filteredQuestions = questions
        .filter(q => {
          const subjectValue = getSubjectString(q.subject);
          const classValue = getClassString(q.class);
          
          return (
            (!filterSubject || subjectValue === filterSubject) &&
            (!filterClass || classValue === filterClass)
          );
        })
        .map(q => ({
          subject: getSubjectString(q.subject),
          class: getClassString(q.class),
          questionText: q.text || '',
          option1: q.options?.[0] || '',
          option2: q.options?.[1] || '',
          option3: q.options?.[2] || '',
          option4: q.options?.[3] || '',
          correctAnswer: q.correctAnswer || '',
          marks: q.marks || 1,
          formula: q.formula || '',
          difficulty: q.difficulty || 'medium',
          explanation: q.explanation || '',
        }));

      if (filteredQuestions.length === 0) {
        setError('No questions match the selected filters. Try adjusting your filters or add new questions.');
        return;
      }

      const csv = Papa.unparse(filteredQuestions, {
        quotes: true,
        delimiter: ',',
        header: true,
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `questions_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setSuccess(`Exported ${filteredQuestions.length} questions from current page successfully.`);
    } catch (err) {
      console.error('Export questions error:', err);
      setError('Failed to export questions. Please try again.');
    }
  };

  // Generate page numbers for pagination
  const generatePageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (pagination.totalPages <= maxPagesToShow) {
      // Show all pages
      for (let i = 1; i <= pagination.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show limited pages with ellipsis
      let startPage = Math.max(1, pagination.currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = startPage + maxPagesToShow - 1;
      
      if (endPage > pagination.totalPages) {
        endPage = pagination.totalPages;
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push('...');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < pagination.totalPages) {
        if (endPage < pagination.totalPages - 1) pages.push('...');
        pages.push(pagination.totalPages);
      }
    }
    
    return pages;
  };

  // Get safe string values for display
  const safeUserRole = user?.role || 'Unknown';
  const safeUserName = user?.name || user?.username || 'User';

  // Loading state
  if (authLoading || loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        color: '#4B5320'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>
            <span style={{ animation: 'spin 1s linear infinite' }}>🔄</span>
          </div>
          <p style={{ fontSize: '18px', fontWeight: '500' }}>
            Loading questions...
          </p>
        </div>
      </div>
    );
  }

  // Auth error state
  if (authError) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        color: '#4B5320'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '40px' }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '20px',
            color: '#DC3545'
          }}>
            ⚠️
          </div>
          <h2 style={{ color: '#4B5320', marginBottom: '20px' }}>
            Authentication Error
          </h2>
          <p style={{ marginBottom: '30px', color: '#6C757D' }}>
            {authError}
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{
              backgroundColor: '#4B5320',
              color: 'white',
              border: 'none',
              padding: '12px 30px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '16px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a4220'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4B5320'}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Check if user is a teacher
  if (!user || user.role !== 'teacher') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        color: '#4B5320'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '40px' }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '20px',
            color: '#DC3545'
          }}>
            ⚠️
          </div>
          <h2 style={{ color: '#4B5320', marginBottom: '20px' }}>
            Access Denied
          </h2>
          <p style={{ marginBottom: '20px', color: '#6C757D' }}>
            You are logged in as <strong>{safeUserRole}</strong>, but this page is only accessible to teachers.
          </p>
          <p style={{ marginBottom: '30px', color: '#6C757D', fontSize: '14px' }}>
            User: {safeUserName} | Role: {safeUserRole}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              backgroundColor: '#4B5320',
              color: 'white',
              border: 'none',
              padding: '12px 30px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '16px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a4220'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4B5320'}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <script src="https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js" id="MathJax-script"></script>
      
      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '20px',
          borderLeft: '4px solid #dc3545',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '10px', fontSize: '20px' }}>⚠️</span>
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#721c24',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0 5px'
            }}
          >
            ×
          </button>
        </div>
      )}
      
      {/* Success Message */}
      {success && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '20px',
          borderLeft: '4px solid #28a745',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '10px', fontSize: '20px' }}>✅</span>
          <span style={{ flex: 1 }}>{success}</span>
          <button
            onClick={() => setSuccess(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#155724',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0 5px'
            }}
          >
            ×
          </button>
        </div>
      )}
      
      {/* Main Container */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '25px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        marginBottom: '30px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div>
            <h2 style={{
              color: '#4B5320',
              marginTop: '0',
              marginBottom: '10px',
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{ marginRight: '10px' }}>📝</span>
              Manage Questions
            </h2>
            <p style={{ color: '#6C757D', margin: '0', fontSize: '14px' }}>
              Showing {questions.length} questions on page {pagination.currentPage} of {pagination.totalPages}
              {pagination.totalQuestions > 0 && ` (Total: ${pagination.totalQuestions} questions)`}
            </p>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => fetchQuestions(pagination.currentPage)}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
            >
              <span style={{ marginRight: '8px' }}>🔄</span>
              Refresh
            </button>
            
            <button
              onClick={() => navigate('/teacher/add-question')}
              style={{
                backgroundColor: '#4B5320',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a4220'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4B5320'}
            >
              <span style={{ marginRight: '8px' }}>➕</span>
              Add Question
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '15px',
          marginBottom: '25px',
          padding: '20px',
          backgroundColor: '#F8F9FA',
          borderRadius: '6px',
          border: '1px solid #E9ECEF'
        }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#4B5320',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              Filter by Subject
            </label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #DEE2E6',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#4B5320',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                transition: 'border 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4B5320'}
              onBlur={(e) => e.target.style.borderColor = '#DEE2E6'}
            >
              <option value="">All Subjects</option>
              {getSubjectOptions().map((subject, index) => (
                <option key={index} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#4B5320',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              Filter by Class
            </label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #DEE2E6',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#4B5320',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                transition: 'border 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4B5320'}
              onBlur={(e) => e.target.style.borderColor = '#DEE2E6'}
            >
              <option value="">All Classes</option>
              {getClassOptions().map((cls, index) => (
                <option key={index} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ alignSelf: 'flex-end' }}>
            <button
              onClick={handleExportQuestions}
              disabled={questions.length === 0 || loading}
              style={{
                backgroundColor: questions.length === 0 || loading ? '#CED4DA' : '#28A745',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: questions.length === 0 || loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (questions.length > 0 && !loading) {
                  e.currentTarget.style.backgroundColor = '#218838';
                }
              }}
              onMouseLeave={(e) => {
                if (questions.length > 0 && !loading) {
                  e.currentTarget.style.backgroundColor = '#28A745';
                }
              }}
            >
              <span style={{ marginRight: '8px' }}>📥</span>
              Export Questions
            </button>
          </div>
        </div>

        {/* Questions Table */}
        {questions.length === 0 ? (
          <div style={{
            backgroundColor: '#FFF9E6',
            borderLeft: '4px solid #FFD700',
            padding: '30px',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px', color: '#FFD700' }}>
              📚
            </div>
            <h3 style={{ color: '#4B5320', marginBottom: '15px' }}>
              No Questions Found
            </h3>
            <p style={{ margin: '0 0 25px 0', color: '#6C757D' }}>
              Your question bank is empty. Start by adding questions using the "Add Question" button above.
            </p>
            <button
              onClick={() => navigate('/teacher/add-question')}
              style={{
                backgroundColor: '#4B5320',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a4220'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4B5320'}
            >
              <span style={{ marginRight: '8px' }}>➕</span>
              Add Your First Question
            </button>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #E9ECEF' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '800px'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: '#4B5320',
                    color: 'white'
                  }}>
                    <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Question</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Subject</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Class</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Options</th>
                    <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map(question => (
                    <tr 
                      key={question._id} 
                      style={{
                        borderBottom: '1px solid #E9ECEF',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '15px', verticalAlign: 'top', maxWidth: '350px', wordBreak: 'break-word' }}>
                        <div style={{ 
                          fontWeight: '500', 
                          color: '#4B5320',
                          marginBottom: '5px',
                          fontSize: '14px'
                        }}>
                          {question.text || 'No question text'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6C757D' }}>
                          <span style={{ 
                            backgroundColor: '#E8F5E9', 
                            padding: '2px 6px', 
                            borderRadius: '3px',
                            marginRight: '8px'
                          }}>
                            {question.marks || 1} mark{question.marks !== 1 ? 's' : ''}
                          </span>
                          <span style={{ 
                            backgroundColor: '#E3F2FD', 
                            padding: '2px 6px', 
                            borderRadius: '3px'
                          }}>
                            {question.difficulty || 'medium'}
                          </span>
                        </div>
                        {question.formula && (
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#6C757D' }}>
                            <strong>Formula:</strong> <span>{question.formula}</span>
                          </div>
                        )}
                      </td>
                      
                      <td style={{ padding: '15px', verticalAlign: 'top' }}>
                        <span style={{
                          backgroundColor: '#E8F5E9',
                          color: '#4B5320',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontWeight: '600',
                          display: 'inline-block'
                        }}>
                          {getSubjectString(question.subject) || 'N/A'}
                        </span>
                      </td>
                      
                      <td style={{ padding: '15px', verticalAlign: 'top' }}>
                        <span style={{
                          backgroundColor: '#FFF8E1',
                          color: '#4B5320',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          fontSize: '13px',
                          fontWeight: '600',
                          display: 'inline-block'
                        }}>
                          {getClassString(question.class) || 'N/A'}
                        </span>
                      </td>
                      
                      <td style={{ padding: '15px', verticalAlign: 'top', maxWidth: '200px' }}>
                        <div style={{ fontSize: '12px', color: '#6C757D' }}>
                          {question.options && Array.isArray(question.options) ? (
                            question.options.map((option, index) => (
                              <div 
                                key={index} 
                                style={{ 
                                  marginBottom: '4px',
                                  padding: '4px 8px',
                                  borderRadius: '3px',
                                  backgroundColor: question.correctAnswer === option ? '#D4EDDA' : '#F8F9FA',
                                  borderLeft: question.correctAnswer === option ? '3px solid #28A745' : '3px solid #DEE2E6'
                                }}
                              >
                                <span style={{ fontWeight: '600', marginRight: '5px' }}>
                                  {String.fromCharCode(65 + index)}:
                                </span>
                                {option || `Option ${String.fromCharCode(65 + index)}`}
                                {question.correctAnswer === option && (
                                  <span style={{ 
                                    marginLeft: '8px', 
                                    color: '#28A745',
                                    fontSize: '11px',
                                    fontWeight: '600'
                                  }}>
                                    ✓ Correct
                                  </span>
                                )}
                              </div>
                            ))
                          ) : (
                            <div style={{ color: '#DC3545', fontStyle: 'italic' }}>
                              No options available
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td style={{ padding: '15px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleEditQuestion(question)}
                            style={{
                              backgroundColor: '#FFD700',
                              color: '#4B5320',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFC107'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFD700'}
                            title="Edit Question"
                          >
                            <span style={{ marginRight: '5px', fontSize: '14px' }}>✏️</span>
                            Edit
                          </button>
                          
                          <button
                            onClick={() => handleDeleteQuestion(question._id)}
                            disabled={loading}
                            style={{
                              backgroundColor: loading ? '#CED4DA' : '#FF6B6B',
                              color: 'white',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              fontWeight: '600',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!loading) {
                                e.currentTarget.style.backgroundColor = '#DC3545';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!loading) {
                                e.currentTarget.style.backgroundColor = '#FF6B6B';
                              }
                            }}
                            title="Delete Question"
                          >
                            <span style={{ marginRight: '5px', fontSize: '14px' }}>🗑️</span>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#F8F9FA',
                borderRadius: '6px',
                border: '1px solid #E9ECEF'
              }}>
                <div style={{ color: '#6C757D', fontSize: '14px' }}>
                  Showing {questions.length} of {pagination.totalQuestions} questions
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={handlePrevPage}
                    disabled={!pagination.hasPrev || loading}
                    style={{
                      backgroundColor: pagination.hasPrev ? '#6c757d' : '#CED4DA',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: pagination.hasPrev && !loading ? 'pointer' : 'not-allowed',
                      fontWeight: '600',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (pagination.hasPrev && !loading) {
                        e.currentTarget.style.backgroundColor = '#5a6268';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (pagination.hasPrev && !loading) {
                        e.currentTarget.style.backgroundColor = '#6c757d';
                      }
                    }}
                  >
                    ← Previous
                  </button>
                  
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {generatePageNumbers().map((page, index) => (
                      page === '...' ? (
                        <span key={`ellipsis-${index}`} style={{ padding: '8px 12px' }}>...</span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => handlePageClick(page)}
                          style={{
                            backgroundColor: page === pagination.currentPage ? '#4B5320' : 'transparent',
                            color: page === pagination.currentPage ? 'white' : '#4B5320',
                            border: `1px solid ${page === pagination.currentPage ? '#4B5320' : '#DEE2E6'}`,
                            padding: '8px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '13px',
                            minWidth: '40px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (page !== pagination.currentPage) {
                              e.currentTarget.style.backgroundColor = '#F8F9FA';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (page !== pagination.currentPage) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          {page}
                        </button>
                      )
                    ))}
                  </div>
                  
                  <button
                    onClick={handleNextPage}
                    disabled={!pagination.hasNext || loading}
                    style={{
                      backgroundColor: pagination.hasNext ? '#6c757d' : '#CED4DA',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: pagination.hasNext && !loading ? 'pointer' : 'not-allowed',
                      fontWeight: '600',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (pagination.hasNext && !loading) {
                        e.currentTarget.style.backgroundColor = '#5a6268';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (pagination.hasNext && !loading) {
                        e.currentTarget.style.backgroundColor = '#6c757d';
                      }
                    }}
                  >
                    Next →
                  </button>
                </div>
                
                <div style={{ color: '#6C757D', fontSize: '14px' }}>
                  Page {pagination.currentPage} of {pagination.totalPages}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Summary */}
      {questions.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          textAlign: 'center',
          borderTop: '4px solid #4B5320'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <div>
              <div style={{ fontSize: '24px', color: '#4B5320', fontWeight: '700' }}>
                {pagination.totalQuestions}
              </div>
              <div style={{ color: '#6C757D', fontSize: '14px' }}>
                Total Questions
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '24px', color: '#4B5320', fontWeight: '700' }}>
                {pagination.totalPages}
              </div>
              <div style={{ color: '#6C757D', fontSize: '14px' }}>
                Total Pages
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '24px', color: '#4B5320', fontWeight: '700' }}>
                {new Set(questions.map(q => getSubjectString(q.subject))).size}
              </div>
              <div style={{ color: '#6C757D', fontSize: '14px' }}>
                Subjects
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '24px', color: '#4B5320', fontWeight: '700' }}>
                {new Set(questions.map(q => getClassString(q.class))).size}
              </div>
              <div style={{ color: '#6C757D', fontSize: '14px' }}>
                Classes
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageQuestions;