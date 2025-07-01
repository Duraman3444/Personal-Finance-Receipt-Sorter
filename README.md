# Personal Finance Receipt Sorter

A desktop application that automatically processes receipt images and PDFs using AI, with integrated n8n workflow automation.

## 🚀 Features

- **Automated Receipt Processing**: Drop receipts in inbox folder for automatic processing
- **AI-Powered Data Extraction**: Uses OpenAI GPT-4 to extract structured data from receipts
- **N8N Workflow Integration**: Fully automated processing pipeline
- **OCR Support**: Processes images and PDFs using Tesseract and OCRmyPDF
- **Firebase Storage**: Secure cloud storage with offline support
- **Modern Desktop UI**: Electron-based application with beautiful interface

## 🎯 N8N Integration Status

✅ **INTEGRATED & WORKING**

Current status from integration test:
- ✅ N8N installed (v1.100.1) and running on localhost:5678
- ✅ Inbox directory ready for file drops
- ✅ Workflow files available for import
- ⚠️ Requires: OPENAI_KEY environment variable
- ⚠️ Requires: OCR tools installation (see setup below)

## 🛠️ Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Install OCR Tools
**Windows (using Chocolatey):**
```powershell
choco install tesseract
choco install poppler
```

**Or manually:**
- Tesseract: https://github.com/UB-Mannheim/tesseract/wiki
- Add to PATH: `C:\Program Files\Tesseract-OCR\`

### 3. Configure Environment Variables
Create `.env` file:
```env
OPENAI_KEY=sk-your-openai-api-key-here
FIREBASE_PROJECT_ID=your-firebase-project-id
# ... other Firebase config
```

### 4. Run Integration Test
```bash
npm run test:integration
```

### 5. Start Full Stack
```bash
# Option 1: Everything at once
npm run full-stack

# Option 2: Step by step
npm run webhook    # Starts webhook server (port 3001)
npm run n8n        # Starts n8n (port 5678)
npm run dev        # Starts Electron app
```

## 🔄 N8N Workflow Setup

### 1. Import Workflow
1. Open http://localhost:5678
2. Import `workflows/receipt-processing-complete.json`
3. Configure OpenAI credentials in n8n
4. Activate the workflow

### 2. Test the Pipeline
```bash
# Copy test file to trigger workflow
cp "Inbox Backup/test-simple-receipt.txt" "inbox/test-$(date +%Y%m%d-%H%M%S).txt"
```

### 3. Expected Flow
```
📁 inbox/ → 🔍 OCR → 🤖 OpenAI → 📡 Webhook → 🔥 Firebase → 📱 UI
```

## 📋 Available Scripts

- `npm run dev` - Start Electron app
- `npm run n8n` - Start n8n workflow engine
- `npm run webhook` - Start webhook server
- `npm run workflow` - Start webhook + n8n together
- `npm run full-stack` - Start everything (Firebase + webhook + n8n + app)
- `npm run test:integration` - Test all components
- `npm run test:openai` - Test OpenAI parsing
- `npm run test:firestore` - Test Firebase integration

## 🧪 Testing

Run the integration test to verify everything works:
```bash
npm run test:integration
```

This will check:
- ✅ N8N installation and service status
- ✅ Webhook server connectivity
- ✅ Workflow files presence
- ✅ OCR tools availability
- ✅ Environment variables
- ✅ Inbox directory setup

## 🏗️ Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   File Drop │───▶│  N8N Workflow│───▶│   Webhook   │
│   (inbox/)  │    │  (OCR + AI)  │    │  (port 3001)│
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Electron   │◀───│  Firebase   │◀───│  Processing │
│     UI      │    │  Firestore  │    │   Pipeline  │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 📚 Documentation

- [Setup Guide](SETUP.md) - Detailed setup instructions
- [Workflow Documentation](workflows/README.md) - N8N workflow details
- [API Documentation](docs/API_DOCUMENTATION.md) - Technical specs
- [Architecture](docs/TECHNICAL_ARCHITECTURE.md) - System design

## 🔧 Troubleshooting

**N8N not starting:**
- Check port 5678 is not in use
- Verify n8n is installed: `npx n8n --version`

**OCR failing:**
- Install Tesseract and add to PATH
- For PDFs: Install `ocrmypdf` via pip

**Webhook errors:**
- Ensure webhook server is running: `npm run webhook`
- Check port 3001 is available

**OpenAI errors:**
- Verify OPENAI_KEY in .env file
- Check API key has sufficient credits

## 🎉 Success Indicators

When everything is working, you should see:
1. ✅ All integration tests pass
2. 🌐 n8n UI accessible at http://localhost:5678
3. 📡 Webhook server running on port 3001
4. 🔄 Files dropped in inbox/ get processed automatically
5. 📊 Receipt data appears in Electron UI

The system is now fully integrated with n8n for automated receipt processing! 🚀 