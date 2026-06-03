import React, { useMemo, useState } from 'react';
import { simulateFromAnswers, getKeyMetrics, getWeatherScores, formatMan, runMonteCarlo } from './simulator';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import WhatIfControls, { SCENARIOS, ScenarioKey } from './WhatIf';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);

interface ForecastProps {
  answers: Record<string, any>;
  compact?: boolean;
}

const Forecast: React.FC<ForecastProps> = ({ answers, compact }) => {
  // ベース系列(常に元の answers)
  const baseSeries = useMemo(() => simulateFromAnswers(answers), [answers]);
  const baseMetrics = useMemo(() => getKeyMetrics(baseSeries), [baseSeries]);
  const weather = useMemo(() => getWeatherScores(baseSeries), [baseSeries]);

  // What-if 状態: 全シナリオの値を一括管理
  const baseValues = useMemo(() => {
    const r = {} as Record<ScenarioKey, number>;
    SCENARIOS.forEach(s => { r[s.key] = s.baseValueFromAnswers(answers); });
    return r;
  }, [answers]);

  const ranges = useMemo(() => {
    const r = {} as Record<ScenarioKey, { min: number; max: number }>;
    SCENARIOS.forEach(s => { r[s.key] = s.rangeFromAnswers(answers); });
    return r;
  }, [answers]);

  const [values, setValues] = useState<Record<ScenarioKey, number>>(baseValues);

  // baseValues が変わったら values をリセット(answersが変わった時)
  React.useEffect(() => {
    setValues(baseValues);
  }, [baseValues]);

  const handleValueChange = (k: ScenarioKey, v: number) => {
    setValues(prev => ({ ...prev, [k]: v }));
  };
  const handleResetAll = () => setValues(baseValues);

  const isModified = SCENARIOS.some(s => Math.abs(values[s.key] - baseValues[s.key]) > 1e-6);

  // 全シナリオを順次適用して合成 modifiedAnswers
  const modifiedAnswers = useMemo(() => {
    let merged = { ...answers };
    SCENARIOS.forEach(s => {
      if (Math.abs(values[s.key] - baseValues[s.key]) > 1e-6) {
        merged = s.applyToAnswers(merged, values[s.key]);
      }
    });
    return merged;
  }, [answers, values, baseValues]);

  const modSeries = useMemo(() => simulateFromAnswers(modifiedAnswers), [modifiedAnswers]);
  const modMetrics = useMemo(() => getKeyMetrics(modSeries), [modSeries]);

  // 表示用 metrics: 変更時は modified、それ以外は base
  const metrics = isModified ? modMetrics : baseMetrics;
  const diff65 = modMetrics.assetsAt65 - baseMetrics.assetsAt65;
  const diffLast = modMetrics.assetsAtLast - baseMetrics.assetsAtLast;
  const diffMin = modMetrics.minAssets - baseMetrics.minAssets;
  const diff65Pct = baseMetrics.assetsAt65 !== 0
    ? (diff65 / Math.abs(baseMetrics.assetsAt65)) * 100 : 0;

  const chartData = useMemo(() => {
    const datasets: any[] = [];
    // 変更がある時のみベースを「変更前」点線で表示
    if (isModified) {
      datasets.push({
        label: '変更前',
        data: baseSeries.map(p => Math.round(p.assets)),
        borderColor: '#9ca3af',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        fill: false,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
      });
    }
    // メイン線(変更時は modified、未変更時は base そのまま)
    datasets.push({
      label: isModified ? '変更後' : '資産推計(万円)',
      data: (isModified ? modSeries : baseSeries).map(p => Math.round(p.assets)),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.12)',
      fill: true,
      tension: 0.3,
      pointRadius: (ctx: any) => {
        const s = isModified ? modSeries : baseSeries;
        const age = s[ctx.dataIndex]?.age;
        const evt = s[ctx.dataIndex]?.event;
        return evt ? 5 : (age === 65 ? 4 : 0);
      },
      pointBackgroundColor: '#1e3a8a',
      borderWidth: 2.5,
    });
    return {
      labels: baseSeries.map(p => p.age + '歳'),
      datasets,
    };
  }, [baseSeries, modSeries, isModified]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: isModified,
        position: 'top' as const,
        labels: { boxWidth: 12, font: { size: 10 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${formatMan(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { ticks: { maxTicksLimit: 8, font: { size: 10 } } },
      y: {
        ticks: {
          callback: (v: any) => v >= 10000 ? (v / 10000).toFixed(1) + '億' : v.toLocaleString() + '万',
          font: { size: 10 },
        },
      },
    },
  };

  return (
    <div className="space-y-3">
      {/* ヒーロー: 4天気スコア */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">{weather.overall.icon}</span>
          <div>
            <div className="text-xs opacity-75 font-bold uppercase tracking-wider">あなたの未来の天気</div>
            <div className="text-2xl font-extrabold">{weather.overall.label}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/10 rounded-lg p-2">
            <div className="opacity-75">老後資金</div>
            <div className="font-bold">{weather.retire.icon} {weather.retire.label}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-2">
            <div className="opacity-75">寿命まで</div>
            <div className="font-bold">{weather.lifespan.icon} {weather.lifespan.label}</div>
          </div>
        </div>
      </div>

      {/* 主要数値(WhatIf 連動・デルタ表示) */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="65歳時の資産"
          value={metrics.assetsAt65}
          delta={isModified ? diff65 : 0}
          showDelta={isModified}
        />
        <MetricCard
          label={`${metrics.lastAge}歳時の資産`}
          value={metrics.assetsAtLast}
          delta={isModified ? diffLast : 0}
          showDelta={isModified}
        />
        {!compact && (
          <>
            <MetricCard
              label="谷の深さ"
              value={metrics.minAssets}
              sub={`${metrics.minAge}歳時`}
              delta={isModified ? diffMin : 0}
              showDelta={isModified}
            />
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="text-xs text-gray-500 font-semibold">谷スコア</div>
              <div className="text-xl font-extrabold mt-1">{weather.valley.icon}</div>
              <div className="text-[10px] text-gray-500 mt-1">{weather.valley.label}</div>
            </div>
          </>
        )}
      </div>

      {/* グラフ + What-if コントロール(物理的にすぐ下に配置で因果が明示) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-bold text-gray-900">資産推移(現在の物価価値)</div>
          {isModified && (
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
              {SCENARIOS.filter(s => Math.abs(values[s.key] - baseValues[s.key]) > 1e-6).length}つのシナリオ適用中
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 mb-3">いまから{metrics.lastAge}歳までの推計</div>
        <div style={{ height: 240 }}>
          <Line data={chartData} options={chartOptions} />
        </div>
        {!compact && (
          <div className="mt-3 text-[10px] text-gray-400">
            ※ 全て現在の物価価値で表示。詳細精度を上げるほど予測は正確になります。
          </div>
        )}
      </div>

      {/* What-if コントロール(グラフ直下) */}
      {!compact && (
        <WhatIfControls
          values={values}
          baseValues={baseValues}
          ranges={ranges}
          onValueChange={handleValueChange}
          diff65={diff65}
          diffLast={diffLast}
          diff65Pct={diff65Pct}
          lastAge={metrics.lastAge}
          isModified={isModified}
          onResetAll={handleResetAll}
        />
      )}

      {/* イベント一覧 */}
      {!compact && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="text-sm font-bold text-gray-900 mb-2">主要イベント</div>
          <div className="space-y-1">
            {baseSeries.filter(p => p.event).slice(0, 8).map((p, i) => (
              <div key={i} className="flex justify-between text-xs py-1 border-b border-gray-100 last:border-none">
                <span className="text-gray-700">{p.age}歳 — {p.event}</span>
                <span className="font-bold text-gray-900">{formatMan(p.assets)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monte Carlo */}
      {!compact && <MonteCarloPanel answers={answers} />}
    </div>
  );
};

const MetricCard: React.FC<{
  label: string; value: number; sub?: string;
  delta: number; showDelta: boolean;
}> = ({ label, value, sub, delta, showDelta }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-3">
    <div className="text-xs text-gray-500 font-semibold">{label}</div>
    <div className={`text-xl font-extrabold mt-1 ${value >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
      {formatMan(value)}
    </div>
    {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    {showDelta && Math.abs(delta) > 0.5 && (
      <div className={`text-[11px] font-bold mt-0.5 ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {delta >= 0 ? '▲' : '▼'} {formatMan(Math.abs(delta))}
      </div>
    )}
  </div>
);

/** Monte Carlo シミュレーション結果パネル */
const MonteCarloPanel: React.FC<{ answers: Record<string, any> }> = ({ answers }) => {
  const result = useMemo(() => runMonteCarlo(answers, 200), [answers]);
  const probColor =
    result.successProbability >= 0.9 ? 'text-green-600' :
    result.successProbability >= 0.7 ? 'text-blue-600' :
    result.successProbability >= 0.5 ? 'text-yellow-600' :
    'text-red-600';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="text-sm font-bold text-gray-900 mb-1">🎲 Monte Carlo シミュ</div>
      <div className="text-xs text-gray-500 mb-3">投資リターンを200回ランダム試行</div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 mb-3 text-center">
        <div className="text-xs text-gray-600 font-semibold mb-1">寿命まで資金が持つ確率</div>
        <div className={`text-4xl font-extrabold ${probColor}`}>
          {Math.round(result.successProbability * 100)}%
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="font-bold text-gray-700">最終資産の分布:</div>
        <div className="flex justify-between py-1 border-b border-gray-100">
          <span className="text-gray-600">悲観(下位10%)</span>
          <span className="font-bold">{formatMan(result.p10)}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-gray-100">
          <span className="text-gray-600">保守(下位25%)</span>
          <span className="font-bold">{formatMan(result.p25)}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-gray-100">
          <span className="font-semibold text-gray-700">中央値</span>
          <span className="font-extrabold text-blue-600">{formatMan(result.median)}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-gray-100">
          <span className="text-gray-600">楽観(上位25%)</span>
          <span className="font-bold">{formatMan(result.p75)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-gray-600">最良(上位10%)</span>
          <span className="font-bold">{formatMan(result.p90)}</span>
        </div>
      </div>

      <div className="mt-3 text-[10px] text-gray-500 leading-relaxed">
        ※ 投資リターンを平均{((parseFloat(answers.ai_expected_return) || 0.015) * 100).toFixed(1)}%・標準偏差5%の正規分布で揺らした200試行。一度でも資産がマイナスになったケースを「失敗」とカウント。
      </div>
    </div>
  );
};

export default Forecast;
