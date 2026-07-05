/**
 * アクションプラン: 「で、何をすべき？」に答えるセクション。
 *
 * scenarios.ts のシナリオのうち「自分で選べる打ち手」だけを対象に、
 * 適用時の65歳資産インパクトを実計算してカード表示する。
 * (ユーザーヒアリング2026-07-05: 5/5人が「アクションプラン欠落」をcritical指摘)
 */
import React, { useMemo } from 'react';
import { ALL_SCENARIOS } from './scenarios';
import { simulateFromAnswers, getKeyMetrics, formatMan, runMonteCarlo } from './simulator';

const num = (v: any, d = 0): number => {
  const n = parseFloat(v);
  return isNaN(n) ? d : n;
};

/** 「もし〜たら」ではなく命令形の打ち手ラベル。ここに載せた id だけがアクション扱い */
const ACTION_LABELS: Record<string, string> = {
  nisa_max: 'NISA積立を月10万に増額する',
  side_income: '月5万の副業を始める',
  rent_down: '家賃を2万円下げる',
  risk_invest: '株式比率70%・実質リターン4%に見直す',
  career_up: '3年後の転職で年収+150万を狙う',
  sp_career: '配偶者の年収+100万を後押しする',
  work_longer: '68歳まで働く(退職を3年延長)',
  cost_down: '生活費を月2万円見直す',
};

const probIcon = (p: number) =>
  p >= 0.85 ? '🟢' : p >= 0.6 ? '🟡' : p >= 0.4 ? '🟠' : '🔴';

interface ActionPlanProps {
  answers: Record<string, any>;
  baseAssetsAt65: number;
  baseSuccessProb: number;
  onOpenScenarioBoard?: () => void;
}

