export interface AudioCapture {
  start: (onChunk: (chunk: ArrayBuffer) => void) => Promise<void>;
  stop: () => void;
}

export function createAudioCapture(): AudioCapture {
  let audioContext: AudioContext | null = null;
  let workletNode: AudioWorkletNode | null = null;
  let mediaStream: MediaStream | null = null;

  async function start(onChunk: (chunk: ArrayBuffer) => void): Promise<void> {
    // Create AudioContext if needed
    if (!audioContext) {
      audioContext = new AudioContext();
      // Load AudioWorklet from public directory
      await audioContext.audioWorklet.addModule("/pcm-processor.js");
    }

    // Resume if suspended
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    // Get microphone access
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Create worklet node and connect
    const source = audioContext.createMediaStreamSource(mediaStream);
    workletNode = new AudioWorkletNode(audioContext, "pcm-processor");

    workletNode.port.onmessage = (event) => {
      onChunk(event.data);
    };

    source.connect(workletNode);
  }

  function stop(): void {
    if (workletNode) {
      workletNode.disconnect();
      workletNode = null;
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
  }

  return { start, stop };
}

