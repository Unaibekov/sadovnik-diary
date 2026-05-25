const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');

const port = Number(process.env.PORT || 4173);
const root = path.resolve(__dirname, '..', 'dist');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.wasm': 'application/wasm',
  '.hbc': 'application/octet-stream',
};

function send(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
  });
  res.end(body);
}

function getLocalUrls() {
  const addresses = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        addresses.push(`http://${entry.address}:${port}`);
      }
    }
  }
  return addresses;
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://localhost:${port}`);
  const decodedPath = decodeURIComponent(requestUrl.pathname);
  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const filePath = path.resolve(root, `.${requestedPath}`);

  if (!filePath.startsWith(root)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    const fallbackPath = path.join(root, 'index.html');
    const finalPath = !statError && stat.isFile() ? filePath : fallbackPath;

    fs.readFile(finalPath, (readError, data) => {
      if (readError) {
        send(res, 404, 'Run npm run export:web first.');
        return;
      }

      const extension = path.extname(finalPath).toLowerCase();
      send(res, 200, data, contentTypes[extension] || 'application/octet-stream');
    });
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Serving ${root}`);
  console.log(`Local: http://localhost:${port}`);
  for (const url of getLocalUrls()) {
    console.log(`Phone: ${url}`);
  }
});
