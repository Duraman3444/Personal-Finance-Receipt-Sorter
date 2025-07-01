# Setup Guide - Personal Finance Receipt Sorter

## ✅ Step 1 Complete: Repo & Environment Setup (30 min)

Your project is now set up with:
- ✅ Electron + TypeScript application
- ✅ Firebase Firestore integration
- ✅ OpenAI API integration ready
- ✅ Basic UI with navigation
- ✅ Test scripts for validation

## Next Steps to Complete Setup

### 1. Configure Environment Variables (5 min)

Create a `.env` file in the project root:

```bash
# Copy the example and edit with your keys
# .env file should contain:

OPENAI_KEY=sk-your-actual-openai-api-key-here

# Firebase Configuration (Full API Keys)
FIREBASE_API_KEY=your-firebase-api-key-here
FIREBASE_AUTH_DOMAIN=personalfinancerecieptsorter.firebaseapp.com
FIREBASE_PROJECT_ID=personalfinancerecieptsorter
FIREBASE_STORAGE_BUCKET=personalfinancerecieptsorter.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
FIREBASE_APP_ID=your-app-id-here

NODE_ENV=development
N8N_HOST=localhost
N8N_PORT=5678
```

### 2. Test the Components (10 min)

**Test Electron App:**
```bash
npm run dev
```
- Should open a beautiful desktop app
- Click "Open Inbox Folder" to test folder integration

**Test OpenAI Integration:**
```bash
npm run test:openai
```
- Requires valid OpenAI API key in `.env`
- Should parse sample receipt and return structured JSON

**Test Firebase (in separate terminal):**
```bash
# Terminal 1: Start Firebase emulator
npm run emulator

# Terminal 2: Test Firestore
npm run test:firestore
```
- Should write and read receipt data from local Firestore

### 3. Install OCR Dependencies (15 min)

**Windows (using Chocolatey):**
```powershell
# Install Chocolatey if not already installed
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install OCR tools
choco install tesseract
choco install poppler  # For PDF processing
```

**Alternative - Manual Windows Install:**
- Download Tesseract: https://github.com/UB-Mannheim/tesseract/wiki
- Download Poppler: https://poppler.freedesktop.org/
- Add both to your PATH

**Verify OCR Installation:**
```bash
tesseract --version
pdftoppm -h
```

## Current Project Status

### ✅ Working Components:
- Electron desktop app with modern UI
- TypeScript compilation
- Firebase project created and configured
- OpenAI integration schema ready
- Basic navigation and folder opening

### 🔄 Ready for Day 1 Development:
- OpenAI parsing (needs API key)
- Firebase local storage (needs emulator running)
- OCR processing (needs tesseract/poppler installed)

### 📁 Project Structure:
```
Personal-Finance-Receipt-Sorter/
├── src/
│   ├── main.ts              # Electron main process
│   └── preload.ts           # Secure API bridge
├── renderer/
│   ├── index.html           # UI layout
│   └── renderer.js          # UI interactions
├── scripts/
│   ├── test-parse.ts        # OpenAI test
│   └── firestore-test.ts    # Firebase test
├── inbox/                   # Receipt drop folder
├── tmp/                     # OCR temp files
├── workflows/               # N8N workflows (coming next)
├── DECISIONS.md             # Tech stack decisions
└── firebase.json            # Firebase config
```

## What's Next (Day 1 Remaining Tasks):

1. **Prove OpenAI parsing works** (15 min)
   - Add your API key to `.env`
   - Run `npm run test:openai`

2. **Prove Firebase storage works** (15 min)
   - Run `npm run emulator` 
   - Run `npm run test:firestore`

3. **Set up N8N workflow** (60 min)
   - Install and configure N8N
   - Create file watcher → OCR → OpenAI → Firebase pipeline

After these tests pass, you'll have proven all the core components work and can focus on connecting them together!

## Troubleshooting

**Electron won't start:**
- Check that TypeScript compiled: `npm run build`
- Look for errors in terminal output

**OpenAI test fails:**
- Verify API key is correct in `.env`
- Check internet connection
- Ensure you have OpenAI credits

**Firebase test fails:**
- Make sure emulator is running: `npm run emulator`
- Check that port 8080 is not in use
- Verify Firebase project ID matches

**Path issues on Windows:**
- Use PowerShell as Administrator
- Check that all tools are in PATH
- Restart terminal after installing new software 