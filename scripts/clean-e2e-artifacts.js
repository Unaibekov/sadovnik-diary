const fs = require('fs');
const path = require('path');

const allureResultsDir = path.join(process.cwd(), 'allure-results');

if (fs.existsSync(allureResultsDir)) {
  for (const entry of fs.readdirSync(allureResultsDir)) {
    const target = path.join(allureResultsDir, entry);
    try {
      fs.rmSync(target, { force: true, recursive: true });
    } catch (error) {
      if (error && error.code !== 'ENOENT' && error.code !== 'EPERM') {
        throw error;
      }
    }
  }
}
