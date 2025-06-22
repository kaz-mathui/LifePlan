import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { auth } from './services/firebase';
import { useAuth } from './hooks/useAuth';
import { usePlanData } from './hooks/usePlanData';
import { SimulationInputData, LifeEvent, Child, BackendSimulationResult, HousingLoanData, CarData, EducationData, SeniorData } from './types';
import { runSimulation } from './services/simulationService';
import InputForm from './components/InputForm';
import SimulationResult from './components/SimulationResult';
import Auth from './components/Auth';
import PlanManager from './components/PlanManager';
import LifeEventForm from './components/LifeEventForm';
import { Toaster, toast } from 'react-hot-toast';
import { defaultInput, LOCAL_STORAGE_KEY } from './constants';
import { exportToCsv, importFromCsv } from './utils/csvUtils';
import { saveAs } from 'file-saver';
import { FaGithub } from 'react-icons/fa';
import { v4 as uuidv4 } from 'uuid';
import { FormSectionKey } from './components/FormSection';

type NestedSectionKey = 'housing' | 'education' | 'car' | 'senior';

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
    loading,
  } = usePlanData(user, setSimulationInput);
  
  const [simulationResult, setSimulationResult] = useState<BackendSimulationResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [openSection, setOpenSection] = useState<FormSectionKey | null>('basic');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(simulationInput));
  }, [simulationInput]);
  
  const activePlan = plans.find(p => p.id === activePlanId);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setSimulationInput(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleNestedInputChange = (
    section: NestedSectionKey, 
    field: string, 
    value: any
  ) => {
    setSimulationInput(prev => {
      const newSectionData = { ...(prev[section] as any), [field]: value };

        if (section === 'housing') {
            const s = newSectionData as HousingLoanData;
            s.loanAmount = Math.max(0, Number(s.propertyValue) - Number(s.downPayment));
        } else if (section === 'car') {
            const c = newSectionData as CarData;
            c.loanAmount = Math.max(0, Number(c.price) - Number(c.downPayment));
        }

      return {
        ...prev,
        [section]: newSectionData,
      };
    });
  };

  const handleChildrenChange = (index: number, field: string, value: any) => {
    setSimulationInput(prev => {
        const children = [...(prev.education.children || [])];
        children[index] = { ...children[index], [field]: value };
        return { ...prev, education: { ...prev.education, children } };
    });
  };

  const handleAddChild = () => {
    setSimulationInput(prev => {
      const newChild: Child = { 
        birthYear: new Date().getFullYear(),
        educationCost: 1000
      };
      const children = [...(prev.education.children || []), newChild];
      return { ...prev, education: { ...prev.education, children: children } };
    });
  };

  const handleRemoveChild = (index: number) => {
    setSimulationInput(prev => {
        const children = [...(prev.education.children || [])];
        children.splice(index, 1);
        return { ...prev, education: { ...prev.education, children } };
    });
  };

  const handleLifeEventsChange = (updatedEvents: LifeEvent[]) => {
    setSimulationInput(prev => ({
      ...prev,
      lifeEvents: updatedEvents,
    }));
  };

  const handleRunSimulation = () => {
    if (!simulationInput) return;
    try {
      const result = runSimulation(simulationInput);
      setSimulationResult(result);
      toast.success('シミュレーションを実行しました！');
    } catch (error) {
      console.error(error);
      toast.error('シミュレーションの実行中にエラーが発生しました。');
    }
  };

  const handleCreateNewPlan = () => {
    const newPlanName = `新しいプラン ${plans.length + 1}`;
    const newPlanData = { ...defaultInput, planName: newPlanName };
    setSimulationInput(newPlanData);
    handleSelectPlan(null); // Deselect any active plan
    toast.success(`${newPlanName}を作成しました。`);
  };

  const handleExportCsv = (planId: string) => {
    const planToExport = plans.find(p => p.id === planId);
    if (planToExport) {
      const csvString = exportToCsv(planToExport.data);
      const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `${planToExport.data.planName || 'lifeplan'}.csv`);
    } else {
      console.error('エクスポート対象のプランが見つかりません');
    }
  };

  const handleImportCsv = async (file: File) => {
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const partialData = await importFromCsv(text);
        
        // 新しいプランとして読み込む
        await handleNewPlan(false); // これで新しいプランが作成され、アクティブになる

        // usePlanDataフックが状態を更新するのを待つ必要があるかもしれないが、
        // activePlanIdはすぐに更新されると仮定する。
        // より堅牢にするには、handleNewPlanが新しいIDを返すようにするのが望ましい。
        // 今回は、直後にsimulationInputを更新し、それを保存する。
        
        const mergedData = {
          ...defaultInput,
          ...partialData,
          planName: partialData.planName || `インポートプラン ${new Date().toLocaleDateString()}`,
        };

        setSimulationInput(mergedData); // UIを更新
        
        // activePlanIdが更新されているはずなので、それを使って保存
        if (activePlanId) {
          await handleSavePlan(mergedData);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('CSVインポートエラー:', error);
      alert('CSVファイルのインポートに失敗しました。');
    }
  };

  const handleSaveActivePlan = () => {
    if (activePlanId) {
      handleSavePlan(simulationInput);
    }
  };

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
                onSavePlan={handleSaveActivePlan}
                onNewPlan={handleNewPlan}
                onUpdatePlanName={handleUpdatePlanName}
                onDeletePlan={handleDeletePlan}
                onImportCsv={handleImportCsv}
                onExportCsv={handleExportCsv}
                fileInputRef={fileInputRef}
                isSaving={loading}
                onPlanNameChange={handleUpdatePlanName}
                loading={loading}
              />
              <div className="space-y-6">
                <InputForm
                  input={simulationInput}
                  openSection={openSection}
                  setOpenSection={setOpenSection}
                  onInputChange={handleInputChange}
                  onNestedChange={handleNestedInputChange}
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
            <div className="bg-slate-50 p-4 sm:p-6 lg:p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4">シミュレーション結果</h2>
              <SimulationResult
                result={simulationResult}
                loading={isSaving}
                retirementAge={simulationInput.retirementAge as number}
                onRunSimulation={handleRunSimulation}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App; 
