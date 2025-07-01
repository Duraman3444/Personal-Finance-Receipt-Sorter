// N8N Configuration for Personal Finance Receipt Sorter
// This file configures n8n with project-specific settings

module.exports = {
  // Basic Settings
  host: process.env.N8N_HOST || 'localhost',
  port: process.env.N8N_PORT || 5678,
  
  // Security Settings
  basicAuth: {
    active: process.env.N8N_BASIC_AUTH_ACTIVE === 'true' || false,
    user: process.env.N8N_BASIC_AUTH_USER || 'admin',
    password: process.env.N8N_BASIC_AUTH_PASSWORD || 'password'
  },
  
  // Editor Settings
  editorBaseUrl: process.env.N8N_EDITOR_BASE_URL || 'http://localhost:5678',
  
  // Webhook Settings
  webhookUrl: process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook',
  webhookTunnelUrl: process.env.N8N_WEBHOOK_TUNNEL_URL || undefined,
  
  // Database Settings
  database: {
    type: 'sqlite',
    sqlite: {
      database: '.n8n/database.sqlite'
    }
  },
  
  // Encryption
  encryptionKey: process.env.N8N_ENCRYPTION_KEY || 'n8n-default-key-change-me',
  
  // Logging
  logs: {
    level: process.env.N8N_LOG_LEVEL || 'info',
    output: process.env.N8N_LOG_OUTPUT || 'console'
  },
  
  // Execution Settings
  executions: {
    mode: 'regular',
    timeout: 300,
    maxTimeout: 3600,
    saveDataOnError: 'all',
    saveDataOnSuccess: 'all',
    saveDataManualExecutions: true
  },
  
  // External Hooks
  externalHooks: {},
  
  // User Management (disabled for single user mode)
  userManagement: {
    disabled: true
  },
  
  // Performance
  endpoints: {
    rest: 'rest',
    webhook: 'webhook',
    webhookTest: 'webhook-test'
  }
}; 