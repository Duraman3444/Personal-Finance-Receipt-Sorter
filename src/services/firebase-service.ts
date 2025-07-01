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
  async getCategories(): Promise<string[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.categoriesCollection));
      const categories: string[] = [];
      
      querySnapshot.forEach((doc) => {
        categories.push(doc.data().name);
      });
      
      // Add default categories if none exist
      if (categories.length === 0) {
        const defaultCategories = [
          'Groceries', 'Restaurants', 'Gas', 'Shopping', 
          'Utilities', 'Healthcare', 'Entertainment', 'Other'
        ];
        
        for (const category of defaultCategories) {
          await addDoc(collection(db, this.categoriesCollection), { name: category });
        }
        
        return defaultCategories;
      }
      
      console.log(`✅ Retrieved ${categories.length} categories`);
      return categories;
    } catch (error) {
      console.error('❌ Error getting categories:', error);
      throw error;
    }
  }

  async addCategory(name: string): Promise<void> {
    try {
      await addDoc(collection(db, this.categoriesCollection), { name });
      console.log('✅ Category added:', name);
    } catch (error) {
      console.error('❌ Error adding category:', error);
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