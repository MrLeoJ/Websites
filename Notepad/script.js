

// DOM Elements
const editor = document.getElementById('editor');
const wordCharCountEl = document.getElementById('wordCharCount');
const readTimeEl = document.getElementById('readTime');
const popup = document.getElementById('popup');
const popupOverlay = document.getElementById('popup-overlay');
const appContent = document.getElementById('app-content');
const tabsList = document.getElementById('tabs-list');

// State Management
let state = {
    tabs: [],
    activeTabId: null,
};
let clickTimeout = null;
let messageTimeout = null;
let currentSelection = null;
let saveTimer = null; // For debouncing editor saves


// Toolbar Options
const fontFamilies = ['Sanchez', 'Poppins', 'Prata', 'Roboto', 'Merienda'];
const fontSizes = ['12px', '13px', '14px', '16px', '18px', '20px', '24px', '28px'];
const letterSpacings = ['normal', '0.5px', '1px', '1.5px', '2px'];
const lineSpacings = ['1', '1.25', '1.5', '1.75', '2'];
const colors = ['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#FF7F50', '#FFFF00', '#00FFFF', '#FF00FF', '#C0C0C0', '#808080'];
const alignments = ['Left', 'Center', 'Right', 'Justify'];

// --- INITIALIZATION ---
window.addEventListener('load', () => {
    loadState();
    initTabs();
    initSortable();
    initDarkMode();
    setupEventListeners();
    setupMutationObserver();
    editor.focus();
    document.execCommand('styleWithCSS', false, true);
});

// Add beforeunload listener to guarantee data is saved on exit.
window.addEventListener('beforeunload', () => {
    // First, commit any pending tab name changes. This handles the case where a user
    // edits a tab name and refreshes the page before the 'blur' event can save the change.
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

    // If a content save is scheduled, cancel it to avoid redundant saves.
    if (saveTimer) {
        clearTimeout(saveTimer);
    }
    
    // Finally, save the current tab's content. This function also calls saveState(),
    // persisting both the editor content and any tab name changes made above.
    saveCurrentTabContent();
});

function loadState() {
    const savedState = localStorage.getItem('notepadState');
    if (savedState) {
        try {
            const parsedState = JSON.parse(savedState);
            // Add validation to ensure the loaded data is in the expected format.
            if (parsedState && Array.isArray(parsedState.tabs) && parsedState.hasOwnProperty('activeTabId')) {
                state = parsedState;
            } else {
                // This handles cases where localStorage has data but it's not the right shape.
                console.warn('Found invalid state in localStorage. Starting with a fresh state.');
            }
        } catch (e) {
            console.error('Failed to parse notepad state from localStorage. Starting fresh.', e);
            // If JSON is corrupted, we'll start with a fresh state instead of crashing.
        }
    }
}

function saveState() {
    localStorage.setItem('notepadState', JSON.stringify(state));
}

function initTabs() {
    // If state is empty, create a default tab.
    if (state.tabs.length === 0) {
        const newTab = { id: Date.now(), name: 'Tab #1', content: '' };
        state.tabs.push(newTab);
        state.activeTabId = newTab.id;
        saveState(); // Persist the newly created tab state immediately.
    }

    // Ensure the activeTabId is valid, falling back to the first tab if not.
    let activeTab = state.tabs.find(t => t.id === state.activeTabId);
    if (!activeTab && state.tabs.length > 0) {
        state.activeTabId = state.tabs[0].id;
        activeTab = state.tabs[0];
        saveState(); // Correct the invalid activeTabId in storage.
    }

    // Render the tab UI.
    renderTabs();

    // Load the active tab's content into the editor and update counts.
    if (activeTab) {
        editor.innerHTML = activeTab.content || '';
        updateCounts();
    }
}


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

function initDarkMode() {
    const modeIcon = document.getElementById('mode-icon');
    if (localStorage.getItem('darkMode') === 'false') {
        document.body.classList.remove('dark-mode');
    } else {
        document.body.classList.add('dark-mode');
    }
}

