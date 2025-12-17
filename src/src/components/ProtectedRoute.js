// components/ProtectedRoute.js - COMPLETE FIXED VERSION
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ 
  children, 
  requiredRole, 
  requiredRoles = [],
  permissions = []
}) => {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute - Debug:', {
    user,
    userRole: user?.role,
    requiredRole,
    requiredRoles,
    loading,
    path: location.pathname,
    isAuthenticated: !!user
  });

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#ffffff'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          borderRadius: '12px',
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #4B5320',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ 
            margin: 0, 
            color: '#4B5320', 
            fontSize: '16px',
            fontWeight: '500'
          }}>
            Loading...
          </p>
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

  // Redirect to login if not authenticated
  if (!user) {
    console.log('ProtectedRoute - No user, redirecting to /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  const userRole = user.role;
  
  if (requiredRole || requiredRoles.length > 0) {
    const rolesToCheck = requiredRole ? [requiredRole] : requiredRoles;
    
    console.log('ProtectedRoute - Role check:', { 
      userRole, 
      requiredRoles: rolesToCheck 
    });

    // Super admin has access to everything
    if (userRole === 'super_admin') {
      console.log('ProtectedRoute - Super admin access granted');
      return children;
    }

    // Check if user has any of the required roles
    const hasRequiredRole = rolesToCheck.includes(userRole);
    
    if (!hasRequiredRole) {
      console.log('ProtectedRoute - Insufficient role permissions, redirecting to /unauthorized');
      return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }
  }

  // Check specific permissions if required
  if (permissions.length > 0) {
    console.log('ProtectedRoute - Checking permissions:', permissions);
    
    // Super admin has all permissions
    if (userRole === 'super_admin') {
      console.log('ProtectedRoute - Super admin, all permissions granted');
      return children;
    }

    // Check each required permission
    const hasAllPermissions = permissions.every(permission => 
      hasPermission(permission)
    );
    
    if (!hasAllPermissions) {
      console.log('ProtectedRoute - Missing required permissions, redirecting to /unauthorized');
      return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }
  }

  console.log('ProtectedRoute - Access granted for user:', user.username);
  return children;
};

export default ProtectedRoute;