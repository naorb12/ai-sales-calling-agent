import ffmpeg from "fluent-ffmpeg";
import { Readable, Writable } from "stream";

// Configure ffmpeg path for Windows
// If ffmpeg is in PATH, this won't be needed, but helps in Git Bash
const FFMPEG_PATH = process.env.FFMPEG_PATH || "ffmpeg";
ffmpeg.setFfmpegPath(FFMPEG_PATH);

/**
 * Convert μ-law audio (from Twilio) to WAV (for Whisper)
 */
export async function mulawToWav(mulawBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const inputStream = Readable.from(mulawBuffer);
    const outputStream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    });

    ffmpeg(inputStream)
      .inputFormat("mulaw")
      .inputOptions(["-ar", "8000", "-ac", "1"]) // 8kHz, mono
      .toFormat("wav")
      .audioCodec("pcm_s16le") // 16-bit PCM
      .on("error", (err) => reject(new Error(`μ-law→WAV failed: ${err.message}`)))
      .on("end", () => resolve(Buffer.concat(chunks)))
      .pipe(outputStream, { end: true });
  });
}

/**
 * Convert MP3 (from OpenAI TTS) to μ-law (for Twilio)
 * Returns raw μ-law audio data
 */
export async function mp3ToMulaw(mp3Buffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const inputStream = Readable.from(mp3Buffer);
    const outputStream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      },
    });

    ffmpeg(inputStream)
      .inputFormat("mp3")
      .toFormat("mulaw")
      .audioCodec("pcm_mulaw")
      .audioChannels(1) // mono
      .audioFrequency(8000) // 8kHz
      .on("error", (err) => reject(new Error(`MP3→μ-law failed: ${err.message}`)))
      .on("end", () => resolve(Buffer.concat(chunks)))
      .pipe(outputStream, { end: true });
  });
}
