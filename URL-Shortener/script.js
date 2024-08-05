const longUrlInput = document.getElementById('longUrl');
const titleInput = document.getElementById('title');
const customUrlInput = document.getElementById('customUrl');
const serviceToggle = document.getElementById('serviceToggle');
const generateBtn = document.getElementById('generateBtn');
const historyList = document.getElementById('historyList');
const historySection = document.getElementById('historySection');
const popup = document.getElementById('popup');
const deletePopup = document.getElementById('deletePopup');
const deleteYesBtn = document.getElementById('deleteYes');
const deleteNoBtn = document.getElementById('deleteNo');

let history = JSON.parse(localStorage.getItem('urlHistory')) || [];
let currentDeleteIndex = -1;

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
    if (history.length > 0) {
        historySection.style.display = 'block';
        history.forEach((item, index) => {
            const historyItem = document.createElement('div');
            historyItem.classList.add('history-item');
            historyItem.innerHTML = `
                <span><b>${item.title || 'Untitled'}</b><br> ${item.shortUrl}</span>
                <div>
                    <button onclick="copyToClipboard('${item.shortUrl}', ${index})"><i class="fas fa-copy"></i></button>
                    <button onclick="openUrl('${item.shortUrl}')"><i class="fas fa-external-link-alt"></i></button>
                    <button class="delete" onclick="showDeletePopup(${index})"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
            historyList.appendChild(historyItem);
        });
    } else {
        historySection.style.display = 'none';
    }
}

function copyToClipboard(text, index) {
    navigator.clipboard.writeText(text).then(() => {
        showPopup('URL Copied');
    });
}

function openUrl(url) {
    window.open(url, '_blank');
}

function showDeletePopup(index) {
    currentDeleteIndex = index;
    deletePopup.style.display = 'block';
}

function hideDeletePopup() {
    deletePopup.style.display = 'none';
    currentDeleteIndex = -1;
}

function deleteUrl() {
    if (currentDeleteIndex !== -1) {
        history.splice(currentDeleteIndex, 1);
        localStorage.setItem('urlHistory', JSON.stringify(history));
        updateHistoryDisplay();
        hideDeletePopup();
        showPopup('URL Deleted');
    }
}

deleteYesBtn.addEventListener('click', deleteUrl);
deleteNoBtn.addEventListener('click', hideDeletePopup);

generateBtn.addEventListener('click', () => {
    const longUrl = longUrlInput.value;
    const title = titleInput.value;
    const customUrl = customUrlInput.value;
    const selectedService = serviceToggle.checked ? 'v.gd' : 'is.gd';

    if (!longUrl) {
        showPopup('Please enter a URL');
        return;
    }

    let apiUrl = `https://${selectedService}/create.php?format=json&url=${encodeURIComponent(longUrl)}`;
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