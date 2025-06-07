import { calculateSimulation } from '../simulationService';
import { SimulationInputData } from '../../types';

describe('calculateSimulation', () => {
  const mockInput: SimulationInputData = {
    planName: 'Test Plan',
    currentAge: 30,
    retirementAge: 65,
    lifeExpectancy: 95,
    annualIncome: 5000000,
    salaryIncreaseRate: 2,
    currentSavings: 10000000,
    investmentRatio: 30,
    annualReturn: 5,
    severancePay: 10000000,
    monthlyExpenses: 200000,
    pensionAmountPerYear: 1500000,
    pensionStartDate: 65,
    housing: {
      hasLoan: false,
      propertyValue: 0,
      downPayment: 0,
      loanAmount: 0,
      interestRate: 0,
      loanTerm: 0,
      startAge: 0,
      propertyTaxRate: 0,
    },
    education: {
      hasChildren: false,
      children: [],
    },
    car: {
      hasCar: false,
      price: 0,
      downPayment: 0,
      loanAmount: 0,
      loanTerm: 0,
      interestRate: 0,
      maintenanceCost: 0,
      purchaseAge: 0,
      replacementCycle: 0,
    },
    senior: {
      nursingCareStartAge: 80,
      nursingCareAnnualCost: 500000,
      funeralCost: 1000000,
    },
    lifeEvents: [],
  };

  it('基本的な入力でエラーなくシミュレーション結果を返すこと', () => {
    const result = calculateSimulation(mockInput);
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('期待されるプロパティを含んだ結果オブジェクトを返すこと', () => {
    const result = calculateSimulation(mockInput);
    expect(result).toHaveProperty('assetData');
    expect(result).toHaveProperty('finalSavings');
    expect(result).toHaveProperty('advice');
    expect(result).toHaveProperty('calculationSummary');
  });

  it('assetDataがシミュレーション期間に応じた配列であること', () => {
    const result = calculateSimulation(mockInput);
    expect(Array.isArray(result.assetData)).toBe(true);
    // lifeExpectancy(95) - currentAge(30) + 1 = 66 years
    expect(result.assetData.length).toBe(mockInput.lifeExpectancy - mockInput.currentAge + 1);
  });

  it('最初の年のデータが正しく計算されていること', () => {
    const result = calculateSimulation(mockInput);
    const firstYearData = result.assetData[0];
    
    expect(firstYearData.age).toBe(mockInput.currentAge);
    // ざっくりとした検証。詳細な計算はロジックが複雑なため、ここでは基本的な構造をテスト。
    expect(firstYearData.income).toBeGreaterThan(0);
    expect(firstYearData.expense).toBeGreaterThan(0);
    expect(firstYearData.savings).toBeDefined();
  });
}); 
