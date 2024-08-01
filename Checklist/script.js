let tasks = [];
let doneTasks = [];
let currentTask = null;
let quill;

document.addEventListener('DOMContentLoaded', function() {
    quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'size': ['small', false, 'large', 'huge'] }],
                ['bold', 'italic'],
                ['link'],
                [{ 'list': 'bullet' }, { 'list': 'check' }]
            ]
        }
    });

    loadData();
    renderTasks();

    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            showTab(this.getAttribute('data-tab'));
        });
    });

    document.querySelector('.close-panel').addEventListener('click', closeSidePanel);
    document.getElementById('overlay').addEventListener('click', closeSidePanel);

    const addTaskBtn = document.getElementById('addTaskBtn');
    const addTaskModal = document.getElementById('addTaskModal');
    const saveNewTaskBtn = document.getElementById('saveNewTaskBtn');
    const cancelNewTaskBtn = document.getElementById('cancelNewTaskBtn');
    const newTaskInput = document.getElementById('newTaskInput');

    addTaskBtn.addEventListener('click', () => {
        addTaskModal.style.display = 'block';
        newTaskInput.focus();
    });

    saveNewTaskBtn.addEventListener('click', () => {
        const taskText = newTaskInput.value.trim();
        if (taskText) {
            addTask(taskText);
            newTaskInput.value = '';
            addTaskModal.style.display = 'none';
        }
    });

    cancelNewTaskBtn.addEventListener('click', () => {
        newTaskInput.value = '';
        addTaskModal.style.display = 'none';
    });

    newTaskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveNewTaskBtn.click();
        }
    });
});

function addTask(taskText) {
    tasks.push({ id: Date.now(), title: taskText, subtasks: [], notes: '', done: false });
    renderTasks();
    saveData();
}

function renderTasks() {
    renderList(tasks, 'taskList');
    renderList(doneTasks, 'doneList');
}

function renderList(list, elementId) {
    const listElement = document.getElementById(elementId);
    listElement.innerHTML = '';
    list.forEach((task) => {
        const li = document.createElement('li');
        li.className = 'task';
        li.draggable = true;
        li.innerHTML = `
            <label class="checkbox-container">
                <input type="checkbox" ${task.done ? 'checked' : ''}>
                <span class="checkmark"></span>
            </label>
            <span class="task-title" contenteditable="true">${task.title}</span>
            <button class="edit-task"><i class="fas fa-pen-to-square"></i></button>
            <button class="delete-task"><i class="fas fa-trash"></i></button>
        `;
        li.querySelector('input[type="checkbox"]').addEventListener('change', () => toggleTaskStatus(task.id));
        li.querySelector('.task-title').addEventListener('input', (e) => updateTaskTitle(task.id, e.target.textContent));
        li.querySelector('.task-title').addEventListener('focus', () => li.classList.add('editing'));
        li.querySelector('.task-title').addEventListener('blur', () => li.classList.remove('editing'));
        li.querySelector('.edit-task').addEventListener('click', () => openSidePanel(task.id));
        li.querySelector('.delete-task').addEventListener('click', () => deleteTask(task.id));
        li.addEventListener('dragstart', dragStart);
        li.addEventListener('dragover', dragOver);
        li.addEventListener('drop', drop);
        listElement.appendChild(li);
    });
}

function toggleTaskStatus(taskId) {
    let sourceList = tasks.find(t => t.id === taskId) ? tasks : doneTasks;
    let targetList = sourceList === tasks ? doneTasks : tasks;
    const taskIndex = sourceList.findIndex(t => t.id === taskId);
    const task = sourceList.splice(taskIndex, 1)[0];
    task.done = !task.done;
    targetList.unshift(task);
    renderTasks();
    saveData();
}

function updateTaskTitle(taskId, newTitle) {
    const task = tasks.find(t => t.id === taskId) || doneTasks.find(t => t.id === taskId);
    if (task) {
        task.title = newTitle;
        saveData();
    }
}

