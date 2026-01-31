#!/usr/bin/env node

/**
 * Install cc-brain
 * Sets up brain directory and hooks
 */

import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const HOME = homedir();
const CLAUDE_DIR = join(HOME, '.claude');
const BRAIN_DIR = join(CLAUDE_DIR, 'brain');
const PROJECT_ROOT = join(import.meta.dirname, '..');

console.log('Installing cc-brain...\n');

// Create brain directory structure
const dirs = [
  BRAIN_DIR,
  join(BRAIN_DIR, 'projects')
];

for (const dir of dirs) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`Created: ${dir}`);
  }
}

// Clean up legacy files from previous versions
const legacyFiles = [
  join(BRAIN_DIR, 'load-brain.sh'),
];

for (const file of legacyFiles) {
  if (existsSync(file)) {
    unlinkSync(file);
    console.log(`Removed: ${file} (legacy)`);
  }
}

// Copy template brain files if they don't exist
const templates = ['user.md', 'preferences.md'];
for (const file of templates) {
  const dest = join(BRAIN_DIR, file);
  if (!existsSync(dest)) {
    copyFileSync(join(PROJECT_ROOT, 'brain', file), dest);
    console.log(`Created: ${dest}`);
  } else {
    console.log(`Exists:  ${dest} (skipped)`);
  }
}

// Add hooks to settings.json
const settingsPath = join(CLAUDE_DIR, 'settings.json');
let settings = {};

if (existsSync(settingsPath)) {
  settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
}

// Read our hooks config
const hooks = JSON.parse(readFileSync(join(PROJECT_ROOT, 'hooks', 'hooks.json'), 'utf-8'));

// Update loader path to absolute (forward slashes for cross-platform)
const loaderPath = join(PROJECT_ROOT, 'src', 'loader.js').replace(/\\/g, '/');
hooks.SessionStart[0].hooks[0].command = `bun "${loaderPath}"`;

// Merge hooks (preserve existing hooks, add ours)
settings.hooks = settings.hooks || {};
settings.hooks.SessionStart = hooks.SessionStart;
settings.hooks.PreCompact = hooks.PreCompact;

writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
console.log(`\nUpdated: ${settingsPath}`);

console.log(`
cc-brain installed!

Brain location: ${BRAIN_DIR}

Memory tiers:
  T1 (always):   user.md, preferences.md
  T2 (project):  projects/{name}/context.md
  T3 (archive):  projects/{name}/archive/

Hooks installed:
  SessionStart → loads T1 + T2 into context
  PreCompact   → saves important bits before compaction

Edit your brain:
  ${BRAIN_DIR}/user.md
  ${BRAIN_DIR}/preferences.md
`);
