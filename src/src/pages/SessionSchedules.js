import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const SessionSchedules = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activeSessionTerm, setActiveSessionTerm] = useState(null);
  const [formData, setFormData] = useState({ sessionName: '', isActive: false });
  const [editSession, setEditSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForceDelete, setShowForceDelete] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const hasAdminAccess = user && (user.role === 'admin' || user.role === 'super_admin');

  useEffect(() => {
    if (user) {
      fetchSessions();
      fetchActiveSessionTerm();
    }
  }, [user]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/sessions`, {
        headers: getAuthHeaders(),
      });
      console.log('Sessions fetched successfully:', res.data);
      const sessionsData = res.data.sessions || res.data;
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.statusText || 
                          'Failed to load sessions';
      setError(`Error ${err.response?.status || 'Unknown'}: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSessionTerm = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/sessions/active`, {
        headers: getAuthHeaders(),
      });
      console.log('Active session fetched:', res.data);
      setActiveSessionTerm(res.data);
    } catch (err) {
      console.error('Error fetching active session:', err);
      setActiveSessionTerm(null);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    
    if (!hasAdminAccess) {
      setError('Admin access required.');
      return;
    }

    // Validate session name format
    const sessionNameRegex = /^\d{4}\/\d{4}$/;
    if (!sessionNameRegex.test(formData.sessionName)) {
      setError('Session must be in format: YYYY/YYYY (e.g., 2024/2025)');
      return;
    }

    setActionLoading(true);
    try {
      let response;
      
      if (editSession) {
        response = await axios.put(
          `${API_BASE_URL}/api/sessions/${editSession._id}`, 
          formData, 
          { headers: getAuthHeaders() }
        );
        setSuccess('Session updated successfully.');
        setEditSession(null);
      } else {
        response = await axios.post(
          `${API_BASE_URL}/api/sessions`, 
          formData, 
          { headers: getAuthHeaders() }
        );
        setSuccess('Session created successfully with all three terms.');
      }
      
      console.log('Session operation successful:', response.data);
      setFormData({ sessionName: '', isActive: false });
      await fetchSessions();
      await fetchActiveSessionTerm();
    } catch (err) {
      console.error('Error processing session:', err);
      const errorData = err.response?.data;
      let errorMessage = 'Failed to process session';
      
      if (errorData?.error) {
        errorMessage = errorData.error;
      }
      if (errorData?.details && Array.isArray(errorData.details)) {
        errorMessage += `: ${errorData.details.join(', ')}`;
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      }
      
      setError(`Error ${err.response?.status || 'Unknown'}: ${errorMessage}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateSession = async (sessionId, sessionName) => {
    if (!sessionId) {
      setError('Invalid session ID');
      return;
    }

    setActionLoading(true);
    clearMessages();
    
    try {
      console.log('🔄 Activating session:', { sessionId, sessionName });
      
      const response = await axios.patch(
        `${API_BASE_URL}/api/sessions/${sessionId}/activate`,
        {},
        { headers: getAuthHeaders() }
      );
      
      console.log('✅ Session activated:', response.data);
      setSuccess(`Session "${sessionName}" activated successfully.`);
      await fetchSessions();
      await fetchActiveSessionTerm();
      
    } catch (err) {
      console.error('❌ Error activating session:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      
      const errorData = err.response?.data;
      let errorMessage = 'Failed to activate session';
      
      if (errorData?.error) {
        errorMessage = errorData.error;
      }
      
      if (errorData?.details) {
        if (Array.isArray(errorData.details)) {
          errorMessage += `: ${errorData.details.join(', ')}`;
        } else {
          errorMessage += `: ${errorData.details}`;
        }
      }
      
      if (errorData?.suggestion) {
        errorMessage += `\n\nSuggestion: ${errorData.suggestion}`;
      }
      
      // Try to fix terms if there's a term error
      if (errorMessage.includes('terms') || errorMessage.includes('term')) {
        setError(`Error: ${errorMessage}\n\nTrying to fix terms automatically...`);
        
        try {
          // Attempt to fix terms
          await axios.patch(
            `${API_BASE_URL}/api/sessions/${sessionId}/fix-terms`,
            {},
            { headers: getAuthHeaders() }
          );
          
          // Try activation again after fixing terms
          const retryResponse = await axios.patch(
            `${API_BASE_URL}/api/sessions/${sessionId}/activate`,
            {},
            { headers: getAuthHeaders() }
          );
          
          console.log('✅ Session activated after fixing terms:', retryResponse.data);
          setSuccess(`Session "${sessionName}" activated successfully after fixing terms.`);
          await fetchSessions();
          await fetchActiveSessionTerm();
          return;
          
        } catch (fixError) {
          console.error('Failed to fix terms:', fixError);
          errorMessage += '\n\nAutomatic term fix failed. Please contact administrator.';
        }
      }
      
      setError(`Error activating "${sessionName}": ${errorMessage}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateTerm = async (sessionId, termName, sessionName) => {
    if (!sessionId || !termName) {
      setError('Invalid session ID or term name');
      return;
    }

    setActionLoading(true);
    clearMessages();
    
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/sessions/${sessionId}/terms/${encodeURIComponent(termName)}/activate`,
        {},
        { headers: getAuthHeaders() }
      );
      console.log('Term activated:', response.data);
      setSuccess(`Term ${termName} activated for session "${sessionName}".`);
      await fetchSessions();
      await fetchActiveSessionTerm();
    } catch (err) {
      console.error('Error activating term:', err);
      const errorData = err.response?.data;
      let errorMessage = 'Failed to activate term';
      if (errorData?.error) errorMessage = errorData.error;
      if (errorData?.suggestion) errorMessage += `. ${errorData.suggestion}`;
      setError(`Error ${err.response?.status || 'Unknown'}: ${errorMessage}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Force delete session (bypass dependency checks)
  const handleForceDelete = async (sessionId, sessionName) => {
    setActionLoading(true);
    clearMessages();
    
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/sessions/${sessionId}?force=true`, 
        { headers: getAuthHeaders() }
      );
      console.log('Session force deleted:', response.data);
      setSuccess(`Session "${sessionName}" has been force deleted successfully.`);
      await fetchSessions();
      await fetchActiveSessionTerm();
    } catch (err) {
      console.error('Force delete failed:', err);
      const errorMessage = err.response?.data?.error || 'Force delete failed.';
      setError(`Error: ${errorMessage}`);
    } finally {
      setActionLoading(false);
      setShowForceDelete(null);
    }
  };

  const handleDelete = async (sessionId, sessionName) => {
    if (!sessionId) {
      setError('Invalid session ID');
      return;
    }

    // Regular delete attempt first
    if (!window.confirm(`Are you sure you want to delete session "${sessionName}"?`)) return;
    
    setActionLoading(true);
    clearMessages();
    
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/sessions/${sessionId}`, 
        { headers: getAuthHeaders() }
      );
      console.log('Session deleted:', response.data);
      setSuccess(`Session "${sessionName}" deleted successfully.`);
      await fetchSessions();
      await fetchActiveSessionTerm();
    } catch (err) {
      console.error('Error deleting session:', err);
      const errorData = err.response?.data;
      
      if (errorData?.dependencies) {
        // Show force delete option
        setShowForceDelete({
          sessionId,
          sessionName,
          dependencies: errorData.dependencies
        });
        
        setError(
          `Cannot delete session "${sessionName}". It has:\n` +
          `• ${errorData.dependencies.academicRecords || 0} academic records\n` +
          `• ${errorData.dependencies.tests || 0} tests\n\n` +
          `Use "Force Delete" to remove anyway.`
        );
      } else {
        const errorMessage = errorData?.error || 'Failed to delete session.';
        setError(`Error ${err.response?.status || 'Unknown'}: ${errorMessage}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (session) => {
    if (!session || !session._id) {
      setError('Invalid session data');
      return;
    }

    clearMessages();
    setEditSession(session);
    
    // Extract just the YYYY/YYYY part for editing if session name contains term
    let sessionName = session.sessionName;
    if (sessionName && sessionName.includes(' ')) {
      sessionName = sessionName.split(' ')[0];
    }
    
    setFormData({ 
      sessionName: sessionName, 
      isActive: session.isActive 
    });
  };

  const handleCancelEdit = () => {
    clearMessages();
    setEditSession(null);
    setFormData({ sessionName: '', isActive: false });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatSessionName = (sessionName) => {
    if (!sessionName) return '';
    if (sessionName.includes(' ')) {
      return sessionName.split(' ')[0];
    }
    return sessionName;
  };

  if (loading && sessions.length === 0) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        backgroundColor: '#F8F9FA',
        minHeight: '100vh'
      }}>
        <div style={styles.loadingSpinner}></div>
        <p style={{ color: '#4B5320', marginTop: '16px' }}>Loading sessions...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#F8F9FA', minHeight: '100vh' }}>
      {/* Active Session Display */}
      {activeSessionTerm && activeSessionTerm.session && (
        <div style={styles.activeSessionBanner}>
          <div style={styles.activeSessionContent}>
            <h3 style={styles.activeSessionTitle}>Currently Active</h3>
            <p style={styles.activeSessionText}>
              Session: <strong>{formatSessionName(activeSessionTerm.session.sessionName)}</strong> | 
              Term: <strong>{activeSessionTerm.activeTerm?.term || 'No active term'}</strong>
            </p>
          </div>
        </div>
      )}

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

      {/* Force Delete Confirmation */}
      {showForceDelete && (
        <div style={styles.forceDeleteModal}>
          <div style={styles.forceDeleteContent}>
            <h3 style={styles.forceDeleteTitle}>🚨 Force Delete Session</h3>
            <p style={styles.forceDeleteText}>
              Session "<strong>{showForceDelete.sessionName}</strong>" has:
            </p>
            <ul style={styles.forceDeleteList}>
              <li>📚 {showForceDelete.dependencies.academicRecords || 0} academic records</li>
              <li>📝 {showForceDelete.dependencies.tests || 0} tests</li>
            </ul>
            <p style={styles.forceDeleteWarning}>
              ⚠️ Force deleting will remove the session and ALL associated data permanently!
            </p>
            <div style={styles.forceDeleteActions}>
              <button
                onClick={() => handleForceDelete(showForceDelete.sessionId, showForceDelete.sessionName)}
                disabled={actionLoading}
                style={styles.forceDeleteButton}
              >
                🗑️ Force Delete
              </button>
              <button
                onClick={() => setShowForceDelete(null)}
                disabled={actionLoading}
                style={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Form */}
      {hasAdminAccess && (
        <div style={styles.formSection}>
          <h3 style={styles.sectionTitle}>
            {editSession ? 'Edit Session' : 'Create New Session'}
          </h3>
          
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Session Name *</label>
              <input
                type="text"
                value={formData.sessionName}
                onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
                required
                placeholder="e.g., 2024/2025"
                pattern="^\d{4}\/\d{4}$"
                title="Format: YYYY/YYYY"
                style={styles.input}
                disabled={actionLoading}
              />
              <small style={styles.helperText}>
                Format: YYYY/YYYY (e.g., 2024/2025) - Three terms will be created automatically
              </small>
            </div>
            
            <div style={styles.checkboxGroup}>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                style={styles.checkbox}
                disabled={actionLoading}
              />
              <label style={styles.label}>Set as Active Session</label>
            </div>
            
            <div style={styles.formActions}>
              <button
                type="submit"
                disabled={actionLoading}
                style={{
                  ...styles.primaryButton,
                  ...(actionLoading ? styles.disabledButton : {})
                }}
              >
                {actionLoading ? 'Processing...' : (editSession ? 'Update Session' : 'Create Session')}
              </button>
              {editSession && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={actionLoading}
                  style={styles.secondaryButton}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Sessions List */}
      <div style={styles.sessionsSection}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>
            All Sessions ({sessions.length})
            {!hasAdminAccess && <span style={styles.viewOnlyBadge}>View Only</span>}
          </h3>
          {sessions.length > 0 && (
            <button 
              onClick={fetchSessions} 
              disabled={loading}
              style={styles.refreshButton}
            >
              ↻ Refresh
            </button>
          )}
        </div>
        
        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.loadingSpinner}></div>
            <p>Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyStateIcon}>📚</div>
            <h4 style={styles.emptyStateTitle}>No Sessions Found</h4>
            <p style={styles.emptyStateText}>
              {hasAdminAccess 
                ? 'Create your first session to get started.' 
                : 'No sessions have been created yet.'}
            </p>
          </div>
        ) : (
          <div style={styles.sessionsGrid}>
            {sessions.map((session) => (
              <div key={session._id} style={{
                ...styles.sessionCard,
                ...(session.isActive ? styles.activeSessionCard : {})
              }}>
                <div style={styles.sessionHeader}>
                  <div style={styles.sessionTitle}>
                    <h4 style={styles.sessionName}>
                      {formatSessionName(session.sessionName)}
                      {session.isActive && <span style={styles.activeBadge}>Active</span>}
                    </h4>
                  </div>
                  {hasAdminAccess && (
                    <div style={styles.sessionActions}>
                      <button
                        onClick={() => handleEdit(session)}
                        disabled={actionLoading}
                        style={styles.editButton}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(session._id, formatSessionName(session.sessionName))}
                        disabled={actionLoading || session.isActive}
                        style={{
                          ...styles.deleteButton,
                          ...((actionLoading || session.isActive) ? styles.disabledButton : {})
                        }}
                        title={session.isActive ? 'Cannot delete active session' : 'Delete session'}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Session Activation */}
                {hasAdminAccess && (
                  <div style={styles.activationSection}>
                    {!session.isActive ? (
                      <button
                        onClick={() => handleActivateSession(session._id, formatSessionName(session.sessionName))}
                        disabled={actionLoading}
                        style={styles.activateButton}
                      >
                        Activate Session
                      </button>
                    ) : (
                      <span style={styles.activeText}>✓ Session Active</span>
                    )}
                  </div>
                )}

                {/* Terms List */}
                <div style={styles.termsSection}>
                  <h5 style={styles.termsTitle}>Terms:</h5>
                  <div style={styles.termsList}>
                    {session.terms && session.terms.map((term) => (
                      <div key={term.name} style={{
                        ...styles.termItem,
                        ...(term.isActive ? styles.activeTermItem : {})
                      }}>
                        <span style={styles.termName}>{term.name}</span>
                        <div style={styles.termActions}>
                          {term.isActive ? (
                            <span style={styles.activeTermBadge}>Active</span>
                          ) : hasAdminAccess && session.isActive ? (
                            <button
                              onClick={() => handleActivateTerm(session._id, term.name, formatSessionName(session.sessionName))}
                              disabled={actionLoading}
                              style={styles.activateTermButton}
                            >
                              Activate
                            </button>
                          ) : session.isActive ? (
                            <span style={styles.inactiveText}>Admin required</span>
                          ) : (
                            <span style={styles.inactiveText}>Activate session first</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Session Statistics */}
                {session.statistics && (
                  <div style={styles.statisticsSection}>
                    <h5 style={styles.statisticsTitle}>Statistics:</h5>
                    <div style={styles.statisticsGrid}>
                      <div style={styles.statItem}>
                        <span style={styles.statLabel}>Academic Records:</span>
                        <span style={styles.statValue}>{session.statistics.academicRecords || 0}</span>
                      </div>
                      <div style={styles.statItem}>
                        <span style={styles.statLabel}>Tests:</span>
                        <span style={styles.statValue}>{session.statistics.tests || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  activeSessionBanner: {
    backgroundColor: '#E6FFE6',
    border: '1px solid #228B22',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(34, 139, 34, 0.1)'
  },
  activeSessionContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  activeSessionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#228B22',
    margin: 0
  },
  activeSessionText: {
    fontSize: '14px',
    color: '#4B5320',
    margin: 0,
    fontWeight: '500'
  },
  errorMessage: {
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    borderLeft: '4px solid #B22222',
    padding: '15px',
    marginBottom: '20px',
    borderRadius: '4px',
    fontSize: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(178, 34, 34, 0.1)'
  },
  successMessage: {
    backgroundColor: '#E6FFE6',
    color: '#228B22',
    borderLeft: '4px solid #228B22',
    padding: '15px',
    marginBottom: '20px',
    borderRadius: '4px',
    fontSize: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(34, 139, 34, 0.1)'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0 5px',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '24px',
    border: '1px solid #E5E7EB'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#4B5320',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  viewOnlyBadge: {
    fontSize: '12px',
    backgroundColor: '#6B7280',
    color: '#FFFFFF',
    padding: '4px 8px',
    borderRadius: '12px',
    fontWeight: '500'
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#F8F9FA',
    color: '#4B5320',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    color: '#4B5320',
    fontSize: '14px',
    fontWeight: '500'
  },
  input: {
    padding: '12px',
    border: '1px solid #D3D3D3',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#F8F9FA',
    transition: 'border-color 0.2s'
  },
  helperText: {
    color: '#6B7280',
    fontSize: '12px',
    lineHeight: '1.4'
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    marginRight: '8px'
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  primaryButton: {
    padding: '12px 24px',
    backgroundColor: '#D4A017',
    color: '#4B5320',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '140px'
  },
  secondaryButton: {
    padding: '12px 24px',
    backgroundColor: '#6B7280',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
    color: '#9CA3AF',
    cursor: 'not-allowed',
    opacity: 0.6
  },
  sessionsSection: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #E5E7EB'
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
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #D4A017',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
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
  emptyStateIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  emptyStateTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4B5320',
    margin: 0
  },
  emptyStateText: {
    fontSize: '14px',
    lineHeight: '1.5',
    maxWidth: '400px',
    margin: 0
  },
  sessionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '20px'
  },
  sessionCard: {
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '20px',
    backgroundColor: '#F8F9FA',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  activeSessionCard: {
    borderColor: '#D4A017',
    backgroundColor: '#FFFBF0',
    boxShadow: '0 4px 12px rgba(212, 160, 23, 0.15)'
  },
  sessionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px'
  },
  sessionTitle: {
    flex: 1
  },
  sessionName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  activeBadge: {
    fontSize: '12px',
    backgroundColor: '#228B22',
    color: '#FFFFFF',
    padding: '4px 8px',
    borderRadius: '12px',
    fontWeight: '500'
  },
  sessionActions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0
  },
  editButton: {
    padding: '6px 12px',
    backgroundColor: '#D4A017',
    color: '#4B5320',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  deleteButton: {
    padding: '6px 12px',
    backgroundColor: '#B22222',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  activationSection: {
    padding: '12px',
    backgroundColor: '#FFFFFF',
    borderRadius: '6px',
    border: '1px solid #E5E7EB',
    textAlign: 'center'
  },
  activateButton: {
    padding: '8px 16px',
    backgroundColor: '#228B22',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    width: '100%'
  },
  activeText: {
    color: '#228B22',
    fontSize: '14px',
    fontWeight: '500'
  },
  termsSection: {
    borderTop: '1px solid #E5E7EB',
    paddingTop: '16px'
  },
  termsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 12px 0'
  },
  termsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  termItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#FFFFFF',
    borderRadius: '6px',
    border: '1px solid #E5E7EB',
    transition: 'all 0.2s'
  },
  activeTermItem: {
    borderColor: '#228B22',
    backgroundColor: '#E6FFE6'
  },
  termName: {
    fontSize: '14px',
    color: '#4B5320',
    fontWeight: '500'
  },
  termActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0
  },
  activeTermBadge: {
    fontSize: '12px',
    backgroundColor: '#228B22',
    color: '#FFFFFF',
    padding: '4px 8px',
    borderRadius: '12px',
    fontWeight: '500'
  },
  activateTermButton: {
    padding: '6px 12px',
    backgroundColor: '#D4A017',
    color: '#4B5320',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  inactiveText: {
    fontSize: '12px',
    color: '#6B7280',
    fontStyle: 'italic',
    whiteSpace: 'nowrap'
  },
  statisticsSection: {
    borderTop: '1px solid #E5E7EB',
    paddingTop: '16px'
  },
  statisticsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 8px 0'
  },
  statisticsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '8px'
  },
  statItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0'
  },
  statLabel: {
    fontSize: '12px',
    color: '#6B7280'
  },
  statValue: {
    fontSize: '12px',
    color: '#4B5320',
    fontWeight: '600'
  },
  // Force Delete Modal Styles
  forceDeleteModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  forceDeleteContent: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    maxWidth: '500px',
    width: '90%'
  },
  forceDeleteTitle: {
    color: '#B22222',
    margin: '0 0 16px 0',
    fontSize: '18px'
  },
  forceDeleteText: {
    margin: '0 0 12px 0',
    fontSize: '14px'
  },
  forceDeleteList: {
    margin: '0 0 16px 20px',
    fontSize: '14px'
  },
  forceDeleteWarning: {
    color: '#B22222',
    fontWeight: 'bold',
    fontSize: '14px',
    margin: '0 0 20px 0'
  },
  forceDeleteActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  forceDeleteButton: {
    padding: '10px 16px',
    backgroundColor: '#B22222',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  cancelButton: {
    padding: '10px 16px',
    backgroundColor: '#6B7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  }
};

// Add CSS animations
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  styleSheet.insertRule(`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `, styleSheet.cssRules.length);
}

// Add hover effects
Object.assign(styles.primaryButton, {
  ':hover': {
    backgroundColor: '#C19115',
    transform: 'translateY(-1px)'
  }
});

Object.assign(styles.secondaryButton, {
  ':hover': {
    backgroundColor: '#4B5563',
    transform: 'translateY(-1px)'
  }
});

Object.assign(styles.refreshButton, {
  ':hover': {
    backgroundColor: '#E5E7EB',
    transform: 'translateY(-1px)'
  }
});

Object.assign(styles.editButton, {
  ':hover': {
    backgroundColor: '#C19115',
    transform: 'translateY(-1px)'
  }
});

Object.assign(styles.deleteButton, {
  ':hover': {
    backgroundColor: '#9B1C1C',
    transform: 'translateY(-1px)'
  }
});

Object.assign(styles.activateButton, {
  ':hover': {
    backgroundColor: '#1E7B1E',
    transform: 'translateY(-1px)'
  }
});

Object.assign(styles.activateTermButton, {
  ':hover': {
    backgroundColor: '#C19115',
    transform: 'translateY(-1px)'
  }
});

Object.assign(styles.forceDeleteButton, {
  ':hover': {
    backgroundColor: '#9B1C1C',
    transform: 'translateY(-1px)'
  }
});

Object.assign(styles.cancelButton, {
  ':hover': {
    backgroundColor: '#4B5563',
    transform: 'translateY(-1px)'
  }
});

Object.assign(styles.sessionCard, {
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  }
});

export default SessionSchedules;