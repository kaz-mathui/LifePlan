/**
 * LifePlan v2 シミュレーター
 * kakei-planner v5.6 の simulate ロジックを v2 の answers モデル用に移植
 *
 * 入力: Record<string, any> (questions.ts の key)
 * 出力: 年齢別の資産・収入・支出時系列
 *
 * すべて「現在の物価価値」(実質ベース) で表示。
 * 投資リターンは ai_expected_return / 100、インフレは infl_assumption。
 */

export interface YearPoint {
  age: number;
  assets: number;      // その年末の資産(万円)
  income: number;      // 手取り収入(万円/年)
  expense: number;     // 支出(万円/年)
  saving: number;      // 年間貯蓄(万円)
  event?: string;      // ライフイベント名(住宅購入・退職等)
}

// 統計プリフィル値
const ESTIMATES = {
  // 年齢別年収中央値(万円・額面)
  incomeByAgeJob: {
    regular:    { 20:300, 25:380, 30:460, 35:520, 40:560, 45:580, 50:600, 55:590, 60:420, 65:320 },
    public:     { 20:310, 25:390, 30:470, 35:550, 40:610, 45:660, 50:700, 55:720, 60:500, 65:390 },
    contract:   { 20:250, 25:320, 30:380, 35:420, 40:440, 45:440, 50:430, 55:420, 60:340, 65:260 },
    part:       { 20:180, 25:200, 30:200, 35:200, 40:200, 45:200, 50:200, 55:200, 60:180, 65:120 },
    self:       { 20:240, 25:330, 30:420, 35:470, 40:500, 45:510, 50:510, 55:490, 60:420, 65:320 },
  } as Record<string, Record<number, number>>,
  // 手取り係数(額面→可処分)
  takeHomeRatio: {
    regular: 0.79, public: 0.79, contract: 0.80, part: 0.85, self: 0.75, other: 0.80,
  } as Record<string, number>,
  // 退職金(中小含む全体平均、万円)
  severance: {
    regular: 1000, public: 2100, contract: 0, part: 0, self: 0,
  } as Record<string, number>,
  // 公的年金 月額(万円)
  pensionMonthly: {
    kosei: 14.7, kokumin: 6.5, both: 12.0,
  } as Record<string, number>,
  // ライフイベント費用(万円)
  events: {
    marriage: 350,
    childBirth: 80,
    eduPerYear: 130, // 子1人/年(6-22歳)
    homeBuy: 1500,
    nursingCare: 580, // 75歳時に計上
    funeral: 120,     // 寿命時
    parentCareEach: 350, // 親1人あたり
    unemployment: 300, // 生涯期待値
  },
  // 預金実質リターン(インフレで目減り)
  depositReturn: -0.015,
};

function getAgeIncomeStat(age: number, job: string): number {
  const table = ESTIMATES.incomeByAgeJob[job] || ESTIMATES.incomeByAgeJob.regular;
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  let prev = keys[0];
  for (const k of keys) {
    if (age <= k) {
      if (age === k || prev === k) return table[k];
      const ratio = (age - prev) / (k - prev);
      return table[prev] + (table[k] - table[prev]) * ratio;
    }
    prev = k;
  }
  return table[keys[keys.length - 1]];
}

/**
 * answers から SimulateInput を作って simulate を実行
 */
