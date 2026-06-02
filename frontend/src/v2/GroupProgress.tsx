import React from 'react';
import { GROUPS, getGroupProgress } from '../data/questions';

interface GroupProgressProps {
  answers: Record<string, any>;
  onSelectGroup?: (groupKey: string) => void;
}

const GroupProgress: React.FC<GroupProgressProps> = ({ answers, onSelectGroup }) => {
  const progress = getGroupProgress(answers);

  return (
    <div className="space-y-2">
      {GROUPS.map(g => {
        const p = progress[g.key];
        const isDone = p.total > 0 && p.answered === p.total;
        return (
          <button
            key={g.key}
            onClick={() => onSelectGroup?.(g.key)}
            className="w-full bg-white border border-gray-200 rounded-xl p-3 hover:shadow-sm transition-shadow text-left"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{g.icon}</span>
              <span className="flex-1 font-bold text-sm text-gray-900">{g.label}</span>
              <span className="text-xs font-bold text-gray-700">
                {p.answered} / {p.total}
              </span>
              {isDone && <span className="text-green-600">✓</span>}
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isDone ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${p.percent}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default GroupProgress;
