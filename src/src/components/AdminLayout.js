import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiLogOut, FiUser, FiAlertCircle } from 'react-icons/fi';

const AdminLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [error, setError] = useState(null);

  // Fetch admin profile data
  useEffect(() => {
    const fetchAdminProfile = async () => {
      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return;

      try {
        const token = localStorage.getItem('token');
        
        console.log('📊 Fetching admin profile for:', user.id);
        
        // Fetch admin profile data
        const response = await fetch(`http://localhost:5000/api/users/${user.id}`, {
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
        console.log('✅ Admin profile API response:', data);
        
        if (data.success && data.user) {
          const adminData = data.user;
          
          // Set profile image URL if available
          if (adminData.profileImage) {
            setProfileImageUrl(`http://localhost:5000/uploads/profiles/${adminData.profileImage}`);
          }
          
          setError(null);
        }
      } catch (err) {
        console.error('❌ Error fetching admin profile:', err);
        setError('Failed to load admin profile information.');
        
        // Try to set profile image from user object
        if (user.profileImage) {
          setProfileImageUrl(`http://localhost:5000/uploads/profiles/${user.profileImage}`);
        }
      }
    };

    fetchAdminProfile();
  }, [user]);

  // Updated tabs array with separate Manage Subjects
  const tabs = [
    { path: '/admin', label: 'Home' },
    { path: '/admin/classes', label: 'Manage Classes' },
    { path: '/admin/subjects', label: 'Manage Subjects' },
    { path: '/admin/users', label: 'Manage Users' },
    { path: '/admin/tests', label: 'Tests & Exams' },
    { path: '/admin/results', label: 'Results' },
    { path: '/admin/sessions', label: 'Session Schedules' },
    { path: '/admin/promotion', label: 'Student Promotion' },
    { path: '/admin/transcripts', label: 'Transcripts & Promotion' },
    { path: '/admin/exports', label: 'Data Exports' },
    { path: '/admin/analytics', label: 'View Analytics' },
  ];

  // Get admin name
  const getAdminName = () => {
    return user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Administrator';
  };

  // Get admin role display
  const getAdminRoleDisplay = () => {
    return user?.role === 'super_admin' ? 'Super Administrator' : 'Administrator';
  };

  // Clear error after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setError(null);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [error]);

  // FIXED: Allow both admin and super_admin roles
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div style={styles.accessDenied}>
        <div style={styles.accessDeniedContent}>
          <FiAlertCircle size={48} style={styles.accessDeniedIcon} />
          <h2 style={styles.accessDeniedTitle}>Access Restricted</h2>
          <p style={styles.accessDeniedText}>This page is only available to administrators.</p>
          <button
            onClick={() => navigate('/login')}
            style={styles.primaryButton}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Error Alert */}
      {error && (
        <div style={styles.errorAlert}>
          <FiAlertCircle style={styles.alertIcon} />
          <span style={styles.alertText}>{error}</span>
          <button onClick={() => setError(null)} style={styles.alertClose}>×</button>
        </div>
      )}

      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <img
              src="/uploads/sanni.png"
              alt="Sanniville Academy"
              style={styles.logo}
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                // Show fallback text
                const parent = e.target.parentElement;
                const fallback = document.createElement('div');
                fallback.style.cssText = styles.logoFallback;
                fallback.textContent = 'SA';
                parent.appendChild(fallback);
              }}
            />
            <div>
              <h1 style={styles.headerTitle}>
                Syntra
                <span style={styles.headerSubtitle}>
                  Empowering Education Through Seamless Administration
                  {user.role === 'super_admin' && ' (Super Admin)'}
                </span>
              </h1>
            </div>
          </div>
          <div style={styles.headerRight}>
            {/* Admin Profile with Image */}
            <div style={styles.adminProfile}>
              <div style={styles.adminAvatarContainer}>
                {profileImageUrl ? (
                  <img 
                    src={profileImageUrl} 
                    alt={getAdminName()} 
                    style={styles.adminAvatarImage}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      // Show fallback avatar if image fails to load
                      const fallback = document.createElement('div');
                      fallback.style.cssText = styles.adminAvatarFallback;
                      fallback.textContent = getAdminName().charAt(0) || 'A';
                      e.target.parentElement.appendChild(fallback);
                    }}
                  />
                ) : (
                  <div style={styles.adminAvatarFallback}>
                    {getAdminName().charAt(0) || <FiUser size={18} />}
                  </div>
                )}
              </div>
              <div style={styles.adminInfo}>
                <span style={styles.adminName}>{getAdminName()}</span>
                <span style={styles.adminRole}>{getAdminRoleDisplay()}</span>
              </div>
            </div>
            
            <button
              onClick={() => {
                logout();
                // Force redirect to login page
                window.location.href = '/login';
              }}
              style={styles.logoutButton}
              onMouseOver={e => (e.target.style.backgroundColor = '#FFFFFF')}
              onMouseOut={e => (e.target.style.backgroundColor = '#D4A017')}
            >
              <FiLogOut style={styles.buttonIcon} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Sticky Navigation */}
      <div style={styles.stickyNav}>
        <nav style={styles.nav}>
          {tabs.map(tab => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                ...styles.navButton,
                backgroundColor: location.pathname === tab.path ? '#D4A017' : '#4B5320',
                color: location.pathname === tab.path ? '#000000' : '#FFFFFF',
              }}
              onMouseOver={e =>
                (e.target.style.backgroundColor = location.pathname === tab.path ? '#FFFFFF' : '#5A6B2A')
              }
              onMouseOut={e =>
                (e.target.style.backgroundColor = location.pathname === tab.path ? '#D4A017' : '#4B5320')
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <main style={styles.main}>{children}</main>

      <footer style={styles.footer}>
        <p style={styles.footerText}>
          © {new Date().getFullYear()} Syntra Software Solution. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#b8c2cc',
    fontFamily: '"Fredoka", sans-serif',
    position: 'relative',
  },
  
  // Error Alert
  errorAlert: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderLeft: '4px solid #dc2626',
    padding: '12px 16px',
    borderRadius: '6px',
    margin: '10px 30px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    position: 'fixed',
    top: '10px',
    right: '30px',
    zIndex: 1000,
    minWidth: '300px',
  },
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
    color: '#dc2626',
    cursor: 'pointer',
    fontSize: '20px',
    padding: '0 4px',
    borderRadius: '4px',
    opacity: 0.7,
    transition: 'opacity 0.2s',
    ':hover': {
      opacity: 1,
    },
  },
  
  // Header
  header: {
    backgroundColor: '#2c3e50',
    color: '#FFFFFF',
    padding: '18px 30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  logo: {
    height: '50px',
    padding: '4px',
    backgroundColor: '#FFFFFF',
    borderRadius: '6px',
    border: 'none',
  },
  logoFallback: {
    width: '50px',
    height: '50px',
    backgroundColor: '#FFFFFF',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#2c3e50',
    fontWeight: 'bold',
    fontSize: '18px',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: '600',
    margin: 0,
  },
  headerSubtitle: {
    display: 'block',
    fontSize: '13px',
    color: '#bdc3c7',
    fontWeight: '400',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  
  // Admin Profile
  adminProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '6px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  },
  adminAvatarContainer: {
    position: 'relative',
    flexShrink: 0,
  },
  adminAvatarImage: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #D4A017',
  },
  adminAvatarFallback: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#D4A017',
    color: '#000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '16px',
    border: '2px solid #FFFFFF',
  },
  adminInfo: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'right',
  },
  adminName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#FFFFFF',
    whiteSpace: 'nowrap',
  },
  adminRole: {
    fontSize: '12px',
    color: '#bdc3c7',
    fontWeight: '400',
  },
  
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#D4A017',
    color: '#000000',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.3s ease',
    fontWeight: '500',
  },
  buttonIcon: {
    fontSize: '16px',
  },
  stickyNav: {
    position: 'sticky',
    top: '86px', // Height of header
    zIndex: 99,
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #ecf0f1',
  },
  nav: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    padding: '12px 15px',
    backgroundColor: '#FFFFFF',
  },
  navButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  main: {
    maxWidth: '1400px',
    margin: '30px auto',
    padding: '30px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
    border: '1px solid #ecf0f1',
    minHeight: 'calc(100vh - 300px)',
  },
  footer: {
    backgroundColor: '#2c3e50',
    color: '#FFFFFF',
    padding: '20px',
    marginTop: '40px',
    textAlign: 'center',
    borderTop: 'none',
  },
  footerText: {
    fontSize: '13px',
    margin: 0,
    color: '#bdc3c7',
  },
  
  // Access Denied
  accessDenied: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: '20px',
  },
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
  primaryButton: {
    backgroundColor: '#4B5320',
    color: '#ffffff',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#D4A017',
    },
  },
};

export default AdminLayout;