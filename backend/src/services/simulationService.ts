import { SimulationInputData, SimulationResult, BackendSimulationResult } from '../types';

// 教育費の標準データ (万円/年) - 出典: 文部科学省「子供の学習費調査」等を参考に簡略化
const EDUCATION_COSTS = {
  public: {
    elementary: 40,   // 小学校
    middle: 50,     // 中学校
    high: 50,       // 高校
    university: 100,  // 国公立大学
  },
  private_liberal: { // 大学私立文系
    elementary: 160,
    middle: 140,
    high: 100,
    university: 150,
  },
  private_science: { // 大学私立理系
    elementary: 160,
    middle: 140,
    high: 100,
    university: 180,
  },
};

const getEducationCost = (age: number, plan: keyof typeof EDUCATION_COSTS): number => {
  if (age >= 7 && age <= 12) return EDUCATION_COSTS[plan].elementary * 10000;
  if (age >= 13 && age <= 15) return EDUCATION_COSTS[plan].middle * 10000;
  if (age >= 16 && age <= 18) return EDUCATION_COSTS[plan].high * 10000;
  if (age >= 19 && age <= 22) return EDUCATION_COSTS[plan].university * 10000;
  return 0;
};

// 元利均等返済の年間返済額を計算するヘルパー関数
const calculateAnnualLoanPayment = (loanAmount: number, interestRate: number, loanTerm: number): number => {
  if (loanAmount <= 0 || interestRate < 0 || loanTerm <= 0) return 0;
  
  const monthlyRate = interestRate / 100 / 12;
  const numberOfPayments = loanTerm * 12;

  if (monthlyRate === 0) {
    return loanAmount / loanTerm;
  }

  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  return monthlyPayment * 12;
};

