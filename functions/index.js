const functions = require('firebase-functions');
const admin = require('firebase-admin');
const vision = require('@google-cloud/vision');

admin.initializeApp();
const client = new vision.ImageAnnotatorClient();

exports.ocrTextDetection = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

    const buffer = Buffer.from(imageBase64, 'base64');
    const [result] = await client.textDetection(buffer);
    const detections = result.textAnnotations;

    const fullText = detections.length > 0 ? detections[0].description : '';
    const rawResponse = detections.slice(1).map(d => ({
      text: d.description,
      confidence: d.score,
      vertices: d.boundingPoly.vertices
    }));

    res.json({ fullText, rawResponse });
  } catch (err) {
    console.error('OCR error:', err);
    res.status(500).json({ error: 'OCR failed', details: err.message });
  }
});
