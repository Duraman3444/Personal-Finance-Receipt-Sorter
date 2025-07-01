import express from 'express';
import cors from 'cors';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firebase with the same config as other scripts
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Validate Firebase config
if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
  throw new Error('Missing Firebase configuration. Please check your .env file.');
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('🔥 Connected to Firebase for webhook server');

// Create Express server
const server = express();
server.use(cors());
server.use(express.json({ limit: '10mb' })); // Allow larger payloads for OCR text

// Main webhook endpoint - n8n calls this to store receipts
server.post('/store-receipt', async (req, res) => {
  try {
    console.log('📥 Received receipt data from n8n workflow');
    console.log('   Data keys:', Object.keys(req.body));
    
    // Add processing metadata
    const receiptData = {
      ...req.body,
      processed_at: new Date().toISOString(),
      status: 'processed',
      source: 'n8n_workflow'
    };
    
    // Store in Firestore receipts collection
    const docRef = await addDoc(collection(db, 'receipts'), receiptData);
    
    console.log('✅ Stored receipt successfully');
    console.log(`   Document ID: ${docRef.id}`);
    console.log(`   Vendor: ${receiptData.vendor || 'Unknown'}`);
    console.log(`   Total: $${receiptData.total || 0}`);
    
    res.json({ 
      success: true, 
      id: docRef.id,
      message: 'Receipt stored in Firebase',
      data: {
        vendor: receiptData.vendor,
        total: receiptData.total,
        date: receiptData.date
      }
    });
  } catch (error) {
    console.error('❌ Error storing receipt:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
server.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'receipt-webhook-server',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /store-receipt - Store parsed receipt data',
      'GET /health - This health check'
    ]
  });
});

// Test endpoint for development
server.post('/test', async (req, res) => {
  try {
    console.log('🧪 Test request received:', req.body);
    res.json({ 
      message: 'Test successful',
      received: req.body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Test failed' });
  }
});

const PORT = process.env.WEBHOOK_PORT || 3001;

server.listen(PORT, () => {
  console.log('\n🚀 Receipt Webhook Server Started!');
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   Primary endpoint: POST http://localhost:${PORT}/store-receipt`);
  console.log(`   Health check: GET http://localhost:${PORT}/health`);
  console.log('\n📡 n8n Workflow Instructions:');
  console.log('   1. Use HTTP Request node');
  console.log('   2. Method: POST');
  console.log(`   3. URL: http://localhost:${PORT}/store-receipt`);
  console.log('   4. Headers: Content-Type: application/json');
  console.log('   5. Body: Pass the parsed receipt JSON from OpenAI');
  console.log('\n⏰ Server ready to receive receipt data from n8n...\n');
}); 