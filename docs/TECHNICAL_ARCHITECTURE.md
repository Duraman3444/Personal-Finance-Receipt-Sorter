# Technical Architecture Document

## System Overview

The Personal Finance Receipt Sorter is a desktop application built using modern web technologies packaged as a native application. The architecture emphasizes privacy, performance, and user experience through local-first design principles.

## Architecture Principles

### 1. Privacy by Design
- **Local Processing**: All sensitive operations happen on the user's machine
- **Minimal Data Transmission**: Only anonymized text data sent to external APIs
- **User Control**: Complete ownership and control of all financial data
- **Transparent Processing**: Clear indication of what data goes where

### 2. Desktop-First Experience
- **Native Integration**: Proper OS integration with file system and notifications
- **Offline Capability**: Core functionality works without internet connection
- **Performance Optimization**: Leverages local computing resources
- **System Integration**: Background processing and tray notifications

### 3. Scalable Architecture
- **Modular Design**: Loosely coupled components for maintainability
- **Event-Driven**: Asynchronous processing for responsive UI
- **Extensible**: Plugin architecture for future enhancements
- **Performance**: Efficient data storage and retrieval patterns

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Electron Main Process          │  Electron Renderer Process    │
│  • Window Management            │  • React UI Components        │
│  • File System Access          │  • State Management           │
│  • System Integration          │  • User Interactions          │
│  • IPC Communication           │  • Data Visualization         │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                       │
├─────────────────────────────────────────────────────────────────┤
│  Receipt Processing Engine      │  Data Management Service      │
│  • File Watching               │  • CRUD Operations             │
│  • OCR Coordination            │  • Data Validation            │
│  • AI Integration              │  • Caching Strategy            │
│  • Workflow Orchestration      │  • Export/Import              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA ACCESS LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  Local Storage              │  External APIs                    │
│  • Firebase Firestore       │  • OpenAI GPT-4o-mini           │
│  • File System              │  • N8N Webhook Endpoints         │
│  • Configuration Store      │  • Future Integrations           │
│  • Cache Management         │                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Electron Main Process

**Responsibilities:**
- Application lifecycle management
- Window creation and management
- File system operations
- System tray integration
- IPC message handling

**Key Modules:**
```typescript
// Main application controller
class ReceiptSorterApp {
  private mainWindow: BrowserWindow;
  private trayIcon: Tray;
  private fileWatcher: FileWatcher;
  private processEngine: ProcessingEngine;
}

// File system watcher
class FileWatcher {
  private watcher: chokidar.FSWatcher;
  private inboxPath: string;
  
  startWatching(): void;
  onFileAdded(filePath: string): void;
  onFileChanged(filePath: string): void;
}

// Processing coordination
class ProcessingEngine {
  private ocrService: OCRService;
  private aiService: AIParsingService;
  private dataService: DataService;
  
  processReceipt(filePath: string): Promise<Receipt>;
}
```

### 2. Electron Renderer Process

**Responsibilities:**
- User interface rendering
- User interaction handling
- Data presentation
- Real-time updates

**React Component Hierarchy:**
```
App
├── Layout
│   ├── Header
│   ├── Sidebar
│   │   ├── Navigation
│   │   └── StatusIndicators
│   └── MainContent
│       ├── Dashboard
│       ├── ReceiptsList
│       ├── ReceiptDetail
│       ├── Categories
│       ├── Analytics
│       └── Settings
└── Modals
    ├── ReceiptDetailModal
    ├── CategoryEditModal
    └── SettingsModal
```

### 3. Processing Pipeline

**N8N Workflow Integration:**
```yaml
Workflow: Receipt Processing Pipeline
Trigger: File Watcher (Folder Monitor)
Nodes:
  1. File Detection
     - Monitor inbox folder
     - Filter supported file types
     - Queue for processing
  
  2. OCR Processing
     - Execute tesseract/ocrmypdf
     - Extract raw text
     - Handle errors gracefully
  
  3. AI Parsing
     - Send text to OpenAI API
     - Parse structured data
     - Validate response format
  
  4. Data Storage
     - Save to Firebase Firestore
     - Update search indexes
     - Trigger UI updates
  
  5. Cleanup
     - Move processed files
     - Update processing status
     - Send notifications
```

