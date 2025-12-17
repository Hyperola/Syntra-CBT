import React, { useState, useEffect } from 'react';
import { promotionAPI } from '../../api/promotion';

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
  const [promotionStatus, setPromotionStatus] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    fetchClasses();
    checkPromotionStatus();
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

  const checkPromotionStatus = async () => {
    try {
      console.log('🔍 Checking promotion status...');
      const response = await promotionAPI.getPromotionStatus();
      console.log('✅ Promotion status response:', response);
      setPromotionStatus(response.data);
    } catch (error) {
      console.error('❌ Error checking promotion status:', error);
      showMessage('Error checking promotion status: ' + error.message, 'error');
    }
  };

  const fetchClasses = async () => {
    try {
      console.log('🔍 Fetching classes from API...');
      const response = await promotionAPI.getClasses();
      console.log('✅ Classes API response:', response);
      
      // Debug: Log the exact structure
      console.log('🔍 RAW API RESPONSE STRUCTURE:', {
        fullResponse: response,
        data: response.data,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        keys: response.data ? Object.keys(response.data) : 'no data'
      });
      
      // FIX: Handle different response structures
      let classesData = [];
      
      if (response.data && Array.isArray(response.data)) {
        // Case 1: Direct array response
        classesData = response.data;
      } else if (response.data && Array.isArray(response.data.classes)) {
        // Case 2: Object with classes array
        classesData = response.data.classes;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Case 3: Nested data array
        classesData = response.data.data;
      } else if (response.data && typeof response.data === 'object') {
        // Case 4: Convert object values to array
        classesData = Object.values(response.data);
      }
      
      console.log(`✅ Processed ${classesData.length} classes:`, classesData);
      setClasses(classesData);
      
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
      
      // FIX: Handle different response structures for eligibility results
      let resultsData = [];
      
      if (response.data && Array.isArray(response.data)) {
        resultsData = response.data;
      } else if (response.data && Array.isArray(response.data.results)) {
        resultsData = response.data.results;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        resultsData = response.data.data;
      } else if (response.data && typeof response.data === 'object') {
        resultsData = Object.values(response.data);
      }
      
      setEligibilityResults(resultsData);
      const eligibleCount = resultsData.filter(r => r.status === 'eligible').length;
      showMessage(`Found ${resultsData.length} students - ${eligibleCount} eligible for promotion`, 'success');
      
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

  const handleSelectAll = () => {
    const eligibleStudents = getEligibleStudents();
    const allEligibleIds = eligibleStudents.map(result => 
      result.student._id || result.student.id
    ).filter(id => id); // Filter out any undefined IDs
    setSelectedStudents(allEligibleIds);
  };

  const handleClearSelection = () => {
    setSelectedStudents([]);
  };

  const confirmPromotion = () => {
    if (selectedStudents.length === 0 || !targetClass) {
      showMessage('Please select students and target class', 'error');
      return;
    }
    setShowConfirmation(true);
  };

  const handlePromoteStudents = async () => {
    setShowConfirmation(false);
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
        // Refresh the eligibility results and promotion status
        fetchEligibleStudents();
        checkPromotionStatus();
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
    const classObj = classes.find(c => c && (c._id === classId || c.id === classId));
    return classObj ? (classObj.name || classObj.fullName || classObj.shortName || 'Unknown Class') : 'Unknown Class';
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

  const selectedClassObj = Array.isArray(classes) ? classes.find(c => c && (c._id === selectedClass || c.id === selectedClass)) : null;
  const targetClassObj = Array.isArray(classes) ? classes.find(c => c && (c._id === targetClass || c.id === targetClass)) : null;
  const eligibleStudents = getEligibleStudents();
  const ineligibleStudents = getIneligibleStudents();

  // Check if promotion is allowed based on status
  const isPromotionAllowed = promotionStatus?.canPromote !== false;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Student Promotion Panel</h2>

      {/* Promotion Status Banner */}
      {promotionStatus && (
        <div style={{
          ...styles.statusBanner,
          ...(promotionStatus.canPromote ? styles.statusSuccess : styles.statusWarning)
        }}>
          <div style={styles.statusContent}>
            <strong>Promotion Status:</strong> {promotionStatus.message}
            {promotionStatus.details && (
              <div style={styles.statusDetails}>
                Session: {promotionStatus.session} | Term: {promotionStatus.activeTerm}
                {promotionStatus.promotionCompleted && (
                  <span style={styles.completedBadge}> • PROMOTION COMPLETED</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={styles.filters}>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Current Class:</label>
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            style={styles.select}
            disabled={!isPromotionAllowed}
          >
            <option value="">Select Class</option>
            {Array.isArray(classes) && classes.map(cls => (
              cls && (
                <option key={cls._id || cls.id} value={cls._id || cls.id}>
                  {cls.name || cls.fullName || cls.shortName || 'Unnamed Class'}
                </option>
              )
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
            disabled={!isPromotionAllowed}
          />
        </div>
        
        <div style={styles.filterGroup}>
          <label style={styles.label}>Term:</label>
          <select 
            value={term} 
            onChange={(e) => setTerm(e.target.value)}
            style={styles.select}
            disabled={!isPromotionAllowed}
          >
            <option value="First Term">First Term</option>
            <option value="Second Term">Second Term</option>
            <option value="Third Term">Third Term</option>
          </select>
        </div>
        
        <button 
          onClick={fetchEligibleStudents} 
          disabled={!selectedClass || !session || !term || loading || !isPromotionAllowed}
          style={{
            ...styles.button,
            ...((!selectedClass || !session || !term || loading || !isPromotionAllowed) ? styles.buttonDisabled : {})
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
          {messageType === 'success' ? '✅' : '❌'} {message}
        </div>
      )}

      {!isPromotionAllowed && promotionStatus && (
        <div style={styles.warningBox}>
          <h3>⚠️ Promotion Not Available</h3>
          <p>{promotionStatus.message}</p>
          {promotionStatus.details && (
            <div style={styles.warningDetails}>
              <p><strong>Current Status:</strong></p>
              <ul>
                <li>Active Session: {promotionStatus.session || 'None'}</li>
                <li>Active Term: {promotionStatus.activeTerm || 'None'}</li>
                <li>Promotion Completed: {promotionStatus.promotionCompleted ? 'Yes' : 'No'}</li>
                <li>Is Third Term: {promotionStatus.details.isThirdTerm ? 'Yes' : 'No'}</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {Array.isArray(eligibilityResults) && eligibilityResults.length > 0 && isPromotionAllowed && (
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
                    <div key={result.student._id || result.student.id || index} style={styles.studentItem}>
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(result.student._id || result.student.id)}
                        onChange={() => handleStudentSelection(result.student._id || result.student.id)}
                        style={styles.checkbox}
                      />
                      <div style={styles.studentInfo}>
                        <span style={styles.studentName}>
                          {result.student.name || result.student.username || 'Unknown Student'}
                        </span>
                        <span style={styles.studentId}>
                          ({result.student.studentId || result.student.id || 'No ID'})
                        </span>
                        {result.details && (
                          <div style={styles.performanceDetails}>
                            <span>Score: {result.details.finalScore || result.details.score || 0}%</span>
                            <span>Attendance: {result.details.attendancePercentage || result.details.attendance || 0}%</span>
                            <span>Passing: {result.details.passingGrade || 60}%</span>
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
                    <div key={result.student._id || result.student.id || index} style={styles.studentItem}>
                      <div style={styles.studentInfo}>
                        <span style={styles.studentName}>
                          {result.student.name || result.student.username || 'Unknown Student'}
                        </span>
                        <span style={styles.studentId}>
                          ({result.student.studentId || result.student.id || 'No ID'})
                        </span>
                        <div style={styles.ineligibleReason}>
                          <strong>Reason:</strong> {result.reason || 'Not eligible'}
                          {result.details && (
                            <div style={styles.performanceDetails}>
                              <span>Score: {result.details.finalScore || result.details.score || 0}%</span>
                              <span>Attendance: {result.details.attendancePercentage || result.details.attendance || 0}%</span>
                              <span>Required: {result.details.passingGrade || 60}% score, {result.details.minAttendance || 75}% attendance</span>
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
                      .filter(cls => cls && (cls._id !== selectedClass && cls.id !== selectedClass))
                      .map(cls => (
                        <option key={cls._id || cls.id} value={cls._id || cls.id}>
                          {cls.name || cls.fullName || cls.shortName || 'Unnamed Class'}
                        </option>
                      ))
                    }
                  </select>
                </div>
                
                <div style={styles.promotionActions}>
                  <button 
                    onClick={handleSelectAll}
                    style={styles.secondaryButton}
                    disabled={eligibleStudents.length === 0}
                  >
                    Select All Eligible
                  </button>
                  
                  <button 
                    onClick={handleClearSelection}
                    style={styles.secondaryButton}
                    disabled={selectedStudents.length === 0}
                  >
                    Clear Selection
                  </button>
                  
                  <button 
                    onClick={confirmPromotion}
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
                  From: {selectedClassObj.name || selectedClassObj.fullName} → To: {targetClassObj.name || targetClassObj.fullName}<br />
                  Session: {session} | Term: {term}<br />
                  Students: {selectedStudents.length} selected
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {Array.isArray(eligibilityResults) && eligibilityResults.length === 0 && !loading && selectedClass && isPromotionAllowed && (
        <div style={styles.noResults}>
          <p>No students found or no academic records available for the selected criteria.</p>
          <p><small>Try selecting a different class, session, or term.</small></p>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Confirm Promotion</h3>
            <p>Are you sure you want to promote {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} from {getClassName(selectedClass)} to {getClassName(targetClass)}?</p>
            <p style={styles.warningText}>This action cannot be undone.</p>
            <div style={styles.modalActions}>
              <button 
                onClick={() => setShowConfirmation(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button 
                onClick={handlePromoteStudents}
                style={styles.confirmButton}
                disabled={promotionLoading}
              >
                {promotionLoading ? 'Promoting...' : 'Confirm Promotion'}
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
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: '#F8F9FA',
    minHeight: '100vh',
    fontFamily: 'sans-serif'
  },
  title: {
    textAlign: 'center',
    color: '#4B5320',
    marginBottom: '30px',
    fontSize: '2rem',
    fontWeight: 'bold'
  },
  statusBanner: {
    padding: '16px',
    marginBottom: '25px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  statusSuccess: {
    backgroundColor: '#E6FFE6',
    color: '#228B22',
    border: '1px solid #c3e6cb'
  },
  statusWarning: {
    backgroundColor: '#FFF3CD',
    color: '#856404',
    border: '1px solid #ffeaa7'
  },
  statusContent: {
    flex: 1
  },
  statusDetails: {
    fontSize: '12px',
    marginTop: '8px',
    opacity: 0.8
  },
  completedBadge: {
    backgroundColor: '#dc3545',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 'bold'
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    border: '1px solid #FFEAA7',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '25px',
    color: '#856404'
  },
  warningDetails: {
    marginTop: '15px',
    fontSize: '14px'
  },
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    marginBottom: '25px',
    alignItems: 'flex-end',
    padding: '25px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #D3D3D3'
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
    color: '#4B5320'
  },
  select: {
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #D3D3D3',
    fontSize: '14px',
    backgroundColor: 'white',
    transition: 'border-color 0.2s',
    outline: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  input: {
    padding: '12px 16px',
    borderRadius: '6px',
    border: '1px solid #D3D3D3',
    fontSize: '14px',
    backgroundColor: 'white',
    transition: 'border-color 0.2s',
    outline: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#D4A017',
    color: '#4B5320',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    height: 'fit-content',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'background-color 0.2s',
    minWidth: '150px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
    cursor: 'not-allowed',
    color: '#6B7280'
  },
  message: {
    padding: '16px',
    margin: '15px 0',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  successMessage: {
    backgroundColor: '#E6FFE6',
    color: '#228B22',
    border: '1px solid #c3e6cb'
  },
  errorMessage: {
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    border: '1px solid #f5c6cb'
  },
  resultsContainer: {
    marginTop: '25px'
  },
  studentSection: {
    margin: '25px 0',
    border: '1px solid #D3D3D3',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    padding: '20px',
    margin: 0,
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #D3D3D3',
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#4B5320'
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
    color: '#4B5320'
  },
  studentId: {
    color: '#6B7280',
    fontSize: '14px',
    fontWeight: '500'
  },
  performanceDetails: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#6B7280',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  ineligibleReason: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#B22222',
    fontWeight: '500'
  },
  promotionSection: {
    marginTop: '35px',
    padding: '25px',
    backgroundColor: '#e8f4fd',
    borderRadius: '8px',
    border: '1px solid #3498db',
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
    color: '#4B5320',
    fontSize: '16px',
    backgroundColor: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #D4A017'
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
    backgroundColor: '#6B7280',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    minWidth: '140px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  },
  promoteButton: {
    padding: '12px 24px',
    backgroundColor: '#D4A017',
    color: '#4B5320',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '15px',
    transition: 'background-color 0.2s',
    minWidth: '200px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  promotionSummary: {
    marginTop: '20px',
    padding: '18px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #D4A017',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#4B5320'
  },
  noResults: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '8px',
    marginTop: '20px',
    color: '#6B7280',
    fontSize: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #D3D3D3'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    maxWidth: '500px',
    width: '90%'
  },
  warningText: {
    color: '#dc3545',
    fontWeight: 'bold',
    margin: '10px 0'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '20px'
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  confirmButton: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};

export default PromotionPanel;