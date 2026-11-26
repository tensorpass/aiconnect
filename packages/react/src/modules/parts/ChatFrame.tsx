// The frame every chat module shares: a header with the module's title, the account that answers
// and its buttons, then the conversation, then the question box, then the site's own line when it gives
// one. When the site takes attachments, files dropped anywhere on the frame join the question.

import type { ReactNode, RefObject } from 'react';
import { attachmentsOn } from '@tensorpass/aiconnect/attachments';
import { useAiConnect } from '../../AiConnectProvider.tsx';
import type { AiModuleProps } from '../types.ts';
import { AccountBadge } from './AccountBadge.tsx';
import { DropZone } from './attachments/DropZone.tsx';
import { useAttachments } from './attachments/useAttachments.ts';
import { Composer } from './Composer.tsx';
import { Conversation } from './Conversation.tsx';
import { CloseIcon, NewChatIcon } from './icons.tsx';
import { ModuleAnalytics } from './moduleAnalytics.ts';
import { ModuleFoot } from './ModuleFoot.tsx';
import type { ModuleChat } from './useModuleChat.ts';

export interface ChatFrameProps {
  module: AiModuleProps;
  chat: ModuleChat;
  title: string;
  titleId: string;
  fieldRef: RefObject<HTMLTextAreaElement | null>;
  onClose?: () => void;
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="aic-round" aria-label={label} title={label} onClick={onClick}>{children}</button>
  );
}

function FrameHeader({ chat, title, titleId, onClose }: Omit<ChatFrameProps, 'module' | 'fieldRef'>) {
  const { moduleMessages } = useAiConnect();
  const started = chat.turns.length > 0 || Boolean(chat.pendingQuestion);
  return (
    <header className="aic-head">
      <div className="aic-head-text">
        <h2 id={titleId} className="aic-head-title">{title}</h2>
        <AccountBadge live={chat.busy} />
      </div>
      {started ? (
        <RoundButton label={moduleMessages.newChat} onClick={chat.reset}><NewChatIcon /></RoundButton>
      ) : null}
      {onClose ? <RoundButton label={moduleMessages.close} onClick={onClose}><CloseIcon /></RoundButton> : null}
    </header>
  );
}

export function ChatFrame({ module, chat, fieldRef, ...header }: ChatFrameProps) {
  const { moduleMessages } = useAiConnect();
  const policy = module.attachments;
  const attachments = useAttachments(attachmentsOn(policy) ? policy : undefined);
  return (
    <ModuleAnalytics.Provider value={module.analytics}>
      <DropZone policy={attachments.policy} onFiles={attachments.add}>
        <FrameHeader chat={chat} {...header} />
        <Conversation chat={chat} intro={module.intro ?? moduleMessages.intro} suggestions={module.suggestions}
          toolLabels={module.toolLabels} renderToolResults={module.renderToolResults} />
        <Composer busy={chat.busy} placeholder={module.placeholder ?? moduleMessages.placeholder} onSend={chat.ask}
          onStop={chat.stop} fieldRef={fieldRef} attachments={attachments.policy ? attachments : undefined}
          reads={chat.reads} dictation={chat.dictation} voice={Boolean(policy) && policy?.voice !== false} />
        <ModuleFoot>{module.footer}</ModuleFoot>
      </DropZone>
    </ModuleAnalytics.Provider>
  );
}
