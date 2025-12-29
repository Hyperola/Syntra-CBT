import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import { 
  FiPlus, FiEdit, FiTrash2, FiSearch, FiRefreshCw,
  FiAlertTriangle, FiCheckCircle, FiFilter, FiBook
} from 'react-icons/fi';

const ManageSubjects = () => {
  const { user } = useContext(AuthContext);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: 'Core',
    isCore: true
  });

  // Get auth token
  const getAuthToken = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      return token;
    } catch (err) {
      console.error('Token error:', err);
      setError('Authentication failed. Please log in again.');
      return null;
    }
  };

  // API call wrapper
  const apiCall = async (url, options = {}) => {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const config = {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        ...options
      };
      
      const response = await axios(url, config);
      return response;
    } catch (err) {
      console.error(`API call failed for ${url}:`, err);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Network error. Please check your connection.');
      }
      return null;
    }
  };

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      fetchSubjects();
    }
  }, [user]);

  const fetchSubjects = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Fetching subjects...');
      const response = await apiCall('http://localhost:5000/api/subjects');
      
      if (response?.data) {
        console.log('📚 Subjects response:', response.data);
        
        // Handle both response formats
        let subjectsData = [];
        if (response.data.subjects && Array.isArray(response.data.subjects)) {
          subjectsData = response.data.subjects;
        } else if (Array.isArray(response.data)) {
          subjectsData = response.data;
        } else if (response.data && typeof response.data === 'object') {
          // If it's a single object, wrap it in array
          subjectsData = [response.data];
        }
        
        console.log('✅ Processed subjects:', subjectsData);
        setSubjects(subjectsData.filter(s => s && s.name));
      } else {
        setSubjects([]);
      }
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError('Failed to load subjects. ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        category: formData.category,
        description: formData.description.trim(),
        isCore: formData.category === 'Core' ? true : formData.isCore
      };

      if (editingSubject) {
        // Update existing subject
        const response = await apiCall(`http://localhost:5000/api/subjects/${editingSubject.id || editingSubject._id}`, {
          method: 'PUT',
          data: payload
        });
        
        if (response) {
          setSuccess('Subject updated successfully');
          resetForm();
          fetchSubjects();
        }
      } else {
        // Create new subject
        const response = await apiCall('http://localhost:5000/api/subjects', {
          method: 'POST',
          data: payload
        });
        
        if (response) {
          setSuccess('Subject created successfully');
          resetForm();
          fetchSubjects();
        }
      }
    } catch (err) {
      setError('Failed to save subject: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingSubject(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      category: 'Core',
      isCore: true
    });
  };

  const handleEdit = (subject) => {
    setFormData({
      name: subject.name,
      code: subject.code || '',
      description: subject.description || '',
      category: subject.category || 'Core',
      isCore: subject.isCore !== false
    });
    setEditingSubject(subject);
    setShowForm(true);
  };

  const handleDelete = async (subjectId, subjectName) => {
    if (!window.confirm(`Are you sure you want to delete "${subjectName}"? This action cannot be undone.`)) return;
    
    setLoading(true);
    try {
      const response = await apiCall(`http://localhost:5000/api/subjects/${subjectId}`, {
        method: 'DELETE'
      });
      
      if (response) {
        setSuccess('Subject deleted successfully');
        fetchSubjects();
      }
    } catch (err) {
      setError('Failed to delete subject');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Core': '#2D5016', // Darker green for better contrast
      'Elective': '#D35400', // Darker orange
      'Optional': '#2980B9', // Darker blue
      'General': '#8E44AD', // Darker purple
      'core': '#2D5016',
      'elective': '#D35400',
      'optional': '#2980B9',
      'general': '#8E44AD'
    };
    return colors[category] || '#34495E';
  };

  const getCategoryName = (category) => {
    const names = {
      'Core': 'Core Subject',
      'Elective': 'Elective',
      'Optional': 'Optional',
      'General': 'General',
      'core': 'Core Subject',
      'elective': 'Elective',
      'optional': 'Optional',
      'general': 'General'
    };
    return names[category] || 'Unknown Category';
  };

  // Filter subjects
  const filteredSubjects = subjects.filter(subject => {
    const name = (subject.name || '').toLowerCase();
    const code = (subject.code || '').toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase()) || 
                         code.includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'all' || 
                          subject.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...new Set(subjects.map(s => s.category).filter(Boolean))];

  // Check if user can manage subjects
  const canManageSubjects = () => {
    if (!user) return false;
    return user.role === 'super_admin' || user.role === 'admin';
  };

  if (!user || !canManageSubjects()) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F5F7FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: '#FFE5E5',
          color: '#C53030',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: '2px solid #FC8181'
        }}>
          <FiAlertTriangle style={{ fontSize: '24px', flexShrink: 0 }} />
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>Access Denied</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#742A2A' }}>You don't have permission to manage subjects.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading && subjects.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F5F7FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '32px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '16px', marginBottom: '16px', color: '#2D3748' }}>Loading subjects...</div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #E2E8F0',
            borderTop: '3px solid #2D5016',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F7FA',
      fontFamily: 'sans-serif'
    }}>
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1A202C',
              margin: '0 0 8px 0'
            }}>
              Subject Management
            </h1>
            <p style={{
              color: '#4A5568',
              margin: 0,
              fontSize: '16px',
              fontWeight: '500'
            }}>
              {subjects.length} subjects • {filteredSubjects.length} filtered
            </p>
          </div>
          
          <button
            onClick={() => { 
              resetForm();
              setShowForm(true);
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2D5016',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#244011'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#2D5016'}
          >
            <FiPlus /> Create New Subject
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            backgroundColor: '#FED7D7',
            color: '#9B2C2C',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid #FC8181'
          }}>
            <FiAlertTriangle style={{ fontSize: '20px', flexShrink: 0 }} />
            <span style={{ fontWeight: '500' }}>{error}</span>
            <button 
              onClick={() => setError(null)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#9B2C2C',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
          </div>
        )}
        {success && (
          <div style={{
            backgroundColor: '#C6F6D5',
            color: '#22543D',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid #9AE6B4'
          }}>
            <FiCheckCircle style={{ fontSize: '20px', flexShrink: 0 }} />
            <span style={{ fontWeight: '500' }}>{success}</span>
            <button 
              onClick={() => setSuccess(null)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#22543D',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* No subjects warning */}
        {subjects.length === 0 && !loading && (
          <div style={{
            backgroundColor: '#FEFCBF',
            color: '#744210',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '2px solid #F6E05E',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <FiAlertTriangle style={{ fontSize: '20px', flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '16px' }}>No subjects found</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>
                Create your first subject to get started.
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ position: 'relative', minWidth: '300px' }}>
            <input
              type="text"
              placeholder="Search subjects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 40px',
                border: '2px solid #CBD5E0',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'border-color 0.2s',
                backgroundColor: '#FFFFFF',
                color: '#2D3748',
                fontWeight: '500'
              }}
              onFocus={(e) => e.target.style.borderColor = '#2D5016'}
              onBlur={(e) => e.target.style.borderColor = '#CBD5E0'}
            />
            <FiSearch style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#718096',
              fontSize: '16px'
            }} />
          </div>
          
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={{
              padding: '12px 16px',
              border: '2px solid #CBD5E0',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              minWidth: '180px',
              backgroundColor: '#FFFFFF',
              color: '#2D3748',
              fontWeight: '500',
              cursor: 'pointer'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2D5016'}
            onBlur={(e) => e.target.style.borderColor = '#CBD5E0'}
          >
            <option value="all" style={{ color: '#2D3748', backgroundColor: '#FFFFFF', fontWeight: '500' }}>All Categories</option>
            {categories.filter(cat => cat !== 'all').map(category => (
              <option 
                key={category} 
                value={category}
                style={{ 
                  color: '#2D3748', 
                  backgroundColor: '#FFFFFF',
                  fontWeight: '500',
                  padding: '8px'
                }}
              >
                {getCategoryName(category)}
              </option>
            ))}
          </select>

          <button
            onClick={fetchSubjects}
            disabled={loading}
            style={{
              padding: '12px 16px',
              backgroundColor: '#4A5568',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: loading ? 0.6 : 1,
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#2D3748')}
            onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#4A5568')}
          >
            <FiRefreshCw style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Subjects Grid */}
        {filteredSubjects.length === 0 ? (
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: '48px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            textAlign: 'center',
            color: '#4A5568',
            border: '2px dashed #CBD5E0'
          }}>
            <FiBook style={{ fontSize: '48px', marginBottom: '16px', color: '#A0AEC0' }} />
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#2D3748' }}>
              {subjects.length === 0 ? 'No Subjects Found' : 'No Subjects Match Your Filters'}
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#718096' }}>
              {subjects.length === 0 
                ? 'Create your first subject to get started' 
                : 'Try changing your search or filter criteria'
              }
            </p>
            {subjects.length === 0 && (
              <button
                onClick={() => { resetForm(); setShowForm(true); }}
                style={{
                  marginTop: '16px',
                  padding: '10px 20px',
                  backgroundColor: '#2D5016',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#244011'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#2D5016'}
              >
                Create Your First Subject
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '24px'
          }}>
            {filteredSubjects.map(subject => {
              const categoryColor = getCategoryColor(subject.category);
              
              return (
                <div key={subject.id || subject._id} style={{
                  backgroundColor: '#FFFFFF',
                  padding: '24px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  border: `2px solid ${categoryColor}`,
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}>
                  {/* Subject Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#1A202C',
                        margin: '0 0 8px 0',
                        lineHeight: '1.4'
                      }}>
                        {subject.name}
                      </h3>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          padding: '4px 12px',
                          backgroundColor: categoryColor,
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {getCategoryName(subject.category)}
                        </span>
                        <span style={{
                          color: '#4A5568',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}>
                          Code: {subject.code || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Subject Details */}
                  <div style={{
                    marginBottom: '20px'
                  }}>
                    <p style={{
                      color: '#4A5568',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      margin: '0 0 16px 0'
                    }}>
                      {subject.description || 'No description provided'}
                    </p>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      color: '#4A5568',
                      fontSize: '14px'
                    }}>
                      <div style={{
                        padding: '6px 12px',
                        backgroundColor: subject.isActive !== false ? '#C6F6D5' : '#FED7D7',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: subject.isActive !== false ? '#22543D' : '#9B2C2C'
                      }}>
                        Status: {subject.isActive !== false ? 'Active' : 'Inactive'}
                      </div>
                      <div style={{
                        padding: '6px 12px',
                        backgroundColor: subject.isCore ? '#BEE3F8' : '#FED7D7',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: subject.isCore ? '#2C5282' : '#9B2C2C'
                      }}>
                        Core: {subject.isCore ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px'
                  }}>
                    <button
                      onClick={() => handleEdit(subject)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        backgroundColor: '#2D5016',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        width: '100%',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#244011'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#2D5016'}
                    >
                      <FiEdit /> Edit Subject
                    </button>

                    <button
                      onClick={() => handleDelete(subject.id || subject._id, subject.name)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        backgroundColor: '#C53030',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                        width: '100%',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#9B2C2C'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#C53030'}
                    >
                      <FiTrash2 /> Delete Subject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              maxWidth: '500px',
              width: '100%',
              padding: '32px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1A202C',
                margin: '0 0 24px 0'
              }}>
                {editingSubject ? 'Edit Subject' : 'Create New Subject'}
              </h2>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#2D3748',
                    marginBottom: '8px'
                  }}>
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. MATHEMATICS, ENGLISH LANGUAGE"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #CBD5E0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      backgroundColor: '#FFFFFF',
                      color: '#2D3748',
                      fontWeight: '500'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2D5016'}
                    onBlur={(e) => e.target.style.borderColor = '#CBD5E0'}
                    required
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#2D3748',
                    marginBottom: '8px'
                  }}>
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g. MATH, ENG, PHY"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #CBD5E0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      backgroundColor: '#FFFFFF',
                      color: '#2D3748',
                      fontWeight: '500'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2D5016'}
                    onBlur={(e) => e.target.style.borderColor = '#CBD5E0'}
                    required
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#2D3748',
                    marginBottom: '8px'
                  }}>
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #CBD5E0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      backgroundColor: '#FFFFFF',
                      color: '#2D3748',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2D5016'}
                    onBlur={(e) => e.target.style.borderColor = '#CBD5E0'}
                    required
                  >
                    <option value="Core" style={{ color: '#2D3748', backgroundColor: '#FFFFFF', fontWeight: '500' }}>Core Subject</option>
                    <option value="Elective" style={{ color: '#2D3748', backgroundColor: '#FFFFFF', fontWeight: '500' }}>Elective</option>
                    <option value="Optional" style={{ color: '#2D3748', backgroundColor: '#FFFFFF', fontWeight: '500' }}>Optional</option>
                    <option value="General" style={{ color: '#2D3748', backgroundColor: '#FFFFFF', fontWeight: '500' }}>General</option>
                  </select>
                </div>

                {formData.category !== 'Core' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    backgroundColor: '#F7FAFC',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0'
                  }}>
                    <input
                      type="checkbox"
                      name="isCore"
                      checked={formData.isCore}
                      onChange={handleInputChange}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    <label style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#2D3748',
                      cursor: 'pointer'
                    }}>
                      Mark as Core Subject (for new class assignments)
                    </label>
                  </div>
                )}

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#2D3748',
                    marginBottom: '8px'
                  }}>
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Subject description..."
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #CBD5E0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      minHeight: '100px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      backgroundColor: '#FFFFFF',
                      color: '#2D3748',
                      fontWeight: '500'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#2D5016'}
                    onBlur={(e) => e.target.style.borderColor = '#CBD5E0'}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      backgroundColor: '#2D5016',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: loading ? 0.7 : 1,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#244011')}
                    onMouseOut={(e) => !loading && (e.target.style.backgroundColor = '#2D5016')}
                  >
                    {loading ? 'Saving...' : (editingSubject ? 'Update Subject' : 'Create Subject')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      backgroundColor: '#718096',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#4A5568'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#718096'}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          select option {
            background-color: white !important;
            color: #2D3748 !important;
            font-weight: 500 !important;
            padding: 8px !important;
          }
          
          select option:hover {
            background-color: #F7FAFC !important;
          }
        `}
      </style>
    </div>
  );
};

export default ManageSubjects;