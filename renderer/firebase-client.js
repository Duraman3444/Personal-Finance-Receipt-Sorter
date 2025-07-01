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

  // Fetch recent receipts from Firestore
  async getReceipts(limitCount = 20) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    try {
      const { collection, getDocs, orderBy, query, limit } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js');
      const receiptsRef = collection(this.db, 'receipts');
      const q = query(receiptsRef, orderBy('processed_at', 'desc'), limit(limitCount));
      const snap = await getDocs(q);
      const results = [];
      snap.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });
      return results;
    } catch (error) {
      console.error('Error fetching receipts:', error);
      return [];
    }
  }

  // Category management methods
  async getCategories() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    try {
      const { collection, getDocs, addDoc } = await import('https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js');
      const categoriesRef = collection(this.db, 'categories');
      const snap = await getDocs(categoriesRef);
      const categories = [];
      
      snap.forEach((doc) => {
        const data = doc.data();
        categories.push({
          id: doc.id,
          name: data.name,
          color: data.color || '#667eea',
          icon: data.icon || '📄',
          createdAt: data.createdAt || new Date()
        });
      });
      
      // Add default categories if none exist
      if (categories.length === 0) {
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
        
        return defaultCategories.map((cat, index) => ({
          id: `default_${index}`,
          ...cat,
          createdAt: new Date()
        }));
      }
      
      return categories.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

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
      config: {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain
      }
    };
  }
}

// Create global Firebase client instance
window.firebaseClient = new FirebaseClientService(); 