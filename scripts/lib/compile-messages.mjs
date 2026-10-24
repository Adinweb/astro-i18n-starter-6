import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';

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

  let dir = path.resolve(startDir);
  while (true) {
    const candidate = path.join(dir, 'node_modules', '@inlang', 'paraglide-js', 'bin', 'run.js');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

/**
 * Compiles `messages/*.json` into `src/paraglide/`.
 *
 * Runs the installed `@inlang/paraglide-js` CLI entry point directly under the
 * active Node.js binary when `node_modules` is present, avoiding a hard runtime
 * dependency on `pnpm` (so `npm`, `pnpm`, or bare `node` invocations all work).
 * Falls back to `pnpm run messages:compile` when running inside a dependency-less
 * sandbox such as `scripts/verify-cli.mjs`.
 *
 * @param {string} [rootDir=process.cwd()]
 */
export function compileMessages(rootDir = process.cwd()) {
  const compilerBin = findParaglideBin(rootDir);
  const projectPath = path.join(rootDir, 'project.inlang');
  const outdirPath = path.join(rootDir, 'src', 'paraglide');

  if (compilerBin) {
    execFileSync(
      process.execPath,
      [compilerBin, 'compile', '--project', projectPath, '--outdir', outdirPath],
      { cwd: rootDir, stdio: 'inherit' }
    );
    return;
  }

  execSync('pnpm run messages:compile', { cwd: rootDir, stdio: 'inherit' });
}
