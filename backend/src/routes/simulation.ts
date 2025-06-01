import express, { Router, Request, Response } from 'express';
import { calculateSimulation, SimulationInput } from '../services/simulationService';

const router: Router = express.Router();

/**
 * @route POST /api/simulation
 * @desc Run life plan simulation
 * @access Public (本来は認証が必要)
 */
router.post('/', (req: Request, res: Response) => {
  try {
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
    };

    // サービス層で詳細なバリデーションを行うため、ここではNaNチェックのみ
    if (Object.values(input).some(val => isNaN(val as number))) {
      return res.status(400).json({ error: 'すべての入力値は数値に変換可能である必要があります。' });
    }

    const result = calculateSimulation(input);
    res.json(result);
  } catch (error: any) {
    console.error("Simulation API error in route:", error.message);
    res.status(400).json({ error: error.message || 'シミュレーションの実行中にエラーが発生しました。' });
  }
});

export default router; 
