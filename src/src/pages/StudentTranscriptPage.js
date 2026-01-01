import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiSearch, 
  FiUser, 
  FiBookOpen, 
  FiTrendingUp, 
  FiPrinter, 
  FiDownload,
  FiChevronRight,
  FiCalendar,
  FiAward,
  FiBarChart2,
  FiFileText
} from 'react-icons/fi';
import { 
  MdOutlineSchool, 
  MdOutlineHistoryEdu,
  MdOutlineDescription 
} from 'react-icons/md';
import StudentTranscript from '../components/StudentTranscript/StudentTranscript';
import PromotionHistory from './PromotionHistory';

// Professional Brand Colors
const brandColors = {
  armyGreen: '#4B5320',    // Primary - Professional
  darkArmyGreen: '#2F3820', // Dark variant
  lightArmyGreen: '#5F6B3A', // Light variant
  accentGreen: '#6A8C2C',   // Accent green
  orange: '#FF6B35',        // Action/CTA - More sophisticated orange
  lightOrange: '#FF9B5E',   // Light orange
  darkOrange: '#CC552A',    // Dark orange
  neutralLight: '#F5F7F3',
  neutralMedium: '#E8EBE4',
  neutralDark: '#D1D6C9',
  textPrimary: '#1A1D1A',
  textSecondary: '#4A4F4A',
  textTertiary: '#7A7F7A',
  border: '#D4D8D4',
  cardBg: '#FFFFFF',
  error: '#DC3545',
  warning: '#FFC107',
  success: '#28A745',
  info: '#17A2B8'
};

const StudentTranscriptPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('transcript'); // 'transcript' or 'promotion'
  const [showInstructions, setShowInstructions] = useState(true);
  const navigate = useNavigate();

  const searchStudents = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter student name, ID, or username');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/users?search=${encodeURIComponent(searchQuery)}&role=student&limit=15`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const data = await response.json();
      if (data.success) {
        setSearchResults(data.users || []);
        if (data.users.length === 0) {
          setError('No students found matching your search criteria');
        }
      } else {
        setError(data.message || 'Search failed');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Error searching for students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setSelectedStudent(null);
    setSearchResults([]);
    setSearchQuery('');
    setActiveTab('transcript');
  };

  const downloadTranscript = async (studentId) => {
    // PDF download functionality
    alert(`Downloading transcript for student ${studentId}`);
  };

  const printTranscript = () => {
    window.print();
  };

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.pageTitle}>
            <MdOutlineDescription style={styles.titleIcon} />
            Academic Records Management
          </h1>
          <p style={styles.pageSubtitle}>
            Access student transcripts and promotion history
          </p>
        </div>
        <div style={styles.headerActions}>
          <button 
            onClick={() => navigate('/admin/promotion')}
            style={styles.promotionButton}
          >
            <FiTrendingUp style={{ marginRight: '6px' }} />
            Promotion Panel
          </button>
          <button 
            onClick={() => navigate('/admin/users?role=student')}
            style={styles.studentsButton}
          >
            <FiUser style={{ marginRight: '6px' }} />
            Student Directory
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {!selectedStudent ? (
          <>
            {/* Search Section */}
            <div style={styles.searchSection}>
              <div style={styles.searchHeader}>
                <h2 style={styles.sectionTitle}>
                  <FiSearch style={{ marginRight: '10px' }} />
                  Student Lookup
                </h2>
                <div style={styles.tabSelector}>
                  <button 
                    style={{
                      ...styles.tabButton,
                      ...(activeTab === 'transcript' ? styles.tabButtonActive : {})
                    }}
                    onClick={() => setActiveTab('transcript')}
                  >
                    <FiBookOpen style={{ marginRight: '8px' }} />
                    Transcripts
                  </button>
                  <button 
                    style={{
                      ...styles.tabButton,
                      ...(activeTab === 'promotion' ? styles.tabButtonActive : {})
                    }}
                    onClick={() => setActiveTab('promotion')}
                  >
                    <FiTrendingUp style={{ marginRight: '8px' }} />
                    Promotion History
                  </button>
                </div>
              </div>

              {/* Search Input */}
              <div style={styles.searchContainer}>
                <div style={styles.searchInputGroup}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      activeTab === 'transcript' 
                        ? "Search student by name, ID, or username for transcript..." 
                        : "Search student for promotion history..."
                    }
                    style={styles.searchInput}
                    onKeyPress={(e) => e.key === 'Enter' && searchStudents()}
                  />
                  <button
                    onClick={searchStudents}
                    disabled={loading || !searchQuery.trim()}
                    style={{
                      ...styles.searchButton,
                      ...(loading ? styles.searchButtonLoading : {})
                    }}
                  >
                    {loading ? (
                      <>
                        <span style={styles.spinner}></span>
                        Searching...
                      </>
                    ) : (
                      <>
                        <FiSearch style={{ marginRight: '8px' }} />
                        Search
                      </>
                    )}
                  </button>
                </div>
                
                {error && (
                  <div style={styles.errorMessage}>
                    <span style={styles.errorIcon}>⚠</span>
                    {error}
                  </div>
                )}

                {/* Instructions Panel */}
                {showInstructions && searchResults.length === 0 && (
                  <div style={styles.instructionsPanel}>
                    <div style={styles.instructionsHeader}>
                      <h3 style={styles.instructionsTitle}>
                        How it works
                      </h3>
                      <button 
                        onClick={() => setShowInstructions(false)}
                        style={styles.closeInstructions}
                      >
                        ×
                      </button>
                    </div>
                    <div style={styles.instructionsContent}>
                      <div style={styles.instructionItem}>
                        <div style={styles.instructionIcon}>
                          <FiSearch />
                        </div>
                        <div style={styles.instructionText}>
                          <strong>Search by any identifier</strong>
                          <p>Use student name, ID, username, or class</p>
                        </div>
                      </div>
                      <div style={styles.instructionItem}>
                        <div style={styles.instructionIcon}>
                          <FiBookOpen />
                        </div>
                        <div style={styles.instructionText}>
                          <strong>View Academic Transcript</strong>
                          <p>Complete academic record with grades and performance</p>
                        </div>
                      </div>
                      <div style={styles.instructionItem}>
                        <div style={styles.instructionIcon}>
                          <FiTrendingUp />
                        </div>
                        <div style={styles.instructionText}>
                          <strong>Track Promotion History</strong>
                          <p>View historical promotion records and academic progression</p>
                        </div>
                      </div>
                      <div style={styles.instructionItem}>
                        <div style={styles.instructionIcon}>
                          <FiPrinter />
                        </div>
                        <div style={styles.instructionText}>
                          <strong>Export & Print</strong>
                          <p>Generate official documents for records or external use</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div style={styles.resultsSection}>
                    <div style={styles.resultsHeader}>
                      <h3 style={styles.resultsTitle}>
                        Search Results
                        <span style={styles.resultsCount}>
                          {searchResults.length} student{searchResults.length !== 1 ? 's' : ''} found
                        </span>
                      </h3>
                      <p style={styles.resultsSubtitle}>
                        Select a student to view their {activeTab === 'transcript' ? 'academic transcript' : 'promotion history'}
                      </p>
                    </div>
                    
                    <div style={styles.resultsGrid}>
                      {searchResults.map((student, index) => (
                        <div 
                          key={student._id} 
                          style={{
                            ...styles.studentCard,
                            animationDelay: `${index * 0.05}s`
                          }}
                          onClick={() => setSelectedStudent(student)}
                        >
                          <div style={styles.studentCardHeader}>
                            <div style={styles.studentAvatar}>
                              {student.firstName?.[0] || 'S'}
                            </div>
                            <div style={styles.studentBasicInfo}>
                              <h4 style={styles.studentName}>
                                {student.firstName} {student.lastName}
                              </h4>
                              <div style={styles.studentMeta}>
                                <span style={styles.studentId}>
                                  <FiUser style={{ marginRight: '4px', fontSize: '12px' }} />
                                  {student.studentId || student.username}
                                </span>
                                {student.class && (
                                  <span style={styles.studentClass}>
                                    <MdOutlineSchool style={{ marginRight: '4px', fontSize: '12px' }} />
                                    {student.class.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div style={styles.studentCardDetails}>
                            <div style={styles.detailRow}>
                              <span style={styles.detailLabel}>Username:</span>
                              <span style={styles.detailValue}>{student.username}</span>
                            </div>
                            {student.email && (
                              <div style={styles.detailRow}>
                                <span style={styles.detailLabel}>Email:</span>
                                <span style={styles.detailValue}>{student.email}</span>
                              </div>
                            )}
                            <div style={styles.detailRow}>
                              <span style={styles.detailLabel}>Status:</span>
                              <span style={{
                                ...styles.statusBadge,
                                backgroundColor: student.active 
                                  ? `${brandColors.success}15` 
                                  : `${brandColors.error}15`,
                                color: student.active 
                                  ? brandColors.success 
                                  : brandColors.error
                              }}>
                                {student.active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                          
                          <div style={styles.studentCardFooter}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudent(student);
                              }}
                              style={styles.viewButton}
                            >
                              View {activeTab === 'transcript' ? 'Transcript' : 'History'}
                              <FiChevronRight style={{ marginLeft: '6px' }} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Feature Highlights */}
            {searchResults.length === 0 && (
              <div style={styles.featuresSection}>
                <h3 style={styles.featuresTitle}>Key Features</h3>
                <div style={styles.featuresGrid}>
                  <div style={styles.featureCard}>
                    <div style={styles.featureIcon} className="transcript-icon">
                      <FiFileText />
                    </div>
                    <h4 style={styles.featureName}>Comprehensive Transcripts</h4>
                    <p style={styles.featureDescription}>
                      Detailed academic records including grades, attendance, and performance metrics across all terms.
                    </p>
                  </div>
                  <div style={styles.featureCard}>
                    <div style={styles.featureIcon} className="promotion-icon">
                      <FiTrendingUp />
                    </div>
                    <h4 style={styles.featureName}>Promotion Tracking</h4>
                    <p style={styles.featureDescription}>
                      Complete historical record of student progression through academic levels and classes.
                    </p>
                  </div>
                  <div style={styles.featureCard}>
                    <div style={styles.featureIcon} className="export-icon">
                      <FiPrinter />
                    </div>
                    <h4 style={styles.featureName}>Export & Reporting</h4>
                    <p style={styles.featureDescription}>
                      Generate official documents in multiple formats for administrative and academic purposes.
                    </p>
                  </div>
                  <div style={styles.featureCard}>
                    <div style={styles.featureIcon} className="analytics-icon">
                      <FiBarChart2 />
                    </div>
                    <h4 style={styles.featureName}>Performance Analytics</h4>
                    <p style={styles.featureDescription}>
                      In-depth analysis of academic performance trends and achievement patterns over time.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Student Detail View */
          <div style={styles.detailView}>
            {/* Detail Header */}
            <div style={styles.detailHeader}>
              <button
                onClick={clearSelection}
                style={styles.backButton}
              >
                ← Back to Search
              </button>
              <div style={styles.detailTitleSection}>
                <h2 style={styles.detailTitle}>
                  {selectedStudent.firstName} {selectedStudent.lastName}
                  {selectedStudent.studentId && (
                    <span style={styles.detailStudentId}>
                      • {selectedStudent.studentId}
                    </span>
                  )}
                </h2>
                <p style={styles.detailSubtitle}>
                  {selectedStudent.class?.name || 'No class assigned'} • {selectedStudent.username}
                </p>
              </div>
              
              <div style={styles.detailActions}>
                <button 
                  onClick={() => navigate(`/admin/users/${selectedStudent._id}`)}
                  style={styles.profileButton}
                >
                  <FiUser style={{ marginRight: '6px' }} />
                  Full Profile
                </button>
                <button 
                  onClick={printTranscript}
                  style={styles.printButton}
                >
                  <FiPrinter style={{ marginRight: '6px' }} />
                  Print
                </button>
                <button 
                  onClick={() => downloadTranscript(selectedStudent._id)}
                  style={styles.downloadButton}
                >
                  <FiDownload style={{ marginRight: '6px' }} />
                  Export PDF
                </button>
              </div>
            </div>

            {/* Detail Content */}
            <div style={styles.detailContent}>
              {/* Tabs for Transcript/Promotion */}
              <div style={styles.contentTabs}>
                <button 
                  style={{
                    ...styles.contentTab,
                    ...(activeTab === 'transcript' ? styles.contentTabActive : {})
                  }}
                  onClick={() => setActiveTab('transcript')}
                >
                  <FiBookOpen style={{ marginRight: '8px' }} />
                  Academic Transcript
                </button>
                <button 
                  style={{
                    ...styles.contentTab,
                    ...(activeTab === 'promotion' ? styles.contentTabActive : {})
                  }}
                  onClick={() => setActiveTab('promotion')}
                >
                  <MdOutlineHistoryEdu style={{ marginRight: '8px' }} />
                  Promotion History
                </button>
              </div>

              {/* Content Area */}
              <div style={styles.contentArea}>
                {activeTab === 'transcript' ? (
                  <div style={styles.transcriptSection}>
                    <div style={styles.transcriptHeader}>
                      <h3 style={styles.transcriptTitle}>
                        Official Academic Transcript
                      </h3>
                      <div style={styles.transcriptMeta}>
                        <span style={styles.metaItem}>
                          <FiCalendar style={{ marginRight: '6px' }} />
                          Generated: {new Date().toLocaleDateString()}
                        </span>
                        <span style={styles.metaItem}>
                          <FiAward style={{ marginRight: '6px' }} />
                          Status: {selectedStudent.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <StudentTranscript 
                      studentId={selectedStudent._id} 
                      studentName={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
                    />
                  </div>
                ) : (
                  <div style={styles.promotionSection}>
                    <div style={styles.promotionHeader}>
                      <h3 style={styles.promotionTitle}>
                        Academic Progression History
                      </h3>
                      <p style={styles.promotionDescription}>
                        Complete record of class promotions and academic advancement
                      </p>
                    </div>
                    <PromotionHistory studentId={selectedStudent._id} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: brandColors.neutralLight
  },
  
  // Header Styles
  header: {
    backgroundColor: brandColors.cardBg,
    borderBottom: `1px solid ${brandColors.border}`,
    padding: '24px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerContent: {
    flex: 1
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: '600',
    color: brandColors.textPrimary,
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center'
  },
  titleIcon: {
    color: brandColors.armyGreen,
    marginRight: '12px',
    fontSize: '32px'
  },
  pageSubtitle: {
    fontSize: '15px',
    color: brandColors.textTertiary,
    margin: 0
  },
  headerActions: {
    display: 'flex',
    gap: '12px'
  },
  promotionButton: {
    padding: '10px 20px',
    backgroundColor: brandColors.armyGreen,
    color: brandColors.cardBg,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: brandColors.darkArmyGreen,
      transform: 'translateY(-1px)'
    }
  },
  studentsButton: {
    padding: '10px 20px',
    backgroundColor: brandColors.cardBg,
    color: brandColors.armyGreen,
    border: `1px solid ${brandColors.armyGreen}`,
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: `${brandColors.armyGreen}08`
    }
  },
  
  // Main Content
  content: {
    padding: '30px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  
  // Search Section
  searchSection: {
    backgroundColor: brandColors.cardBg,
    borderRadius: '12px',
    border: `1px solid ${brandColors.border}`,
    overflow: 'hidden',
    marginBottom: '30px'
  },
  searchHeader: {
    padding: '24px 30px',
    borderBottom: `1px solid ${brandColors.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: brandColors.textPrimary,
    margin: 0,
    display: 'flex',
    alignItems: 'center'
  },
  tabSelector: {
    display: 'flex',
    gap: '4px',
    backgroundColor: brandColors.neutralMedium,
    borderRadius: '8px',
    padding: '4px'
  },
  tabButton: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    color: brandColors.textSecondary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease'
  },
  tabButtonActive: {
    backgroundColor: brandColors.cardBg,
    color: brandColors.armyGreen,
    boxShadow: `0 2px 8px ${brandColors.border}`
  },
  
  // Search Container
  searchContainer: {
    padding: '30px'
  },
  searchInputGroup: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px'
  },
  searchInput: {
    flex: 1,
    padding: '14px 20px',
    fontSize: '16px',
    border: `1px solid ${brandColors.border}`,
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: brandColors.cardBg,
    '&:focus': {
      borderColor: brandColors.armyGreen,
      boxShadow: `0 0 0 3px ${brandColors.armyGreen}15`
    },
    '&::placeholder': {
      color: brandColors.textTertiary
    }
  },
  searchButton: {
    padding: '0 32px',
    backgroundColor: brandColors.armyGreen,
    color: brandColors.cardBg,
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    minWidth: '140px',
    '&:hover:not(:disabled)': {
      backgroundColor: brandColors.darkArmyGreen,
      transform: 'translateY(-1px)'
    },
    '&:disabled': {
      backgroundColor: brandColors.neutralDark,
      cursor: 'not-allowed',
      opacity: 0.7
    }
  },
  searchButtonLoading: {
    backgroundColor: brandColors.neutralDark
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: `2px solid ${brandColors.cardBg}`,
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px'
  },
  '@keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' }
  },
  
  // Error Message
  errorMessage: {
    backgroundColor: `${brandColors.error}08`,
    border: `1px solid ${brandColors.error}20`,
    color: brandColors.error,
    padding: '12px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px'
  },
  errorIcon: {
    marginRight: '10px',
    fontSize: '18px'
  },
  
  // Instructions Panel
  instructionsPanel: {
    backgroundColor: `${brandColors.armyGreen}05`,
    border: `1px solid ${brandColors.armyGreen}20`,
    borderRadius: '10px',
    marginBottom: '30px',
    overflow: 'hidden'
  },
  instructionsHeader: {
    padding: '18px 24px',
    backgroundColor: `${brandColors.armyGreen}08`,
    borderBottom: `1px solid ${brandColors.armyGreen}20`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  instructionsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: brandColors.armyGreen,
    margin: 0
  },
  closeInstructions: {
    backgroundColor: 'transparent',
    border: 'none',
    color: brandColors.textTertiary,
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&:hover': {
      color: brandColors.textPrimary
    }
  },
  instructionsContent: {
    padding: '24px'
  },
  instructionItem: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '20px',
    '&:last-child': {
      marginBottom: 0
    }
  },
  instructionIcon: {
    backgroundColor: brandColors.armyGreen,
    color: brandColors.cardBg,
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '16px',
    flexShrink: 0
  },
  instructionText: {
    flex: 1
  },
  'instructionText strong': {
    display: 'block',
    color: brandColors.textPrimary,
    marginBottom: '4px',
    fontSize: '15px',
    fontWeight: '500'
  },
  'instructionText p': {
    color: brandColors.textSecondary,
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.5
  },
  
  // Results Section
  resultsSection: {
    animation: 'fadeIn 0.3s ease-out'
  },
  resultsHeader: {
    marginBottom: '24px'
  },
  resultsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: brandColors.textPrimary,
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center'
  },
  resultsCount: {
    backgroundColor: brandColors.orange,
    color: brandColors.cardBg,
    fontSize: '12px',
    fontWeight: '500',
    padding: '2px 8px',
    borderRadius: '10px',
    marginLeft: '12px'
  },
  resultsSubtitle: {
    color: brandColors.textTertiary,
    margin: 0,
    fontSize: '14px'
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px'
  },
  
  // Student Card
  studentCard: {
    backgroundColor: brandColors.cardBg,
    border: `1px solid ${brandColors.border}`,
    borderRadius: '10px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    animation: 'slideIn 0.3s ease-out',
    animationFillMode: 'both',
    '&:hover': {
      borderColor: brandColors.armyGreen,
      boxShadow: `0 4px 20px ${brandColors.border}`,
      transform: 'translateY(-2px)'
    }
  },
  '@keyframes slideIn': {
    '0%': {
      opacity: 0,
      transform: 'translateY(10px)'
    },
    '100%': {
      opacity: 1,
      transform: 'translateY(0)'
    }
  },
  studentCardHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px'
  },
  studentAvatar: {
    width: '48px',
    height: '48px',
    backgroundColor: brandColors.armyGreen,
    color: brandColors.cardBg,
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '600',
    marginRight: '16px'
  },
  studentBasicInfo: {
    flex: 1
  },
  studentName: {
    fontSize: '16px',
    fontWeight: '600',
    color: brandColors.textPrimary,
    margin: '0 0 6px 0'
  },
  studentMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px'
  },
  studentId: {
    color: brandColors.textSecondary,
    display: 'flex',
    alignItems: 'center'
  },
  studentClass: {
    color: brandColors.orange,
    display: 'flex',
    alignItems: 'center'
  },
  studentCardDetails: {
    marginBottom: '20px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '13px',
    '&:last-child': {
      marginBottom: 0
    }
  },
  detailLabel: {
    color: brandColors.textSecondary
  },
  detailValue: {
    color: brandColors.textPrimary,
    fontWeight: '500'
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500'
  },
  studentCardFooter: {
    textAlign: 'right'
  },
  viewButton: {
    padding: '8px 16px',
    backgroundColor: brandColors.armyGreen,
    color: brandColors.cardBg,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: brandColors.darkArmyGreen
    }
  },
  
  // Features Section
  featuresSection: {
    backgroundColor: brandColors.cardBg,
    borderRadius: '12px',
    border: `1px solid ${brandColors.border}`,
    padding: '30px'
  },
  featuresTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: brandColors.textPrimary,
    margin: '0 0 24px 0',
    textAlign: 'center'
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px'
  },
  featureCard: {
    textAlign: 'center'
  },
  featureIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    margin: '0 auto 16px'
  },
  'featureIcon.transcript-icon': {
    backgroundColor: `${brandColors.armyGreen}15`,
    color: brandColors.armyGreen
  },
  'featureIcon.promotion-icon': {
    backgroundColor: `${brandColors.orange}15`,
    color: brandColors.orange
  },
  'featureIcon.export-icon': {
    backgroundColor: `${brandColors.accentGreen}15`,
    color: brandColors.accentGreen
  },
  'featureIcon.analytics-icon': {
    backgroundColor: `${brandColors.info}15`,
    color: brandColors.info
  },
  featureName: {
    fontSize: '16px',
    fontWeight: '600',
    color: brandColors.textPrimary,
    margin: '0 0 8px 0'
  },
  featureDescription: {
    color: brandColors.textSecondary,
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.5
  },
  
  // Detail View
  detailView: {
    backgroundColor: brandColors.cardBg,
    borderRadius: '12px',
    border: `1px solid ${brandColors.border}`,
    overflow: 'hidden'
  },
  detailHeader: {
    padding: '24px 30px',
    borderBottom: `1px solid ${brandColors.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '20px'
  },
  backButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: brandColors.textSecondary,
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.2s ease',
    '&:hover': {
      color: brandColors.armyGreen
    }
  },
  detailTitleSection: {
    flex: 1
  },
  detailTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: brandColors.textPrimary,
    margin: '0 0 6px 0',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px'
  },
  detailStudentId: {
    fontSize: '16px',
    fontWeight: '400',
    color: brandColors.textTertiary
  },
  detailSubtitle: {
    color: brandColors.textSecondary,
    margin: 0,
    fontSize: '14px'
  },
  detailActions: {
    display: 'flex',
    gap: '10px'
  },
  profileButton: {
    padding: '10px 20px',
    backgroundColor: brandColors.cardBg,
    color: brandColors.textPrimary,
    border: `1px solid ${brandColors.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: brandColors.neutralLight,
      borderColor: brandColors.armyGreen
    }
  },
  printButton: {
    padding: '10px 20px',
    backgroundColor: brandColors.cardBg,
    color: brandColors.orange,
    border: `1px solid ${brandColors.orange}`,
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: `${brandColors.orange}08`
    }
  },
  downloadButton: {
    padding: '10px 20px',
    backgroundColor: brandColors.orange,
    color: brandColors.cardBg,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: brandColors.darkOrange,
      transform: 'translateY(-1px)'
    }
  },
  
  // Detail Content
  detailContent: {
    minHeight: '500px'
  },
  contentTabs: {
    padding: '20px 30px 0',
    borderBottom: `1px solid ${brandColors.border}`,
    display: 'flex',
    gap: '4px'
  },
  contentTab: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: brandColors.textSecondary,
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    '&:hover': {
      color: brandColors.armyGreen
    }
  },
  contentTabActive: {
    color: brandColors.armyGreen,
    borderBottomColor: brandColors.armyGreen,
    backgroundColor: `${brandColors.armyGreen}05`
  },
  contentArea: {
    padding: '30px'
  },
  
  // Transcript Section
  transcriptSection: {
    animation: 'fadeIn 0.3s ease'
  },
  transcriptHeader: {
    marginBottom: '24px'
  },
  transcriptTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: brandColors.textPrimary,
    margin: '0 0 12px 0'
  },
  transcriptMeta: {
    display: 'flex',
    gap: '20px'
  },
  metaItem: {
    color: brandColors.textSecondary,
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center'
  },
  
  // Promotion Section
  promotionSection: {
    animation: 'fadeIn 0.3s ease'
  },
  promotionHeader: {
    marginBottom: '24px'
  },
  promotionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: brandColors.textPrimary,
    margin: '0 0 8px 0'
  },
  promotionDescription: {
    color: brandColors.textSecondary,
    margin: 0,
    fontSize: '14px'
  }
};

export default StudentTranscriptPage;