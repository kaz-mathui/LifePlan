// フロントエンド用に調整したシミュレーションサービス

import { SimulationInputData, SimulationResult, LifeEvent, BackendSimulationResult } from '../types';
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
    
    // 1. 住宅関連費
    if (input.housing.hasLoan) {
      const loanStartAge = Number(input.housing.startAge) || 0;
      const loanTerm = Number(input.housing.loanTerm) || 0;
      const propertyOwnershipStartAge = loanStartAge; 
      const propertyOwnershipEndAge = lifeExpectancy; // 簡略化のため、生涯所有と仮定

      // 住宅ローン返済
      if (age >= loanStartAge && age < loanStartAge + loanTerm) {
        const annualPayment = calculateAnnualLoanPayment(
            (Number(input.housing.loanAmount) || 0) * M,
            Number(input.housing.interestRate) || 0,
            loanTerm
        );
        expense += annualPayment;
        expenseDetails['住宅ローン返済'] = annualPayment;
      }
      
      // 固定資産税: 物件を所有している期間中ずっと発生
      if (age >= propertyOwnershipStartAge && age <= propertyOwnershipEndAge) {
        const propertyTax = (Number(input.housing.propertyValue) || 0) * M * ((Number(input.housing.propertyTaxRate) || 0) / 100);
        expense += propertyTax;
        expenseDetails['固定資産税'] = propertyTax;
      }
    }

    // 2. 教育費
    if (input.education.hasChildren) {
      const parentBirthYear = new Date().getFullYear() - currentAge; // 親の生まれ年を計算

      let totalEducationCost = 0;
      input.education.children.forEach((child, index) => {
        const childBirthYear = Number(child.birthYear) || parentBirthYear;
        const childAge = age - (childBirthYear - parentBirthYear); // 親の年齢を基準に子供の年齢を計算

        if (childAge < 0) return; // まだ生まれていない場合はスキップ

        let cost = 0;
        if (childAge >= 6 && childAge < 12) { // 小学生
          cost = (child.plan === 'public' ? EDUCATION_COST.elementary.public : EDUCATION_COST.elementary.private) * M;
        } else if (childAge >= 12 && childAge < 15) { // 中学生
          cost = (child.plan === 'public' ? EDUCATION_COST.middle.public : EDUCATION_COST.middle.private) * M;
        } else if (childAge >= 15 && childAge < 18) { // 高校生
          cost = (child.plan === 'public' ? EDUCATION_COST.high.public : EDUCATION_COST.high.private) * M;
        } else if (childAge >= 18 && childAge < 22) { // 大学生
            switch(child.plan) {
                case 'public': cost = EDUCATION_COST.university.public * M; break;
                case 'private_liberal': cost = EDUCATION_COST.university.private_liberal * M; break;
                case 'private_science': cost = EDUCATION_COST.university.private_science * M; break;
            }
        }
        if (cost > 0) {
            totalEducationCost += cost;
            expenseDetails[`教育費(子供${index+1})`] = (expenseDetails[`教育費(子供${index+1})`] || 0) + cost;
        }
      });
      expense += totalEducationCost;
    }
    
    // 3. 自動車関連費
    if (input.car.hasCar) {
      const purchaseAge = Number(input.car.purchaseAge) || 0;
      const loanTerm = Number(input.car.loanTerm) || 0;
      const replacementCycle = Number(input.car.replacementCycle) || (lifeExpectancy - purchaseAge + 1); // デフォルトは寿命まで乗り続ける
      
      // 現在の年が、車の所有期間内かどうかを判定
      const relativeAge = age - purchaseAge;
      if (relativeAge >= 0) {
        const currentCycleIndex = Math.floor(relativeAge / replacementCycle);
        const purchaseAgeInCurrentCycle = purchaseAge + currentCycleIndex * replacementCycle;

        // 購入/買い替えイベント
        if (age === purchaseAgeInCurrentCycle) {
          const carCost = (Number(input.car.price) || 0) * M;
          const downPayment = (Number(input.car.downPayment) || 0) * M;
          const oneTimeExpense = carCost - downPayment;
          if(oneTimeExpense > 0) {
            expense += oneTimeExpense;
            expenseDetails[`自動車購入費（${age}歳）`] = oneTimeExpense;
          }
        }
        
        // ローン返済
        if (age >= purchaseAgeInCurrentCycle && age < purchaseAgeInCurrentCycle + loanTerm) {
          const annualPayment = calculateAnnualLoanPayment(
              (Number(input.car.loanAmount) || 0) * M,
              Number(input.car.interestRate) || 0,
              loanTerm
          );
          if(annualPayment > 0) {
            expense += annualPayment;
            expenseDetails['自動車ローン返済'] = (expenseDetails['自動車ローン返済'] || 0) + annualPayment;
          }
        }
        
        // 維持費: 車を所有している期間中ずっと発生
        const maintenanceCost = (Number(input.car.maintenanceCost) || 0) * M;
        if (maintenanceCost > 0) {
          expense += maintenanceCost;
          expenseDetails['自動車維持費'] = maintenanceCost;
        }
      }
    }

    // 4. 老後費用
    const nursingStartAge = Number(input.senior.nursingCareStartAge) || 0;
    if (age >= nursingStartAge) {
      const nursingCost = (Number(input.senior.nursingCareAnnualCost) || 0) * M;
      expense += nursingCost;
      expenseDetails['介護費用'] = nursingCost;
    }
    if (age === lifeExpectancy) {
      const funeralCost = (Number(input.senior.funeralCost) || 0) * M;
      expense += funeralCost;
      expenseDetails['葬儀費用'] = funeralCost;
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
 