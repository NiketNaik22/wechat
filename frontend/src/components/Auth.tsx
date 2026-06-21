import React, { useState } from 'react';
import { login, signup } from '../api';
import { LogIn, UserPlus, MessageSquare, Eye, EyeOff } from 'lucide-react';
import './Auth.css';

interface AuthProps {
  onLoginSuccess: (userData: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // State to track if login failed due to invalid credentials
  const [hasLoginError, setHasLoginError] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    displayName: ''
  });

  const handleInputChange = (field: string, value: string) => {
    // Clear the error state as soon as the user starts typing again
    if (hasLoginError) {
      setHasLoginError(false);
    }
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setHasLoginError(false); // Reset error state before attempting login

    try {
      if (isLogin) {
        const response = await login({
          username: formData.username,
          password: formData.password
        });
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data));
        onLoginSuccess(response.data);
      } else {
        await signup(formData);
        alert('Registration successful! You can now log in.');
        setIsLogin(true);
      }
    } catch (error: any) {
      // If it's a 401 Unauthorized or 403 Forbidden, it's likely a bad credential
      // Also checking for 400 because sometimes Spring Security or custom exceptions return 400
      if (isLogin && (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 400)) {
         setHasLoginError(true);
         alert('Incorrect username or password. Please try again.');
      } else {
         // Generic fallback for other errors (like 500 server error, or registration conflicts)
         alert(error.response?.data?.message || error.response?.data || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="brand-icon">
          <MessageSquare size={40} />
        </div>
        <h1>ChatApp</h1>
        <p>Connect with the world instantly</p>
      </div>

      <div className="auth-card-container">
        <div className="auth-card-header">
          <button 
            className={isLogin ? 'active' : ''} 
            onClick={() => {
              setIsLogin(true);
              setHasLoginError(false); // Reset errors when switching tabs
            }}
          >
            Login
          </button>
          <button 
            className={!isLogin ? 'active' : ''} 
            onClick={() => {
              setIsLogin(false);
              setHasLoginError(false); // Reset errors when switching tabs
            }}
          >
            Register
          </button>
        </div>

        <form className="auth-card-body" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              className={hasLoginError ? 'input-error' : ''}
              required
            />
          </div>

          {!isLogin && (
            <>
              <div className="input-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label>Display Name</label>
                <input
                  type="text"
                  placeholder="How should we call you?"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="input-group">
            <label>Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={hasLoginError ? 'input-error' : ''}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {hasLoginError && (
              <span className="error-message">Incorrect username or password.</span>
            )}
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <span className="spinner"></span>
            ) : (
              <>
                {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                {isLogin ? 'Sign In' : 'Create Account'}
              </>
            )}
          </button>
        </form>

        <div className="auth-card-footer">
          {isLogin ? (
            <p>New to ChatApp? <span onClick={() => {
              setIsLogin(false);
              setHasLoginError(false);
            }}>Create an account</span></p>
          ) : (
            <p>Already have an account? <span onClick={() => {
              setIsLogin(true);
              setHasLoginError(false);
            }}>Sign in instead</span></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;