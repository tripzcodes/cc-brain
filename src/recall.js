#!/usr/bin/env node

/**
 * Archive Search (Recall)
 * Grep-based search through T3 archive
 *
 * Usage:
 *   bun src/recall.js "search term"     # Search archive for term
 *   bun src/recall.js "regex.*pattern"  # Regex search
 *   bun src/recall.js "term" --context  # Show surrounding context
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getProjectId } from './project-id.js';
import { isMainModule } from './utils.js';

const BRAIN_DIR = process.env.CC_BRAIN_DIR || join(homedir(), '.claude', 'brain');
const PROJECT_ID = getProjectId();
const ARCHIVE_DIR = join(BRAIN_DIR, 'projects', PROJECT_ID, 'archive');
const CONTEXT_DIR = join(BRAIN_DIR, 'projects', PROJECT_ID);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildRegex(query) {
  try {
    return new RegExp(query, 'i');
  } catch {
    return new RegExp(escapeRegex(query), 'i');
  }
}

function searchArchive(query, options = {}) {
  const results = [];
  const regex = buildRegex(query);

  // Search archive files
  if (existsSync(ARCHIVE_DIR)) {
    const files = readdirSync(ARCHIVE_DIR).filter(f => f.endsWith('.md'));

    for (const file of files) {
      const path = join(ARCHIVE_DIR, file);
      const content = readFileSync(path, 'utf-8');
      const lines = content.split('\n');

      const matches = [];
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          const match = {
            line: i + 1,
            text: lines[i].trim(),
            context: []
          };

          if (options.context) {
            // Add surrounding lines
            const start = Math.max(0, i - 2);
            const end = Math.min(lines.length - 1, i + 2);
            for (let j = start; j <= end; j++) {
              if (j !== i) {
                match.context.push({ line: j + 1, text: lines[j].trim() });
              }
            }
          }

          matches.push(match);
        }
      }

      if (matches.length > 0) {
        // Extract date from filename (e.g., 2025-01-31.md)
        const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1] : 'unknown';

        // Score: header matches (#) get bonus weight
        let score = matches.length;
        for (const m of matches) {
          if (/^#{1,6}\s/.test(m.text)) score += 2;
        }

        results.push({
          file,
          date,
          path,
          matches,
          matchCount: matches.length,
          score
        });
      }
    }
  }

  // Also search current context.md
  const contextPath = join(CONTEXT_DIR, 'context.md');
  if (existsSync(contextPath)) {
    const content = readFileSync(contextPath, 'utf-8');
    const lines = content.split('\n');

    const matches = [];
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        matches.push({
          line: i + 1,
          text: lines[i].trim()
        });
      }
    }

    if (matches.length > 0) {
      let score = matches.length;
      for (const m of matches) {
        if (/^#{1,6}\s/.test(m.text)) score += 2;
      }

      results.unshift({
        file: 'context.md',
        date: 'current',
        path: contextPath,
        matches,
        matchCount: matches.length,
        score
      });
    }
  }

  // Sort by score (most relevant first), then by date
  results.sort((a, b) => {
    if (a.date === 'current') return -1;
    if (b.date === 'current') return 1;
    if (b.score !== a.score) return b.score - a.score;
    return b.date.localeCompare(a.date);
  });

  return results;
}

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

function highlight(text, query) {
  if (!useColor) return text;
  try {
    const highlightRegex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(highlightRegex, '\x1b[33m$1\x1b[0m');
  } catch {
    return text;
  }
}

function formatResults(results, query) {
  if (results.length === 0) {
    console.log(`No results found for: "${query}"`);
    console.log(`\nArchive location: ${ARCHIVE_DIR}`);
    return;
  }

  console.log(`Found ${results.reduce((sum, r) => sum + r.matchCount, 0)} matches in ${results.length} files for: "${query}"\n`);

  for (const result of results) {
    console.log(`── ${result.file} (${result.date}) ──`);

    for (const match of result.matches) {
      const highlighted = highlight(match.text, query);
      console.log(`  L${match.line}: ${highlighted}`);

      if (match.context && match.context.length > 0) {
        for (const ctx of match.context) {
          console.log(`     ${ctx.line}: ${ctx.text}`);
        }
      }
    }
    console.log('');
  }
}

// CLI
if (isMainModule(import.meta.url)) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: bun src/recall.js <query> [options]

Search the brain archive for past context and decisions.

Arguments:
  query            Search term or regex pattern

Options:
  --context        Show surrounding lines for each match
  --json           Output results as JSON
  --help           Show this help

Examples:
  bun src/recall.js "authentication"
  bun src/recall.js "why.*choose" --context
  bun src/recall.js "API" --json`);
    process.exit(0);
  }

  const query = args.find(a => !a.startsWith('--'));
  const showContext = args.includes('--context');
  const jsonOutput = args.includes('--json');

  if (!query) {
    console.error('Error: search query required');
    process.exit(1);
  }

  const results = searchArchive(query, { context: showContext });

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    formatResults(results, query);
  }
}

// Export for use as module
export { searchArchive, ARCHIVE_DIR };
