// The OpenAI SDK, unchanged but for its options: chat completions streamed, with a tool loop.

import OpenAI from 'openai';
import { catalogTools, MAX_STEPS, runTool } from './sdkRun.ts';
import type { SdkRunner } from './sdkRun.ts';

export const runOpenAi: SdkRunner = async (run) => {
  const client = new OpenAI(run.aiconnect.sdkOptions);
  const tools = (await catalogTools()).map((tool) => ({
    type: 'function' as const,
    function: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
  }));
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: run.system },
    { role: 'user', content: run.question },
  ];
  for (let step = 0; step < MAX_STEPS; step += 1) {
    const stream = client.chat.completions.stream({ model: 'gpt-6-luna', messages, tools }, { signal: run.signal });
    stream.on('content', (delta) => run.onText(delta));
    const { message } = (await stream.finalChatCompletion()).choices[0];
    messages.push(message);
    const calls = (message.tool_calls ?? []).filter((call) => call.type === 'function');
    if (!calls.length) {
      return;
    }
    for (const call of calls) {
      const args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>;
      const content = await runTool(run, { id: call.id, name: call.function.name, arguments: args });
      messages.push({ role: 'tool', tool_call_id: call.id, content });
    }
  }
};
