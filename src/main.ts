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
    this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

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
      await shell.openPath(folderPath);
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
  }
}

// Create the app instance
new ReceiptSorterApp(); 