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
        message: "נמצאו 3 משבצות זמן פנויות",
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
        message: `הפגישה נקבעה בהצלחה ל-${datetime}`,
      });
    }

    return JSON.stringify({
      success: false,
      message: "פעולה לא חוקית. השתמש ב-'check' או 'book' עם תאריך ושעה.",
    });
  },
  {
    name: "check_calendar",
    description: `כלי לבדיקת זמינות ביומן וקביעת פגישות.

שימוש:
- לבדיקת זמינות: { "action": "check" }
- לקביעת פגישה: { "action": "book", "datetime": "2024-12-20 14:00" }

הכלי מחזיר JSON עם המידע הרלוונטי.`,
    schema: z.object({
      action: z.enum(["check", "book"]).describe("הפעולה לביצוע: check לבדיקת זמינות, book לקביעת פגישה"),
      datetime: z
        .string()
        .optional()
        .describe("תאריך ושעה בפורמט YYYY-MM-DD HH:MM (חובה עבור book)"),
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
      pricing: "Alta מציעה מחירים גמישים לפי גודל החברה. מתחילים מ-$500/חודש לצוותים קטנים.",
      integration:
        "Alta משתלבת עם: Salesforce, HubSpot, Pipedrive, Monday.com ועוד. ההתקנה לוקחת פחות משעה.",
      features: "אוטומציה של עדכוני CRM, סיווג וניקוד ליידים אוטומטי, מעקב ותזמון חכם, דוחות וניתוחים.",
      competitors: "בניגוד לפתרונות אחרים, Alta מותאמת לשוק הישראלי ומשתלבת עם תהליכים מקומיים.",
      setup: "ההתקנה פשוטה: חיבור ל-CRM, הגדרת כללים בסיסיים, והמערכת מתחילה לעבוד. יש תמיכה מלאה בעברית.",
    };

    const lowerQuestion = question.toLowerCase();
    for (const [key, answer] of Object.entries(knowledge)) {
      if (lowerQuestion.includes(key) || lowerQuestion.includes(answer.substring(0, 20))) {
        return answer;
      }
    }

    return "אין לי מידע ספציפי על זה כרגע. אשמח לקבוע לך פגישה עם המומחים שלנו שיוכלו לענות על כל שאלה.";
  },
  {
    name: "knowledge_base",
    description: "קבל מידע על Alta - תמחור, אינטגרציות, פיצ'רים, והשוואה למתחרים",
    schema: z.object({
      question: z.string().describe("השאלה שצריך לענות עליה"),
    }),
  }
);

export const tools = [checkCalendarTool, knowledgeBaseTool];

