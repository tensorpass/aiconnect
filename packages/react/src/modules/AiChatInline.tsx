// A chat set inline in the page, where the site renders it, at the height of the
// `--aic-inline-height` token. Its conversation scrolls inside it.

import { useId, useRef } from 'react';
import { useAiConnect } from '../AiConnectProvider.tsx';
import { ChatFrame } from './parts/ChatFrame.tsx';
import { moduleClass } from './parts/moduleClass.ts';
import { useModuleChat } from './parts/useModuleChat.ts';
import { useModuleHandle } from './parts/useModuleHandle.ts';
import type { AiModuleProps } from './types.ts';

export type AiChatInlineProps = AiModuleProps;

export function AiChatInline({ ref, ...props }: AiChatInlineProps) {
  const { moduleMessages } = useAiConnect();
  const chat = useModuleChat(props);
  useModuleHandle(ref, chat.ask);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  return (
    <section className={moduleClass('inline', props.className)} dir={moduleMessages.dir}
      aria-labelledby={titleId}>
      <ChatFrame module={props} chat={chat} title={props.title ?? moduleMessages.title} titleId={titleId}
        fieldRef={fieldRef} />
    </section>
  );
}
