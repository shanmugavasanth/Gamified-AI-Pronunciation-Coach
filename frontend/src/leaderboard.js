import React, { useState, useEffect } from "react";
import './styles/pages/Leaderboard.css';
const API = "http://localhost:5000";

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/leaderboard`);
      if (!res.ok) {
        throw new Error("Failed to fetch leaderboard data.");
      }
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (e) {
      setError(e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const getUserInitials = (username) => {
    return username.charAt(0).toUpperCase();
  };

  const getRankClass = (rank) => {
    if (rank === 1) return 'first';
    if (rank === 2) return 'second';
    if (rank === 3) return 'third';
    return '';
  };

  const getRankMedal = (rank) => {
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  const getUserBadges = (user, rank) => {
    const badges = [];
    if (rank === 1) badges.push({ type: 'champion', label: 'Champion' });
    if (user.level >= 20) badges.push({ type: 'expert', label: 'Expert' });
    if (user.level >= 15) badges.push({ type: 'rising', label: 'Rising' });
    if (user.level >= 10) badges.push({ type: 'active', label: 'Active' });
    if (user.level < 10) badges.push({ type: 'learner', label: 'Learner' });
    return badges;
  };

  const getLevelTitle = (level) => {
    if (level >= 25) return "Pronunciation Master";
    if (level >= 20) return "Advanced Speaker";
    if (level >= 15) return "Fluent Practitioner";
    if (level >= 10) return "Skilled Speaker";
    if (level >= 5) return "Improving Student";
    return "Pronunciation Learner";
  };

  if (loading) {
    return (
      <div className="leaderboard-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="leaderboard-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  const topThree = leaderboard.slice(0, 3);
  const remaining = leaderboard.slice(3);

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h1 className="leaderboard-title">
          🏆 Leaderboard
        </h1>
        <p className="leaderboard-subtitle">See how you rank among pronunciation masters</p>
      </div>

      {/* Top 3 Podium */}
      {topThree.length >= 2 && (
        <div className="podium-section">
          {/* Second Place */}
          {topThree[1] && (
            <div className="podium-item second">
              <div className="podium-rank">🥈</div>
              <div className={`podium-avatar ${getRankClass(2)}`} style={{ background: 'linear-gradient(135deg, #6b7280, #4b5563)' }}>
                {getUserInitials(topThree[1].username)}
              </div>
              <div className="podium-name">{topThree[1].username}</div>
              <div className="podium-score">{topThree[1].points} pts</div>
            </div>
          )}
          
          {/* First Place */}
          {topThree[0] && (
            <div className="podium-item first">
              <div className="podium-rank">🏆</div>
              <div className={`podium-avatar ${getRankClass(1)}`} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                {getUserInitials(topThree[0].username)}
              </div>
              <div className="podium-name">{topThree[0].username}</div>
              <div className="podium-score">{topThree[0].points} pts</div>
            </div>
          )}

          {/* Third Place */}
          {topThree[2] && (
            <div className="podium-item third">
              <div className="podium-rank">🥉</div>
              <div className={`podium-avatar ${getRankClass(3)}`} style={{ background: 'linear-gradient(135deg, #cd7c2f, #b45309)' }}>
                {getUserInitials(topThree[2].username)}
              </div>
              <div className="podium-name">{topThree[2].username}</div>
              <div className="podium-score">{topThree[2].points} pts</div>
            </div>
          )}
        </div>
      )}

      {/* Full Leaderboard List */}
      <div className="leaderboard-list">
        {leaderboard.map((player, idx) => {
          const rank = idx + 1;
          const rankClass = getRankClass(rank);
          const badges = getUserBadges(player, rank);
          
          return (
            <div key={idx} className={`leaderboard-item ${rank <= 3 ? 'top-3' : ''}`}>
              <div className="rank-display">
                {rank <= 3 ? (
                  <div className="rank-medal">{getRankMedal(rank)}</div>
                ) : (
                  <div className={`rank-number ${rankClass}`}>{rank}</div>
                )}
              </div>

              <div className="user-info">
                <div className={`user-avatar ${rankClass} ${rank <= 3 ? 'top-3' : ''}`}>
                  {getUserInitials(player.username)}
                </div>
                <div className="user-details">
                  <div className="username">{player.username}</div>
                  <div className="user-level">{getLevelTitle(player.level)}</div>
                </div>
              </div>

              <div className="user-badges">
                {badges.map((badge, badgeIdx) => (
                  <span key={badgeIdx} className={`badge ${badge.type}`}>
                    {badge.label}
                  </span>
                ))}
              </div>

              <div className="user-score">
                <div className="score-value">{player.points}</div>
                <div className="score-label">Points</div>
              </div>
            </div>
          );
        })}
      </div>

      {leaderboard.length === 0 && !loading && (
        <div className="empty-state">
          <h3>No data available</h3>
          <p>The leaderboard is currently empty.</p>
        </div>
      )}
    </div>
  );
}