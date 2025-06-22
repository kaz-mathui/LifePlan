import React, { useState, useRef, useEffect } from 'react';
import { PlanListItem } from '../types';
import { useAuth } from '../hooks/useAuth';
import Icon from './Icon';
import { FaPlus, FaSave, FaTrash, FaSignOutAlt, FaFileExport, FaFileImport, FaChevronDown } from 'react-icons/fa';

interface PlanManagerProps {
  plans: PlanListItem[];
  currentPlanId: string | null;
  planName: string;
  onSelectPlan: (id: string) => void;
  onNewPlan: () => void;
  onSavePlan: () => void;
  onDeletePlan: (id: string) => void;
  onPlanNameChange: (name: string) => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
}

const PlanManager: React.FC<PlanManagerProps> = ({
  plans,
  currentPlanId,
  planName,
  onSelectPlan,
  onNewPlan,
  onSavePlan,
  onDeletePlan,
  onPlanNameChange,
  onExport,
  onImport,
  loading,
}) => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNewPlan = () => {
    onNewPlan();
    setIsOpen(false);
  };

  const handleSavePlan = () => {
    console.log('保存ボタンがクリックされました');
    console.log('現在のプラン名:', planName);
    console.log('プラン名が空かどうか:', !planName.trim());
    onSavePlan();
    setIsOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        <span>プラン管理</span>
        <Icon as={FaChevronDown} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''} w-4 h-4`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          <div className="bg-gray-50 text-gray-800 p-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold whitespace-nowrap text-gray-700">プラン:</h2>
              <button
                onClick={handleNewPlan}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                新規作成
              </button>
            </div>
            <input
              type="text"
              value={planName}
              onChange={(e) => onPlanNameChange(e.target.value)}
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="プラン名を入力"
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
                  currentPlanId === plan.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => onSelectPlan(plan.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-800">{plan.planName}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(plan.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePlan(plan.id);
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Icon as={FaTrash} className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-2">
              <button
                onClick={handleSavePlan}
                disabled={!planName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                保存
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanManager;
