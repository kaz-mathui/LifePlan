import React, { useState } from 'react';
import { useV2PlanList, V2PlanListItem } from './useV2PlanList';

interface PlanSelectorProps {
  currentPlanId: string;
  onChange: (planId: string) => void;
}

const PlanSelector: React.FC<PlanSelectorProps> = ({ currentPlanId, onChange }) => {
  const { plans, createPlan, renamePlan, deletePlan } = useV2PlanList();
  const [showMenu, setShowMenu] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const current = plans.find(p => p.id === currentPlanId) || { id: currentPlanId, planName: 'メインプラン' };

  const handleNewPlan = async () => {
    const name = window.prompt('新しいプラン名(例: 結婚パターン)') || '';
    if (!name) return;
    const fromCurrent = window.confirm('現在のプランの内容を引き継ぎますか?\n(OK: 引き継ぐ / キャンセル: 空白から)');
    const newId = await createPlan(name, fromCurrent ? currentPlanId : undefined);
    if (newId) onChange(newId);
    setShowMenu(false);
  };

  const handleRenameStart = (p: V2PlanListItem) => {
    setRenaming(p.id);
    setRenameValue(p.planName);
  };

  const handleRenameCommit = async () => {
    if (renaming && renameValue.trim()) {
      await renamePlan(renaming, renameValue.trim());
    }
    setRenaming(null);
    setRenameValue('');
  };

  const handleDelete = async (planId: string, name: string) => {
    if (planId === 'default') { alert('メインプランは削除できません'); return; }
    if (!window.confirm(`「${name}」を削除します。よろしいですか?`)) return;
    await deletePlan(planId);
    if (planId === currentPlanId) onChange('default');
  };

  return (
    <>
      <button
        onClick={() => setShowMenu(true)}
        className="w-full bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between hover:shadow-sm transition-shadow"
      >
        <div className="text-left">
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">現在のプラン</div>
          <div className="text-sm font-bold text-gray-900 mt-0.5">{current.planName}</div>
        </div>
        <div className="text-xs text-blue-600 font-bold">変更 ▾</div>
      </button>

      {/* モーダル */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50" onClick={() => setShowMenu(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-xl p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-gray-900">プラン管理</h3>
              <button onClick={() => setShowMenu(false)} className="text-gray-400 text-xl">×</button>
            </div>

            <div className="space-y-2 mb-4">
              {plans.map(p => (
                <div key={p.id} className={`border rounded-xl p-3 ${p.id === currentPlanId ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  {renaming === p.id ? (
                    <div className="flex gap-2">
                      <input
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        autoFocus
                      />
                      <button onClick={handleRenameCommit} className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg">保存</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { onChange(p.id); setShowMenu(false); }}
                        className="flex-1 text-left"
                      >
                        <div className="text-sm font-bold text-gray-900">{p.planName}</div>
                        {p.id === currentPlanId && <div className="text-[10px] text-blue-600 font-bold mt-0.5">選択中</div>}
                      </button>
                      <button onClick={() => handleRenameStart(p)} className="text-xs text-gray-500 px-2 py-1">名前</button>
                      {p.id !== 'default' && (
                        <button onClick={() => handleDelete(p.id, p.planName)} className="text-xs text-red-500 px-2 py-1">削除</button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={handleNewPlan} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm">
              + 新しいプランを作る
            </button>
            <div className="text-[10px] text-gray-500 mt-2 text-center">
              「結婚パターン」「FIREパターン」など、比較用に複数プランを持てます
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlanSelector;
