// Verify the metadata and files npm will publish, rather than the workspace's source tree alone.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const PACKAGES = ['design', 'core', 'react', 'elements'];
const REPOSITORY = 'git+https://github.com/tensorpass/aiconnect.git';

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function exportPaths(value) {
  if (typeof value === 'string') {
    return [value];
  }
  return Object.values(value).flatMap(exportPaths);
}

function checkPackedFiles(manifest) {
  const [pack] = JSON.parse(execFileSync('npm', [
    'pack', '--dry-run', '--json', '--ignore-scripts', '--workspace', manifest.name,
  ], { encoding: 'utf8' }));
  const files = new Set(pack.files.map(({ path }) => path));
  const expected = [
    'LICENSE', 'NOTICE', 'README.md',
    ...exportPaths(manifest.exports),
    ...Object.values(manifest.bin ?? {}),
  ];
  for (const file of expected) {
    assert(files.has(file.replace(/^\.\//, '')), `${manifest.name}: missing ${file} in tarball`);
  }
  console.log(`${manifest.name}@${manifest.version}: metadata and ${files.size} packed files checked`);
}

function checkMetadata({ manifest, folder, version }) {
  assert.equal(manifest.version, version, `${manifest.name}: version differs from root`);
  assert.equal(manifest.license, 'Apache-2.0');
  assert.equal(manifest.publishConfig.access, 'public');
  assert.equal(manifest.repository.type, 'git');
  assert.equal(manifest.repository.url, REPOSITORY);
  assert.equal(manifest.repository.directory, `packages/${folder}`);
  for (const dependencies of [manifest.dependencies, manifest.devDependencies]) {
    for (const [name, dependencyVersion] of Object.entries(dependencies ?? {})) {
      if (name.startsWith('@tensorpass/aiconnect')) {
        assert.equal(dependencyVersion, version, `${manifest.name}: mismatched dependency ${name}`);
      }
    }
  }
}

const root = await readJson('package.json');
assert.equal(root.private, true, 'The workspace root must never be published');
if (process.env.GITHUB_REF?.startsWith('refs/tags/')) {
  assert.equal(process.env.GITHUB_REF, `refs/tags/v${root.version}`, 'Release tag must match package versions');
}
for (const folder of PACKAGES) {
  const manifest = await readJson(`packages/${folder}/package.json`);
  checkMetadata({ manifest, folder, version: root.version });
  checkPackedFiles(manifest);
}
