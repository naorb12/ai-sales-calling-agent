import { useEffect, useRef, useState } from "react";
import {
  createVoiceSession,
  type SessionStatus,
  type VoiceSession,
} from "../voice/voice-session.js";

export default function VoiceCall() {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [transcript, setTranscript] = useState<string>("");
  const [agentResponse, setAgentResponse] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<VoiceSession | null>(null);

  useEffect(() => {
    // Create voice session instance
    sessionRef.current = createVoiceSession({
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
        if (newStatus === "idle" || newStatus === "ended") {
          setTranscript("");
          setAgentResponse("");
          setError(null);
        }
      },
      onTranscript: (text) => {
        setTranscript(text);
      },
      onAgentResponse: (text) => {
        setAgentResponse(text);
      },
      onError: (errorMessage) => {
        setError(errorMessage);
      },
    });

    return () => {
      // Cleanup on unmount
      sessionRef.current?.stop();
    };
  }, []);

  const handleStart = async () => {
    setError(null);
    try {
      await sessionRef.current?.start();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start session";
      setError(errorMessage);
    }
  };

  const handleStop = () => {
    sessionRef.current?.stop();
  };

  const getStatusDisplay = (): string => {
    switch (status) {
      case "idle":
        return "Ready";
      case "connecting":
        return "Connecting...";
      case "connected":
        return "Listening...";
      case "error":
        return "Error";
      case "ended":
        return "Session Ended";
      default:
        return "Unknown";
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 800 }}>
      <h2>Voice Conversation</h2>

      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 10 }}>
          <strong>Status:</strong> {getStatusDisplay()}
        </div>

        {status === "idle" || status === "ended" ? (
          <button onClick={handleStart}>🎙 Start Conversation</button>
        ) : (
          <button onClick={handleStop}>⏹ Stop Conversation</button>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: 10,
            marginBottom: 20,
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: 4,
            color: "#c00",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {transcript && (
        <div style={{ marginBottom: 20 }}>
          <h3>You said:</h3>
          <div
            style={{
              padding: 10,
              backgroundColor: "#f5f5f5",
              borderRadius: 4,
              minHeight: 40,
            }}
          >
            {transcript}
          </div>
        </div>
      )}

      {agentResponse && (
        <div style={{ marginBottom: 20 }}>
          <h3>Agent:</h3>
          <div
            style={{
              padding: 10,
              backgroundColor: "#e8f4f8",
              borderRadius: 4,
              minHeight: 40,
            }}
          >
            {agentResponse}
          </div>
        </div>
      )}
    </div>
  );
}
