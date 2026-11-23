// One recording while the visitor dictates: the microphone, the account's transcription or the browser's
// recognition, the frames counted for the timer and the silence, and the moment the recognition wrote its
// last words. Releasing it stops all of them, the microphone first.

import type { DictationSession } from '@tensorpass/aiconnect';
import type { AudioCapture } from './audioCapture.ts';
import type { BrowserSpeech } from './browserSpeech.ts';

export interface Recording {
  capture: AudioCapture | null;
  session: DictationSession | null;
  speech: BrowserSpeech | null;
  controller: AbortController;
  frames: number;
  silent: number;
  stopping: boolean;
  // Resolved once the transcription has its last words: at once for the account's, at the end of the
  // browser's recognition.
  ended: Promise<void>;
  markEnded: () => void;
}

const FRAMES_PER_SECOND = 10;
const MAX_FRAMES = 120 * FRAMES_PER_SECOND;
const SILENT_FRAMES = 15 * FRAMES_PER_SECOND;
const SILENCE_LEVEL = 0.01;

// Counts a 100 ms frame for the timer and the silence; true once the recording ends on its own, after 2
// minutes or 15 seconds of silence.
export function countFrame(recording: Recording, level: number): boolean {
  recording.frames += 1;
  recording.silent = level < SILENCE_LEVEL ? recording.silent + 1 : 0;
  return recording.frames >= MAX_FRAMES || recording.silent >= SILENT_FRAMES;
}

export function spokenSeconds(recording: Recording): number {
  return Math.floor(recording.frames / FRAMES_PER_SECOND);
}

function endOf(): Pick<Recording, 'ended' | 'markEnded'> {
  let markEnded: () => void = () => undefined;
  const ended = new Promise<void>((resolve) => {
    markEnded = resolve;
  });
  return { ended, markEnded };
}

export function newRecording(): Recording {
  return {
    capture: null, session: null, speech: null, controller: new AbortController(), frames: 0, silent: 0,
    stopping: false, ...endOf(),
  };
}

// The recording goes on with the browser's recognition in place of the account's transcription, whose
// words end with the recognition's own end.
export function handOver(recording: Recording): void {
  recording.session = null;
  Object.assign(recording, endOf());
}

export function releaseRecording(recording: Recording | null): void {
  if (!recording) {
    return;
  }
  recording.capture?.stop();
  recording.controller.abort();
  recording.speech?.cancel();
}
