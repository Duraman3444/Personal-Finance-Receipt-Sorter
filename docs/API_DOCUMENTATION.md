# API Documentation

## Overview

The Personal Finance Receipt Sorter integrates with multiple APIs and services to provide seamless receipt processing. This document covers all API integrations, data schemas, and internal service interfaces.

## External API Integrations

### 1. OpenAI API Integration

#### Configuration
```typescript
const openaiConfig = {
  apiKey: process.env.OPENAI_KEY,
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  maxTokens: 1000,
  temperature: 0.1
};
```

#### Receipt Parsing Endpoint

**Endpoint**: `POST https://api.openai.com/v1/chat/completions`

**Request Format**:
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "You are a receipt parsing assistant. Extract key information from receipt text and return it in the specified JSON format."
    },
    {
      "role": "user", 
      "content": "Extract the following fields from this receipt OCR text:\n\n{OCR_TEXT}"
    }
  ],
  "functions": [
    {
      "name": "parse_receipt",
      "description": "Return key data from a purchase receipt",
      "parameters": {
        "type": "object",
        "properties": {
          "vendor": {
            "type": "string",
            "description": "The store or vendor name"
          },
          "date": {
            "type": "string",
            "format": "date",
            "description": "Purchase date in YYYY-MM-DD format"
          },
          "total": {
            "type": "number",
            "description": "Total amount paid"
          },
          "tax": {
            "type": "number",
            "description": "Tax amount"
          },
          "currency": {
            "type": "string",
            "default": "USD",
            "description": "Currency code"
          },
          "payment_method": {
            "type": "string",
            "description": "Payment method used"
          },
          "category": {
            "type": "string",
            "enum": ["Groceries", "Dining", "Travel", "Utilities", "Shopping", "Gas", "Healthcare", "Entertainment", "Other"],
            "description": "Spending category"
          },
          "items": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": {"type": "string"},
                "price": {"type": "number"},
                "quantity": {"type": "number"}
              }
            }
          }
        },
        "required": ["vendor", "date", "total", "category"]
      }
    }
  ],
  "function_call": {"name": "parse_receipt"}
}
```

**Response Format**:
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "function_call": {
          "name": "parse_receipt",
          "arguments": "{\"vendor\":\"Walmart Supercenter\",\"date\":\"2024-06-30\",\"total\":10.21,\"tax\":0.76,\"currency\":\"USD\",\"payment_method\":\"Visa ending in 1234\",\"category\":\"Groceries\",\"items\":[{\"name\":\"Great Value Milk 1GAL\",\"price\":3.98,\"quantity\":1}]}"
        }
      }
    }
  ],
  "usage": {
    "prompt_tokens": 250,
    "completion_tokens": 75,
    "total_tokens": 325
  }
}
```

**Error Handling**:
```typescript
interface OpenAIError {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

// Common error codes:
// - insufficient_quota: API quota exceeded
// - invalid_request_error: Malformed request
// - rate_limit_exceeded: Too many requests
// - server_error: OpenAI service unavailable
```

**Rate Limiting**:
- **Requests per minute**: 3,500
- **Tokens per minute**: 90,000
- **Requests per day**: 10,000

### 2. Firebase Firestore API

#### Configuration
```typescript
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  // Development emulator
  host: process.env.NODE_ENV === 'development' ? 'localhost' : undefined,
  port: process.env.NODE_ENV === 'development' ? 8080 : undefined,
  ssl: process.env.NODE_ENV !== 'development'
};
```

#### Collections Schema

**Receipts Collection**: `/receipts/{receiptId}`
```typescript
interface Receipt {
  id: string;
  vendor: string;
  date: string; // ISO 8601
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata: {
    fileSize: number;
    fileType: string;
    processingTime: number;
  };
}
```

**Categories Collection**: `/categories/{categoryId}`
```typescript
interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  parentId?: string;
  isDefault: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  stats: {
    totalAmount: number;
    receiptCount: number;
    lastUsed: Timestamp;
  };
}
```

