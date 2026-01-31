#!/usr/bin/env bun

/**
 * Archive Management
 * List, prune, and manage T3 archive entries
 *
 * Usage:
 *   bun src/archive.js list                     # List archive entries
 *   bun src/archive.js stats                    # Show archive statistics
 *   bun src/archive.js prune --keep 20          # Keep last 20 entries
 *   bun src/archive.js prune --older-than 90d   # Delete entries older than 90 days
 *   bun src/archive.js auto-prune               # Auto-prune (90 days), returns deleted list
 */

import { existsSync, readdirSync, statSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getProjectId } from './project-id.js';

const BRAIN_DIR = process.env.CC_BRAIN_DIR || join(homedir(), '.claude', 'brain');
const PROJECT_ID = getProjectId();
const ARCHIVE_DIR = join(BRAIN_DIR, 'projects', PROJECT_ID, 'archive');

function getArchiveEntries() {
  if (!existsSync(ARCHIVE_DIR)) {
    return [];
  }

  return readdirSync(ARCHIVE_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const path = join(ARCHIVE_DIR, f);
      const stat = statSync(path);
      return {
        name: f,
        path,
        date: stat.mtime,
        size: stat.size
      };
    })
    .sort((a, b) => b.date - a.date); // Newest first
}

function listArchive() {
  const entries = getArchiveEntries();

  if (entries.length === 0) {
    console.log('Archive is empty.');
    return;
  }

  console.log(`Archive: ${ARCHIVE_DIR}\n`);
  for (const entry of entries) {
    const date = entry.date.toISOString().split('T')[0];
    const size = (entry.size / 1024).toFixed(1) + 'kb';
    console.log(`  ${date}  ${size.padStart(8)}  ${entry.name}`);
  }
  console.log(`\nTotal: ${entries.length} entries`);
}

function showStats() {
  const entries = getArchiveEntries();

  if (entries.length === 0) {
    console.log('Archive is empty.');
    return;
  }

  const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
  const oldest = entries[entries.length - 1];
  const newest = entries[0];

  console.log(`Archive Statistics`);
  console.log(`──────────────────`);
  console.log(`Location:  ${ARCHIVE_DIR}`);
  console.log(`Entries:   ${entries.length}`);
  console.log(`Total:     ${(totalSize / 1024).toFixed(1)}kb`);
  console.log(`Oldest:    ${oldest.date.toISOString().split('T')[0]} (${oldest.name})`);
  console.log(`Newest:    ${newest.date.toISOString().split('T')[0]} (${newest.name})`);
}

function pruneByCount(keep) {
  const entries = getArchiveEntries();
  const toDelete = entries.slice(keep);

  if (toDelete.length === 0) {
    console.log(`Nothing to prune (${entries.length} entries, keeping ${keep})`);
    return [];
  }

  for (const entry of toDelete) {
    unlinkSync(entry.path);
    console.log(`Deleted: ${entry.name}`);
  }

  console.log(`\nPruned ${toDelete.length} entries, kept ${keep}`);
  return toDelete.map(e => e.name);
}

function pruneByAge(days) {
  const entries = getArchiveEntries();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const toDelete = entries.filter(e => e.date < cutoff);

  if (toDelete.length === 0) {
    console.log(`Nothing to prune (no entries older than ${days} days)`);
    return [];
  }

  for (const entry of toDelete) {
    unlinkSync(entry.path);
    console.log(`Deleted: ${entry.name}`);
  }

  console.log(`\nPruned ${toDelete.length} entries older than ${days} days`);
  return toDelete.map(e => e.name);
}

function autoPrune(days = 90, silent = false) {
  const entries = getArchiveEntries();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const toDelete = entries.filter(e => e.date < cutoff);

  if (toDelete.length === 0) {
    return [];
  }

  for (const entry of toDelete) {
    unlinkSync(entry.path);
  }

  if (!silent) {
    console.log(`Auto-pruned ${toDelete.length} archive entries older than ${days} days:`);
    for (const entry of toDelete) {
      console.log(`  - ${entry.name}`);
    }
  }

  return toDelete.map(e => e.name);
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

if (command === 'list') {
  listArchive();
} else if (command === 'stats') {
  showStats();
} else if (command === 'prune') {
  const keepIdx = args.indexOf('--keep');
  const olderIdx = args.indexOf('--older-than');

  if (keepIdx !== -1) {
    const keep = parseInt(args[keepIdx + 1], 10);
    if (isNaN(keep)) {
      console.error('Error: --keep requires a number');
      process.exit(1);
    }
    pruneByCount(keep);
  } else if (olderIdx !== -1) {
    const ageStr = args[olderIdx + 1];
    const days = parseInt(ageStr, 10);
    if (isNaN(days)) {
      console.error('Error: --older-than requires a number (e.g., 90d)');
      process.exit(1);
    }
    pruneByAge(days);
  } else {
    console.error('Error: prune requires --keep <n> or --older-than <days>');
    process.exit(1);
  }
} else if (command === 'auto-prune') {
  const days = parseInt(args[1], 10) || 90;
  autoPrune(days);
} else if (command === '--help' || command === '-h' || !command) {
  console.log(`Usage: bun src/archive.js <command> [options]

Commands:
  list                      List all archive entries
  stats                     Show archive statistics
  prune --keep <n>          Keep only the last n entries
  prune --older-than <n>d   Delete entries older than n days
  auto-prune [days]         Auto-prune entries older than days (default: 90)

Examples:
  bun src/archive.js list
  bun src/archive.js prune --keep 20
  bun src/archive.js prune --older-than 90d`);
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

// Export for use as module
export { getArchiveEntries, autoPrune, ARCHIVE_DIR };