export function simulateFromAnswers(answers: Record<string, any>): YearPoint[] {
  const age = parseFloat(answers.b_age) || 30;
  const job = answers.is_job_type || 'regular';
  const householdStatus = answers.b_household_status || 'single';
  const lifespan = parseFloat(answers.b_target_lifespan) || 90;
  const retireAge = parseFloat(answers.r_retire_age) || 65;
  const incomeNow = parseFloat(answers.is_annual_income) || getAgeIncomeStat(age, job);
  const takeHomeKnown = parseFloat(answers.is_take_home_known);
  const takeHomeRatio = takeHomeKnown ? takeHomeKnown / incomeNow : (ESTIMATES.takeHomeRatio[job] || 0.79);
  const growthRate = (parseFloat(answers.is_growth_rate) || 1) / 100; // %/年
  const housingSubsidy = (parseFloat(answers.is_housing_subsidy) || 0) * 12; // 月→年

  // 資産
  const depositNow = parseFloat(answers.ad_total) || 0;
  const investNow = parseFloat(answers.ai_total) || 0;
  const expectedReturn = parseFloat(answers.ai_expected_return) || 0.015;
  const stockRatio = (parseFloat(answers.ai_alloc_stock_pct) || 50) / 100;

  // 月支出
  const housingMonthly = parseFloat(answers.eh_monthly) || 0;
  const foodMonthly = parseFloat(answers.ef_total_monthly) || (incomeNow * takeHomeRatio * 0.25 / 12);
  const utilityMonthly = parseFloat(answers.eu_utility_monthly) || 1.5;
  const commMonthly = parseFloat(answers.eu_comm_monthly) || 1.5;
  const insuranceMonthly = parseFloat(answers.ei_total_monthly) || 1.0;
  const expenseMonthly = housingMonthly + foodMonthly + utilityMonthly + commMonthly + insuranceMonthly;

  // 負債
  const studentLoanBalance = parseFloat(answers.ll_student_loan_balance) || 0;
  const studentLoanMonthly = parseFloat(answers.ll_student_loan_monthly) || 0;
  const studentLoanYears = parseFloat(answers.ll_student_loan_remaining_years) || 0;

  // 年金
  const pensionType = answers.p_enrolled_type || 'kosei';
  const pensionMonthly = parseFloat(answers.p_estimate_monthly) || ESTIMATES.pensionMonthly[pensionType] || 12;
  const pensionStart = parseFloat(answers.p_start_age) || 65;

  // 退職金
  const severance = parseFloat(answers.r_severance_estimate);
  const severanceAuto = ESTIMATES.severance[job] || 0;
  const severanceFinal = severance != null && !isNaN(severance) ? severance : severanceAuto;

  // 子供
  const childCount = parseInt(answers.c_count_current) || parseInt(answers.c_count_plan) || 0;
  const childFirstBirth = parseFloat(answers.c_first_birth_year) || (new Date().getFullYear() + 3);
  const childPlan = answers.c_edu_plan || 'mixed';
  const eduMultiplier = { all_public: 0.7, mixed: 1.0, all_private: 1.5, science: 1.8, overseas: 2.5 }[childPlan as string] || 1.0;

  // 住宅
  const homeType = answers.eh_type;
  const homeBuyPlan = answers.le_home_buy_plan_age;
  const loanBalance = parseFloat(answers.eh_loan_balance) || 0;

  // 結婚
  const marriagePlanYear = parseFloat(answers.sp_marry_plan_year) || 0;

  // 親介護
  const parentCareSelf = answers.h_parent_care_support_self || 'none';
  const parentCareSpouse = answers.h_parent_care_support_spouse || 'none';
  const totalParentCare =
    (parentCareSelf === 'both' ? 700 : parentCareSelf === 'one' ? 350 : 0) +
    (parentCareSpouse === 'both' ? 700 : parentCareSpouse === 'one' ? 350 : 0);

  // 自分の介護費
  const selfCare = parseFloat(answers.h_self_care_cost) || 580;

  // === Simulate ===
  let assets = depositNow + investNow - studentLoanBalance - loanBalance * 0; // ローンは別計上
  const series: YearPoint[] = [];

  for (let a = age; a <= lifespan; a++) {
    let yearlyIncome = 0;
    let yearlyExpense = expenseMonthly * 12;
    let event: string | undefined;

    if (a < retireAge) {
      // 在職中
      const yearsFromNow = a - age;
      const grossIncome = incomeNow * Math.pow(1 + growthRate, yearsFromNow);
      yearlyIncome = grossIncome * takeHomeRatio + housingSubsidy;
    } else {
      // 退職後
      if (a >= pensionStart) {
        yearlyIncome = pensionMonthly * 12 * 0.92; // 簡易: 公的年金等控除後
      }
      if (a === retireAge) {
        assets += severanceFinal;
        event = '退職金' + severanceFinal + '万';
      }
      // 老後の支出は現役の85%
      yearlyExpense = yearlyExpense * 0.85;
    }

    // 奨学金返済(在職期間中)
    if (studentLoanYears > 0 && a < age + studentLoanYears) {
      yearlyExpense += studentLoanMonthly * 12;
    }

    // 結婚イベント
    if (marriagePlanYear > 0 && a === age + marriagePlanYear) {
      assets -= ESTIMATES.events.marriage;
      event = '結婚';
    }

    // 出産・教育費
    for (let i = 0; i < childCount; i++) {
      const birthYear = childFirstBirth + i * 2;
      const childAge = a - (birthYear - (new Date().getFullYear() - age));
      if (childAge === 0) {
        assets -= ESTIMATES.events.childBirth;
        event = '出産';
      } else if (childAge >= 6 && childAge <= 22) {
        yearlyExpense += ESTIMATES.events.eduPerYear * eduMultiplier;
      }
    }

    // 住宅購入
    if (homeBuyPlan && a === parseFloat(homeBuyPlan)) {
      assets -= ESTIMATES.events.homeBuy;
      event = '住宅頭金';
    }

    // 失業期待値
    if (a === 35 || a === 45) {
      assets -= ESTIMATES.events.unemployment / 2;
    }

    // 親介護(55-62歳に分散)
    if (a === 55 || a === 62) {
      assets -= totalParentCare / 2;
    }

    // 自分の介護(75歳)
    if (a === 75) {
      assets -= selfCare;
      event = '本人介護';
    }

    // 葬儀(寿命時)
    if (a === lifespan) {
      assets -= ESTIMATES.events.funeral;
    }

    // 投資リターン
    const investmentReturn = Math.max(0, assets) * stockRatio * expectedReturn +
                            Math.max(0, assets) * (1 - stockRatio) * ESTIMATES.depositReturn;

    const yearlySaving = yearlyIncome - yearlyExpense;
    assets += yearlySaving + investmentReturn;

    series.push({ age: a, assets, income: yearlyIncome, expense: yearlyExpense, saving: yearlySaving, event });
  }

  return series;
}