function openSidePanel(taskId) {
    currentTask = tasks.find(t => t.id === taskId) || doneTasks.find(t => t.id === taskId);
    const sidePanel = document.getElementById('sidePanel');
    const sidePanelTitle = document.getElementById('sidePanelTitle');
    const subtaskList = document.getElementById('subtaskList');
    const overlay = document.getElementById('overlay');

    sidePanelTitle.textContent = currentTask.title;
    subtaskList.innerHTML = '';
    currentTask.subtasks.forEach((subtask, index) => {
        const li = document.createElement('li');
        li.className = 'subtask';
        li.draggable = true;
        li.innerHTML = `
            <label class="checkbox-container">
                <input type="checkbox" ${subtask.done ? 'checked' : ''}>
                <span class="checkmark"></span>
            </label>
            <span contenteditable="true">${subtask.text}</span>
            <button class="delete-subtask"><i class="fas fa-trash"></i></button>
        `;
        li.querySelector('input[type="checkbox"]').addEventListener('change', () => toggleSubtaskStatus(index));
        li.querySelector('span[contenteditable]').addEventListener('input', (e) => updateSubtaskText(index, e.target.textContent));
        li.querySelector('span[contenteditable]').addEventListener('focus', () => li.classList.add('editing'));
        li.querySelector('span[contenteditable]').addEventListener('blur', () => li.classList.remove('editing'));
        li.querySelector('.delete-subtask').addEventListener('click', () => deleteSubtask(index));
        li.addEventListener('dragstart', dragStartSubtask);
        li.addEventListener('dragover', dragOverSubtask);
        li.addEventListener('drop', dropSubtask);
        subtaskList.appendChild(li);
    });

    quill.root.innerHTML = currentTask.notes;
    sidePanel.classList.add('open');
    overlay.style.display = 'block';
}

function closeSidePanel() {
    const sidePanel = document.getElementById('sidePanel');
    const overlay = document.getElementById('overlay');
    sidePanel.classList.remove('open');
    overlay.style.display = 'none';
    if (currentTask) {
        currentTask.notes = quill.root.innerHTML;
        currentTask = null;
        saveData();
    }
    renderTasks();
}

function toggleSubtaskStatus(subtaskIndex) {
    currentTask.subtasks[subtaskIndex].done = !currentTask.subtasks[subtaskIndex].done;
    saveData();
}

function updateSubtaskText(index, newText) {
    currentTask.subtasks[index].text = newText;
    saveData();
}

function deleteSubtask(index) {
    currentTask.subtasks.splice(index, 1);
    openSidePanel(currentTask.id);
    saveData();
}

function deleteTask(taskId) {
    tasks = tasks.filter(t => t.id !== taskId);
    doneTasks = doneTasks.filter(t => t.id !== taskId);
    renderTasks();
    saveData();
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.getElementById(`${tabName}Tab`).classList.add('active');
    document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add('active');
}

function dragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.id);
    setTimeout(() => e.target.classList.add('dragging'), 0);
}

function dragOver(e) {
    e.preventDefault();
    const draggingElement = document.querySelector('.dragging');
    const currentElement = e.target.closest('.task');
    if (currentElement && draggingElement !== currentElement) {
        const rect = currentElement.getBoundingClientRect();
        const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
        if (next) {
            currentElement.parentNode.insertBefore(draggingElement, currentElement.nextSibling);
        } else {
            currentElement.parentNode.insertBefore(draggingElement, currentElement);
        }
    }
}

function drop(e) {
    e.preventDefault();
    const draggingElement = document.querySelector('.dragging');
    draggingElement.classList.remove('dragging');
    const listId = e.target.closest('ul').id;
    const list = listId === 'taskList' ? tasks : doneTasks;
    const newOrder = Array.from(document.querySelectorAll(`#${listId} .task-title`)).map(title => title.textContent);
    list.sort((a, b) => newOrder.indexOf(a.title) - newOrder.indexOf(b.title));
    saveData();
}

function dragStartSubtask(e) {
    e.dataTransfer.setData('text/plain', e.target.id);
    setTimeout(() => e.target.classList.add('dragging'), 0);
}

function dragOverSubtask(e) {
    e.preventDefault();
    const draggingElement = document.querySelector('.dragging');
    const currentElement = e.target.closest('.subtask');
    if (currentElement && draggingElement !== currentElement) {
        const rect = currentElement.getBoundingClientRect();
        const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
        if (next) {
            currentElement.parentNode.insertBefore(draggingElement, currentElement.nextSibling);
        } else {
            currentElement.parentNode.insertBefore(draggingElement, currentElement);
        }
    }
}

function dropSubtask(e) {
    e.preventDefault();
    const draggingElement = document.querySelector('.dragging');
    draggingElement.classList.remove('dragging');
    const newOrder = Array.from(document.querySelectorAll('#subtaskList span[contenteditable]')).map(span => span.textContent);
    currentTask.subtasks.sort((a, b) => newOrder.indexOf(a.text) - newOrder.indexOf(b.text));
    saveData();
}

function saveData() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('doneTasks', JSON.stringify(doneTasks));
}

function loadData() {
    const savedTasks = localStorage.getItem('tasks');
    const savedDoneTasks = localStorage.getItem('doneTasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
    }
    if (savedDoneTasks) {
        doneTasks = JSON.parse(savedDoneTasks);
    }
}