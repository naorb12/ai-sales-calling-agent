import { CallStage } from "./call/stages.js";
import { Intent } from "./call/intents.js";

/**
 * Lead information for the sales call
 */
export interface Lead {
  name: string;
  phone: string;
  company: string;
  industry?: string;
  notes?: string;
}

/**
 * Conversation turn in the call history
 */
export interface ConversationTurn {
  agent: string; // Agent's response
  user: string; // User's input
  intent?: Intent; // Classified intent
  timestamp: number; // Unix timestamp
}

/**
 * Available time slot for meeting booking
 */
export interface TimeSlot {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  dayName: string; // "יום שני", "יום שלישי"
  displayText: string; // "מחר (18/12) בשעה 14:00"
}

/**
 * Active call session state
 */
export interface CallSession {
  id: string;
  lead: Lead;
  stage: CallStage;
  previousStage?: CallStage; // Track where we came from for intelligent routing
  repeatCount: number;
  history: ConversationTurn[];
  availableSlots: TimeSlot[]; // Pre-fetched before call
  selectedSlot?: TimeSlot; // User's choice during call
  meetingBooked?: MeetingData; // Final booked meeting (after call)
  startTime: number;
}

/**
 * Meeting booking data
 */
export interface MeetingData {
  date: string;
  time: string;
  duration: number;
  attendees: string[];
  calendarEventId?: string;
}

/**
 * Call result after completion
 */
export interface CallResult {
  sessionId: string;
  lead: Lead;
  outcome: "meeting_booked" | "not_interested" | "follow_up" | "error";
  finalStage: CallStage;
  duration: number;
  transcript: ConversationTurn[];
  meetingBooked?: MeetingData;
}

