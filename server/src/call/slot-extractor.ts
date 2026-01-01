import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import type { TimeSlot } from "../types.js";
import { config } from "../config.js";

/**
 * Schema for slot selection response
 */
const SlotSelectionSchema = z.object({
  selectedIndex: z.number().min(-1).describe("Index of the selected time (0-based), or -1 if none selected"),
  confidence: z.number().min(0).max(1).describe("Confidence level in the selection"),
  reasoning: z.string().describe("Brief explanation of why this time was selected"),
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
    `You help identify which meeting time the customer chose from a list of options.

Role: Read the customer's response and understand which time they selected.

Rules:
- If the customer chose a specific time → return its index (0-based)
- If the customer didn't choose a specific time → return -1

Examples of specific selection:
- "at ten" → time with 10:00
- "tomorrow at 10" → time with 10:00 tomorrow
- "the first option" → index 0
- "the second one" → index 1
- "14:00" → time with 14:00
- "Tuesday" → Tuesday (if there's only one)

Examples without specific selection:
- "when is convenient for you?" → -1 (asking, not choosing)
- "I don't have a preference" → -1 (didn't choose)
- "doesn't matter" → -1 (didn't choose)
- "morning" → -1 (not specific enough)

Important: Only select if the customer mentioned a **specific** time!`,
  ],
  [
    "human",
    `Available times:
{availableSlots}

Customer's response: "{userInput}"

Which time did the customer choose? (Return index, or -1 if no specific time was chosen)`,
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

