/**
 * Shared confirmation prompt for the destructive CLI scripts.
 *
 * Every `remove:*` script asks the same yes/no question before deleting
 * anything, so the prompt lives here once instead of being copied into each
 * script.
 */
import readline from 'node:readline';

/**
 * Asks a yes/no question on stdin.
 *
 * @param {string} question Text shown to the user, including the `[default: …]` hint.
 * @param {{ defaultYes?: boolean }} [options] Answer used when the input is empty.
 * @returns {Promise<boolean>} `true` when the user confirmed.
 */
export async function askYesNo(question, { defaultYes = false } = {}) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await new Promise((resolve) => rl.question(question, resolve));
    const value = answer.trim().toLowerCase();
    if (value === '') return defaultYes;
    return value === 'y' || value === 'yes';
  } finally {
    rl.close();
  }
}

/**
 * Confirms a destructive action, skipping the prompt when `--force` was given.
 *
 * @param {{ question: string, force?: boolean, defaultYes?: boolean }} options
 * @returns {Promise<boolean>} `true` when the action may proceed.
 */
export function confirmDeletion({ question, force = false, defaultYes = false }) {
  if (force) return Promise.resolve(true);
  return askYesNo(question, { defaultYes });
}
