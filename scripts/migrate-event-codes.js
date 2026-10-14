// Migration script: add eventCode to existing events that don't have one.
// Run with: node scripts/migrate-event-codes.js

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize with service account from GOOGLE_APPLICATION_CREDENTIALS
if (admin.getApps().length === 0) {
  admin.initializeApp();
}

const db = getFirestore();
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateShortId() {
  let id = '';
  for (let i = 0; i < 7; i++) {
    id += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return id;
}

async function migrateEventCodes() {
  console.log('Fetching all events...');
  const eventsSnap = await db.collection('Events').get();
  if (eventsSnap.empty) { console.log('No events found.'); return; }
  console.log(`Found ${eventsSnap.size} events.`);

  const existingCodes = new Set();
  const eventsToUpdate = [];
  eventsSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.eventCode) existingCodes.add(data.eventCode);
    else eventsToUpdate.push({ id: doc.id, data });
  });

  console.log(`${existingCodes.size} events already have eventCode.`);
  console.log(`${eventsToUpdate.length} events need eventCode generated.`);
  if (eventsToUpdate.length === 0) { console.log('Nothing to do.'); return; }

  const batch = db.batch();
  let generated = 0;
  for (const event of eventsToUpdate) {
    let code = generateShortId();
    let attempts = 0;
    while (existingCodes.has(code) && attempts < 50) {
      code = generateShortId(); attempts++;
    }
    if (attempts >= 50) { console.warn(`Skip ${event.id}`); continue; }
    existingCodes.add(code);
    batch.update(db.collection('Events').doc(event.id), { eventCode: code });
    generated++;
    console.log(`  "${event.data.title}" (${event.id}) -> ${code}`);
  }

  if (generated > 0) {
    console.log(`\nCommitting ${generated} updates...`);
    await batch.commit();
    console.log('Done!');
  }
}

migrateEventCodes().catch(err => { console.error('Failed:', err); process.exit(1); });