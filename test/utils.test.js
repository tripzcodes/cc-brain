/**
 * Tests for src/utils.js
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { safeWriteFileSync, isMainModule } from '../src/utils.js';
import { createTempDir, cleanupTempDir } from './helpers.js';

describe('safeWriteFileSync', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('writes a new file', () => {
    const path = join(tempDir, 'test.txt');
    safeWriteFileSync(path, 'hello world');

    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, 'utf-8')).toBe('hello world');
  });

  it('overwrites an existing file', () => {
    const path = join(tempDir, 'test.txt');
    safeWriteFileSync(path, 'first');
    safeWriteFileSync(path, 'second');

    expect(readFileSync(path, 'utf-8')).toBe('second');
  });

  it('creates parent directories if they exist', () => {
    const dir = join(tempDir, 'subdir');
    mkdirSync(dir, { recursive: true });
    const path = join(dir, 'test.txt');

    safeWriteFileSync(path, 'nested');

    expect(readFileSync(path, 'utf-8')).toBe('nested');
  });

  it('handles unicode content', () => {
    const path = join(tempDir, 'unicode.txt');
    const content = '你好世界 🌍 émojis';
    safeWriteFileSync(path, content);

    expect(readFileSync(path, 'utf-8')).toBe(content);
  });

  it('handles empty content', () => {
    const path = join(tempDir, 'empty.txt');
    safeWriteFileSync(path, '');

    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, 'utf-8')).toBe('');
  });

  it('cleans up temp file on success', () => {
    const path = join(tempDir, 'test.txt');
    safeWriteFileSync(path, 'content');

    // No .tmp files should remain
    const files = Bun.spawnSync(['ls', tempDir]).stdout.toString();
    expect(files).not.toContain('.tmp');
  });
});

describe('isMainModule', () => {
  it('returns a boolean', () => {
    const result = isMainModule(import.meta.url);
    expect(typeof result).toBe('boolean');
  });

  it('returns true for main entry point', () => {
    // When this test file is run by bun test, it IS the main module
    // So this test validates the function works correctly in that case
    const result = isMainModule(import.meta.url);
    // In bun test context, the test file is considered the entry point
    expect(result).toBe(true);
  });

  it('handles invalid URLs gracefully', () => {
    const result = isMainModule('invalid-url');
    expect(result).toBe(false);
  });

  it('handles empty string gracefully', () => {
    const result = isMainModule('');
    expect(result).toBe(false);
  });

  it('returns false for a different module URL', () => {
    // Pass a URL that is definitely not the main module
    const result = isMainModule('file:///some/other/module.js');
    expect(result).toBe(false);
  });
});
