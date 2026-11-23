// The agent loop run in the browser: the user's model answers or asks for tools, the site's tools
// run, their results go back to the model, until it answers in plain text. A tool runs only when the
// loop offered it to the model at that step: a call to any other name gets a tool error and stays out of
// the site's tools. With the conversation's guards, the loop stops a question that tries to take over
// the model before it leaves the page, sends the instructions and the tool results in their salted
// envelopes, and checks the answer at each piece it streams: from the first piece that trips a guard,
// the text stops reaching the page, the model's answer is cut, and the loop throws a `GuardStop`. The
// pieces before that one already reached the page, and the visitor's browser holds the whole answer:
// what must stay out of a visitor's reach is held back on the site's server (see `checkToolResult`).

import { GuardStop } from './guards/chatGuard.ts';
import type { ChatGuard } from './guards/chatGuard.ts';
import type { AnswerStop } from './guards/policy.ts';
import type { AssistantMessage, ChatMessage, ProviderSession, ToolCall, ToolDefinition, ToolSource } from './types.ts';

const DEFAULT_MAX_STEPS = 6;
// The tool calls run for one answer of the model. The calls past it get a tool error.
const DEFAULT_MAX_TOOL_CALLS = 8;
const NOT_OFFERED = 'Tool error: this tool is not available';
const TOO_MANY_CALLS = 'Tool error: too many tool calls in one answer';

export interface ConversationHooks {
  onText?: (delta: string) => void;
  onToolCall?: (call: ToolCall) => void;
  // The tool's own result, as the site's tool returned it, outside the envelope the model reads.
  onToolResult?: (call: ToolCall, result: string) => void;
}

export interface ConversationOptions extends ConversationHooks {
  session: ProviderSession;
  messages: ChatMessage[];
  tools?: ToolSource;
  maxSteps?: number;
  maxToolCalls?: number;
  signal?: AbortSignal;
  // The guards of the conversation, from `createChatGuard`, kept for all its questions.
  guard?: ChatGuard;
}

// The answer's text as it streams, checked with everything streamed before it in the question.
interface StreamWatch {
  onText: (delta: string) => void;
  stopped: () => AnswerStop | null;
}

interface ConversationRun {
  options: ConversationOptions;
  added: ChatMessage[];
  signal?: AbortSignal;
  watch?: StreamWatch;
}

function watchStream(guard: ChatGuard, onText: ConversationHooks['onText'], cut: () => void): StreamWatch {
  let streamed = '';
  let stop: AnswerStop | null = null;
  return {
    onText: (delta) => {
      if (stop) {
        return;
      }
      streamed += delta;
      const verdict = guard.checkAnswer(streamed, true);
      if (!verdict.ok) {
        stop = verdict.reason;
        cut();
        return;
      }
      onText?.(delta);
    },
    stopped: () => stop,
  };
}

// The guarded run of a question: its question checked, and a signal that also cuts the model's answer
// when the stream trips a guard.
function startRun(options: ConversationOptions): ConversationRun {
  const { guard } = options;
  if (!guard) {
    return { options, added: [], signal: options.signal };
  }
  guard.remember(options.messages);
  const question = options.messages.findLast((message) => message.role === 'user');
  const verdict = question ? guard.checkQuestion(question.content) : { ok: true as const };
  if (!verdict.ok) {
    throw new GuardStop('question', verdict.reason);
  }
  const cut = new AbortController();
  const signal = options.signal ? AbortSignal.any([options.signal, cut.signal]) : cut.signal;
  return { options, added: [], signal, watch: watchStream(guard, options.onText, () => cut.abort()) };
}

