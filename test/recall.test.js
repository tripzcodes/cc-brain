/**
 * Tests for src/recall.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { join } from 'path';
import { createTempDir, cleanupTempDir, createBrainStructure, createFile, evalWithEnv } from './helpers.js';

describe('recall', () => {
  let tempDir;
  let brain;

  beforeEach(() => {
    tempDir = createTempDir();
    // Create .brain-id first so the brain structure uses it
    createFile(tempDir, '.brain-id', 'test-project\n');
    brain = createBrainStructure(tempDir, 'test-project');

    // Create test archive files
    createFile(brain.archive, '2025-01-15-120000.md', `# Session 2025-01-15

This is a test session about authentication.
We discussed OAuth and JWT tokens.
`);

    createFile(brain.archive, '2025-01-20-140000.md', `# Session 2025-01-20

Working on the API endpoints.
Added user authentication middleware.
`);

    createFile(brain.projects, 'context.md', `# Project Context

## What
Test project for recall

## Current Focus
- Testing search functionality
`);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('searchArchive', () => {
    it('finds matches in archive files', () => {
      const code = `
        import { searchArchive } from './src/recall.js';
        const results = searchArchive('authentication');
        console.log(JSON.stringify(results.map(r => r.file)));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      const files = JSON.parse(stdout);
      expect(files.length).toBeGreaterThan(0);
    });

    it('finds matches in context.md', () => {
      const code = `
        import { searchArchive } from './src/recall.js';
        const results = searchArchive('Test project');
        console.log(JSON.stringify(results.map(r => r.file)));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      const files = JSON.parse(stdout);
      expect(files).toContain('context.md');
    });

    it('returns empty array for no matches', () => {
      const code = `
        import { searchArchive } from './src/recall.js';
        const results = searchArchive('xyznonexistent');
        console.log(JSON.stringify(results));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(JSON.parse(stdout)).toEqual([]);
    });

    it('case-insensitive search', () => {
      const code = `
        import { searchArchive } from './src/recall.js';
        const results = searchArchive('OAUTH');
        console.log(results.length);
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(parseInt(stdout)).toBeGreaterThan(0);
    });

    it('supports regex patterns', () => {
      const code = `
        import { searchArchive } from './src/recall.js';
        const results = searchArchive('OAuth.*JWT');
        console.log(results.length);
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(parseInt(stdout)).toBeGreaterThan(0);
    });

    it('falls back to literal for invalid regex', () => {
      // Invalid regex should not throw, falls back to escaped literal
      const code = `
        import { searchArchive } from './src/recall.js';
        try {
          const results = searchArchive('[invalid(regex');
          console.log('ok');
        } catch (e) {
          console.log('error');
        }
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(stdout).toBe('ok');
    });

    it('scores header matches higher', () => {
      const code = `
        import { searchArchive } from './src/recall.js';
        const results = searchArchive('Session');
        // Check if results with headers have higher scores
        const hasHeaderBonus = results.some(r =>
          r.matches.some(m => m.text.startsWith('#')) && r.score > r.matchCount
        );
        console.log(hasHeaderBonus);
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(stdout).toBe('true');
    });

    it('includes context lines when requested', () => {
      const code = `
        import { searchArchive } from './src/recall.js';
        const results = searchArchive('OAuth', { context: true });
        const hasContext = results.length > 0 &&
          results[0].matches[0].context &&
          Array.isArray(results[0].matches[0].context);
        console.log(hasContext);
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(stdout).toBe('true');
    });

    it('returns match line numbers', () => {
      const code = `
        import { searchArchive } from './src/recall.js';
        const results = searchArchive('authentication');
        const hasLineNumbers = results.length > 0 &&
          results.every(r => r.matches.every(m => typeof m.line === 'number' && m.line > 0));
        console.log(hasLineNumbers);
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(stdout).toBe('true');
    });
  });

  describe('regex safety', () => {
    it('handles special regex characters in query', () => {
      const queries = ['test.file', 'path/to/file', '$variable', 'array[0]', 'a+b*c?'];

      for (const query of queries) {
        const code = `
          import { searchArchive } from './src/recall.js';
          try {
            searchArchive(${JSON.stringify(query)});
            console.log('ok');
          } catch (e) {
            console.log('error: ' + e.message);
          }
        `;

        const { stdout } = evalWithEnv(code, {
          CC_BRAIN_DIR: brain.brain,
          CLAUDE_PROJECT_DIR: tempDir
        });

        expect(stdout).toBe('ok');
      }
    });
  });
});
