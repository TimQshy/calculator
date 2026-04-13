const CONSTANTS = {
    PTN: 650, // Standard Personal Deduction in KGS
    RATES: {
        standard: { pf: 0.10, pn: 0.10, gnfp: 0.02, employer_sf: 0.1725 },
        pensioner: { pf: 0.00, pn: 0.10, gnfp: 0.00, employer_sf: 0.1525 }, // PF is 0, GNFP is 0
        foreign: { pf: 0.03, pn: 0.10, gnfp: 0.00, employer_sf: 0.03 },
        htp: { pf: 0.00, pn: 0.05, gnfp: 0.00, employer_sf: 0.00 } // Special regime (High Tech Park)
    }
};

// State holding all numerical data
let state = {
    gross: 50000,
    bonus: 0,
    type: 'standard',
    deductions: {
        pn: 0,
        pf: 0,
        gnfp: 0
    },
    employerDeductions: {
        sf: 0
    },
    net: 0,
    fot: 0,
    activeOverride: null // 'pn', 'pf', 'gnfp', or null
};

// DOM references
const els = {
    gross: document.getElementById('gross-salary'),
    bonus: document.getElementById('bonus'),
    type: document.getElementById('employee-type'),

    pnInput: document.getElementById('deduction-pn'),
    pfInput: document.getElementById('deduction-pf'),
    gnfpInput: document.getElementById('deduction-gnfp'),

    pnSlider: document.getElementById('slider-pn'),
    pfSlider: document.getElementById('slider-pf'),
    gnfpSlider: document.getElementById('slider-gnfp'),

    net: document.getElementById('net-salary'),
    deductions: document.getElementById('total-deductions'),
    fot: document.getElementById('total-fot'),

    tableBody: document.getElementById('table-body')
};

let chartInstance = null;

function init() {
    setupEventListeners();
    calculateForward();
    initChart();
    updateUI();
}

function setupEventListeners() {
    els.gross.addEventListener('input', (e) => {
        state.activeOverride = null;
        state.gross = parseFloat(e.target.value) || 0;
        calculateForward();
        updateUI();
    });

    els.bonus.addEventListener('input', (e) => {
        state.activeOverride = null;
        state.bonus = parseFloat(e.target.value) || 0;
        calculateForward();
        updateUI();
    });

    els.type.addEventListener('change', (e) => {
        state.type = e.target.value;
        state.activeOverride = null;
        calculateForward();
        updateUI();
    });

    const overrideHandlers = [
        { id: 'pn', input: els.pnInput, slider: els.pnSlider },
        { id: 'pf', input: els.pfInput, slider: els.pfSlider },
        { id: 'gnfp', input: els.gnfpInput, slider: els.gnfpSlider }
    ];

    overrideHandlers.forEach(h => {
        h.input.addEventListener('input', (e) => {
            state.activeOverride = h.id;
            state.deductions[h.id] = parseFloat(e.target.value) || 0;
            h.slider.value = state.deductions[h.id];
            calculateReverse();
            updateUI(true); // pass true to skip updating inputs we are typing into
        });

        h.slider.addEventListener('input', (e) => {
            state.activeOverride = h.id;
            state.deductions[h.id] = parseFloat(e.target.value) || 0;
            h.input.value = state.deductions[h.id];
            calculateReverse();
            updateUI(true);
        });
    });
}

function calculateForward() {
    let totalGross = state.gross + state.bonus;
    const rates = CONSTANTS.RATES[state.type];

    // standard calculations
    state.deductions.pf = totalGross * rates.pf;

    // PN is calculated on (Gross - PF - PTN)
    let taxableForPn = Math.max(0, totalGross - state.deductions.pf - CONSTANTS.PTN);
    state.deductions.pn = taxableForPn * rates.pn;

    state.deductions.gnfp = totalGross * rates.gnfp;

    // Employer Contributions
    state.employerDeductions.sf = totalGross * rates.employer_sf;

    updateTotals(totalGross);
}

function calculateReverse() {
    // Determine the base gross necessary to have this much deduction
    const rates = CONSTANTS.RATES[state.type];
    if (rates[state.activeOverride] === 0) return; // Cannot solve if rate is 0

    let newTotalGross = state.gross + state.bonus;

    if (state.activeOverride === 'pf') {
        newTotalGross = state.deductions.pf / rates.pf;
    } else if (state.activeOverride === 'gnfp') {
        newTotalGross = state.deductions.gnfp / rates.gnfp;
    } else if (state.activeOverride === 'pn') {
        // PN = (Gross - Gross*pf - PTN) * pn_rate
        // Gross = ((PN / pn_rate) + PTN) / (1 - pf_rate)
        if (rates.pn > 0) {
            newTotalGross = ((state.deductions.pn / rates.pn) + CONSTANTS.PTN) / (1 - rates.pf);
        }
    }

    state.gross = Math.max(0, newTotalGross - state.bonus);

    // Recalculate everything else using new gross
    const overrideVal = state.deductions[state.activeOverride]; // preserve exact override
    calculateForward();
    state.deductions[state.activeOverride] = overrideVal; // enforce exact to avoid float issues
}

