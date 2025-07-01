# Testing Strategy

## Overview

The Personal Finance Receipt Sorter requires comprehensive testing to ensure reliability, accuracy, and user satisfaction. This document outlines our multi-layered testing approach covering unit tests, integration tests, end-to-end tests, and performance validation.

## Testing Pyramid

```
                    /\
                   /  \
                  /    \
                 / E2E  \
                /  Tests \
               /__________\
              /            \
             /  Integration  \
            /     Tests      \
           /________________\
          /                  \
         /    Unit Tests      \
        /____________________\
```

### Testing Levels

1. **Unit Tests (70%)** - Fast, isolated component testing
2. **Integration Tests (20%)** - Service interaction validation
3. **End-to-End Tests (10%)** - Complete user workflow validation

## Unit Testing

### Testing Framework Setup

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts' // Exclude Electron main process from coverage
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
```

### Core Component Tests

#### 1. Receipt Parsing Service Tests

```typescript
// tests/services/aiParsingService.test.ts
import { AIParsingService } from '../../src/services/aiParsingService';
import { OpenAI } from 'openai';

jest.mock('openai');

describe('AIParsingService', () => {
  let service: AIParsingService;
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    mockOpenAI = new OpenAI() as jest.Mocked<OpenAI>;
    service = new AIParsingService(mockOpenAI);
  });

  describe('parseReceipt', () => {
    it('should parse valid receipt text correctly', async () => {
      // Arrange
      const ocrText = 'WALMART SUPERCENTER\nTOTAL $10.21\n06/30/2024';
      const expectedResponse = {
        vendor: 'Walmart Supercenter',
        date: '2024-06-30',
        total: 10.21,
        category: 'Groceries'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            function_call: {
              arguments: JSON.stringify(expectedResponse)
            }
          }
        }]
      } as any);

      // Act
      const result = await service.parseReceipt(ocrText);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: expect.stringContaining(ocrText) })
          ])
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const ocrText = 'Invalid receipt text';
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      // Act & Assert
      await expect(service.parseReceipt(ocrText)).rejects.toThrow('API rate limit exceeded');
    });

    it('should cache identical requests', async () => {
      // Arrange
      const ocrText = 'WALMART SUPERCENTER\nTOTAL $10.21';
      const response = { vendor: 'Walmart', total: 10.21 };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { function_call: { arguments: JSON.stringify(response) } } }]
      } as any);

      // Act
      await service.parseReceipt(ocrText);
      await service.parseReceipt(ocrText); // Second call should use cache

      // Assert
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    });
  });
});
```

#### 2. File Watcher Service Tests

```typescript
// tests/services/fileWatcher.test.ts
import { FileWatcher } from '../../src/services/fileWatcher';
import * as chokidar from 'chokidar';
import { EventEmitter } from 'events';

jest.mock('chokidar');

describe('FileWatcher', () => {
  let fileWatcher: FileWatcher;
  let mockWatcher: EventEmitter;

  beforeEach(() => {
    mockWatcher = new EventEmitter();
    (chokidar.watch as jest.Mock).mockReturnValue(mockWatcher);
    fileWatcher = new FileWatcher('/test/inbox');
  });

  it('should detect new receipt files', (done) => {
    // Arrange
    const testFilePath = '/test/inbox/receipt.jpg';
    
    fileWatcher.on('fileAdded', (filePath) => {
      // Assert
      expect(filePath).toBe(testFilePath);
      done();
    });

    // Act
    fileWatcher.startWatching();
    mockWatcher.emit('add', testFilePath);
  });

  it('should ignore non-receipt file types', () => {
    // Arrange
    const mockCallback = jest.fn();
    fileWatcher.on('fileAdded', mockCallback);

    // Act
    fileWatcher.startWatching();
    mockWatcher.emit('add', '/test/inbox/document.txt');

    // Assert
    expect(mockCallback).not.toHaveBeenCalled();
  });
});
```

#### 3. Firebase Service Tests

```typescript
// tests/services/firestoreService.test.ts
import { FirestoreService } from '../../src/services/firestoreService';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('FirestoreService', () => {
  let testEnv: any;
  let service: FirestoreService;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'test-project',
      rules: /* Firestore rules */
    });
  });

  beforeEach(() => {
    service = new FirestoreService(testEnv.authenticatedContext('test-user').firestore());
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
  });

  it('should save receipt data correctly', async () => {
    // Arrange
    const receiptData = {
      vendor: 'Test Store',
      date: '2024-06-30',
      total: 10.21,
      category: 'Groceries'
    };

    // Act
    const receiptId = await service.saveReceipt(receiptData);

    // Assert
    expect(receiptId).toBeDefined();
    const saved = await service.getReceipt(receiptId);
    expect(saved).toMatchObject(receiptData);
  });
});
```

### Test Coverage Requirements

| Component | Minimum Coverage | Priority |
|-----------|------------------|----------|
| AI Parsing Service | 90% | High |
| File Processing | 85% | High |
| Data Services | 80% | High |
| UI Components | 75% | Medium |
| Utilities | 70% | Medium |

## Integration Testing

### Service Integration Tests

#### 1. End-to-End Receipt Processing

```typescript
// tests/integration/receiptProcessing.test.ts
import { ProcessingEngine } from '../../src/services/processEngine';
import { setupTestEnvironment } from '../helpers/testSetup';