// --- TAB MANAGEMENT ---
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
        
        tabEl.addEventListener('click', () => {
             // Use a timeout to distinguish between single and double clicks
            if (clickTimeout) {
                clearTimeout(clickTimeout);
                clickTimeout = null;
                return; // It's a double click, do nothing here
            }
            clickTimeout = setTimeout(() => {
                switchTab(tab.id);
                clickTimeout = null;
            }, 250);
        });

        tabEl.addEventListener('dblclick', () => {
            clearTimeout(clickTimeout);
            clickTimeout = null;
            tabName.contentEditable = true;
            tabName.focus();
            document.execCommand('selectAll', false, null);
        });

        tabName.addEventListener('blur', () => {
            tabName.contentEditable = false;
            if (tabName.textContent.trim() === '') {
                tabName.textContent = tab.name; // Revert if empty
            } else {
                tab.name = tabName.textContent;
            }
            saveState();
        });

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

function addTab() {
    saveCurrentTabContent(); // Save current tab before adding a new one
    const newTab = { id: Date.now(), name: `Tab #${state.tabs.length + 1}`, content: '' };
    state.tabs.push(newTab);
    switchTab(newTab.id);
}

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

function deleteTab(tabIdToDelete) {
    const tabIndex = state.tabs.findIndex(t => t.id === tabIdToDelete);
    if (tabIndex === -1) return;

    const wasActive = state.activeTabId === tabIdToDelete;

    // Remove tab from state
    state.tabs.splice(tabIndex, 1);

    if (wasActive) {
        // If it was the active tab, we need to pick a new one and switch
        if (state.tabs.length > 0) {
            const newActiveIndex = Math.max(0, tabIndex - 1);
            state.activeTabId = state.tabs[newActiveIndex].id;
            switchTab(state.activeTabId);

        } else {
            // No tabs left, create a new one
            addTab();
        }
    } else {
        // It was not the active tab. Just re-render the tabs and save.
        renderTabs();
        saveState();
    }
}

// --- EVENT LISTENERS & OBSERVER ---
function setupEventListeners() {
    editor.addEventListener('paste', handlePaste);
    editor.addEventListener('keydown', handleKeyDown);
    editor.addEventListener('click', handleEditorClick);

    document.getElementById('add-tab-btn').onclick = addTab;
    document.getElementById('textColor-btn').onclick = () => showOptionsPopup('Text Color', colors, (color) => formatDoc('foreColor', color));
    document.getElementById('fontFamily-btn').onclick = () => showOptionsPopup('Font Family', fontFamilies, (font) => formatDoc('fontName', font));
    document.getElementById('fontSize-btn').onclick = () => showOptionsPopup('Font Size', fontSizes, applyStyleToSelection('fontSize'));
    document.getElementById('letterSpacing-btn').onclick = () => showOptionsPopup('Letter Spacing', letterSpacings, applyStyleToSelection('letterSpacing'));
    document.getElementById('lineSpacing-btn').onclick = () => showOptionsPopup('Line Spacing', lineSpacings, applyStyleToSelection('lineHeight'));
    document.getElementById('textAlign-btn').onclick = () => showOptionsPopup('Text Align', alignments, (val) => formatDoc('justify' + val));
    
    document.getElementById('bold-btn').onclick = () => formatDoc('bold');
    document.getElementById('italic-btn').onclick = () => formatDoc('italic');
    document.getElementById('underline-btn').onclick = () => formatDoc('underline');
    document.getElementById('strikethrough-btn').onclick = () => formatDoc('strikethrough');
    document.getElementById('superscript-btn').onclick = () => formatDoc('superscript');
    document.getElementById('subscript-btn').onclick = () => formatDoc('subscript');
    document.getElementById('ul-btn').onclick = () => formatDoc('insertUnorderedList');
    document.getElementById('ol-btn').onclick = () => formatDoc('insertOrderedList');
    document.getElementById('checkbox-btn').onclick = insertCheckbox;
    
    document.getElementById('pdf-btn').onclick = downloadPDF;
    document.getElementById('html-btn').onclick = downloadHTML;
    document.getElementById('copy-btn').onclick = copyText;
    document.getElementById('download-json-btn').onclick = downloadJSON;
    document.getElementById('upload-json-btn').onclick = uploadJSON;
    document.getElementById('modeToggle-btn').onclick = toggleMode;

    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) {
            hidePopup();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!popupOverlay.classList.contains('hidden')) {
                hidePopup();
            }
        }
    });
}

