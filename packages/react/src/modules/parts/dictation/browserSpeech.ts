// The browser's own speech recognition, for an account without a transcription service: Chrome, Edge and
// Safari offer it, and Firefox does not yet. It writes the words while the visitor speaks; the whole
// transcript comes with each result. Chrome sends the voice to Google's recognition service. Its on-device
// recognition is left aside: asking whether a language is installed (`SpeechRecognition.available`)
// crashed Chromium's page on 23 November 2026.

interface RecognitionResultList {
  length: number;
  [index: number]: { isFinal: boolean; 0: { transcript: string } };
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: RecognitionResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionClass = new () => Recognition;

export function recognitionClass(): RecognitionClass | null {
  const scope = globalThis as { SpeechRecognition?: RecognitionClass; webkitSpeechRecognition?: RecognitionClass };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export interface SpeechHooks {
  onText(text: string): void;
  onError(code: string): void;
  onEnd(): void;
}

export interface BrowserSpeech {
  // Ends the listening; `onEnd` follows once the last words are written.
  stop(): void;
  cancel(): void;
}

function transcript(results: RecognitionResultList): string {
  let text = '';
  for (let index = 0; index < results.length; index += 1) {
    text += results[index][0].transcript;
  }
  return text.trim();
}

export function startBrowserSpeech(language: string, hooks: SpeechHooks): BrowserSpeech {
  const Recognition = recognitionClass();
  if (!Recognition) {
    throw new Error('The browser has no speech recognition');
  }
  const recognition = new Recognition();
  recognition.lang = language;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (event) => hooks.onText(transcript(event.results));
  recognition.onerror = (event) => hooks.onError(event.error);
  recognition.onend = () => hooks.onEnd();
  recognition.start();
  return { stop: () => recognition.stop(), cancel: () => recognition.abort() };
}
