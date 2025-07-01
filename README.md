# Personal Finance Receipt Sorter

A desktop application that automatically processes receipt images and PDFs, extracts financial data using AI, and maintains a local ledger for personal finance tracking.

## What It Does

- **Drop receipts** in a watched folder (PDF/image files)
- **Automatic OCR** extraction of text content
- **AI-powered parsing** to extract vendor, date, total, category, and payment method
- **Local storage** in Firebase Firestore (with offline support)
- **Real-time UI** showing processed receipts and spending analytics
- **Privacy-first** - images never leave your machine, only OCR text is processed

## Technology Stack

- **Desktop**: Electron + TypeScript + React
- **Automation**: n8n visual workflows
- **AI**: OpenAI GPT-4o-mini with function calling
- **Database**: Firebase Firestore (local emulator for development)
- **OCR**: Tesseract + ocrmypdf

## Quick Start

### Prerequisites
- Node.js 18+
- Firebase CLI
- Tesseract OCR
- ocrmypdf (for PDF processing)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repo-url>
   cd Personal-Finance-Receipt-Sorter
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI API key and Firebase project ID
   ```

3. **Initialize Firebase**
   ```bash
   firebase init firestore
   firebase emulators:start
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```

## Development Workflow

### Day 1: Core Pipeline
- [x] Project setup and decisions locked in
- [x] Electron app scaffold
- [x] OpenAI parsing test script
- [x] Firebase emulator integration
- [ ] Basic n8n workflow

### Day 2: Early Submission (Core Functionality)
- [ ] Receipt list UI
- [ ] File drop handling
- [ ] End-to-end processing pipeline
- [ ] Error handling

### Days 3-4: Polish & Features
- [ ] Category management
- [ ] CSV export functionality
- [ ] Monthly spending summaries
- [ ] Duplicate detection
- [ ] App packaging

## Architecture

```
Receipt Drop (inbox/) 
→ n8n File Watcher 
→ OCR Processing (local) 
→ OpenAI Parsing (API) 
→ Firebase Storage 
→ Electron UI Updates
```

## Project Structure

```
/
├── src/                 # Electron app source
├── scripts/             # Test and utility scripts
├── workflows/           # n8n workflow definitions
├── inbox/               # Receipt drop folder
├── tmp/                 # OCR processing temp files
├── DECISIONS.md         # Technology decisions
└── README.md           # This file
```

## Contributing

This is a personal productivity project. See `DECISIONS.md` for locked-in technology choices during the development sprint.

---

**FlowGenius Desktop Application Project**  
*Building the productivity tool you've always wanted* 