#!/usr/bin/env node
/**
 * Switches the starter's default (`DEFAULT_LOCALE` / `baseLocale`) language to
 * any registered locale, keeping `project.inlang/settings.json`,
 * `src/i18n/locales.ts`, and compiled Paraglide messages in sync.
 *
 * Usage:
 *   pnpm run i18n:set-default <locale-code> [--allow-draft]
 */
import { switchDefaultLocale } from './lib/locale-mutations.mjs';

const args = process.argv.slice(2);
const wantsHelp = args.includes('--help') || args.includes('-h');
const targetLocale = args.find((a) => !a.startsWith('-'));
const allowDraftHome = args.includes('--allow-draft');

if (wantsHelp || !targetLocale) {
  console.error('Usage: pnpm run i18n:set-default <locale-code> [--allow-draft]');
  process.exit(wantsHelp ? 0 : 1);
}

try {
  const result = switchDefaultLocale(targetLocale, {
    rootDir: process.cwd(),
    allowDraftHome,
    compile: true,
  });

  for (const warning of result.warnings) {
    console.warn(`⚠️  Warning: ${warning}`);
  }

  if (!result.changed) {
    console.log(`ℹ️  "${targetLocale}" is already the default locale.`);
    process.exit(0);
  }

  console.log(`✅ Updated baseLocale to "${targetLocale}" in project.inlang/settings.json`);
  console.log(`✅ Updated DEFAULT_LOCALE to "${targetLocale}" in src/i18n/locales.ts`);
  console.log(
    `🎉 Default locale switched to "${targetLocale}" (${result.meta.name ?? targetLocale}, dir=${result.meta.dir ?? 'ltr'})!`
  );
  console.log('   Next: run `pnpm run audit:i18n && pnpm run build && pnpm run smoke` to verify.');
} catch (error) {
  console.error('❌', error instanceof Error ? error.message : String(error));
  process.exit(1);
}
