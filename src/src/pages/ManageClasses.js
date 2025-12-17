// pages/ManageClasses.js - UPDATED WITH DELETE FUNCTIONALITY
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiEye,
  FiUsers,
  FiBook,
  FiSearch,
  FiTrash2,
  FiEdit,
  FiPlus,
  FiRefreshCw,
  FiUserPlus,
  FiBookOpen,
  FiChevronDown,
  FiChevronUp,
  FiX,
  FiUser,
  FiCalendar,
  FiLoader,
  FiLink,
  FiLink2
} from 'react-icons/fi';

const ManageClasses = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(location.state?.success || null);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [expandedClass, setExpandedClass] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignSubjectsModal, setShowAssignSubjectsModal] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [assignSubjectsLoading, setAssignSubjectsLoading] = useState(false);
  const [newClassData, setNewClassData] = useState({
    name: '',
    shortName: '',
    level: 'JSS1',
    stream: '',
    capacity: 40,
    classTeacherId: ''
  });

  const levels = ['JSS1', 'JSS2', 'JSS3', 'SSS1', 'SSS2', 'SSS3'];

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'teacher')) {
      fetchClasses();
    }
  }, [user]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Classes fetched:', res.data);
      
      let classesData = [];
      if (Array.isArray(res.data)) {
        classesData = res.data;
      } else if (res.data && res.data.classes) {
        classesData = res.data.classes;
      } else if (res.data && Array.isArray(res.data.data)) {
        classesData = res.data.data;
      }
      
      setClasses(classesData);
    } catch (err) {
      console.error('Fetch classes error:', err);
      setError(err.response?.data?.error || 'Failed to load classes');
    }
    setLoading(false);
  };

  const fetchAvailableSubjects = async () => {
    setLoadingSubjects(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/subjects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let subjectsData = [];
      if (Array.isArray(res.data)) {
        subjectsData = res.data;
      } else if (res.data && res.data.subjects) {
        subjectsData = res.data.subjects;
      }
      
      console.log('Available subjects:', subjectsData);
      setAvailableSubjects(subjectsData);
      setSelectedSubjects([]);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setAvailableSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchClassSubjects = async (classId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/classes/${classId}/subjects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data && res.data.subjects) {
        const assignedSubjectIds = res.data.subjects.map(s => s.id);
        setSelectedSubjects(assignedSubjectIds);
      }
    } catch (err) {
      console.error('Error fetching class subjects:', err);
    }
  };

  const handleAssignSubjects = async (classId) => {
    if (selectedSubjects.length === 0) {
      setError('Please select at least one subject');
      return;
    }

    setAssignSubjectsLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/classes/${classId}/subjects`, {
        subjectIds: selectedSubjects,
        isCore: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Subjects assigned to class successfully');
      setShowAssignSubjectsModal(null);
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign subjects');
    } finally {
      setAssignSubjectsLoading(false);
    }
  };

  const handleRemoveSubjectFromClass = async (classId, subjectId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/classes/${classId}/subjects/${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Subject removed from class successfully');
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove subject');
    }
  };

  const toggleSubjectSelection = (subjectId) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };

  // In ManageClasses.js component

const handleDeleteClass = async (classId, className) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`http://localhost:5000/api/classes/${classId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      setSuccess(`Class "${className}" deactivated successfully`);
      setShowDeleteModal(null);
      // Remove the deleted class from state
      setClasses(prevClasses => prevClasses.filter(cls => 
        (cls.id || cls._id) !== classId
      ));
    }
  } catch (err) {
    console.error('Delete class error:', err);
    setError(err.response?.data?.error || 'Failed to delete class. Please try again.');
  }
};

const handleHardDeleteClass = async (classId, className) => {
  if (!window.confirm(`WARNING: This will permanently delete "${className}" and all associated data. This action cannot be undone. Are you sure?`)) {
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`http://localhost:5000/api/classes/${classId}/hard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      setSuccess(`Class "${className}" permanently deleted`);
      // Remove the deleted class from state
      setClasses(prevClasses => prevClasses.filter(cls => 
        (cls.id || cls._id) !== classId
      ));
    }
  } catch (err) {
    console.error('Hard delete class error:', err);
    setError(err.response?.data?.error || 'Failed to permanently delete class.');
  }
};

const handleDeactivateClass = async (classId, className) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.patch(`http://localhost:5000/api/classes/${classId}/deactivate`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      setSuccess(`Class "${className}" deactivated successfully`);
      // Update the class status in state
      setClasses(prevClasses => prevClasses.map(cls => 
        (cls.id || cls._id) === classId ? { ...cls, isActive: false } : cls
      ));
      setShowDeleteModal(null);
    }
  } catch (err) {
    console.error('Deactivate class error:', err);
    setError(err.response?.data?.error || 'Failed to deactivate class');
  }
};

