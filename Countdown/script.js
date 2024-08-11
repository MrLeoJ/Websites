// DOM Elements
const countdownTab = document.getElementById('countdownTab');
const alarmTab = document.getElementById('alarmTab');
const countdownSection = document.getElementById('countdownSection');
const alarmSection = document.getElementById('alarmSection');
const countdownTaskName = document.getElementById('countdownTaskName');
const countdownHours = document.getElementById('countdownHours');
const countdownMinutes = document.getElementById('countdownMinutes');
const countdownSeconds = document.getElementById('countdownSeconds');
const countdownEndTime = document.getElementById('countdownEndTime');
const countdownDisplay = document.getElementById('countdownDisplay');
const startCountdown = document.getElementById('startCountdown');
const resetCountdown = document.getElementById('resetCountdown');
const alarmTaskName = document.getElementById('alarmTaskName');
const alarmTime = document.getElementById('alarmTime');
const alarmEndTime = document.getElementById('alarmEndTime');
const alarmDisplay = document.getElementById('alarmDisplay');
const setAlarm = document.getElementById('setAlarm');
const cancelAlarm = document.getElementById('cancelAlarm');
const timeLog = document.getElementById('timeLog');
const timeLogBody = document.getElementById('timeLogBody');
const alarmPopup = document.getElementById('alarmPopup');
const silenceAlarm = document.getElementById('silenceAlarm');
const closeAlarmPopup = document.getElementById('closeAlarmPopup');
const alarmSound = document.getElementById('alarmSound');

// Global variables
let countdownInterval;
let alarmTimeout;
let countdownStartTime;
let alarmStartTime;
let isCountdownRunning = false;
let isAlarmSet = false;
let countdownEndTimeValue;

// Tab switching
countdownTab.addEventListener('click', () => switchTab('countdown'));
alarmTab.addEventListener('click', () => switchTab('alarm'));

function switchTab(tab) {
    if (tab === 'countdown') {
        countdownTab.classList.add('active');
        alarmTab.classList.remove('active');
        countdownSection.classList.add('active');
        alarmSection.classList.remove('active');
        countdownTab.setAttribute('aria-selected', 'true');
        alarmTab.setAttribute('aria-selected', 'false');
    } else {
        alarmTab.classList.add('active');
        countdownTab.classList.remove('active');
        alarmSection.classList.add('active');
        countdownSection.classList.remove('active');
        alarmTab.setAttribute('aria-selected', 'true');
        countdownTab.setAttribute('aria-selected', 'false');
    }
}

// Countdown functionality
startCountdown.addEventListener('click', startCountdownTimer);
resetCountdown.addEventListener('click', resetCountdownTimer);

function startCountdownTimer() {
    if (isCountdownRunning) return;

    const hours = parseInt(countdownHours.value) || 0;
    const minutes = parseInt(countdownMinutes.value) || 0;
    const seconds = parseInt(countdownSeconds.value) || 0;

    if (hours === 0 && minutes === 0 && seconds === 0) return;

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    countdownEndTimeValue = Date.now() + totalSeconds * 1000;

    countdownStartTime = new Date();
    updateCountdownEndTime(new Date(countdownEndTimeValue));

    isCountdownRunning = true;
    updateCountdown();
}

function updateCountdown() {
    if (!isCountdownRunning) return;

    const now = Date.now();
    const remainingTime = Math.max(0, Math.floor((countdownEndTimeValue - now) / 1000));

    if (remainingTime === 0) {
        isCountdownRunning = false;
        triggerAlarm();
        addToTimeLog('countdown');
    } else {
        updateCountdownDisplay(remainingTime);
        setTimeout(updateCountdown, 100); // Update more frequently to improve accuracy
    }
}

function resetCountdownTimer() {
    isCountdownRunning = false;
    clearInterval(countdownInterval);
    countdownHours.value = '';
    countdownMinutes.value = '';
    countdownSeconds.value = '';
    countdownEndTime.textContent = '';
    countdownDisplay.textContent = '00:00:00';
}

function updateCountdownEndTime(endTime) {
    countdownEndTime.textContent = `End time: ${formatTime(endTime)}`;
}

function updateCountdownDisplay(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    countdownDisplay.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
}

// Alarm functionality
setAlarm.addEventListener('click', setAlarmTimer);
cancelAlarm.addEventListener('click', cancelAlarmTimer);

