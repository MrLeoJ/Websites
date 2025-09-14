document.addEventListener('DOMContentLoaded', () => {
    const pantryTab = document.querySelector('.tab[data-tab="pantry"]');
    const shoppingTab = document.querySelector('.tab[data-tab="shopping"]');
    const pantryContent = document.getElementById('pantry-content');
    const shoppingContent = document.getElementById('shopping-content');
    const pantrySearchInput = document.getElementById('pantry-search');
    const shoppingSearchInput = document.getElementById('shopping-search');
    const pantryCategoriesContainer = document.getElementById('pantry-categories');
    const shoppingListContainer = document.getElementById('shopping-list');
    const storeModal = document.getElementById('store-modal');
    const closeStoreModalButton = document.getElementById('close-store-modal');
    const storeOptionsContainer = document.querySelector('.store-options');
    const removedItemsContainer = document.getElementById('removed-items-container');
    const removedItemsList = document.getElementById('removed-items-list');
    const removeAllRemovedButton = document.getElementById('remove-all-removed');
    const uploadDataButton = document.getElementById('upload-data');
    const downloadDataButton = document.getElementById('download-data');
    const uploadFile = document.getElementById('upload-file');
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarButton = document.getElementById('toggle-sidebar');
    const closeSidebarButton = document.getElementById('close-sidebar');
    const mainContainer = document.getElementById('main-container');
    const pantryCategorySelect = document.getElementById('pantry-category-select');
    const newPantryItemNameInput = document.getElementById('new-pantry-item-name');
    const newPantryItemUrlInput = document.getElementById('new-pantry-item-url');
    const newPantryItemImageInput = document.getElementById('new-pantry-item-image');
    const newPantryItemStockInput = document.getElementById('new-pantry-item-stock');
    const newPantryItemMinInput = document.getElementById('new-pantry-item-min');
    const newPantryItemMinUnitInput = document.getElementById('new-pantry-item-min-unit');
    const newPantryItemPriceInput = document.getElementById('new-pantry-item-price');
    const addPantryItemConfirmButton = document.getElementById('add-pantry-item-confirm-button');
    const cancelAddPantryItemButton = document.getElementById('cancel-add-pantry-item-button');
    const editItemModal = document.getElementById('edit-item-modal');
    const closeEditModalButton = document.getElementById('close-edit-modal');
    const editItemNameInput = document.getElementById('edit-item-name-input');
    const editItemUrlInput = document.getElementById('edit-item-url-input');
    const editItemImageInput = document.getElementById('edit-item-image-input');
    const editItemCategorySelect = document.getElementById('edit-item-category-select');
    const editItemStockInput = document.getElementById('edit-item-stock-input');
    const editItemMinInput = document.getElementById('edit-item-min-input');
    const editItemMinUnitInput = document.getElementById('edit-item-min-unit-input');
    const editItemPriceInput = document.getElementById('edit-item-price-input');
    const saveItemButton = document.getElementById('save-item-button');
    const cancelItemButton = document.getElementById('cancel-item-button');
    const addItemFab = document.getElementById('add-item-fab');
    const addPantryItemModal = document.getElementById('add-pantry-item-modal');
    const closeAddPantryItemModalButton = document.getElementById('close-add-pantry-item-modal');
    const messageModal = document.getElementById('message-modal');
    const messageText = document.getElementById('message-text');
    const okButton = document.getElementById('ok-button');
    const scrollToTopButton = document.getElementById('scroll-to-top');


    // Sidebar Elements - Categories and Stores
    const categoryList = document.getElementById('category-list');
    const newCategoryNameInput = document.getElementById('new-category-name');
    const addCategoryButton = document.getElementById('add-category-button');
    const storeList = document.getElementById('store-list');
    const newStoreNameInput = document.getElementById('new-store-name');
    const newStoreColorInput = document.getElementById('new-store-color');
    const addStoreButton = document.getElementById('add-store-button');


    let pantryData = [];
    let shoppingList = [];
    let removedItems = [];
    let stores = [];
    let selectedPantryItem = null;
    let draggingItem = null;
    let draggingCategory = null;
    let draggingStore = null;
    let draggingShoppingItem = null;
    let editModeCategory = null;
    let editModeStore = null;
    let currentEditItem = null;
    let currentMessageTimeout = null;
    let currentlySwipedItem = null;
    let lastDropTarget = null;


    // --- Data Loading and Saving Functions ---
    async function loadData() {
        try {
            const response = await fetch('data.json');
            const data = await response.json();

            pantryData = (data.pantryCategories || []).map(category => ({
                ...category,
                items: (category.items || []).map(item =>
                    typeof item === 'string'
                        ? { name: item, stock: 1, min: 1, minUnit: 'units', defaultStore: '', url: '', price: 0, image: '' }
                        : { ...item, minUnit: item.minUnit || 'units', defaultStore: item.defaultStore || '', url: item.url || '', price: item.price || 0, image: item.image || '' }
                )
            }));

            shoppingList = data.shoppingList || [];
            removedItems = data.removedItems || [];
            stores = data.stores || [];
            renderSidebarCategories();
            renderPantryCategories();
            renderShoppingList();
            renderRemovedItems();
            renderStoreButtons();
            renderSidebarStores();
            populatePantryCategorySelect();
            populateEditCategorySelect();
            populateAllStoreSelects();

        } catch (error) {
            console.error('Error loading data:', error);
            pantryData = [];
            shoppingList = [];
            removedItems = [];
            stores = [];
            renderSidebarCategories();
            renderPantryCategories();
            renderShoppingList();
            renderRemovedItems();
            renderStoreButtons();
            renderSidebarStores();
            populatePantryCategorySelect();
            populateEditCategorySelect();
            populateAllStoreSelects();
        }
    }

    function saveData() {
        const dataToSave = {
            pantryCategories: pantryData,
            shoppingList: shoppingList,
            removedItems: removedItems,
            stores: stores
        };
        return JSON.stringify(dataToSave, null, 2);
    }

    function downloadData() {
        const dataStr = saveData();
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = 'shopping-list-data.json';
        let linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        showMessage('Data downloaded successfully!');
    }

    function uploadData(file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const jsonData = JSON.parse(event.target.result);
                pantryData = (jsonData.pantryCategories || []).map(category => ({
                    ...category,
                    items: (category.items || []).map(item =>
                        typeof item === 'string'
                            ? { name: item, stock: 1, min: 1, minUnit: 'units', defaultStore: '', url: '', price: 0, image: '' }
                            : { ...item, minUnit: item.minUnit || 'units', defaultStore: item.defaultStore || '', url: item.url || '', price: item.price || 0, image: item.image || '' }
                    )
                }));
                shoppingList = jsonData.shoppingList || [];
                removedItems = jsonData.removedItems || [];
                stores = jsonData.stores || [];
                renderSidebarCategories();
                renderPantryCategories();
                renderShoppingList();
                renderRemovedItems();
                renderStoreButtons();
                renderSidebarStores();
                populatePantryCategorySelect();
                populateEditCategorySelect();
                populateAllStoreSelects();
                showMessage('Data uploaded successfully!');
            } catch (e) {
                showError('Error parsing JSON file.');
                console.error('JSON parse error', e);
            }
        };
        reader.onerror = function() {
            showError('Error reading file.');
        };
        reader.readAsText(file);
    }


    // --- Rendering Functions ---
    function renderSidebarCategories() {
        categoryList.innerHTML = '';
        pantryCategorySelect.innerHTML = '<option value="">Select Category</option>';
        editItemCategorySelect.innerHTML = '<option value="">Select Category</option>';
        pantryData.forEach((category, index) => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-item-draggable');
            listItem.draggable = true;
            listItem.dataset.categoryIndex = index;
            listItem.dataset.categoryName = category.name;

            listItem.innerHTML = `
                <span class="list-item-text">${category.name}</span>
                <div>
                    <button class="edit-btn" data-action="edit-category" data-category-index="${index}" title="Edit Category"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" data-action="delete-category" data-category-index="${index}" title="Delete Category"><i class="fas fa-trash"></i></button>
                </div>`;
            categoryList.appendChild(listItem);

            const categoryOption = document.createElement('option');
            categoryOption.value = category.name;
            categoryOption.textContent = category.name;
            pantryCategorySelect.appendChild(categoryOption);
            editItemCategorySelect.appendChild(categoryOption.cloneNode(true));
        });
        addCategoryDragAndDrop();
    }

    function renderPantryCategories() {
        pantryCategoriesContainer.innerHTML = '';
        pantryData.forEach(category => {
            if (category.items.length === 0) {
                return;
            }
            const categoryDiv = document.createElement('div');
            categoryDiv.classList.add('category');
            const categoryTitle = document.createElement('h3');
            categoryTitle.classList.add('category-title');
            categoryTitle.textContent = category.name;
            categoryDiv.appendChild(categoryTitle);
            const itemList = document.createElement('ul');
            itemList.classList.add('item-list');
            itemList.setAttribute('data-category', category.name.toLowerCase().replace(/ /g, '-'));
            category.items.forEach((item, index) => {
                const listItem = document.createElement('li');
                listItem.classList.add('pantry-item', 'list-item-draggable');
                listItem.draggable = true;
                listItem.dataset.categoryName = category.name;
                listItem.dataset.itemIndex = index;

                const stockStatusClass = item.stock < item.min ? 'low-stock' : '';

                listItem.innerHTML = `
                    <div class="pantry-item-content">
                        ${item.image ? `<img src="${item.image}" alt="${item.name}" class="pantry-item-image">` : ''}
                        <div class="pantry-item-main">
                            <span>${item.name}</span>
                            <small>Min: ${item.min} ${item.minUnit}${item.defaultStore ? ` | Store: ${item.defaultStore}` : ''}${item.price > 0 ? ` | £${item.price.toFixed(2)}` : ''}${item.url ? ` | <a href="${item.url}" target="_blank" rel="noopener noreferrer">See Product</a>` : ''}</small>
                        </div>
                        <div class="pantry-item-quantity">
                             <input type="number" class="stock-input ${stockStatusClass}" value="${item.stock}" min="0" data-category-name="${category.name}" data-item-index="${index}" step="any" />
                        </div>
                    </div>
                    <div class="pantry-item-actions">
                        <button class="edit-item-btn" data-action="edit-item" data-category-name="${category.name}" data-item-index="${index}" title="Edit Item"><i class="fas fa-edit"></i></button>
                        <button class="duplicate-item-btn" data-action="duplicate-item" data-category-name="${category.name}" data-item-index="${index}" title="Duplicate Item"><i class="fas fa-copy"></i></button>
                        <button class="delete-item-btn" data-action="delete-item" data-category-name="${category.name}" data-item-index="${index}" title="Delete Item"><i class="fas fa-trash"></i></button>
                    </div>`;
                
                addSwipeFunctionality(listItem);
                itemList.appendChild(listItem);
            });
            categoryDiv.appendChild(itemList);
            pantryCategoriesContainer.appendChild(categoryDiv);
        });
        addItemDragAndDrop();
    }


    function renderShoppingList() {
        shoppingListContainer.innerHTML = '';
        shoppingList.forEach((storeData, storeIndex) => {
            if (storeData.items.length > 0) {
                const storeGroup = document.createElement('div');
                storeGroup.className = 'store-group';

                const storeHeader = document.createElement('h3');
                storeHeader.textContent = storeData.store;
                storeHeader.classList.add('category-title');
                storeGroup.appendChild(storeHeader);

                const itemList = document.createElement('ul');
                itemList.classList.add('item-list', 'shopping-item-list');
                itemList.dataset.storeIndex = storeIndex;
                storeData.items.forEach((itemText, itemIndex) => {
                    const listItem = document.createElement('li');
                    listItem.classList.add('shopping-item', 'list-item-draggable');
                    listItem.draggable = true;
                    listItem.dataset.storeIndex = storeIndex;
                    listItem.dataset.itemIndex = itemIndex;

                    listItem.innerHTML = `<span>${itemText}</span>`;


                    listItem.addEventListener('click', (e) => {
                        if (e.target !== e.currentTarget) return;
                        selectedPantryItem = itemText;
                        storeModal.style.display = "block";
                    });

                    const quantityControls = document.createElement('div');
                    quantityControls.classList.add('shopping-item-quantity');
                    const decreaseButton = document.createElement('button');
                    decreaseButton.innerHTML = '-';
                    decreaseButton.classList.add('quantity-button');
                    decreaseButton.addEventListener('click', (event) => {
                        event.stopPropagation();
                        decreaseQuantity(listItem);
                    });
                    const quantitySpan = document.createElement('span');
                    quantitySpan.textContent = '1';
                    const increaseButton = document.createElement('button');
                    increaseButton.innerHTML = '+';
                    increaseButton.classList.add('quantity-button');
                    increaseButton.addEventListener('click', (event) => {
                        event.stopPropagation();
                        increaseQuantity(listItem);
                    });

                    quantityControls.appendChild(decreaseButton);
                    quantityControls.appendChild(quantitySpan);
                    quantityControls.appendChild(increaseButton);


                    const removeButton = document.createElement('button');
                    removeButton.innerHTML = '<i class="fa-solid fa-check"></i>';
                    removeButton.classList.add('remove-button');
                    removeButton.style.backgroundColor = 'black';
                    removeButton.style.color = 'white';
                    removeButton.addEventListener('click', () => {
                        removeItemFromShoppingList(storeData.store, itemText, storeIndex, itemIndex);
                    });


                    listItem.appendChild(quantityControls);
                    listItem.appendChild(removeButton);
                    itemList.appendChild(listItem);
                });
                storeGroup.appendChild(itemList);
                shoppingListContainer.appendChild(storeGroup);
            }
        });
        addItemDragAndDropShoppingList();
    }


    function increaseQuantity(listItem) {
        let quantitySpan = listItem.querySelector('.shopping-item-quantity span');
        let quantity = parseInt(quantitySpan.textContent);
        quantitySpan.textContent = quantity + 1;
    }

    function decreaseQuantity(listItem) {
        let quantitySpan = listItem.querySelector('.shopping-item-quantity span');
        let quantity = parseInt(quantitySpan.textContent);
        if (quantity > 1) {
            quantitySpan.textContent = quantity - 1;
        }
    }


    function renderRemovedItems() {
        removedItemsList.innerHTML = '';
        removedItems.forEach(removedItem => {
            const listItem = document.createElement('li');
            listItem.classList.add('removed-item');
            listItem.textContent = removedItem.item;

            const bringBackButton = document.createElement('button');
            bringBackButton.innerHTML = '<i class="fas fa-undo"></i>';
            bringBackButton.classList.add('bring-back-button');
            bringBackButton.addEventListener('click', () => {
                bringBackItem(removedItem.item, removedItem.store);
            });

            listItem.appendChild(bringBackButton);
            removedItemsList.appendChild(listItem);
        });
        removedItemsContainer.style.display = removedItems.length > 0 ? 'block' : 'none';
    }

    function renderStoreButtons() {
        storeOptionsContainer.innerHTML = '';
        stores.forEach(store => {
            const button = document.createElement('button');
            button.classList.add('store-button');
            button.setAttribute('data-store', store.name);
            button.textContent = store.name;
            button.style.backgroundColor = store.color;
            const isLightColor = getBrightness(store.color) > 130;
            button.style.color = isLightColor ? 'black' : 'white';


            button.addEventListener('click', () => {
                const storeName = button.getAttribute('data-store');
                addItemToShoppingList(selectedPantryItem, storeName);
                storeModal.style.display = "none";
            });
            storeOptionsContainer.appendChild(button);
        });
    }

    function getBrightness(hexColor) {
        hexColor = hexColor.replace('#', '');
        const r = parseInt(hexColor.substring(0, 2), 16);
        const g = parseInt(hexColor.substring(2, 4), 16);
        const b = parseInt(hexColor.substring(4, 6), 16);
        return ((r * 299) + (g * 587) + (b * 114)) / 1000;
    }


    function renderSidebarStores() {
        storeList.innerHTML = '';
        stores.forEach((store, index) => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-item-draggable');
            listItem.draggable = true;
            listItem.dataset.storeIndex = index;
            listItem.dataset.storeName = store.name;
            listItem.dataset.storeColor = store.color;

            listItem.innerHTML = `
                <span class="list-item-text">${store.name}</span>
                <div>
                    <button class="edit-btn" data-action="edit-store" data-store-index="${index}" title="Edit Store"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" data-action="delete-store" data-store-index="${index}" title="Delete Store"><i class="fas fa-trash"></i></button>
                </div>`;
            storeList.appendChild(listItem);
        });
        addStoreDragAndDrop();
    }

    function populatePantryCategorySelect() {
        pantryCategorySelect.innerHTML = '<option value="">Select Category</option>';
        pantryData.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            pantryCategorySelect.appendChild(option);
        });
    }
    function populateEditCategorySelect() {
        editItemCategorySelect.innerHTML = '<option value="">Select Category</option>';
        pantryData.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            editItemCategorySelect.appendChild(option);
        });
    }

    function populateStoreSelects(selectElement) {
        if (!selectElement) return;
        const currentValue = selectElement.value;
        selectElement.innerHTML = '<option value="">No Default Store</option>';
        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.name;
            option.textContent = store.name;
            selectElement.appendChild(option);
        });
        selectElement.value = currentValue;
    }

    function populateAllStoreSelects() {
        populateStoreSelects(document.getElementById('new-pantry-item-store-select'));
        populateStoreSelects(document.getElementById('edit-item-store-select'));
    }


    // --- Pantry Item Stock Control ---
    function updateStock(categoryName, itemIndex, newStock) {
        const category = pantryData.find(cat => cat.name === categoryName);
        if (category && category.items[itemIndex]) {
            category.items[itemIndex].stock = newStock;
            renderPantryCategories();
            checkStockLevels(categoryName, itemIndex);
        }
    }

    function checkStockLevels(categoryName, itemIndex) {
        const category = pantryData.find(cat => cat.name === categoryName);
        if (!category) return;
        const item = category.items[itemIndex];
        if (!item) return;

        if (item.stock < item.min) {
            const isAlreadyInShoppingList = shoppingList.some(store => store.items.includes(item.name));
            if (!isAlreadyInShoppingList) {
                if (item.defaultStore) {
                    addItemToShoppingList(item.name, item.defaultStore);
                    showMessage(`${item.name} is low and has been added to the shopping list for ${item.defaultStore}.`);
                } else {
                    showMessage(`${item.name} is low on stock, but no default store is set. Please set one to add it automatically.`);
                }
            }
        }
    }


    // --- Shopping List Manipulation Functions ---
    function addItemToShoppingList(itemText, storeName) {
        let storeData = shoppingList.find(s => s.store === storeName);
        if (!storeData) {
            storeData = { store: storeName, items: [], color: stores.find(s => s.name === storeName).color };
            shoppingList.push(storeData);
        }

        if (storeData.items.includes(itemText)) {
            return;
        }

        shoppingList.forEach(existingStoreData => {
            if (existingStoreData.items.includes(itemText)) {
                existingStoreData.items = existingStoreData.items.filter(item => item !== itemText);
            }
        });


        storeData.items.push(itemText);
        renderShoppingList();
    }


    function removeItemFromShoppingList(storeName, itemText, storeIndex, itemIndex) {
        const storeData = shoppingList[storeIndex];
        if (storeData) {
            storeData.items.splice(itemIndex, 1);
            if (storeData.items.length === 0) {
                shoppingList = shoppingList.filter((s, index) => index !== storeIndex);
            }
            renderShoppingList();

            removedItems.push({ item: itemText, store: storeName });
            renderRemovedItems();
        }
    }


    function bringBackItem(itemText, originalStore) {
        removedItems = removedItems.filter(item => item.item !== itemText);
        renderRemovedItems();
        addItemToShoppingList(itemText, originalStore);
    }

    function clearAllRemovedItems() {
        removedItems = [];
        renderRemovedItems();
        showMessage('Removed items cleared!');
    }


    // --- Sidebar Category, Store Management ---
    function addCategory() {
        const newCategoryName = newCategoryNameInput.value.trim();
        if (newCategoryName) {
            pantryData.push({ name: newCategoryName, items: [] });
            renderSidebarCategories();
            renderPantryCategories();
            populatePantryCategorySelect();
            populateEditCategorySelect();
            newCategoryNameInput.value = '';
            showMessage('Category added!');
        } else {
            showError('Category name cannot be empty.');
        }
    }

    function deleteCategory(index) {
        pantryData.splice(index, 1);
        renderSidebarCategories();
        renderPantryCategories();
        populatePantryCategorySelect();
        populateEditCategorySelect();
        showMessage('Category deleted!');
    }

    function editCategoryName(index, newName) {
        pantryData[index].name = newName;
        renderSidebarCategories();
        renderPantryCategories();
        populatePantryCategorySelect();
        populateEditCategorySelect();
        showMessage('Category name updated!');
    }


    function addPantryItem() {
        const selectedCategoryName = pantryCategorySelect.value;
        const newItemName = newPantryItemNameInput.value.trim();
        const newUrl = newPantryItemUrlInput.value.trim();
        const newImage = newPantryItemImageInput.value.trim();
        const newPrice = parseFloat(newPantryItemPriceInput.value) || 0;
        const newPantryItemStoreSelect = document.getElementById('new-pantry-item-store-select');
        const newDefaultStore = newPantryItemStoreSelect.value;
        if (selectedCategoryName && newItemName) {
            const category = pantryData.find(cat => cat.name === selectedCategoryName);
            if (category) {
                const newItem = {
                    name: newItemName,
                    stock: parseFloat(newPantryItemStockInput.value) || 0,
                    min: parseFloat(newPantryItemMinInput.value) || 0,
                    minUnit: newPantryItemMinUnitInput.value.trim() || 'units',
                    defaultStore: newDefaultStore,
                    url: newUrl,
                    price: newPrice,
                    image: newImage
                };
                category.items.push(newItem);
                renderPantryCategories();
                newPantryItemNameInput.value = '';
                newPantryItemUrlInput.value = '';
                newPantryItemImageInput.value = '';
                newPantryItemStockInput.value = '';
                newPantryItemMinInput.value = '1';
                newPantryItemMinUnitInput.value = 'units';
                newPantryItemPriceInput.value = '';
                newPantryItemStoreSelect.value = '';
                addPantryItemModal.style.display = 'none';
                showMessage('Item added to pantry!');
            }
        } else {
            showError('Please select a category and enter an item name.');
        }
    }


    function deleteItem(categoryName, itemIndex) {
        const category = pantryData.find(cat => cat.name === categoryName);
        if (category && category.items[itemIndex]) {
            category.items.splice(itemIndex, 1);
            renderPantryCategories();
            showMessage('Item deleted from pantry!');
        }
    }

    function duplicateItem(categoryName, itemIndex) {
        const category = pantryData.find(cat => cat.name === categoryName);
        if (category && category.items[itemIndex]) {
            const itemToDuplicate = { ...category.items[itemIndex] };
            category.items.push(itemToDuplicate);
            renderPantryCategories();
            showMessage('Item duplicated!');
        }
    }

    function saveEditedItem(oldCategoryName, itemIndex, newCategoryName, newItemData) {
        const oldCategory = pantryData.find(cat => cat.name === oldCategoryName);
        if (oldCategory && oldCategory.items[itemIndex] !== undefined) {
             if (oldCategoryName !== newCategoryName) {
                oldCategory.items.splice(itemIndex, 1);
                const newCategory = pantryData.find(cat => cat.name === newCategoryName);
                if (newCategory) {
                    newCategory.items.push(newItemData);
                }
            } else {
                oldCategory.items[itemIndex] = newItemData;
            }
        }
        renderPantryCategories();
        showMessage('Item updated!');
    }



    function addStore() {
        const newStoreName = newStoreNameInput.value.trim();
        const newStoreColor = newStoreColorInput.value;
        if (newStoreName) {
            stores.push({ name: newStoreName, color: newStoreColor });
            renderSidebarStores();
            renderStoreButtons();
            populateAllStoreSelects();
            newStoreNameInput.value = '';
            newStoreColorInput.value = '#000000';
            showMessage('Store added!');
        } else {
            showError('Store name cannot be empty.');
        }
    }

    function deleteStore(index) {
        stores.splice(index, 1);
        renderSidebarStores();
        renderStoreButtons();
        populateAllStoreSelects();
        showMessage('Store deleted!');
    }

    function editStore(index, newName, newColor) {
        stores[index].name = newName;
        stores[index].color = newColor;
        renderSidebarStores();
        renderStoreButtons();
        populateAllStoreSelects();
        showMessage('Store updated!');
    }



    // --- Drag and Drop Functions ---
    function addCategoryDragAndDrop() {
        categoryList.addEventListener('dragstart', (event) => {
            draggingCategory = event.target;
            event.dataTransfer.setData('text/plain', event.target.dataset.categoryIndex);
            event.target.classList.add('dragging');
        });


        categoryList.addEventListener('dragover', (event) => {
            event.preventDefault();
            const afterElement = getDragAfterElement(categoryList, event.clientY);
            const draggable = document.querySelector('.dragging');
            
            if (lastDropTarget) lastDropTarget.classList.remove('drop-indicator');
            if (afterElement) {
                afterElement.classList.add('drop-indicator');
                lastDropTarget = afterElement;
            }

            if (afterElement == null) {
                categoryList.appendChild(draggable);
            } else {
                categoryList.insertBefore(draggable, afterElement);
            }
        });

        categoryList.addEventListener('dragend', (event) => {
            event.target.classList.remove('dragging');
            if (lastDropTarget) lastDropTarget.classList.remove('drop-indicator');
            lastDropTarget = null;
            draggingCategory = null;
            updateCategoryOrder();
        });
    }

    function addItemDragAndDrop() {
        pantryCategoriesContainer.addEventListener('dragstart', (event) => {
            if (!event.target.classList.contains('pantry-item')) return;
            draggingItem = event.target;
            event.dataTransfer.setData('text/plain', `${event.target.dataset.categoryName}-${event.target.dataset.itemIndex}`);
            event.target.classList.add('dragging');
        });


        pantryCategoriesContainer.addEventListener('dragover', (event) => {
            event.preventDefault();
            if (!event.target.classList.contains('item-list') && !event.target.closest('.item-list')) return;
            const targetItemList = event.target.classList.contains('item-list') ? event.target : event.target.closest('.item-list');
            const afterElement = getDragAfterElement(targetItemList, event.clientY);
            const draggable = document.querySelector('.dragging');

            if (lastDropTarget) lastDropTarget.classList.remove('drop-indicator');
            if (afterElement) {
                 afterElement.classList.add('drop-indicator');
                 lastDropTarget = afterElement;
            }

            if (afterElement == null) {
                targetItemList.appendChild(draggable);
            } else {
                targetItemList.insertBefore(draggable, afterElement);
            }
        });

        pantryCategoriesContainer.addEventListener('dragend', (event) => {
            if (!event.target.classList.contains('pantry-item')) return;
            event.target.classList.remove('dragging');
            if (lastDropTarget) lastDropTarget.classList.remove('drop-indicator');
            lastDropTarget = null;
            draggingItem = null;
            updatePantryItemOrder();
        });
    }


    function addItemDragAndDropShoppingList() {
        shoppingListContainer.addEventListener('dragstart', (event) => {
            if (!event.target.classList.contains('shopping-item')) return;
            draggingShoppingItem = event.target;
            event.dataTransfer.setData('text/plain', `${event.target.dataset.storeIndex}-${event.target.dataset.itemIndex}`);
            event.target.classList.add('dragging');
        });


        shoppingListContainer.addEventListener('dragover', (event) => {
            event.preventDefault();
            if (!event.target.classList.contains('shopping-item-list') && !event.target.closest('.shopping-item-list')) return;

            const targetItemList = event.target.classList.contains('shopping-item-list') ? event.target : event.target.closest('.shopping-item-list');
            const afterElement = getDragAfterElement(targetItemList, event.clientY);
            const draggable = document.querySelector('.dragging');

            if (lastDropTarget) lastDropTarget.classList.remove('drop-indicator');
            if (afterElement) {
                 afterElement.classList.add('drop-indicator');
                 lastDropTarget = afterElement;
            }

            if (afterElement == null) {
                targetItemList.appendChild(draggable);
            } else {
                targetItemList.insertBefore(draggable, afterElement);
            }
        });

        shoppingListContainer.addEventListener('dragend', (event) => {
            if (!event.target.classList.contains('shopping-item')) return;
            event.target.classList.remove('dragging');
            if (lastDropTarget) lastDropTarget.classList.remove('drop-indicator');
            lastDropTarget = null;
            draggingShoppingItem = null;
            updateShoppingListItemOrder();
        });
    }


    function addStoreDragAndDrop() {
        storeList.addEventListener('dragstart', (event) => {
            draggingStore = event.target;
            event.dataTransfer.setData('text/plain', event.target.dataset.storeIndex);
            event.target.classList.add('dragging');
        });


        storeList.addEventListener('dragover', (event) => {
            event.preventDefault();
            const afterElement = getDragAfterElement(storeList, event.clientY);
            const draggable = document.querySelector('.dragging');
            
            if (lastDropTarget) lastDropTarget.classList.remove('drop-indicator');
            if (afterElement) {
                afterElement.classList.add('drop-indicator');
                lastDropTarget = afterElement;
            }

            if (afterElement == null) {
                storeList.appendChild(draggable);
            } else {
                storeList.insertBefore(draggable, afterElement);
            }
        });

        storeList.addEventListener('dragend', (event) => {
            event.target.classList.remove('dragging');
            if (lastDropTarget) lastDropTarget.classList.remove('drop-indicator');
            lastDropTarget = null;
            draggingStore = null;
            updateStoreOrder();
        });
    }



    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.list-item-draggable:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function updateCategoryOrder() {
        const orderedCategories = [];
        document.querySelectorAll('#category-list .list-item-draggable').forEach(item => {
            const originalCategory = pantryData.find(cat => cat.name === item.dataset.categoryName);
            if(originalCategory) orderedCategories.push(originalCategory);
        });
        pantryData = orderedCategories;
        renderSidebarCategories();
        renderPantryCategories();
        populatePantryCategorySelect();
        populateEditCategorySelect();
    }


    function updatePantryItemOrder() {
        const newPantryData = pantryData.map(category => ({ ...category, items: [] }));
        const itemsMap = new Map();
        pantryData.forEach(cat => cat.items.forEach(item => itemsMap.set(item.name, item)));

        document.querySelectorAll('#pantry-categories .item-list').forEach(list => {
            const categoryName = list.closest('.category').querySelector('.category-title').textContent;
            const targetCategory = newPantryData.find(cat => cat.name === categoryName);
            if (targetCategory) {
                list.querySelectorAll('.pantry-item').forEach(itemEl => {
                    const itemName = itemEl.querySelector('.pantry-item-main span').textContent;
                    if (itemsMap.has(itemName)) {
                        targetCategory.items.push(itemsMap.get(itemName));
                    }
                });
            }
        });

        pantryData = newPantryData;
        renderPantryCategories();
    }



    function updateStoreOrder() {
        const orderedStores = [];
        const currentStoresOrder = Array.from(storeList.children).map(item => stores[item.dataset.storeIndex]);
        stores = currentStoresOrder;
        renderSidebarStores();
        renderStoreButtons();
    }


    function updateShoppingListItemOrder() {
        const updatedShoppingList = [];
        document.querySelectorAll('#shopping-list > ul.shopping-item-list').forEach((storeItemList) => {
            const storeIndex = parseInt(storeItemList.dataset.storeIndex);
            const originalStoreData = shoppingList[storeIndex];
            if (originalStoreData) {
                const orderedItems = [];
                storeItemList.querySelectorAll('.shopping-item').forEach(item => {
                    const span = item.querySelector('span');
                    orderedItems.push(span.textContent);
                });
                updatedShoppingList.push({ store: originalStoreData.store, items: orderedItems, color: originalStoreData.color });
            }
        });
        shoppingList = updatedShoppingList;
        renderShoppingList();
    }

    // --- Swipe Functionality ---
    function addSwipeFunctionality(item) {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;
        let isScrolling = false;
        const content = item.querySelector('.pantry-item-content');

        function handleDragStart(e) {
            if (e.target.closest('.stock-input')) return;
            startX = e.pageX || e.touches[0].pageX;
            isDragging = true;
            isScrolling = false;
            content.style.transition = 'none';
        }

        function handleDragMove(e) {
            if (!isDragging) return;
            currentX = e.pageX || e.touches[0].pageX;
            const diffX = currentX - startX;

            if (Math.abs(diffX) > 10 && !isScrolling) {
                if (Math.abs(e.movementY) > Math.abs(e.movementX)) {
                    isScrolling = true;
                    isDragging = false;
                    return;
                }
                
                if (currentlySwipedItem && currentlySwipedItem !== item) {
                    closeSwipedItem();
                }

                if (diffX < 0 && diffX > -160) { // Swiping left
                    content.style.transform = `translateX(${diffX}px)`;
                }
            }
        }

        function handleDragEnd() {
            if (!isDragging) return;
            isDragging = false;
            content.style.transition = 'transform 0.3s ease-out';
            const diffX = currentX - startX;

            if (diffX < -50) { // Threshold for swipe
                item.classList.add('is-swiped');
                content.style.transform = 'translateX(-150px)';
                currentlySwipedItem = item;
            } else if (diffX > 50) {
                 closeSwipedItem();
            } else if (Math.abs(diffX) < 10) { // It's a click
                // No action on click anymore
            }
            else {
                content.style.transform = 'translateX(0)';
            }
        }
        
        content.addEventListener('mousedown', handleDragStart);
        content.addEventListener('mousemove', handleDragMove);
        content.addEventListener('mouseup', handleDragEnd);
        content.addEventListener('mouseleave', () => { if (isDragging) handleDragEnd() });
        
        content.addEventListener('touchstart', handleDragStart, { passive: true });
        content.addEventListener('touchmove', handleDragMove, { passive: true });
        content.addEventListener('touchend', handleDragEnd);
    }
    
    function closeSwipedItem() {
        if (currentlySwipedItem) {
            currentlySwipedItem.classList.remove('is-swiped');
            currentlySwipedItem.querySelector('.pantry-item-content').style.transform = 'translateX(0)';
            currentlySwipedItem = null;
        }
    }


    // --- Message Functions ---
    function showMessage(text) {
        messageText.textContent = text;
        messageModal.style.display = 'block';
        clearTimeout(currentMessageTimeout);
        currentMessageTimeout = setTimeout(() => {
            messageModal.style.display = 'none';
        }, 3000);
    }

    function showError(text) {
        messageText.textContent = text;
        messageModal.style.display = 'block';
        clearTimeout(currentMessageTimeout);
    }



    // --- Event Listeners ---
    pantrySearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('#pantry-categories .category').forEach(category => {
            let hasVisibleItems = false;
            category.querySelectorAll('.pantry-item').forEach(item => {
                const itemText = item.querySelector('.pantry-item-main span').textContent.toLowerCase();
                if (itemText.includes(searchTerm)) {
                    item.style.display = 'flex';
                    hasVisibleItems = true;
                } else {
                    item.style.display = 'none';
                }
            });
    
            if (hasVisibleItems) {
                category.style.display = 'block';
            } else {
                category.style.display = 'none';
            }
        });
    });

    shoppingSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('#shopping-list .store-group').forEach(storeGroup => {
            let hasVisibleItems = false;
            storeGroup.querySelectorAll('.shopping-item').forEach(item => {
                const itemText = item.querySelector('span').textContent.toLowerCase();
                if (itemText.includes(searchTerm)) {
                    item.style.display = 'flex';
                    hasVisibleItems = true;
                } else {
                    item.style.display = 'none';
                }
            });
    
            if (hasVisibleItems) {
                storeGroup.style.display = 'block';
            } else {
                storeGroup.style.display = 'none';
            }
        });
    });


    pantryTab.addEventListener('click', () => {
        pantryTab.classList.add('active');
        shoppingTab.classList.remove('active');
        pantryContent.style.display = 'block';
        shoppingContent.style.display = 'none';
    });

    shoppingTab.addEventListener('click', () => {
        shoppingTab.classList.add('active');
        pantryTab.classList.remove('active');
        shoppingContent.style.display = 'block';
        pantryContent.style.display = 'none';
        renderShoppingList();
        renderRemovedItems();
    });


    closeStoreModalButton.addEventListener('click', () => {
        storeModal.style.display = "none";
    });
    closeAddPantryItemModalButton.addEventListener('click', () => {
        addPantryItemModal.style.display = "none";
    });

    okButton.addEventListener('click', () => {
        messageModal.style.display = 'none';
    });


    window.addEventListener('click', (event) => {
        if (event.target == storeModal) storeModal.style.display = "none";
        if (event.target == editItemModal) editItemModal.style.display = 'none';
        if (event.target == addPantryItemModal) addPantryItemModal.style.display = 'none';
        if (event.target == messageModal) messageModal.style.display = 'none';
        
        if (!event.target.closest('.pantry-item')) {
            closeSwipedItem();
        }
    });


    removeAllRemovedButton.addEventListener('click', clearAllRemovedItems);
    downloadDataButton.addEventListener('click', downloadData);

    uploadDataButton.addEventListener('click', () => {
        uploadFile.click();
    });

    uploadFile.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadData(file);
        }
        uploadFile.value = '';
    });


    // --- Sidebar Event Listeners ---
    toggleSidebarButton.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        mainContainer.classList.toggle('sidebar-open');
    });

    closeSidebarButton.addEventListener('click', () => {
        sidebar.classList.remove('open');
        mainContainer.classList.remove('sidebar-open');
    });

    addCategoryButton.addEventListener('click', addCategory);
    addStoreButton.addEventListener('click', addStore);
    addPantryItemConfirmButton.addEventListener('click', addPantryItem);
    cancelAddPantryItemButton.addEventListener('click', () => addPantryItemModal.style.display = 'none');


    categoryList.addEventListener('click', (event) => {
        const target = event.target;
        if (target.closest('.delete-btn')) {
            const index = parseInt(target.closest('.delete-btn').dataset.categoryIndex);
            deleteCategory(index);
        } else if (target.closest('.edit-btn')) {
            const index = parseInt(target.closest('.edit-btn').dataset.categoryIndex);
            if (editModeCategory !== null) return;
            editModeCategory = index;
            const listItem = target.closest('li');
            const categoryName = listItem.dataset.categoryName;

            listItem.innerHTML = `
                <input type="text" class="edit-input" value="${categoryName}">
                <div>
                    <button class="save-btn" data-action="save-category" data-category-index="${index}" title="Save Category"><i class="fas fa-check"></i></button>
                    <button class="cancel-btn" data-action="cancel-edit-category" data-category-index="${index}" title="Cancel Edit"><i class="fas fa-times"></i></button>
                </div>`;
            const inputField = listItem.querySelector('.edit-input');
            inputField.focus();
        } else if (target.closest('.save-btn')) {
            const index = parseInt(target.closest('.save-btn').dataset.categoryIndex);
            const listItem = target.closest('li');
            const newCategoryName = listItem.querySelector('.edit-input').value.trim();
            if (newCategoryName) {
                editCategoryName(index, newCategoryName);
            } else {
                renderSidebarCategories();
            }
            editModeCategory = null;
        } else if (target.closest('.cancel-btn')) {
            editModeCategory = null;
            renderSidebarCategories();
        }
    });



    storeList.addEventListener('click', (event) => {
        const target = event.target;
        if (target.closest('.delete-btn')) {
            const index = parseInt(target.closest('.delete-btn').dataset.storeIndex);
            deleteStore(index);
        } else if (target.closest('.edit-btn')) {
            const index = parseInt(target.closest('.edit-btn').dataset.storeIndex);
            if (editModeStore !== null) return;
            editModeStore = index;
            const listItem = target.closest('li');
            const storeName = listItem.dataset.storeName;
            const storeColor = listItem.dataset.storeColor;

            listItem.innerHTML = `
                <input type="text" class="edit-input" value="${storeName}">
                <input type="color" class="edit-color-input" value="${storeColor}">
                <div>
                    <button class="save-btn" data-action="save-store" data-store-index="${index}" title="Save Store"><i class="fas fa-check"></i></button>
                    <button class="cancel-btn" data-action="cancel-edit-store" data-store-index="${index}" title="Cancel Edit"><i class="fas fa-times"></i></button>
                </div>`;
            const inputField = listItem.querySelector('.edit-input');
            inputField.focus();
        } else if (target.closest('.save-btn')) {
            const index = parseInt(target.closest('.save-btn').dataset.storeIndex);
            const listItem = target.closest('li');
            const newStoreName = listItem.querySelector('.edit-input').value.trim();
            const newStoreColor = listItem.querySelector('.edit-color-input').value;
            if (newStoreName) {
                editStore(index, newStoreName, newStoreColor);
            } else {
                renderSidebarStores();
            }
            editModeStore = null;
        } else if (target.closest('.cancel-btn')) {
            editModeStore = null;
            renderSidebarStores();
        }
    });



    pantryCategoriesContainer.addEventListener('click', (event) => {
        const target = event.target;
        const button = target.closest('button');
        if (!button) return;

        const categoryName = button.dataset.categoryName;
        const itemIndex = parseInt(button.dataset.itemIndex);

        if (button.classList.contains('delete-item-btn')) {
            deleteItem(categoryName, itemIndex);
        } else if (button.classList.contains('duplicate-item-btn')) {
            duplicateItem(categoryName, itemIndex);
        } else if (button.classList.contains('edit-item-btn')) {
            const item = pantryData.find(cat => cat.name === categoryName).items[itemIndex];
            const editItemStoreSelect = document.getElementById('edit-item-store-select');
            editItemNameInput.value = item.name;
            editItemUrlInput.value = item.url || '';
            editItemImageInput.value = item.image || '';
            editItemStockInput.value = item.stock;
            editItemMinInput.value = item.min;
            editItemMinUnitInput.value = item.minUnit;
            editItemPriceInput.value = item.price > 0 ? item.price : '';
            populateEditCategorySelect();
            editItemCategorySelect.value = categoryName;
            populateAllStoreSelects();
            editItemStoreSelect.value = item.defaultStore || '';
            editItemModal.style.display = 'block';
            currentEditItem = { categoryName: categoryName, itemIndex: itemIndex };
        }
    });

    pantryCategoriesContainer.addEventListener('change', (event) => {
        const target = event.target;
        if (target.classList.contains('stock-input')) {
            const categoryName = target.dataset.categoryName;
            const itemIndex = parseInt(target.dataset.itemIndex, 10);
            const newStock = parseFloat(target.value) || 0;
            updateStock(categoryName, itemIndex, newStock);
        }
    });


    closeEditModalButton.addEventListener('click', () => {
        editItemModal.style.display = 'none';
        currentEditItem = null;
    });

    cancelItemButton.addEventListener('click', () => {
        editItemModal.style.display = 'none';
        currentEditItem = null;
    });

    saveItemButton.addEventListener('click', () => {
        if (currentEditItem) {
            const editItemStoreSelect = document.getElementById('edit-item-store-select');
            const newItemName = editItemNameInput.value.trim();
            const newCategoryName = editItemCategorySelect.value;
            const newStock = parseFloat(editItemStockInput.value) || 0;
            const newMin = parseFloat(editItemMinInput.value) || 0;
            const newMinUnit = editItemMinUnitInput.value.trim() || 'units';
            const newDefaultStore = editItemStoreSelect.value;
            const newUrl = editItemUrlInput.value.trim();
            const newImage = editItemImageInput.value.trim();
            const newPrice = parseFloat(editItemPriceInput.value) || 0;

            if (newItemName && newCategoryName) {
                const newItemData = {name: newItemName, stock: newStock, min: newMin, minUnit: newMinUnit, defaultStore: newDefaultStore, url: newUrl, price: newPrice, image: newImage};
                saveEditedItem(currentEditItem.categoryName, currentEditItem.itemIndex, newCategoryName, newItemData);
                editItemModal.style.display = 'none';
                currentEditItem = null;
            } else {
                showError('Item name and category cannot be empty.');
            }
        }
    });

    addItemFab.addEventListener('click', () => {
        addPantryItemModal.style.display = 'block';
    });


    // --- Scroll to Top Visibility ---
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollToTopButton.classList.add('visible');
        } else {
            scrollToTopButton.classList.remove('visible');
        }
    });

    scrollToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });



    // --- Keyboard Shortcuts ---
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                mainContainer.classList.remove('sidebar-open');
            }
            if (storeModal.style.display === 'block') {
                storeModal.style.display = 'none';
            }
            if (editItemModal.style.display === 'block') {
                editItemModal.style.display = 'none';
                currentEditItem = null;
            }
            if (addPantryItemModal.style.display === 'block') {
                addPantryItemModal.style.display = 'none';
            }
            if (messageModal.style.display === 'block') {
                messageModal.style.display = 'none';
            }
            closeSwipedItem();
        } else if (event.key === 'Enter') {
            if (addPantryItemModal.style.display === 'block') {
                addPantryItem();
            }
            if (editItemModal.style.display === 'block' && currentEditItem) {
                 if (currentEditItem) {
                    const newItemName = editItemNameInput.value.trim();
                    const newCategoryName = editItemCategorySelect.value;
                    const newStock = parseFloat(editItemStockInput.value) || 0;
                    const newMin = parseFloat(editItemMinInput.value) || 0;
                    const newMinUnit = editItemMinUnitInput.value.trim() || 'units';
                    const editItemStoreSelect = document.getElementById('edit-item-store-select');
                    const newDefaultStore = editItemStoreSelect.value;
                    const newUrl = editItemUrlInput.value.trim();
                    const newImage = editItemImageInput.value.trim();
                    const newPrice = parseFloat(editItemPriceInput.value) || 0;

                    if (newItemName && newCategoryName) {
                        const newItemData = {name: newItemName, stock: newStock, min: newMin, minUnit: newMinUnit, defaultStore: newDefaultStore, url: newUrl, price: newPrice, image: newImage };
                        saveEditedItem(currentEditItem.categoryName, currentEditItem.itemIndex, newCategoryName, newItemData);
                        editItemModal.style.display = 'none';
                        currentEditItem = null;
                    }
                }
            }
            if (messageModal.style.display === 'block') {
                messageModal.style.display = 'none';
            }
        }
    });



    // --- Initial Load ---
    loadData();

    // Render items on initial load
    renderPantryCategories();

    // Set initial active tab to Pantry
    pantryTab.classList.add('active');
    shoppingContent.style.display = 'none';
});
