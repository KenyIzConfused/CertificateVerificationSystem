const multer = require('multer');

const MISTRAL_OCR_MODEL = 'mistral-ocr-latest';
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const EXTENSION_MIME_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf'
};

class OcrInputError extends Error {
  constructor(message, code = 'INVALID_OCR_INPUT') {
    super(message);
    this.name = 'OcrInputError';
    this.code = code;
    this.statusCode = 400;
  }
}

class OcrApiError extends Error {
  constructor(message, statusCode = 502, code = 'MISTRAL_OCR_API_ERROR', details) {
    super(message);
    this.name = 'OcrApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

let mistralClientPromise;

async function getMistralClient() {
  if (mistralClientPromise) {
    return mistralClientPromise;
  }

  mistralClientPromise = (async () => {
    const { Mistral } = await import('@mistralai/mistralai');
    return new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  })();

  return mistralClientPromise;
}

function normalizeMimeType(mimeType, fileName = '') {
  const normalizedMimeType = (mimeType || '').toLowerCase().split(';')[0].trim();
  if (ALLOWED_MIME_TYPES.has(normalizedMimeType)) {
    return normalizedMimeType;
  }

  const extension = String(fileName || '').split('.').pop().toLowerCase();
  if (EXTENSION_MIME_TYPES[extension]) {
    return EXTENSION_MIME_TYPES[extension];
  }

  return normalizedMimeType;
}

function validateMimeType(mimeType, fileName = '') {
  const normalizedMimeType = normalizeMimeType(mimeType, fileName);
  if (!ALLOWED_MIME_TYPES.has(normalizedMimeType)) {
    throw new OcrInputError('Invalid file type. Upload JPG, PNG, or PDF files only.', 'INVALID_FILE_TYPE');
  }
  return normalizedMimeType;
}

function validateFileBuffer(buffer, fileName = '') {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new OcrInputError('Uploaded file is empty.', 'EMPTY_FILE');
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new OcrInputError(`File is too large. Maximum size is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`, 'FILE_TOO_LARGE');
  }

  const mimeType = validateMimeType('', fileName);
  return { buffer, mimeType, fileName };
}

function normalizeBase64Document(value, fileName = '') {
  if (typeof value !== 'string' || !value.trim()) {
    throw new OcrInputError('No file provided.', 'NO_FILE');
  }

  const dataUriMatch = value.trim().match(/^data:(application\/pdf|image\/(png|jpeg|jpg));base64,(.+)$/i);
  let mimeType;
  let base64;

  if (dataUriMatch) {
    mimeType = dataUriMatch[1].toLowerCase();
    if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
    base64 = dataUriMatch[3].replace(/\s+/g, '');
  } else {
    mimeType = validateMimeType('', fileName);
    base64 = value.trim().replace(/\s+/g, '');
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new OcrInputError('Invalid base64 file data.', 'INVALID_BASE64');
  }

  const buffer = Buffer.from(base64, 'base64');
  const normalizedMimeType = validateMimeType(mimeType, fileName);

  return { buffer, mimeType: normalizedMimeType, fileName };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 1
  }
});
const uploadSingleFile = upload.single('file');

function getMulterErrorCode(error) {
  if (error?.code === 'LIMIT_FILE_SIZE') return 'FILE_TOO_LARGE';
  if (error?.code === 'LIMIT_UNEXPECTED_FILE') return 'NO_FILE';
  if (error?.code === 'LIMIT_FILE_COUNT') return 'FILE_TOO_LARGE';
  return 'FILE_PARSE_ERROR';
}

function parseMultipartRequest(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      reject(new OcrInputError('Request must be multipart/form-data or JSON.', 'INVALID_REQUEST'));
      return;
    }

    uploadSingleFile(req, {}, error => {
      if (error) {
        reject(new OcrInputError(error.message || 'Failed to parse uploaded file.', getMulterErrorCode(error)));
        return;
      }

      if (!req.file) {
        reject(new OcrInputError('No file uploaded. Use a file field named "file".', 'NO_FILE'));
        return;
      }

      resolve({
        fields: req.body || {},
        file: {
          fieldName: req.file.fieldname,
          originalName: req.file.originalname || '',
          mimeType: req.file.mimetype || '',
          buffer: req.file.buffer
        }
      });
    });
  });
}

function getConfidenceValues(value) {
  const values = [];

  if (typeof value === 'number' && Number.isFinite(value)) {
    values.push(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      values.push(...getConfidenceValues(item?.confidence ?? item?.score));
      values.push(...getConfidenceValues(item));
    }
  }

  if (value && typeof value === 'object') {
    values.push(...getConfidenceValues(value.confidence));
    values.push(...getConfidenceValues(value.score));
  }

  return values;
}

function average(values) {
  const numericValues = values.filter(value => typeof value === 'number' && Number.isFinite(value));
  if (numericValues.length === 0) return undefined;
  return Number((numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length).toFixed(4));
}

