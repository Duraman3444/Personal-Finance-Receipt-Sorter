# Deployment Guide

## Overview

This guide covers the complete deployment process for the Personal Finance Receipt Sorter desktop application, from development environment setup to production distribution across Windows, macOS, and Linux platforms.

## Table of Contents

1. [Development Environment](#development-environment)
2. [Build Process](#build-process)
3. [Testing Environments](#testing-environments)
4. [Production Deployment](#production-deployment)
5. [Distribution](#distribution)
6. [Updates & Maintenance](#updates--maintenance)
7. [Monitoring & Analytics](#monitoring--analytics)
8. [Troubleshooting](#troubleshooting)

## Development Environment

### Prerequisites

**System Requirements:**
- Node.js 18.x or higher
- npm 9.x or higher
- Git
- Python 3.8+ (for native dependencies)
- Visual Studio Build Tools (Windows)
- Xcode Command Line Tools (macOS)

**Required Tools:**
```bash
# Install global dependencies
npm install -g electron-builder
npm install -g firebase-tools
npm install -g typescript

# Install system dependencies
# Windows: Install Visual Studio Build Tools
# macOS: xcode-select --install
# Linux: sudo apt-get install build-essential
```

### Environment Setup

```bash
# Clone repository
git clone https://github.com/Duraman3444/Personal-Finance-Receipt-Sorter.git
cd Personal-Finance-Receipt-Sorter

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```bash
# .env
NODE_ENV=development
OPENAI_API_KEY=your_openai_key_here
FIREBASE_PROJECT_ID=personalfinancerecieptsorter
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=personalfinancerecieptsorter.firebaseapp.com
FIREBASE_DATABASE_URL=https://personalfinancerecieptsorter.firebaseio.com
FIREBASE_STORAGE_BUCKET=personalfinancerecieptsorter.appspot.com

# Development only
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

### Local Development

```bash
# Start Firebase emulators
npm run firebase:emulator

# Start development server (in another terminal)
npm run dev

# Run tests
npm test

# Type checking
npm run type-check
```

## Build Process

### Build Configuration

```typescript
// electron-builder.config.js
module.exports = {
  appId: 'com.flowgenius.receipt-sorter',
  productName: 'Personal Finance Receipt Sorter',
  directories: {
    output: 'dist',
    buildResources: 'build'
  },
  files: [
    'src/**/*',
    'renderer/**/*',
    'node_modules/**/*',
    'package.json'
  ],
  extraResources: [
    {
      from: 'resources',
      to: 'resources',
      filter: ['**/*']
    }
  ],
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'ia32']
      },
      {
        target: 'portable',
        arch: ['x64']
      }
    ],
    icon: 'build/icon.ico',
    publisherName: 'FlowGenius',
    verifyUpdateCodeSignature: false
  },
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64']
      }
    ],
    icon: 'build/icon.icns',
    category: 'public.app-category.finance',
    hardenedRuntime: true,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist'
  },
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      },
      {
        target: 'deb',
        arch: ['x64']
      }
    ],
    icon: 'build/icon.png',
    category: 'Office'
  },
  publish: {
    provider: 'github',
    owner: 'Duraman3444',
    repo: 'Personal-Finance-Receipt-Sorter'
  }
};
```

### Build Scripts

```json
{
  "scripts": {
    "build": "npm run build:main && npm run build:renderer",
    "build:main": "tsc -p tsconfig.main.json",
    "build:renderer": "webpack --mode production",
    "build:all": "electron-builder --publish=never",
    "build:win": "electron-builder --win --publish=never",
    "build:mac": "electron-builder --mac --publish=never",
    "build:linux": "electron-builder --linux --publish=never",
    "dist": "npm run build && npm run build:all",
    "dist:win": "npm run build && npm run build:win",
    "dist:mac": "npm run build && npm run build:mac",
    "dist:linux": "npm run build && npm run build:linux"
  }
}
```

### Build Pipeline

```bash
# Clean build
npm run clean

# Build TypeScript
npm run build:main

# Build renderer process
npm run build:renderer

# Package application
npm run build:all

# Verify build
npm run verify:build
```

## Testing Environments

### Staging Environment

```yaml
# .github/workflows/staging.yml
name: Staging Deployment

on:
  push:
    branches: [develop]

jobs:
  build-and-test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build
      
      - name: Package application
        run: npm run build:${{ matrix.os == 'ubuntu-latest' && 'linux' || matrix.os == 'windows-latest' && 'win' || 'mac' }}
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: app-${{ matrix.os }}
          path: dist/
```

### Beta Testing

```typescript
// src/config/environment.ts
export const config = {
  environment: process.env.NODE_ENV || 'production',
  isBeta: process.env.BETA_BUILD === 'true',
  version: process.env.npm_package_version,
  updateServer: process.env.UPDATE_SERVER_URL || 'https://updates.example.com',
  analytics: {
    enabled: process.env.NODE_ENV === 'production',
    trackingId: process.env.ANALYTICS_TRACKING_ID
  },
  features: {
    betaFeatures: process.env.BETA_BUILD === 'true',
    debugMode: process.env.DEBUG === 'true'
  }
};
```

## Production Deployment

### Pre-deployment Checklist

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] Code signing certificates ready
- [ ] Release notes prepared
- [ ] Rollback plan documented

### Code Signing

#### Windows Code Signing

```bash
# Install certificate
certlm.msc # Import .p12 certificate

# Sign executable
signtool sign /f certificate.p12 /p password /t http://timestamp.digicert.com /d "Personal Finance Receipt Sorter" dist/win-unpacked/Personal\ Finance\ Receipt\ Sorter.exe
```

#### macOS Code Signing

```bash
# Import certificates to keychain
security import certificate.p12 -k ~/Library/Keychains/login.keychain

# Sign application
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" dist/mac/Personal\ Finance\ Receipt\ Sorter.app

# Notarize application
xcrun altool --notarize-app --primary-bundle-id "com.flowgenius.receipt-sorter" --username "your-apple-id" --password "app-specific-password" --file dist/Personal\ Finance\ Receipt\ Sorter.dmg
```

### Release Process

```bash
# 1. Version bump
npm version patch # or minor/major

# 2. Update changelog
npm run changelog

# 3. Build for all platforms
npm run dist

# 4. Run final tests
npm run test:e2e

# 5. Create GitHub release
gh release create v1.0.0 dist/*.exe dist/*.dmg dist/*.AppImage --title "Version 1.0.0" --notes-file CHANGELOG.md

# 6. Publish to update server
npm run publish:release
```

### Automated Release Pipeline

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build and package
        run: npm run dist
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
      
      - name: Upload release assets
        uses: softprops/action-gh-release@v1
        with:
          files: dist/*
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Distribution

### Distribution Channels

1. **GitHub Releases** (Primary)
   - Direct download links
   - Automatic update detection
   - Release notes and changelogs

2. **Microsoft Store** (Windows)
   - MSIX packaging
   - Automatic updates
   - Store validation

3. **Mac App Store** (macOS)
   - App Store Connect
   - Sandboxed version
   - Store review process

4. **Snap Store** (Linux)
   - Universal Linux packages
   - Automatic updates
   - Confinement policies

### Package Formats

#### Windows
```bash
# NSIS Installer
electron-builder --win nsis

# Portable Executable
electron-builder --win portable

# Microsoft Store Package
electron-builder --win appx
```

#### macOS
```bash
# DMG Disk Image
electron-builder --mac dmg

# ZIP Archive
electron-builder --mac zip

# Mac App Store Package
electron-builder --mac mas
```

#### Linux
```bash
# AppImage
electron-builder --linux AppImage

# Debian Package
electron-builder --linux deb

# Snap Package
electron-builder --linux snap
```

### Auto-updater Configuration

```typescript
// src/services/autoUpdater.ts
import { autoUpdater } from 'electron-updater';
import { dialog } from 'electron';

export class AutoUpdater {
  constructor() {
    autoUpdater.checkForUpdatesAndNotify();
    
    autoUpdater.on('update-available', () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: 'A new version is available. It will be downloaded in the background.',
        buttons: ['OK']
      });
    });

    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded. Application will restart to apply the update.',
        buttons: ['Restart Now', 'Later']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });
  }

  checkForUpdates() {
    if (process.env.NODE_ENV === 'development') {
      return;
    }
    autoUpdater.checkForUpdatesAndNotify();
  }
}
```

## Updates & Maintenance

### Update Strategy

1. **Automatic Updates**
   - Background download
   - User notification
   - Restart prompt

2. **Manual Updates**
   - Check for updates menu
   - Download progress
   - Installation guidance

3. **Rollback Mechanism**
   - Version history
   - Quick rollback
   - Emergency updates

### Version Management

```json
{
  "version": "1.0.0",
  "releaseNotes": {
    "1.0.0": {
      "date": "2024-07-01",
      "features": ["Initial release"],
      "fixes": [],
      "breaking": []
    }
  }
}
```

### Maintenance Tasks

```bash
# Weekly maintenance
npm run maintenance:weekly

# Update dependencies
npm audit fix
npm update

# Clean old builds
npm run clean:builds

# Backup user data
npm run backup:userdata
```

## Monitoring & Analytics

### Application Metrics

```typescript
// src/services/analytics.ts
import { app } from 'electron';

export class Analytics {
  private userId: string;
  
  constructor() {
    this.userId = this.getOrCreateUserId();
  }

  trackEvent(event: string, properties?: Record<string, any>) {
    if (!this.isEnabled()) return;

    const data = {
      event,
      properties: {
        ...properties,
        version: app.getVersion(),
        platform: process.platform,
        timestamp: Date.now()
      },
      userId: this.userId
    };

    this.sendAnalytics(data);
  }

  trackError(error: Error, context?: Record<string, any>) {
    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      ...context
    });
  }

  private isEnabled(): boolean {
    return process.env.NODE_ENV === 'production' && 
           !process.env.DISABLE_ANALYTICS;
  }
}
```

### Performance Monitoring

```typescript
// src/services/performance.ts
export class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();

  startTimer(name: string) {
    this.metrics.set(name, performance.now());
  }

  endTimer(name: string): number {
    const start = this.metrics.get(name);
    if (!start) return 0;

    const duration = performance.now() - start;
    this.metrics.delete(name);

    // Send to analytics
    analytics.trackEvent('performance', {
      metric: name,
      duration,
      threshold: this.getThreshold(name)
    });

    return duration;
  }

  private getThreshold(metric: string): number {
    const thresholds = {
      'receipt-processing': 30000, // 30 seconds
      'app-startup': 3000,         // 3 seconds
      'ui-response': 100           // 100ms
    };
    return thresholds[metric] || 1000;
  }
}
```

### Health Checks

```typescript
// src/services/healthCheck.ts
export class HealthCheck {
  async runChecks(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkFirebaseConnection(),
      this.checkOpenAIConnection(),
      this.checkFileSystemAccess(),
      this.checkMemoryUsage()
    ]);

    return {
      overall: checks.every(check => check.status === 'fulfilled'),
      details: checks.map((check, index) => ({
        name: this.getCheckName(index),
        status: check.status,
        message: check.status === 'rejected' ? check.reason.message : 'OK'
      }))
    };
  }

  private async checkFirebaseConnection(): Promise<boolean> {
    // Test Firebase connectivity
    return true;
  }

  private async checkOpenAIConnection(): Promise<boolean> {
    // Test OpenAI API connectivity
    return true;
  }
}
```

## Troubleshooting

### Common Issues

#### Build Issues

**Issue**: Native dependencies compilation failure
```bash
# Solution
npm rebuild
npm install --build-from-source
```

**Issue**: Code signing failure
```bash
# Solution
# Verify certificate validity
security find-identity -v -p codesigning

# Clean keychain
security delete-certificate -c "Certificate Name"
```

#### Runtime Issues

**Issue**: Application won't start
- Check system requirements
- Verify file permissions
- Review error logs in `%APPDATA%/receipt-sorter/logs`

**Issue**: Firebase connection errors
- Check internet connectivity
- Verify Firebase configuration
- Check firewall settings

#### Performance Issues

**Issue**: Slow receipt processing
- Check OpenAI API limits
- Verify OCR service status
- Monitor memory usage

### Debug Mode

```typescript
// Enable debug mode
process.env.DEBUG = 'true';

// Debug logging
import debug from 'debug';
const log = debug('receipt-sorter:main');

log('Application starting...');
```

### Log Management

```typescript
// src/services/logger.ts
import * as winston from 'winston';
import { app } from 'electron';
import * as path from 'path';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(app.getPath('userData'), 'logs', 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(app.getPath('userData'), 'logs', 'combined.log')
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export { logger };
```

### Support Information

For deployment support:
- Check the [GitHub Issues](https://github.com/Duraman3444/Personal-Finance-Receipt-Sorter/issues)
- Review the [Documentation](https://github.com/Duraman3444/Personal-Finance-Receipt-Sorter/wiki)
- Contact support at support@flowgenius.com

This deployment guide ensures reliable, secure, and maintainable distribution of the Personal Finance Receipt Sorter application across all supported platforms. 