export interface PlanListItem {
  id: string;
  planName: string;
  updatedAt: string; // ISO string
}

export interface LifeEvent {
  id: string; 
  age: number; 
  description: string; 
  type: 'income' | 'expense';
  amount: number; 
  frequency: 'one-time' | 'annual';
  endAge?: number | null;
}

export interface SimulationInputData {
  id?: string; 
  planName: string; 
  currentAge: number | '';
  retirementAge: number | '';
  lifeExpectancy: number | '';
  currentSavings: number | '';
  annualIncome: number | '';
  monthlyExpenses: number | '';
  investmentRatio: number | '';
  annualReturn: number | '';
  pensionAmountPerYear: number | '';
  pensionStartDate: number | '';
  severancePay: number | '';
  lifeEvents: LifeEvent[];
}

export interface BackendSimulationResult {
  yearsToRetirement: number;
  projectedRetirementSavings: number;
  annualSavingsCurrentPace: number;
  targetRetirementFund?: number;
  message: string;
  suggestion?: string;
  assetData: AssetDataPoint[];
}

export interface AssetDataPoint {
  age: number;
  savings: number;
}

export {}; // モジュールとして認識させるための空のエクスポート 
