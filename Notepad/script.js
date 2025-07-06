

'use strict';

// --- DOM Elements ---
const editor = document.getElementById('editor');
const wordCharCountEl = document.getElementById('wordCharCount');
const readTimeEl = document.getElementById('readTime');
const popup = document.getElementById('popup');
const popupOverlay = document.getElementById('popup-overlay');
const appContent = document.getElementById('app-content');
const tabsList = document.getElementById('tabs-list');

// --- State Management ---
let state = {
    tabs: [],
    activeTabId: null,
};
let clickTimeout = null;
let messageTimeout = null;
let currentSelection = null;
let saveTimer = null; // For debouncing editor saves

// --- Toolbar Options ---
const fontFamilies = ['Sanchez', 'Poppins', 'Prata', 'Roboto', 'Merienda'];
const fontSizes = ['12px', '13px', '14px', '16px', '18px', '20px', '24px', '28px'];
const letterSpacings = ['normal', '0.5px', '1px', '1.5px', '2px'];
const lineSpacings = ['1', '1.25', '1.5', '1.75', '2'];
const colors = ['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#FF7F50', '#FFFF00', '#00FFFF', '#FF00FF', '#C0C0C0', '#808080'];
const alignments = ['Left', 'Center', 'Right', 'Justify'];

// --- INITIALIZATION ---

/**
 * Initializes the application upon page load.
 */
window.addEventListener('load', () => {
    loadState();
    initTabs();
    initSortable();
    initEditorSortable();
    initDarkMode();
    setupEventListeners();
    setupMutationObserver();
    editor.focus();
    document.execCommand('styleWithCSS', false, true);

    // Hide toolbar and tabs by default
    document.getElementById('toolbar').classList.add('hidden');
    document.getElementById('tabs-container').classList.add('hidden');
});

/**
 * Ensures the current state is saved before the user leaves the page.
 * This handles saving pending tab name edits and the current editor content.
 */
window.addEventListener('beforeunload', () => {
    // Commit any pending tab name changes from an element that is still in focus.
    const editingTabNameEl = document.querySelector('.tab-name[contenteditable="true"]');
    if (editingTabNameEl) {
        const tabEl = editingTabNameEl.closest('.tab');
        if (tabEl) {
            const tabId = parseInt(tabEl.dataset.tabId, 10);
            const tab = state.tabs.find(t => t.id === tabId);
            const newName = editingTabNameEl.textContent.trim();
            if (tab && newName) {
                tab.name = newName;
            }
        }
    }

    // If a debounced save is pending, clear it to avoid redundant saves.
    if (saveTimer) {
        clearTimeout(saveTimer);
    }
    
    // Save the current tab's content immediately. This also saves the overall state.
    saveCurrentTabContent();
});

// --- STATE & DATA ---

/**
 * Loads the application state from localStorage.
 * If no state is found or if the stored state is invalid, it falls back to a default state.
 */
function loadState() {
    const savedState = localStorage.getItem('notepadState');
    if (savedState) {
        try {
            const parsedState = JSON.parse(savedState);
            // Validate the structure of the loaded state.
            if (parsedState && Array.isArray(parsedState.tabs) && parsedState.hasOwnProperty('activeTabId')) {
                state = parsedState;
            } else {
                console.warn('Found invalid state in localStorage. Starting with a fresh state.');
            }
        } catch (e) {
            console.error('Failed to parse notepad state from localStorage. Starting fresh.', e);
        }
    }
}

/**
 * Saves the current application state to localStorage.
 */
function saveState() {
    localStorage.setItem('notepadState', JSON.stringify(state));
}

/**
 * Persists the content of the currently active tab to the state object.
 * This function is debounced to prevent excessive writes to localStorage during typing.
 */
