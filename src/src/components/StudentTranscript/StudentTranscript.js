import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const StudentTranscript = ({ studentId, studentName: propStudentName }) => {
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedTerms, setExpandedTerms] = useState({});

  // Brand colors
  const COLORS = {
    primary: '#4B5320',      // Army Green
    secondary: '#76FF03',    // Bright Green
    accent: '#FF9800',       // Orange
    dark: '#2C3E50',
    light: '#F8F9FA',
    text: '#333333',
    textLight: '#666666',
    border: '#E0E0E0',
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#D32F2F',
    info: '#2196F3'
  };

  // Fetch transcript data
  const fetchTranscript = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      const endpoint = `http://localhost:5000/api/transcripts/${studentId}`;
      const response = await axios.get(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000,
      });
      
      if (response.data?.success !== false) {
        const processedData = processTranscriptData(response.data);
        setTranscript(processedData);
      } else {
        throw new Error(response.data?.message || 'Failed to fetch transcript data');
      }
      
    } catch (err) {
      console.error('Error fetching transcript:', err);
      handleFetchError(err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  // Process raw transcript data
  const processTranscriptData = (data) => {
    if (!data) return null;
    
    const student = data.student || {};
    const records = data.records || [];
    
    // Ensure proper score calculation
    const processedRecords = records.map(record => {
      if (!record.grades || Object.keys(record.grades).length === 0) {
        return record;
      }
      
      // Calculate totals from subject scores
      let totalScore = 0;
      let totalPossible = 0;
      let subjectCount = 0;
      
      Object.values(record.grades).forEach(grade => {
        if (grade && typeof grade === 'object') {
          // Use total score if available, otherwise calculate from components
          const score = parseFloat(grade.total) || 
            (parseFloat(grade.ca1 || 0) + parseFloat(grade.ca2 || 0) + parseFloat(grade.exam || 0));
          
          const maxPossible = grade.maxPossible || 100;
          
          totalScore += score;
          totalPossible += maxPossible;
          subjectCount++;
          
          // Ensure percentage is calculated correctly
          const percentage = maxPossible > 0 ? (score / maxPossible) * 100 : 0;
          grade.percentage = percentage.toFixed(1);
          grade.grade = calculateGrade(percentage);
        }
      });
      
      // Calculate term average
      const termAverage = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
      
      return {
        ...record,
        totalScore: Math.round(totalScore),
        totalPossible: Math.round(totalPossible),
        average: termAverage.toFixed(1),
        subjectCount,
        _realScore: totalScore,
        _realPossible: totalPossible
      };
    });
    
    // Calculate overall statistics
    const overallStats = calculateOverallStats(processedRecords);
    
    return {
      ...data,
      student,
      records: processedRecords,
      summary: overallStats,
      generatedAt: data.generatedAt || new Date().toISOString()
    };
  };

  // Calculate overall statistics
  const calculateOverallStats = (records) => {
    if (!records || records.length === 0) {
      return {
        totalTerms: 0,
        overallAverage: '0%',
        totalSubjects: 0,
        totalTests: 0,
        totalScore: 0,
        totalPossible: 0
      };
    }
    
    let totalAverage = 0;
    let totalTests = 0;
    let totalScore = 0;
    let totalPossible = 0;
    const allSubjects = new Set();
    let bestTerm = null;
    let worstTerm = null;
    let bestAverage = -1;
    let worstAverage = 101;
    
    records.forEach(record => {
      const termAverage = parseFloat(record.average) || 0;
      totalAverage += termAverage;
      totalTests += record.testCount || 0;
      totalScore += record._realScore || 0;
      totalPossible += record._realPossible || 0;
      
      if (record.grades) {
        Object.keys(record.grades).forEach(subject => {
          allSubjects.add(subject);
        });
      }
      
      // Track best and worst terms
      if (termAverage > bestAverage) {
        bestAverage = termAverage;
        bestTerm = record;
      }
      
      if (termAverage < worstAverage) {
        worstAverage = termAverage;
        worstTerm = record;
      }
    });
    
    const overallAverage = (totalAverage / records.length).toFixed(1);
    const weightedAverage = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
    
    return {
      totalTerms: records.length,
      overallAverage: `${overallAverage}%`,
      weightedAverage: `${weightedAverage.toFixed(1)}%`,
      totalSubjects: allSubjects.size,
      totalTests,
      totalScore: Math.round(totalScore),
      totalPossible: Math.round(totalPossible),
      bestTerm: bestTerm ? {
        session: bestTerm.session,
        term: bestTerm.term,
        average: bestTerm.average,
        score: bestTerm.totalScore,
        possible: bestTerm.totalPossible
      } : null,
      worstTerm: worstTerm ? {
        session: worstTerm.session,
        term: worstTerm.term,
        average: worstTerm.average,
        score: worstTerm.totalScore,
        possible: worstTerm.totalPossible
      } : null
    };
  };

  // Helper functions
  const calculateGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
  };

  const getGradeColor = (grade) => {
    const colors = {
      'A+': COLORS.success,
      'A': COLORS.success,
      'B': '#4CAF50', // Slightly darker green
      'C': COLORS.accent,
      'D': COLORS.warning,
      'E': '#FF5722', // Darker orange
      'F': COLORS.danger
    };
    return colors[grade] || COLORS.textLight;
  };

  const getRemark = (percentage) => {
    if (percentage >= 90) return 'Outstanding';
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 70) return 'Very Good';
    if (percentage >= 60) return 'Good';
    if (percentage >= 50) return 'Satisfactory';
    if (percentage >= 40) return 'Pass';
    return 'Needs Improvement';
  };

  const handleFetchError = (err) => {
    if (err.response) {
      switch (err.response.status) {
        case 403:
          setError('Access Denied: You do not have permission to view this transcript.');
          break;
        case 404:
          setError('Transcript data not found for this student.');
          break;
        case 401:
          setError('Session expired. Please login again.');
          localStorage.removeItem('token');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000);
          break;
        case 500:
          const serverError = err.response.data?.message || err.response.data?.error;
          setError(`Server error: ${serverError || 'Please try again later.'}`);
          break;
        default:
          setError(`Error ${err.response.status}: ${err.response.data?.message || 'Failed to fetch transcript'}`);
      }
    } else if (err.request) {
      setError('Network error. Please check your connection and try again.');
    } else if (err.message.includes('timeout')) {
      setError('Request timeout. Please try again.');
    } else if (err.message.includes('Network Error')) {
      setError('Network error. Please check if the server is running.');
    } else {
      setError('Failed to fetch transcript: ' + err.message);
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchTranscript();
    } else {
      setError('No student ID provided');
      setLoading(false);
    }
  }, [studentId, fetchTranscript]);

  // ==================== RENDER FUNCTIONS ====================

  const renderLoading = () => (
    <div style={styles.loadingContainer}>
      <div style={styles.spinner}></div>
      <div style={{ marginTop: '20px' }}>
        <h3 style={{ color: COLORS.dark, marginBottom: '8px' }}>Loading Academic Transcript</h3>
        <p style={{ color: COLORS.textLight, fontSize: '14px' }}>Student ID: {studentId}</p>
      </div>
    </div>
  );

  const renderError = () => (
    <div style={styles.errorContainer}>
      <h3 style={{ color: COLORS.danger, marginBottom: '12px' }}>Error Loading Transcript</h3>
      <p style={{ color: COLORS.text, marginBottom: '20px' }}>{error}</p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <button style={styles.primaryButton} onClick={() => fetchTranscript()}>
          Retry
        </button>
        <button style={styles.secondaryButton} onClick={() => window.location.reload()}>
          Refresh Page
        </button>
      </div>
    </div>
  );

  const renderEmpty = () => (
    <div style={styles.emptyContainer}>
      <h3 style={{ color: COLORS.dark, marginBottom: '12px' }}>No Academic Records</h3>
      <p style={{ color: COLORS.textLight, marginBottom: '24px' }}>
        This student does not have any academic records yet.
      </p>
      <button style={styles.primaryButton} onClick={() => fetchTranscript()}>
        Check Again
      </button>
    </div>
  );

  const renderStudentHeader = () => {
    if (!transcript?.student) return null;
    
    const student = transcript.student;
    
    return (
      <div style={styles.headerCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={styles.studentName}>{student.name}</h1>
            <div style={styles.studentInfo}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Student ID:</span>
                <span style={styles.infoValue}>{student.studentId}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Class:</span>
                <span style={styles.infoValue}>{student.currentClass}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Level:</span>
                <span style={styles.infoValue}>{student.level}</span>
              </div>
              {student.admissionDate && (
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Admission:</span>
                  <span style={styles.infoValue}>
                    {new Date(student.admissionDate).toLocaleDateString('en-GB')}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <div style={styles.officialBadge}>Official Transcript</div>
            <p style={{ color: COLORS.textLight, fontSize: '12px', marginTop: '8px' }}>
              Generated: {new Date(transcript.generatedAt).toLocaleDateString('en-GB')}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderStatistics = () => {
    if (!transcript?.summary) return null;
    
    const stats = transcript.summary;
    
    return (
      <div style={styles.statisticsCard}>
        <h2 style={styles.sectionTitle}>Academic Summary</h2>
        
        <div style={styles.statsGrid}>
          <div style={styles.statBox}>
            <div style={styles.statValue}>{stats.totalTerms}</div>
            <div style={styles.statLabel}>Academic Terms</div>
          </div>
          
          <div style={styles.statBox}>
            <div style={styles.statValue}>{stats.overallAverage}</div>
            <div style={styles.statLabel}>Overall Average</div>
          </div>
          
          <div style={styles.statBox}>
            <div style={styles.statValue}>{stats.totalSubjects}</div>
            <div style={styles.statLabel}>Total Subjects</div>
          </div>
          
          <div style={styles.statBox}>
            <div style={styles.statValue}>{stats.totalTests}</div>
            <div style={styles.statLabel}>Total Tests</div>
          </div>
        </div>
        
        <div style={styles.detailedStats}>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Total Score:</span>
            <span style={styles.statValue}>
              {stats.totalScore} / {stats.totalPossible}
            </span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Weighted Average:</span>
            <span style={styles.statValue}>{stats.weightedAverage}</span>
          </div>
          
          {stats.bestTerm && (
            <div style={styles.statRow}>
              <span style={styles.statLabel}>Best Performance:</span>
              <span style={styles.statValue}>
                {stats.bestTerm.session} ({stats.bestTerm.average})
              </span>
            </div>
          )}
          
          {stats.worstTerm && (
            <div style={styles.statRow}>
              <span style={styles.statLabel}>Needs Improvement:</span>
              <span style={{ ...styles.statValue, color: COLORS.danger }}>
                {stats.worstTerm.session} ({stats.worstTerm.average})
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTermCard = (record, index) => {
    const termKey = `${record.session}|${record.term}`;
    const isExpanded = expandedTerms[termKey];
    const grade = calculateGrade(parseFloat(record.average));
    
    return (
      <div key={termKey} style={styles.termCard}>
        <div 
          style={styles.termHeader}
          onClick={() => setExpandedTerms(prev => ({ ...prev, [termKey]: !prev[termKey] }))}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={styles.termNumber}>{index + 1}</div>
            <div>
              <h3 style={styles.termTitle}>{record.session} • {record.term}</h3>
              <p style={styles.termSubtitle}>
                Class: {record.class} • Subjects: {record.subjectCount} • Tests: {record.totalTests}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={styles.termAverage}>{record.average}%</span>
                <span style={{ 
                  ...styles.gradeBadge,
                  backgroundColor: getGradeColor(grade)
                }}>
                  {grade}
                </span>
              </div>
              <p style={styles.scoreInfo}>
                Score: {record.totalScore} / {record.totalPossible}
              </p>
            </div>
            
            <div style={styles.expandIcon}>
              {isExpanded ? '−' : '+'}
            </div>
          </div>
        </div>
        
        {isExpanded && record.grades && Object.keys(record.grades).length > 0 && (
          <div style={styles.gradesContainer}>
            <div style={styles.scoreSystemInfo}>
              <strong>Score System:</strong> CA1 (20 marks) + CA2 (20 marks) + Exam (60 marks) = Total (100 marks)
            </div>
            <table style={styles.gradesTable}>
              <thead>
                <tr>
                  <th style={styles.tableHeader}>Subject</th>
                  <th style={styles.tableHeader}>CA1</th>
                  <th style={styles.tableHeader}>CA2</th>
                  <th style={styles.tableHeader}>Exam</th>
                  <th style={styles.tableHeader}>Total</th>
                  <th style={styles.tableHeader}>%</th>
                  <th style={styles.tableHeader}>Grade</th>
                  <th style={styles.tableHeader}>Remark</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(record.grades).map(([subject, gradeData], idx) => (
                  <tr key={subject} style={styles.tableRow(idx)}>
                    <td style={styles.subjectCell}>{subject}</td>
                    <td style={styles.caCell}>{gradeData.ca1 || '0.0'}</td>
                    <td style={styles.caCell}>{gradeData.ca2 || '0.0'}</td>
                    <td style={styles.examCell}>{gradeData.exam || '0.0'}</td>
                    <td style={styles.totalCell}>
                      <div style={{ fontWeight: '600' }}>
                        {gradeData.total || '0.0'} / {gradeData.maxPossible || 100}
                      </div>
                    </td>
                    <td style={styles.percentageCell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span>{gradeData.percentage}%</span>
                        <div style={styles.progressBar}>
                          <div 
                            style={{ 
                              ...styles.progressFill, 
                              width: `${gradeData.percentage}%`,
                              backgroundColor: getGradeColor(gradeData.grade)
                            }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td style={styles.gradeCell}>
                      <span style={{ 
                        ...styles.gradeBadge,
                        backgroundColor: getGradeColor(gradeData.grade)
                      }}>
                        {gradeData.grade}
                      </span>
                    </td>
                    <td style={styles.remarkCell}>
                      {gradeData.remark}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderAcademicRecords = () => {
    if (!transcript?.records?.length) return null;
    
    return (
      <div style={styles.recordsCard}>
        <h2 style={styles.sectionTitle}>Academic Records</h2>
        <p style={styles.sectionSubtitle}>
          Click on any term to view detailed subject grades (CA1/CA2/Exam breakdown)
        </p>
        
        <div style={styles.termsContainer}>
          {transcript.records.map((record, index) => renderTermCard(record, index))}
        </div>
      </div>
    );
  };

  // ==================== STYLES ====================
  const styles = {
    // Container
    container: {
      padding: '20px',
      backgroundColor: COLORS.light,
      minHeight: '100vh',
      fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
      fontSize: '14px' // Reduced base font size
    },
    
    // Loading
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh'
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: `3px solid ${COLORS.border}`,
      borderTop: `3px solid ${COLORS.primary}`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    
    // Error
    errorContainer: {
      padding: '24px',
      backgroundColor: 'white',
      borderRadius: '6px',
      maxWidth: '500px',
      margin: '30px auto',
      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      fontSize: '14px'
    },
    
    // Empty
    emptyContainer: {
      padding: '32px',
      backgroundColor: 'white',
      borderRadius: '6px',
      textAlign: 'center',
      maxWidth: '400px',
      margin: '30px auto',
      boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
    },
    
    // Header
    headerCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '6px',
      marginBottom: '16px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      borderLeft: `4px solid ${COLORS.primary}`
    },
    studentName: {
      fontSize: '20px', // Reduced from 32px
      fontWeight: '700',
      color: COLORS.dark,
      margin: '0 0 12px 0'
    },
    studentInfo: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      fontSize: '13px'
    },
    infoItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    },
    infoLabel: {
      fontSize: '11px',
      color: COLORS.textLight,
      textTransform: 'uppercase',
      letterSpacing: '0.3px'
    },
    infoValue: {
      fontSize: '14px',
      color: COLORS.text,
      fontWeight: '600'
    },
    officialBadge: {
      display: 'inline-block',
      padding: '4px 12px',
      backgroundColor: COLORS.primary,
      color: 'white',
      fontSize: '11px',
      fontWeight: '600',
      borderRadius: '3px',
      textTransform: 'uppercase',
      letterSpacing: '0.3px'
    },
    
    // Statistics
    statisticsCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '6px',
      marginBottom: '16px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
    },
    sectionTitle: {
      fontSize: '18px', // Reduced from 24px
      fontWeight: '700',
      color: COLORS.dark,
      margin: '0 0 12px 0'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '12px',
      marginBottom: '20px'
    },
    statBox: {
      textAlign: 'center',
      padding: '16px',
      backgroundColor: '#F8F9FA',
      borderRadius: '4px',
      border: `1px solid ${COLORS.border}`
    },
    statValue: {
      fontSize: '20px', // Reduced from 32px
      fontWeight: '700',
      color: COLORS.primary,
      marginBottom: '6px'
    },
    statLabel: {
      fontSize: '12px',
      color: COLORS.textLight,
      textTransform: 'uppercase',
      letterSpacing: '0.3px'
    },
    detailedStats: {
      backgroundColor: '#F8F9FA',
      padding: '16px',
      borderRadius: '4px',
      border: `1px solid ${COLORS.border}`,
      fontSize: '13px'
    },
    statRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: `1px solid ${COLORS.border}`,
      '&:last-child': {
        borderBottom: 'none'
      }
    },
    
    // Academic Records
    recordsCard: {
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '6px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
    },
    sectionSubtitle: {
      fontSize: '13px',
      color: COLORS.textLight,
      margin: '0 0 16px 0'
    },
    termsContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    
    // Term Card
    termCard: {
      backgroundColor: 'white',
      borderRadius: '4px',
      border: `1px solid ${COLORS.border}`,
      overflow: 'hidden',
      transition: 'all 0.2s ease'
    },
    termHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px',
      backgroundColor: '#F8F9FA',
      cursor: 'pointer',
      borderBottom: `1px solid ${COLORS.border}`
    },
    termNumber: {
      width: '32px',
      height: '32px',
      backgroundColor: COLORS.primary,
      color: 'white',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '700',
      fontSize: '14px'
    },
    termTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: COLORS.dark,
      margin: '0 0 2px 0'
    },
    termSubtitle: {
      fontSize: '12px',
      color: COLORS.textLight,
      margin: 0
    },
    termAverage: {
      fontSize: '18px', // Reduced from 24px
      fontWeight: '700',
      color: COLORS.primary
    },
    scoreInfo: {
      fontSize: '11px',
      color: COLORS.textLight,
      margin: '2px 0 0 0'
    },
    expandIcon: {
      fontSize: '16px',
      fontWeight: '600',
      color: COLORS.primary,
      width: '28px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      border: `2px solid ${COLORS.primary}`
    },
    
    // Grades Table
    gradesContainer: {
      padding: '16px',
      fontSize: '13px'
    },
    scoreSystemInfo: {
      backgroundColor: '#F0F7FF',
      padding: '8px 12px',
      borderRadius: '4px',
      marginBottom: '12px',
      fontSize: '12px',
      color: COLORS.info,
      borderLeft: `3px solid ${COLORS.info}`
    },
    gradesTable: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '12px'
    },
    tableHeader: {
      padding: '12px 8px',
      backgroundColor: '#F8F9FA',
      color: COLORS.text,
      textAlign: 'left',
      fontWeight: '600',
      borderBottom: `2px solid ${COLORS.border}`,
      fontSize: '12px'
    },
    tableRow: (idx) => ({
      backgroundColor: idx % 2 === 0 ? 'white' : '#FAFAFA',
      borderBottom: `1px solid ${COLORS.border}`
    }),
    subjectCell: {
      padding: '12px 8px',
      color: COLORS.text,
      fontWeight: '600',
      minWidth: '120px'
    },
    caCell: {
      padding: '12px 8px',
      color: COLORS.text,
      textAlign: 'center',
      minWidth: '50px',
      fontWeight: '500'
    },
    examCell: {
      padding: '12px 8px',
      color: COLORS.text,
      textAlign: 'center',
      minWidth: '60px',
      fontWeight: '600'
    },
    totalCell: {
      padding: '12px 8px',
      color: COLORS.text,
      textAlign: 'center',
      minWidth: '80px'
    },
    percentageCell: {
      padding: '12px 8px',
      color: COLORS.text,
      minWidth: '120px'
    },
    gradeCell: {
      padding: '12px 8px',
      textAlign: 'center',
      minWidth: '60px'
    },
    remarkCell: {
      padding: '12px 8px',
      color: COLORS.text,
      fontStyle: 'italic',
      minWidth: '100px',
      fontSize: '12px'
    },
    
    // Progress Bar
    progressBar: {
      flex: 1,
      height: '4px',
      backgroundColor: COLORS.border,
      borderRadius: '2px',
      overflow: 'hidden'
    },
    progressFill: {
      height: '100%',
      borderRadius: '2px',
      transition: 'width 0.3s ease'
    },
    
    // Grade Badge
    gradeBadge: {
      display: 'inline-block',
      padding: '4px 8px',
      color: 'white',
      fontSize: '11px',
      fontWeight: '700',
      borderRadius: '3px',
      textAlign: 'center',
      minWidth: '32px'
    },
    
    // Buttons
    primaryButton: {
      padding: '10px 20px',
      backgroundColor: COLORS.primary,
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '13px',
      transition: 'all 0.2s ease'
    },
    secondaryButton: {
      padding: '10px 20px',
      backgroundColor: 'white',
      color: COLORS.text,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '4px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '13px',
      transition: 'all 0.2s ease'
    }
  };

  // ==================== MAIN RENDER ====================
  if (loading) return (
    <div style={styles.container}>
      {renderLoading()}
    </div>
  );
  
  if (error) return (
    <div style={styles.container}>
      {renderError()}
    </div>
  );
  
  if (!transcript) return (
    <div style={styles.container}>
      {renderEmpty()}
    </div>
  );

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          button:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 6px rgba(75, 83, 32, 0.15);
          }
          th, td {
            font-size: 12px;
          }
        `}
      </style>
      
      {renderStudentHeader()}
      {renderStatistics()}
      {renderAcademicRecords()}
    </div>
  );
};

export default StudentTranscript;