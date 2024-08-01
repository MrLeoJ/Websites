// DOM elements
const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const countdownName = document.getElementById('countdown-name');
const hoursInput = document.getElementById('hours');
const minutesInput = document.getElementById('minutes');
const secondsInput = document.getElementById('seconds');
const startCountdownBtn = document.getElementById('start-countdown');
const pauseCountdownBtn = document.getElementById('pause-countdown');
const resetCountdownBtn = document.getElementById('reset-countdown');
const stopSoundCountdownBtn = document.getElementById('stop-sound-countdown');
const countdownDisplay = document.getElementById('countdown-display');
const alarmName = document.getElementById('alarm-name');
const alarmTimeInput = document.getElementById('alarm-time');
const startAlarmBtn = document.getElementById('start-alarm');
const pauseAlarmBtn = document.getElementById('pause-alarm');
const resetAlarmBtn = document.getElementById('reset-alarm');
const stopSoundAlarmBtn = document.getElementById('stop-sound-alarm');
const alarmDisplay = document.getElementById('alarm-display');
const timeLog = document.getElementById('time-log');
const logEntries = document.getElementById('log-entries');
const beepSound = document.getElementById('beep-sound');

// Global variables
let countdownEndTime;
let alarmEndTime;
let countdownInterval;
let alarmInterval;
let isPaused = false;
let isAlarmSet = false;

// Tab functionality
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// Countdown functionality
function startCountdown() {
    if (!countdownEndTime) {
        const hours = parseInt(hoursInput.value) || 0;
        const minutes = parseInt(minutesInput.value) || 0;
        const seconds = parseInt(secondsInput.value) || 0;
        const totalMilliseconds = (hours * 3600 + minutes * 60 + seconds) * 1000;
        countdownEndTime = Date.now() + totalMilliseconds;
    }

    countdownInterval = setInterval(updateCountdown, 100);
    startCountdownBtn.style.display = 'none';
    pauseCountdownBtn.style.display = 'inline-block';
    isPaused = false;
}

function updateCountdown() {
    if (isPaused) return;

    const now = Date.now();
    const remainingTime = countdownEndTime - now;

    if (remainingTime <= 0) {
        clearInterval(countdownInterval);
        countdownDisplay.textContent = '00:00:00';
        beepSound.play();
        addLogEntry(new Date(countdownEndTime - getDuration()), new Date(countdownEndTime), getDuration(), countdownName.value || 'Countdown');
        resetCountdown();
    } else {
        const hours = Math.floor(remainingTime / 3600000);
        const minutes = Math.floor((remainingTime % 3600000) / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);
        countdownDisplay.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
    }
}

