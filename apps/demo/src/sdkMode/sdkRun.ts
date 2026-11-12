// What each SDK runner of the demo receives: the visitor's question, the hooks the chat shows its
// progress with, and the client whose `fetch` answers the SDK through the wallet. Every runner
// declares the catalog's tools in its SDK's own format and runs them through its own loop.

import type { AiConnect, ToolCall } from '@tensorpass/aiconnect';
import { demoTools } from '../demoTools.ts';

export interface SdkRun {
  aiconnect: AiConnect;
  system: string;
  question: string;
  signal: AbortSignal;
  onText: (delta: string) => void;
  onToolCall: (call: ToolCall) => void;
  onToolResult: (call: ToolCall, result: string) => void;
}

export type SdkRunner = (run: SdkRun) => Promise<void>;

// The rounds a runner allows the model before it has to answer.
export const MAX_STEPS = 4;

export const catalogTools = () => demoTools.listTools();

// Runs one of the catalog's tools and shows it in the chat.
export async function runTool(run: SdkRun, call: ToolCall): Promise<string> {
  run.onToolCall(call);
  const result = await demoTools.callTool(call.name, call.arguments);
  run.onToolResult(call, result);
  return result;
}
