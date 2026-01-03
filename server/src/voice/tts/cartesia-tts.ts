import WebSocket from "ws";
import type {
  CartesiaTTSRequest,
  CartesiaTTSResponse,
  CartesiaOutputFormat,
  CartesiaVoice,
} from "./cartesia-api-types.js";
import { config } from "../../config.js";

/** Audio chunk event */
export interface TTSChunk {
  audio: string;  // Base64 PCM audio
  ts: number;     // Timestamp
}

/** Callback when audio chunk arrives */
type OnChunkCallback = (chunk: TTSChunk) => void;

/** Callback when audio generation is complete */
type OnDoneCallback = () => void;

export class CartesiaTTS {
  private ws: WebSocket | null = null;
  private onChunk: OnChunkCallback;
  private onDone: OnDoneCallback | null;
  private contextCounter = 0;

  // Cartesia settings
  private apiKey: string;
  private voiceId = "820a3788-2b37-4d21-847a-b65d8a68c99a"; // Default English voice
  private modelId = "sonic-3";
  private sampleRate = 24000;
  private language = "en";

  constructor(onChunk: OnChunkCallback, onDone?: OnDoneCallback) {
    this.apiKey = config.cartesia.apiKey;
    if (!this.apiKey) {
      throw new Error("Cartesia API key is required");
    }
    this.onChunk = onChunk;
    this.onDone = onDone ?? null;
  }

  /** Connect to Cartesia WebSocket */
  async connect(): Promise<void> {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      cartesia_version: "2025-04-16",
    });
    const url = `wss://api.cartesia.ai/tts/websocket?${params}`;
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        console.log("🔌 Cartesia connected");
        resolve();
      });

      this.ws.on("message", (data: WebSocket.RawData) => {
        const msg: CartesiaTTSResponse = JSON.parse(data.toString());
        
        if (msg.data) {
          // Audio chunk received - call callback immediately
          this.onChunk({ audio: msg.data, ts: Date.now() });
        }
        
        if (msg.done) {
          // Generation complete - call done callback
          console.log("✅ Cartesia generation complete");
          this.onDone?.();
        }
        
        if (msg.error) {
          console.error("❌ Cartesia error:", msg.error);
        }
      });

      this.ws.on("error", reject);
    });
  }

  /** Send text to generate audio */
  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected");
      return;
    }

    const payload: CartesiaTTSRequest = {
      model_id: this.modelId,
      transcript: text,
      voice: { mode: "id", id: this.voiceId },
      output_format: {
        container: "raw",
        encoding: "pcm_s16le",
        sample_rate: this.sampleRate,
      },
      language: this.language,
      context_id: `ctx_${Date.now()}_${this.contextCounter++}`,
    };

    this.ws.send(JSON.stringify(payload));
    console.log(`📤 Sent: "${text.substring(0, 40)}..."`);
  }

  /** Close connection */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}