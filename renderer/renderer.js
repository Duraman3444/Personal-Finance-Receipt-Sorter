// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('[id$="-page"]');
const openInboxBtn = document.getElementById('open-inbox-btn');
const appVersionSpan = document.getElementById('app-version');

// Status indicators
const firebaseStatus = document.getElementById('firebase-status');
const firebaseText = document.getElementById('firebase-text');
const n8nStatus = document.getElementById('n8n-status');
const n8nText = document.getElementById('n8n-text');
const openaiStatus = document.getElementById('openai-status');
const openaiText = document.getElementById('openai-text');

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
    setupEventListeners();
    startStatusChecks();
});

async function initializeApp() {
    try {
        // Get and display app version
        const version = await window.electronAPI.getAppVersion();
        appVersionSpan.textContent = `v${version}`;
        
        console.log('Receipt Sorter initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
}

function setupEventListeners() {
    // Navigation handling
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = e.target.getAttribute('data-page');
            switchPage(targetPage);
        });
    });

    // Open inbox folder button
    openInboxBtn.addEventListener('click', async () => {
        try {
            const inboxPath = './inbox'; // This will be made configurable later
            await window.electronAPI.openFolder(inboxPath);
        } catch (error) {
            console.error('Failed to open inbox folder:', error);
            // Create inbox folder if it doesn't exist (we'll implement this later)
            alert('Inbox folder not found. Please create an "inbox" folder in your project directory.');
        }
    });
}

function switchPage(pageName) {
    // Hide all pages
    pages.forEach(page => {
        page.style.display = 'none';
    });

    // Remove active class from all nav items
    navItems.forEach(item => {
        item.classList.remove('active');
    });

    // Show target page
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.style.display = 'block';
    }

    // Add active class to clicked nav item
    const activeNavItem = document.querySelector(`[data-page="${pageName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
}

function startStatusChecks() {
    // Check Firebase status
    checkFirebaseStatus();
    
    // Check N8N status
    checkN8NStatus();
    
    // Check OpenAI status
    checkOpenAIStatus();
    
    // Set up periodic status checks
    setInterval(() => {
        checkFirebaseStatus();
        checkN8NStatus();
        checkOpenAIStatus();
    }, 30000); // Check every 30 seconds
}

async function checkFirebaseStatus() {
    try {
        // This will be implemented when we add Firebase integration
        // For now, simulate a connection check
        const isConnected = false; // Will be replaced with actual Firebase check
        
        if (isConnected) {
            firebaseStatus.classList.add('connected');
            firebaseText.textContent = 'Connected';
        } else {
            firebaseStatus.classList.remove('connected');
            firebaseText.textContent = 'Emulator Ready';
        }
    } catch (error) {
        firebaseStatus.classList.remove('connected');
        firebaseText.textContent = 'Error';
        console.error('Firebase status check failed:', error);
    }
}

async function checkN8NStatus() {
    try {
        // This will check if N8N is running on localhost:5678
        // For now, show as not running
        n8nStatus.classList.remove('connected');
        n8nText.textContent = 'Not Running';
    } catch (error) {
        n8nStatus.classList.remove('connected');
        n8nText.textContent = 'Error';
        console.error('N8N status check failed:', error);
    }
}

async function checkOpenAIStatus() {
    try {
        // Check if OpenAI API key is configured
        // This will be implemented when we add the actual OpenAI integration
        const hasApiKey = process.env.OPENAI_KEY || false;
        
        if (hasApiKey) {
            openaiStatus.classList.add('connected');
            openaiText.textContent = 'API Key Configured';
        } else {
            openaiStatus.classList.remove('connected');
            openaiText.textContent = 'API Key Missing';
        }
    } catch (error) {
        openaiStatus.classList.remove('connected');
        openaiText.textContent = 'Error';
        console.error('OpenAI status check failed:', error);
    }
}

// Utility functions
function showNotification(message, type = 'info') {
    // This will be implemented for user feedback
    console.log(`${type.toUpperCase()}: ${message}`);
}

function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Export functions for potential use by other modules
window.receiptSorter = {
    switchPage,
    showNotification,
    formatCurrency,
    formatDate
}; 