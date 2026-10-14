<div align="center">

# 🎓 IPPRC Certificate Verification System

**Event management, attendee tracking, and verifiable certificates — running entirely on free-tier services.**

[![MIT License](https://img.shields.io/badge/license-MIT-22c55e)](LICENSE)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind-38BDF8?logo=tailwindcss&logoColor=black)](https://tailwindcss.com/)

</div>

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [🔐 Security](#-security)
- [🧱 Technical Stack](#-technical-stack)
- [🗂️ Project Structure](#️-project-structure)
- [🚀 Quick Start](#-quick-start)
- [💻 Local Development](#-local-development)
- [☁️ Deployment](#️-deployment)
- [🔗 Pretty URLs & Routes](#-pretty-urls--routes)
- [📝 Certificate Placeholders](#-certificate-placeholders)
- [🆕 Recent Changes](#-recent-changes)
- [⚠️ Notes & Gotchas](#️-notes--gotchas)

---

## ✨ Features

### 🗓️ Event Management
- Create, edit, and close events
- View all events with status (active / completed)
- Each event has a unique ID, a 7-character **Event Code**, and an attendee count
- "Created By" badge showing the admin who created the event
- Search by title, description, venue, department, speaker, or creator
- Pagination (2 per page, newest first) with Previous/Next controls and arrow-key navigation

### 👥 Attendee Management
- Add attendees manually (name, course, role, email)
- Import from Excel/CSV with smart header detection
- Edit attendee details and mark attendance status (present, absent, late)
- Delete attendees
- Search/filter by name, course, role, date, status, or certificate ID
- Export to Excel (`.xlsx`) with formatted headers
- Auto-generated 7-character unique Certificate ID per attendee
- Pagination (5 per page) with Previous/Next controls and arrow-key navigation

### 🎖️ Certificate Management
- Upload certificate templates (`.docx` with placeholders)
- Templates are stored per-browser in IndexedDB — no cloud storage required
- Generate certificates individually or all at once as a single ZIP
- Send certificates via EmailJS, with a `mailto:` fallback when EmailJS isn't configured
- QR codes on certificates link to `/verify-event?eventCode=XXXX`
- Search + pagination (5 per page) with arrow-key navigation

### 🌐 Public Verification — `verify-event`
- Anyone with an **Event Code** can verify an event's authenticity — no login required
- Shows event details: title, date, time, location, description, organizer, attendee count
- **See All Participants** — an alphabetical (A–Z) list of the event's attendees with:
  - a searchable dropdown to look up any participant
  - live search filtering with highlight-on-select
  - name, course • role, and certificate ID per row
  - attendee **emails are never exposed** publicly
- Runs via a direct Firestore query — no Cloud Function, no billing required

### 🔑 Authentication
- Admin signup and login with email/password (the first signup creates the first admin)
- Password reset via email
- Each admin manages only their own events (data isolation)
- Session enforcement (auto-logout after inactivity)
- **Optional hardening:** invite-code signup and the `admin` custom claim live in `functions/index.js` (`createAdmin`, `generateInviteCode`, `ensureAdminClaim`) — deploy the functions and switch `SignUpAdmin.js` back to the `createAdmin` flow to enable them

---

## 🔐 Security

| Area | Rule |
| --- | --- |
| **Event ownership** | Only the creating admin can edit, delete, or close an event. Rules check the *stored* `adminId`, so a logged-in user can't take over an event by forging `adminId` in the request |
| **Data isolation** | The event list filters to the logged-in admin; Attendee and Certificate Management reject events owned by other admins |
| **Public reads — Events** | `get` and `list` are public so the event-code verification lookup works for anonymous visitors |
| **Public reads — Attendees** | `get` and `list` are public to power the **See All Participants** list on the verification page — a deliberate trade-off: attendee names, course, role, and certificate IDs for an event are visible to anyone with the event code, while **emails never are** |
| **Certificate formats** | Owner-only read/write (templates may contain sensitive data) |
| **Admin & sessions** | Each admin reads/writes only their own `Admin` and `adminSessions` documents |
| **Invite codes** | Client access disabled — created and validated only by Cloud Functions (Admin SDK) |
| **Optional hardening** | Invite-code signup with an `admin` custom claim, and Firebase App Check (reCAPTCHA v3) via `AppCheck.js` — both off by default |

---

## 🧱 Technical Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | HTML, Tailwind CSS, vanilla JavaScript (ES modules, no build step) |
| **Auth & Database** | Firebase Authentication + Cloud Firestore |
| **Functions (optional)** | Cloud Functions (Node.js) — invite-code signup, email/QR generation |
| **Email** | EmailJS (free tier: 200 emails/month) with `mailto:` fallback |
| **Client libraries** | PizZip, Docxtemplater, ExcelJS, QRCode.js, JSZip — all loaded from CDN |
| **Hosting** | Vercel or Firebase Hosting (rewrite rules kept in sync for both) |

> 💡 **No billing required** — core features, including public verification, run on free-tier Firebase + EmailJS.

---

## 🗂️ Project Structure

```
├── index.html                     Landing page
├── AttendeeManagement/            Attendee CRUD, import/export
├── CertificateManagement/         Certificate generation & email
│   └── emailjs-template.html      EmailJS HTML template for certificate emails
├── CertificateVerification/       Public verification page
│                                  (event lookup + See All Participants)
├── EventCRUD/                     Event management + Settings
├── logIn/                         Login, password reset
├── SignUp/                        Admin signup
├── scripts/
│   ├── dev-server.js              Zero-dependency dev server with production rewrites
│   ├── migrate-event-codes.js     Backfills eventCode on existing events
│   └── …                          CORS / setup utilities
├── functions/                     Cloud Functions (optional)
├── UrlCleaner.js                  Pretty URLs (hides .html in the address bar)
├── PopupSystem.js                 Shared modal/toast utilities
├── FirebaseAdmin.js               Shared admin access guard
├── AppCheck.js                    Optional App Check (reCAPTCHA v3) wiring
├── firestore.rules                Firestore security rules
├── storage.rules                  Storage security rules
├── firebase.json                  Firebase Hosting config + rewrites
├── vercel.json                    Vercel config + rewrites
└── .firebaserc                    Firebase project link
```

---

## 🚀 Quick Start

1. Serve the project locally (see [Local Development](#-local-development))
2. Sign up as an admin at `/signup` — the first signup creates the first admin account
3. Create an event (an Event Code like `Q2U0W0T` is generated automatically)
4. Add attendees — manually, or import an Excel/CSV file
5. Upload a certificate template (`.docx`) using the [placeholders](#-certificate-placeholders)
6. Generate certificates individually or as a ZIP — QR codes link to `/verify-event?eventCode=...`
7. *(Optional)* Configure EmailJS in `CertificateManagement.js`: create a service and template at [emailjs.com](https://www.emailjs.com/), then fill in `EMAILJS_CONFIG`
8. Share the verification URL — `/verify-event?eventCode=Q2U0W0T` — with recipients

---

## 💻 Local Development

```bash
# Recommended — pretty URLs work exactly like production
node scripts/dev-server.js          # http://localhost:8080
node scripts/dev-server.js 5500     # or pick your own port
```

The dev server is **zero-dependency** (Node built-ins only) and mirrors the rewrites in `firebase.json` / `vercel.json`.

> ⚠️ VS Code **Live Server** and `python -m http.server` also work, but they don't apply rewrites — only the `.html` paths resolve, so the address bar shows `.html` URLs. All navigation uses absolute file paths (e.g. `/EventCRUD/EventCRUD.html`), so links work on any static server; `UrlCleaner.js` then swaps in the pretty slug for the address bar.

---

## ☁️ Deployment

**Vercel** — the static site deploys as-is; `vercel.json` carries the rewrite rules.

**Firebase Hosting** — deploy in this order:

```bash
firebase deploy --only functions          # optional Cloud Functions first
firebase deploy --only hosting            # then the static pages
firebase deploy --only firestore:rules    # rules LAST — old pages can 403 without them
```

> 🚨 **Firestore rules changes do NOT ship with a site redeploy.**
> After editing `firestore.rules`, you must run `firebase deploy --only firestore:rules`.
> If the verification page shows `Missing or insufficient permissions` in production, the rules file was edited locally but never deployed — the deployed rules are separate from what Vercel serves. *(We hit exactly this: the rules fix for "See All Participants" sat in the working tree while production still enforced `allow list: if request.auth != null`, so the deployed page 403'd. Verifying with an anonymous Firestore REST call confirmed the fix.)*

---

## 🔗 Pretty URLs & Routes

`UrlCleaner.js` rewrites the address bar to pretty slugs via `history.replaceState`. The same routes exist in `firebase.json`, `vercel.json`, and `scripts/dev-server.js`:

| Route | File |
| --- | --- |
| `/` | `index.html` |
| `/event-crud` | `EventCRUD/EventCRUD.html` |
| `/certificate-management` | `CertificateManagement/CertificateManagement.html` |
| `/attendee-management` | `AttendeeManagement/AttendeeManagement.html` |
| `/verify-event` | `CertificateVerification/CertificateVerification.html` |
| `/admin-login` | `logIn/LogInAdmin.html` |
| `/signup` | `SignUp/SignUpAdmin.html` |
| `/forgot-password` | `logIn/ForgotPassword.html` |
| `/reset-password` | `logIn/ResetPassword.html` |
| `/settings` | `EventCRUD/Settings.html` |

---

## 📝 Certificate Placeholders

Use these placeholders in your `.docx` template:

| Placeholder | Value |
| --- | --- |
| `{name}` | Attendee's full name |
| `{course}` | Course |
| `{role}` | Role (e.g., Student, Speaker, Organizer) |
| `{dateAttended}` | Date of attendance |
| `{certificateId}` | Unique certificate ID |
| `{eventCode}` | Event verification code |
| `{eventTitle}` | Event title |
| `{eventDate}` | Event date |
| `{eventLocation}` | Event location |

---

## 🆕 Recent Changes

**Latest**
- **See All Participants** on `/verify-event` — a button above "Verify Another" opens an alphabetical (A–Z, case-insensitive) list of the event's attendees with a searchable dropdown, live search filtering, highlight-on-select, and per-row certificate IDs (emails never exposed). Requires the updated `firestore.rules` to be deployed.
- **Firestore rules: public attendee list** — the `Attendees` subcollection now allows anonymous `list` (was `request.auth != null`) so the public participants list works. Writes remain owner-only.
- **Navigation fix (pretty-URL base bug)** — `UrlCleaner.js` rewrites the address bar to slugs like `/event-crud`, which changes the document base URL, so same-directory links (`Settings.html`, `EventCRUD.html`, `ForgotPassword.html`) resolved to non-existent root paths and 404'd. All internal navigation now uses absolute file paths (`/EventCRUD/EventCRUD.html`, …), which work on every static server while still landing on the pretty URL.

**Previous**
- **Event-based verification rehaul** — verification uses Event Codes instead of attendee Certificate IDs; enter a code to see event details. Works without Cloud Functions (direct Firestore query).
- **Unique event codes** — each new event gets a 7-char `eventCode` (e.g. `Q2U0W0T`) shown on event cards.
- **New certificate placeholders** — `{eventCode}`, `{eventTitle}`, `{eventDate}`, `{eventLocation}`; QR URLs use the event code.
- **Pretty URLs** — `UrlCleaner.js` + rewrite rules for `/event-crud`, `/verify-event`, `/admin-login`, and friends.
- **Event isolation & Created By tracking** — events store `adminId`/`adminName`; lists filter to the owner.
- **Pagination & search everywhere** — events (2/page), attendees (5/page), certificates (5/page), with arrow-key navigation.
- **Admin access without Cloud Functions** — login verifies the `Admin` document in Firestore directly.

---

## ⚠️ Notes & Gotchas

- **Rules vs. site deploys are separate** — deploying to Vercel/Firebase Hosting does *not* deploy `firestore.rules`. See the [Deployment](#️-deployment) warning.
- **Attendee names are public by design** — the See All Participants feature makes an event's attendee list (names, course, role, certificate IDs — never emails) visible to anyone with the event code.
- **Templates are per-browser** — certificate templates live in IndexedDB and don't sync across devices.
- **Cloud Functions are optional** — only needed for invite-code signup and the email/QR generation helpers; verification itself is client-side.
- **EmailJS free tier** — attachments need a paid plan; the current implementation sends certificate details and the verification link in the email body, with a `mailto:` fallback.
- **App Check debug tokens** — when enforcement is on during development, read `self.FIREBASE_APPCHECK_DEBUG_TOKEN` from the console and register it under Firebase Console → App Check → Manage debug tokens.

---

<div align="center">
<sub>Built for the Information Unit (IPPRC) · MIT License · <a href="https://github.com/KenyIzConfused/CertificateVerificationSystem">GitHub</a></sub>
</div>
