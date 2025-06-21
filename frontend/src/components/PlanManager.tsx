import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaFileImport, FaFileExport, FaPlus, FaSave, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Icon from './Icon';
import { Plan } from '../types';

interface PlanManagerProps {
  plans: Plan[];
  activePlanId: string | null;
  activePlan: Plan | undefined;
  onSelectPlan: (id: string) => void;
  onSavePlan: () => void;
  onNewPlan: () => void;
  onUpdatePlanName: (name: string) => void;
  onDeletePlan: (id: string) => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  loading: boolean;
}

const PlanManager: React.FC<PlanManagerProps> = ({
  plans,
  activePlanId,
  activePlan,
  onSelectPlan,
  onSavePlan,
  onNewPlan,
  onUpdatePlanName,
  onDeletePlan,
  onImport,
  onExport,
  loading,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(activePlan?.planName || "");

  useEffect(() => {
    if (activePlan) {
      setEditingName(activePlan.planName);
    }
  }, [activePlan]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNameUpdate = () => {
    if (editingName.trim() && activePlan && editingName.trim() !== activePlan.planName) {
      onUpdatePlanName(editingName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div className="space-y-4 rounded-lg border bg-white p-4 shadow-md">
      {/* --- プラン選択・編集エリア --- */}
      <div>
        <label htmlFor="plan-name" className="mb-1 block text-sm font-medium text-slate-700">
          現在のプラン
        </label>
        <div className="flex items-center space-x-2">
          {/* プラン名表示・編集 / ドロップダウン */}
          <div className="relative w-full" ref={dropdownRef}>
            {isEditingName ? (
              <input
                id="plan-name-edit"
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleNameUpdate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameUpdate();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                className="block w-full rounded-md border border-sky-500 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-sky-500 sm:text-sm"
                autoFocus
                disabled={loading}
              />
            ) : (
              <div
                className="block w-full cursor-pointer rounded-md border border-slate-300 bg-white py-2 px-3 shadow-sm sm:text-sm"
                onClick={() => setIsEditingName(true)}
              >
                {activePlan?.planName || 'プラン名'}
              </div>
            )}
            {/* ドロップダウンボタン */}
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 hover:text-sky-600"
              aria-label="Select a plan"
            >
              <Icon as={FaChevronDown} />
            </button>
            {/* ドロップダウンメニュー */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectPlan(p.id);
                      setIsDropdownOpen(false);
                      setIsEditingName(false);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                  >
                    {p.planName}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* 削除ボタン */}
          <button
            onClick={() => activePlanId && onDeletePlan(activePlanId)}
            disabled={!activePlanId || loading || plans.length <= 1}
            className="rounded-md p-2 text-slate-500 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-500"
            aria-label="Delete Plan"
          >
            <Icon as={FaTrash} />
          </button>
        </div>
      </div>

      {/* --- 操作ボタンエリア --- */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            onSavePlan();
            toast.success('現在の内容を保存しました！');
          }}
          disabled={loading}
          className="flex h-10 items-center justify-center rounded-lg bg-sky-600 px-4 font-semibold text-white shadow-md hover:bg-sky-700 disabled:opacity-50"
        >
          <Icon as={FaSave} className="mr-2" />
          <span>保存</span>
        </button>
        <button
          onClick={() => onNewPlan()}
          disabled={loading}
          className="flex h-10 items-center justify-center rounded-lg bg-green-500 px-4 font-semibold text-white shadow-sm hover:bg-green-600 disabled:opacity-50"
        >
          <Icon as={FaPlus} className="mr-2" />
          <span>新規</span>
        </button>
        <input type="file" accept=".json,.csv" onChange={onImport} className="hidden" ref={importInputRef} />
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className="flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          disabled={loading}
        >
          <Icon as={FaFileImport} className="mr-2" />
          <span>インポート</span>
        </button>
        <button
          type="button"
          onClick={onExport}
          className="flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          disabled={loading}
        >
          <Icon as={FaFileExport} className="mr-2" />
          <span>エクスポート</span>
        </button>
      </div>
    </div>
  );
};

export default PlanManager; 
 