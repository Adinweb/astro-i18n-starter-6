#!/usr/bin/env node
/**
 * Merges two-tier dictionaries and compiles Paraglide messages into `src/paraglide/`.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileMessages } from './lib/compile-messages.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

compileMessages(rootDir);