export function calculateSimulation(input: SimulationInputData): BackendSimulationResult {
  const {
    currentAge, retirementAge, lifeExpectancy, currentSavings, annualIncome,
    monthlyExpenses, investmentRatio, annualReturn, pensionAmountPerYear,
    pensionStartDate, severancePay, lifeEvents, housing, education, car, senior,
    salaryIncreaseRate
  } = input;

  const assetData: SimulationResult[] = [];
  let currentYearSavings = Number(currentSavings) * 10000;
  let currentAnnualIncome = Number(annualIncome) * 10000;
  let housingLoanRemainingTerm = housing.hasLoan ? housing.loanTerm : 0;
  let carLoanRemainingTerm = car.hasCar ? car.loanTerm : 0;
  let isBankrupt = false; // 破産状態を追跡するフラグ

  const M = 10000; // 万円を円に変換

  const housingLoanAmount = Math.max(0, (Number(housing.propertyValue) || 0) - (Number(housing.downPayment) || 0)) * M;
  const annualHousingLoanPayment = housing.hasLoan ? calculateAnnualLoanPayment(housingLoanAmount, Number(housing.interestRate) || 0, Number(housing.loanTerm) || 0) : 0;

  const carLoanAmount = Math.max(0, (Number(car.price) || 0) - (Number(car.downPayment) || 0)) * M;
  const annualCarLoanPayment = car.hasCar ? calculateAnnualLoanPayment(carLoanAmount, car.interestRate, car.loanTerm) : 0;

  const summaryEvents: string[] = [];

  for (let age = currentAge; age <= lifeExpectancy; age++) {
    let yearlyIncome = 0;
    let yearlyExpenses = monthlyExpenses * 12;
    const incomeDetails: Record<string, number> = {};
    const expenseDetails: Record<string, number> = { '基本生活費': monthlyExpenses * 12 };

    // 収入計算
    if (age < retirementAge) {
      const income = currentAnnualIncome;
      yearlyIncome += income;
      incomeDetails['給与収入'] = income;
      currentAnnualIncome *= (1 + salaryIncreaseRate / 100); // 昇給
    }
    if (age === retirementAge && severancePay > 0) {
      yearlyIncome += severancePay;
      incomeDetails['退職金'] = severancePay;
      summaryEvents.push(`${age}歳: 退職。収入が年金に切り替わります。退職金${(severancePay/10000).toFixed(0)}万円が加算されます。`);
    }
    if (age >= pensionStartDate) {
      const pension = pensionAmountPerYear;
      yearlyIncome += pension;
      incomeDetails['年金収入'] = pension;
      if (age === pensionStartDate) {
        summaryEvents.push(`${age}歳: 年金受給開始。年間${(pensionAmountPerYear/10000).toFixed(0)}万円の収入が始まります。`);
      }
    }

    // 支出計算
    // 住宅
    if (housing.hasLoan && age >= (Number(housing.startAge) || 0)) {
       const housingLoanRemainingTerm = (Number(housing.startAge) || 0) + (Number(housing.loanTerm) || 0) - age;
       if (housingLoanRemainingTerm > 0) {
        const taxPayment = (Number(housing.propertyValue) || 0) * M * ((Number(housing.propertyTaxRate) || 0) / 100);
        yearlyExpenses += annualHousingLoanPayment + taxPayment;
        expenseDetails['住宅ローン返済'] = annualHousingLoanPayment;
        expenseDetails['固定資産税'] = taxPayment;
        housingLoanRemainingTerm--;

        if (age === (Number(housing.startAge) || 0)) {
            summaryEvents.push(`${age}歳: 住宅ローン返済開始。年間約${((annualHousingLoanPayment + taxPayment)/10000).toFixed(0)}万円の支出が${housing.loanTerm}年間発生します。`);
        }
       } else if (age === (Number(housing.startAge) || 0) + (Number(housing.loanTerm) || 0)) {
           summaryEvents.push(`${age}歳: 住宅ローン完済。年間の支出が減少します。`);
       }
    }

    // 教育費
    if (education.hasChildren) {
      let totalEducationCost = 0;
      let activeChildren = 0;
      education.children.forEach((child) => {
        const childAge = age - (new Date().getFullYear() - child.birthYear);
        if (childAge >= 0) activeChildren++;
        const costPlan = child.plan === 'custom' ? 'public' : child.plan;
        const educationCost = getEducationCost(childAge, costPlan);
        if (educationCost > 0) {
            totalEducationCost += educationCost;
            if (childAge === 7 || childAge === 13 || childAge === 16 || childAge === 19) {
                summaryEvents.push(`${age}歳 (子供${childAge}歳): 進学により教育費が年間約${(educationCost/10000).toFixed(0)}万円発生します。`);
            }
        }
      });
      if (totalEducationCost > 0) {
        yearlyExpenses += totalEducationCost;
        expenseDetails['教育費'] = totalEducationCost;
      }
      if (activeChildren > 0 && (education.childLivingCost || 0) > 0) {
        const totalLivingCost = activeChildren * (education.childLivingCost || 0);
        yearlyExpenses += totalLivingCost;
        expenseDetails['子供の生活費'] = totalLivingCost;
      }
    }

    // 自動車
    if (car.hasCar) {
      if (age >= car.purchaseAge) {
        yearlyExpenses += (car.maintenanceCost || 0);
        expenseDetails['自動車維持費'] = (car.maintenanceCost || 0);
      }
      if (age === car.purchaseAge) {
        currentYearSavings -= (car.downPayment || 0);
        expenseDetails['自動車頭金'] = (car.downPayment || 0);
        summaryEvents.push(`${age}歳: 自動車購入。車両価格${((car.price || 0)/10000).toFixed(0)}万円（頭金${((car.downPayment || 0)/10000).toFixed(0)}万円）と、ローン・維持費の支出が始まります。`);
      }
      if (age >= car.purchaseAge && carLoanRemainingTerm > 0) {
        yearlyExpenses += annualCarLoanPayment;
        expenseDetails['自動車ローン返済'] = annualCarLoanPayment;
        carLoanRemainingTerm--;
      }
      if (age > car.purchaseAge && (age - car.purchaseAge) % car.replacementCycle === 0) {
        currentYearSavings -= (car.downPayment || 0);
        expenseDetails['自動車頭金（買い替え）'] = (car.downPayment || 0);
        const replacementCost = (car.price || 0) - (car.downPayment || 0);
        yearlyExpenses += replacementCost;
        expenseDetails['自動車買い替え'] = replacementCost;
        carLoanRemainingTerm = car.loanTerm;
        summaryEvents.push(`${age}歳: 自動車の買い替え。再び車両価格${((car.price || 0)/10000).toFixed(0)}万円（頭金${((car.downPayment || 0)/10000).toFixed(0)}万円）の支出が発生します。`);
      }
    }
    
    // 老後費用
    if (age >= senior.nursingCareStartAge) {
        const nursingCost = senior.nursingCareAnnualCost;
        yearlyExpenses += nursingCost;
        expenseDetails['介護費用'] = nursingCost;
        if (age === senior.nursingCareStartAge) {
            summaryEvents.push(`${age}歳: 介護費用発生開始。年間${(nursingCost/10000).toFixed(0)}万円の支出を見込みます。`);
        }
    }
    if (age === lifeExpectancy) {
        const funeralCost = senior.funeralCost;
        yearlyExpenses += funeralCost;
        expenseDetails['葬儀費用'] = funeralCost;
        summaryEvents.push(`${age}歳: 葬儀費用として${(funeralCost/10000).toFixed(0)}万円の支出を見込みます。`);
    }

    // ライフイベント
    lifeEvents.forEach(event => {
      if (age >= event.startAge && (!event.endAge || age <= event.endAge)) {
        if (event.type === 'income') {
            yearlyIncome += event.amount;
            incomeDetails[event.eventName] = (incomeDetails[event.eventName] || 0) + event.amount;
        } else {
            yearlyExpenses += event.amount;
            expenseDetails[event.eventName] = (expenseDetails[event.eventName] || 0) + event.amount;
        }
      }
    });

    // 資産運用と年間収支
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

  const finalSavings = Math.round(currentYearSavings);
  let advice = '';
  if (finalSavings <= 0) {
      advice = '最終的な貯蓄額が0円以下になる見込みです。収入を増やすか、支出を削減するなどのプラン見直しを強く推奨します。';
  } else if (finalSavings < 5000000) {
      advice = '老後の資金に余裕があるとは言えない状況です。可能であれば、積立投資を増やす、支出を見直すなどの対策を検討しましょう。';
  } else {
      advice = '現在のプランでは、老後も安定した資産を維持できる可能性が高いです。今後も定期的にプランを見直しましょう。';
  }

  return {
    assetData,
    finalSavings: finalSavings,
    lifeExpectancy,
    retirementAge,
    currentAge,
    pensionStartDate,
    advice,
    calculationSummary: summaryEvents.join('\n'),
  };
} 
