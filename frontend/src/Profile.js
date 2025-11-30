import React, { useState, useEffect, useCallback } from "react";
import './styles/pages/Profile.css';
const API = "http://localhost:5000";

export default function Profile({ user }) {
  const [profileData, setProfileData] = useState({
    streaks: 0,
    totalSessions: 0,
    bestScore: 0,
    challengesWon: {
      easy: 0,
      medium: 0,
      hard: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/profile?user_id=${user.id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch profile data.");
      }
      const data = await res.json();
      setProfileData(data.profile || {
        streaks: 0,
        totalSessions: 0,
        bestScore: 0,
        challengesWon: {
          easy: 0,
          medium: 0,
          hard: 0
        }
      });
    } catch (e) {
      setError(e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const getUserInitials = (username) => {
    return username.charAt(0).toUpperCase();
  };

  const getLevelTitle = (level) => {
    if (level >= 25) return "Pronunciation Master";
    if (level >= 20) return "Fluent Practitioner";
    if (level >= 15) return "Advanced Speaker";
    if (level >= 10) return "Skilled Speaker";
    if (level >= 5) return "Improving Student";
    return "Pronunciation Learner";
  };

  const getCircleProgress = (percentage) => {
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percentage / 100) * circumference;
    return { circumference, offset };
  };

  const getLevelProgress = () => {
    const currentLevelPoints = user.points % 100;
    return (currentLevelPoints / 100) * 100;
  };

  const totalChallengesWon = (profileData.challengesWon?.easy || 0) + 
                             (profileData.challengesWon?.medium || 0) + 
                             (profileData.challengesWon?.hard || 0);

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Profile Header */}
      <div className="profile-header-card">
        <div className="profile-avatar-large">
          {getUserInitials(user.username)}
        </div>
        <h1 className="profile-username">{user.username}</h1>
        <p className="profile-level-title">{getLevelTitle(user.level)}</p>
        <div className="profile-level-badge">Level {user.level}</div>
      </div>

      {/* Key Stats Grid */}
      <div className="stats-grid">
        <div className="stat-box streak">
          <div className="stat-icon">🔥</div>
          <div className="stat-value">{profileData.streaks}</div>
          <div className="stat-label">Day Streak</div>
        </div>
        
        <div className="stat-box sessions">
          <div className="stat-icon">🎯</div>
          <div className="stat-value">{profileData.totalSessions}</div>
          <div className="stat-label">Total Sessions</div>
        </div>
        
        <div className="stat-box score">
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{profileData.bestScore}%</div>
          <div className="stat-label">Best Score</div>
        </div>
        
        <div className="stat-box points">
          <div className="stat-icon">💎</div>
          <div className="stat-value">{user.points}</div>
          <div className="stat-label">Total Points</div>
        </div>
      </div>

      {/* Progress Section with Circular Indicators */}
      <div className="progress-cards-grid">
        {/* Level Progress */}
        <div className="progress-card level-card">
          <h3 className="card-title">Level Progress</h3>
          <div className="circular-progress-container">
            <svg className="circular-progress" viewBox="0 0 100 100">
              <circle
                className="progress-bg"
                cx="50"
                cy="50"
                r="45"
              />
              <circle
                className="progress-bar level"
                cx="50"
                cy="50"
                r="45"
                strokeDasharray={getCircleProgress(getLevelProgress()).circumference}
                strokeDashoffset={getCircleProgress(getLevelProgress()).offset}
              />
            </svg>
            <div className="progress-content">
              <div className="progress-number">{user.level}</div>
              <div className="progress-text">Level</div>
            </div>
          </div>
          <div className="progress-footer">
            <span>{user.points % 100}/100 points to next level</span>
          </div>
        </div>

        {/* Easy Challenges */}
        <div className="progress-card easy-card">
          <h3 className="card-title">Easy Challenges</h3>
          <div className="circular-progress-container">
            <svg className="circular-progress" viewBox="0 0 100 100">
              <circle
                className="progress-bg"
                cx="50"
                cy="50"
                r="45"
              />
              <circle
                className="progress-bar easy"
                cx="50"
                cy="50"
                r="45"
                strokeDasharray={getCircleProgress((profileData.challengesWon?.easy || 0) / 6 * 100).circumference}
                strokeDashoffset={getCircleProgress((profileData.challengesWon?.easy || 0) / 6 * 100).offset}
              />
            </svg>
            <div className="progress-content">
              <div className="progress-number">{profileData.challengesWon?.easy || 0}</div>
              <div className="progress-text">of 6</div>
            </div>
          </div>
          <div className="progress-footer">
            <span>{((profileData.challengesWon?.easy || 0) / 6 * 100).toFixed(0)}% Complete</span>
          </div>
        </div>

        {/* Medium Challenges */}
        <div className="progress-card medium-card">
          <h3 className="card-title">Medium Challenges</h3>
          <div className="circular-progress-container">
            <svg className="circular-progress" viewBox="0 0 100 100">
              <circle
                className="progress-bg"
                cx="50"
                cy="50"
                r="45"
              />
              <circle
                className="progress-bar medium"
                cx="50"
                cy="50"
                r="45"
                strokeDasharray={getCircleProgress((profileData.challengesWon?.medium || 0) / 6 * 100).circumference}
                strokeDashoffset={getCircleProgress((profileData.challengesWon?.medium || 0) / 6 * 100).offset}
              />
            </svg>
            <div className="progress-content">
              <div className="progress-number">{profileData.challengesWon?.medium || 0}</div>
              <div className="progress-text">of 6</div>
            </div>
          </div>
          <div className="progress-footer">
            <span>{((profileData.challengesWon?.medium || 0) / 6 * 100).toFixed(0)}% Complete</span>
          </div>
        </div>

        {/* Hard Challenges */}
        <div className="progress-card hard-card">
          <h3 className="card-title">Hard Challenges</h3>
          <div className="circular-progress-container">
            <svg className="circular-progress" viewBox="0 0 100 100">
              <circle
                className="progress-bg"
                cx="50"
                cy="50"
                r="45"
              />
              <circle
                className="progress-bar hard"
                cx="50"
                cy="50"
                r="45"
                strokeDasharray={getCircleProgress((profileData.challengesWon?.hard || 0) / 6 * 100).circumference}
                strokeDashoffset={getCircleProgress((profileData.challengesWon?.hard || 0) / 6 * 100).offset}
              />
            </svg>
            <div className="progress-content">
              <div className="progress-number">{profileData.challengesWon?.hard || 0}</div>
              <div className="progress-text">of 6</div>
            </div>
          </div>
          <div className="progress-footer">
            <span>{((profileData.challengesWon?.hard || 0) / 6 * 100).toFixed(0)}% Complete</span>
          </div>
        </div>
      </div>

      {/* Challenge Summary */}
      <div className="challenge-summary-card">
        <h3 className="section-title">🏆 Challenge Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Total Challenges Won</span>
            <span className="summary-value">{totalChallengesWon}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Success Rate</span>
            <span className="summary-value">
              {totalChallengesWon > 0 ? ((totalChallengesWon / 18) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Favorite Difficulty</span>
            <span className="summary-value">
              {profileData.challengesWon?.easy >= profileData.challengesWon?.medium && 
               profileData.challengesWon?.easy >= profileData.challengesWon?.hard 
                ? 'Easy' 
                : profileData.challengesWon?.medium >= profileData.challengesWon?.hard 
                  ? 'Medium' 
                  : 'Hard'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}