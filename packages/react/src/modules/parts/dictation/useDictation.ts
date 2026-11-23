// Dictation in a module, as in Claude's and ChatGPT's apps: the visitor speaks, the words appear while they
// speak where the transcription writes them live, and once the visitor stops, the transcript lands in the
// question field for them to correct and send. The transcription service of the account that answers writes
// the words; without one, the browser's speech recognition does. The microphone gives the waveform and the
// timer either way, and the recording ends on its own after 15 seconds of silence or 2 minutes.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Dictation, DictationEvent } from '@tensorpass/aiconnect';
import type { ModuleMessages } from '../../../messages.ts';
import { useAiConnect } from '../../../AiConnectProvider.tsx';
import { startCapture } from './audioCapture.ts';
import { recognitionClass, startBrowserSpeech } from './browserSpeech.ts';
import { dictationLanguage } from './dictationLanguage.ts';
import { countFrame, handOver, newRecording, releaseRecording, spokenSeconds } from './recording.ts';
import type { Recording } from './recording.ts';

export type DictationStatus = 'idle' | 'listening' | 'transcribing';

// The levels the waveform draws, the newest last.
export const WAVE_BARS = 40;

export interface DictationView {
  status: DictationStatus;
  partial: string;
  levels: number[];
  seconds: number;
}

const IDLE: DictationView = { status: 'idle', partial: '', levels: [], seconds: 0 };

// Whether this browser can dictate: a microphone, and the account's transcription or the browser's recognition.
export function dictationAvailable(dictation: Dictation | null): boolean {
  const microphone = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
  return microphone && (dictation !== null || recognitionClass() !== null);
}

// The reason a dictation fails when the site used its dictation of the day and the browser has no recognition.
const LIMIT_REACHED = 'limit-reached';

function failureText(reason: unknown, copy: ModuleMessages): string {
  if (reason === LIMIT_REACHED) {
    return copy.dictationLimit;
  }
  const name = (reason as { name?: string } | null)?.name;
  const denied = name === 'NotAllowedError' || name === 'SecurityError' || reason === 'not-allowed';
  return denied ? copy.micDenied : copy.dictationFailed;
}

// What the bar shows while the visitor dictates, and the words written so far.
function useDictationView() {
  const [view, setView] = useState<DictationView>(IDLE);
  const written = useRef('');
  const write = useCallback((text: string) => {
    written.current = text;
    setView((current) => ({ ...current, partial: text }));
  }, []);
  const level = useCallback((value: number, seconds: number) => setView((current) => ({
    ...current, seconds, levels: [...current.levels.slice(1 - WAVE_BARS), value],
  })), []);
  const status = useCallback((next: DictationStatus) => setView((current) => ({ ...current, status: next })), []);
  const reset = useCallback(() => {
    written.current = '';
    setView(IDLE);
  }, []);
  return { view, written, write, level, status, reset };
}

interface OpenOptions {
  dictation: Dictation | null;
  language: string;
  onFrame: (pcm: Int16Array, level: number) => void;
  write: (text: string) => void;
  fail: (reason: unknown) => void;
}

function listenInBrowser(recording: Recording, { language, write, fail }: OpenOptions): void {
  recording.speech = startBrowserSpeech(language, {
    onText: write,
    onError: (code) => (code === 'no-speech' ? undefined : fail(code)),
    onEnd: recording.markEnded,
  });
}

// The account's transcription. A site that used its dictation of the day on the account (429) goes on with
// the browser's recognition where the browser has one.
function onAccountEvent(recording: Recording, options: OpenOptions) {
  return (event: DictationEvent) => {
    if (event.kind !== 'error') {
      options.write(event.text);
    } else if (event.status === 429 && recognitionClass()) {
      handOver(recording);
      listenInBrowser(recording, options);
    } else {
      options.fail(event.status === 429 ? LIMIT_REACHED : new Error(event.message));
    }
  };
}

// Opens the microphone, then the account's transcription or the browser's recognition.
async function openRecording(recording: Recording, options: OpenOptions) {
  recording.capture = await startCapture({ onFrame: options.onFrame });
  const { dictation, language } = options;
  if (dictation) {
    recording.session = dictation.start({ language }, onAccountEvent(recording, options), recording.controller.signal);
    recording.markEnded();
    return;
  }
  listenInBrowser(recording, options);
}

// The whole transcript once the recording stopped: the account's, or the browser's last words.
async function transcriptOf(recording: Recording, written: RefObject<string>): Promise<string> {
  recording.speech?.stop();
  if (recording.session) {
    return recording.session.finish();
  }
  await recording.ended;
  return written.current;
}

// The recording that runs and how it ends: released, or failed with the words that say why. Leaving the page
// releases the microphone.
function useRecordingEnd(recordingRef: RefObject<Recording | null>, reset: () => void) {
  const { moduleMessages } = useAiConnect();
  const [error, setError] = useState<string | null>(null);
  const end = useCallback(() => {
    releaseRecording(recordingRef.current);
    recordingRef.current = null;
    reset();
  }, [recordingRef, reset]);
  const fail = useCallback((reason: unknown) => {
    end();
    setError(failureText(reason, moduleMessages));
  }, [end, moduleMessages]);
  useEffect(() => () => releaseRecording(recordingRef.current), [recordingRef]);
  return { error, setError, end, fail };
}

export function useDictation(dictation: Dictation | null, onFinal: (text: string) => void) {
  const { locale } = useAiConnect();
  const { view, written, write, level, status, reset } = useDictationView();
  const recording = useRef<Recording | null>(null);
  const { error, setError, end, fail } = useRecordingEnd(recording, reset);
  const autoStop = useRef<() => void>(() => undefined);
  const onFrame = useCallback((pcm: Int16Array, value: number) => {
    const current = recording.current;
    if (!current) {
      return;
    }
    current.session?.sendFrame(pcm);
    const ending = countFrame(current, value);
    level(value, spokenSeconds(current));
    if (ending) {
      autoStop.current();
    }
  }, [level]);

  const start = useCallback(async () => {
    if (recording.current) {
      return;
    }
    setError(null);
    status('listening');
    const current = newRecording();
    recording.current = current;
    const options = { dictation, language: dictationLanguage(locale, navigator.languages), onFrame, write, fail };
    await openRecording(current, options).catch(fail);
    if (current.controller.signal.aborted) {
      releaseRecording(current);
    }
  }, [setError, dictation, locale, onFrame, write, fail, status]);

  // Stops listening and puts the whole transcript in the field.
  const stop = useCallback(async () => {
    const current = recording.current;
    if (!current || current.stopping) {
      return;
    }
    current.stopping = true;
    current.capture?.stop();
    status('transcribing');
    const text = await transcriptOf(current, written).catch((reason: unknown) => {
      fail(reason);
      return null;
    });
    // A recording the visitor cancelled while it was transcribed writes nothing.
    if (text !== null && recording.current === current) {
      end();
      onFinal(text.trim());
    }
  }, [onFinal, end, fail, status, written]);

  useEffect(() => {
    autoStop.current = () => void stop();
  }, [stop]);

  return { ...view, error, start, stop, cancel: end, dismissError: () => setError(null) };
}

export type DictationState = ReturnType<typeof useDictation>;
