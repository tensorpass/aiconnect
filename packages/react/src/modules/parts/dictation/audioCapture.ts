// The microphone while the visitor dictates: the browser asks the visitor for it on the site's behalf, and the
// PCM worklet hands every 100 ms frame and its level to the dictation. Stopping releases the microphone, so
// the browser's recording light goes off; stopping again does nothing.

import { PCM_WORKLET_URL } from './pcmWorkletUrl.ts';

export interface CaptureHooks {
  onFrame(pcm: Int16Array, level: number): void;
}

export interface AudioCapture {
  stop(): void;
}

const MIC_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export async function startCapture({ onFrame }: CaptureHooks): Promise<AudioCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS });
  const context = new AudioContext();
  const release = () => {
    stream.getTracks().forEach((track) => track.stop());
    void context.close();
  };
  try {
    await context.audioWorklet.addModule(PCM_WORKLET_URL);
  } catch (error) {
    release();
    throw error;
  }
  const source = context.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(context, 'aiconnect-pcm');
  node.port.onmessage = ({ data }: MessageEvent<{ pcm: Int16Array; level: number }>) => onFrame(data.pcm, data.level);
  // The worklet writes no output, so the destination plays silence; the connection keeps the browser pulling it.
  source.connect(node).connect(context.destination);
  let stopped = false;
  return {
    stop: () => {
      if (stopped) {
        return;
      }
      stopped = true;
      node.port.onmessage = null;
      source.disconnect();
      node.disconnect();
      release();
    },
  };
}
