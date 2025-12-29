export interface AudioPlayback {
  push: (audioBase64: string, format?: string) => void;
  stop: () => void;
  resetScheduling: () => void;
  setPlaybackFinishedCallback: (callback: (() => void) | undefined) => void;
}

interface QueuedAudio {
  base64: string;
  format?: string;
}

export function createAudioPlayback(): AudioPlayback {
  let audioContext: AudioContext | null = null;
  let nextPlayTime = 0;
  let sourceQueue: AudioBufferSourceNode[] = [];
  let audioQueue: QueuedAudio[] = [];
  let isProcessing = false;
  let onPlaybackFinished: (() => void) | undefined;

  function ensureContext(): AudioContext {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    return audioContext;
  }

  function base64ToArrayBuffer(base64: string): ArrayBuffer {
    try {
      const binaryData = atob(base64);
      const arrayBuffer = new ArrayBuffer(binaryData.length);
      const uint8Array = new Uint8Array(arrayBuffer);

      for (let i = 0; i < binaryData.length; i++) {
        uint8Array[i] = binaryData.charCodeAt(i);
      }

      return arrayBuffer;
    } catch (error) {
      console.error("Error converting base64 to ArrayBuffer:", error);
      throw error;
    }
  }

  function schedulePlaySource(source: AudioBufferSourceNode): void {
    source.start(nextPlayTime);
    source.addEventListener("ended", () => sourceEnded(source));
  }

  function sourceEnded(source: AudioBufferSourceNode): void {
    const index = sourceQueue.indexOf(source);
    if (index > -1) {
      sourceQueue.splice(index, 1);
    }
    
    // If this was the last source and queue is empty, notify that playback finished
    if (sourceQueue.length === 0 && audioQueue.length === 0) {
      onPlaybackFinished?.();
    }
  }

  async function processQueue(): Promise<void> {
    if (isProcessing) return;
    isProcessing = true;

    while (audioQueue.length > 0) {
      const item = audioQueue.shift();
      if (!item) break;

      const ctx = ensureContext();

      try {
        const arrayBuffer = base64ToArrayBuffer(item.base64);
        
        // Verify we have data
        if (arrayBuffer.byteLength === 0) {
          continue;
        }

        // Browser decodes MP3/WAV automatically using decodeAudioData
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

        if (!audioBuffer || audioBuffer.length === 0) {
          continue;
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        sourceQueue.push(source);

        // If we've fallen behind, catch up to current time
        if (nextPlayTime < ctx.currentTime) {
          nextPlayTime = ctx.currentTime;
        }

        schedulePlaySource(source);
        nextPlayTime += audioBuffer.duration;
      } catch (error) {
        console.error("Error decoding audio:", error);
        // Continue with next item
      }
    }

    isProcessing = false;
  }

  function push(audioBase64: string, format?: string): void {
    audioQueue.push({ base64: audioBase64, format });
    processQueue();
  }

  function stop(): void {
    audioQueue = [];

    for (const source of sourceQueue) {
      try {
        source.stop();
      } catch {
        // Ignore if already stopped
      }
    }
    sourceQueue = [];
    nextPlayTime = 0;
  }

  function resetScheduling(): void {
    nextPlayTime = 0;
  }

  function setPlaybackFinishedCallback(callback: (() => void) | undefined): void {
    onPlaybackFinished = callback;
  }

  return {
    push,
    stop,
    resetScheduling,
    setPlaybackFinishedCallback,
  };
}

