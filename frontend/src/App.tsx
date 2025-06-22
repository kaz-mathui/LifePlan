import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import { usePlanData } from './hooks/usePlanData';
import { BackendSimulationResult, SimulationInputData, LifeEvent } from './types';
import { API_ENDPOINTS } from './constants';
import { debounce } from 'lodash';
import { auth } from './services/firebase';

import Auth from './components/Auth';
import PlanManager from './components/PlanManager';
import InputForm from './components/InputForm';
import SimulationResult from './components/SimulationResult';
import { exportToCsv, importFromCsv } from './utils/csvUtils';
import LifeEventForm from './components/LifeEventForm';

// フロントエンドの型からバックエンドの型に変換する関数
const convertToBackendFormat = (data: SimulationInputData) => {
  return {
    planName: data.planName,
    currentAge: Number(data.currentAge) || 0,
    retirementAge: Number(data.retirementAge) || 0,
    lifeExpectancy: Number(data.lifeExpectancy) || 0,
    annualIncome: Number(data.annualIncome) || 0,
    salaryIncreaseRate: Number(data.salaryIncreaseRate) || 0,
    currentSavings: Number(data.currentSavings) || 0,
    investmentRatio: Number(data.investmentRatio) || 0,
    annualReturn: Number(data.annualReturn) || 0,
    severancePay: Number(data.severancePay) || 0,
    monthlyExpenses: Number(data.monthlyExpenses) || 0,
    pensionAmountPerYear: Number(data.pensionAmountPerYear) || 0,
    pensionStartDate: Number(data.pensionStartDate) || 0,
    housing: {
      hasLoan: data.housing.hasLoan,
      propertyValue: Number(data.housing.propertyValue) || 0,
      downPayment: Number(data.housing.downPayment) || 0,
      loanAmount: Number(data.housing.loanAmount) || 0,
      interestRate: Number(data.housing.interestRate) || 0,
      loanTerm: Number(data.housing.loanTerm) || 0,
      startAge: Number(data.housing.startAge) || 0,
      propertyTaxRate: Number(data.housing.propertyTaxRate) || 0,
    },
    education: {
      hasChildren: data.education.hasChildren,
      children: data.education.children.map(child => ({
        birthYear: Number(child.birthYear) || 0,
        plan: child.plan,
        customAmount: child.customAmount ? Number(child.customAmount) : null,
      })),
      childLivingCost: Number(data.education.childLivingCost) || 0,
    },
    car: {
      hasCar: data.car.hasCar,
      price: Number(data.car.price) || 0,
      downPayment: Number(data.car.downPayment) || 0,
      loanAmount: Number(data.car.loanAmount) || 0,
      loanTerm: Number(data.car.loanTerm) || 0,
      interestRate: Number(data.car.interestRate) || 0,
      maintenanceCost: Number(data.car.maintenanceCost) || 0,
      purchaseAge: Number(data.car.purchaseAge) || 0,
      replacementCycle: Number(data.car.replacementCycle) || 0,
    },
    senior: {
      enabled: data.senior.enabled,
      startAge: Number(data.senior.startAge) || 0,
      monthlyExpense: Number(data.senior.monthlyExpense) || 0,
      careCost: Number(data.senior.careCost) || 0,
    },
    lifeEvents: data.lifeEvents.map(event => ({
      id: event.id,
      description: event.description,
      type: event.type,
      amount: Number(event.amount) || 0,
      startAge: Number(event.startAge) || 0,
      endAge: event.endAge ? Number(event.endAge) : null,
    })),
    childCount: data.childCount,
  };
};

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const {
    plans,
    currentPlanId,
    inputData,
    loading: planLoading,
    isSaving,
    selectPlan,
    savePlan,
    newPlan,
    deletePlan,
    handleInputChange,
    handlePlanNameChange,
  } = usePlanData();

  const [simulationResult, setSimulationResult] = useState<BackendSimulationResult | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  const runSimulation = useCallback(async (data: SimulationInputData) => {
    if (!data) return;
    setSimulationLoading(true);
    setSimulationError(null);
    try {
      const backendData = convertToBackendFormat(data);
      const response = await fetch(API_ENDPOINTS.SIMULATION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.details) {
          // バックエンドのバリデーションエラーを処理
          const fieldErrors = errorData.details;
          const errorMessages = Object.entries(fieldErrors)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('\n');
          setSimulationError(`入力値に問題があります:\n${errorMessages}`);
          toast.error('シミュレーションの実行に失敗しました。入力値を確認してください。');
        } else {
          throw new Error(errorData.error || 'Network response was not ok');
        }
        return;
      }
      
      const result: BackendSimulationResult = await response.json();
      setSimulationResult(result);
      toast.success('シミュレーションが完了しました。');
    } catch (error) {
      console.error('シミュレーションの実行に失敗しました:', error);
      const errorMessage = error instanceof Error ? error.message : 'シミュレーションの実行に失敗しました。';
      setSimulationError(errorMessage);
      toast.error('シミュレーションの実行に失敗しました。');
    } finally {
      setSimulationLoading(false);
    }
  }, []);

  const debouncedRunSimulation = useCallback(debounce(runSimulation, 1000), [runSimulation]);

  useEffect(() => {
    if (inputData) {
      debouncedRunSimulation(inputData);
    }
  }, [inputData, debouncedRunSimulation]);

  const handleSavePlan = async () => {
    if (!currentPlanId) {
      toast.error("保存するプランが選択されていません。");
      return;
    }
    const planToSave = {
      id: currentPlanId,
      planName: inputData.planName,
      data: inputData,
    };
    await savePlan(planToSave);
  };
  
  const handleExport = () => {
    if (!inputData) return;
    exportToCsv(inputData);
    toast.success('プランをCSVとしてエクスポートしました。');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const text = e.target?.result as string;
            if (text) {
              const importedData = await importFromCsv(text);
              handleInputChange('root', importedData); // Replace all data
              toast.success('プランをインポートしました。');
            }
          } catch (readError) {
             console.error('Failed to process imported CSV data:', readError);
             toast.error('CSVデータの処理中にエラーが発生しました。');
          }
        };
        reader.onerror = () => {
          console.error('Failed to read file');
          toast.error('ファイルの読み込みに失敗しました。');
        };
        reader.readAsText(file);
      } catch (error) {
        console.error('Failed to import from CSV:', error);
        toast.error('CSVファイルのインポートに失敗しました。');
      }
    }
  };

  const handleLifeEventsChange = (events: LifeEvent[]) => {
    handleInputChange('lifeEvents', events);
  };

  if (authLoading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">読み込み中...</div>;
  }

  if (!user) {
    return <Auth auth={auth} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">ライフプランシミュレーター</h1>
            </div>
            <div className="flex items-center space-x-4">
              <PlanManager 
                plans={plans} 
                onSelectPlan={selectPlan}
                onDeletePlan={deletePlan}
                onSavePlan={handleSavePlan}
                currentPlanId={currentPlanId}
                planName={inputData.planName}
                onNewPlan={newPlan}
                onPlanNameChange={handlePlanNameChange}
                onExport={handleExport}
                onImport={handleImport}
                loading={planLoading || isSaving}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">入力フォーム</h2>
            <InputForm inputData={inputData} onInputChange={handleInputChange} />
            <div className="mt-8">
              <LifeEventForm 
                lifeEvents={inputData.lifeEvents} 
                onLifeEventsChange={handleLifeEventsChange}
                currentAge={inputData.currentAge}
                lifeExpectancy={inputData.lifeExpectancy}
              />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">シミュレーション結果</h2>
            {simulationError ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">シミュレーションエラー</h3>
                    <div className="mt-2 text-sm text-red-700 whitespace-pre-line">
                      {simulationError}
                    </div>
                  </div>
                </div>
              </div>
            ) : simulationResult ? (
              <SimulationResult result={simulationResult} loading={simulationLoading} retirementAge={Number(inputData.retirementAge)} />
            ) : (
              <p className="text-gray-600">入力値を変更するとシミュレーション結果が表示されます。</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App; 
