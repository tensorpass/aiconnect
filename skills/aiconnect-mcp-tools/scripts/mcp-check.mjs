#!/usr/bin/env node
// Checks a site's MCP server the way a model meets it: lists the tools, reviews each name, description
// and input schema against the tool design rules, then calls the tools and reports what each returns.
//
//   node mcp-check.mjs --url http://localhost:3000/api/mcp [--calls calls.json] [--header 'Name: value']
//
// calls.json lists realistic calls: [{ "tool": "search_events", "args": { "city": "Lyon" }, "expect": "results" }],
// with "expect" one of results, empty or error. Without it, each tool is called once with the smallest
// valid arguments. The exit code is 0 when every rule holds and every call answers as expected.

import { readFile } from 'node:fs/promises';
import { createMcpClient } from './mcpClient.mjs';

const TOOL_NAME = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/;
const URL_LIKE = /(?:url|uri|link|href|endpoint|webhook|callback)s?$/i;
const MAX_RESULT_BYTES = 20_000;

function propertyFindings(tool) {
  const schema = tool.inputSchema ?? {};
  return Object.entries(schema.properties ?? {}).flatMap(([key, property]) => {
    const label = `${tool.name}.${key}`;
    const findings = [];
    if (!property.description) {
      findings.push(`${label} has no description: the model reads only names, descriptions and schemas`);
    }
    if (property.type === 'string' && !property.enum && !Number.isFinite(property.maxLength)) {
      findings.push(`${label} has no maxLength`);
    }
    if (property.type === 'array' && !Number.isFinite(property.maxItems)) {
      findings.push(`${label} has no maxItems`);
    }
    if ((property.type === 'integer' || property.type === 'number') && !Number.isFinite(property.maximum)) {
      findings.push(`${label} has no maximum`);
    }
    if (URL_LIKE.test(key) || property.format === 'uri') {
      findings.push(`${label} takes an address: a tool that fetches what the model names can send data anywhere`);
    }
    return findings;
  });
}

function reviewTool(tool) {
  const findings = [];
  if (!TOOL_NAME.test(tool.name)) {
    findings.push(`${tool.name}: name it a verb and a noun in snake case, such as search_events`);
  }
  const description = tool.description ?? '';
  if (description.length < 40) {
    findings.push(`${tool.name}: the description says too little for a model to choose the tool`);
  }
  if (tool.annotations?.readOnlyHint === undefined) {
    findings.push(`${tool.name}: set annotations.readOnlyHint (true for a tool that only reads)`);
  }
  return [...findings, ...propertyFindings(tool)];
}

// The smallest valid arguments: every required field with its first allowed value or a plain sample.
function smallestArguments(tool) {
  const schema = tool.inputSchema ?? {};
  const args = {};
  for (const key of schema.required ?? []) {
    const property = schema.properties?.[key] ?? {};
    if (property.enum?.length) {
      args[key] = property.enum[0];
    } else if (property.type === 'integer' || property.type === 'number') {
      args[key] = property.minimum ?? 1;
    } else if (property.type === 'boolean') {
      args[key] = false;
    } else if (property.type === 'array') {
      args[key] = [];
    } else {
      args[key] = 'test';
    }
  }
  return args;
}

function outcomeOf(answer) {
  if (answer.status >= 500 || (answer.error && !answer.isError)) {
    return 'failure';
  }
  if (answer.isError) {
    return 'error';
  }
  const trimmed = answer.text.trim();
  return trimmed === '[]' || trimmed === '{}' || trimmed === '' ? 'empty' : 'results';
}

async function runCall(client, call) {
  const started = Date.now();
  const answer = await client.callTool(call.tool, call.args ?? {});
  const outcome = outcomeOf(answer);
  const expected = call.expect ?? (outcome === 'failure' ? 'results' : outcome);
  const ok = outcome === expected && answer.text.length <= MAX_RESULT_BYTES;
  const preview = (answer.text || JSON.stringify(answer.error)).replace(/\s+/g, ' ').slice(0, 160);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${call.tool} ${JSON.stringify(call.args ?? {})}  ${outcome}, `
    + `${answer.text.length} bytes, ${Date.now() - started} ms\n      ${preview}`);
  return ok;
}

function parseArgs(argv) {
  const options = { headers: {} };
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index], argv[index + 1]];
    if (flag === '--header' && value) {
      const [name, ...rest] = value.split(':');
      options.headers[name.trim()] = rest.join(':').trim();
    } else if ((flag === '--url' || flag === '--calls') && value) {
      options[flag.slice(2)] = value;
    } else {
      throw new Error(`Unknown option or missing value: ${flag}`);
    }
  }
  if (!options.url) {
    throw new Error('Usage: mcp-check.mjs --url <mcp endpoint> [--calls calls.json] [--header "Name: value"]');
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const client = createMcpClient(options.url, options.headers);
  const init = await client.initialize();
  const { tools } = await client.listTools();
  if (!init.result || !tools.length) {
    throw new Error(`The server at ${options.url} did not initialize or lists no tool.`);
  }
  console.log(`${tools.length} tools: ${tools.map((tool) => tool.name).join(', ')}\n`);
  const findings = tools.flatMap(reviewTool);
  findings.forEach((finding) => console.log(`FAIL  ${finding}`));
  const calls = options.calls
    ? JSON.parse(await readFile(options.calls, 'utf8'))
    : tools.map((tool) => ({ tool: tool.name, args: smallestArguments(tool) }));
  const outcomes = [];
  for (const call of calls) {
    outcomes.push(await runCall(client, call));
  }
  const passed = !findings.length && outcomes.every(Boolean);
  const expected = outcomes.filter(Boolean).length;
  console.log(`\n${findings.length} design findings, ${expected}/${outcomes.length} calls as expected`);
  process.exitCode = passed ? 0 : 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
