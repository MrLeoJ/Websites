// Initialize variables
let timer;
let totalSeconds = 0;
let isRunning = false;
let startTime = null;
let timeLog = [];

// Initialize Audio object for alarm sound
const alarmSound = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-elevator-tone-2863.mp3');
alarmSound.loop = true;

// DOM elements
const hoursElement = document.getElementById('hours');
const minutesElement = document.getElementById('minutes');
const secondsElement = document.getElementById('seconds');
const taskTitle = document.getElementById('taskTitle');
const hoursInput = document.getElementById('hoursInput');
const minutesInput = document.getElementById('minutesInput');
const secondsInput = document.getElementById('secondsInput');
const endTimeInput = document.getElementById('endTimeInput');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const notification = document.getElementById('notification');
const snoozeHoursInput = document.getElementById('snoozeHoursInput');
const snoozeMinutesInput = document.getElementById('snoozeMinutesInput');
const snoozeSecondsInput = document.getElementById('snoozeSecondsInput');
const snoozeBtn = document.getElementById('snoozeBtn');
const silenceBtn = document.getElementById('silenceBtn');
const stopAlarmBtn = document.getElementById('stopAlarmBtn');
const closeNotificationBtn = document.getElementById('closeNotificationBtn');
const themeToggle = document.getElementById('themeToggle');
const overlay = document.getElementById('overlay');
const timeLogTable = document.getElementById('timeLogTable');
const timeLogBody = document.getElementById('timeLogBody');
const messagePopup = document.getElementById('messagePopup');

// Event listeners
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
snoozeBtn.addEventListener('click', snoozeAlarm);
silenceBtn.addEventListener('click', silenceAlarm);
stopAlarmBtn.addEventListener('click', stopAlarm);
closeNotificationBtn.addEventListener('click', closeNotification);
themeToggle.addEventListener('click', toggleTheme);
taskTitle.addEventListener('input', handleTaskInput);
document.addEventListener('keyup', handleEnterKey);
endTimeInput.addEventListener('change', setTimerDurationFromEndTime);
document.addEventListener('keydown', handleEscKey);

// Timer functions
function startTimer() {
    if (!isRunning && totalSeconds > 0) {
        isRunning = true;
        startTime = new Date();
        timer = setInterval(updateTimer, 1000);
        addTimeLogEntry('start');
        saveState();
        showMessage('Timer started');
    }
}

function pauseTimer() {
    if (isRunning) {
        isRunning = false;
        clearInterval(timer);
        addTimeLogEntry('pause');
        saveState();
        showMessage('Timer paused');
    }
}

function resetTimer() {
    isRunning = false;
    clearInterval(timer);
    totalSeconds = 0;
    startTime = null;
    updateTimerDisplay();
    hoursInput.value = '';
    minutesInput.value = '';
    secondsInput.value = '';
    endTimeInput.value = '';
    closeNotification();
    resetTimeLog();
    saveState();
    showMessage('Timer reset');
}

function updateTimer() {
    if (totalSeconds > 0) {
        totalSeconds--;
        updateTimerDisplay();
        saveState();
    } else {
        clearInterval(timer);
        isRunning = false;
        triggerAlarm();
    }
}

function setTimerDuration() {
    const hours = parseInt(hoursInput.value) || 0;
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    
    totalSeconds = hours * 3600 + minutes * 60 + seconds;
    updateTimerDisplay();
}

function setTimerDurationFromEndTime() {
    const now = new Date();
    const endTime = new Date(now.toDateString() + ' ' + endTimeInput.value);
    
    if (endTime <= now) {
        endTime.setDate(endTime.getDate() + 1);
    }
    
    totalSeconds = Math.floor((endTime - now) / 1000);
    updateTimerDisplay();
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    hoursInput.value = hours;
    minutesInput.value = minutes;
    secondsInput.value = seconds;
}

function updateTimerDisplay() {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    hoursElement.textContent = padZero(hours);
    minutesElement.textContent = padZero(minutes);
    secondsElement.textContent = padZero(seconds);
}

function padZero(num) {
    return num.toString().padStart(2, '0');
}

function triggerAlarm() {
    notification.classList.remove('hidden');
    overlay.classList.remove('hidden');
    alarmSound.play().catch(e => console.error("Error playing sound:", e));
    addTimeLogEntry('stop');
}