function pauseCountdown() {
    isPaused = !isPaused;
    if (isPaused) {
        pauseCountdownBtn.innerHTML = '<i class="fas fa-play"></i>';
    } else {
        pauseCountdownBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
}

function resetCountdown() {
    clearInterval(countdownInterval);
    countdownDisplay.textContent = '00:00:00';
    hoursInput.value = '';
    minutesInput.value = '';
    secondsInput.value = '';
    startCountdownBtn.style.display = 'inline-block';
    pauseCountdownBtn.style.display = 'none';
    countdownEndTime = null;
    isPaused = false;
}

// Alarm functionality
function startAlarm() {
    if (!isAlarmSet) {
        const now = new Date();
        const [hours, minutes] = alarmTimeInput.value.split(':');
        alarmEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

        if (alarmEndTime <= now) {
            alarmEndTime.setDate(alarmEndTime.getDate() + 1);
        }

        isAlarmSet = true;
    }

    alarmInterval = setInterval(updateAlarm, 100);
    startAlarmBtn.style.display = 'none';
    pauseAlarmBtn.style.display = 'inline-block';
    isPaused = false;
}

function updateAlarm() {
    if (isPaused) return;

    const now = Date.now();
    const remainingTime = alarmEndTime - now;

    if (remainingTime <= 0) {
        clearInterval(alarmInterval);
        alarmDisplay.textContent = 'Alarm!';
        beepSound.play();
        addLogEntry(new Date(alarmEndTime - getDuration()), new Date(alarmEndTime), getDuration(), alarmName.value || 'Alarm');
    } else {
        const hours = Math.floor(remainingTime / 3600000);
        const minutes = Math.floor((remainingTime % 3600000) / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);
        alarmDisplay.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
    }
}

function pauseAlarm() {
    isPaused = !isPaused;
    if (isPaused) {
        pauseAlarmBtn.innerHTML = '<i class="fas fa-play"></i>';
    } else {
        pauseAlarmBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
}

function resetAlarm() {
    clearInterval(alarmInterval);
    alarmDisplay.textContent = '00:00:00';
    alarmTimeInput.value = '';
    startAlarmBtn.style.display = 'inline-block';
    pauseAlarmBtn.style.display = 'none';
    alarmEndTime = null;
    isAlarmSet = false;
    isPaused = false;
}

function stopSound() {
    beepSound.pause();
    beepSound.currentTime = 0;
}

// Helper functions
function padZero(num) {
    return num.toString().padStart(2, '0');
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function calculateDuration(start, stop) {
    return stop - start;
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${padZero(hours)}:${padZero(minutes)}:${padZero(remainingSeconds)}`;
}

function addLogEntry(start, stop, task) {
    const duration = calculateDuration(start, stop);
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${formatTime(start)}</td>
        <td>${formatTime(stop)}</td>
        <td>${formatDuration(duration)}</td>
        <td>${task}</td>
    `;
    logEntries.appendChild(row);
    timeLog.style.display = 'block';
}

// Countdown functionality
function startCountdown() {
    if (!countdownEndTime) {
        const hours = parseInt(hoursInput.value) || 0;
        const minutes = parseInt(minutesInput.value) || 0;
        const seconds = parseInt(secondsInput.value) || 0;
        const totalMilliseconds = (hours * 3600 + minutes * 60 + seconds) * 1000;
        countdownEndTime = Date.now() + totalMilliseconds;
    }

    countdownInterval = setInterval(updateCountdown, 100);
    startCountdownBtn.style.display = 'none';
    pauseCountdownBtn.style.display = 'inline-block';
    isPaused = false;
}

function updateCountdown() {
    if (isPaused) return;

    const now = Date.now();
    const remainingTime = countdownEndTime - now;

    if (remainingTime <= 0) {
        clearInterval(countdownInterval);
        countdownDisplay.textContent = '00:00:00';
        beepSound.play();
        const startTime = new Date(countdownEndTime - (hoursInput.value * 3600000 + minutesInput.value * 60000 + secondsInput.value * 1000));
        addLogEntry(startTime, new Date(countdownEndTime), countdownName.value || 'Countdown');
        resetCountdown();
    } else {
        const hours = Math.floor(remainingTime / 3600000);
        const minutes = Math.floor((remainingTime % 3600000) / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);
        countdownDisplay.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
    }
}

function pauseCountdown() {
    isPaused = !isPaused;
    if (isPaused) {
        pauseCountdownBtn.innerHTML = '<i class="fas fa-play"></i>';
    } else {
        pauseCountdownBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
}

function resetCountdown() {
    clearInterval(countdownInterval);
    countdownDisplay.textContent = '00:00:00';
    hoursInput.value = '';
    minutesInput.value = '';
    secondsInput.value = '';
    startCountdownBtn.style.display = 'inline-block';
    pauseCountdownBtn.style.display = 'none';
    countdownEndTime = null;
    isPaused = false;
}

// Alarm functionality
function startAlarm() {
    if (!isAlarmSet) {
        const now = new Date();
        const [hours, minutes] = alarmTimeInput.value.split(':');
        alarmEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

        if (alarmEndTime <= now) {
            alarmEndTime.setDate(alarmEndTime.getDate() + 1);
        }

        isAlarmSet = true;
    }

    alarmInterval = setInterval(updateAlarm, 100);
    startAlarmBtn.style.display = 'none';
    pauseAlarmBtn.style.display = 'inline-block';
    isPaused = false;
}

function updateAlarm() {
    if (isPaused) return;

    const now = Date.now();
    const remainingTime = alarmEndTime - now;

    if (remainingTime <= 0) {
        clearInterval(alarmInterval);
        alarmDisplay.textContent = 'Alarm!';
        beepSound.play();
        const startTime = new Date();
        startTime.setHours(0, 0, 0, 0); // Set to start of the day
        addLogEntry(startTime, new Date(alarmEndTime), alarmName.value || 'Alarm');
    } else {
        const hours = Math.floor(remainingTime / 3600000);
        const minutes = Math.floor((remainingTime % 3600000) / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);
        alarmDisplay.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
    }
}

function pauseAlarm() {
    isPaused = !isPaused;
    if (isPaused) {
        pauseAlarmBtn.innerHTML = '<i class="fas fa-play"></i>';
    } else {
        pauseAlarmBtn.innerHTML = '<i class="fas fa-pause"></i>';
    }
}

function resetAlarm() {
    clearInterval(alarmInterval);
    alarmDisplay.textContent = '00:00:00';
    alarmTimeInput.value = '';
    startAlarmBtn.style.display = 'inline-block';
    pauseAlarmBtn.style.display = 'none';
    alarmEndTime = null;
    isAlarmSet = false;
    isPaused = false;
}

function stopSound() {
    beepSound.pause();
    beepSound.currentTime = 0;
}

// Event listeners
startCountdownBtn.addEventListener('click', startCountdown);
pauseCountdownBtn.addEventListener('click', pauseCountdown);
resetCountdownBtn.addEventListener('click', resetCountdown);
stopSoundCountdownBtn.addEventListener('click', stopSound);

startAlarmBtn.addEventListener('click', startAlarm);
pauseAlarmBtn.addEventListener('click', pauseAlarm);
resetAlarmBtn.addEventListener('click', resetAlarm);
stopSoundAlarmBtn.addEventListener('click', stopSound);

// Initialize
pauseCountdownBtn.style.display = 'none';
pauseAlarmBtn.style.display = 'none';