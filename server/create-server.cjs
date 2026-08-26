/* global Buffer */

const http = require('http');
const { URL } = require('url');
const { createGuruClient } = require('./guru-client.cjs');

function createLogger(logger) {
  if (!logger) {
    return {
      error() {},
      info() {},
      warn() {},
    };
  }

  return {
    error: typeof logger.error === 'function' ? logger.error.bind(logger) : () => {},
    info: typeof logger.info === 'function' ? logger.info.bind(logger) : () => {},
    warn: typeof logger.warn === 'function' ? logger.warn.bind(logger) : () => {},
  };
}

function sendJson(res, statusCode, payload, headers = {}) {
  const body = JSON.stringify(payload);

  res.writeHead(statusCode, {
    'Cache-Control': 'no-cache',
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
  res.end(body);
}

function buildCorsHeaders(origin, allowedOrigins) {
  if (!origin || !allowedOrigins.includes(origin)) {
    return null;
  }

  return {
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function readJsonBody(req, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;

      if (size > maxBytes) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch {
        reject(new Error('invalid_json'));
      }
    });

    req.on('error', reject);
  });
}

function createAiProxyServer({
  allowedOrigins = [],
  guruClient,
  logger = null,
} = {}) {
  const safeLogger = createLogger(logger);
  const resolvedGuruClient = guruClient || createGuruClient();

  return http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url, 'http://localhost');
    const corsHeaders = buildCorsHeaders(req.headers.origin, allowedOrigins);

    if (requestUrl.pathname !== '/api/ai/chat') {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    if (req.method === 'OPTIONS') {
      if (!corsHeaders) {
        sendJson(res, 403, { error: 'Origin not allowed' });
        return;
      }

      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    if (!corsHeaders && req.headers.origin) {
      sendJson(res, 403, { error: 'Origin not allowed' });
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' }, corsHeaders || {});
      return;
    }

    let body;

    try {
      body = await readJsonBody(req);
    } catch (error) {
      if (error?.message === 'payload_too_large') {
        sendJson(res, 413, { error: 'Payload too large' }, corsHeaders || {});
        return;
      }

      sendJson(res, 400, { error: 'Invalid JSON' }, corsHeaders || {});
      return;
    }

    try {
      const result = await resolvedGuruClient.sendMessage({
        context: body.context,
        dialogueUuid: body.dialogue_uuid,
        model: body.model,
        text: body.text,
      });

      sendJson(res, 200, result, corsHeaders || {});
    } catch (error) {
      const statusCode = Number(error?.statusCode) || 503;

      safeLogger.warn('AI proxy request failed', {
        error: error?.error || error?.message || 'unknown_error',
        statusCode,
        upstreamStatus: error?.upstreamStatus || null,
      });

      sendJson(
        res,
        statusCode,
        { error: error?.error || 'AI service temporarily unavailable' },
        corsHeaders || {},
      );
    }
  });
}

module.exports = {
  buildCorsHeaders,
  createAiProxyServer,
  readJsonBody,
};
