# AI Hebrew Sales Calling Agent

Hebrew AI calling agent built with LangChain's voice sandwich architecture for Alta's home assignment.

## Features

- 🤖 **LangChain Agent**: Uses `createReactAgent` with tools for calendar booking
- 🧠 **Smart Intent Classification**: LLM-based semantic understanding (not keywords)
- 🔄 **State Machine**: Deterministic stage transitions (INTRO → PITCH → BOOK_MEETING → END)
- 🇮🇱 **Hebrew Native**: All prompts, responses, and intent understanding in Hebrew
- 📞 **Twilio Integration**: Real telephony (Phase 3)
- 🎤 **OpenAI Whisper**: Hebrew speech-to-text (Phase 2)
- 🔊 **OpenAI TTS**: Hebrew text-to-speech (Phase 2)

## Architecture

Based on LangChain's "voice sandwich" pattern:

```
Audio → STT (Whisper) → Agent (LangChain) → TTS (OpenAI) → Audio
                             ↓
                    State Machine (rules.ts)
                             ↓
                    Intent Classification (LLM)
```

## Project Structure

```
src/
├── agent/
│   ├── agent.ts           # LangChain agent with tools
│   ├── prompts.ts         # Hebrew prompts per stage
│   └── tools.ts           # Calendar & knowledge base tools
├── call/
│   ├── intents.ts         # Intent enum
│   ├── stages.ts          # Stage enum
│   ├── rules.ts           # State machine logic
│   ├── intent-classifier.ts  # LLM-based intent classification
│   └── pipeline.ts        # Main orchestrator
├── config.ts              # Environment configuration
└── types.ts               # TypeScript interfaces
```

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

3. **Build:**
```bash
npm run build
```

## Testing

### Phase 1: Text-Only Testing (Current)

Test the complete conversation flow with text I/O (no audio):

```bash
npm run test:conversation
```

This interactive test allows you to:
- Type as the lead (in Hebrew)
- See agent responses
- Watch intent classification in real-time
- Track stage transitions
- Test the full INTRO → PITCH → BOOK_MEETING → END flow

**Example conversation:**

```
🤖 Agent: שלום דני! אני קורא מאלתא. אנחנו עוזרים לחברות כמו שלך לחסוך זמן במכירות עם אוטומציה חכמה. יש לך דקה קצרה?

👤 You: כן, ספר לי עוד

🧠 Intent: INTERESTED
🔄 Stage: INTRO → PITCH

🤖 Agent: מעולה! אז בקצרה - Alta זה כמו עוזר AI שעושה בשבילך את כל הדברים החוזרים במכירות...
```

### Phase 2: Audio Testing (Next)

Add speech-to-text and text-to-speech:
- Test with audio files
- Validate Hebrew transcription accuracy
- Test TTS voice quality

### Phase 3: Telephony Testing (Final)

Real phone calls via Twilio:
- Make actual calls
- End-to-end conversation
- Calendar integration

## How It Works

### 1. Agent Creation

Simple LangChain agent with tools:

```typescript
const agent = createReactAgent({
  llm: model,
  tools: [checkCalendarTool, knowledgeBaseTool],
  checkpointer: new MemorySaver(),
  messageModifier: HEBREW_SYSTEM_PROMPT
});
```

### 2. Intent Classification

LLM semantically understands Hebrew intent:

```typescript
const intent = await classifyIntent(userSpeech, stage, history);
// Returns: INTERESTED | NOT_INTERESTED | ASK_MORE_INFO | ACCEPTION | OBJECTION | UNCLEAR
```

**Not keyword-based!** The LLM understands:
- "אני עסוק עכשיו" → NOT_INTERESTED (polite refusal)
- "כמה זה עולה?" in INTRO → ASK_MORE_INFO
- "כמה זה עולה?" in BOOK_MEETING → OBJECTION

### 3. State Machine

Your deterministic logic in `rules.ts`:

```typescript
const nextStage = nextStage(currentStage, intent, repeatCount);
```

Controls the conversation flow based on intent.

### 4. Tools

- **check_calendar**: Mock calendar (checks availability, books meetings)
- **knowledge_base**: Alta product information

Both tools work in Hebrew and return Hebrew responses.

## Key Design Decisions

1. **Text-First Development**: Validate logic before adding complexity
2. **Application Controls Flow**: State machine drives stages, AI is a tool
3. **Semantic Intent Understanding**: LLM-based, not pattern matching
4. **Hebrew Native**: All prompts and understanding in Hebrew
5. **Composable Architecture**: Clean separation of concerns

## Budget Tracking

Total budget: $50

**Phase 1 (Text Testing):**
- OpenAI API (GPT-4): ~$5-10

**Phase 2 (Audio):**
- Whisper STT: ~$5
- OpenAI TTS: ~$5

**Phase 3 (Telephony):**
- Twilio: ~$10
- Testing calls: ~$20

## Next Steps

- [x] Phase 1: Text-only agent + pipeline + state machine
- [ ] Phase 2: Add STT/TTS streams
- [ ] Phase 3: Twilio integration
- [ ] Real Google Calendar integration
- [ ] Analytics and logging
- [ ] Production deployment

## License

MIT

