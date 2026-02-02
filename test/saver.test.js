/**
 * Tests for src/saver.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createTempDir, cleanupTempDir, createBrainStructure, createFile, evalWithEnv, runScript } from './helpers.js';

describe('saver', () => {
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

  describe('input validation', () => {
    it('rejects non-object input', () => {
      const code = `
        import { validateAndPrepare } from './src/saver.js';
        const { errors } = validateAndPrepare('string');
        console.log(JSON.stringify(errors));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      const errors = JSON.parse(stdout);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('must be a JSON object');
    });

    it('rejects array input', () => {
      const code = `
        import { validateAndPrepare } from './src/saver.js';
        const { errors } = validateAndPrepare([1, 2, 3]);
        console.log(JSON.stringify(errors));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      const errors = JSON.parse(stdout);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects null input', () => {
      const code = `
        import { validateAndPrepare } from './src/saver.js';
        const { errors } = validateAndPrepare(null);
        console.log(JSON.stringify(errors));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      const errors = JSON.parse(stdout);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('rejects unknown keys', () => {
      const code = `
        import { validateAndPrepare } from './src/saver.js';
        const { errors } = validateAndPrepare({ unknown_key: 'value' });
        console.log(JSON.stringify(errors));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      const errors = JSON.parse(stdout);
      expect(errors.some(e => e.includes('Unknown key'))).toBe(true);
    });

    it('accepts valid keys', () => {
      const code = `
        import { validateAndPrepare } from './src/saver.js';
        const { errors } = validateAndPrepare({
          t1_user: { test: ['value'] },
          t1_prefs: { test: ['value'] },
          t2: { what: 'test' },
          t3: 'summary'
        });
        console.log(JSON.stringify(errors));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(JSON.parse(stdout)).toEqual([]);
    });

    it('rejects t1_user as non-object', () => {
      const code = `
        import { validateAndPrepare } from './src/saver.js';
        const { errors } = validateAndPrepare({ t1_user: 'string' });
        console.log(JSON.stringify(errors));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      const errors = JSON.parse(stdout);
      expect(errors.some(e => e.includes('t1_user must be an object'))).toBe(true);
    });

    it('rejects t3 as non-string', () => {
      const code = `
        import { validateAndPrepare } from './src/saver.js';
        const { errors } = validateAndPrepare({ t3: { obj: true } });
        console.log(JSON.stringify(errors));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      const errors = JSON.parse(stdout);
      expect(errors.some(e => e.includes('t3 must be a string'))).toBe(true);
    });
  });

  describe('line limits', () => {
    it('enforces t1_user limit (40 lines)', () => {
      // Create content that exceeds 40 lines
      const bigContent = {};
      for (let i = 0; i < 50; i++) {
        bigContent[`key${i}`] = [`value${i}`];
      }

      const code = `
        import { validateAndPrepare } from './src/saver.js';
        const { errors } = validateAndPrepare({ t1_user: ${JSON.stringify(bigContent)} });
        console.log(JSON.stringify(errors));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      const errors = JSON.parse(stdout);
      expect(errors.some(e => e.includes('exceeds limit'))).toBe(true);
    });

    it('enforces t2 limit (120 lines)', () => {
      const bigT2 = {
        what: 'test',
        focus: Array(150).fill('item')
      };

      const code = `
        import { validateAndPrepare } from './src/saver.js';
        const { errors } = validateAndPrepare({ t2: ${JSON.stringify(bigT2)} });
        console.log(JSON.stringify(errors));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      const errors = JSON.parse(stdout);
      expect(errors.some(e => e.includes('exceeds limit'))).toBe(true);
    });

    it('accepts content within limits', () => {
      const code = `
        import { validateAndPrepare } from './src/saver.js';
        const { errors, changes } = validateAndPrepare({
          t2: { what: 'test project', focus: ['task1', 'task2'] }
        });
        console.log(JSON.stringify({ errCount: errors.length, changeCount: changes.length }));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      const result = JSON.parse(stdout);
      expect(result.errCount).toBe(0);
      expect(result.changeCount).toBe(1);
    });
  });

  describe('T2 content generation', () => {
    it('generates correct structure with all fields', () => {
      const code = `
        import { validateAndPrepare } from './src/saver.js';
        const { changes } = validateAndPrepare({
          t2: {
            what: 'Test project',
            focus: ['task1', 'task2'],
            decisions: { 'Use bun': 'faster' },
            files: { 'src/main.js': 'entry point' },
            blockers: ['need API key']
          }
        });
        console.log(changes[0].after);
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(stdout).toContain('# Project Context');
      expect(stdout).toContain('## What');
      expect(stdout).toContain('Test project');
      expect(stdout).toContain('## Current Focus');
      expect(stdout).toContain('- task1');
      expect(stdout).toContain('## Decisions');
      expect(stdout).toContain('Use bun: faster');
      expect(stdout).toContain('## Key Files');
      expect(stdout).toContain('`src/main.js`');
      expect(stdout).toContain('## Blockers');
    });
  });

  describe('T3 archive', () => {
    it('creates archive entry with timestamp filename', () => {
      const code = `
        import { validateAndPrepare } from './src/saver.js';
        const { changes } = validateAndPrepare({ t3: 'Session summary here' });
        console.log(JSON.stringify({
          tier: changes[0].tier,
          isNew: changes[0].isNew,
          pathMatch: /\\d{4}-\\d{2}-\\d{2}-\\d{6}\\.md$/.test(changes[0].path),
          hasContent: changes[0].after.includes('Session summary here')
        }));
      `;

      const { stdout } = evalWithEnv(code, {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      const result = JSON.parse(stdout);
      expect(result.tier).toBe('t3');
      expect(result.isNew).toBe(true);
      expect(result.pathMatch).toBe(true);
      expect(result.hasContent).toBe(true);
    });
  });

  describe('CLI', () => {
    it('saves T2 file via CLI', () => {
      const input = JSON.stringify({ t2: { what: 'CLI Test' } });

      const { stdout, exitCode } = runScript('./src/saver.js', ['--json', input], {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Saved');

      // Verify file was created
      const contextPath = join(brain.projects, 'context.md');
      expect(existsSync(contextPath)).toBe(true);
      expect(readFileSync(contextPath, 'utf-8')).toContain('CLI Test');
    });

    it('creates archive entry via CLI', () => {
      const input = JSON.stringify({ t3: 'Archive via CLI' });

      const { stdout, exitCode } = runScript('./src/saver.js', ['--json', input], {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Saved');

      // Verify archive file was created
      const archiveFiles = Bun.spawnSync(['ls', brain.archive]).stdout.toString();
      expect(archiveFiles).toMatch(/\d{4}-\d{2}-\d{2}-\d{6}\.md/);
    });

    it('dry-run does not write files', () => {
      const input = JSON.stringify({ t2: { what: 'Dry Run Test' } });

      const { stdout, exitCode } = runScript('./src/saver.js', ['--dry-run', '--json', input], {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(exitCode).toBe(0);
      expect(stdout).toContain('DRY RUN');

      // Verify file was NOT created
      const contextPath = join(brain.projects, 'context.md');
      expect(existsSync(contextPath)).toBe(false);
    });

    it('rejects invalid JSON', () => {
      const { stderr, exitCode } = runScript('./src/saver.js', ['--json', 'not-json'], {
        CC_BRAIN_DIR: brain.brain,
        CLAUDE_PROJECT_DIR: tempDir
      });

      expect(exitCode).toBe(1);
      expect(stderr).toContain('Invalid JSON');
    });
  });
});
