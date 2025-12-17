# 🚀 Quick Start Guide (5 Minutes)

For developers who want to get up and running ASAP.

## Prerequisites Checklist

- [ ] Node.js v18+ installed
- [ ] ffmpeg installed and in PATH
- [ ] ngrok installed and authenticated
- [ ] OpenAI API key
- [ ] Twilio account with phone number

## Speed Run

```bash
# 1. Install dependencies
npm install

# 2. Create .env (copy from .env.example)
cp .env.example .env

# 3. Fill in .env with your keys:
# - OPENAI_API_KEY
# - TWILIO_ACCOUNT_SID
# - TWILIO_AUTH_TOKEN
# - TWILIO_PHONE_NUMBER
# - TEST_PHONE (your verified number)
# - FFMPEG_PATH (if Windows)

# 4. Start ngrok (Terminal 1)
ngrok http 3000
# Copy the https:// URL to .env as SERVER_URL

# 5. Start server (Terminal 2)
npm run dev

# 6. Make test call (Terminal 3)
npm run test:call
```

## First Call Conversation

```
Agent: "היי [שם], אני סוכן AI מאלתא..."
You: "אוקיי"

Agent: [Pitch about Alta]
You: "מעניין, בוא נקבע פגישה"

Agent: [Offers times]
You: "מחר בשתיים"

Agent: [Confirms]
You: "תודה"
[Call ends]
```

## Troubleshooting

**No audio?**
→ Check ffmpeg: `ffmpeg -version`

**Call doesn't connect?**
→ Verify phone number in Twilio Console (trial accounts)

**Agent doesn't respond?**
→ Check OpenAI API key and credits

---

For detailed setup, see [README.md](README.md)