function setAlarmTimer() {
    if (isAlarmSet) return;

    const [hours, minutes] = alarmTime.value.split(':');
    if (!hours || !minutes) return;

    const now = new Date();
    const alarmDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    
    if (alarmDate <= now) {
        alarmDate.setDate(alarmDate.getDate() + 1);
    }

    alarmStartTime = now;
    updateAlarmEndTime(alarmDate);

    const timeUntilAlarm = alarmDate.getTime() - now.getTime();

    isAlarmSet = true;
    alarmTimeout = setTimeout(() => {
        triggerAlarm();
        addToTimeLog('alarm');
        isAlarmSet = false;
    }, timeUntilAlarm);

    updateAlarmCountdown();
}

function updateAlarmCountdown() {
    if (!isAlarmSet) return;

    const now = new Date();
    const [hours, minutes] = alarmTime.value.split(':');
    const alarmDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    
    if (alarmDate <= now) {
        alarmDate.setDate(alarmDate.getDate() + 1);
    }

    const timeUntilAlarm = alarmDate.getTime() - now.getTime();
    const totalSeconds = Math.floor(timeUntilAlarm / 1000);

    if (totalSeconds <= 0) {
        isAlarmSet = false;
        triggerAlarm();
        addToTimeLog('alarm');
        return;
    }

    updateAlarmDisplay(totalSeconds);
    requestAnimationFrame(updateAlarmCountdown);
}

function cancelAlarmTimer() {
    if (!isAlarmSet) return;
    clearTimeout(alarmTimeout);
    isAlarmSet = false;
    alarmEndTime.textContent = '';
    alarmDisplay.textContent = '00:00:00';
    cancelAnimationFrame(updateAlarmCountdown);
}

function updateAlarmEndTime(endTime) {
    alarmEndTime.textContent = `End Time: ${formatTime(endTime)}`;
}

function updateAlarmDisplay(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    alarmDisplay.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
}

// Utility functions
function padZero(num) {
    return num.toString().padStart(2, '0');
}

function formatTime(date) {
    return `${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
}

function triggerAlarm() {
    alarmPopup.style.display = 'flex';
    playAlarmSound();
}

function playAlarmSound() {
    alarmSound.play();
}

function stopAlarmSound() {
    alarmSound.pause();
    alarmSound.currentTime = 0;
}

silenceAlarm.addEventListener('click', () => {
    stopAlarmSound();
});

closeAlarmPopup.addEventListener('click', () => {
    alarmPopup.style.display = 'none';
    stopAlarmSound();
});

// Time log functionality
function addToTimeLog(type) {
    const taskName = type === 'countdown' ? countdownTaskName.value : alarmTaskName.value;
    const startTime = type === 'countdown' ? countdownStartTime : alarmStartTime;
    const endTime = new Date();
    const duration = formatDuration(endTime - startTime);

    const row = timeLogBody.insertRow(0);
    row.innerHTML = `
        <td>${taskName || 'N/A'}</td>
        <td>${formatTime(startTime)}</td>
        <td>${formatTime(endTime)}</td>
        <td>${duration}</td>
    `;

    timeLog.style.display = 'block';
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${padZero(hours)}:${padZero(minutes % 60)}:${padZero(seconds % 60)}`;
}

// Initialize the countdown input fields
countdownHours.addEventListener('input', updateCountdownEndTimeFromInput);
countdownMinutes.addEventListener('input', updateCountdownEndTimeFromInput);
countdownSeconds.addEventListener('input', updateCountdownEndTimeFromInput);

function updateCountdownEndTimeFromInput() {
    const hours = parseInt(countdownHours.value) || 0;
    const minutes = parseInt(countdownMinutes.value) || 0;
    const seconds = parseInt(countdownSeconds.value) || 0;

    if (hours === 0 && minutes === 0 && seconds === 0) {
        countdownEndTime.textContent = '';
        return;
    }

    const now = new Date();
    const endTime = new Date(now.getTime() + (hours * 3600 + minutes * 60 + seconds) * 1000);
    updateCountdownEndTime(endTime);
}

// Initialize the alarm input field
alarmTime.addEventListener('input', updateAlarmEndTimeFromInput);

function updateAlarmEndTimeFromInput() {
    const [hours, minutes] = alarmTime.value.split(':');
    if (!hours || !minutes) {
        alarmEndTime.textContent = '';
        return;
    }

    const now = new Date();
    const alarmDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    
    if (alarmDate <= now) {
        alarmDate.setDate(alarmDate.getDate() + 1);
    }

    updateAlarmEndTime(alarmDate);
}

// Enable countdown to start when Enter key is pressed
countdownSection.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        startCountdownTimer();
    }
});

// Enable alarm to start when Enter key is pressed
alarmSection.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        setAlarmTimer();
    }
});

// Initialize displays
updateCountdownDisplay(0);
updateAlarmDisplay(0);
