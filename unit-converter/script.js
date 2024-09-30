const units = {
    distance: {
        Metric: {
            'Millimetre (mm)': 0.001,
            'Centimetre (cm)': 0.01,
            'Metre (m)': 1,
            'Kilometre (km)': 1000
        },
        Imperial: {
            'Inch (in)': 0.0254,
            'Foot (ft)': 0.3048,
            'Yard (yd)': 0.9144,
            'Mile (mi)': 1609.34
        },
        Nautical: {
            'Nautical Mile (NM)': 1852
        }
    },
    weight: {
        Metric: {
            'Milligram (mg)': 0.000001,
            'Gram (g)': 0.001,
            'Kilogram (kg)': 1,
            'Tonne (t)': 1000
        },
        Imperial: {
            'Ounce (oz)': 0.0283495,
            'Pound (lb)': 0.453592,
            'Stone (st)': 6.35029,
            'Hundredweight (cwt)': 50.8023,
            'Ton': 1016.05
        }
    },
    height: {
        Metric: {
            'Millimetre (mm)': 0.001,
            'Centimetre (cm)': 0.01,
            'Metre (m)': 1
        },
        Imperial: {
            'Inch (in)': 0.0254,
            'Foot (ft)': 0.3048
        }
    }
};

let activeTab = 'distance';

const tabBtns = document.querySelectorAll('.tab-btn');
const fromValue = document.getElementById('fromValue');
const fromUnit = document.getElementById('fromUnit');
const toUnit = document.getElementById('toUnit');
const swapBtn = document.getElementById('swapBtn');
const resultEl = document.getElementById('result');

function init() {
    populateUnits();
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    fromValue.addEventListener('input', convert);
    fromUnit.addEventListener('change', convert);
    toUnit.addEventListener('change', convert);
    swapBtn.addEventListener('click', swapUnits);
    
    // Set default units
    setDefaultUnits();
}

function populateUnits() {
    fromUnit.innerHTML = '';
    toUnit.innerHTML = '';
    
    for (const category in units[activeTab]) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = category;
        optgroup.style.color = 'white';
        
        for (const unit in units[activeTab][category]) {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            optgroup.appendChild(option);
        }
        
        fromUnit.appendChild(optgroup.cloneNode(true));
        toUnit.appendChild(optgroup);
    }
}

function setDefaultUnits() {
    switch (activeTab) {
        case 'distance':
            fromUnit.value = 'Kilometre (km)';
            toUnit.value = 'Mile (mi)';
            break;
        case 'weight':
            fromUnit.value = 'Kilogram (kg)';
            toUnit.value = 'Stone (st)';
            break;
        case 'height':
            fromUnit.value = 'Metre (m)';
            toUnit.value = 'Foot (ft)';
            break;
    }
    convert();
}

function switchTab(tab) {
    activeTab = tab;
    tabBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    populateUnits();
    setDefaultUnits();
}

function convert() {
    const from = fromUnit.value;
    const to = toUnit.value;
    const value = parseFloat(fromValue.value);

    if (isNaN(value)) {
        resultEl.textContent = '';
        return;
    }

    const fromFactor = getConversionFactor(from);
    const toFactor = getConversionFactor(to);
    const result = (value * fromFactor) / toFactor;
    
    resultEl.textContent = `${formatNumber(result)} ${to.split(' ')[1]}`;
}

function getConversionFactor(unit) {
    for (const category in units[activeTab]) {
        if (units[activeTab][category][unit]) {
            return units[activeTab][category][unit];
        }
    }
    return 1;
}

function formatNumber(num) {
    return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function swapUnits() {
    const temp = fromUnit.value;
    fromUnit.value = toUnit.value;
    toUnit.value = temp;
    convert();
}

init();