// Firebase client for renderer process
// This file provides Firebase functionality for the browser environment

// Firebase configuration (using environment variables or fallbacks)
    // Firebase config should come from environment variables
    // These will be injected by the main process via IPC
    const firebaseConfig = await window.electronAPI.getFirebaseConfig();

// Firebase client service
class FirebaseClientService {
  constructor() {
    this.app = null;
    this.db = null;
    this.isInitialized = false;
    this.isConnected = false;
    
    // Real-time listeners and cached data
    this.receiptsListener = null;
    this.categoriesListener = null;
    this.cachedReceipts = [];
    this.cachedCategories = [];
    this.isReceiptsListening = false;
    this.isCategoriesListening = false;
  }

  async initialize() {
    try {
      // Import Firebase modules dynamically
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js');
      const { getFirestore, connectFirestoreEmulator } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js');
      
      // Initialize Firebase
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);
      
          // Connect to emulator in development (disabled for now - requires Java)
    // if (window.location.hostname === 'localhost') {
    //   try {
    //     connectFirestoreEmulator(this.db, 'localhost', 8080);
    //     console.log('🔗 Firebase client connected to emulator');
    //   } catch (error) {
    //     console.log('ℹ️  Emulator connection failed (may already be connected)');
    //   }
    // }
    
    console.log('🔥 Firebase client connected to production');
      
      this.isInitialized = true;
      this.isConnected = true;
      console.log('✅ Firebase client initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Firebase client initialization failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async testConnection() {
    if (!this.isInitialized) {
      return await this.initialize();
    }
    
    try {
      // Simple test to verify connection
      const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js');
      await getDocs(collection(this.db, 'test'));
      this.isConnected = true;
      return true;
    } catch (error) {
      console.log('Firebase connection test:', error.message);
      this.isConnected = error.code !== 'permission-denied'; // Permission denied means we're connected but not authenticated
      return this.isConnected;
    }
  }

  // Start real-time sync for receipts
  async startReceiptsSync(limitCount = 1000) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.isReceiptsListening) {
      console.log('📡 Receipts sync already active');
      return this.cachedReceipts;
    }
    