export function getKeyMetrics(series: YearPoint[]) {
  const at65 = series.find(p => p.age === 64) || series.find(p => p.age === 65);
  const last = series[series.length - 1];
  const minPoint = series.reduce((m, p) => (p.assets < m.assets ? p : m), series[0]);
  return {
    assetsAt65: at65?.assets || 0,
    assetsAtLast: last?.assets || 0,
    lastAge: last?.age || 0,
    minAssets: minPoint.assets,
    minAge: minPoint.age,
  };
}

// 4天気スコア
export function getWeatherScores(series: YearPoint[]): {
  overall: { icon: string; label: string; status: 'sunny'|'cloudy'|'rainy'|'stormy' };
  retire: { icon: string; label: string };
  lifespan: { icon: string; label: string };
  valley: { icon: string; label: string };
} {
  const { assetsAt65, assetsAtLast, minAssets } = getKeyMetrics(series);

  const retire = assetsAt65 > 3000 ? { icon: '☀️', label: '余裕あり' }
    : assetsAt65 > 1500 ? { icon: '⛅', label: '概ね大丈夫' }
    : assetsAt65 > 500 ? { icon: '🌧️', label: 'やや不足' }
    : { icon: '⛈️', label: '足りない' };

  const lifespan = assetsAtLast > 1000 ? { icon: '☀️', label: '余裕で残る' }
    : assetsAtLast > 0 ? { icon: '⛅', label: 'ギリギリ' }
    : { icon: '⛈️', label: '不足' };

  const valley = minAssets > 0 ? { icon: '☀️', label: 'マイナス無' }
    : minAssets > -300 ? { icon: '⛅', label: '軽いマイナス' }
    : minAssets > -1000 ? { icon: '🌧️', label: '一時赤字' }
    : { icon: '⛈️', label: '深い谷' };

  const score = (assetsAt65 / 3000) * 40 + (assetsAtLast / 1000) * 30 + (minAssets > 0 ? 30 : 0);
  const overall = score > 70 ? { icon: '☀️', label: '快晴', status: 'sunny' as const }
    : score > 40 ? { icon: '⛅', label: '薄曇り', status: 'cloudy' as const }
    : score > 10 ? { icon: '🌧️', label: '雨模様', status: 'rainy' as const }
    : { icon: '⛈️', label: '荒天', status: 'stormy' as const };

  return { overall, retire, lifespan, valley };
}

export function formatMan(n: number): string {
  if (n == null || isNaN(n)) return '0';
  if (Math.abs(n) >= 10000) return (n / 10000).toFixed(2) + '億';
  return Math.round(n).toLocaleString();
}

/**
 * Monte Carlo シミュレーション
 * 投資リターンを正規分布(mean: expected, std: sigma)で揺らして N 回試行。
 * 「寿命までに資金が枯渇しない確率」「最終資産の分布」を返す。
 */
export interface MonteCarloResult {
  trials: number;
  successProbability: number;      // 寿命まで枯渇しない確率
  median: number;                  // 最終資産の中央値
  p10: number;                     // 下位10%
  p25: number;                     // 下位25%
  p75: number;                     // 上位25%
  p90: number;                     // 上位10%
  worstFinal: number;
  bestFinal: number;
}

// 正規分布の乱数 (Box-Muller)
function randNormal(mean: number, std: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + std * z;
}

export function runMonteCarlo(
  baseAnswers: Record<string, any>,
  trials: number = 200,
  returnStd: number = 0.05 // 標準偏差5%(年率)
): MonteCarloResult {
  const baseReturn = parseFloat(baseAnswers.ai_expected_return) || 0.015;
  const finals: number[] = [];
  let successCount = 0;

  for (let i = 0; i < trials; i++) {
    // この試行用のリターンを正規分布で生成
    const sampledReturn = Math.max(-0.10, Math.min(0.15, randNormal(baseReturn, returnStd)));
    const trialAnswers = { ...baseAnswers, ai_expected_return: sampledReturn };
    const series = simulateFromAnswers(trialAnswers);
    const final = series[series.length - 1].assets;
    finals.push(final);
    // 寿命までマイナスにならなかったらSuccess
    const everNegative = series.some(p => p.assets < 0);
    if (!everNegative) successCount++;
  }

  finals.sort((a, b) => a - b);
  const pct = (p: number) => finals[Math.floor(finals.length * p)];

  return {
    trials,
    successProbability: successCount / trials,
    median: pct(0.5),
    p10: pct(0.10), p25: pct(0.25), p75: pct(0.75), p90: pct(0.90),
    worstFinal: finals[0],
    bestFinal: finals[finals.length - 1],
  };
}