describe('Receipt Processing Integration', () => {
  let processingEngine: ProcessingEngine;
  let testEnv: any;

  beforeAll(async () => {
    testEnv = await setupTestEnvironment();
    processingEngine = new ProcessingEngine(testEnv.services);
  });

  it('should process receipt from file to database', async () => {
    // Arrange
    const testReceiptPath = './tests/fixtures/walmart-receipt.jpg';

    // Act
    const result = await processingEngine.processReceipt(testReceiptPath);

    // Assert
    expect(result.status).toBe('completed');
    expect(result.data.vendor).toContain('Walmart');
    expect(result.data.total).toBeGreaterThan(0);
    expect(result.data.category).toBeDefined();

    // Verify data was saved
    const saved = await testEnv.services.firestore.getReceipt(result.receiptId);
    expect(saved).toBeDefined();
  });

  it('should handle OCR failures gracefully', async () => {
    // Arrange
    const corruptedImagePath = './tests/fixtures/corrupted-image.jpg';

    // Act
    const result = await processingEngine.processReceipt(corruptedImagePath);

    // Assert
    expect(result.status).toBe('error');
    expect(result.error.code).toBe('OCR_FAILED');
  });
});
```

#### 2. N8N Workflow Integration

```typescript
// tests/integration/n8nWorkflow.test.ts
import { N8NWebhookServer } from '../../src/services/webhookServer';
import axios from 'axios';

