import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import type { TimeSlot } from "../types.js";
import { config } from "../config.js";

/**
 * Schema for slot selection response
 */
const SlotSelectionSchema = z.object({
  selectedIndex: z.number().min(-1).describe("אינדקס של הזמן שנבחר (0-based), או -1 אם לא נבחר"),
  confidence: z.number().min(0).max(1).describe("רמת ביטחון בבחירה"),
  reasoning: z.string().describe("הסבר קצר למה זה הזמן שנבחר"),
});

/**
 * Model for slot extraction - temperature 0 for deterministic extraction
 */
const slotModel = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
  apiKey: config.openai.apiKey,
});

/**
 * Prompt for slot extraction
 */
const slotPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `אתה עוזר לזהות איזה זמן פגישה הלקוח בחר מתוך רשימת אפשרויות.

תפקיד: לקרוא את תשובת הלקוח ולהבין איזה זמן הוא בחר.

כללים:
- אם הלקוח בחר זמן ספציפי → החזר את האינדקס שלו (0-based)
- אם הלקוח לא בחר זמן ספציפי → החזר -1

דוגמאות לבחירה ספציפית:
- "בעשר" → זמן עם 10:00
- "מחר ב-10" → זמן עם 10:00 מחר
- "האופציה הראשונה" → אינדקס 0
- "השני" → אינדקס 1
- "14:00" → זמן עם 14:00
- "יום שלישי" → היום שלישי (אם יש רק אחד)

דוגמאות ללא בחירה ספציפית:
- "מתי נוח לכם?" → -1 (שואל, לא בוחר)
- "אין לי העדפה" → -1 (לא בחר)
- "לא משנה" → -1 (לא בחר)
- "בוקר" → -1 (לא ספציפי מספיק)

חשוב: בחר רק אם הלקוח ציין זמן **ספציפי**!`,
  ],
  [
    "human",
    `זמנים זמינים:
{availableSlots}

תשובת הלקוח: "{userInput}"

איזה זמן הלקוח בחר? (החזר אינדקס, או -1 אם לא בחר זמן ספציפי)`,
  ],
]);

/**
 * Extract selected slot using LLM semantic understanding
 */
export async function extractSelectedSlot(
  agentResponse: string,
  userInput: string,
  availableSlots: TimeSlot[]
): Promise<TimeSlot | null> {
  if (!availableSlots || availableSlots.length === 0) {
    return null;
  }

  // Don't try to extract if user didn't say anything meaningful
  if (!userInput || userInput.trim().length === 0) {
    return null;
  }

  try {
    // Format available slots for the LLM
    const slotsText = availableSlots
      .map((slot, i) => `${i}. ${slot.displayText}`)
      .join("\n");

    const chain = slotPrompt.pipe(slotModel.withStructuredOutput(SlotSelectionSchema));

    const result = await chain.invoke({
      availableSlots: slotsText,
      userInput,
    });

    // Log extraction result
    console.log(`\n🕐 Slot Extraction:`);
    console.log(`   Selected Index: ${result.selectedIndex}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log(`   Reasoning: ${result.reasoning}`);

    // If LLM found a selection
    if (result.selectedIndex >= 0 && result.selectedIndex < availableSlots.length) {
      const selectedSlot = availableSlots[result.selectedIndex];
      return selectedSlot ?? null;
    }

    return null;
  } catch (error) {
    console.error("Error extracting slot:", error);
    return null;
  }
}

