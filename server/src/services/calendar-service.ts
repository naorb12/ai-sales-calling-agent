import { google } from "googleapis";
import { config } from "../config.js";
import type { TimeSlot, CompanyConfig } from "../types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Calendar service for managing meeting availability and bookings
 * Uses Google Calendar API with OAuth2 authentication
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Google Calendar API client (lazy initialization)
let calendar: ReturnType<typeof google.calendar> | null = null;

function getCalendarClient() {
  if (!calendar) {
    const credentialsPath = path.join(__dirname, "oauth-credentials.json");
    const tokenPath = path.join(__dirname, "oauth-token.json");

    // Check if OAuth credentials exist
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(
        `OAuth credentials not found at ${credentialsPath}.\n` +
        "Please follow the setup instructions in the README to create OAuth credentials."
      );
    }

    if (!fs.existsSync(tokenPath)) {
      throw new Error(
        `OAuth token not found at ${tokenPath}.\n` +
        "Please run 'npm run auth' to authenticate with Google Calendar."
      );
    }

    // Load OAuth2 credentials
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
    const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf8"));

    const { client_secret, client_id, redirect_uris } = 
      credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    oAuth2Client.setCredentials(tokens);

    // Auto-refresh tokens when they expire
    oAuth2Client.on("tokens", (newTokens) => {
      if (newTokens.refresh_token) {
        tokens.refresh_token = newTokens.refresh_token;
      }
      tokens.access_token = newTokens.access_token;
      fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
      console.log("🔄 OAuth token refreshed and saved");
    });

    calendar = google.calendar({ version: "v3", auth: oAuth2Client });
  }
  return calendar;
}

/**
 * Get available meeting slots for the next N days
 * Queries Google Calendar free/busy API to find available times
 */
export async function getAvailableSlots(
  daysAhead: number = 7,
  slotsCount: number = 3
): Promise<TimeSlot[]> {
  const calendarClient = getCalendarClient();
  
  // Use primary calendar by default with OAuth, or configured calendar ID
  const calendarId = config.google.calendarId || "primary";
  
  const slots: TimeSlot[] = [];
  const now = new Date();

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const businessHours = ["10:00", "12:00", "14:00", "16:00"];

  // Calculate time range for free/busy query
  const timeMin = new Date(now);
  timeMin.setHours(0, 0, 0, 0);
  
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + daysAhead);
  timeMax.setHours(23, 59, 59, 999);

  try {
    // Query free/busy times from Google Calendar
    const freeBusyResponse = await calendarClient.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: calendarId }],
      },
    });

    const busyTimes = freeBusyResponse.data.calendars?.[calendarId]?.busy || [];

    // Generate potential slots and filter out busy times
    let dayOffset = 1; // Start from tomorrow

    while (slots.length < slotsCount && dayOffset <= daysAhead) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);
      const dayOfWeek = date.getDay();
      
      // Skip Saturday
      if (dayOfWeek === 6) {
        dayOffset++;
        continue;
      }

      // Check each business hour
      for (const time of businessHours) {
        if (slots.length >= slotsCount) break;

        const [hours, minutes] = time.split(":").map(Number);
        const slotStart = new Date(date);
        slotStart.setHours(hours ?? 0, minutes ?? 0, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setHours(slotStart.getHours() + 1); // 1-hour meetings

        // Check if slot conflicts with busy times
        const isAvailable = !busyTimes.some((busy) => {
          const busyStart = new Date(busy.start ?? "");
          const busyEnd = new Date(busy.end ?? "");
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        if (isAvailable) {
          const dateStr = date.toISOString().split("T")[0] ?? "";
          const dayName = dayNames[dayOfWeek] ?? "Day";

          let displayText = "";
          if (dayOffset === 1) {
            displayText = `Tomorrow (${date.getMonth() + 1}/${date.getDate()}) at ${time}`;
          } else if (dayOffset === 2) {
            displayText = `Day after tomorrow (${date.getMonth() + 1}/${date.getDate()}) at ${time}`;
          } else {
            displayText = `${dayName} (${date.getMonth() + 1}/${date.getDate()}) at ${time}`;
          }

          slots.push({
            date: dateStr,
            time,
            dayName,
            displayText,
          });
        }
      }

      dayOffset++;
    }

    return slots;
  } catch (error) {
    console.error("Error fetching calendar slots:", error);
    throw error;
  }
}

/**
 * Book a meeting in Google Calendar
 * Creates an event with attendees - Google automatically sends invitations
 */
export async function bookMeeting(
  slot: TimeSlot,
  attendees: string[],
  companyConfig?: CompanyConfig
): Promise<{ eventId: string; meetingLink: string }> {
  const calendarClient = getCalendarClient();
  
  // Use primary calendar by default with OAuth, or configured calendar ID
  const calendarId = config.google.calendarId || "primary";

  try {
    // Parse slot date and time
    const [hours, minutes] = slot.time.split(":").map(Number);
    const startDate = new Date(slot.date);
    startDate.setHours(hours ?? 0, minutes ?? 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1); // 1-hour meeting

    // Create calendar event
    const companyName = companyConfig?.companyName || "Company";
    const summary = `Sales Meeting - ${companyName} Demo`;
    const description = companyConfig?.description 
      ? `Meeting scheduled by AI Sales Agent to discuss ${companyName}: ${companyConfig.description}`
      : `Meeting scheduled by AI Sales Agent to discuss ${companyName} solution.`;

    const event = await calendarClient.events.insert({
      calendarId: calendarId,
      conferenceDataVersion: 1, // Enable Google Meet link
      requestBody: {
        summary,
        description,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        },
        attendees: attendees.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 1 day before
            { method: "popup", minutes: 30 }, // 30 minutes before
          ],
        },
      },
    });

    const eventId = event.data.id ?? "";
    const meetingLink = event.data.hangoutLink || event.data.htmlLink || "";

    return {
      eventId,
      meetingLink,
    };
  } catch (error) {
    console.error("Error booking meeting:", error);
    throw error;
  }
}

