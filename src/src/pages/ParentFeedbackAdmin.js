import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { 
  FiEye, 
  FiMessageSquare, 
  FiArchive, 
  FiSearch, 
  FiRefreshCw,
  FiCheck,
  FiClock,
  FiMail,
  FiUser,
  FiUsers,
  FiChevronDown,
  FiFileText,
  FiGrid,
  FiFilter,
  FiX,
  FiAlertCircle,
  FiCheckCircle,
  FiInbox,
  FiCornerUpLeft
} from 'react-icons/fi';

const ParentFeedbackAdmin = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, replied, archived
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    replied: 0,
    archived: 0
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFeedbacks, setTotalFeedbacks] = useState(0);
  const [selectedFeedbacks, setSelectedFeedbacks] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [notifyParent, setNotifyParent] = useState(true);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchFeedbacks();
  }, [filter, searchQuery, currentPage, selectedCategories]);

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
      if (selectedCategories.length > 0) {
        selectedCategories.forEach(cat => params.append('categories', cat));
      }
      params.append('page', currentPage);
      params.append('limit', 20);

      const response = await axios.get(`${API_BASE_URL}/api/admin/parent-feedbacks?${params}`, {
        headers: getAuthHeaders()
      });

      console.log('Feedbacks fetched successfully:', response.data);
      
      const feedbacksData = response.data.feedbacks || [];
      setFeedbacks(feedbacksData);
      setSelectedFeedbacks([]);
      
      if (response.data.pagination) {
        setCurrentPage(response.data.pagination.currentPage);
        setTotalPages(response.data.pagination.totalPages);
        setTotalFeedbacks(response.data.pagination.totalFeedbacks);
      } else {
        setTotalFeedbacks(feedbacksData.length);
      }
      
      if (response.data.stats) {
        setStats({
          total: response.data.stats.total || 0,
          pending: response.data.stats.pending || 0,
          replied: response.data.stats.replied || 0,
          archived: response.data.stats.archived || 0
        });
      }
      
      if (response.data.categories) {
        setCategories(response.data.categories);
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to load feedbacks';
      setError(`Error ${err.response?.status || 'Unknown'}: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedFeedback) return;
    
    setActionLoading(true);
    clearMessages();
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/parent-feedbacks/${selectedFeedback._id}/reply`,
        {
          reply: replyText,
          notifyParent: notifyParent
        },
        { headers: getAuthHeaders() }
      );

      console.log('Reply sent successfully:', response.data);
      
      setFeedbacks(prev => prev.map(fb => 
        fb._id === selectedFeedback._id 
          ? { 
              ...fb, 
              status: 'replied', 
              reply: replyText, 
              repliedAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString() 
            }
          : fb
      ));
      
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        replied: prev.replied + 1
      }));
      
      setSelectedFeedback(null);
      setReplyText('');
      setSuccess('Reply sent successfully! Parent has been notified.');
    } catch (err) {
      console.error('Error sending reply:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to send reply';
      setError(`Error: ${errorMessage}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async (feedbackId, unarchive = false) => {
    setActionLoading(true);
    clearMessages();
    
    try {
      const endpoint = unarchive 
        ? `${API_BASE_URL}/api/admin/parent-feedbacks/${feedbackId}/unarchive`
        : `${API_BASE_URL}/api/admin/parent-feedbacks/${feedbackId}/archive`;
      
      const response = await axios.put(endpoint, {}, {
        headers: getAuthHeaders()
      });

      console.log('Archive action completed:', response.data);
      
      const newStatus = unarchive ? 'pending' : 'archived';
      
      setFeedbacks(prev => prev.map(fb => 
        fb._id === feedbackId 
          ? { 
              ...fb, 
              status: newStatus,
              lastUpdated: new Date().toISOString() 
            }
          : fb
      ));
      
      if (selectedFeedback?._id === feedbackId) {
        setSelectedFeedback(null);
      }
      
      if (unarchive) {
        setStats(prev => ({
          ...prev,
          archived: Math.max(0, prev.archived - 1),
          pending: prev.pending + 1
        }));
      } else {
        const feedback = feedbacks.find(f => f._id === feedbackId);
        if (feedback) {
          setStats(prev => ({
            ...prev,
            [feedback.status]: Math.max(0, prev[feedback.status] - 1),
            archived: prev.archived + 1
          }));
        }
      }
      
      setSuccess(`Feedback ${unarchive ? 'unarchived' : 'archived'} successfully!`);
    } catch (err) {
      console.error('Error archiving feedback:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to update feedback';
      setError(`Error: ${errorMessage}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkArchive = async (archive = true) => {
    if (selectedFeedbacks.length === 0) {
      setError('Please select at least one feedback');
      return;
    }

    setActionLoading(true);
    clearMessages();
    
    try {
      const endpoint = archive
        ? `${API_BASE_URL}/api/admin/parent-feedbacks/bulk-archive`
        : `${API_BASE_URL}/api/admin/parent-feedbacks/bulk-unarchive`;
      
      const response = await axios.put(endpoint, {
        feedbackIds: selectedFeedbacks,
        notifyParents: notifyParent
      }, {
        headers: getAuthHeaders()
      });

      console.log('Bulk archive action completed:', response.data);
      
      const newStatus = archive ? 'archived' : 'pending';
      
      setFeedbacks(prev => prev.map(fb => 
        selectedFeedbacks.includes(fb._id)
          ? { 
              ...fb, 
              status: newStatus,
              lastUpdated: new Date().toISOString() 
            }
          : fb
      ));

      if (selectedFeedback && selectedFeedbacks.includes(selectedFeedback._id)) {
        setSelectedFeedback(null);
      }
      
      setSelectedFeedbacks([]);
      setBulkAction('');
      
      const affectedFeedbacks = feedbacks.filter(f => selectedFeedbacks.includes(f._id));
      const statusCounts = affectedFeedbacks.reduce((acc, fb) => {
        acc[fb.status] = (acc[fb.status] || 0) + 1;
        return acc;
      }, {});

      setStats(prev => {
        const newStats = { ...prev };
        Object.keys(statusCounts).forEach(status => {
          newStats[status] = Math.max(0, (newStats[status] || 0) - statusCounts[status]);
        });
        newStats[archive ? 'archived' : 'pending'] = 
          (newStats[archive ? 'archived' : 'pending'] || 0) + selectedFeedbacks.length;
        return newStats;
      });
      
      setSuccess(`Successfully ${archive ? 'archived' : 'unarchived'} ${selectedFeedbacks.length} feedback(s)`);
    } catch (err) {
      console.error('Error performing bulk archive:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to perform bulk action';
      setError(`Error: ${errorMessage}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedFeedbacks.length === 0) {
      setError('Please select feedbacks and choose an action');
      return;
    }

    if (bulkAction === 'archive') {
      await handleBulkArchive(true);
    } else if (bulkAction === 'unarchive') {
      await handleBulkArchive(false);
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch(status) {
      case 'pending': 
        return { backgroundColor: '#FFFBF0', color: '#D4A017', border: '1px solid #FDE68A' };
      case 'replied': 
        return { backgroundColor: '#E6FFE6', color: '#228B22', border: '1px solid #228B22' };
      case 'archived': 
        return { backgroundColor: '#F8F9FA', color: '#6B7280', border: '1px solid #D1D5DB' };
      default: 
        return { backgroundColor: '#F8F9FA', color: '#6B7280', border: '1px solid #D1D5DB' };
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy HH:mm');
    } catch (err) {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedFeedbacks(feedbacks.map(fb => fb._id));
    } else {
      setSelectedFeedbacks([]);
    }
  };

  const handleSelectFeedback = (feedbackId) => {
    setSelectedFeedbacks(prev => 
      prev.includes(feedbackId) 
        ? prev.filter(id => id !== feedbackId)
        : [...prev, feedbackId]
    );
  };

  const clearFilters = () => {
    setFilter('all');
    setSearchQuery('');
    setSelectedCategories([]);
    setCurrentPage(1);
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

  const toggleCategory = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(cat => cat !== category)
        : [...prev, category]
    );
    setCurrentPage(1);
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
          Manage and respond to feedback from parents. Monitor inquiries and ensure timely responses.
        </p>
      </div>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📩</div>
          <div style={styles.statValue}>{stats.total}</div>
          <div style={styles.statLabel}>Total Feedback</div>
        </div>
        
        <div style={{...styles.statCard, borderColor: '#D4A017'}}>
          <div style={{...styles.statIcon, color: '#D4A017'}}>
            <FiAlertCircle />
          </div>
          <div style={styles.statValue}>{stats.pending}</div>
          <div style={styles.statLabel}>Pending</div>
        </div>
        
        <div style={{...styles.statCard, borderColor: '#228B22'}}>
          <div style={{...styles.statIcon, color: '#228B22'}}>
            <FiCheckCircle />
          </div>
          <div style={styles.statValue}>{stats.replied}</div>
          <div style={styles.statLabel}>Replied</div>
        </div>
        
        <div style={{...styles.statCard, borderColor: '#6B7280'}}>
          <div style={{...styles.statIcon, color: '#6B7280'}}>
            <FiArchive />
          </div>
          <div style={styles.statValue}>{stats.archived}</div>
          <div style={styles.statLabel}>Archived</div>
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

      {/* Search and Filters Section */}
      <div style={styles.controlPanel}>
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>
            <FiFilter style={styles.panelIcon} />
            Feedback Management Controls
          </h3>
          
          <div style={styles.bulkActions}>
            {selectedFeedbacks.length > 0 && (
              <span style={styles.selectedCount}>
                {selectedFeedbacks.length} selected
              </span>
            )}
            
            <select 
              value={bulkAction} 
              onChange={(e) => setBulkAction(e.target.value)}
              style={styles.bulkSelect}
              disabled={actionLoading || selectedFeedbacks.length === 0}
            >
              <option value="">Bulk Actions...</option>
              <option value="archive">Archive Selected</option>
              <option value="unarchive">Unarchive Selected</option>
            </select>
            
            <button 
              onClick={handleBulkAction}
              style={{
                ...styles.primaryButton,
                ...(actionLoading || !bulkAction || selectedFeedbacks.length === 0 ? styles.disabledButton : {})
              }}
              disabled={actionLoading || !bulkAction || selectedFeedbacks.length === 0}
            >
              <FiCheck /> Apply
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
                placeholder="Search by parent name, email, child name, or message..."
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

        {/* Filters */}
        <div style={styles.filtersSection}>
          <div style={styles.filtersGrid}>
            {/* Status Filter Buttons */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Status</label>
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
                <button
                  style={{
                    ...styles.filterButton,
                    ...(filter === 'archived' ? styles.filterActive : {})
                  }}
                  onClick={() => setFilter('archived')}
                >
                  <FiArchive /> Archived
                </button>
              </div>
            </div>

            {/* Categories Filter */}
            {categories.length > 0 && (
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Categories</label>
                <div style={styles.categoryTags}>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      style={{
                        ...styles.categoryTag,
                        ...(selectedCategories.includes(category) ? styles.categoryTagActive : {})
                      }}
                    >
                      {category}
                      {selectedCategories.includes(category) && ' ✓'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={styles.filterActions}>
            <label style={styles.notifyToggle}>
              <input 
                type="checkbox" 
                checked={notifyParent} 
                onChange={(e) => setNotifyParent(e.target.checked)}
                style={{ cursor: 'pointer', marginRight: '8px' }}
                disabled={actionLoading}
              />
              Notify parents via email when replying
            </label>
            
            <button 
              onClick={fetchFeedbacks}
              disabled={actionLoading || loading}
              style={styles.secondaryButton}
            >
              <FiRefreshCw /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div style={styles.resultsContainer}>
        <div style={styles.tableHeader}>
          <h3 style={styles.tableTitle}>
            Feedback ({totalFeedbacks})
            <span style={styles.tableSubtitle}>
              Showing page {currentPage} of {totalPages}
            </span>
          </h3>
          <div style={styles.tableActions}>
            {feedbacks.length > 0 && (
              <button 
                onClick={fetchFeedbacks} 
                disabled={loading}
                style={styles.refreshButton}
              >
                ↻ Refresh
              </button>
            )}
          </div>
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
              {searchQuery || filter !== 'all' || selectedCategories.length > 0
                ? 'Try adjusting your search or filters.'
                : 'No feedback has been submitted yet.'}
            </p>
            <button 
              onClick={fetchFeedbacks} 
              style={styles.primaryButton}
            >
              <FiRefreshCw /> Refresh
            </button>
          </div>
        ) : (
          <>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={selectedFeedbacks.length === feedbacks.length && feedbacks.length > 0}
                        disabled={actionLoading}
                      />
                    </th>
                    <th>Parent Details</th>
                    <th>Feedback Details</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeedbacks.map((feedback) => (
                    <tr key={feedback._id} style={styles.tableRow}>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedFeedbacks.includes(feedback._id)}
                          onChange={() => handleSelectFeedback(feedback._id)}
                          disabled={actionLoading}
                        />
                      </td>
                      <td>
                        <div style={styles.studentCell}>
                          <div style={styles.avatar}>
                            {feedback.parentName?.charAt(0) || 'P'}
                          </div>
                          <div>
                            <div style={styles.studentName}>
                              {feedback.parentName}
                            </div>
                            <div style={styles.studentId}>
                              {feedback.parentEmail}
                            </div>
                            <div style={styles.childInfo}>
                              <FiUser size={12} /> {feedback.childName} • {feedback.childGrade}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={styles.examInfo}>
                          <strong>{feedback.category}</strong>
                          <div style={styles.examDetails}>
                            {feedback.message?.length > 80 
                              ? `${feedback.message.substring(0, 80)}...` 
                              : feedback.message}
                          </div>
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
                          ...getStatusBadgeStyle(feedback.status)
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
                          {feedback.lastUpdated && feedback.lastUpdated !== feedback.createdAt && (
                            <div style={styles.updateTime}>
                              Updated: {formatDate(feedback.lastUpdated)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => setSelectedFeedback(feedback)}
                            disabled={actionLoading}
                            style={{
                              ...styles.viewButton,
                              backgroundColor: '#228B22',
                              color: '#FFFFFF'
                            }}
                            title="View & Reply"
                          >
                            <FiEye /> View
                          </button>
                          {feedback.status === 'archived' ? (
                            <button
                              onClick={() => handleArchive(feedback._id, true)}
                              disabled={actionLoading}
                              style={{
                                ...styles.archiveButton,
                                backgroundColor: '#6B7280',
                                color: '#FFFFFF'
                              }}
                              title="Unarchive"
                            >
                              <FiArchive /> Unarchive
                            </button>
                          ) : (
                            <button
                              onClick={() => handleArchive(feedback._id)}
                              disabled={actionLoading}
                              style={{
                                ...styles.archiveButton,
                                backgroundColor: '#FFFFFF',
                                color: '#6B7280',
                                border: '1px solid #D1D5DB'
                              }}
                              title="Archive"
                            >
                              <FiArchive /> Archive
                            </button>
                          )}
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
                            ? { backgroundColor: '#D4A017', color: '#FFFFFF', borderColor: '#D4A017' } 
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

      {/* Reply Modal */}
      {selectedFeedback && (
        <div style={styles.modalOverlay} onClick={() => !actionLoading && setSelectedFeedback(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <FiMessageSquare /> {selectedFeedback.reply ? 'View Feedback' : 'Reply to Feedback'}
              </h3>
              <button 
                onClick={() => !actionLoading && setSelectedFeedback(null)} 
                style={styles.modalClose}
                disabled={actionLoading}
              >
                ×
              </button>
            </div>
            
            <div style={styles.modalBody}>
              {/* Feedback Details */}
              <div style={styles.feedbackDetails}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>From:</span>
                  <span style={styles.detailValue}>{selectedFeedback.parentName} ({selectedFeedback.parentEmail})</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Regarding:</span>
                  <span style={styles.detailValue}>{selectedFeedback.childName} - {selectedFeedback.childGrade}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Category:</span>
                  <span style={styles.detailValue}>{selectedFeedback.category}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Date:</span>
                  <span style={styles.detailValue}>{formatDate(selectedFeedback.createdAt)}</span>
                </div>
              </div>
              
              {/* Original Message */}
              <div style={styles.messageSection}>
                <h4 style={styles.sectionTitle}>Message from Parent</h4>
                <div style={styles.messageBox}>
                  {selectedFeedback.message}
                </div>
              </div>
              
              {/* Previous Reply or Reply Input */}
              {selectedFeedback.reply ? (
                <div style={styles.messageSection}>
                  <h4 style={styles.sectionTitle}>
                    Your Reply ({formatDate(selectedFeedback.repliedAt)})
                  </h4>
                  <div style={{...styles.messageBox, backgroundColor: '#E6FFE6'}}>
                    {selectedFeedback.reply}
                  </div>
                </div>
              ) : (
                <div style={styles.replySection}>
                  <h4 style={styles.sectionTitle}>Your Reply</h4>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply here..."
                    style={styles.replyTextarea}
                    disabled={actionLoading}
                    rows={6}
                  />
                </div>
              )}
              
              {/* Notify Parent Checkbox */}
              {!selectedFeedback.reply && (
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={notifyParent}
                    onChange={(e) => setNotifyParent(e.target.checked)}
                    disabled={actionLoading}
                    style={{ marginRight: '8px' }}
                  />
                  Send email notification to parent
                </label>
              )}
            </div>
            
            <div style={styles.modalActions}>
              <button
                onClick={() => !actionLoading && setSelectedFeedback(null)}
                disabled={actionLoading}
                style={styles.secondaryButton}
              >
                Close
              </button>
              
              {!selectedFeedback.reply ? (
                <button
                  onClick={handleReply}
                  disabled={actionLoading || !replyText.trim()}
                  style={{
                    ...styles.primaryButton,
                    ...(actionLoading || !replyText.trim() ? styles.disabledButton : {})
                  }}
                >
                  {actionLoading ? 'Sending...' : 'Send Reply'}
                </button>
              ) : (
                <>
                  {selectedFeedback.status === 'archived' ? (
                    <button
                      onClick={() => handleArchive(selectedFeedback._id, true)}
                      disabled={actionLoading}
                      style={styles.primaryButton}
                    >
                      <FiArchive /> Unarchive
                    </button>
                  ) : (
                    <button
                      onClick={() => handleArchive(selectedFeedback._id)}
                      disabled={actionLoading}
                      style={styles.secondaryButton}
                    >
                      <FiArchive /> Archive
                    </button>
                  )}
                </>
              )}
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
    marginBottom: '24px'
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
    margin: 0,
    maxWidth: '600px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
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
    transition: 'transform 0.2s',
    cursor: 'pointer'
  },
  statCardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
  bulkActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  selectedCount: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#D4A017',
    backgroundColor: '#FFFBF0',
    padding: '8px 16px',
    borderRadius: '20px',
    border: '1px solid #FDE68A'
  },
  bulkSelect: {
    padding: '10px 36px 10px 16px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    fontSize: '14px',
    color: '#4B5320',
    cursor: 'pointer',
    minWidth: '180px'
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
    backgroundColor: '#D4A017',
    color: '#4B5320',
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
    marginTop: '24px'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '24px',
    marginBottom: '24px'
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
    backgroundColor: '#D4A017',
    color: '#4B5320',
    borderColor: '#D4A017',
    fontWeight: '600'
  },
  categoryTags: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  categoryTag: {
    padding: '6px 12px',
    backgroundColor: '#F8F9FA',
    color: '#6B7280',
    border: '1px solid #D1D5DB',
    borderRadius: '20px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  categoryTagActive: {
    backgroundColor: '#D4A017',
    color: '#4B5320',
    borderColor: '#D4A017',
    fontWeight: '600'
  },
  filterActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '20px',
    borderTop: '1px solid #E5E7EB'
  },
  notifyToggle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#4B5320',
    cursor: 'pointer'
  },
  primaryButton: {
    padding: '10px 20px',
    backgroundColor: '#D4A017',
    color: '#4B5320',
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
    backgroundColor: '#6B7280',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minWidth: '120px'
  },
  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  resultsContainer: {
    backgroundColor: '#FFFFFF',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #E5E7EB'
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  tableActions: {
    display: 'flex',
    gap: '12px'
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#F8F9FA',
    color: '#4B5320',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
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
  studentCell: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px 0'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#D4A017',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    flexShrink: 0
  },
  studentName: {
    fontWeight: '600',
    color: '#4B5320',
    marginBottom: '4px'
  },
  studentId: {
    fontSize: '12px',
    color: '#6B7280',
    marginBottom: '4px'
  },
  childInfo: {
    fontSize: '11px',
    color: '#9CA3AF',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  examInfo: {
    padding: '16px 0'
  },
  examDetails: {
    fontSize: '13px',
    color: '#6B7280',
    marginTop: '4px',
    lineHeight: '1.4'
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
    display: 'flex',
    gap: '8px',
    padding: '16px 0'
  },
  viewButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    minWidth: '80px',
    justifyContent: 'center',
    transition: 'opacity 0.2s'
  },
  archiveButton: {
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    minWidth: '90px',
    justifyContent: 'center',
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
  feedbackDetails: {
    backgroundColor: '#F8F9FA',
    padding: '16px',
    borderRadius: '6px',
    marginBottom: '20px'
  },
  detailRow: {
    display: 'flex',
    marginBottom: '8px',
    alignItems: 'flex-start'
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
    maxHeight: '200px',
    overflowY: 'auto'
  },
  replySection: {
    marginBottom: '20px'
  },
  replyTextarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    color: '#4B5320',
    resize: 'vertical',
    minHeight: '120px',
    backgroundColor: '#FFFFFF'
  },
  replyTextarea: {
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  replyTextarea: {
    borderColor: '#D4A017'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#4B5320',
    cursor: 'pointer',
    marginTop: '16px'
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

export default ParentFeedbackAdmin;