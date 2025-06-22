/**
 * アプリケーション全体で使用する定数を管理するファイル
 */
import { SimulationInputData } from './types';
import { v4 as uuidv4 } from 'uuid';

// API関連の定数
export const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  SIMULATION: `${API_BASE_URL}/api/simulation`,
  // 今後エンドポイントが増えた場合はここに追加
  // GET_PLANS: `${API_BASE_URL}/api/plans`, 
};

// その他の定数
// export const DEFAULT_USER_NAME = 'ゲスト'; 

export const LOCAL_STORAGE_KEY = 'lifePlanSimulationInput';

export const defaultInput: SimulationInputData = {
  planName: '新しいプラン',
  // Basic
  currentAge: 30,
  retirementAge: 65,
  lifeExpectancy: 95,
  // Income
  annualIncome: 600,
  salaryIncreaseRate: 1,
  // Assets
  currentSavings: 2000,
  investmentRatio: 50,
  annualReturn: 3,
  severancePay: 1500,
  // Expenses
  monthlyExpenses: 20,
  pensionAmountPerYear: 150,
  pensionStartDate: 65,
  // Detailed Expenses
  housing: {
    hasLoan: false,
    propertyValue: 4000,
    downPayment: 1000,
    loanAmount: 3000,
    interestRate: 1.5,
    loanTerm: 35,
    startAge: 30,
    propertyTaxRate: 0.3,
  },
  education: {
    hasChildren: false,
    children: [],
    childLivingCost: 50,
  },
  car: {
    hasCar: false,
    price: 200,
    downPayment: 50,
    loanAmount: 150,
    loanTerm: 5,
    interestRate: 2,
    maintenanceCost: 30,
    purchaseAge: 30,
    replacementCycle: 10,
  },
  senior: {
    enabled: false,
    startAge: 65,
    monthlyExpense: 15,
    careCost: 200,
  },
  lifeEvents: [],
  childCount: 0,
};

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
