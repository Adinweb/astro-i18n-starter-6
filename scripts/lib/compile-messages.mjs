import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { prepareParaglideWorkspace } from './merge-messages.mjs';

/**
 * Resolves the installed `@inlang/paraglide-js` CLI entry point by walking up
 * from `startDir`, supporting both flat `node_modules` and hoisted workspaces.
 *
 * @param {string} [startDir=process.cwd()]
 * @returns {string | null}
 */
export function findParaglideBin(startDir = process.cwd()) {
  if (process.env.PARAGLIDE_BIN && fs.existsSync(process.env.PARAGLIDE_BIN)) {
    return process.env.PARAGLIDE_BIN;
  }

  const starts = [path.resolve(startDir), path.resolve(import.meta.dirname, '..', '..')];
  for (const start of starts) {
    let dir = start;
    while (true) {
      const candidate = path.join(dir, 'node_modules', '@inlang', 'paraglide-js', 'bin', 'run.js');
      if (fs.existsSync(candidate)) return candidate;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  return null;
}

/**
 * Merges core + client dictionaries into `.paraglide-work/` and compiles
 * Paraglide output into `src/paraglide/`.
 *
 * @param {string} [rootDir=process.cwd()]
 */
export function compileMessages(rootDir = process.cwd()) {
  const { inlangDir } = prepareParaglideWorkspace(rootDir);
  const compilerBin = findParaglideBin(rootDir);
  const outdirPath = path.join(rootDir, 'src', 'paraglide');

  if (compilerBin) {
    execFileSync(
      process.execPath,
      [compilerBin, 'compile', '--project', inlangDir, '--outdir', outdirPath],
      { cwd: rootDir, stdio: 'inherit' }
    );
    return;
  }

  const runPackageScript = (manager) =>
    execFileSync(manager, ['run', 'messages:compile'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

  try {
    runPackageScript('npm');
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'EINVAL')) {
      runPackageScript('pnpm');
      return;
    }
    throw err;
  }
}
