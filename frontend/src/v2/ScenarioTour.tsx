/**
 * シナリオツアー: 人生の分岐点候補をタロット風カードでめくる体験
 *
 * フロー:
 *   1. オープニング: "N個の分岐点を見つけました"
 *   2. カード 1/N: タイトル + 説明 → タップでめくる
 *   3. 裏面: グラフ + 65歳資産変化 → 採用/棄却/保留
 *   4. 次のカードへ
 *   5. サマリー: 採用合算の最終予測 vs ベース
 *   6. "現実に反映" or "戻る"
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

type Decision = 'adopt' | 'reject' | 'pending';
type Phase = 'opening' | 'card' | 'summary';

const ScenarioTour: React.FC<Props> = ({ answers, onClose, onApplyToReality }) => {
  const scenarios = useMemo(() => selectTourScenarios(answers, 5), [answers]);
  const [phase, setPhase] = useState<Phase>('opening');
  const [step, setStep] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  const baseSeries = useMemo(() => simulateFromAnswers(answers), [answers]);
  const baseMetrics = useMemo(() => getKeyMetrics(baseSeries), [baseSeries]);

  // 全シナリオの個別予測 (採用前計算)
  const scenarioMetrics = useMemo(() => {
    const map: Record<string, ReturnType<typeof getKeyMetrics>> = {};
    for (const s of scenarios) {
      const modified = { ...answers, ...s.modifications(answers) };
      map[s.id] = getKeyMetrics(simulateFromAnswers(modified));
    }
    return map;
  }, [scenarios, answers]);

  // 採用したシナリオを全部合成した最終 answers / metrics
  const adoptedAnswers = useMemo(() => {
    let merged = { ...answers };
    for (const s of scenarios) {
      if (decisions[s.id] === 'adopt') {
        merged = { ...merged, ...s.modifications(merged) };
      }
    }
    return merged;
  }, [decisions, scenarios, answers]);
  const finalSeries = useMemo(() => simulateFromAnswers(adoptedAnswers), [adoptedAnswers]);
  const finalMetrics = useMemo(() => getKeyMetrics(finalSeries), [finalSeries]);

  if (scenarios.length === 0) {
    return (
      <FullscreenContainer onClose={onClose}>
        <div className="text-center px-6 py-12">
          <div className="text-5xl mb-3">🎴</div>
          <div className="text-lg font-bold mb-2">分岐点が見つかりませんでした</div>
          <div className="text-sm text-gray-500 mb-6">
            すでに多くの選択が確定しているようです。質問をもう少し埋めるか、別のプランで試してみてください。
          </div>
          <button onClick={onClose} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold">
            戻る
          </button>
        </div>
      </FullscreenContainer>
    );
  }

  // === Opening ===
  if (phase === 'opening') {
    return (
      <FullscreenContainer onClose={onClose}>
        <div className="text-center px-6 py-12 max-w-md mx-auto">
          <div className="text-6xl mb-4 animate-pulse">🎴</div>
          <div className="text-xl font-extrabold mb-2 text-gray-900">
            あなたの人生に <span className="text-blue-600">{scenarios.length}つ</span> の分岐点を見つけました
          </div>
          <div className="text-sm text-gray-500 mb-8 leading-relaxed">
            これらは「もしXXしていたら」という、まだ選んでいない未来の選択肢です。<br/>
            1枚ずつめくって、自分の戦略を考えてみてください。
          </div>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {scenarios.map((s, i) => (
              <div key={s.id} className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-1.5 text-xs font-bold">
                <span>{s.icon}</span>
                <span className="text-gray-700">{s.category}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setPhase('card')}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-extrabold text-base shadow-lg"
          >
            ✨ 最初のカードをめくる
          </button>
          <button onClick={onClose} className="mt-3 text-xs text-gray-500 underline">
            あとで読む
          </button>
        </div>
      </FullscreenContainer>
    );
  }

  // === Summary ===
  if (phase === 'summary') {
    const adoptedCount = scenarios.filter(s => decisions[s.id] === 'adopt').length;
    const diff65 = finalMetrics.assetsAt65 - baseMetrics.assetsAt65;
    const diff65Pct = baseMetrics.assetsAt65 !== 0
      ? (diff65 / Math.abs(baseMetrics.assetsAt65)) * 100 : 0;

    const chartData = {
      labels: baseSeries.map(p => p.age + '歳'),
      datasets: [
        {
          label: '現状のまま',
          data: baseSeries.map(p => Math.round(p.assets)),
          borderColor: '#9ca3af',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: '採用シナリオ反映',
          data: finalSeries.map(p => Math.round(p.assets)),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          borderWidth: 2.5,
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

    return (
      <FullscreenContainer onClose={onClose}>
        <div className="px-4 py-6 max-w-md mx-auto pb-24">
          <div className="text-center mb-5">
            <div className="text-4xl mb-2">🎉</div>
            <div className="text-lg font-extrabold text-gray-900">ツアー完了</div>
            <div className="text-xs text-gray-500 mt-1">
              {adoptedCount} つのシナリオを採用しました
            </div>
          </div>

          {/* 大型差分カード */}
          <div className={`rounded-2xl p-5 mb-4 ${diff65 >= 0 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'} text-white shadow-lg`}>
            <div className="text-xs font-bold opacity-90 mb-1">65歳時の資産変化</div>
            <div className="text-3xl font-extrabold">
              {diff65 >= 0 ? '+' : ''}{formatMan(diff65)}
            </div>
            <div className="text-sm font-bold opacity-95 mt-1">
              {diff65 >= 0 ? '+' : ''}{diff65Pct.toFixed(1)}% (現状比)
            </div>
            <div className="text-[10px] opacity-80 mt-2">
              現状: {formatMan(baseMetrics.assetsAt65)} → 採用後: {formatMan(finalMetrics.assetsAt65)}
            </div>
          </div>

          {/* グラフ */}
          <div className="bg-white border border-gray-200 rounded-2xl p-3 mb-4" style={{ height: 220 }}>
            <Line data={chartData} options={chartOptions} />
          </div>

          {/* 採用カード一覧 */}
          {adoptedCount > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
              <div className="text-xs font-bold text-gray-700 mb-2">採用したシナリオ</div>
              <div className="space-y-2">
                {scenarios.filter(s => decisions[s.id] === 'adopt').map(s => {
                  const m = scenarioMetrics[s.id];
                  const d = m.assetsAt65 - baseMetrics.assetsAt65;
                  return (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      <span className="text-lg">{s.icon}</span>
                      <div className="flex-1">
                        <div className="font-bold text-gray-800 leading-tight">{s.title}</div>
                      </div>
                      <span className={`font-extrabold ${d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {d >= 0 ? '+' : ''}{formatMan(d)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="space-y-2 fixed bottom-0 left-0 right-0 px-4 py-3 bg-white border-t border-gray-200">
            {adoptedCount > 0 && (
              <button
                onClick={() => {
                  // 採用シナリオの modifications を全部マージして反映
                  let merged: Record<string, any> = {};
                  for (const s of scenarios) {
                    if (decisions[s.id] === 'adopt') {
                      merged = { ...merged, ...s.modifications({ ...answers, ...merged }) };
                    }
                  }
                  onApplyToReality(merged);
                  onClose();
                }}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-extrabold text-sm shadow"
              >
                💾 採用した戦略を反映する
              </button>
            )}
            <button onClick={onClose} className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-sm">
              戻る
            </button>
          </div>
        </div>
      </FullscreenContainer>
    );
  }

  // === Card ===
  const scenario = scenarios[step];
  const metrics = scenarioMetrics[scenario.id];
  const diff = metrics.assetsAt65 - baseMetrics.assetsAt65;
  const diffPct = baseMetrics.assetsAt65 !== 0
    ? (diff / Math.abs(baseMetrics.assetsAt65)) * 100 : 0;
  const isLast = step === scenarios.length - 1;

  const goNext = (decision: Decision) => {
    setDecisions(prev => ({ ...prev, [scenario.id]: decision }));
    setFlipped(false);
    if (isLast) {
      setPhase('summary');
    } else {
      setStep(step + 1);
    }
  };

  // ミニグラフ
  const modSeries = useMemo(() => simulateFromAnswers({ ...answers, ...scenario.modifications(answers) }), [scenario, answers]);
  const cardChartData = {
    labels: baseSeries.map(p => p.age + '歳'),
    datasets: [
      {
        label: '現状',
        data: baseSeries.map(p => Math.round(p.assets)),
        borderColor: '#9ca3af',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        fill: false, tension: 0.3, pointRadius: 0, borderWidth: 2,
      },
      {
        label: 'もしも',
        data: modSeries.map(p => Math.round(p.assets)),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2.5,
      },
    ],
  };
  const cardChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { maxTicksLimit: 5, font: { size: 8 } } },
      y: { ticks: { callback: (v: any) => v >= 10000 ? (v / 10000).toFixed(1) + '億' : v.toLocaleString() + '万', font: { size: 8 } } },
    },
  };

  return (
    <FullscreenContainer onClose={onClose}>
      <div className="px-4 py-4 max-w-md mx-auto pb-24">
        {/* 進捗 */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={onClose} className="text-xs text-gray-500 underline">中断</button>
          <div className="flex items-center gap-1">
            {scenarios.map((s, i) => {
              const d = decisions[s.id];
              return (
                <span
                  key={s.id}
                  className={`block h-1.5 rounded-full transition-all ${
                    i === step ? 'bg-blue-600 w-6' :
                    d === 'adopt' ? 'bg-green-500 w-3' :
                    d === 'reject' ? 'bg-gray-400 w-3' :
                    d === 'pending' ? 'bg-amber-400 w-3' :
                    'bg-gray-200 w-3'
                  }`}
                />
              );
            })}
          </div>
          <span className="text-xs font-bold text-gray-500">{step + 1}/{scenarios.length}</span>
        </div>

        {/* カード */}
        {!flipped ? (
          // 表面: タイトル + 説明
          <div
            onClick={() => setFlipped(true)}
            className="relative bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-700 text-white rounded-3xl p-8 shadow-2xl cursor-pointer min-h-[420px] flex flex-col justify-between active:scale-[0.98] transition-transform"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-bold opacity-75 uppercase tracking-widest">{scenario.category}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  scenario.impactHint === 'high' ? 'bg-red-400/30' :
                  scenario.impactHint === 'medium' ? 'bg-yellow-400/30' : 'bg-gray-400/30'
                }`}>
                  impact: {scenario.impactHint}
                </span>
              </div>
              <div className="text-7xl text-center mb-6">{scenario.icon}</div>
              <div className="text-2xl font-extrabold text-center mb-3 leading-tight">
                {scenario.title}
              </div>
              <div className="text-sm text-center opacity-90 leading-relaxed">
                {scenario.subtitle}
              </div>
            </div>
            <div className="text-center text-xs font-bold opacity-80 mt-6">
              👆 タップしてめくる
            </div>
          </div>
        ) : (
          // 裏面: グラフ + 数値 + 判断
          <div className="bg-white rounded-3xl p-5 shadow-2xl min-h-[420px] border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{scenario.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-extrabold text-gray-900 leading-tight">{scenario.title}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{scenario.rationale}</div>
              </div>
            </div>

            {/* 大型数値 */}
            <div className={`rounded-2xl p-4 mb-3 text-center ${diff >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">65歳資産の変化</div>
              <div className={`text-3xl font-extrabold mt-1 ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {diff >= 0 ? '+' : ''}{formatMan(diff)}
              </div>
              <div className={`text-xs font-bold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {diff >= 0 ? '+' : ''}{diffPct.toFixed(1)}%
              </div>
            </div>

            {/* ミニグラフ */}
            <div style={{ height: 130 }} className="mb-4">
              <Line data={cardChartData} options={cardChartOptions} />
            </div>

            {/* 採用 / 棄却 / 保留 */}
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => goNext('reject')} className="py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs">
                ❌ 棄却
              </button>
              <button onClick={() => goNext('pending')} className="py-3 bg-amber-100 text-amber-700 rounded-xl font-bold text-xs">
                🤔 保留
              </button>
              <button onClick={() => goNext('adopt')} className="py-3 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl font-extrabold text-xs shadow">
                ✓ 採用
              </button>
            </div>
          </div>
        )}
      </div>
    </FullscreenContainer>
  );
};

const FullscreenContainer: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children }) => (
  <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-900 via-indigo-950 to-purple-950 overflow-y-auto">
    <div className="min-h-screen flex flex-col">
      {children}
    </div>
  </div>
);

export default ScenarioTour;
