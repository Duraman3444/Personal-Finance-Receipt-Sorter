import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';

export interface Receipt {
  id?: string;
  vendor: string;
  date: string;
  total: number;
  tax?: number;
  currency: string;
  payment_method?: string;
  category: string;
  items?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  processed_at: string;
  status: 'pending' | 'processed' | 'failed';
  file_path?: string;
  ocr_text?: string;
}

export class FirebaseService {
  private receiptsCollection = 'receipts';
  private categoriesCollection = 'categories';

  // Receipt operations
  async saveReceipt(receipt: Omit<Receipt, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.receiptsCollection), {
        ...receipt,
        processed_at: new Date().toISOString()
      });
      console.log('✅ Receipt saved with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error saving receipt:', error);
      throw error;
    }
  }

  async getReceipts(limit: number = 50): Promise<Receipt[]> {
    try {
      const q = query(
        collection(db, this.receiptsCollection),
        orderBy('processed_at', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const receipts: Receipt[] = [];
      
      querySnapshot.forEach((doc) => {
        receipts.push({
          id: doc.id,
          ...doc.data()
        } as Receipt);
      });
      
      console.log(`✅ Retrieved ${receipts.length} receipts`);
      return receipts;
    } catch (error) {
      console.error('❌ Error getting receipts:', error);
      throw error;
    }
  }

  async getReceiptsByCategory(category: string): Promise<Receipt[]> {
    try {
      const q = query(
        collection(db, this.receiptsCollection),
        where('category', '==', category),
        orderBy('processed_at', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const receipts: Receipt[] = [];
      
      querySnapshot.forEach((doc) => {
        receipts.push({
          id: doc.id,
          ...doc.data()
        } as Receipt);
      });
      
      console.log(`✅ Retrieved ${receipts.length} receipts for category: ${category}`);
      return receipts;
    } catch (error) {
      console.error('❌ Error getting receipts by category:', error);
      throw error;
    }
  }

  async updateReceipt(id: string, updates: Partial<Receipt>): Promise<void> {
    try {
      const receiptRef = doc(db, this.receiptsCollection, id);
      await updateDoc(receiptRef, updates);
      console.log('✅ Receipt updated:', id);
    } catch (error) {
      console.error('❌ Error updating receipt:', error);
      throw error;
    }
  }

  async deleteReceipt(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.receiptsCollection, id));
      console.log('✅ Receipt deleted:', id);
    } catch (error) {
      console.error('❌ Error deleting receipt:', error);
      throw error;
    }
  }

  // Category operations
  async getCategories(): Promise<Array<{id: string, name: string, color: string, icon: string, createdAt: any}>> {
    try {
      const querySnapshot = await getDocs(collection(db, this.categoriesCollection));
      const categories: Array<{id: string, name: string, color: string, icon: string, createdAt: any}> = [];
      
      querySnapshot.forEach((doc) => {
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
          await addDoc(collection(db, this.categoriesCollection), { 
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
      
      console.log(`✅ Retrieved ${categories.length} categories`);
      return categories.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('❌ Error getting categories:', error);
      throw error;
    }
  }

  async addCategory(category: {name: string, color: string, icon: string}): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.categoriesCollection), { 
        ...category,
        createdAt: new Date().toISOString()
      });
      console.log('✅ Category added:', category.name);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error adding category:', error);
      throw error;
    }
  }

  async updateCategory(id: string, updates: {name?: string, color?: string, icon?: string}): Promise<void> {
    try {
      const categoryRef = doc(db, this.categoriesCollection, id);
      await updateDoc(categoryRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Category updated:', id);
    } catch (error) {
      console.error('❌ Error updating category:', error);
      throw error;
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.categoriesCollection, id));
      console.log('✅ Category deleted:', id);
    } catch (error) {
      console.error('❌ Error deleting category:', error);
      throw error;
    }
  }

  // Analytics
  async getSpendingByCategory(startDate?: string, endDate?: string): Promise<{ category: string; total: number }[]> {
    try {
      let q = query(collection(db, this.receiptsCollection));
      
      if (startDate && endDate) {
        q = query(
          collection(db, this.receiptsCollection),
          where('date', '>=', startDate),
          where('date', '<=', endDate)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const categoryTotals: { [key: string]: number } = {};
      
      querySnapshot.forEach((doc) => {
        const receipt = doc.data() as Receipt;
        if (categoryTotals[receipt.category]) {
          categoryTotals[receipt.category] += receipt.total;
        } else {
          categoryTotals[receipt.category] = receipt.total;
        }
      });
      
      const result = Object.entries(categoryTotals).map(([category, total]) => ({
        category,
        total: Math.round(total * 100) / 100 // Round to 2 decimal places
      }));
      
      console.log('✅ Retrieved spending by category');
      return result;
    } catch (error) {
      console.error('❌ Error getting spending by category:', error);
      throw error;
    }
  }

  // Connection test
  async testConnection(): Promise<boolean> {
    try {
      await getDocs(collection(db, 'test'));
      return true;
    } catch (error) {
      console.error('Firebase connection test failed:', error);
      return false;
    }
  }
} 