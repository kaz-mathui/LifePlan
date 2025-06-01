import express, { Router, Request, Response } from 'express';
import { calculateSimulation, SimulationInput, LifeEvent } from '../services/simulationService';

const router: Router = express.Router();

/**
 * @route POST /api/simulation
 * @desc Run life plan simulation
 * @access Public (本来は認証が必要)
 */
router.post('/', (req: Request, res: Response) => {
  try {
    // lifeEvents をリクエストボディから取得。存在しない場合は空配列をデフォルト値とする
    const lifeEventsFromBody = req.body.lifeEvents;
    console.log("Backend: Received lifeEvents in request body:", JSON.stringify(lifeEventsFromBody, null, 2));
    if (lifeEventsFromBody !== undefined && !Array.isArray(lifeEventsFromBody)) {
      return res.status(400).json({ error: 'lifeEvents must be an array.' });
    }
    // TODO: lifeEvents 配列内の各要素の型チェック・バリデーションもここで行うのが望ましい

    const input: SimulationInput = {
      currentAge: Number(req.body.currentAge),
      retirementAge: Number(req.body.retirementAge),
      lifeExpectancy: Number(req.body.lifeExpectancy),
      currentSavings: Number(req.body.currentSavings),
      annualIncome: Number(req.body.annualIncome),
      monthlyExpenses: Number(req.body.monthlyExpenses),
      investmentRatio: Number(req.body.investmentRatio),
      annualReturn: Number(req.body.annualReturn),
      pensionAmountPerYear: Number(req.body.pensionAmountPerYear),
      pensionStartDate: Number(req.body.pensionStartDate),
      severancePay: Number(req.body.severancePay),
      lifeEvents: lifeEventsFromBody || [], // ★新規追加: lifeEventsをinputに追加
    };
    console.log("Backend: Input for calculateSimulation:", JSON.stringify(input, null, 2));

    if (Object.values(input).some(val => typeof val !== 'object' && isNaN(val as number))) { // lifeEvents はオブジェクトなので除外
      return res.status(400).json({ error: 'Numeric input values must be valid numbers.' });
    }

    const result = calculateSimulation(input);
    res.json(result);
  } catch (error: any) {
    console.error("Simulation API error in route:", error.message);
    res.status(400).json({ error: error.message || 'シミュレーションの実行中にエラーが発生しました。' });
  }
});

export default router; 
