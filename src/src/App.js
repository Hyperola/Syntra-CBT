import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import TeacherHome from './pages/TeacherHome';
import StudentHome from './pages/StudentHome';
import AdminDashboard from './components/AdminDashboard';
import TestTaking from './pages/TestTaking';
import TestResults from './pages/TestResults';
import Results from './pages/Results';
import EditResults from './pages/EditResults';
import ClassSubjectsManager from './pages/ClassSubjectsManager';
import ClassDetails from './pages/ClassDetails';
import EditClass from './pages/EditClass';
import Analytics from './components/teacher/Analytics';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import AdminLayout from './components/AdminLayout';
import CreateAdmin from './pages/CreateAdmin';
import CreateSuperAdmin from './pages/CreateSuperAdmin';
import ManageClasses from './pages/ManageClasses';
import ManageSubjects from './pages/ManageSubjects';
import ManageUsers from './pages/ManageUsers';
import SessionSchedules from './pages/SessionSchedules';
import DataExports from './pages/DataExports';
import ManageTests from './pages/ManageTests';
import TestDetails from './pages/TestDetails';
import Dashboard from './pages/Dashboard';
import Tests from './pages/Tests';
import Profile from './pages/UserProfile';
import CreateTeacherWithSubjects from './pages/CreateTeacherWithSubjects';
import CreateStudentWithSubjects from './pages/CreateStudentWithSubjects';
import Submitted from './pages/Submitted';
import SetBatch from './pages/SetBatch';
import PromotionPanel from './components/PromotionPanel/PromotionPanel';
import UserProfile from './pages/UserProfile';
import AdminScheduling from './pages/AdminScheduling';

// Teacher-specific components
import TestCreation from './pages/TestCreation';
import AddTestQuestions from './components/teacher/AddTestQuestions';

// Add the Mock Tests component
import MockTests from './pages/MockTests';

// Simple components that don't use AuthContext
const RootRedirect = () => {
  return <Navigate to="/login" replace />;
};

class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          textAlign: 'center',
          color: '#4B5320',
          fontFamily: 'sans-serif',
          padding: '20px',
          backgroundColor: '#F8F9FA',
          minHeight: '100vh'
        }}>
          <h1>Something went wrong. Please try again.</h1>
        </div>
      );
    }
    return this.props.children;
  }
}

// Create a wrapper component that uses AuthContext INSIDE AuthProvider
const AppContent = () => {
  return (
    <Router>
      <Routes>
        {/* Simple redirect - will be handled by ProtectedRoute logic */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        
        {/* Student routes */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentHome><Dashboard /></StudentHome>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/student/tests"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentHome><Tests /></StudentHome>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/student/mock-tests"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentHome><MockTests /></StudentHome>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentHome><Profile /></StudentHome>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/student/submitted"
          element={
            <ProtectedRoute requiredRole="student">
              <Submitted />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/student/results"
          element={
            <ProtectedRoute requiredRole="student">
              <TestResults />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/student/test/:testId"
          element={
            <ProtectedRoute requiredRole="student">
              <TestTaking />
            </ProtectedRoute>
          }
        />
        
        {/* Redirect /student to /student/dashboard */}
        <Route
          path="/student"
          element={
            <ProtectedRoute requiredRole="student">
              <Navigate to="/student/dashboard" replace />
            </ProtectedRoute>
          }
        />
        
        {/* Teacher routes - Updated with nested routes */}
        <Route 
          path="/teacher/*" 
          element={
            <ProtectedRoute requiredRole="teacher">
              <TeacherHome />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><AdminDashboard /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Class Management Routes */}
        <Route
          path="/admin/classes"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><ManageClasses /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/classes/:classId"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><ClassDetails /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        {/* User Creation Routes */}
        <Route
          path="/admin/users/create-admin"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><CreateAdmin /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/admin/users/create-super-admin"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><CreateSuperAdmin /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        {/* CREATE TEACHER ROUTE */}
        <Route
          path="/admin/users/create-teacher"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><CreateTeacherWithSubjects /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        {/* CREATE STUDENT ROUTE */}
        <Route
          path="/admin/users/create-student"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><CreateStudentWithSubjects /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/admin/classes/:classId/edit"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><EditClass /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/admin/classes/:classId/subjects"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><ClassSubjectsManager /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Class Subjects Management Route (Legacy - redirects to new structure) */}
        <Route
          path="/admin/class-subjects"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><Navigate to="/admin/classes" replace /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Subjects Management */}
        <Route
          path="/admin/subjects"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><ManageSubjects /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Users Management */}
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><ManageUsers /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        {/* User profile route - MUST come AFTER create routes */}
        <Route
          path="/admin/users/:userId"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><UserProfile /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Tests Management */}
        <Route
          path="/admin/tests"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><ManageTests /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tests/:testId"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><TestDetails /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tests/:testId/batch"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><SetBatch /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        {/* ADDED: Test Scheduling Route */}
        <Route
          path="/admin/tests/:testId/schedule"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><AdminScheduling /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Results Management */}
        <Route
          path="/admin/results"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><EditResults /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/results/:testId"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><Results /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Session Management */}
        <Route
          path="/admin/sessions"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><SessionSchedules /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Data Management */}
        <Route
          path="/admin/exports"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><DataExports /></AdminLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><Analytics /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Promotion Panel route */}
        <Route
          path="/admin/promotion"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <AdminLayout><PromotionPanel /></AdminLayout>
            </ProtectedRoute>
          }
        />
        
        {/* Users route (legacy - redirects to admin/users) */}
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredRoles={['admin', 'super_admin']}>
              <Navigate to="/admin/users" replace />
            </ProtectedRoute>
          }
        />
        
        {/* Error pages */}
        <Route
          path="/unauthorized"
          element={
            <div style={{
              textAlign: 'center',
              color: '#4B5320',
              fontFamily: 'sans-serif',
              padding: '20px',
              backgroundColor: '#F8F9FA',
              minHeight: '100vh'
            }}>
              <h1>Unauthorized: Access Denied</h1>
              <p>You don't have permission to access this page.</p>
              <p>
                <a href="/login" style={{ color: '#4B5320', textDecoration: 'underline' }}>
                  Return to Login
                </a>
              </p>
            </div>
          }
        />
        
        {/* Catch-all 404 route */}
        <Route
          path="*"
          element={
            <div style={{
              textAlign: 'center',
              color: '#4B5320',
              fontFamily: 'sans-serif',
              padding: '20px',
              backgroundColor: '#F8F9FA',
              minHeight: '100vh'
            }}>
              <h1>404: Page Not Found</h1>
              <p>The page you're looking for doesn't exist.</p>
              <p>
                <a href="/login" style={{ color: '#4B5320', textDecoration: 'underline' }}>
                  Return to Login
                </a>
              </p>
            </div>
          }
        />
      </Routes>
    </Router>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;