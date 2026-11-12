// The Anthropic SDK, unchanged but for its options: messages streamed, with a tool loop.

import Anthropic from '@anthropic-ai/sdk';
import { catalogTools, MAX_STEPS, runTool } from './sdkRun.ts';
import type { SdkRunner } from './sdkRun.ts';

export const runAnthropic: SdkRunner = async (run) => {
  const client = new Anthropic(run.aiconnect.sdkOptions);
  const tools = (await catalogTools()).map((tool) => ({
    name: tool.name, description: tool.description, input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
  }));
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: run.question }];
  for (let step = 0; step < MAX_STEPS; step += 1) {
    const stream = client.messages.stream(
      { model: 'claude-sonnet-5-5', max_tokens: 2048, system: run.system, messages, tools },
      { signal: run.signal },
    );
    stream.on('text', (delta) => run.onText(delta));
    const message = await stream.finalMessage();
    messages.push({ role: 'assistant', content: message.content });
    const uses = message.content.filter((block) => block.type === 'tool_use');
    if (!uses.length) {
      return;
    }
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const use of uses) {
      const call = { id: use.id, name: use.name, arguments: use.input as Record<string, unknown> };
      results.push({ type: 'tool_result', tool_use_id: use.id, content: await runTool(run, call) });
    }
    messages.push({ role: 'user', content: results });
  }
};
