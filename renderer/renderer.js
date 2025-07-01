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
    const aCont=document.querySelector('#analytics-page');
    if(!aCont) return;
    
    // Show loading state
    document.getElementById('total-spent').textContent = '$0';
    document.getElementById('total-receipts').textContent = '0';
    document.getElementById('avg-receipt').textContent = '$0';
    document.getElementById('top-category').textContent = '--';
    
    try{
        const receipts = await window.firebaseClient.getReceipts(1000);
        
        // Store data globally for theme switching
        window.currentAnalyticsData = receipts;
        
        // Set up date range filtering
        setupDateRangeFiltering(receipts);
        
        // Initial load with all data
        renderAnalytics(receipts, receipts);
        
    }catch(err){
        console.error('Analytics error:', err);
        showNotification('Error loading analytics data', 'error');
    }
}

function setupDateRangeFiltering(allReceipts) {
    const dateRangeBtns = document.querySelectorAll('.date-range-btn');
    
    dateRangeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            dateRangeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Filter data based on range
            const range = btn.dataset.range;
            const filteredReceipts = filterReceiptsByDateRange(allReceipts, range);
            renderAnalytics(filteredReceipts, allReceipts);
        });
    });
}

function filterReceiptsByDateRange(receipts, range) {
    if (range === 'all') return receipts;
    
    const days = parseInt(range);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return receipts.filter(r => {
        if (!r.date) return false;
        const receiptDate = parseReceiptDate(r.date);
        return receiptDate >= cutoffDate;
    });
}

function parseReceiptDate(dateInput) {
    if (dateInput && typeof dateInput === 'object' && typeof dateInput.toDate === 'function') {
        return dateInput.toDate();
    }
    return new Date(dateInput);
}

function renderAnalytics(receipts, allReceipts) {
    // Calculate basic stats
    const total = receipts.reduce((sum, r) => sum + (r.total || 0), 0);
    const count = receipts.length;
    const avg = count ? total / count : 0;
    
    // Calculate comparison stats (vs all time or previous period)
    const comparison = calculateComparisonStats(receipts, allReceipts);
    
    // Update stat cards
    updateStatCards(total, count, avg, receipts, comparison);
    
    // Render all charts
    renderAllCharts(receipts);
    
    // Generate insights
    generateSmartInsights(receipts, allReceipts);
}

function calculateComparisonStats(current, all) {
    if (current.length === all.length) {
        // If showing all data, compare with previous period
        return { totalChange: 0, countChange: 0, avgChange: 0 };
    }
    
    const currentTotal = current.reduce((sum, r) => sum + (r.total || 0), 0);
    const allTotal = all.reduce((sum, r) => sum + (r.total || 0), 0);
    const otherTotal = allTotal - currentTotal;
    
    const totalChange = otherTotal > 0 ? ((currentTotal - otherTotal) / otherTotal) * 100 : 0;
    const countChange = ((current.length - (all.length - current.length)) / Math.max(1, all.length - current.length)) * 100;
    const avgChange = totalChange - countChange;
    
    return { totalChange, countChange, avgChange };
}

function updateStatCards(total, count, avg, receipts, comparison) {
    document.getElementById('total-spent').textContent = formatCurrency(total);
    document.getElementById('total-receipts').textContent = count.toString();
    document.getElementById('avg-receipt').textContent = formatCurrency(avg);
    
    // Find top category
    const categoryTotals = {};
    receipts.forEach(r => {
        const cat = r.category || 'Uncategorized';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (r.total || 0);
    });
    const topCategory = Object.keys(categoryTotals).reduce((a, b) => 
        categoryTotals[a] > categoryTotals[b] ? a : b, 'None');
    document.getElementById('top-category').textContent = topCategory;
    
    // Update change indicators
    updateChangeIndicator('total-change', comparison.totalChange);
    updateChangeIndicator('receipts-change', comparison.countChange);
    updateChangeIndicator('avg-change', comparison.avgChange);
    updateChangeIndicator('category-change', 0); // Category change calculation would be complex
}

function updateChangeIndicator(elementId, changePercent) {
    const element = document.getElementById(elementId);
    if (changePercent === 0) {
        element.textContent = '--';
        element.className = 'stat-change';
    } else {
        const isPositive = changePercent > 0;
        element.textContent = `${isPositive ? '+' : ''}${changePercent.toFixed(1)}%`;
        element.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
    }
}

async function renderAllCharts(receipts) {
    await ensureChartReady();
    
    // Destroy existing charts
    destroyExistingCharts();
    
    const { textColor, gridColor, lineColor, lineFill } = getChartThemeColors();
    
    // 1. Spending Over Time (Line Chart)
    renderSpendingTimeChart(receipts, textColor, gridColor, lineColor, lineFill);
    
    // 2. Category Pie Chart
    renderCategoryPieChart(receipts, textColor);
    
    // 3. Monthly Trends
    renderMonthlyTrendsChart(receipts, textColor, gridColor);
    
    // 4. Top Vendors
    renderTopVendorsChart(receipts, textColor, gridColor);
    
    // 5. Daily Average
    renderDailyAverageChart(receipts, textColor, gridColor);
}

