# AI Sales Calling Agent - Server

Backend server for the AI Sales Calling Agent. The agent conducts sales conversations, pitches products, and books meetings. Supports web-based voice conversations and telephony integration.

## Features

- Speech recognition (AssemblyAI streaming)
- Text-to-speech (Cartesia TTS)
- Semantic intent classification (context-aware)
- Smart state machine (INTRO → PITCH → BOOK_MEETING → END → TERMINATE)
- Intelligent objection handling
- Natural pronunciation
- Web voice interface (browser-based, no setup required)
- Telephony integration (Twilio, requires local configuration)

## Tech Stack

- Language: TypeScript
- AI Framework: LangChain
- LLM: Llama 3.3 70B (via Groq) for main agent
- Classification: GPT-4o for intent classification and slot extraction
- Fallback: GPT-4o as secondary agent fallback
- STT: AssemblyAI (web voice) / OpenAI Whisper (telephony)
- TTS: Cartesia (web voice) / OpenAI TTS (telephony)
- Telephony: Twilio (optional)
- Server: Express + WebSocket

## Quick Start

### Prerequisites

- Node.js v18 or higher
- Groq API key (for Llama agent)
- OpenAI API key (for GPT-4o classification, fallback, and telephony)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ai-sales-calling-agent
```

2. Install dependencies:
```bash
cd server
npm install
cd ../client
npm install
```

3. Create `.env` file in `server/` directory:
```bash
GROQ_API_KEY=your-groq-key-here
OPENAI_API_KEY=sk-your-openai-key-here
ASSEMBLYAI_API_KEY=your-assemblyai-key-here
CARTESIA_API_KEY=your-cartesia-key-here
```

### Running the Application

1. Start the server:
```bash
cd server
npm run dev
```

2. Start the client (in a new terminal):
```bash
cd client
npm run dev
```

3. Open the browser to the client URL (typically `http://localhost:5173`)

4. Configure company details and lead information, then start a voice conversation

The web voice feature works directly in your browser without any additional setup. Audio is captured from your microphone and streamed to the server for processing.

## Telephony Integration (Optional)

The telephony feature allows making outbound calls via Twilio. This requires additional local configuration that web voice does not need.

### Telephony Prerequisites

- Twilio account with phone number
- ngrok (for local development)
- ffmpeg (for audio conversion)

### Telephony Setup

1. Install ffmpeg:
   - Windows: Download from https://www.gyan.dev/ffmpeg/builds/ and add to PATH
   - Mac: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`

2. Install and configure ngrok:
   - Sign up at https://ngrok.com/
   - Run: `ngrok config add-authtoken YOUR_AUTH_TOKEN`

3. Add Twilio credentials to `.env`:
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token-here
TWILIO_PHONE_NUMBER=+972501234567
FFMPEG_PATH=C:/ffmpeg/bin/ffmpeg.exe  # Windows path, adjust as needed
```

4. Start ngrok:
```bash
ngrok http 3000
```

5. Update `.env` with the ngrok URL:
```bash
SERVER_URL=https://your-ngrok-url.ngrok-free.app
```

6. Make a test call:
```bash
npm run test:call
```

Or use the API endpoint:
```bash
curl -X POST http://localhost:3000/api/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Naor",
    "phone": "+972501234567",
    "company": "TechCorp",
    "industry": "Tech",
    "serverUrl": "https://your-ngrok-url.ngrok-free.app"
  }'
```

Note: Trial Twilio accounts require phone numbers to be verified in the Twilio Console before making calls.

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Groq API key (for Llama agent) |
| `OPENAI_API_KEY` | Yes | OpenAI API key (for GPT-4o classification, fallback, and telephony) |
| `ASSEMBLYAI_API_KEY` | Yes (web voice) | AssemblyAI API key |
| `CARTESIA_API_KEY` | Yes (web voice) | Cartesia API key |
| `TWILIO_ACCOUNT_SID` | Yes (telephony) | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Yes (telephony) | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Yes (telephony) | Your Twilio phone number |
| `SERVER_URL` | Yes (telephony) | Public ngrok URL |
| `FFMPEG_PATH` | Yes (telephony) | Path to ffmpeg binary |

## Project Structure

```
server/src/
├── agent/              # LangChain agent configuration
│   ├── agent.ts       # Agent setup with tools and memory
│   ├── prompts.ts     # Prompts for each conversation stage
│   └── tools.ts       # Calendar and knowledge base tools
├── call/              # Call flow logic
│   ├── intent-classifier.ts  # Semantic intent classification
│   ├── intents.ts     # Intent enum (POSITIVE, NEGATIVE, etc.)
│   ├── pipeline.ts    # Main conversation orchestration
│   ├── rules.ts       # State machine logic
│   ├── slot-extractor.ts     # Extract meeting time from user input
│   └── stages.ts      # Stage enum (INTRO, PITCH, etc.)
├── services/          # External services
│   └── calendar-service.ts   # Google Calendar integration
├── telephony/         # Twilio integration
│   ├── call-handler.ts       # WebSocket handler for audio streams
│   └── twilio-service.ts     # Twilio API calls
├── utils/             # Utilities
│   └── hebrew-numbers.ts     # Number conversion utilities
├── voice/             # Speech processing
│   ├── audio-converter.ts    # ffmpeg audio conversion (telephony)
│   ├── stt/
│   │   ├── assemblyai-stt.ts # AssemblyAI STT (web voice)
│   │   └── openai-stt.ts     # OpenAI STT (telephony)
│   ├── tts/
│   │   ├── cartesia-tts.ts   # Cartesia TTS (web voice)
│   │   └── openai-tts.ts     # OpenAI TTS (telephony)
│   └── web-voice-handler.ts  # Web voice WebSocket handler
├── app.ts             # Express server + WebSocket setup
├── config.ts          # Environment configuration
├── index.ts           # Entry point
└── types.ts           # TypeScript interfaces
```

## Design Decisions

### Pre-fetched Calendar Slots
Calendar slots are fetched before the conversation starts to avoid latency during the call. This trades real-time accuracy for faster response times.

### Number Conversion
Numbers are converted to words for more natural pronunciation in speech synthesis.

### Semantic Intent Classification
Uses LLM-based intent classification that understands context rather than keyword matching. The same word can have different intents depending on the conversation stage.

## Troubleshooting

### Web Voice Issues

**Problem: No audio captured**
- Check browser permissions for microphone access
- Verify WebSocket connection in browser console
- Check server logs for connection errors

**Problem: Agent not responding**
- Verify API keys are set correctly (especially GROQ_API_KEY)
- Check server logs for errors
- Ensure Groq API has credits

### Telephony Issues

**Problem: "Cannot find ffmpeg"**
- Verify ffmpeg is installed: `ffmpeg -version`
- Update `FFMPEG_PATH` in `.env` with correct path
- On Windows, use forward slashes: `C:/ffmpeg/bin/ffmpeg.exe`

**Problem: "No audio playing during call"**
- Check ffmpeg configuration
- Verify ngrok URL matches `SERVER_URL` in `.env`
- Ensure ngrok is running

**Problem: "Twilio error: Unable to create record"**
- Verify phone number in Twilio Console (trial accounts)
- Use exact format: `+972501234567` (with country code)
- Check Twilio account balance

## License

MIT
