import React, { useState } from "react";
import Login from "./Login";
import Signup from "./Signup.js";
import Home from "./Home.js";
import Leaderboard from "./leaderboard.js";
import Navigation from "./Navigation.js";
import History from "./History.js";
import Challenges from "./Challenges.js";
import ChallengePractice from "./ChallengePractice.js";
import Profile from "./Profile.js";
import './styles/globals.css';

function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("login"); // login | signup
  const [currentPage, setCurrentPage] = useState("home"); // home | leaderboard | challenges | history | challenge-practice | profile
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentPage("home");
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage("home");
    setMode("login");
    setSelectedChallenge(null);
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
    if (page !== "challenges") {
      setSelectedChallenge(null);
    }
  };

  const handleNavigateToChallenge = (challenge) => {
    setSelectedChallenge(challenge);
    setCurrentPage("challenge-practice");
  };

  const handleBackToChallenges = () => {
    setSelectedChallenge(null);
    setCurrentPage("challenges");
  };

  // Authentication screens
  if (!user) {
    return (
      <>
        {mode === "login" ? (
          <Login 
            onLogin={handleLogin} 
            onSwitchToSignup={() => setMode("signup")} 
          />
        ) : (
          <Signup 
            onSignup={() => setMode("login")}
            onSwitchToLogin={() => setMode("login")}
          />
        )}
      </>
    );
  }

  // Main app with navigation
  const renderCurrentPage = () => {
    switch (currentPage) {
      case "home":
        return <Home user={user} />;
      case "leaderboard":
        return <Leaderboard />;
      case "challenges":
        return <Challenges user={user} onNavigateToChallenge={handleNavigateToChallenge} />;
      case "challenge-practice":
        return selectedChallenge ? 
          <ChallengePractice 
            challenge={selectedChallenge} 
            user={user} 
            onBack={handleBackToChallenges}
          /> : 
          <Challenges user={user} onNavigateToChallenge={handleNavigateToChallenge} />;
      case "history":
        return <History user={user} />;
      case "profile":
        return <Profile user={user} />;
      default:
        return <Home user={user} />;
    }
  };

  return (
    <div className="app-root">
      <Navigation 
        user={user} 
        onLogout={handleLogout} 
        currentPage={currentPage}
        onNavigate={handleNavigate}
      />
      <main className="main-content">
        {renderCurrentPage()}
      </main>
    </div>
  );
}

export default App;