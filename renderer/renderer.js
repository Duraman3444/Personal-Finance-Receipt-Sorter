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
    const catGrid = document.querySelector('#categories-grid');
    if (!catGrid) return;
    
    catGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.6);"><p>Loading categories...</p></div>';
    
    try {
        // Get categories and receipts in parallel
        const [categories, receipts] = await Promise.all([
            window.firebaseClient.getCategories ? window.firebaseClient.getCategories() : [],
            window.firebaseClient.getReceipts(1000)
        ]);
        
        // Calculate spending totals and counts per category
        const categoryStats = {};
        const currentMonthStats = {};
        let maxSpending = 0;
        
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        receipts.forEach(r => {
            const cat = r.category || 'Uncategorized';
            if (!categoryStats[cat]) {
                categoryStats[cat] = { total: 0, count: 0 };
                currentMonthStats[cat] = { total: 0, count: 0 };
            }
            
            // All-time stats
            categoryStats[cat].total += (r.total || 0);
            categoryStats[cat].count += 1;
            maxSpending = Math.max(maxSpending, categoryStats[cat].total);
            
            // Current month stats for budget tracking
            const receiptDate = parseReceiptDate(r.date);
            if (receiptDate && 
                receiptDate.getMonth() === currentMonth && 
                receiptDate.getFullYear() === currentYear) {
                currentMonthStats[cat].total += (r.total || 0);
                currentMonthStats[cat].count += 1;
            }
        });
        
        // Create a comprehensive list of all categories (from database + from receipts)
        const allCategories = [...categories];
        const existingCategoryNames = new Set(categories.map(c => c.name));
        
        // Add categories found in receipts that don't exist in the database
        Object.keys(categoryStats).forEach(categoryName => {
            if (!existingCategoryNames.has(categoryName)) {
                allCategories.push({
                    id: `receipt-${categoryName.toLowerCase().replace(/\s+/g, '-')}`,
                    name: categoryName,
                    color: getColorForCategory(categoryName), // Smart color based on category name
                    icon: getEmojiForCategory(categoryName), // Smart emoji based on category name
                    isFromReceipts: true // Flag to identify these categories
                });
            }
        });
        
        if (allCategories.length === 0) {
            catGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <h3 style="color: rgba(255,255,255,0.8); margin-bottom: 1rem;">No Categories Yet</h3>
                    <p style="color: rgba(255,255,255,0.6); margin-bottom: 2rem;">Create your first spending category to get started!</p>
                    <button class="btn-add-category" onclick="openCategoryModal()">
                        <span>➕</span>
                        Add Your First Category
                    </button>
                </div>
            `;
            return;
        }
        
        // Sort categories: database categories first, then receipt-only categories
        allCategories.sort((a, b) => {
            if (a.isFromReceipts && !b.isFromReceipts) return 1;
            if (!a.isFromReceipts && b.isFromReceipts) return -1;
            return a.name.localeCompare(b.name);
        });
        
        // Generate category cards
        let html = '';
        allCategories.forEach(category => {
            const stats = categoryStats[category.name] || { total: 0, count: 0 };
            const monthlyStats = currentMonthStats[category.name] || { total: 0, count: 0 };
            const progressPercent = maxSpending > 0 ? (stats.total / maxSpending) * 100 : 0;
            
            // Budget calculations
            const hasBudget = category.monthlyBudget && category.monthlyBudget > 0;
            let budgetProgress = 0;
            let budgetStatus = 'safe';
            let budgetRemaining = 0;
            
            if (hasBudget) {
                budgetProgress = Math.min((monthlyStats.total / category.monthlyBudget) * 100, 100);
                budgetRemaining = category.monthlyBudget - monthlyStats.total;
                
                if (budgetProgress >= 100) {
                    budgetStatus = 'danger';
                } else if (budgetProgress >= 80) {
                    budgetStatus = 'warning';
                }
            }
            
            // Show actions for all categories with pencil button
            const categoryActions = category.isFromReceipts ? 
                `<div class="category-actions">
                    <button class="btn-category-action" onclick="event.stopPropagation(); editCategory('${category.id}')" title="Edit Category">
                        ✏️
                    </button>
                    <button class="btn-category-action" onclick="event.stopPropagation(); convertToManagedCategory('${category.name}')" title="Convert to Managed Category">
                        ➕
                    </button>
                </div>` :
                `<div class="category-actions">
                    <button class="btn-category-action" onclick="event.stopPropagation(); editCategory('${category.id}')" title="Edit Category">
                        ✏️
                    </button>
                    <button class="btn-category-action" onclick="event.stopPropagation(); deleteCategory('${category.id}')" title="Delete Category">
                        🗑️
                    </button>
                </div>`;
            
            const budgetSection = hasBudget ? `
                <div class="budget-section">
                    <div class="budget-info">
                        <span class="budget-label">Monthly Budget</span>
                        <span class="budget-amount">${formatCurrency(category.monthlyBudget)}</span>
                    </div>
                    <div class="budget-progress">
                        <div class="budget-progress-bar ${budgetStatus}" style="width: ${budgetProgress}%"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="budget-status ${budgetStatus}">
                            ${budgetProgress >= 100 ? 'Over Budget!' : 
                              budgetProgress >= 80 ? 'Near Limit' : 'On Track'}
                        </span>
                        <span class="budget-remaining">
                            ${budgetRemaining >= 0 ? 
                                `${formatCurrency(budgetRemaining)} left` : 
                                `${formatCurrency(Math.abs(budgetRemaining))} over`}
                        </span>
                    </div>
                    <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.5); margin-top: 0.25rem;">
                        Spent: ${formatCurrency(monthlyStats.total)} this month
                    </div>
                </div>` : '';
            
            html += `
                <div class="category-card ${category.isFromReceipts ? 'receipt-only-category' : ''}" data-category-id="${category.id}" data-category-name="${category.name}" data-category-color="${category.color}" data-category-icon="${category.icon}" onclick="openCategoryDetails('${category.id}')">
                    <div class="category-header">
                        <div class="category-icon-name">
                            <div class="category-icon" style="background-color: ${category.color}">
                                ${category.icon}
                            </div>
                            <h3 class="category-name">${category.name}${category.isFromReceipts ? ' (Auto)' : ''}</h3>
                        </div>
                        ${categoryActions}
                    </div>
                    <div class="category-stats">
                        <div class="category-amount">${formatCurrency(stats.total)}</div>
                        <div class="category-count">${stats.count} receipt${stats.count !== 1 ? 's' : ''}</div>
                    </div>
                    <div class="category-progress">
                        <div class="category-progress-bar" style="width: ${progressPercent}%"></div>
                    </div>
                    ${budgetSection}
                    ${category.subcategories && category.subcategories.length > 0 ? `
                        <div class="subcategories-section">
                            <div class="subcategories-label">Subcategories</div>
                            <div class="subcategories-list">
                                ${category.subcategories.map(sub => `<span class="subcategory-tag">${sub}</span>`).join('')}
                            </div>
                        </div>` : ''}
                </div>
            `;
        });
        
        catGrid.innerHTML = html;
        
        // Set up modal if not already done
        setupCategoryModal();
        
        // Set up budget overview
        setupBudgetOverview(allCategories, currentMonthStats);
        
        // Set up search and filter functionality
        setupCategorySearchAndFilter(allCategories, categoryStats, currentMonthStats, maxSpending);
        
        // Set up export functionality
        setupExportDropdown();
        
    } catch(err) {
        console.error('Error loading categories:', err);
        catGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <h3 style="color: #fa5252;">Error Loading Categories</h3>
                <p style="color: rgba(255,255,255,0.6);">Unable to load categories. Please try again.</p>
            </div>
        `;
    }
}

