import OpenAI from "openai";
import { config } from "../config.js";
import * as fs from "fs";

const openai = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * Convert Hebrew speech to text using OpenAI Whisper
 */
export async function speechToText(audioFilePath: string): Promise<string> {
  const audioFile = fs.createReadStream(audioFilePath);

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    language: "he", // Hebrew
  });

  return transcription.text;
}

/**
 * Convert audio buffer to text (for streaming use cases like Twilio)
 */
export async function speechToTextFromBuffer(
  audioBuffer: Buffer,
  filename: string = "audio.mp3"
): Promise<string> {
  // Convert Buffer to Uint8Array for Blob compatibility
  const uint8Array = new Uint8Array(audioBuffer);
  const blob = new Blob([uint8Array], { type: "audio/mpeg" });
  const file = new File([blob], filename, { type: "audio/mpeg" });

  const transcription = await openai.audio.transcriptions.create({
    file: file,
    model: "whisper-1",
    language: "he",
  });

  return transcription.text;
}

