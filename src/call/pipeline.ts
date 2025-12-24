import { AIMessage } from "@langchain/core/messages";
import { agent } from "../agent/agent.js";
import { classifyIntent } from "./intent-classifier.js";
import { nextStage } from "./rules.js";
import { STAGE_PROMPTS } from "../agent/prompts.js";
import { extractSelectedSlot } from "./slot-extractor.js";
import type { CallSession, ConversationTurn, TimeSlot } from "../types.js";
import { CallStage } from "./stages.js";
import { Intent } from "./intents.js";

/**
 * Result of a single conversation turn
 */
export interface TurnResult {
  agentResponse: string;
  intent: Intent;
  nextStage: CallStage;
  stageChanged: boolean;
}

/**
 * Process a single turn in the conversation
 * This is the main orchestrator connecting: user input → intent classification → state machine → agent response
 */
export async function processTurn(session: CallSession, userInput: string): Promise<TurnResult> {
  // Build conversation history string
  const historyText = session.history
    .map((turn) => `סוכן: ${turn.agent}\nלקוח: ${turn.user}`)
    .join("\n\n");

  // Step 1: Classify user intent using LLM
  console.log(`\n📥 User: ${userInput}`);
  const intentTime1 = Date.now();
  const intent = await classifyIntent(userInput, session.stage, historyText);
  const intentTime2 = Date.now();
  console.log(`⏱️  Intent classification took: ${intentTime2 - intentTime1}ms`);

  // Step 1.5: Extract slot BEFORE transition if in BOOK_MEETING
  // This ensures we have the latest selection when making stage decisions
  let slotTime1: number | null = null;
  let slotTime2: number | null = null;
  if (session.stage === CallStage.BOOK_MEETING) {
    slotTime1 = Date.now();
    const selectedSlot = await extractSelectedSlot("", userInput, session.availableSlots);
    slotTime2 = Date.now();
    console.log(`⏱️  Slot extraction took: ${slotTime2 - slotTime1}ms`);
    if (selectedSlot) {
      session.selectedSlot = selectedSlot;
      console.log(`\n✅ Selected slot: ${selectedSlot.displayText}`);
    }
  }

  // Step 2: Determine next stage using YOUR state machine
  const currentStage = session.stage;
  const hasSelectedSlot = !!session.selectedSlot;
  const newStage = nextStage(
    session.stage,
    intent,
    session.repeatCount,
    session.previousStage,
    hasSelectedSlot
  );

  // Update repeat count and track previous stage
  if (newStage === currentStage) {
    session.repeatCount++;
  } else {
    // Store the current stage as previous before transitioning
    session.previousStage = session.stage;
    session.repeatCount = 0;
    session.stage = newStage;
  }

  const stageChanged = newStage !== currentStage;

  console.log(`\n🔄 Stage Transition:`);
  console.log(`   From: ${CallStage[currentStage]} → To: ${CallStage[newStage]}`);
  console.log(`   Intent: ${Intent[intent]}`);
  console.log(`   Repeat Count: ${session.repeatCount}`);


  if (newStage === CallStage.TERMINATE) {
    console.log(`\n🔚 Call ending - no agent response needed`);
    return {
      agentResponse: "", // Empty response
      intent,
      nextStage: newStage,
      stageChanged,
    };
  }
  
  // Step 3: Get stage-specific prompt template
  const promptTemplate = STAGE_PROMPTS[session.stage];

  // Step 4: Build available slots text for BOOK_MEETING stage
  let availableSlotsText = "";
  if (session.stage === CallStage.BOOK_MEETING && session.availableSlots) {
    availableSlotsText = session.availableSlots
      .map((slot, i) => `${i + 1}. ${slot.displayText}`)
      .join("\n");
  }

  // Step 5: Build selected slot text for END stage
  let selectedSlotText = "לא נקבעה פגישה";
  if (session.selectedSlot) {
    selectedSlotText = session.selectedSlot.displayText;
  }

  // Step 6: Format prompt with variables
  const formattedMessages = await promptTemplate.formatMessages({
    leadName: session.lead.name,
    company: session.lead.company,
    industry: session.lead.industry || "טכנולוגיה",
    history: historyText || "תחילת שיחה",
    userInput,
    availableSlots: availableSlotsText || "לא זמין", // For BOOK_MEETING stage
    selectedSlot: selectedSlotText, // For END stage
  });

  // Step 7: Get agent response
  console.log(`\n🤖 Generating agent response for stage: ${CallStage[session.stage]}...`);
  const agentTime1 = Date.now();

  try {
    const result = await agent.invoke(
      {
        messages: formattedMessages,
      },
      {
        configurable: { thread_id: session.id },
      }
    );
    const agentTime2 = Date.now();
    console.log(`⏱️  Agent response generation took: ${agentTime2 - agentTime1}ms`);

    // Extract response text from the agent result
    let agentResponse = "";
    const messages = result.messages;
    const lastMessage = messages[messages.length - 1];

    if (AIMessage.isInstance(lastMessage)) {
      agentResponse = lastMessage.content as string;

      // Log tool calls if any
      if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        console.log(`\n🔧 Tool Calls:`);
        lastMessage.tool_calls.forEach((toolCall) => {
          console.log(`   - ${toolCall.name}:`, toolCall.args);
        });
      }
    }

    console.log(`\n💬 Agent: ${agentResponse}`);

    // Step 8: Update conversation history
    const turn: ConversationTurn = {
      agent: agentResponse,
      user: userInput,
      intent,
      timestamp: Date.now(),
    };
    session.history.push(turn);

    // Log pipeline timing summary
    const totalPipelineTime = agentTime2 - intentTime1;
    const intentTime = intentTime2 - intentTime1;
    const slotTime = slotTime1 !== null && slotTime2 !== null ? (slotTime2 - slotTime1) : 0;
    const agentTime = agentTime2 - agentTime1;
    console.log(`\n⏱️  Pipeline Timing Summary:`);
    console.log(`   ├─ Intent Classification: ${intentTime}ms`);
    if (slotTime > 0) {
      console.log(`   ├─ Slot Extraction: ${slotTime}ms`);
    }
    console.log(`   ├─ Agent Response: ${agentTime}ms`);
    console.log(`   └─ Total Pipeline: ${totalPipelineTime}ms`);

    return {
      agentResponse,
      intent,
      nextStage: newStage,
      stageChanged,
    };
  } catch (error) {
    console.error("Error generating agent response:", error);
    throw error;
  }
}

