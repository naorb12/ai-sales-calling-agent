import { AIMessage } from "@langchain/core/messages";
import { primaryAgent, secondaryAgent } from "../agent/agent.js";
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
    .map((turn) => `Agent: ${turn.agent}\nUser: ${turn.user}`)
    .join("\n\n");

  // Step 1: Classify user intent using LLM
  console.log(`\n📥 User: ${userInput}`);
  const intent = await classifyIntent(userInput, session.stage, historyText);

  // Step 1.5: Extract slot BEFORE transition if in BOOK_MEETING
  // This ensures we have the latest selection when making stage decisions
  if (session.stage === CallStage.BOOK_MEETING) {
    const lastAgentResponse = session.history.length > 0 
            ? session.history[session.history.length - 1]?.agent || ""
            : "";

    const selectedSlot = await extractSelectedSlot(lastAgentResponse, userInput, session.availableSlots);
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
  let selectedSlotText = "No meeting scheduled";
  if (session.selectedSlot) {
    selectedSlotText = session.selectedSlot.displayText;
  }

  // Step 6: Extract company config or use defaults
  const companyName = session.companyConfig?.companyName || "Our Company";
  const companyDescription = session.companyConfig?.description || "A technology company";

  // Step 7: Format prompt with variables
  const formattedMessages = await promptTemplate.formatMessages({
    leadName: session.lead.name,
    company: session.lead.company,
    industry: session.lead.industry || "Technology",
    history: historyText || "Start of conversation",
    userInput,
    availableSlots: availableSlotsText || "Not available", // For BOOK_MEETING stage
    selectedSlot: selectedSlotText, // For END stage
    companyName, // Dynamic company name
    companyDescription, // Dynamic company description
  });

  // Step 7: Get agent response
  console.log(`\n🤖 Generating agent response for stage: ${CallStage[session.stage]}...`);

  try {
    const result = await invokeAgentWithFallback(session, formattedMessages);

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

  // Extract company config or use defaults
  const companyName = session.companyConfig?.companyName || "Our Company";
  const companyDescription = session.companyConfig?.description || "A technology company";

  // Format with lead data - use empty string for userInput since this is the start
  const formattedMessages = await promptTemplate.formatMessages({
    leadName: session.lead.name,
    company: session.lead.company,
    industry: session.lead.industry || "Technology",
    history: "",
    userInput: "[Start of conversation - introduce yourself]",
    availableSlots: "Not available",
    selectedSlot: "No meeting scheduled",
    companyName, // Dynamic company name
    companyDescription, // Dynamic company description
  });

  try {
    const result = await invokeAgentWithFallback(session, formattedMessages);

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

/**
 * Invoke agent with automatic fallback on error
 */
async function invokeAgentWithFallback(
  session: CallSession,
  formattedMessages: Awaited<ReturnType<typeof STAGE_PROMPTS[CallStage.INTRO]['formatMessages']>>
) {
  const activeAgent = session.useFallbackAgent ? secondaryAgent : primaryAgent;

  return activeAgent.invoke(
    { messages: formattedMessages },
    { configurable: { thread_id: session.id } }
  ).catch((error) => {
    if (!session.useFallbackAgent) {
      console.log("🔄 Primary failed, using fallback model");
      session.useFallbackAgent = true;
      return secondaryAgent.invoke(
        { messages: formattedMessages },
        { configurable: { thread_id: session.id } }
      );
    }
    throw error;
  });
}