function setupMutationObserver() {
    const observer = new MutationObserver(() => {
        handleEditorChange();
    });

    observer.observe(editor, {
        childList: true,
        subtree: true,
        characterData: true,
    });
}

// --- EDITOR HANDLERS ---
function handleEditorChange() {
    updateCounts();
    // Debounce the save operation to improve performance and avoid rapid-fire saves from MutationObserver.
    if (saveTimer) {
        clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(saveCurrentTabContent, 500); // Save 500ms after the last change.
}

function saveCurrentTabContent() {
    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
    if (activeTab) {
        // Only save if the content has actually changed to prevent redundant saves.
        if (activeTab.content !== editor.innerHTML) {
            activeTab.content = editor.innerHTML;
            saveState();
        }
    }
}

function handleEditorClick(e) {
    const link = e.target.closest('a');
    if (link && link.href) {
        e.preventDefault();
        window.open(link.href, '_blank', 'noopener,noreferrer');
    }
}

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

function getSelectionInfo() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return {};
    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    let block = node;
    while (block && block.parentNode !== editor) {
        block = block.parentNode;
        if (block === editor) break;
    }
    
    if (!block || block === editor) {
        block = node.nodeType === 1 ? node : node.parentNode;
    }
    
    const rangeBefore = document.createRange();
    let atBlockStart = false;
    if (block !== editor && block.isContentEditable) {
        try {
            rangeBefore.setStart(block, 0);
            rangeBefore.setEnd(range.startContainer, range.startOffset);
            atBlockStart = rangeBefore.toString().trim() === '';
        } catch (e) {
            // Error can happen in complex scenarios, default to false
            atBlockStart = false;
        }
    }

    return { selection, range, node, block, atBlockStart };
}


function handleKeyDown(e) {
    // Markdown-style shortcuts
    if (e.key === ' ') {
        const { selection, range, node } = getSelectionInfo();
        if (node && range.collapsed && node.nodeType === 3) { // nodeType 3 is Text node
            const textBeforeCursor = node.textContent.substring(0, range.startOffset);
            const trimmedText = textBeforeCursor.trim();

            if (trimmedText === '*' || trimmedText === '[]') {
                e.preventDefault();
                const startIndex = textBeforeCursor.indexOf(trimmedText);

                // Manually remove the trigger text by rebuilding the text node's content
                node.textContent = node.textContent.substring(0, startIndex) + node.textContent.substring(range.startOffset);

                // Move cursor to the position where the trigger text was
                range.setStart(node, startIndex);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);

                if (trimmedText === '*') {
                    formatDoc('insertUnorderedList');
                } else { // '[]'
                    insertCheckbox();
                }
                return;
            }
        }
    }

    if (e.key === 'Enter') {
        const { selection, block } = getSelectionInfo();
        if (block && block !== editor && block.textContent.trim() === '---') {
            e.preventDefault();
            const hr = document.createElement('hr');
            const parent = block.parentNode;
            parent.replaceChild(hr, block);
            
            const newBlock = document.createElement('div');
            newBlock.innerHTML = '<br>'; // Ensures it's visible and editable
            parent.insertBefore(newBlock, hr.nextSibling);
            
            const newRange = document.createRange();
            newRange.setStart(newBlock, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
            return;
        }
    }

    // Use a single modifier check for Ctrl on Win/Linux and Cmd on Mac
    const modifier = e.ctrlKey || e.metaKey;

    if (modifier && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const selection = window.getSelection();
        if (selection.toString().length > 0) {
            currentSelection = selection.getRangeAt(0).cloneRange();
            showLinkPopup();
        } else {
            showPopupMessage('Select text to create a link');
        }
        return; // Early return to not conflict with other shortcuts
    }
    
    // Formatting shortcuts
    if (modifier) {
        let command = null;
        switch(e.key.toLowerCase()){
            case 'b': command = 'bold'; break;
            case 'i': command = 'italic'; break;
            case 'u': command = 'underline'; break;
            case 's': if(e.shiftKey) command = 'strikethrough'; break;
            case '.': command = 'superscript'; break;
            case ',': command = 'subscript'; break;
            case '7': if(e.shiftKey) command = 'insertUnorderedList'; break;
            case '8': if(e.shiftKey) command = 'insertOrderedList'; break;
        }
        if(command){
            e.preventDefault();
            formatDoc(command);
            return;
        }
    }

    if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        document.execCommand('indent');
    }
    if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        document.execCommand('outdent');
    }
}

