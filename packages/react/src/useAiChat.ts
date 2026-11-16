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
  ChatGuard, ChatMessage, ConnectionState, ConversationHooks, GuardPolicy, ProviderSession, ToolCall, ToolSource,
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

// An answer that failed: its words, and the code the provider gave its refusal, such as `plan_inactive`
// for a TensorPass account without a plan, by which the module offers what fits.
export interface AnswerFailure {
  text: string;
  code: string | null;
}

// A web account's 429 keeps the provider's own message, such as the gateway's limit of requests from one
// site, since the module's words for a 429 send the visitor to another account in the wallet.
function answerFailure(reason: unknown, connection: Extract<ConnectionState, { status: 'connected' }>,
  copy: ModuleMessages): AnswerFailure {
  const { status, code } = (reason ?? {}) as { status?: unknown; code?: unknown };
  const text = connection.account && status === 429 && reason instanceof Error
    ? reason.message
    : failedAnswerText(reason, connection.providerName, copy);
  return { text, code: typeof code === 'string' ? code : null };
}

// What a question's run needs from the hook besides the question.
interface SendContext {
  connection: Extract<ConnectionState, { status: 'connected' }>;
  guard: ChatGuard;
  tools?: ToolSource;
  transcript: RefObject<ChatMessage[]>;
  abort: RefObject<AbortController | null>;
  setTurns: Dispatch<SetStateAction<ChatTurn[]>>;
  setFailure: Dispatch<SetStateAction<AnswerFailure | null>>;
  setBusy: Dispatch<SetStateAction<boolean>>;
  copy: ModuleMessages;
}

// Sends one question and writes its outcome: the answer, the guard's safe answer, or the failure.
async function sendQuestion(text: string, context: SendContext): Promise<void> {
  const { connection, guard, tools, transcript, abort, setTurns, setFailure, setBusy, copy } = context;
  const controller = new AbortController();
  abort.current = controller;
  setBusy(true);
  setFailure(null);
  setTurns((current) => [...current, { question: text, answer: '', tools: [] }]);
  const run = { session: connection.session, tools, guard, transcript, controller, setTurns,
    asked: { role: 'user', content: text } satisfies ChatMessage };
  try {
    await answerQuestion(run);
  } catch (reason) {
    if (reason instanceof GuardStop) {
      showStop(reason, run, copy);
    } else if (!controller.signal.aborted) {
      // An answer the site stopped itself ends without an error.
      setFailure(answerFailure(reason, connection, copy));
    }
  } finally {
    // A question sent after a stop has taken over; its own end clears `busy`.
    if (abort.current === controller) {
      setBusy(false);
    }
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
  const [failure, setFailure] = useState<AnswerFailure | null>(null);

  // The session is read from the client when the question is sent, so a question kept while the
  // wallet connected the site goes out as soon as the client is connected.
  const send = useCallback(async (question: string) => {
    const connection = client.state;
    const text = question.trim();
    if (connection.status !== 'connected' || !text) {
      return;
    }
    activeGuard.current ??= createChatGuard(guards);
    setGuard(activeGuard.current);
    await sendQuestion(text, { connection, guard: activeGuard.current, tools, transcript, abort, setTurns,
      setFailure, setBusy, copy: moduleMessages });
  }, [client, tools, guards, moduleMessages]);

  const stop = useCallback(() => abort.current?.abort(), []);

  const reset = useCallback(() => {
    abort.current?.abort();
    transcript.current = [{ role: 'system', content: system }];
    activeGuard.current = null;
    setGuard(null);
    setTurns([]);
    setFailure(null);
  }, [system]);

  // Takes back the last turn when it failed with nothing to show, so asking it again does not repeat it.
  const dropFailedTurn = useCallback(() => {
    setTurns((current) => {
      const last = current.at(-1);
      return last && !last.answer && last.tools.length === 0 ? current.slice(0, -1) : current;
    });
    setFailure(null);
  }, []);

  return {
    turns, send, stop, reset, dropFailedTurn, busy, error: failure?.text ?? null, refusal: failure?.code ?? null,
    connected: state.status === 'connected',
    linkAllowed: guard?.linkAllowed ?? NO_LINKS,
  };
}
