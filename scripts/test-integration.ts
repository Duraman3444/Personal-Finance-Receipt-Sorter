#!/usr/bin/env node

/**
 * Integration Test Script for Personal Finance Receipt Sorter
 * Tests the complete n8n workflow integration
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

const execAsync = promisify(exec);

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration?: number;
}

class IntegrationTester {
  private results: TestResult[] = [];
  
  constructor() {
    console.log('🧪 Personal Finance Receipt Sorter - Integration Test');
    console.log('=' .repeat(60));
  }

  private async checkPort(port: number, service: string): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.request({
        hostname: 'localhost',
        port: port,
        path: '/',
        method: 'GET',
        timeout: 2000
      }, (res) => {
        resolve(true);
      });

      req.on('error', () => {
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  private async testN8nInstallation(): Promise<TestResult> {
    const start = Date.now();
    
    try {
      const { stdout } = await execAsync('npx n8n --version');
      const version = stdout.trim();
      
      return {
        name: 'N8N Installation',
        status: 'PASS',
        message: `n8n version ${version} installed`,
        duration: Date.now() - start
      };
    } catch (error) {
      return {
        name: 'N8N Installation',
        status: 'FAIL',
        message: `n8n not installed: ${error}`,
        duration: Date.now() - start
      };
    }
  }

  private async testN8nRunning(): Promise<TestResult> {
    const start = Date.now();
    
    const isRunning = await this.checkPort(5678, 'n8n');
    
    if (isRunning) {
      return {
        name: 'N8N Service',
        status: 'PASS',
        message: 'n8n is running on localhost:5678',
        duration: Date.now() - start
      };
    } else {
      return {
        name: 'N8N Service',
        status: 'FAIL',
        message: 'n8n is not running on localhost:5678',
        duration: Date.now() - start
      };
    }
  }

  private async testWebhookServer(): Promise<TestResult> {
    const start = Date.now();
    
    const isRunning = await this.checkPort(3001, 'webhook');
    
    if (isRunning) {
      return {
        name: 'Webhook Server',
        status: 'PASS',
        message: 'Webhook server is running on localhost:3001',
        duration: Date.now() - start
      };
    } else {
      return {
        name: 'Webhook Server',
        status: 'FAIL',
        message: 'Webhook server is not running on localhost:3001',
        duration: Date.now() - start
      };
    }
  }

  private async testWorkflowFiles(): Promise<TestResult> {
    const start = Date.now();
    
    try {
      const workflowDir = path.join(process.cwd(), 'workflows');
      const workflowFiles = [
        'receipt-processing-simple.json',
        'receipt-processing-workflow-windows.json',
        'receipt-processing-workflow.json',
        'receipt-processing-complete.json'
      ];
      
      const missingFiles: string[] = [];
      
      for (const file of workflowFiles) {
        const filePath = path.join(workflowDir, file);
        if (!fs.existsSync(filePath)) {
          missingFiles.push(file);
        }
      }
      
      if (missingFiles.length === 0) {
        return {
          name: 'Workflow Files',
          status: 'PASS',
          message: `All ${workflowFiles.length} workflow files present`,
          duration: Date.now() - start
        };
      } else {
        return {
          name: 'Workflow Files',
          status: 'FAIL',
          message: `Missing files: ${missingFiles.join(', ')}`,
          duration: Date.now() - start
        };
      }
    } catch (error) {
      return {
        name: 'Workflow Files',
        status: 'FAIL',
        message: `Error checking workflow files: ${error}`,
        duration: Date.now() - start
      };
    }
  }

  private async testOCRTools(): Promise<TestResult> {
    const start = Date.now();
    
    try {
      // Test Tesseract
      const { stdout: tesseractVersion } = await execAsync('tesseract --version');
      
      // Test OCRmyPDF
      const { stdout: ocrmypdfVersion } = await execAsync('python -m ocrmypdf --version');
      
      return {
        name: 'OCR Tools',
        status: 'PASS',
        message: 'Tesseract and OCRmyPDF both available',
        duration: Date.now() - start
      };
    } catch (error) {
      return {
        name: 'OCR Tools',
        status: 'FAIL',
        message: `OCR tools not available: ${error}`,
        duration: Date.now() - start
      };
    }
  }

  private async testInboxDirectory(): Promise<TestResult> {
    const start = Date.now();
    
    try {
      const inboxPath = path.join(process.cwd(), 'inbox');
      
      if (!fs.existsSync(inboxPath)) {
        fs.mkdirSync(inboxPath, { recursive: true });
      }
      
      const stats = fs.statSync(inboxPath);
      
      if (stats.isDirectory()) {
        return {
          name: 'Inbox Directory',
          status: 'PASS',
          message: 'Inbox directory exists and is writable',
          duration: Date.now() - start
        };
      } else {
        return {
          name: 'Inbox Directory',
          status: 'FAIL',
          message: 'Inbox path exists but is not a directory',
          duration: Date.now() - start
        };
      }
    } catch (error) {
      return {
        name: 'Inbox Directory',
        status: 'FAIL',
        message: `Cannot access inbox directory: ${error}`,
        duration: Date.now() - start
      };
    }
  }

  private async testEnvironmentVariables(): Promise<TestResult> {
    const start = Date.now();
    
    const requiredVars = ['OPENAI_KEY'];
    const missingVars: string[] = [];
    
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }
    
    if (missingVars.length === 0) {
      return {
        name: 'Environment Variables',
        status: 'PASS',
        message: 'All required environment variables present',
        duration: Date.now() - start
      };
    } else {
      return {
        name: 'Environment Variables',
        status: 'FAIL',
        message: `Missing variables: ${missingVars.join(', ')}`,
        duration: Date.now() - start
      };
    }
  }

  public async runAllTests(): Promise<void> {
    console.log('Running integration tests...\n');
    
    const tests = [
      () => this.testN8nInstallation(),
      () => this.testN8nRunning(),
      () => this.testWebhookServer(),
      () => this.testWorkflowFiles(),
      () => this.testOCRTools(),
      () => this.testInboxDirectory(),
      () => this.testEnvironmentVariables()
    ];
    
    for (const test of tests) {
      const result = await test();
      this.results.push(result);
      
      const status = result.status === 'PASS' ? '✅' : '❌';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      
      console.log(`${status} ${result.name}: ${result.message}${duration}`);
    }
    
    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n' + '=' .repeat(60));
    console.log('TEST SUMMARY');
    console.log('=' .repeat(60));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📊 Total: ${this.results.length}`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed! N8N integration is ready to use.');
      console.log('\nNext steps:');
      console.log('1. Run: npm run workflow (starts webhook + n8n)');
      console.log('2. Import workflow from workflows/ folder');
      console.log('3. Configure OpenAI credentials in n8n');
      console.log('4. Drop a test receipt in the inbox folder');
    } else {
      console.log('\n⚠️  Some tests failed. Please fix the issues above.');
      console.log('\nTroubleshooting:');
      console.log('- Ensure n8n and webhook server are running');
      console.log('- Check that OCR tools are installed');
      console.log('- Verify environment variables are set');
    }
  }
}

// Run the tests
const tester = new IntegrationTester();
tester.runAllTests().catch(console.error); 