/**
 * NOTE: sendCalendarInvite is not needed
 * Google Calendar automatically sends invitations when creating events with attendees
 */
export async function sendCalendarInvite(
  email: string,
  slot: TimeSlot,
  meetingLink: string
): Promise<void> {
  // No-op: Google Calendar handles invitations automatically
  console.log(`📧 Google Calendar automatically sent invitation to ${email}`);
}
// import type { TimeSlot } from "../types.js";

// /**
//  * Calendar service for managing meeting availability and bookings
//  * 
//  * This service fetches available slots BEFORE the call (pre-fetching)
//  * and books meetings AFTER the call (async, no latency during conversation)
//  */

// /**
//  * Get available meeting slots for the next N days
//  * This is called BEFORE initiating a call to pre-fetch availability
//  * 
//  * @param daysAhead - Number of days to look ahead (default: 7)
//  * @param slotsCount - Number of slots to return (default: 7)
//  */
// export async function getAvailableSlots(
//   daysAhead: number = 7,
//   slotsCount: number = 7
// ): Promise<TimeSlot[]> {
//   // Mock implementation - replace with real Google Calendar API later
//   const slots: TimeSlot[] = [];
//   const now = new Date();
  
//   // English day names
//   const dayNames = [
//     "Sunday",
//     "Monday",
//     "Tuesday",
//     "Wednesday",
//     "Thursday",
//     "Friday",
//     "Saturday",
//   ];
  
//   // Generate slots for next week
//   // Business hours: 10:00, 12:00, 14:00, 16:00
//   const hours = ["10:00", "12:00", "14:00", "16:00"];
  
//   let dayOffset = 1; // Start from tomorrow
//   let slotIndex = 0;
  
//   while (slots.length < slotsCount && dayOffset <= daysAhead) {
//     const date = new Date(now);
//     date.setDate(date.getDate() + dayOffset);
    
//     // Skip weekends (Friday evening, Saturday)
//     const dayOfWeek = date.getDay();
//     if (dayOfWeek === 6) { // Saturday
//       dayOffset++;
//       continue;
//     }
    
//     // Generate slots for this day
//     for (const time of hours) {
//       if (slots.length >= slotsCount) break;
      
//       const dateStr = date.toISOString().split("T")[0] ?? date.toISOString();
//       const dayName = dayNames[dayOfWeek] ?? "Day";
      
//       // Format display text
//       let displayText = "";
//       if (dayOffset === 1) {
//         displayText = `Tomorrow (${date.getMonth() + 1}/${date.getDate()}) at ${time}`;
//       } else if (dayOffset === 2) {
//         displayText = `Day after tomorrow (${date.getMonth() + 1}/${date.getDate()}) at ${time}`;
//       } else {
//         displayText = `${dayName} (${date.getMonth() + 1}/${date.getDate()}) at ${time}`;
//       }
      
//       slots.push({
//         date: dateStr,
//         time,
//         dayName,
//         displayText,
//       });
      
//       slotIndex++;
//     }
    
//     dayOffset++;
//   }
  
//   return slots;
// }

// /**
//  * Book a meeting in the calendar
//  * This is called AFTER the call ends to avoid latency during conversation
//  * 
//  * @param slot - The time slot to book
//  * @param attendees - List of attendee emails
//  * @returns Meeting details including calendar event ID and meeting link
//  */
// export async function bookMeeting(
//   slot: TimeSlot,
//   attendees: string[]
// ): Promise<{ eventId: string; meetingLink: string }> {
//   // Mock implementation - replace with real Google Calendar API later
//   console.log(`\n📅 Booking meeting:`);
//   console.log(`   Date: ${slot.date}`);
//   console.log(`   Time: ${slot.time}`);
//   console.log(`   Attendees: ${attendees.join(", ")}`);
  
//   // Simulate API call delay
//   await new Promise((resolve) => setTimeout(resolve, 500));
  
//   // Mock response
//   return {
//     eventId: `evt_${Date.now()}`,
//     meetingLink: `https://meet.google.com/${generateMeetingCode()}`,
//   };
// }

// /**
//  * Send calendar invitation email
//  */
// export async function sendCalendarInvite(
//   email: string,
//   slot: TimeSlot,
//   meetingLink: string
// ): Promise<void> {
//   console.log(`\n📧 Sending calendar invite:`);
//   console.log(`   To: ${email}`);
//   console.log(`   Meeting: ${slot.displayText}`);
//   console.log(`   Link: ${meetingLink}`);
  
//   // In production, integrate with email service (SendGrid, etc.)
// }

// /**
//  * Generate a random meeting code
//  */
// function generateMeetingCode(): string {
//   const chars = "abcdefghijklmnopqrstuvwxyz";
//   const segments = 3;
//   const segmentLength = 4;
  
//   return Array.from({ length: segments }, () =>
//     Array.from({ length: segmentLength }, () => chars[Math.floor(Math.random() * chars.length)] ?? "a").join("")
//   ).join("-");
// }


