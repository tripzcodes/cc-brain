/**
 * Tests for src/archive.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, utimesSync } from 'fs';
import { join } from 'path';
import { createTempDir, cleanupTempDir, createBrainStructure, createFile, evalWithEnv } from './helpers.js';

describe('archive', () => {
  let tempDir;
  let brain;

  beforeEach(() => {
    tempDir = createTempDir();
    // Create .brain-id first so the brain structure uses it
    createFile(tempDir, '.brain-id', 'test-project\n');
    brain = createBrainStructure(tempDir, 'test-project');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('getArchiveEntries', () => {
    it('returns empty array when no archive', () => {
      const code = `
        import { getArchiveEntries } from './src/archive.js';
        console.log(JSON.stringify(getArchiveEntries()));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(JSON.parse(stdout)).toEqual([]);
    });

    it('returns archive entries', () => {
      createFile(brain.archive, '2025-01-10.md', 'old');
      createFile(brain.archive, '2025-01-20.md', 'new');
      createFile(brain.archive, '2025-01-15.md', 'mid');

      const code = `
        import { getArchiveEntries } from './src/archive.js';
        const entries = getArchiveEntries();
        console.log(JSON.stringify(entries.map(e => e.name)));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      const names = JSON.parse(stdout);
      expect(names.length).toBe(3);
      expect(names).toContain('2025-01-10.md');
      expect(names).toContain('2025-01-15.md');
      expect(names).toContain('2025-01-20.md');
    });

    it('only returns .md files', () => {
      createFile(brain.archive, 'test.md', 'content');
      createFile(brain.archive, 'test.txt', 'content');
      createFile(brain.archive, 'test.json', 'content');

      const code = `
        import { getArchiveEntries } from './src/archive.js';
        const entries = getArchiveEntries();
        console.log(JSON.stringify(entries.map(e => e.name)));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      const names = JSON.parse(stdout);
      expect(names.length).toBe(1);
      expect(names[0]).toBe('test.md');
    });

    it('includes file metadata', () => {
      createFile(brain.archive, '2025-01-15.md', 'test content here');

      const code = `
        import { getArchiveEntries } from './src/archive.js';
        const entries = getArchiveEntries();
        const e = entries[0];
        console.log(JSON.stringify({
          name: e.name,
          hasPath: !!e.path,
          hasDate: !!e.date,
          hasSize: e.size > 0
        }));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      const result = JSON.parse(stdout);
      expect(result.name).toBe('2025-01-15.md');
      expect(result.hasPath).toBe(true);
      expect(result.hasDate).toBe(true);
      expect(result.hasSize).toBe(true);
    });
  });

  describe('autoPrune', () => {
    it('returns empty array when nothing to prune', () => {
      // Create recent file
      createFile(brain.archive, '2025-01-15.md', 'recent');

      const code = `
        import { autoPrune } from './src/archive.js';
        const deleted = autoPrune(90, true);
        console.log(JSON.stringify(deleted));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(JSON.parse(stdout)).toEqual([]);
    });

    it('deletes files older than specified days', () => {
      // Create a file and manually backdate it
      const oldFile = createFile(brain.archive, 'old-file.md', 'old content');

      // Set mtime to 100 days ago
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);
      utimesSync(oldFile, oldDate, oldDate);

      const code = `
        import { autoPrune } from './src/archive.js';
        const deleted = autoPrune(90, true);
        console.log(JSON.stringify(deleted));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      const deleted = JSON.parse(stdout);
      expect(deleted).toContain('old-file.md');
      expect(existsSync(oldFile)).toBe(false);
    });

    it('keeps files newer than cutoff', () => {
      const newFile = createFile(brain.archive, 'new-file.md', 'new content');

      const code = `
        import { autoPrune } from './src/archive.js';
        const deleted = autoPrune(90, true);
        console.log(JSON.stringify(deleted));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(JSON.parse(stdout)).toEqual([]);
      expect(existsSync(newFile)).toBe(true);
    });
  });
});
