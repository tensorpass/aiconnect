// A conversation with the visitor's own model, using the site's tools. The site renders `turns`:
// what the visitor asked, the answer as it streams, and every tool call with its raw result, so
// tool results can be shown as the site's own cards. `stop` ends the answer in the wallet too, and
// the turn keeps the text streamed so far. Every conversation runs under its guards, tuned with
// `guards`: a question or an answer they stop shows the site's safe answer in its place, and
// `linkAllowed` tells the interface which links of an answer it may draw.

import { useCallback, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { createChatGuard, GuardStop, runConversation } from '@tensorpass/aiconnect';
import type {
  ChatGuard, ChatMessage, ConversationHooks, GuardPolicy, ProviderSession, ToolCall, ToolSource,
} from '@tensorpass/aiconnect';
import { useAiConnect } from './AiConnectProvider.tsx';
import { failedAnswerText } from './messages.ts';
import type { ModuleMessages } from './messages.ts';

export interface ToolActivity {
  call: ToolCall;
  result: string | null;
  // False for a tool the site keeps out of the `visibleTools` of its guards, whose activity the
  // interface does not show.
  visible?: boolean;
}

export interface ChatTurn {
  question: string;
  answer: string;
  tools: ToolActivity[];
  // The guard stopped the question before it left the page, or the answer as it came; `answer` then
  // holds the site's safe answer.
  blocked?: 'question' | 'answer';
}

export interface UseAiChatOptions {
  system: string;
  tools?: ToolSource;
  // The site's own values for the guards every conversation runs under, read at the conversation's first
  // question.
  guards?: GuardPolicy;
}

// Before the first question there is no answer, so no link to draw.
const NO_LINKS = () => false;

function updateLast(turns: ChatTurn[], change: (turn: ChatTurn) => ChatTurn): ChatTurn[] {
  return [...turns.slice(0, -1), change(turns.at(-1)!)];
}

// Writes the conversation's progress into the last turn, as the answer streams and the tools run.
// A conversation that was stopped writes nothing more, so a question sent right after it keeps its
// own turn.
function lastTurnHooks(
  setTurns: Dispatch<SetStateAction<ChatTurn[]>>, signal: AbortSignal, guard: ChatGuard,
): ConversationHooks {
  const updateTurn = (change: (turn: ChatTurn) => ChatTurn) => {
    if (!signal.aborted) {
      setTurns((current) => updateLast(current, change));
    }
  };
  return {
    onText: (delta) => updateTurn((turn) => ({ ...turn, answer: turn.answer + delta })),
    onToolCall: (call) => updateTurn((turn) => ({
      ...turn, tools: [...turn.tools, { call, result: null, visible: guard.toolVisible(call.name) }],
    })),
    onToolResult: (call, result) => updateTurn((turn) => ({
      ...turn, tools: turn.tools.map((activity) => (activity.call.id === call.id ? { ...activity, result } : activity)),
    })),
  };
}

interface QuestionRun {
  session: ProviderSession;
  tools?: ToolSource;
  guard: ChatGuard;
  transcript: RefObject<ChatMessage[]>;
  asked: ChatMessage;
  controller: AbortController;
  setTurns: Dispatch<SetStateAction<ChatTurn[]>>;
}

// Runs one question on the visitor's model and keeps the exchange in the transcript. A question that
// was stopped or failed adds nothing to it.
async function answerQuestion({ session, tools, guard, transcript, asked, controller, setTurns }: QuestionRun) {
  const added = await runConversation({
    session,
    tools,
    guard,
    messages: [...transcript.current, asked],
    signal: controller.signal,
    ...lastTurnHooks(setTurns, controller.signal, guard),
  });
  transcript.current = [...transcript.current, asked, ...added];
}

// Shows the safe answer in place of what a guard stopped: the site's own, or the module's words for a
// stopped question or answer. A stopped answer stays in the transcript as the safe answer, so the model
// reads the exchange without the text it should not have written; a stopped question never reaches it.
function showStop(stop: GuardStop, run: QuestionRun, copy: ModuleMessages) {
  const safeAnswer = run.guard.policy.safeAnswer ?? (stop.stage === 'question' ? copy.guardQuestion : copy.guardAnswer);
  run.setTurns((current) => updateLast(current, (turn) => ({ ...turn, answer: safeAnswer, blocked: stop.stage })));
  if (stop.stage === 'answer') {
    run.transcript.current = [...run.transcript.current, run.asked, { role: 'assistant', content: safeAnswer }];
  }
}

export function useAiChat({ system, tools, guards }: UseAiChatOptions) {
  const { client, state, moduleMessages } = useAiConnect();
  const transcript = useRef<ChatMessage[]>([{ role: 'system', content: system }]);
  const abort = useRef<AbortController | null>(null);
  // The conversation's guard: created at its first question and kept until `reset`, in a ref for the
  // questions and in the state for the links the interface draws.
  const activeGuard = useRef<ChatGuard | null>(null);
  const [guard, setGuard] = useState<ChatGuard | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The session is read from the client when the question is sent, so a question kept while the
  // wallet connected the site goes out as soon as the client is connected.
  const send = useCallback(async (question: string) => {
    const connection = client.state;
    const text = question.trim();
    if (connection.status !== 'connected' || !text) {
      return;
    }
    activeGuard.current ??= createChatGuard(guards);
    const conversationGuard = activeGuard.current;
    setGuard(conversationGuard);
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);
    setTurns((current) => [...current, { question: text, answer: '', tools: [] }]);
    const run = { session: connection.session, tools, guard: conversationGuard, transcript, controller, setTurns,
      asked: { role: 'user', content: text } satisfies ChatMessage };
    try {
      await answerQuestion(run);
    } catch (reason) {
      if (reason instanceof GuardStop) {
        showStop(reason, run, moduleMessages);
      } else if (!controller.signal.aborted) {
        // An answer the site stopped itself ends without an error.
        setError(failedAnswerText(reason, connection.providerName, moduleMessages));
      }
    } finally {
      // A question sent after a stop has taken over; its own end clears `busy`.
      if (abort.current === controller) {
        setBusy(false);
      }
    }
  }, [client, tools, guards, moduleMessages]);

  const stop = useCallback(() => abort.current?.abort(), []);

  const reset = useCallback(() => {
    abort.current?.abort();
    transcript.current = [{ role: 'system', content: system }];
    activeGuard.current = null;
    setGuard(null);
    setTurns([]);
    setError(null);
  }, [system]);

  return {
    turns, send, stop, reset, busy, error, connected: state.status === 'connected',
    linkAllowed: guard?.linkAllowed ?? NO_LINKS,
  };
}
