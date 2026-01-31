#!/usr/bin/env node

/**
 * Uninstall cc-brain
 * Removes hooks from settings.json
 * Use --purge to also delete brain data
 */

import { existsSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const HOME = homedir();
const CLAUDE_DIR = join(HOME, '.claude');
const BRAIN_DIR = join(CLAUDE_DIR, 'brain');
const SETTINGS_PATH = join(CLAUDE_DIR, 'settings.json');

const purge = process.argv.includes('--purge');

console.log('Uninstalling cc-brain...\n');

// Remove hooks from settings.json
if (existsSync(SETTINGS_PATH)) {
  const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));

  if (settings.hooks) {
    delete settings.hooks.SessionStart;
    delete settings.hooks.PreCompact;

    // Clean up empty hooks object
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }

    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    console.log(`Removed hooks from: ${SETTINGS_PATH}`);
  } else {
    console.log('No hooks found in settings.json');
  }
} else {
  console.log('No settings.json found');
}

// Optionally remove brain data
if (purge) {
  if (existsSync(BRAIN_DIR)) {
    rmSync(BRAIN_DIR, { recursive: true, force: true });
    console.log(`Deleted: ${BRAIN_DIR}`);
  } else {
    console.log('No brain directory found');
  }
  console.log('\ncc-brain completely removed (hooks + data).');
} else {
  console.log(`
cc-brain hooks removed.

Brain data preserved at: ${BRAIN_DIR}

To also delete brain data, run:
  bun scripts/uninstall.js --purge
`);
}
