import { useEffect, useRef, useState } from "react";
import { createVoiceSession, type SessionStatus, type VoiceSession } from "../voice/voice-session";
import type { CompanyConfig } from "../types/config";
import "./VoiceTestDialog.css";

interface VoiceTestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  config: CompanyConfig;
}

interface TranscriptItem {
  type: "user" | "agent";
  text: string;
  timestamp: number;
}

export default function VoiceTestDialog({ isOpen, onClose, config }: VoiceTestDialogProps) {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<VoiceSession | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    sessionRef.current = createVoiceSession(
      {
        onStatusChange: setStatus,
        onTranscript: (text) => {
          setTranscript((prev) => [...prev, { type: "user", text, timestamp: Date.now() }]);
        },
        onAgentResponse: (text) => {
          setTranscript((prev) => [...prev, { type: "agent", text, timestamp: Date.now() }]);
        },
        onError: setError,
      },
      config
    );

    return () => {
      sessionRef.current?.stop();
    };
  }, [isOpen, config]);

  const handleStart = async () => {
    setError(null);
    setTranscript([]);
    try {
      await sessionRef.current?.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    }
  };

  const handleStop = () => {
    sessionRef.current?.stop();
  };

  const handleClose = () => {
    sessionRef.current?.stop();
    onClose();
  };

  if (!isOpen) return null;

  const getStatusText = () => {
    switch (status) {
      case "idle": return "Ready to start";
      case "connecting": return "Connecting...";
      case "connected": return "Connected - Listening";
      case "error": return "Error";
      case "ended": return "Session ended";
      default: return "Unknown";
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Test Sales Agent</h2>
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="status-bar">
            <div className={`status-indicator ${status === "connected" ? "connected" : ""}`} />
            <span className="status-text">{getStatusText()}</span>
          </div>

          {error && (
            <div className="error-banner">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div className="transcript-container">
            {transcript.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎙️</div>
                <div className="empty-state-text">
                  Click "Start Conversation" to begin testing
                </div>
              </div>
            ) : (
              transcript.map((item, index) => (
                <div key={index} className={`transcript-item ${item.type}`}>
                  <div className="transcript-label">{item.type === "user" ? "You" : "Agent"}</div>
                  <p className="transcript-text">{item.text}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-footer">
          {status === "idle" || status === "ended" ? (
            <button className="btn btn-primary" onClick={handleStart}>
              Start Conversation
            </button>
          ) : (
            <button className="btn btn-danger" onClick={handleStop}>
              Stop Conversation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

