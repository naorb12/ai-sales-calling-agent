# AI Sales Calling Agent

An AI-powered sales conversation agent that conducts natural voice conversations, pitches products, and books meetings. Built with modern web technologies, it provides a seamless browser-based experience for testing and deploying sales automation.

## Overview

This project consists of a full-stack application that enables AI-driven sales conversations through voice interfaces. The agent uses advanced language models to understand context, handle objections, and guide conversations toward booking meetings. It supports both web-based voice conversations (requiring no additional setup) and telephony integration via Twilio.

## Key Features

**Web Voice Interface**
- Browser-based voice conversations with real-time audio streaming
- No additional setup or configuration required
- Works directly in modern web browsers

**Intelligent Conversation Flow**
- Context-aware intent classification using semantic understanding
- State machine-driven conversation stages (INTRO → PITCH → BOOK_MEETING → END)
- Smart objection handling with graceful conversation management

**Meeting Booking**
- Automatic calendar slot detection
- Meeting scheduling with calendar integration
- Email invitations sent automatically

**Voice Processing**
- Real-time speech-to-text transcription (AssemblyAI)
- High-quality text-to-speech synthesis (Cartesia)
- Natural conversation flow with low latency

**Optional Telephony Integration**
- Outbound calling via Twilio
- Phone number support for production deployments
- Requires additional local configuration (ngrok, ffmpeg)

## Architecture

The application is split into two main components:

- **Server** (`server/`): Node.js backend with Express and WebSocket support
  - AI agent powered by LangChain and Llama 3.3 70B (via Groq)
  - GPT-4o for intent classification, slot extraction, and fallback
  - Voice processing pipeline (STT/TTS)
  - Conversation state management
  - Calendar service integration
  - Telephony handlers for Twilio

- **Client** (`client/`): React web application
  - Voice conversation interface
  - Real-time transcription display
  - Company and lead configuration forms
  - WebSocket communication with server

## How It Works

1. **Configuration**: User configures company details and lead information through the web interface
2. **Voice Session**: Client establishes WebSocket connection and starts audio capture
3. **Speech Recognition**: Audio is streamed to AssemblyAI for real-time transcription
4. **Intent Processing**: Transcribed text is analyzed by the AI agent to determine intent and context
5. **Response Generation**: Agent generates appropriate response based on conversation stage and history
6. **Speech Synthesis**: Response text is converted to audio using Cartesia TTS
7. **Audio Playback**: Synthesized audio is streamed back to the client for playback
8. **Meeting Booking**: When a meeting is agreed upon, the system books it in the calendar

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express, WebSocket
- **AI**: LangChain, Llama 3.3 70B (via Groq) for main agent, GPT-4o for classification and fallback
- **Voice**: AssemblyAI (STT), Cartesia (TTS)
- **Telephony**: Twilio (optional)
- **Calendar**: Google Calendar API

## Quick Start

### Prerequisites

- Node.js v18 or higher
- Groq API key (for Llama agent)
- OpenAI API key (for GPT-4o classification, fallback, and telephony)
- AssemblyAI API key
- Cartesia API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd ai-sales-calling-agent
```

2. Install dependencies:
```bash
cd server && npm install
cd ../client && npm install
```

3. Set up environment variables in `server/.env`:
```bash
GROQ_API_KEY=your-groq-key-here
OPENAI_API_KEY=sk-your-key-here
ASSEMBLYAI_API_KEY=your-key-here
CARTESIA_API_KEY=your-key-here
```

4. Start the server:
```bash
cd server
npm run dev
```

5. Start the client (in a new terminal):
```bash
cd client
npm run dev
```

6. Open your browser to the client URL (typically `http://localhost:5173`)

7. Configure company details and lead information, then start a voice conversation

## Use Cases

- **Sales Demo**: Test and demonstrate AI sales capabilities
- **Lead Qualification**: Automate initial lead conversations
- **Meeting Booking**: Streamline appointment scheduling
- **Training**: Practice sales conversations with AI feedback
- **Integration**: Embed voice sales agent into existing platforms

## Documentation

For detailed information, see:

- [Server Documentation](server/README.md) - Complete setup guide, API details, and configuration
- [Client Documentation](client/README.md) - Client application setup and usage

## Project Structure

```
ai-sales-calling-agent/
├── server/          # Backend server
│   ├── src/
│   │   ├── agent/   # LangChain agent and prompts
│   │   ├── call/    # Conversation pipeline and state management
│   │   ├── voice/   # Speech processing (STT/TTS)
│   │   ├── telephony/ # Twilio integration
│   │   └── services/ # Calendar and external services
│   └── README.md
├── client/          # React web application
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── voice/      # Voice session management
│   │   └── audio/      # Audio capture and playback
│   └── README.md
└── README.md        # This file
```

## License

MIT
