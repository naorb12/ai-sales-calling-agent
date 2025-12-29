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

/**
 * Convert PCM audio (from web client) to WAV (for Whisper)
 * Creates WAV file manually - no ffmpeg needed!
 * @param buffer - Raw PCM audio buffer (16-bit, mono)
 * @param sampleRate - Sample rate of input PCM (typically 16000)
 */
export async function pcmToWav(buffer: Buffer, sampleRate: number): Promise<Buffer> {
  const numChannels = 1; // mono
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = buffer.length;
  const fileSize = 36 + dataSize;

  // Create WAV header
  const header = Buffer.alloc(44);
  
  // RIFF header
  header.write("RIFF", 0);
  header.writeUInt32LE(fileSize, 4);
  header.write("WAVE", 8);
  
  // fmt chunk
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // audio format (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  
  // data chunk
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  // Combine header + PCM data
  return Buffer.concat([header, buffer]);
}

/**
 * Convert MP3 (from OpenAI TTS) to PCM (for web playback)
 * @param mp3Buffer - MP3 audio buffer from OpenAI
 * @param targetSampleRate - Target sample rate (typically 16000)
 * @returns Raw PCM audio buffer (16-bit, mono)
 */
export async function mp3ToPcm(mp3Buffer: Buffer, targetSampleRate: number): Promise<Buffer> {
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
      .toFormat("s16le") // 16-bit little-endian PCM
      .audioCodec("pcm_s16le")
      .audioChannels(1) // mono
      .audioFrequency(targetSampleRate)
      .on("error", (err) => reject(new Error(`MP3→PCM failed: ${err.message}`)))
      .on("end", () => resolve(Buffer.concat(chunks)))
      .pipe(outputStream, { end: true });
  });
}