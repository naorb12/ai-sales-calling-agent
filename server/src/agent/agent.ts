import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { tools } from "./tools.js";
import { config } from "../config.js";


const primaryModel = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0.3,
  timeout: 30000, // 30 second timeout
  maxRetries: 2,
  apiKey: config.groq.apiKey,
});

const secondaryModel = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.3,
  timeout: 30000,
  maxRetries: 2,
  apiKey: config.openai.apiKey,
});

/**
 * Create the LangChain agent with tools and memory
 * 
 * Note: We don't use a static messageModifier here because we use
 * stage-specific ChatPromptTemplates in pipeline.ts that are dynamically
 * formatted based on the current stage (INTRO, PITCH, BOOK_MEETING, END).
 * 
 * Each stage has its own focused prompt with relevant instructions.
 */

const checkpointer = new MemorySaver();

export const primaryAgent = createReactAgent({
  llm: primaryModel,
  tools,
  checkpointer,
});

export const secondaryAgent = createReactAgent({
  llm: secondaryModel,
  tools: [],
  checkpointer,
});

export type AgentType = typeof primaryAgent;