## Data Architecture

### 1. Data Models

**Receipt Model:**
```typescript
interface Receipt {
  id: string;
  vendor: string;
  date: string; // ISO 8601 format
  total: number;
  tax?: number;
  currency: string;
  paymentMethod?: string;
  category: string;
  items?: LineItem[];
  originalFilePath: string;
  ocrText: string;
  confidence: number;
  status: 'processing' | 'completed' | 'error';
  createdAt: string;
  updatedAt: string;
  metadata: {
    fileSize: number;
    fileType: string;
    processingTime: number;
  };
}

interface LineItem {
  name: string;
  price: number;
  quantity: number;
}
```

**Category Model:**
```typescript
interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  parentId?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**User Settings Model:**
```typescript
interface UserSettings {
  inboxPath: string;
  autoProcess: boolean;
  notifications: boolean;
  theme: 'light' | 'dark' | 'system';
  apiKeys: {
    openai?: string;
  };
  privacy: {
    dataRetention: number; // days
    exportFormat: 'csv' | 'json';
  };
}
```

### 2. Database Schema (Firestore)

**Collections Structure:**
```
receipts/
  {receiptId}/
    - All receipt fields
    - Indexed on: date, vendor, category, total

categories/
  {categoryId}/
    - Category definition
    - Usage statistics

settings/
  user/
    - User preferences
    - API configurations

analytics/
  monthly/
    {year-month}/
      - Aggregated spending data
      - Category breakdowns
```

### 3. Local Storage Strategy

**Caching Layer:**
- **Memory Cache**: Recently accessed receipts and categories
- **Disk Cache**: OCR results and AI responses
- **Index Cache**: Search indexes for fast filtering

**Offline Support:**
- **Local Queue**: Pending operations when offline
- **Sync Strategy**: Merge conflicts resolution
- **Data Consistency**: Eventual consistency model

## Integration Architecture

### 1. OpenAI API Integration

**Service Architecture:**
```typescript
class AIParsingService {
  private client: OpenAI;
  private rateLimiter: RateLimiter;
  private cache: LRUCache<string, ParsedReceipt>;
  
  async parseReceipt(ocrText: string): Promise<ParsedReceipt> {
    // Check cache first
    const cached = this.cache.get(ocrText);
    if (cached) return cached;
    
    // Rate limiting
    await this.rateLimiter.acquire();
    
    // API call with retry logic
    const response = await this.callOpenAI(ocrText);
    
    // Cache result
    this.cache.set(ocrText, response);
    
    return response;
  }
  
  private async callOpenAI(text: string): Promise<ParsedReceipt> {
    const response = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: RECEIPT_PARSING_SYSTEM_PROMPT },
        { role: "user", content: text }
      ],
      functions: [RECEIPT_PARSING_SCHEMA],
      function_call: { name: "parse_receipt" }
    });
    
    return JSON.parse(response.choices[0].message.function_call.arguments);
  }
}
```

**Error Handling Strategy:**
- **Retry Logic**: Exponential backoff for transient failures
- **Fallback Processing**: Local parsing for common receipt formats
- **Graceful Degradation**: Manual entry option when AI fails
- **Cost Management**: Request batching and caching

### 2. Firebase Integration

**Local Emulator Setup:**
```typescript
// Development configuration
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  // Emulator detection
  ...(process.env.NODE_ENV === 'development' && {
    host: 'localhost',
    ssl: false
  })
};

// Firestore service wrapper
class FirestoreService {
  private db: Firestore;
  private isOnline: boolean = true;
  
  constructor() {
    this.db = getFirestore();
    
    // Enable offline persistence
    enablePersistence(this.db);
    
    // Monitor connection status
    this.setupConnectionMonitoring();
  }
  
