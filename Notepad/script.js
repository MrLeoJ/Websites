const editor = document.getElementById('editor');
const wordCharCountEl = document.getElementById('wordCharCount');
const readTimeEl = document.getElementById('readTime');
const popup = document.getElementById('popup');
const colorPicker = document.getElementById('colorPicker');
const editorContainer = document.getElementById('editor-container');

const fontFamilies = ['Sanchez', 'Poppins', 'Prata', 'Roboto', 'Merienda'];
const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
const letterSpacings = ['normal', '0.5px', '1px', '1.5px', '2px'];
const lineSpacings = ['1', '1.25', '1.5', '1.75', '2'];
const colors = ['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#FF7F50', '#FFFF00', '#00FFFF', '#FF00FF', '#C0C0C0', '#808080'];
const alignments = ['Left', 'Center', 'Right', 'Justify'];

window.addEventListener('load', function() {
    const savedContent = localStorage.getItem('editorContent');
    if (savedContent) {
        editor.innerHTML = savedContent;
    }
    editor.focus();
    updateCounts();
    createColorPicker();
    
    // Set default styles
    editor.style.fontFamily = 'Sanchez, serif';
    editor.style.fontSize = '14px';
    editor.style.letterSpacing = '1px';
});

editor.addEventListener('input', function() {
    updateCounts();
    saveContent();
});

function insertCheckbox() {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    range.insertNode(checkbox);
}

function updateCounts() {
    const text = editor.innerText;
    const wordCount = text.trim().split(/\s+/).length;
    const charCount = text.length;
    const readTime = Math.ceil(wordCount / 200);
    wordCharCountEl.innerHTML = `<i class="fas fa-font"></i>&nbsp; ${wordCount} words &nbsp;|&nbsp; ${charCount} characters`;
    readTimeEl.innerHTML = `<i class="fas fa-clock"></i>&nbsp; ${readTime} min read`;
}

function saveContent() {
    localStorage.setItem('editorContent', editor.innerHTML);
}

function formatDoc(cmd, value = null) {
    document.execCommand(cmd, false, value);
    saveContent();
}

function toggleMode() {
    document.body.classList.toggle('dark-mode');
    const icon = document.querySelector('#modeToggle i');
    icon.style.color = document.body.classList.contains('dark-mode') ? 'white' : 'black';
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const maxWidth = pageWidth - 2 * margin;

    doc.setFontSize(12);
    const lines = doc.splitTextToSize(editor.innerText, maxWidth);
    
    let y = margin;
    lines.forEach(line => {
        if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
        doc.text(line, margin, y);
        y += 7; // Approximate line height for 12px font
    });

    doc.save('notepad.pdf');
    showPopup('PDF downloaded successfully!');
}

function downloadHTML() {
    const blob = new Blob([editor.innerHTML], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'notepad.html';
    a.click();
    showPopup('HTML downloaded successfully!');
}

function copyText() {
    navigator.clipboard.writeText(editor.innerText).then(() => {
        showPopup('Text copied to clipboard!');
    });
}

function showPopup(message) {
    popup.textContent = message;
    popup.style.display = 'block';
    editorContainer.classList.add('blur-background');
    setTimeout(() => {
        popup.style.display = 'none';
        editorContainer.classList.remove('blur-background');
    }, 2000);
}

function createColorPicker() {
    colorPicker.innerHTML = ''; // Clear existing color swatches
    colors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.onclick = () => changeTextColor(color);
        colorPicker.appendChild(swatch);
    });
}

function changeTextColor(color) {
    document.execCommand('foreColor', false, color);
    colorPicker.style.display = 'none';
    saveContent();
}

document.getElementById('textColor').onclick = function(e) {
    e.stopPropagation(); // Prevent event from bubbling up
    showOptionsPopup('Text Color', colors, changeTextColor);
};

document.getElementById('fontFamily').onclick = function() {
    showOptionsPopup('Font Family', fontFamilies, (value) => {
        document.execCommand('fontName', false, value);
        saveContent();
    });
};

document.getElementById('fontSize').onclick = function() {
    showOptionsPopup('Font Size', fontSizes, (value) => {
        document.execCommand('fontSize', false, fontSizes.indexOf(value) + 1);
        saveContent();
    });
};

document.getElementById('letterSpacing').onclick = function() {
    showOptionsPopup('Letter Spacing', letterSpacings, (value) => {
        editor.style.letterSpacing = value;
        saveContent();
    });
};

document.getElementById('lineSpacing').onclick = function() {
    showOptionsPopup('Line Spacing', lineSpacings, (value) => {
        editor.style.lineHeight = value;
        saveContent();
    });
};

document.getElementById('textAlign').onclick = function() {
    showOptionsPopup('Text Align', alignments, (value) => {
        formatDoc('justify' + value);
    });
};

function showOptionsPopup(title, options, applyFunction) {
    popup.innerHTML = `<h3>${title}</h3>`;
    options.forEach(option => {
        const button = document.createElement('button');
        if (title === 'Text Color') {
            button.style.backgroundColor = option;
            button.style.width = '20px';
            button.style.height = '20px';
        } else {
            button.textContent = option;
        }
        button.onclick = () => {
            applyFunction(option);
            popup.style.display = 'none';
            editorContainer.classList.remove('blur-background');
        };
        popup.appendChild(button);
    });
    popup.style.display = 'block';
    editorContainer.classList.add('blur-background');
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
            document.execCommand('outdent', false, null);
        } else {
            document.execCommand('indent', false, null);
        }
    }
});

if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    document.querySelector('#modeToggle i').style.color = 'white';
}

// Close popups when clicking outside
document.addEventListener('click', function(e) {
    if (!popup.contains(e.target) && !e.target.closest('button')) {
        popup.style.display = 'none';
        editorContainer.classList.remove('blur-background');
    }
});

