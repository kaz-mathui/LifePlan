/**
 * シナリオツアー: ユーザーの answers から「人生の分岐点候補」を動的生成。
 *
 * 各シナリオは:
 * - condition: answers がこの条件を満たす時のみ提案
 * - modifications: 適用時に answers をどう書き換えるか
 * - score: 提案優先度(インパクト × 興味度)
 */

import type { ScenarioCategory } from './scenarioTypes';

export interface TourScenario {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  category: ScenarioCategory;
  rationale: string;
  impactHint: 'high' | 'medium' | 'low';
  condition: (a: Record<string, any>) => boolean;
  modifications: (a: Record<string, any>) => Record<string, any>;
}

const num = (v: any, d = 0): number => {
  const n = parseFloat(v);
  return isNaN(n) ? d : n;
};

export const ALL_SCENARIOS: TourScenario[] = [
  {
    id: 'marriage',
    title: 'もし3年後に結婚していたら',
    subtitle: '配偶者の年収400万・年金10万を世帯に加える',
    icon: '💍',
    category: 'family',
    rationale: 'まだ結婚の予定が立っていないため、もしものシナリオを提示します',
    impactHint: 'high',
    condition: a => {
      const s = a.sp_status;
      return s === 'none' || s === 'dating';
    },
    modifications: a => ({
      sp_status: 'married',
      sp_age: num(a.b_age, 30),
      sp_income: 400,
      sp_job: 'regular',
      sp_retire_age: 65,
      sp_pension_estimate: 10,
      sp_marry_plan_year: 3,
    }),
  },
  {
    id: 'fire',
    title: 'もし55歳でFIRE していたら',
    subtitle: '退職10年早めて、月15万のパート収入で繋ぐ',
    icon: '🌴',
    category: 'career',
    rationale: '退職年齢が60歳以降のため、早期FIREシナリオで影響を試算',
    impactHint: 'high',
    condition: a => num(a.r_retire_age, 65) >= 60,
    modifications: () => ({
      r_retire_age: 55,
      r_retire_post_work: 'part',
      r_retire_partial_income: 15,
    }),
  },
  {
    id: 'home_buy',
    title: 'もし40歳で家を買ったら',
    subtitle: '4500万の物件を購入(頭金20%)',
    icon: '🏡',
    category: 'housing',
    rationale: '賃貸 & 住宅購入予定なしのため、購入シナリオを試算',
    impactHint: 'high',
    condition: a => a.eh_type === 'rent' && !num(a.le_home_buy_plan_age, 0),
    modifications: a => ({
      le_home_buy_plan_age: Math.max(num(a.b_age, 30) + 5, 40),
      le_home_target_value: 4500,
    }),
  },
  {
    id: 'risk_invest',
    title: 'もしリターンを実質4%に上げたら',
    subtitle: '株式比率を70%に、期待リターン4%(実質)',
    icon: '📈',
    category: 'investment',
    rationale: '現在の期待リターンが控えめ。リスクを取った場合の効果を試算',
    impactHint: 'high',
    condition: a => num(a.ai_expected_return, 0.015) < 0.04,
    modifications: () => ({
      ai_expected_return: 0.04,
      ai_alloc_stock_pct: 70,
    }),
  },
  {
    id: 'nisa_max',
    title: 'もし月10万を投資積立に追加したら',
    subtitle: 'NISA枠を活用して月10万を投資へ',
    icon: '💎',
    category: 'investment',
    rationale: 'NISA積立額が少なめ。月10万を投資に回した場合',
    impactHint: 'medium',
    condition: a => num(a.ai_nisa_monthly, 0) < 5,
    modifications: () => ({
      ai_nisa_monthly: 10,
      _whatif_extra_savings_monthly: 10,  // 月10万を実際に貯蓄プールに加算
    }),
  },
  {
    id: 'side_income',
    title: 'もし月5万の副業があったら',
    subtitle: 'スキル副業で月5万の継続収入',
    icon: '💼',
    category: 'career',
    rationale: '副業収入が少ないため、副業を始めた効果を試算',
    impactHint: 'medium',
    condition: a => num(a.io_side_income, 0) < 3,
    modifications: () => ({
      io_side_income: 5,
    }),
  },
  {
    id: 'independence',
    title: 'もし5年後に独立していたら',
    subtitle: '会社員から自営業に。年収-5%、リスク上昇',
    icon: '🚀',
    category: 'career',
    rationale: '独立予定なし。事業立ち上げシナリオを試算',
    impactHint: 'medium',
    condition: a => !a.cr_independence_plan || a.cr_independence_plan === 'none',
    modifications: () => ({
      cr_independence_plan: '5y',
    }),
  },
  {
    id: 'career_up',
    title: 'もし3年後に転職で年収+150万になったら',
    subtitle: 'キャリアアップで年収ステップアップ',
    icon: '🎯',
    category: 'career',
    rationale: '転職予定なし。市場価値を活かしたキャリアアップを試算',
    impactHint: 'medium',
    condition: a => !a.cr_career_change_plan || a.cr_career_change_plan === 'none',
    modifications: () => ({
      cr_career_change_plan: '3y',
      cr_career_change_income_change: 150,
    }),
  },
  {
    id: 'sp_career',
    title: 'もし配偶者の年収が+100万になったら',
    subtitle: '配偶者がキャリアアップ・フルタイム継続で年収増',
    icon: '👫',
    category: 'family',
    rationale: '配偶者の収入をさらに伸ばした場合の世帯影響',
    impactHint: 'high',
    condition: a => {
      const hasSp = a.sp_status === 'married' || a.sp_status === 'cohab';
      return hasSp && num(a.sp_income, 0) < 600;
    },
    modifications: a => ({
      sp_income: num(a.sp_income, 350) + 100,
      sp_work_style_change_plan: 'same',
    }),
  },
  {
    id: 'inheritance',
    title: 'もし1000万の相続があったら',
    subtitle: '55歳時に1000万円の相続を受ける',
    icon: '🎁',
    category: 'lifeevent',
    rationale: '相続予定額の入力がないため、典型ケースを試算',
    impactHint: 'medium',
    condition: a => !num(a.inh_expected_amount, 0),
    modifications: a => ({
      inh_expected_amount: 1000,
      inh_expected_age: Math.max(num(a.b_age, 30) + 5, 55),
    }),
  },
  {
    id: 'rent_down',
    title: 'もし家賃を2万下げたら',
    subtitle: '家賃の見直しで毎月2万円の節約',
    icon: '🏠',
    category: 'housing',
    rationale: '住居費が手取り比率で高め。引越し・交渉で削減した場合',
    impactHint: 'medium',
    condition: a => {
      const rent = num(a.eh_monthly, 0);
      const income = num(a.is_annual_income, 500);
      return a.eh_type === 'rent' && rent / (income * 0.79 / 12) > 0.25;
    },
    modifications: a => ({
      eh_monthly: Math.max(0, num(a.eh_monthly, 10) - 2),
    }),
  },
  {
    id: 'kids',
    title: 'もし2人の子供を授かったら',
    subtitle: '子供の教育費を試算 (現役で2人)',
    icon: '👶',
    category: 'family',
    rationale: '子供の予定はあるが具体的でないため、典型2人シナリオで試算',
    impactHint: 'high',
    condition: a => a.c_has_or_plan === 'planning' && !num(a.c_count_plan, 0),
    modifications: a => ({
      c_count_plan: 2,
      c_first_birth_year: 2026 + 3,
      c_edu_plan: 'mixed',
    }),
  },
];

/**
 * answers から該当条件を満たすシナリオを最大 maxCount 枚選出。
 * インパクト → カテゴリ多様性 で選ぶ。
 */
export function selectTourScenarios(
  answers: Record<string, any>,
  maxCount = 5
): TourScenario[] {
  const candidates = ALL_SCENARIOS.filter(s => s.condition(answers));

  // スコア: high=3, medium=2, low=1
  const impactScore = { high: 3, medium: 2, low: 1 };
  candidates.sort((a, b) =>
    impactScore[b.impactHint] - impactScore[a.impactHint]
  );

  // カテゴリ多様化: 同じカテゴリ連続を避ける
  const selected: TourScenario[] = [];
  const categoryCount: Record<string, number> = {};
  for (const s of candidates) {
    const cnt = categoryCount[s.category] || 0;
    if (cnt >= 2) continue;  // 同カテゴリは2枚まで
    selected.push(s);
    categoryCount[s.category] = cnt + 1;
    if (selected.length >= maxCount) break;
  }

  return selected;
}
