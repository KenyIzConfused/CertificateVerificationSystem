const https = require('https');
const { URLSearchParams } = require('url');
const fs = require('fs');

const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const AUTH_ORIGIN = 'https://accounts.google.com';
const CORS_CONFIG = require('./cors.json');

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

async function main() {
  const state = JSON.parse(fs.readFileSync('.cors-auth-state.json', 'utf8'));
  const authCode = process.argv[2];

  if (!authCode) {
    console.error('Usage: node set-cors-final.js "AUTH_CODE"');
    process.exit(1);
  }

  console.log('Exchanging authorization code for tokens...');
  const tokens = await postForm(AUTH_ORIGIN + '/o/oauth2/token', {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: authCode,
    redirect_uri: 'https://auth.firebase.tools/complete',
    grant_type: 'authorization_code',
    code_verifier: state.codeVerifier,
  });

  if (tokens.error) {
    console.error('Token exchange error:', tokens);
    console.error('The auth code may have expired. Please re-run: node setup-cors.js');
    process.exit(1);
  }

  console.log('Authentication successful!\n');
  console.log('Access token scopes:', tokens.scope || '(unknown)');

  // List buckets
  const accessToken = tokens.access_token;
  console.log('\nListing buckets in project: ipprc-certificate-verification');

  const listRes = await new Promise((resolve, reject) => {
    const req = https.request('https://storage.googleapis.com/storage/v1/b?project=ipprc-certificate-verification', {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + accessToken },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });

  console.log('List buckets status:', listRes.status);
  const listData = JSON.parse(listRes.body);
  if (listData.items) {
    console.log('Buckets found:');
    listData.items.forEach(b => {
      console.log('  -', b.id, '(name:', b.name + ')');
    });
  } else {
    console.log('No buckets returned:', listRes.body.substring(0, 300));
  }

  // Try setting CORS on each bucket
  const bucketNames = [
    'ipprc-certificate-verification.firebasestorage.app',
    'ipprc-certificate-verification.appspot.com',
  ];

  if (listData.items) {
    listData.items.forEach(b => {
      if (!bucketNames.includes(b.name)) {
        bucketNames.push(b.name);
      }
    });
  }

  for (const bucketName of bucketNames) {
    console.log('\nTrying bucket:', bucketName);
    const corsRes = await new Promise((resolve, reject) => {
      const data = JSON.stringify({ cors: CORS_CONFIG });
      const req = https.request('https://storage.googleapis.com/storage/v1/b/' + bucketName + '?fields=cors', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });

    console.log('  Status:', corsRes.status);
    if (corsRes.status === 200 || corsRes.status === 201) {
      console.log('\nCORS configuration applied successfully!');
      console.log('Bucket:', bucketName);
      console.log('Origins:', CORS_CONFIG[0].origin.join(', '));
      console.log('Methods:', CORS_CONFIG[0].method.join(', '));
      console.log('\nDone! Refresh your web app. CORS is active immediately.');
      return;
    } else {
      console.log('  Response:', corsRes.body.substring(0, 200));
    }
  }

  console.error('\nCould not set CORS on any bucket.');
  fs.unlinkSync('.cors-auth-state.json');
  process.exit(1);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
