import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getCountFromServer } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables from .env (if present)
dotenv.config();

// Firebase configuration sourced from env vars (same as other scripts)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
  console.error('❌ Missing Firebase config – please set env vars.');
  process.exit(1);
}

async function main() {
  // Initialise Firebase and Firestore
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log(`📡 Counting receipts in project "${firebaseConfig.projectId}" ...`);

  try {
    // More efficient than getDocs for large collections
    const coll = collection(db, 'receipts');
    const snapshot = await getCountFromServer(coll);
    console.log(`📄 Total receipts: ${snapshot.data().count}`);
  } catch (err) {
    console.error('❌ Error counting receipts:', err);
    process.exit(1);
  }
}

main(); 