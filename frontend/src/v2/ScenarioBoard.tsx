/**
 * シナリオボード: 「あり得た未来」をライブダッシュボードで一覧 + トグル
 *
 * デザイン原則:
 * - 上部に大型の「65歳資産」カウンター。トグル変更で即座に再計算してアニメ更新
 * - 中段にライブグラフ (現状 dashed vs 採用後 solid)
 * - 下にインパクト降順でシナリオリスト。各行にトグルスイッチ
 * - 採用するたび数字がジャンプアップ = ドーパミン
 */

import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { simulateFromAnswers, getKeyMetrics, formatMan } from './simulator';
import { selectTourScenarios, TourScenario } from './scenarios';

interface Props {
  answers: Record<string, any>;
  onClose: () => void;
  onApplyToReality: (updates: Record<string, any>) => void;
}

const ScenarioBoard: React.FC<Props> = ({ answers, onClose, onApplyToReality }) => {
  // 候補シナリオを最大8枚抽出(ボードなので多めOK)
  const scenarios = useMemo(() => selectTourScenarios(answers, 8), [answers]);

  // 各シナリオの単独効果を事前計算 → インパクト順にソート
  const baseSeries = useMemo(() => simulateFromAnswers(answers), [answers]);
  const baseMetrics = useMemo(() => getKeyMetrics(baseSeries), [baseSeries]);

  const scenarioImpacts = useMemo(() => {
    const r: { scenario: TourScenario; diff: number; pct: number }[] = [];
    for (const s of scenarios) {
      const mod = { ...answers, ...s.modifications(answers) };
      const m = getKeyMetrics(simulateFromAnswers(mod));
      const diff = m.assetsAt65 - baseMetrics.assetsAt65;
      const pct = baseMetrics.assetsAt65 !== 0 ? (diff / Math.abs(baseMetrics.assetsAt65)) * 100 : 0;
      r.push({ scenario: s, diff, pct });
    }
    // プラス効果が大きい順
    r.sort((a, b) => b.diff - a.diff);
    return r;
  }, [scenarios, answers, baseMetrics.assetsAt65]);

  // 採用中のシナリオ ID セット
  const [adopted, setAdopted] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setAdopted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // 採用シナリオを全部適用した最終予測
  const finalAnswers = useMemo(() => {
    let merged = { ...answers };
    for (const s of scenarios) {
      if (adopted.has(s.id)) {
        merged = { ...merged, ...s.modifications(merged) };
      }
    }
    return merged;
  }, [adopted, scenarios, answers]);
  const finalSeries = useMemo(() => simulateFromAnswers(finalAnswers), [finalAnswers]);
  const finalMetrics = useMemo(() => getKeyMetrics(finalSeries), [finalSeries]);
  const totalDiff = finalMetrics.assetsAt65 - baseMetrics.assetsAt65;
  const totalPct = baseMetrics.assetsAt65 !== 0
    ? (totalDiff / Math.abs(baseMetrics.assetsAt65)) * 100 : 0;

  // 最大プラス効果(進捗バーの母数として使う)
  const maxPossiblePlus = scenarioImpacts
    .filter(i => i.diff > 0)
    .reduce((sum, i) => sum + i.diff, 0);

  const chartData = {
    labels: baseSeries.map(p => p.age + '歳'),
    datasets: [
      {
        label: '現状のまま',
        data: baseSeries.map(p => Math.round(p.assets)),
        borderColor: '#9ca3af',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        fill: false, tension: 0.3, pointRadius: 0, borderWidth: 2,
      },
      {
        label: '採用シナリオ反映',
        data: finalSeries.map(p => Math.round(p.assets)),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.18)',
        fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2.5,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const, labels: { boxWidth: 12, font: { size: 10 } } },
      tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${formatMan(ctx.parsed.y)}` } },
    },
    scales: {
      x: { ticks: { maxTicksLimit: 6, font: { size: 9 } } },
      y: { ticks: { callback: (v: any) => v >= 10000 ? (v / 10000).toFixed(1) + '億' : v.toLocaleString() + '万', font: { size: 9 } } },
    },
  };

  if (scenarios.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
        <div className="text-center px-6 py-16">
          <div className="text-5xl mb-3">🌅</div>
          <div className="text-lg font-bold mb-2">分岐点が見つかりませんでした</div>
          <div className="text-sm text-gray-500 mb-6">
            すでに多くの選択が確定しているようです。
          </div>
          <button onClick={onClose} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold">
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-slate-50 to-blue-50 overflow-y-auto">
      <div className="max-w-md mx-auto pb-28">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button onClick={onClose} className="text-sm text-gray-700 font-bold">← 戻る</button>
          <div className="text-sm font-extrabold text-gray-900">🌅 もしも、の戦略ボード</div>
          <div className="text-xs font-bold text-gray-500">{adopted.size}/{scenarios.length}</div>
        </header>

        <div className="px-4 py-4 space-y-3">
          {/* 大型ライブカウンター */}
          <div className={`rounded-3xl p-5 shadow-lg transition-colors duration-300 ${
            totalDiff > 0 ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
            totalDiff < 0 ? 'bg-gradient-to-br from-rose-500 to-red-600' :
            'bg-gradient-to-br from-slate-700 to-slate-900'
          } text-white`}>
            <div className="text-[10px] font-bold opacity-90 uppercase tracking-widest">65歳時のあなた</div>
            <div className="flex items-baseline gap-3 mt-1">
              <div className="text-4xl font-extrabold tracking-tight tabular-nums">
                {formatMan(finalMetrics.assetsAt65)}
              </div>
              {adopted.size > 0 && (
                <div className="text-base font-extrabold opacity-95">
                  {totalDiff >= 0 ? '↑' : '↓'} {totalDiff >= 0 ? '+' : ''}{formatMan(totalDiff)}
                </div>
              )}
            </div>
            <div className="text-xs opacity-90 mt-1">
              {adopted.size === 0
                ? '何も採用してない現状'
                : `現状から ${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(1)}%・${adopted.size}つの戦略を採用中`}
            </div>

            {/* 進捗バー: 採用済み効果 / 最大可能効果 */}
            {maxPossiblePlus > 0 && (
              <div className="mt-3">
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, totalDiff / maxPossiblePlus * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] opacity-75 mt-1">
                  <span>採用中の効果</span>
                  <span>最大ポテンシャル {formatMan(maxPossiblePlus)}</span>
                </div>
              </div>
            )}
          </div>

          {/* ライブグラフ */}
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-200" style={{ height: 220 }}>
            <Line data={chartData} options={chartOptions} />
          </div>

          {/* シナリオリスト(インパクト降順) */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-gray-500 px-1 uppercase tracking-wider">
              ✨ 効果が大きい順
            </div>
            {scenarioImpacts.map(({ scenario, diff, pct }) => {
              const isAdopted = adopted.has(scenario.id);
              const isPositive = diff >= 0;
              return (
                <button
                  key={scenario.id}
                  onClick={() => toggle(scenario.id)}
                  className={`w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-[0.98] ${
                    isAdopted
                      ? (isPositive ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50')
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* アイコン + 効果額 */}
                    <div className="flex flex-col items-center gap-1 min-w-[68px]">
                      <div className="text-3xl">{scenario.icon}</div>
                      <div className={`text-sm font-extrabold tabular-nums ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isPositive ? '+' : ''}{formatMan(diff)}
                      </div>
                      <div className={`text-[10px] font-bold ${
                        isPositive ? 'text-green-600/80' : 'text-red-600/80'
                      }`}>
                        {isPositive ? '+' : ''}{pct.toFixed(1)}%
                      </div>
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-extrabold text-gray-900 leading-tight">{scenario.title}</div>
                      <div className="text-xs text-gray-600 mt-1 leading-relaxed">{scenario.subtitle}</div>
                      <div className="text-[10px] text-gray-500 mt-1 italic">{scenario.rationale}</div>
                    </div>

                    {/* トグル */}
                    <div className={`flex-shrink-0 w-12 h-7 rounded-full p-1 transition-colors ${
                      isAdopted ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        isAdopted ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 「採用おすすめ」ナビ */}
          {adopted.size === 0 && scenarioImpacts.length > 0 && scenarioImpacts[0].diff > 0 && (
            <div className="bg-amber-50 border-l-4 border-amber-400 rounded-xl p-3 text-xs text-amber-900">
              💡 まずは一番上の <strong>{scenarioImpacts[0].scenario.title}</strong> をタップしてみてください。
              {' '}65歳資産が <strong>+{formatMan(scenarioImpacts[0].diff)}</strong> 動きます。
            </div>
          )}
        </div>

        {/* 反映ボタン (固定) */}
        {adopted.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-white/95 backdrop-blur border-t border-gray-200">
            <div className="max-w-md mx-auto">
              <button
                onClick={() => {
                  let merged: Record<string, any> = {};
                  for (const s of scenarios) {
                    if (adopted.has(s.id)) {
                      merged = { ...merged, ...s.modifications({ ...answers, ...merged }) };
                    }
                  }
                  onApplyToReality(merged);
                  onClose();
                }}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-2xl font-extrabold text-sm shadow-lg"
              >
                💾 {adopted.size}つの戦略を本番プランに反映する
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioBoard;
