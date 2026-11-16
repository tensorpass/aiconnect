// Install the packed release outside the workspace, where links cannot hide missing or invalid exports.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const PACKAGES = ['design', 'core', 'react', 'elements'];
const directory = await mkdtemp(path.join(tmpdir(), 'aiconnect-install-'));

try {
  const packed = JSON.parse(execFileSync('npm', [
    'pack', '--json', '--ignore-scripts', '--pack-destination', directory,
    ...PACKAGES.flatMap((folder) => ['--workspace', `packages/${folder}`]),
  ], { encoding: 'utf8' }));
  const react = JSON.parse(await readFile('node_modules/react/package.json', 'utf8')).version;
  const reactDom = JSON.parse(await readFile('node_modules/react-dom/package.json', 'utf8')).version;
  await writeFile(path.join(directory, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  execFileSync('npm', [
    'install', '--ignore-scripts', '--no-audit', '--no-fund',
    ...packed.map(({ filename }) => path.join(directory, filename)),
    `react@${react}`, `react-dom@${reactDom}`,
  ], { cwd: directory, stdio: 'inherit' });
  execFileSync(process.execPath, ['--input-type=module', '--eval', `
    import assert from 'node:assert/strict';
    import { createElement } from 'react';
    import { renderToString } from 'react-dom/server';
    import { AiConnect } from '@tensorpass/aiconnect';
    import { AiConnectProvider, ConnectButton } from '@tensorpass/aiconnect-react';
    await import('@tensorpass/aiconnect/guards');
    await import('@tensorpass/aiconnect/callback');
    await import('@tensorpass/aiconnect-design/brand-mark');
    await import('@tensorpass/aiconnect-react/launcher');
    const html = renderToString(createElement(AiConnectProvider, { client: new AiConnect() },
      createElement(ConnectButton)));
    assert(html.length > 0, 'React components must render on the server');
  `], { cwd: directory, stdio: 'inherit' });
  const cli = spawnSync(path.join(directory, 'node_modules', '.bin', 'aiconnect'), [], { encoding: 'utf8' });
  assert.equal(cli.status, 2, cli.stderr || cli.error?.message);
  assert.match(cli.stderr, /Usage: npx @tensorpass\/aiconnect/);
  console.log('Fresh tarball install: Node imports, React server rendering and CLI passed');
} finally {
  await rm(directory, { recursive: true, force: true });
}
