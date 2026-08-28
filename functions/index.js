const functions = require('firebase-functions');
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const QRCode = require('qrcode');

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
        const verificationUrl = 'https://ipprc-certificate-verification.web.app/CertificateVerification/CertificateVerification.html?id=' + certId;

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

    const verificationBaseUrl = 'https://ipprc-certificate-verification.web.app/CertificateVerification/CertificateVerification.html?id=';
    let updated = 0;

    for (const attendee of attendees) {
      const certId = attendee.certificateId || '';
      if (!certId) continue;

      const verificationUrl = verificationBaseUrl + certId;
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

