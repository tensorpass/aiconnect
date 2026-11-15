// Holds the AiConnect client for a React tree, the copy of the connect window and of the interface
// modules in the page's language, and renders the connect window when it is open.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { AiConnect, ConnectionState } from '@tensorpass/aiconnect';
import { ConnectModal } from './ConnectModal.tsx';
import { builtInMessages, builtInModuleMessages } from './messages.ts';
import type { Locale, ModuleMessages, PickerMessages } from './messages.ts';
import { builtInWebMessages } from './webAccountMessages.ts';
import type { WebAccountMessages } from './webAccountMessages.ts';

interface AiConnectContextValue {
  client: AiConnect;
  state: ConnectionState;
  messages: PickerMessages;
  moduleMessages: ModuleMessages;
  webMessages: WebAccountMessages;
  isPickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
}

const AiConnectContext = createContext<AiConnectContextValue | null>(null);

// The server cannot see the visitor's wallet, so the page hydrates checking and shows the
// connection right after.
const SERVER_STATE: ConnectionState = { status: 'checking' };

export interface AiConnectProviderProps {
  client: AiConnect;
  locale?: Locale;
  messages?: PickerMessages;
  moduleMessages?: ModuleMessages;
  webMessages?: WebAccountMessages;
  children: ReactNode;
}

export function AiConnectProvider(props: AiConnectProviderProps) {
  const { client, locale = 'en', messages, moduleMessages, webMessages, children } = props;
  const state = useSyncExternalStore(
    (listener) => client.subscribe(listener),
    () => client.state,
    () => SERVER_STATE,
  );
  const [isPickerOpen, setPickerOpen] = useState(false);
  const openPicker = useCallback(() => setPickerOpen(true), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  // The window closes once the wallet connects the site.
  useEffect(() => client.subscribe((next) => {
    if (next.status === 'connected') {
      setPickerOpen(false);
    }
  }), [client]);

  const value = useMemo(() => ({
    client,
    state,
    messages: messages ?? builtInMessages[locale],
    moduleMessages: moduleMessages ?? builtInModuleMessages[locale],
    webMessages: webMessages ?? builtInWebMessages[locale],
    isPickerOpen,
    openPicker,
    closePicker,
  }), [client, state, messages, moduleMessages, webMessages, locale, isPickerOpen, openPicker, closePicker]);

  return (
    <AiConnectContext.Provider value={value}>
      {children}
      {isPickerOpen ? <ConnectModal /> : null}
    </AiConnectContext.Provider>
  );
}

export function useAiConnect(): AiConnectContextValue {
  const value = useContext(AiConnectContext);
  if (!value) {
    throw new Error('useAiConnect must be used inside AiConnectProvider');
  }
  return value;
}
