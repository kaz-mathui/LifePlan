import express, { Router, Request, Response } from 'express';
import { z } from 'zod';
import { calculateSimulation } from '../services/simulationService';
import { SimulationInputData } from '../types';

const router: Router = express.Router();

/**
 * @route GET /api/health
 * @desc Health check endpoint
 * @access Public
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Backend is healthy' });
});

const housingLoanSchema = z.object({
  hasLoan: z.boolean(),
  propertyValue: z.number().min(0),
  downPayment: z.number().min(0),
  loanAmount: z.number().min(0),
  interestRate: z.number().min(0),
  loanTerm: z.number().int().min(1),
  startAge: z.number().int().min(0),
  propertyTaxRate: z.number().min(0),
});

const educationChildSchema = z.object({
  birthYear: z.number().int().min(0).max(60),
  plan: z.enum(["custom", "public", "private_liberal", "private_science"]),
  customAmount: z.number().min(0).optional().nullable(),
});

const educationSchema = z.object({
  hasChildren: z.boolean(),
  children: z.array(educationChildSchema),
  childLivingCost: z.number().min(0),
});

const carSchema = z.object({
  hasCar: z.boolean(),
  price: z.number().min(0),
  downPayment: z.number().min(0),
  loanAmount: z.number().min(0),
  loanTerm: z.number().int().min(1),
  interestRate: z.number().min(0),
  maintenanceCost: z.number().min(0),
  purchaseAge: z.number().int().min(0),
  replacementCycle: z.number().int().min(1),
});

const seniorSchema = z.object({
  enabled: z.boolean(),
  startAge: z.number().int().min(0),
  monthlyExpense: z.number().min(0),
  careCost: z.number().min(0),
});

const lifeEventSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "イベント内容は必須です。"),
    type: z.enum(['income', 'expense']),
    amount: z.number().min(0, "金額は0以上である必要があります。"),
    startAge: z.number().int().min(0, "開始年齢は0歳以上である必要があります。"),
    endAge: z.number().int().min(0).optional().nullable(),
});

const simulationSchema = z.object({
  planName: z.string().min(1, { message: "プラン名は必須です。"}),
  currentAge: z.number().int().min(0).max(120),
  retirementAge: z.number().int().min(0).max(120),
  lifeExpectancy: z.number().int().min(0).max(150),
  annualIncome: z.number().min(0),
  salaryIncreaseRate: z.number(),
  currentSavings: z.number().min(0),
  investmentRatio: z.number().min(0).max(100),
  annualReturn: z.number(),
  severancePay: z.number().min(0),
  monthlyExpenses: z.number().min(0),
  pensionAmountPerYear: z.number().min(0),
  pensionStartDate: z.number().int().min(0).max(150),
  housing: housingLoanSchema,
  education: educationSchema,
  car: carSchema,
  senior: seniorSchema,
  lifeEvents: z.array(lifeEventSchema),
  childCount: z.number().int().min(0),
}).refine(data => data.currentAge < data.retirementAge, {
  message: "リタイア目標年齢は現在の年齢より大きく設定してください。",
  path: ["retirementAge"],
}).refine(data => data.retirementAge <= data.lifeExpectancy, {
  message: "リタイア目標年齢は寿命より前に設定してください。",
  path: ["retirementAge"],
});

/**
 * @route POST /api/simulation
 * @desc Run life plan simulation
 * @access Public (本来は認証が必要)
 */
router.post('/', (req: Request, res: Response) => {
  try {
    console.log('Received request body:', JSON.stringify(req.body, null, 2));
    
    const parseResult = simulationSchema.safeParse(req.body);

    if (!parseResult.success) {
      console.error('Backend Validation Failed:', parseResult.error.flatten());
      console.error('Validation error details:', parseResult.error.errors);
      return res.status(400).json({ 
        error: "入力値が無効です。",
        details: parseResult.error.flatten().fieldErrors 
      });
    }
    
    const validatedInput: SimulationInputData = parseResult.data;

    const result = calculateSimulation(validatedInput);
    res.json(result);
  } catch (error: any) {
    console.error("Simulation API error in route:", error.message, error.stack);
    res.status(500).json({ error: error.message || 'シミュレーションの実行中に予期せぬエラーが発生しました。' });
  }
});

export default router; 
