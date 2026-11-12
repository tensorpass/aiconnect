// The Vercel AI SDK, unchanged but for its provider options: `streamText` runs the tool loop.

import { createOpenAI } from '@ai-sdk/openai';
import { jsonSchema, stepCountIs, streamText, tool } from 'ai';
import { catalogTools, MAX_STEPS, runTool } from './sdkRun.ts';
import type { SdkRunner } from './sdkRun.ts';

export const runVercelAi: SdkRunner = async (run) => {
  const openai = createOpenAI({ apiKey: run.aiconnect.sdkOptions.apiKey, fetch: run.aiconnect.fetch });
  const tools = Object.fromEntries((await catalogTools()).map((definition) => [definition.name, tool({
    description: definition.description,
    inputSchema: jsonSchema<Record<string, unknown>>(definition.inputSchema),
    execute: (args, { toolCallId }) => runTool(run, { id: toolCallId, name: definition.name, arguments: args }),
  })]));
  const result = streamText({
    model: openai('gpt-6-luna'),
    system: run.system,
    prompt: run.question,
    tools,
    stopWhen: stepCountIs(MAX_STEPS),
    abortSignal: run.signal,
  });
  for await (const part of result.fullStream) {
    if (part.type === 'text-delta') {
      run.onText(part.text);
    } else if (part.type === 'error') {
      throw part.error;
    }
  }
};
