const functions = require('firebase-functions');
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const QRCode = require('qrcode');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();

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

function getOutlookCreds() {
  const envEmail = process.env.OUTLOOK_EMAIL;
  const envPass = process.env.OUTLOOK_PASSWORD;
  let cfg = {};
  try {
    if (functions && typeof functions.config === 'function') {
      cfg = functions.config() || {};
    }
  } catch (e) {
    cfg = {};
  }
  const o = (cfg && cfg.outlook) || (cfg && cfg.smtp) || {};
  return {
    email: envEmail || o.email || 'CertVerification@hotmail.com',
    password: envPass || o.password || ''
  };
}

exports.generateAndEmailCertificates = onCall(
  {
    timeoutSeconds: 540,
    memory: '512MiB'
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    const { eventId, formatId = 'default' } = request.data || {};
    if (!eventId) {
      throw new HttpsError('invalid-argument', 'eventId is required.');
    }

    const creds = getOutlookCreds();
    if (!creds.password) {
      throw new HttpsError(
        'failed-precondition',
        'SMTP password is not configured. Set OUTLOOK_PASSWORD (or functions config outlook.password) and redeploy.'
      );
    }

    const eventDoc = await db.collection('Events').doc(eventId).get();
    if (!eventDoc.exists) {
      throw new HttpsError('not-found', 'Event not found.');
    }
    const event = eventDoc.data();

    // Only the event owner may generate certificates.
    if (event.adminId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'You do not own this event.');
    }

    const fmtDoc = await db
      .collection('Events').doc(eventId)
      .collection('certificateFormats').doc(formatId).get();
    if (!fmtDoc.exists) {
      throw new HttpsError(
        'not-found',
        'No certificate format configured for this event. Add one first.'
      );
    }
    const format = fmtDoc.data();

    // Download the .docx template from Cloud Storage.
    let templateBytes;
    try {
      const [buf] = await bucket.file(format.templatePath).download();
      templateBytes = buf;
    } catch (dlErr) {
      throw new HttpsError(
        'not-found',
        'Certificate template file could not be downloaded from Storage (' +
          (dlErr && dlErr.message ? dlErr.message : 'unknown error') +
          '). Verify the template was uploaded.'
      );
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      auth: { user: creds.email, pass: creds.password },
      tls: { rejectUnauthorized: false }
    });

    let smtpVerified = true;
    let smtpError = '';
    try {
      await transporter.verify();
    } catch (e) {
      smtpVerified = false;
      smtpError = (e && e.message) ? e.message : String(e);
      console.error('SMTP verify failed:', e);
    }

    const attSnap = await db
      .collection('Events').doc(eventId)
      .collection('Attendees').get();
    const attendees = attSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const results = {
      total: attendees.length,
      sent: 0,
      skipped: 0,
      failed: 0,
      smtpVerified,
      smtpError,
      errors: []
    };

    if (!smtpVerified) {
      return results;
    }

    for (const attendee of attendees) {
      const email = (attendee.email || '').trim();
      if (!email) {
        results.skipped++;
        continue;
      }

      try {
        const zip = new PizZip(templateBytes);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        const dateStr = attendee.dateAttended || '';
        const certId = attendee.certificateId || '';
        const renderData = {
          fullName: attendee.fullName || '',
          course: attendee.course || '',
          role: attendee.role || '',
          dateAttended: dateStr,
          certificateId: certId
        };

        doc.render(renderData);
        const docxBuffer = doc.getZip().generate({ type: 'nodebuffer' });

        // Store certificate in Cloud Storage
        const certFileName = 'certificates/' + eventId + '/' + attendee.id + '.docx';
        const certFile = bucket.file(certFileName);
        await certFile.save(docxBuffer, {
          metadata: { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
        });

        // Generate verification URL for QR code
        const verificationUrl = 'https://certificate-verification-system-6nx90yh8u.vercel.app/CertificateVerification/CertificateVerification.html?id=' + certId;

        await transporter.sendMail({
          from: '"' + (event.department || 'Information Unit') + '" <' + creds.email + '>',
          to: email,
          subject: 'Your Certificate - ' + (event.title || 'Event'),
          html:
            '<p>Dear ' + (attendee.fullName || '') + ',</p>' +
            '<p>Please find your certificate attached for <strong>' +
            (event.title || 'the event') +
            '</strong>.</p>' +
            '<p>Certificate ID: <strong>' + certId + '</strong></p>' +
            '<p>Verify your certificate: <a href="' + verificationUrl + '">Click here</a></p>' +
            '<p>Thank you</p>',
          attachments: [
            {
              filename: 'Certificate_' + certId + '.docx',
              content: docxBuffer
            }
          ]
        });

        results.sent++;
      } catch (err) {
        console.error('Certificate email failed for ' + email, err);
        const msg = (err && err.message) ? err.message : String(err);
        results.failed++;
        results.errors.push({
          email: email,
          name: attendee.fullName || '',
          error: msg
        });
      }
    }

    return results;
  }
);

