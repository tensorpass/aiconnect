// Dictation: the visitor speaks, the transcription service of the account that answers writes the words,
// and the words land in the question field for the visitor to correct before sending. The page records
// 16 kHz mono PCM and hands it to the wallet in frames; the wallet sends it to the account's service and
// streams the words back. A `live` account writes the words while they are spoken, a `file` account
// transcribes the recording once it ends.

export const DICTATION_SAMPLE_RATE = 16_000;

// The words written so far, the words of a finished utterance, or the transcription failing while the
// visitor still speaks, with the wallet's HTTP status: a 429 says the site used its dictation of the day on
// that account, and the page may go on with the browser's own recognition.
export type DictationEvent =
  | { kind: 'partial' | 'final'; text: string }
  | { kind: 'error'; message: string; status?: number };

export interface DictationRequest {
  // The visitor's language as a BCP 47 tag, such as `he-IL` or `ar-MA`.
  language: string;
}

export interface DictationSession {
  // A frame of 16-bit PCM samples at 16 kHz.
  sendFrame(pcm: Int16Array): void;
  // Ends the recording and resolves with the whole transcript.
  finish(): Promise<string>;
}

export type DictationStart = (
  request: DictationRequest, onEvent: (event: DictationEvent) => void, signal?: AbortSignal,
) => DictationSession;

// The dictation of the account that answers, as the connection gives it to the interface.
export interface Dictation {
  mode: 'live' | 'file';
  start: DictationStart;
}
