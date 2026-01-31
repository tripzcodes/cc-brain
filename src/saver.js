#!/usr/bin/env node

/**
 * Structured Brain Saver
 * Saves context to brain with validation and dry-run support
 *
 * Usage:
 *   bun src/saver.js --dry-run --json '{...}'  # Preview changes
 *   bun src/saver.js --json '{...}'            # Apply changes
 *   bun src/saver.js --help                    # Show help
 *
 * JSON Schema:
 * {
 *   "t1_user": { ... },        // Updates to user.md
 *   "t1_prefs": { ... },       // Updates to preferences.md
 *   "t2": { ... },             // Updates to context.md
 *   "t3": "Session summary..." // New archive entry
 * }
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getProjectId } from './project-id.js';

const BRAIN_DIR = process.env.CC_BRAIN_DIR || join(homedir(), '.claude', 'brain');
const PROJECT_ID = getProjectId();
const PROJECT_DIR = join(BRAIN_DIR, 'projects', PROJECT_ID);

const LIMITS = {
  t1_user: 40,
  t1_prefs: 40,
  t2: 120
};

const PATHS = {
  t1_user: join(BRAIN_DIR, 'user.md'),
  t1_prefs: join(BRAIN_DIR, 'preferences.md'),
  t2: join(PROJECT_DIR, 'context.md'),
  t3_dir: join(PROJECT_DIR, 'archive')
};

function readFile(path) {
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf-8');
}

function countLines(content) {
  if (!content) return 0;
  return content.split('\n').length;
}

function formatSection(title, data) {
  if (!data || Object.keys(data).length === 0) return null;

  const lines = [`## ${title}`];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        lines.push(`- ${item}`);
      }
    } else if (typeof value === 'object') {
      lines.push(`### ${key}`);
      for (const [k, v] of Object.entries(value)) {
        lines.push(`- ${k}: ${v}`);
      }
    } else {
      lines.push(`- ${key}: ${value}`);
    }
  }
  return lines.join('\n');
}

function mergeContent(existing, updates, template) {
  // For now, replace sections that are updated
  // Future: smarter merging
  if (!existing) {
    existing = template || '';
  }

  let result = existing;

  for (const [section, content] of Object.entries(updates)) {
    const sectionHeader = `## ${section}`;
    const newContent = formatSection(section, content);

    if (!newContent) continue;

    // Find and replace section, or append
    const sectionRegex = new RegExp(`## ${section}[\\s\\S]*?(?=\\n## |$)`, 'g');
    if (sectionRegex.test(result)) {
      result = result.replace(sectionRegex, newContent + '\n\n');
    } else {
      result = result.trim() + '\n\n' + newContent + '\n';
    }
  }

  return result.trim() + '\n';
}

function generateT2Content(data) {
  const lines = ['# Project Context', ''];

  if (data.what) {
    lines.push('## What');
    lines.push(data.what, '');
  }

  if (data.focus) {
    lines.push('## Current Focus');
    if (Array.isArray(data.focus)) {
      data.focus.forEach(f => lines.push(`- ${f}`));
    } else {
      lines.push(data.focus);
    }
    lines.push('');
  }

  if (data.decisions) {
    lines.push('## Decisions');
    if (Array.isArray(data.decisions)) {
      data.decisions.forEach(d => lines.push(`- ${d}`));
    } else if (typeof data.decisions === 'object') {
      for (const [decision, rationale] of Object.entries(data.decisions)) {
        lines.push(`- ${decision}: ${rationale}`);
      }
    }
    lines.push('');
  }

  if (data.files) {
    lines.push('## Key Files');
    if (Array.isArray(data.files)) {
      data.files.forEach(f => lines.push(`- ${f}`));
    } else if (typeof data.files === 'object') {
      for (const [file, desc] of Object.entries(data.files)) {
        lines.push(`- \`${file}\`: ${desc}`);
      }
    }
    lines.push('');
  }

  if (data.blockers) {
    lines.push('## Blockers');
    if (Array.isArray(data.blockers)) {
      data.blockers.forEach(b => lines.push(`- ${b}`));
    } else {
      lines.push(data.blockers);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function generateT3Content(summary) {
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toTimeString().split(' ')[0];

  return `# Session ${date} ${time}

${summary}
`;
}

function validateAndPrepare(input, dryRun = false) {
  const changes = [];
  const errors = [];

  // T1 User
  if (input.t1_user) {
    const existing = readFile(PATHS.t1_user);
    const updated = mergeContent(existing, input.t1_user, '# User Profile\n');
    const lines = countLines(updated);

    if (lines > LIMITS.t1_user) {
      errors.push(`t1_user exceeds limit: ${lines}/${LIMITS.t1_user} lines`);
    } else {
      changes.push({
        tier: 't1_user',
        path: PATHS.t1_user,
        before: existing,
        after: updated,
        lines
      });
    }
  }

  // T1 Preferences
  if (input.t1_prefs) {
    const existing = readFile(PATHS.t1_prefs);
    const updated = mergeContent(existing, input.t1_prefs, '# Code & Tool Preferences\n');
    const lines = countLines(updated);

    if (lines > LIMITS.t1_prefs) {
      errors.push(`t1_prefs exceeds limit: ${lines}/${LIMITS.t1_prefs} lines`);
    } else {
      changes.push({
        tier: 't1_prefs',
        path: PATHS.t1_prefs,
        before: existing,
        after: updated,
        lines
      });
    }
  }

  // T2 Context
  if (input.t2) {
    const existing = readFile(PATHS.t2);
    const updated = generateT2Content(input.t2);
    const lines = countLines(updated);

    if (lines > LIMITS.t2) {
      errors.push(`t2 exceeds limit: ${lines}/${LIMITS.t2} lines`);
    } else {
      changes.push({
        tier: 't2',
        path: PATHS.t2,
        before: existing,
        after: updated,
        lines
      });
    }
  }

  // T3 Archive
  if (input.t3) {
    const date = new Date().toISOString().split('T')[0];
    const archivePath = join(PATHS.t3_dir, `${date}.md`);
    const existing = readFile(archivePath);
    const updated = existing
      ? existing + '\n---\n\n' + generateT3Content(input.t3)
      : generateT3Content(input.t3);

    changes.push({
      tier: 't3',
      path: archivePath,
      before: existing,
      after: updated,
      lines: countLines(updated),
      isNew: !existing
    });
  }

  return { changes, errors };
}

function showDiff(change) {
  console.log(`\n┌── ${change.tier} (${change.lines} lines) ──`);
  console.log(`│ Path: ${change.path}`);

  if (change.isNew) {
    console.log(`│ Status: NEW FILE`);
  } else if (!change.before) {
    console.log(`│ Status: CREATE`);
  } else {
    console.log(`│ Status: UPDATE`);
  }

  console.log('├──────────────────────────────');

  // Show content preview (first 10 lines)
  const preview = change.after.split('\n').slice(0, 10);
  for (const line of preview) {
    console.log(`│ ${line}`);
  }
  if (change.lines > 10) {
    console.log(`│ ... (${change.lines - 10} more lines)`);
  }

  console.log('└──────────────────────────────');
}

function applyChanges(changes) {
  for (const change of changes) {
    // Ensure directory exists
    const dir = join(change.path, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(change.path, change.after);
    console.log(`Saved: ${change.tier} → ${change.path}`);
  }
}

// CLI
if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: bun src/saver.js [options]

Save context to brain with validation.

Options:
  --json <data>    JSON data to save (see schema below)
  --dry-run        Preview changes without saving
  --help           Show this help

JSON Schema:
{
  "t1_user": {
    "Communication Style": ["terse", "technical"],
    "Pet Peeves": ["verbose output"]
  },
  "t1_prefs": {
    "Code Style": ["typescript", "functional"],
    "Tools": ["bun", "vscode"]
  },
  "t2": {
    "what": "Persistent memory for Claude Code",
    "focus": ["implementing saver", "testing recall"],
    "decisions": {
      "Use bun": "faster than node"
    },
    "files": {
      "src/saver.js": "structured brain saver"
    }
  },
  "t3": "Implemented structured saver with dry-run support."
}

Examples:
  bun src/saver.js --dry-run --json '{"t2": {"focus": "testing"}}'
  bun src/saver.js --json '{"t3": "Added search functionality"}'`);
    process.exit(0);
  }

  const jsonIdx = args.indexOf('--json');
  const dryRun = args.includes('--dry-run');

  if (jsonIdx === -1) {
    console.error('Error: --json <data> required');
    console.error('Run with --help for usage');
    process.exit(1);
  }

  let input;
  try {
    input = JSON.parse(args[jsonIdx + 1]);
  } catch (e) {
    console.error('Error: Invalid JSON');
    console.error(e.message);
    process.exit(1);
  }

  const { changes, errors } = validateAndPrepare(input, dryRun);

  if (errors.length > 0) {
    console.error('Validation errors:');
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  if (changes.length === 0) {
    console.log('No changes to apply.');
    process.exit(0);
  }

  if (dryRun) {
    console.log('DRY RUN - Preview of changes:\n');
  }

  for (const change of changes) {
    showDiff(change);
  }

  if (!dryRun) {
    console.log('');
    applyChanges(changes);
    console.log('\nBrain updated successfully.');
  } else {
    console.log('\nRun without --dry-run to apply changes.');
  }
}

// Export for use as module
export { validateAndPrepare, applyChanges, PATHS, LIMITS };