// Search and filter functionality for categories
function setupCategorySearchAndFilter(allCategories, categoryStats, currentMonthStats, maxSpending) {
    const searchInput = document.getElementById('category-search');
    const sortSelect = document.getElementById('sort-categories');
    const filterSelect = document.getElementById('filter-categories');
    
    if (!searchInput || !sortSelect || !filterSelect) return;
    
    let filteredCategories = [...allCategories];
    
    function applyFiltersAndSort() {
        const searchTerm = searchInput.value.toLowerCase();
        const sortBy = sortSelect.value;
        const filterBy = filterSelect.value;
        
        // Filter categories
        filteredCategories = allCategories.filter(category => {
            // Search filter
            if (searchTerm && !category.name.toLowerCase().includes(searchTerm)) {
                return false;
            }
            
            // Type filter
            if (filterBy === 'managed' && category.isFromReceipts) return false;
            if (filterBy === 'auto' && !category.isFromReceipts) return false;
            if (filterBy === 'with-budget' && (!category.monthlyBudget || category.monthlyBudget <= 0)) return false;
            if (filterBy === 'no-receipts') {
                const stats = categoryStats[category.name] || { count: 0 };
                if (stats.count > 0) return false;
            }
            if (filterBy === 'over-budget') {
                if (!category.monthlyBudget || category.monthlyBudget <= 0) return false;
                const monthlyStats = currentMonthStats[category.name] || { total: 0 };
                if (monthlyStats.total <= category.monthlyBudget) return false;
            }
            
            return true;
        });
        
        // Sort categories
        filteredCategories.sort((a, b) => {
            const aStats = categoryStats[a.name] || { total: 0, count: 0 };
            const bStats = categoryStats[b.name] || { total: 0, count: 0 };
            const aMonthlyStats = currentMonthStats[a.name] || { total: 0 };
            const bMonthlyStats = currentMonthStats[b.name] || { total: 0 };
            
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'amount-desc':
                    return bStats.total - aStats.total;
                case 'amount-asc':
                    return aStats.total - bStats.total;
                case 'receipts-desc':
                    return bStats.count - aStats.count;
                case 'receipts-asc':
                    return aStats.count - bStats.count;
                case 'budget-status':
                    // Sort by budget status: over budget > near limit > on track > no budget
                    const getBudgetSortValue = (cat, monthlyStats) => {
                        if (!cat.monthlyBudget || cat.monthlyBudget <= 0) return 0; // No budget
                        const progress = (monthlyStats.total / cat.monthlyBudget) * 100;
                        if (progress >= 100) return 4; // Over budget
                        if (progress >= 80) return 3; // Near limit
                        return 2; // On track
                    };
                    return getBudgetSortValue(b, bMonthlyStats) - getBudgetSortValue(a, aMonthlyStats);
                default:
                    // Default: managed categories first, then by name
                    if (a.isFromReceipts && !b.isFromReceipts) return 1;
                    if (!a.isFromReceipts && b.isFromReceipts) return -1;
                    return a.name.localeCompare(b.name);
            }
        });
        
        renderFilteredCategories();
    }
    
    function renderFilteredCategories() {
        const catGrid = document.querySelector('#categories-grid');
        if (!catGrid) return;
        
        if (filteredCategories.length === 0) {
            catGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <h3 style="color: rgba(255,255,255,0.8); margin-bottom: 1rem;">No Categories Found</h3>
                    <p style="color: rgba(255,255,255,0.6);">Try adjusting your search or filter settings.</p>
                </div>
            `;
            return;
        }
        
        // Generate HTML for filtered categories (reuse the same logic from loadCategories)
        let html = '';
        filteredCategories.forEach(category => {
            const stats = categoryStats[category.name] || { total: 0, count: 0 };
            const monthlyStats = currentMonthStats[category.name] || { total: 0, count: 0 };
            const progressPercent = maxSpending > 0 ? (stats.total / maxSpending) * 100 : 0;
            
            // Budget calculations
            const hasBudget = category.monthlyBudget && category.monthlyBudget > 0;
            let budgetProgress = 0;
            let budgetStatus = 'safe';
            let budgetRemaining = 0;
            
            if (hasBudget) {
                budgetProgress = Math.min((monthlyStats.total / category.monthlyBudget) * 100, 100);
                budgetRemaining = category.monthlyBudget - monthlyStats.total;
                
                if (budgetProgress >= 100) {
                    budgetStatus = 'danger';
                } else if (budgetProgress >= 80) {
                    budgetStatus = 'warning';
                }
            }
            
            // Show actions for all categories with pencil button
            const categoryActions = category.isFromReceipts ? 
                `<div class="category-actions">
                    <button class="btn-category-action" onclick="event.stopPropagation(); editCategory('${category.id}')" title="Edit Category">
                        ✏️
                    </button>
                    <button class="btn-category-action" onclick="event.stopPropagation(); convertToManagedCategory('${category.name}')" title="Convert to Managed Category">
                        ➕
                    </button>
                </div>` :
                `<div class="category-actions">
                    <button class="btn-category-action" onclick="event.stopPropagation(); editCategory('${category.id}')" title="Edit Category">
                        ✏️
                    </button>
                    <button class="btn-category-action" onclick="event.stopPropagation(); deleteCategory('${category.id}')" title="Delete Category">
                        🗑️
                    </button>
                </div>`;
            
            const budgetSection = hasBudget ? `
                <div class="budget-section">
                    <div class="budget-info">
                        <span class="budget-label">Monthly Budget</span>
                        <span class="budget-amount">${formatCurrency(category.monthlyBudget)}</span>
                    </div>
                    <div class="budget-progress">
                        <div class="budget-progress-bar ${budgetStatus}" style="width: ${budgetProgress}%"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="budget-status ${budgetStatus}">
                            ${budgetProgress >= 100 ? 'Over Budget!' : 
                              budgetProgress >= 80 ? 'Near Limit' : 'On Track'}
                        </span>
                        <span class="budget-remaining">
                            ${budgetRemaining >= 0 ? 
                                `${formatCurrency(budgetRemaining)} left` : 
                                `${formatCurrency(Math.abs(budgetRemaining))} over`}
                        </span>
                    </div>
                    <div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.5); margin-top: 0.25rem;">
                        Spent: ${formatCurrency(monthlyStats.total)} this month
                    </div>
                </div>` : '';
            
            html += `
                <div class="category-card ${category.isFromReceipts ? 'receipt-only-category' : ''}" data-category-id="${category.id}" data-category-name="${category.name}" data-category-color="${category.color}" data-category-icon="${category.icon}" onclick="openCategoryDetails('${category.id}')">
                    <div class="category-header">
                        <div class="category-icon-name">
                            <div class="category-icon" style="background-color: ${category.color}">
                                ${category.icon}
                            </div>
                            <h3 class="category-name">${category.name}${category.isFromReceipts ? ' (Auto)' : ''}</h3>
                        </div>
                        ${categoryActions}
                    </div>
                    <div class="category-stats">
                        <div class="category-amount">${formatCurrency(stats.total)}</div>
                        <div class="category-count">${stats.count} receipt${stats.count !== 1 ? 's' : ''}</div>
                    </div>
                    <div class="category-progress">
                        <div class="category-progress-bar" style="width: ${progressPercent}%"></div>
                    </div>
                    ${budgetSection}
                    ${category.subcategories && category.subcategories.length > 0 ? `
                        <div class="subcategories-section">
                            <div class="subcategories-label">Subcategories</div>
                            <div class="subcategories-list">
                                ${category.subcategories.map(sub => `<span class="subcategory-tag">${sub}</span>`).join('')}
                            </div>
                        </div>` : ''}
                </div>
            `;
        });
        
        catGrid.innerHTML = html;
    }
    
    // Set up event listeners
    searchInput.addEventListener('input', applyFiltersAndSort);
    sortSelect.addEventListener('change', applyFiltersAndSort);
    filterSelect.addEventListener('change', applyFiltersAndSort);
    
    // Apply initial filter/sort
    applyFiltersAndSort();
}

// Budget Overview functionality
function setupBudgetOverview(allCategories, currentMonthStats) {
    const budgetOverview = document.getElementById('budget-overview');
    const currentMonthName = document.getElementById('current-month-name');
    const totalBudgetEl = document.getElementById('total-budget');
    const totalSpentEl = document.getElementById('total-spent-budget');
    const totalRemainingEl = document.getElementById('total-remaining');
    const budgetCategoriesCountEl = document.getElementById('budget-categories-count');
    const budgetOverallBarEl = document.getElementById('budget-overall-bar');
    const budgetAlertsEl = document.getElementById('budget-alerts');
    
    if (!budgetOverview) return;
    
    // Calculate budget statistics
    const budgetCategories = allCategories.filter(cat => cat.monthlyBudget && cat.monthlyBudget > 0);
    
    if (budgetCategories.length === 0) {
        budgetOverview.style.display = 'none';
        return;
    }
    
    budgetOverview.style.display = 'block';
    
    // Set current month name
    const currentDate = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    currentMonthName.textContent = monthNames[currentDate.getMonth()];
    
    // Calculate totals
    let totalBudget = 0;
    let totalSpent = 0;
    const alerts = [];
    
    budgetCategories.forEach(category => {
        totalBudget += category.monthlyBudget;
        const monthlyStats = currentMonthStats[category.name] || { total: 0 };
        totalSpent += monthlyStats.total;
        
        // Check for budget alerts
        const progress = (monthlyStats.total / category.monthlyBudget) * 100;
        if (progress >= 100) {
            alerts.push({
                type: 'danger',
                message: `${category.name}: Over budget by ${formatCurrency(monthlyStats.total - category.monthlyBudget)}`
            });
        } else if (progress >= 80) {
            alerts.push({
                type: 'warning',
                message: `${category.name}: Near budget limit (${Math.round(progress)}%)`
            });
        }
    });
    
    const totalRemaining = totalBudget - totalSpent;
    const overallProgress = Math.min((totalSpent / totalBudget) * 100, 100);
    
    // Update display
    totalBudgetEl.textContent = formatCurrency(totalBudget);
    totalSpentEl.textContent = formatCurrency(totalSpent);
    totalRemainingEl.textContent = formatCurrency(totalRemaining);
    totalRemainingEl.style.color = totalRemaining >= 0 ? '#51cf66' : '#fa5252';
    budgetCategoriesCountEl.textContent = budgetCategories.length.toString();
    
    // Update overall progress bar
    budgetOverallBarEl.style.width = `${overallProgress}%`;
    budgetOverallBarEl.className = `budget-progress-bar ${
        overallProgress >= 100 ? 'danger' : 
        overallProgress >= 80 ? 'warning' : 'safe'
    }`;
    
    // Update alerts
    if (alerts.length > 0) {
        budgetAlertsEl.innerHTML = alerts.map(alert => 
            `<div class="budget-alert ${alert.type}">${alert.message}</div>`
        ).join('');
    } else {
        budgetAlertsEl.innerHTML = '<div style="color: #51cf66; font-size: 0.9rem;">🎉 All budgets are on track!</div>';
    }
}

// Export functionality
function setupExportDropdown() {
    console.log('Setting up export dropdown...');
    
    const exportBtn = document.getElementById('export-btn');
    const dropdown = exportBtn?.parentElement;
    const dropdownMenu = dropdown?.querySelector('.dropdown-menu');
    
    if (!exportBtn || !dropdown || !dropdownMenu) {
        console.error('Export dropdown elements not found:', { 
            exportBtn: !!exportBtn, 
            dropdown: !!dropdown, 
            dropdownMenu: !!dropdownMenu 
        });
        return;
    }
    
    console.log('Export dropdown elements found, setting up event listener');
    
    // Clear any existing click handlers
    exportBtn.onclick = null;
    exportBtn.removeAttribute('data-setup');
    
    // Add click handler
    exportBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Export button clicked!');
        
        // Toggle the dropdown
        const isCurrentlyOpen = dropdown.classList.contains('open');
        
        // Close all other dropdowns first
        document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
        
        if (!isCurrentlyOpen) {
            dropdown.classList.add('open');
            console.log('Dropdown opened');
        } else {
            dropdown.classList.remove('open');
            console.log('Dropdown closed');
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
        }
    });
    
    console.log('Export dropdown setup complete');
    
    // Add debug function for testing
    window.testDropdown = function() {
        console.log('Testing dropdown manually...');
        const btn = document.getElementById('export-btn');
        const dropdown = btn?.parentElement;
        const menu = dropdown?.querySelector('.dropdown-menu');
        
        console.log('Elements found:', { 
            button: !!btn, 
            dropdown: !!dropdown, 
            menu: !!menu 
        });
        
        if (dropdown) {
            dropdown.classList.toggle('open');
            console.log('Dropdown toggled, classes:', dropdown.className);
        }
    };
}

// Make export functions globally accessible
window.exportCategories = async function exportCategories(format) {
    try {
        // Close the dropdown
        document.querySelector('.dropdown').classList.remove('open');
        
        // Get categories and receipts data
        const [categories, receipts] = await Promise.all([
            window.firebaseClient.getCategories ? window.firebaseClient.getCategories() : [],
            window.firebaseClient.getReceipts(1000)
        ]);
        
        // Calculate statistics for each category
        const categoryStats = {};
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        receipts.forEach(r => {
            const cat = r.category || 'Uncategorized';
            if (!categoryStats[cat]) {
                categoryStats[cat] = { 
                    total: 0, 
                    count: 0, 
                    monthlyTotal: 0,
                    monthlyCount: 0
                };
            }
            
            categoryStats[cat].total += (r.total || 0);
            categoryStats[cat].count += 1;
            
            // Current month stats
            const receiptDate = parseReceiptDate(r.date);
            if (receiptDate && 
                receiptDate.getMonth() === currentMonth && 
                receiptDate.getFullYear() === currentYear) {
                categoryStats[cat].monthlyTotal += (r.total || 0);
                categoryStats[cat].monthlyCount += 1;
            }
        });
        
        // Combine categories with their stats
        const exportData = categories.map(category => ({
            name: category.name,
            color: category.color,
            icon: category.icon,
            monthlyBudget: category.monthlyBudget || null,
            subcategories: category.subcategories || [],
            totalSpent: categoryStats[category.name]?.total || 0,
            receiptCount: categoryStats[category.name]?.count || 0,
            monthlySpent: categoryStats[category.name]?.monthlyTotal || 0,
            monthlyReceiptCount: categoryStats[category.name]?.monthlyCount || 0,
            budgetStatus: category.monthlyBudget ? 
                ((categoryStats[category.name]?.monthlyTotal || 0) / category.monthlyBudget * 100).toFixed(1) + '%' : 
                'No Budget',
            averagePerReceipt: categoryStats[category.name]?.count ? 
                (categoryStats[category.name].total / categoryStats[category.name].count).toFixed(2) : '0.00',
            // Additional details for enhanced CSV
            monthlyRemaining: category.monthlyBudget ? (category.monthlyBudget - (categoryStats[category.name]?.monthlyTotal || 0)) : '',
            percentSpent: category.monthlyBudget ? (((categoryStats[category.name]?.monthlyTotal || 0) / category.monthlyBudget) * 100).toFixed(1) + '%' : ''
        }));
        
        if (format === 'csv') {
            exportAsCSV(exportData);
        } else if (format === 'json') {
            exportAsJSON(exportData);
        }
        
        showNotification(`Categories exported as ${format.toUpperCase()}!`, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Failed to export categories', 'error');
    }
}

function exportAsCSV(data) {
    const headers = [
        'Category Name',
        'Color',
        'Icon',
        'Monthly Budget',
        'Monthly Spent',
        'Monthly Remaining',
        '% Budget Spent',
        'Total Spent',
        'Receipt Count',
        'Monthly Receipts',
        'Budget Status',
        'Average per Receipt',
        'Subcategories'
    ];
    
    const csvContent = [
        headers.join(','),
        ...data.map(category => [
            `"${category.name}"`,
            category.color,
            category.icon,
            category.monthlyBudget || '',
            category.monthlySpent,
            category.monthlyRemaining,
            category.percentSpent,
            category.totalSpent,
            category.receiptCount,
            category.monthlyReceiptCount,
            `"${category.budgetStatus}"`,
            category.averagePerReceipt,
            `"${category.subcategories.join('; ')}"`
        ].join(','))
    ].join('\n');
    
    downloadFile(csvContent, 'categories-export.csv', 'text/csv');
}

function exportAsJSON(data) {
    const jsonContent = JSON.stringify({
        exportDate: new Date().toISOString(),
        categories: data
    }, null, 2);
    
    downloadFile(jsonContent, 'categories-export.json', 'application/json');
}

window.exportBudgetReport = async function exportBudgetReport() {
    try {
        // Close the dropdown
        document.querySelector('.dropdown').classList.remove('open');
        
        // Get categories and receipts data
        const [categories, receipts] = await Promise.all([
            window.firebaseClient.getCategories ? window.firebaseClient.getCategories() : [],
            window.firebaseClient.getReceipts(1000)
        ]);
        
        // Filter categories with budgets
        const budgetCategories = categories.filter(cat => cat.monthlyBudget && cat.monthlyBudget > 0);
        
        if (budgetCategories.length === 0) {
            showNotification('No categories with budgets found', 'warning');
            return;
        }
        
        // Calculate current month statistics
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
        
        const categoryStats = {};
        receipts.forEach(r => {
            const cat = r.category || 'Uncategorized';
            if (!categoryStats[cat]) {
                categoryStats[cat] = { total: 0, count: 0 };
            }
            
            const receiptDate = parseReceiptDate(r.date);
            if (receiptDate && 
                receiptDate.getMonth() === currentMonth && 
                receiptDate.getFullYear() === currentYear) {
                categoryStats[cat].total += (r.total || 0);
                categoryStats[cat].count += 1;
            }
        });
        
        // Generate HTML report
        const reportData = budgetCategories.map(category => {
            const stats = categoryStats[category.name] || { total: 0, count: 0 };
            const progress = (stats.total / category.monthlyBudget) * 100;
            const remaining = category.monthlyBudget - stats.total;
            
            return {
                name: category.name,
                budget: category.monthlyBudget,
                spent: stats.total,
                remaining: remaining,
                progress: progress,
                status: progress >= 100 ? 'Over Budget' : 
                        progress >= 80 ? 'Near Limit' : 'On Track',
                receiptCount: stats.count
            };
        });
        
        const totalBudget = budgetCategories.reduce((sum, cat) => sum + cat.monthlyBudget, 0);
        const totalSpent = reportData.reduce((sum, cat) => sum + cat.spent, 0);
        const overallProgress = (totalSpent / totalBudget) * 100;
        
        const htmlReport = generateBudgetReportHTML(reportData, {
            monthName,
            totalBudget,
            totalSpent,
            totalRemaining: totalBudget - totalSpent,
            overallProgress
        });
        
        downloadFile(htmlReport, `budget-report-${monthName.replace(' ', '-').toLowerCase()}.html`, 'text/html');
        showNotification('Budget report exported!', 'success');
        
    } catch (error) {
        console.error('Budget report export error:', error);
        showNotification('Failed to export budget report', 'error');
    }
}

function generateBudgetReportHTML(reportData, summary) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Budget Report - ${summary.monthName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; }
        .summary-item { text-align: center; }
        .summary-value { font-size: 1.5em; font-weight: bold; color: #2c3e50; }
        .summary-label { color: #7f8c8d; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #34495e; color: white; }
        .progress-bar { width: 100px; height: 10px; background: #ecf0f1; border-radius: 5px; }
        .progress-fill { height: 100%; border-radius: 5px; }
        .on-track { background: #27ae60; }
        .warning { background: #f39c12; }
        .danger { background: #e74c3c; }
        .status-on-track { color: #27ae60; font-weight: bold; }
        .status-warning { color: #f39c12; font-weight: bold; }
        .status-danger { color: #e74c3c; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Budget Report</h1>
        <h2>${summary.monthName}</h2>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="summary">
        <h3>Monthly Summary</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-value">${formatCurrency(summary.totalBudget)}</div>
                <div class="summary-label">Total Budget</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${formatCurrency(summary.totalSpent)}</div>
                <div class="summary-label">Total Spent</div>
            </div>
            <div class="summary-item">
                <div class="summary-value" style="color: ${summary.totalRemaining >= 0 ? '#27ae60' : '#e74c3c'}">${formatCurrency(summary.totalRemaining)}</div>
                <div class="summary-label">${summary.totalRemaining >= 0 ? 'Remaining' : 'Over Budget'}</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${summary.overallProgress.toFixed(1)}%</div>
                <div class="summary-label">Overall Progress</div>
            </div>
        </div>
    </div>
    
    <h3>Category Breakdown</h3>
    <table>
        <thead>
            <tr>
                <th>Category</th>
                <th>Budget</th>
                <th>Spent</th>
                <th>Remaining</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Receipts</th>
            </tr>
        </thead>
        <tbody>
            ${reportData.map(cat => `
                <tr>
                    <td><strong>${cat.name}</strong></td>
                    <td>${formatCurrency(cat.budget)}</td>
                    <td>${formatCurrency(cat.spent)}</td>
                    <td style="color: ${cat.remaining >= 0 ? '#27ae60' : '#e74c3c'}">${formatCurrency(cat.remaining)}</td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill ${cat.progress >= 100 ? 'danger' : cat.progress >= 80 ? 'warning' : 'on-track'}" 
                                 style="width: ${Math.min(cat.progress, 100)}%"></div>
                        </div>
                        ${cat.progress.toFixed(1)}%
                    </td>
                    <td class="status-${cat.progress >= 100 ? 'danger' : cat.progress >= 80 ? 'warning' : 'on-track'}">${cat.status}</td>
                    <td>${cat.receiptCount}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

function formatDate(dateInput) {
    // Handle Firebase Timestamp objects
    let date;
    if (dateInput && typeof dateInput === 'object' && typeof dateInput.toDate === 'function') {
        date = dateInput.toDate();
    } else {
        date = new Date(dateInput);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }
    
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

// Category Management Functions
let currentEditingCategoryId = null;
const CATEGORY_COLORS = [
    '#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140',
    '#a8edea', '#ff9a9e', '#fecfef', '#ffecd2', '#fcb69f', '#c471ed',
    '#12c2e9', '#f64f59', '#c21500', '#ffc3a0', '#ff677d', '#f093fb'
];

const CATEGORY_ICONS = [
    '🛒', '🍽️', '⛽', '🛍️', '⚡', '🏥', '🎬', '🏠', '🚗', '📱',
    '💊', '🎓', '✈️', '🏋️', '🐕', '💰', '🎵', '🍔', '☕', '📄'
];

// Smart emoji mapping for auto-detected categories
function getEmojiForCategory(categoryName) {
    const name = categoryName.toLowerCase();
    
    // Food & Dining
    if (name.includes('restaurant') || name.includes('dining') || name.includes('food')) return '🍽️';
    if (name.includes('fast food') || name.includes('burger') || name.includes('pizza')) return '🍔';
    if (name.includes('coffee') || name.includes('cafe') || name.includes('starbucks')) return '☕';
    if (name.includes('bar') || name.includes('pub') || name.includes('brewery')) return '🍺';
    if (name.includes('ice cream') || name.includes('dessert')) return '🍦';
    
    // Shopping & Retail
    if (name.includes('grocery') || name.includes('supermarket') || name.includes('food store')) return '🛒';
    if (name.includes('shopping') || name.includes('retail') || name.includes('store')) return '🛍️';
    if (name.includes('clothing') || name.includes('apparel') || name.includes('fashion')) return '👕';
    if (name.includes('beauty') || name.includes('cosmetic') || name.includes('makeup')) return '💄';
    if (name.includes('pharmacy') || name.includes('drug') || name.includes('cvs') || name.includes('walgreens')) return '💊';
    if (name.includes('books') || name.includes('bookstore')) return '📚';
    
    // Transportation
    if (name.includes('gas') || name.includes('fuel') || name.includes('petrol')) return '⛽';
    if (name.includes('uber') || name.includes('lyft') || name.includes('taxi')) return '🚕';
    if (name.includes('parking') || name.includes('garage')) return '🅿️';
    if (name.includes('auto') || name.includes('car') || name.includes('vehicle')) return '🚗';
    if (name.includes('airline') || name.includes('flight') || name.includes('airport')) return '✈️';
    if (name.includes('train') || name.includes('subway') || name.includes('metro')) return '🚊';
    if (name.includes('bus') || name.includes('transit')) return '🚌';
    
    // Utilities & Services
    if (name.includes('electric') || name.includes('power') || name.includes('utility')) return '⚡';
    if (name.includes('water') || name.includes('sewer')) return '💧';
    if (name.includes('internet') || name.includes('wifi') || name.includes('broadband')) return '🌐';
    if (name.includes('phone') || name.includes('mobile') || name.includes('cellular')) return '📱';
    if (name.includes('insurance')) return '🛡️';
    if (name.includes('bank') || name.includes('atm') || name.includes('fee')) return '🏦';
    
    // Healthcare & Medical
    if (name.includes('health') || name.includes('medical') || name.includes('doctor')) return '🏥';
    if (name.includes('dental') || name.includes('dentist')) return '🦷';
    if (name.includes('vision') || name.includes('optical')) return '👓';
    if (name.includes('fitness') || name.includes('gym') || name.includes('sport')) return '🏋️';
    
    // Entertainment & Recreation
    if (name.includes('entertainment') || name.includes('movie') || name.includes('cinema')) return '🎬';
    if (name.includes('music') || name.includes('spotify') || name.includes('streaming')) return '🎵';
    if (name.includes('game') || name.includes('gaming')) return '🎮';
    if (name.includes('travel') || name.includes('hotel') || name.includes('vacation')) return '🏨';
    
    // Home & Garden
    if (name.includes('home improvement') || name.includes('hardware') || name.includes('depot')) return '🔨';
    if (name.includes('garden') || name.includes('plant') || name.includes('nursery')) return '🌱';
    if (name.includes('furniture') || name.includes('decor')) return '🪑';
    
    // Personal Care
    if (name.includes('pet') || name.includes('vet') || name.includes('animal')) return '🐕';
    if (name.includes('hair') || name.includes('salon') || name.includes('barber')) return '💇';
    if (name.includes('spa') || name.includes('massage')) return '💆';
    
    // Education & Office
    if (name.includes('education') || name.includes('school') || name.includes('university')) return '🎓';
    if (name.includes('office') || name.includes('supplies') || name.includes('stationery')) return '📎';
    
    // Technology & Electronics
    if (name.includes('electronics') || name.includes('tech') || name.includes('computer')) return '💻';
    if (name.includes('software') || name.includes('app') || name.includes('subscription')) return '💾';
    
    // Special categories
    if (name.includes('wholesale') || name.includes('bulk')) return '📦';
    if (name.includes('online') || name.includes('amazon') || name.includes('ebay')) return '🌐';
    if (name.includes('department store') || name.includes('target') || name.includes('walmart')) return '🏪';
    if (name.includes('uncategorized') || name.includes('other') || name.includes('misc')) return '📄';
    
    // Default fallback
    return '📄';
}

// Smart color mapping for auto-detected categories
function getColorForCategory(categoryName) {
    const name = categoryName.toLowerCase();
    
    // Food & Dining - Orange/Red tones
    if (name.includes('restaurant') || name.includes('dining') || name.includes('food')) return '#fd7e14';
    if (name.includes('fast food') || name.includes('burger') || name.includes('pizza')) return '#fa5252';
    if (name.includes('coffee') || name.includes('cafe')) return '#8b4513';
    if (name.includes('bar') || name.includes('pub') || name.includes('brewery')) return '#ffd43b';
    
    // Shopping & Retail - Pink/Purple tones
    if (name.includes('grocery') || name.includes('supermarket')) return '#51cf66';
    if (name.includes('shopping') || name.includes('retail') || name.includes('store')) return '#e64980';
    if (name.includes('clothing') || name.includes('apparel') || name.includes('fashion')) return '#d0bfff';
    if (name.includes('beauty') || name.includes('cosmetic')) return '#fcc2d7';
    if (name.includes('pharmacy') || name.includes('drug')) return '#51cf66';
    if (name.includes('books') || name.includes('bookstore')) return '#845ef7';
    
    // Transportation - Blue tones
    if (name.includes('gas') || name.includes('fuel') || name.includes('petrol')) return '#fa5252';
    if (name.includes('uber') || name.includes('lyft') || name.includes('taxi')) return '#ffd43b';
    if (name.includes('auto') || name.includes('car') || name.includes('vehicle')) return '#495057';
    if (name.includes('airline') || name.includes('flight') || name.includes('airport')) return '#339af0';
    if (name.includes('parking')) return '#6c757d';
    
    // Utilities & Services - Blue/Cyan tones
    if (name.includes('electric') || name.includes('power') || name.includes('utility')) return '#339af0';
    if (name.includes('water') || name.includes('sewer')) return '#1c7ed6';
    if (name.includes('internet') || name.includes('wifi') || name.includes('phone')) return '#364fc7';
    if (name.includes('insurance')) return '#4c6ef5';
    if (name.includes('bank') || name.includes('atm') || name.includes('fee')) return '#1864ab';
    
    // Healthcare & Medical - Green tones
    if (name.includes('health') || name.includes('medical') || name.includes('doctor')) return '#37b24d';
    if (name.includes('dental') || name.includes('dentist')) return '#40c057';
    if (name.includes('fitness') || name.includes('gym') || name.includes('sport')) return '#20c997';
    
    // Entertainment & Recreation - Purple tones
    if (name.includes('entertainment') || name.includes('movie') || name.includes('cinema')) return '#ae3ec9';
    if (name.includes('music') || name.includes('streaming')) return '#da77f2';
    if (name.includes('game') || name.includes('gaming')) return '#7c3aed';
    if (name.includes('travel') || name.includes('hotel') || name.includes('vacation')) return '#f783ac';
    
    // Home & Garden - Brown/Green tones
    if (name.includes('home improvement') || name.includes('hardware')) return '#e8590c';
    if (name.includes('garden') || name.includes('plant') || name.includes('nursery')) return '#74b816';
    if (name.includes('furniture') || name.includes('decor')) return '#a0522d';
    
    // Personal Care - Pink tones
    if (name.includes('pet') || name.includes('vet') || name.includes('animal')) return '#ffa8cc';
    if (name.includes('hair') || name.includes('salon') || name.includes('barber')) return '#ff8cc8';
    if (name.includes('spa') || name.includes('massage')) return '#d0bfff';
    
    // Education & Office - Dark blue tones
    if (name.includes('education') || name.includes('school') || name.includes('university')) return '#364fc7';
    if (name.includes('office') || name.includes('supplies')) return '#495057';
    
    // Technology & Electronics - Dark tones
    if (name.includes('electronics') || name.includes('tech') || name.includes('computer')) return '#495057';
    if (name.includes('software') || name.includes('app') || name.includes('subscription')) return '#6741d9';
    
    // Special categories
    if (name.includes('wholesale') || name.includes('bulk')) return '#8b5cf6';
    if (name.includes('online') || name.includes('amazon') || name.includes('ebay')) return '#0ea5e9';
    if (name.includes('department store') || name.includes('target') || name.includes('walmart')) return '#dc2626';
    if (name.includes('uncategorized') || name.includes('other') || name.includes('misc')) return '#868e96';
    
    // Default fallback
    return '#868e96';
}

function setupCategoryModal() {
    const modal = document.getElementById('category-modal');
    const addBtn = document.getElementById('add-category-btn');
    const closeBtn = document.getElementById('modal-close');
    const cancelBtn = document.getElementById('cancel-btn');
    const form = document.getElementById('category-form');
    
    if (!modal || !addBtn) return; // Exit if elements not found
    
    // Set up color and icon options
    setupColorOptions();
    setupIconOptions();
    
    // Event listeners
    addBtn.addEventListener('click', () => openCategoryModal());
    closeBtn?.addEventListener('click', () => closeCategoryModal());
    cancelBtn?.addEventListener('click', () => closeCategoryModal());
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeCategoryModal();
        }
    });
    
    // Form submission
    form?.addEventListener('submit', handleCategorySubmit);
}

