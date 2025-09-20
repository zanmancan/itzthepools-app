#!/usr/bin/env node
// Cross-platform runner that only executes lint-staged and exits with its code.

import { spawnSync } from 'node:child_process';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(npx, ['--no', 'lint-staged'], {
  stdio: 'inherit',
});

// If lint-staged ran, propagate its exit code (0 = success)
process.exit(result.status ?? 1);
