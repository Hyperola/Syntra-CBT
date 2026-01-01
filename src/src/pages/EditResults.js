// pages/editresults.js
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useResultEditing } from '../hooks/useResultEditing';
import ResultScoreEditor from '../components/ResultScoreEditor';
import { 
  FiDownload, 
  FiSearch, 
  FiFilter, 
  FiRefreshCw, 
  FiTrash2, 
  FiEye, 
  FiEdit, 
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiAlertTriangle
} from 'react-icons/fi';

const EditResults = () => {
  const { user } = useContext(AuthContext);
  const [results, setResults] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const navigate = useNavigate();

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

  useEffect(() => {
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      navigate('/login');
      return;
    }
    fetchTests();
    fetchAllResults();
  }, []);

  const fetchTests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/tests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Handle different response formats
      let testsData = [];
      if (res.data.success && res.data.tests) {
        testsData = res.data.tests;
      } else if (Array.isArray(res.data)) {
        testsData = res.data;
      }
      
      setTests(testsData);
      setEditingError(null);
    } catch (err) {
      console.error('Error fetching tests:', err);
      setEditingError(err.response?.data?.error || 'Failed to load tests.');
    }
  };

  const fetchAllResults = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/results', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: currentPage,
          limit: itemsPerPage,
          subject: filterSubject || undefined,
          class: filterClass || undefined,
          session: filterSession || undefined
        }
      });
      
      console.log('All Results API response:', res.data);
      
      // The results endpoint returns { success: true, results: [], pagination: {} }
      const resultsData = res.data.results || [];
      setResults(resultsData);
      setEditingError(null);
    } catch (err) {
      console.error('Error fetching results:', err);
      setEditingError(err.response?.data?.error || 'Failed to load results.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScore = async (resultId) => {
    // Only super admins and admins can edit scores
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      setEditingError('Only administrators can edit scores.');
      return;
    }

    await saveScore(resultId, (updatedResultId, newScore) => {
      // Update local state after successful save
      setResults(results.map(r => 
        r._id === updatedResultId ? { ...r, score: newScore } : r
      ));
    });
  };

  const handleViewTestResults = async (test) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const resultsRes = await axios.get(`http://localhost:5000/api/results/test/${test._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('Test results response:', resultsRes.data);
      
      // Handle different response structures
      let resultsData = [];
      if (resultsRes.data.results) {
        resultsData = resultsRes.data.results;
      } else if (Array.isArray(resultsRes.data)) {
        resultsData = resultsRes.data;
      }
      
      // Fetch detailed results for each student
      const detailedResults = await Promise.all(
        resultsData.map(async (result) => {
          try {
            const detailRes = await axios.get(`http://localhost:5000/api/results/details/${result._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            return { 
              ...result, 
              questionAnalysis: detailRes.data.questionAnalysis || [],
              detailedData: detailRes.data 
            };
          } catch (err) {
            console.error('Error fetching details for result:', result._id, err.message);
            return { ...result, questionAnalysis: [], detailedData: null };
          }
        })
      );
      
      setSelectedTest({ 
        test, 
        results: detailedResults,
        statistics: resultsRes.data.statistics || {}
      });
      setEditingError(null);
    } catch (err) {
      console.error('Error fetching test results:', err);
      setEditingError(err.response?.data?.error || 'Failed to load test results.');
    } finally {
      setLoading(false);
    }
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
      
      // Also remove from selected test if viewing
      if (selectedTest) {
        setSelectedTest({
          ...selectedTest,
          results: selectedTest.results.filter(r => r._id !== resultId)
        });
      }
      
      setEditingSuccess('Result deleted successfully.');
      setEditingError(null);
    } catch (err) {
      console.error('Error deleting result:', err);
      setEditingError(err.response?.data?.error || 'Failed to delete result.');
    }
  };

  const closeTestResults = () => {
    setSelectedTest(null);
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Student ID', 'Test', 'Subject', 'Class', 'Session', 'Score', 'Total Marks', 'Percentage', 'Grade', 'Submitted At'];
    const rows = results.map(result => [
      result.userId?.name || 'N/A',
      result.userId?.studentId || 'N/A',
      result.testId?.title || 'N/A',
      result.subject || 'N/A',
      result.class?.name || result.class || 'N/A',
      result.session || 'N/A',
      result.score || 0,
      result.totalMarks || 0,
      result.percentage || 0,
      result.grade || 'N/A',
      new Date(result.submittedAt).toLocaleString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `results_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterSubject('');
    setFilterClass('');
    setFilterSession('');
    setCurrentPage(1);
  };

  const refreshData = () => {
    fetchTests();
    fetchAllResults();
  };

  // Filter results based on search and filters
  const filteredResults = results.filter(result => {
    const matchesSearch = searchTerm === '' || 
      (result.userId?.name && result.userId.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (result.userId?.studentId && result.userId.studentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (result.testId?.title && result.testId.title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSubject = filterSubject === '' || result.subject === filterSubject;
    const matchesClass = filterClass === '' || 
      result.class?.name === filterClass || 
      result.class === filterClass;
    const matchesSession = filterSession === '' || result.session === filterSession;
    
    return matchesSearch && matchesSubject && matchesClass && matchesSession;
  });

  // Get unique values for filters
  const uniqueSubjects = [...new Set(results.map(r => r.subject).filter(Boolean))];
  const uniqueClasses = [...new Set(results.map(r => r.class?.name || r.class).filter(Boolean))];
  const uniqueSessions = [...new Set(results.map(r => r.session).filter(Boolean))];

  if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
    return (
      <div style={{
        minHeight: '100vh',
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
          textAlign: 'center'
        }}>
          <FiAlertTriangle size={32} style={{ marginBottom: '16px' }} />
          <h3>Access Denied</h3>
          <p>Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#4B5320',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Edit Results</h1>
            <p style={{ margin: 0, opacity: 0.9 }}>Edit and manage test results</p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            style={{
              backgroundColor: '#D4A017',
              color: '#4B5320',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Messages */}
      {editingError && (
        <div style={{
          backgroundColor: '#FFF3F3',
          color: '#B22222',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #B22222'
        }}>
          <strong>Error:</strong> {editingError}
        </div>
      )}
      
      {editingSuccess && (
        <div style={{
          backgroundColor: '#E6FFE6',
          color: '#228B22',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: '4px solid #228B22'
        }}>
          <strong>Success:</strong> {editingSuccess}
        </div>
      )}

      {/* Filters Section */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: '#4B5320' }}>Filters</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={refreshData}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FiRefreshCw /> Refresh
            </button>
            <button
              onClick={resetFilters}
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
            <button
              onClick={exportToCSV}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FiDownload /> Export CSV
            </button>
          </div>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#4B5320', fontWeight: '500' }}>
              Search
            </label>
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
                placeholder="Search by student or test..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 16px 10px 40px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#4B5320', fontWeight: '500' }}>
              Subject
            </label>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="">All Subjects</option>
              {uniqueSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#4B5320', fontWeight: '500' }}>
              Class
            </label>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#4B5320', fontWeight: '500' }}>
              Session
            </label>
            <select
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="">All Sessions</option>
              {uniqueSessions.map(session => (
                <option key={session} value={session}>{session}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflowX: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#4B5320' }}>All Results ({filteredResults.length})</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#6c757d' }}>Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              style={{
                padding: '8px 12px',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #4B5320',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            <p>Loading results...</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
            <p>No results found. Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#4B5320', // Changed to match header color
                  borderBottom: '2px solid #dee2e6'
                }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Student</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Test</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Subject</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Class</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Score</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Submitted</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result) => (
                  <tr key={result._id} style={{
                    borderBottom: '1px solid #dee2e6',
                    '&:hover': { backgroundColor: '#f8f9fa' }
                  }}>
                    <td style={{ padding: '12px' }}>
                      <div>
                        <strong>{result.userId?.name || 'Unknown'}</strong>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                          {result.userId?.studentId || 'No ID'}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>{result.testId?.title || 'Unknown Test'}</td>
                    <td style={{ padding: '12px' }}>{result.subject || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>{result.class?.name || result.class || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>
                      {editingResultId === result._id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            value={editScore}
                            onChange={(e) => setEditScore(e.target.value)}
                            min="0"
                            max={result.totalMarks || result.testId?.totalMarks || 100}
                            style={{
                              width: '60px',
                              padding: '6px',
                              border: '1px solid #dee2e6',
                              borderRadius: '4px'
                            }}
                          />
                          <button
                            onClick={() => handleSaveScore(result._id)}
                            disabled={editingLoading}
                            style={{
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            {editingLoading ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={cancelEditing}
                            style={{
                              backgroundColor: '#6c757d',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span>
                          {result.score || 0} / {result.totalMarks || result.testId?.totalMarks || 100}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {new Date(result.submittedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleViewTestResults({ 
                            _id: result.testId?._id || result.testId, 
                            title: result.testId?.title || 'Unknown Test' 
                          })}
                          style={{
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="View test results"
                        >
                          <FiEye /> View
                        </button>
                        <button
                          onClick={() => startEditing(result)}
                          style={{
                            backgroundColor: '#D4A017',
                            color: '#4B5320',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Edit score"
                          disabled={editingResultId === result._id}
                        >
                          <FiEdit /> Edit
                        </button>
                        {user.role === 'super_admin' && (
                          <button
                            onClick={() => handleDeleteResult(result._id)}
                            style={{
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Delete result"
                          >
                            <FiTrash2 /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            {filteredResults.length > itemsPerPage && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '16px',
                marginTop: '20px',
                paddingTop: '20px',
                borderTop: '1px solid #dee2e6'
              }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: currentPage === 1 ? '#e9ecef' : '#4B5320',
                    color: currentPage === 1 ? '#6c757d' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <FiChevronLeft /> Previous
                </button>
                
                <span style={{ color: '#4B5320' }}>
                  Page {currentPage} of {Math.ceil(filteredResults.length / itemsPerPage)}
                </span>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredResults.length / itemsPerPage), p + 1))}
                  disabled={currentPage >= Math.ceil(filteredResults.length / itemsPerPage)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: currentPage >= Math.ceil(filteredResults.length / itemsPerPage) ? '#e9ecef' : '#4B5320',
                    color: currentPage >= Math.ceil(filteredResults.length / itemsPerPage) ? '#6c757d' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: currentPage >= Math.ceil(filteredResults.length / itemsPerPage) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  Next <FiChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Test Results Modal */}
      {selectedTest && (
        <div style={{
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
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, color: '#4B5320' }}>
                Results for: {selectedTest.test.title}
              </h3>
              <button
                onClick={closeTestResults}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                <FiX />
              </button>
            </div>
            
            {selectedTest.statistics && Object.keys(selectedTest.statistics).length > 0 && (
              <div style={{
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderBottom: '1px solid #dee2e6'
              }}>
                <h4 style={{ margin: '0 0 16px 0', color: '#4B5320' }}>Test Statistics</h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4B5320' }}>
                      {selectedTest.statistics.totalStudents || 0}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>Total Students</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                      {selectedTest.statistics.averageScore || 0}%
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>Average Score</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                      {selectedTest.statistics.highestScore || 0}%
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>Highest Score</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                      {selectedTest.statistics.lowestScore || 0}%
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d' }}>Lowest Score</div>
                  </div>
                </div>
              </div>
            )}
            
            <div style={{ padding: '20px' }}>
              {selectedTest.results.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6c757d' }}>No results found for this test.</p>
              ) : (
                selectedTest.results.map((result) => (
                  <div key={result._id} style={{
                    marginBottom: '20px',
                    padding: '16px',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <strong>{result.userId?.name || 'Unknown Student'}</strong>
                        <div style={{ fontSize: '14px', color: '#6c757d' }}>
                          Score: {result.score} / {result.totalMarks}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => startEditing(result)}
                          style={{
                            backgroundColor: '#D4A017',
                            color: '#4B5320',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          disabled={editingResultId === result._id}
                        >
                          <FiEdit /> Edit Score
                        </button>
                        {user.role === 'super_admin' && (
                          <button
                            onClick={() => handleDeleteResult(result._id)}
                            style={{
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                            }}
                          >
                            <FiTrash2 /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {result.questionAnalysis && result.questionAnalysis.length > 0 && (
                      <div>
                        <h5 style={{ margin: '0 0 12px 0', color: '#4B5320' }}>Question Analysis</h5>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                          gap: '12px'
                        }}>
                          {result.questionAnalysis.map((qa, index) => (
                            <div key={index} style={{
                              padding: '12px',
                              backgroundColor: qa.isCorrect ? '#d4edda' : '#f8d7da',
                              border: `1px solid ${qa.isCorrect ? '#c3e6cb' : '#f5c6cb'}`,
                              borderRadius: '4px'
                            }}>
                              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                                Q{index + 1}: {qa.questionText?.substring(0, 50)}...
                              </div>
                              <div style={{ fontSize: '13px' }}>
                                <div><strong>Selected:</strong> {qa.selectedAnswer}</div>
                                <div><strong>Correct:</strong> {qa.correctAnswer}</div>
                                {qa.options && (
                                  <div style={{ marginTop: '8px' }}>
                                    <strong>Options:</strong>
                                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                                      {qa.options.map((option, optIndex) => (
                                        <li key={optIndex} style={{
                                          color: option === qa.correctAnswer ? '#28a745' : 
                                                 option === qa.selectedAnswer ? '#dc3545' : '#6c757d',
                                          fontWeight: option === qa.correctAnswer ? 'bold' : 'normal'
                                        }}>
                                          {option}
                                          {option === qa.correctAnswer && ' ✓'}
                                          {option === qa.selectedAnswer && option !== qa.correctAnswer && ' ✗'}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                <div style={{ 
                                  color: qa.isCorrect ? '#155724' : '#721c24',
                                  marginTop: '8px',
                                  fontWeight: 'bold'
                                }}>
                                  <strong>Status:</strong> {qa.isCorrect ? 'Correct' : 'Incorrect'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* If no questionAnalysis but have detailedData */}
                    {(!result.questionAnalysis || result.questionAnalysis.length === 0) && result.detailedData && (
                      <div>
                        <h5 style={{ margin: '0 0 12px 0', color: '#4B5320' }}>Result Details</h5>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '12px',
                          padding: '12px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '4px'
                        }}>
                          <div>
                            <strong>Correct Answers:</strong> {result.detailedData.summary?.correctAnswers || 'N/A'}
                          </div>
                          <div>
                            <strong>Total Questions:</strong> {result.detailedData.summary?.totalQuestions || 'N/A'}
                          </div>
                          <div>
                            <strong>Accuracy:</strong> {result.detailedData.analysis?.accuracy || 'N/A'}%
                          </div>
                          <div>
                            <strong>Time Per Question:</strong> {result.detailedData.summary?.timePerQuestion || 'N/A'}s
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {/* Edit Score Section in Modal */}
            {editingResultId && selectedTest.results.some(r => r._id === editingResultId) && (
              <div style={{
                position: 'sticky',
                bottom: 0,
                backgroundColor: 'white',
                borderTop: '1px solid #dee2e6',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <strong>Editing Score for:</strong> {
                    selectedTest.results.find(r => r._id === editingResultId)?.userId?.name || 'Unknown Student'
                  }
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    value={editScore}
                    onChange={(e) => setEditScore(e.target.value)}
                    min="0"
                    max={selectedTest.results.find(r => r._id === editingResultId)?.totalMarks || 100}
                    style={{
                      padding: '8px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      width: '100px'
                    }}
                  />
                  <button
                    onClick={() => handleSaveScore(editingResultId)}
                    disabled={editingLoading}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {editingLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEditing}
                    style={{
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        tr:hover {
          background-color: #f8f9fa;
        }
      `}</style>
    </div>
  );
};

export default EditResults;