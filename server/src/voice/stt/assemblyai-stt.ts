import { AssemblyAI } from "assemblyai";
import { Readable } from "stream";
import { config } from "../../config.js";

export interface StreamingSession {
  transcriber: ReturnType<AssemblyAI["streaming"]["transcriber"]>;
  audioStream: Readable;
  isActive: boolean;
}

/**
 * Create and start a streaming transcription session
 */
export async function createStreamingSession(
  sampleRate: number,
  onTurn: (transcript: string) => void,
  onError: (error: Error) => void
): Promise<StreamingSession> {
  const client = new AssemblyAI({
    apiKey: config.assemblyai.apiKey,
  });

  const transcriber = client.streaming.transcriber({
    sampleRate: 16000,
    formatTurns: true, // Enable VAD turn detection
  });

  // Create a Node.js Readable stream for audio chunks
  const audioStream = new Readable({
    read() {
      // This will be called when the stream needs data
      // We push data manually via pushAudio
    },
  });

  transcriber.on("open", ({ id }) => {
    console.log(`🎤 AssemblyAI session opened: ${id}`);
  });

  transcriber.on("error", (error) => {
    console.error("❌ AssemblyAI error:", error);
    onError(error instanceof Error ? error : new Error(String(error)));
  });

  transcriber.on("close", (code, reason) => {
    console.log(`🔌 AssemblyAI session closed: ${code} ${reason}`);
  });

  transcriber.on("turn", (turn) => {
    // Only process final formatted transcripts (prevents partial/accumulated audio)
    if (turn.turn_is_formatted && turn.transcript && turn.transcript.trim()) {
      console.log(`📝 Final turn detected: ${turn.transcript}`);
      onTurn(turn.transcript);
    } else if (turn.transcript && turn.transcript.trim()) {
      console.log(`📝 Partial turn: ${turn.transcript}`);
    }
  });

  await transcriber.connect();

  // Use Readable.toWeb() to convert Node stream to Web stream, then pipe to transcriber
  Readable.toWeb(audioStream).pipeTo(transcriber.stream());

  return {
    transcriber,
    audioStream,
    isActive: true,
  };
}

/**
 * Send audio chunk to the streaming session
 */
export function streamAudio(session: StreamingSession, audioBuffer: Buffer): void {
  if (session.isActive && session.audioStream) {
    session.audioStream.push(audioBuffer);
  }
}

/**
 * Close the streaming session
 */
export async function closeStreamingSession(session: StreamingSession): Promise<void> {
  if (!session.isActive) {
    return;
  }

  try {
    // End the audio stream
    if (session.audioStream) {
      session.audioStream.push(null); // Signal end of stream
    }
    
    await session.transcriber.close();
    session.isActive = false;
    console.log("🔌 AssemblyAI session closed");
  } catch (error) {
    console.error("❌ Error closing session:", error);
    session.isActive = false;
  }
}