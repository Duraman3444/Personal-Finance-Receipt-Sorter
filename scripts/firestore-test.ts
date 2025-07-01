import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, connectFirestoreEmulator } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Firebase configuration
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'personalfinancerecieptsorter'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connect to Firestore emulator if in development
if (process.env.NODE_ENV === 'development') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('🔗 Connected to Firestore emulator');
  } catch (error) {
    console.log('ℹ️  Firestore emulator connection failed (may already be connected)');
  }
}

// Sample receipt data
const sampleReceipt = {
  vendor: "Walmart Supercenter",
  date: "2024-06-30",
  total: 10.21,
  tax: 0.76,
  currency: "USD",
  payment_method: "Visa ending in 1234",
  category: "Groceries",
  items: [
    { name: "Great Value Milk 1GAL", price: 3.98, quantity: 1 },
    { name: "Bananas 2.5 LB", price: 1.70, quantity: 1 },
    { name: "Bread White Loaf", price: 1.28, quantity: 1 },
    { name: "Eggs Large Dozen", price: 2.49, quantity: 1 }
  ],
  processed_at: new Date().toISOString(),
  status: "processed"
};

async function testFirestoreWrite() {
  console.log('🔥 Testing Firebase Firestore Write...\n');
  
  try {
    console.log('📝 Sample Receipt Data:');
    console.log(JSON.stringify(sampleReceipt, null, 2));
    console.log('\n💾 Writing to Firestore...\n');

    // Add document to receipts collection
    const docRef = await addDoc(collection(db, 'receipts'), sampleReceipt);
    
    console.log('✅ Successfully wrote receipt to Firestore!');
    console.log(`📄 Document ID: ${docRef.id}`);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error writing to Firestore:', error.message);
    return null;
  }
}

async function testFirestoreRead() {
  console.log('\n📖 Testing Firebase Firestore Read...\n');
  
  try {
    const querySnapshot = await getDocs(collection(db, 'receipts'));
    
    if (querySnapshot.empty) {
      console.log('📭 No receipts found in database');
      return [];
    }
    
    const receipts: any[] = [];
    querySnapshot.forEach((doc) => {
      receipts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ Successfully read ${receipts.length} receipt(s) from Firestore!`);
    receipts.forEach((receipt, index) => {
      console.log(`\n📄 Receipt ${index + 1}:`);
      console.log(`   ID: ${receipt.id}`);
      console.log(`   Vendor: ${receipt.vendor}`);
      console.log(`   Date: ${receipt.date}`);
      console.log(`   Total: $${receipt.total}`);
      console.log(`   Category: ${receipt.category}`);
    });
    
    return receipts;
  } catch (error) {
    console.error('❌ Error reading from Firestore:', error.message);
    return [];
  }
}

async function testFirestoreConnection() {
  console.log('🚀 Starting Firestore Connection Test...\n');
  
  try {
    // Test write
    const docId = await testFirestoreWrite();
    
    if (docId) {
      // Test read
      await testFirestoreRead();
      
      console.log('\n🎉 Firestore test completed successfully!');
      console.log('✅ Both read and write operations working');
      console.log('🔧 Ready to integrate with receipt processing workflow');
    } else {
      console.log('\n💥 Firestore write test failed');
    }
  } catch (error) {
    console.error('💥 Unexpected error during Firestore test:', error);
  }
}

// Instructions for running with emulator
console.log('📋 Firestore Test Instructions:');
console.log('1. Make sure Firebase emulator is running: firebase emulators:start');
console.log('2. Emulator should be accessible at http://localhost:4000');
console.log('3. Firestore emulator runs on port 8080');
console.log('4. Run this test script\n');

// Run the test
testFirestoreConnection(); 