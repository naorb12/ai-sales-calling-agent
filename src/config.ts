import "dotenv/config";

export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
  },
  google: {
    calendarId: process.env.GOOGLE_CALENDAR_ID || "",
    credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH || "",
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
  },
} as const;

// Validate required config for current phase
export function validateConfig(phase: "text" | "audio" | "telephony") {
  if (!config.openai.apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }

  if (phase === "telephony") {
    if (!config.twilio.accountSid || !config.twilio.authToken) {
      throw new Error("Twilio credentials are required for telephony phase");
    }
  }
}

