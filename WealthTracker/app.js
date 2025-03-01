document.addEventListener('DOMContentLoaded', function() {
    // State management
    const state = {
        accounts: [],
        categories: [],
        currentMonth: new Date(),
        activeFilters: [], // Array of category IDs for filtering
        theme: 'light-mode'
    };

    // DOM Elements
    const domElements = {
        themeToggle: document.getElementById('theme-toggle'),
        monthYearDisplay: document.getElementById('month-year-display'),
        prevMonthBtn: document.getElementById('prev-month-btn'),
        nextMonthBtn: document.getElementById('next-month-btn'),
        currentMonthDisplay: document.getElementById('current-month-display'),
        totalNetWorth: document.getElementById('total-net-worth'),
        totalVariance: document.getElementById('total-variance'),
        categoriesContainer: document.getElementById('categories-container'),
        addAccountBtn: document.getElementById('add-account-btn'),
        modalContainer: document.getElementById('modal-container'),
        categoriesSidebar: document.getElementById('categories-sidebar'),
        categoriesBtn: document.getElementById('categories-btn'),
        sidebarTrigger: document.getElementById('sidebar-trigger'),
        categoriesList: document.getElementById('categories-list'),
        addCategoryBtn: document.getElementById('add-category-btn'),
        uploadJsonBtn: document.getElementById('upload-json-btn'),
        downloadJsonBtn: document.getElementById('download-json-btn'),
        jsonFileInput: document.getElementById('json-file-input'),
        filterBtn: document.getElementById('filter-btn'),
        filtersPanel: document.getElementById('filters-panel'),
        filterCategoriesList: document.getElementById('filter-categories-list')
    };

    // Utility functions
    const utils = {
        generateId: () => '_' + Math.random().toString(36).substring(2, 11),
        formatCurrency: (amount) => {
            return '£' + parseFloat(amount).toLocaleString('en-GB', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        },
        formatPercentage: (percentage) => {
            return percentage.toLocaleString('en-GB', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) + '%';
        },
        getMonthYearString: (date) => {
            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            return `${months[date.getMonth()]} ${date.getFullYear()}`;
        },
        getMonthYearKey: (date) => {
            return `${date.getFullYear()}-${date.getMonth() + 1}`;
        },
        getCurrentMonthKey: () => {
            return utils.getMonthYearKey(state.currentMonth);
        },
        getPreviousMonthKey: () => {
            const prevMonth = new Date(state.currentMonth);
            prevMonth.setMonth(prevMonth.getMonth() - 1);
            return utils.getMonthYearKey(prevMonth);
        },
        calculateVariance: (currentAmount, previousAmount) => {
            if (previousAmount === 0) return { amount: currentAmount, percentage: 100 };
            const varianceAmount = currentAmount - previousAmount;
            const variancePercentage = (varianceAmount / Math.abs(previousAmount)) * 100;
            return { amount: varianceAmount, percentage: variancePercentage };
        },
        parseMonthKey: (key) => {
            const [year, month] = key.split('-').map(Number);
            return new Date(year, month - 1, 1);
        },
        closeModal: () => {
            domElements.modalContainer.classList.add('hidden');
            domElements.modalContainer.querySelector('.modal-content').innerHTML = '';
        },
        closeSidebar: () => {
            domElements.categoriesSidebar.classList.add('hidden');
        },
        saveData: () => {
            const data = {
                accounts: state.accounts,
                categories: state.categories,
                theme: state.theme
            };
            try {
                const dataJson = JSON.stringify(data, null, 2);
                localStorage.setItem('wealth_tracker_data', dataJson);
            } catch (error) {
                console.error('Error saving data:', error);
                showModal({
                    title: 'Error',
                    content: `<p>There was an error saving your data: ${error.message}</p>`,
                    buttons: [{ text: 'OK', action: 'close', class: 'primary-btn' }]
                });
            }
        },
        loadData: () => {
            try {
                const savedData = localStorage.getItem('wealth_tracker_data');
                if (savedData) {
                    const data = JSON.parse(savedData);
                    state.accounts = data.accounts || [];
                    state.categories = data.categories || [];
                    if (data.theme) {
                        state.theme = data.theme;
                        document.body.className = state.theme;
                        updateThemeIcon();
                    }
                    if (state.categories.length === 0) {
                        // Add default categories if none exist
                        state.categories = [
                            { id: utils.generateId(), name: 'Bank Accounts', order: 1 },
                            { id: utils.generateId(), name: 'Investments', order: 2 },
                            { id: utils.generateId(), name: 'Savings', order: 3 },
                            { id: utils.generateId(), name: 'Debts', order: 4 }
                        ];
                    }
                }
            } catch (error) {
                console.error('Error loading data:', error);
            }
        },
        downloadData: () => {
            const data = {
                accounts: state.accounts,
                categories: state.categories
            };
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'wealth_tracker_data.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        },
        uploadData: (fileData) => {
            try {
                const data = JSON.parse(fileData);
                if (data.accounts && data.categories) {
                    state.accounts = data.accounts;
                    state.categories = data.categories;
                    utils.saveData();
                    renderAll();
                    return true;
                } else {
                    throw new Error('Invalid data format');
                }
            } catch (error) {
                console.error('Error parsing uploaded data:', error);
                showModal({
                    title: 'Error',
                    content: `<p>There was an error loading the uploaded file: ${error.message}</p>`,
                    buttons: [{ text: 'OK', action: 'close', class: 'primary-btn' }]
                });
                return false;
            }
        }
    };

    // Event listeners
    function setupEventListeners() {
        // Theme toggle
        domElements.themeToggle.addEventListener('click', toggleTheme);

        // Month navigation
        domElements.prevMonthBtn.addEventListener('click', navigateToPreviousMonth);
        domElements.nextMonthBtn.addEventListener('click', navigateToNextMonth);
        domElements.currentMonthDisplay.addEventListener('click', showMonthPicker);

        // Add account button
        domElements.addAccountBtn.addEventListener('click', showAddAccountModal);

        // Modal backdrop close
        domElements.modalContainer.querySelector('.modal-backdrop').addEventListener('click', utils.closeModal);

        // Categories management
        domElements.categoriesBtn.addEventListener('click', toggleCategoriesSidebar);
        domElements.categoriesSidebar.querySelector('.close-btn').addEventListener('click', utils.closeSidebar);
        domElements.categoriesSidebar.querySelector('.sidebar-backdrop').addEventListener('click', utils.closeSidebar);
        domElements.addCategoryBtn.addEventListener('click', showAddCategoryModal);

        // File operations
        domElements.uploadJsonBtn.addEventListener('click', () => domElements.jsonFileInput.click());
        domElements.downloadJsonBtn.addEventListener('click', utils.downloadData);
        domElements.jsonFileInput.addEventListener('change', handleFileUpload);

        // Filters
        domElements.filterBtn.addEventListener('click', toggleFiltersPanel);

        // Keyboard events
        document.addEventListener('keydown', handleKeydown);

        // Initialize sortable categories list
        new Sortable(domElements.categoriesList, {
            handle: '.sortable-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function() {
                updateCategoriesOrder();
            }
        });
    }

    // Theme functions
    function toggleTheme() {
        state.theme = document.body.classList.contains('light-mode') ? 'dark-mode' : 'light-mode';
        document.body.className = state.theme;
        updateThemeIcon();
        utils.saveData();
    }

    function updateThemeIcon() {
        const icon = domElements.themeToggle.querySelector('i');
        if (state.theme === 'dark-mode') {
            icon.className = 'fa-solid fa-lightbulb';
        } else {
            icon.className = 'fa-solid fa-lightbulb';
        }
    }

    // Navigation functions
    function navigateToPreviousMonth() {
        const newDate = new Date(state.currentMonth);
        newDate.setMonth(newDate.getMonth() - 1);
        state.currentMonth = newDate;
        updateMonthDisplay();
        renderAll();
    }

    function navigateToNextMonth() {
        const newDate = new Date(state.currentMonth);
        newDate.setMonth(newDate.getMonth() + 1);
        state.currentMonth = newDate;
        updateMonthDisplay();
        renderAll();
    }

    function updateMonthDisplay() {
        domElements.monthYearDisplay.textContent = utils.getMonthYearString(state.currentMonth);
    }

    function showMonthPicker() {
        const currentYear = state.currentMonth.getFullYear();
        const currentMonth = state.currentMonth.getMonth();
        
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        let monthsHtml = '';
        
        for (let i = 0; i < 12; i++) {
            const isCurrentMonth = i === currentMonth;
            monthsHtml += `
                <button class="month-btn ${isCurrentMonth ? 'current' : ''}" data-month="${i}">
                    ${months[i]}
                </button>
            `;
        }
        
        showModal({
            title: 'Select Month',
            content: `
                <div class="month-picker">
                    <button id="today-btn" class="btn primary-btn today-btn">Today</button>
                    <div class="year-navigation">
                        <button id="prev-year-btn" class="icon-btn"><i class="fas fa-chevron-left"></i></button>
                        <span class="year-display">${currentYear}</span>
                        <button id="next-year-btn" class="icon-btn"><i class="fas fa-chevron-right"></i></button>
                    </div>
                    <div class="months-grid">
                        ${monthsHtml}
                    </div>
                </div>
            `,
            buttons: [], 
            onShow: () => {
                const modal = domElements.modalContainer.querySelector('.modal-content');
                const yearDisplay = modal.querySelector('.year-display');
                const prevYearBtn = modal.querySelector('#prev-year-btn');
                const nextYearBtn = modal.querySelector('#next-year-btn');
                const monthBtns = modal.querySelectorAll('.month-btn');
                const todayBtn = modal.querySelector('#today-btn');
                
                let selectedYear = currentYear;
                
                prevYearBtn.addEventListener('click', () => {
                    selectedYear--;
                    yearDisplay.textContent = selectedYear;
                });
                
                nextYearBtn.addEventListener('click', () => {
                    selectedYear++;
                    yearDisplay.textContent = selectedYear;
                });
                
                monthBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const month = parseInt(btn.dataset.month);
                        state.currentMonth = new Date(selectedYear, month, 1);
                        updateMonthDisplay();
                        renderAll();
                        utils.closeModal();
                    });
                });
                
                todayBtn.addEventListener('click', () => {
                    state.currentMonth = new Date();
                    updateMonthDisplay();
                    renderAll();
                    utils.closeModal();
                });
            }
        });
    }

    // Categories management
    function toggleCategoriesSidebar() {
        domElements.categoriesSidebar.classList.toggle('visible');
        domElements.categoriesSidebar.classList.remove('hidden');
        renderCategoriesList();
    }

    function renderCategoriesList() {
        const categoriesSorted = [...state.categories].sort((a, b) => a.order - b.order);
        
        domElements.categoriesList.innerHTML = categoriesSorted.map(category => `
            <div class="category-item" data-id="${category.id}">
                <div class="category-item-name">
                    <span class="sortable-handle"><i class="fas fa-grip-lines"></i></span>
                    ${category.name}
                </div>
                <div class="category-actions">
                    <button class="category-action-btn edit" data-id="${category.id}" title="Edit Category">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="category-action-btn delete" data-id="${category.id}" title="Delete Category">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners to edit and delete buttons
        domElements.categoriesList.querySelectorAll('.category-action-btn.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const categoryId = btn.dataset.id;
                const category = state.categories.find(c => c.id === categoryId);
                if (category) {
                    showEditCategoryModal(category);
                }
            });
        });
        
        domElements.categoriesList.querySelectorAll('.category-action-btn.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const categoryId = btn.dataset.id;
                showDeleteCategoryConfirmation(categoryId);
            });
        });
    }

    function updateCategoriesOrder() {
        const categoryItems = domElements.categoriesList.querySelectorAll('.category-item');
        categoryItems.forEach((item, index) => {
            const categoryId = item.dataset.id;
            const category = state.categories.find(c => c.id === categoryId);
            if (category) {
                category.order = index + 1;
            }
        });
        utils.saveData();
    }

    function showAddCategoryModal() {
        showModal({
            title: 'Add Category',
            content: `
                <div class="form-group">
                    <label for="category-name" class="form-label">Category Name</label>
                    <input type="text" id="category-name" class="form-control" placeholder="Enter category name">
                </div>
            `,
            buttons: [
                { text: 'Cancel', action: 'close', class: 'secondary-btn' },
                { text: 'Add Category', action: 'add-category', class: 'primary-btn' }
            ],
            onAction: (action) => {
                if (action === 'add-category') {
                    const categoryName = document.getElementById('category-name').value.trim();
                    if (categoryName) {
                        const newCategory = {
                            id: utils.generateId(),
                            name: categoryName,
                            order: state.categories.length + 1
                        };
                        state.categories.push(newCategory);
                        utils.saveData();
                        renderCategoriesList();
                        renderAll();
                        return true; // Close the modal
                    } else {
                        alert('Please enter a category name');
                        return false; // Keep the modal open
                    }
                }
                return true; // Close the modal for other actions
            }
        });
    }

    function showEditCategoryModal(category) {
        showModal({
            title: 'Edit Category',
            content: `
                <div class="form-group">
                    <label for="category-name" class="form-label">Category Name</label>
                    <input type="text" id="category-name" class="form-control" value="${category.name}" placeholder="Enter category name">
                </div>
            `,
            buttons: [
                { text: 'Cancel', action: 'close', class: 'secondary-btn' },
                { text: 'Save Changes', action: 'save-category', class: 'primary-btn' }
            ],
            onAction: (action) => {
                if (action === 'save-category') {
                    const categoryName = document.getElementById('category-name').value.trim();
                    if (categoryName) {
                        category.name = categoryName;
                        utils.saveData();
                        renderCategoriesList();
                        renderAll();
                        return true; // Close the modal
                    } else {
                        alert('Please enter a category name');
                        return false; // Keep the modal open
                    }
                }
                return true; // Close the modal for other actions
            }
        });
    }

    function showDeleteCategoryConfirmation(categoryId) {
        const category = state.categories.find(c => c.id === categoryId);
        if (!category) return;
        
        // Check if category has accounts
        const hasAccounts = state.accounts.some(account => account.categoryId === categoryId);
        
        showModal({
            title: 'Delete Category',
            content: `
                <p>Are you sure you want to delete the category "${category.name}"?</p>
                ${hasAccounts ? '<p class="text-danger">Warning: This category contains accounts. Deleting it will remove the category from these accounts.</p>' : ''}
            `,
            buttons: [
                { text: 'Cancel', action: 'close', class: 'secondary-btn' },
                { text: 'Delete', action: 'delete-category', class: 'danger-btn' }
            ],
            onAction: (action) => {
                if (action === 'delete-category') {
                    // Update accounts that use this category
                    if (hasAccounts) {
                        state.accounts.forEach(account => {
                            if (account.categoryId === categoryId) {
                                // Find the first available category or create a new "Uncategorized" one
                                let defaultCategoryId = state.categories.find(c => c.id !== categoryId)?.id;
                                if (!defaultCategoryId) {
                                    const uncategorized = {
                                        id: utils.generateId(),
                                        name: 'Uncategorized',
                                        order: 1
                                    };
                                    state.categories.push(uncategorized);
                                    defaultCategoryId = uncategorized.id;
                                }
                                account.categoryId = defaultCategoryId;
                            }
                        });
                    }
                    
                    // Remove the category
                    state.categories = state.categories.filter(c => c.id !== categoryId);
                    
                    // Reorder remaining categories
                    state.categories.forEach((c, index) => {
                        c.order = index + 1;
                    });
                    
                    utils.saveData();
                    renderCategoriesList();
                    renderAll();
                }
                return true;
            }
        });
    }

    // Account management
    function showAddAccountModal() {
        if (state.categories.length === 0) {
            showModal({
                title: 'No Categories',
                content: '<p>You need to create at least one category before adding accounts.</p>',
                buttons: [
                    { text: 'Cancel', action: 'close', class: 'secondary-btn' },
                    { text: 'Create Category', action: 'create-category', class: 'primary-btn' }
                ],
                onAction: (action) => {
                    if (action === 'create-category') {
                        showAddCategoryModal();
                    }
                    return true;
                }
            });
            return;
        }
        
        const categoriesOptions = state.categories
            .sort((a, b) => a.order - b.order)
            .map(category => `<option value="${category.id}">${category.name}</option>`)
            .join('');
        
        showModal({
            title: 'Add Account',
            content: `
                <div class="form-group">
                    <label for="account-name" class="form-label">Account Name</label>
                    <input type="text" id="account-name" class="form-control" placeholder="Enter account name">
                </div>
                <div class="form-group">
                    <label for="account-category" class="form-label">Category</label>
                    <select id="account-category" class="form-control">
                        ${categoriesOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="account-initial-amount" class="form-label">Initial Amount</label>
                    <input type="number" id="account-initial-amount" class="form-control" placeholder="0.00" step="0.01">
                </div>
                <div class="form-group">
                    <label for="account-image-url" class="form-label">Image URL (Optional)</label>
                    <input type="text" id="account-image-url" class="form-control" placeholder="https://example.com/image.jpg">
                </div>
                <div class="form-group">
                    <label for="account-notes" class="form-label">Notes (Optional)</label>
                    <textarea id="account-notes" class="form-control" placeholder="Add notes about this account"></textarea>
                </div>
            `,
            buttons: [
                { text: 'Cancel', action: 'close', class: 'secondary-btn' },
                { text: 'Add Account', action: 'add-account', class: 'primary-btn' }
            ],
            onAction: (action) => {
                if (action === 'add-account') {
                    const accountName = document.getElementById('account-name').value.trim();
                    const categoryId = document.getElementById('account-category').value;
                    const initialAmount = parseFloat(document.getElementById('account-initial-amount').value) || 0;
                    const imageUrl = document.getElementById('account-image-url').value.trim();
                    const notes = document.getElementById('account-notes').value.trim();
                    
                    if (!accountName) {
                        alert('Please enter an account name');
                        return false;
                    }
                    
                    const currentMonthKey = utils.getCurrentMonthKey();
                    
                    const newAccount = {
                        id: utils.generateId(),
                        name: accountName,
                        categoryId: categoryId,
                        imageUrl: imageUrl,
                        notes: notes,
                        createdAt: currentMonthKey,
                        closedFrom: null,
                        values: {
                            [currentMonthKey]: initialAmount
                        }
                    };
                    
                    state.accounts.push(newAccount);
                    utils.saveData();
                    renderAll();
                    return true;
                }
                return true;
            }
        });
    }

    function showEditAccountModal(accountId) {
        const account = state.accounts.find(a => a.id === accountId);
        if (!account) return;
        
        const currentMonthKey = utils.getCurrentMonthKey();
        const currentValue = account.values[currentMonthKey] || 0;
        
        const categoriesOptions = state.categories
            .sort((a, b) => a.order - b.order)
            .map(category => `<option value="${category.id}" ${category.id === account.categoryId ? 'selected' : ''}>${category.name}</option>`)
            .join('');
        
        showModal({
            title: 'Edit Account',
            content: `
                <div class="form-group">
                    <label for="account-name" class="form-label">Account Name</label>
                    <input type="text" id="account-name" class="form-control" value="${account.name}" placeholder="Enter account name">
                </div>
                <div class="form-group">
                    <label for="account-category" class="form-label">Category</label>
                    <select id="account-category" class="form-control">
                        ${categoriesOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="account-amount" class="form-label">Current Amount</label>
                    <input type="number" id="account-amount" class="form-control" value="${currentValue}" placeholder="0.00" step="0.01">
                </div>
                <div class="form-group">
                    <label for="account-image-url" class="form-label">Image URL (Optional)</label>
                    <input type="text" id="account-image-url" class="form-control" value="${account.imageUrl || ''}" placeholder="https://example.com/image.jpg">
                </div>
                <div class="form-group">
                    <label for="account-notes" class="form-label">Notes (Optional)</label>
                    <textarea id="account-notes" class="form-control" placeholder="Add notes about this account">${account.notes || ''}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Account Status</label>
                    <div class="form-check">
                        <input type="checkbox" id="account-closed" class="form-check-input" ${account.closedFrom && account.closedFrom <= currentMonthKey ? 'checked' : ''}>
                        <label for="account-closed" class="form-check-label">Mark as Closed</label>
                    </div>
                </div>
            `,
            buttons: [
                { text: 'Save Changes', action: 'save-account', class: 'primary-btn' },
                { text: 'Duplicate', action: 'duplicate-account', class: 'warning-btn' },
                { text: 'Delete', action: 'delete-account', class: 'danger-btn' },
                { text: 'Cancel', action: 'close', class: 'secondary-btn' }
            ],
            onAction: (action) => {
                if (action === 'save-account') {
                    const accountName = document.getElementById('account-name').value.trim();
                    const categoryId = document.getElementById('account-category').value;
                    const amount = parseFloat(document.getElementById('account-amount').value) || 0;
                    const imageUrl = document.getElementById('account-image-url').value.trim();
                    const notes = document.getElementById('account-notes').value.trim();
                    const closed = document.getElementById('account-closed').checked;
                    
                    if (!accountName) {
                        alert('Please enter an account name');
                        return false;
                    }
                    
                    // Check if we're editing a past month
                    const isPastMonth = utils.parseMonthKey(currentMonthKey) < new Date() && 
                                      (utils.parseMonthKey(currentMonthKey).getMonth() !== new Date().getMonth() || 
                                       utils.parseMonthKey(currentMonthKey).getFullYear() !== new Date().getFullYear());
                    
                    if (isPastMonth && account.values[currentMonthKey] !== amount) {
                        return showPastMonthEditConfirmation(() => {
                            account.name = accountName;
                            account.categoryId = categoryId;
                            account.imageUrl = imageUrl;
                            account.notes = notes;
                            if (closed) {
                                account.closedFrom = currentMonthKey;
                            } else if (account.closedFrom && account.closedFrom <= currentMonthKey) {
                                delete account.closedFrom;
                            }
                            account.values[currentMonthKey] = amount;
                            utils.saveData();
                            renderAll();
                            return true;
                        });
                    } else {
                        account.name = accountName;
                        account.categoryId = categoryId;
                        account.imageUrl = imageUrl;
                        account.notes = notes;
                        if (closed) {
                            account.closedFrom = currentMonthKey;
                        } else if (account.closedFrom && account.closedFrom <= currentMonthKey) {
                            delete account.closedFrom;
                        }
                        account.values[currentMonthKey] = amount;
                        utils.saveData();
                        renderAll();
                        return true;
                    }
                } else if (action === 'delete-account') {
                    showDeleteAccountConfirmation(accountId);
                    return false; // Keep this modal open
                } else if (action === 'duplicate-account') {
                    duplicateAccount(accountId);
                    return true;
                }
                return true;
            }
        });
    }

    function showDeleteAccountConfirmation(accountId) {
        const account = state.accounts.find(a => a.id === accountId);
        if (!account) return;
        
        showModal({
            title: 'Delete Account',
            content: `<p>Are you sure you want to delete the account "${account.name}"? This action cannot be undone.</p>`,
            buttons: [
                { text: 'Cancel', action: 'close', class: 'secondary-btn' },
                { text: 'Delete', action: 'confirm-delete', class: 'danger-btn' }
            ],
            onAction: (action) => {
                if (action === 'confirm-delete') {
                    state.accounts = state.accounts.filter(a => a.id !== accountId);
                    utils.saveData();
                    renderAll();
                }
                return true;
            }
        });
    }

    function showPastMonthEditConfirmation(onConfirm) {
        showModal({
            title: 'Edit Past Month',
            content: `<p>You are editing data from a previous month. Do you want to proceed?</p>`,
            buttons: [
                { text: 'Cancel', action: 'close', class: 'secondary-btn' },
                { text: 'Proceed', action: 'confirm', class: 'primary-btn' }
            ],
            onAction: (action) => {
                if (action === 'confirm') {
                    return onConfirm();
                }
                return true;
            }
        });
        return false; // Keep the calling modal open
    }

    function duplicateAccount(accountId) {
        const account = state.accounts.find(a => a.id === accountId);
        if (!account) return;
        
        const currentMonthKey = utils.getCurrentMonthKey();
        
        const newAccount = {
            ...JSON.parse(JSON.stringify(account)),
            id: utils.generateId(),
            name: `${account.name} (Copy)`,
            createdAt: currentMonthKey,
            closedFrom: null
        };
        
        state.accounts.push(newAccount);
        utils.saveData();
        renderAll();
    }

    // Rendering functions
    function renderAll() {
        renderNetWorth();
        renderCategories();
        renderFilters();
    }

    function renderNetWorth() {
        const currentMonthKey = utils.getCurrentMonthKey();
        const previousMonthKey = utils.getPreviousMonthKey();
        
        // Filter accounts based on active filters and visibility conditions
        const visibleAccounts = state.accounts.filter(account => {
            // Check if account was created on or before the current month
            const accountCreatedAt = account.createdAt || '0000-0';
            const isCreatedBeforeOrOnCurrentMonth = accountCreatedAt <= currentMonthKey;
            
            // Check if account is not closed or was closed after the current month
            const isNotClosedForCurrentMonth = !account.closedFrom || account.closedFrom > currentMonthKey;
            
            // Check if account belongs to a filtered category (if filters are active)
            const matchesFilter = state.activeFilters.length === 0 || 
                                 state.activeFilters.includes(account.categoryId);
            
            return isCreatedBeforeOrOnCurrentMonth && isNotClosedForCurrentMonth && matchesFilter;
        });
        
        // Calculate total net worth
        const currentTotal = visibleAccounts.reduce((total, account) => {
            const amount = account.values[currentMonthKey] || 0;
            return total + amount;
        }, 0);
        
        // Calculate total for previous month (only include accounts visible in both months)
        const previousTotal = visibleAccounts.reduce((total, account) => {
            // Only include if the account existed in the previous month
            if (account.createdAt && account.createdAt <= previousMonthKey) {
                const amount = account.values[previousMonthKey] || 0;
                return total + amount;
            }
            return total;
        }, 0);
        
        // Calculate variance
        const variance = utils.calculateVariance(currentTotal, previousTotal);
        
        // Update DOM
        domElements.totalNetWorth.textContent = utils.formatCurrency(currentTotal);
        domElements.totalVariance.innerHTML = `
            <span class="amount">${variance.amount >= 0 ? '+' : ''}${utils.formatCurrency(variance.amount)}</span>
            <span class="percentage">(${variance.amount >= 0 ? '+' : ''}${utils.formatPercentage(variance.percentage)})</span>
        `;
        
        // Apply class based on variance
        domElements.totalVariance.className = 'variance';
        if (variance.amount > 0) {
            domElements.totalVariance.classList.add('positive');
        } else if (variance.amount < 0) {
            domElements.totalVariance.classList.add('negative');
        } else {
            domElements.totalVariance.classList.add('neutral');
        }
    }

    function renderCategories() {
        const currentMonthKey = utils.getCurrentMonthKey();
        const previousMonthKey = utils.getPreviousMonthKey();
        
        // Get visible accounts (not closed and created on or before current month)
        const visibleAccounts = state.accounts.filter(account => {
            const accountCreatedAt = account.createdAt || '0000-0';
            const isCreatedBeforeOrOnCurrentMonth = accountCreatedAt <= currentMonthKey;
            const isNotClosedForCurrentMonth = !account.closedFrom || account.closedFrom > currentMonthKey;
            
            // Check filters if they are active
            const matchesFilter = state.activeFilters.length === 0 || 
                                 state.activeFilters.includes(account.categoryId);
            
            return isCreatedBeforeOrOnCurrentMonth && isNotClosedForCurrentMonth && matchesFilter;
        });
        
        // Group accounts by category
        const categories = [...state.categories].sort((a, b) => a.order - b.order);
        const accountsByCategory = {};
        
        categories.forEach(category => {
            accountsByCategory[category.id] = visibleAccounts.filter(account => account.categoryId === category.id);
        });
        
        // Render each category with its accounts
        let categoriesHtml = '';
        
        categories.forEach(category => {
            const categoryAccounts = accountsByCategory[category.id] || [];
            
            // Skip empty categories
            if (categoryAccounts.length === 0 && state.activeFilters.length === 0) {
                return;
            }
            
            // Skip categories not in the active filters (if filters are active)
            if (state.activeFilters.length > 0 && !state.activeFilters.includes(category.id)) {
                return;
            }
            
            // Calculate category total for current month
            const categoryCurrentTotal = categoryAccounts.reduce((total, account) => {
                return total + (account.values[currentMonthKey] || 0);
            }, 0);
            
            // Calculate category total for previous month
            const categoryPreviousTotal = categoryAccounts.reduce((total, account) => {
                if (account.createdAt && account.createdAt <= previousMonthKey) {
                    return total + (account.values[previousMonthKey] || 0);
                }
                return total;
            }, 0);
            
            // Calculate variance
            const categoryVariance = utils.calculateVariance(categoryCurrentTotal, categoryPreviousTotal);
            
            // Generate accounts HTML
            const accountsHtml = categoryAccounts.map(account => {
                const currentAmount = account.values[currentMonthKey] || 0;
                
                // Calculate variance only if account existed in previous month
                let accountVariance = { amount: currentAmount, percentage: 100 };
                if (account.createdAt && account.createdAt <= previousMonthKey) {
                    const previousAmount = account.values[previousMonthKey] || 0;
                    accountVariance = utils.calculateVariance(currentAmount, previousAmount);
                }
                
                // Determine variance class
                let varianceClass = 'neutral';
                if (accountVariance.amount > 0) varianceClass = 'positive';
                if (accountVariance.amount < 0) varianceClass = 'negative';
                
                // Create account HTML
                return `
                    <li class="account-item" data-id="${account.id}">
                        <div class="account-details">
                            <span class="account-drag-handle"><i class="fas fa-grip-lines"></i></span>
                            <div class="account-image">
                                ${account.imageUrl ? 
                                    `<img src="${account.imageUrl}" alt="${account.name}" onerror="this.onerror=null; this.innerHTML='<i class=\'fas fa-university\'></i>';">` : 
                                    `<i class="fas fa-university"></i>`
                                }
                            </div>
                            <div class="account-info">
                                <span class="account-name">${account.name}</span>
                                ${account.notes ? `<span class="account-note">${account.notes}</span>` : ''}
                            </div>
                        </div>
                        <div class="account-value">
                            <span class="account-amount">${utils.formatCurrency(currentAmount)}</span>
                            <div class="variance ${varianceClass}">
                                <span class="amount">${accountVariance.amount >= 0 ? '+' : ''}${utils.formatCurrency(accountVariance.amount)}</span>
                                <span class="percentage">(${accountVariance.amount >= 0 ? '+' : ''}${utils.formatPercentage(accountVariance.percentage)})</span>
                            </div>
                        </div>
                    </li>
                `;
            }).join('');
            
            // Determine category variance class
            let categoryVarianceClass = 'neutral';
            if (categoryVariance.amount > 0) categoryVarianceClass = 'positive';
            if (categoryVariance.amount < 0) categoryVarianceClass = 'negative';
            
            // Create category HTML
            categoriesHtml += `
                <div class="category-container" data-id="${category.id}">
                    <div class="category-header">
                        <h3 class="category-name">${category.name}</h3>
                        <div class="category-amount">
                            <span class="category-total">${utils.formatCurrency(categoryCurrentTotal)}</span>
                            <div class="variance ${categoryVarianceClass}">
                                <span class="amount">${categoryVariance.amount >= 0 ? '+' : ''}${utils.formatCurrency(categoryVariance.amount)}</span>
                                <span class="percentage">(${categoryVariance.amount >= 0 ? '+' : ''}${utils.formatPercentage(categoryVariance.percentage)})</span>
                            </div>
                        </div>
                    </div>
                    <ul class="accounts-list" data-category-id="${category.id}">
                        ${accountsHtml}
                    </ul>
                </div>
            `;
        });
        
        domElements.categoriesContainer.innerHTML = categoriesHtml;
        
        // Add event listeners to account items
        document.querySelectorAll('.account-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger when clicking on the drag handle
                if (!e.target.closest('.account-drag-handle')) {
                    const accountId = item.dataset.id;
                    showEditAccountModal(accountId);
                }
            });
        });
        
        // Initialize sortable accounts lists
        document.querySelectorAll('.accounts-list').forEach(list => {
            new Sortable(list, {
                handle: '.account-drag-handle',
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: function(evt) {
                    // Optional: Save the new order of accounts
                    const categoryId = evt.to.dataset.categoryId;
                    // Update account order in the state if needed
                }
            });
        });
    }

    // Modal management
    function showModal(options) {
        const { title, content, buttons = [], onShow = null, onAction = null } = options;
        
        const modalContent = domElements.modalContainer.querySelector('.modal-content');
        
        modalContent.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="close-btn" data-action="close"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            ${buttons.length ? `
                <div class="modal-footer">
                    ${buttons.map(btn => `
                        <button class="btn ${btn.class || 'primary-btn'}" data-action="${btn.action}">${btn.text}</button>
                    `).join('')}
                </div>
            ` : ''}
        `;
        
        // Show the modal
        domElements.modalContainer.classList.remove('hidden');
        
        // Add event listeners to buttons
        modalContent.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'close') {
                    utils.closeModal();
                } else if (onAction) {
                    const shouldClose = onAction(action);
                    if (shouldClose) {
                        utils.closeModal();
                    }
                }
            });
        });
        
        // Call onShow callback if provided
        if (onShow) {
            onShow();
        }
    }

    // Filter management
    function toggleFiltersPanel() {
        domElements.filtersPanel.classList.toggle('hidden');
    }

    function renderFilters() {
        if (!domElements.filterCategoriesList) return;
        
        const categories = [...state.categories].sort((a, b) => a.order - b.order);
        
        const filtersHtml = categories.map(category => {
            const isChecked = state.activeFilters.length === 0 || state.activeFilters.includes(category.id);
            return `
                <div class="filter-checkbox-item">
                    <input type="checkbox" id="filter-${category.id}" data-category-id="${category.id}" ${isChecked ? 'checked' : ''}>
                    <label for="filter-${category.id}">${category.name}</label>
                </div>
            `;
        }).join('');
        
        domElements.filterCategoriesList.innerHTML = filtersHtml;
        
        // Add event listeners to checkboxes
        domElements.filterCategoriesList.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', handleFilterChange);
        });
    }

    function handleFilterChange() {
        // Get all checked categories
        const checkedFilters = Array.from(
            domElements.filterCategoriesList.querySelectorAll('input[type="checkbox"]:checked')
        ).map(checkbox => checkbox.dataset.categoryId);
        
        // If all are checked or none are checked, clear filters
        if (checkedFilters.length === state.categories.length || checkedFilters.length === 0) {
            state.activeFilters = [];
        } else {
            state.activeFilters = checkedFilters;
        }
        
        renderAll();
    }

    // File operations
    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const fileData = event.target.result;
            const success = utils.uploadData(fileData);
            if (success) {
                showModal({
                    title: 'Success',
                    content: '<p>Data successfully loaded.</p>',
                    buttons: [{ text: 'OK', action: 'close', class: 'primary-btn' }]
                });
            }
        };
        reader.readAsText(file);
        
        // Reset the file input
        e.target.value = '';
    }

    // Keyboard handling
    function handleKeydown(e) {
        if (e.key === 'Escape') {
            if (!domElements.modalContainer.classList.contains('hidden')) {
                utils.closeModal();
            } else if (!domElements.categoriesSidebar.classList.contains('hidden')) {
                utils.closeSidebar();
            }
        } else if (e.key === 'Enter') {
            if (!domElements.modalContainer.classList.contains('hidden')) {
                // Find the primary button in the modal and click it
                const primaryBtn = domElements.modalContainer.querySelector('.primary-btn');
                if (primaryBtn) {
                    primaryBtn.click();
                }
            }
        }
    }

    // Initialization
    function init() {
        utils.loadData();
        
        // Migrate account.closed to account.closedFrom if necessary
        state.accounts.forEach(account => {
            if (account.closed === true && !account.closedFrom) {
                account.closedFrom = utils.getCurrentMonthKey();
                delete account.closed;
            }
        });
        
        updateThemeIcon();
        updateMonthDisplay();
        setupEventListeners();
        renderAll();
    }

    init();
});