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

    let credentials: { installed?: { client_id: string; client_secret: string; redirect_uris: string[] }; web?: { client_id: string; client_secret: string; redirect_uris: string[] } };
    let tokens: { access_token?: string; refresh_token?: string; scope?: string; token_type?: string; expiry_date?: number };

    // Try to load from files first (local development)
    if (fs.existsSync(credentialsPath) && fs.existsSync(tokenPath)) {
      credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
      tokens = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
      console.log("✅ Loaded OAuth credentials from files");
    }
    // Fall back to environment variables (production)
    else if (process.env.GOOGLE_OAUTH_CREDENTIALS && process.env.GOOGLE_OAUTH_TOKEN) {
      credentials = JSON.parse(process.env.GOOGLE_OAUTH_CREDENTIALS);
      tokens = JSON.parse(process.env.GOOGLE_OAUTH_TOKEN);
      console.log("✅ Loaded OAuth credentials from environment variables");
      
      // Write to files so token refresh can update them
      fs.writeFileSync(credentialsPath, process.env.GOOGLE_OAUTH_CREDENTIALS);
      fs.writeFileSync(tokenPath, process.env.GOOGLE_OAUTH_TOKEN);
    } else {
      throw new Error(
        `OAuth credentials not found. Please either:\n` +
        `1. Create ${credentialsPath} and ${tokenPath} files, or\n` +
        `2. Set GOOGLE_OAUTH_CREDENTIALS and GOOGLE_OAUTH_TOKEN environment variables`
      );
    }

    const creds = credentials.installed || credentials.web;
    if (!creds || !creds.client_id || !creds.client_secret) {
      throw new Error("Invalid OAuth credentials: missing client_id or client_secret");
    }

    const oAuth2Client = new google.auth.OAuth2(
      creds.client_id,
      creds.client_secret,
      creds.redirect_uris?.[0] || "http://localhost"
    );

    oAuth2Client.setCredentials(tokens);

    // Auto-refresh tokens when they expire
    oAuth2Client.on("tokens", (newTokens) => {
      if (newTokens.refresh_token) {
        tokens.refresh_token = newTokens.refresh_token;
      }
      if (newTokens.access_token) {
        tokens.access_token = newTokens.access_token;
      }
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
          timeZone: "Asia/Jerusalem",
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: "Asia/Jerusalem",
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
