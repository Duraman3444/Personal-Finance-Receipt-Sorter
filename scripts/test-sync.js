// Test script for real-time sync functionality
// This script can be run in the browser console to test sync

console.log('🔄 Testing Real-time Sync Functionality');

// Test 1: Check if Firebase client is initialized
if (window.firebaseClient) {
    console.log('✅ Firebase client found');
    
    // Test 2: Check sync status
    const status = window.firebaseClient.getStatus();
    console.log('📊 Sync Status:', status);
    
    // Test 3: Start sync if not already active
    if (!status.syncStatus.receipts) {
        console.log('🔄 Starting receipts sync...');
        window.firebaseClient.startReceiptsSync().then(() => {
            console.log('✅ Receipts sync started');
        }).catch(err => {
            console.error('❌ Failed to start receipts sync:', err);
        });
    } else {
        console.log('✅ Receipts sync already active');
    }
    
    if (!status.syncStatus.categories) {
        console.log('🔄 Starting categories sync...');
        window.firebaseClient.startCategoriesSync().then(() => {
            console.log('✅ Categories sync started');
        }).catch(err => {
            console.error('❌ Failed to start categories sync:', err);
        });
    } else {
        console.log('✅ Categories sync already active');
    }
    
    // Test 4: Listen for sync events
    let receiptUpdateCount = 0;
    let categoryUpdateCount = 0;
    
    window.addEventListener('receipts-updated', (event) => {
        receiptUpdateCount++;
        console.log(`📡 Receipts updated (${receiptUpdateCount}):`, event.detail.receipts.length, 'receipts');
    });
    
    window.addEventListener('categories-updated', (event) => {
        categoryUpdateCount++;
        console.log(`📡 Categories updated (${categoryUpdateCount}):`, event.detail.categories.length, 'categories');
    });
    
    // Test 5: Show cached data
    setTimeout(() => {
        const cachedReceipts = window.firebaseClient.getCachedReceipts();
        const cachedCategories = window.firebaseClient.getCachedCategories();
        
        console.log('📊 Cached Data:');
        console.log('  - Receipts:', cachedReceipts.length);
        console.log('  - Categories:', cachedCategories.length);
        
        if (cachedReceipts.length > 0) {
            console.log('  - Latest receipt:', cachedReceipts[0]);
        }
        
        if (cachedCategories.length > 0) {
            console.log('  - Categories:', cachedCategories.map(c => c.name));
        }
    }, 2000);
    
    console.log('✅ Sync test setup complete. Watch for real-time updates...');
    
} else {
    console.error('❌ Firebase client not found');
}

// Helper function to manually trigger a test update
window.testSyncUpdate = function() {
    console.log('🧪 Testing manual sync update...');
    
    // Simulate adding a test receipt
    const testReceipt = {
        vendor: 'Test Vendor',
        date: new Date().toISOString(),
        total: 9.99,
        currency: 'USD',
        category: 'Testing',
        status: 'processed'
    };
    
    // Note: This would normally be done through the N8N workflow
    // For testing, you can manually add data through Firebase console
    console.log('📝 Test receipt data:', testReceipt);
    console.log('ℹ️  To test sync, manually add this data to Firebase console');
};

console.log('ℹ️  Run testSyncUpdate() to see test data format'); 