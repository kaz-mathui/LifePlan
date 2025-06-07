import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, DocumentData, collection, query, orderBy, getDocs, limit, where, deleteDoc } from 'firebase/firestore';
import { db, auth as firebaseAuth, FirebaseAuth, FirebaseFirestore } from './services/firebase';
import AuthComponent from './components/Auth';
import InputFormComponent from './components/InputForm';
import SimulationResultComponent from './components/SimulationResult';
import AssetChartComponent from './components/AssetChart';
import LifeEventFormComponent from './components/LifeEventForm';
import PlanManager from './components/PlanManager';
import toast, { Toaster } from 'react-hot-toast';
import { usePlanData } from './hooks/usePlanData';
import { LifeEvent, SimulationInputData, BackendSimulationResult, PlanListItem } from './types';
import { exportPlanToCsv, importPlanFromCsv } from './utils/csvUtils';
import { API_ENDPOINTS } from './constants';

// グローバル変数 __app_id の型 (firebase.tsでも同様の定義があるが、念のため)
declare global {
  interface Window {
    __app_id?: string;
  }
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [simulationLoading, setSimulationLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const initialSimulationInput: SimulationInputData = {
    id: undefined,
    planName: 'マイプラン',
    currentAge: 30,
    retirementAge: 65,
    lifeExpectancy: 95,
    currentSavings: 5000000,
    annualIncome: 6000000,
    monthlyExpenses: 250000,
    investmentRatio: 50,
    annualReturn: 3,
    pensionAmountPerYear: 2000000,
    pensionStartDate: 65,
    severancePay: 0,
    lifeEvents: [],
  };
  const [simulationInput, setSimulationInput] = useState<SimulationInputData>(initialSimulationInput);
  const [simulationResult, setSimulationResult] = useState<BackendSimulationResult | null>(null);
  const [dbInstance, setDbInstance] = useState<FirebaseFirestore | null>(null);
  const [authInstance, setAuthInstance] = useState<FirebaseAuth | null>(null);
  const [savedPlans, setSavedPlans] = useState<PlanListItem[]>([]);

  const appId: string = process.env.REACT_APP_ID || 'default-app-id';

  const {
    savePlan,
    isSaving: isSavingPlan,
    saveError,
    loadPlans,
    isLoadingPlans,
    loadPlansError,
    loadSpecificPlan,
    isLoadingSpecificPlan,
    loadSpecificPlanError,
    deletePlan,
    isDeletingPlan,
    deletePlanError
  } = usePlanData({ db: dbInstance, appId, userId });

  useEffect(() => {
    setDbInstance(db);
    setAuthInstance(firebaseAuth);

    if (firebaseAuth) {
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
        setUser(currentUser);
        const currentUid = currentUser ? currentUser.uid : crypto.randomUUID();
        setUserId(currentUid);
        setIsAuthReady(true);

        if (currentUser) {
          setError(null);
          const plansResult = await loadPlans();
          if (plansResult.success && plansResult.plans) {
            setSavedPlans(plansResult.plans);
            if (plansResult.plans.length > 0) {
              const latestPlanId = plansResult.plans[0].id;
              const specificPlanResult = await loadSpecificPlan(latestPlanId);
              if (specificPlanResult.success && specificPlanResult.planData) {
                const loadedPlanData = specificPlanResult.planData;
                setSimulationInput(prev => ({ 
                  ...initialSimulationInput, 
                  ...prev, 
                  ...loadedPlanData,
                  id: loadedPlanData.id ?? latestPlanId 
                }));
              } else if (specificPlanResult.notFound) {
                toast.error(`プラン(ID: ${latestPlanId})が見つかりませんでした。新しいプランを開始します。`);
                handleCreateNewPlan();
              } else if (specificPlanResult.error) {
                setError("プランの読み込みに失敗しました: " + specificPlanResult.error);
                toast.error("プランの読み込みに失敗しました: " + specificPlanResult.error);
                handleCreateNewPlan();
              }
            } else {
              handleCreateNewPlan();
            }
          } else if (plansResult.error) {
            setError("保存済みプラン一覧の読み込みに失敗しました: " + plansResult.error);
            toast.error("保存済みプラン一覧の読み込みに失敗しました: " + plansResult.error);
            handleCreateNewPlan();
          }
        } else {
          setSimulationInput(initialSimulationInput);
          setSavedPlans([]);
          setError(null);
        }
      });
      return () => unsubscribe();
    } else {
      console.error("Firebase auth instance is not available from firebase.ts.");
      setIsAuthReady(true);
      setError("認証サービスに接続できません。ゲストとして利用します。");
      setUserId(crypto.randomUUID());
      handleCreateNewPlan();
    }
  }, [appId, loadPlans, loadSpecificPlan]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSimulationInput(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handlePlanNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSimulationInput(prev => ({
      ...prev,
      planName: e.target.value
    }));
  };

  const handleLifeEventsChange = (newEventList: LifeEvent[]) => {
    setSimulationInput(prev => ({
      ...prev,
      lifeEvents: newEventList
    }));
  };

  const handleSaveData = async () => {
    const result = await savePlan(simulationInput);

    if (result.success && result.planId && result.planName && result.updatedAt) {
      setSimulationInput(prev => ({...prev, id: result.planId, planName: result.planName!}));
      setSavedPlans(prevPlans => {
        const existingPlanIndex = prevPlans.findIndex(p => p.id === result.planId);
        const updatedPlanEntry = {id: result.planId!, planName: result.planName!, updatedAt: result.updatedAt!};
        if (existingPlanIndex > -1) {
          const newPlans = [...prevPlans];
          newPlans[existingPlanIndex] = updatedPlanEntry;
          return newPlans.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } else {
          return [...prevPlans, updatedPlanEntry].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
      });
      toast.success("データが保存されました！");
    } else if (result.error) {
      setError(result.error);
      toast.error(result.error);
    }
  };

  const handleSimulate = async () => {
    setSimulationLoading(true);
    setError(null);
    setSimulationResult(null);

    const { lifeEvents, planName } = simulationInput;

    if (!planName.trim()) {
        toast.error("プラン名を入力してください。");
        setSimulationLoading(false);
        return;
    }

    try {
      const backendUrl = API_ENDPOINTS.SIMULATION;
      
      const sanitizedLifeEvents = (lifeEvents || []).map(event => ({
        ...event,
        endAge: (event.endAge as any) == null || (event.endAge as any) === '' ? undefined : Number(event.endAge)
      }));

      const requestBody = {
        ...simulationInput,
        currentAge: Number(simulationInput.currentAge),
        retirementAge: Number(simulationInput.retirementAge),
        lifeExpectancy: Number(simulationInput.lifeExpectancy),
        currentSavings: Number(simulationInput.currentSavings),
        annualIncome: Number(simulationInput.annualIncome),
        monthlyExpenses: Number(simulationInput.monthlyExpenses),
        investmentRatio: Number(simulationInput.investmentRatio),
        annualReturn: Number(simulationInput.annualReturn),
        pensionAmountPerYear: Number(simulationInput.pensionAmountPerYear),
        pensionStartDate: Number(simulationInput.pensionStartDate),
        severancePay: Number(simulationInput.severancePay),
        lifeEvents: sanitizedLifeEvents, 
      };
      
      console.log("Request body for simulation API:", JSON.stringify(requestBody, null, 2)); 
      
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data && data.details) {
          const errorMessages = Object.entries(data.details).map(([field, messages]) => 
            `${field}: ${(messages as string[]).join(', ')}`
          );
          const fullErrorMessage = `入力エラー:\n- ${errorMessages.join('\n- ')}`;
          toast.error(fullErrorMessage, {
            duration: 6000,
            style: { whiteSpace: 'pre-line', maxWidth: '500px' }
          });
          setError(`入力値が無効です。詳細は通知を確認してください。`);
        } else {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        return;
      }
      
      console.log("Simulation API response data:", data); 
      if (data.assetData) {
        console.log("Received assetData:", JSON.stringify(data.assetData, null, 2)); 
      }
      setSimulationResult(data);
    } catch (err: any) {
      console.error("Simulation API error:", err);
      const errorMessage = `シミュレーションの実行に失敗しました: ${err.message || 'Unknown error'}`;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSimulationLoading(false);
    }
  };

  const handleCreateNewPlan = () => {
    setSimulationInput(prev => ({
        ...initialSimulationInput,
        id: undefined,
        planName: `新しいプラン ${new Date().toLocaleTimeString()}`
    }));
    setSimulationResult(null);
    setError(null);
    console.log("New plan creation initiated.");
  };

  const handleSelectPlan = async (planId: string) => {
    if (userId && planId) {
      setError(null);
      const result = await loadSpecificPlan(planId);
      if (result.success && result.planData) {
        const loadedPlanData = result.planData;
        setSimulationInput(prev => ({ 
          ...initialSimulationInput, 
          ...prev, 
          ...loadedPlanData,
          id: loadedPlanData.id ?? planId
        }));
        setSimulationResult(null);
      } else if (result.notFound) {
        toast.error(`プラン(ID: ${planId})が見つかりませんでした。新しいプランを開始します。`);
        handleCreateNewPlan();
      } else if (result.error) {
        setError("プランの読み込みに失敗しました: " + result.error);
        toast.error("プランの読み込みに失敗しました: " + result.error);
      }
    }
  };

  const handleExport = () => {
    try {
      exportPlanToCsv(simulationInput);
      toast.success('プランをCSVファイルにエクスポートしました。');
    } catch (error: any) {
      toast.error('エクスポートに失敗しました: ' + error.message);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const importedData = await importPlanFromCsv(file);
      setSimulationInput(prev => ({
        ...initialSimulationInput,
        ...importedData,
        id: undefined,
        planName: importedData.planName || 'インポートされたプラン'
      }));
      setSimulationResult(null);
      toast.success('プランをインポートしました。内容を確認して保存してください。');
    } catch (error: any) {
      toast.error('インポートに失敗しました: ' + error.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleDeletePlan = async (planIdToDelete: string) => {
    const result = await deletePlan(planIdToDelete);

    if (result.success) {
      toast.success('プランが削除されました。');
      const updatedPlans = savedPlans.filter(plan => plan.id !== planIdToDelete);
      setSavedPlans(updatedPlans);

      if (simulationInput.id === planIdToDelete) {
        if (updatedPlans.length > 0) {
          const latestPlan = [...updatedPlans].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
          if (userId) {
            const loadResult = await loadSpecificPlan(latestPlan.id);
            if (loadResult.success && loadResult.planData) {
              const loadedPlanData = loadResult.planData;
              setSimulationInput(prev => ({ 
                ...initialSimulationInput, 
                ...prev, 
                ...loadedPlanData,
                id: loadedPlanData.id ?? latestPlan.id
              }));
              setSimulationResult(null);
            } else {
              toast.error("削除後のプラン再読み込みに失敗しました。");
              handleCreateNewPlan();
            }
          }
        } else {
          handleCreateNewPlan();
        }
      } else {
        if (updatedPlans.length === 0) {
          handleCreateNewPlan();
        }
      }
    } else if (result.error) {
      setError("プランの削除に失敗しました: " + result.error);
      toast.error("プランの削除に失敗しました: " + result.error);
    }
  };

  if (!isAuthReady) {
    return <div className="flex justify-center items-center h-screen text-xl">認証情報を読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col items-center p-4 sm:p-8 font-inter">
      <Toaster position="top-center" reverseOrder={false} />
      <header className="w-full max-w-4xl mb-8 text-center">
        <h1 className="text-4xl font-bold text-sky-700">ライフプランシミュレーター</h1>
        {userId && <p className="text-xs text-slate-500 mt-1">UserID: {userId}</p>}
      </header>

      {!user || !authInstance ? (
        <AuthComponent auth={authInstance} />
      ) : (
        <div className="w-full max-w-4xl bg-white p-6 sm:p-8 rounded-xl shadow-2xl">
          <div className="mb-6 text-right">
            <p className="text-sm text-slate-600">ようこそ、{user.isAnonymous ? 'ゲスト' : user.displayName || user.email || 'ユーザー'} さん</p>
            <button
              onClick={() => authInstance.signOut()}
              className="mt-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-150 text-sm"
            >
              ログアウト
            </button>
          </div>

          <div className="flex justify-end mb-4">
            <button
                onClick={handleCreateNewPlan}
                className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-md transition duration-150 bg-green-500 hover:bg-green-600 text-white`}
            >
                新しいプランを作成
            </button>
          </div>
          
          {savedPlans.length > 0 ? (
            <PlanManager 
              savedPlans={savedPlans}
              currentPlanId={simulationInput.id}
              onSelectPlan={handleSelectPlan}
              onDeletePlan={handleDeletePlan}
            />
          ) : (
            <div className="mb-4 p-4 bg-slate-100 rounded-lg text-center">
              <p className="text-slate-600 text-sm">保存されているプランはありません。「新しいプランを作成」ボタンから開始してください。</p>
            </div>
          )}

          <InputFormComponent
            input={simulationInput}
            onInputChange={handleInputChange}
            onSubmit={handleSimulate}
            onSave={handleSaveData}
            loading={simulationLoading || isSavingPlan || isLoadingPlans || isLoadingSpecificPlan || isDeletingPlan}
            planName={simulationInput.planName} 
            onPlanNameChange={handlePlanNameChange} 
            onExport={handleExport}
            onImport={handleImport}
          />

          <LifeEventFormComponent 
            lifeEvents={simulationInput.lifeEvents}
            onLifeEventsChange={handleLifeEventsChange}
            currentAge={simulationInput.currentAge}
            lifeExpectancy={simulationInput.lifeExpectancy}
          />

          {(error || saveError || loadPlansError || loadSpecificPlanError || deletePlanError) && (
            <div className="mt-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
              <p className="font-semibold">エラー</p>
              {error && <p>基本エラー: {error}</p>}
              {saveError && <p>保存エラー: {saveError}</p>}
              {loadPlansError && <p>プラン一覧読込エラー: {loadPlansError}</p>}
              {loadSpecificPlanError && <p>プラン読込エラー: {loadSpecificPlanError}</p>}
              {deletePlanError && <p>削除エラー: {deletePlanError}</p>}
            </div>
          )}

          {simulationResult && !error && !saveError && !loadPlansError && !loadSpecificPlanError && !deletePlanError && (
            <>
              <SimulationResultComponent result={simulationResult} />
              {simulationResult.assetData && simulationResult.assetData.length > 0 && (
                <AssetChartComponent assetData={simulationResult.assetData} />
              )}
            </>
          )}
        </div>
      )}
      <footer className="mt-12 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} ライフプランニング App. All rights reserved.</p>
        <p className="text-xs mt-1">これはデモンストレーション用のアプリケーションです。</p>
      </footer>
    </div>
  );
};

export default App; 
