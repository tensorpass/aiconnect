// A conversation run by one of the AI SDKs, answered through the wallet. Each question is a run of
// the chosen SDK's own tool loop; the turns show the streamed answer and the tool calls as they
// happen, in the shape of `useAiChat`'s turns. Stop aborts the SDK, which stops the wallet's answer.

import { useCallback, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ToolCall } from '@tensorpass/aiconnect';
import { useAiConnect } from '@tensorpass/aiconnect-react';
import type { ChatTurn } from '@tensorpass/aiconnect-react';
import type { SdkRun, SdkRunner } from './sdkRun.ts';

type TurnHooks = Pick<SdkRun, 'onText' | 'onToolCall' | 'onToolResult'>;

function lastTurnHooks(setTurns: Dispatch<SetStateAction<ChatTurn[]>>): TurnHooks {
  const update = (change: (turn: ChatTurn) => ChatTurn) => setTurns((turns) => [
    ...turns.slice(0, -1), change(turns.at(-1)!),
  ]);
  return {
    onText: (delta) => update((turn) => ({ ...turn, answer: turn.answer + delta })),
    onToolCall: (call) => update((turn) => ({ ...turn, tools: [...turn.tools, { call, result: null }] })),
    onToolResult: (call: ToolCall, result) => update((turn) => ({
      ...turn, tools: turn.tools.map((activity) => (activity.call.id === call.id ? { call, result } : activity)),
    })),
  };
}

export function useSdkChat(runner: SdkRunner, system: string) {
  const { client, state } = useAiConnect();
  const abort = useRef<AbortController | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (question: string) => {
    const text = question.trim();
    if (!text) {
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);
    setTurns((current) => [...current, { question: text, answer: '', tools: [] }]);
    try {
      const hooks = lastTurnHooks(setTurns);
      await runner({ aiconnect: client, system, question: text, signal: controller.signal, ...hooks });
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(reason instanceof Error ? reason.message : String(reason));
      }
    } finally {
      setBusy(false);
    }
  }, [client, runner, system]);

  const stop = useCallback(() => abort.current?.abort(), []);

  return { turns, send, stop, busy, error, connected: state.status === 'connected' };
}
