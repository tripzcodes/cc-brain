#!/usr/bin/env node

/**
 * Brain Loader
 * Runs on SessionStart - injects persistent memory into context
 *
 * TIERS:
 *   T1 (always):    user.md, preferences.md         ~30 lines each
 *   T2 (project):   projects/{name}/context.md      ~100 lines
 *   T3 (on-demand): projects/{name}/archive/        never auto-loaded
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const BRAIN_DIR = process.env.CC_BRAIN_DIR || join(homedir(), '.claude', 'brain');
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const PROJECT_NAME = PROJECT_DIR.split(/[/\\]/).pop();

// Size limits (lines)
const LIMITS = {
  user: 40,
  preferences: 40,
  context: 120
};

function readIfExists(path, limit = null) {
  if (!existsSync(path)) return null;

  let content = readFileSync(path, 'utf-8');

  if (limit) {
    const lines = content.split('\n');
    if (lines.length > limit) {
      content = lines.slice(0, limit).join('\n') + '\n... (truncated)';
    }
  }

  return content;
}

function loadBrain() {
  const parts = [];

  parts.push('<brain>');

  // ═══════════════════════════════════════════
  // TIER 1: Always loaded (core understanding)
  // ═══════════════════════════════════════════

  const user = readIfExists(join(BRAIN_DIR, 'user.md'), LIMITS.user);
  if (user && user.trim()) {
    parts.push(user);
  }

  const prefs = readIfExists(join(BRAIN_DIR, 'preferences.md'), LIMITS.preferences);
  if (prefs && prefs.trim()) {
    parts.push(prefs);
  }

  // ═══════════════════════════════════════════
  // TIER 2: Project context (current project)
  // ═══════════════════════════════════════════

  const projectContext = join(BRAIN_DIR, 'projects', PROJECT_NAME, 'context.md');
  const context = readIfExists(projectContext, LIMITS.context);
  if (context && context.trim()) {
    parts.push(`## Project: ${PROJECT_NAME}\n`);
    parts.push(context);
  }

  // ═══════════════════════════════════════════
  // TIER 3: Archive (NOT loaded, just noted)
  // ═══════════════════════════════════════════

  const archiveDir = join(BRAIN_DIR, 'projects', PROJECT_NAME, 'archive');
  if (existsSync(archiveDir)) {
    parts.push(`\n[Archive available at: ${archiveDir}]`);
  }

  parts.push('</brain>');

  return parts.join('\n');
}

const brain = loadBrain();

// Only output if there's actual content
if (brain.replace(/<\/?brain>/g, '').trim()) {
  console.log(brain);
  console.log('\n---');
  console.log('Above is your persistent memory. Update brain files when you learn important new info.');
  console.log('Tier 3 archive is available for deep history if needed.');
}
