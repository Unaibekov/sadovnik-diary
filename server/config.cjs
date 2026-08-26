/* global process */

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:8082',
  'http://127.0.0.1:8082',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
  'http://localhost:8787',
  'http://127.0.0.1:8787',
];

function parseCsv(value, fallback = []) {
  const normalizedValue = `${value || ''}`.trim();

  if (!normalizedValue) {
    return fallback;
  }

  return normalizedValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function readServerConfig(env = process.env) {
  return {
    allowedOrigins: parseCsv(env.ALLOWED_ORIGINS, DEFAULT_ALLOWED_ORIGINS),
    guruAccessToken: `${env.GURU_ACCESS_TOKEN || ''}`.trim(),
    guruEndpoint: 'https://tatneft.guru/api/http',
    guruModel: `${env.GURU_MODEL || 'qwen2.5-72b'}`.trim(),
    guruTimeoutMs: Number(env.GURU_TIMEOUT_MS || 30000),
    port: Number(env.AI_SERVER_PORT || 8787),
  };
}

module.exports = {
  DEFAULT_ALLOWED_ORIGINS,
  readServerConfig,
};
