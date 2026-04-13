/**
 * ==========================================================================
 *  КАЛЬКУЛЯТОР ЗАРПЛАТЫ — КЫРГЫЗСКАЯ РЕСПУБЛИКА
 *  main.js — Общие утилиты, управление формой и рендеринг результатов
 * ==========================================================================
 *
 *  Ставки налогов и взносов (по состоянию на 2024–2025 гг.):
 *
 *  ─── Удержания работника ───────────────────────────────────────────────
 *  1. Подоходный налог (ПН):        10% от налогооблагаемой базы
 *  2. Пенсионный фонд (ПФ):         8% (для пенсионеров — 2%)
 *  3. ГНПФ (гос. накопительный):     2% (для пенсионеров — 0%)
 *
 *  ─── Взносы работодателя ───────────────────────────────────────────────
 *  4. Пенсионные взносы:            15% (для иностранцев — 3%)
 *  5. Социальный и медицинский:      2.25%
 *
 *  ─── Формулы ───────────────────────────────────────────────────────────
 *  Налогооблагаемая база = Гросс + Бонусы
 *  Нетто = База - (ПН + ПФ + ГНПФ)
 *  ФОТ   = База + Взносы_работодателя
 * ==========================================================================
 */

// ═══════════════════════════════════════════════════════════════════════════
//  УТИЛИТЫ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Форматирование числа с разделителем тысяч (пробел)
 */
function fmt(n) {
  return n.toLocaleString('ru-RU');
}

/**
 * Процент в строку, например: 0.10 → "10%"
 */
function pct(rate) {
  const p = rate * 100;
  return (p % 1 === 0 ? p.toFixed(0) : p.toFixed(2)) + '%';
}

/**
 * Названия типов работников
 */
function workerLabel(type) {
  return {
    regular: 'Обычный работник',
    pensioner: 'Пенсионер',
    foreign: 'Иностранный работник',
  }[type] || type;
}

/**
 * Возвращает объект ставок для заданного типа работника
 */
function getRates(workerType) {
  const rates = {
    // Удержания работника
    incomeTax: 0.10,   // Подоходный налог — 10%
    pensionFund: 0.08,   // Пенсионный фонд — 8%
    gnpf: 0.02,   // ГНПФ — 2%

    // Взносы работодателя (для СМП / СПИНО)
    employerPension: 0,      // Пенсионные взносы работодателя — 0%
    employerSocMed: 0.0225,  // Социальный и медицинский — 2.25%

    // Налоговые вычеты
    personalDeduction: 650   // Прожиточный минимум (вычет для ПН)
  };

  // Пенсионеры: ПФ = 2%, ГНПФ = 0%
  if (workerType === 'pensioner') {
    rates.pensionFund = 0.02;
    rates.gnpf = 0;
  }

  // Иностранные работники
  if (workerType === 'foreign') {
    rates.employerPension = 0; // Для иностранцев СМП тоже 0% или другая ставка, оставим 0
  }

  return rates;
}

// ═══════════════════════════════════════════════════════════════════════════
//  УПРАВЛЕНИЕ ФОРМОЙ — переключение режимов Gross / Чистая
// ═══════════════════════════════════════════════════════════════════════════

const grossGroup = document.getElementById('grossGroup');
const chistGroup = document.getElementById('chistGroup');
const grossInput = document.getElementById('gross');
const chistInput = document.getElementById('chist');

/**
 * Получить текущий режим расчёта
 */
function getCalcMode() {
  return document.querySelector('input[name="calcMode"]:checked').value;
}

/**
 * Показать/скрыть нужное поле ввода при переключении радиокнопки
 */
function updateInputVisibility() {
  const mode = getCalcMode();
  if (mode === 'gross') {
    grossGroup.classList.remove('hidden');
    chistGroup.classList.add('hidden');
    grossInput.required = true;
    chistInput.required = false;
    chistInput.value = '';
  } else {
    grossGroup.classList.add('hidden');
    chistGroup.classList.remove('hidden');
    grossInput.required = false;
    chistInput.required = true;
    grossInput.value = '';
  }

  // Скрываем предыдущие результаты при переключении режима
  const results = document.getElementById('results');
  results.style.display = 'none';
  results.innerHTML = '';
}

// Слушатель переключения радиокнопок
document.querySelectorAll('input[name="calcMode"]').forEach(function (radio) {
  radio.addEventListener('change', updateInputVisibility);
});

// ═══════════════════════════════════════════════════════════════════════════
//  ОБРАБОТЧИК ФОРМЫ — диспетчеризация вычислений
// ═══════════════════════════════════════════════════════════════════════════

