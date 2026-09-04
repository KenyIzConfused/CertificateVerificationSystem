# IPPRC Certificate Verification System

A web-based system for managing events, attendees, and generating verifiable certificates for the Information Unit (IPPRC).

## Features

### Event Management
- Create, edit, and close events
- View all events with status (active/completed)
- Each event has a unique ID and tracks the number of attendees

### Attendee Management
- Add attendees manually (name, course, role, email)
- Import attendees from Excel/CSV files (with smart header detection)
- Edit attendee details (name, course, role, status)
- Mark attendance status (present, absent, late)
- Delete attendees
- Search/filter attendees by name, course, role, date, status, or certificate ID
- Export attendee list to Excel (.xlsx) with formatted headers
- Each attendee gets an auto-generated 7-character unique Certificate ID

### Certificate Management
- Upload certificate templates (.docx files with placeholders)
- Templates are stored locally in the browser via IndexedDB (no cloud storage required)
- Generate certificates for individual attendees (opens in new tab)
- Generate all certificates at once and download as a single ZIP file
- Send certificates individually via email using EmailJS
- Send all certificates at once via email with ZIP attachment (EmailJS)
- Each certificate includes attendee-specific data and a verification URL

### Certificate Verification (Public)
- Anyone with a Certificate ID can verify authenticity
- QR code is generated dynamically on the verification page
- Shows attendee details, event information, and issue date
- Public access (no login required)

### Authentication
- Admin signup with email/password
- Admin login
- Password reset via email
- Each admin manages their own events (data isolation)

### Certificate Placeholders
Use these placeholders in your .docx template:
- `{name}` – Attendee's full name
- `{course}` – Course
- `{role}` – Role (e.g., Student, Speaker, Organizer)
- `{dateAttended}` – Date of attendance
- `{certificateId}` – Unique certificate ID

## Technical Stack
- **Frontend:** HTML, Tailwind CSS, vanilla JavaScript (ES modules)
- **Backend Services (Free Tier):**
  - Firebase Authentication – admin login/signup
  - Cloud Firestore – events, attendees, admins data
  - EmailJS – client-side email sending (200 emails/month free)
- **Client-side Libraries:**
  - PizZip – .docx file parsing
  - Docxtemplater – template rendering
  - ExcelJS – Excel import/export
  - QRCode.js – QR code generation
  - JSZip – batch certificate ZIP packaging
- **No billing required:** Core features use free-tier Firebase + EmailJS services

## Project Structure
```
├── index.html                  – Landing page
├── AttendeeManagement/         – Attendee CRUD
├── CertificateManagement/      – Certificate generation
├── CertificateVerification/    – Public verification page
├── EventCRUD/                  – Event management
├── logIn/                      – Login, signup, password reset
└── PopupSystem.js              – Shared modal/toast utilities
```

## Setup
1. Open `index.html` in a browser (or deploy to Firebase Hosting)
2. Sign up as an admin
3. Create an event
4. Add attendees (manually or via Excel import)
5. Upload a certificate template
6. Generate and download certificates individually or as a ZIP
7. (Optional) Configure EmailJS in `CertificateManagement.js` to send certificates via email:
   - Create an account at [emailjs.com](https://www.emailjs.com/)
   - Add an email service and create an email template
   - Replace the placeholder values in `EMAILJS_CONFIG` with your Service ID, Template ID, and Public Key
8. Share the certificate ID (or verification URL) with recipients

## Notes
- Templates are stored per-browser in IndexedDB (not synced across devices)
- Firebase Storage and Cloud Functions are intentionally not used (to avoid billing)
- Certificate generation and ZIP packaging run entirely in the browser
- Email sending uses EmailJS client-side SDK (free tier: 200 emails/month). If EmailJS is not configured, the app falls back to opening the user's default mail client via `mailto:` links
- EmailJS attachments require a paid plan; current free-tier implementation sends certificate details and verification links in the email body