function handleEditorChange() {
    updateCounts();
    // Debounce the save operation to improve performance.
    if (saveTimer) {
        clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(saveCurrentTabContent, 500); // Save 500ms after the last change.
}

/**
 * Saves the editor's current HTML content to the active tab object and then saves the entire state.
 * It checks if the content has actually changed to avoid redundant writes.
 */
function saveCurrentTabContent() {
    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
    if (activeTab) {
        if (activeTab.content !== editor.innerHTML) {
            activeTab.content = editor.innerHTML;
            saveState();
        }
    }
}

// --- INITIALIZATION HELPERS ---

/**
 * Initializes the tab system. Creates a default tab if none exist.
 * Renders the tabs and loads the content of the active tab.
 */
function initTabs() {
    if (state.tabs.length === 0) {
        const newTab = { id: Date.now(), name: 'Tab #1', content: '' };
        state.tabs.push(newTab);
        state.activeTabId = newTab.id;
        saveState();
    }

    let activeTab = state.tabs.find(t => t.id === state.activeTabId);
    if (!activeTab && state.tabs.length > 0) {
        state.activeTabId = state.tabs[0].id;
        activeTab = state.tabs[0];
        saveState();
    }

    renderTabs();

    if (activeTab) {
        editor.innerHTML = activeTab.content || '';
        updateCounts();
    }
}

/**
 * Initializes the drag-and-drop functionality for tabs using the Sortable.js library.
 */
function initSortable() {
    new Sortable(tabsList, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
            const { oldIndex, newIndex } = evt;
            if (oldIndex === newIndex) return;

            const [movedTab] = state.tabs.splice(oldIndex, 1);
            state.tabs.splice(newIndex, 0, movedTab);
            
            saveState();
            renderTabs();
        }
    });
}

/**
 * Initializes drag-and-drop for reordering elements within the editor.
 */
function initEditorSortable() {
    new Sortable(editor, {
        animation: 150,
        ghostClass: 'editor-ghost',
        // Sortablejs targets direct children by default, which works for block elements.
        // The mutation observer will automatically trigger a save on reorder.
    });
}


/**
 * Sets the initial dark/light mode based on the value stored in localStorage.
 */
function initDarkMode() {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

/**
 * Sets up a MutationObserver to watch for changes in the editor content.
 */
function setupMutationObserver() {
    const observer = new MutationObserver(handleEditorChange);
    observer.observe(editor, {
        childList: true,
        subtree: true,
        characterData: true,
    });
}

// --- TAB MANAGEMENT ---

/**
 * Renders the list of tabs in the UI based on the current state.
 */
function renderTabs() {
    tabsList.innerHTML = '';
    state.tabs.forEach(tab => {
        const tabEl = document.createElement('div');
        tabEl.className = 'tab';
        tabEl.dataset.tabId = tab.id;
        if (tab.id === state.activeTabId) {
            tabEl.classList.add('active');
        }

        const tabName = document.createElement('span');
        tabName.textContent = tab.name;
        tabName.className = 'tab-name';
        
        // Handle single-click to switch tab
        tabEl.addEventListener('click', () => {
            if (clickTimeout) {
                clearTimeout(clickTimeout);
                clickTimeout = null;
                return;
            }
            clickTimeout = setTimeout(() => {
                switchTab(tab.id);
                clickTimeout = null;
            }, 250);
        });

        // Handle double-click to edit tab name
        tabEl.addEventListener('dblclick', () => {
            clearTimeout(clickTimeout);
            clickTimeout = null;
            tabName.contentEditable = true;
            tabName.focus();
            document.execCommand('selectAll', false, null);
        });

        // Save tab name on blur
        tabName.addEventListener('blur', () => {
            tabName.contentEditable = false;
            tab.name = tabName.textContent.trim() || tab.name; // Revert if empty
            saveState();
            renderTabs(); // Re-render to ensure consistency
        });

        // Save tab name on Enter key
        tabName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                tabName.blur();
            }
        });

        const closeBtn = document.createElement('i');
        closeBtn.className = 'fas fa-times close-tab-btn';
        closeBtn.title = 'Close tab';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTab(tab.id);
        });
        
        tabEl.appendChild(tabName);
        tabEl.appendChild(closeBtn);
        tabsList.appendChild(tabEl);
    });
}

/**
 * Creates and switches to a new tab.
 */
function addTab() {
    saveCurrentTabContent();
    const newTab = { id: Date.now(), name: `Tab #${state.tabs.length + 1}`, content: '' };
    state.tabs.push(newTab);
    switchTab(newTab.id);
}

/**
 * Switches the active tab.
 * @param {number} tabId - The ID of the tab to switch to.
 */
function switchTab(tabId) {
    if (state.activeTabId === tabId) return;

    saveCurrentTabContent();
    
    state.activeTabId = tabId;
    const activeTab = state.tabs.find(t => t.id === tabId);

    if (activeTab) {
        editor.innerHTML = activeTab.content || '';
        updateCounts();
        renderTabs();
        saveState();
    }
}

