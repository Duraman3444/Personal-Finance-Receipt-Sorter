# Automated Email Reports Setup Guide

## Overview
This guide will help you set up automated CSV export and email reporting for your receipt data using the new features we've just added.

## ✨ New Features Added

### 1. CSV Export Button in UI
- Added export dropdown to the receipts page
- Three export options:
  - **Export as CSV**: Complete receipt data in CSV format
  - **Export as JSON**: Structured JSON export with metadata
  - **Export Summary Report**: Statistical summary with category breakdowns

### 2. CSV Export Webhook Service
- New webhook server on port 3002
- Endpoints for CSV generation and summary reports
- Filters by time period (month, quarter, year)

### 3. Automated n8n Workflows
- **Monthly Reports**: Full CSV export with email attachment (1st of each month at 9 AM)
- **Weekly Summaries**: Quick summary email (every Monday at 9 AM)
- Error handling and notifications

## 🚀 Quick Start

### Step 1: Test the UI Export
1. Build and start the app:
   ```bash
   npm run build
   npm run dev
   ```

2. Navigate to the **Receipts** page
3. Click the **Export** button
4. Try exporting as CSV to test the functionality

### Step 2: Start the CSV Webhook Server
1. Run the CSV webhook server:
   ```bash
   npm run csv-webhook
   ```

2. Test the webhook endpoint:
   ```bash
   curl -X POST http://localhost:3002/export/receipts/csv \
     -H "Content-Type: application/json" \
     -d '{"limit": 1000, "period": "month"}'
   ```

### Step 3: Set Up n8n Workflow
1. Start n8n with the CSV webhook:
   ```bash
   npm run workflow-with-csv
   ```

2. Access n8n at `http://localhost:5678`

3. Import the workflow:
   - Go to **Workflows** → **Import from File**
   - Select `workflows/automated-email-reports.json`

4. **Configure Email Settings**:
   - Update the email addresses in the workflow nodes
   - Set up email credentials in n8n (SMTP settings)
   - Configure your email provider credentials

### Step 4: Activate the Workflow
1. In n8n, open the **Automated Email Reports** workflow
2. Click **Activate** to enable the scheduled runs
3. Test by clicking **Execute Workflow** to run it manually

## 📧 Email Configuration

### SMTP Settings for n8n
You'll need to configure email credentials in n8n:

1. Go to **Settings** → **Credentials**
2. Create a new **Email Send** credential
3. Configure your email provider:

**Gmail Example:**
- Host: `smtp.gmail.com`
- Port: `587`
- Email: `your-email@gmail.com`
- Password: `your-app-password`

**Outlook Example:**
- Host: `smtp-mail.outlook.com`
- Port: `587`
- Email: `your-email@outlook.com`
- Password: `your-password`

## 🔧 Configuration Options

### Environment Variables
Create a `.env` file with these optional settings:

```env
# CSV Webhook Server
CSV_WEBHOOK_PORT=3002

# Email Settings (used in workflow)
EMAIL_FROM=receipts@yourdomain.com
EMAIL_TO=your-email@example.com
```

### Workflow Customization
Edit the workflow to customize:

- **Schedule**: Change cron expressions
  - Monthly: `0 9 1 * *` (9 AM on 1st of month)
  - Weekly: `0 9 * * 1` (9 AM every Monday)
  - Daily: `0 9 * * *` (9 AM every day)

- **Email Content**: Modify the email templates
- **Recipients**: Add multiple email addresses
- **Filters**: Change the time periods for reports

## 📊 Report Types

### Monthly Report (CSV Attachment)
- **When**: 1st of each month at 9 AM
- **Content**: Complete CSV file with all receipts
- **Includes**: Summary statistics and category breakdowns

### Weekly Summary (Text Only)
- **When**: Every Monday at 9 AM
- **Content**: Quick summary with key metrics
- **Purpose**: Regular check-in without large attachments

## 🎯 Usage Tips

### Manual Export
- Use the UI export for ad-hoc reporting
- CSV files download directly to your browser
- JSON exports include metadata and statistics

### Automated Reports
- Set up the workflow once and forget about it
- Reports are automatically generated and emailed
- Error notifications if something goes wrong

### Customization
- Edit the workflow to add more recipients
- Customize email templates with your branding
- Add additional report types (quarterly, yearly)

## 🔍 Troubleshooting

### Common Issues

**Export button not working:**
- Check that the dropdown is properly initialized
- Verify receipts are loaded in the page
- Check browser console for JavaScript errors

**Webhook server not starting:**
- Ensure port 3002 is available
- Check that TypeScript compilation succeeded
- Verify Firebase configuration

**Email not sending:**
- Check SMTP credentials in n8n
- Verify email addresses are correct
- Check n8n execution logs for errors

### Testing Commands

```bash
# Test CSV webhook
curl -X POST http://localhost:3002/export/receipts/csv \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'

# Test summary webhook
curl -X POST http://localhost:3002/export/receipts/summary \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'

# Check webhook health
curl http://localhost:3002/health
```

## 🎉 What's Next?

With these features implemented, you now have:
- ✅ Manual CSV export from the UI
- ✅ Automated webhook service for CSV generation
- ✅ Scheduled email reports with attachments
- ✅ Error handling and notifications

This foundation can be extended with:
- Natural language rules and alerts
- Team collaboration features
- Integration with accounting software
- Advanced analytics and insights

The automated email reports provide immediate value and can be customized to meet your specific needs! 