  async saveReceipt(receipt: Receipt): Promise<void> {
    try {
      await addDoc(collection(this.db, 'receipts'), receipt);
    } catch (error) {
      if (error.code === 'unavailable') {
        // Handle offline scenario
        this.queueForLaterSync(receipt);
      }
      throw error;
    }
  }
}
```

### 3. N8N Workflow Integration

**Webhook Endpoints:**
```typescript
// Express server for N8N webhooks
class WebhookServer {
  private app: Express;
  private port: number = 3001;
  
  setupRoutes(): void {
    // Receipt processing webhook
    this.app.post('/webhook/receipt-processed', (req, res) => {
      const { receiptId, status, data } = req.body;
      this.handleReceiptProcessed(receiptId, status, data);
      res.json({ success: true });
    });
    
    // Error notification webhook
    this.app.post('/webhook/processing-error', (req, res) => {
      const { filePath, error } = req.body;
      this.handleProcessingError(filePath, error);
      res.json({ success: true });
    });
  }
}
```

## Security Architecture

### 1. Data Protection

**Encryption at Rest:**
- **Local Files**: OS-level file system encryption
- **Database**: Firebase encryption by default
- **Sensitive Config**: Encrypted configuration storage

**Encryption in Transit:**
- **API Calls**: HTTPS/TLS for all external communications
- **Local IPC**: Secure context isolation in Electron
- **File Transfers**: No sensitive file transfers

### 2. API Security

**Key Management:**
```typescript
class SecureConfigManager {
  private keytar: typeof import('keytar');
  
  async storeApiKey(service: string, key: string): Promise<void> {
    await this.keytar.setPassword('receipt-sorter', service, key);
  }
  
  async getApiKey(service: string): Promise<string | null> {
    return await this.keytar.getPassword('receipt-sorter', service);
  }
}
```

**Request Validation:**
- **Input Sanitization**: Clean all user inputs
- **Rate Limiting**: Prevent API abuse
- **Request Signing**: Verify webhook authenticity
- **Error Handling**: No sensitive data in error messages

### 3. Privacy Controls

**Data Minimization:**
- **OCR Text Only**: Never send original images to external services
- **Anonymization**: Remove personally identifiable information
- **Retention Limits**: Configurable data retention periods
- **User Control**: Easy data export and deletion

## Performance Architecture

### 1. Processing Optimization

**Asynchronous Processing:**
```typescript
class ProcessingQueue {
  private queue: Queue<ProcessingJob>;
  private workers: Worker[];
  
  async addJob(filePath: string): Promise<void> {
    const job = new ProcessingJob(filePath);
    await this.queue.add(job);
  }
  
  private async processJob(job: ProcessingJob): Promise<void> {
    // OCR processing
    const ocrText = await this.ocrService.extractText(job.filePath);
    
    // AI parsing (with caching)
    const parsedData = await this.aiService.parseReceipt(ocrText);
    
    // Database storage
    await this.dataService.saveReceipt(parsedData);
    
    // UI notification
    this.notifyUI('receipt-processed', parsedData);
  }
}
```

**Caching Strategy:**
- **Multi-level Caching**: Memory, disk, and network caches
- **Smart Invalidation**: Cache invalidation based on data changes
- **Preloading**: Anticipatory loading of likely-needed data
- **Compression**: Efficient storage of cached data

### 2. UI Performance

**React Optimization:**
```typescript
// Virtualized lists for large datasets
const ReceiptsList = React.memo(() => {
  const { receipts, loading } = useReceipts();
  
  return (
    <VirtualizedList
      itemCount={receipts.length}
      itemSize={80}
      renderItem={({ index, style }) => (
        <ReceiptCard 
          key={receipts[index].id}
          receipt={receipts[index]} 
          style={style}
        />
      )}
    />
  );
});