const ActionPlan: React.FC<ActionPlanProps> = ({ answers, baseAssetsAt65, baseSuccessProb, onOpenScenarioBoard }) => {
  const actions = useMemo(() => {
    return ALL_SCENARIOS
      .filter(s => ACTION_LABELS[s.id] && s.condition(answers))
      .map(s => {
        const modified = { ...answers, ...s.modifications(answers) };
        const m = getKeyMetrics(simulateFromAnswers(modified));
        return { scenario: s, delta65: m.assetsAt65 - baseAssetsAt65 };
      })
      .filter(x => x.delta65 > 10)  // 効果10万未満はノイズ扱い
      .sort((a, b) => b.delta65 - a.delta65)
      .slice(0, 3);
  }, [answers, baseAssetsAt65]);

  // 「全部やったらどこに着地するか」= 治療法の提示。表示中の施策を全て適用して再計算
  const combined = useMemo(() => {
    if (actions.length < 2) return null;
    let merged = { ...answers };
    actions.forEach(({ scenario }) => {
      merged = { ...merged, ...scenario.modifications(merged) };
    });
    const m = getKeyMetrics(simulateFromAnswers(merged));
    const mc = runMonteCarlo(merged, 200);
    return {
      assetsAt65: m.assetsAt65,
      depletionAge: m.depletionAge,
      prob: mc.successProbability,
    };
  }, [actions, answers]);

  if (actions.length === 0) return null;

  return (
    <div className="bg-white border-2 border-blue-200 rounded-2xl p-4">
      <div className="text-sm font-bold text-gray-900">🎯 アクションプラン</div>
      <div className="text-xs text-gray-500 mb-3">いま打てる手と、その効果(65歳時の資産)</div>

      <div className="space-y-2">
        {actions.map(({ scenario, delta65 }) => (
          <div key={scenario.id} className="flex items-center gap-3 bg-blue-50/60 rounded-xl p-3">
            <span className="text-2xl shrink-0">{scenario.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-gray-900 leading-tight">
                {ACTION_LABELS[scenario.id]}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{scenario.subtitle}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-extrabold text-green-600">+{formatMan(delta65)}</div>
              <div className="text-[9px] text-gray-400">65歳時</div>
            </div>
          </div>
        ))}
      </div>

      {/* 合算効果 = 「対策すればこうなる」という着地点。悪い判定を治療法で終わらせる */}
      {combined && (
        <div className="mt-3 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-300 rounded-xl p-3">
          <div className="text-xs font-extrabold text-green-900">
            💡 上の{actions.length}つをすべて実行した場合
          </div>
          <div className="mt-2 flex items-center justify-around text-center">
            <div>
              <div className="text-[10px] text-gray-500">寿命まで持つ確率</div>
              <div className="text-lg font-extrabold text-gray-900">
                {probIcon(baseSuccessProb)}{Math.round(baseSuccessProb * 100)}%
                <span className="text-gray-400 mx-1">→</span>
                {probIcon(combined.prob)}{Math.round(combined.prob * 100)}%
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-500">65歳時の資産</div>
              <div className="text-lg font-extrabold text-gray-900">{formatMan(combined.assetsAt65)}</div>
            </div>
          </div>
          <div className="mt-1.5 text-[10px] text-green-800 leading-relaxed">
            {combined.prob >= 0.6
              ? '✓ 打ち手を積み重ねれば、現実的に立て直せる水準です。'
              : combined.depletionAge != null
                ? `この3つでも${combined.depletionAge}歳ごろに不足が残ります。退職時期・生活費・住まいの見直しを戦略ボードで組み合わせましょう。`
                : '改善しますが、まだ余裕は薄めです。戦略ボードでさらに組み合わせを試しましょう。'}
          </div>
        </div>
      )}

      {onOpenScenarioBoard && (
        <button
          onClick={onOpenScenarioBoard}
          className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold active:scale-[0.98] transition-transform"
        >
          🌅 戦略ボードで組み合わせて試す →
        </button>
      )}
    </div>
  );
};

/**
 * 前提条件パネル: 計算の中身を開示して信頼を得る。
 * (ヒアリング#4: FP層は前提が見えないシミュレーターを信用しない)
 */
export const AssumptionsPanel: React.FC<{ answers: Record<string, any> }> = ({ answers }) => {
  const rows: Array<{ label: string; value: string; isDefault: boolean }> = [
    {
      label: '期待リターン(実質・年率)',
      value: `${(num(answers.ai_expected_return, 0.015) * 100).toFixed(1)}%`,
      isDefault: answers.ai_expected_return == null || answers.ai_expected_return === '',
    },
    {
      label: '退職年齢',
      value: `${num(answers.r_retire_age, 65)}歳`,
      isDefault: answers.r_retire_age == null || answers.r_retire_age === '',
    },
    {
      label: '年金の受給開始',
      value: `${num(answers.p_start_age, 65)}歳`,
      isDefault: answers.p_start_age == null || answers.p_start_age === '',
    },
    {
      label: '年金月額',
      value: answers.p_estimate_monthly
        ? `${num(answers.p_estimate_monthly)}万/月(入力値)`
        : '加入区分から自動推定',
      isDefault: !answers.p_estimate_monthly,
    },
    {
      label: '想定寿命(計画終了年齢)',
      value: `${num(answers.b_target_lifespan, 90)}歳`,
      isDefault: answers.b_target_lifespan == null || answers.b_target_lifespan === '',
    },
    {
      label: '物価',
      value: '全て現在の物価価値で表示',
      isDefault: false,
    },
    {
      label: 'Monte Carlo',
      value: 'リターンを±σ5%で200回試行',
      isDefault: false,
    },
  ];

  return (
    <details className="bg-white border border-gray-200 rounded-2xl">
      <summary className="p-4 text-sm font-bold text-gray-900 cursor-pointer select-none">
        🧮 計算の前提条件 <span className="text-[10px] font-normal text-gray-400 ml-1">タップで開く</span>
      </summary>
      <div className="px-4 pb-4">
        <div className="space-y-1">
          {rows.map((r, i) => (
            <div key={i} className="flex justify-between items-center text-xs py-1.5 border-b border-gray-100 last:border-none">
              <span className="text-gray-600">{r.label}</span>
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                {r.value}
                {r.isDefault && (
                  <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">既定値</span>
                )}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[10px] text-gray-500 leading-relaxed">
          「既定値」は該当の質問に答えるとあなたの値に置き換わります。上のWhat-ifスライダーで仮の変更を試すこともできます。
        </div>
      </div>
    </details>
  );
};

export default ActionPlan;
