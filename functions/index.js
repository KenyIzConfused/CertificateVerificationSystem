const { onRequest } = require('firebase-functions/v2/https');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

exports.helloWorld = onRequest((req, res) => {
  res.set(corsHeaders);
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  return res.status(200).send('Hello from Firebase Functions!');
});