const handleReactivateClass = async (classId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.patch(`http://localhost:5000/api/classes/${classId}/reactivate`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      setSuccess('Class reactivated successfully');
      // Update the class status in state
      setClasses(prevClasses => prevClasses.map(cls => 
        (cls.id || cls._id) === classId ? { ...cls, isActive: true } : cls
      ));
    }
  } catch (err) {
    console.error('Reactivate class error:', err);
    setError(err.response?.data?.error || 'Failed to reactivate class');
  }
};

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/classes', newClassData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Class created successfully');
      setShowCreateModal(false);
      setNewClassData({
        name: '',
        shortName: '',
        level: 'JSS1',
        stream: '',
        capacity: 40,
        classTeacherId: ''
      });
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create class');
    }
  };

  // Filter classes
  const filteredClasses = classes.filter(cls => {
    if (!cls) return false;
    
    const className = cls.name || '';
    const fullName = cls.fullName || `${cls.level || ''}${cls.stream ? ` ${cls.stream}` : ''}`;
    
    const matchesSearch = className.toLowerCase().includes(search.toLowerCase()) ||
                         fullName.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = filterLevel === 'all' || cls.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const handleViewClassDetails = (classId) => {
    navigate(`/admin/classes/${classId}`);
  };

  const handleEditClass = (classId) => {
    navigate(`/admin/classes/${classId}/edit`);
  };

  if (!user || !(user.role === 'admin' || user.role === 'super_admin' || user.role === 'teacher')) {
    return (
      <div style={styles.authRequiredContainer}>
        <div style={styles.authErrorMessage}>
          <FiAlertTriangle style={styles.errorIcon} />
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Access Denied</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>You don't have permission to manage classes.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <main style={styles.main}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Manage Classes</h1>
            <p style={styles.subtitle}>
              {user.role === 'teacher' 
                ? 'View and manage your assigned classes' 
                : 'Create, edit, and manage all classes'}
            </p>
          </div>
          
          {(user.role === 'admin' || user.role === 'super_admin') && (
            <button
              style={styles.createButton}
              onClick={() => setShowCreateModal(true)}
            >
              <FiPlus /> Create New Class
            </button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div style={styles.errorMessage}>
            <FiAlertTriangle /> {error}
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

        {/* Filters */}
        <div style={styles.filtersContainer}>
          <div style={styles.searchBox}>
            <FiSearch style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search classes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">All Levels</option>
            {levels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>

          <button
            onClick={fetchClasses}
            style={styles.refreshButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> Loading...
              </>
            ) : (
              <>
                <FiRefreshCw /> Refresh
              </>
            )}
          </button>
        </div>

        {/* Classes Grid */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner}></div>
            <p>Loading classes...</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div style={styles.emptyState}>
            <FiBookOpen style={styles.emptyIcon} />
            <h3>No Classes Found</h3>
            <p>
              {classes.length === 0 ? 'No classes have been created yet.' : 'No classes match your search criteria.'}
            </p>
            {(user.role === 'admin' || user.role === 'super_admin') && (
              <button
                style={styles.createButton}
                onClick={() => setShowCreateModal(true)}
              >
                Create Your First Class
              </button>
            )}
          </div>
        ) : (
          <div style={styles.classesGrid}>
            {filteredClasses.map(cls => {
              if (!cls) return null;
              
              const className = cls.name || 'Unnamed Class';
              const fullName = cls.fullName || `${cls.level || ''}${cls.stream ? ` ${cls.stream}` : ''}`;
              const shortName = cls.shortName || cls.level || '';
              const studentCount = cls.studentCount || 0;
              const subjectCount = cls.subjectCount || (cls.subjectAssignments?.length || 0);
              const capacity = cls.capacity || 40;
              const classId = cls.id || cls._id;
              
              return (
                <div key={classId} style={styles.classCard}>
                  {/* Class Header */}
                  <div style={styles.classHeader} onClick={() => setExpandedClass(expandedClass === classId ? null : classId)}>
                    <div style={styles.classInfo}>
                      <h3 style={styles.className}>{fullName}</h3>
                      <div style={styles.classMeta}>
                        <span style={styles.classShortName}>{shortName}</span>
                        <span style={styles.classStat}>
                          <FiUsers /> {studentCount}/{capacity} students
                        </span>
                        <span style={styles.classStat}>
                          <FiBook /> {subjectCount} subjects
                        </span>
                      </div>
                    </div>
                    <button
                      style={styles.expandButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedClass(expandedClass === classId ? null : classId);
                      }}
                    >
                      {expandedClass === classId ? <FiChevronUp /> : <FiChevronDown />}
                    </button>
                  </div>

                  {/* Class Details (Expanded) */}
                  {expandedClass === classId && (
                    <div style={styles.classDetails}>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Class Name:</span>
                        <span style={styles.detailValue}>{className}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Class ID:</span>
                        <span style={styles.detailValue} title={classId}>
                          {classId.substring(0, 8)}...
                        </span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Academic Year:</span>
                        <span style={styles.detailValue}>{cls.academicYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`}</span>
                      </div>
                      
                      {/* Subject Assignments */}
                      {cls.subjectAssignments && cls.subjectAssignments.length > 0 && (
                        <div style={styles.subjectAssignments}>
                          <h4 style={styles.sectionTitle}>Assigned Subjects:</h4>
                          <div style={styles.subjectList}>
                            {cls.subjectAssignments.map((assignment, index) => (
                              <div key={index} style={styles.subjectItem}>
                                <span style={styles.subjectName}>
                                  {assignment.subject?.name || `Subject ${index + 1}`}
                                  {assignment.subject?.code && ` (${assignment.subject.code})`}
                                </span>
                                {assignment.isCore && (
                                  <span style={styles.coreBadge}>Core</span>
                                )}
                                {(user.role === 'admin' || user.role === 'super_admin') && (
                                  <button
                                    onClick={() => handleRemoveSubjectFromClass(classId, assignment.subject?.id)}
                                    style={styles.removeSubjectButton}
                                  >
                                    <FiX />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Status:</span>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: cls.isActive ? '#E6FFE6' : '#FFF3CD',
                          color: cls.isActive ? '#228B22' : '#D4A017'
                        }}>
                          {cls.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div style={styles.classActions}>
                        <button
                          style={{...styles.actionButton, ...styles.viewButton}}
                          onClick={() => handleViewClassDetails(classId)}
                        >
                          <FiEye /> View Details
                        </button>
                        
                        {(user.role === 'admin' || user.role === 'super_admin') && (
                          <>
                            <button
                              style={{...styles.actionButton, ...styles.assignSubjectsButton}}
                              onClick={() => {
                                setShowAssignSubjectsModal(classId);
                                fetchAvailableSubjects();
                                fetchClassSubjects(classId);
                              }}
                            >
                              <FiLink /> Assign Subjects
                            </button>

                            <button
                              style={{...styles.actionButton, ...styles.editButton}}
                              onClick={() => handleEditClass(classId)}
                            >
                              <FiEdit /> Edit
                            </button>

                            {cls.isActive ? (
                              <>
                                <button
                                  style={{...styles.actionButton, ...styles.deactivateButton}}
                                  onClick={() => setShowDeleteModal({ 
                                    id: classId, 
                                    name: className,
                                    type: 'deactivate'
                                  })}
                                >
                                  <FiTrash2 /> Deactivate
                                </button>
                                <button
                                  style={{...styles.actionButton, ...styles.deleteButton}}
                                  onClick={() => setShowDeleteModal({ 
                                    id: classId, 
                                    name: className,
                                    type: 'delete'
                                  })}
                                >
                                  <FiTrash2 /> Delete
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  style={{...styles.actionButton, ...styles.reactivateButton}}
                                  onClick={() => handleReactivateClass(classId)}
                                >
                                  <FiCheckCircle /> Reactivate
                                </button>
                                <button
                                  style={{...styles.actionButton, ...styles.hardDeleteButton}}
                                  onClick={() => handleHardDeleteClass(classId, className)}
                                >
                                  <FiTrash2 /> Permanently Delete
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Create Class Modal */}
        {showCreateModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <h2 style={styles.modalTitle}>Create New Class</h2>
              <form onSubmit={handleCreateClass}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Class Name *</label>
                  <input
                    type="text"
                    value={newClassData.name}
                    onChange={(e) => setNewClassData({...newClassData, name: e.target.value})}
                    placeholder="e.g., JSS1 A"
                    required
                    style={styles.formInput}
                  />
                </div>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Short Name *</label>
                    <input
                      type="text"
                      value={newClassData.shortName}
                      onChange={(e) => setNewClassData({...newClassData, shortName: e.target.value})}
                      placeholder="e.g., J1A"
                      required
                      style={styles.formInput}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Level *</label>
                    <select
                      value={newClassData.level}
                      onChange={(e) => setNewClassData({...newClassData, level: e.target.value})}
                      required
                      style={styles.formInput}
                    >
                      {levels.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Stream (Optional)</label>
                  <input
                    type="text"
                    value={newClassData.stream}
                    onChange={(e) => setNewClassData({...newClassData, stream: e.target.value})}
                    placeholder="e.g., Science, Arts"
                    style={styles.formInput}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Capacity</label>
                  <input
                    type="number"
                    value={newClassData.capacity}
                    onChange={(e) => setNewClassData({...newClassData, capacity: e.target.value})}
                    min="1"
                    max="100"
                    style={styles.formInput}
                  />
                </div>
                <div style={styles.modalActions}>
                  <button 
                    type="button" 
                    style={styles.cancelButton}
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" style={styles.submitButton}>
                    Create Class
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Subjects Modal */}
        {showAssignSubjectsModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <h2 style={styles.modalTitle}>Assign Subjects to Class</h2>
              
              <div style={styles.subjectsGrid}>
                {loadingSubjects ? (
                  <div style={styles.loadingSubjects}>
                    <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: '24px' }} />
                    <p>Loading subjects...</p>
                  </div>
                ) : availableSubjects.length === 0 ? (
                  <p style={styles.noSubjects}>No subjects available.</p>
                ) : (
                  availableSubjects.map(subject => (
                    <label 
                      key={subject.id || subject._id} 
                      style={{
                        ...styles.subjectCheckbox,
                        backgroundColor: selectedSubjects.includes(subject.id || subject._id) ? '#E6FFE6' : 'white',
                        borderColor: selectedSubjects.includes(subject.id || subject._id) ? '#4B5320' : '#E0E0E0'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(subject.id || subject._id)}
                        onChange={() => toggleSubjectSelection(subject.id || subject._id)}
                        style={styles.checkboxInput}
                      />
                      <div style={styles.subjectCheckboxContent}>
                        <span style={styles.subjectCheckboxName}>{subject.name}</span>
                        {subject.code && (
                          <span style={styles.subjectCheckboxCode}>{subject.code}</span>
                        )}
                        {subject.category && (
                          <span style={styles.subjectCheckboxCategory}>{subject.category}</span>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
              
              <div style={styles.selectedSubjectsInfo}>
                <p>Selected: {selectedSubjects.length} subjects</p>
              </div>
              
              <div style={styles.modalActions}>
                <button 
                  style={styles.cancelButton}
                  onClick={() => setShowAssignSubjectsModal(null)}
                  disabled={assignSubjectsLoading}
                >
                  Cancel
                </button>
                <button
                  style={styles.submitButton}
                  onClick={() => handleAssignSubjects(showAssignSubjectsModal)}
                  disabled={assignSubjectsLoading || selectedSubjects.length === 0}
                >
                  {assignSubjectsLoading ? (
                    <>
                      <FiLoader style={{ animation: 'spin 1s linear infinite' }} /> Assigning...
                    </>
                  ) : (
                    'Assign Selected Subjects'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete/Deactivate Confirmation Modal */}
        {showDeleteModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <h2 style={styles.modalTitle}>
                {showDeleteModal.type === 'delete' ? 'Delete Class' : 'Deactivate Class'}
              </h2>
              
              {showDeleteModal.type === 'delete' ? (
                <>
                  <div style={styles.warningBox}>
                    <FiAlertTriangle style={styles.warningIcon} />
                    <div>
                      <h4 style={styles.warningTitle}>Warning: Permanent Deletion</h4>
                      <p style={styles.warningText}>
                        Are you sure you want to permanently delete "{showDeleteModal.name}"?
                        This action will remove the class record but may fail if there are associated students or results.
                      </p>
                    </div>
                  </div>
                  <div style={styles.modalActions}>
                    <button 
                      style={styles.cancelButton}
                      onClick={() => setShowDeleteModal(null)}
                    >
                      Cancel
                    </button>
                    <button 
                      style={styles.deleteButton}
                      onClick={() => handleDeleteClass(showDeleteModal.id, showDeleteModal.name)}
                    >
                      Yes, Delete Permanently
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={styles.infoBox}>
                    <FiAlertTriangle style={styles.infoIcon} />
                    <div>
                      <h4 style={styles.infoTitle}>Deactivate Class</h4>
                      <p style={styles.infoText}>
                        Are you sure you want to deactivate "{showDeleteModal.name}"?
                        Deactivating will make the class inactive but preserve all data.
                        You can reactivate it later.
                      </p>
                    </div>
                  </div>
                  <div style={styles.modalActions}>
                    <button 
                      style={styles.cancelButton}
                      onClick={() => setShowDeleteModal(null)}
                    >
                      Cancel
                    </button>
                    <button 
                      style={styles.deactivateButton}
                      onClick={() => handleDeactivateClass(showDeleteModal.id, showDeleteModal.name)}
                    >
                      Yes, Deactivate
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F5F5F5'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#4B5320',
    margin: '0 0 5px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    margin: '0'
  },
  createButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 4px rgba(75, 83, 32, 0.2)',
    ':hover': {
      backgroundColor: '#3A4220',
      transform: 'translateY(-2px)'
    }
  },
  filtersContainer: {
    display: 'flex',
    gap: '15px',
    marginBottom: '30px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  searchBox: {
    position: 'relative',
    flex: '1',
    minWidth: '200px'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#666'
  },
  searchInput: {
    width: '100%',
    padding: '12px 12px 12px 40px',
    borderRadius: '8px',
    border: '1px solid #DDD',
    fontSize: '16px',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  filterSelect: {
    padding: '12px 15px',
    borderRadius: '8px',
    border: '1px solid #DDD',
    fontSize: '16px',
    backgroundColor: 'white',
    color: '#333',
    minWidth: '150px'
  },
  refreshButton: {
    backgroundColor: '#E0E0E0',
    color: '#333',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 20px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#D0D0D0'
    }
  },
  errorMessage: {
    backgroundColor: '#FFE6E6',
    color: '#B22222',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '16px',
    position: 'relative'
  },
  successMessage: {
    backgroundColor: '#E6FFE6',
    color: '#228B22',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '16px',
    position: 'relative'
  },
  closeMessageButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    marginLeft: 'auto',
    fontSize: '18px',
    padding: '0'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px'
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #E0E0E0',
    borderTop: '4px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  emptyIcon: {
    fontSize: '64px',
    color: '#4B5320',
    marginBottom: '20px',
    opacity: '0.5'
  },
  classesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px'
  },
  classCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    ':hover': {
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      transform: 'translateY(-2px)'
    }
  },
  classHeader: {
    padding: '20px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderBottom: '1px solid #E0E0E0'
  },
  classInfo: {
    flex: '1'
  },
  className: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 8px 0'
  },
  classMeta: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  classShortName: {
    backgroundColor: '#4B5320',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600'
  },
  classStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '14px',
    color: '#666'
  },
  expandButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '20px',
    color: '#4B5320',
    padding: '5px'
  },
  classDetails: {
    padding: '20px',
    backgroundColor: 'white'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #F0F0F0'
  },
  detailLabel: {
    fontWeight: '600',
    color: '#666',
    fontSize: '14px'
  },
  detailValue: {
    color: '#333',
    fontSize: '14px'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  classActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '20px'
  },
  actionButton: {
    flex: '1',
    minWidth: '120px',
    padding: '10px 15px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  },
  viewButton: {
    backgroundColor: '#E0E0E0',
    color: '#333',
    ':hover': {
      backgroundColor: '#D0D0D0'
    }
  },
  editButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    ':hover': {
      backgroundColor: '#3A4220'
    }
  },
  deleteButton: {
    backgroundColor: '#B22222',
    color: 'white',
    ':hover': {
      backgroundColor: '#9A1F1F'
    }
  },
  deactivateButton: {
    backgroundColor: '#D4A017',
    color: 'white',
    ':hover': {
      backgroundColor: '#B68A14'
    }
  },
  hardDeleteButton: {
    backgroundColor: '#8B0000',
    color: 'white',
    ':hover': {
      backgroundColor: '#6B0000'
    }
  },
  reactivateButton: {
    backgroundColor: '#228B22',
    color: 'white',
    ':hover': {
      backgroundColor: '#1A7A1A'
    }
  },
  assignSubjectsButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    ':hover': {
      backgroundColor: '#3A4220'
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
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#4B5320',
    margin: '0 0 20px 0'
  },
  formGroup: {
    marginBottom: '20px'
  },
  formLabel: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#333',
    fontSize: '14px'
  },
  formInput: {
    width: '100%',
    padding: '12px 15px',
    borderRadius: '8px',
    border: '1px solid #DDD',
    fontSize: '16px',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px'
  },
  modalActions: {
    display: 'flex',
    gap: '15px',
    marginTop: '30px'
  },
  cancelButton: {
    flex: '1',
    backgroundColor: '#E0E0E0',
    color: '#333',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#D0D0D0'
    }
  },
  submitButton: {
    flex: '1',
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#3A4220'
    }
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    border: '1px solid #D4A017',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px'
  },
  infoBox: {
    backgroundColor: '#E6F4FF',
    border: '1px solid #4B5320',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px'
  },
  warningIcon: {
    color: '#D4A017',
    fontSize: '24px',
    marginTop: '2px'
  },
  infoIcon: {
    color: '#4B5320',
    fontSize: '24px',
    marginTop: '2px'
  },
  warningTitle: {
    color: '#D4A017',
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '600'
  },
  infoTitle: {
    color: '#4B5320',
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '600'
  },
  warningText: {
    color: '#333',
    margin: '0',
    fontSize: '14px',
    lineHeight: '1.5'
  },
  infoText: {
    color: '#333',
    margin: '0',
    fontSize: '14px',
    lineHeight: '1.5'
  },
  authRequiredContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '50vh'
  },
  authErrorMessage: {
    backgroundColor: '#FFF3CD',
    color: '#D4A017',
    padding: '20px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    maxWidth: '400px'
  },
  errorIcon: {
    fontSize: '24px'
  },
  
  // Subject assignment styles
  subjectAssignments: {
    margin: '15px 0',
    padding: '15px',
    backgroundColor: '#F8F9FA',
    borderRadius: '8px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 10px 0'
  },
  subjectList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  subjectItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #E0E0E0'
  },
  subjectName: {
    flex: '1',
    fontWeight: '500'
  },
  coreBadge: {
    padding: '3px 8px',
    backgroundColor: '#E6FFE6',
    color: '#228B22',
    borderRadius: '12px',
    fontSize: '12px',
    marginLeft: '10px'
  },
  removeSubjectButton: {
    background: 'none',
    border: 'none',
    color: '#B22222',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    borderRadius: '4px',
    marginLeft: '10px'
  },
  subjectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
    maxHeight: '400px',
    overflowY: 'auto',
    padding: '15px',
    backgroundColor: '#F8F9FA',
    borderRadius: '8px',
    margin: '20px 0'
  },
  subjectCheckbox: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '12px',
    backgroundColor: 'white',
    border: '2px solid #E0E0E0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  checkboxInput: {
    marginRight: '10px',
    marginTop: '3px'
  },
  subjectCheckboxContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  subjectCheckboxName: {
    fontWeight: '600',
    fontSize: '14px'
  },
  subjectCheckboxCode: {
    fontSize: '12px',
    color: '#666'
  },
  subjectCheckboxCategory: {
    fontSize: '11px',
    color: '#999',
    textTransform: 'uppercase'
  },
  loadingSubjects: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    gridColumn: '1 / -1'
  },
  noSubjects: {
    textAlign: 'center',
    color: '#666',
    gridColumn: '1 / -1'
  },
  selectedSubjectsInfo: {
    textAlign: 'center',
    marginBottom: '20px',
    fontWeight: '500',
    color: '#4B5320'
  }
};

// Add CSS for spin animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default ManageClasses;