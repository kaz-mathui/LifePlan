/**
 * What-if コントロールパネル
 * グラフは持たない(Forecast 側に統合)。シナリオ選択 + スライダー + 差分カードのみ。
 */
import React from 'react';
import { formatMan } from './simulator';

export type ScenarioKey = 'savings' | 'retire_age' | 'return_rate' | 'rent';

export interface Scenario {
  key: ScenarioKey;
  label: string;
  icon: string;
  min: number; max: number; step: number;
  baseValueFromAnswers: (a: Record<string, any>) => number;
  applyToAnswers: (a: Record<string, any>, v: number) => Record<string, any>;
  unit: string;
  format: (v: number) => string;
}

export const SCENARIOS: Scenario[] = [
  {
    key: 'savings', label: '月の貯蓄を増やす', icon: '💰',
    min: 0, max: 30, step: 1, unit: '万円/月',
    format: v => `+${v}万`,
    baseValueFromAnswers: () => 0,
    applyToAnswers: (a, v) => {
      const income = parseFloat(a.is_annual_income) || 500;
      const baseSav = (parseFloat(a.is_savings_rate) || 20);
      const addPct = (v * 12) / income * 100;
      return { ...a, is_savings_rate: baseSav + addPct };
    },
  },
  {
    key: 'retire_age', label: '退職年齢を変える', icon: '🌴',
    min: 50, max: 80, step: 1, unit: '歳',
    format: v => `${v}歳`,
    baseValueFromAnswers: a => parseFloat(a.r_retire_age) || 65,
    applyToAnswers: (a, v) => ({ ...a, r_retire_age: v }),
  },
  {
    key: 'return_rate', label: '投資リターンを変える', icon: '📈',
    min: 0, max: 7, step: 0.5, unit: '%/年(実質)',
    format: v => `${v}%`,
    baseValueFromAnswers: a => (parseFloat(a.ai_expected_return) || 0.015) * 100,
    applyToAnswers: (a, v) => ({ ...a, ai_expected_return: v / 100 }),
  },
  {
    key: 'rent', label: '家賃を変える', icon: '🏠',
    min: 0, max: 30, step: 0.5, unit: '万円/月',
    format: v => `${v}万`,
    baseValueFromAnswers: a => parseFloat(a.eh_monthly) || 9,
    applyToAnswers: (a, v) => ({ ...a, eh_monthly: v }),
  },
];

interface WhatIfControlsProps {
  scenario: ScenarioKey;
  value: number;
  onScenarioChange: (k: ScenarioKey) => void;
  onValueChange: (v: number) => void;
  diff65: number;
  diffLast: number;
  lastAge: number;
  isModified: boolean;
  onReset: () => void;
}

const WhatIfControls: React.FC<WhatIfControlsProps> = ({
  scenario, value, onScenarioChange, onValueChange,
  diff65, diffLast, lastAge, isModified, onReset,
}) => {
  const current = SCENARIOS.find(s => s.key === scenario)!;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-bold text-gray-900">🎚 もしも、を試す</div>
        {isModified && (
          <button onClick={onReset} className="text-xs text-blue-600 font-bold">↺ リセット</button>
        )}
      </div>
      <div className="text-xs text-gray-500 mb-3">スライダーを動かすと上のグラフが変わります</div>

      {/* シナリオ選択 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {SCENARIOS.map(s => (
          <button
            key={s.key}
            onClick={() => onScenarioChange(s.key)}
            className={`text-xs font-bold py-2 px-2 rounded-lg ${scenario === s.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            <span className="block text-base mb-1">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* スライダー */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{current.min}{current.unit}</span>
          <span className="font-bold text-blue-600 text-base">{current.format(value)}</span>
          <span>{current.max}{current.unit}</span>
        </div>
        <input
          type="range"
          min={current.min} max={current.max} step={current.step}
          value={value}
          onChange={e => onValueChange(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Before / After 差分 */}
      {isModified && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">65歳時の変化</span>
            <span className={`text-base font-extrabold ${diff65 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {diff65 >= 0 ? '+' : ''}¥{formatMan(diff65)}万
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">{lastAge}歳時の変化</span>
            <span className={`text-sm font-bold ${diffLast >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {diffLast >= 0 ? '+' : ''}¥{formatMan(diffLast)}万
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatIfControls;
