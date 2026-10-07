// Local dev server with the same pretty-URL rewrites as firebase.json.
//
// Usage:
//   node scripts/dev-server.js [port]      (default port: 8080)
//
// Then open http://localhost:8080 - pretty URLs such as /event-crud
// work exactly like in production. (python -m http.server and VS Code
// Live Server do not apply rewrites, so with those servers only the
// .html links work and the address bar shows .html paths.)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[2] || process.env.PORT || 8080);
const ROOT = path.join(__dirname, '..');

// Mirrors the hosting rewrites in firebase.json / vercel.json.
const REWRITES = [
  { source: '/event-crud', destination: '/EventCRUD/EventCRUD.html' },
  { source: '/certificate-management', destination: '/CertificateManagement/CertificateManagement.html' },
  { source: '/attendee-management', destination: '/AttendeeManagement/AttendeeManagement.html' },
  { source: '/admin-login', destination: '/logIn/LogInAdmin.html' },
  { source: '/verify-certificate', destination: '/CertificateVerification/CertificateVerification.html' },
  { source: '/signup', destination: '/SignUp/SignUpAdmin.html' },
  { source: '/forgot-password', destination: '/logIn/ForgotPassword.html' },
  { source: '/reset-password', destination: '/logIn/ResetPassword.html' },
  { source: '/settings', destination: '/EventCRUD/Settings.html' }
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.zip': 'application/zip'
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  } catch (error) {
    urlPath = req.url.split('?')[0];
  }

  let filePath = urlPath;
  if (urlPath === '/' || urlPath === '') {
    filePath = '/index.html';
  } else if (!path.extname(urlPath)) {
    // Extensionless path - apply the pretty-URL rewrites.
    const rule = REWRITES.find((r) => r.source === urlPath.toLowerCase());
    if (rule) {
      filePath = rule.destination;
    }
  }

  const fullPath = path.normalize(path.join(ROOT, filePath));
  if (!fullPath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const type = MIME[path.extname(fullPath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
  console.log('Pretty URLs (e.g. /event-crud, /verify-certificate) are supported.');
});
