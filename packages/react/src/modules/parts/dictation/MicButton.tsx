// The microphone button that starts dictation, and whether the visitor can dictate here: a microphone, and
// the account's transcription or the browser's recognition. The check runs in the browser only, so a server
// render and its hydration agree.

import { useSyncExternalStore } from 'react';
import type { Dictation } from '@tensorpass/aiconnect';
import { useAiConnect } from '../../../AiConnectProvider.tsx';
import { MicIcon } from '../icons.tsx';
import { useActionAttribute } from '../moduleAnalytics.ts';
import { dictationAvailable } from './useDictation.ts';

const noSubscription = () => () => undefined;

export function useVoiceAvailable(dictation: Dictation | null | undefined, voice: boolean | undefined): boolean {
  const available = () => Boolean(voice) && dictationAvailable(dictation ?? null);
  return useSyncExternalStore(noSubscription, available, () => false);
}

export function MicButton({ onClick }: { onClick: () => void }) {
  const { moduleMessages } = useAiConnect();
  const tracking = useActionAttribute('voice');
  return (
    <button type="button" className="aic-tool-button" aria-label={moduleMessages.dictate} title={moduleMessages.dictate}
      onClick={onClick} {...tracking}>
      <MicIcon />
    </button>
  );
}
