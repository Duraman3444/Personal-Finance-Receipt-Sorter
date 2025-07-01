import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface AppConfig {
  autoLaunch: boolean;
  autoStartN8n: boolean;
  defaultCurrency: string;
  showNotifications: boolean;
}

const defaultConfig: AppConfig = {
  autoLaunch: true,
  autoStartN8n: true,
  defaultCurrency: 'USD',
  showNotifications: true
};

function getConfigPath(): string {
  // Ensure userData path is available
  const userData = app.getPath('userData');
  return path.join(userData, 'config.json');
}

export function loadConfig(): AppConfig {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(data);
      return { ...defaultConfig, ...parsed } as AppConfig;
    }
  } catch (err) {
    console.error('Failed to load config:', err);
  }
  return { ...defaultConfig };
}

export function saveConfig(cfg: AppConfig): void {
  try {
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
  } catch (err) {
    console.error('Failed to save config:', err);
  }
} 