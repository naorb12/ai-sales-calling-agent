import * as readline from "readline";
import { v4 as uuidv4 } from "uuid";
import { validateConfig } from "./src/config.js";
import { CallSession, Lead } from "./src/types.js";
import { CallStage } from "./src/call/stages.js";
import { startConversation, processTurn } from "./src/call/pipeline.js";
import { getAvailableSlots, bookMeeting, sendCalendarInvite } from "./src/services/calendar-service.js";

/**
 * Interactive text-based conversation tester
 * This allows testing the full conversation flow without audio or telephony
 */

// Validate configuration
validateConfig("text");

// Create a test lead
const testLead: Lead = {
  name: "דני",
  phone: "+972501234567",
  company: "TechCorp",
  industry: "טכנולוגיה",
  notes: "חברת סטארטאפ, מעוניינים באוטומציה",
};

// Pre-fetch available slots (before call starts)
console.log("\n🔍 Pre-fetching available calendar slots...");
const availableSlots = await getAvailableSlots(7, 7);
console.log(`✅ Found ${availableSlots.length} available slots\n`);

// Create call session with pre-fetched slots
const session: CallSession = {
  id: uuidv4(),
  lead: testLead,
  stage: CallStage.INTRO,
  repeatCount: 0,
  history: [],
  availableSlots,
  startTime: Date.now(),
};

// Setup readline interface for console input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("═══════════════════════════════════════════════");
console.log("🎯 AI Sales Agent - Text Conversation Tester");
console.log("═══════════════════════════════════════════════");
console.log("\nLead Information:");
console.log(`  Name: ${testLead.name}`);
console.log(`  Company: ${testLead.company}`);
console.log(`  Industry: ${testLead.industry}`);
console.log("\nInstructions:");
console.log("  - Type the lead's responses in Hebrew");
console.log("  - Type 'exit' to end the conversation");
console.log("  - Type 'history' to see full conversation");
console.log("  - Type 'stage' to see current stage");
console.log("═══════════════════════════════════════════════\n");

/**
 * Main conversation loop
 */
async function conversationLoop() {
  try {
    // Agent starts the conversation with intro
    await startConversation(session);

    // Continue conversation loop
    while (session.stage !== CallStage.TERMINATE) {
      const userInput = await new Promise<string>((resolve) => {
        rl.question("\n👤 You: ", (answer) => {
          resolve(answer.trim());
        });
      });

      // Handle commands
      if (userInput.toLowerCase() === "exit") {
        console.log("\n👋 Ending conversation...");
        session.stage = CallStage.TERMINATE;
        break;
      }

      if (userInput.toLowerCase() === "history") {
        console.log("\n📜 Conversation History:");
        session.history.forEach((turn, i) => {
          console.log(`\n--- Turn ${i + 1} ---`);
          console.log(`Agent: ${turn.agent}`);
          console.log(`User: ${turn.user}`);
          if (turn.intent !== undefined) {
            console.log(`Intent: ${turn.intent}`);
          }
        });
        continue;
      }

      if (userInput.toLowerCase() === "stage") {
        console.log(`\n📍 Current Stage: ${CallStage[session.stage]}`);
        console.log(`🔄 Repeat Count: ${session.repeatCount}`);
        continue;
      }

      if (!userInput) {
        console.log("⚠️  Please enter a response");
        continue;
      }

      // Process the turn
      const result = await processTurn(session, userInput);

      // Check if we should terminate
      if (result.nextStage === CallStage.TERMINATE) {
        console.log("\n🏁 Call ended");
        session.stage = CallStage.TERMINATE;
        break;
      }

      if (result.nextStage === CallStage.END) {
        console.log("\n👋 Conversation ending...");
      }
    }
  } catch (error) {
    console.error("\n❌ Error in conversation:", error);
  } finally {
    // Print summary
    console.log("\n═══════════════════════════════════════════════");
    console.log("📊 Conversation Summary");
    console.log("═══════════════════════════════════════════════");
    console.log(`Duration: ${Math.round((Date.now() - session.startTime) / 1000)}s`);
    console.log(`Final Stage: ${CallStage[session.stage]}`);
    console.log(`Total Turns: ${session.history.length}`);
    
    // Book meeting if a slot was selected
    if (session.selectedSlot) {
      console.log(`\n📅 Selected Time: ${session.selectedSlot.displayText}`);
      console.log(`⏳ Booking meeting asynchronously...`);
      
      try {
        const booking = await bookMeeting(session.selectedSlot, [testLead.phone]);
        session.meetingBooked = {
          date: session.selectedSlot.date,
          time: session.selectedSlot.time,
          duration: 30,
          attendees: [testLead.phone],
          calendarEventId: booking.eventId,
        };
        
        await sendCalendarInvite(testLead.phone, session.selectedSlot, booking.meetingLink);
        
        console.log(`✅ Meeting Booked Successfully!`);
        console.log(`   Event ID: ${booking.eventId}`);
        console.log(`   Meeting Link: ${booking.meetingLink}`);
      } catch (error) {
        console.error(`❌ Failed to book meeting:`, error);
      }
    } else {
      console.log(`ℹ️  No meeting time selected`);
    }
    
    console.log("═══════════════════════════════════════════════\n");

    rl.close();
    process.exit(0);
  }
}

// Start the conversation
conversationLoop();

