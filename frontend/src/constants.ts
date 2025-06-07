/**
 * アプリケーション全体で使用する定数を管理するファイル
 */

// API関連の定数
export const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  SIMULATION: `${API_BASE_URL}/api/simulation`,
  // 今後エンドポイントが増えた場合はここに追加
  // GET_PLANS: `${API_BASE_URL}/api/plans`, 
};

// その他の定数
// export const DEFAULT_USER_NAME = 'ゲスト'; 

import { SimulationInputData } from './types';

export const initialSimulationInput: SimulationInputData = {
  id: '',
  planName: '新しいプラン',
  currentAge: 30,
  retirementAge: 65,
  lifeExpectancy: 95,
  annualIncome: 5000000,
  salaryIncreaseRate: 2,
  currentSavings: 1000000,
  investmentRatio: 20,
  annualReturn: 3,
  severancePay: 10000000,
  monthlyExpenses: 200000,
  pensionAmountPerYear: 1500000,
  pensionStartDate: 65,
  lifeEvents: [],
  housing: {
    hasLoan: false,
    propertyValue: 40000000,
    downPayment: 10000000,
    loanAmount: 30000000,
    startAge: 35,
    loanTerm: 35,
    interestRate: 1.5,
    propertyTaxRate: 0.3,
  },
  education: {
    hasChildren: false,
    children: [],
  },
  car: {
    hasCar: false,
    price: 3000000,
    downPayment: 1000000,
    loanAmount: 2000000,
    loanTerm: 5,
    interestRate: 2.5,
    maintenanceCost: 150000,
    purchaseAge: 30,
    replacementCycle: 10,
  },
  senior: {
    nursingCareStartAge: 80,
    nursingCareAnnualCost: 500000,
    funeralCost: 2000000,
  }
}; 
