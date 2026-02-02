/**
 * Test Helpers
 * Shared utilities for tests
 */

import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { spawnSync } from 'child_process';

/**
 * Create an isolated temp directory for testing
 */
export function createTempDir() {
  const dir = join(tmpdir(), `cc-brain-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Remove temp directory
 */
export function cleanupTempDir(dir) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Create a file with content in a directory
 */
export function createFile(dir, filename, content) {
  const path = join(dir, filename);
  const parentDir = join(path, '..');
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }
  writeFileSync(path, content);
  return path;
}

/**
 * Temporarily override env vars, returns restore function
 */
export function mockEnv(vars) {
  const original = {};
  for (const key of Object.keys(vars)) {
    original[key] = process.env[key];
    if (vars[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = vars[key];
    }
  }
  return () => {
    for (const key of Object.keys(vars)) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  };
}

/**
 * Create a brain directory structure for testing
 */
export function createBrainStructure(baseDir, projectId = 'test-project') {
  const brain = join(baseDir, 'brain');
  const projects = join(brain, 'projects', projectId);
  const archive = join(projects, 'archive');

  mkdirSync(archive, { recursive: true });

  return {
    brain,
    projects,
    archive,
    userMd: join(brain, 'user.md'),
    prefsMd: join(brain, 'preferences.md'),
    contextMd: join(projects, 'context.md')
  };
}

/**
 * Run a script in a subprocess with custom env vars
 * This ensures module-level constants use the right values
 */
export function runScript(scriptPath, args = [], env = {}) {
  const result = spawnSync('bun', [scriptPath, ...args], {
    env: { ...process.env, ...env },
    encoding: 'utf-8',
    cwd: process.cwd()
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status
  };
}

/**
 * Run a Node/Bun expression and get the result
 */
export function evalWithEnv(code, env = {}) {
  const result = spawnSync('bun', ['-e', code], {
    env: { ...process.env, ...env },
    encoding: 'utf-8',
    cwd: process.cwd()
  });

  return {
    stdout: result.stdout?.trim() || '',
    stderr: result.stderr || '',
    exitCode: result.status
  };
}
