# Personal Finance Receipt Sorter - Technology Decisions

## Core Technology Stack

### Runtime & Framework
- **Desktop Framework**: Electron + TypeScript
- **UI Framework**: React (leveraging existing web dev skills)
- **Reason**: Fastest development path with familiar web technologies

### Automation & AI Workflow
- **Primary Engine**: n8n (visual workflow builder)
- **Reason**: Has built-in Folder Trigger, visual interface, extensive integrations
- **Secondary**: Small LangGraph agents can be embedded as custom JS nodes later
- **File Watching**: n8n Folder Trigger node

### Database & Sync
- **Primary**: Firebase Cloud Firestore
- **Development**: Firebase Local Emulator (works offline)
- **Reason**: Real-time updates, easy auth integration, scales from local to cloud
- **Auth**: Firebase Auth (Google Sign-In for future sync)

### OCR Processing
- **PDF**: `ocrmypdf` CLI tool
- **Images**: `tesseract` CLI tool
- **Integration**: Called from n8n "Execute Command" nodes
- **Reason**: Reliable, local processing, no external API dependencies

### AI/LLM Integration
- **Provider**: OpenAI
- **Model**: `gpt-4o-mini` (cheapest with function calling support)
- **Method**: Chat Completions with Function Calling
- **Purpose**: Parse OCR text → structured JSON (vendor, date, total, category)
- **Privacy**: Only OCR text sent to API, never original images/PDFs

## Data Flow Architecture

```
File Drop (inbox/) 
→ n8n Folder Trigger 
→ OCR (local CLI) 
→ OpenAI Parse (function call) 
→ Firebase Firestore 
→ Electron UI (real-time updates)
```

## Development Phases

### Day 1: Core Pipeline
- Electron app setup
- OpenAI parsing test
- Firebase emulator + basic write
- n8n workflow (folder → OCR → parse → store)

### Day 2: Basic UI (Early Submission)
- Receipt list view
- Folder management
- Basic error handling
- Core functionality working

### Days 3-4: Polish & Features
- Categories management
- CSV export
- Monthly summaries
- Duplicate detection
- Packaging for distribution

## File Structure
```
/inbox/          - Drop receipts here
/tmp/            - OCR processing temp files
/src/            - Electron app source
/scripts/        - Test scripts and utilities
/workflows/      - n8n workflow exports
```

## Environment Variables
```
OPENAI_KEY=sk-...
FIREBASE_PROJECT_ID=receipt-sorter-dev
```

---
**Decision Date**: Day 0
**No changes to these core decisions during development week** 