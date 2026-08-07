import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const root = process.cwd();
const packagePath = path.join(root, 'package.json');
const configPath = path.join(root, 'update-config.json');

const rl = readline.createInterface({ input, output });

try {
  let current = {};
  if (fs.existsSync(configPath)) {
    current = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  const owner = (await rl.question(`GitHub owner${current.owner ? ` [${current.owner}]` : ''}: `)).trim() || current.owner;
  const repo = (await rl.question(`GitHub repository${current.repo ? ` [${current.repo}]` : ''}: `)).trim() || current.repo;

  if (!owner || !repo) throw new Error('GitHub owner and repository are required.');

  const config = { provider: 'github', owner, repo, private: false };
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  pkg.build ??= {};
  pkg.build.publish = [{ provider: 'github', owner, repo }];
  fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

  console.log(`\nUpdater configured for https://github.com/${owner}/${repo}`);
  console.log('The repository/release downloads should be public for token-free installed-app updates.');
} finally {
  rl.close();
}
