// The visitor's question box: it grows with the text, sends with Enter (Shift and Enter add a line) and
// turns its send button into Stop while the answer streams. When the site takes attachments, it shows the
// question's files above the text, takes files pasted into it, and offers the attach button; when the site
// takes voice, its microphone button turns the box into the dictation bar, whose transcript lands in the text.

import { useEffect, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, FormEvent, KeyboardEvent, RefObject } from 'react';
import type { Dictation, ReadableParts } from '@tensorpass/aiconnect';
import type { PreparedAttachment } from '@tensorpass/aiconnect/attachments';
import { useAiConnect } from '../../AiConnectProvider.tsx';
import { AttachButton } from './attachments/AttachButton.tsx';
import { ComposerAttachments } from './attachments/AttachmentRows.tsx';
import type { Attachments } from './attachments/useAttachments.ts';
import { DictationBar } from './dictation/DictationBar.tsx';
import { MicButton, useVoiceAvailable } from './dictation/MicButton.tsx';
import { useDictation } from './dictation/useDictation.ts';
import { SendIcon } from './icons.tsx';
import { useActionAttribute } from './moduleAnalytics.ts';

export interface ComposerProps {
  busy: boolean;
  placeholder: string;
  onSend: (question: string, attachments: PreparedAttachment[]) => void;
  onStop: () => void;
  fieldRef: RefObject<HTMLTextAreaElement | null>;
  // The question's files, when the site takes attachments.
  attachments?: Attachments;
  reads?: ReadableParts;
  // The account's dictation, and whether the site takes voice.
  dictation?: Dictation | null;
  voice?: boolean;
}

// The tallest the box grows before it scrolls, in pixels.
const MAX_FIELD_HEIGHT = 168;

// Fits the box to its text, rounded up to a whole pixel so a single line never shows a scrollbar, and
// lets it scroll once the text is taller than the box may grow.
export function fitHeight(field: HTMLTextAreaElement | null): void {
  if (!field) {
    return;
  }
  field.style.height = 'auto';
  const needed = Math.ceil(field.scrollHeight);
  field.style.height = `${Math.min(needed, MAX_FIELD_HEIGHT)}px`;
  field.style.overflowY = needed > MAX_FIELD_HEIGHT ? 'auto' : 'hidden';
}

export function StopButton({ onStop }: { onStop: () => void }) {
  const { moduleMessages } = useAiConnect();
  return (
    <button type="button" className="aic-stop" onClick={onStop}>
      <i aria-hidden="true" />{moduleMessages.stop}
    </button>
  );
}

type QuestionTextOptions = Pick<ComposerProps, 'busy' | 'onSend' | 'fieldRef' | 'attachments'>;

// The text of the question box and its keys: Enter sends unless an answer is streaming or a file is still
// read, and the box shrinks back once the question is sent. A dictation's transcript joins the text.
function useQuestionText({ busy, onSend, fieldRef, attachments }: QuestionTextOptions) {
  const [text, setText] = useState('');
  const ready = attachments?.ready ?? [];
  const canSend = !busy && !attachments?.reading && (Boolean(text.trim()) || ready.length > 0);
  const submit = () => {
    if (!canSend) {
      return;
    }
    onSend(text, ready);
    setText('');
    attachments?.clear();
    if (fieldRef.current) {
      fieldRef.current.style.height = '';
      fieldRef.current.style.overflowY = '';
    }
  };
  return {
    text,
    canSend,
    insert: (words: string) => setText((current) => [current.trimEnd(), words].filter(Boolean).join(' ')),
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

// Files pasted into the box join the question; the pasted text, if any, goes in the box as usual.
function pasteHandler(attachments: Attachments | undefined) {
  return (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = [...event.clipboardData.files];
    if (!attachments || files.length === 0) {
      return;
    }
    attachments.add(files);
    if (!event.clipboardData.types.includes('text/plain')) {
      event.preventDefault();
    }
  };
}

export function Composer(props: ComposerProps) {
  const { busy, placeholder, onStop, fieldRef, attachments, reads, dictation } = props;
  const { moduleMessages } = useAiConnect();
  const question = useQuestionText(props);
  const voice = useDictation(dictation ?? null, question.insert);
  const voiceOn = useVoiceAvailable(dictation, props.voice);
  const tracking = useActionAttribute('send');
  const dictating = voice.status !== 'idle';
  // Back from the dictation bar, the box takes the focus and the height of its text.
  useEffect(() => {
    if (!dictating && fieldRef.current && fieldRef.current.value) {
      fitHeight(fieldRef.current);
      fieldRef.current.focus();
    }
  }, [dictating, fieldRef]);
  const note = attachments?.note ?? voice.error;
  return (
    <form className="aic-composer" onSubmit={question.onSubmit}>
      {note ? <p className="aic-composer-note" role="alert">{note}</p> : null}
      <div className="aic-field" data-dictating={dictating || undefined}>
        {attachments && reads ? <ComposerAttachments attachments={attachments} reads={reads} /> : null}
        {dictating ? <DictationBar dictation={voice} /> : (
          <>
            {attachments?.policy ? <AttachButton policy={attachments.policy} onFiles={attachments.add} /> : null}
            <textarea ref={fieldRef} className="aic-field-input" rows={1} dir="auto" value={question.text}
              placeholder={placeholder} aria-label={placeholder} onKeyDown={question.onKeyDown}
              onChange={question.onChange} onPaste={pasteHandler(attachments)} />
            {voiceOn && !busy ? <MicButton onClick={() => void voice.start()} /> : null}
            {busy ? <StopButton onStop={onStop} /> : (
              <button type="submit" className="aic-send" disabled={!question.canSend} aria-label={moduleMessages.send}
                {...tracking}>
                <SendIcon />
              </button>
            )}
          </>
        )}
      </div>
    </form>
  );
}