// Debounced search
const useSearchReceipts = (query: string) => {
  const [results, setResults] = useState<Receipt[]>([]);
  
  const debouncedSearch = useMemo(
    () => debounce(async (searchQuery: string) => {
      const results = await searchService.search(searchQuery);
      setResults(results);
    }, 300),
    []
  );
  
  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);
  
  return results;
};
```

### 3. Resource Management

**Memory Management:**
- **Lazy Loading**: Load data only when needed
- **Garbage Collection**: Proper cleanup of resources
- **Memory Monitoring**: Track and alert on memory usage
- **Image Optimization**: Efficient image handling and caching

**CPU Optimization:**
- **Background Processing**: CPU-intensive tasks in background
- **Process Isolation**: Separate processes for heavy operations
- **Thread Pooling**: Efficient use of system threads
- **Batch Processing**: Group similar operations

## Deployment Architecture

### 1. Build System

**Electron Builder Configuration:**
```json
{
  "build": {
    "appId": "com.flowgenius.receipt-sorter",
    "productName": "Personal Finance Receipt Sorter",
    "directories": {
      "output": "dist"
    },
    "files": [
      "build/**/*",
      "node_modules/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icon.png"
    }
  }
}
```

### 2. Distribution Strategy

**Auto-Update System:**
```typescript
import { autoUpdater } from 'electron-updater';

class UpdateManager {
  private updateServer: string = 'https://updates.receiptsorter.app';
  
  setupAutoUpdater(): void {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'flowgenius',
      repo: 'receipt-sorter'
    });
    
    autoUpdater.checkForUpdatesAndNotify();
    
    autoUpdater.on('update-available', (info) => {
      this.notifyUserOfUpdate(info);
    });
  }
}
```

### 3. Configuration Management

**Environment-Specific Settings:**
```typescript
interface EnvironmentConfig {
  firebase: {
    projectId: string;
    useEmulator: boolean;
  };
  openai: {
    baseURL: string;
    model: string;
  };
  features: {
    analytics: boolean;
    errorReporting: boolean;
  };
}

const config: EnvironmentConfig = {
  development: {
    firebase: { projectId: 'dev-project', useEmulator: true },
    openai: { baseURL: 'https://api.openai.com', model: 'gpt-4o-mini' },
    features: { analytics: false, errorReporting: false }
  },
  production: {
    firebase: { projectId: 'prod-project', useEmulator: false },
    openai: { baseURL: 'https://api.openai.com', model: 'gpt-4o-mini' },
    features: { analytics: true, errorReporting: true }
  }
}[process.env.NODE_ENV || 'development'];
```

## Monitoring & Observability

### 1. Error Tracking

**Error Handling System:**
```typescript
class ErrorTracker {
  private sentry: typeof import('@sentry/electron');
  
  setupErrorTracking(): void {
    this.sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      beforeSend: this.sanitizeErrorData
    });
  }
  
  private sanitizeErrorData(event: any): any {
    // Remove sensitive information from error reports
    if (event.extra?.ocrText) {
      event.extra.ocrText = '[REDACTED]';
    }
    return event;
  }
}
```

### 2. Performance Monitoring

**Metrics Collection:**
```typescript
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }
  
  getAverageMetric(name: string): number {
    const values = this.metrics.get(name) || [];
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
```

### 3. User Analytics

**Privacy-Respecting Analytics:**
```typescript
class AnalyticsService {
  private enabled: boolean = false;
  
  trackEvent(event: string, properties: Record<string, any>): void {
    if (!this.enabled || !this.userConsent) return;
    
    // Anonymize and aggregate data
    const anonymizedEvent = this.anonymizeEvent(event, properties);
    this.sendToAnalytics(anonymizedEvent);
  }
  
  private anonymizeEvent(event: string, properties: any): any {
    // Remove all personally identifiable information
    const { vendor, amount, ...safeProperties } = properties;
    return {
      event,
      properties: {
        ...safeProperties,
        hasVendor: !!vendor,
        amountRange: this.getAmountRange(amount)
      }
    };
  }
}
```

This technical architecture provides a comprehensive foundation for building a scalable, secure, and performant desktop application that respects user privacy while delivering powerful receipt processing capabilities. 