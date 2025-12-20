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
  FiRefreshCw,
  FiEdit,
  FiUser,
  FiBarChart2,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiPercent,
  FiAward,
  FiTrendingUp,
  FiTrendingDown,
  FiEye,
  FiCalendar,
  FiChevronRight
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
  const [stats, setStats] = useState({
    average: 0,
    highest: 0,
    lowest: 100,
    passRate: 0,
    totalStudents: 0,
    aboveAverage: 0
  });
  const [activeFilter, setActiveFilter] = useState('all');

  const checkTeacherAccess = (teacher, testData) => {
    if (!teacher || !testData) return false;
    
    if (teacher.role === 'admin' || teacher.role === 'super_admin') {
      return true;
    }
    
    if (testData.createdBy && testData.createdBy._id && 
        testData.createdBy._id.toString() === teacher.id.toString()) {
      return true;
    }
    
    return true;
  };

  useEffect(() => {
    const fetchResults = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login again.');
        navigate('/login');
        return;
      }
      
      try {
        const testRes = await axios.get(`http://localhost:5000/api/tests/${testId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        const testData = testRes.data.test || testRes.data;
        setTest(testData);
        
        const isTeacher = user.role === 'teacher';
        const isAdmin = user.role === 'admin' || user.role === 'super_admin';
        
        if (!isTeacher && !isAdmin) {
          setError('Access restricted to teachers and administrators only.');
          setLoading(false);
          return;
        }
        
        if (isTeacher) {
          checkTeacherAccess(user, testData);
        }
        
        const resultsRes = await axios.get(`http://localhost:5000/api/results/test/${testId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        let resultsData = [];
        if (resultsRes.data.results) {
          resultsData = resultsRes.data.results;
        } else if (Array.isArray(resultsRes.data)) {
          resultsData = resultsRes.data;
        }
        
        setResults(resultsData);
        calculateStats(resultsData);
        setLoading(false);
      } catch (err) {
        console.error('TestResults - Error:', err);
        
        if (err.response?.status === 403) {
          setError('You do not have permission to view these results.');
        } else if (err.response?.status === 404) {
          setError('Test or results not found.');
        } else {
          setError(err.response?.data?.error || 'Failed to load results.');
        }
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

  const calculateStats = (resultsData) => {
    if (!resultsData.length) return;
    
    const scores = resultsData.map(r => r.score);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const passMark = (test?.totalMarks || 100) * 0.4;
    const passed = scores.filter(score => score >= passMark).length;
    const passRate = (passed / scores.length) * 100;
    const aboveAverage = scores.filter(score => score >= average).length;
    
    setStats({
      average: average.toFixed(1),
      highest,
      lowest,
      passRate: passRate.toFixed(1),
      totalStudents: scores.length,
      aboveAverage
    });
  };

  const handleSaveScore = async (resultId) => {
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
      await axios.put(`http://localhost:5000/api/results/${resultId}`, {
        score: newScore
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updatedResults = results.map(r => 
        r._id === resultId ? { ...r, score: newScore } : r
      );
      
      setResults(updatedResults);
      calculateStats(updatedResults);
      setEditingResultId(null);
      setEditScore('');
      setError(null);
    } catch (err) {
      console.error('Error updating score:', err);
      setError(err.response?.data?.error || 'Failed to update score.');
    } finally {
      setEditing(false);
    }
  };

  const filteredResults = results
    .filter(result => {
      if (!result?.userId) return false;
      
      if (activeFilter === 'passing') {
        const percentage = (result.score / (test?.totalMarks || 100)) * 100;
        return percentage >= 40;
      }
      if (activeFilter === 'failing') {
        const percentage = (result.score / (test?.totalMarks || 100)) * 100;
        return percentage < 40;
      }
      
      return true;
    })
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
    const headers = ['Student Name', 'Username', 'Score', 'Total Marks', 'Percentage', 'Grade', 'Submitted At'];
    const rows = results.map(result => {
      const percentage = (result.score / (test?.totalMarks || 100)) * 100;
      const grade = percentage >= 80 ? 'A' : 
                    percentage >= 70 ? 'B' : 
                    percentage >= 60 ? 'C' : 
                    percentage >= 40 ? 'D' : 'F';
      
      return [
        result.userId.name || result.userId.username,
        result.userId.username,
        result.score,
        result.totalMarks || test?.totalMarks || 100,
        percentage.toFixed(2),
        grade,
        new Date(result.submittedAt).toLocaleString(),
      ];
    });
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
    setError(null);
    const token = localStorage.getItem('token');
    axios.get(`http://localhost:5000/api/results/test/${testId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then(response => {
      let resultsData = [];
      if (response.data.results) {
        resultsData = response.data.results;
      } else if (Array.isArray(response.data)) {
        resultsData = response.data;
      }
      setResults(resultsData);
      calculateStats(resultsData);
      setLoading(false);
    })
    .catch(err => {
      console.error('Error refreshing results:', err);
      setError('Failed to refresh results.');
      setLoading(false);
    });
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 80) return '#4B5320'; // Army Green for excellent
    if (percentage >= 60) return '#90EE90'; // Light Green for good
    if (percentage >= 40) return '#FFA500'; // Orange for average
    return '#FF4500'; // Red-Orange for poor
  };

  const getGradeLetter = (percentage) => {
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const getPerformanceIcon = (percentage) => {
    if (percentage >= 70) return <FiTrendingUp />;
    if (percentage >= 40) return <FiTrendingUp />;
    return <FiTrendingDown />;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Loading Test Results...</p>
        <p className="loading-subtext">Preparing detailed analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <h3>Unable to Load Results</h3>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button
              onClick={() => navigate(-1)}
              className="btn-back"
            >
              <FiArrowLeft /> Go Back
            </button>
            <button
              onClick={refreshResults}
              className="btn-retry"
            >
              <FiRefreshCw /> Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="test-results">
      {/* Top Navigation Bar */}
      <div className="nav-bar">
        <div className="nav-left">
          <button
            onClick={() => navigate(-1)}
            className="nav-back"
          >
            <FiArrowLeft /> Back to Dashboard
          </button>
          <div className="breadcrumb">
            <span>Tests</span>
            <FiChevronRight />
            <span>{test?.subject}</span>
            <FiChevronRight />
            <span className="current">{test?.title}</span>
          </div>
        </div>
        <div className="nav-right">
          <div className="test-info-badge">
            <FiCalendar />
            <span>Test Date: {new Date(test?.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Test Header */}
      <div className="test-header">
        <div className="test-header-content">
          <div className="test-title-section">
            <h1>
              <span className="test-subject">{test?.subject}</span>
              <span className="test-title">{test?.title}</span>
            </h1>
            <div className="test-details">
              <span className="detail-item">
                <FiUser /> Class: {test?.class?.name || test?.class}
              </span>
              <span className="detail-item">
                <FiClock /> Duration: {test?.duration} minutes
              </span>
              <span className="detail-item">
                📝 Total Marks: {test?.totalMarks || 100}
              </span>
              <span className="detail-item">
                📚 Questions: {test?.questions?.length || 0}
              </span>
            </div>
          </div>
          
          <div className="header-actions">
            <div className="action-group">
              <button
                onClick={refreshResults}
                className="btn-action btn-refresh"
              >
                <FiRefreshCw />
                <span>Refresh</span>
              </button>
              <button
                onClick={exportToCSV}
                className="btn-action btn-export"
              >
                <FiDownload />
                <span>Export Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="performance-overview">
        <div className="overview-header">
          <h2><FiBarChart2 /> Performance Overview</h2>
          <div className="overview-stats">
            <span className="stat-badge">
              <FiUser /> {results.length} Students
            </span>
            <span className="stat-badge">
              <FiPercent /> {test?.totalMarks || 100} Total Marks
            </span>
          </div>
        </div>
        
        <div className="stats-cards">
          <div className="stat-card average-score">
            <div className="stat-icon">
              <FiBarChart2 />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.average}</div>
              <div className="stat-label">Average Score</div>
              <div className="stat-trend">
                {parseFloat(stats.average) > (test?.totalMarks || 100) / 2 ? 
                  <span className="trend-up"><FiTrendingUp /> Good</span> : 
                  <span className="trend-down"><FiTrendingDown /> Needs Work</span>
                }
              </div>
            </div>
          </div>
          
          <div className="stat-card pass-rate">
            <div className="stat-icon">
              <FiPercent />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.passRate}%</div>
              <div className="stat-label">Pass Rate</div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${stats.passRate}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="stat-card high-score">
            <div className="stat-icon">
              <FiAward />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.highest}</div>
              <div className="stat-label">Highest Score</div>
              <div className="score-comparison">
                <span className="comparison-text">Class Best</span>
              </div>
            </div>
          </div>
          
          <div className="stat-card above-average">
            <div className="stat-icon">
              <FiTrendingUp />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.aboveAverage}</div>
              <div className="stat-label">Above Average</div>
              <div className="percentage-indicator">
                {Math.round((stats.aboveAverage / stats.totalStudents) * 100)}% of class
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="results-section">
        <div className="section-header">
          <h2><FiUser /> Student Results</h2>
          <div className="section-controls">
            <div className="search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="clear-search"
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="filters">
              <button
                className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All Students
              </button>
              <button
                className={`filter-btn ${activeFilter === 'passing' ? 'active' : ''}`}
                onClick={() => setActiveFilter('passing')}
              >
                Passing
              </button>
              <button
                className={`filter-btn ${activeFilter === 'failing' ? 'active' : ''}`}
                onClick={() => setActiveFilter('failing')}
              >
                Needs Help
              </button>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="results-table">
          <div className="table-header">
            <div className="header-cell student-cell">
              <span>Student</span>
              <button 
                className={`sort-btn ${sortField === 'name' ? 'active' : ''}`}
                onClick={() => handleSort('name')}
              >
                Name {sortField === 'name' && (sortOrder === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
              </button>
            </div>
            <div className="header-cell score-cell">
              <span>Score</span>
              <button 
                className={`sort-btn ${sortField === 'score' ? 'active' : ''}`}
                onClick={() => handleSort('score')}
              >
                Score {sortField === 'score' && (sortOrder === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
              </button>
            </div>
            <div className="header-cell grade-cell">Grade</div>
            <div className="header-cell submitted-cell">
              <span>Submitted</span>
              <button 
                className={`sort-btn ${sortField === 'submittedAt' ? 'active' : ''}`}
                onClick={() => handleSort('submittedAt')}
              >
                Date {sortField === 'submittedAt' && (sortOrder === 'asc' ? <FiArrowUp /> : <FiArrowDown />)}
              </button>
            </div>
            <div className="header-cell actions-cell">Actions</div>
          </div>

          <div className="table-body">
            {filteredResults.length === 0 ? (
              <div className="no-results">
                <div className="no-results-icon">📊</div>
                <h3>No Results Found</h3>
                <p>Try adjusting your search or filters</p>
              </div>
            ) : (
              filteredResults.map((result) => {
                const percentage = (result.score / (test?.totalMarks || 100)) * 100;
                const gradeColor = getGradeColor(percentage);
                const gradeLetter = getGradeLetter(percentage);
                
                return (
                  <div key={result._id} className="result-row">
                    <div className="row-main">
                      <div className="cell student-cell">
                        <div className="student-info">
                          <div 
                            className="student-avatar"
                            style={{ backgroundColor: gradeColor }}
                          >
                            {result.userId?.name?.[0]?.toUpperCase() || 
                             result.userId?.username?.[0]?.toUpperCase() || 'S'}
                          </div>
                          <div className="student-details">
                            <div className="student-name">
                              {result.userId?.name || result.userId?.username}
                            </div>
                            <div className="student-meta">
                              <span className="student-id">
                                {result.userId?.studentId || 'ID: N/A'}
                              </span>
                              <span className="student-performance">
                                {getPerformanceIcon(percentage)}
                                {percentage >= 70 ? 'Good' : percentage >= 40 ? 'Average' : 'Needs Help'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="cell score-cell">
                        {editingResultId === result._id ? (
                          <div className="edit-score-container">
                            <input
                              type="number"
                              value={editScore}
                              onChange={(e) => setEditScore(e.target.value)}
                              className="score-edit-input"
                              min="0"
                              max={test?.totalMarks || 100}
                              step="0.5"
                            />
                            <span className="score-divider">/ {test?.totalMarks || 100}</span>
                            <div className="edit-actions">
                              <button
                                onClick={() => handleSaveScore(result._id)}
                                disabled={editing}
                                className="btn-save"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => {
                                  setEditingResultId(null);
                                  setEditScore('');
                                }}
                                className="btn-cancel"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="score-display">
                            <div className="score-value" style={{ color: gradeColor }}>
                              {result.score}
                              <span className="score-max"> / {test?.totalMarks || 100}</span>
                            </div>
                            <div className="score-percentage">
                              {percentage.toFixed(1)}%
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="cell grade-cell">
                        <div 
                          className="grade-badge"
                          style={{ 
                            backgroundColor: gradeColor,
                            color: percentage >= 60 ? 'white' : '#333'
                          }}
                        >
                          {gradeLetter}
                        </div>
                      </div>
                      
                      <div className="cell submitted-cell">
                        <div className="date-display">
                          {new Date(result.submittedAt).toLocaleDateString()}
                        </div>
                        <div className="time-display">
                          {new Date(result.submittedAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                      
                      <div className="cell actions-cell">
                        <div className="action-buttons">
                          <button
                            onClick={() => toggleDetails(result._id)}
                            className="btn-view"
                          >
                            <FiEye /> View
                          </button>
                          {(user.role === 'admin' || user.role === 'super_admin') && (
                            editingResultId !== result._id ? (
                              <button
                                onClick={() => {
                                  setEditingResultId(result._id);
                                  setEditScore(result.score.toString());
                                }}
                                className="btn-edit"
                              >
                                <FiEdit />
                              </button>
                            ) : (
                              <div className="editing-indicator">Editing...</div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {expandedResult === result._id && (
                      <div className="row-expanded">
                        <div className="answers-section">
                          <div className="answers-header">
                            <h4>
                              <FiEye /> Detailed Answers - {result.userId?.name || result.userId?.username}
                              <span className="answers-score">
                                Score: {result.score}/{test?.totalMarks || 100} ({percentage.toFixed(1)}%)
                              </span>
                            </h4>
                          </div>
                          
                          {result.answers && typeof result.answers === 'object' && (
                            <div className="answers-grid">
                              {Object.entries(result.answers).map(([questionId, selectedAnswer], index) => {
                                const question = test?.questions?.find(q => q._id?.toString() === questionId);
                                const isCorrect = selectedAnswer === question?.correctAnswer;
                                
                                return (
                                  <div 
                                    key={index}
                                    className={`answer-card ${isCorrect ? 'correct' : 'incorrect'}`}
                                  >
                                    <div className="answer-header">
                                      <div className="question-info">
                                        <span className="question-number">Q{index + 1}</span>
                                        <span className={`answer-status ${isCorrect ? 'correct' : 'incorrect'}`}>
                                          {isCorrect ? (
                                            <><FiCheckCircle /> Correct</>
                                          ) : (
                                            <><FiXCircle /> Incorrect</>
                                          )}
                                        </span>
                                      </div>
                                      <div className="question-marks">
                                        <span className="marks-text">1 Point</span>
                                      </div>
                                    </div>
                                    <div className="question-text">
                                      {question?.text || 'Question text not available'}
                                    </div>
                                    <div className="answer-comparison">
                                      <div className="comparison-row">
                                        <span className="label">Student's Answer:</span>
                                        <span className={`value ${isCorrect ? 'correct' : 'incorrect'}`}>
                                          {selectedAnswer || 'Not answered'}
                                        </span>
                                      </div>
                                      <div className="comparison-row">
                                        <span className="label">Correct Answer:</span>
                                        <span className="value correct">
                                          {question?.correctAnswer || 'N/A'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {/* Footer Stats */}
        <div className="table-footer">
          <div className="footer-stats">
            <div className="footer-stat">
              <span className="stat-label">Showing:</span>
              <span className="stat-value">{filteredResults.length} of {results.length} students</span>
            </div>
            <div className="footer-stat">
              <span className="stat-label">Class Average:</span>
              <span className="stat-value">{stats.average} points</span>
            </div>
            <div className="footer-stat">
              <span className="stat-label">Success Rate:</span>
              <span className="stat-value">{stats.passRate}%</span>
            </div>
          </div>
          <div className="footer-actions">
            <button
              onClick={exportToCSV}
              className="btn-footer"
            >
              <FiDownload /> Export Full Report
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .test-results {
          background: #f8f9fa;
          min-height: 100vh;
          padding: 20px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* Navigation Bar */
        .nav-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
          margin-bottom: 24px;
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .nav-back {
          background: #4B5320;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .nav-back:hover {
          background: #3a441a;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(75, 83, 32, 0.2);
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #666;
          font-size: 14px;
        }

        .breadcrumb .current {
          color: #4B5320;
          font-weight: 600;
        }

        .nav-right .test-info-badge {
          background: rgba(144, 238, 144, 0.2);
          color: #4B5320;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(144, 238, 144, 0.3);
        }

        /* Test Header */
        .test-header {
          background: linear-gradient(135deg, #4B5320 0%, #3a441a 100%);
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
          color: white;
          box-shadow: 0 8px 32px rgba(75, 83, 32, 0.15);
        }

        .test-header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          max-width: 1400px;
          margin: 0 auto;
        }

        .test-title-section h1 {
          margin: 0 0 16px 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .test-subject {
          font-size: 14px;
          opacity: 0.9;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .test-title {
          font-size: 32px;
          font-weight: 700;
          line-height: 1.2;
        }

        .test-details {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-top: 16px;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.1);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          backdrop-filter: blur(10px);
        }

        .header-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .action-group {
          display: flex;
          gap: 12px;
        }

        .btn-action {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
          color: #4B5320;
        }

        .btn-refresh {
          background: #90EE90;
        }

        .btn-export {
          background: #FFA500;
          color: #333;
        }

        .btn-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        /* Performance Overview */
        .performance-overview {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .overview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .overview-header h2 {
          margin: 0;
          color: #333;
          font-size: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .overview-stats {
          display: flex;
          gap: 12px;
        }

        .stat-badge {
          background: #f0f9ff;
          color: #4B5320;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #e0f0e0;
        }

        .stats-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }

        .stat-card {
          background: #f9f9f9;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }

        .stat-card.average-score {
          border-left: 4px solid #4B5320;
        }

        .stat-card.pass-rate {
          border-left: 4px solid #90EE90;
        }

        .stat-card.high-score {
          border-left: 4px solid #FFA500;
        }

        .stat-card.above-average {
          border-left: 4px solid #3a441a;
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: white;
        }

        .average-score .stat-icon {
          background: #4B5320;
        }

        .pass-rate .stat-icon {
          background: #90EE90;
          color: #333;
        }

        .high-score .stat-icon {
          background: #FFA500;
          color: #333;
        }

        .above-average .stat-icon {
          background: #3a441a;
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: #333;
          line-height: 1;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }

        .stat-trend {
          font-size: 12px;
          font-weight: 600;
        }

        .trend-up {
          color: #4B5320;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .trend-down {
          color: #ff6b6b;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .progress-bar {
          height: 6px;
          background: #e0e0e0;
          border-radius: 3px;
          overflow: hidden;
          margin-top: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #90EE90, #4B5320);
          border-radius: 3px;
          transition: width 0.6s ease;
        }

        .score-comparison,
        .percentage-indicator {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }

        /* Results Section */
        .results-section {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .section-header h2 {
          margin: 0;
          color: #333;
          font-size: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-controls {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          width: 300px;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #999;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 48px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          transition: all 0.3s ease;
          background: #f8f9fa;
        }

        .search-input:focus {
          border-color: #4B5320;
          background: white;
          box-shadow: 0 0 0 3px rgba(75, 83, 32, 0.1);
        }

        .clear-search {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: #ddd;
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 12px;
          color: #666;
        }

        .filters {
          display: flex;
          gap: 8px;
        }

        .filter-btn {
          padding: 8px 16px;
          border: 2px solid #e0e0e0;
          background: white;
          border-radius: 20px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          transition: all 0.3s ease;
        }

        .filter-btn.active {
          background: #4B5320;
          color: white;
          border-color: #4B5320;
        }

        .filter-btn:hover:not(.active) {
          border-color: #4B5320;
          color: #4B5320;
        }

        /* Results Table */
        .results-table {
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .table-header {
          display: grid;
          grid-template-columns: 2fr 1.5fr 1fr 1fr 120px;
          background: #f8f9fa;
          padding: 16px 24px;
          border-bottom: 1px solid #e0e0e0;
          font-weight: 600;
          color: #4B5320;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .header-cell {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px;
        }

        .sort-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: #999;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .sort-btn.active {
          color: #4B5320;
          background: rgba(75, 83, 32, 0.1);
        }

        .sort-btn:hover {
          color: #4B5320;
          background: rgba(75, 83, 32, 0.05);
        }

        .table-body {
          max-height: 600px;
          overflow-y: auto;
        }

        .no-results {
          padding: 60px 20px;
          text-align: center;
          color: #999;
        }

        .no-results-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .no-results h3 {
          margin: 0 0 8px 0;
          color: #666;
        }

        .result-row {
          border-bottom: 1px solid #f0f0f0;
          transition: background-color 0.3s ease;
        }

        .result-row:hover {
          background-color: #f9f9f9;
        }

        .result-row:last-child {
          border-bottom: none;
        }

        .row-main {
          display: grid;
          grid-template-columns: 2fr 1.5fr 1fr 1fr 120px;
          padding: 20px 24px;
          align-items: center;
        }

        .student-cell {
          padding: 0 8px;
        }

        .student-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .student-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 18px;
          color: white;
          flex-shrink: 0;
        }

        .student-details {
          flex: 1;
        }

        .student-name {
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
          font-size: 16px;
        }

        .student-meta {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #999;
        }

        .student-performance {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .score-cell {
          padding: 0 8px;
        }

        .edit-score-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .score-edit-input {
          width: 80px;
          padding: 8px 12px;
          border: 2px solid #4B5320;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          outline: none;
          text-align: center;
        }

        .score-divider {
          color: #666;
          font-weight: 500;
        }

        .edit-actions {
          display: flex;
          gap: 4px;
        }

        .btn-save,
        .btn-cancel {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .btn-save {
          background: #90EE90;
          color: #333;
        }

        .btn-cancel {
          background: #ffcccc;
          color: #ff6b6b;
        }

        .btn-save:hover,
        .btn-cancel:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .score-display {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .score-value {
          font-size: 20px;
          font-weight: 700;
        }

        .score-max {
          font-size: 14px;
          font-weight: 500;
          color: #999;
        }

        .score-percentage {
          font-size: 12px;
          color: #666;
        }

        .grade-cell {
          padding: 0 8px;
        }

        .grade-badge {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .submitted-cell {
          padding: 0 8px;
        }

        .date-display {
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }

        .time-display {
          font-size: 12px;
          color: #999;
        }

        .actions-cell {
          padding: 0 8px;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-view {
          background: #4B5320;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.3s ease;
        }

        .btn-view:hover {
          background: #3a441a;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(75, 83, 32, 0.2);
        }

        .btn-edit {
          background: #FFA500;
          color: white;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .btn-edit:hover {
          background: #e69500;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 165, 0, 0.2);
        }

        .editing-indicator {
          font-size: 12px;
          color: #FFA500;
          font-weight: 500;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .row-expanded {
          background: #f9f9f9;
          border-top: 1px solid #e0e0e0;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .answers-section {
          padding: 32px;
        }

        .answers-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .answers-header h4 {
          margin: 0;
          color: #333;
          font-size: 18px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .answers-score {
          font-size: 14px;
          color: #4B5320;
          background: rgba(144, 238, 144, 0.2);
          padding: 6px 12px;
          border-radius: 20px;
          font-weight: 600;
        }

        .answers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .answer-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 2px solid;
          transition: all 0.3s ease;
        }

        .answer-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .answer-card.correct {
          border-color: #90EE90;
          background: linear-gradient(135deg, rgba(144, 238, 144, 0.05) 0%, rgba(144, 238, 144, 0.1) 100%);
        }

        .answer-card.incorrect {
          border-color: #ffcccc;
          background: linear-gradient(135deg, rgba(255, 204, 204, 0.05) 0%, rgba(255, 204, 204, 0.1) 100%);
        }

        .answer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .question-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .question-number {
          background: #4B5320;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
        }

        .answer-status {
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .answer-status.correct {
          color: #4B5320;
        }

        .answer-status.incorrect {
          color: #ff6b6b;
        }

        .question-marks .marks-text {
          font-size: 12px;
          color: #999;
          background: #f0f0f0;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .question-text {
          margin: 0 0 20px 0;
          color: #333;
          line-height: 1.6;
          font-size: 14px;
        }

        .answer-comparison {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .comparison-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .comparison-row .label {
          font-size: 12px;
          color: #666;
          font-weight: 500;
        }

        .comparison-row .value {
          font-size: 14px;
          font-weight: 600;
        }

        .value.correct {
          color: #4B5320;
        }

        .value.incorrect {
          color: #ff6b6b;
        }

        /* Table Footer */
        .table-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 0;
          border-top: 1px solid #e0e0e0;
          margin-top: 24px;
        }

        .footer-stats {
          display: flex;
          gap: 32px;
        }

        .footer-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 12px;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 16px;
          font-weight: 600;
          color: #4B5320;
        }

        .btn-footer {
          background: #4B5320;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
        }

        .btn-footer:hover {
          background: #3a441a;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(75, 83, 32, 0.2);
        }

        /* Loading State */
        .loading-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }

        .spinner {
          width: 60px;
          height: 60px;
          border: 4px solid rgba(144, 238, 144, 0.3);
          border-top: 4px solid #4B5320;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 24px;
        }

        .loading-text {
          font-size: 18px;
          font-weight: 600;
          color: #4B5320;
          margin: 0 0 8px 0;
        }

        .loading-subtext {
          font-size: 14px;
          color: #666;
          opacity: 0.8;
        }

        /* Error State */
        .error-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }

        .error-card {
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 500px;
          border: 1px solid #ffcccc;
        }

        .error-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }

        .error-card h3 {
          color: #ff6b6b;
          margin: 0 0 12px 0;
          font-size: 20px;
        }

        .error-message {
          color: #666;
          margin: 0 0 24px 0;
          line-height: 1.6;
        }

        .error-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .btn-back,
        .btn-retry {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
        }

        .btn-back {
          background: #4B5320;
          color: white;
        }

        .btn-retry {
          background: #FFA500;
          color: #333;
        }

        .btn-back:hover,
        .btn-retry:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        /* Responsive Design */
        @media (max-width: 1200px) {
          .stats-cards {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .table-header,
          .row-main {
            grid-template-columns: 2fr 1fr 80px 1fr 120px;
          }
        }

        @media (max-width: 992px) {
          .test-header-content {
            flex-direction: column;
            gap: 20px;
          }
          
          .overview-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          
          .section-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .section-controls {
            width: 100%;
          }
          
          .search-box {
            width: 100%;
          }
          
          .answers-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .nav-bar {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          
          .nav-left {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          
          .stats-cards {
            grid-template-columns: 1fr;
          }
          
          .table-header,
          .row-main {
            display: flex;
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }
          
          .header-cell {
            justify-content: flex-start;
          }
          
          .filters {
            width: 100%;
            overflow-x: auto;
            padding-bottom: 8px;
          }
          
          .table-footer {
            flex-direction: column;
            gap: 20px;
            align-items: flex-start;
          }
          
          .footer-stats {
            width: 100%;
            flex-direction: column;
            gap: 16px;
          }
        }

        @media (max-width: 480px) {
          .test-results {
            padding: 12px;
          }
          
          .test-header {
            padding: 20px;
          }
          
          .test-title {
            font-size: 24px;
          }
          
          .test-details {
            flex-direction: column;
            gap: 8px;
          }
          
          .action-group {
            width: 100%;
          }
          
          .btn-action {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default TestResults;