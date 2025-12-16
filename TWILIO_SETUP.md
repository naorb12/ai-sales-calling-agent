# Twilio Setup & Testing Guide

## ✅ What's Built

The complete Twilio integration is ready:

- **`src/telephony/twilio-service.ts`** - Makes outbound calls
- **`src/telephony/call-handler.ts`** - Handles audio streams (STT → Pipeline → TTS)
- **`src/app.ts`** - Express server with WebSocket support

## 📋 Setup Steps

### 1. Install ffmpeg

**Required for audio conversion** (μ-law ↔ MP3/WAV).

See `FFMPEG_SETUP.md` for detailed instructions.

Quick check:
```bash
ffmpeg -version
```

If not installed, download from: https://ffmpeg.org/download.html

Add to `.env`:
```bash
FFMPEG_PATH=C:/path/to/ffmpeg.exe
```

### 2. Expose Your Local Server (ngrok)

Twilio needs a public URL to send webhooks. Use ngrok:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```

You'll get a URL like: `https://abc123.ngrok.io`

### 3. Update .env

Add your ngrok URL and ffmpeg path:

```bash
SERVER_URL=https://abc123.ngrok.io
FFMPEG_PATH=C:/path/to/ffmpeg.exe  # Windows path to ffmpeg
```

### 4. Start Server

```bash
npm run dev
```

## 🧪 Testing

### Option 1: Trigger Call via API

```bash
curl -X POST http://localhost:3000/api/call \
  -H "Content-Type: application/json" \
  -d '{
    "name": "דני",
    "phone": "+972-50-XXX-XXXX",
    "company": "TechCorp",
    "industry": "טכנולוגיה",
    "serverUrl": "https://YOUR-NGROK-URL.ngrok.io"
  }'
```

**Note**: On Twilio trial, `phone` must be verified in Twilio Console!

### Option 2: Test Script

```bash
npm run test:call
```

## 🔧 Current Limitations

### Audio Format Conversion

The current implementation has placeholders for audio conversion:
- **Twilio uses**: μ-law (8kHz, 8-bit)
- **OpenAI TTS outputs**: MP3
- **OpenAI Whisper expects**: MP3, WAV, etc.

**Status**: 
- ✅ Logic flow is complete
- ⚠️  Audio conversion needs proper implementation

**For Production**: Use `ffmpeg` or audio processing libraries:
- `fluent-ffmpeg` - Node wrapper for ffmpeg
- `node-audiocodecs` - Audio format conversion
- Or Twilio's Media Streams with different formats

## 📝 How It Works

```
1. POST /api/call with lead data
   ↓
2. Server calls Twilio: "Call this number"
   ↓
3. Twilio dials, person answers
   ↓
4. Twilio connects WebSocket to /media-stream
   ↓
5. Loop:
   - User speaks → Twilio → Server
   - Server: STT (Whisper)
   - Server: Process (Your Pipeline!)
   - Server: TTS (OpenAI)
   - Server → Twilio → User hears agent
   ↓
6. Call ends (TERMINATE stage)
   ↓
7. Book meeting if slot selected
```

## 🎯 Next Steps

1. **Test with mock audio first** (use test scripts)
2. **Implement proper audio conversion** (ffmpeg)
3. **Test with real call** (verify phone number in Twilio)
4. **Deploy** (Heroku, Railway, etc.)

## 💡 Tips

- **Latency matters**: Keep each step under 200ms for natural conversation
- **Error handling**: Calls can drop, handle gracefully
- **Logging**: Current logs show full conversation flow
- **Costs**: ~$0.01-0.02 per minute for calls

## 🐛 Troubleshooting

**"No audio playing"**
- Check audio format conversion
- Verify ngrok URL is correct in TwiML

**"Can't call number"**
- Verify number in Twilio Console (trial accounts)
- Check number format (+972...)

**"WebSocket not connecting"**
- Ensure ngrok is running
- Check WebSocket path matches: `/media-stream`

