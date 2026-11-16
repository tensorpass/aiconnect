#!/usr/bin/env node
// Lists every operation of an OpenAPI 3 description as a Markdown table, to choose which ones become MCP
// tools: method, path, operation id, summary, parameters, whether it takes a body, whether it needs
// authentication, and whether it reads or writes.
//
//   node openapi-inventory.mjs openapi.json
//
// A YAML description is converted first: npx js-yaml openapi.yaml > openapi.json

import { readFile } from 'node:fs/promises';

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

function cell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

function parametersOf(pathItem, operation) {
  const all = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])];
  return all.filter((parameter) => parameter.name)
    .map((parameter) => `${parameter.name} (${parameter.in}${parameter.required ? ', required' : ''})`);
}

function needsAuth(operation, globalSecurity) {
  const security = operation.security ?? globalSecurity ?? [];
  return security.some((requirement) => Object.keys(requirement).length > 0);
}

function inventory(spec) {
  const rows = [];
  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of METHODS.filter((name) => pathItem[name])) {
      const operation = pathItem[method];
      rows.push({
        method: method.toUpperCase(),
        path,
        operationId: operation.operationId ?? '',
        summary: operation.summary ?? operation.description ?? '',
        parameters: parametersOf(pathItem, operation).join(', '),
        body: operation.requestBody ? 'yes' : '',
        auth: needsAuth(operation, spec.security) ? 'yes' : '',
        kind: method === 'get' ? 'read' : 'write',
      });
    }
  }
  return rows;
}

async function main() {
  const file = process.argv[2];
  if (!file || !file.endsWith('.json')) {
    throw new Error('Usage: openapi-inventory.mjs <openapi.json>; convert YAML first: npx js-yaml a.yaml > a.json');
  }
  const spec = JSON.parse(await readFile(file, 'utf8'));
  const rows = inventory(spec);
  console.log(`${spec.info?.title ?? 'API'}: ${rows.length} operations\n`);
  console.log('| Method | Path | Operation | Summary | Parameters | Body | Auth | Kind |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const row of rows) {
    console.log(`| ${[row.method, row.path, row.operationId, row.summary, row.parameters, row.body, row.auth, row.kind]
      .map(cell).join(' | ')} |`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
