// pages/TeacherHome.js - UPDATED WITH BETTER ERROR HANDLING
import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { 
  FiHome, 
  FiPlusSquare, 
  FiUpload, 
  FiEdit, 
  FiBook, 
  FiBarChart, 
  FiLogOut, 
  FiUser,
  FiMenu,
  FiX,
  FiChevronRight,
  FiChevronLeft,
  FiAlertCircle,
  FiCheckCircle,
  FiSettings,
  FiFileText,
  FiClipboard,
  FiUsers,
  FiCalendar,
  FiClock,
  FiStar,
  FiGrid,
  FiLayers,
  FiPackage,
  FiFolder
} from 'react-icons/fi';

// Import Teacher Components
import TeacherDashboard from '../components/teacher/Dashboard';
import AddQuestion from '../components/teacher/AddQuestion';
import BulkImport from '../components/teacher/BulkImport';
import ManageQuestions from '../components/teacher/ManageQuestions';
import ManageTests from '../components/teacher/ManageTests';
import TeacherAnalytics from '../components/teacher/Analytics';
import TestCreation from '../pages/TestCreation';
import TestPreview from '../pages/TestPreview';
import AddTestQuestions from '../components/teacher/AddTestQuestions';
import TestResults from '../pages/TestResults';
import TeacherSchedule from '../components/teacher/TeacherSchedule';
import TeacherClasses from '../components/teacher/TeacherClasses';
import TeacherProfile from '../components/teacher/TeacherProfile';
import TeacherSettings from '../components/teacher/TeacherSettings';

