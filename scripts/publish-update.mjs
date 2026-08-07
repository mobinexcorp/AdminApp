import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import { stdin as input, stdout as output } from 'node:process';

const root = process.cwd();
const packagePath = path.join(root, 'package.json');
const configPath = path.join(root, 'update-config.json');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!fs.existsSync(configPath)) {
  console.log('Update publishing is not configured yet.');
  run('node', ['scripts/configure-updates.mjs']);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

pkg.build ??= {};
pkg.build.publish = [{ provider: 'github', owner: config.owner, repo: config.repo }];
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

const rl = readline.createInterface({ input, output });
let version;
try {
  version = (await rl.question(`New version (current ${pkg.version}, example 1.0.1): `)).trim();
} finally {
  rl.close();
}

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error('Invalid version. Use a version such as 1.0.1.');
  process.exit(1);
}
if (version === pkg.version) {
  console.error('The new version must be different from the current version.');
  process.exit(1);
}
if (!process.env.GH_TOKEN) {
  console.error('\nGH_TOKEN is not set.');
  console.error('In Windows PowerShell, run this for the current terminal:');
  console.error('  $env:GH_TOKEN="github_pat_YOUR_TOKEN"');
  console.error('Then run update.bat again.');
  process.exit(1);
}

console.log(`\nPublishing MobinexCorpAdmin ${version} to ${config.owner}/${config.repo}...`);
run('npm', ['version', version, '--no-git-tag-version']);
run('npm', ['install']);
run('npm', ['run', 'build']);
run('npx', ['electron-builder', '--win', '--x64', '--publish', 'always']);

console.log('\n==================================================');
console.log(` Published MobinexCorpAdmin ${version}`);
console.log(` https://github.com/${config.owner}/${config.repo}/releases`);
console.log(' Installed copies can now detect this version.');
console.log('==================================================');
