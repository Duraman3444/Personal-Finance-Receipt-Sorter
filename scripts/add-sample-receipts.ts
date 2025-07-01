import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample data for realistic receipts
const vendors = [
  { name: 'Walmart', category: 'Groceries' },
  { name: 'Target', category: 'Retail' },
  { name: 'Kroger', category: 'Groceries' },
  { name: 'Starbucks', category: 'Coffee & Dining' },
  { name: 'McDonald\'s', category: 'Fast Food' },
  { name: 'Shell', category: 'Gas' },
  { name: 'Chevron', category: 'Gas' },
  { name: 'Home Depot', category: 'Home Improvement' },
  { name: 'Amazon', category: 'Online Shopping' },
  { name: 'Costco', category: 'Wholesale' },
  { name: 'CVS Pharmacy', category: 'Pharmacy' },
  { name: 'Walgreens', category: 'Pharmacy' },
  { name: 'Best Buy', category: 'Electronics' },
  { name: 'Olive Garden', category: 'Dining' },
  { name: 'Chipotle', category: 'Fast Casual' },
  { name: 'Uber Eats', category: 'Food Delivery' },
  { name: 'DoorDash', category: 'Food Delivery' },
  { name: 'Netflix', category: 'Subscriptions' },
  { name: 'Spotify', category: 'Subscriptions' },
  { name: 'Gym Membership', category: 'Health & Fitness' },
  { name: 'Safeway', category: 'Groceries' },
  { name: 'Whole Foods', category: 'Groceries' },
  { name: 'Trader Joe\'s', category: 'Groceries' },
  { name: 'Publix', category: 'Groceries' },
  { name: 'Meijer', category: 'Groceries' },
  { name: 'Pizza Hut', category: 'Fast Food' },
  { name: 'Domino\'s', category: 'Fast Food' },
  { name: 'Subway', category: 'Fast Food' },
  { name: 'Taco Bell', category: 'Fast Food' },
  { name: 'KFC', category: 'Fast Food' },
  { name: 'Burger King', category: 'Fast Food' },
  { name: 'Wendy\'s', category: 'Fast Food' },
  { name: 'Panera Bread', category: 'Fast Casual' },
  { name: 'Chick-fil-A', category: 'Fast Food' },
  { name: 'In-N-Out', category: 'Fast Food' },
  { name: 'Five Guys', category: 'Fast Food' },
  { name: 'Applebee\'s', category: 'Dining' },
  { name: 'TGI Friday\'s', category: 'Dining' },
  { name: 'Red Lobster', category: 'Dining' },
  { name: 'Outback Steakhouse', category: 'Dining' },
  { name: 'Lowe\'s', category: 'Home Improvement' },
  { name: 'Menards', category: 'Home Improvement' },
  { name: 'Ace Hardware', category: 'Home Improvement' },
  { name: 'Office Depot', category: 'Office Supplies' },
  { name: 'Staples', category: 'Office Supplies' },
  { name: 'FedEx', category: 'Shipping' },
  { name: 'UPS Store', category: 'Shipping' },
  { name: 'Dry Cleaner', category: 'Services' },
  { name: 'Car Wash', category: 'Auto Care' },
  { name: 'Jiffy Lube', category: 'Auto Care' },
  { name: 'Valvoline', category: 'Auto Care' },
  { name: 'AutoZone', category: 'Auto Parts' },
  { name: 'O\'Reilly Auto Parts', category: 'Auto Parts' },
  { name: 'Petco', category: 'Pet Care' },
  { name: 'PetSmart', category: 'Pet Care' },
  { name: 'Barnes & Noble', category: 'Books' },
  { name: 'GameStop', category: 'Gaming' },
  { name: 'Victoria\'s Secret', category: 'Clothing' },
  { name: 'Gap', category: 'Clothing' },
  { name: 'Old Navy', category: 'Clothing' },
  { name: 'H&M', category: 'Clothing' },
  { name: 'Zara', category: 'Clothing' },
  { name: 'Macy\'s', category: 'Department Store' },
  { name: 'JCPenney', category: 'Department Store' },
  { name: 'Kohl\'s', category: 'Department Store' },
  { name: 'Nordstrom', category: 'Department Store' },
  { name: 'Sephora', category: 'Beauty' },
  { name: 'Ulta Beauty', category: 'Beauty' },
  { name: 'Sally Beauty', category: 'Beauty' },
  { name: 'Great Clips', category: 'Personal Care' },
  { name: 'Supercuts', category: 'Personal Care' },
  { name: 'Nail Salon', category: 'Personal Care' },
  { name: 'Movie Theater', category: 'Entertainment' },
  { name: 'Bowling Alley', category: 'Entertainment' },
  { name: 'Mini Golf', category: 'Entertainment' },
  { name: 'Amusement Park', category: 'Entertainment' },
  { name: 'Museum', category: 'Entertainment' },
  { name: 'Concert Venue', category: 'Entertainment' },
  { name: 'Sports Event', category: 'Entertainment' },
  { name: 'Hotel', category: 'Travel' },
  { name: 'Airbnb', category: 'Travel' },
  { name: 'Airline', category: 'Travel' },
  { name: 'Rental Car', category: 'Travel' },
  { name: 'Taxi/Uber', category: 'Transportation' },
  { name: 'Lyft', category: 'Transportation' },
  { name: 'Public Transit', category: 'Transportation' },
  { name: 'Parking Meter', category: 'Transportation' },
  { name: 'Toll Road', category: 'Transportation' },
  { name: 'Insurance Payment', category: 'Insurance' },
  { name: 'Utility Bill', category: 'Utilities' },
  { name: 'Internet Bill', category: 'Utilities' },
  { name: 'Phone Bill', category: 'Utilities' },
  { name: 'Bank Fee', category: 'Banking' },
  { name: 'ATM Fee', category: 'Banking' },
  { name: 'Doctor Visit', category: 'Healthcare' },
  { name: 'Dentist', category: 'Healthcare' },
  { name: 'Pharmacy', category: 'Healthcare' },
  { name: 'Veterinarian', category: 'Pet Care' },
  { name: 'Charity Donation', category: 'Donations' },
  { name: 'Church Donation', category: 'Donations' },
  { name: 'School Supplies', category: 'Education' },
  { name: 'Tuition Payment', category: 'Education' },
  { name: 'Bookstore', category: 'Education' }
];

