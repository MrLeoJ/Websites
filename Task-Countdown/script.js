// Initialize variables
let timer;
let totalSeconds = 0;
let isRunning = false;
let totalTaskTime = 0;
let initialTaskTime = 0;
let taskStartTime;

// Initialize Audio object for alarm sound
let alarmSound = new Audio('https://assets.coderrocketfuel.com/pomodoro-times-up.mp3');
alarmSound.loop = true;

// DOM elements
const hoursElement = document.getElementById('hours');
const minutesElement = document.getElementById('minutes');
const secondsElement = document.getElementById('seconds');
const taskInput = document.getElementById('taskInput');
const hoursInput = document.getElementById('hoursInput');
const minutesInput = document.getElementById('minutesInput');
const secondsInput = document.getElementById('secondsInput');
const endTimeInput = document.getElementById('endTimeInput');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const alarmSoundSelect = document.getElementById('alarmSound');
const totalTimeElement = document.getElementById('totalTime');
const notification = document.getElementById('notification');
const snoozeHoursInput = document.getElementById('snoozeHoursInput');
const snoozeMinutesInput = document.getElementById('snoozeMinutesInput');
const snoozeSecondsInput = document.getElementById('snoozeSecondsInput');
const snoozeBtn = document.getElementById('snoozeBtn');
const stopAlarmBtn = document.getElementById('stopAlarmBtn');
const closeNotificationBtn = document.getElementById('closeNotificationBtn');
const themeToggle = document.getElementById('themeToggle');
const overlay = document.getElementById('overlay');

// Event listeners
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);
alarmSoundSelect.addEventListener('change', changeAlarmSound);
snoozeBtn.addEventListener('click', snoozeAlarm);
stopAlarmBtn.addEventListener('click', stopAlarm);
closeNotificationBtn.addEventListener('click', closeNotification);
themeToggle.addEventListener('click', toggleTheme);

// Timer functions
function startTimer() {
    if (!isRunning) {
        isRunning = true;
        if (totalSeconds === 0) {
            setTimerDuration();
            initialTaskTime = totalSeconds;
        }
        timer = setInterval(updateTimer, 1000);
        if (!taskStartTime) {
            taskStartTime = new Date();
        }
    }
}

function pauseTimer() {
    if (isRunning) {
        isRunning = false;
        clearInterval(timer);
        updateTotalTaskTime();
    }
}

function resetTimer() {
    isRunning = false;
    clearInterval(timer);
    totalSeconds = 0;
    initialTaskTime = 0;
    updateTimerDisplay();
    totalTaskTime = 0;
    taskStartTime = null;
    updateTotalTaskTimeDisplay();
    hoursInput.value = '';
    minutesInput.value = '';
    secondsInput.value = '';
    endTimeInput.value = '';
    closeNotification();
}

function updateTimer() {
    if (totalSeconds > 0) {
        totalSeconds--;
        updateTimerDisplay();
        updateTotalTaskTime();
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
    const endTime = endTimeInput.value;
    
    if (hours > 0 || minutes > 0 || seconds > 0) {
        totalSeconds = hours * 3600 + minutes * 60 + seconds;
    } else if (endTime) {
        const now = new Date();
        const end = new Date(now.toDateString() + ' ' + endTime);
        if (end < now) {
            end.setDate(end.getDate() + 1);
        }
        totalSeconds = Math.floor((end - now) / 1000);
    }
    
    updateTimerDisplay();
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

function changeAlarmSound() {
    // For this example, we're using the same sound for all options
    // In a real application, you'd change the audio source based on the selection
    alarmSound.src = 'https://assets.coderrocketfuel.com/pomodoro-times-up.mp3';
}

function triggerAlarm() {
    notification.classList.remove('hidden');
    overlay.classList.remove('hidden');
    alarmSound.play().catch(e => console.error("Error playing sound:", e));
}

function snoozeAlarm() {
    const hours = parseInt(snoozeHoursInput.value) || 0;
    const minutes = parseInt(snoozeMinutesInput.value) || 0;
    const seconds = parseInt(snoozeSecondsInput.value) || 0;
    
    totalSeconds = hours * 3600 + minutes * 60 + seconds;
    initialTaskTime += totalSeconds;
    
    closeNotification();
    startTimer();
}

function stopAlarm() {
    closeNotification();
    resetTimer();
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

function updateTotalTaskTime() {
    if (taskStartTime) {
        const now = new Date();
        totalTaskTime = Math.floor((now - taskStartTime) / 1000) + initialTaskTime;
        updateTotalTaskTimeDisplay();
    }
}

function updateTotalTaskTimeDisplay() {
    const hours = Math.floor(totalTaskTime / 3600);
    const minutes = Math.floor((totalTaskTime % 3600) / 60);
    const seconds = totalTaskTime % 60;
    totalTimeElement.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const icon = themeToggle.querySelector('i');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
}

// Web Worker for background operation
if (window.Worker) {
    const timerWorker = new Worker('timer-worker.js');
    timerWorker.onmessage = function(e) {
        if (e.data === 'tick' && isRunning) {
            updateTimer();
        }
    };
    timerWorker.postMessage('start');
}

// Initialize alarm sound
changeAlarmSound();

// Load saved state from local storage
window.addEventListener('load', function() {
    const savedState = JSON.parse(localStorage.getItem('timerState'));
    if (savedState) {
        totalSeconds = savedState.totalSeconds;
        initialTaskTime = savedState.initialTaskTime;
        taskInput.value = savedState.taskName;
        alarmSoundSelect.value = savedState.alarmSound;
        totalTaskTime = savedState.totalTaskTime;
        taskStartTime = savedState.taskStartTime ? new Date(savedState.taskStartTime) : null;
        updateTimerDisplay();
        updateTotalTaskTimeDisplay();
        changeAlarmSound();
    }
});

// Save state to local storage before unload
window.addEventListener('beforeunload', function() {
    const stateToSave = {
        totalSeconds: totalSeconds,
        initialTaskTime: initialTaskTime,
        taskName: taskInput.value,
        alarmSound: alarmSoundSelect.value,
        totalTaskTime: totalTaskTime,
        taskStartTime: taskStartTime ? taskStartTime.toISOString() : null
    };
    localStorage.setItem('timerState', JSON.stringify(stateToSave));
});

// Initialize the timer display
updateTimerDisplay();
updateTotalTaskTimeDisplay();