describe('N8N Workflow Integration', () => {
  let webhookServer: N8NWebhookServer;

  beforeAll(async () => {
    webhookServer = new N8NWebhookServer();
    await webhookServer.start();
  });

  afterAll(async () => {
    await webhookServer.stop();
  });

  it('should receive and process webhook from N8N', async () => {
    // Arrange
    const webhookData = {
      receiptId: 'test-receipt-123',
      status: 'success',
      data: {
        vendor: 'Test Store',
        total: 25.99,
        category: 'Dining'
      }
    };

    // Act
    const response = await axios.post(
      'http://localhost:3001/webhook/receipt-processed',
      webhookData
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });
});
```

### Database Integration Tests

```typescript
// tests/integration/database.test.ts
describe('Database Operations', () => {
  it('should handle concurrent receipt saves', async () => {
    // Test concurrent operations
    const receipts = Array.from({ length: 10 }, (_, i) => ({
      vendor: `Store ${i}`,
      total: i * 10,
      category: 'Test'
    }));

    const promises = receipts.map(receipt => 
      firestoreService.saveReceipt(receipt)
    );

    const results = await Promise.all(promises);
    expect(results).toHaveLength(10);
    expect(results.every(id => typeof id === 'string')).toBe(true);
  });

  it('should maintain data consistency during offline/online transitions', async () => {
    // Test offline persistence and sync
  });
});
```

## End-to-End Testing

### Electron Application E2E Tests

```typescript
// tests/e2e/application.test.ts
import { Application } from 'spectron';
import { resolve } from 'path';

describe('Receipt Sorter Application E2E', () => {
  let app: Application;

  beforeEach(async () => {
    app = new Application({
      path: resolve(__dirname, '../../dist/main.js'),
      args: ['--test-mode']
    });
    await app.start();
  });

  afterEach(async () => {
    if (app && app.isRunning()) {
      await app.stop();
    }
  });

  it('should launch application successfully', async () => {
    // Assert
    expect(await app.client.getWindowCount()).toBe(1);
    expect(await app.client.getTitle()).toBe('Personal Finance Receipt Sorter');
  });

  it('should process receipt through complete workflow', async () => {
    // Arrange
    const testReceiptPath = resolve(__dirname, '../fixtures/sample-receipt.pdf');

    // Act - Drop file into inbox
    await app.client.dragAndDrop(
      '#inbox-drop-zone',
      testReceiptPath
    );

    // Wait for processing
    await app.client.waitForExist('#receipt-list .receipt-item', 10000);

    // Assert
    const receiptItems = await app.client.$$('#receipt-list .receipt-item');
    expect(receiptItems.length).toBeGreaterThan(0);

    const firstReceipt = await receiptItems[0];
    const vendor = await firstReceipt.$('.vendor-name').getText();
    expect(vendor).toBeDefined();
  });

  it('should navigate between different views', async () => {
    // Act
    await app.client.click('[data-page="receipts"]');
    await app.client.waitForExist('#receipts-page');

    // Assert
    expect(await app.client.isDisplayed('#receipts-page')).toBe(true);

    // Act
    await app.client.click('[data-page="analytics"]');
    await app.client.waitForExist('#analytics-page');

    // Assert
    expect(await app.client.isDisplayed('#analytics-page')).toBe(true);
  });
});
```

### User Journey Tests

```typescript
// tests/e2e/userJourneys.test.ts
describe('User Journey Tests', () => {
  it('should complete first-time user setup', async () => {
    // 1. Launch app for first time
    // 2. Configure API key
    // 3. Set inbox folder
    // 4. Process first receipt
    // 5. View results
  });

  it('should handle bulk receipt processing', async () => {
    // 1. Drop multiple receipts
    // 2. Monitor processing progress
    // 3. Verify all receipts processed
    // 4. Check categorization accuracy
  });

  it('should export data successfully', async () => {
    // 1. Navigate to settings
    // 2. Click export data
    // 3. Verify CSV file created
    // 4. Validate export content
  });
});
```

## Performance Testing

### Load Testing

```typescript
// tests/performance/loadTesting.test.ts
describe('Performance Tests', () => {
  it('should handle 100 receipts within 5 minutes', async () => {
    const startTime = Date.now();
    const receiptPaths = generateTestReceiptPaths(100);

    const results = await Promise.all(
      receiptPaths.map(path => processingEngine.processReceipt(path))
    );

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    expect(processingTime).toBeLessThan(5 * 60 * 1000); // 5 minutes
    expect(results.filter(r => r.status === 'completed').length).toBeGreaterThan(95);
  });

  it('should maintain UI responsiveness during processing', async () => {
    // Test UI performance during heavy processing
    const uiResponseTimes: number[] = [];

    // Start heavy processing
    const processingPromise = processLargeReceiptBatch();

    // Measure UI response times
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      await app.client.click('#dashboard-nav');
      await app.client.waitForExist('#dashboard-page');
      const end = performance.now();
      uiResponseTimes.push(end - start);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await processingPromise;

    // Assert UI remained responsive
    const averageResponseTime = uiResponseTimes.reduce((a, b) => a + b) / uiResponseTimes.length;
    expect(averageResponseTime).toBeLessThan(100); // 100ms max
  });
});
```

### Memory and Resource Testing

```typescript
// tests/performance/resourceUsage.test.ts
describe('Resource Usage Tests', () => {
  it('should not exceed memory limits', async () => {
    const initialMemory = process.memoryUsage();

    // Process many receipts
    await processReceiptBatch(1000);

    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

    // Should not increase by more than 200MB
    expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024);
  });

  it('should clean up resources properly', async () => {
    // Test for memory leaks and proper cleanup
  });
});
```

## User Acceptance Testing

### UAT Test Cases

#### 1. Functional Test Cases

| Test Case | Description | Expected Result | Priority |
|-----------|-------------|-----------------|----------|
| UC001 | Process grocery receipt | Vendor, amount, category extracted correctly | High |
| UC002 | Process restaurant receipt | Dining category assigned automatically | High |
| UC003 | Process gas station receipt | Gas category and fuel items identified | High |
| UC004 | Handle poor quality image | Error message with improvement suggestions | Medium |
| UC005 | Export monthly data | CSV file with all receipts from month | Medium |

#### 2. Usability Test Cases

```typescript
// tests/usability/userTasks.test.ts
describe('Usability Tests', () => {
  const testUsers = [
    { profile: 'tech-savvy', experience: 'high' },
    { profile: 'average-user', experience: 'medium' },
    { profile: 'non-technical', experience: 'low' }
  ];

  testUsers.forEach(user => {
    describe(`${user.profile} user tests`, () => {
      it('should complete first receipt processing within 2 minutes', async () => {
        const startTime = Date.now();
        
        // Simulate user actions
        await simulateUserFlow(user, 'process-first-receipt');
        
        const completionTime = Date.now() - startTime;
        expect(completionTime).toBeLessThan(2 * 60 * 1000);
      });

      it('should find and edit receipt within 30 seconds', async () => {
        // Test receipt search and edit functionality
      });
    });
  });
});
```

### Accessibility Testing

```typescript
// tests/accessibility/a11y.test.ts
import { AxePuppeteer } from '@axe-core/puppeteer';

