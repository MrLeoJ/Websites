const longUrlInput = document.getElementById('longUrl');
const titleInput = document.getElementById('title');
const customUrlInput = document.getElementById('customUrl');
const generateBtn = document.getElementById('generateBtn');
const historyList = document.getElementById('historyList');
const popup = document.getElementById('popup');

let history = JSON.parse(localStorage.getItem('urlHistory')) || [];

function showPopup(message) {
    popup.textContent = message;
    popup.classList.add('show');
    setTimeout(() => {
        popup.classList.remove('show');
    }, 2500);
}

function addToHistory(longUrl, shortUrl, title) {
    history.unshift({ longUrl, shortUrl, title });
    localStorage.setItem('urlHistory', JSON.stringify(history));
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    historyList.innerHTML = '';
    history.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.classList.add('history-item');
        historyItem.innerHTML = `
            <span><b>${item.title || 'Untitled'}</b><br> ${item.shortUrl}</span>
            <div>
                <button onclick="copyToClipboard('${item.shortUrl}', ${index})">Copy</button>
                <button onclick="openUrl('${item.shortUrl}')">Open</button>
            </div>
        `;
        historyList.appendChild(historyItem);
    });
}

function copyToClipboard(text, index) {
    navigator.clipboard.writeText(text).then(() => {
        showPopup('URL Copied');
    });
}

function openUrl(url) {
    window.open(url, '_blank');
}

generateBtn.addEventListener('click', () => {
    const longUrl = longUrlInput.value;
    const title = titleInput.value;
    const customUrl = customUrlInput.value;

    if (!longUrl) {
        showPopup('Please enter a URL');
        return;
    }

    let apiUrl = `https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`;
    if (customUrl) {
        apiUrl += `&shorturl=${encodeURIComponent(customUrl)}`;
    }

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.shorturl) {
                navigator.clipboard.writeText(data.shorturl).then(() => {
                    showPopup('URL Shortened');
                    addToHistory(longUrl, data.shorturl, title);
                    longUrlInput.value = '';
                    titleInput.value = '';
                    customUrlInput.value = '';
                });
            } else {
                showPopup(`Error: ${data.errormessage}`);
            }
        })
        .catch(error => {
            showPopup('An error occurred. Please try again.');
            console.error('Error:', error);
        });
});

updateHistoryDisplay();