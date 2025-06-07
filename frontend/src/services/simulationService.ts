// フロントエンド用に調整したシミュレーションサービス

import { SimulationInputData, SimulationResult, LifeEvent, BackendSimulationResult } from '../types';

// 教育費の標準データ (万円/年)
const EDUCATION_COSTS = {
  public: { elementary: 40, middle: 50, high: 50, university: 100 },
  private_liberal: { elementary: 160, middle: 140, high: 100, university: 150 },
  private_science: { elementary: 160, middle: 140, high: 100, university: 180 },
  custom: { elementary: 0, middle: 0, high: 0, university: 0 }, // カスタムは入力値を使用
};

const getEducationCost = (age: number, plan: keyof typeof EDUCATION_COSTS, customAmount: number = 0): number => {
  if (plan === 'custom') {
    return (age >= 19 && age <= 22) ? customAmount : 0; // 簡単化: 大学費用のみ
  }
  if (age >= 7 && age <= 12) return EDUCATION_COSTS[plan].elementary * 10000;
  if (age >= 13 && age <= 15) return EDUCATION_COSTS[plan].middle * 10000;
  if (age >= 16 && age <= 18) return EDUCATION_COSTS[plan].high * 10000;
  if (age >= 19 && age <= 22) return EDUCATION_COSTS[plan].university * 10000;
  return 0;
};

// 元利均等返済の年間返済額
const calculateAnnualLoanPayment = (loanAmount: number, interestRate: number, loanTerm: number): number => {
  if (loanAmount <= 0 || interestRate < 0 || loanTerm <= 0) return 0;
  const monthlyRate = interestRate / 100 / 12;
  const numberOfPayments = loanTerm * 12;
  if (monthlyRate === 0) return loanAmount / loanTerm;
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  return monthlyPayment * 12;
};

// メインの計算ロジック
export const calculateSimulation = (
  input: SimulationInputData, 
  lifeEvents: LifeEvent[]
): BackendSimulationResult => {

  const assetData: SimulationResult[] = [];
  let currentSavings = Number(input.currentSavings);
  
  // inputから数値を取得（空文字列や未定義は0として扱う）
  const currentAge = Number(input.currentAge) || 0;
  const retirementAge = Number(input.retirementAge) || 0;
  const lifeExpectancy = Number(input.lifeExpectancy) || 100;
  let annualIncome = Number(input.annualIncome) || 0;
  const salaryIncreaseRate = Number(input.salaryIncreaseRate) || 0;
  const investmentRatio = Number(input.investmentRatio) || 0;
  const annualReturn = Number(input.annualReturn) || 0;
  const severancePay = Number(input.severancePay) || 0;
  const monthlyExpenses = Number(input.monthlyExpenses) || 0;
  const pensionAmountPerYear = Number(input.pensionAmountPerYear) || 0;
  const pensionStartDate = Number(input.pensionStartDate) || 0;

  for (let age = currentAge; age <= lifeExpectancy; age++) {
    const year = new Date().getFullYear() + (age - currentAge);
    let income = 0;
    let expense = monthlyExpenses * 12;
    const incomeDetails: Record<string, number> = {};
    const expenseDetails: Record<string, number> = { '基本生活費': expense };

    // 給与収入
    if (age < retirementAge) {
      income += annualIncome;
      incomeDetails['給与収入'] = annualIncome;
      annualIncome *= (1 + salaryIncreaseRate / 100);
    }
    // 年金収入
    if (age >= pensionStartDate) {
      income += pensionAmountPerYear;
      incomeDetails['年金収入'] = pensionAmountPerYear;
    }
    // 退職金
    if (age === retirementAge) {
      income += severancePay;
      incomeDetails['退職金'] = severancePay;
    }
    
    // ライフイベントによる収支
    lifeEvents.forEach(event => {
        if (event.startAge && age >= Number(event.startAge)) {
            const endAge = event.endAge ? Number(event.endAge) : event.startAge;
            if (age <= endAge) {
                const amount = Number(event.amount) || 0;
                if (event.type === 'income') {
                    income += amount;
                    incomeDetails[event.description] = (incomeDetails[event.description] || 0) + amount;
                } else {
                    expense += amount;
                    expenseDetails[event.description] = (expenseDetails[event.description] || 0) + amount;
                }
            }
        }
    });

    // 資産運用
    const investmentReturn = currentSavings > 0 ? currentSavings * (investmentRatio / 100) * (annualReturn / 100) : 0;
    income += investmentReturn;
    incomeDetails['資産運用益'] = investmentReturn;

    // 年間収支と年末貯蓄
    const balance = income - expense;
    currentSavings += balance;
    if (currentSavings < 0) {
        currentSavings = 0; // 資産はマイナスにならない
    }

    const currentYearResult: SimulationResult = {
      year,
      age,
      income,
      expense,
      balance,
      savings: currentSavings,
      incomeDetails,
      expenseDetails,
    };
    assetData.push(currentYearResult);
  }

  return {
    assetData,
    finalSavings: currentSavings,
    lifeExpectancy: Number(input.lifeExpectancy),
    retirementAge: Number(input.retirementAge),
    currentAge: Number(input.currentAge),
    pensionStartDate: Number(input.pensionStartDate),
  };
}; 
