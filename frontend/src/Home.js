import React, { useState, useRef } from "react";
import './styles/pages/Home.css';
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
    <>
      {!isRecording ? (
        <button className="audio-btn record-btn" onClick={start}>
          🎤 Start Recording
        </button>
      ) : (
        <button className="audio-btn record-btn recording" onClick={stop}>
          ⏹ Stop Recording
        </button>
      )}
    </>
  );
}

export default function Home({ user }) {
  const [targetText, setTargetText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingPlayback, setIsPlayingPlayback] = useState(false); // Add this line

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
    if (!targetText.trim()) {
      alert("Please enter text to speak.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(targetText);
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

    audio.onplay = () => setIsPlayingPlayback(true);
    audio.onended = () => {
      setIsPlayingPlayback(false);
      URL.revokeObjectURL(audioUrl);
    };

    audio.play();
  };

  const handleEvaluation = async () => {
    if (!targetText.trim() || !recordedAudioBlob) {
        alert("Please enter text and record your voice before evaluating.");
        return;
    }

    setLoading(true);
    const form = new FormData();
    form.append("audio", recordedAudioBlob, "recording.webm");
    form.append("target_text", targetText);
    form.append("user_id", user.id);

    try {
      const res = await fetch(`${API}/practice`, {
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

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1 className="hero-title">Perfect Your Pronunciation</h1>
        <p className="hero-subtitle">Practice with AI-powered feedback and improve your speaking skills</p>
      </div>

      <div className="practice-section">
        <div className="text-input-section">
          <label className="form-label">Enter Target Text</label>
          <input 
            type="text"
            className="form-input"
            placeholder="Hello, how are you today?"
            value={targetText} 
            onChange={(e) => setTargetText(e.target.value)} 
          />
        </div>
        
        <div className="audio-controls">
          <button
            className={`audio-btn reference-btn ${isPlayingReference ? 'active' : ''}`}
            onClick={handleReferenceAudio}
            disabled={isPlayingReference || !targetText.trim() || isRecording}
          >
            {isPlayingReference ? (
              <div className="equalizer">
                <div className="equalizer-bar"></div>
                <div className="equalizer-bar"></div>
                <div className="equalizer-bar"></div>
              </div>
            ) : (
              '🔊 Reference Audio'
            )}
          </button>
          
          <button
            className="audio-btn playback-btn"
            onClick={handlePlayback}
            disabled={!recordedAudioBlob || isRecording}
          >
            {isPlayingPlayback ? (
              <div className="equalizer">
                <div className="equalizer-bar"></div>
                <div className="equalizer-bar"></div>
                <div className="equalizer-bar"></div>
              </div>
            ) : (
              '▶ Playback'
            )}
          </button>
          
          <Recorder 
            onRecordingStop={handleRecordingStop} 
            onRecordingStart={handleRecordingStart} 
            isRecording={isRecording} 
          />
          
          <button
            className="audio-btn evaluate-btn"
            onClick={handleEvaluation}
            disabled={!recordedAudioBlob || !targetText.trim() || loading || isRecording}
          >
            {loading ? <span className="bouncing-dots"><span></span><span></span><span></span><span></span></span> : '⚡ Evaluate'}
          </button>
        </div>

        {isRecording && (
          <div className="recording-indicator-wrapper">
            <div className="recording-dot"></div>
            Recording...
          </div>
        )}

        <div className="hint-text">
          Tip: Listen to the reference audio, then record yourself saying the text clearly.
        </div>

        {result && (
          <div className="feedback-section">
            <div className="accuracy-display">
              <div className="accuracy-label"><h4>ACCURACY</h4></div>
              <div className="accuracy-circle">
                <svg viewBox="0 0 120 120">
                  <circle 
                    className="background-circle" 
                    cx="60" 
                    cy="60" 
                    r="52" 
                  />
                  <circle 
                    className="progress-circle" 
                    cx="60" 
                    cy="60" 
                    r="52"
                    strokeDasharray={`${(result.accuracy / 100) * 327} 327`}
                  />
                </svg>
                <div className="accuracy-percentage">{result.accuracy}%</div>
              </div>
            </div>

            <div className="feedback-details">
              <h4>🎯 Detailed Feedback</h4>
              
              <div className="feedback-item transcription">
                <strong>Transcription:</strong> "{result.transcript}"
              </div>
              
              <div className="feedback-item meaning">
                <strong>Points Earned:</strong> {result.points_earned}
              </div>
              
              <div className="feedback-item tips">
                <strong>Total Points:</strong> {result.new_points}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}