/**
 * Deletes a tab and handles switching to a new active tab if necessary.
 * @param {number} tabIdToDelete - The ID of the tab to delete.
 */
function deleteTab(tabIdToDelete) {
    const tabIndex = state.tabs.findIndex(t => t.id === tabIdToDelete);
    if (tabIndex === -1) return;

    const wasActive = state.activeTabId === tabIdToDelete;

    // Remove the tab from the state array.
    state.tabs.splice(tabIndex, 1);

    if (wasActive) {
        // If the deleted tab was the active one, we must select a new active tab.
        if (state.tabs.length > 0) {
            // A common strategy is to activate the tab to the left, or the first tab
            // if the deleted one was at the beginning of the list.
            const newActiveIndex = Math.max(0, tabIndex - 1);
            const newActiveTabId = state.tabs[newActiveIndex].id;
            
            // Call switchTab with the new ID. It will handle loading content,
            // re-rendering, and saving the state. `state.activeTabId` still holds
            // the old (deleted) ID at this point, so the guard clause in `switchTab`
            // will not prevent it from running.
            switchTab(newActiveTabId);
        } else {
            // If the last tab was deleted, create a fresh one.
            addTab();
        }
    } else {
        // If an inactive tab was deleted, the active tab remains the same.
        // We just need to re-render the UI and save the updated tabs array.
        renderTabs();
        saveState();
    }
}

// --- EVENT LISTENERS ---

/**
 * Sets up all initial event listeners for the application.
 */
function setupEventListeners() {
    // Editor listeners
    editor.addEventListener('paste', handlePaste);
    editor.addEventListener('keydown', handleKeyDown);
    editor.addEventListener('click', handleEditorClick);

    // Tab listeners
    document.getElementById('add-tab-btn').addEventListener('click', addTab);

    // Toolbar Listeners
    setupToolbarListeners();

    // Popup and Global Listeners
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) {
            hidePopup();
        }
    });

    document.addEventListener('keydown', (e) => {
        // Hide popup on escape
        if (e.key === 'Escape' && !popupOverlay.classList.contains('hidden')) {
            hidePopup();
        }
        
        // Toggle toolbar and tabs visibility with Ctrl + \
        if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
            e.preventDefault();
            document.getElementById('toolbar').classList.toggle('hidden');
            document.getElementById('tabs-container').classList.toggle('hidden');
        }
    });
}

/**
 * Attaches click event listeners to all toolbar buttons.
 */
function setupToolbarListeners() {
    const listeners = {
        'textColor-btn': () => showOptionsPopup('Text Color', colors, (color) => formatDoc('foreColor', color)),
        'fontFamily-btn': () => showOptionsPopup('Font Family', fontFamilies, (font) => formatDoc('fontName', font)),
        'fontSize-btn': () => showOptionsPopup('Font Size', fontSizes, applyStyleToSelection('fontSize')),
        'letterSpacing-btn': () => showOptionsPopup('Letter Spacing', letterSpacings, applyStyleToSelection('letterSpacing')),
        'lineSpacing-btn': () => showOptionsPopup('Line Spacing', lineSpacings, applyStyleToSelection('lineHeight')),
        'textAlign-btn': () => showOptionsPopup('Text Align', alignments, (val) => formatDoc('justify' + val)),
        'bold-btn': () => formatDoc('bold'),
        'italic-btn': () => formatDoc('italic'),
        'underline-btn': () => formatDoc('underline'),
        'strikethrough-btn': () => formatDoc('strikethrough'),
        'superscript-btn': () => formatDoc('superscript'),
        'subscript-btn': () => formatDoc('subscript'),
        'ul-btn': () => formatDoc('insertUnorderedList'),
        'ol-btn': () => formatDoc('insertOrderedList'),
        'checkbox-btn': insertCheckbox,
        'hr-btn': insertDivider,
        'pdf-btn': downloadPDF,
        'html-btn': downloadHTML,
        'copy-btn': copyText,
        'download-json-btn': downloadJSON,
        'upload-json-btn': uploadJSON,
        'modeToggle-btn': toggleMode,
    };

    for (const [id, listener] of Object.entries(listeners)) {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', listener);
        }
    }
}