// Price ranges by category
const categoryPriceRanges: { [key: string]: { min: number; max: number } } = {
  'Groceries': { min: 15, max: 180 },
  'Gas': { min: 25, max: 85 },
  'Fast Food': { min: 8, max: 25 },
  'Fast Casual': { min: 12, max: 35 },
  'Dining': { min: 25, max: 120 },
  'Coffee & Dining': { min: 4, max: 15 },
  'Food Delivery': { min: 18, max: 45 },
  'Retail': { min: 20, max: 250 },
  'Online Shopping': { min: 15, max: 300 },
  'Electronics': { min: 50, max: 800 },
  'Clothing': { min: 25, max: 200 },
  'Department Store': { min: 30, max: 300 },
  'Beauty': { min: 15, max: 80 },
  'Personal Care': { min: 20, max: 60 },
  'Home Improvement': { min: 25, max: 400 },
  'Auto Care': { min: 30, max: 150 },
  'Auto Parts': { min: 15, max: 200 },
  'Pet Care': { min: 20, max: 100 },
  'Healthcare': { min: 25, max: 300 },
  'Entertainment': { min: 15, max: 150 },
  'Travel': { min: 100, max: 800 },
  'Transportation': { min: 8, max: 50 },
  'Subscriptions': { min: 10, max: 25 },
  'Utilities': { min: 50, max: 200 },
  'Insurance': { min: 100, max: 400 },
  'Banking': { min: 5, max: 35 },
  'Education': { min: 25, max: 500 },
  'Donations': { min: 10, max: 100 },
  'Default': { min: 10, max: 100 }
};

function getRandomPrice(category: string): number {
  const range = categoryPriceRanges[category] || categoryPriceRanges['Default'];
  const price = Math.random() * (range.max - range.min) + range.min;
  return Math.round(price * 100) / 100; // Round to 2 decimal places
}

function getRandomDateInPastYear(): Date {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const randomTime = oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime());
  return new Date(randomTime);
}

function getRandomVendor() {
  return vendors[Math.floor(Math.random() * vendors.length)];
}

