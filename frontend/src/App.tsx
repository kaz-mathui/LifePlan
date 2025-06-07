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
    // Income
    annualIncome: 6000000,
    salaryIncreaseRate: 2, // 昇給率(%)
    // Assets
    currentSavings: 5000000,
    investmentRatio: 50,
    annualReturn: 3,
    severancePay: 0,
    // Expenses
    monthlyExpenses: 250000,
    pensionAmountPerYear: 2000000,
    pensionStartDate: 65,
    // Detailed Expenses
    housing: {
      hasLoan: false,
      propertyValue: 40000000,
      downPayment: 10000000,
      loanAmount: 30000000,
      interestRate: 1.5,
      loanTerm: 35,
      startAge: 35,
      propertyTaxRate: 0.3,
    },
    education: {
      hasChildren: false,
      children: [],
    },
    car: {
      hasCar: false,
      price: 3000000,
      downPayment: 1000000,
      loanAmount: 2000000,
      loanTerm: 5,
      interestRate: 2.5,
      maintenanceCost: 300000,
      purchaseAge: 30,
      replacementCycle: 10,
    },
    senior: {
      nursingCareStartAge: 80,
      nursingCareAnnualCost: 1000000,
      funeralCost: 2000000,
    },
    // Other events
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

  const createMergedPlan = (loadedData: Partial<SimulationInputData>, planId?: string): SimulationInputData => {
    const base = initialSimulationInput;
    // Ensure loadedData.id or the passed planId is used.
    const dataWithId = { ...loadedData, id: loadedData.id ?? planId };

    return {
      ...base,
      ...dataWithId,
      housing: {
        ...base.housing,
        ...(dataWithId.housing || {}),
      },
      education: {
        ...base.education,
        ...(dataWithId.education || {}),
        // Ensure children is always an array
        children: dataWithId.education?.children || base.education.children,
      },
      car: {
        ...base.car,
        ...(dataWithId.car || {}),
      },
      senior: {
        ...base.senior,
        ...(dataWithId.senior || {}),
      },
      // Ensure lifeEvents is always an array
      lifeEvents: dataWithId.lifeEvents || base.lifeEvents,
    };
  };

  // 1. 認証状態の監視とユーザー情報の設定に特化したuseEffect
  useEffect(() => {
    setDbInstance(db);
    setAuthInstance(firebaseAuth);

    if (firebaseAuth) {
      const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
        setUser(currentUser);
        // ログイン状態に関わらずユニークなIDを割り当てる
        const currentUid = currentUser ? currentUser.uid : crypto.randomUUID();
        setUserId(currentUid);
        setIsAuthReady(true);
        
        // ログアウト時にはプラン情報をクリア
        if (!currentUser) {
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
    }
  }, []); // 初回マウント時のみ実行

  // 2. ユーザーIDが確定した後に、データの読み込みを行うuseEffect
  useEffect(() => {
    // 認証準備ができていない、またはユーザーIDがない場合は何もしない
    if (!isAuthReady || !userId) return;

    // ログインユーザーの場合のみプランを読み込む
    if (user) {
      const loadUserPlans = async () => {
        setError(null);
        const plansResult = await loadPlans();
        if (plansResult.success && plansResult.plans) {
          setSavedPlans(plansResult.plans);
          if (plansResult.plans.length > 0) {
            // 最新のプランを読み込む
            const latestPlanId = plansResult.plans[0].id;
            const specificPlanResult = await loadSpecificPlan(latestPlanId);
            if (specificPlanResult.success && specificPlanResult.planData) {
              setSimulationInput(createMergedPlan(specificPlanResult.planData, latestPlanId));
            } else if (specificPlanResult.notFound) {
              toast.error(`プラン(ID: ${latestPlanId})が見つかりませんでした。新しいプランを開始します。`);
              handleCreateNewPlan();
            } else if (specificPlanResult.error) {
              setError("プランの読み込みに失敗しました: " + specificPlanResult.error);
              toast.error("プランの読み込みに失敗しました: " + specificPlanResult.error);
              handleCreateNewPlan();
            }
          } else {
            // 保存されたプランがない場合は新規作成
            handleCreateNewPlan();
          }
        } else if (plansResult.error) {
          setError("保存済みプラン一覧の読み込みに失敗しました: " + plansResult.error);
          toast.error("保存済みプラン一覧の読み込みに失敗しました: " + plansResult.error);
          handleCreateNewPlan();
        }
      };
      loadUserPlans();
    } else {
      // ゲストユーザーの場合は常に新しいプランから開始
      handleCreateNewPlan();
    }
    // isAuthReady, userId, userのいずれかが変更されたときにこのeffectを実行
  }, [isAuthReady, userId, user, loadPlans, loadSpecificPlan]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const processedValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;

    setSimulationInput(prev => ({
      ...prev,
      [name]: processedValue,
    }));
  };
  
  const handleNestedInputChange = (
    section: keyof SimulationInputData,
    field: string,
    value: any
  ) => {
    setSimulationInput(prev => {
      const sectionData = prev[section];
      if (typeof sectionData === 'object' && sectionData !== null && !Array.isArray(sectionData)) {
        return {
          ...prev,
          [section]: {
            ...sectionData,
            [field]: value,
          },
        };
      }
      return prev;
    });
  };

  const handleChildrenChange = (index: number, field: string, value: any) => {
    setSimulationInput(prev => {
      const updatedChildren = [...prev.education.children];
      updatedChildren[index] = { ...updatedChildren[index], [field]: value };
      return {
        ...prev,
        education: {
          ...prev.education,
          children: updatedChildren,
        },
      };
    });
  };

  const addChild = () => {
    setSimulationInput(prev => ({
      ...prev,
      education: {
        ...prev.education,
        children: [...prev.education.children, { birthYear: new Date().getFullYear(), plan: 'public' }],
      },
    }));
  };

  const removeChild = (index: number) => {
    setSimulationInput(prev => ({
      ...prev,
      education: {
        ...prev.education,
        children: prev.education.children.filter((_, i) => i !== index),
      },
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
      
      const toNumber = (val: any): number => {
        if (val === null || val === undefined || val === '') {
            return 0;
        }
        const num = Number(val);
        return isNaN(num) ? 0 : num;
      };

      const sanitizedInput = {
        ...simulationInput,
        currentAge: toNumber(simulationInput.currentAge),
        retirementAge: toNumber(simulationInput.retirementAge),
        lifeExpectancy: toNumber(simulationInput.lifeExpectancy),
        annualIncome: toNumber(simulationInput.annualIncome),
        salaryIncreaseRate: toNumber(simulationInput.salaryIncreaseRate),
        currentSavings: toNumber(simulationInput.currentSavings),
        investmentRatio: toNumber(simulationInput.investmentRatio),
        annualReturn: toNumber(simulationInput.annualReturn),
        severancePay: toNumber(simulationInput.severancePay),
        monthlyExpenses: toNumber(simulationInput.monthlyExpenses),
        pensionAmountPerYear: toNumber(simulationInput.pensionAmountPerYear),
        pensionStartDate: toNumber(simulationInput.pensionStartDate),
        housing: {
          ...simulationInput.housing,
          propertyValue: toNumber(simulationInput.housing.propertyValue),
          downPayment: toNumber(simulationInput.housing.downPayment),
          loanAmount: toNumber(simulationInput.housing.loanAmount),
          interestRate: toNumber(simulationInput.housing.interestRate),
          loanTerm: toNumber(simulationInput.housing.loanTerm),
          startAge: toNumber(simulationInput.housing.startAge),
          propertyTaxRate: toNumber(simulationInput.housing.propertyTaxRate),
        },
        car: {
          ...simulationInput.car,
          price: toNumber(simulationInput.car.price),
          downPayment: toNumber(simulationInput.car.downPayment),
          loanAmount: toNumber(simulationInput.car.loanAmount),
          loanTerm: toNumber(simulationInput.car.loanTerm),
          interestRate: toNumber(simulationInput.car.interestRate),
          maintenanceCost: toNumber(simulationInput.car.maintenanceCost),
          purchaseAge: toNumber(simulationInput.car.purchaseAge),
          replacementCycle: toNumber(simulationInput.car.replacementCycle),
        },
        senior: {
            ...simulationInput.senior,
            nursingCareStartAge: toNumber(simulationInput.senior.nursingCareStartAge),
            nursingCareAnnualCost: toNumber(simulationInput.senior.nursingCareAnnualCost),
            funeralCost: toNumber(simulationInput.senior.funeralCost),
        },
        education: {
          ...simulationInput.education,
          children: simulationInput.education.children.map(child => ({
            ...child,
            birthYear: toNumber(child.birthYear),
            customAmount: toNumber(child.customAmount || 0),
          })),
        },
        lifeEvents: (simulationInput.lifeEvents || []).map(event => ({
          id: event.id,
          eventName: event.description,
          type: event.type,
          amount: toNumber(event.amount),
          startAge: toNumber(event.startAge),
          endAge: event.endAge == null || event.endAge === '' ? undefined : Number(event.endAge),
        })),
      };

      const requestBody = sanitizedInput;
      
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
        setSimulationInput(createMergedPlan(result.planData, planId));
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
      const newPlan = createMergedPlan(importedData);
      setSimulationInput({
        ...newPlan,
        id: undefined, // インポート時は常に新しいプランとして扱う
        planName: newPlan.planName || 'インポートされたプラン',
      });
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
              setSimulationInput(createMergedPlan(loadResult.planData, latestPlan.id));
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
      <header className="w-full max-w-5xl mb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-sky-800 tracking-tight">ライフプランシミュレーター</h1>
        <p className="mt-3 text-lg text-slate-600">あなたの未来の家計を、分かりやすく予測します。</p>
        {userId && <p className="text-xs text-slate-500 mt-2">UserID: {userId}</p>}
      </header>

      {!user || !authInstance ? (
        <AuthComponent auth={authInstance} />
      ) : (
        <div className="w-full max-w-5xl bg-white p-4 sm:p-8 rounded-2xl shadow-xl">
          <div className="flex justify-between items-start mb-6">
            <p className="text-sm text-slate-600 leading-tight">
              ようこそ、<br/>
              <span className="font-semibold text-base">{user.isAnonymous ? 'ゲスト' : user.displayName || user.email || 'ユーザー'}</span> さん
            </p>
            <button
              onClick={() => authInstance.signOut()}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition duration-150 text-sm font-semibold"
            >
              ログアウト
            </button>
          </div>

          <PlanManager 
            savedPlans={savedPlans}
            currentPlanId={simulationInput.id}
            onSelectPlan={handleSelectPlan}
            onDeletePlan={handleDeletePlan}
            onCreateNewPlan={handleCreateNewPlan}
          />

          <InputFormComponent
            input={simulationInput}
            onInputChange={handleInputChange}
            onNestedChange={handleNestedInputChange}
            onChildrenChange={handleChildrenChange}
            onAddChild={addChild}
            onRemoveChild={removeChild}
            onSubmit={handleSimulate}
            onSave={handleSaveData}
            loading={simulationLoading || isSavingPlan || isLoadingPlans || isLoadingSpecificPlan || isDeletingPlan}
            onExport={handleExport}
            onImport={handleImport}
          />

          <LifeEventFormComponent 
            lifeEvents={simulationInput.lifeEvents}
            onLifeEventsChange={handleLifeEventsChange}
            currentAge={Number(simulationInput.currentAge)}
            lifeExpectancy={Number(simulationInput.lifeExpectancy)}
          />

          {(error || saveError || loadPlansError || loadSpecificPlanError || deletePlanError) && (
            <div className="mt-8 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
              <p className="font-semibold mb-2">エラーが発生しました</p>
              <div className="text-sm space-y-1">
                {error && <p>基本エラー: {error}</p>}
                {saveError && <p>保存エラー: {saveError}</p>}
                {loadPlansError && <p>プラン一覧読込エラー: {loadPlansError}</p>}
                {loadSpecificPlanError && <p>プラン読込エラー: {loadSpecificPlanError}</p>}
                {deletePlanError && <p>削除エラー: {deletePlanError}</p>}
              </div>
            </div>
          )}

          {simulationResult && !error && !saveError && !loadPlansError && !loadSpecificPlanError && !deletePlanError && (
            <div className="mt-8">
              <SimulationResultComponent result={simulationResult} />
              {simulationResult.assetData && simulationResult.assetData.length > 0 && (
                <AssetChartComponent assetData={simulationResult.assetData} />
              )}
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
