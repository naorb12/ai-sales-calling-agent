# 🤖 AI Sales Calling Agent - Hebrew

An end-to-end AI-powered outbound calling agent that conducts sales conversations in Hebrew, pitches products, and books meetings.

## 🎯 Features

- ✅ **Hebrew Speech Recognition** (OpenAI Whisper)
- ✅ **Hebrew Text-to-Speech** (OpenAI TTS with number optimization)
- ✅ **Semantic Intent Classification** (context-aware, not keyword-based)
- ✅ **Smart State Machine** (INTRO → PITCH → BOOK_MEETING → END → TERMINATE)
- ✅ **Intelligent Objection Handling** (first objection = engage, second = politely end)
- ✅ **Natural Hebrew Pronunciation** (converts numbers to words: "14:00" → "שתיים")
- ✅ **Real-time Audio Conversion** (μ-law ↔ MP3/WAV with ffmpeg)
- ✅ **Twilio Integration** (outbound calling)
- ✅ **LangChain Agent** (with tools and memory)

## 🛠️ Tech Stack

- **Language**: TypeScript
- **AI Framework**: LangChain
- **LLM**: GPT-4o-mini (OpenAI)
- **STT**: Whisper (OpenAI)
- **TTS**: TTS-1 with `nova` voice (OpenAI)
- **Telephony**: Twilio
- **Audio Processing**: ffmpeg
- **Server**: Express + WebSocket

---

## 📋 Prerequisites

### 1. **Node.js** (v18 or higher)
```bash
node --version  # Should be v18+
```
Download: https://nodejs.org/

### 2. **ffmpeg** (Required for audio conversion)

**Windows:**
1. Download from: https://www.gyan.dev/ffmpeg/builds/
2. Extract to `C:\ffmpeg`
3. Add to PATH or note the path for `.env`

**Mac:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Verify installation:**
```bash
ffmpeg -version
```

### 3. **ngrok** (For local development)
1. Sign up: https://ngrok.com/
2. Download and install
3. Get auth token from dashboard

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

---

## 🔑 API Keys Setup

### 1. **OpenAI API Key**
1. Go to: https://platform.openai.com/api-keys
2. Create new secret key
3. Copy the key (starts with `sk-`)

### 2. **Twilio Account**
1. Sign up: https://www.twilio.com/try-twilio
2. Go to Console Dashboard
3. Note your:
   - **Account SID** (starts with `AC`)
   - **Auth Token** (click to reveal)
4. Get a phone number:
   - Go to Phone Numbers → Buy a Number
   - Choose a number with Voice capabilities
   - **Note**: Trial accounts require verified numbers only

---

## ⚙️ Installation

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd ai-sales-calling-agent
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create `.env` File

Create a `.env` file in the project root:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key-here

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token-here
TWILIO_PHONE_NUMBER=+972501234567

# Server URL (will be set after starting ngrok)
SERVER_URL=https://your-ngrok-url.ngrok.io

# FFmpeg Path (Windows - adjust if needed)
FFMPEG_PATH=C:/ffmpeg/bin/ffmpeg.exe

# Test Phone Number (must be verified in Twilio trial)
TEST_PHONE=+972501234567
```

**Important Notes:**
- For `TWILIO_PHONE_NUMBER`: Use the number you bought from Twilio (include country code)
- For `TEST_PHONE`: On trial accounts, this must be verified in Twilio Console
- For `FFMPEG_PATH`: 
  - **Windows**: Use forward slashes `/` or double backslashes `\\`
  - **Mac/Linux**: Just use `ffmpeg` (if in PATH)
- `SERVER_URL` will be filled in next step

---

## 🚀 Running the Application

### Step 1: Start ngrok (Terminal 1)

```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding   https://abc123-def-456.ngrok-free.app -> http://localhost:3000
```

**Copy the `https://` URL** and update `.env`:
```bash
SERVER_URL=https://abc123-def-456.ngrok-free.app
```