function generateReceiptId(): string {
  return `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateItems(vendor: string, total: number): Array<{ name: string; price: number; quantity: number }> {
  const itemCount = Math.floor(Math.random() * 5) + 1; // 1-5 items
  const items = [];
  let remainingTotal = total;
  
  // Common items by vendor type
  const itemsByVendor: { [key: string]: string[] } = {
    'Walmart': ['Bananas', 'Bread', 'Milk', 'Eggs', 'Chicken', 'Rice', 'Pasta', 'Tomatoes', 'Onions', 'Cheese'],
    'Starbucks': ['Coffee', 'Latte', 'Frappuccino', 'Sandwich', 'Pastry', 'Tea', 'Hot Chocolate'],
    'McDonald\'s': ['Big Mac', 'Fries', 'Chicken McNuggets', 'Quarter Pounder', 'McFlurry', 'Soda', 'Apple Pie'],
    'Shell': ['Gasoline', 'Snacks', 'Drinks', 'Car Wash'],
    'Home Depot': ['Screws', 'Paint', 'Lumber', 'Tools', 'Light Bulbs', 'Garden Supplies'],
    'Default': ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5']
  };
  
  const availableItems = itemsByVendor[vendor] || itemsByVendor['Default'];
  
  for (let i = 0; i < itemCount; i++) {
    const itemName = availableItems[Math.floor(Math.random() * availableItems.length)];
    const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
    const price = i === itemCount - 1 ? 
      Math.round(remainingTotal * 100) / 100 : // Last item gets remaining total
      Math.round((remainingTotal / (itemCount - i)) * (0.5 + Math.random()) * 100) / 100;
    
    items.push({
      name: itemName,
      price: Math.max(0.01, price),
      quantity
    });
    
    remainingTotal -= price;
  }
  
  return items;
}

async function addSampleReceipts() {
  console.log('🧾 Adding diverse sample receipts...');
  
  const receiptsToAdd = 150; // Add 150 receipts spread across the year
  const receipts = [];
  
  for (let i = 0; i < receiptsToAdd; i++) {
    const vendor = getRandomVendor();
    const date = getRandomDateInPastYear();
    const total = getRandomPrice(vendor.category);
    const items = generateItems(vendor.name, total);
    
    const receipt = {
      id: generateReceiptId(),
      vendor: vendor.name,
      category: vendor.category,
      total,
      date: Timestamp.fromDate(date),
      items,
      processed_at: Timestamp.now(),
      confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
      raw_text: `Receipt from ${vendor.name}\nDate: ${date.toLocaleDateString()}\nTotal: $${total.toFixed(2)}`,
      status: 'processed',
      source: 'sample_data',
      tax: Math.round(total * 0.08 * 100) / 100, // 8% tax
      subtotal: Math.round((total - (total * 0.08)) * 100) / 100,
      payment_method: ['Cash', 'Credit Card', 'Debit Card'][Math.floor(Math.random() * 3)],
      location: {
        address: `${Math.floor(Math.random() * 9999)} Main St`,
        city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'][Math.floor(Math.random() * 6)],
        state: ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA'][Math.floor(Math.random() * 6)],
        zip: `${Math.floor(Math.random() * 90000) + 10000}`
      }
    };
    
    receipts.push(receipt);
  }
  
  // Sort by date to add them in chronological order
  receipts.sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());
  
  // Add receipts to Firestore in batches
  const batchSize = 10;
  for (let i = 0; i < receipts.length; i += batchSize) {
    const batch = receipts.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (receipt) => {
      try {
        await addDoc(collection(db, 'receipts'), receipt);
        console.log(`✅ Added receipt: ${receipt.vendor} - $${receipt.total.toFixed(2)} (${receipt.date.toDate().toLocaleDateString()})`);
      } catch (error) {
        console.error(`❌ Failed to add receipt for ${receipt.vendor}:`, error);
      }
    }));
    
    // Small delay between batches to avoid overwhelming Firestore
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`🎉 Successfully added ${receipts.length} sample receipts spread across the past year!`);
  
  // Print summary statistics
  const categoryStats: { [key: string]: { count: number; total: number } } = {};
  receipts.forEach(receipt => {
    if (!categoryStats[receipt.category]) {
      categoryStats[receipt.category] = { count: 0, total: 0 };
    }
    categoryStats[receipt.category].count++;
    categoryStats[receipt.category].total += receipt.total;
  });
  
  console.log('\n📊 Summary by Category:');
  Object.entries(categoryStats)
    .sort(([,a], [,b]) => b.total - a.total)
    .forEach(([category, stats]) => {
      console.log(`${category}: ${stats.count} receipts, $${stats.total.toFixed(2)} total`);
    });
  
  const totalSpent = receipts.reduce((sum, r) => sum + r.total, 0);
  console.log(`\n💰 Total Sample Spending: $${totalSpent.toFixed(2)}`);
  console.log(`📅 Date Range: ${receipts[0].date.toDate().toLocaleDateString()} to ${receipts[receipts.length - 1].date.toDate().toLocaleDateString()}`);
}

// Run the script
addSampleReceipts().catch(console.error); 