function extractPageMarkdown(page) {
  return page?.markdown || page?.text || '';
}

function extractLines(page) {
  const lines = Array.isArray(page?.lines) ? page.lines : [];
  return lines.map((line, index) => ({
    index,
    text: line?.text || line?.markdown || '',
    confidence: typeof line?.confidence === 'number' ? line.confidence : undefined,
    bbox: line?.bbox || line?.boundingBox || undefined,
    words: Array.isArray(line?.words) ? line.words.map(word => ({
      text: word?.text || word?.content || '',
      confidence: typeof word?.confidence === 'number' ? word.confidence : undefined,
      bbox: word?.bbox || word?.boundingBox || undefined
    })) : undefined
  }));
}

function extractWords(page) {
  const words = Array.isArray(page?.words)
    ? page.words
    : extractLines(page).flatMap(line => Array.isArray(line.words) ? line.words : []);

  return words.map((word, index) => ({
    index,
    text: word?.text || word?.content || '',
    confidence: typeof word?.confidence === 'number' ? word.confidence : undefined,
    bbox: word?.bbox || word?.boundingBox || undefined
  }));
}

function extractTables(page) {
  return Array.isArray(page?.tables) ? page.tables : [];
}

function extractSignaturesAndIgnore(lines) {
  const signaturePatterns = [
    /^(signature|sig\.?)$/i,
    /^\s*(signature|sig\.?)\s*$/i,
    /^sign here$/i,
    /^please\s+sign$/i
  ];

  return lines.filter(line => {
    const text = (line.text || '').trim().toLowerCase();
    return !signaturePatterns.some(pattern => pattern.test(text));
  });
}

function extractAttendeeData(lines) {
  const attendees = [];
  const namePatterns = [
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*$/,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(.+)$/
  ];
  const coursePatterns = [
    /(?:course|class|subject):\s*([A-Z0-9\s\-]+)/i,
    /^([A-Z]{2,4}\d{3,4}[A-Z]?)/,
    /(?:\b[A-Z]{2,4}\d{3,4}[A-Z]?\b)/
  ];

  let lastCourse = null;

  for (const line of lines) {
    const text = (line.text || '').trim();

    for (const pattern of coursePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        lastCourse = match[1].trim();
        break;
      }
    }

    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length > 1 && !/^(DATE|TIME|PAGE|SIGNATURE|SIG|TOTAL|COUNT)/i.test(name)) {
          attendees.push({
            name: name,
            course: match[2] ? match[2].trim() : lastCourse || undefined,
            confidence: line.confidence,
            sourceLine: text
          });
          break;
        }
      }
    }
  }

  return attendees;
}

function extractLowConfidenceItems(structuredOutput) {
  const lowConfidenceThreshold = 0.7;
  const items = [];

  for (const page of structuredOutput.pages || []) {
    for (const word of page.words || []) {
      if (typeof word.confidence === 'number' && word.confidence < lowConfidenceThreshold) {
        items.push({
          type: 'word',
          text: word.text,
          confidence: word.confidence,
          pageNumber: page.pageNumber,
          bbox: word.bbox
        });
      }
    }
  }

  return items;
}

function buildStructuredOutput(result) {
  const pages = Array.isArray(result?.pages) ? result.pages : [];
  const structuredPages = pages.map((page, index) => {
    const confidenceValues = getConfidenceValues(page);
    const lines = extractLines(page);
    const filteredLines = extractSignaturesAndIgnore(lines);
    const attendees = extractAttendeeData(filteredLines);

    return {
      pageNumber: page?.page_num ?? page?.page_number ?? page?.pageNumber ?? index + 1,
      markdown: extractPageMarkdown(page),
      lines: filteredLines,
      words: extractWords(page),
      tables: extractTables(page),
      confidence: average(confidenceValues),
      attendees: attendees,
      raw: page
    };
  });

  const allAttendees = structuredPages.flatMap(page => page.attendees);

  return {
    model: result?.model || MISTRAL_OCR_MODEL,
    pageCount: structuredPages.length,
    pages: structuredPages,
    attendees: allAttendees,
    lowConfidenceItems: extractLowConfidenceItems({ pages: structuredPages }),
    confidence: {
      overall: average(structuredPages.map(page => page.confidence).filter(value => typeof value === 'number'))
    }
  };
}

function buildOcrResponse(result, fileMeta) {
  const pages = Array.isArray(result?.pages) ? result.pages : [];
  const rawText = pages.map(extractPageMarkdown).filter(Boolean).join('\n\n').trim();
  const structuredOutput = buildStructuredOutput(result);

  return {
    ok: true,
    model: MISTRAL_OCR_MODEL,
    file: {
      originalName: fileMeta?.fileName || undefined,
      mimeType: fileMeta?.mimeType,
      bytes: fileMeta?.bytes
    },
    rawText,
    rawOutput: result,
    structuredOutput,
    confidence: structuredOutput.confidence
  };
}

