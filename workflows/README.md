# N8N Workflow Setup Instructions

## Import the Workflow

1. **Open n8n in your browser**:
   ```
   http://localhost:5678
   ```

2. **Import the workflow**:
   - Click "Import from file" or "Import from URL"
   - Select `receipt-processing-workflow.json` from this folder
   - The workflow will be imported with all nodes connected

## Configure Credentials

You'll need to add your OpenAI API key to n8n:

1. **Go to Credentials** (in the left sidebar)
2. **Add New Credential** 
3. **Select "OpenAI"**
4. **Enter your API key** from your `.env` file
5. **Save**

## Workflow Overview

The workflow consists of 6 nodes:

1. **Folder Trigger** - Watches the `inbox/` folder for new files
2. **OCR Processing** - Uses `tesseract` or `ocrmypdf` to extract text
3. **OpenAI Parse** - Sends OCR text to GPT-4o-mini for structured extraction
4. **Format Data** - Prepares the parsed data for storage
5. **Store Receipt** - Sends data to webhook server at `http://localhost:3001/store-receipt`
6. **Success Message** - Logs successful completion

## Test the Workflow

1. **Activate the workflow** by clicking the toggle switch
2. **Drop a receipt** into the `inbox/` folder (or use the test file `test-receipt-grocery.txt`)
3. **Watch the execution** in the n8n interface
4. **Check Firestore** - new receipt should appear in your Firebase database

## Prerequisites

Make sure these are running:
- ✅ Webhook server: `npm run webhook` (port 3001)
- ✅ n8n: `npx n8n` (port 5678)
- ✅ OCR tools installed:
  - `tesseract` for images
  - `ocrmypdf` for PDFs

## Installation of OCR Tools

### Windows (using Chocolatey):
```bash
# Install Chocolatey if you don't have it
# Then install OCR tools
choco install tesseract
choco install ocrmypdf
```

### Windows (manual):
1. **Tesseract**: Download from https://github.com/UB-Mannheim/tesseract/wiki
2. **OCRmyPDF**: `pip install ocrmypdf`

## Troubleshooting

- **OCR failing**: Make sure tesseract and ocrmypdf are in your PATH
- **OpenAI errors**: Check your API key is correctly set in n8n credentials
- **Webhook errors**: Ensure webhook server is running on port 3001
- **File not detected**: Check that the folder path is correct in the Folder Trigger node

## File Flow

```
inbox/ → OCR → OpenAI → Webhook → Firestore → Electron UI
```

The workflow processes receipts completely automatically once activated! 