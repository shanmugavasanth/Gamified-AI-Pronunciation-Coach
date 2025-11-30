import React, { useState, useEffect } from "react";
import './styles/pages/Challenges.css';
const API = "http://localhost:5000";

export default function Challenges({ user, onNavigateToChallenge }) {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState("easy");

  const difficulties = [
    { id: "easy", label: "Easy", color: "easy" },
    { id: "medium", label: "Medium", color: "medium" },
    { id: "hard", label: "Hard", color: "hard" }
  ];

  const fetchChallenges = async (difficulty) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/challenges?difficulty=${difficulty}`);
      if (!res.ok) {
        throw new Error("Failed to fetch challenges.");
      }
      const data = await res.json();
      setChallenges(data.challenges || []);
    } catch (e) {
      setError(e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges(selectedDifficulty);
  }, [selectedDifficulty]);

  const handleDifficultyChange = (difficulty) => {
    setSelectedDifficulty(difficulty);
  };

  const handleChallengeClick = (challenge) => {
    onNavigateToChallenge(challenge);
  };

  if (loading) {
    return (
      <div className="challenges-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading challenges...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="challenges-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="challenges-container">
      <div className="challenges-header">
        <h1 className="challenges-title">
          Pronunciation Challenges
        </h1>
        <p className="challenges-subtitle">Test your pronunciation skills with various difficulty levels</p>
      </div>
      
      {/* Difficulty Navigation */}
      <div className="difficulty-filter">
        {difficulties.map((diff) => (
          <button
            key={diff.id}
            className={`difficulty-btn ${diff.color} ${selectedDifficulty === diff.id ? 'active' : ''}`}
            onClick={() => handleDifficultyChange(diff.id)}
          >
            {diff.label}
          </button>
        ))}
      </div>

      {/* Challenges Grid */}
      {challenges.length > 0 ? (
        <div className="challenges-grid">
          {challenges.map((challenge) => (
            <div 
              key={challenge.id} 
              className={`challenge-card ${challenge.difficulty}`}
              onClick={() => handleChallengeClick(challenge)}
            >
              <div className="challenge-header">
                <h3 className="challenge-word">{challenge.word}</h3>
                <span className="challenge-points">{challenge.points} Points</span>
              </div>
              <p className="challenge-description">{challenge.description}</p>
              <div className="challenge-stats">
                <span className="challenge-attempts">1.2k attempts</span>
                <span className="challenge-success-rate">78% success rate</span>
              </div>
              <button className="challenge-start-btn">
                Start Challenge
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No challenges available</h3>
          <p>No challenges found for {selectedDifficulty} difficulty.</p>
        </div>
      )}
    </div>
  );
}