function updateCounts() {
    // To accurately count, we create a temporary clone of the editor 
    // and remove elements that shouldn't be part of the count.
    const editorClone = editor.cloneNode(true);

    // Remove horizontal rules which don't count as text
    editorClone.querySelectorAll('hr').forEach(hr => hr.remove());

    // Remove checkbox wrappers, which contain a non-rendering input and a space character
    editorClone.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        if (checkbox.parentElement) {
            checkbox.parentElement.remove();
        }
    });

    // Remove divs that are just placeholders for the '---' divider
    Array.from(editorClone.children).forEach(child => {
        if (child.textContent.trim() === '---') {
            child.remove();
        }
    });

    const text = editorClone.innerText;
    const trimmedText = text.trim();

    // Word count is based on trimmed text, splitting by one or more whitespace characters.
    const wordCount = trimmedText === '' ? 0 : trimmedText.split(/\s+/).filter(Boolean).length;
    
    // Character count should be 0 if the editor is effectively empty (contains only whitespace).
    // Otherwise, it's the length of the text from our cleaned-up clone.
    const charCount = trimmedText === '' ? 0 : text.length;
    
    const readTime = Math.ceil(wordCount / 200);

    wordCharCountEl.innerHTML = `<i class="fas fa-font"></i>&nbsp; ${wordCount} words &nbsp;|&nbsp; ${charCount} characters`;
    readTimeEl.innerHTML = `<i class="fas fa-clock"></i>&nbsp; ${readTime} min read`;
}


// --- TOOLBAR ACTIONS ---
function formatDoc(cmd, value = null) {
    document.execCommand(cmd, false, value);
    editor.focus();
}

function applyStyleToSelection(styleProperty) {
    return function(styleValue) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        if (range.collapsed) {
            document.execCommand('formatBlock', false, 'div');
            const container = range.startContainer.parentNode;
            if(container && container !== editor) {
                 container.style[styleProperty] = styleValue;
            }
        } else {
            const span = document.createElement('span');
            span.style[styleProperty] = styleValue;
            
            try {
                range.surroundContents(span);
            } catch (e) {
                // Fallback for complex selections
                document.execCommand('fontSize', false, '7'); // a large size
                const tempElements = editor.getElementsByTagName('font');
                while(tempElements.length > 0) {
                    const tempEl = tempElements[0];
                    const parent = tempEl.parentNode;
                    const newSpan = document.createElement('span');
                    newSpan.style[styleProperty] = styleValue;
                    newSpan.innerHTML = tempEl.innerHTML;
                    parent.replaceChild(newSpan, tempEl);
                }
                 document.execCommand('fontSize', false, '3'); // reset to default
            }
        }
        
        editor.focus();
    };
}


function insertCheckbox() {
    const checkboxWrapper = document.createElement('span');
    checkboxWrapper.contentEditable = false;
    checkboxWrapper.innerHTML = '<input type="checkbox" />&nbsp;';
    
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(checkboxWrapper);
        range.setStartAfter(checkboxWrapper);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

function toggleMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
}

function downloadJSON() {
    saveCurrentTabContent();
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'notepad-data.json';
    document.body.appendChild(a); // For compatibility
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    showPopupMessage('Notepad data downloaded!');
}

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

                    if (state.tabs.length === 0) {
                        // If loaded state is empty, re-initialize
                        initTabs();
                        showPopupMessage('Empty notepad loaded, created a new tab.');
                        return;
                    }
                    
                    let activeTab = state.tabs.find(t => t.id === state.activeTabId);
                    
                    // If active tab from file is not found, default to the first tab
                    if (!activeTab) {
                        state.activeTabId = state.tabs[0].id;
                        activeTab = state.tabs[0];
                    }

                    // Manually update the UI since switchTab() might not trigger a change
                    editor.innerHTML = activeTab.content || '';
                    renderTabs();
                    updateCounts();
                    saveState(); // Save the newly loaded state

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

