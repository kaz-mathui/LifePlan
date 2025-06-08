// フロントエンド用に調整したシミュレーションサービス

import { SimulationInputData, SimulationResult, LifeEvent, BackendSimulationResult } from '../types';

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
 