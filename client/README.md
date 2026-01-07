# AI Sales Calling Agent - Client

React client application for the AI Sales Calling Agent. Provides a web-based voice interface for conducting sales conversations.

## Features

- Web-based voice conversation interface
- Real-time speech-to-text transcription
- Agent response display
- Company and lead configuration forms
- Voice test dialog

## Tech Stack

- React + TypeScript
- Vite
- WebSocket for real-time communication
- Web Audio API for microphone capture and audio playback

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (optional, defaults to localhost):
```bash
VITE_SERVER_URL=http://localhost:3000
```

3. Start development server:
```bash
npm run dev
```

4. Open browser to the displayed URL (typically `http://localhost:5173`)

## Usage

1. Configure company details (company name and description)
2. Enter lead information (name, phone, email, company, industry)
3. Start a voice conversation
4. The agent will respond in real-time

The client connects to the server via WebSocket and streams audio for processing. No additional setup or configuration is required beyond the server running.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.
