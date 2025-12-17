import type { WebSocket } from "ws";
import type { CallSession, Lead } from "../types.js";
import { CallStage } from "../call/stages.js";
import { startConversation, processTurn } from "../call/pipeline.js"; // ← Uses your pipeline!
import { speechToTextFromBuffer } from "../voice/openai-stt.js";
import { textToSpeech } from "../voice/openai-tts.js";
import { getAvailableSlots, bookMeeting, sendCalendarInvite } from "../services/calendar-service.js";
import { mulawToWav, mp3ToMulaw } from "../voice/audio-converter.js";

interface ActiveCall {
  session: CallSession;
  audioBuffer: Buffer[];
  streamSid: string | undefined;
  ws: WebSocket; // WebSocket for sending audio
  isSpeaking: boolean; // Flag to prevent echo (agent speaking)
}

/**
 * Main entry: Handle Twilio WebSocket connection for a call
 */
export async function handleCallConnection(ws: WebSocket, lead: Lead) {
  console.log(`🔌 Call connected: ${lead.name}`);

  // Setup session
  const session: CallSession = {
    id: `call-${Date.now()}`,
    lead,
    stage: CallStage.INTRO,
    history: [],
    repeatCount: 0,
    availableSlots: await getAvailableSlots(),
    startTime: Date.now(),
  };

  const call: ActiveCall = { session, audioBuffer: [], streamSid: undefined, ws, isSpeaking: false };

  // Handle Twilio messages
  ws.on("message", async (data: Buffer) => {
    const msg = JSON.parse(data.toString());

    if (msg.event === "start") {
      call.streamSid = msg.start.streamSid;
      await sendInitialGreeting(ws, call);
    } else if (msg.event === "media") {
      await collectAudio(call, msg.media.payload);
    } else if (msg.event === "stop") {
      await finishCall(call);
    }
  });

  ws.on("close", () => finishCall(call));
}

/**
 * Send agent's initial greeting
 */
async function sendInitialGreeting(ws: WebSocket, call: ActiveCall) {
  call.isSpeaking = true; // Prevent audio collection during greeting
  const greeting = await startConversation(call.session); // ← Pipeline
  console.log(`💬 Agent: ${greeting}`);
  await sendAudio(call, greeting);
  // sendAudio will reset isSpeaking after audio finishes
}

/**
 * Collect audio chunks until we have enough, then process
 */
async function collectAudio(call: ActiveCall, base64Audio: string) {
  // Don't collect audio while agent is speaking (prevent echo)
  if (call.isSpeaking) {
    return;
  }

  call.audioBuffer.push(Buffer.from(base64Audio, "base64"));

  // Wait for ~3 seconds of audio
  const totalBytes = call.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
  if (totalBytes > 24000) {
    await processUserSpeech(call);
  }
}

/**
 * Core loop: STT → Pipeline → TTS
 */
async function processUserSpeech(call: ActiveCall) {
  // Don't process if already terminated or currently processing
  if (call.session.stage === CallStage.TERMINATE || call.isSpeaking) {
    return;
  }

  // Mark as processing to prevent overlapping turns
  call.isSpeaking = true;
  
  const audioData = Buffer.concat(call.audioBuffer);
  call.audioBuffer = [];

  try {
    console.log(`🎤 Processing ${audioData.length} bytes of μ-law audio...`);

    // Convert μ-law to WAV for Whisper
    const wavAudio = await mulawToWav(audioData);
    console.log(`🔄 Converted to ${wavAudio.length} bytes WAV`);

    // STT: Audio → Text
    const userText = await speechToTextFromBuffer(wavAudio, "audio.wav");
    if (!userText?.trim()) {
      console.log("⚠️  No speech detected");
      call.isSpeaking = false; // Reset flag
      return;
    }

    console.log(`📝 User: ${userText}`);

    // Pipeline: Process with agent (keep isSpeaking=true during LLM generation)
    const result = await processTurn(call.session, userText);
    console.log(`💬 Agent: ${result.agentResponse}`);
    
    // Check if TERMINATE first - end immediately without audio
    if (result.nextStage === CallStage.TERMINATE) {
      console.log("🔚 Call ending - closing connection");
      try {
        call.ws.close();
        console.log("📞 Call terminated");
      } catch (error) {
        console.error("Error closing call:", error);
      }
      return; // Exit early
    }

    // TTS: Text → Audio → Send to Twilio
    // sendAudio will handle timing and reset isSpeaking when done
    await sendAudio(call, result.agentResponse);
  } catch (error) {
    console.error("❌ Error processing audio:", error);
    call.isSpeaking = false; // Reset on error
  }
}

/**
 * Send agent's audio response to Twilio
 */
async function sendAudio(call: ActiveCall, text: string) {
  try {
    // isSpeaking is already true from processUserSpeech
    call.audioBuffer = []; // Clear any buffered audio

    // Generate MP3 audio
    const mp3Audio = await textToSpeech(text);
    console.log(`🔊 Generated ${mp3Audio.length} bytes (MP3)`);

    // Convert MP3 to μ-law for Twilio
    const mulawAudio = await mp3ToMulaw(mp3Audio);
    console.log(`🔄 Converted to ${mulawAudio.length} bytes μ-law`);

    // Send to Twilio in chunks (160 bytes = 20ms at 8kHz)
    const chunkSize = 160;
    for (let i = 0; i < mulawAudio.length; i += chunkSize) {
      const chunk = mulawAudio.slice(i, i + chunkSize);
      const payload = chunk.toString("base64");

      call.ws.send(
        JSON.stringify({
          event: "media",
          streamSid: call.streamSid,
          media: {
            payload,
          },
        })
      );
    }

    console.log(`✅ Sent audio to caller (${Math.ceil(mulawAudio.length / chunkSize)} chunks)`);

    // Wait for audio to finish playing, then allow listening again
    const durationMs = (mulawAudio.length / 8000) * 1000; // 8kHz sample rate
    setTimeout(() => {
      call.isSpeaking = false;
      console.log("🎧 Listening for user response...");
    }, durationMs + 500); // Add 500ms buffer

  } catch (error) {
    console.error("❌ Error sending audio:", error);
    call.isSpeaking = false; // Reset on error
  }
}

/**
 * Finish call and book meeting if needed
 */
async function finishCall(call: ActiveCall) {
  console.log("\n📊 Call Summary");
  console.log(`Duration: ${Math.round((Date.now() - call.session.startTime) / 1000)}s`);
  console.log(`Stage: ${CallStage[call.session.stage]}`);

  if (call.session.selectedSlot) {
    console.log(`📅 Booking: ${call.session.selectedSlot.displayText}`);
    const booking = await bookMeeting(call.session.selectedSlot, [call.session.lead.phone]);
    await sendCalendarInvite(call.session.lead.phone, call.session.selectedSlot, booking.meetingLink);
    console.log(`✅ Booked: ${booking.eventId}`);
  }
}

