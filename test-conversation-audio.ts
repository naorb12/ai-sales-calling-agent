import * as readline from "readline";
import type { CallSession } from "./src/types.js";
import { CallStage } from "./src/call/stages.js";
import { processTurn, startConversation } from "./src/call/pipeline.js";
import { getAvailableSlots, bookMeeting, sendCalendarInvite } from "./src/services/calendar-service.js";
import { textToSpeech } from "./src/voice/openai-tts.js";
import * as fs from "fs";
import * as path from "path";

// Create output directory for audio files
const OUTPUT_DIR = "./output/audio";
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function conversationLoop() {
  // Pre-fetch available calendar slots
  const availableSlots = await getAvailableSlots();

  // Create a test session
  const session: CallSession = {
    id: `test-${Date.now()}`,
    lead: {
      name: "דני",
      phone: "+972501234567",
      company: "TechCorp",
      industry: "טכנולוגיה",
    },
    stage: CallStage.INTRO,
    history: [],
    repeatCount: 0,
    availableSlots,
    startTime: Date.now(),
  };

  let turnCount = 0;

  console.log("\n🎬 Starting conversation with audio generation");
  console.log(`📍 Initial stage: ${CallStage[session.stage]}`);
  console.log(`🔊 Audio files will be saved to: ${OUTPUT_DIR}\n`);

  // Agent starts the conversation
  const initialGreeting = await startConversation(session);
  console.log(`💬 Agent: ${initialGreeting}\n`);

  // Generate audio for initial greeting
  try {
    const audioBuffer = await textToSpeech(initialGreeting);
    const audioPath = path.join(OUTPUT_DIR, `turn-${turnCount}.mp3`);
    fs.writeFileSync(audioPath, audioBuffer);
    console.log(`🔊 Audio saved: ${audioPath}\n`);
  } catch (error) {
    console.error("❌ TTS Error:", error);
  }

  // Conversation loop
  while (session.stage !== CallStage.TERMINATE) {
    turnCount++;

    const userInput = await askQuestion("👤 You: ");

    if (!userInput || userInput.trim() === "") {
      continue;
    }

    // Exit commands
    if (userInput.toLowerCase() === "exit" || userInput.toLowerCase() === "quit") {
      console.log("\n👋 Ending conversation...\n");
      break;
    }

    // Process user input with the agent
    const result = await processTurn(session, userInput);
    const agentResponse = result.agentResponse;

    console.log(`\n💬 Agent: ${agentResponse}\n`);

    // Generate audio for agent response
    try {
      const audioBuffer = await textToSpeech(agentResponse);
      const audioPath = path.join(OUTPUT_DIR, `turn-${turnCount}.mp3`);
      fs.writeFileSync(audioPath, audioBuffer);
      console.log(`🔊 Audio saved: ${audioPath}\n`);
    } catch (error) {
      console.error("❌ TTS Error:", error);
    }
  }

  // Post-call processing
  console.log("═══════════════════════════════════════════════");
  console.log("📊 Conversation Summary");
  console.log("═══════════════════════════════════════════════");
  console.log(`Duration: ${turnCount} turns`);
  console.log(`Final Stage: ${CallStage[session.stage]}`);
  console.log(`Total Audio Files: ${turnCount + 1}`);

  // Book meeting if a slot was selected
  if (session.selectedSlot) {
    console.log(`\n📅 Selected Time: ${session.selectedSlot.displayText}`);
    console.log("⏳ Booking meeting asynchronously...\n");

    try {
      // Book the meeting
      const bookingResult = await bookMeeting(
        session.selectedSlot,
        [session.lead.phone]
      );

      // Send calendar invite
      await sendCalendarInvite(
        session.lead.phone,
        session.selectedSlot,
        bookingResult.meetingLink
      );

      console.log("✅ Meeting Booked Successfully!");
      console.log(`   Event ID: ${bookingResult.eventId}`);
      console.log(`   Meeting Link: ${bookingResult.meetingLink}`);
    } catch (error) {
      console.error("❌ Error booking meeting:", error);
    }
  } else {
    console.log("\n📅 No meeting scheduled");
  }

  console.log("═══════════════════════════════════════════════\n");

  rl.close();
}

conversationLoop();