function setupColorOptions() {
    const colorContainer = document.getElementById('color-options');
    if (!colorContainer) return;
    
    colorContainer.innerHTML = '';
    CATEGORY_COLORS.forEach(color => {
        const colorOption = document.createElement('div');
        colorOption.className = 'color-option';
        colorOption.style.backgroundColor = color;
        colorOption.dataset.color = color;
        colorOption.addEventListener('click', () => selectColor(color));
        colorContainer.appendChild(colorOption);
    });
    
    // Select first color by default
    selectColor(CATEGORY_COLORS[0]);
}

function setupIconOptions() {
    const iconContainer = document.getElementById('icon-options');
    if (!iconContainer) return;
    
    iconContainer.innerHTML = '';
    CATEGORY_ICONS.forEach(icon => {
        const iconOption = document.createElement('div');
        iconOption.className = 'icon-option';
        iconOption.textContent = icon;
        iconOption.dataset.icon = icon;
        iconOption.addEventListener('click', () => selectIcon(icon));
        iconContainer.appendChild(iconOption);
    });
    
    // Select first icon by default
    selectIcon(CATEGORY_ICONS[0]);
}

function selectColor(color) {
    // Remove previous selection
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selection to clicked color
    const selectedOption = document.querySelector(`[data-color="${color}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
}

function selectIcon(icon) {
    // Remove previous selection
    document.querySelectorAll('.icon-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selection to clicked icon
    const selectedOption = document.querySelector(`[data-icon="${icon}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
}

function openCategoryModal(categoryData = null) {
    console.log('openCategoryModal called with:', categoryData);
    const modal = document.getElementById('category-modal');
    const modalTitle = document.getElementById('modal-title');
    const categoryNameInput = document.getElementById('category-name');
    const budgetInput = document.getElementById('category-budget');
    const subcategoriesInput = document.getElementById('category-subcategories');
    const saveBtn = document.getElementById('save-btn');
    
    console.log('Modal elements found:', { modal, modalTitle, categoryNameInput, saveBtn });
    
    if (!modal) {
        console.error('Category modal not found in DOM');
        showNotification('Modal not found - please refresh the page', 'error');
        return;
    }
    
    // Reset form
    document.getElementById('category-form').reset();
    
    if (categoryData) {
        // Editing existing category
        currentEditingCategoryId = categoryData.id;
        modalTitle.textContent = 'Edit Category';
        categoryNameInput.value = categoryData.name;
        budgetInput.value = categoryData.monthlyBudget || '';
        subcategoriesInput.value = categoryData.subcategories ? categoryData.subcategories.join(', ') : '';
        saveBtn.textContent = 'Update Category';
        
        // Select the category's color and icon
        selectColor(categoryData.color);
        selectIcon(categoryData.icon);
    } else {
        // Adding new category
        currentEditingCategoryId = null;
        modalTitle.textContent = 'Add New Category';
        categoryNameInput.value = '';
        budgetInput.value = '';
        subcategoriesInput.value = '';
        saveBtn.textContent = 'Save Category';
        
        // Select default color and icon
        selectColor(CATEGORY_COLORS[0]);
        selectIcon(CATEGORY_ICONS[0]);
    }
    
    modal.style.display = 'block';
    categoryNameInput.focus();
}

function closeCategoryModal() {
    const modal = document.getElementById('category-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentEditingCategoryId = null;
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('category-name');
    const budgetInput = document.getElementById('category-budget');
    const subcategoriesInput = document.getElementById('category-subcategories');
    const selectedColor = document.querySelector('.color-option.selected')?.dataset.color;
    const selectedIcon = document.querySelector('.icon-option.selected')?.dataset.icon;
    
    if (!nameInput.value.trim() || !selectedColor || !selectedIcon) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    // Process subcategories
    const subcategoriesText = subcategoriesInput.value.trim();
    const subcategories = subcategoriesText ? 
        subcategoriesText.split(',').map(sub => sub.trim()).filter(sub => sub) : [];
    
    const categoryData = {
        name: nameInput.value.trim(),
        color: selectedColor,
        icon: selectedIcon,
        monthlyBudget: budgetInput.value ? parseFloat(budgetInput.value) : null,
        subcategories: subcategories
    };
    
    try {
        if (currentEditingCategoryId) {
            // Update existing category
            await window.firebaseClient.updateCategory(currentEditingCategoryId, categoryData);
            showNotification('Category updated successfully!', 'success');
        } else {
            // Add new category
            await window.firebaseClient.addCategory(categoryData);
            showNotification('Category added successfully!', 'success');
        }
        
        closeCategoryModal();
        loadCategories(); // Refresh the categories display
        
    } catch (error) {
        console.error('Error saving category:', error);
        showNotification('Error saving category. Please try again.', 'error');
    }
}

async function editCategory(categoryId) {
    console.log('Edit category clicked for ID:', categoryId);
    try {
        // Find the category data from the current display using data attributes
        const categoryCard = document.querySelector(`[data-category-id="${categoryId}"]`);
        console.log('Found category card:', categoryCard);
        
        if (!categoryCard) {
            console.error('Category card not found for ID:', categoryId);
            showNotification('Category not found', 'error');
            return;
        }
        
        const categoryData = {
            id: categoryId,
            name: categoryCard.dataset.categoryName,
            color: categoryCard.dataset.categoryColor,
            icon: categoryCard.dataset.categoryIcon
        };
        
        console.log('Category data:', categoryData);
        
        openCategoryModal(categoryData);
        
    } catch (error) {
        console.error('Error editing category:', error);
        showNotification('Error loading category data', 'error');
    }
}

async function deleteCategory(categoryId) {
    try {
        // Get the category name for confirmation
        const categoryCard = document.querySelector(`[data-category-id="${categoryId}"]`);
        const categoryName = categoryCard?.querySelector('.category-name')?.textContent || 'this category';
        
        // Confirm deletion
        const confirmed = confirm(`Are you sure you want to delete "${categoryName}"?\n\nThis action cannot be undone. Any receipts in this category will be marked as "Uncategorized".`);
        
        if (!confirmed) return;
        
        await window.firebaseClient.deleteCategory(categoryId);
        showNotification('Category deleted successfully!', 'success');
        loadCategories(); // Refresh the categories display
        
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('Error deleting category. Please try again.', 'error');
    }
}

async function convertToManagedCategory(categoryName) {
    try {
        // Open the category modal with the name pre-filled and smart emoji/color
        const categoryData = {
            name: categoryName,
            color: getColorForCategory(categoryName), // Smart color based on category name
            icon: getEmojiForCategory(categoryName) // Smart emoji based on category name
        };
        
        // Confirm the conversion
        const confirmed = confirm(`Convert "${categoryName}" to a managed category?\n\nThis will allow you to customize its color, icon, and other properties.`);
        
        if (!confirmed) return;
        
        openCategoryModal(categoryData);
        
    } catch (error) {
        console.error('Error converting category:', error);
        showNotification('Error converting category. Please try again.', 'error');
    }
}

// Category Details Functions
let currentCategoryDetails = null;
let allReceiptsForCategory = [];
let allCategoriesForDropdown = [];

async function openCategoryDetails(categoryId) {
    console.log('📂 Opening category details for ID:', categoryId);
    try {
        const categoryCard = document.querySelector(`[data-category-id="${categoryId}"]`);
        console.log('Found category card:', categoryCard);
        if (!categoryCard) {
            console.error('Category card not found for ID:', categoryId);
            showNotification('Category not found', 'error');
            return;
        }
        
        currentCategoryDetails = {
            id: categoryId,
            name: categoryCard.dataset.categoryName,
            color: categoryCard.dataset.categoryColor,
            icon: categoryCard.dataset.categoryIcon
        };
        
        const modal = document.getElementById('category-details-modal');
        const title = document.getElementById('details-modal-title');
        const icon = document.getElementById('details-category-icon');
        
        // Set up modal header
        title.textContent = `${currentCategoryDetails.name} Details`;
        icon.textContent = currentCategoryDetails.icon;
        icon.style.backgroundColor = currentCategoryDetails.color;
        
        // Show modal
        console.log('📖 Opening modal for category:', currentCategoryDetails.name);
        modal.style.display = 'block';
        
        // Load data
        console.log('📊 Loading category details data...');
        await loadCategoryDetails();
        
        // Set up event listeners if not already done
        setupCategoryDetailsModal();
        
    } catch (error) {
        console.error('Error opening category details:', error);
        showNotification('Error loading category details', 'error');
    }
}

function setupCategoryDetailsModal() {
    const modal = document.getElementById('category-details-modal');
    const closeBtn = document.getElementById('details-modal-close');
    const searchInput = document.getElementById('receipt-search');
    const showAllBtn = document.getElementById('show-all-receipts');
    const addReceiptBtn = document.getElementById('add-receipt-to-category');
    
    // Remove existing event listeners to prevent duplicates
    closeBtn?.removeEventListener('click', closeCategoryDetails);
    modal?.removeEventListener('click', handleModalClick);
    searchInput?.removeEventListener('input', handleReceiptSearch);
    showAllBtn?.removeEventListener('click', showAllReceipts);
    addReceiptBtn?.removeEventListener('click', showAddReceiptDialog);
    
    // Add event listeners
    closeBtn?.addEventListener('click', closeCategoryDetails);
    modal?.addEventListener('click', handleModalClick);
    searchInput?.addEventListener('input', handleReceiptSearch);
    showAllBtn?.addEventListener('click', showAllReceipts);
    addReceiptBtn?.addEventListener('click', showAddReceiptDialog);
}

function handleModalClick(e) {
    if (e.target.id === 'category-details-modal') {
        closeCategoryDetails();
    }
}

function closeCategoryDetails() {
    const modal = document.getElementById('category-details-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentCategoryDetails = null;
    allReceiptsForCategory = [];
}

async function loadCategoryDetails() {
    if (!currentCategoryDetails) return;
    
    try {
        // Load receipts and categories in parallel
        const [receipts, categories] = await Promise.all([
            window.firebaseClient.getReceipts(1000),
            window.firebaseClient.getCategories()
        ]);
        
        // Filter receipts for this category
        const categoryReceipts = receipts.filter(r => r.category === currentCategoryDetails.name);
        console.log(`📋 Found ${categoryReceipts.length} receipts for category "${currentCategoryDetails.name}"`);
        console.log('Category receipts:', categoryReceipts);
        
        allReceiptsForCategory = categoryReceipts;
        allCategoriesForDropdown = categories;
        
        // Update stats
        updateCategoryStats(categoryReceipts);
        
        // Update receipts list
        renderCategoryReceipts(categoryReceipts);
        
    } catch (error) {
        console.error('Error loading category details:', error);
        showNotification('Error loading category data', 'error');
    }
}

function updateCategoryStats(receipts) {
    const totalAmount = receipts.reduce((sum, r) => sum + (r.total || 0), 0);
    const receiptCount = receipts.length;
    const avgAmount = receiptCount > 0 ? totalAmount / receiptCount : 0;
    
    document.getElementById('category-total-amount').textContent = formatCurrency(totalAmount);
    document.getElementById('category-receipt-count').textContent = receiptCount.toString();
    document.getElementById('category-avg-amount').textContent = formatCurrency(avgAmount);
}

function renderCategoryReceipts(receipts) {
    const container = document.getElementById('category-receipts-list');
    if (!container) return;
    
    if (receipts.length === 0) {
        container.innerHTML = `
            <div class="empty-receipts">
                <h3>No receipts in this category yet</h3>
                <p>Click "Show All Receipts" below to see unassigned receipts that you can add to this category.</p>
                <p>Or wait for new receipts to be processed and categorized automatically.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    receipts.forEach(receipt => {
        const date = receipt.date ? formatDate(receipt.date) : 'Unknown Date';
        html += `
            <div class="receipt-item" data-receipt-id="${receipt.id}">
                <div class="receipt-info">
                    <div class="receipt-vendor">${receipt.vendor || 'Unknown Vendor'}</div>
                    <div class="receipt-details">
                        <span>${date}</span>
                        <span>${receipt.payment_method || 'Unknown Payment'}</span>
                    </div>
                </div>
                <div class="receipt-amount">${formatCurrency(receipt.total || 0)}</div>
                <div class="receipt-actions">
                    <select class="category-select" onchange="moveReceiptToCategory('${receipt.id}', this.value)">
                        <option value="">Move to...</option>
                        ${generateCategoryOptions(receipt.category)}
                    </select>
                    <button class="btn-receipt-action danger" onclick="removeReceiptFromCategory('${receipt.id}')">Remove</button>
                    <button class="btn-receipt-action danger" onclick="deleteReceipt('${receipt.id}')">Delete</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function generateCategoryOptions(currentCategory) {
    return allCategoriesForDropdown
        .filter(cat => cat.name !== currentCategory)
        .map(cat => `<option value="${cat.name}" style="color: #ffffff; background: #2c2c2c;">${cat.icon} ${cat.name}</option>`)
        .join('');
}

function handleReceiptSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    if (!searchTerm) {
        renderCategoryReceipts(allReceiptsForCategory);
        return;
    }
    
    const filteredReceipts = allReceiptsForCategory.filter(receipt => {
        const vendor = (receipt.vendor || '').toLowerCase();
        const date = (receipt.date || '').toLowerCase();
        const amount = (receipt.total || 0).toString();
        
        return vendor.includes(searchTerm) || 
               date.includes(searchTerm) || 
               amount.includes(searchTerm);
    });
    
    renderCategoryReceipts(filteredReceipts);
}

async function showAllReceipts() {
    try {
        const receipts = await window.firebaseClient.getReceipts(1000);
        const unassignedReceipts = receipts.filter(r => !r.category || r.category === 'Uncategorized');
        
        if (unassignedReceipts.length === 0) {
            showNotification('No unassigned receipts found', 'info');
            return;
        }
        
        // Show unassigned receipts with option to add to current category
        renderAddableReceipts(unassignedReceipts);
        
    } catch (error) {
        console.error('Error loading all receipts:', error);
        showNotification('Error loading receipts', 'error');
    }
}

function renderAddableReceipts(receipts) {
    const container = document.getElementById('category-receipts-list');
    
    let html = `
        <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <h4 style="color: var(--text-color, rgba(255,255,255,0.9)); margin: 0 0 0.5rem 0;">
                Unassigned Receipts (${receipts.length})
            </h4>
            <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 0.9rem;">
                Click "Add to ${currentCategoryDetails.name}" to assign receipts to this category.
            </p>
        </div>
    `;
    
    receipts.forEach(receipt => {
        const date = receipt.date ? formatDate(receipt.date) : 'Unknown Date';
        html += `
            <div class="receipt-item">
                <div class="receipt-info">
                    <div class="receipt-vendor">${receipt.vendor || 'Unknown Vendor'}</div>
                    <div class="receipt-details">
                        <span>${date}</span>
                        <span>${receipt.payment_method || 'Unknown Payment'}</span>
                    </div>
                </div>
                <div class="receipt-amount">${formatCurrency(receipt.total || 0)}</div>
                <div class="receipt-actions">
                    <button class="btn-receipt-action" onclick="addReceiptToCurrentCategory('${receipt.id}')">
                        Add to ${currentCategoryDetails.name}
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function showAddReceiptDialog() {
    await showAllReceipts();
}

async function moveReceiptToCategory(receiptId, newCategory) {
    if (!newCategory) return;
    
    try {
        await window.firebaseClient.updateReceipt(receiptId, { category: newCategory });
        showNotification(`Receipt moved to ${newCategory}`, 'success');
        
        // Refresh the current category view
        await loadCategoryDetails();
        
    } catch (error) {
        console.error('Error moving receipt:', error);
        showNotification('Error moving receipt', 'error');
    }
}

async function removeReceiptFromCategory(receiptId) {
    try {
        await window.firebaseClient.updateReceipt(receiptId, { category: 'Uncategorized' });
        showNotification('Receipt removed from category', 'success');
        
        // Refresh the current category view
        await loadCategoryDetails();
        
    } catch (error) {
        console.error('Error removing receipt:', error);
        showNotification('Error removing receipt', 'error');
    }
}

async function addReceiptToCurrentCategory(receiptId) {
    if (!currentCategoryDetails) return;
    
    try {
        await window.firebaseClient.updateReceipt(receiptId, { category: currentCategoryDetails.name });
        showNotification(`Receipt added to ${currentCategoryDetails.name}`, 'success');
        
        // Refresh the current category view
        await loadCategoryDetails();
        
    } catch (error) {
        console.error('Error adding receipt to category:', error);
        showNotification('Error adding receipt to category', 'error');
    }
}

async function deleteReceipt(receiptId) {
    const confirmed = confirm('Are you sure you want to delete this receipt? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
        await window.firebaseClient.deleteReceipt(receiptId);
        showNotification('Receipt deleted successfully', 'success');
        
        // Refresh the current category view
        await loadCategoryDetails();
        
        // Also refresh the main categories page
        if (document.getElementById('categories-page').style.display !== 'none') {
            loadCategories();
        }
        
    } catch (error) {
        console.error('Error deleting receipt:', error);
        showNotification('Error deleting receipt', 'error');
    }
}

// Make functions globally accessible for onclick handlers
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.openCategoryModal = openCategoryModal;
window.openCategoryDetails = openCategoryDetails;
window.moveReceiptToCategory = moveReceiptToCategory;
window.removeReceiptFromCategory = removeReceiptFromCategory;
window.addReceiptToCurrentCategory = addReceiptToCurrentCategory;
window.deleteReceipt = deleteReceipt;

// Export functions for potential use by other modules
window.receiptSorter = {
    switchPage,
    showNotification,
    formatCurrency,
    formatDate,
    openCategoryModal,
    editCategory,
    deleteCategory,
    openCategoryDetails,
    moveReceiptToCategory,
    deleteReceipt
}; 