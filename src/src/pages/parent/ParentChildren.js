import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiSearch,
  FiX,
  FiLoader,
  FiAlertTriangle,
  FiCheckCircle,
  FiUser,
  FiBook,
  FiCalendar,
  FiMail,
  FiBarChart2,
  FiUsers,
  FiRefreshCw,
  FiEye,
  FiChevronRight,
  FiFilter,
  FiStar,
  FiTrendingUp,
  FiClock,
  FiUserCheck,
  FiUserX
} from 'react-icons/fi';

const ParentChildren = () => {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    class: 'all',
    gender: 'all',
    status: 'all'
  });
  const [expandedChild, setExpandedChild] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  useEffect(() => {
    if (children.length > 0) {
      calculateStats();
    }
  }, [children]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/parents/children', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const childrenData = response.data.children || response.data.data || [];
      setChildren(childrenData);
      
      if (childrenData.length > 0) {
        setSuccess(`Loaded ${childrenData.length} children`);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      setError(error.response?.data?.message || 'Failed to load children information');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const stats = {
      total: children.length,
      byClass: {},
      byGender: {
        male: children.filter(c => c.sex === 'male' || c.gender === 'male').length,
        female: children.filter(c => c.sex === 'female' || c.gender === 'female').length,
        unspecified: children.filter(c => !c.sex && !c.gender).length
      },
      averageAge: 0
    };

    // Calculate class distribution
    children.forEach(child => {
      const className = child.class?.name || child.className || 'Not Assigned';
      stats.byClass[className] = (stats.byClass[className] || 0) + 1;
    });

    // Calculate average age
    const validBirthdates = children.filter(child => child.dateOfBirth).map(child => {
      const birthDate = new Date(child.dateOfBirth);
      const ageDiff = Date.now() - birthDate.getTime();
      const ageDate = new Date(ageDiff);
      return Math.abs(ageDate.getUTCFullYear() - 1970);
    });

    if (validBirthdates.length > 0) {
      stats.averageAge = (validBirthdates.reduce((a, b) => a + b, 0) / validBirthdates.length).toFixed(1);
    }

    setStats(stats);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const birthDate = new Date(dateOfBirth);
    const ageDiff = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const filteredChildren = children.filter(child => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (child.name?.toLowerCase() || '').includes(searchLower) ||
      (child.studentId?.toLowerCase() || '').includes(searchLower) ||
      (child.className?.toLowerCase() || '').includes(searchLower) ||
      (child.class?.name?.toLowerCase() || '').includes(searchLower);
    
    const matchesClass = filters.class === 'all' || 
      (child.class?.name || child.className || 'Not Assigned') === filters.class;
    
    const matchesGender = filters.gender === 'all' ||
      (child.sex === filters.gender || child.gender === filters.gender) ||
      (filters.gender === 'unspecified' && !child.sex && !child.gender);
    
    return matchesSearch && matchesClass && matchesGender;
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      class: 'all',
      gender: 'all',
      status: 'all'
    });
    setSearchTerm('');
  };

  const getClasses = () => {
    const classes = [...new Set(children.map(child => 
      child.class?.name || child.className || 'Not Assigned'
    ))];
    return classes.filter(Boolean);
  };

  if (loading && children.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <FiLoader style={{ animation: 'spin 1s linear infinite', fontSize: '32px', color: '#4B5320' }} />
          <p style={{ color: '#333', fontSize: '14px' }}>Loading children information...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button
          onClick={() => navigate('/parent/dashboard')}
          style={styles.backButton}
        >
          <FiArrowLeft /> Back to Dashboard
        </button>
        <div>
          <h1 style={styles.title}>My Children</h1>
          <p style={styles.subtitle}>
            {children.length} child{children.length !== 1 ? 'ren' : ''} linked to your account
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

      {/* Stats Summary */}
      {stats && (
        <div style={styles.statsSummary}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><FiUsers /></div>
            <div>
              <div style={styles.statValue}>{stats.total}</div>
              <div style={styles.statLabel}>Total Children</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><FiUser /></div>
            <div>
              <div style={styles.statValue}>{stats.byGender.male}</div>
              <div style={styles.statLabel}>Male</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><FiUser /></div>
            <div>
              <div style={styles.statValue}>{stats.byGender.female}</div>
              <div style={styles.statLabel}>Female</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}><FiBook /></div>
            <div>
              <div style={styles.statValue}>{Object.keys(stats.byClass).length}</div>
              <div style={styles.statLabel}>Classes</div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div style={styles.filtersBar}>
        <div style={styles.searchContainer}>
          <FiSearch style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search children by name, ID, or class..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={styles.clearSearchButton}
            >
              <FiX />
            </button>
          )}
        </div>
        
        <div style={styles.filtersRight}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={styles.filterToggleButton}
          >
            <FiFilter /> Filters
            {(filters.class !== 'all' || filters.gender !== 'all') && (
              <span style={styles.activeFilterDot}></span>
            )}
          </button>
          
          <button
            onClick={fetchChildren}
            style={styles.refreshButton}
            disabled={loading}
          >
            <FiRefreshCw /> {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Active Filters Display */}
      {(filters.class !== 'all' || filters.gender !== 'all' || searchTerm) && (
        <div style={styles.activeFilters}>
          {searchTerm && (
            <span style={styles.activeFilter}>
              Search: "{searchTerm}"
              <button onClick={() => setSearchTerm('')}>
                <FiX />
              </button>
            </span>
          )}
          {filters.class !== 'all' && (
            <span style={styles.activeFilter}>
              Class: {filters.class}
              <button onClick={() => setFilters(prev => ({ ...prev, class: 'all' }))}>
                <FiX />
              </button>
            </span>
          )}
          {filters.gender !== 'all' && (
            <span style={styles.activeFilter}>
              Gender: {filters.gender === 'male' ? 'Male' : filters.gender === 'female' ? 'Female' : 'Unspecified'}
              <button onClick={() => setFilters(prev => ({ ...prev, gender: 'all' }))}>
                <FiX />
              </button>
            </span>
          )}
          <button onClick={clearFilters} style={styles.clearAllButton}>
            Clear All
          </button>
        </div>
      )}

      {/* Filters Dropdown */}
      {showFilters && (
        <div style={styles.filtersDropdown}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Class</label>
            <select
              name="class"
              value={filters.class}
              onChange={handleFilterChange}
              style={styles.filterSelect}
            >
              <option value="all">All Classes</option>
              {getClasses().map((className, index) => (
                <option key={index} value={className}>{className}</option>
              ))}
            </select>
          </div>
          
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Gender</label>
            <select
              name="gender"
              value={filters.gender}
              onChange={handleFilterChange}
              style={styles.filterSelect}
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="unspecified">Not Specified</option>
            </select>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div style={styles.resultsCount}>
        Showing {filteredChildren.length} of {children.length} children
        {filteredChildren.length < children.length && (
          <button onClick={clearFilters} style={styles.showAllButton}>
            Show All
          </button>
        )}
      </div>

      {/* Children Grid */}
      {filteredChildren.length === 0 ? (
        <div style={styles.emptyState}>
          <FiUsers style={styles.emptyIcon} />
          <h3 style={styles.emptyTitle}>
            {searchTerm || filters.class !== 'all' || filters.gender !== 'all' 
              ? 'No Children Found'
              : 'No Children Assigned'
            }
          </h3>
          <p style={styles.emptyText}>
            {searchTerm || filters.class !== 'all' || filters.gender !== 'all'
              ? 'No children match your search criteria.'
              : 'No children have been linked to your account yet.'
            }
          </p>
          {(searchTerm || filters.class !== 'all' || filters.gender !== 'all') && (
            <button onClick={clearFilters} style={styles.clearFiltersButton}>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div style={styles.childrenGrid}>
          {filteredChildren.map((child, index) => {
            const childId = child.id || child._id;
            const className = child.class?.name || child.className || 'Not Assigned';
            const age = calculateAge(child.dateOfBirth);
            
            return (
              <div key={childId || index} style={styles.childCard}>
                {/* Child Header */}
                <div 
                  style={styles.childHeader}
                  onClick={() => setExpandedChild(expandedChild === index ? null : index)}
                >
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
                    <div style={styles.childNameRow}>
                      <h3 style={styles.childName}>{child.name}</h3>
                      <span style={{
                        ...styles.genderBadge,
                        backgroundColor: child.sex === 'male' ? '#E3F2FD' : 
                                       child.sex === 'female' ? '#FCE4EC' : '#F5F5F5',
                        color: child.sex === 'male' ? '#1565c0' : 
                               child.sex === 'female' ? '#c2185b' : '#666'
                      }}>
                        {child.sex === 'male' ? 'Male' : child.sex === 'female' ? 'Female' : 'N/A'}
                      </span>
                    </div>
                    <div style={styles.childMeta}>
                      <span style={styles.childId}>
                        <FiUser /> {child.studentId || 'N/A'}
                      </span>
                      <span style={styles.childClass}>
                        <FiBook /> {className}
                      </span>
                      <span style={styles.childAge}>
                        <FiCalendar /> {age} {age !== 'N/A' ? 'years' : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    style={styles.expandButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedChild(expandedChild === index ? null : index);
                    }}
                  >
                    {expandedChild === index ? <FiChevronRight style={{ transform: 'rotate(90deg)' }} /> : <FiChevronRight />}
                  </button>
                </div>

                {/* Expanded Details */}
                {expandedChild === index && (
                  <div style={styles.childDetails}>
                    <div style={styles.detailsGrid}>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Student ID:</span>
                        <span style={styles.detailValue}>{child.studentId || 'N/A'}</span>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Class:</span>
                        <span style={styles.detailValue}>{className}</span>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Date of Birth:</span>
                        <span style={styles.detailValue}>{formatDate(child.dateOfBirth)}</span>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Age:</span>
                        <span style={styles.detailValue}>{age} {age !== 'N/A' ? 'years' : ''}</span>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Gender:</span>
                        <span style={styles.detailValue}>
                          {child.sex === 'male' ? 'Male' : child.sex === 'female' ? 'Female' : 'Not specified'}
                        </span>
                      </div>
                      {child.email && (
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Email:</span>
                          <span style={styles.detailValue}>{child.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={styles.actionButtons}>
                      <button
                        onClick={() => navigate(`/parent/child/${childId}/results`)}
                        style={styles.viewResultsButton}
                      >
                        <FiBarChart2 /> View Results
                      </button>
                      
                      {child.email && (
                        <button
                          onClick={() => window.location.href = `mailto:${child.email}`}
                          style={styles.emailButton}
                        >
                          <FiMail /> Email
                        </button>
                      )}
                      
                      <button
                        onClick={() => navigate(`/parent/child/${childId}/profile`)}
                        style={styles.viewProfileButton}
                      >
                        <FiEye /> Profile
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {filteredChildren.length > 0 && (
        <div style={styles.footer}>
          <div style={styles.footerStats}>
            <div style={styles.footerStat}>
              <FiUsers /> {children.length} total children
            </div>
            {stats && (
              <div style={styles.footerStat}>
                <FiUserCheck /> {stats.byGender.male} male, {stats.byGender.female} female
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/parent/dashboard')}
            style={styles.returnButton}
          >
            <FiArrowLeft /> Return to Dashboard
          </button>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          input:focus, select:focus {
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
            
            .header {
              flex-direction: column !important;
              gap: 15px !important;
              align-items: flex-start !important;
            }
            
            .stats-summary {
              grid-template-columns: repeat(2, 1fr) !important;
            }
            
            .filters-bar {
              flex-direction: column !important;
              gap: 10px !important;
            }
            
            .children-grid {
              grid-template-columns: 1fr !important;
            }
            
            .child-header {
              flex-direction: column !important;
              text-align: center !important;
            }
            
            .child-meta {
              flex-direction: column !important;
              gap: 5px !important;
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '25px',
    flexWrap: 'wrap',
    gap: '15px'
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
    margin: '0 0 5px 0',
    textAlign: 'right'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '0',
    textAlign: 'right'
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
  statsSummary: {
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
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
    flexWrap: 'wrap',
    gap: '15px'
  },
  searchContainer: {
    flex: 1,
    position: 'relative',
    minWidth: '250px'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#666',
    fontSize: '18px'
  },
  searchInput: {
    width: '100%',
    padding: '12px 12px 12px 40px',
    borderRadius: '6px',
    border: '1px solid #DDD',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#333',
    boxSizing: 'border-box'
  },
  clearSearchButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '0',
    display: 'flex',
    alignItems: 'center'
  },
  filtersRight: {
    display: 'flex',
    gap: '10px'
  },
  filterToggleButton: {
    backgroundColor: '#F0F8F0',
    color: '#4B5320',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
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
  refreshButton: {
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
      backgroundColor: '#3A4220'
    }
  },
  activeFilters: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '15px',
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #E0E0E0'
  },
  activeFilter: {
    backgroundColor: '#F0F8F0',
    color: '#4B5320',
    padding: '6px 12px',
    borderRadius: '15px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  clearAllButton: {
    backgroundColor: 'transparent',
    color: '#666',
    border: '1px solid #DDD',
    borderRadius: '15px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    marginLeft: 'auto',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#F0F0F0'
    }
  },
  filtersDropdown: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '15px',
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
  resultsCount: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#666',
    fontWeight: '500'
  },
  showAllButton: {
    backgroundColor: 'transparent',
    color: '#4B5320',
    border: '1px solid #4B5320',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: '600',
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
    padding: '100px 20px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
  },
  emptyIcon: {
    fontSize: '52px',
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
  childrenGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  childCard: {
    backgroundColor: 'white',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'all 0.3s ease',
    border: '1px solid #EEE',
    ':hover': {
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      transform: 'translateY(-2px)'
    }
  },
  childHeader: {
    padding: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    borderBottom: '1px solid #F0F0F0'
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
    flexShrink: 0,
    overflow: 'hidden'
  },
  childInfo: {
    flex: 1
  },
  childNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
    flexWrap: 'wrap'
  },
  childName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: '0'
  },
  genderBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  childMeta: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap'
  },
  childId: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#666'
  },
  childClass: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#666'
  },
  childAge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#666'
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
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#F0F0F0'
    }
  },
  childDetails: {
    padding: '20px',
    backgroundColor: '#F9F9F9',
    borderTop: '1px solid #EEE'
  },
  detailsGrid: {
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
  actionButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  viewResultsButton: {
    flex: 1,
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#3A4220',
      transform: 'translateY(-1px)'
    }
  },
  emailButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#0D8BF2',
      transform: 'translateY(-1px)'
    }
  },
  viewProfileButton: {
    flex: 1,
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.3s ease',
    ':hover': {
      backgroundColor: '#555',
      transform: 'translateY(-1px)'
    }
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
    flexWrap: 'wrap',
    gap: '15px'
  },
  footerStats: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap'
  },
  footerStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#666'
  },
  returnButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
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
  }
};

export default ParentChildren;