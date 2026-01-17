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

CONTEXT: The agent just offered specific times. The customer is responding to those offers.

CRITICAL MATCHING RULES:
1. Look at what the AGENT just said - extract the date numbers (e.g., "the 8th" = 8)
2. If customer says "Wednesday" or "Wednesday at 12", match to the Wednesday the agent mentioned
3. Match by DATE NUMBER first: "the 8th" matches ANY slot with day = 8 (could be 1/8, 2/8, 3/8)
4. Then match by day name and time

HOW TO MATCH:

Step 1: What did the agent offer?
- Look for date numbers in agent's message: "the 8th", "the 21st", "7th", etc.
- Look for day names: Monday, Tuesday, Wednesday, etc.

Step 2: What did customer choose?
- If they mention a date number ("the 8th") → find that exact day number
- If they just say day + time ("Wednesday at 12") → match to the Wednesday the agent mentioned

Step 3: Find in available slots
- Look at the slot list: "Wednesday (2/8) at 12:00" means Wednesday, day 8 (of some month)
- Match "the 8th" to "(2/8)" or "(1/8)" or "(3/8)" - the day number is what matters
- The format is (MONTH/DAY), so (2/8) = February 8th = "the 8th"

Examples:

Agent: "Wednesday the 8th at 12:00, or Thursday the 9th at 14:00"
Available: ["Wednesday (2/8) at 12:00", "Thursday (2/9) at 14:00"]
Customer: "Wednesday at 12"
→ Match to index with (2/8) - that's the Wednesday "the 8th" agent mentioned

Agent: "Tuesday the 7th at 10:00 or Wednesday the 15th at 2pm"
Available: ["Tuesday (1/7) at 10:00", "Wednesday (1/15) at 14:00"]
Customer: "Wednesday"
→ Match to (1/15) - that's "the 15th" agent mentioned

Agent: "tomorrow at 2pm"
Available: ["Tomorrow (1/18) at 14:00"]
Customer: "tomorrow"
→ Match to tomorrow slot

KEY INSIGHT: In format (M/D), the D is the date number. "the 8th" = D=8, could be (1/8) or (2/8) or (3/8).

If ambiguous (no date numbers mentioned), pick the EARLIEST matching slot.`,
  ],
  [
    "human",
    `Agent just offered:
"{agentResponse}"

Available times (format is (MONTH/DAY)):
{availableSlots}

Customer's response: "{userInput}"

Match the customer's choice to the slots. Remember: "the 8th" matches (1/8) or (2/8) or (3/8) - any day 8.`,
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
      agentResponse,
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