/**
 * Start a new conversation by having the agent introduce itself
 */
export async function startConversation(session: CallSession): Promise<string> {
  console.log(`\n🎬 Starting conversation with ${session.lead.name} from ${session.lead.company}`);
  console.log(`📍 Initial stage: ${CallStage[session.stage]}`);

  // Get INTRO prompt template
  const promptTemplate = STAGE_PROMPTS[CallStage.INTRO];

  // Format with lead data - use empty string for userInput since this is the start
  const formattedMessages = await promptTemplate.formatMessages({
    leadName: session.lead.name,
    company: session.lead.company,
    industry: session.lead.industry || "טכנולוגיה",
    history: "",
    userInput: "[התחלת שיחה - הצג את עצמך]",
    availableSlots: "לא זמין",
    selectedSlot: "לא נקבעה פגישה",
  });

  try {
    const introTime1 = Date.now();
    const result = await agent.invoke(
      {
        messages: formattedMessages,
      },
      {
        configurable: { thread_id: session.id },
      }
    );
    const introTime2 = Date.now();
    console.log(`⏱️  Intro generation took: ${introTime2 - introTime1}ms`);

    const messages = result.messages;
    const lastMessage = messages[messages.length - 1];

    let agentResponse = "";
    if (AIMessage.isInstance(lastMessage)) {
      agentResponse = lastMessage.content as string;
    }

    console.log(`\n💬 Agent: ${agentResponse}`);

    // Add intro to history
    session.history.push({
      agent: agentResponse,
      user: "[Call connected]",
      timestamp: Date.now(),
    });

    return agentResponse;
  } catch (error) {
    console.error("Error starting conversation:", error);
    throw error;
  }
}

