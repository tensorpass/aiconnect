// The question field while the visitor dictates: a live waveform drawn from the microphone's level, the
// time spoken, the words as the transcription writes them, Cancel, and Done, which puts the transcript in
// the field. Escape cancels without closing the module.

import type { KeyboardEvent } from 'react';
import { useAiConnect } from '../../../AiConnectProvider.tsx';
import { CheckIcon, CloseIcon } from '../icons.tsx';
import { WAVE_BARS } from './useDictation.ts';
import type { DictationState } from './useDictation.ts';

// A level of 0.25 or more fills the bar; speech sits well under full scale.
const FULL_LEVEL = 0.25;

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function Waveform({ levels }: { levels: number[] }) {
  const bars = [...Array.from({ length: WAVE_BARS - levels.length }, () => 0), ...levels];
  return (
    <span className="aic-wave" aria-hidden="true">
      {bars.map((level, index) => (
        <i key={index} style={{ transform: `scaleY(${Math.max(0.08, Math.min(1, level / FULL_LEVEL))})` }} />
      ))}
    </span>
  );
}

export function DictationBar({ dictation }: { dictation: DictationState }) {
  const { moduleMessages } = useAiConnect();
  const transcribing = dictation.status === 'transcribing';
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      dictation.cancel();
    }
  };
  return (
    <div className="aic-dictation" data-status={dictation.status} onKeyDown={onKeyDown}>
      <div className="aic-dictation-live" role="status">
        <span className="aic-visually-hidden">
          {transcribing ? moduleMessages.transcribing : moduleMessages.dictating}
        </span>
        {dictation.partial ? <p className="aic-dictation-words" dir="auto">{dictation.partial}</p> : null}
        <span className="aic-dictation-meter">
          <Waveform levels={dictation.levels} />
          <span className="aic-dictation-time" aria-hidden="true">
            {transcribing ? moduleMessages.transcribing : clock(dictation.seconds)}
          </span>
        </span>
      </div>
      <button type="button" className="aic-tool-button" aria-label={moduleMessages.dictationCancel}
        title={moduleMessages.dictationCancel} onClick={dictation.cancel}>
        <CloseIcon />
      </button>
      <button type="button" className="aic-send" aria-label={moduleMessages.dictationStop}
        title={moduleMessages.dictationStop} disabled={transcribing} onClick={() => void dictation.stop()} autoFocus>
        <CheckIcon />
      </button>
    </div>
  );
}
