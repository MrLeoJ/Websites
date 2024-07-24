document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('codeGeneratorForm');
    const output = document.getElementById('output');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        generateCodes();
    });

    function generateCodes() {
        const prefix = document.getElementById('prefix').value;
        const suffix = document.getElementById('suffix').value;
        const length = parseInt(document.getElementById('length').value) || 8;
        const quantity = parseInt(document.getElementById('quantity').value) || 1;
        const includeNumbers = document.getElementById('includeNumbers').checked;
        const includeSymbols = document.getElementById('includeSymbols').checked;

        if (length < 1 || length > 50) {
            showMessage('Code length must be between 1 and 50 characters.');
            return;
        }

        if (quantity < 1 || quantity > 100) {
            showMessage('Quantity must be between 1 and 100.');
            return;
        }

        let charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (includeNumbers) charset += '0123456789';
        if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

        const codes = [];
        for (let i = 0; i < quantity; i++) {
            let code = prefix;
            for (let j = 0; j < length; j++) {
                code += charset.charAt(Math.floor(Math.random() * charset.length));
            }
            code += suffix;
            codes.push(code);
        }

        output.textContent = codes.join('\n');
        showMessage('Codes generated successfully!');
    }

    function showMessage(message) {
        const popup = document.createElement('div');
        popup.textContent = message;
        popup.style.position = 'fixed';
        popup.style.top = '20px';
        popup.style.left = '50%';
        popup.style.transform = 'translateX(-50%)';
        popup.style.backgroundColor = '#61dafb';
        popup.style.color = '#FFF';
        popup.style.padding = '10px 20px';
        popup.style.borderRadius = '5px';
        popup.style.zIndex = '1000';
        document.body.appendChild(popup);

        setTimeout(() => {
            popup.style.opacity = '0';
            popup.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                document.body.removeChild(popup);
            }, 500);
        }, 3000);
    }
});
