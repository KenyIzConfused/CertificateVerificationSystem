# OCR Testing Guide

## Overview
This guide explains how to test the Mistral OCR processing layer with handwritten attendance sheets before integrating with the main attendee management workflow.

## Prerequisites
- Firebase CLI installed and authenticated
- MISTRAL_API_KEY configured as a Firebase secret
- Firebase project initialized

## Setup

### 1. Configure Firebase Secrets
```bash
firebase functions:config:set mistral.api_key="your-api-key-here"
# Or with Firebase CLI v2:
firebase secrets:set MISTRAL_API_KEY
```

### 2. Deploy Functions
```bash
firebase deploy --only functions:ocrTest,functions:ocrProcess
```

### 3. Access the Test Page
Open the deployed URL for the `ocrTest` function:
```
https://REGION-PROJECT_ID.cloudfunctions.net/ocrTest
```

## Testing with a Real Attendance Sheet

### Step-by-Step Process

1. **Prepare your attendance sheet** as a JPG, PNG, or PDF file
   - Ensure attendee names are clearly visible
   - Include course information if available
   - Signatures will be automatically filtered out

2. **Open the test page** in your browser
   - The page is accessible at `/ocrTest` endpoint

3. **Upload the file**
   - Click "Choose File" and select your attendance sheet
   - Image preview will appear for JPG/PNG files

4. **Run OCR**
   - Click "Run OCR" button
   - Wait for processing (540s timeout for large files)

5. **Review the results**
   - **Raw OCR output**: Plain text extracted from the document
   - **Structured OCR output**: JSON with page-level details
   - **Extracted Attendees**: Detected names and courses with confidence indicators
   - **Low Confidence Words**: Words flagged for potential inaccuracies (confidence < 70%)

### Interpreting Results

| Confidence Level | Display Color | Action Needed |
|-----------------|---------------|---------------|
| Green (≥ 70%) | High confidence | Likely correct, verify visually |
| Red (< 70%) | Low confidence | Manual review recommended |

### Known Limitations

- Handwritten text recognition quality varies with handwriting style
- Very cursive or poorly scanned text may have lower accuracy
- Signatures are automatically filtered but may occasionally match
- Course codes require specific patterns (e.g., "CS101", "MATH202A")

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ocrTest` | GET | Test page UI |
| `/ocrProcess` | POST | Multipart file upload (field: `file`) |
| `/mistralOCR` | POST | Same as `/ocrProcess` (alias) |

## Logging

Detailed logs are available via:
```bash
firebase functions:log --only ocrProcess
```

Logs include:
- Request metadata (file size, type)
- Mistral API request/response details
- Processing time and results summary