async function processMistralOcrBuffer(buffer, mimeType, fileName = '') {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new OcrApiError('MISTRAL_API_KEY is not configured for this function.', 500, 'MISSING_MISTRAL_API_KEY');
  }

  const normalizedMimeType = validateMimeType(mimeType, fileName);
  const documentBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const { buffer: validatedBuffer } = validateFileBuffer(documentBuffer, fileName);
  const base64 = validatedBuffer.toString('base64');
  const client = await getMistralClient();

  console.log('[OCR] Request started', {
    model: MISTRAL_OCR_MODEL,
    fileName,
    mimeType: normalizedMimeType,
    fileSize: validatedBuffer.length,
    base64Length: base64.length
  });

  try {
    console.log('[OCR] Sending request to Mistral API', {
      endpoint: 'ocr.process',
      model: MISTRAL_OCR_MODEL,
      documentType: 'document_url'
    });

    const result = await client.ocr.process({
      model: MISTRAL_OCR_MODEL,
      document: {
        type: 'document_url',
        documentUrl: `data:${normalizedMimeType};base64,${base64}`
      }
    });

    console.log('[OCR] Mistral API response received', {
      hasResult: Boolean(result),
      hasPages: Boolean(result?.pages),
      pageCount: Array.isArray(result?.pages) ? result.pages.length : 0,
      resultKeys: result ? Object.keys(result) : []
    });

    const response = buildOcrResponse(result, {
      fileName,
      mimeType: normalizedMimeType,
      bytes: validatedBuffer.length
    });

    console.log('[OCR] Response built successfully', {
      rawTextLength: response.rawText?.length || 0,
      attendeeCount: response.structuredOutput?.attendees?.length || 0,
      lowConfidenceItemCount: response.structuredOutput?.lowConfidenceItems?.length || 0,
      overallConfidence: response.confidence?.overall
    });

    return response;
  } catch (err) {
    console.error('[OCR] Mistral API error', {
      name: err?.name,
      message: err?.message,
      statusCode: err?.statusCode || err?.status,
      code: err?.code,
      details: err?.details || err?.body
    });
    throw new OcrApiError(
      err?.message || 'Mistral OCR API request failed.',
      err?.statusCode || err?.status || 502,
      err?.code || 'MISTRAL_OCR_API_ERROR',
      err?.details || err?.body || undefined
    );
  }
}

function getContentType(req) {
  const ct = req.headers['content-type'] || '';
  if (typeof ct === 'string' && ct.includes('multipart/form-data')) return 'multipart/form-data';
  if (typeof ct === 'string' && ct.includes('application/json')) return 'application/json';
  return ct;
}

async function processOcrRequest(req) {
  console.log('[OCR] processOcrRequest started', {
    method: req.method,
    path: req.path,
    contentLength: req.headers['content-length'],
    contentType: req.headers['content-type']
  });

  let fileMeta;
  let buffer;
  let mimeType;

  const contentType = getContentType(req);

  if (contentType === 'multipart/form-data') {
    console.log('[OCR] Processing multipart/form-data request');
    const { file } = await parseMultipartRequest(req);
    const normalizedMimeType = validateMimeType(file.mimeType, file.originalName);
    const { buffer: validatedBuffer } = validateFileBuffer(file.buffer, file.originalName);

    buffer = validatedBuffer;
    mimeType = normalizedMimeType;
    fileMeta = {
      fileName: file.originalName,
      mimeType: normalizedMimeType,
      bytes: validatedBuffer.length
    };
  } else {
    console.log('[OCR] Processing JSON request');
    const body = req.body || {};
    const base64Value = body.fileBase64 || body.documentBase64 || body.base64 || body.imageBase64;
    const fileName = body.fileName || body.originalName || body.name || '';
    const normalizedDocument = normalizeBase64Document(base64Value, fileName);

    buffer = normalizedDocument.buffer;
    mimeType = normalizedDocument.mimeType;
    fileMeta = {
      fileName: normalizedDocument.fileName,
      mimeType: normalizedDocument.mimeType,
      bytes: buffer.length
    };
  }

  console.log('[OCR] File parsed', {
    fileName: fileMeta.fileName,
    mimeType: fileMeta.mimeType,
    size: fileMeta.bytes
  });

  return processMistralOcrBuffer(buffer, mimeType, fileMeta.fileName);
}

function getErrorPayload(err) {
  return {
    code: err.code,
    message: err.message,
    details: err.details || err.errors
  };
}

module.exports = {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  MISTRAL_OCR_MODEL,
  OcrApiError,
  OcrInputError,
  getErrorPayload,
  normalizeBase64Document,
  parseMultipartRequest,
  processMistralOcrBuffer,
  processOcrRequest
};
