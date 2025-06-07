import express, { Router, Request, Response } from 'express';
import { z } from 'zod';
import { calculateSimulation, SimulationInput, LifeEvent } from '../services/simulationService';

const router: Router = express.Router();

// ライフイベントのスキーマ定義
const lifeEventSchema = z.object({
  id: z.string(),
  age: z.number().int().min(0, "イベント発生年齢は0歳以上である必要があります。"),
  description: z.string().min(1, "イベント内容は必須です。"),
  type: z.enum(['income', 'expense']),
  amount: z.number().min(0, "金額は0以上である必要があります。"),
  frequency: z.enum(['one-time', 'annual']),
  endAge: z.number().int().min(0, "終了年齢は0歳以上である必要があります。").optional(),
}).refine(data => data.frequency !== 'annual' || data.endAge === undefined || data.endAge >= data.age, {
  message: "毎年のイベントの場合、終了年齢は開始年齢以上である必要があります。",
  path: ["endAge"],
});

// シミュレーション全体の入力スキーマ定義
const simulationSchema = z.object({
  currentAge: z.number().int().min(0).max(120),
  retirementAge: z.number().int().min(0).max(120),
  lifeExpectancy: z.number().int().min(0).max(150),
  currentSavings: z.number().min(0),
  annualIncome: z.number().min(0),
  monthlyExpenses: z.number().min(0),
  investmentRatio: z.number().min(0).max(100),
  annualReturn: z.number(), // マイナスも許容
  pensionAmountPerYear: z.number().min(0),
  pensionStartDate: z.number().int().min(0).max(150),
  severancePay: z.number().min(0),
  lifeEvents: z.array(lifeEventSchema).optional().default([]), // デフォルト値を設定
}).refine(data => data.currentAge < data.retirementAge, {
  message: "リタイア目標年齢は現在の年齢より大きく設定してください。",
  path: ["retirementAge"],
}).refine(data => data.retirementAge <= data.lifeExpectancy, {
  message: "リタイア目標年齢は寿命より前に設定してください。",
  path: ["retirementAge"],
}).refine(data => data.pensionStartDate <= data.lifeExpectancy, {
  message: "年金受給開始年齢は寿命より前に設定してください。",
  path: ["pensionStartDate"],
});


/**
 * @route POST /api/simulation
 * @desc Run life plan simulation
 * @access Public (本来は認証が必要)
 */
router.post('/', (req: Request, res: Response) => {
  try {
    // zod でリクエストボディを検証・パース
    const parseResult = simulationSchema.safeParse(req.body);

    if (!parseResult.success) {
      console.log('Backend Validation Failed:', parseResult.error.flatten());
      return res.status(400).json({ 
        error: "入力値が無効です。",
        details: parseResult.error.flatten().fieldErrors 
      });
    }
    
    // 検証済みのデータを使用
    const validatedInput: SimulationInput = parseResult.data;

    console.log("Backend: Input for calculateSimulation (validated):", JSON.stringify(validatedInput, null, 2));

    const result = calculateSimulation(validatedInput);
    res.json(result);
  } catch (error: any) {
    console.error("Simulation API error in route:", error.message);
    res.status(500).json({ error: error.message || 'シミュレーションの実行中に予期せぬエラーが発生しました。' });
  }
});

export default router; 
