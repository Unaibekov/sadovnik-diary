const assert = require('node:assert/strict');
const test = require('node:test');

function loadGuruConfigWithWindow(windowValue) {
  const configPath = require.resolve('../../src/config/guru.js');
  const constantsPath = require.resolve('expo-constants');
  const previousWindow = global.window;
  const previousConstants = require.cache[constantsPath];

  delete require.cache[configPath];
  require.cache[constantsPath] = {
    exports: {
      default: {},
    },
  };

  if (windowValue === undefined) {
    delete global.window;
  } else {
    global.window = windowValue;
  }

  try {
    return require('../../src/config/guru.js');
  } finally {
    delete require.cache[configPath];

    if (previousConstants) {
      require.cache[constantsPath] = previousConstants;
    } else {
      delete require.cache[constantsPath];
    }

    if (previousWindow === undefined) {
      delete global.window;
    } else {
      global.window = previousWindow;
    }
  }
}

test('guru config falls back to localhost backend for web dev when expo extra is unavailable', () => {
  const guruConfig = loadGuruConfigWithWindow({
    location: {
      hostname: 'localhost',
      protocol: 'http:',
    },
  });

  assert.equal(guruConfig.AI_BACKEND_BASE_URL, 'http://localhost:8787');
});
