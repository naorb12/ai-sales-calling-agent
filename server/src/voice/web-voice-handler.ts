import type { WebSocket } from "ws";
import type { CallSession, Lead, CompanyConfig } from "../types.js";
import { CallStage } from "../call/stages.js";
import { startConversation, processTurn } from "../call/pipeline.js";
import { CartesiaTTS } from "./tts/cartesia-tts.js";
import { getAvailableSlots, bookMeeting, sendCalendarInvite } from "../services/calendar-service.js";
import {
  createStreamingSession,
  streamAudio,
  closeStreamingSession,
  type StreamingSession,
} from "./stt/assemblyai-stt.js";

interface ActiveSession {
  session: CallSession;
  ws: WebSocket;
  isSpeaking: boolean; // Flag to prevent echo (agent speaking)
  transcriptionSession: StreamingSession | null;
  configReceived: boolean; // Flag to track if config was received
  totalCharacters: number; // Track total characters for Cartesia credit estimation
}

const PCM_SAMPLE_RATE = 16000;

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

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

  // Default lead (will be replaced by provided lead from config)
  let lead: Lead = {
    name: "Test Lead",
    phone: "+972501234567",
    email: "test@test.com",
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
    availableSlots: [],
    startTime: Date.now(),
  };
  console.log("🔍 Checking calendar slots...");
   // Fetch calendar slots in background (non-blocking)
   getAvailableSlots().then((slots) => {
    session.availableSlots = slots;
    console.log(`✅ Calendar slots loaded: ${slots.length} available`);
  }).catch((error) => {
    console.error("⚠️ Failed to fetch calendar slots:", error);
    // Continue with empty slots - agent can still work
  });

  const activeSession: ActiveSession = {
    session,
    ws,
    isSpeaking: true, // Start with true to prevent audio collection during greeting
    transcriptionSession: null,
    configReceived: false, // Wait for config before starting
    totalCharacters: 0, // Initialize character counter
  };


   ws.on("message", async (data: Buffer) => {
     if (data[0] === 0x7b) {
       try {
         const msg = JSON.parse(data.toString());
         
         // Handle config message
         if (msg.type === "config") {
           const config: CompanyConfig = {
             companyName: msg.companyName || "Test Company",
             description: msg.description || "A technology company",
           };
           activeSession.session.companyConfig = config;
           
           // Update lead if provided in config
           if (msg.lead) {
             const leadEmail = msg.lead.email;
             
             // Validate email early - before conversation starts
             if (leadEmail && !isValidEmail(leadEmail)) {
               console.warn(`⚠️ Invalid email format for lead ${msg.lead.name || "Test Lead"}: ${leadEmail}. Meeting booking will proceed without attendee invitation.`);
             } else if (!leadEmail) {
               console.warn(`⚠️ No email provided for lead ${msg.lead.name || "Test Lead"}. Meeting booking will proceed without attendee invitation.`);
             }
             
             activeSession.session.lead = {
               name: msg.lead.name.trim().split(/\s+/)[0] || "Test Lead",
               phone: msg.lead.phone || "+972501234567",
               email: leadEmail,
               company: msg.lead.company || "Test Company",
               industry: msg.lead.industry,
             };
             console.log(`👤 Lead received: ${activeSession.session.lead.name} from ${activeSession.session.lead.company}`);
           }
           
           activeSession.configReceived = true;
           console.log(`⚙️  Config received: ${config.companyName}`);
           
           // Start conversation after config is received
           if (!activeSession.session.history.length) {
             console.log("💬 Sending initial greeting...");
             await sendInitialGreeting(activeSession);
           }
           return;
         }
         
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
     // Only process audio if config has been received
     if (activeSession.configReceived && !activeSession.isSpeaking && activeSession.transcriptionSession) {
       streamAudio(activeSession.transcriptionSession, data);
     }
   });

   // Don't send initial greeting yet - wait for config message
   console.log("⏳ Waiting for config message...");
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

 

  ws.on("error", (error) => {
    console.error("❌ WebSocket error:", error);
    finishSession(activeSession);
  });

  // Only one close handler at the end
  ws.on("close", () => {
    console.log("🔌 Web voice session closed");
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
  if (greeting){
    sendEvent(session.ws, {
      type: "agent_chunk",
      text: greeting,
      ts: Date.now(),
    });
  }
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
  // Track characters for Cartesia credit estimation
  const charCount = text.length;
  session.totalCharacters += charCount;
  
  console.log(`🔌 Connecting to Cartesia TTS...`);
  
  return new Promise<void>((resolve, reject) => {
    let chunkCount = 0;

    // Create TTS with callbacks for chunks and completion
    const tts = new CartesiaTTS(
      // onChunk - called for each audio chunk
      (chunk) => {
        sendEvent(session.ws, {
          type: "tts_chunk",
          audio: chunk.audio,
          format: "pcm",
          sampleRate: 24000,
          ts: chunk.ts,
        });
        chunkCount++;
      },
      // onDone - called when generation is complete
      () => {
        tts.close();
        console.log(`✅ Sent ${chunkCount} audio chunks (${charCount} chars)`);
        resolve();
      }
    );

    // Connect and send text
    tts.connect()
      .then(() => {
        console.log(`✅ Cartesia connected, sending ${charCount} characters...`);
        tts.sendText(text);
      })
      .catch((error) => {
        console.error("❌ Cartesia error:", error);
        session.isSpeaking = false;
        reject(error);
      });
  });
}

/**
 * Finish session and book meeting if needed
 */
async function finishSession(session: ActiveSession) {
  console.log("\n📊 Session Summary");
  console.log(`Duration: ${Math.round((Date.now() - session.session.startTime) / 1000)}s`);
  console.log(`Stage: ${CallStage[session.session.stage]}`);
  
  // Log Cartesia credits used
  const estimatedCost = session.totalCharacters * 0.000006;
  console.log(`💰 Cartesia: ${session.totalCharacters} chars (~$${estimatedCost.toFixed(6)})`);

  if (session.transcriptionSession) {
    await closeStreamingSession(session.transcriptionSession);
  }
  
   if (session.session.selectedSlot) {
    console.log(`📅 Booking: ${session.session.selectedSlot.displayText}`);
    
    // Email was already validated when lead was received - use it if valid
    const attendeeEmails: string[] = [];
    if (session.session.lead.email && isValidEmail(session.session.lead.email)) {
      attendeeEmails.push(session.session.lead.email);
    }
    
    const booking = await bookMeeting(
      session.session.selectedSlot,
      attendeeEmails,
      session.session.companyConfig // Pass company config for dynamic meeting title
    );
    if (attendeeEmails.length > 0) {
      console.log(`✅ Booked: ${booking.eventId}`);
      console.log(`   📧 Google Calendar automatically sent invitation to: ${attendeeEmails.join(", ")}`);
    } else {
      console.log(`✅ Booked: ${booking.eventId}`);
      console.log(`   ⚠️ Meeting booked but no invitations sent (no valid email provided)`);
    }
  }
}

