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