**Settings Collection**: `/settings/user`
```typescript
interface UserSettings {
  inboxPath: string;
  autoProcess: boolean;
  notifications: boolean;
  theme: 'light' | 'dark' | 'system';
  privacy: {
    dataRetention: number; // days
    exportFormat: 'csv' | 'json';
    analyticsEnabled: boolean;
  };
  api: {
    openaiKeySet: boolean; // Never store actual key
    usageThisMonth: number;
  };
}
```

#### Firestore Operations

**Create Receipt**:
```typescript
const createReceipt = async (receiptData: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docRef = await addDoc(collection(db, 'receipts'), {
    ...receiptData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};
```

**Query Receipts**:
```typescript
// Get receipts by date range
const getReceiptsByDateRange = async (startDate: string, endDate: string) => {
  const q = query(
    collection(db, 'receipts'),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'desc')
  );
  return await getDocs(q);
};

// Get receipts by category
const getReceiptsByCategory = async (category: string) => {
  const q = query(
    collection(db, 'receipts'),
    where('category', '==', category),
    orderBy('date', 'desc')
  );
  return await getDocs(q);
};
```

**Security Rules**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Receipts - user can read/write their own data
    match /receipts/{receiptId} {
      allow read, write: if request.auth != null;
    }
    
    // Categories - user can read/write their own categories
    match /categories/{categoryId} {
      allow read, write: if request.auth != null;
    }
    
    // Settings - user can read/write their own settings
    match /settings/user {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Internal APIs

### 1. Electron IPC API

#### Main Process → Renderer Process

**Receipt Processing Events**:
```typescript
// Receipt processing started
ipcRenderer.on('receipt-processing-started', (event, filePath: string) => {
  // Update UI to show processing state
});

// Receipt processing completed
ipcRenderer.on('receipt-processed', (event, receipt: Receipt) => {
  // Add receipt to UI
});

// Receipt processing failed
ipcRenderer.on('receipt-processing-failed', (event, error: ProcessingError) => {
  // Show error message to user
});
```

#### Renderer Process → Main Process

**File Operations**:
```typescript
// Open folder
const openFolder = async (folderPath: string): Promise<void> => {
  return await ipcRenderer.invoke('open-folder', folderPath);
};

// Get app version
const getAppVersion = async (): Promise<string> => {
  return await ipcRenderer.invoke('get-app-version');
};

// Process receipt manually
const processReceipt = async (filePath: string): Promise<Receipt> => {
  return await ipcRenderer.invoke('process-receipt', filePath);
};
```

**Data Operations**:
```typescript
// Get receipts
const getReceipts = async (filters?: ReceiptFilters): Promise<Receipt[]> => {
  return await ipcRenderer.invoke('get-receipts', filters);
};

// Update receipt
const updateReceipt = async (receiptId: string, updates: Partial<Receipt>): Promise<void> => {
  return await ipcRenderer.invoke('update-receipt', receiptId, updates);
};

// Delete receipt
const deleteReceipt = async (receiptId: string): Promise<void> => {
  return await ipcRenderer.invoke('delete-receipt', receiptId);
};
```

### 2. N8N Webhook API

#### Receipt Processing Webhook

**Endpoint**: `POST http://localhost:3001/webhook/receipt-processed`

**Request Body**:
```json
{
  "receiptId": "string",
  "status": "success" | "error",
  "data": {
    "vendor": "string",
    "date": "string",
    "total": "number",
    "category": "string"
  },
  "error": {
    "message": "string",
    "code": "string"
  },
  "metadata": {
    "processingTime": "number",
    "confidence": "number"
  }
}
```

**Response**:
```json
{
  "success": true,
  "receiptId": "string"
}
```

#### File Processing Status Webhook

**Endpoint**: `POST http://localhost:3001/webhook/file-status`

**Request Body**:
```json
{
  "filePath": "string",
  "status": "detected" | "processing" | "completed" | "failed",
  "timestamp": "string",
  "metadata": {
    "fileSize": "number",
    "fileType": "string"
  }
}
```

### 3. OCR Service API

#### Local OCR Processing

**Tesseract Integration**:
```typescript
interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
}

const extractTextFromImage = async (imagePath: string): Promise<OCRResult> => {
  // Implementation using tesseract.js or system tesseract
};
```

**PDF OCR Integration**:
```typescript
const extractTextFromPDF = async (pdfPath: string): Promise<string> => {
  // Implementation using ocrmypdf or pdf-parse
};
```

## Error Handling

### Standard Error Response Format

```typescript
interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

// Error codes:
const ErrorCodes = {
  // OpenAI errors
  OPENAI_QUOTA_EXCEEDED: 'OPENAI_QUOTA_EXCEEDED',
  OPENAI_RATE_LIMITED: 'OPENAI_RATE_LIMITED',
  OPENAI_INVALID_REQUEST: 'OPENAI_INVALID_REQUEST',
  
  // Firebase errors
  FIREBASE_OFFLINE: 'FIREBASE_OFFLINE',
  FIREBASE_PERMISSION_DENIED: 'FIREBASE_PERMISSION_DENIED',
  FIREBASE_NOT_FOUND: 'FIREBASE_NOT_FOUND',
  
  // Processing errors
  OCR_FAILED: 'OCR_FAILED',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  
  // System errors
  INSUFFICIENT_STORAGE: 'INSUFFICIENT_STORAGE',
  NETWORK_ERROR: 'NETWORK_ERROR'
};
```

### Retry Strategies

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const retryConfigs = {
  openai: { maxRetries: 3, baseDelay: 1000, maxDelay: 10000, backoffMultiplier: 2 },
  firebase: { maxRetries: 5, baseDelay: 500, maxDelay: 5000, backoffMultiplier: 1.5 },
  ocr: { maxRetries: 2, baseDelay: 2000, maxDelay: 8000, backoffMultiplier: 2 }
};
```

## Performance Considerations

### API Rate Limiting

**OpenAI**:
- Implement exponential backoff
- Cache responses for identical OCR text
- Batch similar requests when possible

**Firebase**:
- Use offline persistence
- Implement optimistic updates
- Batch write operations

### Caching Strategy

```typescript
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache entries
  strategy: 'LRU' | 'LFU' | 'FIFO';
}

