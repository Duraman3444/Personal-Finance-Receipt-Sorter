# 🚀 n8n Email Workflow Setup Guide

## ✅ Current Status
- **n8n**: Running on http://localhost:5678
- **CSV Webhook**: Running on http://localhost:3002
- **Email Workflow**: Ready to import

## 📋 Final Setup Steps

### Step 1: Access n8n
1. Open your browser and go to: **http://localhost:5678**
2. If prompted, create an account or sign in

### Step 2: Import the Email Workflow
1. In n8n, click **"Import from File"** or **"+"** → **"Import"**
2. Select the file: `workflows/automated-email-reports.json`
3. The workflow will be imported with all nodes connected

### Step 3: Configure Email Settings
1. Open the imported **"Automated Email Reports"** workflow
2. Update the following nodes:
   - **Send Email** node: Change `toEmail` to your email address
   - **Send Weekly Summary** node: Change `toEmail` to your email address
   - **Send Error Email** node: Change `toEmail` to your email address

### Step 4: Set Up SMTP Credentials
1. Go to **Settings** → **Credentials**
2. Click **"Create New Credential"**
3. Select **"SMTP"** or **"Email Send"**
4. Configure with your email provider:

#### Gmail Example:
```
Host: smtp.gmail.com
Port: 587
Security: STARTTLS
Username: your-email@gmail.com
Password: your-app-password
```

#### Outlook Example:
```
Host: smtp-mail.outlook.com
Port: 587
Security: STARTTLS
Username: your-email@outlook.com
Password: your-password
```

### Step 5: Activate the Workflow
1. In the workflow editor, click the **"Activate"** toggle switch
2. The workflow should now show as "Active"

### Step 6: Test the Workflow
1. Click **"Test Workflow"** to run it manually
2. Check your email for the test report
3. Verify the CSV webhook is working

## 📧 Email Schedule
Once activated, you'll receive:
- **Monthly Reports**: 1st of each month at 9 AM (with CSV attachment)
- **Weekly Summaries**: Every Monday at 9 AM (text only)

## 🔧 Troubleshooting

### Email Not Sending?
- Check SMTP credentials in n8n
- Verify email addresses are correct
- Check the "Executions" tab for error details

### CSV Export Issues?
- Ensure CSV webhook is running: `npm run csv-webhook`
- Test the endpoint: http://localhost:3002/health

### Workflow Not Triggering?
- Check if the workflow is "Active" (toggle switch)
- Verify the cron schedule in the trigger nodes
- Check n8n execution logs

## 🎉 You're Done!
Your automated email reporting system is now fully configured! 📊📧

The workflow will automatically:
- Generate CSV exports of your receipts
- Calculate spending summaries
- Send formatted email reports
- Handle errors gracefully

Enjoy your automated financial reports! 🚀 