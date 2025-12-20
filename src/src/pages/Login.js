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
      default:
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
    <div className="login-container">
      <div className="login-wrapper">
        {/* Left Side - Background Image */}
        <div className="image-side">
          <div 
            className="background-image"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div className="image-overlay">
            <div className="image-content">
              <h2 className="image-title">Syntra Learning Portal</h2>
              <p className="image-subtitle">
                Your gateway to comprehensive Computer-Based Testing (CBT) and digital learning excellence. Access interactive assessments, track your academic progress, and experience seamless examination management in a secure, modern environment designed for 21st-century education.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="form-side">
          <div className="form-wrapper">
            {/* Logo Container */}
            <div className="logo-container">
              <div className="logo-wrapper">
                <img 
                  src={syntraLogo} 
                  alt="Syntra Logo" 
                  className="logo-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextElementSibling) {
                      e.target.nextElementSibling.style.display = 'block';
                    }
                  }}
                />
                {/* Fallback if logo doesn't load */}
                <div className="logo-fallback" style={{ display: 'none' }}>
                  <div className="logo-text">SYNTRA</div>
                </div>
              </div>
              <div className="logo-title">
                <h1>Syntra Software Solution</h1>
                <p>Education Management System</p>
              </div>
            </div>

            {/* Login Form */}
            <div className="form-header">
              <h2>Sign In</h2>
              <p>Enter your credentials to access your account</p>
            </div>

            {error && (
              <div className="error-message">
                <span className="error-icon">!</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <div className={`input-container ${focusedField === 'username' ? 'focused' : ''}`}>
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
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="password-header">
                  <label htmlFor="password">Password</label>
                  <a href="/forgot-password" className="forgot-link">
                    Forgot password?
                  </a>
                </div>
                <div className={`input-container ${focusedField === 'password' ? 'focused' : ''}`}>
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
                    className="form-input"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className={`submit-btn ${isLoading ? 'loading' : ''}`}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Signing In...
                  </>
                ) : 'Sign In'}
              </button>
            </form>

            <div className="form-footer">
              <p className="help-text">
                Need help? <a href="/contact">Contact Administrator</a>
              </p>
              <p className="copyright">
                © {new Date().getFullYear()} Syntra Software Solution. All Rights Reserved.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #f8f9fa;
        }

        .login-wrapper {
          display: flex;
          height: 100vh;
          width: 100vw;
        }

        /* Left Side - Image */
        .image-side {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: #2c3e50;
        }

        .background-image {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          filter: brightness(0.8);
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(44, 62, 80, 0.9) 0%, rgba(0, 0, 0, 0.7) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }

        .image-content {
          text-align: center;
          color: white;
          max-width: 500px;
        }

        .image-title {
          font-size: 32px;
          font-weight: 600;
          margin-bottom: 16px;
          line-height: 1.3;
        }

        .image-subtitle {
          font-size: 16px;
          opacity: 0.9;
          line-height: 1.5;
        }

        /* Right Side - Form */
        .form-side {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: #ffffff;
          overflow-y: auto;
        }

        .form-wrapper {
          width: 100%;
          max-width: 400px;
          padding: 0 20px;
        }

        /* Logo Styling */
        .logo-container {
          text-align: center;
          margin-bottom: 40px;
        }

        .logo-wrapper {
          display: inline-block;
          padding: 15px;
          background: white;
          border-radius: 8px;
          margin-top: 70px;
          margin-bottom: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .logo-image {
          height: 60px;
          width: auto;
          max-width: 200px;
          object-fit: contain;
          filter: brightness(1.1) contrast(1.1);
          -webkit-filter: brightness(1.1) contrast(1.1);
        }

        .logo-fallback {
          padding: 15px 30px;
          background: #2c3e50;
          border-radius: 8px;
          display: inline-block;
        }

        .logo-text {
          color: white;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .logo-title h1 {
          font-size: 24px;
          font-weight: 600;
          color: #2c3e50;
          margin: 0 0 4px 0;
        }

        .logo-title p {
          font-size: 14px;
          color: #666;
          margin: 0;
        }

        /* Form Header */
        .form-header {
          margin-bottom: 30px;
        }

        .form-header h2 {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin: 0 0 8px 0;
        }

        .form-header p {
          font-size: 14px;
          color: #666;
          margin: 0;
        }

        /* Error Message */
        .error-message {
          background: #fee;
          color: #c33;
          padding: 12px 16px;
          border-radius: 6px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          font-size: 14px;
          border: 1px solid #fcc;
        }

        .error-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          background: #c33;
          color: white;
          border-radius: 50%;
          margin-right: 10px;
          font-size: 12px;
          font-weight: bold;
        }

        /* Form Elements */
        .form-group {
          margin-bottom: 24px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #444;
        }

        .input-container {
          position: relative;
          border: 1px solid #ddd;
          border-radius: 6px;
          transition: all 0.2s ease;
          background: #fafafa;
        }

        .input-container.focused {
          border-color: #79b300;
          box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.1);
          background: white;
        }

        .form-input {
          width: 100%;
          padding: 14px 16px;
          border: none;
          background: transparent;
          font-size: 15px;
          color: #4B5320;
          outline: none;
        }

        .form-input::placeholder {
          color: #999;
        }

        .form-input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .password-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .forgot-link {
          font-size: 13px;
          color: #2c3e50;
          text-decoration: none;
          font-weight: 500;
        }

        .forgot-link:hover {
          text-decoration: underline;
        }

        /* Submit Button */
        .submit-btn {
          width: 100%;
          padding: 16px;
          background: #4B5320;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #79b300;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(44, 62, 80, 0.15);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .submit-btn.loading {
          background: #79b300;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.8s linear infinite;
        }

        /* Form Footer */
        .form-footer {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
        }

        .help-text {
          font-size: 14px;
          color: #666;
          margin: 0;
        }

        .help-text a {
          color: #4B5320;
          text-decoration: none;
          font-weight: 500;
        }

        .help-text a:hover {
          text-decoration: underline;
        }

        .copyright {
          font-size: 12px;
          color: #999;
          margin: 0;
        }

        /* Animations */
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .image-side {
            flex: 0.8;
          }
          
          .form-side {
            flex: 1.2;
          }
        }

        @media (max-width: 768px) {
          .login-wrapper {
            flex-direction: column;
          }
          
          .image-side {
            height: 30vh;
            flex: none;
          }
          
          .form-side {
            height: 70vh;
            padding: 20px;
          }
          
          .image-title {
            font-size: 24px;
          }
          
          .image-subtitle {
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .form-wrapper {
            padding: 0;
          }
          
          .logo-title h1 {
            font-size: 20px;
          }
          
          .form-header h2 {
            font-size: 20px;
          }
        }

        /* Print Styles */
        @media print {
          .image-side {
            display: none;
          }
          
          .form-side {
            width: 100%;
            height: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;