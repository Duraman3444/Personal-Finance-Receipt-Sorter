import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class ReceiptSorterApp {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.initializeApp();
  }

  private initializeApp(): void {
    // Handle app ready
    app.whenReady().then(() => {
      this.createMainWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    // Quit when all windows are closed (except on macOS)
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    this.setupIpcHandlers();
  }

  private createMainWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      title: 'Personal Finance Receipt Sorter',
      icon: path.join(__dirname, '../assets/icon.png'), // We'll add this later
      show: false // Don't show until ready
    });

    // Load the HTML file
    const indexHtml = path.join(app.getAppPath(), 'renderer', 'index.html');
    this.mainWindow.loadFile(indexHtml);
    console.log('Loaded HTML:', indexHtml);

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      // Open DevTools in development
      if (process.env.NODE_ENV === 'development') {
        this.mainWindow?.webContents.openDevTools();
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupIpcHandlers(): void {
    // Handle opening external links
    ipcMain.handle('open-external', async (_, url: string) => {
      await shell.openExternal(url);
    });

    // Handle opening folders
    ipcMain.handle('open-folder', async (_, folderPath: string) => {
      try {
        let resolvedPath = folderPath;
        
        // Handle special case for inbox folder
        if (folderPath === 'inbox') {
          // Use __dirname to get the app directory, then navigate to project root
          const appPath = app.getAppPath();
          resolvedPath = path.join(appPath, 'inbox');
          
          // Check if inbox exists in app path, if not try process.cwd()
          const fs = await import('fs');
          if (!fs.existsSync(resolvedPath)) {
            resolvedPath = path.join(process.cwd(), 'inbox');
          }
          
          // Final fallback - use absolute path construction
          if (!fs.existsSync(resolvedPath)) {
            resolvedPath = path.resolve('./inbox');
          }
        } else if (!path.isAbsolute(folderPath)) {
          resolvedPath = path.resolve(folderPath);
        }
        
        console.log('Opening folder:', resolvedPath);
        await shell.openPath(resolvedPath);
      } catch (error) {
        console.error('Failed to open folder:', error);
        throw error;
      }
    });

    // Handle getting app version
    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });

    // Firebase status check
    ipcMain.handle('firebase-status', async () => {
      try {
        // Import Firebase service
        const { db } = await import('./firebase');
        return { 
          success: true, 
          connected: true,
          emulator: process.env.NODE_ENV === 'development'
        };
      } catch (error) {
        console.error('Firebase status check failed:', error);
        return { 
          success: false, 
          connected: false, 
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    // Firebase test connection
    ipcMain.handle('firebase-test', async () => {
      try {
        const { db } = await import('./firebase');
        const { collection, getDocs } = await import('firebase/firestore');
        
        // Try to read from a test collection
        await getDocs(collection(db, 'test'));
        return { success: true, message: 'Firebase connection successful' };
      } catch (error) {
        console.error('Firebase test failed:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Get Firebase configuration (secure)
    ipcMain.handle('get-firebase-config', () => {
      return {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
      };
    });

    // OpenAI status check
    ipcMain.handle('openai-status', async () => {
      try {
        const hasApiKey = !!process.env.OPENAI_KEY;
        if (!hasApiKey) {
          return { 
            success: false, 
            connected: false, 
            error: 'API key not configured' 
          };
        }

        // Test OpenAI connection by importing and checking the client
        const { OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
        
        return { 
          success: true, 
          connected: true,
          hasApiKey: true
        };
      } catch (error) {
        console.error('OpenAI status check failed:', error);
        return { 
          success: false, 
          connected: false, 
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    // N8N status check
    ipcMain.handle('n8n-status', async () => {
      try {
        // Check if N8N is running on localhost:5678
        const http = await import('http');
        return new Promise((resolve) => {
          const req = http.request({
            hostname: 'localhost',
            port: 5678,
            path: '/',
            method: 'GET',
            timeout: 2000
          }, (res) => {
            // N8N is running if we get ANY response (200, 401, etc.)
            // The main page should return 200, even if REST API requires auth
            resolve({ 
              success: true, 
              connected: true, 
              running: true
            });
          });

          req.on('error', () => {
            resolve({ 
              success: false, 
              connected: false, 
              running: false,
              error: 'N8N not running on localhost:5678'
            });
          });

          req.on('timeout', () => {
            req.destroy();
            resolve({ 
              success: false, 
              connected: false, 
              running: false,
              error: 'Connection timeout'
            });
          });

          req.end();
        });
      } catch (error) {
        return { 
          success: false, 
          connected: false, 
          running: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    // Dialog to choose a folder
    ipcMain.handle('choose-folder', async () => {
      const { dialog } = await import('electron');
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      });
      if (result.canceled || result.filePaths.length === 0) return null;
      return result.filePaths[0];
    });
  }
}

// Create the app instance
new ReceiptSorterApp(); 