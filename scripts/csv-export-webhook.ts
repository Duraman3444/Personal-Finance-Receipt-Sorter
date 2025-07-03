import express from 'express';
import cors from 'cors';
import { FirebaseService } from '../src/services/firebase-service';

const app = express();
const PORT = process.env.CSV_WEBHOOK_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase service
const firebaseService = new FirebaseService();

// Utility function to format date
function formatDate(dateInput: any): string {
    if (!dateInput) return 'Unknown Date';
    
    let date: Date;
    
    // Handle Firestore Timestamp objects
    if (dateInput && typeof dateInput === 'object' && dateInput.toDate) {
        date = dateInput.toDate();
    } else if (typeof dateInput === 'string') {
        date = new Date(dateInput);
    } else if (dateInput instanceof Date) {
        date = dateInput;
    } else {
        return 'Invalid Date';
    }
    
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Utility function to format currency
function formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount || 0);
}

// Generate CSV from receipts
function generateReceiptsCSV(receipts: any[]): string {
    const headers = ['Date', 'Vendor', 'Amount', 'Currency', 'Category', 'Payment Method', 'Tax', 'Status'];
    const csvContent = [
        headers.join(','),
        ...receipts.map(receipt => [
            formatDate(receipt.date),
            `"${receipt.vendor || 'Unknown'}"`,
            receipt.total || 0,
            receipt.currency || 'USD',
            `"${receipt.category || 'Uncategorized'}"`,
            `"${receipt.payment_method || 'Unknown'}"`,
            receipt.tax || 0,
            receipt.status || 'processed'
        ].join(','))
    ].join('\n');
    
    return csvContent;
}

// Generate summary report
function generateSummaryReport(receipts: any[]): any {
    const totalAmount = receipts.reduce((sum, receipt) => sum + (receipt.total || 0), 0);
    const categoryTotals = receipts.reduce((acc, receipt) => {
        const category = receipt.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + (receipt.total || 0);
        return acc;
    }, {});
    
    const monthlyTotals = receipts.reduce((acc, receipt) => {
        if (receipt.date) {
            let receiptDate: Date;
            
            // Handle Firestore Timestamp objects
            if (receipt.date && typeof receipt.date === 'object' && receipt.date.toDate) {
                receiptDate = receipt.date.toDate();
            } else if (typeof receipt.date === 'string') {
                receiptDate = new Date(receipt.date);
            } else if (receipt.date instanceof Date) {
                receiptDate = receipt.date;
            } else {
                return acc;
            }
            
            if (!isNaN(receiptDate.getTime())) {
                const month = receiptDate.toISOString().substring(0, 7); // YYYY-MM format
                acc[month] = (acc[month] || 0) + (receipt.total || 0);
            }
        }
        return acc;
    }, {});
    
    // Find valid date range
    const validDates = receipts
        .map(r => {
            if (!r.date) return null;
            
            // Handle Firestore Timestamp objects
            if (r.date && typeof r.date === 'object' && r.date.toDate) {
                return r.date.toDate();
            } else if (typeof r.date === 'string') {
                return new Date(r.date);
            } else if (r.date instanceof Date) {
                return r.date;
            }
            return null;
        })
        .filter(date => date && !isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
    
    return {
        report_generated: new Date().toISOString(),
        period: {
            start: validDates.length > 0 ? validDates[0] : 'N/A',
            end: validDates.length > 0 ? validDates[validDates.length - 1] : 'N/A'
        },
        totals: {
            receipts: receipts.length,
            amount: totalAmount,
            average: totalAmount / receipts.length
        },
        by_category: Object.entries(categoryTotals)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => (b.amount as number) - (a.amount as number)),
        by_month: Object.entries(monthlyTotals)
            .map(([month, amount]) => ({ month, amount }))
            .sort((a, b) => b.month.localeCompare(a.month))
    };
}

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Export receipts as CSV
app.post('/export/receipts/csv', async (req, res) => {
    try {
        console.log('📊 CSV Export request received');
        
        const { limit = 1000, period = 'all' } = req.body;
        
        // Get receipts from Firebase
        const receipts = await firebaseService.getReceipts(limit);
        
        if (receipts.length === 0) {
            return res.json({
                success: false,
                message: 'No receipts found to export'
            });
        }
        
        // Filter by period if specified
        let filteredReceipts = receipts;
        if (period !== 'all') {
            const now = new Date();
            const periodStart = new Date();
            
            switch (period) {
                case 'month':
                    periodStart.setMonth(now.getMonth() - 1);
                    break;
                case 'quarter':
                    periodStart.setMonth(now.getMonth() - 3);
                    break;
                case 'year':
                    periodStart.setFullYear(now.getFullYear() - 1);
                    break;
            }
            
            filteredReceipts = receipts.filter(receipt => {
                if (!receipt.date) return false;
                
                let receiptDate: Date;
                
                // Handle Firestore Timestamp objects
                if (receipt.date && typeof receipt.date === 'object' && (receipt.date as any).toDate) {
                    receiptDate = (receipt.date as any).toDate();
                } else if (typeof receipt.date === 'string') {
                    receiptDate = new Date(receipt.date);
                } else if (receipt.date && (receipt.date as any) instanceof Date) {
                    receiptDate = receipt.date as Date;
                } else {
                    return false;
                }
                
                return !isNaN(receiptDate.getTime()) && receiptDate >= periodStart;
            });
        }
        
        // Generate CSV
        const csvContent = generateReceiptsCSV(filteredReceipts);
        
        // Generate summary for email
        const summary = generateSummaryReport(filteredReceipts);
        
        res.json({
            success: true,
            data: {
                csv: csvContent,
                summary: summary,
                filename: `receipts-export-${new Date().toISOString().split('T')[0]}.csv`,
                period: period,
                receipts_count: filteredReceipts.length
            }
        });
        
        console.log(`✅ CSV export completed: ${filteredReceipts.length} receipts`);
        
    } catch (error) {
        console.error('❌ CSV export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export receipts',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Export summary report
app.post('/export/receipts/summary', async (req, res) => {
    try {
        console.log('📊 Summary Export request received');
        
        const { limit = 1000 } = req.body;
        
        // Get receipts from Firebase
        const receipts = await firebaseService.getReceipts(limit);
        
        if (receipts.length === 0) {
            return res.json({
                success: false,
                message: 'No receipts found to export'
            });
        }
        
        // Generate summary
        const summary = generateSummaryReport(receipts);
        
        res.json({
            success: true,
            data: {
                summary: summary,
                filename: `receipts-summary-${new Date().toISOString().split('T')[0]}.json`,
                receipts_count: receipts.length
            }
        });
        
        console.log(`✅ Summary export completed: ${receipts.length} receipts`);
        
    } catch (error) {
        console.error('❌ Summary export error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export summary',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 CSV Export Webhook Server running on port ${PORT}`);
    console.log(`📊 Available endpoints:`);
    console.log(`   POST http://localhost:${PORT}/export/receipts/csv`);
    console.log(`   POST http://localhost:${PORT}/export/receipts/summary`);
    console.log(`   GET  http://localhost:${PORT}/health`);
});

export default app; 