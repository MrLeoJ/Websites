document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const pageTitle = document.getElementById('page-title');
    const argumentsContainer = document.getElementById('arguments-container');
    const emptyState = document.getElementById('empty-state');
    // Removed old add buttons
    const addArgumentBtn = document.getElementById('add-argument-btn'); // New add button
    const importBtn = document.getElementById('import-btn');
    const exportBtn = document.getElementById('export-btn');
    const importDialog = document.getElementById('import-dialog');
    const closeImportDialog = document.getElementById('close-import-dialog');
    const chooseFileBtn = document.getElementById('choose-file-btn');
    const fileInput = document.getElementById('file-input');
    const jsonInput = document.getElementById('json-input');
    const cancelImport = document.getElementById('cancel-import');
    const confirmImport = document.getElementById('confirm-import');
    const editDialog = document.getElementById('edit-dialog');
    const closeEditDialog = document.getElementById('close-edit-dialog');
    const editTextInput = document.getElementById('edit-text-input');
    const cancelEdit = document.getElementById('cancel-edit');
    const confirmEdit = document.getElementById('confirm-edit');
    const verdict = document.getElementById('verdict');
    const verdictDetails = document.getElementById('verdict-details'); // Added verdict details element
    const toast = document.getElementById('toast');
    const toastTitle = document.querySelector('.toast-title');
    const toastMessage = document.querySelector('.toast-message');

    // State
    let argumentsList = [];
    let currentEditId = null;

    // Initialize sortable
    let sortable = null;

    function initSortable() {
      if (sortable) {
        sortable.destroy();
      }

      sortable = new Sortable(argumentsContainer, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: () => {
          // Update arguments array based on new DOM order
          const argumentElements = Array.from(argumentsContainer.querySelectorAll('.argument'));
          argumentsList = argumentElements.map(element => {
            const id = element.dataset.id;
            return argumentsList.find(arg => arg.id === id);
          });
          updateVerdict();
          saveToLocalStorage();
        }
      });
    }

    // Event Listeners
    addArgumentBtn.addEventListener('click', () => addArgument('pro')); // New button adds 'pro' by default
    // Removed old add button listeners
    importBtn.addEventListener('click', () => showDialog(importDialog));
    exportBtn.addEventListener('click', exportToJson);
    closeImportDialog.addEventListener('click', () => hideDialog(importDialog));
    cancelImport.addEventListener('click', () => hideDialog(importDialog));
    confirmImport.addEventListener('click', importFromJson);
    chooseFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    closeEditDialog.addEventListener('click', () => hideDialog(editDialog));
    cancelEdit.addEventListener('click', () => hideDialog(editDialog));
    confirmEdit.addEventListener('click', saveEdit);

    // Make title editable
    pageTitle.addEventListener('dblclick', () => {
      pageTitle.contentEditable = true;
      pageTitle.classList.add('editing');
      pageTitle.focus();

      // Select all text
      const range = document.createRange();
      range.selectNodeContents(pageTitle);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });

    pageTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        pageTitle.blur();
      } else if (e.key === 'Escape') {
        pageTitle.blur();
      }
    });

    pageTitle.addEventListener('blur', () => {
      pageTitle.contentEditable = false;
      pageTitle.classList.remove('editing');
      saveToLocalStorage();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideDialog(importDialog);
        hideDialog(editDialog);
      } else if (e.key === 'Enter' && editDialog.classList.contains('active')) {
        saveEdit();
      }
    });

    function addArgument(type) {
        const id = Date.now().toString();
        const newArgument = {
          id,
          text: `New ${type === 'pro' ? 'Pro' : 'Con'}`, // Text generation remains the same
          type,
          importance: 5
        };
  
        // *** CHANGE IS HERE ***
        // If it's a 'pro', add to the beginning (top)
        // Otherwise (if it's 'con'), add to the end (bottom)
        if (type === 'pro') {
          argumentsList.unshift(newArgument); // Add to the start of the array
        } else {
          argumentsList.push(newArgument);    // Add to the end of the array
        }
        // *** END OF CHANGE ***
  
        renderArguments(); // Re-render the list with the new order
        // updateVerdict(); // updateVerdict is called inside renderArguments, no need to call twice
        saveToLocalStorage();
  
        showToast('Argument Added', `A new ${type} argument has been added.`);
      }

    function removeArgument(id) {
      argumentsList = argumentsList.filter(arg => arg.id !== id);
      renderArguments();
      updateVerdict();
      saveToLocalStorage();

      showToast('Argument Removed', 'The argument has been removed.');
    }

    function updateArgumentType(id, type) {
      argumentsList = argumentsList.map(arg =>
        arg.id === id ? { ...arg, type } : arg
      );
      renderArguments();
      updateVerdict();
      saveToLocalStorage();
    }

    function updateArgumentImportance(id, importance) {
      argumentsList = argumentsList.map(arg =>
        arg.id === id ? { ...arg, importance } : arg
      );
      updateVerdict(); // No need to re-render, just update verdict
      saveToLocalStorage();
    }

    function startEditing(id) {
      const argument = argumentsList.find(arg => arg.id === id);
      if (!argument) return;

      currentEditId = id;
      editTextInput.value = argument.text;
      showDialog(editDialog);
      setTimeout(() => editTextInput.focus(), 100);
    }

    function saveEdit() {
      if (!currentEditId || editTextInput.value.trim() === '') return;

      argumentsList = argumentsList.map(arg =>
        arg.id === currentEditId ? { ...arg, text: editTextInput.value.trim() } : arg
      );

      hideDialog(editDialog);
      renderArguments(); // Re-render needed as text changed
      saveToLocalStorage();
    }

    function updateVerdict() {
      const proSum = argumentsList
        .filter(arg => arg.type === 'pro')
        .reduce((sum, arg) => sum + arg.importance, 0);

      const conSum = argumentsList
        .filter(arg => arg.type === 'con')
        .reduce((sum, arg) => sum + arg.importance, 0);

      const result = proSum === conSum ? 'EVEN' : (proSum > conSum ? 'YES' : 'NO'); // Handle tie case
      const difference = Math.abs(proSum - conSum);

      verdict.textContent = result;
      verdict.className = `verdict-result ${result.toLowerCase()}`;

      // Update verdict details
      verdictDetails.textContent = `Pros: ${proSum} | Cons: ${conSum} | Gap: ${difference}`;
    }

    function renderArguments() {
      argumentsContainer.innerHTML = '';

      if (argumentsList.length === 0) {
        emptyState.style.display = 'block';
      } else {
        emptyState.style.display = 'none';
      }

      argumentsList.forEach(arg => {
        const argumentElement = document.createElement('div');
        argumentElement.className = `argument ${arg.type}`;
        argumentElement.dataset.id = arg.id;

        const textElement = document.createElement('div');
        textElement.className = 'argument-text';
        textElement.textContent = arg.text;
        textElement.addEventListener('dblclick', () => startEditing(arg.id));

        const actionsElement = document.createElement('div');
        actionsElement.className = 'argument-actions';

        // Pro button
        const proBtn = document.createElement('button');
        proBtn.className = `icon-btn ${arg.type === 'pro' ? 'active' : ''}`;
        proBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        proBtn.setAttribute('data-tooltip', 'Pro');
        proBtn.addEventListener('click', () => updateArgumentType(arg.id, 'pro'));

        // Con button
        const conBtn = document.createElement('button');
        conBtn.className = `icon-btn ${arg.type === 'con' ? 'active' : ''}`;
        conBtn.innerHTML = '<i class="fas fa-arrow-down"></i>';
        conBtn.setAttribute('data-tooltip', 'Con');
        conBtn.addEventListener('click', () => updateArgumentType(arg.id, 'con'));

        // Importance select
        const importanceSelect = document.createElement('select');
        importanceSelect.className = 'importance-select';
        importanceSelect.setAttribute('data-tooltip', 'Set Importance');

        for (let i = 1; i <= 10; i++) {
          const option = document.createElement('option');
          option.value = i;
          option.textContent = i;
          if (i === arg.importance) {
            option.selected = true;
          }
          importanceSelect.appendChild(option);
        }

        importanceSelect.addEventListener('change', (e) => {
          updateArgumentImportance(arg.id, parseInt(e.target.value));
        });

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'icon-btn';
        removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
        removeBtn.setAttribute('data-tooltip', 'Delete');
        removeBtn.addEventListener('click', () => removeArgument(arg.id));

        actionsElement.appendChild(proBtn);
        actionsElement.appendChild(conBtn);
        actionsElement.appendChild(importanceSelect);
        actionsElement.appendChild(removeBtn);

        argumentElement.appendChild(textElement);
        argumentElement.appendChild(actionsElement);

        argumentsContainer.appendChild(argumentElement);
      });

      // Reinitialize sortable after rendering
      initSortable();
      updateVerdict(); // Ensure verdict is correct after render
    }

    function exportToJson() {
      const data = {
        title: pageTitle.textContent,
        arguments: argumentsList
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pros-cons-data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Export Successful', 'Your data has been exported as JSON.');
    }

    function importFromJson() {
      try {
        const data = JSON.parse(jsonInput.value);
        // Basic validation
        if (!data || typeof data !== 'object') throw new Error('Invalid JSON structure: not an object');
        if (typeof data.title !== 'string') throw new Error('Invalid JSON structure: title missing or not a string');
        if (!Array.isArray(data.arguments)) throw new Error('Invalid JSON structure: arguments missing or not an array');

        // More thorough validation of arguments array elements can be added here if needed
        data.arguments.forEach((arg, index) => {
            if (!arg || typeof arg !== 'object') throw new Error(`Invalid argument at index ${index}: not an object`);
            if (typeof arg.id !== 'string') throw new Error(`Invalid argument at index ${index}: id missing or not a string`);
            if (typeof arg.text !== 'string') throw new Error(`Invalid argument at index ${index}: text missing or not a string`);
            if (arg.type !== 'pro' && arg.type !== 'con') throw new Error(`Invalid argument at index ${index}: type must be 'pro' or 'con'`);
            if (typeof arg.importance !== 'number' || arg.importance < 1 || arg.importance > 10) throw new Error(`Invalid argument at index ${index}: importance must be a number between 1 and 10`);
        });


        pageTitle.textContent = data.title;
        argumentsList = data.arguments;
        renderArguments();
        updateVerdict(); // Already called inside renderArguments
        saveToLocalStorage();
        hideDialog(importDialog);
        jsonInput.value = '';

        showToast('Import Successful', 'Your data has been imported.');

      } catch (error) {
        console.error("Import Error:", error);
        showToast('Import Failed', error.message || 'Invalid JSON format. Please check your file.', true);
      }
    }

    function handleFileUpload(e) {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          if (event.target && typeof event.target.result === 'string') {
             jsonInput.value = event.target.result;
          } else {
             throw new Error('File content could not be read as text.');
          }
        } catch (error) {
          showToast('File Read Error', error.message || 'Could not read the file.', true);
        }
      };
      reader.onerror = () => {
         showToast('File Read Error', 'An error occurred while reading the file.', true);
      }
      reader.readAsText(file);
    }

    function showDialog(dialog) {
      dialog.classList.add('active');
    }

    function hideDialog(dialog) {
      dialog.classList.remove('active');
      // Reset file input and text area when closing import dialog
      if (dialog === importDialog) {
        fileInput.value = '';
        jsonInput.value = ''; // Clear textarea too
      }
       // Reset edit input when closing edit dialog
      if (dialog === editDialog) {
        editTextInput.value = '';
        currentEditId = null;
      }
    }

    function showToast(title, message, isError = false) {
      toastTitle.textContent = title;
      toastMessage.textContent = message;

      if (isError) {
        toast.style.borderLeft = '4px solid #ef4444'; // Red for error
      } else {
        toast.style.borderLeft = '4px solid #22c55e'; // Green for success
      }

      toast.classList.add('active');

      setTimeout(() => {
        toast.classList.remove('active');
      }, 3000); // 3 seconds
    }

    function saveToLocalStorage() {
      const data = {
        title: pageTitle.textContent,
        arguments: argumentsList
      };
      localStorage.setItem('prosConsData', JSON.stringify(data));
    }

    function loadFromLocalStorage() {
      const savedData = localStorage.getItem('prosConsData');
      if (savedData) {
        try {
          const data = JSON.parse(savedData);
          pageTitle.textContent = data.title || 'Pros/Cons';
          argumentsList = data.arguments || [];
          renderArguments(); // This will also call updateVerdict
        } catch (error) {
          console.error('Error loading data from localStorage:', error);
          localStorage.removeItem('prosConsData'); // Clear corrupted data
          // Initialize with empty state
          renderArguments();
          updateVerdict();
        }
      } else {
        // Initialize with empty state
        renderArguments();
        updateVerdict();
      }
    }

    // Initialize
    loadFromLocalStorage();
});