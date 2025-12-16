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
  filename: string = "audio.wav"
): Promise<string> {
  // Convert Buffer to Uint8Array for Blob compatibility
  const uint8Array = new Uint8Array(audioBuffer);
  
  // Determine MIME type from filename
  const mimeType = filename.endsWith('.wav') ? 'audio/wav' : 
                   filename.endsWith('.mp3') ? 'audio/mpeg' :
                   filename.endsWith('.m4a') ? 'audio/m4a' : 'audio/wav';
  
  const blob = new Blob([uint8Array], { type: mimeType });
  const file = new File([blob], filename, { type: mimeType });

  const transcription = await openai.audio.transcriptions.create({
    file: file,
    model: "whisper-1",
    language: "he",
  });

  return transcription.text;
}

