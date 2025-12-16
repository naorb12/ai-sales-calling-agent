import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { tools } from "./tools.js";
import { config } from "../config.js";

/**
 * Create the OpenAI model instance
 */
export const model = new ChatOpenAI({
  model: "gpt-4.1-mini",
  temperature: 0.3,
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
export const agent = createReactAgent({
  llm: model,
  tools,
  checkpointer: new MemorySaver(),
});

export type AgentType = typeof agent;

