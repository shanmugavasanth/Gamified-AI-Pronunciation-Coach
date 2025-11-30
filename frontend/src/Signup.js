import React, { useState } from "react";
import './styles/auth/Auth.css';
const API = "http://localhost:5000";

export default function Signup({ onSignup, onSwitchToLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");
    
    if (password !== confirmPassword) {
      setErr("Passwords do not match");
      return;
    }
    
    if (password.length < 6) {
      setErr("Password must be at least 6 characters long");
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch(`${API}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Signup failed");
        return;
      }
      setOk("Account created successfully! Redirecting to sign in...");
      setTimeout(() => {
        if (onSignup) onSignup();
        if (onSwitchToLogin) onSwitchToLogin();
      }, 2000);
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
              <h1 className="greeting-title">Welcome!</h1>
              <p className="greeting-text">
                Join thousands learning perfect pronunciation.
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
              <h2 className="form-title">Sign Up</h2>
              <p className="form-subtitle">Create your account to get started</p>
            </div>

            <form onSubmit={submit} className="modern-auth-form">
              <div className="form-field">
                <label className="field-label">
                  <span className="label-icon">👤</span>
                  Username
                </label>
                <input 
                  className="field-input"
                  type="text"
                  placeholder="Choose a username"
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
                  placeholder="Create a password (min. 6 characters)"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label className="field-label">
                  <span className="label-icon">✓</span>
                  Confirm Password
                </label>
                <input 
                  className="field-input"
                  type="password" 
                  placeholder="Confirm your password"
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="submit-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="button-spinner"></span>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
              
              {err && (
                <div className="form-error">
                  <span className="error-icon">⚠️</span>
                  {err}
                </div>
              )}
              
              {ok && (
                <div className="form-success">
                  <span className="success-icon">✓</span>
                  {ok}
                </div>
              )}

              {/* <div className="form-terms">
                By creating an account, you agree to our{' '}
                <a href="#" className="terms-link">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="terms-link">Privacy Policy</a>
              </div> */}
            </form>

            {onSwitchToLogin && (
              <div className="auth-toggle">
                <p>
                  Already have an account?{' '}
                  <button 
                    type="button"
                    onClick={onSwitchToLogin}
                    className="toggle-button"
                  >
                    Log in
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