function renderSpendingTimeChart(receipts, textColor, gridColor, lineColor, lineFill) {
    const dailyTotals = {};
    receipts.forEach(r => {
        const d = parseReceiptDate(r.date);
        if (isNaN(d)) return;
        const key = d.toISOString().split('T')[0];
        dailyTotals[key] = (dailyTotals[key] || 0) + (r.total || 0);
    });
    
    const sortedDates = Object.keys(dailyTotals).sort();
    const dailyValues = sortedDates.map(d => Number(dailyTotals[d].toFixed(2)));
    
    const ctx = document.getElementById('spendingTimeChart').getContext('2d');
    window.analyticsCharts.timeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Daily Spending',
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
            plugins: { legend: { labels: { color: textColor } } },
            scales: {
                x: { ticks: { color: textColor }, grid: { color: gridColor } },
                y: { 
                    ticks: { color: textColor, callback: v => formatCurrency(v) },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

function renderCategoryPieChart(receipts, textColor) {
    const categoryTotals = {};
    receipts.forEach(r => {
        const cat = r.category || 'Uncategorized';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (r.total || 0);
    });
    
    const categories = Object.keys(categoryTotals);
    const values = categories.map(c => Number(categoryTotals[c].toFixed(2)));
    const colors = generateColors(categories.length);
    
    const ctx = document.getElementById('categoryPieChart').getContext('2d');
    window.analyticsCharts.categoryPieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    labels: { color: textColor },
                    position: 'bottom'
                }
            }
        }
    });
}

function renderMonthlyTrendsChart(receipts, textColor, gridColor) {
    const monthlyTotals = {};
    receipts.forEach(r => {
        const d = parseReceiptDate(r.date);
        if (isNaN(d)) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyTotals[key] = (monthlyTotals[key] || 0) + (r.total || 0);
    });
    
    const sortedMonths = Object.keys(monthlyTotals).sort();
    const monthlyValues = sortedMonths.map(m => Number(monthlyTotals[m].toFixed(2)));
    
    const ctx = document.getElementById('monthlyTrendsChart').getContext('2d');
    window.analyticsCharts.monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedMonths,
            datasets: [{
                label: 'Monthly Spending',
                data: monthlyValues,
                backgroundColor: 'rgba(76,110,245,0.6)',
                borderColor: '#4c6ef5',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: textColor } } },
            scales: {
                x: { ticks: { color: textColor }, grid: { color: gridColor } },
                y: { 
                    ticks: { color: textColor, callback: v => formatCurrency(v) },
                    grid: { color: gridColor }
                }
            }
        }
    });
}

function renderTopVendorsChart(receipts, textColor, gridColor) {
    const vendorTotals = {};
    receipts.forEach(r => {
        const vendor = r.vendor || 'Unknown';
        vendorTotals[vendor] = (vendorTotals[vendor] || 0) + (r.total || 0);
    });
    
    const sortedVendors = Object.entries(vendorTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    const vendors = sortedVendors.map(([vendor]) => vendor);
    const values = sortedVendors.map(([,total]) => Number(total.toFixed(2)));
    
    const ctx = document.getElementById('topVendorsChart').getContext('2d');
    window.analyticsCharts.vendorsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: vendors,
            datasets: [{
                label: 'Amount Spent',
                data: values,
                backgroundColor: generateColors(vendors.length),
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { 
                    ticks: { color: textColor, callback: v => formatCurrency(v) },
                    grid: { color: gridColor }
                },
                y: { ticks: { color: textColor }, grid: { color: gridColor } }
            }
        }
    });
}

function renderDailyAverageChart(receipts, textColor, gridColor) {
    // Calculate daily averages by day of week
    const dayTotals = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    receipts.forEach(r => {
        const d = parseReceiptDate(r.date);
        if (isNaN(d)) return;
        const dayOfWeek = d.getDay();
        dayTotals[dayOfWeek].push(r.total || 0);
    });
    
    const dayAverages = Object.keys(dayTotals).map(day => {
        const totals = dayTotals[day];
        return totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    });
    
    // Find max value for better scaling
    const maxValue = Math.max(...dayAverages);
    const suggestedMax = Math.ceil(maxValue / 10) * 10; // Round up to nearest 10
    
    // Get theme-appropriate colors with better contrast
    const theme = getCurrentTheme();
    const labelColor = theme === 'light' ? '#1e1e1e' : '#ffffff';
    const gridColorAlpha = theme === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)';
    const tickColor = theme === 'light' ? '#666666' : '#cccccc';
    
    const ctx = document.getElementById('dailyAverageChart').getContext('2d');
    window.analyticsCharts.dailyChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: dayNames,
            datasets: [{
                label: 'Avg Daily Spending',
                data: dayAverages,
                borderColor: '#4c6ef5',
                backgroundColor: 'rgba(76,110,245,0.15)',
                pointBackgroundColor: '#4c6ef5',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    display: false
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: suggestedMax > 0 ? suggestedMax : 100,
                    ticks: { 
                        color: tickColor,
                        stepSize: suggestedMax > 0 ? Math.ceil(suggestedMax / 5) : 20,
                        font: {
                            size: 11,
                            weight: '500'
                        },
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        },
                        backdropColor: 'transparent'
                    },
                    grid: { 
                        color: gridColorAlpha,
                        lineWidth: 1
                    },
                    pointLabels: { 
                        color: labelColor,
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        padding: 8
                    },
                    angleLines: { 
                        color: gridColorAlpha,
                        lineWidth: 1
                    }
                }
            },
            elements: {
                line: {
                    borderWidth: 3
                },
                point: {
                    hoverRadius: 7
                }
            }
        }
    });
}

