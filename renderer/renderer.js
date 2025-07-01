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

        // Apply saved theme
        const savedTheme = localStorage.getItem('theme') || 'default';
        applyTheme(savedTheme);
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
            const savedPath = localStorage.getItem('inboxPath') || 'inbox';
            await window.electronAPI.openFolder(savedPath);
        } catch (error) {
            console.error('Failed to open inbox folder:', error);
            // Show user-friendly error message
            showNotification('Failed to open inbox folder. Make sure the inbox directory exists in your project folder.', 'error');
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

    if (pageName === 'receipts') {
        loadReceipts();
    }
    if (pageName === 'categories') {
        loadCategories();
    }
    if (pageName === 'analytics') {
        loadAnalytics();
    }
    if (pageName === 'settings') {
        loadSettings();
    }
}

async function loadReceipts() {
    const receiptsContainer = document.querySelector('#receipts-page .welcome-card');
    if (!receiptsContainer) return;
    receiptsContainer.innerHTML = '<h2>Recent Receipts</h2><p>Loading...</p>';

    try {
        const receipts = await window.firebaseClient.getReceipts(50);
        if (!receipts.length) {
            receiptsContainer.innerHTML = '<h2>Recent Receipts</h2><p>No receipts found.</p>';
            return;
        }

        let html = '<h2>Recent Receipts</h2><table style="width:100%;border-collapse:collapse;color:white">';
        html += '<tr><th align="left">Date</th><th align="left">Vendor</th><th align="right">Total</th><th align="left">Category</th></tr>';
        receipts.forEach(r => {
            html += `<tr style="border-top:1px solid rgba(255,255,255,0.1);"><td>${formatDate(r.date)}</td><td>${r.vendor || ''}</td><td align="right">${formatCurrency(r.total)}</td><td>${r.category || ''}</td></tr>`;
        });
        html += '</table>';
        receiptsContainer.innerHTML = html;
    } catch (err) {
        console.error('Failed to load receipts:', err);
        receiptsContainer.innerHTML = '<h2>Recent Receipts</h2><p style="color:red;">Error loading receipts.</p>';
    }
}

async function loadCategories() {
    const catContainer = document.querySelector('#categories-page .welcome-card');
    if (!catContainer) return;
    catContainer.innerHTML = '<h2>Spending Categories</h2><p>Loading...</p>';
    try {
        const receipts = await window.firebaseClient.getReceipts(500);
        const categoryTotals = {};
        receipts.forEach(r => {
            const cat = r.category || 'Uncategorized';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + (r.total || 0);
        });
        const cats = Object.keys(categoryTotals).sort();
        let html = '<h2>Spending Categories</h2><table style="width:100%;border-collapse:collapse;color:white">';
        html += '<tr><th align="left">Category</th><th align="right">Total Spent</th></tr>';
        cats.forEach(c => {
            html += `<tr style="border-top:1px solid rgba(255,255,255,0.1);"><td>${c}</td><td align="right">${formatCurrency(categoryTotals[c])}</td></tr>`;
        });
        html += '</table>';
        catContainer.innerHTML = html;
    } catch(err){
        console.error(err);
        catContainer.innerHTML='<h2>Spending Categories</h2><p style="color:red;">Error loading categories.</p>';
    }
}

