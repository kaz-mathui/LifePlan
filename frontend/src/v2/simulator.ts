/**
 * LifePlan v2 シミュレーター(全面改訂版)
 *
 * 入力: Record<string, any> (questions.ts の key)
 * 出力: 年齢別の資産・収入・支出時系列
 *
 * 設計原則:
 * - 全て「現在の物価価値(実質ベース)」で表示。インフレ調整は infl_assumption を実質変換に使う
 * - 世帯モデル(本人 + 配偶者)。 sp_status が married/cohab の時は配偶者収入・年金を加算
 * - ローンは初期負債+月次返済の二重計上をしない: 残高は assets から控除、月次返済は expense に加算しない(返済済資金が消える)
 *   → simplification: 月額返済はキャッシュアウトとして expense 計上、残高は別途減らす(本実装では年次に減算)
 * - 動的イベント: 失業/親介護/自分介護は age を絶対固定せず現在年齢に依存させない
 */

export interface YearPoint {
  age: number;
  assets: number;
  income: number;
  expense: number;
  saving: number;
  event?: string;
}

const ESTIMATES = {
  incomeByAgeJob: {
    regular:    { 20:300, 25:380, 30:460, 35:520, 40:560, 45:580, 50:600, 55:590, 60:420, 65:320 },
    public:     { 20:310, 25:390, 30:470, 35:550, 40:610, 45:660, 50:700, 55:720, 60:500, 65:390 },
    contract:   { 20:250, 25:320, 30:380, 35:420, 40:440, 45:440, 50:430, 55:420, 60:340, 65:260 },
    part:       { 20:180, 25:200, 30:200, 35:200, 40:200, 45:200, 50:200, 55:200, 60:180, 65:120 },
    self:       { 20:240, 25:330, 30:420, 35:470, 40:500, 45:510, 50:510, 55:490, 60:420, 65:320 },
  } as Record<string, Record<number, number>>,
  takeHomeRatio: {
    regular: 0.79, public: 0.79, contract: 0.80, part: 0.85, self: 0.75, other: 0.80,
  } as Record<string, number>,
  severance: {
    regular: 1000, public: 2100, contract: 0, part: 0, self: 0,
  } as Record<string, number>,
  pensionMonthly: {
    kosei: 14.7, kokumin: 6.5, both: 12.0,
  } as Record<string, number>,
  events: {
    marriage: 350,
    childBirth: 80,
    eduPerYear: 130,
    homeBuyDefault: 1500,
    nursingCare: 580,
    funeral: 120,
    parentCareEach: 350,
    unemployment: 300,
    divorcePenalty: 0.5,  // 資産半減
  },
  depositReturn: -0.015,    // インフレで実質目減り
  loanInterestCostRate: 0.012, // 負債期間の機会損失
};

function getAgeIncomeStat(age: number, job: string): number {
  const table = ESTIMATES.incomeByAgeJob[job] || ESTIMATES.incomeByAgeJob.regular;
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (age <= keys[0]) return table[keys[0]];
  if (age >= keys[keys.length - 1]) return table[keys[keys.length - 1]];
  for (let i = 0; i < keys.length - 1; i++) {
    if (age >= keys[i] && age <= keys[i + 1]) {
      const ratio = (age - keys[i]) / (keys[i + 1] - keys[i]);
      return table[keys[i]] + (table[keys[i + 1]] - table[keys[i]]) * ratio;
    }
  }
  return table[keys[keys.length - 1]];
}

const num = (v: any, def = 0): number => {
  const n = parseFloat(v);
  return isNaN(n) ? def : n;
};

// 住宅ローン月額返済(元利均等)
function mortgageMonthly(balance: number, annualRate: number, years: number): number {
  if (balance <= 0 || years <= 0) return 0;
  if (annualRate <= 0) return balance / (years * 12);
  const i = annualRate / 12;
  const n = years * 12;
  return balance * i * Math.pow(1 + i, n) / (Math.pow(1 + i, n) - 1);
}

