const functions = require('firebase-functions');
const admin = require('firebase-admin');
const vision = require('@google-cloud/vision');

admin.initializeApp();
const client = new vision.ImageAnnotatorClient();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function normalizeBase64Image(imageBase64) {
  if (typeof imageBase64 !== 'string' || !imageBase64.trim()) {
    throw new Error('No image provided');
  }

  const imageValue = imageBase64.trim();
  const dataUriMatch = imageValue.match(/^data:image\/(?:png|jpeg|jpg|gif|webp);base64,(.+)$/i);
  const base64 = (dataUriMatch ? dataUriMatch[1] : imageValue).replace(/\s+/g, '');

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error('Invalid base64 image');
  }

  const buffer = Buffer.from(base64, 'base64');
  if (buffer.length === 0) {
    throw new Error('Empty image data');
  }

  return buffer;
}

function getErrorPayload(err) {
  return {
    code: err.code || err.status || err.statusCode,
    message: err.message,
    details: err.details || err.errors
  };
}

exports.ocrTextDetection = functions.https.onRequest(async (req, res) => {
  res.set(corsHeaders);

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const { imageBase64 } = req.body || {};
    const buffer = normalizeBase64Image(imageBase64);

    const [result] = await client.documentTextDetection({
      image: { content: buffer.toString('base64') }
    });

    if (result?.error) {
      throw result.error;
    }

    const detections = result.textAnnotations || [];
    const fullText = detections.length > 0 ? detections[0].description || '' : '';
    const rawResponse = detections.slice(1).map(d => ({
      text: d.description || '',
      confidence: d.score,
      vertices: d.boundingPoly?.vertices || []
    }));

    return res.status(200).json({ fullText, rawResponse });
  } catch (err) {
    console.error('OCR error:', err);

    const isClientError = err.message === 'No image provided'
      || err.message === 'Invalid base64 image'
      || err.message === 'Empty image data'
      || err.code === 'INVALID_ARGUMENT';

    return res.status(isClientError ? 400 : 500).json({
      error: isClientError ? 'Invalid image request' : 'OCR failed',
      ...getErrorPayload(err)
    });
  }
});
