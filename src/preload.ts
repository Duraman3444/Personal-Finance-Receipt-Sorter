import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App utilities
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // File system operations
  openFolder: (folderPath: string) => ipcRenderer.invoke('open-folder', folderPath),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  
  // Firebase operations
  firebaseStatus: () => ipcRenderer.invoke('firebase-status'),
  firebaseTest: () => ipcRenderer.invoke('firebase-test'),
  getFirebaseConfig: () => ipcRenderer.invoke('get-firebase-config'),
  
  // Status checks
  openaiStatus: () => ipcRenderer.invoke('openai-status'),
  n8nStatus: () => ipcRenderer.invoke('n8n-status'),
  
  // Folder chooser
  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  
  // Preferences
  getPreferences: () => ipcRenderer.invoke('get-preferences'),
  setPreference: (key: string, value: any) => ipcRenderer.invoke('set-preference', key, value),
  
  // Environment checks
  getMissingEnvs: () => ipcRenderer.invoke('missing-envs'),
  
  // Future: Receipt processing APIs will be added here
  // processReceipt: (filePath: string) => ipcRenderer.invoke('process-receipt', filePath),
  // getReceipts: () => ipcRenderer.invoke('get-receipts'),
  // deleteReceipt: (id: string) => ipcRenderer.invoke('delete-receipt', id),
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      openFolder: (folderPath: string) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      firebaseStatus: () => Promise<any>;
      firebaseTest: () => Promise<any>;
      getFirebaseConfig: () => Promise<{
        apiKey: string;
        authDomain: string;
        projectId: string;
        storageBucket: string;
        messagingSenderId: string;
        appId: string;
      }>;
      openaiStatus: () => Promise<any>;
      n8nStatus: () => Promise<any>;
      chooseFolder: () => Promise<void>;
      getPreferences: () => Promise<any>;
      setPreference: (key: string, value: any) => Promise<void>;
      getMissingEnvs: () => Promise<any>;
      // Future APIs will be typed here
    };
  }
} 