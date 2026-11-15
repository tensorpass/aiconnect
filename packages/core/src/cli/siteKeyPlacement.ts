// Where a site key goes in the project the command runs in, read from its package.json and its files: a
// Next.js app, a Vite app, a WordPress site, or any page that loads the Web Components script.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export type Stack = 'next' | 'vite' | 'wordpress' | 'script';

function dependenciesOf(directory: string): Record<string, string> {
  const file = path.join(directory, 'package.json');
  if (!existsSync(file)) {
    return {};
  }
  try {
    const manifest = JSON.parse(readFileSync(file, 'utf8')) as Record<string, Record<string, string> | undefined>;
    return { ...manifest.dependencies, ...manifest.devDependencies };
  } catch {
    return {};
  }
}

export function detectStack(directory: string): Stack {
  const dependencies = dependenciesOf(directory);
  if (dependencies.next) {
    return 'next';
  }
  if (dependencies.vite) {
    return 'vite';
  }
  const wordpress = ['wp-config.php', 'wp-content'].some((name) => existsSync(path.join(directory, name)));
  return wordpress ? 'wordpress' : 'script';
}

// The lines that tell the developer, or their coding agent, where to put the key.
export function placementOf(stack: Stack, key: string): string[] {
  switch (stack) {
    case 'next':
      return [
        'Next.js: add this line to .env.local (and to the host\'s environment variables):',
        `  NEXT_PUBLIC_TENSORPASS_SITE_KEY=${key}`,
        'then create the client with it:',
        '  new AiConnect({ siteKey: process.env.NEXT_PUBLIC_TENSORPASS_SITE_KEY })',
      ];
    case 'vite':
      return [
        'Vite: add this line to .env.local (and to the host\'s environment variables):',
        `  VITE_TENSORPASS_SITE_KEY=${key}`,
        'then create the client with it:',
        '  new AiConnect({ siteKey: import.meta.env.VITE_TENSORPASS_SITE_KEY })',
      ];
    case 'wordpress':
      return ['WordPress: paste the key in Settings, AI Connect, TensorPass site key.'];
    case 'script':
      return [
        'Script tag: put the key on the script that loads the Web Components or the loader:',
        `  <script src=".../aiconnect-elements.js" data-site-key="${key}" defer></script>`,
        `or on the element itself: <aiconnect-chat site-key="${key}">. Shopify: the app embed's Site key setting.`,
      ];
  }
}
