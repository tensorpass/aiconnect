// The conversation loop of an AI Connect page, run in Node against a model the developer names: the model
// answers or asks for tools, the site's tools answer inside the salted envelope, until it answers in text.
// It speaks the OpenAI chat completions protocol, which most providers and gateways accept.

const MAX_STEPS = 4;

export function modelFromEnv(env = process.env) {
  const { PENTEST_BASE_URL: baseUrl, PENTEST_API_KEY: apiKey, PENTEST_MODEL: model } = env;
  if (!baseUrl || !apiKey || !model) {
    throw new Error('Set PENTEST_BASE_URL (such as https://api.openai.com/v1), PENTEST_API_KEY and PENTEST_MODEL.');
  }
  return { endpoint: `${baseUrl.replace(/\/$/, '')}/chat/completions`, apiKey, model };
}

export function toOpenAiTools(tools) {
  return tools.map((tool) => ({
    type: 'function',
    function: { name: tool.name, description: tool.description ?? '', parameters: tool.inputSchema },
  }));
}

async function complete(model, messages, tools) {
  const response = await fetch(model.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${model.apiKey}` },
    body: JSON.stringify({
      model: model.model,
      messages,
      ...(tools?.length ? { tools } : {}),
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.choices?.length) {
    throw new Error(`The model answered ${response.status}: ${JSON.stringify(body?.error ?? body).slice(0, 200)}`);
  }
  return body.choices[0].message;
}

function parseArguments(raw) {
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

// Runs one visitor message. `callTool(name, args)` returns the enveloped result text. Returns the final
// text, the messages the turn added and the tools it called.
export async function runTurn({ model, messages, tools, callTool }) {
  const added = [];
  const called = [];
  for (let step = 0; step < MAX_STEPS; step += 1) {
    const offer = step < MAX_STEPS - 1 ? tools : undefined;
    const message = await complete(model, [...messages, ...added], offer);
    added.push({ role: 'assistant', content: message.content ?? '', tool_calls: message.tool_calls });
    if (!message.tool_calls?.length) {
      return { text: message.content ?? '', added, called };
    }
    for (const call of message.tool_calls) {
      const args = parseArguments(call.function.arguments);
      called.push(call.function.name);
      const content = await callTool(call.function.name, args);
      added.push({ role: 'tool', tool_call_id: call.id, content });
    }
  }
  return { text: added.at(-1)?.content ?? '', added, called };
}
