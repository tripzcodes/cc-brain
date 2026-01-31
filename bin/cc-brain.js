#!/usr/bin/env node

/**
 * cc-brain CLI
 * Persistent memory for Claude Code
 */

import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const command = process.argv[2];
const args = process.argv.slice(3);

// Check for bun, fallback to node
let runtime = 'node';
try {
  execSync('bun --version', { stdio: 'ignore' });
  runtime = 'bun';
} catch {
  // bun not available, use node
}

const commands = {
  install: 'scripts/install.js',
  uninstall: 'scripts/uninstall.js',
  load: 'src/loader.js',
  save: 'src/saver.js',
  recall: 'src/recall.js',
  archive: 'src/archive.js',
  'project-id': 'src/project-id.js',
};

function showHelp() {
  console.log(`cc-brain - Persistent memory for Claude Code

Usage: cc-brain <command> [options]

Commands:
  install      Install hooks to Claude Code
  uninstall    Remove hooks (--purge to delete data)
  load         Load brain (usually run by hook)
  save         Save to brain (--json '{}' --dry-run)
  recall       Search archive (query)
  archive      Manage archive (list|stats|prune)
  project-id   Manage project identity (--init|--path)

Examples:
  cc-brain install
  cc-brain uninstall --purge
  cc-brain recall "authentication"
  cc-brain archive stats
  cc-brain project-id --init

More info: https://github.com/tripzcodes/cc-brain`);
}

if (!command || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

if (command === '--version' || command === '-v') {
  const pkg = await import('../package.json', { assert: { type: 'json' } });
  console.log(pkg.default.version);
  process.exit(0);
}

if (!commands[command]) {
  console.error(`Unknown command: ${command}`);
  console.error('Run cc-brain --help for usage');
  process.exit(1);
}

const script = join(ROOT, commands[command]);
const child = spawn(runtime, [script, ...args], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: { ...process.env, CLAUDE_PROJECT_DIR: process.cwd() }
});

child.on('exit', (code) => process.exit(code || 0));
