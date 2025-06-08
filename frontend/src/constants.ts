/**
 * アプリケーション全体で使用する定数を管理するファイル
 */
import { SimulationInputData } from './types';

// API関連の定数
export const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  SIMULATION: `${API_BASE_URL}/api/simulation`,
  // 今後エンドポイントが増えた場合はここに追加
  // GET_PLANS: `${API_BASE_URL}/api/plans`, 
};

// その他の定数
// export const DEFAULT_USER_NAME = 'ゲスト'; 

export const initialSimulationInput: SimulationInputData = {
  id: '',
  planName: '新しいプラン',
  currentAge: 30,
  retirementAge: 65,
  lifeExpectancy: 95,
  annualIncome: 500, // 万円
  salaryIncreaseRate: 1, // %
  currentSavings: 1000, // 万円
  investmentRatio: 50, // %
  annualReturn: 3, // %
  severancePay: 1500, // 万円
  monthlyExpenses: 20, // 万円
  pensionAmountPerYear: 150, // 万円
  pensionStartDate: 65,
  lifeEvents: [],
  housing: {
    hasLoan: false,
    propertyValue: 4000,
    downPayment: 800,
    loanAmount: 3200,
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
    price: 300,
    downPayment: 100,
    loanAmount: 200,
    loanTerm: 5,
    interestRate: 2,
    maintenanceCost: 30,
    purchaseAge: 40,
    replacementCycle: 10,
  },
  senior: {
    nursingCareStartAge: 80,
    nursingCareAnnualCost: 100,
    funeralCost: 200,
  }
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
