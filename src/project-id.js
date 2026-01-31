#!/usr/bin/env bun

/**
 * Project Identity
 * Provides stable project ID that survives directory renames
 *
 * Priority:
 * 1. .brain-id file in project root (UUID)
 * 2. Fall back to directory name
 *
 * Usage:
 *   bun src/project-id.js           # Output current project ID
 *   bun src/project-id.js --init    # Create .brain-id if not exists
 *   bun src/project-id.js --path    # Output project brain path
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const BRAIN_ID_FILE = join(PROJECT_DIR, '.brain-id');

function getProjectId() {
  // Check for .brain-id file
  if (existsSync(BRAIN_ID_FILE)) {
    return readFileSync(BRAIN_ID_FILE, 'utf-8').trim();
  }

  // Fall back to directory name
  return PROJECT_DIR.split(/[/\\]/).pop();
}

function initBrainId() {
  if (existsSync(BRAIN_ID_FILE)) {
    const existing = readFileSync(BRAIN_ID_FILE, 'utf-8').trim();
    console.log(`Already exists: ${BRAIN_ID_FILE}`);
    console.log(`ID: ${existing}`);
    return existing;
  }

  const id = randomUUID();
  writeFileSync(BRAIN_ID_FILE, id + '\n');
  console.log(`Created: ${BRAIN_ID_FILE}`);
  console.log(`ID: ${id}`);
  return id;
}

function getProjectBrainPath() {
  const brainDir = process.env.CC_BRAIN_DIR || join(process.env.HOME || process.env.USERPROFILE, '.claude', 'brain');
  return join(brainDir, 'projects', getProjectId());
}

// CLI (only when run directly)
if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.includes('--init')) {
    initBrainId();
  } else if (args.includes('--path')) {
    console.log(getProjectBrainPath());
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: bun src/project-id.js [options]

Options:
  (none)    Output current project ID
  --init    Create .brain-id file if not exists
  --path    Output full path to project brain directory
  --help    Show this help`);
  } else {
    console.log(getProjectId());
  }
}

// Export for use as module
export { getProjectId, initBrainId, getProjectBrainPath, BRAIN_ID_FILE };