function generateSmartInsights(receipts, allReceipts) {
    const insights = [];
    
    // Calculate various metrics for insights
    const total = receipts.reduce((sum, r) => sum + (r.total || 0), 0);
    const avgAmount = receipts.length > 0 ? total / receipts.length : 0;
    
    // Category analysis
    const categoryTotals = {};
    receipts.forEach(r => {
        const cat = r.category || 'Uncategorized';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (r.total || 0);
    });
    
    const topCategory = Object.keys(categoryTotals).reduce((a, b) => 
        categoryTotals[a] > categoryTotals[b] ? a : b, 'None');
    const topCategoryPercent = total > 0 ? (categoryTotals[topCategory] / total * 100).toFixed(1) : 0;
    
    // Vendor analysis
    const vendorCounts = {};
    receipts.forEach(r => {
        const vendor = r.vendor || 'Unknown';
        vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
    });
    const topVendor = Object.keys(vendorCounts).reduce((a, b) => 
        vendorCounts[a] > vendorCounts[b] ? a : b, 'None');
    
    // Generate insights
    if (receipts.length > 0) {
        insights.push({
            icon: 'info',
            text: `You have ${receipts.length} receipts with an average of ${formatCurrency(avgAmount)} per receipt.`
        });
        
        if (topCategory !== 'None') {
            insights.push({
                icon: 'info',
                text: `${topCategory} is your top spending category, accounting for ${topCategoryPercent}% of expenses.`
            });
        }
        
        if (topVendor !== 'None' && vendorCounts[topVendor] > 1) {
            insights.push({
                icon: 'info',
                text: `You shop most frequently at ${topVendor} with ${vendorCounts[topVendor]} visits.`
            });
        }
        
        // Spending pattern insights
        const recentReceipts = receipts.filter(r => {
            const d = parseReceiptDate(r.date);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return d >= weekAgo;
        });
        
        if (recentReceipts.length > 0) {
            const recentTotal = recentReceipts.reduce((sum, r) => sum + (r.total || 0), 0);
            const weeklyAvg = recentTotal / 7;
            insights.push({
                icon: weeklyAvg > avgAmount ? 'warning' : 'success',
                text: `Your daily average this week is ${formatCurrency(weeklyAvg)}.`
            });
        }
        
        // Large purchase detection
        const largePurchases = receipts.filter(r => r.total > avgAmount * 2);
        if (largePurchases.length > 0) {
            insights.push({
                icon: 'warning',
                text: `You have ${largePurchases.length} purchases above ${formatCurrency(avgAmount * 2)}.`
            });
        }
    } else {
        insights.push({
            icon: 'info',
            text: 'No receipts found for the selected time period.'
        });
    }
    
    // Render insights
    const container = document.getElementById('insights-container');
    container.innerHTML = insights.map(insight => `
        <div class="insight-item">
            <div class="insight-icon ${insight.icon}"></div>
            <span>${insight.text}</span>
        </div>
    `).join('');
}

function generateColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
        const hue = Math.floor((360 / count) * i);
        colors.push(`hsl(${hue}, 70%, 60%)`);
    }
    return colors;
}

async function ensureChartReady() {
    if (window.Chart) return;
    try {
        const mod = await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.esm.js');
        mod.Chart.register(...mod.registerables);
        window.Chart = mod.Chart;
    } catch (e) {
        console.error('Failed to load Chart.js', e);
        throw e;
    }
}

function destroyExistingCharts() {
    window.analyticsCharts = window.analyticsCharts || {};
    Object.values(window.analyticsCharts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    window.analyticsCharts = {};
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
            // Get current date range filter
            const activeRange = document.querySelector('.date-range-btn.active');
            if (activeRange && window.currentAnalyticsData) {
                const range = activeRange.dataset.range;
                const filteredReceipts = filterReceiptsByDateRange(window.currentAnalyticsData, range);
                renderAllCharts(filteredReceipts);
            }
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