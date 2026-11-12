// LlamaIndex.TS, unchanged but for its OpenAI session options: chat streamed, with a tool loop. The
// loop runs on `llm.chat`, since LlamaIndex's agent workflow leaves a failed call unhandled and its
// stream never ends. LlamaIndex gives its LLM calls no abort signal, so the run's signal reaches
// the wallet through the session's fetch.

import type {
  BaseTool, ChatMessage, PartialToolCall, ToolCall, ToolCallLLMMessageOptions,
} from '@llamaindex/core/llms';
import { OpenAI } from '@llamaindex/openai';
import { catalogTools, MAX_STEPS, runTool } from './sdkRun.ts';
import type { SdkRun, SdkRunner } from './sdkRun.ts';

type LlamaMessage = ChatMessage<ToolCallLLMMessageOptions>;

// The wallet's fetch, stopped by the run's signal as well as by the session's own.
function stoppableFetch({ aiconnect, signal }: SdkRun): typeof aiconnect.fetch {
  return (input, init) => {
    const signals = init?.signal ? [signal, init.signal] : [signal];
    return aiconnect.fetch(input, { ...init, signal: AbortSignal.any(signals) });
  };
}

// LlamaIndex streams a tool call's input as text while it arrives, then once more parsed when the
// call is complete.
const isComplete = (call: ToolCall | PartialToolCall): call is ToolCall => typeof call.input !== 'string';

// One step, streamed: the text goes to the chat as it arrives, and each tool call is kept once
// complete.
async function streamStep(llm: OpenAI, messages: LlamaMessage[], tools: BaseTool[], run: SdkRun) {
  let content = '';
  const calls = new Map<string, ToolCall>();
  for await (const chunk of await llm.chat({ messages, tools, stream: true })) {
    content += chunk.delta;
    run.onText(chunk.delta);
    const options = chunk.options ?? {};
    const streamed = 'toolCall' in options ? options.toolCall : [];
    streamed.filter(isComplete).forEach((call) => calls.set(call.id, call));
  }
  return { content, calls: [...calls.values()] };
}

export const runLlamaIndex: SdkRunner = async (run) => {
  const llm = new OpenAI({
    model: 'gpt-6-luna',
    apiKey: run.aiconnect.sdkOptions.apiKey,
    additionalSessionOptions: { ...run.aiconnect.sdkOptions, fetch: stoppableFetch(run) },
  });
  const tools: BaseTool[] = (await catalogTools()).map((tool) => ({
    metadata: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
  }));
  const messages: LlamaMessage[] = [{ role: 'system', content: run.system }, { role: 'user', content: run.question }];
  for (let step = 0; step < MAX_STEPS; step += 1) {
    const { content, calls } = await streamStep(llm, messages, tools, run);
    if (!calls.length) {
      return;
    }
    messages.push({ role: 'assistant', content, options: { toolCall: calls } });
    for (const call of calls) {
      const result = await runTool(run, { id: call.id, name: call.name, arguments: call.input });
      const toolResult = { id: call.id, result, isError: false };
      messages.push({ role: 'user', content: result, options: { toolResult } });
    }
  }
};
