import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { 
  FiDownload, 
  FiSearch, 
  FiArrowUp, 
  FiArrowDown, 
  FiChevronDown, 
  FiChevronUp, 
  FiArrowLeft,
  FiFilter,
  FiRefreshCw,
  FiEye,
  FiEdit
} from 'react-icons/fi';

const TestResults = () => {
  const { testId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedResult, setExpandedResult] = useState(null);
  const [editingResultId, setEditingResultId] = useState(null);
  const [editScore, setEditScore] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again.');
        navigate('/login');
        return;
      }
      try {
        const [testRes, resultsRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/tests/${testId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          // Use the correct endpoint based on user role
          axios.get(`http://localhost:5000/api/results/test/${testId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        
        console.log('TestResults - Fetched test:', testRes.data);
        console.log('TestResults - Fetched results:', resultsRes.data);
        
        setTest(testRes.data);
        
        // Handle different response structures
        let resultsData = [];
        if (resultsRes.data.success && resultsRes.data.results) {
          resultsData = resultsRes.data.results;
        } else if (resultsRes.data.results) {
          resultsData = resultsRes.data.results;
        } else if (Array.isArray(resultsRes.data)) {
          resultsData = resultsRes.data;
        }
        
        setResults(resultsData);
        setLoading(false);
      } catch (err) {
        console.error('TestResults - Error:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to load results. Please try again.');
        setLoading(false);
      }
    };

    if (user && (user.role === 'teacher' || user.role === 'admin' || user.role === 'super_admin')) {
      fetchResults();
    } else {
      setError('Access restricted to authorized users.');
      setLoading(false);
    }
  }, [testId, user, navigate]);

  const handleSaveScore = async (resultId) => {
    // Only admins and super admins can edit scores
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      setError('Only administrators can edit scores.');
      return;
    }

    const newScore = parseFloat(editScore);
    if (isNaN(newScore) || newScore < 0) {
      setError('Please enter a valid score.');
      return;
    }

    if (newScore > (test?.totalMarks || 100)) {
      setError(`Score cannot exceed ${test?.totalMarks || 100}.`);
      return;
    }

    setEditing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`http://localhost:5000/api/results/${resultId}`, {
        score: newScore
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update local state
      setResults(results.map(r => 
        r._id === resultId ? { ...r, score: newScore } : r
      ));
      
      setEditingResultId(null);
      setEditScore('');
      setError(null);
      alert('Score updated successfully!');
    } catch (err) {
      console.error('Error updating score:', err);
      setError(err.response?.data?.error || 'Failed to update score.');
    } finally {
      setEditing(false);
    }
  };

  const filteredResults = results
    .filter(result => 
      result?.userId && 
      (result.userId.name || result.userId.username || '')
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const fieldA = sortField === 'score' ? a.score : new Date(a.submittedAt);
      const fieldB = sortField === 'score' ? b.score : new Date(b.submittedAt);
      return sortOrder === 'asc' ? fieldA - fieldB : fieldB - fieldA;
    });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleDetails = (resultId) => {
    setExpandedResult(expandedResult === resultId ? null : resultId);
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Username', 'Score', 'Total Marks', 'Percentage', 'Submitted At'];
    const rows = results.map(result => [
      result.userId.name || result.userId.username,
      result.userId.username,
      result.score,
      result.totalMarks || test?.totalMarks || 100,
      result.percentage || ((result.score / (result.totalMarks || test?.totalMarks || 100)) * 100).toFixed(2),
      new Date(result.submittedAt).toLocaleString(),
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${test?.title || 'test'}_results.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const refreshResults = () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    axios.get(`http://localhost:5000/api/results/test/${testId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then(response => {
      let resultsData = [];
      if (response.data.success && response.data.results) {
        resultsData = response.data.results;
      } else if (response.data.results) {
        resultsData = response.data.results;
      } else if (Array.isArray(response.data)) {
        resultsData = response.data;
      }
      setResults(resultsData);
      setLoading(false);
    })
    .catch(err => {
      console.error('Error refreshing results:', err);
      setError('Failed to refresh results.');
      setLoading(false);
    });
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          textAlign: 'center'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #4B5320',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ color: '#4B5320' }}>Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          backgroundColor: '#FFF3F3',
          color: '#B22222',
          padding: '20px',
          borderRadius: '8px',
          borderLeft: '4px solid #B22222',
          maxWidth: '600px'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Error</h3>
          <p>{error}</p>
          <button
            onClick={() => navigate(-1)}
            style={{
              backgroundColor: '#4B5320',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: 'sans-serif',
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#4B5320',
        color: 'white',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <button
              onClick={() => navigate(user.role === 'teacher' ? '/teacher' : '/admin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'transparent',
                color: 'white',
                border: '1px solid white',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                marginBottom: '10px'
              }}
            >
              <FiArrowLeft /> Back to Dashboard
            </button>
            <h1 style={{ margin: '0', fontSize: '24px' }}>
              Results for: {test?.title}
            </h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>
              {test?.subject} • {test?.class} • {test?.session}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={refreshResults}
              style={{
                backgroundColor: '#D4A017',
                color: '#4B5320',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '600'
              }}
            >
              <FiRefreshCw /> Refresh
            </button>
            <button
              onClick={exportToCSV}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '600'
              }}
            >
              <FiDownload /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        {/* Search and Stats */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <div style={{ position: 'relative', width: '400px' }}>
              <FiSearch style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6c757d'
              }} />
              <input
                type="text"
                placeholder="Search by student name or username"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 40px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#6c757d' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4B5320' }}>{results.length}</div>
                <div>Total Students</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
                  {results.length > 0 
                    ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1)
                    : '0.0'}
                </div>
                <div>Average Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '16px', textAlign: 'left', color: '#4B5320', fontWeight: '600' }}>
                  Student
                </th>
                <th 
                  onClick={() => handleSort('score')}
                  style={{
                    padding: '16px',
                    textAlign: 'left',
                    color: '#4B5320',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  Score
                  {sortField === 'score' && (
                    sortOrder === 'asc' ? <FiArrowUp /> : <FiArrowDown />
                  )}
                </th>
                <th 
                  onClick={() => handleSort('submittedAt')}
                  style={{
                    padding: '16px',
                    textAlign: 'left',
                    color: '#4B5320',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  Submitted
                  {sortField === 'submittedAt' && (
                    sortOrder === 'asc' ? <FiArrowUp /> : <FiArrowDown />
                  )}
                </th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#4B5320', fontWeight: '600' }}>
                  Details
                </th>
                {(user.role === 'admin' || user.role === 'super_admin') && (
                  <th style={{ padding: '16px', textAlign: 'left', color: '#4B5320', fontWeight: '600' }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={user.role === 'admin' || user.role === 'super_admin' ? 5 : 4} style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
                    No results found
                  </td>
                </tr>
              ) : (
                filteredResults.map((result) => (
                  <React.Fragment key={result._id}>
                    <tr style={{ 
                      borderBottom: '1px solid #dee2e6',
                      backgroundColor: expandedResult === result._id ? '#f8f9fa' : 'white'
                    }}>
                      <td style={{ padding: '16px' }}>
                        <div>
                          <strong>{result.userId?.name || result.userId?.username || 'Unknown'}</strong>
                          <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                            {result.userId?.studentId || 'No ID'}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {editingResultId === result._id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="number"
                              value={editScore}
                              onChange={(e) => setEditScore(e.target.value)}
                              style={{
                                width: '80px',
                                padding: '8px',
                                border: '1px solid #dee2e6',
                                borderRadius: '4px',
                                fontSize: '14px'
                              }}
                              min="0"
                              max={test?.totalMarks || 100}
                            />
                            <span> / {test?.totalMarks || 100}</span>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button
                                onClick={() => handleSaveScore(result._id)}
                                disabled={editing}
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
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingResultId(null);
                                  setEditScore('');
                                }}
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
                          </div>
                        ) : (
                          <div>
                            <strong style={{ color: '#4B5320' }}>{result.score}</strong>
                            <span style={{ color: '#6c757d' }}> / {test?.totalMarks || 100}</span>
                            <div style={{ fontSize: '12px', color: '#28a745' }}>
                              {((result.score / (test?.totalMarks || 100)) * 100).toFixed(1)}%
                            </div>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px', color: '#6c757d' }}>
                        {new Date(result.submittedAt).toLocaleDateString()}
                        <div style={{ fontSize: '12px' }}>
                          {new Date(result.submittedAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button
                          onClick={() => toggleDetails(result._id)}
                          style={{
                            backgroundColor: 'transparent',
                            color: '#4B5320',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '14px'
                          }}
                        >
                          {expandedResult === result._id ? <FiChevronUp /> : <FiChevronDown />}
                          View Answers
                        </button>
                      </td>
                      {(user.role === 'admin' || user.role === 'super_admin') && (
                        <td style={{ padding: '16px' }}>
                          {editingResultId !== result._id && (
                            <button
                              onClick={() => {
                                setEditingResultId(result._id);
                                setEditScore(result.score.toString());
                              }}
                              style={{
                                backgroundColor: '#D4A017',
                                color: '#4B5320',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                fontWeight: '600'
                              }}
                            >
                              <FiEdit /> Edit Score
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                    {expandedResult === result._id && (
                      <tr>
                        <td colSpan={user.role === 'admin' || user.role === 'super_admin' ? 5 : 4} style={{ padding: '0' }}>
                          <div style={{
                            padding: '20px',
                            backgroundColor: '#f8f9fa',
                            borderTop: '1px solid #dee2e6'
                          }}>
                            <h4 style={{ margin: '0 0 16px 0', color: '#4B5320' }}>
                              Answers for {result.userId?.name || result.userId?.username}
                            </h4>
                            {result.answers && typeof result.answers === 'object' && (
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: '16px'
                              }}>
                                {Object.entries(result.answers).map(([questionId, selectedAnswer], index) => {
                                  const question = test?.questions?.find(q => q._id?.toString() === questionId);
                                  return (
                                    <div 
                                      key={index}
                                      style={{
                                        padding: '16px',
                                        backgroundColor: selectedAnswer === question?.correctAnswer ? '#d4edda' : '#f8d7da',
                                        border: `1px solid ${selectedAnswer === question?.correctAnswer ? '#c3e6cb' : '#f5c6cb'}`,
                                        borderRadius: '6px'
                                      }}
                                    >
                                      <p style={{ 
                                        margin: '0 0 8px 0',
                                        fontWeight: 'bold',
                                        color: selectedAnswer === question?.correctAnswer ? '#155724' : '#721c24'
                                      }}>
                                        Question {index + 1}
                                      </p>
                                      <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
                                        {question?.text || 'Question text not available'}
                                      </p>
                                      <div style={{ fontSize: '14px' }}>
                                        <div>
                                          <strong>Selected Answer:</strong> {selectedAnswer || 'Not answered'}
                                        </div>
                                        <div>
                                          <strong>Correct Answer:</strong> {question?.correctAnswer || 'N/A'}
                                        </div>
                                        <div style={{ 
                                          marginTop: '8px',
                                          fontWeight: 'bold',
                                          color: selectedAnswer === question?.correctAnswer ? '#155724' : '#721c24'
                                        }}>
                                          {selectedAnswer === question?.correctAnswer ? '✓ Correct' : '✗ Incorrect'}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        button:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default TestResults;