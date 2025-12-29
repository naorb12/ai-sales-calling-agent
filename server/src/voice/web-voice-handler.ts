import type { WebSocket } from "ws";
import type { CallSession, Lead } from "../types.js";
import { CallStage } from "../call/stages.js";
import { startConversation, processTurn } from "../call/pipeline.js";
import { speechToTextFromBuffer } from "../voice/openai-stt.js";
import { textToSpeech } from "../voice/openai-tts.js";
import { getAvailableSlots, bookMeeting, sendCalendarInvite } from "../services/calendar-service.js";
import { pcmToWav } from "../voice/audio-converter.js";

interface ActiveSession {
  session: CallSession;
  audioBuffer: Buffer[];
  ws: WebSocket;
  isSpeaking: boolean; // Flag to prevent echo (agent speaking)
}

// PCM audio format: 16kHz, 16-bit, mono
const PCM_SAMPLE_RATE = 16000;
const BYTES_PER_SAMPLE = 2; // 16-bit = 2 bytes
const SAMPLES_PER_SECOND = PCM_SAMPLE_RATE;
const BYTES_PER_SECOND = SAMPLES_PER_SECOND * BYTES_PER_SAMPLE;
const MIN_AUDIO_BYTES = BYTES_PER_SECOND * 2; // ~2 seconds of audio

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
    audioBuffer: [],
    ws,
    isSpeaking: true, // Start with true to prevent audio collection during greeting
  };

  // Set up message handler first, but isSpeaking will block audio collection
  ws.on("message", async (data: Buffer) => {
    // Check if it's binary (PCM audio) or JSON (control message)
    if (data[0] === 0x7b) {
      // Starts with '{' - likely JSON
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "ping") {
          sendEvent(ws, { type: "pong" });
        } else if (msg.type === "playback_finished") {
          // Client finished playing audio, can start listening
          activeSession.isSpeaking = false;
          console.log("🎧 Audio playback finished - listening for user response...");
        }
      } catch {
        // Ignore invalid JSON
      }
      return;
    }

    // Binary PCM audio chunk
    await collectAudio(activeSession, data);
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
 * Collect audio chunks until we have enough, then process
 */
async function collectAudio(session: ActiveSession, pcmChunk: Buffer) {
  // Don't collect audio while agent is speaking (prevent echo)
  if (session.isSpeaking) {
    return;
  }

  session.audioBuffer.push(pcmChunk);

  // Wait for ~2 seconds of audio
  const totalBytes = session.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
  if (totalBytes >= MIN_AUDIO_BYTES) {
    await processUserSpeech(session);
  }
}

/**
 * Core loop: STT → Pipeline → TTS
 */
async function processUserSpeech(session: ActiveSession) {
  // Don't process if already terminated or currently processing
  if (session.session.stage === CallStage.TERMINATE || session.isSpeaking) {
    return;
  }

  // Mark as processing to prevent overlapping turns
  session.isSpeaking = true;

  const audioData = Buffer.concat(session.audioBuffer);
  session.audioBuffer = [];

  try {
    console.log(`🎤 Processing ${audioData.length} bytes of PCM audio...`);

    // Convert PCM to WAV for Whisper
    const wavAudio = await pcmToWav(audioData, PCM_SAMPLE_RATE);
    console.log(`🔄 Converted to ${wavAudio.length} bytes WAV`);

    // STT: Audio → Text
    // Send stt_chunk events (we don't have streaming STT, so we'll send the final result)
    const userText = await speechToTextFromBuffer(wavAudio, "audio.wav");
    if (!userText?.trim()) {
      console.log("⚠️  No speech detected");
      session.isSpeaking = false; // Reset flag
      return;
    }

    console.log(`📝 User: ${userText}`);
    sendEvent(session.ws, {
      type: "stt_output",
      transcript: userText,
      ts: Date.now(),
    });

    // Pipeline: Process with agent (keep isSpeaking=true during LLM generation)
    const result = await processTurn(session.session, userText);

    // Send agent_chunk events (we don't have streaming, so send full response)
    if (result.agentResponse) {
      sendEvent(session.ws, {
        type: "agent_chunk",
        text: result.agentResponse,
        ts: Date.now(),
      });
    }

    // Check if TERMINATE first - end immediately without audio
    if (result.nextStage === CallStage.TERMINATE) {
      console.log("🔚 Session ending - closing connection");
      sendEvent(session.ws, { type: "session_end" });
      try {
        session.ws.close();
        console.log("📞 Session terminated");
      } catch (error) {
        console.error("Error closing session:", error);
      }
      finishSession(session);
      return; // Exit early
    }

    // TTS: Text → Audio → Send to client
    // sendAudio will handle timing and reset isSpeaking when done
    if (result.agentResponse) {
      await sendAudio(session, result.agentResponse);
    } else {
      session.isSpeaking = false;
    }
  } catch (error) {
    console.error("❌ Error processing audio:", error);
    session.isSpeaking = false; // Reset on error
  }
}

/**
 * Send agent's audio response to client
 */
async function sendAudio(session: ActiveSession, text: string) {
  try {
    // isSpeaking is already true from processUserSpeech
    session.audioBuffer = []; // Clear any buffered audio

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

  if (session.session.selectedSlot) {
    console.log(`📅 Booking: ${session.session.selectedSlot.displayText}`);
    const booking = await bookMeeting(session.session.selectedSlot, [session.session.lead.phone]);
    await sendCalendarInvite(session.session.lead.phone, session.session.selectedSlot, booking.meetingLink);
    console.log(`✅ Booked: ${booking.eventId}`);
  }
}

