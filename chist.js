/**
 * ==========================================================================
 *  chist.js — Расчёт «от Чистой зарплаты» (обратный расчёт)
 * ==========================================================================
 *  Пользователь вводит желаемую сумму «на руки» → рассчитываем необходимую
 *  Гросс зарплату, удержания, взносы работодателя и ФОТ.
 *
 *  Формулы (обратный расчёт):
 *    totalRate       = ПН(10%) + ПФ(8%) + ГНПФ(2%) = 20%  (для обычного)
 *    База            = Нетто_желаемое / (1 − totalRate)
 *    Гросс           = База − Бонусы
 *    Далее — прямой расчёт от найденной базы
 * ==========================================================================
 */

function calculateFromNetto() {
    // ── 1. Считываем входные данные ─────────────────────────────────────────
    const desiredNetto = parseFloat(document.getElementById('chist').value) || 0;
    const bonusValue = parseFloat(document.getElementById('bonus').value) || 0;
    const workerType = document.getElementById('workerType').value;

    if (desiredNetto <= 0) return;

    // ── 2. Получаем ставки ──────────────────────────────────────────────────
    const rates = getRates(workerType);

    // ── 3. Обратный расчёт: находим базу из желаемого нетто ─────────────────
    // Формула с учетом вычета (ПМ 650):
    // Net = Base - Base*SF_rate - Tax
    // Tax = (Base - Base*SF_rate - Deduction) * IT_rate
    // Net = Base * (1 - SF_rate) * (1 - IT_rate) + Deduction * IT_rate
    // Base = (Net - Deduction * IT_rate) / ((1 - SF_rate) * (1 - IT_rate))

    const SF_rate = rates.pensionFund + rates.gnpf;
    const IT_rate = rates.incomeTax;
    const deduction = rates.personalDeduction || 0;

    // Считаем, что desiredNetto — это итоговая сумма к выплате на руки
    let base = (desiredNetto - deduction * IT_rate) / ((1 - SF_rate) * (1 - IT_rate));
    base = Math.round(base);

    if (base <= 0) return;

    // Гросс до бонусов
    const grossValue = base - bonusValue;

    // ── 4. Прямой расчёт от найденной базы ──────────────────────────────────
    const pensionFundAmount = Math.round(base * rates.pensionFund);
    const gnpfAmount = Math.round(base * rates.gnpf);
    const employeeSocFond = pensionFundAmount + gnpfAmount;

    let taxBase = base - employeeSocFond - deduction;
    if (taxBase < 0) taxBase = 0;

    const incomeTaxAmount = Math.round(taxBase * IT_rate);

    const totalDeductions = incomeTaxAmount + pensionFundAmount + gnpfAmount;
    const totalDeductionPct = rates.incomeTax + rates.pensionFund + rates.gnpf;

    const netto = base - totalDeductions;

    // ── 5. Взносы работодателя ──────────────────────────────────────────────
    const employerPensionAmount = Math.round(base * rates.employerPension);
    const employerSocMedAmount = Math.round(base * rates.employerSocMed);

    const totalEmployer = employerPensionAmount + employerSocMedAmount;
    const totalEmployerPct = rates.employerPension + rates.employerSocMed;

    // ── 6. ФОТ ──────────────────────────────────────────────────────────────
    const fot = base + totalEmployer;

    // ── 7. Рендер результатов ───────────────────────────────────────────────
    renderResults({
        base,
        workerType,
        rates,
        incomeTaxAmount,
        pensionFundAmount,
        gnpfAmount,
        totalDeductions,
        totalDeductionPct,
        taxBase,
        netto,
        employerPensionAmount,
        employerSocMedAmount,
        totalEmployer,
        totalEmployerPct,
        fot,
    });
}
