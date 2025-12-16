import OpenAI from "openai";
import { config } from "../config.js";
import { numbersToHebrew } from "../utils/hebrew-numbers.js";

const openai = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * Convert Hebrew text to speech using OpenAI TTS with retry logic
 */
export async function textToSpeech(text: string, retries = 3): Promise<Buffer> {
  // Convert numbers to Hebrew words for better pronunciation
  const hebrewText = numbersToHebrew(text);
  
  if (text !== hebrewText) {
    console.log(`🔢 Converted: "${text.substring(0, 50)}..." → "${hebrewText.substring(0, 50)}..."`);
  }
  
  for (let i = 0; i < retries; i++) {
    try {
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy", // Good for Hebrew
        input: hebrewText, // Use converted text
      });

      return Buffer.from(await mp3.arrayBuffer());
    } catch (error) {
      const isLastRetry = i === retries - 1;
      
      // If it's a 503 or rate limit, retry after a short delay
      if (!isLastRetry && error instanceof Error) {
        const delay = Math.min(1000 * Math.pow(2, i), 5000); // 1s, 2s, 4s max
        console.log(`⏳ TTS retry ${i + 1}/${retries} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Last retry or non-retryable error
      throw error;
    }
  }
  
  throw new Error("TTS failed after retries");
}
