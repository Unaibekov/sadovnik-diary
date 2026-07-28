const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const webDistDir = path.join(os.tmpdir(), `sadovnik-web-${Date.now()}-${process.pid}`);

function runNodeScript(scriptName, args = []) {
  const result = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', scriptName), ...args], {
    cwd: projectRoot,
    env: {
      ...process.env,
      WEB_DIST_DIR: webDistDir,
    },
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

const exportStatus = runNodeScript('export-web.js');

if (exportStatus !== 0) {
  process.exit(exportStatus);
}

process.exit(runNodeScript('serve-dist.js', process.argv.slice(2)));
