# IPPRC Certificate Verification System

A web-based system for managing events, attendees, and generating verifiable certificates for the Information Unit (IPPRC).

## Features

### Event Management
- Create, edit, and close events
- View all events with status (active/completed)
- Each event has a unique ID and tracks the number of attendees
- Each event records which admin created it ("Created By" badge)
- Search events by title, description, venue, department, speaker, or creator
- Pagination: 2 events per page with Previous/Next controls (newest first)
- Arrow-key navigation (← / →) between pages

### Attendee Management
- Add attendees manually (name, course, role, email)
- Import attendees from Excel/CSV files (with smart header detection)
- Edit attendee details (name, course, role, status)
- Mark attendance status (present, absent, late)
- Delete attendees
- Search/filter attendees by name, course, role, date, status, or certificate ID
- Export attendee list to Excel (.xlsx) with formatted headers
- Each attendee gets an auto-generated 7-character unique Certificate ID
- Pagination: 5 attendees per page with Previous/Next controls
- Arrow-key navigation (← / →) between pages

### Certificate Management
- Upload certificate templates (.docx files with placeholders)
- Templates are stored locally in the browser via IndexedDB (no cloud storage required)
- Generate certificates for individual attendees (opens in new tab)
- Generate all certificates at once and download as a single ZIP file
- Send certificates individually via email using EmailJS
- Send all certificates at once via email (EmailJS)
- Each certificate includes attendee-specific data and a verification URL
- Search attendees by name, course, role, email, or certificate ID
- Pagination: 5 attendees per page with Previous/Next controls
- Arrow-key navigation (← / →) between pages

### Certificate Verification (Public)
- Anyone with a Certificate ID can verify authenticity
- QR code is generated dynamically on the verification page
- Shows attendee details, event information, and issue date
- Public access (no login required)

### Authentication
- Admin signup with email/password
- Admin login
- Password reset via email
- Each admin manages their own events (data isolation) — events, attendees, and certificates are scoped to the admin who created them
- Session enforcement (auto-logout after inactivity)

## Recent Changes
- **Pretty-URL navigation:** All links now use relative paths (`logIn/LogInAdmin.html`, `EventCRUD/EventCRUD.html`, etc.) so the app works identically on a local static server (Live Server / `python -m http.server`) and when deployed to Firebase Hosting / Vercel. The rewrite rules in `firebase.json` and `vercel.json` are kept so pretty URLs (`/admin-login`, `/verify-certificate`) still resolve on production.
- **Event isolation:** Each event stores the creating admin's UID (`adminId`) and display name (`adminName`). The Event CRUD list now filters to the logged-in admin only, and Attendee Management / Certificate Management reject events belonging to another admin.
- **Created By tracking:** New events record the creator's name; existing events are backfilled on login. Each event card shows a purple "By <name>" badge.
- **Event pagination & search:** Events are paginated (2 per page, newest first) with a live search bar, Previous/Next controls, and arrow-key navigation.
- **Attendee pagination & search:** Attendees are paginated (5 per page) with a live search bar, Previous/Next controls, and arrow-key navigation.
- **Certificate pagination & search:** Certificates are paginated (5 per page) with a live search bar, Previous/Next controls, and arrow-key navigation.
- **Firestore security rules:** Added an `adminSessions` rule so each admin can read/write their own session doc (fixes the "Missing or insufficient permissions" error on session registration). Events/attendees/certificate formats remain scoped to the event owner.

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
│   ├── emailjs-template.html   – EmailJS HTML template for certificate emails
│   ├── CertificateManagement.html
│   └── CertificateManagement.js
├── CertificateVerification/    – Public verification page
├── EventCRUD/                  – Event management
├── logIn/                      – Login, signup, password reset
├── scripts/                    – Utility scripts (CORS, setup)
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
