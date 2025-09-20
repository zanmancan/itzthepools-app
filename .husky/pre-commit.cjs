/* eslint-disable no-console */
const { spawnSync } = require('node:child_process');

const isWin = process.platform === 'win32';

// Run lint-staged using local npx; stdio=inherit so you see output in Desktop or CLI.
const result = spawnSync('npx', ['lint-staged'], {
  stdio: 'inherit',
  shell: isWin, // make Windows happy
});

// Propagate exit code so Husky fails if lint-staged fails (and succeeds otherwise).
process.exit(result.status ?? 0);
