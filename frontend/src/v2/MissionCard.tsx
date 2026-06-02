import React, { useState } from 'react';
import { QuestionDef } from '../data/questions';

interface MissionCardProps {
  question: QuestionDef;
  initialValue?: any;
  onSave: (key: string, value: any) => void;
  onSkip?: (key: string) => void;
  onUseEstimate?: (key: string) => void;
}

/**
 * 1問の質問を表示するカード。
 * - 数値・選択肢・boolean・テキスト・年齢に対応
 * - スキップ・統計値で埋めるオプション
 */
const MissionCard: React.FC<MissionCardProps> = ({
  question, initialValue, onSave, onSkip, onUseEstimate,
}) => {
  const hasAnswer = initialValue != null && initialValue !== '';
  const [value, setValue] = useState<any>(initialValue ?? '');
  const [editMode, setEditMode] = useState<boolean>(!hasAnswer);

  // initialValue が更新されたら state も同期(他端末で変更等)
  React.useEffect(() => {
    setValue(initialValue ?? '');
    setEditMode(initialValue == null || initialValue === '');
  }, [initialValue]);

  const handleSave = () => {
    if (value === '' || value == null) return;
    onSave(question.key, value);
    setEditMode(false);
  };

  // 表示用: 既回答時の値の人間表示
  const displayValue = () => {
    if (!hasAnswer) return null;
    if (question.type === 'select' && question.options) {
      const opt = question.options.find(o => String(o.value) === String(initialValue));
      return opt ? opt.label : String(initialValue);
    }
    if (question.type === 'boolean') return initialValue ? 'はい' : 'いいえ';
    if (question.unit) return `${initialValue}${question.unit}`;
    return String(initialValue);
  };

  const recallEffortLabel = {
    instant: '⚡ 即答',
    look_up: '🔍 調べる',
    estimate: '💭 推測',
  }[question.recallEffort || 'instant'];

  const priorityLabel = {
    essential: { text: '必須', color: 'bg-red-100 text-red-700' },
    recommended: { text: '推奨', color: 'bg-blue-100 text-blue-700' },
    optional: { text: '任意', color: 'bg-gray-100 text-gray-600' },
  }[question.priority];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3 text-xs">
        <span className={`px-2 py-1 rounded-full font-bold ${priorityLabel.color}`}>
          {priorityLabel.text}
        </span>
        <span className="text-gray-500">{recallEffortLabel}</span>
        {question.isCore && (
          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-bold">
            ⭐ コア
          </span>
        )}
      </div>

      <div className="text-base font-bold text-gray-900 mb-1 leading-relaxed">
        {question.question}
      </div>
      {question.helpText && editMode && (
        <div className="text-xs text-gray-500 mb-3 leading-relaxed">
          {question.helpText}
        </div>
      )}

      {/* 既回答プレビュー(編集モードでない時) */}
      {hasAnswer && !editMode && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-green-700 uppercase tracking-wider">回答済み</div>
            <div className="text-base font-extrabold text-green-900 mt-0.5 truncate">{displayValue()}</div>
          </div>
          <button
            onClick={() => setEditMode(true)}
            className="ml-3 px-4 py-2 bg-white text-green-700 border border-green-300 rounded-lg text-xs font-bold flex-shrink-0"
          >
            ✏️ 変更
          </button>
        </div>
      )}

      {/* 入力UI: 未回答 or 編集モード時のみ */}
      {editMode && (
      <div className="mb-4">
        {question.type === 'select' && question.options && (
          <select
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">選んでください</option>
            {question.options.map(opt => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {(question.type === 'number' || question.type === 'currency' || question.type === 'percent' || question.type === 'age') && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={value}
              onChange={e => setValue(e.target.value)}
              min={question.min}
              max={question.max}
              placeholder={question.placeholder || '数字を入力'}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-base text-right bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
            {question.unit && (
              <span className="text-sm text-gray-500 font-semibold whitespace-nowrap">
                {question.unit}
              </span>
            )}
          </div>
        )}

        {question.type === 'boolean' && (
          <div className="flex gap-2">
            <button
              onClick={() => setValue(true)}
              className={`flex-1 py-3 rounded-xl font-bold text-sm ${value === true ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              はい
            </button>
            <button
              onClick={() => setValue(false)}
              className={`flex-1 py-3 rounded-xl font-bold text-sm ${value === false ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              いいえ
            </button>
          </div>
        )}

        {question.type === 'text' && (
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={question.placeholder || ''}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none resize-none"
          />
        )}
      </div>
      )}

      {/* 操作ボタン: 編集モード時のみ */}
      {editMode && (
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={value === '' || value == null}
            className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm disabled:bg-gray-300 disabled:text-gray-500"
          >
            {hasAnswer ? '更新' : '保存'}
          </button>
          {hasAnswer && (
            <button
              onClick={() => { setValue(initialValue); setEditMode(false); }}
              className="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold text-xs"
            >
              キャンセル
            </button>
          )}
          {!hasAnswer && question.recallEffort !== 'instant' && onUseEstimate && (
            <button
              onClick={() => onUseEstimate(question.key)}
              className="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold text-xs"
            >
              分からない→推定
            </button>
          )}
          {!hasAnswer && onSkip && (
            <button
              onClick={() => onSkip(question.key)}
              className="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold text-xs"
            >
              あとで
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MissionCard;
