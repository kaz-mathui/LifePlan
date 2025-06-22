import { SimulationInputData, SimulationResult, BackendSimulationResult } from '../types';

// 教育費（年間、万円）
// 出典：文部科学省「令和3年度子供の学習費調査」、日本政策金融公庫「令和3年度 教育費負担の実態調査結果」など
export const EDUCATION_COST = {
  university: {
    // 国公立大学
    public: 67, // (入学金28 + 授業料54*4年)/4年 = 67
    // 私立大学文系
    private_liberal: 104, // (入学金25 + 授業料93*4年)/4年 = 104
    // 私立大学理系
    private_science: 136, // (入学金26 + 授業料128*4年)/4年 = 136
  },
  high: {
    public: 51,
    private: 105,
  },
  middle: {
    public: 54,
    private: 144,
  },
  elementary: {
    public: 35,
    private: 167,
  }
};

const roundObjectValues = (obj: Record<string, number>): Record<string, number> => {
    const newObj: Record<string, number> = {};
    for (const key in obj) {
        newObj[key] = Math.round(obj[key]);
    }
    return newObj;
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
    let yearlyExpenses = (Number(monthlyExpenses) || 0) * 12 * M; // 万円を円に変換
    const incomeDetails: Record<string, number> = {};
    const expenseDetails: Record<string, number> = { '基本生活費': (Number(monthlyExpenses) || 0) * 12 * M };

    // 収入計算
    if (age < retirementAge) {
      const income = currentAnnualIncome;
      yearlyIncome += income;
      incomeDetails['給与収入'] = income;
      currentAnnualIncome *= (1 + (Number(salaryIncreaseRate) || 0) / 100); // 昇給
    }
    if (age === retirementAge && (Number(severancePay) || 0) > 0) {
      const severancePayAmount = (Number(severancePay) || 0) * M; // 万円を円に変換
      yearlyIncome += severancePayAmount;
      incomeDetails['退職金'] = severancePayAmount;
      summaryEvents.push(`${age}歳: 退職。収入が年金に切り替わります。退職金${(Number(severancePay) || 0).toFixed(0)}万円が加算されます。`);
    }
    if (age >= (Number(pensionStartDate) || 0)) {
      const pension = (Number(pensionAmountPerYear) || 0) * M; // 万円を円に変換
      yearlyIncome += pension;
      incomeDetails['年金収入'] = pension;
      if (age === (Number(pensionStartDate) || 0)) {
        summaryEvents.push(`${age}歳: 年金受給開始。年間${(Number(pensionAmountPerYear) || 0).toFixed(0)}万円の収入が始まります。`);
      }
    }

    // 支出計算
    // 住宅
    if (housing.hasLoan && age >= (Number(housing.startAge) || 0)) {
       const remainingTerm = (Number(housing.startAge) || 0) + (Number(housing.loanTerm) || 0) - age;
       if (remainingTerm > 0) {
        const taxPayment = (Number(housing.propertyValue) || 0) * M * ((Number(housing.propertyTaxRate) || 0) / 100);
        yearlyExpenses += annualHousingLoanPayment + taxPayment;
        expenseDetails['住宅ローン返済'] = annualHousingLoanPayment;
        expenseDetails['固定資産税'] = taxPayment;

        if (age === (Number(housing.startAge) || 0)) {
            summaryEvents.push(`${age}歳: 住宅ローン返済開始。年間約${((annualHousingLoanPayment + taxPayment)/M).toFixed(0)}万円の支出が${housing.loanTerm}年間発生します。`);
        }
       } else if (age === (Number(housing.startAge) || 0) + (Number(housing.loanTerm) || 0)) {
           summaryEvents.push(`${age}歳: 住宅ローン完済。年間の支出が減少します。`);
       }
    }

    // 住宅の頭金（購入時のみ）
    if (housing.hasLoan && age === (Number(housing.startAge) || 0)) {
      const downPayment = Number(housing.downPayment) * M;
      currentYearSavings -= downPayment;
      yearlyExpenses += downPayment; // 年間支出に含める
      expenseDetails['住宅頭金'] = downPayment;
      summaryEvents.push(`${age}歳: 住宅購入。頭金${(Number(housing.downPayment) || 0).toFixed(0)}万円が資産から差し引かれます。`);
    }

    // 教育費
    if (education.hasChildren && education.children.length > 0) {
      let totalEducationCost = 0;
      let activeChildrenCount = 0;
      
      education.children.forEach(child => {
        const childBirthYear = Number(child.birthYear);
        if (isNaN(childBirthYear)) return; 
        
        const childAge = age - childBirthYear;
        
        if (childAge >= 0 && childAge < 22) { // 22歳で独立と仮定
          activeChildrenCount++;
        }
        
        // 教育費計算
        if (childAge >= 0 && childAge <= 22) {
          let educationCost = 0; // 年間教育費（万円）
          let eventDescription = '';
          
          if (child.plan === 'custom' && child.customAmount) {
            educationCost = Number(child.customAmount);
            if (isNaN(educationCost)) educationCost = 0;

            if (childAge === 0) eventDescription = `カスタム教育費（年間${educationCost}万円）が開始`;
          } else {
            if (childAge >= 18 && childAge <= 21) {
              switch (child.plan) {
                case 'public': educationCost = EDUCATION_COST.university.public; break;
                case 'private_liberal': educationCost = EDUCATION_COST.university.private_liberal; break;
                case 'private_science': educationCost = EDUCATION_COST.university.private_science; break;
              }
              if (childAge === 18) eventDescription = `大学費用（${child.plan}）が発生`;
            } else if (childAge >= 15 && childAge <= 17) {
              educationCost = EDUCATION_COST.high.public;
              if (childAge === 15) eventDescription = `高校費用が発生`;
            } else if (childAge >= 12 && childAge <= 14) {
              educationCost = EDUCATION_COST.middle.public;
              if (childAge === 12) eventDescription = `中学校費用が発生`;
            } else if (childAge >= 6 && childAge <= 11) {
              educationCost = EDUCATION_COST.elementary.public;
              if (childAge === 6) eventDescription = `小学校費用が発生`;
            } else if (childAge >= 3 && childAge <= 5) {
              educationCost = 30; // 幼稚園など
              if (childAge === 3) eventDescription = `幼稚園費用が発生`;
            }
          }
          
          if (educationCost > 0) {
            totalEducationCost += educationCost * M;
          }

          if (eventDescription) {
            summaryEvents.push(`${age}歳: 子供${education.children.indexOf(child) + 1}の${eventDescription}。`);
          }
        }
      });
      
      if (totalEducationCost > 0) {
        yearlyExpenses += totalEducationCost;
        expenseDetails['教育費'] = totalEducationCost;
        summaryEvents.push(`${age}歳: 教育費として年間${(totalEducationCost / M).toFixed(0)}万円の支出が発生します。`);
      }
      
      // 子供の生活費（0歳〜22歳）
      const livingCost = activeChildrenCount * education.childLivingCost * M;
      if (livingCost > 0) {
        yearlyExpenses += livingCost;
        expenseDetails['子供の生活費'] = livingCost;
        summaryEvents.push(`${age}歳: 子供${activeChildrenCount}人の生活費として年間${(livingCost / M).toFixed(0)}万円の支出が発生します。`);
      }
    }

    // 自動車
    if (car.hasCar) {
      if (age >= (Number(car.purchaseAge) || 0)) {
        const maintenanceCost = (Number(car.maintenanceCost) || 0) * M; // 万円を円に変換
        yearlyExpenses += maintenanceCost;
        expenseDetails['自動車維持費'] = maintenanceCost;
      }
      if (age === (Number(car.purchaseAge) || 0)) {
        const downPayment = (Number(car.downPayment) || 0) * M; // 万円を円に変換
        currentYearSavings -= downPayment;
        yearlyExpenses += downPayment; // 年間支出に含める
        expenseDetails['自動車頭金'] = downPayment;
        summaryEvents.push(`${age}歳: 自動車購入。車両価格${(Number(car.price) || 0).toFixed(0)}万円（頭金${(Number(car.downPayment) || 0).toFixed(0)}万円）と、ローン・維持費の支出が始まります。`);
      }
      if (age >= (Number(car.purchaseAge) || 0) && carLoanRemainingTerm > 0) {
        yearlyExpenses += annualCarLoanPayment;
        expenseDetails['自動車ローン返済'] = annualCarLoanPayment;
        carLoanRemainingTerm--;
      }
      if (age > (Number(car.purchaseAge) || 0) && (age - (Number(car.purchaseAge) || 0)) % (Number(car.replacementCycle) || 1) === 0) {
        const downPayment = (Number(car.downPayment) || 0) * M; // 万円を円に変換
        currentYearSavings -= downPayment;
        yearlyExpenses += downPayment; // 年間支出に含める
        expenseDetails['自動車頭金（買い替え）'] = downPayment;
        const replacementCost = ((Number(car.price) || 0) - (Number(car.downPayment) || 0)) * M; // 万円を円に変換
        yearlyExpenses += replacementCost;
        expenseDetails['自動車買い替え'] = replacementCost;
        carLoanRemainingTerm = Number(car.loanTerm) || 0;
        summaryEvents.push(`${age}歳: 自動車の買い替え。再び車両価格${(Number(car.price) || 0).toFixed(0)}万円（頭金${(Number(car.downPayment) || 0).toFixed(0)}万円）の支出が発生します。`);
      }
    }
    
    // 老後費用（月間生活費 + 介護費用）
    if (senior.enabled && age >= (Number(senior.startAge) || 0)) {
        const monthlySeniorExpense = (Number(senior.monthlyExpense) || 0) * M; // 万円を円に変換
        const annualSeniorExpense = monthlySeniorExpense * 12;
        const careCost = (Number(senior.careCost) || 0) * M; // 万円を円に変換
        yearlyExpenses += annualSeniorExpense + careCost;
        if(annualSeniorExpense > 0) expenseDetails['老後月間生活費'] = annualSeniorExpense;
        if(careCost > 0) expenseDetails['老後介護費用'] = careCost;
        if (age === (Number(senior.startAge) || 0)) {
            summaryEvents.push(`${age}歳: 老後費用発生開始。月間生活費${(Number(senior.monthlyExpense) || 0).toFixed(0)}万円、介護費用${(Number(senior.careCost) || 0).toFixed(0)}万円の支出を見込みます。`);
        }
    }

    // ライフイベント
    lifeEvents.forEach(event => {
      if (age >= event.startAge && (!event.endAge || age <= event.endAge)) {
        const eventAmount = (Number(event.amount) || 0) * M; // 万円を円に変換
        if (event.type === 'income') {
            yearlyIncome += eventAmount;
            incomeDetails[event.description] = (incomeDetails[event.description] || 0) + eventAmount;
        } else {
            yearlyExpenses += eventAmount;
            expenseDetails[event.description] = (expenseDetails[event.description] || 0) + eventAmount;
        }
      }
    });

    // 資産運用と年間収支
    const investmentReturn = currentYearSavings * ((Number(investmentRatio) || 0) / 100) * ((Number(annualReturn) || 0) / 100);
    if(investmentReturn !== 0) incomeDetails['資産運用益'] = investmentReturn;
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
      incomeDetails: roundObjectValues(incomeDetails),
      expenseDetails: roundObjectValues(expenseDetails),
    });
  }

  const finalSavings = assetData.length > 0 ? assetData[assetData.length - 1].savings : 0;
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


