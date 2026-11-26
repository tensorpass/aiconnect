// The conversation of a chat module. Empty, it shows its heading, the suggested questions, then the
// connection step, under the wallet's ring in the full page mode. The step appears once the first wallet
// check ends, so it comes last and the heading and the questions the page rendered stay in place. Then
// each turn shows the visitor's question with its files, the site's tools as they run, the answer as it
// streams and the site's own result cards, and the last answer's error comes with a way to ask again,
// or, for a TensorPass account without a plan, the offer to subscribe. The view follows the answer down
// while the visitor stays at the bottom.

import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { useAiConnect } from '../../AiConnectProvider.tsx';
import { ConnectRing } from '../../ConnectRing.tsx';
import type { PreparedAttachment } from '@tensorpass/aiconnect/attachments';
import type { ChatTurn } from '../../useAiChat.ts';
import type { AiModuleProps } from '../types.ts';
import { AnswerText } from './AnswerText.tsx';
import { QuestionAttachments } from './attachments/AttachmentRows.tsx';
import { ConnectStep } from './ConnectStep.tsx';
import { PlanOffer } from './PlanOffer.tsx';
import { useActionAttribute } from './moduleAnalytics.ts';
import { ArrowIcon, WaveIcon } from './icons.tsx';
import { ToolActivityList } from './ToolActivity.tsx';
import type { ModuleChat } from './useModuleChat.ts';

export type TurnView = Pick<AiModuleProps, 'toolLabels' | 'renderToolResults'>;

export interface TurnBodyProps {
  turn: ChatTurn;
  live: boolean;
  stopped: boolean;
  view: TurnView;
  linkAllowed: (href: string) => boolean;
  // Every file the visitor added up to this turn.
  attachments: PreparedAttachment[];
}

// The plan gateway's refusal of a TensorPass account without a subscription.
const PLAN_INACTIVE = 'plan_inactive';

// How close to the bottom, in pixels, the visitor counts as following the answer.
const FOLLOW_DISTANCE = 56;

interface QuestionProps {
  text: string;
  attachments?: PreparedAttachment[];
  // The images and pages the answering model did not read.
  unread?: number;
}

function Question({ text, attachments, unread }: QuestionProps) {
  const { moduleMessages, state } = useAiConnect();
  const account = state.status === 'connected' ? state.providerName : '';
  return (
    <>
      {attachments?.length ? <QuestionAttachments attachments={attachments} /> : null}
      {text ? (
        <p className="aic-question" dir="auto">
          <span className="aic-visually-hidden">{moduleMessages.question}: </span>{text}
        </p>
      ) : null}
      {unread ? (
        <p className="aic-unread">
          {moduleMessages.unreadPages.replaceAll('{count}', String(unread)).replaceAll('{account}', account)}
        </p>
      ) : null}
    </>
  );
}

// What a turn shows under its question: the tools as they run, a thinking line until the first
// words arrive, the answer, whether the visitor stopped it, and the site's own result cards.
export function TurnBody({ turn, live, stopped, view, linkAllowed, attachments }: TurnBodyProps) {
  const { moduleMessages } = useAiConnect();
  const toolRunning = turn.tools.some((activity) => activity.result === null);
  const results = view.renderToolResults?.(turn, { attachments });
  return (
    <>
      <ToolActivityList tools={turn.tools} labels={view.toolLabels} />
      {live && !turn.answer && !toolRunning ? (
        <p className="aic-thinking"><WaveIcon size={16} className="aic-live-arcs" />{moduleMessages.thinking}</p>
      ) : null}
      <AnswerText text={turn.answer} streaming={live && Boolean(turn.answer)} linkAllowed={linkAllowed}
        blocked={Boolean(turn.blocked)} />
      {stopped ? <p className="aic-stopped"><i aria-hidden="true" />{moduleMessages.stopped}</p> : null}
      {results ? <div className="aic-results">{results}</div> : null}
    </>
  );
}

export function Suggestions({ items, onPick }: { items?: string[]; onPick: (question: string) => void }) {
  const { moduleMessages } = useAiConnect();
  const tracking = useActionAttribute('suggestion');
  if (!items?.length) {
    return null;
  }
  return (
    <ul className="aic-suggestions" aria-label={moduleMessages.suggestionsLabel}>
      {items.map((question) => (
        <li key={question}>
          <button type="button" className="aic-suggestion" onClick={() => onPick(question)} {...tracking}>
            <span>{question}</span><ArrowIcon />
          </button>
        </li>
      ))}
    </ul>
  );
}

// Keeps the log scrolled to its end while the visitor reads at the bottom, and lets them scroll up.
// An empty conversation stays at its top, where its heading is.
function useFollowAnswer(logRef: RefObject<HTMLDivElement | null>, chat: ModuleChat) {
  const following = useRef(true);
  const asked = chat.turns.length + (chat.pendingQuestion ? 1 : 0);
  useEffect(() => {
    following.current = true;
  }, [asked]);
  useEffect(() => {
    const log = logRef.current;
    if (log && asked > 0 && following.current) {
      log.scrollTop = log.scrollHeight;
    }
  });
  return () => {
    const log = logRef.current;
    if (log) {
      following.current = log.scrollHeight - log.scrollTop - log.clientHeight < FOLLOW_DISTANCE;
    }
  };
}

// For each turn, every file the visitor added up to it, oldest first.
export function attachmentsSoFar(turns: ChatTurn[]): PreparedAttachment[][] {
  const added: PreparedAttachment[] = [];
  return turns.map((turn) => {
    added.push(...(turn.attachments ?? []));
    return [...added];
  });
}

export interface ConversationProps extends TurnView {
  chat: ModuleChat;
  intro: string;
  suggestions?: string[];
}

export function Conversation({ chat, intro, suggestions, ...view }: ConversationProps) {
  const { moduleMessages } = useAiConnect();
  const logRef = useRef<HTMLDivElement>(null);
  const onScroll = useFollowAnswer(logRef, chat);
  const attachments = useMemo(() => attachmentsSoFar(chat.turns), [chat.turns]);
  const empty = chat.turns.length === 0 && !chat.pendingQuestion;
  return (
    <div ref={logRef} className="aic-log" role="log" aria-busy={chat.busy} onScroll={onScroll}>
      {empty ? (
        <div className="aic-empty">
          <div className="aic-empty-ring"><ConnectRing live={false} /></div>
          <h3 className="aic-intro">{intro}</h3>
          <Suggestions items={suggestions} onPick={chat.ask} />
          <ConnectStep pending={false} />
        </div>
      ) : null}
      <ol className="aic-turns">
        {chat.turns.map((turn, index) => (
          <li key={index} className="aic-turn">
            <Question text={turn.question} attachments={turn.attachments} unread={turn.unread} />
            <TurnBody turn={turn} view={view} stopped={chat.stopped.includes(index)} linkAllowed={chat.linkAllowed}
              live={chat.busy && index === chat.turns.length - 1} attachments={attachments[index]} />
          </li>
        ))}
        {chat.pendingQuestion ? (
          <li className="aic-turn">
            <Question text={chat.pendingQuestion.text} attachments={chat.pendingQuestion.attachments} />
            <ConnectStep pending />
          </li>
        ) : null}
      </ol>
      {chat.refusal === PLAN_INACTIVE ? <PlanOffer onActive={chat.retry} /> : null}
      {chat.error && chat.refusal !== PLAN_INACTIVE ? (
        <div className="aic-error" role="alert">
          <p>{chat.error}</p>
          <button type="button" className="aic-text-button" onClick={chat.retry}>{moduleMessages.retry}</button>
        </div>
      ) : null}
    </div>
  );
}
