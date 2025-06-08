// フロントエンド用に調整したシミュレーションサービス

import { SimulationInputData, SimulationResult, LifeEvent, BackendSimulationResult } from '../types';

// メインの計算ロジック
export const calculateSimulation = (
  input: SimulationInputData, 
  lifeEvents: LifeEvent[]
): BackendSimulationResult => {
  const M = 10000; // 万円単位の変換係数

  const assetData: SimulationResult[] = [];
  let currentSavings = (Number(input.currentSavings) || 0) * M;
  
  // inputから数値を取得（空文字列や未定義は0として扱う）
  const currentAge = Number(input.currentAge) || 0;
  const retirementAge = Number(input.retirementAge) || 0;
  const lifeExpectancy = Number(input.lifeExpectancy) || 100;
  let annualIncome = (Number(input.annualIncome) || 0) * M;
  const salaryIncreaseRate = Number(input.salaryIncreaseRate) || 0;
  const investmentRatio = Number(input.investmentRatio) || 0;
  const annualReturn = Number(input.annualReturn) || 0;
  const severancePay = (Number(input.severancePay) || 0) * M;
  const monthlyExpenses = (Number(input.monthlyExpenses) || 0) * M;
  const pensionAmountPerYear = (Number(input.pensionAmountPerYear) || 0) * M;
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
                const amount = (Number(event.amount) || 0) * M;
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

  // --- アドバイスとサマリーの生成 ---
  const finalSavings = currentSavings;
  const retirementSavings = assetData.find(d => d.age === retirementAge)?.savings ?? 0;
  const peakAsset = Math.max(...assetData.map(d => d.savings));
  const peakAssetAge = assetData.find(d => d.savings === peakAsset)?.age ?? 0;

  // Find key event ages
  const retirementEventAge = retirementAge;
  const pensionEventAge = pensionStartDate;

  let advice = '';
  if (finalSavings <= 0) {
    advice = `想定寿命(${lifeExpectancy}歳)時点で資産が枯渇する可能性が高いです。月々の支出の見直しや、投資計画の変更を検討しましょう。`;
  } else if (retirementSavings < 20000000) {
    advice = `リタイア時の資産が2,000万円を下回る可能性があります。老後の生活設計について、追加の収入源や支出削減を検討することをお勧めします。`;
  } else {
    advice = `計画は順調に進んでいます。資産は${peakAssetAge}歳でピーク(${Math.round(peakAsset/10000)}万円)に達する見込みです。引き続き計画的な資産管理を心がけましょう。`;
  }

  const summaryPoints = [];
  summaryPoints.push(`- ${currentAge}歳からシミュレーションを開始します。`);
  summaryPoints.push(`- ${retirementEventAge}歳で退職し、給与収入がなくなります。これにより、資産の増加ペースが大きく変化します。退職金の${Math.round(severancePay/10000)}万円がこの年の収入に含まれます。`);
  summaryPoints.push(`- ${pensionEventAge}歳から年間${Math.round(pensionAmountPerYear/10000)}万円の年金受給が開始され、資産の減少を緩和します。`);
  if (peakAssetAge > retirementEventAge) {
      summaryPoints.push(`- 資産のピークは${peakAssetAge}歳で、その後は生活費やイベント支出により資産は減少に転じます。`);
  }
  if (finalSavings <= 0) {
      const depletionAge = assetData.find(d => d.savings <= 0)?.age;
      summaryPoints.push(`- 現在の計画では、${depletionAge}歳頃に資産が枯渇する見込みです。`);
  }

  const calculationSummary = summaryPoints.join('\n');

  return {
    assetData,
    finalSavings: currentSavings,
    lifeExpectancy: Number(input.lifeExpectancy),
    retirementAge: Number(input.retirementAge),
    currentAge: Number(input.currentAge),
    pensionStartDate: Number(input.pensionStartDate),
    advice,
    calculationSummary
  };
}; 
 