// --- EDITOR & KEYBOARD HANDLERS ---

/**
 * Handles clicks inside the editor, specifically to open links in a new tab.
 * @param {MouseEvent} e - The click event.
 */
function handleEditorClick(e) {
    const link = e.target.closest('a');
    if (link && link.href) {
        e.preventDefault();
        window.open(link.href, '_blank', 'noopener,noreferrer');
    }
}

/**
 * Handles the paste event to sanitize pasted text and auto-link URLs.
 * @param {ClipboardEvent} e - The paste event.
 */
function handlePaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    const urlRegex = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;

    if (urlRegex.test(text)) {
        document.execCommand('insertHTML', false, `<a href="${text}" target="_blank" rel="noopener noreferrer">${text}</a>`);
    } else {
        document.execCommand('insertText', false, text);
    }
}

/**
 * Retrieves detailed information about the current user selection.
 * @returns {object} An object containing the selection, range, and relevant nodes.
 */
function getSelectionInfo() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return {};
    const range = selection.getRangeAt(0);
    return { selection, range, node: range.startContainer };
}

/**
 * Handles keydown events in the editor for shortcuts and markdown-like features.
 * @param {KeyboardEvent} e - The keydown event.
 */
function handleKeyDown(e) {
    const { selection, range, node } = getSelectionInfo();
    const modifier = e.ctrlKey || e.metaKey;

    // Markdown-style shortcuts
    if (e.key === ' ' && node && range.collapsed && node.nodeType === 3) {
        const textBeforeCursor = node.textContent.substring(0, range.startOffset);
        const trimmedText = textBeforeCursor.trim();
        if (trimmedText === '*' || trimmedText === '[]') {
            e.preventDefault();
            const startIndex = textBeforeCursor.indexOf(trimmedText);
            node.textContent = node.textContent.substring(0, startIndex) + node.textContent.substring(range.startOffset);
            range.setStart(node, startIndex);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);

            if (trimmedText === '*') formatDoc('insertUnorderedList');
            else insertCheckbox();
            return;
        }
    }

    // --- for horizontal rule
    if (e.key === 'Enter') {
        const block = node.nodeType === 1 ? node : node.parentNode;
        if (block && block !== editor && block.textContent.trim() === '---') {
            e.preventDefault();
            const hr = document.createElement('hr');
            const parent = block.parentNode;
            parent.replaceChild(hr, block);
            
            const newBlock = document.createElement('div');
            newBlock.innerHTML = '<br>';
            parent.insertBefore(newBlock, hr.nextSibling);
            
            const newRange = document.createRange();
            newRange.setStart(newBlock, 0);
            selection.removeAllRanges();
            selection.addRange(newRange);
            return;
        }
    }
    
    // Ctrl/Cmd + K for link
    if (modifier && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (selection.toString().length > 0) {
            currentSelection = selection.getRangeAt(0).cloneRange();
            showLinkPopup();
        } else {
            showPopupMessage('Select text to create a link');
        }
        return;
    }
    
    // Standard formatting shortcuts
    if (modifier) {
        let command = null;
        switch(e.key.toLowerCase()){
            case 'b': command = 'bold'; break;
            case 'i': command = 'italic'; break;
            case 'u': command = 'underline'; break;
            case 's': if(e.shiftKey) command = 'strikethrough'; break;
            case '.': command = 'superscript'; break;
            case ',': command = 'subscript'; break;
            case '8': if(e.shiftKey) command = 'insertOrderedList'; break;
        }
        if(command){
            e.preventDefault();
            formatDoc(command);
            return;
        }
    }

    // Tab for indentation
    if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand(e.shiftKey ? 'outdent' : 'indent');
    }
}

/**
 * Updates the word count, character count, and estimated read time.
 */
function updateCounts() {
    const editorClone = editor.cloneNode(true);
    editorClone.querySelectorAll('hr, input[type="checkbox"]').forEach(el => el.parentElement.remove());
    const text = editorClone.innerText || '';
    const trimmedText = text.trim();

    const wordCount = trimmedText === '' ? 0 : trimmedText.split(/\s+/).filter(Boolean).length;
    const charCount = text.length;
    const readTime = Math.ceil(wordCount / 200);

    wordCharCountEl.innerHTML = `<i class="fas fa-font"></i>&nbsp; ${wordCount} words &nbsp;|&nbsp; ${charCount} characters`;
    readTimeEl.innerHTML = `<i class="fas fa-clock"></i>&nbsp; ${readTime} min read`;
}


