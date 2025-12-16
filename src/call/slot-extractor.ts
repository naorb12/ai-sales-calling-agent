import type { TimeSlot } from "../types.js";

/**
 * Extract the selected time slot from agent response and user input
 * This helps identify which slot the user chose during BOOK_MEETING stage
 */
export function extractSelectedSlot(
  agentResponse: string,
  userInput: string,
  availableSlots: TimeSlot[]
): TimeSlot | null {
  if (!availableSlots || availableSlots.length === 0) {
    return null;
  }

  // Combine agent response and user input for analysis
  const combined = `${userInput} ${agentResponse}`.toLowerCase();

  // Try to match by date and time patterns
  for (const slot of availableSlots) {
    const datePattern = slot.date.split("-").slice(1).join("/"); // MM/DD format
    const timePattern = slot.time;

    // Check if both date and time are mentioned
    if (combined.includes(datePattern) && combined.includes(timePattern)) {
      return slot;
    }

    // Check if the display text is mentioned
    if (combined.includes(slot.displayText.toLowerCase())) {
      return slot;
    }

    // Check for day name + time
    if (combined.includes(slot.dayName.toLowerCase()) && combined.includes(timePattern)) {
      return slot;
    }
  }

  // Try to match by day name only (if only one slot for that day)
  for (const slot of availableSlots) {
    if (combined.includes(slot.dayName.toLowerCase())) {
      // Check if this is the only slot for this day
      const slotsForDay = availableSlots.filter((s) => s.dayName === slot.dayName);
      if (slotsForDay.length === 1) {
        return slot;
      }
    }
  }

  // Try to match by time only (if only one slot at that time)
  for (const slot of availableSlots) {
    if (combined.includes(slot.time)) {
      const slotsForTime = availableSlots.filter((s) => s.time === slot.time);
      if (slotsForTime.length === 1) {
        return slot;
      }
    }
  }

  return null;
}

