import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiFilter,
  FiX,
  FiLoader,
  FiAlertTriangle,
  FiCheckCircle,
  FiEye,
  FiTrendingUp,
  FiCalendar,
  FiBook,
  FiUser,
  FiAward,
  FiBarChart2,
  FiDownload,
  FiRefreshCw,
  FiChevronRight,
  FiClock,
  FiPercent,
  FiStar,
  FiInfo,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';

const ParentChildResults = () => {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const [child, setChild] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    subject: '',
    term: '',
    year: ''
  });
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [allSubjects, setAllSubjects] = useState([]);
  const [allTerms, setAllTerms] = useState([]);
  const [allYears, setAllYears] = useState([]);
  const [visibilityStatus, setVisibilityStatus] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedResult, setExpandedResult] = useState(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  useEffect(() => {
    if (studentId) {
      fetchChildData();
      fetchResults();
      fetchVisibilityStatus();
    }
  }, [studentId]);

  useEffect(() => {
    if (results.length > 0) {
      extractFilterOptions();
    }
  }, [results]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const extractFilterOptions = () => {
    const subjects = [...new Set(results.map(result => result.subject).filter(Boolean))];
    const terms = [...new Set(results.map(result => result.term).filter(Boolean))].sort((a, b) => {
      const termOrder = { 'First Term': 1, 'Second Term': 2, 'Third Term': 3 };
      return (termOrder[a] || 0) - (termOrder[b] || 0);
    });
    
    const years = [...new Set(results.map(result => {
      if (result.session) {
        const yearMatch = result.session.match(/\d{4}/);
        return yearMatch ? yearMatch[0] : null;
      }
      return null;
    }).filter(Boolean))].sort((a, b) => b - a);
    
    setAllSubjects(subjects);
    setAllTerms(terms);
    setAllYears(years);
  };

  const fetchChildData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/parents/children/${studentId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.data && response.data.child) {
        setChild(response.data.child);
      } else {
        setError('Child data not found');
      }
    } catch (error) {
      console.error('Error fetching child data:', error);
      setError(error.response?.data?.message || 'Failed to load child information');
    }
  };

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const params = {};
      if (filters.subject) params.subject = filters.subject;
      if (filters.term) params.term = filters.term;
      if (filters.year) params.year = filters.year;
      
      const response = await axios.get(`/api/parents/children/${studentId}/results`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: params
      });
      
      if (response.data && Array.isArray(response.data.results)) {
        setResults(response.data.results);
        setStats(response.data.statistics || null);
        if (response.data.results.length > 0) {
          setSuccess(`Loaded ${response.data.results.length} results`);
        }
      } else {
        setResults([]);
        setStats(null);
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      setError(error.response?.data?.message || 'Failed to load results');
      setResults([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchVisibilityStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/parents/children/${studentId}/visibility-status`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.visibility) {
        setVisibilityStatus(response.data.visibility);
      }
    } catch (error) {
      console.error('Error fetching visibility status:', error);
    }
  };

  const getGradeColor = (grade) => {
    if (!grade) return '#666';
    const gradeUpper = grade.toString().toUpperCase();
    switch(gradeUpper) {
      case 'A+': return '#1b5e20';
      case 'A': return '#2e7d32';
      case 'B': return '#1976d2';
      case 'C': return '#ef6c00';
      case 'D': return '#c62828';
      case 'E': return '#ff8f00';
      case 'F': return '#666';
      default: return '#666';
    }
  };

  const getGradeBackground = (grade) => {
    if (!grade) return '#f5f5f5';
    const gradeUpper = grade.toString().toUpperCase();
    switch(gradeUpper) {
      case 'A+': return '#e8f5e8';
      case 'A': return '#e8f5e8';
      case 'B': return '#e3f2fd';
      case 'C': return '#fff3e0';
      case 'D': return '#ffebee';
      case 'E': return '#fff8e1';
      case 'F': return '#f5f5f5';
      default: return '#f5f5f5';
    }
  };

  const getPerformanceColor = (percentage) => {
    if (percentage >= 85) return '#1b5e20';
    if (percentage >= 70) return '#1565c0';
    if (percentage >= 55) return '#ef6c00';
    if (percentage >= 40) return '#c62828';
    return '#666';
  };

  const getPerformanceText = (percentage) => {
    if (percentage >= 85) return 'Excellent';
    if (percentage >= 70) return 'Good';
    if (percentage >= 55) return 'Average';
    if (percentage >= 40) return 'Below Avg';
    return 'Needs Help';
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      subject: '',
      term: '',
      year: ''
    });
    setShowFilters(false);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleApplyFilters = () => {
    fetchResults();
    setShowFilters(false);
  };

  const handleViewSubjectPerformance = (subject) => {
    setSelectedSubject(subject);
    setShowPerformanceModal(true);
  };

  const handleViewResultDetails = (resultId) => {
    navigate(`/parent/children/${studentId}/results/${resultId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateOverallAverage = () => {
    if (!results.length) return 0;
    const total = results.reduce((sum, result) => sum + (result.percentage || 0), 0);
    return (total / results.length).toFixed(1);
  };

  if (loading && !child) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: '32px', color: '#4B5320' }} />
          <p style={{ color: '#333', fontSize: '14px' }}>Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          onClick={() => navigate('/parent/children')}
          style={styles.backButton}
        >
          <FiArrowLeft /> Back to Children
        </button>
        <div>
          <h1 style={styles.title}>Exam Results</h1>
          <p style={styles.subtitle}>
            Viewing results for {child?.name || 'Child'}
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={styles.errorMessage}>
          <FiAlertTriangle /> 
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={styles.closeMessageButton}>
            <FiX />
          </button>
        </div>
      )}
      
      {success && (
        <div style={styles.successMessage}>
          <FiCheckCircle /> 
          <span style={{ flex: 1 }}>{success}</span>
          <button onClick={() => setSuccess(null)} style={styles.closeMessageButton}>
            <FiX />
          </button>
        </div>
      )}

      {/* Child Info Card */}
      {child && (
        <div style={styles.childCard}>
          <div style={styles.childHeader}>
            <div style={styles.childAvatar}>
              {child.profileImage ? (
                <img 
                  src={`${process.env.REACT_APP_API_URL || ''}/uploads/profiles/${child.profileImage}`} 
                  alt={child.name}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.textContent = getInitials(child.name);
                  }}
                />
              ) : (
                getInitials(child.name)
              )}
            </div>
            <div style={styles.childInfo}>
              <h3 style={styles.childName}>{child.name}</h3>
              <div style={styles.childDetails}>
                <span style={styles.childDetail}><FiUser /> {child.studentId || 'N/A'}</span>
                <span style={styles.childDetail}><FiBook /> {child.className || child.class?.name || 'N/A'}</span>
                <span style={styles.childDetail}><FiCalendar /> {child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visibility Status */}
      {visibilityStatus && (
        <div style={styles.visibilityContainer}>
          {visibilityStatus.visibilityPercentage < 50 && (
            <div style={styles.visibilityWarning}>
              <FiAlertTriangle />
              <div>
                <strong>Limited Visibility:</strong> Only {visibilityStatus.visibilityPercentage}% of results are visible.
              </div>
            </div>
          )}
          
          {visibilityStatus.visibilityPercentage >= 50 && visibilityStatus.visibilityPercentage < 100 && (
            <div style={styles.visibilityInfo}>
              <FiInfo />
              <div>
                <strong>Partial Visibility:</strong> {visibilityStatus.visibleResults} of {visibilityStatus.totalResults} results visible.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      {stats && results.length > 0 && (
        <div style={styles.quickStats}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><FiBarChart2 /></div>
            <div>
              <div style={styles.statValue}>{calculateOverallAverage()}%</div>
              <div style={styles.statLabel}>Average Score</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><FiAward /></div>
            <div>
              <div style={styles.statValue}>{stats.averageGrade || 'N/A'}</div>
              <div style={styles.statLabel}>Average Grade</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><FiStar /></div>
            <div>
              <div style={styles.statValue}>{stats.bestResult?.grade || 'N/A'}</div>
              <div style={styles.statLabel}>Best Grade</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><FiTrendingUp /></div>
            <div>
              <div style={styles.statValue}>{results.length}</div>
              <div style={styles.statLabel}>Total Exams</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div style={styles.filtersBar}>
        <div style={styles.filtersLeft}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={styles.filterToggleButton}
          >
            <FiFilter /> Filters
            {(filters.subject || filters.term || filters.year) && (
              <span style={styles.activeFilterDot}></span>
            )}
          </button>
          
          {(filters.subject || filters.term || filters.year) && (
            <div style={styles.activeFilters}>
              {filters.subject && (
                <span style={styles.activeFilter}>
                  Subject: {filters.subject}
                  <button onClick={() => setFilters(prev => ({ ...prev, subject: '' }))}>
                    <FiX />
                  </button>
                </span>
              )}
              {filters.term && (
                <span style={styles.activeFilter}>
                  Term: {filters.term}
                  <button onClick={() => setFilters(prev => ({ ...prev, term: '' }))}>
                    <FiX />
                  </button>
                </span>
              )}
              {filters.year && (
                <span style={styles.activeFilter}>
                  Year: {filters.year}
                  <button onClick={() => setFilters(prev => ({ ...prev, year: '' }))}>
                    <FiX />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
        
        <div style={styles.filtersRight}>
          <button
            onClick={fetchResults}
            style={styles.refreshButton}
            disabled={loading}
          >
            <FiRefreshCw /> {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Filters Dropdown */}
      {showFilters && (
        <div style={styles.filtersDropdown}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Subject</label>
            <select
              name="subject"
              value={filters.subject}
              onChange={handleFilterChange}
              style={styles.filterSelect}
            >
              <option value="">All Subjects</option>
              {allSubjects.map((subject, index) => (
                <option key={index} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Term</label>
            <select
              name="term"
              value={filters.term}
              onChange={handleFilterChange}
              style={styles.filterSelect}
            >
              <option value="">All Terms</option>
              {allTerms.map((term, index) => (
                <option key={index} value={term}>{term}</option>
              ))}
            </select>
          </div>
          
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Year</label>
            <select
              name="year"
              value={filters.year}
              onChange={handleFilterChange}
              style={styles.filterSelect}
            >
              <option value="">All Years</option>
              {allYears.map((year, index) => (
                <option key={index} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div style={styles.filterActions}>
            <button onClick={clearFilters} style={styles.clearButton}>
              Clear All
            </button>
            <button onClick={handleApplyFilters} style={styles.applyButton}>
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Results Section */}
      <div style={styles.resultsSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>
            Exam Results ({results.length})
          </h2>
          {stats?.bySubject && Object.keys(stats.bySubject).length > 0 && (
            <div style={styles.subjectStats}>
              {Object.entries(stats.bySubject)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([subject, count]) => (
                  <button
                    key={subject}
                    style={styles.subjectStat}
                    onClick={() => {
                      setFilters(prev => ({ ...prev, subject }));
                      handleApplyFilters();
                    }}
                  >
                    <span>{subject}</span>
                    <span>({count})</span>
                  </button>
                ))}
              {Object.keys(stats.bySubject).length > 3 && (
                <button
                  style={styles.viewMoreSubjects}
                  onClick={() => setShowPerformanceModal(true)}
                >
                  +{Object.keys(stats.bySubject).length - 3} more
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: '24px', color: '#4B5320' }} />
            <p style={{ color: '#333', fontSize: '14px' }}>Loading results...</p>
          </div>
        ) : results.length === 0 ? (
          <div style={styles.emptyState}>
            <FiBook style={styles.emptyIcon} />
            <h3 style={styles.emptyTitle}>No Results Found</h3>
            <p style={styles.emptyText}>
              {Object.values(filters).some(f => f) 
                ? 'No results match your current filters'
                : 'No exam results are currently available for this student.'
              }
            </p>
            {Object.values(filters).some(f => f) && (
              <button onClick={clearFilters} style={styles.clearFiltersButton}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div style={styles.resultsList}>
            {results.map((result, index) => {
              const percentage = result.percentage || 0;
              const performanceColor = getPerformanceColor(percentage);
              const gradeColor = getGradeColor(result.grade);
              const gradeBackground = getGradeBackground(result.grade);
              
              return (
                <div key={result.id || result._id || index} style={styles.resultCard}>
                  <div 
                    style={styles.resultHeader}
                    onClick={() => setExpandedResult(expandedResult === index ? null : index)}
                  >
                    <div style={styles.resultMain}>
                      <div style={styles.resultSubject}>
                        <h4 style={styles.resultTitle}>{result.testTitle || 'Test'}</h4>
                        <span style={styles.resultMeta}>{result.subject}</span>
                      </div>
                      <div style={styles.resultStats}>
                        <div style={styles.resultGrade}>
                          <span style={{
                            ...styles.gradeBadge,
                            backgroundColor: gradeBackground,
                            color: gradeColor
                          }}>
                            {result.grade || 'N/A'}
                          </span>
                        </div>
                        <div style={styles.resultScore}>
                          <span style={styles.scoreValue}>{result.score || 0}/{result.totalMarks || 0}</span>
                          <span style={{...styles.scorePercentage, color: performanceColor}}>
                            ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      style={styles.expandButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedResult(expandedResult === index ? null : index);
                      }}
                    >
                      {expandedResult === index ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                  </div>
                  
                  {expandedResult === index && (
                    <div style={styles.resultDetails}>
                      <div style={styles.detailGrid}>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Term/Session:</span>
                          <span style={styles.detailValue}>
                            {result.term} • {result.session || 'N/A'}
                          </span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Performance:</span>
                          <span style={{...styles.detailValue, color: performanceColor}}>
                            {getPerformanceText(percentage)}
                          </span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Position:</span>
                          <span style={styles.detailValue}>
                            {result.position ? `#${result.position}` : 'N/A'}
                          </span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Date:</span>
                          <span style={styles.detailValue}>
                            {formatDate(result.submittedAt)}
                          </span>
                        </div>
                        {result.timeSpent && (
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Time Spent:</span>
                            <span style={styles.detailValue}>
                              <FiClock /> {Math.floor(result.timeSpent / 60)}m {result.timeSpent % 60}s
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div style={styles.resultActions}>
                        <button
                          onClick={() => handleViewResultDetails(result.id || result._id)}
                          style={styles.viewDetailsButton}
                        >
                          <FiEye /> View Details
                        </button>
                        <button
                          onClick={() => handleViewSubjectPerformance(result.subject)}
                          style={styles.subjectTrendsButton}
                        >
                          <FiTrendingUp /> Subject Trends
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Performance Modal */}
      {showPerformanceModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {selectedSubject ? `${selectedSubject} Performance` : 'Subject Performance'}
              </h2>
              <button 
                style={styles.closeModalButton}
                onClick={() => {
                  setShowPerformanceModal(false);
                  setSelectedSubject(null);
                }}
              >
                <FiX />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              {selectedSubject ? (
                <div style={styles.subjectPerformance}>
                  <div style={styles.performanceStats}>
                    <div style={styles.performanceStat}>
                      <span style={styles.performanceStatLabel}>Subject:</span>
                      <span style={styles.performanceStatValue}>{selectedSubject}</span>
                    </div>
                    <div style={styles.performanceStat}>
                      <span style={styles.performanceStatLabel}>Total Exams:</span>
                      <span style={styles.performanceStatValue}>
                        {results.filter(r => r.subject === selectedSubject).length}
                      </span>
                    </div>
                    <div style={styles.performanceStat}>
                      <span style={styles.performanceStatLabel}>Average Score:</span>
                      <span style={styles.performanceStatValue}>
                        {(() => {
                          const subjectResults = results.filter(r => r.subject === selectedSubject);
                          if (!subjectResults.length) return 'N/A';
                          const avg = subjectResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / subjectResults.length;
                          return `${avg.toFixed(1)}%`;
                        })()}
                      </span>
                    </div>
                  </div>
                  
                  <div style={styles.performanceChart}>
                    <div style={styles.chartTitle}>Recent Performance</div>
                    <div style={styles.chartBars}>
                      {results
                        .filter(r => r.subject === selectedSubject)
                        .slice(0, 5)
                        .map((result, idx) => (
                          <div key={idx} style={styles.chartBar}>
                            <div style={styles.barLabel}>
                              {result.testTitle?.substring(0, 15)}...
                            </div>
                            <div style={styles.barContainer}>
                              <div 
                                style={{
                                  ...styles.barFill,
                                  width: `${Math.min(result.percentage || 0, 100)}%`,
                                  backgroundColor: getPerformanceColor(result.percentage || 0)
                                }}
                              >
                                <span style={styles.barValue}>
                                  {(result.percentage || 0).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={styles.allSubjectsPerformance}>
                  <h3 style={styles.modalSubtitle}>All Subjects Overview</h3>
                  <div style={styles.subjectsGrid}>
                    {allSubjects.map((subject, index) => {
                      const subjectResults = results.filter(r => r.subject === subject);
                      const avgScore = subjectResults.length 
                        ? (subjectResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / subjectResults.length).toFixed(1)
                        : 0;
                      
                      return (
                        <div key={index} style={styles.subjectCard}>
                          <div style={styles.subjectCardHeader}>
                            <h4 style={styles.subjectCardTitle}>{subject}</h4>
                            <span style={styles.subjectCardCount}>({subjectResults.length})</span>
                          </div>
                          <div style={styles.subjectCardStats}>
                            <div style={styles.subjectCardStat}>
                              <span>Avg Score:</span>
                              <span style={{ 
                                color: getPerformanceColor(avgScore),
                                fontWeight: '600'
                              }}>
                                {avgScore}%
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedSubject(subject);
                            }}
                            style={styles.viewSubjectButton}
                          >
                            View Details <FiChevronRight />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <div style={styles.modalActions}>
              <button
                onClick={() => {
                  if (selectedSubject) {
                    setSelectedSubject(null);
                  } else {
                    setShowPerformanceModal(false);
                  }
                }}
                style={styles.modalBackButton}
              >
                {selectedSubject ? 'Back to All Subjects' : 'Close'}
              </button>
              <button
                onClick={() => {
                  if (selectedSubject) {
                    setFilters(prev => ({ ...prev, subject: selectedSubject }));
                    handleApplyFilters();
                    setShowPerformanceModal(false);
                    setSelectedSubject(null);
                  }
                }}
                style={styles.modalApplyButton}
                disabled={!selectedSubject}
              >
                Filter by This Subject
              </button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          select:focus, input:focus {
            outline: none;
            border-color: #4B5320 !important;
          }
          
          button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          @media (max-width: 768px) {
            .container {
              padding: 10px !important;
            }
            
            .quick-stats {
              grid-template-columns: repeat(2, 1fr) !important;
            }
            
            .filters-dropdown {
              flex-direction: column !important;
            }
            
            .result-header {
              flex-direction: column !important;
              align-items: flex-start !important;
            }
            
            .result-stats {
              width: 100% !important;
              margin-top: 10px !important;
            }
            
            .modal-content {
              width: 95% !important;
              margin: 10px !important;
              padding: 15px !important;
            }
          }
        `}
      </style>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F5F5F5',
    padding: '20px'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '25px'
  },
  backButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#3A4220',
      transform: 'translateY(-1px)'
    }
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#4B5320',
    margin: '0 0 5px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '0'
  },
  errorMessage: {
    backgroundColor: '#FFE6E6',
    color: '#B22222',
    padding: '12px 15px',
    borderRadius: '6px',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
  },
  successMessage: {
    backgroundColor: '#E6FFE6',
    color: '#228B22',
    padding: '12px 15px',
    borderRadius: '6px',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px'
  },
  closeMessageButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    marginLeft: 'auto',
    fontSize: '16px',
    padding: '0',
    display: 'flex',
    alignItems: 'center'
  },
  childCard: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  childHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  childAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#4B5320',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    overflow: 'hidden',
    flexShrink: 0
  },
  childInfo: {
    flex: 1
  },
  childName: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 8px 0'
  },
  childDetails: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '15px'
  },
  childDetail: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#666'
  },
  visibilityContainer: {
    marginBottom: '20px'
  },
  visibilityWarning: {
    backgroundColor: '#FFF3CD',
    color: '#D4A017',
    padding: '12px 15px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    border: '1px solid #FFEAA7'
  },
  visibilityInfo: {
    backgroundColor: '#E3F2FD',
    color: '#1565c0',
    padding: '12px 15px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    border: '1px solid #BBDEFB'
  },
  quickStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '25px'
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
    transition: 'transform 0.3s ease',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }
  },
  statIcon: {
    width: '40px',
    height: '40px',
    backgroundColor: '#F0F8F0',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    color: '#4B5320'
  },
  statValue: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#333',
    marginBottom: '2px'
  },
  statLabel: {
    fontSize: '13px',
    color: '#666'
  },
  filtersBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
  },
  filtersLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap'
  },
  filterToggleButton: {
    backgroundColor: '#F0F8F0',
    color: '#4B5320',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    position: 'relative'
  },
  activeFilterDot: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    width: '8px',
    height: '8px',
    backgroundColor: '#4B5320',
    borderRadius: '50%'
  },
  activeFilters: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  activeFilter: {
    backgroundColor: '#E0E0E0',
    color: '#333',
    padding: '4px 10px',
    borderRadius: '15px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  filtersRight: {
    display: 'flex',
    gap: '10px'
  },
  refreshButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#3A4220'
    }
  },
  filtersDropdown: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap'
  },
  filterGroup: {
    flex: 1,
    minWidth: '180px'
  },
  filterLabel: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#333',
    fontSize: '14px'
  },
  filterSelect: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #DDD',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#333'
  },
  filterActions: {
    display: 'flex',
    gap: '10px',
    width: '100%',
    marginTop: '10px'
  },
  clearButton: {
    backgroundColor: '#E0E0E0',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    flex: 1,
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#D0D0D0'
    }
  },
  applyButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    flex: 1,
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#3A4220'
    }
  },
  resultsSection: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '25px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#4B5320',
    margin: 0
  },
  subjectStats: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  subjectStat: {
    backgroundColor: '#F0F8F0',
    color: '#4B5320',
    border: 'none',
    borderRadius: '15px',
    padding: '6px 12px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    gap: '5px',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#E0F0E0'
    }
  },
  viewMoreSubjects: {
    backgroundColor: 'transparent',
    color: '#4B5320',
    border: '1px dashed #4B5320',
    borderRadius: '15px',
    padding: '6px 12px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#F0F8F0'
    }
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '50px 20px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  emptyIcon: {
    fontSize: '48px',
    color: '#DDD',
    marginBottom: '20px'
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '10px'
  },
  emptyText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px'
  },
  clearFiltersButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#3A4220'
    }
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  resultCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #EEE',
    transition: 'all 0.3s ease'
  },
  resultHeader: {
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer'
  },
  resultMain: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px'
  },
  resultSubject: {
    flex: 1
  },
  resultTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 5px 0'
  },
  resultMeta: {
    fontSize: '13px',
    color: '#666'
  },
  resultStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  resultGrade: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  gradeBadge: {
    padding: '6px 12px',
    borderRadius: '15px',
    fontSize: '14px',
    fontWeight: 'bold',
    minWidth: '40px',
    textAlign: 'center'
  },
  resultScore: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  scoreValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333'
  },
  scorePercentage: {
    fontSize: '14px',
    fontWeight: '500'
  },
  expandButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    color: '#666',
    padding: '5px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  resultDetails: {
    padding: '0 20px 20px 20px',
    borderTop: '1px solid #EEE'
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  detailLabel: {
    fontSize: '12px',
    color: '#666',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: '14px',
    color: '#333',
    fontWeight: '600'
  },
  resultActions: {
    display: 'flex',
    gap: '10px'
  },
  viewDetailsButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#3A4220'
    }
  },
  subjectTrendsButton: {
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#0D8BF2'
    }
  },
  modalOverlay: {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '1000',
    padding: '20px'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '10px',
    padding: '25px',
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#4B5320',
    margin: '0'
  },
  closeModalButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: '#666',
    cursor: 'pointer',
    padding: '5px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ':hover': {
      backgroundColor: '#F0F0F0'
    }
  },
  modalBody: {
    marginBottom: '20px'
  },
  subjectPerformance: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },
  performanceStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    backgroundColor: '#F8F9FA',
    padding: '20px',
    borderRadius: '8px'
  },
  performanceStat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  performanceStatLabel: {
    fontSize: '13px',
    color: '#666',
    fontWeight: '500'
  },
  performanceStatValue: {
    fontSize: '18px',
    color: '#333',
    fontWeight: '600'
  },
  performanceChart: {
    backgroundColor: '#F8F9FA',
    padding: '20px',
    borderRadius: '8px'
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '20px'
  },
  chartBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  chartBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  barLabel: {
    width: '120px',
    fontSize: '13px',
    color: '#666',
    fontWeight: '500'
  },
  barContainer: {
    flex: 1,
    height: '30px',
    backgroundColor: '#E0E0E0',
    borderRadius: '15px',
    overflow: 'hidden',
    position: 'relative'
  },
  barFill: {
    height: '100%',
    borderRadius: '15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: '10px',
    minWidth: '40px',
    transition: 'width 1s ease'
  },
  barValue: {
    color: 'white',
    fontSize: '12px',
    fontWeight: '600'
  },
  allSubjectsPerformance: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  modalSubtitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: '0'
  },
  subjectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '15px'
  },
  subjectCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: '8px',
    padding: '15px',
    border: '1px solid #E0E0E0',
    transition: 'all 0.3s ease',
    ':hover': {
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      transform: 'translateY(-2px)'
    }
  },
  subjectCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  subjectCardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    margin: '0'
  },
  subjectCardCount: {
    fontSize: '12px',
    color: '#666'
  },
  subjectCardStats: {
    marginBottom: '15px'
  },
  subjectCardStat: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#333'
  },
  viewSubjectButton: {
    backgroundColor: 'transparent',
    color: '#4B5320',
    border: '1px solid #4B5320',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#4B5320',
      color: 'white'
    }
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px'
  },
  modalBackButton: {
    flex: '1',
    backgroundColor: '#E0E0E0',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#D0D0D0'
    }
  },
  modalApplyButton: {
    flex: '1',
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#3A4220'
    },
    ':disabled': {
      backgroundColor: '#CCCCCC',
      cursor: 'not-allowed'
    }
  }
};

export default ParentChildResults;