async function loadAnalytics(){
    const aCont=document.querySelector('#analytics-page .welcome-card');
    if(!aCont) return;
    aCont.innerHTML='<h2>Analytics</h2><p>Loading...</p>';
    try{
        const receipts=await window.firebaseClient.getReceipts(500);
        const total=receipts.reduce((sum,r)=>sum+(r.total||0),0);
        const count=receipts.length;
        const avg=count? total/count:0;

        // Aggregate daily totals
        const dailyTotals = {};
        receipts.forEach(r=>{
            const dRaw = r.date;
            let d;
            if (dRaw && typeof dRaw === 'object' && typeof dRaw.toDate === 'function') {
                d = dRaw.toDate();
            } else {
                d = new Date(dRaw);
            }
            if(isNaN(d)) return;
            const key = d.toISOString().split('T')[0];
            dailyTotals[key] = (dailyTotals[key]||0) + (r.total||0);
        });
        const sortedDates = Object.keys(dailyTotals).sort();
        const dailyValues = sortedDates.map(d=> Number(dailyTotals[d].toFixed(2)));

        // Aggregate category totals
        const categoryTotals = {};
        receipts.forEach(r=>{
            const cat = r.category || 'Uncategorized';
            categoryTotals[cat] = (categoryTotals[cat]||0) + (r.total||0);
        });
        const categories = Object.keys(categoryTotals).sort();
        const categoryValues = categories.map(c=> Number(categoryTotals[c].toFixed(2)));

        // Build HTML skeleton
        let html='<h2>Analytics</h2>';
        html+=`<p>Total Receipts: <strong>${count}</strong></p>`;
        html+=`<p>Total Spent: <strong>${formatCurrency(total)}</strong></p>`;
        html+=`<p>Average per Receipt: <strong>${formatCurrency(avg)}</strong></p>`;
        html+='<div class="chart-wrapper" style="margin-top:1.5rem;">\
                  <canvas id="spendingTimeChart" style="max-width:100%;height:300px;"></canvas>\
               </div>';
        html+='<div class="chart-wrapper" style="margin-top:2rem;">\
                  <canvas id="categoryChart" style="max-width:100%;height:300px;"></canvas>\
               </div>';
        aCont.innerHTML=html;

        // Ensure Chart.js is loaded
        const ensureChartReady = async()=>{
            if(window.Chart){return;}
            try{
                const mod = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.esm.js');
                mod.Chart.register(...mod.registerables);
                window.Chart = mod.Chart;
            }catch(e){console.error('Failed to load Chart.js',e);throw e;}
        };
        await ensureChartReady();

        // Destroy existing charts if we reload
        window.analyticsCharts = window.analyticsCharts || {};
        if(window.analyticsCharts.timeChart){window.analyticsCharts.timeChart.destroy();}
        if(window.analyticsCharts.categoryChart){window.analyticsCharts.categoryChart.destroy();}

        // Generate colors for category chart
        const genColors = (n)=>{
            const colors=[];
            for(let i=0;i<n;i++){
                const hue=Math.floor((360/n)*i);
                colors.push(`hsl(${hue},70%,60%)`);
            }
            return colors;
        };

        const { textColor, gridColor, lineColor, lineFill } = getChartThemeColors();

        const ctxTime = document.getElementById('spendingTimeChart').getContext('2d');
        window.analyticsCharts.timeChart = new Chart(ctxTime, {
            type: 'line',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: 'Spending Over Time',
                    data: dailyValues,
                    borderColor: lineColor,
                    backgroundColor: lineFill,
                    fill: true,
                    tension: 0.25
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins:{
                    legend:{labels:{color:textColor}}
                },
                scales: {
                    x:{
                        ticks:{color:textColor},
                        grid:{color:gridColor}
                    },
                    y: {
                        ticks: {
                            color:textColor,
                            callback: (v)=>formatCurrency(v)
                        },
                        grid:{color:gridColor}
                    }
                }
            }
        });

        const ctxCat = document.getElementById('categoryChart').getContext('2d');
        window.analyticsCharts.categoryChart = new Chart(ctxCat, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Spending by Category',
                    data: categoryValues,
                    backgroundColor: genColors(categories.length),
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins:{
                    legend:{labels:{color:textColor}}
                },
                scales: {
                    x: {
                        ticks: {
                            color:textColor,
                            callback: (v)=>formatCurrency(v)
                        },
                        grid:{color:gridColor}
                    },
                    y:{
                        ticks:{color:textColor},
                        grid:{color:gridColor}
                    }
                }
            }
        });

    }catch(err){
        console.error(err);
        aCont.innerHTML='<h2>Analytics</h2><p style="color:red;">Error loading analytics.</p>';
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
        // Check both client and main process Firebase status
        let clientConnected = false;
        let mainProcessConnected = false;
        
        // Check client-side Firebase
        if (window.firebaseClient) {
            clientConnected = await window.firebaseClient.testConnection();
        }
        
        // Check main process Firebase
        if (window.electronAPI && window.electronAPI.firebaseStatus) {
            const mainStatus = await window.electronAPI.firebaseStatus();
            mainProcessConnected = mainStatus.success && mainStatus.connected;
        }
        
        // Update UI based on status
        if (clientConnected || mainProcessConnected) {
            firebaseStatus.classList.add('connected');
            if (window.location.protocol === 'file:') {
                // Electron environment - rely on main process response
                firebaseText.textContent = mainProcessConnected ? 'Connected' : 'Client Ready';
            } else {
                firebaseText.textContent = 'Connected';
            }
        } else if (window.firebaseClient && window.firebaseClient.isInitialized) {
            firebaseStatus.classList.remove('connected');
            firebaseText.textContent = 'Initialized';
        } else {
            firebaseStatus.classList.remove('connected');
            firebaseText.textContent = 'Initializing...';
        }
    } catch (error) {
        firebaseStatus.classList.remove('connected');
        firebaseText.textContent = 'Error';
        console.error('Firebase status check failed:', error);
    }
}

