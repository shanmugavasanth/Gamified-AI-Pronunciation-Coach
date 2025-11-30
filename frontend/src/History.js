import React, { useState, useEffect, useCallback } from "react";
import './styles/pages/History.css';
const API = "http://localhost:5000";

export default function History({ user }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('practice'); // 'practice' or 'challenge'

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/history?user_id=${user.id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch history data.");
      }
      const data = await res.json();
      console.log("📊 Full history data:", data.history);
      console.log("🎤 Practice sessions:", data.history.filter(item => !item.challenge_id).length);
      console.log("🎯 Challenges:", data.history.filter(item => item.challenge_id).length);
      
      // Log first few items to check challenge_id
      if (data.history.length > 0) {
        console.log("First 5 items:");
        data.history.slice(0, 5).forEach((item, i) => {
          console.log(`  ${i + 1}. "${item.target_text}" - challenge_id: ${item.challenge_id}`);
        });
      }
      
      setHistory(data.history || []);
    } catch (e) {
      setError(e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    const diffTime = Math.abs(today - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    
    return date.toLocaleDateString();
  };

  const getScoreCategory = (accuracy) => {
    if (accuracy >= 90) return 'excellent';
    if (accuracy >= 75) return 'good';
    if (accuracy >= 60) return 'average';
    return 'needs-work';
  };

  const getActivityType = (item) => {
    return item.challenge_id ? 'challenge' : 'practice';
  };

  const getActivityTitle = (item) => {
    return item.challenge_id ? 'Challenge' : 'Practice Session';
  };

  const groupHistoryByDate = (history) => {
    const groups = {};
    history.forEach(item => {
      const date = new Date(item.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        const diffTime = Math.abs(today - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          groupKey = `${diffDays} days ago`;
        } else {
          groupKey = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        }
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });
    
    return groups;
  };

  // Filter history based on active tab
  const getFilteredHistory = () => {
    if (activeTab === 'practice') {
      return history.filter(item => !item.challenge_id);
    } else {
      return history.filter(item => item.challenge_id);
    }
  };

  if (loading) {
    return (
      <div className="history-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your practice history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const filteredHistory = getFilteredHistory();
  const groupedHistory = filteredHistory.length > 0 ? groupHistoryByDate(filteredHistory) : {};

  const practiceCount = history.filter(item => !item.challenge_id).length;
  const challengeCount = history.filter(item => item.challenge_id).length;

  return (
    <div className="history-container">
      <div className="history-header">
        <h1 className="history-title">
          Practice History
        </h1>
        <p className="history-subtitle">Track your pronunciation journey and progress</p>
      </div>

      {/* Toggle Buttons */}
      <div className="toggle-container">
        <button 
          className={`toggle-btn ${activeTab === 'practice' ? 'active' : ''}`}
          onClick={() => setActiveTab('practice')}
        >
          <span className="toggle-icon">🎤</span>
          Practice Sessions
        </button>
        <button 
          className={`toggle-btn ${activeTab === 'challenge' ? 'active' : ''}`}
          onClick={() => setActiveTab('challenge')}
        >
          <span className="toggle-icon">🎯</span>
          Challenges
        </button>
      </div>

      {/* History List */}
      {filteredHistory.length > 0 ? (
        <div className="history-list">
          {Object.entries(groupedHistory).map(([dateGroup, items]) => (
            <div key={dateGroup} className="history-section">
              <div className="section-header">{dateGroup}</div>
              {items.map((item, idx) => (
                <div key={idx} className="history-item">
                  <div className="activity-time">
                    {formatDate(item.created_at)}
                  </div>
                  
                  <div className={`activity-icon ${getActivityType(item)}`}>
                    {getActivityType(item) === 'challenge' ? '🎯' : '🎤'}
                  </div>
                  
                  <div className="activity-details">
                    <div className="activity-title">{getActivityTitle(item)}</div>
                    <div className="activity-description">
                      "{item.target_text}" - {item.accuracy}% accuracy
                    </div>
                  </div>
                  
                  <div className="activity-score">
                    <div className={`score-badge ${getScoreCategory(item.accuracy)}`}>
                      {item.accuracy}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No {activeTab === 'practice' ? 'practice sessions' : 'challenges'} yet</h3>
          <p>
            {activeTab === 'practice' 
              ? 'Go to the Home page to start practicing!' 
              : 'Go to the Challenges page to test your skills!'}
          </p>
        </div>
      )}
    </div>
  );
}