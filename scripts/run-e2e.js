const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const outputDir = path.join(os.tmpdir(), `sadovnik-playwright-${Date.now()}-${process.pid}`);
process.env.PWTEST_OUTPUT_DIR = outputDir;

const cliPath = path.join(process.cwd(), 'node_modules', 'playwright', 'cli.js');
const result = spawnSync(process.execPath, [cliPath, 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
