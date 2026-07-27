const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const transformModulesCommonJs = require('@babel/plugin-transform-modules-commonjs');

const originalJsLoader = require.extensions['.js'];
const srcRoot = path.resolve(__dirname, '..', 'src');

require.extensions['.js'] = function loadProjectModule(module, filename) {
  if (!filename.startsWith(srcRoot + path.sep)) {
    originalJsLoader(module, filename);
    return;
  }

  const source = fs.readFileSync(filename, 'utf8');
  const result = babel.transformSync(source, {
    babelrc: false,
    configFile: false,
    filename,
    plugins: [transformModulesCommonJs],
  });

  module._compile(result.code, filename);
};
