#!/usr/bin/env bun

/**
 * Brain Loader
 * Runs on SessionStart - injects persistent memory into context
 *
 * TIERS:
 *   T1 (always):    user.md, preferences.md         ~40 lines each
 *   T2 (project):   projects/{id}/context.md        ~120 lines
 *   T3 (on-demand): projects/{id}/archive/          never auto-loaded
 *
 * Features:
 *   - Uses .brain-id for stable project identity
 *   - Auto-prunes archive entries older than 90 days (with warning)
 */

import { readFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getProjectId, getProjectBrainPath } from './project-id.js';

const BRAIN_DIR = process.env.CC_BRAIN_DIR || join(homedir(), '.claude', 'brain');
const PROJECT_ID = getProjectId();
const PROJECT_PATH = getProjectBrainPath();

// Size limits (lines)
const LIMITS = {
  user: 40,
  preferences: 40,
  context: 120
};

// Auto-prune settings
const AUTO_PRUNE_DAYS = 90;

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

function ensureProjectDir() {
  const archiveDir = join(PROJECT_PATH, 'archive');

  if (!existsSync(PROJECT_PATH)) {
    mkdirSync(PROJECT_PATH, { recursive: true });
  }
  if (!existsSync(archiveDir)) {
    mkdirSync(archiveDir, { recursive: true });
  }
}

function autoPruneArchive() {
  const archiveDir = join(PROJECT_PATH, 'archive');
  if (!existsSync(archiveDir)) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - AUTO_PRUNE_DAYS);

  const deleted = [];

  try {
    const files = readdirSync(archiveDir).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const path = join(archiveDir, file);
      const stat = statSync(path);

      if (stat.mtime < cutoff) {
        unlinkSync(path);
        deleted.push(file);
      }
    }
  } catch (e) {
    // Ignore errors during auto-prune
  }

  return deleted;
}

function loadBrain() {
  ensureProjectDir();

  // Auto-prune old archive entries
  const pruned = autoPruneArchive();

  const parts = [];

  parts.push('<brain>');

  // Show pruned files warning
  if (pruned.length > 0) {
    parts.push(`[Auto-pruned ${pruned.length} archive entries older than ${AUTO_PRUNE_DAYS} days: ${pruned.join(', ')}]\n`);
  }

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

  const projectContext = join(PROJECT_PATH, 'context.md');
  const context = readIfExists(projectContext, LIMITS.context);
  if (context && context.trim()) {
    parts.push(`## Project: ${PROJECT_ID}\n`);
    parts.push(context);
  }

  // ═══════════════════════════════════════════
  // TIER 3: Archive (NOT loaded, just noted)
  // ═══════════════════════════════════════════

  const archiveDir = join(PROJECT_PATH, 'archive');
  if (existsSync(archiveDir)) {
    const archiveFiles = readdirSync(archiveDir).filter(f => f.endsWith('.md'));
    if (archiveFiles.length > 0) {
      parts.push(`\n[Archive: ${archiveFiles.length} entries. Use /recall to search.]`);
    }
  }

  parts.push('</brain>');

  return parts.join('\n');
}

const brain = loadBrain();

// Only output if there's actual content
if (brain.replace(/<\/?brain>/g, '').replace(/\[.*?\]/g, '').trim()) {
  console.log(brain);
  console.log('\n---');
  console.log('Above is your persistent memory. Use /save to update, /recall to search archive.');
}
