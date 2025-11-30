import React, { useState, useRef, useEffect } from "react";
import './styles/components/Navigation.css';

export default function Navigation({ user, onLogout, currentPage, onNavigate }) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const navItems = [
    { id: "home", label: "Home" },
    { id: "challenges", label: "Challenges" },
    { id: "leaderboard", label: "Leaderboard" },
    { id: "history", label: "History" },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleProfileClick = () => {
    onNavigate("profile");
    setShowProfileDropdown(false);
  };

  const getUserInitials = (username) => {
    return username.charAt(0).toUpperCase();
  };

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <span className="nav-logo">🎤</span>
        AI Pronunciation Coach
      </div>
      
      <div className="nav-links">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-link ${currentPage === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="user-section" ref={dropdownRef}>
        <div className="user-stats">
          <span className="user-level">Level {user.level}</span>
          <span className="user-streak">🔥 {user.streak || 0}</span>
        </div>
        
        <div 
          className="profile-avatar-wrapper" 
          onClick={() => setShowProfileDropdown(!showProfileDropdown)}
        >
          <div className="profile-avatar">
            {getUserInitials(user.username)}
          </div>
        </div>
        
        {showProfileDropdown && (
          <div className="profile-dropdown">
            <div className="profile-dropdown-header">
              <div className="profile-avatar-large">
                {getUserInitials(user.username)}
              </div>
              <div className="profile-dropdown-info">
                <h4>{user.username}</h4>
                <p>Level {user.level}</p>
                <p>{user.points} Points</p>
                <p>🔥 {user.streak || 0} day streak</p>
              </div>
            </div>
            <div className="profile-dropdown-actions">
              <button onClick={handleProfileClick} className="dropdown-action">
                👤 View Profile
              </button>
              <button onClick={onLogout} className="dropdown-action logout">
                🚪 Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}