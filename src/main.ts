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
  }
}

// Create the app instance
new ReceiptSorterApp(); 