const path = require('path');
const { onRequest } = require('firebase-functions/v2/https');
const { getErrorPayload, processOcrRequest } = require('./services/mistralOcrService');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const ocrRuntime = {
  secrets: ['MISTRAL_API_KEY'],
  timeoutSeconds: 540,
  memory: '2GB'
};

function redactedKeyValue(value) {
  if (!value) return 'missing';
  return `${value.slice(0, 4)}...${value.slice(-4)} (${value.length} chars)`;
}

exports.mistralApiCheck = onRequest({ secrets: ['MISTRAL_API_KEY'] }, async (req, res) => {
  console.log('[mistralApiCheck] function startup', {
    projectId: process.env.GCLOUD_PROJECT,
    functionTarget: process.env.FUNCTION_TARGET,
    functionSignatureType: process.env.FUNCTION_SIGNATURE_TYPE,
    region: process.env.FUNCTION_REGION
  });

  res.set(corsHeaders);

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'GET') {
    console.warn('[mistralApiCheck] method not allowed', { method: req.method });
    return res.status(405).json({ error: 'GET only' });
  }

  console.log('[mistralApiCheck] request received', {
    method: req.method,
    path: req.path,
    query: req.query,
    headers: {
      host: req.get('host'),
      'user-agent': req.get('user-agent')
    }
  });

  const apiKey = process.env.MISTRAL_API_KEY;
  console.log('[mistralApiCheck] MISTRAL_API_KEY detection', {
    present: Boolean(apiKey),
    value: redactedKeyValue(apiKey)
  });

  if (!apiKey) {
    console.error('[mistralApiCheck] missing API key');
    return res.status(500).json({
      ok: false,
      error: 'MISTRAL_API_KEY is not available to this function'
    });
  }

  try {
    const mistralUrl = 'https://api.mistral.ai/v1/models';
    console.log('[mistralApiCheck] sending Mistral request', {
      method: 'GET',
      url: mistralUrl,
      authorizationHeaderPresent: Boolean(apiKey)
    });

    const response = await fetch(mistralUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });

    const body = await response.json().catch(() => ({}));
    const models = Array.isArray(body.data) ? body.data : [];

    console.log('[mistralApiCheck] Mistral response received', {
      status: response.status,
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      modelCount: models.length,
      bodyKeys: Object.keys(body)
    });

    if (!response.ok) {
      console.warn('[mistralApiCheck] Mistral API returned non-OK response', {
        status: response.status,
        body
      });

      return res.status(response.status).json({
        ok: false,
        status: response.status,
        message: body.message || body.error || 'Mistral API check failed'
      });
    }

    return res.status(200).json({
      ok: true,
      message: 'Mistral API connection successful',
      modelCount: models.length,
      sampleModels: models.slice(0, 10).map(model => model.id)
    });
  } catch (err) {
    console.error('[mistralApiCheck] Mistral request error', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });

    return res.status(500).json({
      ok: false,
      message: 'Failed to contact Mistral API',
      details: err.message
    });
  }
});

exports.ocrTest = onRequest((req, res) => {
  res.set(corsHeaders);

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  return res.sendFile(path.join(__dirname, 'pages', 'ocrTest.html'));
});

async function handleOcrRequest(req, res) {
  console.log('[OCR] handleOcrRequest started', {
    method: req.method,
    path: req.path,
    contentType: req.headers['content-type']
  });

  res.set(corsHeaders);

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    console.warn('[OCR] Method not allowed', { method: req.method });
    return res.status(405).json({ ok: false, error: 'POST only' });
  }

  try {
    if (req.headers['content-type']?.includes('application/json')) {
      let body = req.body;
      if (Buffer.isBuffer(body)) {
        try {
          body = JSON.parse(body.toString('utf8'));
          req.body = body;
        } catch (parseErr) {
          console.error('[OCR] JSON parse error', { error: parseErr.message });
          return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
        }
      }
    }

    const result = await processOcrRequest(req);
    console.log('[OCR] OCR processing completed', { ok: result.ok });
    return res.status(200).json(result);
  } catch (err) {
    console.error('[OCR] OCR request failed', {
      code: err.code,
      message: err.message,
      stack: err.stack
    });

    const isClientError = err.code === 'INVALID_FILE_TYPE'
      || err.code === 'EMPTY_FILE'
      || err.code === 'FILE_TOO_LARGE'
      || err.code === 'INVALID_BASE64'
      || err.code === 'NO_FILE'
      || err.code === 'INVALID_REQUEST'
      || err.code === 'FILE_READ_ERROR'
      || err.code === 'FILE_PARSE_ERROR';

    return res.status(isClientError ? 400 : 500).json({
      ok: false,
      error: isClientError ? 'OCR input failed validation' : 'OCR processing failed',
      ...getErrorPayload(err)
    });
  }
}

exports.ocrProcess = onRequest(ocrRuntime, handleOcrRequest);
exports.mistralOCR = onRequest(ocrRuntime, handleOcrRequest);
