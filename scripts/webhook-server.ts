import express from 'express';
import cors from 'cors';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';

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

// Conditionally instantiate OpenAI
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  console.log('ℹ️  OPENAI_API_KEY not set; /suggest-budget will return heuristic suggestions.');
}

// Main webhook endpoint - n8n calls this to store receipts
server.post('/store-receipt', async (req, res) => {
  try {
    console.log('📥 Received receipt data from n8n workflow');
    console.log('   Data keys:', Object.keys(req.body));
    
    // Check if this is an error response from the Set node
    if (req.body.error) {
      console.log('❌ Received error from n8n workflow:', req.body.error);
      console.log('   Raw response:', JSON.stringify(req.body.raw_response, null, 2));
      res.status(400).json({ 
        success: false, 
        error: 'Invalid receipt data from n8n workflow',
        details: req.body.error
      });
      return;
    }
    
    // Validate required fields
    const requiredFields = ['vendor', 'date', 'total', 'category'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
      console.log('   Received data:', JSON.stringify(req.body, null, 2));
      res.status(400).json({ 
        success: false, 
        error: 'Missing required fields',
        missing_fields: missingFields,
        received_fields: Object.keys(req.body)
      });
      return;
    }
    
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

// Add AI budget suggestion endpoint
server.post('/suggest-budget', async (req, res) => {
  try {
    const { categories } = req.body;
    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ success: false, error: 'categories array required' });
    }

    // Fallback if OpenAI key missing
    if (!process.env.OPENAI_API_KEY) {
      const suggestions = categories.map(c => ({
        category: c.category,
        suggested_budget: Math.round((c.lastThreeMonthTotal || 0) / 3)
      }));
      return res.json({ success: true, suggestions, fallback: true });
    }

    // Build prompt for GPT-4o-mini
    const messages = [
      {
        role: 'system',
        content:
          'You are a personal-finance assistant. For each category with its lastThreeMonthTotal, propose a reasonable monthly budget (whole dollars). Return ONLY JSON array like [{"category":"Dining","suggested_budget":120}] without additional keys.'
      },
      { role: 'user', content: JSON.stringify(categories) }
    ];

    const completion = await openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: messages as any
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || '[]';
    let suggestions = [];
    try { suggestions = JSON.parse(raw); } catch (_) { suggestions = []; }
    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('❌ Budget suggestion error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// AI Insights endpoint
server.post('/ai-insights', async (req, res) => {
  try {
    const { receipts, maxInsights } = req.body as { receipts: any[]; maxInsights?: number };
    const targetCount = Math.max(1, Math.min(Number(maxInsights) || 10, 50));
    if (!Array.isArray(receipts) || receipts.length === 0) {
      return res.status(400).json({ success: false, error: 'receipts array required' });
    }

    // Limit to 400 receipts to keep prompt reasonable but allow richer context
    const sampleReceipts = receipts.slice(0, 400);
    
    // Helper to build heuristic insights
    const heuristic = () => {
      const total = sampleReceipts.reduce((sum, r) => sum + (r.total || 0), 0);
      const avgAmount = (total / sampleReceipts.length).toFixed(2);
      const days = 30;
      const avgPerDay = (total / days).toFixed(2);
      
      // Top category by spend
      const catTotals: Record<string, number> = {};
      sampleReceipts.forEach(r => {
        const cat = r.category || 'Uncategorized';
        catTotals[cat] = (catTotals[cat] || 0) + (r.total || 0);
      });
      const sortedCats = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
      const [topCategory, topCatTotal] = sortedCats[0];
      
      // Most frequent vendor
      const vendorCounts: Record<string, number> = {};
      sampleReceipts.forEach(r => {
        const v = r.vendor || 'Unknown Vendor';
        vendorCounts[v] = (vendorCounts[v] || 0) + 1;
      });
      const topVendor = Object.entries(vendorCounts).sort((a,b)=>b[1]-a[1])[0];
      
      // Largest receipt
      const largest = sampleReceipts.reduce((max,r)=> (r.total||0) > (max.total||0) ? r : max, sampleReceipts[0]);
      
      return `- Total spend in period: **$${total.toFixed(2)}** across ${sampleReceipts.length} receipts.\n- Average receipt amount: **$${avgAmount}** and average daily spend: **$${avgPerDay}**.\n- Highest spending category is **${topCategory}** at $${topCatTotal.toFixed(2)} (${((topCatTotal/total)*100).toFixed(1)}% of spend).\n- You visited **${topVendor[0]}** most often (${topVendor[1]} times).\n- Largest single purchase was **$${largest.total || 0}** at ${largest.vendor || 'Unknown Vendor'}.`;
    };

    if (!openai) {
      return res.json({ success: true, insights: heuristic(), fallback: true });
    }

    const messages = [
      { role: 'system', content: `You are a seasoned personal-finance analyst. Given a list of purchase receipts (JSON objects with vendor, date, category, and total), generate up to ${targetCount} detailed, data-driven insights that help the user understand their spending habits. Go beyond the obvious by covering areas such as: top categories, average daily spend, trends, anomalies, recommendations, and vendor breakdowns. Return the insights as concise Markdown bullet points **only** – no introduction or conclusion.` },
      { role: 'user', content: JSON.stringify(sampleReceipts) }
    ];

    const completion = await openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: messages as any
    });

    let raw = completion.choices?.[0]?.message?.content?.trim() || heuristic();

    // Ensure we have at least 5 bullet points; otherwise fallback
    const bulletCount = (raw.match(/^\-\s/mg) || []).length;
    if (bulletCount < 5) {
      raw = heuristic();
    }

    res.json({ success: true, insights: raw });
  } catch (error) {
    console.error('❌ AI insights error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Saving advice endpoint
server.post('/saving-advice', async (req, res) => {
  try {
    const { receipts, maxTips } = req.body as { receipts: any[]; maxTips?: number };
    if (!Array.isArray(receipts) || receipts.length === 0) {
      return res.status(400).json({ success: false, error: 'receipts array required' });
    }

    const tipsCount = Math.max(5, Math.min(Number(maxTips) || 25, 50));

    // Heuristic fallback
    const heuristic = () => {
      const total = receipts.reduce((s, r) => s + (r.total || 0), 0);
      const avg = total / receipts.length;
      const big = receipts.filter(r => (r.total || 0) > avg * 1.5);
      const bigVendors = new Set(big.map(r => r.vendor || ''));
      return `- Review large purchases from vendors like ${Array.from(bigVendors).slice(0,3).join(', ')}.\n- Set monthly spending targets below your current average receipt of $${avg.toFixed(2)}.\n- Consider meal planning to reduce dining expenses.`;
    };

    if (!openai) {
      return res.json({ success: true, advice: heuristic(), fallback: true });
    }

    const messages = [
      { role: 'system', content: `You are an elite personal finance coach. Analyse the provided purchase receipts and craft up to ${tipsCount} actionable money-saving ideas. Structure the answer with Markdown headings for different opportunity areas (e.g. ## High-Ticket Purchases, ## Subscriptions, ## Grocery Optimisation, ## Eating Out, ## Miscellaneous) and list concise bullet-point tips under each heading. Focus on concrete, data-driven advice that references categories or vendors when useful.` },
      { role: 'user', content: JSON.stringify(receipts.slice(0, 400)) }
    ];

    const completion = await openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: messages as any
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || heuristic();
    res.json({ success: true, advice: raw });
  } catch (error) {
    console.error('❌ Saving advice error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
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