import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const N8N_BASE_URL = 'http://localhost:5678';
const WORKFLOW_PATH = path.join(process.cwd(), 'workflows/automated-email-reports.json');

interface N8nResponse {
  success?: boolean;
  message?: string;
  data?: any;
}

async function waitForN8n(maxAttempts = 30): Promise<boolean> {
  console.log('🔄 Waiting for n8n to be ready...');
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${N8N_BASE_URL}/healthz`);
      if (response.ok) {
        console.log('✅ n8n is ready!');
        return true;
      }
    } catch (error) {
      // n8n not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`⏳ Attempt ${i + 1}/${maxAttempts}...`);
  }
  
  return false;
}

async function importWorkflow(): Promise<string | null> {
  try {
    console.log('📦 Importing email workflow...');
    
    const workflowData = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8'));
    
    // Check if workflow already exists
    console.log('🔍 Checking existing workflows...');
    const existingResponse = await fetch(`${N8N_BASE_URL}/rest/workflows`);
    
    if (existingResponse.ok) {
      const existingWorkflows = await existingResponse.json() as any;
      const existingWorkflow = existingWorkflows.find((w: any) => w.name === workflowData.name);
      
      if (existingWorkflow) {
        console.log('✅ Workflow already exists! Using existing workflow.');
        return existingWorkflow.id;
      }
    }
    
    // Import the workflow
    const response = await fetch(`${N8N_BASE_URL}/rest/workflows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflowData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401) {
        console.log('⚠️  n8n requires authentication. Please configure manually:');
        console.log('   1. Go to http://localhost:5678');
        console.log('   2. Import workflows/automated-email-reports.json');
        console.log('   3. Configure email settings');
        console.log('   4. Activate the workflow');
        return null;
      }
      throw new Error(`Failed to import workflow: ${response.status} ${errorText}`);
    }
    
    const result = await response.json() as any;
    console.log('✅ Workflow imported successfully!');
    return result.id;
    
  } catch (error) {
    console.error('❌ Error importing workflow:', error);
    return null;
  }
}

async function activateWorkflow(workflowId: string): Promise<boolean> {
  try {
    console.log('🔄 Activating workflow...');
    
    const response = await fetch(`${N8N_BASE_URL}/rest/workflows/${workflowId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to activate workflow: ${response.status} ${errorText}`);
    }
    
    console.log('✅ Workflow activated successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error activating workflow:', error);
    return false;
  }
}

async function testWorkflow(workflowId: string): Promise<boolean> {
  try {
    console.log('🧪 Testing workflow...');
    
    const response = await fetch(`${N8N_BASE_URL}/rest/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`⚠️  Test execution failed: ${response.status} ${errorText}`);
      return false;
    }
    
    const result = await response.json() as any;
    console.log('✅ Test execution completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Error testing workflow:', error);
    return false;
  }
}

async function checkCSVWebhook(): Promise<boolean> {
  try {
    console.log('🔍 Checking CSV webhook server...');
    
    const response = await fetch('http://localhost:3002/health');
    if (response.ok) {
      console.log('✅ CSV webhook server is running!');
      return true;
    }
    
    console.log('❌ CSV webhook server is not responding');
    return false;
    
  } catch (error) {
    console.error('❌ CSV webhook server is not running:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Setting up n8n automated email workflow...\n');
  
  // Wait for n8n to be ready
  const n8nReady = await waitForN8n();
  if (!n8nReady) {
    console.error('❌ n8n is not responding. Please ensure it is running.');
    process.exit(1);
  }
  
  // Check CSV webhook server
  const csvReady = await checkCSVWebhook();
  if (!csvReady) {
    console.log('⚠️  CSV webhook server is not running. Starting it now...');
    console.log('Please run: npm run csv-webhook');
  }
  
  // Import workflow
  const workflowId = await importWorkflow();
  if (!workflowId) {
    console.log('\n📋 Manual Setup Required:');
    console.log('Since n8n requires authentication, please complete the setup manually:');
    console.log('1. Go to http://localhost:5678');
    console.log('2. Import the workflow from: workflows/automated-email-reports.json');
    console.log('3. Configure email settings in the workflow nodes');
    console.log('4. Set up SMTP credentials in Settings → Credentials');
    console.log('5. Activate the workflow');
    console.log('\n✅ Your services are running and ready for manual configuration!');
    return;
  }
  
  // Activate workflow
  const activated = await activateWorkflow(workflowId);
  if (!activated) {
    console.log('⚠️  Could not activate workflow automatically');
    console.log('Please activate it manually at http://localhost:5678');
  }
  
  // Test workflow (optional)
  await testWorkflow(workflowId);
  
  console.log('\n🎉 Setup complete!');
  console.log('📧 Your automated email workflow is now active!');
  console.log('📅 Reports will be sent:');
  console.log('   • Monthly: 1st of each month at 9 AM');
  console.log('   • Weekly: Every Monday at 9 AM');
  console.log('\n📝 To configure email settings:');
  console.log('   1. Go to http://localhost:5678');
  console.log('   2. Open the "Automated Email Reports" workflow');
  console.log('   3. Update the email addresses in the Email nodes');
  console.log('   4. Set up SMTP credentials in Settings → Credentials');
  console.log('\n✅ Your receipt processing system is ready!');
}

main().catch(console.error); 