async function askModel(run: ConversationRun, tools?: ToolDefinition[]): Promise<AssistantMessage> {
  const { options, signal, watch } = run;
  const messages = [...options.messages, ...run.added];
  let message: AssistantMessage;
  try {
    ({ message } = await options.session.chat({
      messages: options.guard ? options.guard.forModel(messages) : messages,
      tools,
      signal,
      onText: watch ? watch.onText : options.onText,
    }));
  } catch (error) {
    const stop = watch?.stopped();
    throw stop ? new GuardStop('answer', stop) : error;
  }
  const stop = watch?.stopped();
  if (stop) {
    throw new GuardStop('answer', stop);
  }
  // A provider that answers in one piece streams nothing, so the whole answer is checked as well.
  const verdict = options.guard?.checkAnswer(message.content);
  if (verdict && !verdict.ok) {
    throw new GuardStop('answer', verdict.reason);
  }
  return message;
}

async function runToolCall(tools: ToolSource, call: ToolCall, hooks: ConversationHooks): Promise<ChatMessage> {
  hooks.onToolCall?.(call);
  let content: string;
  try {
    content = await tools.callTool(call.name, call.arguments);
  } catch (error) {
    content = `Tool error: ${error instanceof Error ? error.message : String(error)}`;
  }
  hooks.onToolResult?.(call, content);
  return { role: 'tool', toolCallId: call.id, name: call.name, content };
}

// The tools of one step: the site's source and the definitions the model was offered at that step.
interface OfferedTools {
  source: ToolSource;
  definitions: ToolDefinition[];
}

// The tool error a call gets in place of its run: its tool was not offered, or the answer already ran
// its share of tools. The words are fixed, since a name the model wrote is no tool result for an answer
// to repeat.
function refusalOf(call: ToolCall, offered: ToolDefinition[], hasRoom: boolean): ChatMessage | null {
  const refuse = (content: string): ChatMessage => ({ role: 'tool', toolCallId: call.id, name: call.name, content });
  if (!offered.some((definition) => definition.name === call.name)) {
    return refuse(NOT_OFFERED);
  }
  return hasRoom ? null : refuse(TOO_MANY_CALLS);
}

// Answers every call of one model answer, so each call keeps its result in the conversation. A stopped
// conversation runs no further tool.
async function answerToolCalls(run: ConversationRun, calls: ToolCall[], tools: OfferedTools): Promise<ChatMessage[]> {
  const { options } = run;
  const limit = options.maxToolCalls ?? DEFAULT_MAX_TOOL_CALLS;
  const results: ChatMessage[] = [];
  let ran = 0;
  for (const call of calls) {
    run.signal?.throwIfAborted();
    const refusal = refusalOf(call, tools.definitions, ran < limit);
    if (refusal) {
      results.push(refusal);
      continue;
    }
    ran += 1;
    const result = await runToolCall(tools.source, call, options);
    options.guard?.remember([result]);
    results.push(result);
  }
  return results;
}

// The answer that ends the conversation. Tool calls made when no tool was offered are left out, so the
// conversation ends on the model's text and a provider accepts it as it is.
function concluding(message: AssistantMessage): AssistantMessage {
  return message.toolCalls?.length ? { role: 'assistant', content: message.content } : message;
}

// Returns the messages the conversation gained: assistant turns and tool results, ending with
// the final assistant answer.
export async function runConversation(options: ConversationOptions): Promise<ChatMessage[]> {
  const run = startRun(options);
  const { tools } = options;
  const definitions = tools ? await tools.listTools() : undefined;
  const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;

  for (let step = 0; step < maxSteps; step += 1) {
    // The last step offers no tools, so the model has to conclude.
    const offered = step < maxSteps - 1 ? definitions : undefined;
    const message = await askModel(run, offered);
    if (!tools || !offered || !message.toolCalls?.length) {
      run.added.push(concluding(message));
      return run.added;
    }
    run.added.push(message);
    run.added.push(...await answerToolCalls(run, message.toolCalls, { source: tools, definitions: offered }));
  }
  return run.added;
}

export function finalAnswer(messages: ChatMessage[]): AssistantMessage | null {
  const last = messages.at(-1);
  return last?.role === 'assistant' ? last : null;
}