// --- TOOLBAR ACTIONS ---

/**
 * Executes a document formatting command.
 * @param {string} cmd - The command to execute (e.g., 'bold', 'italic').
 * @param {string|null} value - The value for the command, if any.
 */
function formatDoc(cmd, value = null) {
    document.execCommand(cmd, false, value);
    editor.focus();
}

/**
 * Applies a CSS style to the selected text.
 * This function has a robust fallback for complex selections that cross element boundaries.
 * @param {string} styleProperty - The CSS property to apply (e.g., 'fontSize').
 * @returns {function(string): void} A function that takes the style value.
 */
function applyStyleToSelection(styleProperty) {
    return function(styleValue) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        if (range.collapsed) {
            document.execCommand('formatBlock', false, 'div');
            const container = range.startContainer.parentNode;
            if (container && container !== editor) {
                container.style[styleProperty] = styleValue;
            }
        } else {
            const span = document.createElement('span');
            span.style[styleProperty] = styleValue;
            try {
                range.surroundContents(span);
            } catch (e) {
                // Fallback for complex selections (e.g., across multiple paragraphs).
                // Uses a "magic color" to mark the text, which is safer than using generic tags.
                const magicColor = '#1a2b3c';
                document.execCommand('foreColor', false, magicColor);
                
                editor.querySelectorAll(`font[color="${magicColor}"]`).forEach(tempEl => {
                    const newSpan = document.createElement('span');
                    newSpan.style[styleProperty] = styleValue;
                    while (tempEl.firstChild) {
                        newSpan.appendChild(tempEl.firstChild);
                    }
                    tempEl.parentNode.replaceChild(newSpan, tempEl);
                });
            }
        }
        editor.focus();
    };
}


/**
 * Inserts a custom checkbox element into the editor.
 */
function insertCheckbox() {
    const checkboxWrapper = document.createElement('span');
    checkboxWrapper.contentEditable = false;
    checkboxWrapper.innerHTML = '<input type="checkbox" />&nbsp;';
    
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(checkboxWrapper);
        // Place cursor after the inserted checkbox
        range.setStartAfter(checkboxWrapper);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

/**
 * Inserts a horizontal rule (divider) into the editor.
 */
function insertDivider() {
    // Using insertHTML is a reliable way to add the HR and a new block for typing.
    // It places the content at the cursor, splitting blocks if necessary,
    // and the browser will automatically place the cursor in the new div.
    document.execCommand('insertHTML', false, '<hr><div><br></div>');
    editor.focus();
}

/**
 * Toggles between light and dark mode.
 */
function toggleMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
}

/**
 * Downloads the entire notepad state (all tabs) as a JSON file.
 */
function downloadJSON() {
    saveCurrentTabContent();
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'notepad-data.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showPopupMessage('Notepad data downloaded!');
}

/**
 * Opens a file dialog to upload and load a notepad state from a JSON file.
 */
function uploadJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            try {
                const parsedState = JSON.parse(readerEvent.target.result);
                if (parsedState && Array.isArray(parsedState.tabs) && parsedState.hasOwnProperty('activeTabId')) {
                    state = parsedState;
                    initTabs(); // Re-initialize UI with the new state
                    saveState();
                    showPopupMessage('Notepad data loaded successfully!');
                } else {
                    showPopupMessage('Invalid notepad data file.');
                }
            } catch (error) {
                console.error("Failed to parse JSON", error);
                showPopupMessage('Could not read the file. Is it a valid JSON?');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

/**
 * Generates and downloads a PDF of the current tab's content.
 */
function downloadPDF() {
    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
    if (!activeTab) return;

    showPopupMessage('Generating PDF...');

    const printContainer = document.createElement('div');
    const contentWrapper = document.createElement('div');
    contentWrapper.style.backgroundColor = '#ffffff';
    contentWrapper.style.color = '#000000';
    contentWrapper.style.fontFamily = `'Sanchez', serif`;

    const pdfContent = document.createElement('div');
    pdfContent.style.padding = '20px 40px';
    pdfContent.style.lineHeight = '1.6';
    pdfContent.style.fontSize = '14px';
    pdfContent.innerHTML = editor.innerHTML;
    
    pdfContent.querySelectorAll('a').forEach(link => { link.style.color = '#0000EE'; });

    contentWrapper.appendChild(pdfContent);
    printContainer.appendChild(contentWrapper);
    
    const options = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${activeTab.name}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(contentWrapper).set(options).save().then(() => {
        showPopupMessage('PDF downloaded!');
    }).catch(err => {
        showPopupMessage('Error creating PDF.');
        console.error('PDF generation error:', err);
    });
}

/**
 * Downloads the current tab's content as a standalone HTML file.
 */
function downloadHTML() {
    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
    if (!activeTab) return;

    const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${activeTab.name}</title><style>body{font-family:'Sanchez',serif;line-height:1.6;max-width:800px;margin:40px auto;padding:0 20px;}</style></head><body>${editor.innerHTML}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activeTab.name}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
    showPopupMessage('HTML file downloaded!');
}

