import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, DocumentData, collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { db, auth as firebaseAuth, FirebaseAuth, FirebaseFirestore } from './services/firebase';
import AuthComponent from './components/Auth';
import InputFormComponent from './components/InputForm';
import SimulationResultComponent from './components/SimulationResult';
import AssetChartComponent from './components/AssetChart';
import LifeEventFormComponent from './components/LifeEventForm';

// グローバル変数 __app_id の型 (firebase.tsでも同様の定義があるが、念のため)
declare global {
  interface Window {
    __app_id?: string;
  }
}

// ★新規追加: ライフイベントの型
export interface LifeEvent {
  id: string; // Reactのkeyや編集時の識別用
  age: number; // イベントが発生する年齢
  description: string; // イベントの説明 (例: 子供の大学入学金)
  type: 'income' | 'expense'; // '収入' または '支出'
  amount: number; // 金額 (円単位)
  frequency: 'one-time' | 'annual'; // '一回のみ' または '毎年'
  endAge?: number | null; // '毎年'の場合の終了年齢 (未設定の場合は寿命まで継続)
}

// シミュレーション入力データの型
export interface SimulationInputData {
  id?: string; // ★追加: プランID (FirestoreドキュメントIDに対応)
  planName: string; // ★追加: プラン名
  currentAge: number | ''; // 初期値や空入力を許容するため '' も
  retirementAge: number | '';
  lifeExpectancy: number | ''; // ★追加: 寿命
  currentSavings: number | '';
  annualIncome: number | '';
  monthlyExpenses: number | '';
  investmentRatio: number | ''; // 金融資産の割合 (0-100)
  annualReturn: number | ''; // 年間運用利回り (%)
  pensionAmountPerYear: number | ''; // ★追加: 年間年金受給額
  pensionStartDate: number | ''; // ★新規追加: 年金受給開始年齢
  severancePay: number | ''; // ★新規追加: 退職金
  lifeEvents: LifeEvent[]; // ★新規追加: ライフイベントの配列
}

