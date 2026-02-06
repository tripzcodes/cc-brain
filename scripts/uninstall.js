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

// Remove cc-brain hooks from settings.json (preserves user's other hooks)
function isCcBrainHook(entry) {
  if (!entry || !entry.hooks) return false;
  return entry.hooks.some(h =>
    (h.command && (h.command.includes('cc-brain') || h.command.includes('loader.js'))) ||
    (h.prompt && h.prompt.includes('structured saver'))
  );
}

if (existsSync(SETTINGS_PATH)) {
  let settings;
  try {
    settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch (e) {
    console.error(`Error: Could not parse ${SETTINGS_PATH}`);
    console.error(`  ${e.message}`);
    console.error('Fix the file manually or delete it, then re-run.');
    process.exit(1);
  }

  if (settings.hooks) {
    let removed = false;

    for (const event of ['SessionStart', 'PreCompact']) {
      if (Array.isArray(settings.hooks[event])) {
        const before = settings.hooks[event].length;
        settings.hooks[event] = settings.hooks[event].filter(entry => !isCcBrainHook(entry));
        if (settings.hooks[event].length < before) removed = true;
        if (settings.hooks[event].length === 0) delete settings.hooks[event];
      }
    }

    // Clean up empty hooks object
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }

    if (removed) {
      writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
      console.log(`Removed cc-brain hooks from: ${SETTINGS_PATH}`);
    } else {
      console.log('No cc-brain hooks found in settings.json');
    }
  } else {
    console.log('No hooks found in settings.json');
  }
} else {
  console.log('No settings.json found');
}

// --- Remove Skills from ~/.claude/skills/ ---
const SKILLS_DIR = join(CLAUDE_DIR, 'skills');
const skillNames = ['save', 'recall', 'brain'];

for (const name of skillNames) {
  const skillDir = join(SKILLS_DIR, name);
  if (existsSync(skillDir)) {
    rmSync(skillDir, { recursive: true, force: true });
    console.log(`Removed: ${skillDir}`);
  }
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
