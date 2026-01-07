# AI Sales Calling Agent

An AI-powered sales conversation agent that conducts sales conversations, pitches products, and books meetings.

## Quick Start

1. Install dependencies:
```bash
cd server && npm install
cd ../client && npm install
```

2. Set up environment variables in `server/.env`:
```bash
OPENAI_API_KEY=sk-your-key-here
ASSEMBLYAI_API_KEY=your-key-here
CARTESIA_API_KEY=your-key-here
```

3. Start the server:
```bash
cd server
npm run dev
```

4. Start the client (in a new terminal):
```bash
cd client
npm run dev
```

5. Open your browser to the client URL and start a conversation.

## Features

- Web-based voice conversations (no setup required)
- Natural voice conversations with real-time transcription
- Intelligent conversation flow with meeting booking
- Optional telephony integration via Twilio

## Documentation

- [Server Documentation](server/README.md) - Detailed setup and configuration
- [Client Documentation](client/README.md) - Client application details

## Project Structure

- `server/` - Backend server with AI agent and voice processing
- `client/` - React web application for voice conversations

