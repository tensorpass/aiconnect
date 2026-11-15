#!/usr/bin/env node
// The AI Connect command line. `npx @tensorpass/aiconnect site-key <domain>` creates the TensorPass site key of
// a domain after the developer approves it in their browser. `--gateway <url>` names another TensorPass
// gateway, and `--no-browser` only prints the approval page's address.

import { spawn } from 'node:child_process';
import { PLAN_GATEWAY } from '@tensorpass/aiconnect';
import { runSiteKey } from './siteKeyCommand.ts';

const USAGE = 'Usage: npx @tensorpass/aiconnect site-key <domain> [--gateway <url>] [--no-browser]';
const OPENERS: Record<string, string> = { darwin: 'open', win32: 'explorer', linux: 'xdg-open' };

function openBrowser(url: string): void {
  const opener = OPENERS[process.platform];
  if (opener) {
    spawn(opener, [url], { stdio: 'ignore', detached: true }).on('error', () => undefined).unref();
  }
}

function optionValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main(args: string[]): Promise<void> {
  const [command, domain] = args;
  if (command !== 'site-key' || !domain || domain.startsWith('--')) {
    console.error(USAGE);
    process.exitCode = 2;
    return;
  }
  await runSiteKey({
    domain,
    gateway: (optionValue(args, '--gateway') ?? PLAN_GATEWAY).replace(/\/+$/, ''),
    directory: process.cwd(),
    fetch: (input, init) => fetch(input, init),
    print: (line) => console.log(line),
    openBrowser: args.includes('--no-browser') ? () => undefined : openBrowser,
    sleep: (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000)),
  });
}

main(process.argv.slice(2)).catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
