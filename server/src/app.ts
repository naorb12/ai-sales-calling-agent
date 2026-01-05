import express from "express";
import { WebSocketServer } from "ws";
import { makeOutboundCall } from "./telephony/twilio-service.js";
import { handleCallConnection } from "./telephony/call-handler.js";
import { handleWebVoiceConnection } from "./voice/web-voice-handler.js";
import type { Lead } from "./types.js";

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Store serverUrl by CallSid for TwiML endpoint
const callUrls = new Map<string, string>();

// Store lead by CallSid for WebSocket handler  
const callLeads = new Map<string, Lead>();

// TwiML endpoint - Twilio asks "what to do?" when call connects
app.post("/twiml", (req, res) => {
  const callSid = req.body.CallSid;
  const serverUrl = callUrls.get(callSid);

  if (!serverUrl) {
    console.error(`❌ No URL found for call: ${callSid}`);
    res.type("text/xml").send("<Response><Say>Error</Say></Response>");
    return;
  }

  const wsUrl = serverUrl.replace("https://", "wss://").replace("http://", "ws://");
  
  console.log(`📋 TwiML for call: ${callSid}`);
  console.log(`🔗 WebSocket: ${wsUrl}/media-stream`);

  res.type("text/xml");
  res.send(`
    <Response>
      <Connect>
        <Stream url="${wsUrl}/media-stream" />
      </Connect>
    </Response>
  `);
});

// Call status webhook
app.post("/call-status", (req, res) => {
  console.log(`📞 Call status: ${req.body.CallStatus}`);
  res.sendStatus(200);
});

// API: Trigger outbound call
app.post("/api/call", async (req, res) => {
  try {
    const lead: Lead = {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      company: req.body.company || "Unknown",
      industry: req.body.industry,
    };

    const serverUrl = req.body.serverUrl;
    if (!serverUrl) {
      res.status(400).json({ success: false, error: "serverUrl is required" });
      return;
    }

    console.log(`\n🚀 Initiating call to ${lead.name}...`);
    
    const callSid = await makeOutboundCall(lead, serverUrl);

    // Store for later use
    callUrls.set(callSid, serverUrl);
    callLeads.set(callSid, lead);

    res.json({ success: true, callSid, message: "Call initiated" });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

export function startServer() {
  const server = app.listen(port, () => {
    console.log(`✅ Server listening on port ${port}`);
  });

  // WebSocket server for Twilio media streams
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws, req) => {
    console.log("🔌 WebSocket connected");

    // Get lead from stored map (first entry for single concurrent call)
    const lead = Array.from(callLeads.values())[0] || {
      name: "Test Lead",
      phone: "+972501234567",
      email: "test@test.com",
      company: "Test Company",
      industry: "טכנולוגיה",
    };

    handleCallConnection(ws, lead);
  });

  // WebSocket server for web voice sessions
  const webVoiceWss = new WebSocketServer({ noServer: true });

  webVoiceWss.on("connection", (ws, req) => {
    console.log("🌐 Web voice WebSocket connected");
    console.log("   Request URL:", req.url);
    handleWebVoiceConnection(ws);
  });

  webVoiceWss.on("error", (error) => {
    console.error("❌ WebSocket server error:", error);
  });

  // Handle HTTP upgrade requests
  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;

    if (pathname === "/media-stream") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else if (pathname === "/ws") {
      console.log("📋 WebSocket upgrade request for /ws");
      webVoiceWss.handleUpgrade(request, socket, head, (ws) => {
        webVoiceWss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  console.log("📞 Twilio ready!");
  console.log("🌐 Web voice ready!\n");
}
