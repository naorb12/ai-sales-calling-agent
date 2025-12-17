import type { TimeSlot } from "../types.js";

/**
 * Calendar service for managing meeting availability and bookings
 * 
 * This service fetches available slots BEFORE the call (pre-fetching)
 * and books meetings AFTER the call (async, no latency during conversation)
 */

/**
 * Get available meeting slots for the next N days
 * This is called BEFORE initiating a call to pre-fetch availability
 * 
 * @param daysAhead - Number of days to look ahead (default: 7)
 * @param slotsCount - Number of slots to return (default: 7)
 */
export async function getAvailableSlots(
  daysAhead: number = 7,
  slotsCount: number = 7
): Promise<TimeSlot[]> {
  // Mock implementation - replace with real Google Calendar API later
  const slots: TimeSlot[] = [];
  const now = new Date();
  
  // Hebrew day names
  const dayNames = [
    "יום ראשון",
    "יום שני",
    "יום שלישי",
    "יום רביעי",
    "יום חמישי",
    "יום שישי",
    "יום שבת",
  ];
  
  // Generate slots for next week
  // Business hours: 10:00, 12:00, 14:00, 16:00
  const hours = ["10:00", "12:00", "14:00", "16:00"];
  
  let dayOffset = 1; // Start from tomorrow
  let slotIndex = 0;
  
  while (slots.length < slotsCount && dayOffset <= daysAhead) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    
    // Skip weekends (Friday evening, Saturday)
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 6) { // Saturday
      dayOffset++;
      continue;
    }
    
    // Generate slots for this day
    for (const time of hours) {
      if (slots.length >= slotsCount) break;
      
      const dateStr = date.toISOString().split("T")[0] ?? date.toISOString();
      const dayName = dayNames[dayOfWeek] ?? "יום";
      
      // Format display text
      let displayText = "";
      if (dayOffset === 1) {
        displayText = `מחר (${date.getDate()}/${date.getMonth() + 1}) בשעה ${time}`;
      } else if (dayOffset === 2) {
        displayText = `מחרתיים (${date.getDate()}/${date.getMonth() + 1}) בשעה ${time}`;
      } else {
        displayText = `${dayName} (${date.getDate()}/${date.getMonth() + 1}) בשעה ${time}`;
      }
      
      slots.push({
        date: dateStr,
        time,
        dayName,
        displayText,
      });
      
      slotIndex++;
    }
    
    dayOffset++;
  }
  
  return slots;
}

/**
 * Book a meeting in the calendar
 * This is called AFTER the call ends to avoid latency during conversation
 * 
 * @param slot - The time slot to book
 * @param attendees - List of attendee emails
 * @returns Meeting details including calendar event ID and meeting link
 */
export async function bookMeeting(
  slot: TimeSlot,
  attendees: string[]
): Promise<{ eventId: string; meetingLink: string }> {
  // Mock implementation - replace with real Google Calendar API later
  console.log(`\n📅 Booking meeting:`);
  console.log(`   Date: ${slot.date}`);
  console.log(`   Time: ${slot.time}`);
  console.log(`   Attendees: ${attendees.join(", ")}`);
  
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  // Mock response
  return {
    eventId: `evt_${Date.now()}`,
    meetingLink: `https://meet.google.com/${generateMeetingCode()}`,
  };
}

/**
 * Send calendar invitation email
 */
export async function sendCalendarInvite(
  email: string,
  slot: TimeSlot,
  meetingLink: string
): Promise<void> {
  console.log(`\n📧 Sending calendar invite:`);
  console.log(`   To: ${email}`);
  console.log(`   Meeting: ${slot.displayText}`);
  console.log(`   Link: ${meetingLink}`);
  
  // In production, integrate with email service (SendGrid, etc.)
}

/**
 * Generate a random meeting code
 */
function generateMeetingCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const segments = 3;
  const segmentLength = 4;
  
  return Array.from({ length: segments }, () =>
    Array.from({ length: segmentLength }, () => chars[Math.floor(Math.random() * chars.length)] ?? "a").join("")
  ).join("-");
}

