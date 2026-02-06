// ParentFeedback.js - REDESIGNED VERSION
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  FiMessageSquare, 
  FiRefreshCw,
  FiCheck,
  FiClock,
  FiMail,
  FiUser,
  FiChevronDown,
  FiFileText,
  FiFilter,
  FiX,
  FiAlertCircle,
  FiCheckCircle,
  FiInbox,
  FiCornerUpLeft,
  FiSearch,
  FiEye,
  FiArchive,
  FiSend
} from 'react-icons/fi';

const ParentFeedback = () => {
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    category: 'General',
    priority: 'medium',
    student: ''
  });
  const [children, setChildren] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    replied: 0,
    archived: 0,
    unreadResponses: 0
  });
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFeedbacks, setTotalFeedbacks] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchFeedbacks();
    fetchChildren();
    fetchStatistics();
  }, [filter, searchQuery, currentPage]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      clearMessages();
      
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', currentPage);
      params.append('limit', 20);

      const response = await axios.get(`${API_BASE_URL}/api/parents/feedback?${params}`, {
        headers: getAuthHeaders()
      });

      console.log('Feedbacks fetched successfully:', response.data);
      
      const feedbacksData = response.data.feedback || [];
      setFeedbacks(feedbacksData);
      
      if (response.data.pagination) {
        setCurrentPage(response.data.pagination.currentPage);
        setTotalPages(response.data.pagination.totalPages);
        setTotalFeedbacks(response.data.pagination.totalFeedback);
      } else {
        setTotalFeedbacks(feedbacksData.length);
      }
      
      if (response.data.statistics) {
        setStats({
          ...response.data.statistics,
          pending: response.data.statistics.byStatus?.pending || 0,
          replied: response.data.statistics.byStatus?.replied || 0,
          archived: response.data.statistics.byStatus?.archived || 0
        });
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
      const errorMessage = err.response?.data?.message || 'Failed to load feedbacks';
      setError(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildren = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/parents/children`, {
        headers: getAuthHeaders()
      });
      setChildren(response.data.children || []);
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/parents/feedback/statistics`, {
        headers: getAuthHeaders()
      });
      if (response.data.statistics) {
        setStats(prev => ({
          ...prev,
          ...response.data.statistics
        }));
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const getCategoryStyle = (category) => {
    switch(category) {
      case 'Academic': return { backgroundColor: '#e3f2fd', color: '#1565c0' };
      case 'Behavior': return { backgroundColor: '#f3e5f5', color: '#7b1fa2' };
      case 'Attendance': return { backgroundColor: '#e8f5e9', color: '#2e7d32' };
      case 'Fee': return { backgroundColor: '#fff3e0', color: '#ef6c00' };
      case 'Technical': return { backgroundColor: '#f5f5f5', color: '#666' };
      default: return { backgroundColor: '#e1f5fe', color: '#0277bd' };
    }
  };

  const getPriorityStyle = (priority) => {
    switch(priority) {
      case 'low': return { backgroundColor: '#e8f5e9', color: '#2e7d32' };
      case 'medium': return { backgroundColor: '#fff3e0', color: '#ef6c00' };
      case 'high': return { backgroundColor: '#ffebee', color: '#c62828' };
      case 'urgent': return { backgroundColor: '#fce4ec', color: '#ad1457' };
      default: return { backgroundColor: '#fff3e0', color: '#ef6c00' };
    }
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'pending': return { backgroundColor: '#FFFBF0', color: '#D4A017', border: '1px solid #FDE68A' };
      case 'replied': return { backgroundColor: '#E6FFE6', color: '#228B22', border: '1px solid #228B22' };
      case 'archived': return { backgroundColor: '#F8F9FA', color: '#6B7280', border: '1px solid #D1D5DB' };
      default: return { backgroundColor: '#F8F9FA', color: '#6B7280', border: '1px solid #D1D5DB' };
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return <FiAlertCircle />;
      case 'replied': return <FiCheckCircle />;
      case 'archived': return <FiArchive />;
      default: return <FiInbox />;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.message.trim()) {
      setError('Title and message are required');
      return;
    }

    try {
      clearMessages();
      const response = await axios.post(`${API_BASE_URL}/api/parents/feedback`, formData, {
        headers: getAuthHeaders()
      });
      
      setSuccess('Feedback submitted successfully!');
      setFormData({
        title: '',
        message: '',
        category: 'General',
        priority: 'medium',
        student: ''
      });
      setShowForm(false);
      
      // Refresh data
      fetchFeedbacks();
      fetchStatistics();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setError(error.response?.data?.message || 'Failed to submit feedback');
    }
  };

  const markAllAsRead = async () => {
    try {
      clearMessages();
      await axios.post(`${API_BASE_URL}/api/parents/feedback/mark-all-read`, {}, {
        headers: getAuthHeaders()
      });
      setSuccess('All responses marked as read');
      fetchFeedbacks();
      fetchStatistics();
    } catch (error) {
      console.error('Error marking as read:', error);
      setError('Failed to mark responses as read');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchFeedbacks();
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const clearFilters = () => {
    setFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleViewFeedback = (feedback) => {
    setSelectedFeedback(feedback);
  };

  const getFilteredFeedbacks = () => {
    return feedbacks; // Already filtered by API
  };

  const filteredFeedbacks = getFilteredFeedbacks();

  return (
    <div style={styles.container}>
      {/* Header Section */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <FiMessageSquare style={styles.titleIcon} />
          Parent Feedback & Inquiries
        </h1>
        <p style={styles.subtitle}>
          Share your thoughts, concerns, and suggestions with school administration.
        </p>
        <button
          onClick={() => navigate('/parent/dashboard')}
          style={styles.backButton}
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📩</div>
          <div style={styles.statValue}>{stats.total || 0}</div>
          <div style={styles.statLabel}>Total Feedback</div>
        </div>
        
        <div style={{...styles.statCard, borderColor: '#D4A017'}}>
          <div style={{...styles.statIcon, color: '#D4A017'}}>
            <FiAlertCircle />
          </div>
          <div style={styles.statValue}>{stats.pending || 0}</div>
          <div style={styles.statLabel}>Pending</div>
        </div>
        
        <div style={{...styles.statCard, borderColor: '#228B22'}}>
          <div style={{...styles.statIcon, color: '#228B22'}}>
            <FiCheckCircle />
          </div>
          <div style={styles.statValue}>{stats.replied || 0}</div>
          <div style={styles.statLabel}>Replied</div>
        </div>
        
        <div style={{...styles.statCard, borderColor: '#66FF66'}}>
          <div style={{...styles.statIcon, color: '#4B5320'}}>
            <FiInbox />
          </div>
          <div style={styles.statValue}>{stats.unreadResponses || 0}</div>
          <div style={styles.statLabel}>Unread</div>
        </div>
      </div>

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

      {/* Control Panel */}
      <div style={styles.controlPanel}>
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>
            <FiFilter style={styles.panelIcon} />
            Manage Your Feedback
          </h3>
          
          <div style={styles.actionButtons}>
            {stats.unreadResponses > 0 && (
              <button
                onClick={markAllAsRead}
                style={styles.secondaryButton}
              >
                <FiCheck /> Mark All as Read ({stats.unreadResponses})
              </button>
            )}
            
            <button
              onClick={() => setShowForm(true)}
              style={styles.primaryButton}
            >
              <FiSend /> New Feedback
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={styles.searchContainer}>
          <form onSubmit={handleSearch} style={styles.searchForm}>
            <div style={styles.searchInputGroup}>
              <FiSearch style={styles.searchIcon} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search feedback by title or message..."
                style={styles.searchInput}
              />
              <button type="submit" style={styles.searchButton}>
                Search
              </button>
            </div>
          </form>
          <button onClick={clearFilters} style={styles.clearFiltersButton}>
            <FiRefreshCw /> Clear All Filters
          </button>
        </div>

        {/* Status Filters */}
        <div style={styles.filtersSection}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Status Filter</label>
            <div style={styles.filterButtons}>
              <button
                style={{
                  ...styles.filterButton,
                  ...(filter === 'all' ? styles.filterActive : {})
                }}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                style={{
                  ...styles.filterButton,
                  ...(filter === 'pending' ? styles.filterActive : {})
                }}
                onClick={() => setFilter('pending')}
              >
                <FiAlertCircle /> Pending
              </button>
              <button
                style={{
                  ...styles.filterButton,
                  ...(filter === 'replied' ? styles.filterActive : {})
                }}
                onClick={() => setFilter('replied')}
              >
                <FiCheckCircle /> Replied
              </button>
            </div>
          </div>

          <button 
            onClick={fetchFeedbacks}
            disabled={loading}
            style={styles.refreshButton}
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>
      </div>

      {/* Feedback List */}
      <div style={styles.resultsContainer}>
        <div style={styles.tableHeader}>
          <h3 style={styles.tableTitle}>
            Your Feedback ({totalFeedbacks})
            <span style={styles.tableSubtitle}>
              Showing page {currentPage} of {totalPages}
            </span>
          </h3>
        </div>
        
        {loading && feedbacks.length === 0 ? (
          <div style={styles.loadingState}>
            <div style={styles.loadingSpinner}></div>
            <p>Loading feedbacks...</p>
          </div>
        ) : feedbacks.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <FiInbox size={48} />
            </div>
            <h4 style={styles.emptyTitle}>
              No Feedback Found
            </h4>
            <p style={styles.emptyText}>
              {searchQuery || filter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Start a conversation with school administration.'}
            </p>
            <button 
              onClick={() => setShowForm(true)}
              style={styles.primaryButton}
            >
              <FiSend /> Submit Your First Feedback
            </button>
          </div>
        ) : (
          <>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '40%' }}>Feedback Details</th>
                    <th>Category & Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeedbacks.map((feedback) => (
                    <tr key={feedback._id} style={styles.tableRow}>
                      <td>
                        <div style={styles.feedbackCell}>
                          <div style={styles.feedbackTitle}>
                            <strong>{feedback.title}</strong>
                            {feedback.hasResponse && !feedback.responseRead && (
                              <span style={styles.unreadBadge}>NEW</span>
                            )}
                          </div>
                          <div style={styles.feedbackMessage}>
                            {feedback.message?.length > 100 
                              ? `${feedback.message.substring(0, 100)}...` 
                              : feedback.message}
                          </div>
                          {feedback.student && (
                            <div style={styles.studentInfo}>
                              <FiUser size={12} /> Regarding: {feedback.student?.firstName} {feedback.student?.lastName}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={styles.categoryCell}>
                          <span style={{
                            ...styles.categoryTag,
                            ...getCategoryStyle(feedback.category)
                          }}>
                            {feedback.category}
                          </span>
                          <span style={{
                            ...styles.priorityTag,
                            ...getPriorityStyle(feedback.priority)
                          }}>
                            {feedback.priority}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '4px',
                          ...getStatusStyle(feedback.status)
                        }}>
                          {getStatusIcon(feedback.status)}
                          {feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1)}
                        </span>
                        {feedback.repliedAt && (
                          <div style={styles.updateTime}>
                            Replied: {formatDate(feedback.repliedAt)}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={styles.dateCell}>
                          {formatDate(feedback.createdAt)}
                          {feedback.updatedAt && feedback.updatedAt !== feedback.createdAt && (
                            <div style={styles.updateTime}>
                              Updated: {formatDate(feedback.updatedAt)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => handleViewFeedback(feedback)}
                            style={styles.viewButton}
                            title="View Details"
                          >
                            <FiEye /> View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={styles.pagination}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  style={styles.paginationButton}
                >
                  Previous
                </button>
                
                <div style={styles.pageNumbers}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        style={{
                          ...styles.pageButton,
                          ...(currentPage === pageNum 
                            ? { backgroundColor: '#4B5320', color: '#FFFFFF', borderColor: '#4B5320' } 
                            : {})
                        }}
                        disabled={loading}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  style={styles.paginationButton}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Feedback Form Modal */}
      {showForm && (
        <div style={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <FiMessageSquare /> Submit New Feedback
              </h3>
              <button 
                onClick={() => setShowForm(false)} 
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Brief title of your feedback"
                    required
                    style={styles.formInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Message *</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Please provide detailed feedback..."
                    required
                    style={styles.formTextarea}
                    rows={6}
                  />
                </div>

                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      style={styles.formSelect}
                    >
                      <option value="General">General</option>
                      <option value="Academic">Academic</option>
                      <option value="Behavior">Behavior</option>
                      <option value="Attendance">Attendance</option>
                      <option value="Fee">Fee</option>
                      <option value="Technical">Technical</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Priority</label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      style={styles.formSelect}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Related to Child (Optional)</label>
                  <select
                    name="student"
                    value={formData.student}
                    onChange={handleInputChange}
                    style={styles.formSelect}
                  >
                    <option value="">Select a child</option>
                    {children.map(child => (
                      <option key={child.id} value={child.id}>
                        {child.name} ({child.studentId})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formActions}>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={styles.submitButton}
                  >
                    <FiSend /> Submit Feedback
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <div style={styles.modalOverlay} onClick={() => setSelectedFeedback(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <FiMessageSquare /> Feedback Details
              </h3>
              <button 
                onClick={() => setSelectedFeedback(null)} 
                style={styles.modalClose}
              >
                ×
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.feedbackDetails}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Title:</span>
                  <span style={styles.detailValue}>{selectedFeedback.title}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Status:</span>
                  <span style={{
                    ...styles.statusBadge,
                    ...getStatusStyle(selectedFeedback.status)
                  }}>
                    {getStatusIcon(selectedFeedback.status)}
                    {selectedFeedback.status.charAt(0).toUpperCase() + selectedFeedback.status.slice(1)}
                  </span>
                </div>
                {selectedFeedback.student && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Regarding:</span>
                    <span style={styles.detailValue}>
                      {selectedFeedback.student?.firstName} {selectedFeedback.student?.lastName} 
                      ({selectedFeedback.student?.studentId})
                    </span>
                  </div>
                )}
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Submitted:</span>
                  <span style={styles.detailValue}>{formatDate(selectedFeedback.createdAt)}</span>
                </div>
              </div>
              
              <div style={styles.messageSection}>
                <h4 style={styles.sectionTitle}>Your Message</h4>
                <div style={styles.messageBox}>
                  {selectedFeedback.message}
                </div>
              </div>
              
              {selectedFeedback.reply ? (
                <div style={styles.messageSection}>
                  <h4 style={styles.sectionTitle}>
                    School Response ({formatDate(selectedFeedback.repliedAt)})
                  </h4>
                  <div style={{...styles.messageBox, backgroundColor: '#E6FFE6'}}>
                    {selectedFeedback.reply}
                  </div>
                  {selectedFeedback.repliedBy && (
                    <div style={styles.respondedBy}>
                      Responded by: {selectedFeedback.repliedBy?.firstName} {selectedFeedback.repliedBy?.lastName}
                    </div>
                  )}
                </div>
              ) : (
                <div style={styles.waitingMessage}>
                  <FiClock style={{ fontSize: '24px', marginBottom: '10px' }} />
                  <p>Your feedback is being reviewed by school administration.</p>
                  <p style={{ fontSize: '14px', color: '#6B7280' }}>
                    You will be notified when a response is provided.
                  </p>
                </div>
              )}
            </div>
            
            <div style={styles.modalActions}>
              <button
                onClick={() => setSelectedFeedback(null)}
                style={styles.closeButton}
              >
                Close
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
    padding: '24px',
    backgroundColor: '#F8F9FA',
    minHeight: '100vh'
  },
  header: {
    marginBottom: '24px',
    position: 'relative'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#4B5320',
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  titleIcon: {
    fontSize: '32px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#6B7280',
    margin: '0 0 16px 0',
    maxWidth: '600px'
  },
  backButton: {
    backgroundColor: '#4B5320',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #E5E7EB',
    textAlign: 'center',
    transition: 'transform 0.2s'
  },
  statIcon: {
    fontSize: '32px',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'center'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#4B5320',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  errorMessage: {
    backgroundColor: '#FFF3F3',
    color: '#B22222',
    borderLeft: '4px solid #B22222',
    padding: '16px',
    marginBottom: '20px',
    borderRadius: '4px',
    fontSize: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  successMessage: {
    backgroundColor: '#E6FFE6',
    color: '#228B22',
    borderLeft: '4px solid #228B22',
    padding: '16px',
    marginBottom: '20px',
    borderRadius: '4px',
    fontSize: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '20px',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%'
  },
  controlPanel: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #E5E7EB',
    marginBottom: '32px'
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  panelTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#4B5320',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  panelIcon: {
    fontSize: '20px'
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  primaryButton: {
    padding: '10px 20px',
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minWidth: '120px'
  },
  secondaryButton: {
    padding: '10px 20px',
    backgroundColor: '#66FF66',
    color: '#4B5320',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  searchContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '16px'
  },
  searchForm: {
    flex: '1',
    minWidth: '300px'
  },
  searchInputGroup: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    overflow: 'hidden'
  },
  searchIcon: {
    fontSize: '20px',
    color: '#6B7280',
    marginLeft: '12px'
  },
  searchInput: {
    flex: '1',
    padding: '12px 16px',
    border: 'none',
    fontSize: '14px',
    color: '#4B5320',
    outline: 'none'
  },
  searchButton: {
    padding: '12px 24px',
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px'
  },
  clearFiltersButton: {
    padding: '10px 16px',
    backgroundColor: '#F8F9FA',
    color: '#4B5320',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  filtersSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '20px',
    borderTop: '1px solid #E5E7EB'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4B5320',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  filterButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  filterButton: {
    padding: '8px 16px',
    backgroundColor: '#F8F9FA',
    color: '#6B7280',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  },
  filterActive: {
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    borderColor: '#4B5320',
    fontWeight: '600'
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#F8F9FA',
    color: '#4B5320',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  resultsContainer: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #E5E7EB'
  },
  tableHeader: {
    marginBottom: '20px'
  },
  tableTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#4B5320',
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  tableSubtitle: {
    fontSize: '12px',
    color: '#6B7280',
    fontWeight: 'normal'
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
    borderTop: '4px solid #4B5320',
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
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    color: '#D1D5DB'
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#4B5320',
    margin: 0
  },
  emptyText: {
    fontSize: '14px',
    lineHeight: '1.5',
    maxWidth: '400px',
    margin: '0 0 20px 0'
  },
  tableContainer: {
    overflowX: 'auto',
    marginBottom: '24px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableRow: {
    borderBottom: '1px solid #E5E7EB',
    transition: 'background-color 0.2s'
  },
  feedbackCell: {
    padding: '16px 0'
  },
  feedbackTitle: {
    fontWeight: '600',
    color: '#4B5320',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  unreadBadge: {
    backgroundColor: '#FF6B6B',
    color: 'white',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '10px',
    fontWeight: 'bold'
  },
  feedbackMessage: {
    fontSize: '13px',
    color: '#6B7280',
    marginBottom: '8px',
    lineHeight: '1.4'
  },
  studentInfo: {
    fontSize: '11px',
    color: '#9CA3AF',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  categoryCell: {
    padding: '16px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  categoryTag: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
    width: 'fit-content'
  },
  priorityTag: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block',
    width: 'fit-content'
  },
  dateCell: {
    padding: '16px 0',
    fontSize: '13px',
    color: '#4B5320'
  },
  updateTime: {
    fontSize: '11px',
    color: '#9CA3AF',
    marginTop: '2px'
  },
  actionButtons: {
    padding: '16px 0'
  },
  viewButton: {
    padding: '8px 16px',
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'opacity 0.2s'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    paddingTop: '20px',
    borderTop: '1px solid #E5E7EB'
  },
  paginationButton: {
    padding: '8px 16px',
    backgroundColor: '#F8F9FA',
    color: '#4B5320',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  pageNumbers: {
    display: 'flex',
    gap: '8px'
  },
  pageButton: {
    padding: '8px 12px',
    backgroundColor: '#F8F9FA',
    color: '#4B5320',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer',
    minWidth: '40px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #E5E7EB'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#4B5320',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#6B7280',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%'
  },
  modalBody: {
    marginBottom: '24px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  formLabel: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#4B5320',
    fontSize: '14px'
  },
  formInput: {
    width: '100%',
    padding: '12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#4B5320'
  },
  formTextarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#4B5320',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px'
  },
  formSelect: {
    width: '100%',
    padding: '12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#4B5320',
    backgroundColor: 'white'
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '32px'
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: '#F8F9FA',
    color: '#4B5320',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  submitButton: {
    padding: '12px 24px',
    backgroundColor: '#4B5320',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  feedbackDetails: {
    backgroundColor: '#F8F9FA',
    padding: '16px',
    borderRadius: '6px',
    marginBottom: '20px'
  },
  detailRow: {
    display: 'flex',
    marginBottom: '8px',
    alignItems: 'center'
  },
  detailLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#4B5320',
    minWidth: '100px'
  },
  detailValue: {
    fontSize: '14px',
    color: '#4B5320',
    flex: 1
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  messageSection: {
    marginBottom: '24px'
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#4B5320',
    margin: '0 0 12px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  messageBox: {
    backgroundColor: '#F8F9FA',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #E5E7EB',
    fontSize: '14px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    maxHeight: '300px',
    overflowY: 'auto'
  },
  respondedBy: {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '8px',
    textAlign: 'right'
  },
  waitingMessage: {
    textAlign: 'center',
    color: '#6B7280',
    padding: '40px 20px',
    backgroundColor: '#F8F9FA',
    borderRadius: '6px',
    border: '1px solid #E5E7EB'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    paddingTop: '20px',
    borderTop: '1px solid #E5E7EB'
  }
};

// Add CSS animation for spinner
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

export default ParentFeedback;