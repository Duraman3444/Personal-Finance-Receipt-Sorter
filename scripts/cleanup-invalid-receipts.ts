/**
 * cleanup-invalid-receipts.ts
 * -----------------------------------------
 * One-off utility: deletes any Firestore `receipts` documents that
 * are missing core fields (vendor, total, or date). Run with:
 *   npx ts-node scripts/cleanup-invalid-receipts.ts
 * or after building:
 *   node dist/scripts/cleanup-invalid-receipts.js
 */

import * as dotenv from 'dotenv';
import {
  initializeApp as fbInit,
  FirebaseApp,
  deleteApp as fbDelete,
} from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore';

// Load .env first
dotenv.config();

// --- Firebase bootstrap using env vars ---
function initFirebase(): FirebaseApp {
  const required = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
  ];
  required.forEach((k) => {
    if (!process.env[k]) {
      console.error(`❌ Missing env var ${k}`);
      process.exit(1);
    }
  });

  return fbInit({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  });
}

async function main() {
  const app = initFirebase();
  const db = getFirestore(app);

  const snap = await getDocs(collection(db, 'receipts'));
  let deleted = 0;

  for (const d of snap.docs) {
    const r = d.data() as any;
    if (!r.vendor || !r.total || !r.date) {
      await deleteDoc(doc(db, 'receipts', d.id));
      console.log('🗑️  Deleted invalid receipt', d.id);
      deleted++;
    }
  }

  console.log(`\n✅ Cleanup complete. ${deleted} invalid receipts removed.`);
  await fbDelete(app);
  process.exit(0);
}

main().catch((err) => {
  console.error('Unexpected error during cleanup:', err);
  process.exit(1);
}); 