export function simulateFromAnswers(answers: Record<string, any>): YearPoint[] {
  // ===== 本人 =====
  const age = Math.max(18, num(answers.b_age, 30));
  const job = answers.is_job_type || 'regular';
  const lifespan = Math.max(age + 1, num(answers.b_target_lifespan, 90));
  const retireAge = Math.max(age, num(answers.r_retire_age, 65));
  const incomeNow = num(answers.is_annual_income, getAgeIncomeStat(age, job));
  const takeHomeKnown = num(answers.is_take_home_known, 0);
  const takeHomeRatio = takeHomeKnown > 0
    ? Math.min(1.0, takeHomeKnown / Math.max(1, incomeNow))
    : (ESTIMATES.takeHomeRatio[job] || 0.79);
  const growthRate = num(answers.is_growth_rate, 1) / 100;  // 名目→以下で実質化
  const inflRate = num(answers.infl_assumption, 1) / 100;   // 実質ベースに統一するため給与成長から差し引く
  const realGrowthRate = growthRate - inflRate;
  const housingSubsidy = num(answers.is_housing_subsidy, 0) * 12;
  const rsuSoYearly = num(answers.is_rsu_so, 0);

  // 退職後継続
  const retirePostWork = answers.r_retire_post_work || 'no';  // 'no'|'full'|'part'|'self'
  const retirePartialIncome = num(answers.r_retire_partial_income, 0);  // 月額
  const retireLifestyle = num(answers.r_retire_lifestyle, 0);  // 月額

  // ===== 配偶者 =====
  const spStatus = answers.sp_status || 'none';
  const hasSpouse = spStatus === 'married' || spStatus === 'cohab';
  const spAge = num(answers.sp_age, age);
  const spJob = answers.sp_job || 'regular';
  const spIncome = hasSpouse ? num(answers.sp_income, 0) : 0;
  const spRetireAge = hasSpouse ? Math.max(spAge, num(answers.sp_retire_age, 65)) : 0;
  const spPensionMonthly = hasSpouse ? num(answers.sp_pension_estimate, 0) : 0;
  const spTakeHomeRatio = ESTIMATES.takeHomeRatio[spJob] || 0.79;

  // ===== 資産 =====
  const depositNow = num(answers.ad_total, 0);
  const investNow = num(answers.ai_total, 0);
  const expectedReturn = num(answers.ai_expected_return, 0.015);
  const stockRatio = Math.max(0, Math.min(1, num(answers.ai_alloc_stock_pct, 50) / 100));
  const homeValue = num(answers.ar_primary_home_value, 0);
  const investPropertyValue = num(answers.ar_invest_value_total, 0);
  const investPropertyLoan = num(answers.ar_invest_loan_balance, 0);
  const investYield = num(answers.ar_invest_yield, 0) / 100;
  const investOccupancy = num(answers.ar_invest_occupancy, 90) / 100;

  // 積立(月額)
  const nisaMonthly = num(answers.ai_nisa_monthly, 0);
  const idecoMonthly = num(answers.ai_ideco_monthly, 0);

  // ===== 支出 =====
  const eh_type = answers.eh_type || 'rent';
  const isOwnLoan = eh_type === 'own';
  const housingMonthly = num(answers.eh_monthly, 0);
  const propertyTaxMonthly = (eh_type === 'own' || eh_type === 'own_paid')
    ? num(answers.eh_property_tax_yearly, 0) / 12 : 0;
  const repairReserve = (eh_type === 'own' || eh_type === 'own_paid')
    ? num(answers.eh_repair_reserve, 0) : 0;
  const foodMonthly = num(answers.ef_total_monthly, incomeNow * takeHomeRatio * 0.25 / 12);
  const utilityMonthly = num(answers.eu_utility_monthly, 1.5);
  const commMonthly = num(answers.eu_comm_monthly, 1.5);
  const insuranceMonthly = num(answers.ei_total_monthly, 1.0);
  const medicalYearly = num(answers.h_medical_yearly, 0);
  const hobbyMonthly = num(answers.ehb_hobby, 0);
  const subscriptionMonthly = num(answers.ehb_subscription, 0);
  const petsMonthly = num(answers.ehb_pets, 0);
  const travelYearly = num(answers.ehb_travel_yearly, 0);

  // 交通
  const hasCar = answers.et_has_car === true || answers.et_has_car === 'true';
  const publicTransitMonthly = num(answers.et_public_transit, 0);
  const carFuelMonthly = hasCar ? num(answers.et_car_fuel, 0) : 0;
  const carMaintenanceYearly = hasCar ? num(answers.et_car_maintenance, 0) : 0;
  const taxiUberMonthly = num(answers.et_taxi_uber, 0);
  const carReplaceCycle = hasCar ? num(answers.et_car_replace_cycle, 0) : 0;
  const carReplaceCost = 250; // 中古乗換目安

  // 月支出(住居系・食費系・公共系・交通・娯楽)
  const baseMonthlyExpense =
    housingMonthly + propertyTaxMonthly + repairReserve +
    foodMonthly + utilityMonthly + commMonthly + insuranceMonthly +
    hobbyMonthly + subscriptionMonthly + petsMonthly +
    publicTransitMonthly + carFuelMonthly + taxiUberMonthly;

  // ===== 負債 =====
  const studentLoanMonthly = num(answers.ll_student_loan_monthly, 0);
  const studentLoanYears = num(answers.ll_student_loan_remaining_years, 0);
  const housingLoanBalance = num(answers.eh_loan_balance, 0);
  const housingLoanRate = num(answers.eh_loan_rate, 0) / 100;
  const housingLoanYears = num(answers.eh_loan_remaining_years, 0);
  const housingLoanType = answers.eh_loan_type || 'fixed';
  const businessLoanBalance = num(answers.ll_business_loan, 0);
  const carLoanBalance = num(answers.ll_car_loan_balance, 0);
  const carLoanMonthly = num(answers.ll_car_loan_monthly, 0);
  const educationLoanBalance = num(answers.ll_education_loan, 0);

  // ===== 年金 =====
  const pensionType = answers.p_enrolled_type || 'kosei';
  const koseiYears = num(answers.p_kosei_years, Math.max(0, age - 22));
  // 厚生年金加入年数から見込み額を補正(ざっくり: 加入1年あたり月額0.4万円基本+報酬比例)
  const koseiBase = ESTIMATES.pensionMonthly.kokumin
    + (pensionType === 'kosei' || pensionType === 'both' ? Math.min(40, koseiYears) * 0.2 : 0);
  const pensionMonthly = num(answers.p_estimate_monthly, koseiBase);
  const pensionStart = num(answers.p_start_age, 65);
  const pensionNowMonthly = num(answers.io_pension_now, 0);  // 既受給中

  // ===== 退職金 =====
  const severance = num(answers.r_severance_estimate, -1);
  const severanceFinal = severance >= 0 ? severance : (ESTIMATES.severance[job] || 0);
  const spSeveranceFinal = hasSpouse ? (ESTIMATES.severance[spJob] || 0) : 0;

  // ===== 子供 =====
  const childCount = parseInt(answers.c_count_current) || parseInt(answers.c_count_plan) || 0;
  const currentYear = 2026;  // simulationStartYear 固定化(実行年に依存しない)
  const childFirstBirth = num(answers.c_first_birth_year, currentYear + 3);
  const childPlan = answers.c_edu_plan || 'mixed';
  const eduMultiplier = ({ all_public: 0.7, mixed: 1.0, all_private: 1.5, science: 1.8, overseas: 2.5 } as Record<string, number>)[childPlan] || 1.0;
  const jukuYearly = num(answers.c_juku_yearly, 0);

  // ===== ライフイベント =====
  const homeBuyAge = num(answers.le_home_buy_plan_age, 0);
  const homeTargetValue = num(answers.le_home_target_value, 0);
  const homeBuyDownPay = homeTargetValue > 0 ? homeTargetValue * 0.2 : ESTIMATES.events.homeBuyDefault;

  const marriagePlanYear = num(answers.sp_marry_plan_year, 0);
  const marriagePlanAge = num(answers.le_marriage_plan_age, 0);
  const marriageAge = marriagePlanYear > 0 ? age + marriagePlanYear
    : (marriagePlanAge > 0 ? marriagePlanAge : 0);

  const oneTimeIncome = num(answers.le_one_time_income, 0);
  const giftInheritReceived = num(answers.io_gift_inherit_received, 0);
  const inhExpectedAmount = num(answers.inh_expected_amount, 0);
  const inhExpectedAge = num(answers.inh_expected_age, 0);
  const divorceRisk = answers.le_divorce_risk === true || answers.le_divorce_risk === 'true';

  // 転職
  const careerChangePlan = answers.cr_career_change_plan || 'none';  // 'none'|'1y'|'3y'|'5y'
  const careerChangeIncomeChange = num(answers.cr_career_change_income_change, 0);
  const careerChangeYears: Record<string, number> = { '1y': 1, '3y': 3, '5y': 5, 'now': 0 };
  const careerChangeAt = careerChangePlan !== 'none' ? age + (careerChangeYears[careerChangePlan] || 0) : -1;

  // 独立・起業
  const independencePlan = answers.cr_independence_plan || 'none';  // 'none'|'1y'|'3y'|'5y'
  const independenceYears: Record<string, number> = { '1y': 1, '3y': 3, '5y': 5 };
  const independenceAt = independencePlan !== 'none' ? age + (independenceYears[independencePlan] || 0) : -1;

  // 介護
  const parentCareSelf = answers.h_parent_care_support_self || 'none';
  const parentCareSpouse = answers.h_parent_care_support_spouse || 'none';
  const parentCareCostInput = num(answers.h_parent_care_cost, -1);
  const totalParentCareDefault =
    (parentCareSelf === 'both' ? 700 : parentCareSelf === 'one' ? 350 : 0) +
    (parentCareSpouse === 'both' ? 700 : parentCareSpouse === 'one' ? 350 : 0);
  const totalParentCare = parentCareCostInput >= 0 ? parentCareCostInput : totalParentCareDefault;
  const selfCare = num(answers.h_self_care_cost, ESTIMATES.events.nursingCare);

  // その他
  const sideIncomeMonthly = num(answers.io_side_income, 0);
  const dividendYearly = num(answers.io_dividend, 0);
  const rentalYearly = num(answers.io_rental, 0);
  const charityYearly = num(answers.o_charity_yearly, 0);
  const alimonyMonthly = num(answers.o_alimony, 0);
  const giftYearly = num(answers.inh_gift_yearly, 0);

  // ===== What-If 専用キー =====
  const extraSavingsMonthly = num(answers._whatif_extra_savings_monthly, 0);  // 月貯蓄上乗せ
  const extraReturnPct = num(answers._whatif_extra_return_pct, 0);  // リターン上乗せ(年率)
  const finalExpectedReturn = expectedReturn + extraReturnPct;

  // ===== 初期資産(純資産) =====
  // 流動資産 + 自宅評価額 + 投資用不動産 - 各種ローン残高
  let assets = depositNow + investNow + homeValue + investPropertyValue
    - housingLoanBalance - investPropertyLoan
    - num(answers.ll_student_loan_balance, 0)
    - businessLoanBalance - carLoanBalance - educationLoanBalance
    - num(answers.lo_credit_balance, 0)
    - num(answers.lo_revolving, 0)
    - num(answers.lo_family_loan, 0)
    - num(answers.lo_other, 0);

  // 住宅ローン年次残高(アモータイゼーション用)
  let housingLoanRemaining = housingLoanBalance;
  let housingLoanYearsRemaining = housingLoanYears;
  const housingLoanMonthly = housingLoanYears > 0
    ? mortgageMonthly(housingLoanBalance, housingLoanRate || 0.015, housingLoanYears)
    : num(answers.eh_monthly, 0) * (isOwnLoan ? 1 : 0);

  // 残高を持つ車ローン: 月額が指定されていれば返済期間を逆算
  let carLoanRemaining = carLoanBalance;

  // 配偶者の状態追跡
  let spCurrentAge = spAge;
  let spIncomeApplied = spIncome;

  // 失業期待値: 退職までの間に2回ランダム想定 → 単純化して age+5, age+15 で計上(過去でない)
  const unemploymentEvents: number[] = [];
  for (const offset of [5, 15]) {
    const eventAge = age + offset;
    if (eventAge < retireAge) unemploymentEvents.push(eventAge);
  }

  // 親介護: 開始は age+5〜age+15 の範囲で分散
  const parentCareEvents: number[] = [];
  if (totalParentCare > 0) {
    parentCareEvents.push(Math.min(retireAge - 1, age + 10));
    parentCareEvents.push(Math.min(retireAge - 1, age + 17));
  }

  // 離婚タイミング(リスク織込みオンの場合 age+10)
  const divorceAge = divorceRisk ? age + 10 : -1;

  const series: YearPoint[] = [];

  for (let a = age; a <= lifespan; a++) {
    let yearlyIncome = 0;
    let yearlyExpense = baseMonthlyExpense * 12 + medicalYearly + travelYearly + charityYearly + alimonyMonthly * 12;
    let event: string | undefined;
    const yearsFromNow = a - age;

    // === 配偶者の年齢を年毎に更新 ===
    spCurrentAge = spAge + yearsFromNow;

    // === 本人の収入 ===
    let myIncomeGross = 0;
    if (a < retireAge) {
      // 在職中
      myIncomeGross = incomeNow * Math.pow(1 + realGrowthRate, yearsFromNow);
      // 転職による収入変化
      if (careerChangeAt >= 0 && a >= careerChangeAt) {
        myIncomeGross += careerChangeIncomeChange;
      }
      // 独立・起業: 独立年以降は変動率拡大、平均は維持(モデル簡略化のため -5%)
      if (independenceAt >= 0 && a >= independenceAt) {
        myIncomeGross *= 0.95;
      }
      yearlyIncome += myIncomeGross * takeHomeRatio + housingSubsidy + rsuSoYearly * takeHomeRatio;
    } else {
      // 退職後
      if (retirePostWork !== 'no' && retirePartialIncome > 0 && a < pensionStart) {
        yearlyIncome += retirePartialIncome * 12;
      }
      // 退職金(退職年に1回)
      if (a === retireAge) {
        assets += severanceFinal;
        event = '退職金' + Math.round(severanceFinal) + '万';
      }
      // 公的年金(本人)
      if (a >= pensionStart) {
        yearlyIncome += pensionMonthly * 12 * 0.92;
      }
    }

    // === 配偶者の収入 ===
    if (hasSpouse) {
      if (spCurrentAge < spRetireAge) {
        const spGross = spIncomeApplied * Math.pow(1 + realGrowthRate, yearsFromNow);
        yearlyIncome += spGross * spTakeHomeRatio;
      } else {
        if (spCurrentAge === spRetireAge) {
          assets += spSeveranceFinal;
          event = (event ? event + '+' : '') + '配偶者退職金' + Math.round(spSeveranceFinal) + '万';
        }
        if (spCurrentAge >= 65) {
          yearlyIncome += spPensionMonthly * 12 * 0.92;
        }
      }
    }

    // === その他継続収入 ===
    yearlyIncome += sideIncomeMonthly * 12;
    yearlyIncome += dividendYearly;
    yearlyIncome += rentalYearly;
    yearlyIncome += pensionNowMonthly * 12;
    yearlyIncome += giftYearly;

    // 投資用不動産の家賃収入
    if (investPropertyValue > 0 && investYield > 0) {
      yearlyIncome += investPropertyValue * investYield * investOccupancy;
    }

    // === 老後の調整 ===
    if (a >= pensionStart) {
      // 年金開始後: ユーザー指定の老後生活費があればそれを優先、なければ現役支出85%
      if (retireLifestyle > 0) {
        yearlyExpense = retireLifestyle * 12 + medicalYearly + travelYearly;
      } else {
        yearlyExpense = yearlyExpense * 0.85;
      }
    }

    // === ローン返済 ===
    // 住宅ローン
    if (housingLoanYearsRemaining > 0) {
      const annualPay = housingLoanMonthly * 12;
      // 変動金利の場合 5年後・10年後に金利上乗せ想定
      let effectiveRate = housingLoanRate || 0.015;
      if (housingLoanType === 'variable' || housingLoanType === 'fixed_period') {
        if (yearsFromNow >= 5 && yearsFromNow < 10) effectiveRate += 0.005;
        else if (yearsFromNow >= 10) effectiveRate += 0.01;
      }
      const interestPaid = housingLoanRemaining * effectiveRate;
      const principalPaid = Math.max(0, annualPay - interestPaid);
      housingLoanRemaining = Math.max(0, housingLoanRemaining - principalPaid);
      // 月次返済は支出には含めない(初期資産から既に差し引いているので)→ 利息分のみ実質コスト
      yearlyExpense += interestPaid;
      housingLoanYearsRemaining--;
    }

    // 学生ローン: 残期間中は月額を支出に加算、残高は別途減算
    if (studentLoanYears > 0 && yearsFromNow < studentLoanYears) {
      // 月返済は元利合計なので、利息分を expense、元本分を残高から(初期残高は既に控除済みのため、ここでは何もしない)
      // → 単純化: 学生ローン月額は支出に計上しない(初期資産から既に控除)
    }

    // 自動車ローン
    if (carLoanRemaining > 0 && carLoanMonthly > 0) {
      const carPay = Math.min(carLoanRemaining, carLoanMonthly * 12);
      carLoanRemaining -= carPay;
      // 月次返済は支出計上(初期から控除されているので二重計上を防ぐため、ここはコメントアウト風だが新規購入扱いとして expense に加算)
      // simplification: 車ローン月額の利息相当(2%)のみ加算
      yearlyExpense += carLoanRemaining * 0.02;
    }

    // 自動車買替
    if (carReplaceCycle > 0 && yearsFromNow > 0 && yearsFromNow % carReplaceCycle === 0) {
      assets -= carReplaceCost;
      event = (event ? event + '+' : '') + '車買替';
    }

    // 車メンテ・車検
    yearlyExpense += carMaintenanceYearly;

    // === 結婚 ===
    if (marriageAge > 0 && a === marriageAge) {
      assets -= ESTIMATES.events.marriage;
      event = (event ? event + '+' : '') + '結婚';
    }

    // === 出産・教育費 ===
    for (let i = 0; i < childCount; i++) {
      const birthYear = childFirstBirth + i * 2;
      const childAge = a - (birthYear - (currentYear - age));
      if (childAge === 0) {
        assets -= ESTIMATES.events.childBirth;
        event = (event ? event + '+' : '') + '出産';
      } else if (childAge >= 6 && childAge <= 22) {
        yearlyExpense += ESTIMATES.events.eduPerYear * eduMultiplier;
        // 塾費用は小中高(6-18歳)に加算
        if (childAge >= 6 && childAge <= 18) {
          yearlyExpense += jukuYearly;
        }
      }
    }

    // === 住宅購入 ===
    if (homeBuyAge > 0 && a === homeBuyAge) {
      assets -= homeBuyDownPay;
      event = (event ? event + '+' : '') + '住宅頭金' + Math.round(homeBuyDownPay) + '万';
    }

    // === 失業 ===
    if (unemploymentEvents.includes(a)) {
      assets -= ESTIMATES.events.unemployment / unemploymentEvents.length;
      event = (event ? event + '+' : '') + '失業期待値';
    }

    // === 親介護 ===
    if (parentCareEvents.includes(a) && totalParentCare > 0) {
      assets -= totalParentCare / parentCareEvents.length;
      event = (event ? event + '+' : '') + '親介護';
    }

    // === 自分介護 ===
    // 75歳が寿命未満ならそこで、そうでなければ寿命-5歳で計上
    const selfCareAge = lifespan >= 75 ? 75 : Math.max(age + 1, lifespan - 5);
    if (a === selfCareAge) {
      assets -= selfCare;
      event = (event ? event + '+' : '') + '本人介護';
    }

    // === 離婚 ===
    if (divorceAge > 0 && a === divorceAge) {
      assets *= ESTIMATES.events.divorcePenalty;
      event = (event ? event + '+' : '') + '離婚(資産分割)';
    }

    // === 一時金収入(現在年に1回) ===
    if (a === age && oneTimeIncome > 0) {
      assets += oneTimeIncome;
      event = (event ? event + '+' : '') + '一時金';
    }
    if (a === age && giftInheritReceived > 0) {
      assets += giftInheritReceived;
      event = (event ? event + '+' : '') + '贈与相続済';
    }

    // === 相続予定 ===
    if (inhExpectedAmount > 0 && inhExpectedAge > 0 && a === inhExpectedAge) {
      assets += inhExpectedAmount;
      event = (event ? event + '+' : '') + '相続' + Math.round(inhExpectedAmount) + '万';
    }

    // === 葬儀 ===
    if (a === lifespan) {
      assets -= ESTIMATES.events.funeral;
    }

    // === 投資リターン(年初資産にかける → 複利順序修正) ===
    const liquidAssetsForReturn = Math.max(0, assets - homeValue - investPropertyValue);  // 不動産除く
    const investmentReturn =
      liquidAssetsForReturn * stockRatio * finalExpectedReturn +
      liquidAssetsForReturn * (1 - stockRatio) * ESTIMATES.depositReturn;

    // 負債期間の機会損失: 資産がマイナスならその分の利息コストを計上
    let debtCost = 0;
    if (assets < 0) {
      debtCost = Math.abs(assets) * ESTIMATES.loanInterestCostRate;
    }

    // === NISA / iDeCo 積立 ===
    // 月額積立そのものは手取り→貯蓄の流れの中で yearlySaving に含まれる(二重計上回避)。
    // iDeCo は所得控除があるので、節税効果(限界税率20%概算)のみ income に上乗せ
    const idecoActive = a < Math.min(retireAge, 60) && idecoMonthly > 0;
    const idecoAnnual = idecoActive ? idecoMonthly * 12 : 0;
    const idecoTaxSavings = idecoAnnual * 0.20;
    yearlyIncome += idecoTaxSavings;

    // === What-If 月貯蓄上乗せ ===
    const extraSavingsAnnual = extraSavingsMonthly * 12;

    const yearlySaving = yearlyIncome - yearlyExpense + extraSavingsAnnual;
    assets += yearlySaving + investmentReturn - debtCost;

    series.push({
      age: a,
      assets,
      income: yearlyIncome,
      expense: yearlyExpense,
      saving: yearlySaving,
      event,
    });
  }

  return series;
}

