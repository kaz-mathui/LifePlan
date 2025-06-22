export interface PlanListItem {
  id: string;
  planName: string;
  updatedAt: string; // ISO string
}

export interface LifeEvent {
  id: string;
  description: string;
  type: 'income' | 'expense';
  startAge: number;
  amount: number;
  endAge?: number | null;
}

export interface HousingLoanData {
  hasLoan: boolean;
  propertyValue: number | '';
  downPayment: number | '';
  loanAmount: number | '';
  interestRate: number | '';
  loanTerm: number | '';
  startAge: number | '';
  propertyTaxRate: number | '';
}

export interface EducationData {
  hasChildren: boolean;
  children: Child[];
  childLivingCost: number | '';
}

export interface Child {
  birthYear: number | '';
  plan: 'public' | 'private_liberal' | 'private_science' | 'custom';
  customAmount?: number | '';
}

export interface CarData {
  hasCar: boolean;
  price: number | '';
  downPayment: number | '';
  loanAmount: number | '';
  loanTerm: number | '';
  interestRate: number | '';
  maintenanceCost: number | '';
  purchaseAge: number | '';
  replacementCycle: number | '';
}

export interface SeniorData {
  enabled: boolean;
  startAge: number;
  monthlyExpense: number;
}

export interface Plan {
  id: string;
  planName: string;
  updatedAt?: any;
  data: SimulationInputData;
  createdAt?: any;
}

export interface SimulationInputData {
  id: string;
  planName: string;
  currentAge: number | '';
  retirementAge: number | '';
  lifeExpectancy: number | '';
  // Income
  annualIncome: number | '';
  salaryIncreaseRate: number | ''; // 昇給率
  // Assets
  currentSavings: number | '';
  investmentRatio: number | '';
  annualReturn: number | '';
  severancePay: number | '';
  // Expenses
  monthlyExpenses: number | '';
  pensionAmountPerYear: number | '';
  pensionStartDate: number | '';
  // Detailed Expenses
  housing: HousingLoanData;
  education: EducationData;
  car: CarData;
  senior: SeniorData;
  // Other events
  lifeEvents: LifeEvent[];
  childCount: number;
}

export interface SimulationResult {
  year: number;
  age: number;
  income: number;
  expense: number;
  balance: number;
  savings: number;
  incomeDetails: Record<string, number>;
  expenseDetails: Record<string, number>;
}

export interface BackendSimulationResult {
  assetData: SimulationResult[];
  advice: string;
  summaryEvents: string[];
  retirementAge: number;
}

export interface AssetDataPoint {
  age: number;
  savings: number;
}

export type ResultRow = {
  age: number;
  year: number;
  income: number;
  expense: number;
  balance: number;
  savings: number;
  lifeEvent: string;
};

export {}; // モジュールとして認識させるための空のエクスポート 