function updateTotals(totalGross) {
    let totalEmpDeductions = state.deductions.pn + state.deductions.pf + state.deductions.gnfp;
    state.net = totalGross - totalEmpDeductions;
    state.fot = totalGross + state.employerDeductions.sf;
}

function formatMoney(amount) {
    return new Intl.NumberFormat('ru-RU', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatPercent(val) {
    return (val * 100).toFixed(2) + '%';
}

function updateUI(skipCurrentInputs = false) {
    els.net.textContent = formatMoney(state.net);
    els.deductions.textContent = formatMoney(state.deductions.pn + state.deductions.pf + state.deductions.gnfp);
    els.fot.textContent = formatMoney(state.fot);

    if (!skipCurrentInputs || state.activeOverride !== 'gross') {
        // we omit modifying base salary if we're focused on override inputs maybe? 
        // No, we want gross to update immediately on reverse calc
        els.gross.value = Math.round(state.gross);
    }

    if (!skipCurrentInputs || state.activeOverride !== 'pn') {
        els.pnInput.value = Math.round(state.deductions.pn);
        els.pnSlider.value = Math.round(state.deductions.pn);
    }

    if (!skipCurrentInputs || state.activeOverride !== 'pf') {
        els.pfInput.value = Math.round(state.deductions.pf);
        els.pfSlider.value = Math.round(state.deductions.pf);
    }

    if (!skipCurrentInputs || state.activeOverride !== 'gnfp') {
        els.gnfpInput.value = Math.round(state.deductions.gnfp);
        els.gnfpSlider.value = Math.round(state.deductions.gnfp);
    }

    // Dynamic slider limits
    let maxSliderBounds = Math.max((state.gross + state.bonus) * 0.3, 10000);
    els.pnSlider.max = Math.ceil(maxSliderBounds);
    els.pfSlider.max = Math.ceil(maxSliderBounds);
    els.gnfpSlider.max = Math.ceil(maxSliderBounds);

    updateTable();
    updateChart();
}

function updateTable() {
    const rates = CONSTANTS.RATES[state.type];
    const totalGross = state.gross + state.bonus;

    // Effective Rate calculation
    let effectivePnRate = state.deductions.pn > 0 ? (state.deductions.pn / totalGross) : 0;

    els.tableBody.innerHTML = `
        <tr>
            <td>Гросс доход (Оклад + Премия)</td>
            <td>-</td>
            <td>${formatMoney(totalGross)}</td>
        </tr>
        <tr>
            <td><span style="color: var(--color-red-light)">Подоходный налог (ПН)</span></td>
            <td>База: ${formatPercent(rates.pn)} | Эфф: ${formatPercent(effectivePnRate)}</td>
            <td>${formatMoney(state.deductions.pn)}</td>
        </tr>
        <tr>
            <td><span style="color: var(--color-red-light)">Пенсионный фонд (ПФ)</span></td>
            <td>${formatPercent(rates.pf)}</td>
            <td>${formatMoney(state.deductions.pf)}</td>
        </tr>
        <tr>
            <td><span style="color: var(--color-red-light)">Гос. накопительный фонд (ГНПФ)</span></td>
            <td>${formatPercent(rates.gnfp)}</td>
            <td>${formatMoney(state.deductions.gnfp)}</td>
        </tr>
        <tr>
            <td><span style="color: var(--color-green-light)"><strong>Чистая зарплата (На руки)</strong></span></td>
            <td>-</td>
            <td><strong>${formatMoney(state.net)}</strong></td>
        </tr>
        <tr>
            <td><span style="color: var(--color-blue-light)">Соцфонд (Работодатель)</span></td>
            <td>${formatPercent(rates.employer_sf)}</td>
            <td>${formatMoney(state.employerDeductions.sf)}</td>
        </tr>
        <tr>
            <td><strong style="color: var(--color-blue-light)">Фонд оплаты труда (ФОТ)</strong></td>
            <td>-</td>
            <td><strong style="color: var(--color-blue-light)">${formatMoney(state.fot)}</strong></td>
        </tr>
    `;
}

function initChart() {
    const ctx = document.getElementById('salaryChart').getContext('2d');
    Chart.defaults.color = '#8b949e';
    Chart.defaults.font.family = "'Inter', -apple-system, sans-serif";

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['На руки', 'ПН', 'ПФ', 'ГНПФ', 'Соцфонд (Раб.)'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    '#2ea043', /* Green */
                    '#f85149', /* Red */
                    '#da3633', /* Darker Red */
                    '#ff7b72', /* Light Red */
                    '#388bfd'  /* Blue */
                ],
                borderWidth: 1,
                borderColor: '#0d1117'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#c9d1d9' }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let val = context.raw;
                            return ' ' + new Intl.NumberFormat('ru-RU').format(val) + ' сом';
                        }
                    }
                }
            }
        }
    });
}

function updateChart() {
    if (chartInstance) {
        chartInstance.data.datasets[0].data = [
            Math.round(state.net),
            Math.round(state.deductions.pn),
            Math.round(state.deductions.pf),
            Math.round(state.deductions.gnfp),
            Math.round(state.employerDeductions.sf)
        ];
        chartInstance.update();
    }
}

// Ensure the code initializes when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