// Public event verification - callable by anyone (no login required).
// Queries by eventCode (single doc read via Admin SDK, bypasses Firestore rules).
exports.verifyEvent = onCall(
  {
    timeoutSeconds: 30,
    memory: '256MiB'
  },
  async (request) => {
    const { eventCode } = request.data || {};
    if (typeof eventCode !== 'string' || !eventCode.trim()) {
      throw new HttpsError('invalid-argument', 'eventCode is required.');
    }

    const searchCode = eventCode.trim().toUpperCase();
    if (searchCode.length > 20 || !/^[A-Z0-9-]+$/.test(searchCode)) {
      throw new HttpsError('invalid-argument', 'eventCode is invalid.');
    }

    const eventsSnap = await db.collection('Events')
      .where('eventCode', '==', searchCode)
      .limit(1)
      .get();

    if (eventsSnap.empty) {
      return { found: false };
    }

    const eventDoc = eventsSnap.docs[0];
    const event = eventDoc.data() || {};

    // Fetch attendee count
    let attendeeCount = 0;
    try {
      const attSnap = await db
        .collection('Events').doc(eventDoc.id)
        .collection('Attendees').get();
      attendeeCount = attSnap.size;
    } catch (e) {
      console.warn('Could not fetch attendee count', e);
    }

    return {
      found: true,
      event: {
        title: event.title || '',
        description: event.description || '',
        date: event.date || '',
        time: event.time || '',
        location: event.location || '',
        duration: event.duration || null,
        department: event.department || '',
        speaker: event.speaker || '',
        organizer: event.adminName || '',
        attendeeCount: attendeeCount,
        eventCode: event.eventCode || ''
      }
    };
  }
);

// Generate and store QR codes for all attendees of an event
exports.generateQRCodes = onCall(
  {
    timeoutSeconds: 540,
    memory: '512MiB'
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    const { eventId } = request.data || {};
    if (!eventId) {
      throw new HttpsError('invalid-argument', 'eventId is required.');
    }

    const eventDoc = await db.collection('Events').doc(eventId).get();
    if (!eventDoc.exists) {
      throw new HttpsError('not-found', 'Event not found.');
    }
    const event = eventDoc.data();

    // Only the event owner may generate QR codes
    if (event.adminId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'You do not own this event.');
    }

    const attSnap = await db
      .collection('Events').doc(eventId)
      .collection('Attendees').get();
    const attendees = attSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const eventCode = event.eventCode || '';
    if (!eventCode) {
      throw new HttpsError('failed-precondition', 'Event has no eventCode. Re-save the event to generate one.');
    }

    // Use eventCode for verification URL (new event-based flow)
    const verificationBaseUrl = 'https://certificate-verification-system-6nx90yh8u.vercel.app/verify-event?code=';
    let updated = 0;

    for (const attendee of attendees) {
      const verificationUrl = verificationBaseUrl + eventCode;
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { width: 200, margin: 2 });

      // Store QR code data URL in attendee document
      await db.collection('Events').doc(eventId)
        .collection('Attendees').doc(attendee.id)
        .update({ qrCode: qrCodeDataUrl, verificationUrl: verificationUrl });

      updated++;
    }

    return { total: attendees.length, updated: updated };
  }
);

// ---------------------------------------------------------------------------
// Admin access control (invite-code signup + custom claims)
// ---------------------------------------------------------------------------

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 10;

function randomInviteCode() {
  const buf = crypto.randomBytes(INVITE_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += INVITE_CODE_ALPHABET[buf[i] % INVITE_CODE_ALPHABET.length];
  }
  return code;
}

