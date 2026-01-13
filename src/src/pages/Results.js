// pages/results.js for superadmins //
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useResultEditing } from '../hooks/useResultEditing';
import ResultScoreEditor from '../components/ResultScoreEditor';
import { FiEdit, FiEye, FiTrash2, FiX, FiChevronLeft, FiChevronRight, FiDownload, FiFilter, FiSearch, FiBarChart2, FiUsers, FiBook, FiCalendar, FiClock, FiCheckCircle, FiXCircle, FiPercent } from 'react-icons/fi';

const Results = () => {
  const { user } = useContext(AuthContext);
  const { testId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });

  // Use the reusable editing hook
  const {
    editingResultId,
    editScore,
    setEditScore,
    loading: editingLoading,
    error: editingError,
    success: editingSuccess,
    setError: setEditingError,
    setSuccess: setEditingSuccess,
    startEditing,
    cancelEditing,
    saveScore
  } = useResultEditing();

  // Helper function to extract user's full name safely
  const getUserFullName = (result) => {
    try {
      // Check different possible data structures
      if (result.userId) {
        // If userId is a populated object
        if (typeof result.userId === 'object' && result.userId !== null) {
          const name = result.userId.name || '';
          const surname = result.userId.surname || '';
          const firstName = result.userId.firstName || '';
          const lastName = result.userId.lastName || '';
          const username = result.userId.username || '';
          
          // Try different combinations
          if (name && surname) return `${name} ${surname}`;
          if (firstName && lastName) return `${firstName} ${lastName}`;
          if (firstName && surname) return `${firstName} ${surname}`;
          if (name) return name;
          if (firstName) return firstName;
          if (username) return username;
        }
        // If userId is just an ID string, check if we have student info in other fields
        else if (typeof result.userId === 'string') {
          // Check if there's any student info in the result
          if (result.studentName) return result.studentName;
          if (result.student) {
            if (typeof result.student === 'object') {
              return `${result.student.firstName || ''} ${result.student.lastName || ''}`.trim() || 
                     result.student.username || 
                     'Unknown Student';
            }
          }
          return 'Loading...';
        }
      }
      
      // Fallback: Check if result has student info directly
      if (result.studentName) return result.studentName;
      if (result.student) {
        if (typeof result.student === 'object') {
          return `${result.student.firstName || ''} ${result.student.lastName || ''}`.trim() || 
                 result.student.username || 
                 'Unknown Student';
        }
      }
      
      return 'Unknown Student';
    } catch (error) {
      console.error('Error getting user name:', error);
      return 'Unknown Student';
    }
  };

  // Helper function to get student ID safely
  const getStudentId = (result) => {
    try {
      if (result.userId) {
        if (typeof result.userId === 'object' && result.userId !== null) {
          return result.userId.studentId || result.userId.username || 'N/A';
        }
      }
      
      // Fallback: Check result directly
      if (result.studentId) return result.studentId;
      if (result.student) {
        if (typeof result.student === 'object') {
          return result.student.studentId || result.student.username || 'N/A';
        }
      }
      
      return 'N/A';
    } catch (error) {
      return 'N/A';
    }
  };

  // Helper function to calculate percentage
  const calculatePercentage = (result) => {
    try {
      if (result.percentage !== undefined) {
        return Math.round(result.percentage);
      }
      
      const totalMarks = result.totalMarks || test?.totalMarks || 100;
      if (totalMarks > 0 && result.score !== undefined) {
        return Math.round((result.score / totalMarks) * 100);
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
  };

  // Helper function to get class name from test
  const getClassName = () => {
    if (!test) return 'N/A';
    
    if (test.class) {
      if (typeof test.class === 'object' && test.class.name) {
        return test.class.name;
      } else if (typeof test.class === 'string') {
        return test.class;
      }
    }
    return 'N/A';
  };

  // Helper function to get subject name from test
  const getSubjectName = () => {
    if (!test) return 'N/A';
    return test.subject || 'N/A';
  };

  // Helper function to get total questions
  const getTotalQuestions = () => {
    if (!test) return 'N/A';
    return test.questions?.length || test.questionCount || 'N/A';
  };

  useEffect(() => {
    const fetchResults = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setEditingError('Please login again.');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching test and results for test ID:', testId);
        
        // Fetch test details
        const testRes = await axios.get(`http://localhost:5000/api/tests/${testId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        console.log('Test response:', testRes.data);
        setTest(testRes.data.test || testRes.data);
        
        // Fetch results for this test
        const resultsRes = await axios.get(`http://localhost:5000/api/results/test/${testId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        console.log('Results response:', resultsRes.data);
        
        // Handle the response structure properly
        const resultsData = resultsRes.data.results || resultsRes.data || [];
        console.log('Processed results data:', resultsData);
        
        // If results don't have populated user info, try to fetch student details
        if (resultsData.length > 0 && (!resultsData[0].userId || typeof resultsData[0].userId === 'string')) {
          console.log('Results need user population, fetching student details...');
          const populatedResults = await Promise.all(
            resultsData.map(async (result) => {
              try {
                // Fetch student details for each result
                if (result.userId && typeof result.userId === 'string') {
                  const studentRes = await axios.get(`http://localhost:5000/api/users/${result.userId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  return {
                    ...result,
                    userId: studentRes.data.user || studentRes.data,
                    student: studentRes.data.user || studentRes.data
                  };
                }
                return result;
              } catch (error) {
                console.error('Error fetching student details:', error);
                return result;
              }
            })
          );
          setResults(populatedResults);
        } else {
          setResults(resultsData);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Results - Error:', error.response?.data || error.message);
        setEditingError(error.response?.data?.error || 'Failed to load results');
        setLoading(false);
      }
    };

    if (user && ['admin', 'teacher', 'super_admin'].includes(user.role)) {
      fetchResults();
    } else {
      setEditingError('Access restricted to authorized users.');
      setLoading(false);
    }
  }, [testId, user, navigate, setEditingError]);

  const handleSaveScore = async (resultId) => {
    // Check permissions based on role
    if (user.role === 'teacher' && !test?.createdBy?._id === user.id) {
      setEditingError('You can only edit scores for tests you created.');
      return;
    }

    await saveScore(resultId, (updatedResultId, newScore) => {
      // Update local state after successful save
      setResults(results.map((r) =>
        r._id === updatedResultId ? { ...r, score: newScore } : r
      ));
    });
  };

  const handleViewAnswers = async (result) => {
    try {
      const token = localStorage.getItem('token');
      const detailRes = await axios.get(`http://localhost:5000/api/results/details/${result._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('Detailed result:', detailRes.data);
      
      setSelectedResult({ 
        ...result, 
        questionAnalysis: detailRes.data.questionAnalysis || [],
        detailedData: detailRes.data,
        // Ensure user info is included
        userId: result.userId || detailRes.data.result?.student,
        student: result.student || detailRes.data.result?.student
      });
    } catch (err) {
      console.error('Error fetching result details:', err);
      setEditingError('Failed to load detailed answers.');
    }
  };

  const closeAnswers = () => {
    setSelectedResult(null);
  };

  const handleDeleteResult = async (resultId) => {
    if (!window.confirm('Are you sure you want to delete this result? This action cannot be undone.')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/results/${resultId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Remove from local state
      setResults(results.filter(r => r._id !== resultId));
      setEditingSuccess('Result deleted successfully.');
      setEditingError(null);
    } catch (err) {
      console.error('Error deleting result:', err);
      setEditingError(err.response?.data?.error || 'Failed to delete result.');
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort results
  const filteredResults = results.filter(result => {
    const studentName = getUserFullName(result).toLowerCase();
    const studentId = getStudentId(result).toLowerCase();
    return (
      studentName.includes(searchTerm.toLowerCase()) ||
      studentId.includes(searchTerm.toLowerCase())
    );
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortConfig.key === 'name') {
      const nameA = getUserFullName(a).toLowerCase();
      const nameB = getUserFullName(b).toLowerCase();
      return sortConfig.direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    }
    
    if (sortConfig.key === 'percentage') {
      const percentageA = calculatePercentage(a);
      const percentageB = calculatePercentage(b);
      return sortConfig.direction === 'asc' ? percentageA - percentageB : percentageB - percentageA;
    }
    
    const aVal = sortConfig.key === 'score' ? a.score : 
                 sortConfig.key === 'grade' ? (a.grade || 'Z') : 
                 sortConfig.key === 'submittedAt' ? new Date(a.submittedAt) : 
                 a[sortConfig.key];
    const bVal = sortConfig.key === 'score' ? b.score : 
                 sortConfig.key === 'grade' ? (b.grade || 'Z') : 
                 sortConfig.key === 'submittedAt' ? new Date(b.submittedAt) : 
                 b[sortConfig.key];
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Calculate statistics
  const calculateStats = () => {
    if (sortedResults.length === 0) return null;
    
    const scores = sortedResults.map(r => r.score);
    const totalMarks = test?.totalMarks || 100;
    const passingMarks = test?.passingMarks || totalMarks * 0.4;
    const percentages = sortedResults.map(r => calculatePercentage(r));
    
    return {
      averageScore: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
      averagePercentage: (percentages.reduce((a, b) => a + b, 0) / percentages.length).toFixed(1),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      highestPercentage: Math.max(...percentages),
      lowestPercentage: Math.min(...percentages),
      totalStudents: sortedResults.length,
      passCount: sortedResults.filter(r => r.score >= passingMarks).length
    };
  };

  const stats = calculateStats();

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentResults = sortedResults.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedResults.length / itemsPerPage);

  // Get grade color
  const getGradeColor = (grade) => {
    if (!grade) return '#6c757d';
    switch(grade.toUpperCase()) {
      case 'A': return '#28a745';
      case 'B': return '#20c997';
      case 'C': return '#ffc107';
      case 'D': return '#fd7e14';
      case 'E': return '#dc3545';
      case 'F': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // Get percentage color based on value
  const getPercentageColor = (percentage) => {
    if (percentage >= 80) return '#28a745'; // Green for excellent
    if (percentage >= 60) return '#20c997'; // Teal for good
    if (percentage >= 50) return '#ffc107'; // Yellow for average
    if (percentage >= 40) return '#fd7e14'; // Orange for below average
    return '#dc3545'; // Red for fail
  };

  if (!user || !['admin', 'teacher', 'super_admin'].includes(user.role)) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          backgroundColor: '#FFF3F3',
          color: '#B22222',
          padding: '24px',
          borderRadius: '8px',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%'
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#B22222' }}>Access Denied</h3>
          <p style={{ margin: 0 }}>Access restricted to authorized users.</p>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div style={{ 
      minHeight: 'calc(100vh - 80px)', 
      backgroundColor: '#f8f9fa', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(75, 83, 32, 0.1)',
          borderTop: '4px solid #4B5320',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }} />
        <p style={{ color: '#4B5320', fontSize: '16px', fontWeight: '500' }}>Loading results...</p>
      </div>
    </div>
  );
  
  if (editingError) return (
    <div style={{
      minHeight: 'calc(100vh - 80px)',
      backgroundColor: '#f8f9fa',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#FFF3F3',
        color: '#B22222',
        padding: '16px',
        borderRadius: '8px',
        borderLeft: '4px solid #B22222',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <strong>Error:</strong> {editingError}
      </div>
    </div>
  );
  
  if (!test) return (
    <div style={{
      minHeight: 'calc(100vh - 80px)',
      backgroundColor: '#f8f9fa',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <p style={{ color: '#4B5320', fontSize: '18px', fontWeight: '500' }}>Test not found.</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: '#f8f9fa' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* Header Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '28px', 
              color: '#4B5320', 
              fontFamily: 'sans-serif', 
              margin: '0 0 8px 0',
              fontWeight: '600'
            }}>
              Test Results
            </h1>
            <p style={{ 
              color: '#6c757d', 
              fontSize: '14px',
              margin: 0
            }}>
              Manage and analyze student performance
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => navigate(user.role === 'admin' || user.role === 'super_admin' ? '/admin' : '/teacher')} 
              style={{ 
                padding: '10px 20px', 
                backgroundColor: 'white', 
                color: '#4B5320', 
                border: '1px solid #dee2e6', 
                borderRadius: '6px', 
                fontFamily: 'sans-serif', 
                fontSize: '14px', 
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
            >
              <FiChevronLeft /> Back
            </button>
            <button 
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#4B5320', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                fontFamily: 'sans-serif', 
                fontSize: '14px', 
                cursor: 'pointer',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3a431a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4B5320'; }}
            >
              <FiDownload /> Export
            </button>
          </div>
        </div>

        {/* Success Message */}
        {editingSuccess && (
          <div style={{
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            borderLeft: '4px solid #28a745',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>
              <strong>Success:</strong> {editingSuccess}
            </span>
            <button 
              onClick={() => setEditingSuccess(null)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#155724', 
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              <FiX />
            </button>
          </div>
        )}

        {/* Test Info Card - UPDATED WITH ALL DETAILS */}
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '10px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          marginBottom: '24px',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ 
                fontSize: '22px', 
                color: '#4B5320', 
                fontFamily: 'sans-serif', 
                margin: '0 0 16px 0',
                fontWeight: '600'
              }}>
                {test.title || 'Test Details'}
              </h2>
              
              {/* Test Details Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                gap: '20px',
                marginBottom: '16px'
              }}>
                {/* Subject */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: 'rgba(75, 83, 32, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FiBook style={{ color: '#4B5320', fontSize: '18px' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Subject</div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: '#212529' }}>
                      {getSubjectName()}
                    </div>
                  </div>
                </div>
                
                {/* Class */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FiUsers style={{ color: '#2196F3', fontSize: '18px' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Class</div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: '#212529' }}>
                      {getClassName()}
                    </div>
                  </div>
                </div>
                
                {/* Session & Term */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: 'rgba(156, 39, 176, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FiCalendar style={{ color: '#9C27B0', fontSize: '18px' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Session & Term</div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: '#212529' }}>
                      {test.session || 'N/A'} • {test.term || 'N/A'}
                    </div>
                  </div>
                </div>
                
                {/* Total Questions & Marks */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FiBarChart2 style={{ color: '#FFC107', fontSize: '18px' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Questions & Marks</div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: '#212529' }}>
                      {getTotalQuestions()} Questions • {test.totalMarks || 'N/A'} Total Marks
                    </div>
                    {test.passingMarks && (
                      <div style={{ fontSize: '13px', color: '#28a745', marginTop: '2px' }}>
                        Passing: {test.passingMarks} marks
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Duration */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FiClock style={{ color: '#4CAF50', fontSize: '18px' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Duration</div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: '#212529' }}>
                      {test.duration ? `${test.duration} minutes` : 'N/A'}
                    </div>
                  </div>
                </div>
                
                {/* Test Status */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: test.status === 'completed' ? 'rgba(40, 167, 69, 0.1)' : 
                                   test.status === 'active' ? 'rgba(13, 110, 253, 0.1)' :
                                   'rgba(108, 117, 125, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {test.status === 'completed' ? (
                      <FiCheckCircle style={{ color: '#28a745', fontSize: '18px' }} />
                    ) : test.status === 'active' ? (
                      <FiClock style={{ color: '#0d6efd', fontSize: '18px' }} />
                    ) : (
                      <FiXCircle style={{ color: '#6c757d', fontSize: '18px' }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>Status</div>
                    <div style={{ 
                      fontSize: '15px', 
                      fontWeight: '500', 
                      color: test.status === 'completed' ? '#28a745' : 
                             test.status === 'active' ? '#0d6efd' : '#6c757d'
                    }}>
                      {test.status ? test.status.charAt(0).toUpperCase() + test.status.slice(1) : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Test Instructions (if available) */}
              {test.instructions && (
                <div style={{ 
                  backgroundColor: '#f8f9fa', 
                  padding: '12px 16px', 
                  borderRadius: '8px',
                  marginTop: '12px',
                  borderLeft: '3px solid #4B5320'
                }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '6px' }}>Test Instructions</div>
                  <div style={{ fontSize: '14px', color: '#495057' }}>
                    {test.instructions}
                  </div>
                </div>
              )}
            </div>
            
            {/* Test ID Badge */}
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '12px 16px',
              borderRadius: '6px',
              border: '1px solid #e9ecef',
              alignSelf: 'flex-start'
            }}>
              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Test ID</div>
              <div style={{ 
                fontFamily: 'monospace', 
                color: '#4B5320',
                fontSize: '13px',
                wordBreak: 'break-all',
                maxWidth: '150px'
              }}>
                {testId.slice(0, 12)}...
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderTop: '4px solid #4B5320'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: 'rgba(75, 83, 32, 0.1)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FiUsers style={{ color: '#4B5320', fontSize: '20px' }} />
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Total Students</div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: '#4B5320' }}>{stats.totalStudents}</div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderTop: '4px solid #28a745'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: 'rgba(40, 167, 69, 0.1)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FiBarChart2 style={{ color: '#28a745', fontSize: '20px' }} />
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Average Score</div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: '#28a745' }}>
                {stats.averageScore}
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                out of {test.totalMarks || 100}
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderTop: '4px solid #007bff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: 'rgba(0, 123, 255, 0.1)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FiPercent style={{ color: '#007bff', fontSize: '20px' }} />
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Average %</div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: '#007bff' }}>
                {stats.averagePercentage}%
              </div>
            </div>

            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              borderTop: '4px solid #D4A017'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: 'rgba(212, 160, 23, 0.1)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FiBarChart2 style={{ color: '#D4A017', fontSize: '20px' }} />
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Pass Rate</div>
              </div>
              <div style={{ fontSize: '28px', fontWeight: '600', color: '#D4A017' }}>
                {((stats.passCount / stats.totalStudents) * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                {stats.passCount} of {stats.totalStudents} passed
              </div>
            </div>
          </div>
        )}

        {/* Results Table Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          border: '1px solid #e9ecef'
        }}>
          {/* Table Header */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e9ecef',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ margin: 0, color: '#4B5320', fontSize: '18px' }}>
                Student Results ({filteredResults.length})
              </h3>
              {searchTerm && (
                <span style={{
                  backgroundColor: '#e9ecef',
                  color: '#6c757d',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  Filtered: {filteredResults.length}
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <FiSearch style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6c757d'
                }} />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '10px 12px 10px 36px',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    fontSize: '14px',
                    minWidth: '250px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#4B5320'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#dee2e6'; }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
            </div>
          </div>

          {!Array.isArray(results) || results.length === 0 ? (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: '#6c757d'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                backgroundColor: '#f8f9fa',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <FiUsers style={{ fontSize: '28px', color: '#dee2e6' }} />
              </div>
              <h4 style={{ margin: '0 0 8px 0', color: '#4B5320' }}>No Results Yet</h4>
              <p style={{ margin: 0, maxWidth: '400px', margin: '0 auto' }}>
                No students have taken this test yet. Results will appear here once students complete the test.
              </p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'sans-serif' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#2c3e50' }}>
                      <th 
                        style={{ 
                          padding: '16px 12px', 
                          textAlign: 'left', 
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '14px',
                          borderBottom: '1px solid #34495e',
                          cursor: 'pointer',
                          position: 'relative',
                          minWidth: '180px'
                        }}
                        onClick={() => handleSort('name')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Student
                          {sortConfig.key === 'name' && (
                            <span style={{ fontSize: '12px' }}>
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        style={{ 
                          padding: '16px 12px', 
                          textAlign: 'left', 
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '14px',
                          borderBottom: '1px solid #34495e',
                          cursor: 'pointer',
                          position: 'relative',
                          minWidth: '120px'
                        }}
                        onClick={() => handleSort('score')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Score
                          {sortConfig.key === 'score' && (
                            <span style={{ fontSize: '12px' }}>
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        style={{ 
                          padding: '16px 12px', 
                          textAlign: 'left', 
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '14px',
                          borderBottom: '1px solid #34495e',
                          cursor: 'pointer',
                          position: 'relative',
                          minWidth: '100px'
                        }}
                        onClick={() => handleSort('percentage')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FiPercent style={{ fontSize: '12px' }} />
                          Percentage
                          {sortConfig.key === 'percentage' && (
                            <span style={{ fontSize: '12px' }}>
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        style={{ 
                          padding: '16px 12px', 
                          textAlign: 'left', 
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '14px',
                          borderBottom: '1px solid #34495e',
                          cursor: 'pointer',
                          position: 'relative',
                          minWidth: '80px'
                        }}
                        onClick={() => handleSort('grade')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Grade
                          {sortConfig.key === 'grade' && (
                            <span style={{ fontSize: '12px' }}>
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th 
                        style={{ 
                          padding: '16px 12px', 
                          textAlign: 'left', 
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '14px',
                          borderBottom: '1px solid #34495e',
                          cursor: 'pointer',
                          position: 'relative',
                          minWidth: '140px'
                        }}
                        onClick={() => handleSort('submittedAt')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Submitted
                          {sortConfig.key === 'submittedAt' && (
                            <span style={{ fontSize: '12px' }}>
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th style={{ 
                        padding: '16px 12px', 
                        textAlign: 'left', 
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '14px',
                        borderBottom: '1px solid #34495e',
                        minWidth: '160px'
                      }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentResults.map((result) => {
                      const percentage = calculatePercentage(result);
                      const totalMarks = result.totalMarks || test?.totalMarks || 100;
                      
                      return (
                        <tr 
                          key={result._id} 
                          style={{ 
                            borderBottom: '1px solid #e9ecef',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                        >
                          <td style={{ padding: '16px 12px', fontSize: '14px' }}>
                            <div>
                              <div style={{ fontWeight: '500', color: '#212529', marginBottom: '4px' }}>
                                {getUserFullName(result)}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                ID: {getStudentId(result)}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px 12px', fontSize: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <ResultScoreEditor
                                result={result}
                                editingResultId={editingResultId}
                                editScore={editScore}
                                setEditScore={setEditScore}
                                loading={editingLoading}
                                onSave={handleSaveScore}
                                onCancel={cancelEditing}
                                maxScore={totalMarks}
                                canEdit={user.role === 'super_admin' || user.role === 'admin' || (user.role === 'teacher' && test.createdBy === user.id)}
                              />
                            </div>
                            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                              out of {totalMarks}
                            </div>
                          </td>
                          <td style={{ padding: '16px 12px', fontSize: '14px' }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              backgroundColor: getPercentageColor(percentage) + '20',
                              color: getPercentageColor(percentage),
                              fontWeight: '600',
                              fontSize: '14px',
                              border: `1px solid ${getPercentageColor(percentage)}40`,
                              minWidth: '60px',
                              justifyContent: 'center'
                            }}>
                              <FiPercent style={{ fontSize: '12px' }} />
                              {percentage}%
                            </div>
                          </td>
                          <td style={{ padding: '16px 12px', fontSize: '14px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              backgroundColor: getGradeColor(result.grade) + '20',
                              color: getGradeColor(result.grade),
                              fontWeight: '600',
                              fontSize: '12px',
                              border: `1px solid ${getGradeColor(result.grade)}40`,
                              minWidth: '40px',
                              textAlign: 'center'
                            }}>
                              {result.grade || 'N/A'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 12px', fontSize: '14px' }}>
                            <div style={{ color: '#212529' }}>
                              {new Date(result.submittedAt).toLocaleDateString()}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>
                              {new Date(result.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td style={{ padding: '16px 12px', fontSize: '14px' }}>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => handleViewAnswers(result)}
                                style={{ 
                                  padding: '8px 12px', 
                                  backgroundColor: '#f8f9fa', 
                                  color: '#007bff', 
                                  border: '1px solid #dee2e6', 
                                  borderRadius: '6px', 
                                  fontSize: '12px', 
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontWeight: '500',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#007bff';
                                  e.currentTarget.style.color = 'white';
                                  e.currentTarget.style.borderColor = '#007bff';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                                  e.currentTarget.style.color = '#007bff';
                                  e.currentTarget.style.borderColor = '#dee2e6';
                                }}
                              >
                                <FiEye /> View
                              </button>
                              
                              {(user.role === 'super_admin' || user.role === 'admin' || (user.role === 'teacher' && test.createdBy === user.id)) && (
                                <>
                                  <button
                                    onClick={() => startEditing(result)}
                                    style={{ 
                                      padding: '8px 12px', 
                                      backgroundColor: editingResultId === result._id ? '#D4A017' : '#f8f9fa', 
                                      color: editingResultId === result._id ? 'white' : '#D4A017', 
                                      border: '1px solid #dee2e6', 
                                      borderRadius: '6px', 
                                      fontSize: '12px', 
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      fontWeight: '500',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (editingResultId !== result._id) {
                                        e.currentTarget.style.backgroundColor = '#D4A017';
                                        e.currentTarget.style.color = 'white';
                                        e.currentTarget.style.borderColor = '#D4A017';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (editingResultId !== result._id) {
                                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                                        e.currentTarget.style.color = '#D4A017';
                                        e.currentTarget.style.borderColor = '#dee2e6';
                                      }
                                    }}
                                    disabled={editingResultId === result._id}
                                  >
                                    <FiEdit /> Edit
                                  </button>
                                  
                                  {(user.role === 'super_admin' || user.role === 'admin') && (
                                    <button
                                      onClick={() => handleDeleteResult(result._id)}
                                      style={{ 
                                        padding: '8px 12px', 
                                        backgroundColor: '#f8f9fa', 
                                        color: '#dc3545', 
                                        border: '1px solid #dee2e6', 
                                        borderRadius: '6px', 
                                        fontSize: '12px', 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontWeight: '500',
                                        transition: 'all 0.2s'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#dc3545';
                                        e.currentTarget.style.color = 'white';
                                        e.currentTarget.style.borderColor = '#dc3545';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                                        e.currentTarget.style.color = '#dc3545';
                                        e.currentTarget.style.borderColor = '#dee2e6';
                                      }}
                                    >
                                      <FiTrash2 /> Delete
                                    </button>
                                  )}
                                </>
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
              {totalPages > 1 && (
                <div style={{
                  padding: '20px',
                  borderTop: '1px solid #e9ecef',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ color: '#6c757d', fontSize: '14px' }}>
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredResults.length)} of {filteredResults.length} results
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: currentPage === 1 ? '#f8f9fa' : 'white',
                        color: currentPage === 1 ? '#adb5bd' : '#4B5320',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== 1) {
                          e.currentTarget.style.backgroundColor = '#4B5320';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.borderColor = '#4B5320';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== 1) {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.color = '#4B5320';
                          e.currentTarget.style.borderColor = '#dee2e6';
                        }
                      }}
                    >
                      <FiChevronLeft /> Previous
                    </button>
                    
                    <div style={{ display: 'flex', gap: '4px' }}>
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
                            style={{
                              padding: '8px 12px',
                              backgroundColor: currentPage === pageNum ? '#4B5320' : 'white',
                              color: currentPage === pageNum ? 'white' : '#4B5320',
                              border: '1px solid #dee2e6',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: currentPage === pageNum ? '600' : '500',
                              minWidth: '40px',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (currentPage !== pageNum) {
                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (currentPage !== pageNum) {
                                e.currentTarget.style.backgroundColor = 'white';
                              }
                            }}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: currentPage >= totalPages ? '#f8f9fa' : 'white',
                        color: currentPage >= totalPages ? '#adb5bd' : '#4B5320',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage < totalPages) {
                          e.currentTarget.style.backgroundColor = '#4B5320';
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.borderColor = '#4B5320';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage < totalPages) {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.color = '#4B5320';
                          e.currentTarget.style.borderColor = '#dee2e6';
                        }
                      }}
                    >
                      Next <FiChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detailed Answers Modal */}
        {selectedResult && (
          <div style={{ 
            position: 'fixed', 
            top: '0', 
            left: '0', 
            right: '0', 
            bottom: '0', 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{ 
              backgroundColor: '#FFFFFF', 
              padding: '24px', 
              borderRadius: '12px', 
              maxWidth: '900px', 
              width: '100%', 
              maxHeight: '85vh', 
              overflowY: 'auto', 
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', color: '#4B5320', fontFamily: 'sans-serif', margin: '0 0 4px 0' }}>
                    {getUserFullName(selectedResult)}
                  </h3>
                  <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                    Student ID: {getStudentId(selectedResult)} • Test: {test.title}
                  </p>
                </div>
                <button
                  onClick={closeAnswers}
                  style={{ 
                    backgroundColor: 'transparent', 
                    border: 'none', 
                    fontSize: '24px', 
                    cursor: 'pointer', 
                    color: '#6c757d',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <FiX />
                </button>
              </div>
              
              {/* Performance Summary */}
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '24px'
              }}>
                <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Score</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#4B5320' }}>
                    {selectedResult.score} / {selectedResult.totalMarks || test.totalMarks || 100}
                  </div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Percentage</div>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: '600', 
                    color: getPercentageColor(calculatePercentage(selectedResult))
                  }}>
                    {calculatePercentage(selectedResult)}%
                  </div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Grade</div>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: '600', 
                    color: getGradeColor(selectedResult.grade)
                  }}>
                    {selectedResult.grade || 'N/A'}
                  </div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>Submitted</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#212529' }}>
                    {new Date(selectedResult.submittedAt).toLocaleString()}
                  </div>
                </div>
              </div>
              
              {/* Question Analysis */}
              {selectedResult.questionAnalysis && selectedResult.questionAnalysis.length > 0 ? (
                <div>
                  <h4 style={{ 
                    margin: '0 0 16px 0', 
                    color: '#4B5320', 
                    fontSize: '16px',
                    fontWeight: '600',
                    paddingBottom: '8px',
                    borderBottom: '2px solid #e9ecef'
                  }}>
                    Question-by-Question Analysis
                  </h4>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                    {selectedResult.questionAnalysis.map((qa, index) => (
                      <div key={index} style={{ 
                        marginBottom: '12px', 
                        padding: '16px', 
                        border: '1px solid #e9ecef', 
                        borderRadius: '8px', 
                        backgroundColor: qa.isCorrect ? 'rgba(40, 167, 69, 0.05)' : 'rgba(220, 53, 69, 0.05)',
                        borderLeft: `4px solid ${qa.isCorrect ? '#28a745' : '#dc3545'}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div style={{ fontWeight: '500', color: '#212529', flex: 1 }}>
                            <span style={{ color: '#6c757d', marginRight: '8px' }}>Q{index + 1}:</span>
                            {qa.questionText}
                          </div>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: qa.isCorrect ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)',
                            color: qa.isCorrect ? '#155724' : '#721c24',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {qa.isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>
                        
                        {qa.options && qa.options.length > 0 && (
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
                              gap: '8px', 
                              marginTop: '8px' 
                            }}>
                              {qa.options.map((option, optIndex) => (
                                <div key={optIndex} style={{
                                  padding: '10px',
                                  backgroundColor: option === qa.correctAnswer ? '#28a745' : 
                                                 option === qa.selectedAnswer ? '#dc3545' : '#e9ecef',
                                  color: option === qa.correctAnswer || option === qa.selectedAnswer ? 'white' : '#333',
                                  borderRadius: '6px',
                                  fontWeight: option === qa.correctAnswer || option === qa.selectedAnswer ? '600' : 'normal',
                                  fontSize: '14px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}>
                                  <span>{option}</span>
                                  {option === qa.correctAnswer && (
                                    <span style={{ fontSize: '16px' }}>✓</span>
                                  )}
                                  {option === qa.selectedAnswer && option !== qa.correctAnswer && (
                                    <span style={{ fontSize: '16px' }}>✗</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div style={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: '16px',
                          marginTop: '12px',
                          paddingTop: '12px',
                          borderTop: '1px solid rgba(0,0,0,0.08)'
                        }}>
                          <div>
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>Selected Answer</div>
                            <div style={{ color: '#dc3545', fontWeight: '500' }}>{qa.selectedAnswer}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>Correct Answer</div>
                            <div style={{ color: '#28a745', fontWeight: '500' }}>{qa.correctAnswer}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedResult.answers && typeof selectedResult.answers === 'object' ? (
                <div>
                  <h4 style={{ margin: '0 0 16px 0', color: '#4B5320' }}>Answers</h4>
                  {Object.entries(selectedResult.answers).map(([questionId, selectedAnswer], index) => {
                    const question = test.questions?.find(q => q._id.toString() === questionId);
                    const isCorrect = selectedAnswer === question?.correctAnswer;
                    
                    return (
                      <div key={index} style={{ 
                        marginBottom: '12px', 
                        padding: '12px', 
                        border: '1px solid #e9ecef', 
                        borderRadius: '6px', 
                        backgroundColor: isCorrect ? 'rgba(40, 167, 69, 0.05)' : 'rgba(220, 53, 69, 0.05)'
                      }}>
                        <div style={{ fontWeight: '500', marginBottom: '8px' }}>Question {index + 1}</div>
                        <div style={{ marginBottom: '8px' }}>{question?.text || 'N/A'}</div>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <span style={{ color: '#6c757d' }}>Selected: </span>
                            <span style={{ color: isCorrect ? '#28a745' : '#dc3545', fontWeight: '500' }}>
                              {selectedAnswer || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#6c757d' }}>Correct: </span>
                            <span style={{ color: '#28a745', fontWeight: '500' }}>
                              {question?.correctAnswer || 'N/A'}
                            </span>
                          </div>
                          <span style={{
                            color: isCorrect ? '#155724' : '#721c24',
                            fontWeight: '600'
                          }}>
                            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6c757d' }}>
                  No detailed answers available for this result.
                </div>
              )}
              
              <button
                onClick={closeAnswers}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: '#4B5320', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontSize: '14px', 
                  cursor: 'pointer', 
                  marginTop: '24px',
                  width: '100%',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3a431a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#4B5320'; }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Custom scrollbar for modal */
        div[style*="max-height"]::-webkit-scrollbar {
          width: 6px;
        }
        
        div[style*="max-height"]::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        div[style*="max-height"]::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        
        div[style*="max-height"]::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
};

export default Results;