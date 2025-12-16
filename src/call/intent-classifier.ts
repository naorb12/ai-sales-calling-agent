import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { model } from "../agent/agent.js";
import { Intent } from "./intents.js";
import { CallStage } from "./stages.js";
import { INTENT_DEFINITIONS } from "../agent/prompts.js";

/**
 * Schema for structured intent classification output (5 simplified intents)
 */
const IntentSchema = z.object({
  intent: z.enum(["POSITIVE", "OBJECTION", "ASK_MORE_INFO", "NEGATIVE", "UNCLEAR"]),
  confidence: z.number().min(0).max(1).describe("רמת הביטחון בסיווג (0-1)"),
  reasoning: z.string().describe("הסבר קצר למה סיווגת ככה"),
});

/**
 * Prompt template for intent classification
 */
const classifierPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `אתה מנתח שיחות מכירה מקצועי. תפקידך לסווג את הכוונה האמיתית של הלקוח.

${INTENT_DEFINITIONS}

חשוב: נתח את הכוונה האמיתית, לא רק את המילים. קח בחשבון הקשר, טון, והיסטוריה.`,
  ],
  ["human", "שלב בשיחה: {stage}"],
  ["human", "הלקוח אמר: {userSpeech}"],
  ["human", "היסטוריית השיחה עד כה:\n{history}"],
  ["human", "מהי הכוונה האמיתית של הלקוח?"],
]);

/**
 * Chain for intent classification with structured output
 */
const classifierChain = classifierPrompt.pipe(model.withStructuredOutput(IntentSchema));

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
      userSpeech,
      history: history || "תחילת שיחה",
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

