/* global console */

const { loadDotEnv } = require('./env.cjs');

loadDotEnv();

const { readServerConfig } = require('./config.cjs');
const { createAiProxyServer } = require('./create-server.cjs');
const { createGuruClient } = require('./guru-client.cjs');

const config = readServerConfig();
const guruClient = createGuruClient({
  allowedModels: [config.guruModel],
  defaultModel: config.guruModel,
  endpoint: config.guruEndpoint,
  logger: console,
  timeoutMs: config.guruTimeoutMs,
  token: config.guruAccessToken,
});
const server = createAiProxyServer({
  allowedOrigins: config.allowedOrigins,
  guruClient,
  logger: console,
});

server.listen(config.port, '0.0.0.0', () => {
  console.log(`AI proxy listening on http://localhost:${config.port}`);
});
