import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

function extractScale(transform: string): number {
  const match = transform.match(/scaleX\(([^)]+)\)/);
  return match ? Number.parseFloat(match[1]) : Number.NaN;
}

describe('TopLoadingBar fake-loading progression', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('isolates #nprogress from root View Transitions and hides it on print', () => {
    const src = fs.readFileSync(path.join(rootDir, 'src/components/TopLoadingBar.astro'), 'utf-8');
    const globalCss = fs.readFileSync(path.join(rootDir, 'src/styles/global.css'), 'utf-8');

    expect(src).toContain('view-transition-name: top-loading-bar;');
    expect(src).toContain('::view-transition-old(top-loading-bar)');
    expect(src).toContain('::view-transition-new(top-loading-bar)');
    expect(src).toContain("html[data-motion='reduced'] #nprogress");
    expect(globalCss).toContain('#nprogress,');
  });

  it('progresses monotonically forward, fades out at 100% before resetting silently to 0, and resets cleanly on rapid clicks', () => {
    const src = fs.readFileSync(path.join(rootDir, 'src/components/TopLoadingBar.astro'), 'utf-8');
    const scriptMatch = src.match(/<script>([\s\S]*?)<\/script>/);
    expect(scriptMatch).toBeTruthy();

    const js = ts.transpileModule(scriptMatch![1], {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    }).outputText;

    const docListeners = new Map<string, () => void>();
    const winListeners = new Map<string, () => void>();
    const classes = new Set<string>();
    const transformLog: Array<{ opacity: string; transform: string; transition: string }> = [];

    const bar = {
      classList: {
        add: (...names: string[]) => names.forEach((n) => classes.add(n)),
        remove: (...names: string[]) => names.forEach((n) => classes.delete(n)),
        contains: (name: string) => classes.has(name),
      },
      style: {
        _opacity: '0',
        _transform: 'scaleX(0)',
        _transition: '',
        get opacity() {
          return this._opacity;
        },
        set opacity(v: string) {
          this._opacity = v;
        },
        get transform() {
          return this._transform;
        },
        set transform(v: string) {
          this._transform = v;
          transformLog.push({ opacity: this._opacity, transform: v, transition: this._transition });
        },
        get transition() {
          return this._transition;
        },
        set transition(v: string) {
          this._transition = v;
        },
      },
      get offsetWidth() {
        return 1280;
      },
    };

    const fakeDoc = {
      documentElement: { dataset: {} as Record<string, string> },
      getElementById: (id: string) => (id === 'nprogress' ? bar : null),
      addEventListener: (event: string, cb: () => void) => {
        docListeners.set(event, cb);
      },
    };

    const fakeWin = {
      matchMedia: () => ({ matches: false }),
      setInterval: globalThis.setInterval.bind(globalThis),
      clearInterval: globalThis.clearInterval.bind(globalThis),
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
      addEventListener: (event: string, cb: () => void) => {
        winListeners.set(event, cb);
      },
    };

    const run = new Function('document', 'window', js);
    run(fakeDoc, fakeWin);

    const start = docListeners.get('astro:before-preparation')!;
    const afterPrep = docListeners.get('astro:after-preparation')!;
    const pageLoad = docListeners.get('astro:page-load')!;
    expect(start).toBeTypeOf('function');
    expect(afterPrep).toBeTypeOf('function');
    expect(pageLoad).toBeTypeOf('function');

    // 1. Start loading: snaps cleanly to 0 without transition, then sweeps forward monotonically.
    start();
    expect(bar.style.opacity).toBe('1');
    expect(extractScale(bar.style.transform)).toBeCloseTo(0.14, 2);

    vi.advanceTimersByTime(500);
    const midProgress = extractScale(bar.style.transform);
    expect(midProgress).toBeGreaterThan(0.14);
    expect(midProgress).toBeLessThanOrEqual(0.9);

    // 2. Finish loading: sweeps to 100%, holds at 100%, fades opacity ONLY while staying at 100%.
    afterPrep();
    pageLoad(); // duplicate finish event must be ignored
    expect(extractScale(bar.style.transform)).toBe(1);
    expect(bar.style.opacity).toBe('1');

    // Advance past COMPLETE_HOLD_MS (240ms) -> opacity fades to 0, scaleX stays 1!
    vi.advanceTimersByTime(250);
    expect(bar.style.opacity).toBe('0');
    expect(extractScale(bar.style.transform)).toBe(1);

    // Advance past FADE_OUT_MS (220ms) -> resets to scaleX(0) ONLY while opacity is 0 and transition is 'none'.
    vi.advanceTimersByTime(230);
    expect(bar.style.opacity).toBe('0');
    expect(extractScale(bar.style.transform)).toBe(0);
    const lastResetWrite = transformLog[transformLog.length - 1];
    expect(lastResetWrite).toEqual({ opacity: '0', transform: 'scaleX(0)', transition: 'none' });

    // 3. Rapid click during hold/fade-out cancels stale fade timers and snaps to 0 with transition:'none'.
    transformLog.length = 0;
    start();
    afterPrep();
    vi.advanceTimersByTime(100); // still in COMPLETE_HOLD_MS
    start(); // rapid second navigation
    // Verify snap-to-zero had transition='none' and stale timers from run 1 do not hide run 2
    expect(transformLog.some((entry) => entry.transform === 'scaleX(0)' && entry.transition === 'none')).toBe(true);
    vi.advanceTimersByTime(500);
    expect(bar.style.opacity).toBe('1');
    expect(extractScale(bar.style.transform)).toBeGreaterThan(0.14);
  });
});
