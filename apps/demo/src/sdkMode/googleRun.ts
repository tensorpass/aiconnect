// Google's Gen AI SDK, unchanged but for its HTTP options: content streamed, with a function
// calling loop.

import { GoogleGenAI } from '@google/genai';
import type { Content, Part } from '@google/genai';
import { catalogTools, MAX_STEPS, runTool } from './sdkRun.ts';
import type { SdkRunner } from './sdkRun.ts';

export const runGoogle: SdkRunner = async (run) => {
  const { aiconnect } = run;
  const client = new GoogleGenAI({ apiKey: aiconnect.sdkOptions.apiKey, httpOptions: { fetch: aiconnect.fetch } });
  const functionDeclarations = (await catalogTools()).map((tool) => ({
    name: tool.name, description: tool.description, parametersJsonSchema: tool.inputSchema,
  }));
  const config = { systemInstruction: run.system, tools: [{ functionDeclarations }], abortSignal: run.signal };
  const contents: Content[] = [{ role: 'user', parts: [{ text: run.question }] }];
  for (let step = 0; step < MAX_STEPS; step += 1) {
    const parts: Part[] = [];
    for await (const chunk of await client.models.generateContentStream({ model: 'gemini-3-pro', contents, config })) {
      for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
        if (part.text && !part.thought) {
          run.onText(part.text);
        }
        parts.push(part);
      }
    }
    contents.push({ role: 'model', parts });
    const calls = parts.flatMap((part) => (part.functionCall ? [part.functionCall] : []));
    if (!calls.length) {
      return;
    }
    const responses: Part[] = [];
    for (const { id, name = '', args = {} } of calls) {
      const output = await runTool(run, { id: id ?? name, name, arguments: args });
      responses.push({ functionResponse: { id, name, response: { output } } });
    }
    contents.push({ role: 'user', parts: responses });
  }
};