// Mint a one-time invite code. Callable by signed-in admins only
// (verified via the admin custom claim, not Firestore rules).
exports.generateInviteCode = onCall(
  {
    timeoutSeconds: 30,
    memory: '256MiB'
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in.');
    }

    const user = await admin.auth().getUser(request.auth.uid);
    const claims = user.customClaims || {};
    if (!claims.admin) {
      throw new HttpsError('permission-denied', 'Admin privileges required.');
    }

    const code = randomInviteCode();
    await db.collection('inviteCodes').doc(code).set({
      used: false,
      usedBy: null,
      createdBy: request.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { code };
  }
);

// Create a new admin account using a one-time invite code.
// Callable by anyone: the invite code is the gate. Creates the user,
// sets the admin custom claim, and writes the Admin document.
exports.createAdmin = onCall(
  {
    timeoutSeconds: 60,
    memory: '256MiB'
  },
  async (request) => {
    const { inviteCode, adminName, email, password } = request.data || {};

    if (typeof inviteCode !== 'string' || !/^[A-Z2-9]{10}$/.test(inviteCode.trim().toUpperCase())) {
      throw new HttpsError('invalid-argument', 'A valid 10-character invite code is required.');
    }
    if (typeof adminName !== 'string' || !adminName.trim()) {
      throw new HttpsError('invalid-argument', 'adminName is required.');
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new HttpsError('invalid-argument', 'A valid email is required.');
    }
    if (typeof password !== 'string' || password.length < 6) {
      throw new HttpsError('invalid-argument', 'Password must be at least 6 characters.');
    }

    const code = inviteCode.trim().toUpperCase();
    const codeRef = db.collection('inviteCodes').doc(code);

    const codeSnap = await codeRef.get();
    const codeData = codeSnap.exists ? codeSnap.data() : null;
    if (!codeData || codeData.used) {
      throw new HttpsError('permission-denied', 'Invalid or already-used invite code.');
    }

    const cleanEmail = email.trim();
    const cleanName = adminName.trim();

    // Reject duplicate accounts.
    try {
      await admin.auth().getUserByEmail(cleanEmail);
      throw new HttpsError('already-exists', 'An account with this email already exists.');
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      if (e.code !== 'auth/user-not-found') {
        throw new HttpsError('internal', 'Could not verify email.');
      }
    }

    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email: cleanEmail,
        password: password,
        displayName: cleanName
      });
    } catch (e) {
      throw new HttpsError('internal', 'Account creation failed: ' + (e.message || 'unknown error'));
    }

    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
    await db.collection('Admin').doc(userRecord.uid).set({
      adminName: cleanName,
      email: cleanEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdVia: 'invite'
    });

    // Mark the code used (transaction re-checks to prevent double-use).
    try {
      await db.runTransaction(async (t) => {
        const snap = await t.get(codeRef);
        const data = snap.exists ? snap.data() : null;
        if (!data || data.used) {
          throw new HttpsError('permission-denied', 'Invalid or already-used invite code.');
        }
        t.update(codeRef, {
          used: true,
          usedBy: userRecord.uid,
          usedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      // Non-HttpsError transaction failure: account exists but code unmarked.
      console.error('Invite code mark-used failed:', e);
      throw new HttpsError('internal', 'Account created but invite code could not be confirmed.');
    }

    return { uid: userRecord.uid };
  }
);

// Ensure a signed-in user has the admin custom claim if they have an Admin
// document. Used both as the page guard and to backfill claims for accounts
// created before custom claims existed. Returns { admin: true|false }.
exports.ensureAdminClaim = onCall(
  {
    timeoutSeconds: 30,
    memory: '256MiB'
  },
  async (request) => {
    if (!request.auth) {
      return { admin: false };
    }

    const adminDoc = await db.collection('Admin').doc(request.auth.uid).get();
    if (!adminDoc.exists) {
      return { admin: false };
    }

    const user = await admin.auth().getUser(request.auth.uid);
    const claims = user.customClaims || {};
    if (!claims.admin) {
      await admin.auth().setCustomUserClaims(request.auth.uid, { admin: true });
    }

    return { admin: true };
  }
);

