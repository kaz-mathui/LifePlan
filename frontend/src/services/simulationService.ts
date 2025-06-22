// フロントエンド用に調整したシミュレーションサービス

import { SimulationInputData, SimulationResult, BackendSimulationResult } from '../types';
import { EDUCATION_COST } from '../constants';

// 年間の元利均等返済額を計算するヘルパー関数
const calculateAnnualLoanPayment = (loanAmount: number, interestRate: number, loanTerm: number): number => {
    if (loanAmount <= 0 || loanTerm <= 0) return 0;
    
    // 金利が0の場合の特殊ケース
    if (interestRate === 0) {
        return loanAmount / loanTerm;
    }
    
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;
    
    const monthlyPayment = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    
    return monthlyPayment * 12;
};

// メインの計算ロジック
export const calculateSimulation = (input: SimulationInputData): BackendSimulationResult => {
  const M = 10000;

  const {
    lifeEvents, housing, education, car, senior
  } = input;
  
  // Ensure all number inputs are treated as numbers, with a default of 0
  const currentAge = Number(input.currentAge) || 0;
  const retirementAge = Number(input.retirementAge) || 0;
  const lifeExpectancy = Number(input.lifeExpectancy) || 100;
  const salaryIncreaseRate = Number(input.salaryIncreaseRate) || 0;
  const currentSavings = Number(input.currentSavings) || 0;
  const annualIncome = Number(input.annualIncome) || 0;
  const monthlyExpenses = Number(input.monthlyExpenses) || 0;
  const investmentRatio = Number(input.investmentRatio) || 0;
  const annualReturn = Number(input.annualReturn) || 0;
  const pensionAmountPerYear = Number(input.pensionAmountPerYear) || 0;
  const pensionStartDate = Number(input.pensionStartDate) || 0;
  const severancePay = Number(input.severancePay) || 0;

  const assetData: SimulationResult[] = [];
  let currentYearSavings = currentSavings * M;
  let currentAnnualIncome = annualIncome * M;
  let housingLoanRemainingTerm = housing.hasLoan ? (Number(housing.loanTerm) || 0) : 0;
  let carLoanRemainingTerm = car.hasCar ? (Number(car.loanTerm) || 0) : 0;
  let isBankrupt = false;

  const housingLoanAmount = Math.max(0, (Number(housing.propertyValue) || 0) - (Number(housing.downPayment) || 0)) * M;
  const annualHousingLoanPayment = housing.hasLoan ? calculateAnnualLoanPayment(housingLoanAmount, Number(housing.interestRate) || 0, Number(housing.loanTerm) || 0) : 0;
  
  const carLoanAmount = Math.max(0, (Number(car.price) || 0) - (Number(car.downPayment) || 0)) * M;
  const annualCarLoanPayment = car.hasCar ? calculateAnnualLoanPayment(carLoanAmount, Number(car.interestRate) || 0, Number(car.loanTerm) || 0) : 0;

  const summaryEvents: string[] = [];

  for (let age = currentAge; age <= lifeExpectancy; age++) {
    let yearlyIncome = 0;
    let yearlyExpenses = monthlyExpenses * M * 12;
    const incomeDetails: Record<string, number> = {};
    const expenseDetails: Record<string, number> = { '基本生活費': yearlyExpenses };

    if (age < retirementAge) {
      yearlyIncome += currentAnnualIncome;
      incomeDetails['給与収入'] = currentAnnualIncome;
      currentAnnualIncome *= (1 + salaryIncreaseRate / 100);
    }
    if (age >= pensionStartDate) {
      const pension = pensionAmountPerYear * M;
      yearlyIncome += pension;
      incomeDetails['年金収入'] = pension;
      if (age === pensionStartDate) summaryEvents.push(`${age}歳: 年金受給開始。年間${pensionAmountPerYear}万円の収入が始まります。`);
    }
    if (age === retirementAge && severancePay > 0) {
      const severancePayAmount = severancePay * M;
      yearlyIncome += severancePayAmount;
      incomeDetails['退職金'] = severancePayAmount;
      summaryEvents.push(`${age}歳: 退職。退職金${severancePay}万円が加算されます。`);
    }

    if (housing.hasLoan && age === (Number(housing.startAge) || 0)) {
      const downPayment = (Number(housing.downPayment) || 0) * M;
      yearlyExpenses += downPayment;
      expenseDetails['住宅頭金'] = downPayment;
      summaryEvents.push(`${age}歳: 住宅購入。頭金${housing.downPayment}万円を支出し、ローン返済が開始します。`);
    }
    if (housing.hasLoan && age >= (Number(housing.startAge) || 0)) {
       if (housingLoanRemainingTerm > 0) {
        const taxPayment = (Number(housing.propertyValue) || 0) * M * ((Number(housing.propertyTaxRate) || 0) / 100);
        yearlyExpenses += annualHousingLoanPayment + taxPayment;
        expenseDetails['住宅ローン返済'] = annualHousingLoanPayment;
        expenseDetails['固定資産税'] = taxPayment;
        housingLoanRemainingTerm--;
       }
    }

    if (education.hasChildren) {
      let totalEducationCost = 0;
      let activeChildren = 0;
      education.children.forEach((child) => {
        const childAge = age - (new Date().getFullYear() - (Number(child.birthYear) || new Date().getFullYear()));
        if (childAge >= 0) activeChildren++;

        const getEducationCost = (age: number, plan: string) => {
            const M = 10000;
            if (age >= 6 && age < 12) return (plan === 'public' ? EDUCATION_COST.elementary.public : EDUCATION_COST.elementary.private) * M;
            if (age >= 12 && age < 15) return (plan === 'public' ? EDUCATION_COST.middle.public : EDUCATION_COST.middle.private) * M;
            if (age >= 15 && age < 18) return (plan === 'public' ? EDUCATION_COST.high.public : EDUCATION_COST.high.private) * M;
            if (age >= 18 && age < 22) {
              if (plan === 'private_liberal') return EDUCATION_COST.university.private_liberal * M;
              if (plan === 'private_science') return EDUCATION_COST.university.private_science * M;
              return EDUCATION_COST.university.public * M;
            }
            return 0;
        };
        const educationCost = getEducationCost(childAge, child.plan);
        if (educationCost > 0) totalEducationCost += educationCost;
      });
      if (totalEducationCost > 0) {
        yearlyExpenses += totalEducationCost;
        expenseDetails['教育費'] = totalEducationCost;
      }
      if (activeChildren > 0 && (Number(education.childLivingCost) || 0) > 0) {
        const totalLivingCost = activeChildren * (Number(education.childLivingCost) || 0) * M;
        yearlyExpenses += totalLivingCost;
        expenseDetails['子供の生活費'] = totalLivingCost;
      }
    }

    if (car.hasCar) {
      const purchaseAge = Number(car.purchaseAge) || 0;
      if (age >= purchaseAge) {
        yearlyExpenses += (Number(car.maintenanceCost) || 0) * M;
        expenseDetails['自動車維持費'] = (Number(car.maintenanceCost) || 0) * M;
      }
      if (age === purchaseAge) {
        const downPayment = (Number(car.downPayment) || 0) * M;
        yearlyExpenses += downPayment;
        expenseDetails['自動車頭金'] = downPayment;
        summaryEvents.push(`${age}歳: 自動車購入。頭金${car.downPayment}万円を支出し、ローン返済が開始します。`);
      }
      if (age >= purchaseAge && carLoanRemainingTerm > 0) {
        yearlyExpenses += annualCarLoanPayment;
        expenseDetails['自動車ローン返済'] = annualCarLoanPayment;
        carLoanRemainingTerm--;
      }
      if (age > purchaseAge && (age - purchaseAge) % (Number(car.replacementCycle) || 100) === 0) {
        const downPayment = (Number(car.downPayment) || 0) * M;
        yearlyExpenses += downPayment;
        expenseDetails['自動車頭金（買い替え）'] = downPayment;
        carLoanRemainingTerm = Number(car.loanTerm) || 0;
        summaryEvents.push(`${age}歳: 自動車の買い替え。頭金${car.downPayment}万円を支出し、新たなローン返済が開始します。`);
      }
    }
    
    if (age >= retirementAge) {
        // No specific logic for retirement year expenses other than salary stopping.
    }

    if (senior.enabled && age >= senior.startAge) {
        const seniorMonthlyExpense = (Number(senior.monthlyExpense) || 0) * M / 12;
        yearlyExpenses += seniorMonthlyExpense * 12;
        expenseDetails['シニア生活費'] = (expenseDetails['シニア生活費'] || 0) + seniorMonthlyExpense * 12;
    }

    lifeEvents.forEach(event => {
        if (age >= event.startAge) {
            const endAge = event.endAge ?? event.startAge;
            if (age <= endAge) {
                const amount = (Number(event.amount) || 0) * M;
                if (event.type === 'income') {
                    yearlyIncome += amount;
                    incomeDetails[event.description] = (incomeDetails[event.description] || 0) + amount;
                } else {
                    yearlyExpenses += amount;
                    expenseDetails[event.description] = (expenseDetails[event.description] || 0) + amount;
                }
            }
        }
    });

    const investmentReturn = currentYearSavings * (investmentRatio / 100) * (annualReturn / 100);
    incomeDetails['資産運用益'] = investmentReturn;
    const investmentGains = investmentReturn;
    const balance = yearlyIncome + investmentGains - yearlyExpenses;
    currentYearSavings += balance;
    
    if(currentYearSavings < 0 && !isBankrupt) {
        summaryEvents.push(`${age}歳: 貯蓄がマイナスになりました。プランの見直しが必要です。`);
        isBankrupt = true;
    }

    assetData.push({
      year: new Date().getFullYear() + (age - currentAge),
      age,
      income: Math.round(yearlyIncome + investmentGains),
      expense: Math.round(yearlyExpenses),
      balance: Math.round(balance),
      savings: Math.round(currentYearSavings),
      incomeDetails,
      expenseDetails,
    });
  }

  const finalSavings = assetData[assetData.length - 1]?.savings ?? 0;
  const retirementSavings = assetData.find(d => d.age === retirementAge)?.savings ?? 0;
  
  let advice = '';
  if (finalSavings <= 0) {
      advice = `想定寿命(${lifeExpectancy}歳)時点で資産が枯渇する可能性が高いです。月々の支出の見直しや、投資計画の変更を検討しましょう。`;
  } else if (retirementSavings < 2000 * M) {
      advice = `リタイア時の資産が2,000万円を下回る可能性があります。老後の生活設計について、追加の収入源や支出削減を検討することをお勧めします。`;
  } else {
      advice = `計画は順調に進んでいます。引き続き計画的な資産管理を心がけましょう。`;
  }

  return { assetData, summaryEvents, advice, retirementAge };
}; 
 