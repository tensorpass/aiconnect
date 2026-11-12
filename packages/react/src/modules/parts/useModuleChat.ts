// The conversation a module runs: the chat on the visitor's AI with the site's tools, plus the
// question a visitor asks before their AI is connected. That question opens the connect window and
// stays on screen; it goes out on its own once the wallet connects the site.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { McpToolSource } from '@tensorpass/aiconnect';
import type { ConnectionState, GuardPolicy, ToolSource } from '@tensorpass/aiconnect';
import { useAiConnect } from '../../AiConnectProvider.tsx';
import { useAiChat } from '../../useAiChat.ts';

export interface ModuleChatOptions {
  system: string;
  tools?: ToolSource;
  mcp?: string;
  guards?: GuardPolicy;
}

// The states in which the connection is still settling on its own, without the visitor.
const SETTLING = new Set<ConnectionState['status']>(['checking', 'connecting']);

// The site's MCP tools, connected on the first question. The module also renders on the server,
// where a relative address has no page to resolve against.
function mcpTools(url: string): ToolSource {
  let source: McpToolSource | null = null;
  const connected = () => {
    source ??= new McpToolSource(url);
    return source;
  };
  return {
    listTools: () => connected().listTools(),
    callTool: (name, args) => connected().callTool(name, args),
  };
}

// The states in which asking a question asks the wallet to connect.
const READY_TO_CONNECT = new Set<ConnectionState['status']>(['disconnected', 'error']);

// Keeps the question asked before the connection and sends it once the site is connected. Asking is
// the visitor's one action: it asks the wallet to connect at once, or as soon as the first wallet
// check ends, and without the wallet the module's own install step shows with the question kept.
function usePendingQuestion(send: (question: string) => Promise<void>) {
  const { client } = useAiConnect();
  const pending = useRef<string | null>(null);
  const connectAfterCheck = useRef(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  const keep = useCallback((question: string | null) => {
    pending.current = question;
    setPendingQuestion(question);
  }, []);

  useEffect(() => client.subscribe((next) => {
    const question = pending.current;
    if (question === null || SETTLING.has(next.status)) {
      return;
    }
    const afterCheck = connectAfterCheck.current;
    connectAfterCheck.current = false;
    if (next.status === 'connected') {
      keep(null);
      void send(question);
    } else if (afterCheck && next.status === 'disconnected') {
      void client.connect();
    }
  }), [client, keep, send]);

  const ask = useCallback((question: string) => {
    const text = question.trim();
    if (!text) {
      return;
    }
    const { status } = client.state;
    if (status === 'connected') {
      void send(text);
      return;
    }
    keep(text);
    if (READY_TO_CONNECT.has(status)) {
      void client.connect();
    } else if (status === 'checking') {
      connectAfterCheck.current = true;
    }
  }, [client, keep, send]);

  const forget = useCallback(() => keep(null), [keep]);
  return { pendingQuestion, ask, forget };
}

export function useModuleChat({ system, tools, mcp, guards }: ModuleChatOptions) {
  const toolSource = useMemo(() => tools ?? (mcp ? mcpTools(mcp) : undefined), [tools, mcp]);
  const chat = useAiChat({ system, tools: toolSource, guards });
  const { pendingQuestion, ask, forget } = usePendingQuestion(chat.send);
  // The turns the visitor stopped, by their place in the conversation.
  const [stopped, setStopped] = useState<number[]>([]);
  const { turns, stop: stopChat, reset: resetChat, busy } = chat;

  const stop = useCallback(() => {
    if (busy) {
      setStopped((current) => [...current, turns.length - 1]);
    }
    stopChat();
  }, [busy, turns.length, stopChat]);

  const reset = useCallback(() => {
    resetChat();
    forget();
    setStopped([]);
  }, [resetChat, forget]);

  const retry = useCallback(() => {
    const last = turns.at(-1);
    if (last) {
      ask(last.question);
    }
  }, [turns, ask]);

  return { ...chat, ask, stop, reset, retry, pendingQuestion, stopped };
}

export type ModuleChat = ReturnType<typeof useModuleChat>;
