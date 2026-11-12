// The visitor's question box: it grows with the text, sends with Enter (Shift and Enter add a line)
// and turns its send button into Stop while the answer streams.

import { useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent, RefObject } from 'react';
import { useAiConnect } from '../../AiConnectProvider.tsx';
import { SendIcon } from './icons.tsx';
import { useActionAttribute } from './moduleAnalytics.ts';

export interface ComposerProps {
  busy: boolean;
  placeholder: string;
  onSend: (question: string) => void;
  onStop: () => void;
  fieldRef: RefObject<HTMLTextAreaElement | null>;
}

// The tallest the box grows before it scrolls, in pixels.
const MAX_FIELD_HEIGHT = 168;

function fitHeight(field: HTMLTextAreaElement | null): void {
  if (!field) {
    return;
  }
  field.style.height = 'auto';
  field.style.height = `${Math.min(field.scrollHeight, MAX_FIELD_HEIGHT)}px`;
}

export function StopButton({ onStop }: { onStop: () => void }) {
  const { moduleMessages } = useAiConnect();
  return (
    <button type="button" className="aic-stop" onClick={onStop}>
      <i aria-hidden="true" />{moduleMessages.stop}
    </button>
  );
}

// The text of the question box and its keys: Enter sends unless an answer is streaming, and the box
// shrinks back once the question is sent.
function useQuestionText({ busy, onSend, fieldRef }: Pick<ComposerProps, 'busy' | 'onSend' | 'fieldRef'>) {
  const [text, setText] = useState('');
  const submit = () => {
    if (busy || !text.trim()) {
      return;
    }
    onSend(text);
    setText('');
    if (fieldRef.current) {
      fieldRef.current.style.height = '';
    }
  };
  return {
    text,
    onChange: (event: ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
      fitHeight(event.target);
    },
    onSubmit: (event: FormEvent) => {
      event.preventDefault();
      submit();
    },
    onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        submit();
      }
    },
  };
}

export function Composer({ busy, placeholder, onSend, onStop, fieldRef }: ComposerProps) {
  const { moduleMessages } = useAiConnect();
  const { text, onChange, onSubmit, onKeyDown } = useQuestionText({ busy, onSend, fieldRef });
  const tracking = useActionAttribute('send');
  return (
    <form className="aic-composer" onSubmit={onSubmit}>
      <div className="aic-field">
        <textarea ref={fieldRef} className="aic-field-input" rows={1} value={text} placeholder={placeholder}
          aria-label={placeholder} onKeyDown={onKeyDown} onChange={onChange} />
        {busy ? <StopButton onStop={onStop} /> : (
          <button type="submit" className="aic-send" disabled={!text.trim()} aria-label={moduleMessages.send}
            {...tracking}>
            <SendIcon />
          </button>
        )}
      </div>
    </form>
  );
}
