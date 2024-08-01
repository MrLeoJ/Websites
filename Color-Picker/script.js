document.addEventListener('DOMContentLoaded', () => {
    const selectedColor = document.getElementById('selected-color');
    const colorHex = document.getElementById('color-hex');
    const colorRGB = document.getElementById('color-rgb');
    const colorHSL = document.getElementById('color-hsl');
    const eyedropper = document.getElementById('eyedropper');
    const colorWheel = document.getElementById('color-wheel');
    const colorInput = document.getElementById('color-input');
    const copyButtons = document.querySelectorAll('.copy-btn');
    const toast = document.getElementById('toast');

    let currentColor = '#3a3f4b';
    updateColor(currentColor);

    // Eyedropper tool
    if ('EyeDropper' in window) {
        eyedropper.addEventListener('click', () => {
            const eyeDropper = new EyeDropper();
            eyeDropper.open().then(result => {
                updateColor(result.sRGBHex);
            }).catch(e => {
                showToast('Cancelled');
            });
        });
    } else {
        eyedropper.style.display = 'none';
    }

    // Color wheel
    colorWheel.addEventListener('click', () => {
        const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        updateColor(randomColor);
        generatePalettes();
    });

    // Color input
    colorInput.addEventListener('input', (e) => {
        updateColor(e.target.value);
    });

    // Copy to clipboard
    copyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-clipboard');
            let textToCopy = document.getElementById(`color-${type}`).value;
            navigator.clipboard.writeText(textToCopy).then(() => {
                showToast(`${type.toUpperCase()} color copied to clipboard`);
            });
        });
    });

    // Real-time editing
    [colorHex, colorRGB, colorHSL].forEach(input => {
        input.addEventListener('input', (e) => {
            let color = e.target.value;
            if (e.target.id === 'color-rgb') {
                color = rgbToHex(color);
            } else if (e.target.id === 'color-hsl') {
                color = hslToHex(color);
            }
            if (isValidColor(color)) {
                updateColor(color);
            }
        });
    });

    // Generate initial color palettes
    generatePalettes();

    function updateColor(color) {
        currentColor = color;
        selectedColor.style.backgroundColor = color;
        colorHex.value = color;
        colorRGB.value = hexToRgb(color);
        colorHSL.value = hexToHsl(color);
        document.body.style.backgroundColor = color;
        document.querySelector('.container').style.backgroundColor = adjustColor(color, -20);
        updateColorVariations(color);
    }

    function adjustColor(color, amount) {
        const num = parseInt(color.slice(1), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
        return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    function generatePalettes() {
        const palettes = document.querySelectorAll('.palette');
        palettes.forEach((palette) => {
            palette.innerHTML = '';
            const colors = generateRandomPalette();
            colors.forEach(color => {
                const colorDiv = document.createElement('div');
                colorDiv.style.backgroundColor = color;
                colorDiv.addEventListener('click', () => updateColor(color));
                palette.appendChild(colorDiv);
            });
        });
    }

    function generateRandomPalette() {
        const baseHue = Math.floor(Math.random() * 360);
        const randomSaturation = () => Math.floor(Math.random() * 51) + 50; // 50% to 100%
        const randomLightness = () => Math.floor(Math.random() * 41) + 30; // 30% to 70%
    
        return [
            `hsl(${baseHue}, ${randomSaturation()}%, ${randomLightness()}%)`,
            `hsl(${(baseHue + 120) % 360}, ${randomSaturation()}%, ${randomLightness()}%)`,
            `hsl(${(baseHue + 240) % 360}, ${randomSaturation()}%, ${randomLightness()}%)`
        ].map(hslToHex);
    }

    function updateColorVariations(color) {
        updateVariationRow('shades', generateShades(color));
        updateVariationRow('tints', generateTints(color));
        updateVariationRow('tones', generateTones(color));
    }

    function updateVariationRow(rowId, colors) {
        const row = document.getElementById(rowId);
        row.innerHTML = '';
        colors.forEach(color => {
            const colorDiv = document.createElement('div');
            colorDiv.style.backgroundColor = color;
            colorDiv.addEventListener('click', () => updateColor(color));
            row.appendChild(colorDiv);
        });
    }

    function generateShades(color) {
        return [15, 30, 45, 60, 75, 90].map(amount => shadeColor(color, amount));
    }

    function generateTints(color) {
        return [15, 30, 45, 60, 75, 90].map(amount => tintColor(color, amount));
    }

    function generateTones(color) {
        return [15, 30, 45, 60, 75, 90].map(amount => toneColor(color, amount));
    }

    function shadeColor(color, percent) {
        const num = parseInt(color.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }

    function tintColor(color, percent) {
        const num = parseInt(color.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }

    function toneColor(color, percent) {
        const num = parseInt(color.slice(1), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.round(((num >> 16) * (100 - percent) + 128 * percent) / 100);
        const G = Math.round(((num >> 8 & 0x00FF) * (100 - percent) + 128 * percent) / 100);
        const B = Math.round(((num & 0x0000FF) * (100 - percent) + 128 * percent) / 100);
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? 
            `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})` : null;
    }

    function rgbToHex(rgb) {
        const [r, g, b] = rgb.match(/\d+/g).map(Number);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    function hexToHsl(hex) {
        let [r, g, b] = hexToRgb(hex).match(/\d+/g).map(Number);
        r /= 255, g /= 255, b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
    }

    function hslToHex(hsl) {
        const [h, s, l] = hsl.match(/\d+/g).map(Number);
        const hDecimal = h / 360;
        const sDecimal = s / 100;
        const lDecimal = l / 100;

        if (s === 0) {
            const value = Math.round(lDecimal * 255);
            return `#${value.toString(16).padStart(2, '0').repeat(3)}`;
        }

        const q = lDecimal < 0.5 ? lDecimal * (1 + sDecimal) : lDecimal + sDecimal - lDecimal * sDecimal;
        const p = 2 * lDecimal - q;

        const r = Math.round(hueToRgb(p, q, hDecimal + 1/3) * 255);
        const g = Math.round(hueToRgb(p, q, hDecimal) * 255);
        const b = Math.round(hueToRgb(p, q, hDecimal - 1/3) * 255);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    function hueToRgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    }

    function isValidColor(color) {
        return /^#[0-9A-F]{6}$/i.test(color);
    }
});
