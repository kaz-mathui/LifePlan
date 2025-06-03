import { calculateSimulation, SimulationInput, LifeEvent, AssetDataPoint } from '../simulationService';

describe('calculateSimulation', () => {
  // 基本的な入力データ（テストケースごとに変更・拡張する）
  const baseInput: SimulationInput = {
    currentAge: 30,
    retirementAge: 65,
    lifeExpectancy: 95,
    currentSavings: 1000000, // 100万円
    annualIncome: 5000000,   // 500万円
    monthlyExpenses: 200000, // 20万円 (年間240万円)
    investmentRatio: 50,     // 50%
    annualReturn: 3,         // 3%
    pensionAmountPerYear: 1500000, // 150万円
    pensionStartDate: 65,
    severancePay: 10000000, // 1000万円
    lifeEvents: [],
  };

  test('有効な入力に対してエラーなく結果を返すこと', () => {
    const result = calculateSimulation(baseInput);
    expect(result).toBeDefined();
    expect(result.message).not.toContain('入力エラー');
    expect(result.message).not.toContain('不正です');
    expect(result.assetData.length).toBe(baseInput.lifeExpectancy - baseInput.currentAge + 1);
  });

  test('現在の年齢が退職年齢以上の場合にエラーメッセージを返すこと', () => {
    const invalidInput = { ...baseInput, currentAge: 70, retirementAge: 65 };
    const result = calculateSimulation(invalidInput);
    expect(result.message).toContain('退職年齢は現在の年齢より大きく設定してください');
    expect(result.assetData.length).toBe(0); // エラー時は assetData が空のはず
  });

  test('イベントなしの場合、初年度末の資産が正しく計算されること', () => {
    const input = { ...baseInput, lifeEvents: [] }; // ライフイベントなしを明示
    const result = calculateSimulation(input);
    const firstYearData = result.assetData.find(d => d.age === input.currentAge);

    const expectedFirstYearSavings = Math.round(1000000 + (1000000 * 0.50 * 0.03) + (5000000 - 200000 * 12));
    
    expect(firstYearData).toBeDefined();
    expect(firstYearData?.savings).toBe(expectedFirstYearSavings);
    expect(firstYearData?.income).toBe(input.annualIncome);
    expect(firstYearData?.expenses).toBe(input.monthlyExpenses * 12);
  });

  test('一時的な支出イベントを正しく考慮すること', () => {
    const expenseEvent: LifeEvent = {
      id: 'e1',
      age: 35,
      description: '大きな買い物',
      type: 'expense',
      amount: 500000, // 50万円の支出
      frequency: 'one-time'
    };
    const input = { ...baseInput, lifeEvents: [expenseEvent] };
    const result = calculateSimulation(input);
    const eventYearData = result.assetData.find(d => d.age === expenseEvent.age);
    const previousYearData = result.assetData.find(d => d.age === expenseEvent.age - 1);

    expect(eventYearData).toBeDefined();
    expect(previousYearData).toBeDefined();
    
    expect(eventYearData?.income).toBe(input.annualIncome);
    expect(eventYearData?.expenses).toBe((input.monthlyExpenses * 12) + expenseEvent.amount);

    if (previousYearData && eventYearData) {
        const previousSavings = previousYearData.savings;
        const incomeEventYear = input.annualIncome;
        const expensesEventYear = (input.monthlyExpenses * 12) + expenseEvent.amount;
        const netIncomeEventYear = incomeEventYear - expensesEventYear;
        let investmentGainsEventYear = 0;
        if (previousSavings > 0) {
            investmentGainsEventYear = previousSavings * (input.investmentRatio / 100) * (input.annualReturn / 100);
        }
        const expectedSavingsEventYear = Math.round(previousSavings + investmentGainsEventYear + netIncomeEventYear);
        expect(eventYearData.savings).toBe(expectedSavingsEventYear);
    }
  });

  test('年次の収入イベントを正しく処理すること', () => {
    const incomeEvent: LifeEvent = {
      id: 'annual_income_e',
      age: 40,
      description: '年間ボーナス',
      type: 'income',
      amount: 200000, 
      frequency: 'annual',
      endAge: 45, 
    };
    const input = { ...baseInput, currentAge: 38, retirementAge: 60, lifeExpectancy: 65, lifeEvents: [incomeEvent] };
    const result = calculateSimulation(input);

    const beforeEventData = result.assetData.find(d => d.age === incomeEvent.age - 1);
    const duringEventData1 = result.assetData.find(d => d.age === incomeEvent.age);
    const duringEventData2 = result.assetData.find(d => d.age === incomeEvent.age + 2);
    const lastYearEventData = result.assetData.find(d => d.age === incomeEvent.endAge);
    const afterEventData = result.assetData.find(d => d.age === (incomeEvent.endAge || 0) + 1);

    expect(beforeEventData?.income).toBe(input.annualIncome);
    expect(duringEventData1?.income).toBe(input.annualIncome + incomeEvent.amount);
    expect(duringEventData2?.income).toBe(input.annualIncome + incomeEvent.amount);
    expect(lastYearEventData?.income).toBe(input.annualIncome + incomeEvent.amount);
    expect(afterEventData?.income).toBe(input.annualIncome); 
  });

  test('年次の支出イベントを正しく処理すること', () => {
    const expenseEvent: LifeEvent = {
      id: 'annual_expense_e',
      age: 50,
      description: '年間の教育費',
      type: 'expense',
      amount: 300000, 
      frequency: 'annual',
      endAge: 55, 
    };
    const input = { ...baseInput, currentAge: 48, retirementAge: 60, lifeExpectancy: 65, lifeEvents: [expenseEvent] };
    const result = calculateSimulation(input);

    const baseAnnualExpenses = input.monthlyExpenses * 12;
    const beforeEventData = result.assetData.find(d => d.age === expenseEvent.age - 1);
    const duringEventData1 = result.assetData.find(d => d.age === expenseEvent.age);
    const duringEventData2 = result.assetData.find(d => d.age === expenseEvent.age + 2);
    const lastYearEventData = result.assetData.find(d => d.age === expenseEvent.endAge);
    const afterEventData = result.assetData.find(d => d.age === (expenseEvent.endAge || 0) + 1);

    expect(beforeEventData?.expenses).toBe(baseAnnualExpenses);
    expect(duringEventData1?.expenses).toBe(baseAnnualExpenses + expenseEvent.amount);
    expect(duringEventData2?.expenses).toBe(baseAnnualExpenses + expenseEvent.amount);
    expect(lastYearEventData?.expenses).toBe(baseAnnualExpenses + expenseEvent.amount);
    expect(afterEventData?.expenses).toBe(baseAnnualExpenses); 
  });

  test('退職金を正しく考慮すること', () => {
    const retirementAge = 60;
    const severancePay = 5000000; 
    const input = { ...baseInput, currentAge: 55, retirementAge, severancePay, lifeExpectancy: 70, lifeEvents: [] };
    const result = calculateSimulation(input);

    const retirementYearData = result.assetData.find(d => d.age === retirementAge);
    const previousYearData = result.assetData.find(d => d.age === retirementAge - 1);

    expect(retirementYearData).toBeDefined();
    expect(previousYearData).toBeDefined();

    const expectedIncomeRetirementYear = (input.pensionStartDate === retirementAge ? input.pensionAmountPerYear : 0) + severancePay;
    expect(retirementYearData?.income).toBe(expectedIncomeRetirementYear);

    if (previousYearData && retirementYearData) {
      const previousSavings = previousYearData.savings;
      const netIncomeRetirementYear = expectedIncomeRetirementYear - (input.monthlyExpenses * 12);
      let investmentGains = 0;
      if (previousSavings > 0) {
        investmentGains = previousSavings * (input.investmentRatio / 100) * (input.annualReturn / 100);
      }
      const expectedSavings = Math.round(previousSavings + investmentGains + netIncomeRetirementYear);
      expect(retirementYearData.savings).toBe(expectedSavings);
    }
  });

  test('年金支給を正しく考慮すること', () => {
    const pensionStartDate = 65;
    const pensionAmountPerYear = 1200000; 
    const input = { ...baseInput, currentAge: 60, retirementAge: 65, pensionStartDate, pensionAmountPerYear, lifeExpectancy: 70, lifeEvents: [] };
    const result = calculateSimulation(input);

    const pensionStartYearData = result.assetData.find(d => d.age === pensionStartDate);
    const nextYearData = result.assetData.find(d => d.age === pensionStartDate + 1);
    const beforePensionData = result.assetData.find(d => d.age === pensionStartDate -1);

    expect(pensionStartYearData).toBeDefined();
    expect(nextYearData).toBeDefined();
    expect(beforePensionData).toBeDefined();

    const expectedIncomePensionStartYear = input.severancePay + pensionAmountPerYear; 
    expect(pensionStartYearData?.income).toBe(expectedIncomePensionStartYear);
    expect(nextYearData?.income).toBe(pensionAmountPerYear); 
    expect(beforePensionData?.income).toBe(input.annualIncome); 
  });


  test('貯蓄がマイナスの場合の運用益の計算が正しいこと', () => {
    const lowSavingsInput: SimulationInput = {
      ...baseInput,
      currentAge: 30,
      retirementAge: 65,
      lifeExpectancy: 70,
      currentSavings: 10000,    
      annualIncome: 3000000,    
      monthlyExpenses: 400000,  
      investmentRatio: 50,
      annualReturn: 5,
      lifeEvents: [],
    };
    const result = calculateSimulation(lowSavingsInput);

    let hasNegativeBalance = false;
    let previousSavings = lowSavingsInput.currentSavings;

    for (const dataPoint of result.assetData) {
      if (dataPoint.savings < 0) {
        hasNegativeBalance = true;
        const netIncomeForYear = dataPoint.income - dataPoint.expenses;
        const investmentGains = dataPoint.savings - previousSavings - netIncomeForYear;
        if (previousSavings < 0) {
             expect(investmentGains).toBe(0);
        }
      }
      previousSavings = dataPoint.savings;
    }
    expect(hasNegativeBalance).toBe(true); 
  });

  test('境界値テスト: 現在の年齢 = 退職年齢 - 1', () => {
    const retirementAge = 65;
    const currentAge = retirementAge - 1; 
    const input = { 
        ...baseInput, 
        currentAge, 
        retirementAge, 
        lifeExpectancy: retirementAge + 5, 
        severancePay: 10000000, 
        pensionStartDate: retirementAge, 
        pensionAmountPerYear: 1500000
    };
    const result = calculateSimulation(input);

    const currentYearData = result.assetData.find(d => d.age === currentAge);
    const retirementYearData = result.assetData.find(d => d.age === retirementAge);

    expect(currentYearData).toBeDefined();
    expect(retirementYearData).toBeDefined();

    expect(currentYearData?.income).toBe(input.annualIncome);
    expect(retirementYearData?.income).toBe(input.severancePay + input.pensionAmountPerYear);
  });

  test('年次イベントの終了年齢 (endAge) を正しく処理すること', () => {
    const incomeEventWithEndAge: LifeEvent = {
      id: 'annual_income_endage',
      age: 35,
      description: '一時的な追加収入',
      type: 'income',
      amount: 100000,
      frequency: 'annual',
      endAge: 37, 
    };
     const expenseEventWithEndAge: LifeEvent = {
      id: 'annual_expense_endage',
      age: 40,
      description: '一時的な追加支出',
      type: 'expense',
      amount: 50000,
      frequency: 'annual',
      endAge: 41, 
    };
    const input = { 
        ...baseInput, 
        currentAge: 30, 
        retirementAge: 60, 
        lifeExpectancy: 65, 
        lifeEvents: [incomeEventWithEndAge, expenseEventWithEndAge] 
    };
    const result = calculateSimulation(input);

    expect(result.assetData.find(d => d.age === 34)?.income).toBe(input.annualIncome);
    expect(result.assetData.find(d => d.age === 35)?.income).toBe(input.annualIncome + incomeEventWithEndAge.amount);
    expect(result.assetData.find(d => d.age === 36)?.income).toBe(input.annualIncome + incomeEventWithEndAge.amount);
    expect(result.assetData.find(d => d.age === 37)?.income).toBe(input.annualIncome + incomeEventWithEndAge.amount);
    expect(result.assetData.find(d => d.age === 38)?.income).toBe(input.annualIncome); 

    const baseExpenses = input.monthlyExpenses * 12;
    expect(result.assetData.find(d => d.age === 39)?.expenses).toBe(baseExpenses);
    expect(result.assetData.find(d => d.age === 40)?.expenses).toBe(baseExpenses + expenseEventWithEndAge.amount);
    expect(result.assetData.find(d => d.age === 41)?.expenses).toBe(baseExpenses + expenseEventWithEndAge.amount);
    expect(result.assetData.find(d => d.age === 42)?.expenses).toBe(baseExpenses); 
  });

}); 
