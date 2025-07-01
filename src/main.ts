import { app, BrowserWindow, ipcMain, shell, Tray, Menu } from 'electron';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { spawn, ChildProcess } from 'child_process';
import { loadConfig, saveConfig, AppConfig } from './config';

// Load environment variables
dotenv.config();

class ReceiptSorterApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private isQuitting = false;
  private n8nProcess: ChildProcess | null = null;
  private config: AppConfig;

  constructor() {
    this.config = loadConfig();
    this.initializeApp();
  }

  private initializeApp(): void {
    // Handle app ready
    app.whenReady().then(() => {
      this.createMainWindow();
      if (this.config.autoLaunch) {
        this.configureAutoLaunch();
      }
      if (this.config.autoStartN8n) {
        this.ensureN8nRunning();
      }

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

    // Ensure cleanup on quit
    app.on('will-quit', () => this.cleanup());
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

    // Create the system tray after the first window launch
    if (!this.tray) {
      this.createTray();
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      // Open DevTools in development
      if (process.env.NODE_ENV === 'development') {
        this.mainWindow?.webContents.openDevTools();
      }
    });

    // Minimize to tray instead of closing
    this.mainWindow.on('close', (event) => {
      if (process.platform === 'darwin') return; // macOS uses app menu quit
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  /**
   * Create system tray with basic controls (Show / Hide, Quit)
   */
  private createTray() {
    try {
      const iconPath = path.join(__dirname, '../assets/icon.png');
      this.tray = new Tray(iconPath);

      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Show / Hide',
          click: () => {
            if (!this.mainWindow) return;
            if (this.mainWindow.isVisible()) {
              this.mainWindow.hide();
            } else {
              this.mainWindow.show();
              this.mainWindow.focus();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          click: () => {
            this.isQuitting = true;
            app.quit();
          }
        }
      ]);

      this.tray.setToolTip('Personal Finance Receipt Sorter');
      this.tray.setContextMenu(contextMenu);

      this.tray.on('double-click', () => {
        if (this.mainWindow) {
          this.mainWindow.show();
        }
      });
    } catch (error) {
      console.error('Failed to create system tray:', error);
    }
  }

  /**
   * Configure auto-launch at OS login (Windows / macOS). On Linux this is a no-op.
   */
  private configureAutoLaunch() {
    try {
      // Enabled by default; you can expose a setting later.
      const shouldAutoLaunch = true;
      if (process.platform === 'win32' || process.platform === 'darwin') {
        app.setLoginItemSettings({
          openAtLogin: shouldAutoLaunch,
          path: process.execPath
        });
      }
    } catch (error) {
      console.error('Failed to configure auto-launch:', error);
    }
  }

  /**
   * Spawn n8n locally (port 5678) if it is not yet running.
   * Uses `npx n8n start` so a global install is not strictly required.
   */
  private async ensureN8nRunning() {
    try {
      const isRunning = await this.checkPortInUse(5678);
      if (isRunning) return;

      console.log('▶️  Starting local n8n instance on port 5678...');
      const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['n8n', 'start', '--port', '5678'], {
        stdio: 'ignore',
        detached: true
      });

      this.n8nProcess = child;
      child.unref(); // allow it to run independently
    } catch (error) {
      console.error('Failed to start n8n automatically:', error);
    }
  }

  /**
   * Check if a TCP port is already bound.
   */
  private checkPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const net = require('net');
      const tester = net.createServer()
        .once('error', () => resolve(true))
        .once('listening', () => tester.once('close', () => resolve(false)).close())
        .listen(port);
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

    // Preferences handlers
    ipcMain.handle('get-preferences', () => {
      return this.config;
    });
    ipcMain.handle('set-preference', async (_, key: keyof AppConfig, value: any) => {
      (this.config as any)[key] = value;
      saveConfig(this.config);

      if (key === 'autoLaunch') {
        this.configureAutoLaunch();
      }
      if (key === 'autoStartN8n') {
        if (value) {
          this.ensureN8nRunning();
        } else {
          if (this.n8nProcess && !this.n8nProcess.killed && this.n8nProcess.pid) {
            try {
              process.kill(-this.n8nProcess.pid);
              this.n8nProcess = null;
            } catch {}
          }
        }
      }

      // For preferences that don't need side-effects, nothing else to do
      return this.config;
    });

    // Missing env variables handler
    ipcMain.handle('missing-envs', () => {
      const required = ['OPENAI_KEY', 'FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID', 'FIREBASE_STORAGE_BUCKET', 'FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_APP_ID'];
      const missing = required.filter(k => !process.env[k]);
      return missing;
    });
  }

  /**
   * Clean up child processes on quit
   */
  private cleanup() {
    try {
      if (this.n8nProcess && !this.n8nProcess.killed && this.n8nProcess.pid) {
        console.log('🛑 Stopping n8n process...');
        try {
          process.kill(-this.n8nProcess.pid);
        } catch {}
      }
    } catch (err) {
      // ignore if already exited
    }
  }
}

// Create the app instance
new ReceiptSorterApp(); 