async function checkN8NStatus() {
    try {
        // Check N8N status via main process
        const status = await window.electronAPI.n8nStatus();
        
        if (status.success && status.running) {
            n8nStatus.classList.add('connected');
            n8nText.textContent = 'Running';
        } else {
            n8nStatus.classList.remove('connected');
            n8nText.textContent = 'Not Running';
        }
    } catch (error) {
        n8nStatus.classList.remove('connected');
        n8nText.textContent = 'Error';
        console.error('N8N status check failed:', error);
    }
}

async function checkOpenAIStatus() {
    try {
        // Check OpenAI status via main process
        const status = await window.electronAPI.openaiStatus();
        
        if (status.success && status.connected) {
            openaiStatus.classList.add('connected');
            openaiText.textContent = 'Connected';
        } else if (status.hasApiKey === false || status.error?.includes('API key')) {
            openaiStatus.classList.remove('connected');
            openaiText.textContent = 'API Key Missing';
        } else {
            openaiStatus.classList.remove('connected');
            openaiText.textContent = 'Error';
        }
    } catch (error) {
        openaiStatus.classList.remove('connected');
        openaiText.textContent = 'Error';
        console.error('OpenAI status check failed:', error);
    }
}

// Utility functions
function showNotification(message, type = 'info') {
    // Determine text colour based on theme
    const theme = getCurrentTheme();
    const txtColor = theme==='light'? '#1e1e1e' : '#ffffff';
    // Create a simple notification UI element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    const bg = type === 'error' ? '#ff6b6b' : type === 'success' ? '#51cf66' : '#339af0';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${bg};
        color: ${txtColor};
        border-radius: 8px;
        z-index: 1000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation styles if not already present
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
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

async function loadSettings(){
    const sCont=document.querySelector('#settings-page .welcome-card');
    if(!sCont) return;
    const current=localStorage.getItem('inboxPath')||'inbox';
    const theme = localStorage.getItem('theme')||'default';
    sCont.innerHTML=`<h2>Settings</h2>
    <p>Inbox Folder: <code>${current}</code></p>
    <button class="btn" id="change-inbox-btn">Change Inbox Folder</button>
    <hr style="margin:1rem 0;border-color:rgba(255,255,255,0.2)">
    <p>Theme:</p>
    <select id="theme-select" class="btn">
       <option value="default" ${theme==='default'?'selected':''}>Purple (Default)</option>
       <option value="light" ${theme==='light'?'selected':''}>Light</option>
       <option value="dark" ${theme==='dark'?'selected':''}>Dark</option>
    </select>`;

    document.getElementById('change-inbox-btn').addEventListener('click',async()=>{
        const folder=await window.electronAPI.chooseFolder();
        if(folder){
            localStorage.setItem('inboxPath',folder);
            showNotification('Inbox folder updated!','success');
            loadSettings();
        }
    });

    document.getElementById('theme-select').addEventListener('change',e=>{
        applyTheme(e.target.value);
        showNotification('Theme updated!','success');
        // If currently on analytics page, reload to apply chart theme
        const active=document.querySelector('.nav-item.active[data-page="analytics"]');
        if(active){
            loadAnalytics();
        }
    });
}

function applyTheme(theme){
    document.body.classList.remove('theme-dark','theme-light');
    if(theme==='dark') document.body.classList.add('theme-dark');
    else if(theme==='light') document.body.classList.add('theme-light');
    localStorage.setItem('theme',theme);
}

// === THEME HELPERS ===
function getCurrentTheme(){
    return document.body.classList.contains('theme-light') ? 'light' : 'dark';
}

function getChartThemeColors(){
    const theme=getCurrentTheme();
    const isLight = theme==='light';
    const textColor = isLight? '#1e1e1e' : '#f8f8f2';
    const gridColor = isLight? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
    const lineColor = isLight? '#4c6ef5' : '#00d8ff'; // purple for light, cyan for dark/default
    const lineFill = isLight? 'rgba(76,110,245,0.2)' : 'rgba(0,216,255,0.15)';
    return { textColor, gridColor, lineColor, lineFill };
}

// Export functions for potential use by other modules
window.receiptSorter = {
    switchPage,
    showNotification,
    formatCurrency,
    formatDate
}; 