const https = require('https');
const crypto = require('crypto');
const { URLSearchParams, URL } = require('url');
const fs = require('fs');

const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const AUTH_ORIGIN = 'https://accounts.google.com';
const AUTH_PROXY = 'https://auth.firebase.tools';
const BUCKET_NAME = 'ipprc-certificate-verification.firebasestorage.app';
const CORS_CONFIG = require('./cors.json');
const STATE_FILE = './.cors-auth-state.json';

function base64UrlEncode(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const AI_AGENT = process.env.AI_AGENT || process.env.OPENCODE || process.env.OPENCODE_CLIENT;
const agentStr = AI_AGENT ? ' agent-name/' + AI_AGENT : '';
const USER_AGENT = 'FirebaseCLI/15.28.2' + agentStr;

function postJSON(url, body, headers = {}) {
  const data = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': USER_AGENT,
        'X-Client-Version': USER_AGENT,
        'Connection': 'keep-alive',
        ...headers,
      },
    }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(responseBody)); } catch (e) { resolve({ raw: responseBody, status: res.statusCode }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
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

function apiRequest(method, path, accessToken, body) {
  const options = {
    hostname: 'storage.googleapis.com',
    path, method,
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    },
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: responseBody }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function httpsRequest(method, hostname, path, accessToken, body) {
  const headers = {};
  if (accessToken) {
    headers.Authorization = 'Bearer ' + accessToken;
  }
  if (body) {
    headers['Content-Type'] = 'application/json';
  }
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method, headers }, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: responseBody }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function setCorsOnBucket(accessToken, bucketName) {
  return apiRequest('PATCH', '/storage/v1/b/' + bucketName + '?fields=cors', accessToken, { cors: CORS_CONFIG });
}

function handleResult(res, accessToken) {
  if (res.status === 200 || res.status === 201) {
    console.log('\nCORS configuration applied successfully!');
    console.log('Bucket:', BUCKET_NAME);
    console.log('Origins:', CORS_CONFIG[0].origin.join(', '));
    console.log('Methods:', CORS_CONFIG[0].method.join(', '));
    console.log('\nDone! Refresh your web app. The CORS config is active immediately.');
    return true;
  } else if (res.status === 404) {
    console.error('Bucket not found (HTTP 404). Trying alternative bucket name...');
    return false;
  } else {
    console.error('Failed to set CORS: HTTP ' + res.status);
    console.error('Response:', res.body);
    return false;
  }
}

async function getLoginUrl() {
  console.log('Connecting to Firebase auth proxy...\n');

  const sessionId = crypto.randomUUID();
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const codeChallenge = base64UrlEncode(crypto.createHash('sha256').update(codeVerifier).digest());

  const attestRes = await postJSON(AUTH_PROXY + '/attest', { session_id: sessionId });
  if (!attestRes.token) {
    throw new Error('Failed to get attestation token: ' + JSON.stringify(attestRes));
  }

  const loginUrl = AUTH_PROXY + '/login?code_challenge=' + codeChallenge + '&session=' + sessionId + '&attest=' + attestRes.token;

  const state = { sessionId, codeVerifier, loginUrl };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));

  return state;
}

async function exchangeCode(code) {
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  console.log('Exchanging authorization code for tokens...');

  const tokens = await postForm(AUTH_ORIGIN + '/o/oauth2/token', {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: code,
    redirect_uri: AUTH_PROXY + '/complete',
    grant_type: 'authorization_code',
    code_verifier: state.codeVerifier,
  });

  if (tokens.error) {
    console.error('Token exchange error:', tokens);
    console.error('\nPossible causes:');
    console.error('- The authorization code has expired (valid for ~10 minutes)');
    console.error('- The code was entered incorrectly');
    console.error('- Try running "node setup-cors.js" again to get a fresh URL');
    process.exit(1);
  }

  // Save the full token response for reuse
  Object.assign(state, tokens);
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));

  console.log('Authentication successful!');
  return tokens.access_token;
}

async function main() {
  const code = process.argv[2];
  const isSecondArgCode = typeof code === 'string' && code.length > 10 && !code.startsWith('-');

  if (!isSecondArgCode) {
    console.log('Firebase Storage CORS Setup');
    console.log('============================');
    console.log('Project: ipprc-certificate-verification');
    console.log('Bucket:', BUCKET_NAME);
    console.log('Config: cors.json\n');

    const { loginUrl, sessionId } = await getLoginUrl();

    console.log('=== ACTION REQUIRED ===');
    console.log('1. Open this URL on ANY device (phone, tablet, another computer):');
    console.log('   ' + loginUrl);
    console.log('');
    console.log('2. Sign in with the Google account for project: ipprc-certificate-verification');
    console.log('3. Grant Cloud Storage permissions');
    console.log('4. Copy the authorization code displayed on the page');
    console.log('');
    console.log('5. Run this command again with the code:');
    console.log('   node setup-cors.js "YOUR_AUTH_CODE"\n');
  } else {
    const accessToken = await exchangeCode(code);

    // First, list all buckets to find the correct bucket name
    console.log('\nListing available buckets...');
    const listRes = await httpsRequest('GET', 'storage.googleapis.com', '/storage/v1/b?project=ipprc-certificate-verification', accessToken);
    const listData = JSON.parse(listRes.body);
    if (listData.buckets) {
      console.log('Available buckets:');
      listData.buckets.forEach(b => console.log(' -', b.name));
    } else {
      console.log('No buckets returned:', listData);
    }

    // Try setting CORS on each available bucket
    let corsSet = false;
    if (listData.buckets) {
      for (const bucket of listData.buckets) {
        console.log('\nTrying bucket:', bucket.name);
        const res = await setCorsOnBucket(accessToken, bucket.name);
        if (handleResult(res, accessToken)) {
          corsSet = true;
          break;
        }
      }
    }

    // If no bucket worked, try the default names
    if (!corsSet) {
      console.log('\nSetting CORS configuration on bucket:', BUCKET_NAME);
      const res = await setCorsOnBucket(accessToken, BUCKET_NAME);
      if (!handleResult(res, accessToken)) {
        const res2 = await setCorsOnBucket(accessToken, 'ipprc-certificate-verification.appspot.com');
        if (!handleResult(res2, accessToken)) {
          console.error('\nCould not set CORS on any bucket.');
          console.error('Check the bucket name in: https://console.cloud.google.com/storage/browser');
          process.exit(1);
        }
      }
    }

    fs.unlinkSync(STATE_FILE);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
