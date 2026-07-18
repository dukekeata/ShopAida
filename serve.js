const http = require('http');
const fs = require('fs');
const path = require('path');
const port = process.env.PORT || 5500;
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

http.createServer((req, res) => {
  try {
    let urlPath = decodeURI(req.url.split('?')[0]);
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
    const filePath = path.join(__dirname, urlPath);
    fs.stat(filePath, (err, stats) => {
      if (err) {
        res.writeHead(404, {
          'Content-Type': 'text/plain',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'no-referrer-when-downgrade',
          'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
        });
        res.end('Not found');
        return;
      }
      if (stats.isDirectory()) {
        res.writeHead(301, { Location: urlPath + '/' });
        res.end();
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const type = mime[ext] || 'application/octet-stream';
      fs.readFile(filePath, (err2, data) => {
        if (err2) {
          res.writeHead(500, {
            'Content-Type': 'text/plain',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'Referrer-Policy': 'no-referrer-when-downgrade',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
          });
          res.end('Server error');
          return;
        }
        const headers = {
          'Content-Type': type,
          'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'no-referrer-when-downgrade',
          'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
        };
        res.writeHead(200, headers);
        res.end(data);
      });
    });
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Server error');
  }
}).listen(port, () => console.log(`Static server running on http://localhost:${port}`));