const cacheConfigs = {
  ocrResults: { ttl: 24 * 60 * 60 * 1000, maxSize: 1000, strategy: 'LRU' },
  aiParseResults: { ttl: 7 * 24 * 60 * 60 * 1000, maxSize: 500, strategy: 'LRU' },
  receiptQueries: { ttl: 5 * 60 * 1000, maxSize: 100, strategy: 'LFU' }
};
```

## Security

### API Key Management

```typescript
// Never store API keys in code or config files
// Use secure storage (keytar) for API keys
import * as keytar from 'keytar';

const storeApiKey = async (service: string, key: string) => {
  await keytar.setPassword('receipt-sorter', service, key);
};

const getApiKey = async (service: string) => {
  return await keytar.getPassword('receipt-sorter', service);
};
```

### Request Validation

```typescript
// Validate all API requests
const validateReceiptData = (data: any): Receipt => {
  const schema = Joi.object({
    vendor: Joi.string().required().max(100),
    date: Joi.string().isoDate().required(),
    total: Joi.number().positive().required(),
    category: Joi.string().valid(...validCategories).required()
  });
  
  const { error, value } = schema.validate(data);
  if (error) throw new ValidationError(error.message);
  return value;
};
```

## Testing

### API Testing

```typescript
// Mock OpenAI responses for testing
const mockOpenAIResponse = {
  choices: [{
    message: {
      function_call: {
        arguments: JSON.stringify({
          vendor: "Test Store",
          date: "2024-01-01",
          total: 10.00,
          category: "Groceries"
        })
      }
    }
  }]
};

// Test Firebase operations with emulator
const setupFirebaseEmulator = () => {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
};
```

This API documentation provides comprehensive coverage of all external and internal APIs used in the Personal Finance Receipt Sorter application. 