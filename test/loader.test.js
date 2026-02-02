/**
 * Tests for src/loader.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, utimesSync } from 'fs';
import { join } from 'path';
import { createTempDir, cleanupTempDir, createBrainStructure, createFile, evalWithEnv, runScript } from './helpers.js';

describe('loader', () => {
  let tempDir;
  let brain;

  beforeEach(() => {
    tempDir = createTempDir();
    createFile(tempDir, '.brain-id', 'test-project\n');
    brain = createBrainStructure(tempDir, 'test-project');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('loadBrain output', () => {
    it('wraps user profile in <user-profile> tags', () => {
      // Need enough content to pass the "has content" filter
      createFile(brain.brain, 'user.md', '# User Profile\n\nName: Test User\nRole: Developer');

      const { stdout, stderr } = runScript('./src/loader.js', [], {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(stdout).toContain('<user-profile>');
      expect(stdout).toContain('</user-profile>');
      expect(stdout).toContain('Test User');
    });

    it('wraps preferences in <preferences> tags', () => {
      createFile(brain.brain, 'preferences.md', '# Preferences\n\nEditor: VSCode\nTheme: Dark');

      const { stdout } = runScript('./src/loader.js', [], {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(stdout).toContain('<preferences>');
      expect(stdout).toContain('</preferences>');
      expect(stdout).toContain('VSCode');
    });

    it('wraps project context with ID attribute', () => {
      createFile(brain.projects, 'context.md', '# Context\n\n## What\nProject context here\n\n## Focus\n- Task 1');

      const { stdout } = runScript('./src/loader.js', [], {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(stdout).toContain('<project id="test-project">');
      expect(stdout).toContain('</project>');
      expect(stdout).toContain('Project context here');
    });

    it('includes archive count hint', () => {
      // Need at least one content file for output
      createFile(brain.brain, 'user.md', '# User\n\nName: Test');
      createFile(brain.archive, '2025-01-15.md', 'archive content');
      createFile(brain.archive, '2025-01-16.md', 'archive content');

      const { stdout } = runScript('./src/loader.js', [], {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(stdout).toContain('<archive entries="2"');
      expect(stdout).toContain('/recall');
    });

    it('wraps everything in <brain> tags', () => {
      createFile(brain.brain, 'user.md', '# User\n\nName: Content User');

      const { stdout } = runScript('./src/loader.js', [], {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(stdout).toContain('<brain>');
      expect(stdout).toContain('</brain>');
    });
  });

  describe('auto-prune', () => {
    it('deletes archive entries older than 90 days', () => {
      // Need content to trigger output
      createFile(brain.brain, 'user.md', '# User\n\nName: Test');

      const oldFile = createFile(brain.archive, 'old-entry.md', 'old content');

      // Set mtime to 100 days ago
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100);
      utimesSync(oldFile, oldDate, oldDate);

      const { stdout } = runScript('./src/loader.js', [], {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      // File should be deleted
      expect(existsSync(oldFile)).toBe(false);
      // Output should mention auto-pruned
      expect(stdout).toContain('Auto-pruned');
    });

    it('keeps recent entries', () => {
      const recentFile = createFile(brain.archive, 'recent-entry.md', 'recent content');

      runScript('./src/loader.js', [], {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(existsSync(recentFile)).toBe(true);
    });
  });

  describe('line limits', () => {
    it('truncates user.md content exceeding 40 lines', () => {
      // Create user.md with more than 40 lines of actual content
      const lines = ['# User Profile', ''].concat(Array(50).fill('Line with actual content here')).join('\n');
      createFile(brain.brain, 'user.md', lines);

      const { stdout } = runScript('./src/loader.js', [], {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(stdout).toContain('truncated');
    });

    it('truncates context.md content exceeding 120 lines', () => {
      // Create context.md with more than 120 lines of actual content
      const lines = ['# Context', ''].concat(Array(150).fill('Line with actual content here')).join('\n');
      createFile(brain.projects, 'context.md', lines);

      const { stdout } = runScript('./src/loader.js', [], {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(stdout).toContain('truncated');
    });
  });

  describe('missing files', () => {
    it('handles missing user.md gracefully', () => {
      // No user.md file
      const { stdout, exitCode } = runScript('./src/loader.js', [], {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(exitCode).toBe(0);
      expect(stdout).not.toContain('<user-profile>');
    });

    it('handles missing context.md gracefully', () => {
      createFile(brain.brain, 'user.md', '# User\nContent');
      // No context.md file

      const { stdout, exitCode } = runScript('./src/loader.js', [], {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(exitCode).toBe(0);
      expect(stdout).not.toContain('<project');
    });

    it('creates project directories if missing', () => {
      const newBrainDir = join(tempDir, 'new-brain');
      createFile(tempDir, '.brain-id', 'new-project\n');

      // Run loader - it should create directories
      runScript('./src/loader.js', [], {
        CC_BRAIN_DIR: newBrainDir,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(existsSync(join(newBrainDir, 'projects', 'new-project'))).toBe(true);
      expect(existsSync(join(newBrainDir, 'projects', 'new-project', 'archive'))).toBe(true);
    });
  });
});
