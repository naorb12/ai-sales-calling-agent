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
  confidence: z.number().min(0).max(1).describe("רמת הביטחון בסיווג (0-1)"),
  reasoning: z.string().describe("הסבר קצר למה סיווגת ככה"),
});

/**
 * Stage-specific context - just what was asked, let LLM figure out the intent
 */
function getStageContext(stage: CallStage): string {
  switch (stage) {
    case CallStage.INTRO:
      return "הסוכן שאל אם יש ללקוח דקה/זמן לשמוע על המוצר.";

    case CallStage.PITCH:
      return "הסוכן הציג את המוצר ושאל אם הלקוח מעוניין לקבוע פגישה.";

    case CallStage.BOOK_MEETING:
      return "הסוכן מנסה לקבוע זמן פגישה עם הלקוח.";

    case CallStage.END:
      return "השיחה הסתיימה, הסוכן אמר ביי. אם הלקוח מגיב בפרידה ('תודה', 'ביי', 'אוקיי') = NEGATIVE. רק חרטה מפורשת ('רגע!', 'חכה!') = REGRET.";

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
    `אתה מנתח שיחות מכירה. תפקידך: **להבין מה הלקוח באמת רוצה** לפי ההקשר.

${INTENT_DEFINITIONS}

**עקרון יסוד**: הבן את הכוונה האמיתית, לא את המילים. השתמש בהבנה סמנטית.`,
  ],
  [
    "human",
    `שלב: **{stage}**
הקשר: {stageContext}

שיחה עד כה:
{history}

---
הלקוח אמר עכשיו: "{userSpeech}"

מה הכוונה האמיתית של הלקוח?`,
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

