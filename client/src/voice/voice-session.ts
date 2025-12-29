import { createAudioCapture, type AudioCapture } from "../audio/capture.js";
import { createAudioPlayback, type AudioPlayback } from "../audio/playback.js";

export type SessionStatus = "idle" | "connecting" | "connected" | "error" | "ended";

export interface ServerEvent {
  type: "stt_output" | "agent_chunk" | "tts_chunk" | "session_end" | "pong";
  transcript?: string;
  text?: string;
  audio?: string; // base64 PCM
  ts?: number;
}

export interface VoiceSessionCallbacks {
  onStatusChange?: (status: SessionStatus) => void;
  onTranscript?: (transcript: string) => void;
  onAgentResponse?: (text: string) => void;
  onError?: (error: string) => void;
}

export interface VoiceSession {
  start: () => Promise<void>;
  stop: () => void;
  getStatus: () => SessionStatus;
}

export function createVoiceSession(
  callbacks: VoiceSessionCallbacks = {}
): VoiceSession {
  let ws: WebSocket | null = null;
  let status: SessionStatus = "idle";
  let audioCapture: AudioCapture | null = null;
  let audioPlayback: AudioPlayback | null = null;

  function setStatus(newStatus: SessionStatus) {
    status = newStatus;
    callbacks.onStatusChange?.(newStatus);
  }

  function handleEvent(event: ServerEvent) {
    switch (event.type) {
      case "stt_output":
        if (event.transcript) {
          callbacks.onTranscript?.(event.transcript);
        }
        break;

      case "agent_chunk":
        if (event.text) {
          callbacks.onAgentResponse?.(event.text);
        }
        break;

      case "tts_chunk":
        if (event.audio && audioPlayback) {
          const format = (event as { format?: string }).format || "mp3";
          audioPlayback.push(event.audio, format);
        }
        break;

      case "session_end":
        setStatus("ended");
        stop();
        break;

      case "pong":
        // Heartbeat response, no action needed
        break;
    }
  }

  async function start(): Promise<void> {
    if (status === "connecting" || status === "connected") {
      return;
    }

    setStatus("connecting");

    // Initialize audio modules
    audioCapture = createAudioCapture();
    audioPlayback = createAudioPlayback();
    
    // Notify server when playback finishes
    audioPlayback.setPlaybackFinishedCallback(() => {
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: "playback_finished" }));
      }
    });

    // Connect WebSocket - use server port (3000) instead of client dev server port
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // If client is on different port, connect to server port 3000
    const serverHost = window.location.hostname === "localhost" 
      ? "localhost:3000" 
      : window.location.host; // Use same host in production
    const wsUrl = `${protocol}//${serverHost}/ws`;
    ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = async () => {
      setStatus("connected");

      if (!audioCapture) {
        callbacks.onError?.("Audio capture not initialized");
        setStatus("error");
        return;
      }

      try {
        await audioCapture.start((chunk) => {
          // Send binary PCM chunks to server
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(chunk);
          }
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error("Audio capture error:", err);
        callbacks.onError?.(errorMessage);
        setStatus("error");
        stop();
      }
    };

    ws.onmessage = (event) => {
      // Check if message is JSON (text) or binary
      if (event.data instanceof ArrayBuffer) {
        // Binary data - shouldn't happen from server, but handle gracefully
        console.warn("Received unexpected binary data from server");
        return;
      }

      try {
        const eventData: ServerEvent = JSON.parse(event.data as string);
        handleEvent(eventData);
      } catch (error) {
        console.error("Error parsing server event:", error);
      }
    };

    ws.onclose = () => {
      if (status !== "ended") {
        setStatus("idle");
      }
    };

    ws.onerror = () => {
      callbacks.onError?.("WebSocket connection error");
      setStatus("error");
    };
  }

  function stop(): void {
    if (audioPlayback) {
      audioPlayback.stop();
      audioPlayback = null;
    }

    if (audioCapture) {
      audioCapture.stop();
      audioCapture = null;
    }

    if (ws) {
      ws.close();
      ws = null;
    }

    if (status !== "ended") {
      setStatus("idle");
    }
  }

  function getStatus(): SessionStatus {
    return status;
  }

  return { start, stop, getStatus };
}

