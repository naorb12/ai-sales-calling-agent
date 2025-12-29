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

/**
 * Web voice session (reuses CallSession structure)
 * For web-based voice conversations without telephony
 */
export interface WebVoiceSession extends Omit<CallSession, "lead"> {
  // Lead is optional for web sessions, can be provided via UI
  lead?: Lead;
}

/**
 * Server events sent to web voice clients via WebSocket
 */
export type ServerEvent =
  | {
      type: "stt_output";
      transcript: string;
      ts: number;
    }
  | {
      type: "agent_chunk";
      text: string;
      ts: number;
    }
  | {
      type: "tts_chunk";
      audio: string; // base64-encoded PCM audio
      ts: number;
    }
  | {
      type: "session_end";
    }
  | {
      type: "pong"; // Response to ping
    };

