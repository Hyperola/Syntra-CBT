import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import syntraLogo from "../uploads/syntra.jpeg";
import backgroundImage from "../uploads/students.jpg";

const Login = () => {
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      redirectBasedOnRole(user.role);
    }
  }, [user, navigate]);

  const redirectBasedOnRole = (role) => {
    switch (role) {
      case 'student':
        navigate('/student/dashboard');
        break;
      case 'teacher':
        navigate('/teacher');
        break;
      case 'admin':
      case 'super_admin':
        navigate('/admin');
        break;
      case 'parent': // NEW: Added parent case
        navigate('/parent/dashboard');
        break;
      default:
        console.warn('Unknown role:', role);
        break;
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(formData.username, formData.password);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-wrapper">
          {/* Left Side - Background Image */}
          <div className="login-image-side">
            <div 
              className="login-background-image"
              style={{ backgroundImage: `url(${backgroundImage})` }}
            />
            <div className="login-image-overlay">
              <div className="login-image-content">
                <h2 className="login-image-title">Syntra Learning Portal</h2>
                <p className="login-image-subtitle">
                  Your gateway to comprehensive Computer-Based Testing (CBT) and digital learning excellence. Access interactive assessments, track your academic progress, and experience seamless examination management in a secure, modern environment designed for 21st-century education.
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="login-form-side">
            <div className="login-form-wrapper">
              {/* Logo Container */}
              <div className="login-logo-container">
                <div className="login-logo-wrapper">
                  <img 
                    src={syntraLogo} 
                    alt="Syntra Logo" 
                    className="login-logo-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextElementSibling) {
                        e.target.nextElementSibling.style.display = 'block';
                      }
                    }}
                  />
                  {/* Fallback if logo doesn't load */}
                 
                </div>
                <div className="login-logo-title">
                  <h1>Syntra Software Solution</h1>
                  <p>Education Management System</p>
                </div>
              </div>

              {/* Login Form */}
              <div className="login-form-header">
                <h2>Sign In</h2>
                <p>Enter your credentials to access your account</p>
              </div>

              {error && (
                <div className="login-error-message">
                  <span className="login-error-icon">!</span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="login-form">
                <div className="login-form-group">
                  <label htmlFor="username" className="login-form-label">Username</label>
                  <div className={`login-input-container ${focusedField === 'username' ? 'login-focused' : ''}`}>
                    <input
                      type="text"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('username')}
                      onBlur={() => setFocusedField(null)}
                      required
                      disabled={isLoading}
                      placeholder="Enter your username"
                      className="login-form-input"
                    />
                  </div>
                </div>

                <div className="login-form-group">
                  <div className="login-password-header">
                    <label htmlFor="password" className="login-form-label">Password</label>
                    <a href="/forgot-password" className="login-forgot-link">
                      Forgot password?
                    </a>
                  </div>
                  <div className={`login-input-container ${focusedField === 'password' ? 'login-focused' : ''}`}>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      required
                      disabled={isLoading}
                      placeholder="Enter your password"
                      className="login-form-input"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className={`login-submit-btn ${isLoading ? 'login-loading' : ''}`}
                >
                  {isLoading ? (
                    <>
                      <span className="login-spinner"></span>
                      Signing In...
                    </>
                  ) : 'Sign In'}
                </button>
              </form>

              <div className="login-form-footer">
                <p className="login-help-text">
                  Need help? <a href="/contact" className="login-help-link">Contact Administrator</a>
                </p>
                <p className="login-copyright">
                  © {new Date().getFullYear()} Syntra Software Solution. All Rights Reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inline styles that WILL override global CSS */}
      <style jsx global>{`
        /* Login Page Specific Styles - These will override global styles */
        .login-page {
          all: initial;
          font-family: inherit;
        }
        
        .login-container {
          width: 100vw !important;
          height: 100vh !important;
          overflow: hidden !important;
          background: #f8f9fa !important;
        }

        .login-wrapper {
          display: flex !important;
          height: 100vh !important;
          width: 100vw !important;
        }

        /* Left Side - Image */
        .login-image-side {
          flex: 1 !important;
          position: relative !important;
          overflow: hidden !important;
          background: #2c3e50 !important;
        }

        .login-background-image {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          background-size: cover !important;
          background-position: center !important;
          background-repeat: no-repeat !important;
          filter: brightness(0.8) !important;
        }

        .login-image-overlay {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          background: linear-gradient(135deg, rgba(25, 76, 116, 0.9) 0%, rgba(71, 71, 71, 0.7) 100%) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 40px !important;
        }

        .login-image-content {
          text-align: center !important;
          color: white !important;
          max-width: 500px !important;
        }

        .login-image-title {
          font-size: 32px !important;
          font-weight: 600 !important;
          margin-bottom: 16px !important;
          line-height: 1.3 !important;
          color: #00ff00 !important;
        }

        .login-image-subtitle {
          font-size: 16px !important;
          opacity: 0.9 !important;
          line-height: 1.5 !important;
          color: white !important;
        }

        /* Right Side - Form */
        .login-form-side {
          flex: 1 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 40px !important;
          background: #ffffff !important;
          overflow-y: auto !important;
        }

        .login-form-wrapper {
          width: 100% !important;
          max-width: 400px !important;
          padding: 0 20px !important;
        }

        /* Logo Styling */
        .login-logo-container {
          text-align: center !important;
          margin-bottom: 40px !important;
        }

        .login-logo-wrapper {
          display: inline-block !important;
          padding: 15px !important;
          background: white !important;
          border-radius: 8px !important;
          margin-top: 70px !important;
          margin-bottom: 20px !important;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05) !important;
        }

        .login-logo-image {
          height: 60px !important;
          width: auto !important;
          max-width: 200px !important;
          object-fit: contain !important;
          filter: brightness(1.1) contrast(1.1) !important;
          -webkit-filter: brightness(1.1) contrast(1.1) !important;
        }

        .login-logo-fallback {
          padding: 15px 30px !important;
          background: #2c3e50 !important;
          border-radius: 8px !important;
          display: inline-block !important;
        }

        .login-logo-text {
          color: white !important;
          font-size: 24px !important;
          font-weight: 700 !important;
          letter-spacing: 1px !important;
        }

        .login-logo-title h1 {
          font-size: 24px !important;
          font-weight: 600 !important;
          color: #2c3e50 !important;
          margin: 0 0 4px 0 !important;
          font-family: inherit !important;
        }

        .login-logo-title p {
          font-size: 14px !important;
          color: #666 !important;
          margin: 0 !important;
        }

        /* Form Header */
        .login-form-header {
          margin-bottom: 30px !important;
        }

        .login-form-header h2 {
          font-size: 24px !important;
          font-weight: 600 !important;
          color: #333 !important;
          margin: 0 0 8px 0 !important;
          font-family: inherit !important;
        }

        .login-form-header p {
          font-size: 14px !important;
          color: #666 !important;
          margin: 0 !important;
        }

        /* Error Message */
        .login-error-message {
          background: #fee !important;
          color: #c33 !important;
          padding: 12px 16px !important;
          border-radius: 6px !important;
          margin-bottom: 24px !important;
          display: flex !important;
          align-items: center !important;
          font-size: 14px !important;
          border: 1px solid #fcc !important;
        }

        .login-error-icon {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 20px !important;
          height: 20px !important;
          background: #c33 !important;
          color: white !important;
          border-radius: 50% !important;
          margin-right: 10px !important;
          font-size: 12px !important;
          font-weight: bold !important;
        }

        /* Form Elements */
        .login-form-group {
          margin-bottom: 24px !important;
        }

        .login-form-label {
          display: block !important;
          margin-bottom: 8px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          color: #444 !important;
        }

        .login-input-container {
          position: relative !important;
          border: 1px solid #ddd !important;
          border-radius: 6px !important;
          transition: all 0.2s ease !important;
          background: #fafafa !important;
        }

        .login-input-container.login-focused {
          border-color: #79b300 !important;
          box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.1) !important;
          background: white !important;
        }

        .login-form-input {
          width: 100% !important;
          padding: 14px 16px !important;
          border: none !important;
          border-radius: 6px !important;
          background: transparent !important;
          font-size: 15px !important;
          color: #4B5320 !important;
          outline: none !important;
          font-family: inherit !important;
          box-shadow: none !important;
          border: none !important;
        }

        .login-form-input::placeholder {
          color: #999 !important;
          opacity: 1 !important;
        }

        .login-form-input:disabled {
          background: #f5f5f5 !important;
          cursor: not-allowed !important;
          opacity: 0.7 !important;
        }

        .login-form-input:focus {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }

        .login-password-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 8px !important;
        }

        .login-forgot-link {
          font-size: 13px !important;
          color: #2c3e50 !important;
          text-decoration: none !important;
          font-weight: 500 !important;
        }

        .login-forgot-link:hover {
          text-decoration: underline !important;
        }

        /* Submit Button */
        .login-submit-btn {
          width: 100% !important;
          padding: 16px !important;
          background: #4B5320 !important;
          color: white !important;
          border: none !important;
          border-radius: 6px !important;
          font-size: 16px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 10px !important;
          font-family: inherit !important;
          box-shadow: none !important;
        }

        .login-submit-btn:hover:not(:disabled) {
          background: #79b300 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(44, 62, 80, 0.15) !important;
        }

        .login-submit-btn:active:not(:disabled) {
          transform: translateY(0) !important;
        }

        .login-submit-btn:disabled {
          opacity: 0.7 !important;
          cursor: not-allowed !important;
          transform: none !important;
        }

        .login-submit-btn.login-loading {
          background: #79b300 !important;
        }

        .login-spinner {
          width: 18px !important;
          height: 18px !important;
          border: 2px solid rgba(255, 255, 255, 0.3) !important;
          border-radius: 50% !important;
          border-top-color: white !important;
          animation: spin 0.8s linear infinite !important;
        }

        /* Form Footer */
        .login-form-footer {
          margin-top: 20px !important;
          padding-top: 20px !important;
          border-top: 1px solid #eee !important;
          text-align: center !important;
        }

        .login-help-text {
          font-size: 14px !important;
          color: #666 !important;
          margin: 0 !important;
        }

        .login-help-link {
          color: #4B5320 !important;
          text-decoration: none !important;
          font-weight: 500 !important;
        }

        .login-help-link:hover {
          text-decoration: underline !important;
        }

        .login-copyright {
          font-size: 12px !important;
          color: #999 !important;
          margin: 0 !important;
        }

        /* Animations */
        @keyframes spin {
          to { transform: rotate(360deg) !important; }
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .login-image-side {
            flex: 0.8 !important;
          }
          
          .login-form-side {
            flex: 1.2 !important;
          }
        }

        @media (max-width: 768px) {
          .login-wrapper {
            flex-direction: column !important;
          }
          
          .login-image-side {
            height: 30vh !important;
            flex: none !important;
          }
          
          .login-form-side {
            height: 70vh !important;
            padding: 20px !important;
          }
          
          .login-image-title {
            font-size: 24px !important;
          }
          
          .login-image-subtitle {
            font-size: 14px !important;
          }
        }

        @media (max-width: 480px) {
          .login-form-wrapper {
            padding: 0 !important;
          }
          
          .login-logo-title h1 {
            font-size: 20px !important;
          }
          
          .login-form-header h2 {
            font-size: 20px !important;
          }
        }

        /* Print Styles */
        @media print {
          .login-image-side {
            display: none !important;
          }
          
          .login-form-side {
            width: 100% !important;
            height: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;