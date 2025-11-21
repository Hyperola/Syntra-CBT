import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const SessionSchedules = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [formData, setFormData] = useState({ sessionName: '', isActive: false });
  const [editSession, setEditSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Check if user has admin privileges (admin or super_admin)
  const hasAdminAccess = user && (user.role === 'admin' || user.role === 'super_admin');

  console.log('SessionSchedules - User:', user, 'Has Admin Access:', hasAdminAccess);

  useEffect(() => {
    if (hasAdminAccess) {
      fetchSessions();
    }
  }, [hasAdminAccess]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    console.log('Using token for request:', token ? 'Present' : 'Missing');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching sessions...');
      const res = await axios.get('https://waec-gfv0.onrender.com/api/sessions', {
        headers: getAuthHeaders(),
      });
      console.log('Sessions fetched successfully:', res.data);
      // Handle both paginated and flat responses
      const sessionsData = res.data.sessions || res.data;
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.statusText || 
                          'Failed to load sessions';
      setError(`Error ${err.response?.status}: ${errorMessage}`);
      
      // If token might be invalid, try to refresh
      if (err.response?.status === 403 || err.response?.status === 401) {
        setError('Authentication failed. Please try logging in again.');
      }
    }
    setLoading(false);
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
    const sessionNameRegex = /^\d{4}\/\d{4} (First|Second|Third) Term$/;
    if (!sessionNameRegex.test(formData.sessionName)) {
      setError('Session must be in format: YYYY/YYYY First|Second|Third Term (e.g., 2024/2025 First Term)');
      return;
    }

    setActionLoading(true);
    try {
      console.log('Submitting session:', formData);
      
      if (editSession) {
        const response = await axios.put(
          `https://waec-gfv0.onrender.com/api/sessions/${editSession._id}`, 
          formData, 
          { headers: getAuthHeaders() }
        );
        console.log('Update response:', response.data);
        setSuccess('Session updated successfully.');
        setEditSession(null);
      } else {
        const response = await axios.post(
          'https://waec-gfv0.onrender.com/api/sessions', 
          formData, 
          { headers: getAuthHeaders() }
        );
        console.log('Create response:', response.data);
        setSuccess('Session created successfully.');
      }
      setFormData({ sessionName: '', isActive: false });
      fetchSessions();
    } catch (err) {
      console.error('Error processing session:', err);
      const errorData = err.response?.data;
      
      let errorMessage = 'Failed to process session';
      if (errorData?.error) {
        errorMessage = errorData.error;
      } else if (errorData?.details?.[0]) {
        errorMessage = errorData.details[0];
      } else if (err.response?.statusText) {
        errorMessage = err.response.statusText;
      }
      
      setError(`Error ${err.response?.status || 'Unknown'}: ${errorMessage}`);
    }
    setActionLoading(false);
  };

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    
    setActionLoading(true);
    clearMessages();
    
    try {
      console.log('Deleting session:', sessionId);
      await axios.delete(
        `https://waec-gfv0.onrender.com/api/sessions/${sessionId}`, 
        { headers: getAuthHeaders() }
      );
      setSuccess('Session deleted successfully.');
      fetchSessions();
    } catch (err) {
      console.error('Error deleting session:', err);
      const errorData = err.response?.data;
      if (errorData?.dependencies) {
        setError(`Cannot delete session. It has ${errorData.dependencies.academicRecords} academic records and ${errorData.dependencies.tests} tests.`);
      } else {
        setError(errorData?.error || err.response?.statusText || 'Failed to delete session.');
      }
    }
    setActionLoading(false);
  };

  const handleEdit = (session) => {
    clearMessages();
    setEditSession(session);
    setFormData({ 
      sessionName: session.sessionName, 
      isActive: session.isActive 
    });
  };

  const handleCancelEdit = () => {
    clearMessages();
    setEditSession(null);
    setFormData({ sessionName: '', isActive: false });
  };

  // Debug panel (remove in production)
  const DebugPanel = () => (
    <div style={{ 
      backgroundColor: '#f8f9fa', 
      border: '1px solid #dee2e6', 
      borderRadius: '4px', 
      padding: '10px', 
      marginBottom: '20px',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <strong>Debug Info:</strong>
      <div>User Role: {user?.role}</div>
      <div>Has Admin Access: {hasAdminAccess ? 'Yes' : 'No'}</div>
      <div>Token: {localStorage.getItem('token') ? 'Present' : 'Missing'}</div>
      <div>Sessions Count: {sessions.length}</div>
    </div>
  );

  if (loading) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p style={{ color: '#FFFFFF', backgroundColor: '#4B5320', padding: '20px', fontFamily: 'sans-serif', fontSize: '16px' }}>
        Loading sessions...
      </p>
    </div>
  );

  if (!hasAdminAccess) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ 
          padding: '20px', 
          color: '#B22222', 
          backgroundColor: '#FFF3F3', 
          fontFamily: 'sans-serif', 
          fontSize: '16px',
          border: '1px solid #B22222',
          borderRadius: '4px'
        }}>
          ❌ Admin access required. Your role: <strong>{user?.role || 'unknown'}</strong>
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Remove DebugPanel in production */}
      <DebugPanel />

      {error && (
        <div style={{ 
          backgroundColor: '#FFF3F3', 
          color: '#B22222', 
          borderLeft: '4px solid #B22222', 
          padding: '15px', 
          marginBottom: '20px', 
          fontFamily: 'sans-serif', 
          borderRadius: '4px', 
          fontSize: '14px',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <span>❌ {error}</span>
          <button 
            onClick={clearMessages} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#B22222', 
              cursor: 'pointer', 
              fontSize: '16px',
              padding: '0 5px'
            }}
          >
            ×
          </button>
        </div>
      )}
      
      {success && (
        <div style={{ 
          backgroundColor: '#E6FFE6', 
          color: '#228B22', 
          borderLeft: '4px solid #228B22', 
          padding: '15px', 
          marginBottom: '20px', 
          fontFamily: 'sans-serif', 
          borderRadius: '4px', 
          fontSize: '14px',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <span>✅ {success}</span>
          <button 
            onClick={clearMessages} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#228B22', 
              cursor: 'pointer', 
              fontSize: '16px',
              padding: '0 5px'
            }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ 
        marginBottom: '20px', 
        padding: '10px', 
        backgroundColor: '#e7f3ff', 
        border: '1px solid #b3d9ff', 
        borderRadius: '4px' 
      }}>
        <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: '14px', color: '#0066cc' }}>
          👋 Welcome, <strong>{user?.name}</strong>! Role: <strong>{user?.role}</strong>
        </p>
      </div>

      <h3 style={{ 
        fontSize: '20px', 
        fontWeight: 'bold', 
        color: '#FFFFFF', 
        fontFamily: 'sans-serif', 
        backgroundColor: '#4B5320', 
        padding: '10px', 
        borderRadius: '4px', 
        marginBottom: '20px' 
      }}>
        {editSession ? 'Edit Session' : 'Create New Session'}
      </h3>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px', marginBottom: '5px' }}>
            Session Name *
          </label>
          <input
            type="text"
            value={formData.sessionName}
            onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
            required
            placeholder="e.g., 2024/2025 First Term"
            pattern="^\d{4}\/\d{4} (First|Second|Third) Term$"
            title="Format: YYYY/YYYY First|Second|Third Term"
            style={{ padding: '8px', border: '1px solid #000000', borderRadius: '4px', width: '100%', fontFamily: 'sans-serif', fontSize: '14px', backgroundColor: '#F5F5F5', color: '#000000' }}
          />
          <small style={{ color: '#666', fontSize: '12px', fontFamily: 'sans-serif' }}>
            Format: YYYY/YYYY First|Second|Third Term (e.g., 2024/2025 First Term)
          </small>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            style={{ width: '18px', height: '18px' }}
          />
          <label style={{ color: '#4B5320', fontFamily: 'sans-serif', fontSize: '14px' }}>
            Set as Active Session
          </label>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            disabled={actionLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#D4A017',
              color: '#000000',
              border: '1px solid #000000',
              borderRadius: '6px',
              fontFamily: 'sans-serif',
              fontSize: '14px',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              opacity: actionLoading ? 0.5 : 1,
            }}
          >
            {actionLoading ? 'Processing...' : (editSession ? 'Update Session' : 'Create Session')}
          </button>
          {editSession && (
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={actionLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#FFFFFF',
                color: '#000000',
                border: '1px solid #000000',
                borderRadius: '6px',
                fontFamily: 'sans-serif',
                fontSize: '14px',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: actionLoading ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <h3 style={{ 
        fontSize: '20px', 
        fontWeight: 'bold', 
        color: '#FFFFFF', 
        fontFamily: 'sans-serif', 
        backgroundColor: '#4B5320', 
        padding: '10px', 
        borderRadius: '4px', 
        marginBottom: '20px' 
      }}>
        All Sessions ({sessions.length})
      </h3>
      
      {sessions.length === 0 && !loading ? (
        <p style={{ textAlign: 'center', color: '#666', fontFamily: 'sans-serif', padding: '20px' }}>
          No sessions found. Create your first session above.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E0E0E0' }}>
            <thead>
              <tr style={{ backgroundColor: '#4B5320', color: '#FFFFFF', fontFamily: 'sans-serif', fontSize: '12px' }}>
                <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Session Name</th>
                <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Status</th>
                <th style={{ border: '1px solid #E0E0E0', padding: '8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session._id} style={{ 
                  color: '#000000', 
                  fontFamily: 'sans-serif', 
                  fontSize: '12px',
                  backgroundColor: session.isActive ? '#F0FFF0' : 'transparent'
                }}>
                  <td style={{ border: '1px solid #E0E0E0', padding: '8px', fontWeight: session.isActive ? 'bold' : 'normal' }}>
                    {session.sessionName}
                    {session.isActive && (
                      <span style={{ color: '#228B22', fontSize: '10px', marginLeft: '8px' }}>(Active)</span>
                    )}
                  </td>
                  <td style={{ border: '1px solid #E0E0E0', padding: '8px' }}>
                    {session.isActive ? '🟢 Active' : '⚪ Inactive'}
                  </td>
                  <td style={{ border: '1px solid #E0E0E0', padding: '8px', display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => handleEdit(session)}
                      disabled={actionLoading}
                      style={{ 
                        color: '#000000', 
                        backgroundColor: '#D4A017', 
                        fontFamily: 'sans-serif', 
                        fontSize: '12px', 
                        padding: '5px 10px', 
                        border: '1px solid #000000', 
                        borderRadius: '4px', 
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        opacity: actionLoading ? 0.5 : 1
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(session._id)}
                      disabled={actionLoading || session.isActive}
                      style={{ 
                        color: '#FFFFFF', 
                        backgroundColor: session.isActive ? '#666' : '#B22222', 
                        fontFamily: 'sans-serif', 
                        fontSize: '12px', 
                        padding: '5px 10px', 
                        border: '1px solid #000000', 
                        borderRadius: '4px', 
                        cursor: (actionLoading || session.isActive) ? 'not-allowed' : 'pointer',
                        opacity: (actionLoading || session.isActive) ? 0.5 : 1
                      }}
                      title={session.isActive ? 'Cannot delete active session' : 'Delete session'}
                    >
                      Delete
                    </button>
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

export default SessionSchedules;