document.getElementById('salaryForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const mode = getCalcMode();
  if (mode === 'gross') {
    calculateFromGross();
  } else {
    calculateFromNetto();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  РЕНДЕР РЕЗУЛЬТАТОВ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Рендер результатов в DOM — единый вывод для обоих режимов
 */
function renderResults(d) {
  const container = document.getElementById('results');
  container.style.display = 'block';

  container.innerHTML = `
    <!-- Summary cards -->
    <div class="summary-row">
      <div class="summary-item netto">
        <div class="label">Чистая зарплата</div>
        <div class="value">${fmt(d.netto)}</div>
      </div>
      <div class="summary-item deductions">
        <div class="label">Удержания</div>
        <div class="value">−${fmt(d.totalDeductions)}</div>
      </div>
      <div class="summary-item fot">
        <div class="label">ФОТ</div>
        <div class="value">${fmt(d.fot)}</div>
      </div>
    </div>

    <!-- Detailed table -->
    <div class="card">
      <div class="card-title">
        Детальный расчёт
        <span class="badge badge-blue" style="margin-left: 8px;">${workerLabel(d.workerType)}</span>
      </div>
      <table class="result-table">
        <thead>
          <tr>
            <th>Тип удержания / взноса</th>
            <th>Ставка</th>
            <th>Сумма (сом)</th>
          </tr>
        </thead>
        <tbody>
          <!-- ────── Налогооблагаемая база ────── -->
          <tr class="section-header"><td colspan="3">Налогооблагаемая база</td></tr>
          <tr>
            <td>Гросс + Бонусы</td>
            <td>—</td>
            <td>${fmt(d.base)}</td>
          </tr>

          <!-- ────── Удержания работника ────── -->
          <tr class="section-header"><td colspan="3">Удержания работника</td></tr>
          <tr class="row-deduction">
            <td>Пенсионный фонд (ПФ)</td>
            <td>${pct(d.rates.pensionFund)}</td>
            <td>−${fmt(d.pensionFundAmount)}</td>
          </tr>
          <tr class="row-deduction">
            <td>ГНПФ (накопительный)</td>
            <td>${pct(d.rates.gnpf)}</td>
            <td>−${fmt(d.gnpfAmount)}</td>
          </tr>
          ${d.rates.personalDeduction ? `
          <tr>
            <td><i>Вычет (Прожиточный минимум)</i></td>
            <td>—</td>
            <td style="color: var(--text-muted);"><i>−${fmt(d.rates.personalDeduction)} (не облагается)</i></td>
          </tr>
          <tr>
            <td><i>База для подоходного налога</i></td>
            <td>—</td>
            <td style="color: var(--text-muted);">${fmt(d.taxBase)}</td>
          </tr>
          ` : ''}
          <tr class="row-deduction">
            <td>Подоходный налог (ПН)</td>
            <td>${pct(d.rates.incomeTax)}</td>
            <td>−${fmt(d.incomeTaxAmount)}</td>
          </tr>
          <tr class="row-total">
            <td>Всего удержано с работника</td>
            <td><span class="badge badge-red">${pct(d.totalDeductionPct)}</span></td>
            <td style="color: var(--red);">−${fmt(d.totalDeductions)}</td>
          </tr>

          <!-- ────── Чистая зарплата ────── -->
          <tr class="row-netto">
            <td>✅ Чистая зарплата (нетто)</td>
            <td></td>
            <td>${fmt(d.netto)}</td>
          </tr>

          <!-- ────── Взносы работодателя ────── -->
          <tr class="section-header"><td colspan="3">Взносы работодателя</td></tr>
          <tr class="row-employer">
            <td>Пенсионные взносы</td>
            <td>${pct(d.rates.employerPension)}</td>
            <td>+${fmt(d.employerPensionAmount)}</td>
          </tr>
          <tr class="row-employer">
            <td>Социальный и медицинский фонд</td>
            <td>${pct(d.rates.employerSocMed)}</td>
            <td>+${fmt(d.employerSocMedAmount)}</td>
          </tr>
          <tr class="row-total">
            <td>Всего взносы работодателя</td>
            <td><span class="badge badge-orange">${pct(d.totalEmployerPct)}</span></td>
            <td style="color: var(--orange);">+${fmt(d.totalEmployer)}</td>
          </tr>

          <!-- ────── ФОТ ────── -->
          <tr class="row-fot">
            <td>📊 Полный фонд оплаты труда (ФОТ)</td>
            <td></td>
            <td>${fmt(d.fot)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // Плавный скролл к результатам
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
