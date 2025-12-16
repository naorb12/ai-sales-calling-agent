import dotenv from "dotenv";
dotenv.config();
/**
 * Simple script to trigger an outbound call
 * Usage: npm run test:call
 */

const SERVER_URL = process.env.SERVER_URL || "https://your-ngrok-url.ngrok.io";
const TEST_PHONE = process.env.TEST_PHONE || "+972545371998";

async function triggerCall() {
  console.log("═══════════════════════════════════════════════");
  console.log("🚀 Triggering Test Call");
  console.log("═══════════════════════════════════════════════\n");

  const lead = {
    name: "נאור",
    phone: TEST_PHONE,
    company: "TechCorp",
    industry: "טכנולוגיה",
    serverUrl: SERVER_URL,
  };

  console.log(`📞 Calling: ${lead.name} (${lead.phone})`);
  console.log(`🌐 Server: ${SERVER_URL}\n`);

  try {
    const response = await fetch("http://localhost:3000/api/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });

    const result = await response.json();

    if (result.success) {
      console.log("✅ Call initiated successfully!");
      console.log(`📋 Call SID: ${result.callSid}`);
      console.log("\n💡 Check your phone and server logs for updates");
    } else {
      console.error("❌ Failed to initiate call:", result.error);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    console.log("\n💡 Make sure:");
    console.log("   1. Server is running (npm run dev)");
    console.log("   2. ngrok is running");
    console.log("   3. TEST_PHONE is verified in Twilio");
  }

  console.log("\n═══════════════════════════════════════════════");
}

triggerCall();

