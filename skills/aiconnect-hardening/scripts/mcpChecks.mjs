// Checks of the site's MCP server over HTTP: what its tools accept, what they return, and whether a burst
// of requests meets a rate limit. Each check returns { area, name, ok, detail }.

import { argumentPayloads } from './attacks.mjs';
import { createMcpClient } from './mcpClient.mjs';

const URL_LIKE = /(?:url|uri|link|href|endpoint|webhook|callback|domain|host)s?$/i;
const MAX_RESULT_BYTES = 20_000;
const LEAK_IN_RESULT = /<\/?\s*(?:instructions?|tool-result|steering)-[a-z0-9]{6,}/i;

function check(area, name, ok, detail = '') {
  return { area, name, ok: Boolean(ok), detail };
}

function schemaChecks(tool) {
  const properties = tool.inputSchema?.properties ?? {};
  return Object.entries(properties).flatMap(([key, schema]) => {
    const label = `${tool.name}.${key}`;
    const takesNoAddress = !URL_LIKE.test(key) && schema.format !== 'uri';
    const checks = [check('schema', `${label} takes no address`, takesNoAddress,
      takesNoAddress ? '' : 'a tool that fetches an address the model chooses carries data to any server')];
    if (schema.type === 'string' && !schema.enum) {
      checks.push(check('schema', `${label} has a maximum length`, Number.isFinite(schema.maxLength)));
    }
    if (schema.type === 'array') {
      checks.push(check('schema', `${label} has a maximum number of items`, Number.isFinite(schema.maxItems)));
    }
    if (schema.type === 'integer' || schema.type === 'number') {
      checks.push(check('schema', `${label} has a maximum`, Number.isFinite(schema.maximum)));
    }
    return checks;
  });
}

// The smallest valid arguments for a tool, with `value` in its first free string field.
function sampleArguments(tool, value) {
  const properties = tool.inputSchema?.properties ?? {};
  const args = {};
  let placed = false;
  for (const [key, schema] of Object.entries(properties)) {
    if (schema.enum?.length) {
      args[key] = schema.enum[0];
    } else if (schema.type === 'string' && !placed) {
      args[key] = value;
      placed = true;
    } else if (schema.type === 'integer' || schema.type === 'number') {
      args[key] = schema.minimum ?? 1;
    } else if (schema.type === 'boolean') {
      args[key] = false;
    }
  }
  return { args, placed };
}

// The deny list as it applies to tool results: the server's own tool names stay allowed there, since a
// result may point the model to the next tool. The output guard keeps them out of the visitor's answers.
function resultDenyList(policy, tools) {
  const toolNames = new Set(tools.map((tool) => tool.name));
  return (policy.denyPatterns ?? []).filter((pattern) => !toolNames.has(pattern))
    .map((pattern) => new RegExp(pattern, 'i'));
}

async function payloadChecks(client, tool, denyList) {
  const firstString = Object.values(tool.inputSchema?.properties ?? {}).find((schema) => schema.type === 'string');
  const results = [];
  for (const payload of argumentPayloads(firstString?.maxLength)) {
    const { args, placed } = sampleArguments(tool, payload.value);
    if (!placed) {
      continue;
    }
    const answer = await client.callTool(tool.name, args);
    const label = `${tool.name} with ${payload.name}`;
    if (answer.status === 429) {
      results.push(check('tools', `${label} ran before the rate limit`, false, 'rerun once the window has passed'));
      break;
    }
    const refused = Boolean(answer.error) || answer.isError;
    results.push(
      check('tools', `${label} answers without a server error`, answer.status < 500, `HTTP ${answer.status}`),
    );
    if (payload.oversized) {
      results.push(check('tools', `${label} is refused`, refused));
      continue;
    }
    const denied = denyList.find((re) => re.test(answer.text));
    results.push(
      check('tools', `${label} returns at most ${MAX_RESULT_BYTES} bytes`, answer.text.length <= MAX_RESULT_BYTES,
        `${answer.text.length} bytes`),
      check('tools', `${label} returns no internal name`, !denied, denied ? denied.source : ''),
      check('tools', `${label} returns no envelope tag`, !LEAK_IN_RESULT.test(answer.text)),
    );
  }
  return results;
}

async function burstCheck(url, headers, burst) {
  const client = createMcpClient(url, headers);
  for (let sent = 1; sent <= burst; sent += 1) {
    const { status } = await client.request('tools/list');
    if (status === 429) {
      return check('rate limit', `a burst meets a 429 (after ${sent} requests)`, true);
    }
  }
  return check('rate limit', `a burst of ${burst} requests meets a 429`, false, 'no 429 answered');
}

export async function runMcpChecks({ url, policy, headers = {}, burst = 100 }) {
  const client = createMcpClient(url, headers);
  const init = await client.initialize();
  if (init.status === 429) {
    return [check('server', 'answers before the rate limit', false, 'rate limited: rerun once the window has passed')];
  }
  const listed = await client.listTools();
  const results = [check('server', 'initializes and lists its tools', init.result && listed.tools.length,
    `${listed.tools.length} tools`)];
  const denyList = resultDenyList(policy, listed.tools);
  for (const tool of listed.tools) {
    results.push(...schemaChecks(tool), ...await payloadChecks(client, tool, denyList));
  }
  if (burst > 0) {
    results.push(await burstCheck(url, headers, burst));
  }
  return results;
}
