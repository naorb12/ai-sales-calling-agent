import type { WebSocket } from "ws";
import type { CallSession, Lead } from "../types.js";
import { CallStage } from "../call/stages.js";
import { startConversation, processTurn } from "../call/pipeline.js";
import { textToSpeech } from "../voice/openai-tts.js";
import { getAvailableSlots, bookMeeting, sendCalendarInvite } from "../services/calendar-service.js";
import {
  createStreamingSession,
  streamAudio,
  closeStreamingSession,
  type StreamingSession,
} from "../voice/assemblyai-stt.js";

interface ActiveSession {
  session: CallSession;
  ws: WebSocket;
  isSpeaking: boolean; // Flag to prevent echo (agent speaking)
  transcriptionSession: StreamingSession | null;

}

const PCM_SAMPLE_RATE = 16000;

/**
 * Send JSON event to client
 */
function sendEvent(ws: WebSocket, event: { type: string; [key: string]: unknown }) {
  if (ws.readyState === 1) {
    // 1 = OPEN
    ws.send(JSON.stringify(event));
  }
}

/**
 * Main entry: Handle WebSocket connection for web voice session
 */
export async function handleWebVoiceConnection(ws: WebSocket) {
  console.log("🔌 Web voice session connected");

  ws.on("error", (error) => {
    console.error("❌ WebSocket error:", error);
  });

  ws.on("close", () => {
    console.log("🔌 Web voice session closed");
  });

  // Use hardcoded test lead
  const lead: Lead = {
    name: "Test Lead",
    phone: "+972501234567",
    company: "Test Company",
    industry: "טכנולוגיה",
  };

  // Setup session
  const session: CallSession = {
    id: `web-voice-${Date.now()}`,
    lead,
    stage: CallStage.INTRO,
    history: [],
    repeatCount: 0,
    availableSlots: await getAvailableSlots(),
    startTime: Date.now(),
  };

  const activeSession: ActiveSession = {
    session,
    ws,
    isSpeaking: true, // Start with true to prevent audio collection during greeting
    transcriptionSession: null,
  };

  // Create AssemblyAI session once - it stays alive for entire conversation
  activeSession.transcriptionSession = await createStreamingSession(
    PCM_SAMPLE_RATE,
    async (transcript) => {
      await processUserSpeech(activeSession, transcript);
    },
    (error) => {
      console.error("Transcription error:", error);
      activeSession.isSpeaking = false;
    }
  );

  ws.on("message", async (data: Buffer) => {
    if (data[0] === 0x7b) {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "ping") {
          sendEvent(ws, { type: "pong" });
        } else if (msg.type === "playback_finished") {
          activeSession.isSpeaking = false;
          console.log("🎧 Audio playback finished - listening for user response...");
        }
      } catch {
        // Ignore invalid JSON
      }
      return;
    }

    // Stream PCM audio directly to AssemblyAI (no buffering needed)
    if (!activeSession.isSpeaking && activeSession.transcriptionSession) {
      streamAudio(activeSession.transcriptionSession, data);
    }
  });

  // Send initial greeting - this will set isSpeaking appropriately
  console.log("💬 Sending initial greeting...");
  await sendInitialGreeting(activeSession);

  ws.on("close", () => {
    finishSession(activeSession);
  });

  ws.on("error", (error) => {
    console.error("❌ WebSocket error:", error);
    finishSession(activeSession);
  });
}

/**
 * Send agent's initial greeting
 */
async function sendInitialGreeting(session: ActiveSession) {
  session.isSpeaking = true; // Prevent audio collection during greeting
  const greeting = await startConversation(session.session);
  console.log(`💬 Agent: ${greeting}`);
  await sendAudio(session, greeting);
  // sendAudio will reset isSpeaking after audio finishes
}

/**
 * Core loop: STT → Pipeline → TTS
 */
async function processUserSpeech(session: ActiveSession, userText: string) {
  if (session.session.stage === CallStage.TERMINATE || session.isSpeaking) {
    return;
  }

  session.isSpeaking = true;

  if (!userText?.trim()) {
    session.isSpeaking = false;
    return;
  }

  try {
    console.log(`📝 User: ${userText}`);

    sendEvent(session.ws, {
      type: "stt_output",
      transcript: userText,
      ts: Date.now(),
    });

    const result = await processTurn(session.session, userText);

    if (result.agentResponse) {
      sendEvent(session.ws, {
        type: "agent_chunk",
        text: result.agentResponse,
        ts: Date.now(),
      });
    }

    if (result.nextStage === CallStage.TERMINATE) {
      console.log("🔚 Session ending");
      sendEvent(session.ws, { type: "session_end" });
      session.ws.close();
      await finishSession(session);
      return;
    }

    if (result.agentResponse) {
      await sendAudio(session, result.agentResponse);
    } else {
      session.isSpeaking = false;
    }
  } catch (error) {
    console.error("❌ Error processing speech:", error);
    session.isSpeaking = false;
  }
}

/**
 * Send agent's audio response to client
 */
async function sendAudio(session: ActiveSession, text: string) {
  try {
    // isSpeaking is already true from processUserSpeech

    // Generate MP3 audio
    const mp3Audio = await textToSpeech(text);
    console.log(`🔊 Generated ${mp3Audio.length} bytes (MP3)`);

    // Send MP3 directly to browser (browser will decode it)
    const base64Audio = mp3Audio.toString("base64");

    sendEvent(session.ws, {
      type: "tts_chunk",
      audio: base64Audio,
      format: "mp3",
      ts: Date.now(),
    });

    console.log(`✅ Sent MP3 audio to client`);
    
    // Don't set timeout - wait for client to send "playback_finished" event
    // This ensures we start listening exactly when audio finishes playing

  } catch (error) {
    console.error("❌ Error sending audio:", error);
    session.isSpeaking = false; // Reset on error
  }
}

/**
 * Finish session and book meeting if needed
 */
async function finishSession(session: ActiveSession) {
  console.log("\n📊 Session Summary");
  console.log(`Duration: ${Math.round((Date.now() - session.session.startTime) / 1000)}s`);
  console.log(`Stage: ${CallStage[session.session.stage]}`);

  if (session.transcriptionSession) {
    await closeStreamingSession(session.transcriptionSession);
  }
  
  if (session.session.selectedSlot) {
    console.log(`📅 Booking: ${session.session.selectedSlot.displayText}`);
    const booking = await bookMeeting(session.session.selectedSlot, [session.session.lead.phone]);
    await sendCalendarInvite(session.session.lead.phone, session.session.selectedSlot, booking.meetingLink);
    console.log(`✅ Booked: ${booking.eventId}`);
  }
}