/**
 * Copies the plain text content of the editor to the clipboard.
 */
function copyText() {
    navigator.clipboard.writeText(editor.innerText)
        .then(() => showPopupMessage('Text copied to clipboard!'))
        .catch(err => {
            showPopupMessage('Failed to copy text.');
            console.error('Copy failed', err);
        });
}

// --- POPUP & UI FEEDBACK ---

/**
 * Shows a generic popup with a set of options for the user to click.
 * @param {string} title - The title of the popup.
 * @param {string[]} options - An array of options to display as buttons.
 * @param {function} callback - The function to call with the selected option.
 */
function showOptionsPopup(title, options, callback) {
    popup.innerHTML = `
        <h3>${title}</h3>
        <div class="options-container">
            ${options.map(option => {
                if (title === 'Text Color') {
                    return `<button class="color-swatch" style="background-color: ${option};" data-value="${option}" title="${option}"></button>`;
                }
                return `<button data-value="${option}">${option}</button>`;
            }).join('')}
        </div>`;
    popup.className = 'popup options';
    popup.onclick = (e) => {
        const target = e.target.closest('button[data-value]');
        if (target) {
            callback(target.dataset.value);
            hidePopup();
        }
    };
    popupOverlay.classList.remove('hidden');
    appContent.classList.add('blurred');
}

/**
 * Shows a popup for inserting or editing a hyperlink.
 */
function showLinkPopup() {
    popup.innerHTML = `
        <h3>Add Link</h3>
        <div class="popup-input-container">
            <input type="text" id="link-url-input" placeholder="https://example.com" />
        </div>
        <div class="popup-actions">
            <button id="link-cancel-btn">Cancel</button>
            <button id="link-ok-btn">OK</button>
        </div>`;
    popup.className = 'popup input';
    popupOverlay.classList.remove('hidden');
    appContent.classList.add('blurred');

    const input = document.getElementById('link-url-input');
    input.focus();

    document.getElementById('link-ok-btn').onclick = () => {
        let url = input.value.trim();
        if (url) {
            if (!/^(https?:\/\/|mailto:)/i.test(url)) {
                url = 'http://' + url;
            }
            if (currentSelection) {
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(currentSelection);
                document.execCommand('createLink', false, url);
                
                const activeLink = selection.anchorNode.parentElement.closest('a');
                if(activeLink) {
                    activeLink.target = '_blank';
                    activeLink.rel = 'noopener noreferrer';
                }
            }
            hidePopup();
        }
    };

    document.getElementById('link-cancel-btn').onclick = hidePopup;
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('link-ok-btn').click();
        }
    };
}

/**
 * Displays a short-lived message in a popup.
 * @param {string} message - The message to display.
 */
function showPopupMessage(message) {
    if (messageTimeout) clearTimeout(messageTimeout);

    popup.innerHTML = `<div class="popup-message-content">${message}</div>`;
    popup.className = 'popup message';
    
    popupOverlay.classList.remove('hidden');
    appContent.classList.add('blurred');

    messageTimeout = setTimeout(hidePopup, 2000);
}

/**
 * Hides the currently active popup.
 */
function hidePopup() {
    popupOverlay.classList.add('hidden');
    appContent.classList.remove('blurred');
    popup.innerHTML = '';
    popup.className = '';
    currentSelection = null; // Clear saved selection
    editor.focus();
}
