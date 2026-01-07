import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Knowledge base tool for Alta product information
 */
export const knowledgeBaseTool = tool(
  async ({ question }) => {
    // Mock knowledge base - replace with real data later
    const knowledge: Record<string, string> = {
      pricing: "Alta offers flexible pricing based on company size. Starting from $500/month for small teams.",
      integration:
        "Alta integrates with: Salesforce, HubSpot, Pipedrive, Monday.com and more. Setup takes less than an hour.",
      features: "CRM update automation, automatic lead scoring and classification, smart follow-up and scheduling, reports and analytics.",
      competitors: "Unlike other solutions, Alta is tailored for the market and integrates with local processes.",
      setup: "Setup is simple: connect to CRM, configure basic rules, and the system starts working. Full support is available.",
    };

    const lowerQuestion = question.toLowerCase();
    for (const [key, answer] of Object.entries(knowledge)) {
      if (lowerQuestion.includes(key) || lowerQuestion.includes(answer.substring(0, 20))) {
        return answer;
      }
    }

    return "I don't have specific information about that right now. I'd be happy to schedule a meeting with our experts who can answer any questions.";
  },
  {
    name: "knowledge_base",
    description: "Get information about Alta - pricing, integrations, features, and competitor comparison",
    schema: z.object({
      question: z.string().describe("The question that needs to be answered"),
    }),
  }
);

export const tools = [knowledgeBaseTool];

