import { writeFileSync, renameSync, unlinkSync, existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

/**
 * Atomic file write: write to temp file then rename.
 * Handles Windows limitation where rename fails if target exists.
 */
export function safeWriteFileSync(filePath, content) {
  const resolved = resolve(filePath);
  const tmp = `${resolved}.tmp.${process.pid}`;

  try {
    writeFileSync(tmp, content);

    // On Windows, renameSync fails if target exists — remove first
    if (process.platform === 'win32' && existsSync(resolved)) {
      unlinkSync(resolved);
    }

    renameSync(tmp, resolved);
  } catch (err) {
    // Clean up temp file on failure
    try { unlinkSync(tmp); } catch {}
    throw err;
  }
}

/**
 * Cross-runtime check for whether a module is the main entry point.
 * Works in both Node and Bun.
 */
export function isMainModule(importMetaUrl) {
  // Bun sets import.meta.main
  if (typeof globalThis.Bun !== 'undefined') {
    // When called from the main module in Bun, we compare resolved paths
    try {
      const modulePath = fileURLToPath(importMetaUrl);
      const mainPath = process.argv[1];
      return resolve(modulePath) === resolve(mainPath);
    } catch {
      return false;
    }
  }

  // Node: compare resolved file paths
  try {
    const modulePath = fileURLToPath(importMetaUrl);
    const mainPath = process.argv[1];
    return resolve(modulePath) === resolve(mainPath);
  } catch {
    return false;
  }
}
