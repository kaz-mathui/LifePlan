export interface LifeEvent {
  id: string;
  eventName: string;
  type: 'income' | 'expense';
  amount: number;
  startAge: number;
  endAge?: number | null;
}

export interface HousingLoanData {
  hasLoan: boolean;
  propertyValue: number;
  downPayment: number;
  loanAmount: number;
  interestRate: number;
  loanTerm: number;
  startAge: number;
  propertyTaxRate: number;
}

export interface EducationData {
  hasChildren: boolean;
  children: {
    birthYear: number;
    plan: 'public' | 'private_liberal' | 'private_science' | 'custom';
    customAmount?: number;
  }[];
}

export interface CarData {
  hasCar: boolean;
  price: number;
  downPayment: number;
  loanAmount: number;
  loanTerm: number;
  interestRate: number;
  maintenanceCost: number;
  purchaseAge: number;
  replacementCycle: number;
}

export interface SeniorData {
  nursingCareStartAge: number;
  nursingCareAnnualCost: number;
  funeralCost: number;
}

export interface SimulationInputData {
  id?: string;
  planName: string;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  annualIncome: number;
  salaryIncreaseRate: number;
  currentSavings: number;
  investmentRatio: number;
  annualReturn: number;
  severancePay: number;
  monthlyExpenses: number;
  pensionAmountPerYear: number;
  pensionStartDate: number;
  housing: HousingLoanData;
  education: EducationData;
  car: CarData;
  senior: SeniorData;
  lifeEvents: LifeEvent[];
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
  finalSavings: number;
  lifeExpectancy: number;
  retirementAge: number;
  currentAge: number;
  pensionStartDate: number;
  advice?: string;
  calculationSummary?: string;
} 
 