function snoozeAlarm() {
    const hours = parseInt(snoozeHoursInput.value) || 0;
    const minutes = parseInt(snoozeMinutesInput.value) || 0;
    const seconds = parseInt(snoozeSecondsInput.value) || 0;
    
    totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
    closeNotification();
    startTimer();
    showMessage('Timer snoozed');
}

function silenceAlarm() {
    alarmSound.pause();
    alarmSound.currentTime = 0;
    showMessage('Alarm silenced');
}

function stopAlarm() {
    closeNotification();
    resetTimer();
    showMessage('Alarm stopped');
}

function closeNotification() {
    notification.classList.add('hidden');
    overlay.classList.add('hidden');
    alarmSound.pause();
    alarmSound.currentTime = 0;
    snoozeHoursInput.value = '';
    snoozeMinutesInput.value = '';
    snoozeSecondsInput.value = '';
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const icon = themeToggle.querySelector('i');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
    saveState();
}

function handleTaskInput() {
    if (taskTitle.textContent.trim() === '') {
        taskTitle.classList.add('empty');
    } else {
        taskTitle.classList.remove('empty');
    }
    saveState();
}

function handleEnterKey(event) {
    if (event.key === 'Enter' && !isRunning) {
        setTimerDuration();
        if (totalSeconds > 0) {
            startTimer();
        }
    }
}

function handleEscKey(event) {
    if (event.key === 'Escape') {
        closeNotification();
    }
}

// Time Log functions
function addTimeLogEntry(action) {
    const now = new Date();
    const lastEntry = timeLog[timeLog.length - 1];
    
    if (lastEntry && lastEntry.action === 'start' && (action === 'pause' || action === 'stop')) {
        lastEntry.stopped = now;
        lastEntry.difference = getTimeDifference(lastEntry.started, now);
    } else {
        timeLog.push({
            action: action,
            started: now,
            stopped: null,
            difference: null
        });
    }
    
    updateTimeLogDisplay();
}

function resetTimeLog() {
    timeLog = [];
    updateTimeLogDisplay();
}

function updateTimeLogDisplay() {
    if (timeLog.length > 0) {
        timeLogTable.classList.remove('hidden');
        timeLogBody.innerHTML = '';
        timeLog.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.action}</td>
                <td>${formatTime(entry.started)}</td>
                <td>${entry.stopped ? formatTime(entry.stopped) : '-'}</td>
                <td>${entry.difference || '-'}</td>
            `;
            timeLogBody.appendChild(row);
        });
    } else {
        timeLogTable.classList.add('hidden');
    }
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getTimeDifference(start, end) {
    const diff = Math.floor((end - start) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return `${padZero(hours)}:${padZero(minutes)}`;
}

// Message Popup function
function showMessage(message) {
    messagePopup.textContent = message;
    messagePopup.classList.remove('hidden');
    setTimeout(() => {
        messagePopup.classList.add('hidden');
    }, 3000);
}

// Persistence functions
function saveState() {
    const stateToSave = {
        totalSeconds: totalSeconds,
        taskName: taskTitle.textContent,
        startTime: startTime ? startTime.toISOString() : null,
        isRunning: isRunning,
        isDarkMode: document.body.classList.contains('dark-mode'),
        timeLog: timeLog
    };
    localStorage.setItem('timerState', JSON.stringify(stateToSave));
}

function loadState() {
    const savedState = JSON.parse(localStorage.getItem('timerState'));
    if (savedState) {
        totalSeconds = savedState.totalSeconds;
        taskTitle.textContent = savedState.taskName;
        startTime = savedState.startTime ? new Date(savedState.startTime) : null;
        isRunning = savedState.isRunning;
        timeLog = savedState.timeLog || [];
        
        if (savedState.isDarkMode) {
            document.body.classList.add('dark-mode');
            themeToggle.querySelector('i').classList.replace('fa-sun', 'fa-moon');
        }
        
        updateTimerDisplay();
        handleTaskInput();
        updateTimeLogDisplay();
        
        if (isRunning) {
            timer = setInterval(updateTimer, 1000);
        }
    }
}

// Initialize the timer display
updateTimerDisplay();

// Load saved state
window.addEventListener('load', loadState);

// Save state before unload
window.addEventListener('beforeunload', saveState);
