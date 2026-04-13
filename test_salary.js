const rates = {
    incomeTax: 0.10,
    pensionFund: 0.08,
    gnpf: 0.02,
    employerPension: 0,
    employerSocMed: 0.0225,
    personalDeduction: 650
};

const base = 50000;
const pensionFundAmount = Math.round(base * rates.pensionFund);
const gnpfAmount = Math.round(base * rates.gnpf);
const employeeSocFond = pensionFundAmount + gnpfAmount;

let taxBase = base - employeeSocFond - rates.personalDeduction;
if (taxBase < 0) taxBase = 0;

const incomeTaxAmount = Math.round(taxBase * rates.incomeTax);

const totalDeductions = incomeTaxAmount + pensionFundAmount + gnpfAmount;
const netto = base - totalDeductions;

console.log("Gross (Начислено):", base);
console.log("Социальный фонд 10%:", employeeSocFond);
console.log("Налоговая база (Гросс - Соцфонд - 650):", taxBase);
console.log("Подоходный налог (10% от базы):", incomeTaxAmount);
console.log("На руки (Гросс - Соцфонд - ПН):", netto);
console.log("User's math for На руки:", taxBase - incomeTaxAmount);
