import React, { useState, useEffect } from 'react';
import { promotionAPI } from '../../api/promotion';
import usePromotion from '../../hooks/usePromotion';

const PromotionPanel = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [session, setSession] = useState('');
  const [term, setTerm] = useState('');
  const [eligibilityResults, setEligibilityResults] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [targetClass, setTargetClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    fetchClasses();
    const currentSession = getCurrentSession();
    setSession(currentSession);
    setTerm('Third Term');
  }, []);

  const getCurrentSession = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    if (month >= 8) {
      return `${year}/${year + 1}`;
    } else {
      return `${year - 1}/${year}`;
    }
  };

  const fetchClasses = async () => {
    try {
      console.log('🔍 Fetching classes from API...');
      const response = await promotionAPI.getClasses();
      console.log('✅ Classes API response:', response);
      
      if (response.data && Array.isArray(response.data)) {
        setClasses(response.data);
        console.log(`✅ Loaded ${response.data.length} classes`);
      } else {
        console.error('❌ Unexpected classes response format:', response.data);
        setClasses([]);
        showMessage('Error: Unexpected data format from server', 'error');
      }
    } catch (error) {
      console.error('❌ Error fetching classes:', error);
      showMessage('Error fetching classes: ' + error.message, 'error');
      setClasses([]);
    }
  };

  const fetchEligibleStudents = async () => {
    if (!selectedClass || !session || !term) return;
    
    setLoading(true);
    setEligibilityResults([]);
    setSelectedStudents([]);
    
    try {
      console.log('🔍 Fetching eligible students with:', { 
        selectedClass, 
        session, 
        term 
      });
      
      const response = await promotionAPI.getEligibleStudents(selectedClass, session, term);
      console.log('✅ Eligible students API response:', response);
      
      if (response.data && Array.isArray(response.data)) {
        setEligibilityResults(response.data);
        const eligibleCount = response.data.filter(r => r.status === 'eligible').length;
        showMessage(`Found ${response.data.length} students - ${eligibleCount} eligible for promotion`, 'success');
      } else {
        showMessage('Error: Unexpected response format from server', 'error');
      }
    } catch (error) {
      console.error('❌ Error fetching eligible students:', error);
      const errorMessage = error.response?.data?.message || error.message;
      showMessage(`Error fetching students: ${errorMessage}`, 'error');
    }
    setLoading(false);
  };

  const showMessage = (msg, type = 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const handleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId) 
        : [...prev, studentId]
    );
  };

  const handlePromoteStudents = async () => {
    if (selectedStudents.length === 0 || !targetClass) {
      showMessage('Please select students and target class', 'error');
      return;
    }

    setPromotionLoading(true);
    
    try {
      console.log('🚀 Promoting students:', { 
        selectedStudents, 
        targetClass, 
        session, 
        term 
      });
      
      const result = await promotionAPI.promoteStudents(
        selectedStudents, 
        targetClass, 
        session, 
        term
      );
      
      console.log('✅ Promotion API response:', result);
      
      if (result.data) {
        showMessage(
          `Successfully promoted ${selectedStudents.length} student${selectedStudents.length > 1 ? 's' : ''} to ${getClassName(targetClass)}`, 
          'success'
        );
        setSelectedStudents([]);
        setTargetClass('');
        // Refresh the eligibility results
        fetchEligibleStudents();
      } else {
        showMessage('Promotion failed: Unexpected response format', 'error');
      }
    } catch (error) {
      console.error('❌ Promotion error:', error);
      const errorMessage = error.response?.data?.message || error.message;
      showMessage(`Promotion failed: ${errorMessage}`, 'error');
    }
    
    setPromotionLoading(false);
  };

  const getClassName = (classId) => {
    const classObj = classes.find(c => c && c._id === classId);
    return classObj ? classObj.name : 'Unknown Class';
  };

  const getEligibleStudents = () => {
    return Array.isArray(eligibilityResults) 
      ? eligibilityResults.filter(result => result.status === 'eligible')
      : [];
  };

  const getIneligibleStudents = () => {
    return Array.isArray(eligibilityResults)
      ? eligibilityResults.filter(result => result.status === 'ineligible')
      : [];
  };

  const selectedClassObj = Array.isArray(classes) ? classes.find(c => c && c._id === selectedClass) : null;
  const targetClassObj = Array.isArray(classes) ? classes.find(c => c && c._id === targetClass) : null;
  const eligibleStudents = getEligibleStudents();
  const ineligibleStudents = getIneligibleStudents();

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Student Promotion Panel</h2>

      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Current Class:</label>
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            style={styles.select}
          >
            <option value="">Select Class</option>
            {Array.isArray(classes) && classes.map(cls => (
              cls && <option key={cls._id} value={cls._id}>{cls.name}</option>
            ))}
          </select>
        </div>
        
        <div style={styles.filterGroup}>
          <label style={styles.label}>Academic Session:</label>
          <input 
            type="text" 
            value={session} 
            onChange={(e) => setSession(e.target.value)}
            style={styles.input}
            placeholder="e.g., 2023/2024"
          />
        </div>
        
        <div style={styles.filterGroup}>
          <label style={styles.label}>Term:</label>
          <select 
            value={term} 
            onChange={(e) => setTerm(e.target.value)}
            style={styles.select}
          >
            <option value="First Term">First Term</option>
            <option value="Second Term">Second Term</option>
            <option value="Third Term">Third Term</option>
          </select>
        </div>
        
        <button 
          onClick={fetchEligibleStudents} 
          disabled={!selectedClass || !session || !term || loading}
          style={{
            ...styles.button,
            ...(loading ? styles.buttonDisabled : {})
          }}
        >
          {loading ? 'Loading...' : 'Check Eligibility'}
        </button>
      </div>

      {message && (
        <div style={{
          ...styles.message,
          ...(messageType === 'success' ? styles.successMessage : styles.errorMessage)
        }}>
          {message}
        </div>
      )}

      {Array.isArray(eligibilityResults) && eligibilityResults.length > 0 && (
        <div style={styles.resultsContainer}>
          {/* Eligible Students Section */}
          {eligibleStudents.length > 0 && (
            <div style={styles.studentSection}>
              <h3 style={styles.sectionTitle}>
                ✅ Eligible Students for Promotion ({eligibleStudents.length})
              </h3>
              <div style={styles.studentList}>
                {eligibleStudents.map((result, index) => (
                  result.student && (
                    <div key={result.student._id} style={styles.studentItem}>
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(result.student._id)}
                        onChange={() => handleStudentSelection(result.student._id)}
                        style={styles.checkbox}
                      />
                      <div style={styles.studentInfo}>
                        <span style={styles.studentName}>{result.student.name}</span>
                        <span style={styles.studentId}>({result.student.studentId})</span>
                        {result.details && (
                          <div style={styles.performanceDetails}>
                            <span>Score: {result.details.finalScore}%</span>
                            <span>Attendance: {result.details.attendancePercentage}%</span>
                            <span>Passing: {result.details.passingGrade}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Ineligible Students Section */}
          {ineligibleStudents.length > 0 && (
            <div style={styles.studentSection}>
              <h3 style={styles.sectionTitle}>
                ❌ Ineligible Students ({ineligibleStudents.length})
              </h3>
              <div style={styles.studentList}>
                {ineligibleStudents.map((result, index) => (
                  result.student && (
                    <div key={result.student._id} style={styles.studentItem}>
                      <div style={styles.studentInfo}>
                        <span style={styles.studentName}>{result.student.name}</span>
                        <span style={styles.studentId}>({result.student.studentId})</span>
                        <div style={styles.ineligibleReason}>
                          <strong>Reason:</strong> {result.reason}
                          {result.details && (
                            <div style={styles.performanceDetails}>
                              <span>Score: {result.details.finalScore}%</span>
                              <span>Attendance: {result.details.attendancePercentage}%</span>
                              <span>Required: {result.details.passingGrade}% score, {result.details.minAttendance}% attendance</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Promotion Controls */}
          {eligibleStudents.length > 0 && (
            <div style={styles.promotionSection}>
              <div style={styles.promotionHeader}>
                <h3>Promotion Actions</h3>
                <div style={styles.selectionInfo}>
                  {selectedStudents.length} of {eligibleStudents.length} students selected
                </div>
              </div>
              
              <div style={styles.promotionControls}>
                <div style={styles.filterGroup}>
                  <label style={styles.label}>Promote to Class:</label>
                  <select 
                    value={targetClass} 
                    onChange={(e) => setTargetClass(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">Select Target Class</option>
                    {Array.isArray(classes) && classes
                      .filter(cls => cls && cls._id !== selectedClass)
                      .map(cls => (
                        <option key={cls._id} value={cls._id}>{cls.name}</option>
                      ))
                    }
                  </select>
                </div>
                
                <div style={styles.promotionActions}>
                  <button 
                    onClick={() => setSelectedStudents(eligibleStudents.map(result => result.student._id))}
                    style={styles.secondaryButton}
                    disabled={eligibleStudents.length === 0}
                  >
                    Select All Eligible
                  </button>
                  
                  <button 
                    onClick={() => setSelectedStudents([])}
                    style={styles.secondaryButton}
                    disabled={selectedStudents.length === 0}
                  >
                    Clear Selection
                  </button>
                  
                  <button 
                    onClick={handlePromoteStudents} 
                    disabled={selectedStudents.length === 0 || !targetClass || promotionLoading}
                    style={{
                      ...styles.promoteButton,
                      ...(selectedStudents.length === 0 || !targetClass ? styles.buttonDisabled : {})
                    }}
                  >
                    {promotionLoading ? 'Processing...' : `Promote ${selectedStudents.length} Students`}
                  </button>
                </div>
              </div>

              {targetClass && selectedClassObj && targetClassObj && (
                <div style={styles.promotionSummary}>
                  <strong>Promotion Summary:</strong><br />
                  From: {selectedClassObj.name} → To: {targetClassObj.name}<br />
                  Session: {session} | Term: {term}<br />
                  Students: {selectedStudents.length} selected
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {Array.isArray(eligibilityResults) && eligibilityResults.length === 0 && !loading && selectedClass && (
        <div style={styles.noResults}>
          <p>No students found or no academic records available for the selected criteria.</p>
          <p><small>Try selecting a different class, session, or term.</small></p>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  },
  title: {
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: '30px',
    fontSize: '2rem',
    fontWeight: 'bold'
  },
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    marginBottom: '25px',
    alignItems: 'flex-end',
    padding: '25px',
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: '180px',
    flex: '1'
  },
  label: {
    marginBottom: '8px',
    fontWeight: '600',
    fontSize: '14px',
    color: '#495057'
  },
  select: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '2px solid #e9ecef',
    fontSize: '14px',
    backgroundColor: 'white',
    transition: 'border-color 0.2s',
    outline: 'none'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '2px solid #e9ecef',
    fontSize: '14px',
    backgroundColor: 'white',
    transition: 'border-color 0.2s',
    outline: 'none'
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    height: 'fit-content',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background-color 0.2s',
    minWidth: '150px'
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
    cursor: 'not-allowed'
  },
  message: {
    padding: '15px',
    margin: '15px 0',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '14px'
  },
  successMessage: {
    backgroundColor: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb'
  },
  errorMessage: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb'
  },
  resultsContainer: {
    marginTop: '25px'
  },
  studentSection: {
    margin: '25px 0',
    border: '2px solid #e9ecef',
    borderRadius: '10px',
    overflow: 'hidden',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    padding: '20px',
    margin: 0,
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #e9ecef',
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#2c3e50'
  },
  studentList: {
    maxHeight: '500px',
    overflowY: 'auto'
  },
  studentItem: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '18px 20px',
    borderBottom: '1px solid #f1f2f6',
    backgroundColor: 'white',
    transition: 'background-color 0.2s'
  },
  checkbox: {
    marginRight: '18px',
    marginTop: '4px',
    transform: 'scale(1.2)',
    cursor: 'pointer'
  },
  studentInfo: {
    flex: 1
  },
  studentName: {
    fontWeight: '600',
    marginRight: '12px',
    fontSize: '16px',
    color: '#2c3e50'
  },
  studentId: {
    color: '#7f8c8d',
    fontSize: '14px',
    fontWeight: '500'
  },
  performanceDetails: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#636e72',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  ineligibleReason: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#e74c3c',
    fontWeight: '500'
  },
  promotionSection: {
    marginTop: '35px',
    padding: '25px',
    backgroundColor: '#e8f4fd',
    borderRadius: '10px',
    border: '2px solid #3498db',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  promotionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  selectionInfo: {
    fontWeight: 'bold',
    color: '#2980b9',
    fontSize: '16px',
    backgroundColor: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #3498db'
  },
  promotionControls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '25px',
    alignItems: 'flex-end'
  },
  promotionActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  secondaryButton: {
    padding: '10px 16px',
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    minWidth: '140px'
  },
  promoteButton: {
    padding: '12px 24px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '15px',
    transition: 'background-color 0.2s',
    minWidth: '200px'
  },
  promotionSummary: {
    marginTop: '20px',
    padding: '18px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #b3d9ff',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#2c3e50'
  },
  noResults: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '10px',
    marginTop: '20px',
    color: '#7f8c8d',
    fontSize: '16px'
  }
};

export default PromotionPanel;