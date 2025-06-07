import React, { useState, useEffect, useCallback } from 'react';
import { db } from './services/firebase';
import { useAuth } from './hooks/useAuth';
import { usePlanData } from './hooks/usePlanData';
import { SimulationInputData, LifeEvent } from './types';
import { calculateSimulation } from './services/simulationService';
import InputForm from './components/InputForm';
import SimulationResult from './components/SimulationResult';
import Auth from './components/Auth';
import PlanManager from './components/PlanManager';
import LifeEventForm from './components/LifeEventForm';
import { Toaster, toast } from 'react-hot-toast';
import { initialSimulationInput } from './constants';

const App: React.FC = () => {
  const { user } = useAuth();
  const {
    plans,
    selectedPlanId,
    setSelectedPlanId,
    fetchPlans,
    savePlan,
    deletePlan,
    createNewPlan,
    isSaving
  } = usePlanData(user);

  const [simulationInput, setSimulationInput] = useState<SimulationInputData>(initialSimulationInput);
  const [isLifeEventModalOpen, setLifeEventModalOpen] = useState(false);

  const handleCreateNewPlan = useCallback(async () => {
    const newPlanId = await createNewPlan();
    if (newPlanId) {
      setSelectedPlanId(newPlanId);
      setSimulationInput(initialSimulationInput);
    }
  }, [createNewPlan, setSelectedPlanId]);

  useEffect(() => {
    if (user && selectedPlanId) {
      const selectedPlan = plans.find(p => p.id === selectedPlanId);
      if (selectedPlan && selectedPlan.data) {
        setSimulationInput(selectedPlan.data);
      } else if (plans.length > 0) {
        // フォールバックとして最新のプランをセット
        const latestPlan = plans[0];
        setSimulationInput(latestPlan.data);
        setSelectedPlanId(latestPlan.id);
      }
    } else if (user && plans.length === 0 && !isSaving) {
       handleCreateNewPlan();
    }
  }, [user, plans, selectedPlanId, setSelectedPlanId, handleCreateNewPlan, isSaving]);


  useEffect(() => {
    if (user) {
      fetchPlans();
    }
  }, [user, fetchPlans]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!simulationInput) return;
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    setSimulationInput(prev => ({ ...prev!, [name]: processedValue }));
  };

  const handleNestedInputChange = (section: keyof SimulationInputData, field: string, value: any) => {
    if (!simulationInput) return;
    setSimulationInput(prev => ({
      ...prev!,
      [section]: {
        ...prev![section],
        [field]: value,
      },
    }));
  };

  const handleChildrenChange = (index: number, field: string, value: any) => {
    if (!simulationInput) return;
    const newChildren = [...simulationInput.education.children];
    newChildren[index] = { ...newChildren[index], [field]: value };
    setSimulationInput(prev => ({
      ...prev!,
      education: {
        ...prev!.education,
        children: newChildren,
      },
    }));
  };

  const handleAddChild = () => {
    if (!simulationInput) return;
    const newChild = { birthYear: new Date().getFullYear(), plan: 'public' };
    setSimulationInput(prev => ({
      ...prev!,
      education: {
        ...prev!.education,
        children: [...prev!.education.children, newChild],
      },
    }));
  };

  const handleRemoveChild = (index: number) => {
    if (!simulationInput) return;
    const newChildren = simulationInput.education.children.filter((_, i) => i !== index);
    setSimulationInput(prev => ({
      ...prev!,
      education: {
        ...prev!.education,
        children: newChildren,
      },
    }));
  };


  const handleSavePlan = async () => {
    if (user && simulationInput) {
      const result = await savePlan(selectedPlanId, { ...simulationInput });
      if (result.success) {
        toast.success('プランを保存しました！');
        fetchPlans();
      } else {
        toast.error(`保存に失敗しました: ${result.error}`);
      }
    }
  };

  const handleUpdateLifeEvent = (updatedLifeEvents: LifeEvent[]) => {
    if (simulationInput) {
      const updatedInput = { ...simulationInput, lifeEvents: updatedLifeEvents };
      setSimulationInput(updatedInput);
      if (user && selectedPlanId) {
        savePlan(selectedPlanId, updatedInput); // ライフイベント更新時も自動保存
      }
    }
  };

  // シミュレーション結果の計算
  const simulationResult = simulationInput ? calculateSimulation(simulationInput, simulationInput.lifeEvents) : null;

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen text-xl">認証情報を読み込み中...</div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col items-center p-4 sm:p-8 font-inter">
      <Toaster position="top-center" reverseOrder={false} />
      <header className="w-full max-w-5xl mb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-sky-800 tracking-tight">ライフプランシミュレーター</h1>
        <p className="mt-3 text-lg text-slate-600">あなたの未来の家計を、分かりやすく予測します。</p>
        {user && <p className="text-xs text-slate-500 mt-2">UserID: {user.uid}</p>}
      </header>

      {!user ? (
        <Auth />
      ) : (
        <div className="w-full max-w-5xl bg-white p-4 sm:p-8 rounded-2xl shadow-xl">
          <div className="flex justify-between items-start mb-6">
            <p className="text-sm text-slate-600 leading-tight">
              ようこそ、<br/>
              <span className="font-semibold text-base">{user.isAnonymous ? 'ゲスト' : user.displayName || user.email || 'ユーザー'}</span> さん
            </p>
            <button
              onClick={() => {}}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition duration-150 text-sm font-semibold"
            >
              ログアウト
            </button>
          </div>

          <PlanManager 
            savedPlans={plans}
            currentPlanId={selectedPlanId}
            onSelectPlan={setSelectedPlanId}
            onDeletePlan={deletePlan}
            onCreateNewPlan={handleCreateNewPlan}
          />

          <InputForm
            input={simulationInput}
            onInputChange={handleInputChange}
            onNestedChange={handleNestedInputChange}
            onChildrenChange={handleChildrenChange}
            onAddChild={handleAddChild}
            onRemoveChild={handleRemoveChild}
            onSubmit={() => {
                if(simulationInput) {
                    // ここで再計算のトリガーなど
                    toast.success("シミュレーションを再計算しました！");
                }
            }}
            onSave={handleSavePlan}
            loading={isSaving}
            onExport={() => { /* TODO: export logic */ }}
            onImport={(e) => { /* TODO: import logic */ }}
          />

          <LifeEventForm 
            lifeEvents={simulationInput?.lifeEvents || []}
            onLifeEventsChange={handleUpdateLifeEvent}
            currentAge={Number(simulationInput?.currentAge)}
            lifeExpectancy={Number(simulationInput?.lifeExpectancy)}
          />

          {simulationResult && (
            <div className="mt-8">
              <SimulationResult result={simulationResult} />
            </div>
          )}
        </div>
      )}
      <footer className="mt-16 mb-8 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} ライフプランニング App. All rights reserved.</p>
        <p className="text-xs mt-1">これはデモンストレーション用のアプリケーションです。シミュレーション結果は将来を保証するものではありません。</p>
      </footer>
    </div>
  );
};

export default App; 
