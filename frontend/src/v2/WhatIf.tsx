/**
 * What-if コントロールパネル
 * - 複数シナリオを同時に適用可能(全シナリオの value を一括管理)
 * - 各スライダーの range は「現在値 ± 妥当幅」で動的に計算
 * - Forecast 側で値を集約 → 1本の modifiedAnswers にして再シミュ
 */
import React from 'react';
import { formatMan } from './simulator';

export type ScenarioKey = 'savings' | 'retire_age' | 'return_rate' | 'rent';

export interface Scenario {
  key: ScenarioKey;
  label: string;
  icon: string;
  unit: string;
  step: number;
  // current value at "base" (no modification)
  baseValueFromAnswers: (a: Record<string, any>) => number;
  // min/max を入力値に応じて動的計算
  rangeFromAnswers: (a: Record<string, any>) => { min: number; max: number };
  // current → modified answers
  applyToAnswers: (a: Record<string, any>, v: number) => Record<string, any>;
  format: (v: number) => string;
}

export const SCENARIOS: Scenario[] = [
  {
    key: 'savings', label: '月の貯蓄を増やす', icon: '💰', unit: '万円/月', step: 1,
    format: v => v > 0 ? `+${v}万` : v < 0 ? `${v}万` : '±0',
    baseValueFromAnswers: () => 0,
    rangeFromAnswers: a => {
      const income = parseFloat(a.is_annual_income) || 500;
      const maxBoost = Math.max(5, Math.round(income * 0.79 / 12 * 0.3)); // 手取りの30%まで
      return { min: -3, max: Math.min(30, maxBoost) };
    },
    applyToAnswers: (a, v) => ({ ...a, _whatif_extra_savings_monthly: v }),
  },
  {
    key: 'retire_age', label: '退職年齢', icon: '🌴', unit: '歳', step: 1,
    format: v => `${v}歳`,
    baseValueFromAnswers: a => parseFloat(a.r_retire_age) || 65,
    rangeFromAnswers: a => {
      const cur = parseFloat(a.r_retire_age) || 65;
      const age = parseFloat(a.b_age) || 30;
      return { min: Math.max(age, cur - 10, 50), max: Math.min(80, cur + 15) };
    },
    applyToAnswers: (a, v) => ({ ...a, r_retire_age: v }),
  },
  {
    key: 'return_rate', label: '投資リターン(実質)', icon: '📈', unit: '%', step: 0.5,
    format: v => `${v.toFixed(1)}%`,
    baseValueFromAnswers: a => (parseFloat(a.ai_expected_return) || 0.015) * 100,
    rangeFromAnswers: a => {
      const cur = (parseFloat(a.ai_expected_return) || 0.015) * 100;
      return { min: Math.max(-2, cur - 4), max: Math.min(10, cur + 4) };
    },
    applyToAnswers: (a, v) => ({ ...a, ai_expected_return: v / 100 }),
  },
  {
    key: 'rent', label: '住居費', icon: '🏠', unit: '万円/月', step: 0.5,
    format: v => `${v}万`,
    baseValueFromAnswers: a => parseFloat(a.eh_monthly) || 9,
    rangeFromAnswers: a => {
      const cur = parseFloat(a.eh_monthly) || 9;
      return { min: Math.max(0, cur - 5), max: cur * 2 || 20 };
    },
    applyToAnswers: (a, v) => ({ ...a, eh_monthly: v }),
  },
];

interface WhatIfControlsProps {
  values: Record<ScenarioKey, number>;
  baseValues: Record<ScenarioKey, number>;
  ranges: Record<ScenarioKey, { min: number; max: number }>;
  onValueChange: (key: ScenarioKey, v: number) => void;
  diff65: number;
  diffLast: number;
  diff65Pct: number;
  lastAge: number;
  isModified: boolean;
  onResetAll: () => void;
}

const WhatIfControls: React.FC<WhatIfControlsProps> = ({
  values, baseValues, ranges, onValueChange,
  diff65, diffLast, diff65Pct, lastAge, isModified, onResetAll,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-bold text-gray-900">🎚 もしも、を試す</div>
        {isModified && (
          <button onClick={onResetAll} className="text-xs text-blue-600 font-bold">↺ 全リセット</button>
        )}
      </div>
      <div className="text-xs text-gray-500 mb-3">複数同時に動かせます。上のグラフに即反映。</div>

      {/* 各シナリオを縦並びカードで */}
      <div className="space-y-3 mb-3">
        {SCENARIOS.map(s => {
          const value = values[s.key];
          const base = baseValues[s.key];
          const range = ranges[s.key];
          const changed = Math.abs(value - base) > 1e-6;
          return (
            <div key={s.key} className={`p-3 rounded-xl border ${changed ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <span className="text-sm">{s.icon}</span>
                  {s.label}
                </div>
                <div className="flex items-center gap-2">
                  {changed && (
                    <button
                      onClick={() => onValueChange(s.key, base)}
                      className="text-[10px] text-gray-500 underline"
                    >元に戻す</button>
                  )}
                  <span className={`text-sm font-extrabold ${changed ? 'text-blue-700' : 'text-gray-700'}`}>
                    {s.format(value)}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={range.min} max={range.max} step={s.step}
                value={value}
                onChange={e => onValueChange(s.key, parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>{s.format(range.min)}</span>
                <span className="text-gray-500">現在 {s.format(base)}</span>
                <span>{s.format(range.max)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Before / After 差分 */}
      {isModified && (
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-3">
          <div className="text-xs font-bold text-amber-900 mb-2">📊 上のシナリオすべて適用すると</div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-700">65歳時の資産</span>
            <div className="text-right">
              <div className={`text-base font-extrabold ${diff65 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {diff65 >= 0 ? '+' : ''}{formatMan(diff65)}
              </div>
              <div className={`text-[10px] font-bold ${diff65Pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {diff65Pct >= 0 ? '+' : ''}{diff65Pct.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-700">{lastAge}歳時の資産</span>
            <span className={`text-sm font-bold ${diffLast >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {diffLast >= 0 ? '+' : ''}{formatMan(diffLast)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatIfControls;