    try {
      const { collection, onSnapshot, orderBy, query, limit } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js');
      const receiptsRef = collection(this.db, 'receipts');
      const q = query(receiptsRef, orderBy('processed_at', 'desc'), limit(limitCount));
      
      this.receiptsListener = onSnapshot(q, (snapshot) => {
        const receipts = [];
        snapshot.forEach((doc) => {
          receipts.push({ id: doc.id, ...doc.data() });
        });
        
        this.cachedReceipts = receipts;
        this.isReceiptsListening = true;
        
        // Dispatch custom event for UI updates
        window.dispatchEvent(new CustomEvent('receipts-updated', { 
          detail: { receipts, timestamp: new Date().toISOString() } 
        }));
        
        console.log(`📡 Receipts synced: ${receipts.length} items`);
      }, (error) => {
        console.error('❌ Receipts sync error:', error);
        this.isReceiptsListening = false;
      });
      
      return new Promise((resolve) => {
        // Return cached data immediately if available, otherwise wait for first sync
        if (this.cachedReceipts.length > 0) {
          resolve(this.cachedReceipts);
        } else {
          const handler = (event) => {
            window.removeEventListener('receipts-updated', handler);
            resolve(event.detail.receipts);
          };
          window.addEventListener('receipts-updated', handler);
        }
      });
    } catch (error) {
      console.error('❌ Error starting receipts sync:', error);
      return [];
    }
  }

  // Start real-time sync for categories
  async startCategoriesSync() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.isCategoriesListening) {
      console.log('📡 Categories sync already active');
      return this.cachedCategories;
    }
    
    try {
      const { collection, onSnapshot, addDoc } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js');
      const categoriesRef = collection(this.db, 'categories');
      
      this.categoriesListener = onSnapshot(categoriesRef, async (snapshot) => {
        const categories = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          categories.push({
            id: doc.id,
            name: data.name,
            color: data.color || '#667eea',
            icon: data.icon || '📄',
            monthlyBudget: data.monthlyBudget || 0,
            createdAt: data.createdAt || new Date()
          });
        });
        
        // Add default categories if none exist
        if (categories.length === 0 && !this.defaultCategoriesAdded) {
          this.defaultCategoriesAdded = true;
          const defaultCategories = [
            { name: 'Groceries', color: '#51cf66', icon: '🛒' },
            { name: 'Restaurants', color: '#fd7e14', icon: '🍽️' },
            { name: 'Gas', color: '#fa5252', icon: '⛽' },
            { name: 'Shopping', color: '#e64980', icon: '🛍️' },
            { name: 'Utilities', color: '#339af0', icon: '⚡' },
            { name: 'Healthcare', color: '#37b24d', icon: '🏥' },
            { name: 'Entertainment', color: '#ae3ec9', icon: '🎬' },
            { name: 'Other', color: '#868e96', icon: '📄' }
          ];
          
          for (const category of defaultCategories) {
            await addDoc(categoriesRef, { 
              ...category,
              createdAt: new Date().toISOString()
            });
          }
          return; // Exit early, the listener will fire again with the new categories
        }
        
        this.cachedCategories = categories.sort((a, b) => a.name.localeCompare(b.name));
        this.isCategoriesListening = true;
        
        // Dispatch custom event for UI updates
        window.dispatchEvent(new CustomEvent('categories-updated', { 
          detail: { categories: this.cachedCategories, timestamp: new Date().toISOString() } 
        }));
        
        console.log(`📡 Categories synced: ${categories.length} items`);
      }, (error) => {
        console.error('❌ Categories sync error:', error);
        this.isCategoriesListening = false;
      });
      
      return new Promise((resolve) => {
        // Return cached data immediately if available, otherwise wait for first sync
        if (this.cachedCategories.length > 0) {
          resolve(this.cachedCategories);
        } else {
          const handler = (event) => {
            window.removeEventListener('categories-updated', handler);
            resolve(event.detail.categories);
          };
          window.addEventListener('categories-updated', handler);
        }
      });
    } catch (error) {
      console.error('❌ Error starting categories sync:', error);
      return [];
    }
  }

  // Stop real-time sync
  stopReceiptsSync() {
    if (this.receiptsListener) {
      this.receiptsListener();
      this.receiptsListener = null;
      this.isReceiptsListening = false;
      console.log('📡 Receipts sync stopped');
    }
  }

  stopCategoriesSync() {
    if (this.categoriesListener) {
      this.categoriesListener();
      this.categoriesListener = null;
      this.isCategoriesListening = false;
      console.log('📡 Categories sync stopped');
    }
  }

  stopAllSync() {
    this.stopReceiptsSync();
    this.stopCategoriesSync();
  }

  // Legacy methods for backward compatibility (now use cached data or start sync)
  async getReceipts(limitCount = 20) {
    if (this.isReceiptsListening) {
      return this.cachedReceipts.slice(0, limitCount);
    }
    
    // Start sync if not already listening
    await this.startReceiptsSync(Math.max(limitCount, 1000));
    return this.cachedReceipts.slice(0, limitCount);
  }

  async getCategories() {
    if (this.isCategoriesListening) {
      return this.cachedCategories;
    }
    
    // Start sync if not already listening
    await this.startCategoriesSync();
    return this.cachedCategories;
  }

  // Get cached data without triggering sync
  getCachedReceipts(limitCount = 20) {
    return this.cachedReceipts.slice(0, limitCount);
  }

  getCachedCategories() {
    return this.cachedCategories;
  }

  // Category management methods
  async addCategory(categoryData) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    try {
      const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js');
      const categoriesRef = collection(this.db, 'categories');
      const docRef = await addDoc(categoriesRef, { 
        ...categoryData,
        createdAt: new Date().toISOString()
      });
      console.log('✅ Category added:', categoryData.name);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding category:', error);
      throw error;
    }
  }

  async updateCategory(categoryId, updates) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    try {
      const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js');
      const categoryRef = doc(this.db, 'categories', categoryId);
      await updateDoc(categoryRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Category updated:', categoryId);
    } catch (error) {
      console.error('❌ Error updating category:', error);
      throw error;
    }
  }

  async deleteCategory(categoryId) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    try {
      const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js');
      const categoryRef = doc(this.db, 'categories', categoryId);
      await deleteDoc(categoryRef);
      console.log('✅ Category deleted:', categoryId);
    } catch (error) {
      console.error('❌ Error deleting category:', error);
      throw error;
    }
  }

  async updateReceipt(receiptId, updates) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    try {
      const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js');
      const receiptRef = doc(this.db, 'receipts', receiptId);
      await updateDoc(receiptRef, {
        ...updates,
        updated_at: new Date().toISOString()
      });
      console.log('✅ Receipt updated:', receiptId);
    } catch (error) {
      console.error('❌ Error updating receipt:', error);
      throw error;
    }
  }

  async deleteReceipt(receiptId) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    try {
      const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js');
      const receiptRef = doc(this.db, 'receipts', receiptId);
      await deleteDoc(receiptRef);
      console.log('✅ Receipt deleted:', receiptId);
    } catch (error) {
      console.error('❌ Error deleting receipt:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      connected: this.isConnected,
      syncStatus: {
        receipts: this.isReceiptsListening,
        categories: this.isCategoriesListening,
        cachedReceipts: this.cachedReceipts.length,
        cachedCategories: this.cachedCategories.length
      },
      config: {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain
      }
    };
  }
}

// Create global Firebase client instance
window.firebaseClient = new FirebaseClientService(); 