⚠️ **Keep ngrok running!**

### Step 2: Start the Server (Terminal 2)

```bash
npm run dev
```

You should see:
```
✅ Server listening on port 3000
📞 Twilio integration ready!
```

### Step 3: Verify Phone Number in Twilio (Trial Accounts Only)

1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified
2. Click **Add a new Caller ID**
3. Enter YOUR phone number (the one you'll test with)
4. Complete verification (receive code via SMS/call)

---

## 📞 Making a Test Call

### Option 1: Using the Test Script

```bash
npm run test:call
```

This triggers a call to the `TEST_PHONE` number in your `.env`.

### Option 2: Using curl

```bash
curl -X POST http://localhost:3000/api/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "נאור",
    "phone": "+972501234567",
    "company": "TechCorp",
    "industry": "טכנולוגיה",
    "serverUrl": "https://your-ngrok-url.ngrok-free.app"
  }'
```

### Option 3: Using Postman

**POST** `http://localhost:3000/api/call`

**Body (JSON):**
```json
{
  "name": "נאור",
  "phone": "+972501234567",
  "company": "TechCorp", 
  "industry": "טכנולוגיה",
  "serverUrl": "https://your-ngrok-url.ngrok-free.app"
}
```

---

## 🎙️ Having the Conversation

Once the call connects, you'll hear the agent in Hebrew:

**Agent:** "היי נאור, אני סוכן AI מאלתא. אנחנו עוזרים לחברות כמו TechCorp לחסוך זמן במכירות עם אוטומציה חכמה של CRM ומעקב ליידים. יש לך דקה קצרה?"

### Sample Conversation Flow:

```
You: "אוקיי, תספר לי"
Agent: [Explains Luna, Katie, Alex AI agents]

You: "כן, מעניין. בוא נקבע פגישה"
Agent: [Offers meeting times]

You: "מחר בשתיים בסדר"
Agent: [Confirms: "מעולה! נתראה מחר בשעה שתיים"]

You: "תודה"
[Call ends automatically]
```

### Tips for Testing:
- ✅ Speak clearly in Hebrew
- ✅ Say short, natural sentences
- ✅ Check terminal logs for real-time processing

---

## 📊 Monitoring the Call

In the terminal running `npm run dev`, you'll see:

```
🔌 Call connected: נאור
📝 User: אוקיי, תספר לי

🧠 Intent Classification:
   Intent: POSITIVE
   Confidence: 90%

🔄 Stage Transition:
   From: INTRO → To: PITCH

💬 Agent: סבבה, אז בקצרה - Alta זה כמו...

🔊 Generated 172800 bytes (MP3)
🔄 Converted to 69120 bytes μ-law
✅ Sent audio to caller (432 chunks)
```

---

## 🧪 Text-Only Testing (Without Phone Call)

Test the conversation logic without making a real call:

```bash
npm run test:conversation
```

This runs an interactive terminal conversation where you can type responses and see the agent's logic.

---

## 🐛 Troubleshooting

### **Problem: "Cannot find ffmpeg"**

**Solution:**
1. Verify ffmpeg is installed: `ffmpeg -version`
2. Update `FFMPEG_PATH` in `.env` with correct path
3. On Windows, use forward slashes: `C:/ffmpeg/bin/ffmpeg.exe`

---

### **Problem: "No audio playing during call"**

**Possible causes:**
1. **ffmpeg not configured** → Check logs for conversion errors
2. **ngrok URL mismatch** → Ensure `SERVER_URL` in `.env` matches ngrok URL
3. **WebSocket not connecting** → Check ngrok is running

---

### **Problem: "Twilio error: Unable to create record"**

**Solution (Trial Accounts):**
1. Verify your phone number in Twilio Console
2. Use the exact format: `+972501234567` (with country code)
3. Check your Twilio balance

---

### **Problem: "Agent hears itself (echo loop)"**

**Solution:**
- This should be fixed automatically (see `isSpeaking` flag in code)
- If persists, restart the server

---

### **Problem: "Hebrew pronunciation is bad for numbers"**

**Solution:**
- Already implemented! Numbers are converted to Hebrew words
- If still bad, check logs for `🔢 Converted:` messages

---

### **Problem: "Call hangs, no response from agent"**

**Checklist:**
1. ✅ OpenAI API key is valid and has credits
2. ✅ Server is running (`npm run dev`)
3. ✅ ngrok is running
4. ✅ Check terminal for errors

---

## 📁 Project Structure

```
src/
├── agent/              # LangChain agent configuration
│   ├── agent.ts       # Agent setup with tools and memory
│   ├── prompts.ts     # Hebrew prompts for each stage
│   └── tools.ts       # Calendar and knowledge base tools
├── call/              # Call flow logic
│   ├── intent-classifier.ts  # Semantic intent classification
│   ├── intents.ts     # Intent enum (POSITIVE, NEGATIVE, etc.)
│   ├── pipeline.ts    # Main conversation orchestration
│   ├── rules.ts       # State machine logic
│   ├── slot-extractor.ts     # Extract meeting time from user input
│   └── stages.ts      # Stage enum (INTRO, PITCH, etc.)
├── services/          # External services
│   └── calendar-service.ts   # Mock calendar (ready for Google Calendar)
├── telephony/         # Twilio integration
│   ├── call-handler.ts       # WebSocket handler for audio streams
│   └── twilio-service.ts     # Twilio API calls
├── utils/             # Utilities
│   └── hebrew-numbers.ts     # Convert numbers to Hebrew words
├── voice/             # Speech processing
│   ├── audio-converter.ts    # ffmpeg audio conversion
│   ├── openai-stt.ts         # Whisper STT
│   └── openai-tts.ts         # OpenAI TTS
├── app.ts             # Express server + WebSocket setup
├── config.ts          # Environment configuration
├── index.ts           # Entry point
└── types.ts           # TypeScript interfaces
```

---

## 🎯 Key Design Decisions

### 1. **Pre-fetched Calendar Slots**
- Slots are fetched **before the call** to avoid 2-3s latency during conversation
- Trade-off: Less real-time accuracy, but much faster conversation
- 
### 2. **Hebrew Number Conversion**
- OpenAI TTS struggles with "14:00" → Converts to "שתיים"
- Dates: "18/12" → "שמונה עשרה לשתיים עשרה"
- Much more natural pronunciation

### 3. **Semantic Intent Classification**
- Uses LLM to understand intent based on **context**, not keywords
- Same word ("אוקיי") = different intents based on conversation stage

---

## 📝 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OPENAI_API_KEY` | ✅ | OpenAI API key | `sk-proj-xxx` |
| `TWILIO_ACCOUNT_SID` | ✅ | Twilio Account SID | `ACxxxx` |
| `TWILIO_AUTH_TOKEN` | ✅ | Twilio Auth Token | `abc123` |
| `TWILIO_PHONE_NUMBER` | ✅ | Your Twilio number | `+972501234567` |
| `SERVER_URL` | ✅ | Public ngrok URL | `https://xxx.ngrok.io` |
| `FFMPEG_PATH` | ⚠️ | Path to ffmpeg binary | `C:/ffmpeg/bin/ffmpeg.exe` |
| `TEST_PHONE` | ⚠️ | Phone for test script | `+972501234567` |

---

## 🎓 Learning Resources

- LangChain Docs: https://python.langchain.com/docs/get_started/introduction
- Twilio Voice: https://www.twilio.com/docs/voice
- OpenAI API: https://platform.openai.com/docs
- ffmpeg: https://ffmpeg.org/documentation.html

---

## 📄 License

MIT

---

## 👨‍💻 Author

Created as a home assignment for Alta AI Engineer position.
