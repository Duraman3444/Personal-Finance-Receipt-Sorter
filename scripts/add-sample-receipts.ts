import { addDoc, collection } from 'firebase/firestore';
import { db } from '../src/firebase';

async function seed() {
  const receipts = [
    { vendor: 'Steam', date: '2024-06-28', total: 59.99, tax: 0, currency: 'USD', payment_method: 'Visa', category: 'Games', items:[{name:'Elden Ring',price:59.99}], processed_at: new Date().toISOString() },
    { vendor: 'Netflix', date: '2024-06-27', total: 15.99, tax:0, currency:'USD', payment_method:'Mastercard', category:'Entertainment', items:[{name:'Monthly Subscription',price:15.99}], processed_at:new Date().toISOString()},
    { vendor: 'AMC Theatres', date:'2024-06-26', total: 27.50, tax:2.5, currency:'USD', payment_method:'Amex', category:'Movies', items:[{name:'Movie Tickets',price:25},{name:'Tax',price:2.5}], processed_at:new Date().toISOString()},
    { vendor: 'Chipotle', date:'2024-06-25', total: 11.75, tax:0.95, currency:'USD', payment_method:'Visa', category:'Restaurants', items:[{name:'Burrito',price:9.25},{name:'Drink',price:1.55}], processed_at:new Date().toISOString()},
    { vendor: 'Nintendo eShop', date:'2024-06-24', total: 39.99, tax:0, currency:'USD', payment_method:'Visa', category:'Games', items:[{name:'Mario Kart 8 Deluxe',price:39.99}], processed_at:new Date().toISOString() },
    { vendor: 'Spotify', date:'2024-06-23', total: 9.99, tax:0, currency:'USD', payment_method:'Visa', category:'Entertainment', items:[{name:'Premium Subscription',price:9.99}], processed_at:new Date().toISOString()},
    { vendor: 'Dominos Pizza', date:'2024-06-22', total: 18.45, tax:1.35, currency:'USD', payment_method:'Cash', category:'Restaurants', items:[{name:'Large Pizza',price:15},{name:'Tax',price:1.35},{name:'Delivery',price:2.1}], processed_at:new Date().toISOString()},
  ];

  for (const r of receipts) {
    const docRef = await addDoc(collection(db, 'receipts'), r);
    console.log('Added', docRef.id, r.vendor);
  }
  console.log('Seeding complete');
}

seed().catch(console.error); 