const TeacherHome = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for responsive design
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [teacherData, setTeacherData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Brand colors
  const brandColors = {
    primary: '#4B5320',
    secondary: '#D4A017',
    accent: '#1a365d',
    light: '#f8fafc',
    white: '#FFFFFF',
    dark: '#0f172a',
    gray: '#64748B',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    background: '#ffffff',
    sidebarBg: '#ffffff',
    cardBg: '#ffffff',
  };

  // Fetch teacher data including assignments - UPDATED WITH BETTER ERROR HANDLING
  useEffect(() => {
    const fetchTeacherData = async () => {
      if (!user || user.role !== 'teacher') return;
      
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        console.log('📊 Fetching teacher assignments for:', user.id);
        
        // Fetch teacher with assignments - USING THE FIXED ROUTE
        const response = await fetch(`http://localhost:5000/api/users/teachers/${user.id}/assignments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ HTTP error:', response.status, errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Teacher assignments API response:', data);
        
        if (data.success && data.teacher) {
          const teacherWithAssignments = data.teacher;
          
          // Calculate summary statistics from assignments
          let totalClasses = 0;
          let totalSubjects = 0;
          let totalStudents = 0;
          
          if (data.assignments && data.assignments.length > 0) {
            totalClasses = data.assignments.length;
            totalSubjects = data.assignments.reduce((sum, assignment) => sum + (assignment.subjectCount || 0), 0);
            totalStudents = data.assignments.reduce((sum, assignment) => sum + (assignment.studentCount || 0), 0);
          }
          
          // Format classes for TeacherClasses component
          const formattedClasses = data.assignments?.map(assignment => {
            const classInfo = assignment.class || {};
            return {
              id: classInfo.id || assignment.class?.id,
              _id: classInfo.id || assignment.class?.id,
              name: classInfo.name || 'Unknown Class',
              level: classInfo.level || '',
              code: classInfo.code || '',
              shortName: classInfo.shortName || '',
              fullName: classInfo.fullName || classInfo.name,
              subjectCount: assignment.subjectCount || 0,
              subjects: assignment.subjects?.map(sub => ({
                id: sub.id || sub._id,
                _id: sub.id || sub._id,
                name: sub.name || 'Unknown Subject',
                code: sub.code || '',
                isCore: sub.isCore || false
              })) || [],
              studentCount: assignment.studentCount || 0
            };
          }) || [];
          
          const processedData = {
            ...teacherWithAssignments,
            summary: {
              totalClasses,
              totalSubjects,
              totalStudents
            },
            // Add formatted classes for TeacherClasses component
            classes: formattedClasses,
            assignments: data.assignments || []
          };
          
          console.log('✅ Processed teacher data:', processedData);
          setTeacherData(processedData);
          setError(null);
        } else {
          // If no assignments, still create basic teacher data
          const processedData = {
            ...user,
            summary: {
              totalClasses: 0,
              totalSubjects: 0,
              totalStudents: 0
            },
            classes: [],
            assignments: []
          };
          
          setTeacherData(processedData);
          console.log('ℹ️ Teacher has no assignments');
        }
      } catch (err) {
        console.error('❌ Error fetching teacher data:', err);
        setError('Failed to load teacher information. Please refresh the page.');
        
        // Set minimal teacher data to allow navigation
        const minimalTeacherData = {
          ...user,
          summary: { totalClasses: 0, totalSubjects: 0, totalStudents: 0 },
          classes: [],
          assignments: []
        };
        setTeacherData(minimalTeacherData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeacherData();
  }, [user]);

  // Check screen size
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (!mobile && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
      
      if (window.innerWidth < 1024 && window.innerWidth >= 768) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  // Update active tab based on route
  useEffect(() => {
    const path = location.pathname.split('/').pop();
    setActiveTab(path || 'dashboard');
  }, [location]);

  // Clear messages after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [error, success]);

  if (!user || user.role !== 'teacher') {
    return (
      <div style={styles.accessDenied(brandColors)}>
        <div style={styles.accessDeniedContent}>
          <FiAlertCircle size={48} style={styles.accessDeniedIcon} />
          <h3 style={styles.accessDeniedTitle}>Access Restricted</h3>
          <p style={styles.accessDeniedText}>This section is available to teachers only.</p>
          <button
            onClick={() => navigate('/login')}
            style={styles.primaryButton(brandColors)}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Navigation items with categories
  const navSections = [
    {
      title: 'Main',
      items: [
        { path: 'dashboard', icon: <FiHome />, label: 'Dashboard', color: brandColors.primary },
        { path: 'my-classes', icon: <FiUsers />, label: 'My Classes', color: '#3b82f6' },
        { path: 'schedule', icon: <FiCalendar />, label: 'Schedule', color: '#8b5cf6' },
      ]
    },
    {
      title: 'Test Management',
      items: [
        { path: 'test-creation', icon: <FiPlusSquare />, label: 'Create Test', color: brandColors.secondary },
        { path: 'tests', icon: <FiPackage />, label: 'All Tests', color: '#f59e0b' },
      ]
    },
    {
      title: 'Question Bank',
      items: [
        { path: 'add-question', icon: <FiFileText />, label: 'Add Question', color: '#10b981' },
        { path: 'bulk-import', icon: <FiUpload />, label: 'Bulk Import', color: '#8b5cf6' },
        { path: 'questions', icon: <FiFolder />, label: 'Manage Questions', color: '#f59e0b' },
      ]
    },
    {
      title: 'Analytics',
      items: [
        { path: 'analytics', icon: <FiBarChart />, label: 'Analytics', color: '#3b82f6' },
      ]
    },
  ];

  const settingsItems = [
    { path: 'profile', icon: <FiUser />, label: 'Profile', color: '#6b7280' },
    { path: 'settings', icon: <FiSettings />, label: 'Settings', color: '#6b7280' },
  ];

  const handleNavigation = (path) => {
    navigate(`/teacher/${path}`);
    setActiveTab(path);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(!isSidebarOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  // Check if current path matches
  const isActivePath = (path) => {
    return location.pathname === `/teacher/${path}` || 
           location.pathname.startsWith(`/teacher/${path}/`);
  };

  // Get page title from path
  const getPageTitle = () => {
    const path = location.pathname.split('/').pop();
    const allItems = [...navSections.flatMap(section => section.items), ...settingsItems];
    const navItem = allItems.find(item => item.path === path);
    return navItem ? navItem.label : 'Dashboard';
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer(brandColors)}>
        <div style={styles.loader(brandColors)}>
          <div style={styles.loaderSpinner}></div>
          <p style={styles.loadingText}>Loading Teacher Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container(brandColors)}>
      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          style={styles.overlay}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Header */}
      <header style={styles.header(brandColors)}>
        <div style={styles.headerLeft}>
          <button 
            onClick={toggleSidebar}
            style={styles.menuButton(brandColors)}
            aria-label="Toggle menu"
          >
            {isMobile ? (isSidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />) : 
             (isSidebarCollapsed ? <FiChevronRight size={24} /> : <FiChevronLeft size={24} />)}
          </button>
          
          <div style={styles.headerContent}>
            <img 
              src="/uploads/sanni.png" 
              alt="Sanniville Academy" 
              style={styles.logo}
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
              }}
            />
            <div>
              <h1 style={styles.headerTitle}>Teacher Portal</h1>
              <div style={styles.headerSubtitle}>
                <span style={styles.welcomeText}>Welcome, </span>
                <span style={styles.teacherName}>{user.name || 'Teacher'}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.headerRight}>
          {/* Quick Stats */}
          <div style={styles.quickStats}>
            {teacherData?.summary && (
              <>
                <div style={styles.statItem}>
                  <FiUsers size={16} />
                  <span>{teacherData.summary.totalClasses || 0}</span>
                  <span style={styles.statLabel}>Classes</span>
                </div>
                <div style={styles.statDivider}>•</div>
                <div style={styles.statItem}>
                  <FiBook size={16} />
                  <span>{teacherData.summary.totalSubjects || 0}</span>
                  <span style={styles.statLabel}>Subjects</span>
                </div>
              </>
            )}
          </div>
          
          {/* User Profile */}
          <div style={styles.userProfile(brandColors)}>
            <div style={styles.userAvatar}>
              {user.name?.charAt(0) || <FiUser size={20} />}
            </div>
            {!isMobile && (
              <div style={styles.userInfo}>
                <span style={styles.userName}>{user.name || 'Teacher'}</span>
                <span style={styles.userRole}>Teacher</span>
              </div>
            )}
          </div>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={styles.logoutButton(brandColors)}
            title="Logout"
          >
            <FiLogOut size={20} />
          </button>
        </div>
      </header>

      {/* Alerts */}
      <div style={styles.alertsWrapper}>
        {(error || success) && (
          <div style={styles.alertsContainer}>
            {error && (
              <div style={styles.alert(brandColors.danger)}>
                <FiAlertCircle style={styles.alertIcon} />
                <span style={styles.alertText}>{error}</span>
                <button onClick={() => setError(null)} style={styles.alertClose}>
                  <FiX size={16} />
                </button>
              </div>
            )}
            {success && (
              <div style={styles.alert(brandColors.success)}>
                <FiCheckCircle style={styles.alertIcon} />
                <span style={styles.alertText}>{success}</span>
                <button onClick={() => setSuccess(null)} style={styles.alertClose}>
                  <FiX size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={styles.mainLayout}>
        {/* Sidebar */}
        <aside style={{
          ...styles.sidebar(brandColors),
          ...(isMobile ? styles.sidebarMobile : {}),
          ...(isMobile && isSidebarOpen ? styles.sidebarMobileOpen : {}),
          ...(!isMobile && isSidebarCollapsed ? styles.sidebarCollapsed : {}),
          transform: isMobile ? 
            (isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 
            'translateX(0)',
        }}>
          {/* Sidebar Header */}
          <div style={styles.sidebarHeader}>
            <div style={styles.sidebarLogo}>
              <FiGrid size={24} style={styles.sidebarLogoIcon} />
              {(!isSidebarCollapsed || isMobile) && (
                <span style={styles.sidebarTitle}>Teacher Portal</span>
              )}
            </div>
          </div>

          {/* Teacher Profile Summary */}
          {(!isSidebarCollapsed || isMobile) && (
            <div style={styles.teacherProfile(brandColors)}>
              <div style={styles.teacherAvatar}>
                {user.name?.charAt(0) || <FiUser size={24} />}
              </div>
              <div style={styles.teacherInfo}>
                <h4 style={styles.teacherName}>{user.name || 'Teacher'}</h4>
                <p style={styles.teacherEmail}>{user.email}</p>
              </div>
            </div>
          )}

          {/* Navigation Sections */}
          <div style={styles.navSections}>
            {navSections.map((section, sectionIndex) => (
              <div key={sectionIndex} style={styles.navSection}>
                {(!isSidebarCollapsed || isMobile) && (
                  <h3 style={styles.sectionTitle}>{section.title}</h3>
                )}
                <ul style={styles.navList}>
                  {section.items.map((item) => {
                    const isActive = isActivePath(item.path);
                    return (
                      <li key={item.path} style={styles.navItem}>
                        <button
                          onClick={() => handleNavigation(item.path)}
                          style={{
                            ...styles.navButton,
                            ...(isActive ? styles.navButtonActive : {}),
                            ...(isSidebarCollapsed && !isMobile ? styles.navButtonCollapsed : {}),
                            backgroundColor: isActive ? `${item.color}15` : 'transparent',
                            borderLeft: isActive ? `4px solid ${item.color}` : '4px solid transparent',
                          }}
                          title={isSidebarCollapsed && !isMobile ? item.label : ''}
                        >
                          <span style={{
                            ...styles.navIcon,
                            color: isActive ? item.color : brandColors.gray,
                          }}>
                            {item.icon}
                          </span>
                          {(!isSidebarCollapsed || isMobile) && (
                            <span style={{
                              ...styles.navLabel,
                              color: isActive ? brandColors.dark : brandColors.gray,
                              fontWeight: isActive ? '600' : '400',
                            }}>
                              {item.label}
                            </span>
                          )}
                          {isActive && (
                            <div style={styles.activeIndicator}></div>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Settings Section */}
          <div style={styles.settingsSection}>
            <ul style={styles.navList}>
              {settingsItems.map((item) => {
                const isActive = isActivePath(item.path);
                return (
                  <li key={item.path} style={styles.navItem}>
                    <button
                      onClick={() => handleNavigation(item.path)}
                      style={{
                        ...styles.navButton,
                        ...(isActive ? styles.navButtonActive : {}),
                        ...(isSidebarCollapsed && !isMobile ? styles.navButtonCollapsed : {}),
                      }}
                      title={isSidebarCollapsed && !isMobile ? item.label : ''}
                    >
                      <span style={styles.navIcon}>
                        {item.icon}
                      </span>
                      {(!isSidebarCollapsed || isMobile) && (
                        <span style={styles.navLabel}>{item.label}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Sidebar Footer */}
          {(!isSidebarCollapsed || isMobile) && teacherData && (
            <div style={styles.sidebarFooter(brandColors)}>
              <div style={styles.footerStats}>
                <div style={styles.footerStat}>
                  <span style={styles.footerStatNumber}>{teacherData.summary?.totalClasses || 0}</span>
                  <span style={styles.footerStatLabel}>Classes</span>
                </div>
                <div style={styles.footerStat}>
                  <span style={styles.footerStatNumber}>{teacherData.summary?.totalSubjects || 0}</span>
                  <span style={styles.footerStatLabel}>Subjects</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main style={{
          ...styles.mainContent(brandColors),
          marginLeft: isMobile ? '0' : (isSidebarCollapsed ? '80px' : '280px'),
        }}>
          {/* Page Header */}
          <div style={styles.pageHeader}>
            <div>
              <h2 style={styles.pageTitle}>{getPageTitle()}</h2>
              <div style={styles.breadcrumb}>
                <button 
                  onClick={() => navigate('/teacher/dashboard')}
                  style={styles.breadcrumbLink}
                >
                  Teacher Portal
                </button>
                <span style={styles.breadcrumbSeparator}>/</span>
                <span style={styles.breadcrumbCurrent}>{getPageTitle()}</span>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div style={styles.pageActions}>
              <button 
                onClick={() => navigate('/teacher/test-creation')}
                style={styles.quickActionButton(brandColors)}
              >
                <FiPlusSquare size={18} />
                <span>New Test</span>
              </button>
              <button 
                onClick={() => navigate('/teacher/add-question')}
                style={styles.quickActionButton(brandColors, true)}
              >
                <FiFileText size={18} />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div style={styles.contentArea}>
            <Routes>
              {/* Main Routes */}
              <Route path="dashboard" element={<TeacherDashboard teacherData={teacherData} />} />
              <Route path="my-classes" element={<TeacherClasses teacherData={teacherData} />} />
              <Route path="test-creation/*" element={<TestCreation teacherData={teacherData} />} />
              <Route path="test-creation/:testId/*" element={<TestCreation teacherData={teacherData} />} />
              <Route path="test-creation/:testId/questions/*" element={<AddTestQuestions teacherData={teacherData} />} />
              <Route path="test-preview/:testId" element={<TestPreview />} />
              <Route path="add-question/*" element={<AddQuestion teacherData={teacherData} />} />
              <Route path="add-question/:testId" element={<AddQuestion teacherData={teacherData} />} />
              <Route path="bulk-import" element={<BulkImport teacherData={teacherData} />} />
              <Route path="questions/*" element={<ManageQuestions teacherData={teacherData} />} />
              <Route path="tests/*" element={<ManageTests teacherData={teacherData} />} />
              <Route path="test-results" element={<TestResults teacherData={teacherData} />} />
              <Route path="test-results/:testId" element={<TestResults teacherData={teacherData} />} />
              <Route path="schedule" element={<TeacherSchedule teacherData={teacherData} />} />
              <Route path="analytics" element={<TeacherAnalytics teacherData={teacherData} />} />
              
              {/* Settings Routes */}
              <Route path="profile" element={<TeacherProfile teacherData={teacherData} />} />
              <Route path="settings" element={<TeacherSettings teacherData={teacherData} />} />
              
              {/* Default Routes */}
              <Route path="/" element={<Navigate to="/teacher/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/teacher/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

// Styles - KEEP ALL YOUR EXISTING STYLES EXACTLY AS THEY ARE
const styles = {
  container: (colors) => ({
    minHeight: '100vh',
    backgroundColor: colors.background,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  }),

  // Loading
  loadingContainer: (colors) => ({
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  }),
  loader: (colors) => ({
    textAlign: 'center',
  }),
  loaderSpinner: {
    width: '50px',
    height: '50px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #4B5320',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  loadingText: {
    color: '#64748B',
    fontSize: '16px',
    fontWeight: '500',
  },

  // Overlay
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
    '@media (min-width: 768px)': {
      display: 'none',
    },
  },

  // Header
  header: (colors) => ({
    backgroundColor: colors.white,
    borderBottom: '1px solid #e2e8f0',
    padding: '0 24px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  }),
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  menuButton: (colors) => ({
    background: 'none',
    border: 'none',
    color: colors.dark,
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: colors.light,
    },
  }),
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    height: '32px',
    width: 'auto',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0,
  },
  headerSubtitle: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '2px',
  },
  welcomeText: {
    color: '#94a3b8',
  },
  teacherName: {
    color: '#4B5320',
    fontWeight: '600',
  },
  quickStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#475569',
  },
  statLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    marginLeft: '4px',
  },
  statDivider: {
    color: '#cbd5e1',
    fontSize: '12px',
  },
  userProfile: (colors) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '4px 8px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: colors.light,
    },
  }),
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#4B5320',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '14px',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  userRole: {
    fontSize: '12px',
    color: '#64748b',
  },
  logoutButton: (colors) => ({
    background: 'none',
    border: 'none',
    color: colors.gray,
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    ':hover': {
      color: colors.danger,
      backgroundColor: '#fef2f2',
    },
  }),

  // Alerts
  alertsWrapper: {
    position: 'relative',
    zIndex: 99,
  },
  alertsContainer: {
    padding: '0 24px',
    marginTop: '16px',
  },
  alert: (color) => ({
    backgroundColor: `${color}10`,
    color: color,
    borderLeft: `4px solid ${color}`,
    padding: '12px 16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  }),
  alertIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
  alertText: {
    fontSize: '14px',
    flex: 1,
  },
  alertClose: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    borderRadius: '4px',
    opacity: 0.7,
    transition: 'opacity 0.2s',
    ':hover': {
      opacity: 1,
    },
  },

  // Main Layout
  mainLayout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },

  // Sidebar
  sidebar: (colors) => ({
    backgroundColor: colors.sidebarBg,
    borderRight: '1px solid #e2e8f0',
    position: 'fixed',
    top: '64px',
    bottom: 0,
    width: '280px',
    overflowY: 'auto',
    overflowX: 'hidden',
    zIndex: 90,
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s ease',
  }),
  sidebarMobile: {
    position: 'fixed',
    top: '64px',
    left: 0,
    bottom: 0,
    width: '280px',
    transform: 'translateX(-100%)',
    boxShadow: '4px 0 15px rgba(0,0,0,0.1)',
  },
  sidebarMobileOpen: {
    transform: 'translateX(0)',
  },
  sidebarCollapsed: {
    width: '80px',
  },
  sidebarHeader: {
    padding: '20px 16px',
    borderBottom: '1px solid #e2e8f0',
  },
  sidebarLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sidebarLogoIcon: {
    color: '#4B5320',
  },
  sidebarTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b',
  },
  teacherProfile: (colors) => ({
    padding: '20px 16px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  }),
  teacherAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#4B5320',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '18px',
  },
  teacherInfo: {
    flex: 1,
    minWidth: 0,
  },
  teacherName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 4px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  teacherEmail: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  navSections: {
    flex: 1,
    padding: '20px 0',
    overflowY: 'auto',
  },
  navSection: {
    marginBottom: '24px',
    padding: '0 16px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 12px 16px',
  },
  navList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  navItem: {
    marginBottom: '4px',
  },
  navButton: {
    width: '100%',
    textAlign: 'left',
    padding: '12px 16px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s ease',
    fontSize: '14px',
    backgroundColor: 'transparent',
    whiteSpace: 'nowrap',
    position: 'relative',
    overflow: 'hidden',
    ':hover': {
      backgroundColor: '#f8fafc',
    },
  },
  navButtonActive: {
    backgroundColor: '#f1f5f9',
  },
  navButtonCollapsed: {
    justifyContent: 'center',
    padding: '12px',
  },
  navIcon: {
    fontSize: '18px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
  },
  navLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
    textAlign: 'left',
  },
  activeIndicator: {
    position: 'absolute',
    right: '8px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#4B5320',
  },
  settingsSection: {
    padding: '20px 0',
    borderTop: '1px solid #e2e8f0',
  },
  sidebarFooter: (colors) => ({
    padding: '16px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  }),
  footerStats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  footerStat: {
    textAlign: 'center',
  },
  footerStatNumber: {
    display: 'block',
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: '1',
    marginBottom: '4px',
  },
  footerStatLabel: {
    fontSize: '12px',
    color: '#64748b',
  },

  // Main Content
  mainContent: (colors) => ({
    flex: 1,
    backgroundColor: '#f8fafc',
    overflowY: 'auto',
    minHeight: 'calc(100vh - 64px)',
    transition: 'margin-left 0.3s ease',
  }),
  pageHeader: {
    padding: '24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#64748b',
  },
  breadcrumbLink: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: 0,
    fontSize: '14px',
    ':hover': {
      color: '#4B5320',
      textDecoration: 'underline',
    },
  },
  breadcrumbSeparator: {
    color: '#cbd5e1',
  },
  breadcrumbCurrent: {
    color: '#4B5320',
    fontWeight: '600',
  },
  pageActions: {
    display: 'flex',
    gap: '12px',
  },
  quickActionButton: (colors, secondary = false) => ({
    backgroundColor: secondary ? colors.white : colors.primary,
    color: secondary ? colors.primary : colors.white,
    border: `1px solid ${secondary ? colors.primary : 'transparent'}`,
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: secondary ? `${colors.primary}10` : `${colors.primary}90`,
      transform: 'translateY(-1px)',
    },
  }),
  contentArea: {
    padding: '24px',
    minHeight: 'calc(100vh - 200px)',
  },

  // Access Denied
  accessDenied: (colors) => ({
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: '20px',
  }),
  accessDeniedContent: {
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    maxWidth: '400px',
    width: '100%',
  },
  accessDeniedIcon: {
    color: '#ef4444',
    marginBottom: '20px',
  },
  accessDeniedTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 16px 0',
  },
  accessDeniedText: {
    fontSize: '16px',
    color: '#64748b',
    margin: '0 0 24px 0',
  },
  primaryButton: (colors) => ({
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: colors.secondary,
    },
  }),
};

// Add CSS animation
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    /* Custom scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    
    ::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
    }
    
    /* Smooth transitions */
    * {
      transition: background-color 0.2s ease, border-color 0.2s ease;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default TeacherHome;