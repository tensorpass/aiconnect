// A search bar that answers. The visitor types a question in the site's search bar, and the answer
// streams in a card under it, with the tools it ran, the site's own result cards and the account
// that answers. Each search starts a new conversation; Escape or the bar's clear button empties the
// bar and the answer.

import { useId, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useAiConnect } from '../AiConnectProvider.tsx';
import { AccountBadge } from './parts/AccountBadge.tsx';
import { StopButton } from './parts/Composer.tsx';
import { ConnectNote } from './parts/ConnectNote.tsx';
import { Suggestions, TurnBody } from './parts/Conversation.tsx';
import type { TurnView } from './parts/Conversation.tsx';
import { ArrowIcon, CloseIcon, SearchIcon } from './parts/icons.tsx';
import { ModuleAnalytics } from './parts/moduleAnalytics.ts';
import { moduleClass } from './parts/moduleClass.ts';
import { useModuleChat } from './parts/useModuleChat.ts';
import { useModuleHandle } from './parts/useModuleHandle.ts';
import type { ModuleChat } from './parts/useModuleChat.ts';
import type { AiModuleProps } from './types.ts';

export type AiSearchProps = Omit<AiModuleProps, 'title' | 'intro'>;

// The answer's card: the answer, or the connection step while the question waits for it, then the
// account that answers once the visitor's AI is connected.
function SearchResult(view: TurnView & { chat: ModuleChat }) {
  const { chat } = view;
  const { state, moduleMessages } = useAiConnect();
  const turn = chat.turns.at(-1);
  if (!turn && !chat.pendingQuestion) {
    return null;
  }
  return (
    <div className="aic-search-result" role="region" aria-live="polite" aria-busy={chat.busy}>
      {turn ? (
        <TurnBody turn={turn} view={view} live={chat.busy} stopped={chat.stopped.includes(chat.turns.length - 1)}
          linkAllowed={chat.linkAllowed} />
      ) : <ConnectNote pending compact />}
      {chat.error ? (
        <div className="aic-error" role="alert">
          <p>{chat.error}</p>
          <button type="button" className="aic-text-button" onClick={chat.retry}>{moduleMessages.retry}</button>
        </div>
      ) : null}
      {state.status === 'connected' ? (
        <footer className="aic-search-foot"><AccountBadge live={chat.busy} /></footer>
      ) : null}
    </div>
  );
}

// The search bar's text and keys: Enter searches, starting a new conversation, and Escape or the
// clear button empties the bar and the answer.
function useSearchBar(chat: ModuleChat) {
  const [text, setText] = useState('');
  const search = (question: string) => {
    setText(question);
    chat.reset();
    chat.ask(question);
  };
  const clear = () => {
    setText('');
    chat.reset();
  };
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (text.trim()) {
      search(text);
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && text) {
      event.preventDefault();
      clear();
    }
  };
  return { text, setText, search, clear, onSubmit, onKeyDown };
}

type SearchBarProps = Pick<AiSearchProps, 'placeholder' | 'analytics'> & {
  bar: ReturnType<typeof useSearchBar>;
  chat: ModuleChat;
  started: boolean;
};

// The field with its buttons: clear once there is something to clear, which hands the field back
// for the next question, then send, or Stop while the answer streams.
function SearchBar({ bar, chat, started, placeholder, analytics }: SearchBarProps) {
  const { moduleMessages } = useAiConnect();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const sendTracking = analytics ? { 'data-analytics': `${analytics}-send` } : {};
  const clear = () => {
    bar.clear();
    input.current?.focus();
  };
  return (
    <form className="aic-search-bar" role="search" onSubmit={bar.onSubmit}>
      <label htmlFor={inputId} className="aic-visually-hidden">{moduleMessages.searchLabel}</label>
      <SearchIcon />
      <input ref={input} id={inputId} className="aic-search-input" type="search" enterKeyHint="search"
        autoComplete="off" value={bar.text} placeholder={placeholder ?? moduleMessages.searchPlaceholder}
        onKeyDown={bar.onKeyDown} onChange={(event) => bar.setText(event.target.value)} />
      {(bar.text || started) && !chat.busy ? (
        <button type="button" className="aic-search-clear" onClick={clear} aria-label={moduleMessages.clear}>
          <CloseIcon />
        </button>
      ) : null}
      {chat.busy ? <StopButton onStop={chat.stop} /> : (
        <button type="submit" className="aic-send" disabled={!bar.text.trim()} aria-label={moduleMessages.send}
          {...sendTracking}>
          <ArrowIcon />
        </button>
      )}
    </form>
  );
}

export function AiSearch({ ref, ...props }: AiSearchProps) {
  const { moduleMessages } = useAiConnect();
  const chat = useModuleChat(props);
  const bar = useSearchBar(chat);
  useModuleHandle(ref, bar.search);
  const started = chat.turns.length > 0 || Boolean(chat.pendingQuestion);
  return (
    <ModuleAnalytics.Provider value={props.analytics}>
      <div className={moduleClass('search', props.className)} dir={moduleMessages.dir}>
        <SearchBar bar={bar} chat={chat} started={started} placeholder={props.placeholder}
          analytics={props.analytics} />
        {started ? (
          <SearchResult chat={chat} toolLabels={props.toolLabels} renderToolResults={props.renderToolResults} />
        ) : <Suggestions items={props.suggestions} onPick={bar.search} />}
      </div>
    </ModuleAnalytics.Provider>
  );
}
