import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { Intent } from "./intents.js";
import { CallStage } from "./stages.js";
import { INTENT_DEFINITIONS } from "../agent/prompts.js";
import { config } from "../config.js";

/**
 * Dedicated model for intent classification with temperature 0 for consistency
 */
const classifierModel = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0, // Deterministic for reliable classification
  apiKey: config.openai.apiKey,
});

/**
 * Schema for structured intent classification output (6 intents)
 */
const IntentSchema = z.object({
  intent: z.enum(["POSITIVE", "OBJECTION", "ASK_MORE_INFO", "NEGATIVE", "UNCLEAR", "REGRET"]),
  confidence: z.number().min(0).max(1).describe("Confidence level in classification (0-1)"),
  reasoning: z.string().describe("Brief explanation of why you classified it this way"),
});

/**
 * Stage-specific context - just what was asked, let LLM figure out the intent
 */
function getStageContext(stage: CallStage): string {
  switch (stage) {
    case CallStage.INTRO:
      return "The agent asked if the customer has a minute/time to hear about the product.";

    case CallStage.PITCH:
      return "The agent presented the product and asked if the customer is interested in scheduling a meeting.";

    case CallStage.BOOK_MEETING:
      return "The agent is trying to schedule a meeting time with the customer.";

    case CallStage.END:
      return "The conversation has ended, the agent said goodbye. If the customer responds with a farewell ('thanks', 'bye', 'okay') = NEGATIVE. Only explicit regret ('wait!', 'hold on!') = REGRET.";

    default:
      return "";
  }
}

/**
 * Simplified prompt - trust the LLM's semantic understanding
 */
const classifierPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You analyze sales conversations. Your role: **Understand what the customer really wants** based on context.

${INTENT_DEFINITIONS}

**Fundamental principle**: Understand the true intent, not the words. Use semantic understanding.`,
  ],
  [
    "human",
    `Stage: **{stage}**
Context: {stageContext}

Conversation so far:
{history}

---
The customer said now: "{userSpeech}"

What is the customer's true intent?`,
  ],
]);

/**
 * Chain for intent classification with structured output
 */
const classifierChain = classifierPrompt.pipe(classifierModel.withStructuredOutput(IntentSchema));

/**
 * Classify user intent based on their speech, current stage, and conversation history
 */
export async function classifyIntent(
  userSpeech: string,
  stage: CallStage,
  history: string
): Promise<Intent> {
  try {
    const result = await classifierChain.invoke({
      stage: CallStage[stage],
      stageContext: getStageContext(stage),
      userSpeech,
      history: history || "Start of conversation",
    });

    console.log(`\n🧠 Intent Classification:`);
    console.log(`   Intent: ${result.intent}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`   Reasoning: ${result.reasoning}`);

    // Convert string to Intent enum
    return Intent[result.intent as keyof typeof Intent];
  } catch (error) {
    console.error("Error classifying intent:", error);
    return Intent.UNCLEAR;
  }
}