// バックエンドAPIからのシミュレーション結果の型
export interface BackendSimulationResult {
  yearsToRetirement: number;
  projectedRetirementSavings: number;
  annualSavingsCurrentPace: number;
  targetRetirementFund?: number;
  message: string;
  suggestion?: string;
  assetData: { age: number; savings: number }[];
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationInput, setSimulationInput] = useState<SimulationInputData>({
    id: undefined, // ★追加
    planName: 'マイプラン', // ★追加
    currentAge: 30,
    retirementAge: 65,
    lifeExpectancy: 95, // ★追加: デフォルト95歳
    currentSavings: 5000000,
    annualIncome: 6000000,
    monthlyExpenses: 250000,
    investmentRatio: 50,
    annualReturn: 3,
    pensionAmountPerYear: 2000000, // ★追加: デフォルト200万円
    pensionStartDate: 65, // ★新規追加: デフォルト65歳
    severancePay: 0, // ★新規追加: デフォルト0円
    lifeEvents: [], // ★新規追加: 初期値は空配列
  });
  const [simulationResult, setSimulationResult] = useState<BackendSimulationResult | null>(null);
  const [dbInstance, setDbInstance] = useState<FirebaseFirestore | null>(null);
  const [authInstance, setAuthInstance] = useState<FirebaseAuth | null>(null);
  // ★追加: 保存済みプラン一覧を保持するステート (簡易的な型情報のみ)
  const [savedPlans, setSavedPlans] = useState<{id: string, planName: string, updatedAt: string}[]>([]);

  // process.env経由でREACT_APP_IDを取得。未設定ならデフォルト値。
  const appId: string = process.env.REACT_APP_ID || 'default-app-id';

  // ★修正: 特定のプランIDのデータを読み込む関数
  const loadSpecificPlanData = useCallback(async (uid: string, planId: string) => {
    if (!dbInstance || !uid || !planId) return;
    setLoading(true);
    try {
      const planDocRef = doc(dbInstance, `artifacts/${appId}/users/${uid}/lifePlans/${planId}`);
      const docSnap = await getDoc(planDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as DocumentData;
        setSimulationInput(prev => ({
          ...prev,
          id: data.id ?? planId, // ドキュメントIDをidとして設定
          planName: data.planName ?? prev.planName, // ★プラン名も読み込む
          currentAge: data.currentAge ?? prev.currentAge,
          retirementAge: data.retirementAge ?? prev.retirementAge,
          lifeExpectancy: data.lifeExpectancy ?? prev.lifeExpectancy,
          currentSavings: data.currentSavings ?? prev.currentSavings,
          annualIncome: data.annualIncome ?? prev.annualIncome,
          monthlyExpenses: data.monthlyExpenses ?? prev.monthlyExpenses,
          investmentRatio: data.investmentRatio ?? prev.investmentRatio,
          annualReturn: data.annualReturn ?? prev.annualReturn,
          pensionAmountPerYear: data.pensionAmountPerYear ?? prev.pensionAmountPerYear,
          pensionStartDate: data.pensionStartDate ?? prev.pensionStartDate,
          severancePay: data.severancePay ?? prev.severancePay,
          lifeEvents: data.lifeEvents ?? [], 
        }));
        console.log(`User data for plan ${planId} loaded from Firestore.`);
      } else {
        console.log(`No existing user data found in Firestore for plan ${planId}. Using defaults or current state.`);
        // プランが見つからない場合、IDをリセットして新規プラン扱いにすることも検討
        setSimulationInput(prev => ({...prev, id: undefined, planName: '新しいプラン'})); 
      }
    } catch (err: any) {
      console.error("Error loading specific plan data:", err);
      setError("プランデータの読み込みに失敗しました: " + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [dbInstance, appId]);

  // ★追加: ユーザーの保存済みプラン一覧を読み込む関数
  const loadUserPlans = useCallback(async (uid: string) => {
    if (!dbInstance || !uid) return;
    setLoading(true);
    try {
      const plansCollectionRef = collection(dbInstance, `artifacts/${appId}/users/${uid}/lifePlans`);
      const q = query(plansCollectionRef, orderBy("updatedAt", "desc")); // updatedAtで降順ソート
      const querySnapshot = await getDocs(q);
      const plans: {id: string, planName: string, updatedAt: string}[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        plans.push({ 
            id: doc.id, 
            planName: data.planName || '名称未設定プラン', 
            updatedAt: data.updatedAt 
        });
      });
      setSavedPlans(plans);
      console.log("User plans loaded:", plans);

      if (plans.length > 0) {
        // 最新のプラン (リストの先頭) をデフォルトで読み込む
        await loadSpecificPlanData(uid, plans[0].id);
      } else {
        // 保存されているプランがない場合は、現在のデフォルト入力 (新規プラン扱い)
        setSimulationInput(prev => ({
            ...prev, // 既存のデフォルト値を維持しつつ
            id: undefined, // IDは未設定
            planName: 'マイプラン' // プラン名も初期化
        }));
        console.log("No saved plans found. Initializing as a new plan.");
      }
    } catch (err: any) {
      console.error("Error loading user plans:", err);
      setError("保存済みプラン一覧の読み込みに失敗しました: " + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [dbInstance, appId, loadSpecificPlanData]);

  useEffect(() => {
    setDbInstance(db);
    setAuthInstance(firebaseAuth);

    if (firebaseAuth) {
      const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
        setUser(currentUser);
        setUserId(currentUser ? currentUser.uid : crypto.randomUUID());
        setIsAuthReady(true);
        if (currentUser) {
          loadUserPlans(currentUser.uid); // ★プラン一覧読み込みをトリガー
        } else {
          // ユーザーがログアウトした場合や未認証の場合の処理
          setSimulationInput({
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
          });
          setSavedPlans([]);
        }
      });
      return () => unsubscribe();
    } else {
      console.error("Firebase auth instance is not available from firebase.ts.");
      setIsAuthReady(true);
    }
  }, [appId, loadUserPlans]); // ★loadUserPlans を依存配列に追加

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSimulationInput(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  // ★追加: プラン名変更ハンドラ
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
    if (!user || !userId || !dbInstance) {
      setError("ユーザーが認証されていないか、データベースに接続されていません。");
      return;
    }
    if (!simulationInput.planName.trim()) {
        alert("プラン名を入力してください。");
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const planIdToSave = simulationInput.id || crypto.randomUUID();
      const isNewPlan = !simulationInput.id;

      const planDocRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/lifePlans/${planIdToSave}`);

      const cleanedLifeEvents = simulationInput.lifeEvents.map(event => ({
        ...event,
        endAge: event.endAge === undefined ? null : event.endAge,
      }));

      const dataToSave = {
        currentAge: simulationInput.currentAge === '' ? 0 : Number(simulationInput.currentAge),
        retirementAge: simulationInput.retirementAge === '' ? 0 : Number(simulationInput.retirementAge),
        lifeExpectancy: simulationInput.lifeExpectancy === '' ? 0 : Number(simulationInput.lifeExpectancy),
        currentSavings: simulationInput.currentSavings === '' ? 0 : Number(simulationInput.currentSavings),
        annualIncome: simulationInput.annualIncome === '' ? 0 : Number(simulationInput.annualIncome),
        monthlyExpenses: simulationInput.monthlyExpenses === '' ? 0 : Number(simulationInput.monthlyExpenses),
        investmentRatio: simulationInput.investmentRatio === '' ? 0 : Number(simulationInput.investmentRatio),
        annualReturn: simulationInput.annualReturn === '' ? 0 : Number(simulationInput.annualReturn),
        pensionAmountPerYear: simulationInput.pensionAmountPerYear === '' ? 0 : Number(simulationInput.pensionAmountPerYear),
        pensionStartDate: simulationInput.pensionStartDate === '' ? 0 : Number(simulationInput.pensionStartDate),
        severancePay: simulationInput.severancePay === '' ? 0 : Number(simulationInput.severancePay),
        lifeEvents: cleanedLifeEvents,
        
        id: planIdToSave, 
        planName: simulationInput.planName.trim(), // ★planNameも保存、trimする
        userId: userId,
        updatedAt: new Date().toISOString(),
        ...(isNewPlan && { createdAt: new Date().toISOString() }), 
      };

      await setDoc(planDocRef, dataToSave, { merge: true });
      
      setSimulationInput(prev => ({...prev, id: planIdToSave, planName: dataToSave.planName})); // planNameも更新
      
      // 保存されたプランを savedPlans ステートにも反映 (新規または更新)
      setSavedPlans(prevPlans => {
        const existingPlanIndex = prevPlans.findIndex(p => p.id === planIdToSave);
        const updatedPlanEntry = {id: planIdToSave, planName: dataToSave.planName, updatedAt: dataToSave.updatedAt};
        if (existingPlanIndex > -1) {
          const newPlans = [...prevPlans];
          newPlans[existingPlanIndex] = updatedPlanEntry;
          return newPlans.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()); // 更新日時でソート
        } else {
          return [...prevPlans, updatedPlanEntry].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
      });

      alert("データが保存されました！");
    } catch (err: any) {
      console.error("Error saving data to Firestore:", err);
      setError("データの保存に失敗しました: " + (err.message || 'Unknown error'));
      alert(`保存エラー: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    setSimulationResult(null);

    const { currentAge, retirementAge, lifeExpectancy, currentSavings, annualIncome, monthlyExpenses, investmentRatio, annualReturn, pensionAmountPerYear, pensionStartDate, severancePay, lifeEvents, planName } = simulationInput;

    if (!planName.trim()) { // シミュレーション前にもプラン名チェック
        alert("プラン名を入力してください。");
        setLoading(false);
        return;
    }

    if ([currentAge, retirementAge, lifeExpectancy, currentSavings, annualIncome, monthlyExpenses, investmentRatio, annualReturn, pensionAmountPerYear, pensionStartDate, severancePay].some(val => val === '' || (typeof val === 'number' && val < 0))) {
        setError("すべての項目を正しく入力してください（0以上の数値を入力）。");
        setLoading(false);
        return;
    }
    if (typeof currentAge !== 'number' || typeof retirementAge !== 'number' || typeof lifeExpectancy !== 'number' || typeof pensionStartDate !== 'number') {
        setError("年齢に関する項目は数値を入力してください。");
        setLoading(false);
        return;
    }

    if (currentAge >= retirementAge) {
        setError("リタイア目標年齢は現在の年齢より大きく設定してください。");
        setLoading(false);
        return;
    }
    if (retirementAge > pensionStartDate) {
        setError("年金受給開始年齢はリタイア目標年齢以降に設定してください。");
        setLoading(false);
        return;
    }
    if (pensionStartDate >= lifeExpectancy) { 
        setError("寿命は年金受給開始年齢より大きく設定してください。");
        setLoading(false);
        return;
    }

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001/api/simulation';
      const requestBody = {
        currentAge: Number(currentAge),
        retirementAge: Number(retirementAge),
        lifeExpectancy: Number(lifeExpectancy),
        currentSavings: Number(currentSavings),
        annualIncome: Number(annualIncome),
        monthlyExpenses: Number(monthlyExpenses),
        investmentRatio: Number(investmentRatio),
        annualReturn: Number(annualReturn),
        pensionAmountPerYear: Number(pensionAmountPerYear),
        pensionStartDate: Number(pensionStartDate),
        severancePay: Number(severancePay),
        lifeEvents: lifeEvents, 
      };
      console.log("Request body for simulation API:", JSON.stringify(requestBody, null, 2)); 
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "APIからのエラーレスポンスが不正です。" }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data: BackendSimulationResult = await response.json();
      console.log("Simulation API response data:", data); 
      if (data.assetData) {
        console.log("Received assetData:", JSON.stringify(data.assetData, null, 2)); 
      }
      setSimulationResult(data);
    } catch (err: any) {
      console.error("Simulation API error:", err);
      setError(`シミュレーションの実行に失敗しました: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthReady) {
    return <div className="flex justify-center items-center h-screen text-xl">認証情報を読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col items-center p-4 sm:p-8 font-inter">
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

          {/* プラン選択UI (将来的にここに追加) */}
          {/* savedPlans があればドロップダウンなどでプランを選択できるようにする */}
          {savedPlans.length > 0 && (
            <div className="mb-4">
              <label htmlFor="planSelector" className="block text-sm font-medium text-slate-700">保存済みプラン:</label>
              <select 
                id="planSelector"
                value={simulationInput.id || ''} 
                onChange={(e) => {
                    const selectedPlanId = e.target.value;
                    if (selectedPlanId && userId) {
                        loadSpecificPlanData(userId, selectedPlanId);
                    } else if (!selectedPlanId) {
                        // 「新しいプラン」的な選択肢が選ばれた場合
                        setSimulationInput({
                            id: undefined,
                            planName: '新しいプラン',
                            currentAge: 30, retirementAge: 65, lifeExpectancy: 95,
                            currentSavings: 5000000, annualIncome: 6000000, monthlyExpenses: 250000,
                            investmentRatio: 50, annualReturn: 3, pensionAmountPerYear: 2000000,
                            pensionStartDate: 65, severancePay: 0, lifeEvents: []
                        });
                    }
                }}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
              >
                <option value="">--- 新しいプランとして開始 ---</option> {/* 新規作成用 */} 
                {savedPlans.map(plan => (
                  <option key={plan.id} value={plan.id}>{plan.planName} (最終更新: {new Date(plan.updatedAt).toLocaleString()})</option>
                ))}
              </select>
            </div>
          )}

          <InputFormComponent
            input={simulationInput}
            onInputChange={handleInputChange}
            onSubmit={handleSimulate}
            onSave={handleSaveData}
            loading={loading}
            planName={simulationInput.planName} 
            onPlanNameChange={handlePlanNameChange} 
          />

          <LifeEventFormComponent 
            lifeEvents={simulationInput.lifeEvents}
            onLifeEventsChange={handleLifeEventsChange}
            currentAge={simulationInput.currentAge}
            lifeExpectancy={simulationInput.lifeExpectancy}
          />

          {error && (
            <div className="mt-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg">
              <p className="font-semibold">エラー</p>
              <p>{error}</p>
            </div>
          )}

          {simulationResult && !error && (
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
