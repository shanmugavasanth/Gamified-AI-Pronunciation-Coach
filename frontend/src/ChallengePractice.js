import React, { useState, useRef } from "react";
import './styles/pages/ChallengePractice.css';
import './styles/components/Recorder.css';
const API = "http://localhost:5000";

function Recorder({ onRecordingStop, onRecordingStart, isRecording }) {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const start = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        onRecordingStop(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      onRecordingStart();
    } catch (err) {
      alert("Error accessing microphone: " + err.message);
    }
  };

  const stop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  return (
    <div className="recorder-container">
      {!isRecording ? (
        <button className="audio-btn record-btn" onClick={start}>
          Record Your Voice
        </button>
      ) : (
        <button className="audio-btn record-btn recording" onClick={stop}>
          Stop Recording
        </button>
      )}
      {isRecording && (
        <div className="recording-indicator">
          <div className="recording-dot"></div>
          Recording...
        </div>
      )}
    </div>
  );
}

export default function ChallengePractice({ challenge, user, onBack }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  const handleRecordingStart = () => {
    setIsRecording(true);
    setRecordedAudioBlob(null);
    setResult(null);
  };

  const handleRecordingStop = (blob) => {
    setRecordedAudioBlob(blob);
    setIsRecording(false);
  };

  const handleReferenceAudio = () => {
    const utterance = new SpeechSynthesisUtterance(challenge.word);
    utterance.onstart = () => setIsPlayingReference(true);
    utterance.onend = () => setIsPlayingReference(false);
    utterance.onerror = (event) => {
      console.error('Speech synthesis error', event);
      alert('Speech synthesis failed.');
      setIsPlayingReference(false);
    };
    window.speechSynthesis.speak(utterance);
  };
  
  const handlePlayback = () => {
    if (!recordedAudioBlob) {
      alert("Please record your voice first.");
      return;
    }
    const audioUrl = URL.createObjectURL(recordedAudioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };
  };

  const handleEvaluation = async () => {
    if (!recordedAudioBlob) {
        alert("Please record your voice before evaluating.");
        return;
    }

    setLoading(true);
    const form = new FormData();
    form.append("audio", recordedAudioBlob, "recording.webm");
    form.append("challenge_id", challenge.id);
    form.append("user_id", user.id);

    try {
      const res = await fetch(`${API}/challenge/practice`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Evaluation failed");
      } else {
        setResult(data);
        user.points = data.new_points;
        user.level = data.new_level;
      }
    } catch (e) {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'easy': return '#4ecdc4';
      case 'medium': return '#ffa502';
      case 'hard': return '#ff6b6b';
      default: return '#4ecdc4';
    }
  };

  const getChallengeStatus = (accuracy) => {
    if (accuracy >= 80) return 'success';
    if (accuracy >= 60) return 'partial';
    return 'failed';
  };

  if (loading) {
    return (
      <div className="challenge-practice-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Processing your pronunciation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="challenge-practice-container">
      {/* Challenge Header */}
      <div className="practice-header">
        <button onClick={onBack} className="back-button">
          ← Back to Challenges
        </button>
        <div className="challenge-info">
          <h1 className="challenge-title">Challenge: "{challenge.word}"</h1>
          <div className="challenge-meta">
            <span 
              className={`difficulty-badge ${challenge.difficulty}`}
              style={{ backgroundColor: getDifficultyColor(challenge.difficulty) }}
            >
              {challenge.difficulty.toUpperCase()}
            </span>
            <span className="points-display">
              {challenge.points} Points
            </span>
          </div>
          <p className="challenge-description">{challenge.description}</p>
        </div>
      </div>

      {/* Target Word Display */}
      <div className="target-word-section">
        <h3 className="section-title">Target Word</h3>
        <div className="target-word-display">
          <h2 className="target-word">{challenge.word}</h2>
          <p className="phonetic-guide">/pronunciation guide/</p>
        </div>
      </div>
      
      {/* Practice Recorder */}
      <div className="practice-recorder">
        <div className="recorder-container">
          <div className="text-input-section">
            <h3>Practice Recording</h3>
          </div>
          
          <div className="audio-controls">
            <button 
              className="audio-btn reference-btn"
              onClick={handleReferenceAudio} 
              disabled={isPlayingReference || isRecording} 
            >
              Reference Audio
            </button>
            <button 
              className="audio-btn playback-btn"
              onClick={handlePlayback} 
              disabled={!recordedAudioBlob || isRecording} 
            >
              Playback
            </button>
            <button
              className="audio-btn evaluate-btn"
              onClick={handleEvaluation}
              disabled={!recordedAudioBlob || loading || isRecording}
            >
              Evaluate
            </button>
          </div>

          <Recorder 
            onRecordingStop={handleRecordingStop} 
            onRecordingStart={handleRecordingStart} 
            isRecording={isRecording} 
          />
          
          <div className="hint-text">
            Tip: Listen to the reference audio, then record yourself saying "{challenge.word}" clearly.
          </div>
        </div>
      </div>
      
      {result && (
        <div className="challenge-result-display">
          <div className="result-header">
            <h3>Challenge Complete!</h3>
          </div>
          <div className="result-content">
            <div className="result-summary">
              <div className="result-accuracy">
                <div className="accuracy-circle">
                  <svg viewBox="0 0 100 100">
                    <circle 
                      className="background-circle" 
                      cx="50" 
                      cy="50" 
                      r="42" 
                    />
                    <circle 
                      className="progress-circle" 
                      cx="50" 
                      cy="50" 
                      r="42"
                      strokeDasharray={`${(result.accuracy / 100) * 264} 264`}
                    />
                  </svg>
                  <div className="accuracy-percentage">{result.accuracy}%</div>
                </div>
                <div className="accuracy-label">Accuracy</div>
              </div>

              <div className="result-details">
                <div className="result-item transcription">
                  <h4>Transcription</h4>
                  <p>"{result.transcript}"</p>
                </div>
                
                <div className="result-item meaning">
                  <h4>Points Earned</h4>
                  <p>{result.points_earned} / {challenge.points}</p>
                </div>
                
                <div className="result-item tips">
                  <h4>New Total</h4>
                  <p>{result.new_points} pts • Level {result.new_level}</p>
                </div>
              </div>
            </div>

            <div className={`challenge-status ${getChallengeStatus(result.accuracy)}`}>
              {result.accuracy >= 80 && "Great job! Challenge completed successfully!"}
              {result.accuracy < 80 && result.accuracy >= 60 && "Good effort! Keep practicing to improve."}
              {result.accuracy < 60 && "Keep practicing! Try again to improve your score."}
              
              <div className="points-earned">
                +{result.points_earned} Points Earned!
              </div>
            </div>

            <div className="action-buttons">
              <button onClick={onBack} className="retry-btn">
                Try Another Challenge
              </button>
              <button onClick={() => window.location.reload()} className="next-btn">
                Retry This Challenge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}