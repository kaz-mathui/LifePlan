import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { auth } from './services/firebase';
import { useAuth } from './hooks/useAuth';
import { usePlanData } from './hooks/usePlanData';
import { SimulationInputData, LifeEvent, Child, BackendSimulationResult, HousingLoanData, CarData, EducationData } from './types';
import { calculateSimulation } from './services/simulationService';
import InputForm from './components/InputForm';
import SimulationResultDisplay from './components/SimulationResult';
import Auth from './components/Auth';
import PlanManager from './components/PlanManager';
import LifeEventForm from './components/LifeEventForm';
import { Toaster, toast } from 'react-hot-toast';
import { defaultInput, LOCAL_STORAGE_KEY } from './constants';
import { exportToCsv, importFromCsv } from './utils/csvUtils';
import { saveAs } from 'file-saver';

export type NestedSectionKey = 'housing' | 'education' | 'car' | 'senior';

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [simulationInput, setSimulationInput] = useState<SimulationInputData>(() => {
    try {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // Merge with default to ensure all keys, especially lifeEvents, exist
        return {
          ...defaultInput,
          ...parsed,
          housing: { ...defaultInput.housing, ...(parsed.housing || {}) },
          education: { ...defaultInput.education, ...(parsed.education || {}) },
          car: { ...defaultInput.car, ...(parsed.car || {}) },
          senior: { ...defaultInput.senior, ...(parsed.senior || {}) },
          lifeEvents: Array.isArray(parsed.lifeEvents) ? parsed.lifeEvents : [],
        };
      }
    } catch (error) {
      console.error("Error reading from local storage", error);
    }
    return defaultInput;
  });

  const {
    plans,
    activePlanId,
    loading: planLoading,
    handleSelectPlan,
    handleSavePlan,
    handleNewPlan,
    handleDeletePlan,
    handleUpdatePlanName,
  } = usePlanData(user, setSimulationInput);
  
  const [simulationResult, setSimulationResult] = useState<BackendSimulationResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(simulationInput));
  }, [simulationInput]);
  
  const activePlan = plans.find(p => p.id === activePlanId);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
    setSimulationInput(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleNestedInputChange = (section: NestedSectionKey, field: string, value: any) => {
    setSimulationInput(prev => {
        const newSectionData = { ...(prev[section] as object), [field]: value };
        if (section === 'housing') {
          const s = newSectionData as HousingLoanData;
          s.loanAmount = Math.max(0, Number(s.propertyValue) - Number(s.downPayment));
        } else if (section === 'car') {
           const c = newSectionData as CarData;
           c.loanAmount = Math.max(0, Number(c.price) - Number(c.downPayment));
        }
        return { ...prev, [section]: newSectionData };
    });
  };

  const handleLifeEventsChange = (updatedEvents: LifeEvent[]) => {
    setSimulationInput(prev => ({ ...prev, lifeEvents: updatedEvents }));
  };

  const handleAddLifeEvent = () => {
    setSimulationInput(prev => {
        const newEvent: LifeEvent = { 
          id: `event-${Date.now()}`,
          description: '新しいイベント', 
          type: 'expense',
          amount: 0,
          startAge: prev.currentAge || 30,
        };
        return { ...prev, lifeEvents: [...(prev.lifeEvents || []), newEvent] };
    });
  };

  const handleRemoveLifeEvent = (index: number) => {
    setSimulationInput(prev => ({
        ...prev,
        lifeEvents: (prev.lifeEvents || []).filter((_, i) => i !== index) 
    }));
  };

  const handleChildrenChange = (index: number, field: string, value: any) => {
    setSimulationInput(prev => {
      const children = [...(prev.education.children || [])];
      (children[index] as any)[field] = value;
      return { ...prev, education: { ...prev.education, children: children } };
    });
  };

  const handleAddChild = () => {
    setSimulationInput(prev => {
      const newChild: Child = { 
        birthYear: new Date().getFullYear(),
        plan: 'public' as const
      };
      const children = [...(prev.education.children || []), newChild];
      return { ...prev, education: { ...prev.education, children: children } };
    });
  };

  const handleRemoveChild = (index: number) => {
    setSimulationInput(prev => {
      const children = (prev.education.children || []).filter((_, i) => i !== index);
      return { ...prev, education: { ...prev.education, children: children } };
    });
  };
  
  const handleRunSimulation = () => {
    if (simulationInput) {
      const result = calculateSimulation(simulationInput);
      setSimulationResult(result);
      toast.success('シミュレーションを実行しました！');
    }
  };

  const handleCreateNewPlan = () => {
    const newPlanName = `新しいプラン ${plans.length + 1}`;
    const newPlanData = { ...defaultInput, planName: newPlanName };
    setSimulationInput(newPlanData);
    handleSelectPlan(null); // Deselect any active plan
    toast.success(`${newPlanName}を作成しました。`);
  };

  const handleExport = () => {
    const csvString = exportToCsv(simulationInput);
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${simulationInput.planName || 'lifeplan'}.csv`);
    toast.success('プランをCSVファイルに書き出しました。');
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvString = event.target?.result as string;
        const data = await importFromCsv(csvString);
        setSimulationInput(data);
        toast.success('プランを読み込みました！');
      } catch (error) {
        console.error("CSVのインポートに失敗しました:", error);
        toast.error("ファイルの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  useEffect(() => {
    if (simulationInput) {
      const result = calculateSimulation(simulationInput);
      setSimulationResult(result);
    }
  }, [simulationInput]);

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><p>認証情報を読み込んでいます...</p></div>;
  }
  if (!user) {
    return <div className="flex justify-center items-center min-h-screen bg-slate-50"><Auth auth={auth} /></div>;
  }
  if (planLoading) {
    return <div className="flex justify-center items-center h-screen"><p>プランを読み込んでいます...</p></div>;
  }
  
  return (
    <div className="min-h-screen bg-slate-100">
      <Toaster position="top-right" />
      <main className="mx-auto max-w-screen-xl p-4 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-8 space-y-6">
              <PlanManager
                plans={plans}
                activePlan={activePlan}
                activePlanId={activePlanId}
                onSelectPlan={handleSelectPlan}
                onSavePlan={() => handleSavePlan(simulationInput)}
                onNewPlan={handleNewPlan}
                onUpdatePlanName={handleUpdatePlanName}
                onDeletePlan={handleDeletePlan}
                onImport={handleImport}
                onExport={handleExport}
                loading={planLoading}
              />
              <div className="space-y-6">
                <InputForm
                  input={simulationInput}
                  onInputChange={handleInputChange}
                  onNestedChange={handleNestedInputChange}
                  onLifeEventChange={handleLifeEventsChange as any}
                  onAddLifeEvent={handleAddLifeEvent}
                  onRemoveLifeEvent={handleRemoveLifeEvent}
                  onChildrenChange={handleChildrenChange}
                  onAddChild={handleAddChild}
                  onRemoveChild={handleRemoveChild}
                />
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <LifeEventForm
                    lifeEvents={simulationInput.lifeEvents}
                    onLifeEventsChange={handleLifeEventsChange}
                    currentAge={simulationInput.currentAge}
                    lifeExpectancy={simulationInput.lifeExpectancy}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-3">
            <SimulationResultDisplay
              result={simulationResult}
              loading={isSaving}
              retirementAge={Number(simulationInput.retirementAge)}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App; 
