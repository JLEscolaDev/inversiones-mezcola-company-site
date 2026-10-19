import { spawnSync } from 'node:child_process';
for (const args of [['exec', 'tsc', '--noEmit'], ['exec', 'eslint', '.', '--max-warnings=0']]) {
  const result = spawnSync('pnpm', args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('QUALITY_PASS');
