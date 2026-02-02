/**
 * Tests for src/project-id.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import { createTempDir, cleanupTempDir, createFile, evalWithEnv } from './helpers.js';

describe('project-id', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('getProjectId', () => {
    it('reads from .brain-id file if exists', () => {
      createFile(tempDir, '.brain-id', 'my-custom-id\n');

      const code = `
        import { getProjectId } from './src/project-id.js';
        console.log(getProjectId());
      `;

      const { stdout } = evalWithEnv(code, {
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(stdout).toBe('my-custom-id');
    });

    it('falls back to directory name when no .brain-id', () => {
      const code = `
        import { getProjectId } from './src/project-id.js';
        console.log(getProjectId());
      `;

      const { stdout } = evalWithEnv(code, {
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(stdout).toBe(basename(tempDir));
    });

    it('trims whitespace from .brain-id', () => {
      createFile(tempDir, '.brain-id', '  spaced-id  \n\n');

      const code = `
        import { getProjectId } from './src/project-id.js';
        console.log(getProjectId());
      `;

      const { stdout } = evalWithEnv(code, {
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(stdout).toBe('spaced-id');
    });
  });

  describe('initBrainId', () => {
    it('creates .brain-id with UUID', () => {
      const code = `
        import { initBrainId } from './src/project-id.js';
        // Suppress the console output, just get the returned value
        const origLog = console.log;
        console.log = () => {};
        const id = initBrainId();
        console.log = origLog;
        process.stdout.write(id);
      `;

      const { stdout } = evalWithEnv(code, {
        CLAUDE_PROJECT_DIR: tempDir
      });

      // Should be a valid UUID format
      expect(stdout).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

      // File should exist
      const brainIdPath = join(tempDir, '.brain-id');
      expect(existsSync(brainIdPath)).toBe(true);
      expect(readFileSync(brainIdPath, 'utf-8').trim()).toBe(stdout);
    });

    it('returns existing ID if .brain-id exists', () => {
      const existingId = 'existing-uuid-here';
      createFile(tempDir, '.brain-id', existingId + '\n');

      const code = `
        import { initBrainId } from './src/project-id.js';
        // Suppress the console output, just get the returned value
        const origLog = console.log;
        console.log = () => {};
        const id = initBrainId();
        console.log = origLog;
        process.stdout.write(id);
      `;

      const { stdout } = evalWithEnv(code, {
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(stdout).toBe(existingId);
    });
  });

  describe('getProjectBrainPath', () => {
    it('returns correct path structure', () => {
      createFile(tempDir, '.brain-id', 'test-project-id\n');

      const brainDir = join(tempDir, 'brain');

      const code = `
        import { getProjectBrainPath } from './src/project-id.js';
        console.log(getProjectBrainPath());
      `;

      const { stdout } = evalWithEnv(code, {
        CLAUDE_PROJECT_DIR: tempDir,
        CC_BRAIN_DIR: brainDir
      });

      expect(stdout).toBe(join(brainDir, 'projects', 'test-project-id'));
    });
  });
});
