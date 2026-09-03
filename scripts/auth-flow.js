const https = require('https');
const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const { URLSearchParams } = require('url');

const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const AUTH_ORIGIN = 'https://accounts.google.com';
const BUCKET_NAME = 'ipprc-certificate-verification.firebasestorage.app';
const CORS_CONFIG = require('./cors.json');
const PORT = 9005;
const SCOPES = [
  'https://www.googleapis.com/auth/devstorage.full_control',
  'https://www.googleapis.com/auth/cloud-platform',
];

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function postForm(url, params) {
  const data = new URLSearchParams(params).toString();
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve({ raw: body, status: res.statusCode }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function gcsRequest(method, path, accessToken, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = https.request('https://storage.googleapis.com' + path, {
      method,
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: responseBody }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const verifier = b64url(crypto.randomBytes(32));
const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());

const authUrl = AUTH_ORIGIN + '/o/oauth2/auth?' + new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: 'http://localhost:' + PORT,
  response_type: 'code',
  scope: SCOPES.join(' '),
  access_type: 'offline',
  include_granted_scopes: 'true',
  code_challenge: challenge,
  code_challenge_method: 'S256',
}).toString();

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, 'http://localhost:' + PORT);
  const code = urlObj.searchParams.get('code');
  const error = urlObj.searchParams.get('error');

  if (code) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Authentication successful!</h1><p>You can close this window.</p>');
    server.close();
    completeAuth(code, verifier).catch(console.error);
  } else if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('<h1>Authentication failed</h1><p>' + error + '</p>');
    server.close();
    console.error('Auth error:', error);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

async function completeAuth(code, codeVerifier) {
  console.log('\nExchanging authorization code for tokens...');
  const tokens = await postForm(AUTH_ORIGIN + '/o/oauth2/token', {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: code,
    redirect_uri: 'http://localhost:' + PORT,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  });

  if (tokens.error) {
    console.error('Token exchange error:', tokens);
    process.exit(1);
  }

  console.log('Authentication successful!\n');

  // Try primary bucket name
  let res = await gcsRequest('PATCH', '/storage/v1/b/' + BUCKET_NAME + '?fields=cors', tokens.access_token, { cors: CORS_CONFIG });

  if (res.status !== 200 && res.status !== 201) {
    if (res.status === 404) {
      console.log('Bucket not found with .firebasestorage.app, trying .appspot.com...');
      res = await gcsRequest('PATCH', '/storage/v1/b/ipprc-certificate-verification.appspot.com?fields=cors', tokens.access_token, { cors: CORS_CONFIG });
    }
  }

  if (res.status === 200 || res.status === 201) {
    console.log('CORS configuration applied successfully!');
    console.log('Bucket:', BUCKET_NAME);
    console.log('Origins:', CORS_CONFIG[0].origin.join(', '));
    console.log('Methods:', CORS_CONFIG[0].method.join(', '));
    console.log('\nDone! Refresh your web app. CORS is active immediately.');
  } else {
    console.error('Failed to set CORS: HTTP ' + res.status);
    console.error('Response:', res.body.substring(0, 500));
    process.exit(1);
  }
}

server.listen(PORT, () => {
  console.log('Firebase Storage CORS Setup');
  console.log('===========================');
  console.log('Project: ipprc-certificate-verification');
  console.log('Bucket:', BUCKET_NAME);
  console.log('');
  console.log('Local server listening on port', PORT);
  console.log('Opening browser for Google authentication...\n');

  exec('start "" "' + authUrl.replace(/&/g, '^&') + '"', (err) => {
    if (err) {
      console.log('Could not open browser. Visit this URL manually:');
      console.log(authUrl);
    }
  });

  console.log('Waiting for browser authentication (timeout: 10 minutes)...');
  console.log('If the browser doesn\'t open automatically, paste this URL in your browser:');
  console.log(authUrl);
});

setTimeout(() => {
  try { server.close(); } catch (e) {}
  console.log('\nTimed out waiting for authentication.');
  console.log('You can also manually set CORS by running:');
  console.log('gsutil cors set cors.json gs://' + BUCKET_NAME);
  process.exit(0);
}, 600000);
