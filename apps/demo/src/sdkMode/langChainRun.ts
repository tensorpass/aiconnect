// LangChain's ChatOpenAI, unchanged but for its client configuration: tools bound to the model,
// streamed, with a tool loop.

import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import type { AIMessageChunk, BaseMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { catalogTools, MAX_STEPS, runTool } from './sdkRun.ts';
import type { SdkRunner } from './sdkRun.ts';

export const runLangChain: SdkRunner = async (run) => {
  const { sdkOptions } = run.aiconnect;
  const model = new ChatOpenAI({ apiKey: sdkOptions.apiKey, model: 'gpt-6-luna', configuration: sdkOptions })
    .bindTools((await catalogTools()).map((tool) => ({
      type: 'function' as const,
      function: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
    })));
  const messages: BaseMessage[] = [new SystemMessage(run.system), new HumanMessage(run.question)];
  for (let step = 0; step < MAX_STEPS; step += 1) {
    let answer: AIMessageChunk | undefined;
    for await (const chunk of await model.stream(messages, { signal: run.signal })) {
      if (typeof chunk.content === 'string' && chunk.content) {
        run.onText(chunk.content);
      }
      answer = answer ? answer.concat(chunk) : chunk;
    }
    if (!answer) {
      return;
    }
    messages.push(answer);
    if (!answer.tool_calls?.length) {
      return;
    }
    for (const call of answer.tool_calls) {
      const id = call.id ?? call.name;
      const content = await runTool(run, { id, name: call.name, arguments: call.args });
      messages.push(new ToolMessage({ tool_call_id: id, content }));
    }
  }
};
