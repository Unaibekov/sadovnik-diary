const { spawnSync } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = process.env.WEB_DIST_DIR
  ? path.resolve(process.env.WEB_DIST_DIR)
  : path.join(projectRoot, 'dist');

const expoCli = require.resolve('expo/bin/cli');
const result = spawnSync(
  process.execPath,
  [expoCli, 'export', '--platform', 'web', '--output-dir', outputDir, '--max-workers', '1'],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      WEB_DIST_DIR: outputDir,
    },
    stdio: 'inherit',
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
