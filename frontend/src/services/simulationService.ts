// フロントエンド用に調整したシミュレーションサービス

import { SimulationInputData, SimulationResult, BackendSimulationResult } from '../types';
import { EDUCATION_COST } from '../constants';

const M = 10000; // 万円

const calculateAnnualLoanPayment = (principal: number, annualRate: number, years: number): number => {
  if (principal <= 0 || annualRate < 0 || years <= 0) {
    return 0;
  }
  const monthlyRate = annualRate / 100 / 12;
  const numberOfPayments = years * 12;
  if (monthlyRate === 0) {
    return principal / years;
  }
  const payment = principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  return payment * 12;
};

// メインの計算ロジック
export const runSimulation = (input: SimulationInputData): BackendSimulationResult => {
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
   const investmentRatio = Number(input.investmentRatio) || 0;
   const anuualReturn = Number(input.annualReturn) || 0;
   const severancePay = Number(input.severancePay) || 0;
   const monthlyExpenses = Number(input.monthlyExpenses) || 0;
   const pensionAmountPerYear = Number(input.pensionAmountPerYear) || 0;
   const pensionStartDate = Number(input.pensionStartDate) || 0;
  
    const assetData: SimulationResult[] = [];
   let assets = currentSavings * M;
   let isBankrupt = false;
  
   const housingLoanAmount = Math.max(0, (Number(housing.propertyValue) || 0) - (Number(housing.downPayment) || 0)) * M;
    const annualHousingLoanPayment = housing.hasLoan ? calculateAnnualLoanPayment(housingLoanAmount, Number(housing.interestRate) || 0, Number(housing.loanTerm) || 0) : 0;
    
    const carLoanAmount = Math.max(0, (Number(car.price) || 0) - (Number(car.downPayment) || 0)) * M;
    const annualCarLoanPayment = car.hasCar ? calculateAnnualLoanPayment(carLoanAmount, Number(car.interestRate) || 0, Number(car.loanTerm) || 0) : 0;
    let carLoanRemainingTerm = car.hasCar ? (Number(car.loanTerm) || 0) : 0;


  const summaryEvents: string[] = [];
  
  for (let age = currentAge; age <= lifeExpectancy; age++) {
    let yearlyIncome = 0;
    let yearlyExpenses = monthlyExpenses * 12 * M; // 基本生活費（万円を円に変換）
    let incomeDetails: { [key: string]: number } = {};
    let expenseDetails: { [key: string]: number } = { '基本生活費': monthlyExpenses * 12 * M };

    // 収入
    if (age < retirementAge) {
      const currentSalary = (annualIncome * M) * Math.pow(1 + (salaryIncreaseRate / 100), age - currentAge);
      yearlyIncome += currentSalary;
      incomeDetails['給与収入'] = currentSalary;
    } else if (age === retirementAge) {
        yearlyIncome += severancePay * M;
        incomeDetails['退職金'] = severancePay * M;
    }

    // 年金
    if (age >= pensionStartDate) {
        const pension = pensionAmountPerYear * M; // 万円を円に変換
        yearlyIncome += pension;
        incomeDetails['年金収入'] = pension;
    }

    // 住宅
    if (housing.hasLoan && age >= (Number(housing.startAge) || 0)) {
       const housingLoanRemainingTerm = (Number(housing.startAge) || 0) + (Number(housing.loanTerm) || 0) - age;
       if (housingLoanRemainingTerm > 0) {
        const taxPayment = (Number(housing.propertyValue) || 0) * M * ((Number(housing.propertyTaxRate) || 0) / 100);
        yearlyExpenses += annualHousingLoanPayment + taxPayment;
        expenseDetails['住宅ローン返済'] = annualHousingLoanPayment;
        expenseDetails['固定資産税'] = taxPayment;
       }
    }

    // 子供
    if (education.hasChildren && education.children) {
      let totalEducationCost = 0;
      let activeChildrenCount = 0;
      
      education.children.forEach(child => {
        const parentAgeAtBirth = Number(child.birthYear);
        if (parentAgeAtBirth > 0) {
          const childAge = age - parentAgeAtBirth;
          
          if (childAge >= 0 && childAge < 22) {
            activeChildrenCount++;
          }
          
          let educationCost = 0;
          if (childAge >= 18 && childAge <= 21) {
            switch (child.plan) {
              case 'public': educationCost = EDUCATION_COST.university.public; break;
              case 'private_liberal': educationCost = EDUCATION_COST.university.private_liberal; break;
              case 'private_science': educationCost = EDUCATION_COST.university.private_science; break;
              case 'custom': educationCost = Number(child.customAmount) || 0; break;
            }
          } else if (childAge >= 15 && childAge <= 17) {
            educationCost = EDUCATION_COST.high.public; // 仮に公立
          } else if (childAge >= 12 && childAge <= 14) {
            educationCost = EDUCATION_COST.middle.public; // 仮に公立
          } else if (childAge >= 6 && childAge <= 11) {
            educationCost = EDUCATION_COST.elementary.public; // 仮に公立
          }
          totalEducationCost += educationCost * M; // 万円を円に変換
        }
      });
      
      if (totalEducationCost > 0) {
        yearlyExpenses += totalEducationCost;
        expenseDetails['教育費'] = totalEducationCost;
      }
      
      const livingCost = activeChildrenCount * (education.childLivingCost || 0) * M; // 万円を円に変換
      if (livingCost > 0) {
        yearlyExpenses += livingCost;
        expenseDetails['子供の生活費'] = livingCost;
      }
    }

    // 住宅の頭金（購入時のみ）
    if (housing.hasLoan && age === Number(housing.startAge)) {
      const downPayment = Number(housing.downPayment) * M;
      assets -= downPayment;
      expenseDetails['住宅頭金'] = downPayment;
    }

    // 自動車
    if (car.hasCar) {
      const purchaseAge = Number(car.purchaseAge) || 0;
      if (age === purchaseAge) {
        const downPayment = (Number(car.downPayment) || 0) * M;
        yearlyExpenses += downPayment;
        expenseDetails['自動車頭金'] = downPayment;
      }
      if (age >= purchaseAge && carLoanRemainingTerm > 0) {
        yearlyExpenses += annualCarLoanPayment;
        expenseDetails['自動車ローン返済'] = annualCarLoanPayment;
        carLoanRemainingTerm--;
      }
      
      const replacementCycle = Number(car.replacementCycle) || 100;
      if (age > purchaseAge && (age - purchaseAge) % replacementCycle === 0) {
        const downPayment = (Number(car.downPayment) || 0) * M;
        yearlyExpenses += downPayment;
        expenseDetails['自動車頭金（買い替え）'] = downPayment;
        carLoanRemainingTerm = Number(car.loanTerm) || 0;
      }

      yearlyExpenses += (Number(car.maintenanceCost) || 0) * M;
      expenseDetails['自動車維持費'] = (Number(car.maintenanceCost) || 0) * M;
    }

    // 老後費用（月間生活費 + 介護費用）
    if (senior.enabled && age >= Number(senior.startAge)) {
      const monthlySeniorExpense = Number(senior.monthlyExpense) * M;
      const annualSeniorExpense = monthlySeniorExpense * 12;
      const careCost = Number(senior.careCost) * M;
      yearlyExpenses += annualSeniorExpense + careCost;
      expenseDetails['老後月間生活費'] = annualSeniorExpense;
      expenseDetails['老後介護費用'] = careCost;
    }
    
    // ライフイベント
    lifeEvents.forEach(event => {
      const start = Number(event.startAge) || 0;
      const end = Number(event.endAge) || start;
      if (age >= start && age <= end) {
        const amount = (Number(event.amount) || 0) * M;
        if (event.type === 'income') {
          yearlyIncome += amount;
          incomeDetails[event.description] = amount;
        } else {
          yearlyExpenses += amount;
          expenseDetails[event.description] = amount;
        }
      }
    });

    const investmentReturn = assets * (investmentRatio / 100) * (anuualReturn / 100);
    yearlyIncome += investmentReturn;
    incomeDetails['投資リターン'] = investmentReturn;
    const investmentGains = investmentReturn; // for display
    const balance = yearlyIncome - yearlyExpenses;
    assets += balance;
     
     if(assets < 0 && !isBankrupt) {
         summaryEvents.push(`${age}歳: 貯蓄がマイナスになりました。プランの見直しが必要です。`);
         isBankrupt = true;
     }

    assetData.push({
      year: new Date().getFullYear() + (age - currentAge),
      age,
      income: Math.round(yearlyIncome),
      expense: Math.round(yearlyExpenses),
      balance: Math.round(balance),
      savings: Math.round(assets),
      incomeDetails,
      expenseDetails,
    });
  }
  
  const advice = "シミュレーション結果に基づいたアドバイスです...";
  
  return {
    assetData,
    finalSavings: assets,
    lifeExpectancy,
    retirementAge: input.retirementAge,
    currentAge: input.currentAge,
    pensionStartDate: input.pensionStartDate,
    advice: "シミュレーションが完了しました。結果を確認してください。",
    calculationSummary: summaryEvents.join('\n')
  };
}; 
 