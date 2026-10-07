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
- Verification uses the `verifyCertificate` Cloud Function when deployed (returns only the seven display fields — never emails or document IDs). If the function is not deployed, the page automatically falls back to a direct Firestore scan.

### Authentication
- Admin signup with email/password (creates the admin's `Admin` document)
- Admin login verifies the `Admin` document directly in Firestore — no Cloud Function required
- Password reset via email
- Each admin manages their own events (data isolation) — events, attendees, and certificates are scoped to the admin who created them
- Session enforcement (auto-logout after inactivity)
- **Optional hardening (requires deploying the Cloud Functions):** invite-code signup and the `admin` custom claim are implemented in `functions/index.js` (`createAdmin`, `generateInviteCode`, `ensureAdminClaim`). Deploy the functions and switch `SignUpAdmin.js` back to the `createAdmin` flow to enable invite-only signup.

## Recent Changes
- **Pretty-URL navigation:** All links now use relative paths (`logIn/LogInAdmin.html`, `EventCRUD/EventCRUD.html`, etc.) so the app works identically on a local static server (Live Server / `python -m http.server`) and when deployed to Firebase Hosting / Vercel. The rewrite rules in `firebase.json` and `vercel.json` are kept so pretty URLs (`/admin-login`, `/verify-certificate`) still resolve on production.
- **Event isolation:** Each event stores the creating admin's UID (`adminId`) and display name (`adminName`). The Event CRUD list now filters to the logged-in admin only, and Attendee Management / Certificate Management reject events belonging to another admin.
- **Created By tracking:** New events record the creator's name; existing events are backfilled on login. Each event card shows a purple "By <name>" badge.
- **Event pagination & search:** Events are paginated (2 per page, newest first) with a live search bar, Previous/Next controls, and arrow-key navigation.
- **Attendee pagination & search:** Attendees are paginated (5 per page) with a live search bar, Previous/Next controls, and arrow-key navigation.
- **Certificate pagination & search:** Certificates are paginated (5 per page) with a live search bar, Previous/Next controls, and arrow-key navigation.
- **Firestore security rules:** Added an `adminSessions` rule so each admin can read/write their own session doc (fixes the "Missing or insufficient permissions" error on session registration). Events/attendees/certificate formats remain scoped to the event owner.
- **Event takeover fix (rules):** `Events` writes are now split — `update`/`delete` require the *stored* `resource.data.adminId` to match the caller, and `create` requires `request.resource.data.adminId == caller`. Previously any logged-in user could overwrite or delete another admin's event by forging `adminId` in the request payload.
- **Bulk-read restriction (rules):** `Events` and `Attendees` use `allow get: if true; allow list: if request.auth != null` — single documents stay readable for public verification, but anonymous users can no longer list/scan whole collections.
- **Admin access without Cloud Functions:** login and all admin pages verify the `Admin` document directly in Firestore, so the app works with Authentication + Firestore alone. Invite-code signup and custom-claim checks remain available in `functions/index.js` for when the functions are deployed.
- **App Check (optional):** `AppCheck.js` wires reCAPTCHA v3; paste the site key to enable, then turn on enforcement in Firebase Console → App Check. Off by default (no-op).
- **Clean URLs:** `UrlCleaner.js` swaps `.html` addresses for pretty slugs (`/event-crud`, `/verify-certificate`, …) in the address bar via `history.replaceState`. Pretty URLs are served by the rewrite rules in `firebase.json` (Firebase Hosting) and `vercel.json` (Vercel); locally, use `node scripts/dev-server.js`, which applies the same rewrites (`python -m http.server` does not).

### Certificate Placeholders
Use these placeholders in your .docx template:
- `{name}` – Attendee's full name
- `{course}` – Course
- `{role}` – Role (e.g., Student, Speaker, Organizer)
- `{dateAttended}` – Date of attendance
- `{certificateId}` – Unique certificate ID

## Security
What was hardened in this project (and how it works now):
- **Event ownership:** only the admin who created an event can edit, delete, or close it. The Firestore rules check the *stored* `adminId` (not the value sent in the request), so a logged-in user cannot take over another admin's event by forging `adminId` in the payload.
- **Data isolation:** each admin sees only their own events; Attendee Management and Certificate Management reject events belonging to other admins.
- **Bulk-read restriction:** anonymous visitors can read single documents (needed for public verification) but cannot list/scan whole collections — this blocks bulk scraping of attendee data.
- **Public verification privacy:** when the `verifyCertificate` Cloud Function is deployed, the public page receives only the seven display fields (name, course, role, date attended, status, certificate ID, event title) — attendee emails and document IDs never leave the server. Without the function, the page automatically falls back to a direct Firestore scan.
- **Admin access:** login and all admin pages verify the `Admin` document directly in Firestore, so the app runs on Authentication + Firestore alone — no Cloud Function deploy required.
- **Optional hardening (off by default):** invite-code signup with an `admin` custom claim, and Firebase App Check (reCAPTCHA v3). Both are implemented in `functions/index.js` / `AppCheck.js` and activate when the functions are deployed / a site key is added.

## Technical Stack
- **Frontend:** HTML, Tailwind CSS, vanilla JavaScript (ES modules)
- **Backend Services (Free Tier):**
  - Firebase Authentication – admin login/signup
  - Cloud Firestore – events, attendees, admins data
  - Cloud Functions (Node.js, optional) – privacy-hardened certificate verification, invite-code signup, QR code + email generation
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
├── EventCRUD/                  – Event management (incl. Settings)
├── functions/                  – Cloud Functions, optional (verification, invite signup)
├── logIn/                      – Login, signup, password reset
├── scripts/                    – Utility scripts (CORS, setup, dev-server)
├── AppCheck.js                 – Optional Firebase App Check (reCAPTCHA v3) wiring
├── FirebaseAdmin.js            – Shared admin access guard (reads the Admin document)
├── UrlCleaner.js               – Hides .html in the address bar (pretty URLs)
├── PopupSystem.js              – Shared modal/toast utilities
├── firestore.rules             – Firestore security rules
└── storage.rules               – Storage security rules
```

## Setup
1. Open `index.html` in a browser (or deploy to Firebase Hosting)
2. Sign up as an admin (the first signup creates the first admin account)
3. Create an event
4. Add attendees (manually or via Excel import)
5. Upload a certificate template
6. Generate and download certificates individually or as a ZIP
7. (Optional) Configure EmailJS in `CertificateManagement.js` to send certificates via email:
   - Create an account at [emailjs.com](https://www.emailjs.com/)
   - Add an email service and create an email template
   - Replace the placeholder values in `EMAILJS_CONFIG` with your Service ID, Template ID, and Public Key
8. Share the certificate ID (or verification URL) with recipients

### First admin
On a fresh deployment, the first admin simply signs up at `/signup` (the signup creates the `Admin` document). To restrict signup to invite codes later, deploy the Cloud Functions and use the `createAdmin` flow — see "Authentication" above.

## Local development
Two options:
- **Recommended (pretty URLs work):** `node scripts/dev-server.js` — a zero-dependency Node server with the same rewrites as production. Open http://localhost:8080.
- **`python -m http.server` / VS Code Live Server:** works, but only the `.html` links resolve (no rewrites), so the address bar shows `.html` paths.

## Deployment
The app runs on Authentication + Firestore alone; Cloud Functions are optional (needed only for invite-code signup, the email/QR generation features, and the privacy-hardened verification path). When deploying them:
```
firebase deploy --only functions          # new/changed Cloud Functions first
firebase deploy --only hosting            # then the static pages
firebase deploy --only firestore:rules    # rules last (they can break old pages)
```
Redeploy on Vercel as well if that domain serves the app.

## Notes
- Templates are stored per-browser in IndexedDB (not synced across devices)
- Certificate generation and ZIP packaging run entirely in the browser
- Cloud Functions are optional: used for public certificate verification (with a local-scan fallback), invite-code signup, and batch QR/email generation
- Email sending uses EmailJS client-side SDK (free tier: 200 emails/month). If EmailJS is not configured, the app falls back to opening the user's default mail client via `mailto:` links
- EmailJS attachments require a paid plan; current free-tier implementation sends certificate details and verification links in the email body
- Local development with App Check enforcement enabled: print `self.FIREBASE_APPCHECK_DEBUG_TOKEN` in the browser console and register it under Firebase Console → App Check → Manage debug tokens