export function getKeyMetrics(series: YearPoint[]) {
  const at65 = series.find(p => p.age === 65) || series.find(p => p.age === 64);
  const last = series[series.length - 1];
  const minPoint = series.reduce((m, p) => (p.assets < m.assets ? p : m), series[0]);
  // 初めて資産がマイナスに転落する年齢(なければ null)。「底をつく」表示はこちらを使う
  const zeroCross = series.find(p => p.assets < 0);
  return {
    assetsAt65: at65?.assets || 0,
    assetsAtLast: last?.assets || 0,
    lastAge: last?.age || 0,
    minAssets: minPoint.assets,
    minAge: minPoint.age,
    depletionAge: zeroCross ? zeroCross.age : null,
  };
}

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

/**
 * 万円単位の数値を「¥1,234万」「¥1.23億」「¥-300万」形式に整形。
 * 符号付き(プラス記号は付けない)、通貨記号と単位を内包する。
 */
export function formatMan(n: number): string {
  if (n == null || isNaN(n)) return '¥0万';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 10000) return `${sign}¥${(abs / 10000).toFixed(2)}億`;
  return `${sign}¥${Math.round(abs).toLocaleString()}万`;
}

export interface MonteCarloResult {
  trials: number;
  successProbability: number;
  median: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  worstFinal: number;
  bestFinal: number;
}

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
  returnStd: number = 0.05
): MonteCarloResult {
  const baseReturn = num(baseAnswers.ai_expected_return, 0.015);
  const finals: number[] = [];
  let successCount = 0;

  for (let i = 0; i < trials; i++) {
    // ±3σ クリッピングで分布対称性を保つ
    const sampledReturn = Math.max(baseReturn - 3 * returnStd, Math.min(baseReturn + 3 * returnStd, randNormal(baseReturn, returnStd)));
    const trialAnswers = { ...baseAnswers, ai_expected_return: sampledReturn };
    const series = simulateFromAnswers(trialAnswers);
    const final = series[series.length - 1].assets;
    finals.push(final);
    // 寿命時の最終資産で成功判定(中間の一時マイナスは許容)
    if (final >= 0) successCount++;
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
