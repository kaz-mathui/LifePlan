export interface SimulationInput {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  currentSavings: number;
  annualIncome: number;
  monthlyExpenses: number;
  investmentRatio: number; // (0-100)
  annualReturn: number;    // (%)
  pensionAmountPerYear: number;
  pensionStartDate: number;
  severancePay: number;
}

export interface SimulationResult {
  yearsToRetirement: number;
  projectedRetirementSavings: number;
  annualSavingsCurrentPace: number;
  targetRetirementFund?: number;
  message: string;
  suggestion?: string;
  assetData: { age: number; savings: number }[];
}

/**
 * ライフプランシミュレーション計算を行う
 * @param {SimulationInput} data - 入力データ
 * @returns {SimulationResult} シミュレーション結果
 */
export function calculateSimulation(data: SimulationInput): SimulationResult {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    currentSavings,
    annualIncome,
    monthlyExpenses,
    investmentRatio,
    annualReturn,
    pensionAmountPerYear,
    pensionStartDate,
    severancePay
  } = data;

  if (currentAge < 0 || retirementAge < 0 || lifeExpectancy < 0 || currentSavings < 0 || annualIncome < 0 || monthlyExpenses < 0 || pensionAmountPerYear < 0 || severancePay < 0 || pensionStartDate < 0) {
    throw new Error("年齢、貯蓄額、収入、支出、年金額、退職金、年金受給開始年齢は0以上である必要があります。");
  }
  if (currentAge >= retirementAge) {
    throw new Error("リタイア目標年齢は現在の年齢より大きく設定してください。");
  }
  if (retirementAge > pensionStartDate) {
    throw new Error("年金受給開始年齢はリタイア目標年齢以降に設定してください。");
  }
  if (pensionStartDate >= lifeExpectancy) {
    throw new Error("寿命は年金受給開始年齢より大きく設定してください。");
  }
  if (investmentRatio < 0 || investmentRatio > 100) {
    throw new Error("金融資産の割合は0から100の間で設定してください。");
  }
  if (annualReturn < 0) {
    throw new Error("年間運用利回りは0以上で設定してください。");
  }

  let currentSavingsTotal = currentSavings;
  const assetData: { age: number; savings: number }[] = [];
  assetData.push({ age: currentAge, savings: Math.round(currentSavingsTotal) });

  let projectedRetirementSavings = currentSavings;

  for (let i = 0; i < (lifeExpectancy - currentAge); i++) {
    const age = currentAge + i + 1;
    let yearEndSavings = currentSavingsTotal;
    let currentYearIncome: number;

    if (age <= retirementAge) {
        currentYearIncome = annualIncome;
        if (age === retirementAge) {
            console.log(`Retirement year (${age}): Income before severance pay: ${currentYearIncome}, Severance pay: ${severancePay}`);
            currentYearIncome += severancePay;
            console.log(`Retirement year (${age}): Income after severance pay: ${currentYearIncome}`);
        }
    } else {
        if (age >= pensionStartDate) {
            currentYearIncome = pensionAmountPerYear;
        } else {
            currentYearIncome = 0;
        }
    }

    const annualNetOperatingIncome = currentYearIncome - (monthlyExpenses * 12);

    yearEndSavings += annualNetOperatingIncome;

    const investableAmount = yearEndSavings;
    const investmentPortion = investableAmount * (investmentRatio / 100);
    const earnings = investmentPortion * (annualReturn / 100);
    yearEndSavings += earnings;
    
    currentSavingsTotal = yearEndSavings;
    assetData.push({ age: age, savings: Math.round(currentSavingsTotal) });

    if (age === retirementAge) {
        projectedRetirementSavings = Math.round(currentSavingsTotal);
    }
  }

  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  
  const annualSavingsCurrentPaceBeforeInvestment = annualIncome - (monthlyExpenses * 12);
  const estimatedPostRetirementAnnualExpenses = monthlyExpenses * 12;
  const targetRetirementFund = estimatedPostRetirementAnnualExpenses * (lifeExpectancy - retirementAge);

  let message = `現在の年齢から ${lifeExpectancy}歳までの資産推移を計算しました。\nリタイア目標年齢 (${retirementAge}歳) 時点の予測貯蓄額は 約 ${projectedRetirementSavings.toLocaleString()} 円です。`;
  let suggestion;

  const finalSavings = assetData[assetData.length -1].savings;
  if (finalSavings < 0) {
    message += `\nしかし、${lifeExpectancy}歳時点で資産がマイナス (${finalSavings.toLocaleString()}円) になる予測です。`;
    suggestion = "生活費の見直し、収入源の確保、運用計画の変更などを検討する必要があります。";
  } else {
    message += `\n${lifeExpectancy}歳時点での最終予測貯蓄額は 約 ${finalSavings.toLocaleString()} 円です。`;
  }

  if (projectedRetirementSavings < targetRetirementFund && finalSavings >=0) {
    message += `\n${retirementAge}歳から${lifeExpectancy}歳までの必要生活費総額 (目安: ${targetRetirementFund.toLocaleString()}円) に対して、リタイア時の貯蓄では不足する可能性があります。`;
    suggestion = (suggestion ? suggestion + "\n" : "") + "リタイア後の生活費や収入について、より詳細な計画が必要です。";
  } else if (finalSavings >=0) {
    // message += `\n目標とする老後資金額を達成できる見込みです。素晴らしいですね！`;
  }

  if (annualIncome - (monthlyExpenses * 12) < 0 && currentAge < retirementAge) {
    suggestion = (suggestion ? suggestion + "\n" : "") + "現役時代の収支が赤字のようです。収入を増やすか支出を見直すことをお勧めします。";
  }

  return {
    yearsToRetirement,
    projectedRetirementSavings,
    annualSavingsCurrentPace: annualSavingsCurrentPaceBeforeInvestment,
    targetRetirementFund,
    message,
    suggestion,
    assetData,
  };
} 
