// The SDKs the demo's SDK mode switches between, in the order its picker shows them. Each SDK
// loads when it first runs, so the page does not carry all six.

import type { SdkRunner } from './sdkRun.ts';

export interface SdkChoice {
  id: string;
  label: string;
  run: SdkRunner;
}

export const SDK_CHOICES: SdkChoice[] = [
  { id: 'vercel-ai', label: 'Vercel AI SDK', run: async (run) => (await import('./vercelAiRun.ts')).runVercelAi(run) },
  { id: 'openai', label: 'OpenAI SDK', run: async (run) => (await import('./openAiRun.ts')).runOpenAi(run) },
  {
    id: 'anthropic', label: 'Anthropic SDK', run: async (run) => (await import('./anthropicRun.ts')).runAnthropic(run),
  },
  { id: 'google', label: 'Google Gen AI', run: async (run) => (await import('./googleRun.ts')).runGoogle(run) },
  { id: 'langchain', label: 'LangChain', run: async (run) => (await import('./langChainRun.ts')).runLangChain(run) },
  {
    id: 'llamaindex', label: 'LlamaIndex', run: async (run) => (await import('./llamaIndexRun.ts')).runLlamaIndex(run),
  },
];
