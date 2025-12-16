import twilio from "twilio";
import { config } from "../config.js";
import type { Lead } from "../types.js";

const client = twilio(config.twilio.accountSid, config.twilio.authToken);

/**
 * Make an outbound call to a lead
 * Returns the call SID for tracking
 */
export async function makeOutboundCall(
  lead: Lead,
  serverUrl: string
): Promise<string> {
  console.log(`📞 Initiating call to ${lead.name} (${lead.phone})`);

  const call = await client.calls.create({
    to: lead.phone,
    from: config.twilio.phoneNumber,
    url: `${serverUrl}/twiml`, // TwiML instructions endpoint
    statusCallback: `${serverUrl}/call-status`,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
  });

  console.log(`✅ Call initiated: ${call.sid}`);
  return call.sid;
}

/**
 * Hang up an active call
 */
export async function hangupCall(callSid: string): Promise<void> {
  await client.calls(callSid).update({ status: "completed" });
  console.log(`📴 Call ended: ${callSid}`);
}

