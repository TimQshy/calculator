/**
 * ==========================================================================
 *  gross.js — Расчёт «от Гросса» (прямой расчёт)
 * ==========================================================================
 *  Пользователь вводит Гросс зарплату → рассчитываем удержания, нетто, ФОТ.
 *
 *  Формулы:
 *    База            = Гросс + Бонусы
 *    ПН              = База × 10%
 *    ПФ              = База × 8% (пенсионеры: 2%)
 *    ГНПФ            = База × 2% (пенсионеры: 0%)
 *    Нетто           = База − (ПН + ПФ + ГНПФ)
 *    Взносы работод. = База × (15% + 2.25%)  // (иностранцы: 3% + 2.25%)
 *    ФОТ             = База + Взносы работодателя
 * ==========================================================================
 */

function calculateFromGross() {
    // ── 1. Считываем входные данные ─────────────────────────────────────────
    const grossValue = parseFloat(document.getElementById('gross').value) || 0;
    const bonusValue = parseFloat(document.getElementById('bonus').value) || 0;
    const workerType = document.getElementById('workerType').value;

    // Налогооблагаемая база = Гросс + Бонусы
    const base = grossValue + bonusValue;

    if (base <= 0) return;

    // ── 2. Получаем ставки ──────────────────────────────────────────────────
    const rates = getRates(workerType);

    // ── 3. Расчёт сумм удержаний работника ──────────────────────────────────
    const pensionFundAmount = Math.round(base * rates.pensionFund);
    const gnpfAmount = Math.round(base * rates.gnpf);

    const employeeSocFond = pensionFundAmount + gnpfAmount;
    let taxBase = base - employeeSocFond - (rates.personalDeduction || 0);
    if (taxBase < 0) taxBase = 0;

    const incomeTaxAmount = Math.round(taxBase * rates.incomeTax);

    // ── 4. Итого удержано с работника ───────────────────────────────────────
    const totalDeductions = incomeTaxAmount + pensionFundAmount + gnpfAmount;
    const totalDeductionPct = rates.incomeTax + rates.pensionFund + rates.gnpf;

    // ── 5. Чистая зарплата (нетто) = база − удержания ──────────────────────
    const netto = base - totalDeductions;

    // ── 6. Расчёт взносов работодателя ──────────────────────────────────────
    const employerPensionAmount = Math.round(base * rates.employerPension);
    const employerSocMedAmount = Math.round(base * rates.employerSocMed);

    const totalEmployer = employerPensionAmount + employerSocMedAmount;
    const totalEmployerPct = rates.employerPension + rates.employerSocMed;

    // ── 7. Полный фонд оплаты труда (ФОТ) = база + взносы работодателя ─────
    const fot = base + totalEmployer;

    // ── 8. Рендер результатов ───────────────────────────────────────────────
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
