import React, { useState } from "react";
import './styles/auth/Auth.css';
const API = "http://localhost:5000";

export default function Login({ onLogin, onSwitchToSignup }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Login failed");
        return;
      }
      onLogin(data.user);
    } catch (e) {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-split-container">
        {/* Left Panel */}
        <div className="auth-left-panel">
          <div className="auth-left-content">
            <div className="auth-decorative-elements">
              <div className="decorative-circle circle-1"></div>
              <div className="decorative-circle circle-2"></div>
              <div className="decorative-plus plus-1">+</div>
              <div className="decorative-plus plus-2">+</div>
              <div className="decorative-dots">
                <span></span><span></span><span></span>
                <span></span><span></span><span></span>
                <span></span><span></span><span></span>
              </div>
            </div>
            
            <div className="auth-greeting">
              <div className="greeting-icon">🎤</div>
              <h1 className="greeting-title">Welcome back!</h1>
              <p className="greeting-text">
                You can sign in to access with your existing account.
              </p>
            </div>

            <div className="auth-features">
              <div className="feature-item">
                <span className="feature-icon">✨</span>
                <span>AI-Powered Feedback</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span>Track Your Progress</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🎯</span>
                <span>Personalized Practice</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="auth-right-panel">
          <div className="auth-form-container">
            <div className="auth-form-header">
              <h2 className="form-title">Log in</h2>
              <p className="form-subtitle">Enter your credentials to continue</p>
            </div>

            <form onSubmit={submit} className="modern-auth-form">
              <div className="form-field">
                <label className="field-label">
                  <span className="label-icon">👤</span>
                  Username or email
                </label>
                <input 
                  className="field-input"
                  type="text"
                  placeholder="Enter your username"
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-field">
                <label className="field-label">
                  <span className="label-icon">🔒</span>
                  Password
                </label>
                <input 
                  className="field-input"
                  type="password" 
                  placeholder="Enter your password"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
                <a href='#' className="forgot-link">Forgot password?</a>
              </div>

              <button 
                type="submit" 
                className="submit-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="button-spinner"></span>
                    Signing In...
                  </>
                ) : (
                  'Log in'
                )}
              </button>
              
              {err && (
                <div className="form-error">
                  <span className="error-icon">⚠️</span>
                  {err}
                </div>
              )}
            </form>

            {onSwitchToSignup && (
              <div className="auth-toggle">
                <p>
                  Don't have an account?{' '}
                  <button 
                    type="button"
                    onClick={onSwitchToSignup}
                    className="toggle-button"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}