// pages/EditClass.js
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiArrowLeft, FiSave, FiX, FiAlertCircle, FiCheckCircle,
  FiUser, FiBook, FiCalendar, FiUsers, FiRefreshCw
} from 'react-icons/fi';

const EditClass = () => {
  const { classId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    level: 'JSS1',
    stream: '',
    capacity: 40,
    classTeacherId: '',
    academicYear: '',
    displayOrder: 0,
    isActive: true
  });
  
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const levels = ['JSS1', 'JSS2', 'JSS3', 'SSS1', 'SSS2', 'SSS3'];

  // Debug helper
  const debugApiResponse = (data, endpoint) => {
    console.log(`🔍 DEBUG ${endpoint}:`, {
      'Type of data': typeof data,
      'Is Array?': Array.isArray(data),
      'Keys': data ? Object.keys(data) : 'No data',
      'Full response': data
    });
  };

  // Fetch class details and teachers
  useEffect(() => {
    fetchClassDetails();
    fetchTeachers();
  }, [classId]);

  const fetchClassDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/classes/${classId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Class details response:', response.data);
      
      const classData = response.data.class || response.data;
      setFormData({
        name: classData.name || '',
        shortName: classData.shortName || '',
        level: classData.level || 'JSS1',
        stream: classData.stream || '',
        capacity: classData.capacity || 40,
        classTeacherId: classData.classTeacher?._id || classData.classTeacher || '',
        academicYear: classData.academicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        displayOrder: classData.displayOrder || 0,
        isActive: classData.isActive !== false
      });
      
    } catch (err) {
      console.error('Error fetching class details:', err);
      setError(err.response?.data?.error || 'Failed to load class details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      console.log('Fetching teachers...');
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/api/users?role=teacher',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      debugApiResponse(response.data, 'Teachers API');
      
      // Handle different response structures
      let teachersData = [];
      if (Array.isArray(response.data)) {
        teachersData = response.data;
      } else if (response.data && response.data.users) {
        teachersData = response.data.users;
      } else if (response.data && Array.isArray(response.data.data)) {
        teachersData = response.data.data;
      }
      
      console.log('Teachers data processed:', teachersData);
      setTeachers(teachersData);
      
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
      setTeachers([]); // Set empty array on error
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/classes/${classId}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Class updated successfully');
      setTimeout(() => {
        navigate(`/admin/classes/${classId}`);
      }, 1500);
      
    } catch (err) {
      console.error('Update class error:', err);
      setError(err.response?.data?.error || 'Failed to update class');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshTeachers = async () => {
    await fetchTeachers();
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Loading class details...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          onClick={() => navigate(`/admin/classes/${classId}`)}
          style={styles.backButton}
        >
          <FiArrowLeft /> Back to Class
        </button>
        
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>Edit Class</h1>
            <p style={styles.subtitle}>Update class information and settings</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={styles.errorMessage}>
          <FiAlertCircle /> {error}
          <button onClick={() => setError(null)} style={styles.closeMessageButton}>
            <FiX />
          </button>
        </div>
      )}
      {success && (
        <div style={styles.successMessage}>
          <FiCheckCircle /> {success}
          <button onClick={() => setSuccess(null)} style={styles.closeMessageButton}>
            <FiX />
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGrid}>
          {/* Basic Information */}
          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>
              <FiBook /> Basic Information
            </h3>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Class Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="e.g., JSS1 A"
                  style={styles.formInput}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Short Name *</label>
                <input
                  type="text"
                  value={formData.shortName}
                  onChange={(e) => setFormData({...formData, shortName: e.target.value})}
                  required
                  placeholder="e.g., J1A"
                  style={styles.formInput}
                />
              </div>
            </div>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Level *</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({...formData, level: e.target.value})}
                  required
                  style={styles.formInput}
                >
                  {levels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Stream</label>
                <input
                  type="text"
                  value={formData.stream}
                  onChange={(e) => setFormData({...formData, stream: e.target.value})}
                  placeholder="e.g., Science, Arts"
                  style={styles.formInput}
                />
              </div>
            </div>
          </div>

          {/* Class Details */}
          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>
              <FiUsers /> Class Details
            </h3>
            
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Capacity</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 40})}
                  min="1"
                  max="100"
                  style={styles.formInput}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Display Order</label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value) || 0})}
                  style={styles.formInput}
                />
              </div>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Academic Year</label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={(e) => setFormData({...formData, academicYear: e.target.value})}
                placeholder="e.g., 2024/2025"
                style={styles.formInput}
              />
            </div>
          </div>

          {/* Class Teacher */}
          <div style={styles.formSection}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>
                <FiUser /> Class Teacher
              </h3>
              <button
                type="button"
                onClick={handleRefreshTeachers}
                style={styles.refreshSmallButton}
              >
                <FiRefreshCw /> Refresh
              </button>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Assign Class Teacher</label>
              <select
                value={formData.classTeacherId}
                onChange={(e) => setFormData({...formData, classTeacherId: e.target.value})}
                style={styles.formInput}
              >
                <option value="">No Class Teacher</option>
                {Array.isArray(teachers) && teachers.length > 0 ? (
                  teachers.map(teacher => (
                    <option key={teacher._id || teacher.id} value={teacher._id || teacher.id}>
                      {teacher.firstName || teacher.name} {teacher.lastName || teacher.surname || ''}
                      {teacher.username ? ` (${teacher.username})` : ''}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading teachers...</option>
                )}
              </select>
              <p style={styles.helperText}>
                {Array.isArray(teachers) 
                  ? `${teachers.length} teachers available` 
                  : 'No teachers available'}
              </p>
            </div>
          </div>

          {/* Status */}
          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>
              <FiCalendar /> Status
            </h3>
            
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Class Status</label>
              <select
                value={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})}
                style={styles.formInput}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div style={styles.formActions}>
          <button
            type="button"
            onClick={() => navigate(`/admin/classes/${classId}`)}
            style={styles.cancelButton}
          >
            <FiX /> Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={styles.submitButton}
          >
            {saving ? (
              <>
                <div style={styles.savingSpinner}></div> Saving...
              </>
            ) : (
              <>
                <FiSave /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F8F9FA',
    padding: '24px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: '#4B5320'
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  savingSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid #f3f3f3',
    borderTop: '2px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px',
    display: 'inline-block'
  },
  header: {
    marginBottom: '24px'
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
    textDecoration: 'none'
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2D3748',
    margin: '0 0 8px 0'
  },
  subtitle: {
    color: '#718096',
    margin: 0,
    fontSize: '16px'
  },
  errorMessage: {
    backgroundColor: '#FFF5F5',
    color: '#C53030',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  },
  successMessage: {
    backgroundColor: '#F0FFF4',
    color: '#276749',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  },
  closeMessageButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center'
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  formGrid: {
    display: 'grid',
    gap: '32px',
    marginBottom: '32px'
  },
  formSection: {
    paddingBottom: '24px',
    borderBottom: '1px solid #E2E8F0'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#4B5320',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  formLabel: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#4A5568',
    fontSize: '14px'
  },
  formInput: {
    width: '100%',
    padding: '12px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'border-color 0.2s'
  },
  helperText: {
    marginTop: '4px',
    fontSize: '12px',
    color: '#718096'
  },
  refreshSmallButton: {
    padding: '8px 12px',
    backgroundColor: '#EDF2F7',
    color: '#4A5568',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#6B7280',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  },
  submitButton: {
    padding: '12px 24px',
    backgroundColor: '#D4A017',
    color: '#4B5320',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E0',
    color: '#718096',
    cursor: 'not-allowed'
  }
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  select.formInput:focus,
  input.formInput:focus {
    outline: none;
    border-color: #D4A017;
    box-shadow: 0 0 0 3px rgba(212, 160, 23, 0.1);
  }
`;
document.head.appendChild(styleSheet);

export default EditClass;