import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Calendar tool for checking availability and booking meetings
 * For now, returns mock data. Will integrate with Google Calendar later.
 */
export const checkCalendarTool = tool(
  async ({ action, datetime }) => {
    // Mock implementation for testing
    if (action === "check") {
      // Return available slots
      const now = new Date();
      const slots = [
        {
          date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          time: "14:00",
          available: true,
        },
        {
          date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          time: "16:00",
          available: true,
        },
        {
          date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          time: "10:00",
          available: true,
        },
      ];

      return JSON.stringify({
        success: true,
        slots,
        message: "Found 3 available time slots",
      });
    }

    if (action === "book" && datetime) {
      // Book a meeting
      return JSON.stringify({
        success: true,
        meeting: {
          datetime,
          duration: 30,
          link: "https://meet.google.com/abc-defg-hij",
        },
        message: `Meeting successfully scheduled for ${datetime}`,
      });
    }

    return JSON.stringify({
      success: false,
      message: "Invalid action. Use 'check' or 'book' with date and time.",
    });
  },
  {
    name: "check_calendar",
    description: `Tool for checking calendar availability and scheduling meetings.

Usage:
- To check availability: { "action": "check" }
- To book a meeting: { "action": "book", "datetime": "2024-12-20 14:00" }

The tool returns JSON with relevant information.`,
    schema: z.object({
      action: z.enum(["check", "book"]).describe("Action to perform: check for availability, book to schedule a meeting"),
      datetime: z
        .string()
        .optional()
        .describe("Date and time in format YYYY-MM-DD HH:MM (required for book)"),
    }),
  }
);

/**
 * Knowledge base tool for Alta product information
 */
export const knowledgeBaseTool = tool(
  async ({ question }) => {
    // Mock knowledge base - replace with real data later
    const knowledge: Record<string, string> = {
      pricing: "Alta offers flexible pricing based on company size. Starting from $500/month for small teams.",
      integration:
        "Alta integrates with: Salesforce, HubSpot, Pipedrive, Monday.com and more. Setup takes less than an hour.",
      features: "CRM update automation, automatic lead scoring and classification, smart follow-up and scheduling, reports and analytics.",
      competitors: "Unlike other solutions, Alta is tailored for the market and integrates with local processes.",
      setup: "Setup is simple: connect to CRM, configure basic rules, and the system starts working. Full support is available.",
    };

    const lowerQuestion = question.toLowerCase();
    for (const [key, answer] of Object.entries(knowledge)) {
      if (lowerQuestion.includes(key) || lowerQuestion.includes(answer.substring(0, 20))) {
        return answer;
      }
    }

    return "I don't have specific information about that right now. I'd be happy to schedule a meeting with our experts who can answer any questions.";
  },
  {
    name: "knowledge_base",
    description: "Get information about Alta - pricing, integrations, features, and competitor comparison",
    schema: z.object({
      question: z.string().describe("The question that needs to be answered"),
    }),
  }
);

export const tools = [checkCalendarTool, knowledgeBaseTool];

