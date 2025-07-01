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