describe('Accessibility Tests', () => {
  it('should meet WCAG 2.1 AA standards', async () => {
    const results = await new AxePuppeteer(page).analyze();
    expect(results.violations).toHaveLength(0);
  });

  it('should be keyboard navigable', async () => {
    // Test all functionality via keyboard only
    await page.keyboard.press('Tab');
    // ... test keyboard navigation
  });

  it('should work with screen readers', async () => {
    // Test screen reader compatibility
  });
});
```

## Test Data Management

### Test Fixtures

```typescript
// tests/fixtures/receiptFixtures.ts
export const receiptFixtures = {
  walmart: {
    imagePath: './fixtures/walmart-receipt.jpg',
    expectedData: {
      vendor: 'Walmart Supercenter',
      total: 10.21,
      category: 'Groceries',
      items: [
        { name: 'Great Value Milk 1GAL', price: 3.98 }
      ]
    }
  },
  restaurant: {
    imagePath: './fixtures/restaurant-receipt.pdf',
    expectedData: {
      vendor: "Mario's Pizza",
      total: 24.99,
      category: 'Dining'
    }
  },
  gasStation: {
    imagePath: './fixtures/gas-receipt.jpg',
    expectedData: {
      vendor: 'Shell',
      total: 45.67,
      category: 'Gas'
    }
  }
};
```

### Test Environment Setup

```typescript
// tests/helpers/testSetup.ts
export const setupTestEnvironment = async () => {
  // Setup Firebase emulator
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  
  // Setup mock OpenAI
  const mockOpenAI = setupMockOpenAI();
  
  // Setup test file system
  const testInbox = await setupTestInbox();
  
  return {
    services: {
      firestore: new FirestoreService(),
      ai: new AIParsingService(mockOpenAI),
      fileWatcher: new FileWatcher(testInbox)
    },
    cleanup: async () => {
      await cleanupTestEnvironment();
    }
  };
};
```

## Continuous Integration

### Test Pipeline

```yaml
# .github/workflows/test.yml
name: Test Pipeline

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    needs: integration-tests
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm run test:e2e
```

## Test Metrics and Reporting

### Coverage Reports
- **Minimum Coverage**: 80% overall
- **Critical Path Coverage**: 95%
- **Branch Coverage**: 85%

### Performance Benchmarks
- **Receipt Processing**: <30 seconds average
- **UI Response Time**: <100ms
- **Memory Usage**: <200MB peak
- **Startup Time**: <3 seconds

### Quality Gates
- All tests must pass
- Coverage thresholds met
- No critical accessibility violations
- Performance benchmarks satisfied

This comprehensive testing strategy ensures the Personal Finance Receipt Sorter meets high standards for reliability, performance, and user experience. 