function downloadPDF() {
    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
    if (!activeTab) return;

    showPopupMessage('Generating PDF...');

    // Create a temporary, off-screen container for PDF generation
    const printContainer = document.createElement('div');
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.width = '210mm'; // A4 width

    // This wrapper ensures a consistent white background and black text for the PDF
    const contentWrapper = document.createElement('div');
    contentWrapper.style.backgroundColor = '#ffffff';
    contentWrapper.style.color = '#000000';
    contentWrapper.style.padding = '0';
    contentWrapper.style.margin = '0';
    contentWrapper.style.fontFamily = `'Sanchez', serif`;

    const pdfContent = document.createElement('div');
    pdfContent.style.padding = '20px 40px';
    pdfContent.style.lineHeight = '1.6';
    pdfContent.style.fontSize = '14px';
    pdfContent.style.fontFamily = 'inherit';
    pdfContent.style.color = 'inherit';
    pdfContent.style.backgroundColor = 'inherit';
    pdfContent.innerHTML = editor.innerHTML;
    
    // Force link color to be standard blue for PDF
    pdfContent.querySelectorAll('a').forEach(link => {
        link.style.color = '#0000EE';
    });

    contentWrapper.appendChild(pdfContent);
    printContainer.appendChild(contentWrapper);
    document.body.appendChild(printContainer);
    
    const options = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${activeTab.name}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(contentWrapper).set(options).save().then(() => {
        document.body.removeChild(printContainer); // Clean up the temporary element
        showPopupMessage('PDF downloaded!');
    }).catch(err => {
        document.body.removeChild(printContainer);
        showPopupMessage('Error creating PDF.');
        console.error('PDF generation error:', err);
    });
}


function downloadHTML() {
    const activeTab = state.tabs.find(t => t.id === state.activeTabId);
    if (!activeTab) return;

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${activeTab.name}</title>
            <style>
                body { 
                    font-family: 'Sanchez', serif; 
                    line-height: 1.6;
                    max-width: 800px;
                    margin: 40px auto;
                    padding: 0 20px;
                }
            </style>
        </head>
        <body>
            ${editor.innerHTML}
        </body>
        </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activeTab.name}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
    showPopupMessage('HTML file downloaded!');
}

function copyText() {
    const textToCopy = editor.innerText;
    navigator.clipboard.writeText(textToCopy)
        .then(() => showPopupMessage('Text copied to clipboard!'))
        .catch(err => {
            showPopupMessage('Failed to copy text.');
            console.error('Copy failed', err);
        });
}


// --- POPUP & UI FEEDBACK ---
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
        </div>
    `;
    popup.className = 'popup options';
    popup.onclick = (e) => {
        const target = e.target.closest('button');
        if (target && target.dataset.value) {
            callback(target.dataset.value);
            hidePopup();
        }
    };
    popupOverlay.classList.remove('hidden');
    appContent.classList.add('blurred');
}

function showLinkPopup() {
    popup.innerHTML = `
        <h3>Add Link</h3>
        <div class="popup-input-container">
            <input type="text" id="link-url-input" placeholder="https://example.com" />
        </div>
        <div class="popup-actions">
            <button id="link-cancel-btn">Cancel</button>
            <button id="link-ok-btn">OK</button>
        </div>
    `;
    popup.className = 'popup input';
    popupOverlay.classList.remove('hidden');
    appContent.classList.add('blurred');

    const input = document.getElementById('link-url-input');
    input.focus();

    document.getElementById('link-ok-btn').onclick = () => {
        let url = input.value.trim();
        if (url) {
            if (!/^https?:\/\//i.test(url)) {
                url = 'http://' + url;
            }
            if (currentSelection) {
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(currentSelection);
                document.execCommand('createLink', false, url);
                
                // Set target to _blank for the new link
                const activeLink = selection.anchorNode.parentElement;
                if(activeLink.tagName === 'A') {
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

function showPopupMessage(message) {
    if (messageTimeout) clearTimeout(messageTimeout);

    popup.innerHTML = `<div class="popup-message-content">${message}</div>`;
    popup.className = 'popup message';
    
    popupOverlay.classList.remove('hidden');
    appContent.classList.add('blurred');

    messageTimeout = setTimeout(() => {
        hidePopup();
    }, 2000);
}

function hidePopup() {
    popupOverlay.classList.add('hidden');
    appContent.classList.remove('blurred');
    popup.innerHTML = '';
    popup.className = '';
    currentSelection = null; // Clear saved selection
    editor.focus();
}
