import React from 'react';
import { PlanListItem } from '../types';

// App.tsxから渡されるプランの型 (App.tsxのsavedPlansステートの要素の型に合わせる)
// interface PlanListItem {
//   id: string;
//   planName: string;
//   updatedAt: string;
// }

interface PlanManagerProps {
  savedPlans: PlanListItem[];
  currentPlanId?: string; // 現在選択されているプランのID (オプショナル)
  onSelectPlan: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
  // onCreateNewPlan: () => void; // App.tsx側でボタンを持つので、必須ではない
}

const PlanManager: React.FC<PlanManagerProps> = ({ savedPlans, currentPlanId, onSelectPlan, onDeletePlan }) => {
  if (!savedPlans || savedPlans.length === 0) {
    return (
      <div className="mb-4 p-4 bg-slate-100 rounded-lg text-center">
        <p className="text-slate-600 text-sm">保存されているプランはありません。</p>
        {/* ここに「新しいプランを作成」ボタンを配置することも検討できるが、App.tsx側で統一的に持つ方が管理しやすいか */}
      </div>
    );
  }

  const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>, planId: string) => {
    e.stopPropagation(); // 親要素(プラン選択)のonClickイベントが発火しないようにする
    if (window.confirm('このプランを削除してもよろしいですか？元に戻すことはできません。')) {
      onDeletePlan(planId);
    }
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-slate-700 mb-3 border-b pb-2">保存済みプラン一覧</h3>
      <ul className="space-y-2 max-h-60 overflow-y-auto pr-2"> {/* スクロール可能にする */} 
        {savedPlans.map(plan => (
          <li key={plan.id} className="flex items-center justify-between p-1 rounded-lg hover:bg-slate-50 transition-colors duration-100
            ${plan.id === currentPlanId ? 'bg-sky-50' : '' }
          ">
            <button
              onClick={() => onSelectPlan(plan.id)}
              className={`flex-grow text-left px-3 py-2 rounded-md
                ${plan.id === currentPlanId 
                  ? 'text-sky-700 font-semibold' 
                  : 'text-slate-800'}
              `}
            >
              <div>
                {plan.planName || '名称未設定プラン'}
                {plan.id === currentPlanId && <span className="text-xs text-sky-600 ml-2">(編集中)</span>}
              </div>
              <div className="text-xs opacity-70">
                最終更新: {new Date(plan.updatedAt).toLocaleString()}
              </div>
            </button>
            <button 
              onClick={(e) => handleDeleteClick(e, plan.id)}
              className="ml-2 px-3 py-1 text-xs text-red-500 hover:text-red-700 border border-red-300 hover:bg-red-50 rounded-md transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-red-400"
              aria-label={`プラン「${plan.planName || '名称未設定プラン'}」を削除`}
            >
              削除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlanManager; 
