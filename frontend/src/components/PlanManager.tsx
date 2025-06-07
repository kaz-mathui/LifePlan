import React from 'react';
import { PlanListItem } from '../types';
import { FaPlus, FaTrash } from 'react-icons/fa';
import Icon from './Icon';

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
  onCreateNewPlan: () => void;
}

const PlanManager: React.FC<PlanManagerProps> = ({ savedPlans, currentPlanId, onSelectPlan, onDeletePlan, onCreateNewPlan }) => {

  const handleDeleteClick = () => {
    if (!currentPlanId) {
      alert("削除するプランが選択されていません。");
      return;
    }
    if (window.confirm(`現在編集中のプラン「${savedPlans.find(p => p.id === currentPlanId)?.planName || '無名のプラン'}」を削除してもよろしいですか？\nこの操作は元に戻せません。`)) {
      onDeletePlan(currentPlanId);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId) {
      onSelectPlan(selectedId);
    }
  };

  return (
    <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        {/* プラン選択ドロップダウン */}
        <div className="flex-grow">
          <label htmlFor="plan-select" className="block text-sm font-medium text-slate-700 mb-1">
            編集するプランを選択
          </label>
          <select
            id="plan-select"
            value={currentPlanId || ''}
            onChange={handleSelectChange}
            disabled={savedPlans.length === 0}
            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-base"
          >
            {savedPlans.length === 0 ? (
              <option value="">保存済みのプランはありません</option>
            ) : (
              savedPlans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.planName || '名称未設定プラン'}
                </option>
              ))
            )}
          </select>
        </div>
        
        {/* 操作ボタン */}
        <div className="flex items-center justify-end space-x-2 pt-2 sm:pt-6">
          <button
            onClick={onCreateNewPlan}
            className="flex items-center px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 transition duration-150 text-sm"
          >
            <Icon as={FaPlus} className="mr-2" />
            <span>新しいプラン</span>
          </button>
          <button 
            onClick={handleDeleteClick}
            disabled={!currentPlanId || savedPlans.length === 0}
            className="flex items-center px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 transition duration-150 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="現在選択中のプランを削除"
          >
            <Icon as={FaTrash} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default PlanManager; 
