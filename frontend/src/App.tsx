import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, DocumentData } from 'firebase/firestore';
import { db, auth as firebaseAuth, FirebaseAuth, FirebaseFirestore } from './services/firebase';
import AuthComponent from './components/Auth';
import InputFormComponent from './components/InputForm';
import SimulationResultComponent from './components/SimulationResult';
import AssetChartComponent from './components/AssetChart';

// グローバル変数 __app_id の型 (firebase.tsでも同様の定義があるが、念のため)
declare global {
  interface Window {
    __app_id?: string;
  }
}

// シミュレーション入力データの型
export interface SimulationInputData {
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
  });
  const [simulationResult, setSimulationResult] = useState<BackendSimulationResult | null>(null);
  const [dbInstance, setDbInstance] = useState<FirebaseFirestore | null>(null);
  const [authInstance, setAuthInstance] = useState<FirebaseAuth | null>(null);

  // process.env経由でREACT_APP_IDを取得。未設定ならデフォルト値。
  const appId: string = process.env.REACT_APP_ID || 'default-app-id';

  // loadUserData を useCallback でメモ化
  const loadUserData = useCallback(async (uid: string) => {
    if (!dbInstance || !uid) return;
    setLoading(true);
    try {
      const planDocRef = doc(dbInstance, `artifacts/${appId}/users/${uid}/lifePlanData/latest`);
      const docSnap = await getDoc(planDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as DocumentData;
        setSimulationInput(prev => ({
          ...prev,
          currentAge: data.currentAge ?? prev.currentAge,
          retirementAge: data.retirementAge ?? prev.retirementAge,
          lifeExpectancy: data.lifeExpectancy ?? prev.lifeExpectancy, // ★追加
          currentSavings: data.currentSavings ?? prev.currentSavings,
          annualIncome: data.annualIncome ?? prev.annualIncome,
          monthlyExpenses: data.monthlyExpenses ?? prev.monthlyExpenses,
          investmentRatio: data.investmentRatio ?? prev.investmentRatio,
          annualReturn: data.annualReturn ?? prev.annualReturn,
          pensionAmountPerYear: data.pensionAmountPerYear ?? prev.pensionAmountPerYear, // ★追加
          pensionStartDate: data.pensionStartDate ?? prev.pensionStartDate, // ★新規追加
          severancePay: data.severancePay ?? prev.severancePay, // ★新規追加
        }));
        console.log("User data loaded from Firestore.");
      } else {
        console.log("No existing user data found in Firestore for 'latest' plan. Using defaults.");
      }
    } catch (err: any) {
      console.error("Error loading user data:", err);
      setError("ユーザーデータの読み込みに失敗しました: " + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [dbInstance, appId]);

  useEffect(() => {
    setDbInstance(db);
    setAuthInstance(firebaseAuth);

    if (firebaseAuth) {
      const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
        setUser(currentUser);
        setUserId(currentUser ? currentUser.uid : crypto.randomUUID());
        setIsAuthReady(true);
        if (currentUser) {
          loadUserData(currentUser.uid);
        }
      });
      return () => unsubscribe();
    } else {
      console.error("Firebase auth instance is not available from firebase.ts.");
      setIsAuthReady(true);
    }
  }, [appId, loadUserData]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSimulationInput(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleSaveData = async () => {
    if (!user || !userId || !dbInstance) {
      setError("ユーザーが認証されていないか、データベースに接続されていません。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const planDocRef = doc(dbInstance, `artifacts/${appId}/users/${userId}/lifePlanData/latest`);
      // 保存するデータにuserIdと更新時刻を追加
      const dataToSave: SimulationInputData & { userId: string; updatedAt: string } = {
        ...simulationInput,
        currentAge: simulationInput.currentAge === '' ? 0 : Number(simulationInput.currentAge),
        retirementAge: simulationInput.retirementAge === '' ? 0 : Number(simulationInput.retirementAge),
        lifeExpectancy: simulationInput.lifeExpectancy === '' ? 0 : Number(simulationInput.lifeExpectancy), // ★追加
        currentSavings: simulationInput.currentSavings === '' ? 0 : Number(simulationInput.currentSavings),
        annualIncome: simulationInput.annualIncome === '' ? 0 : Number(simulationInput.annualIncome),
        monthlyExpenses: simulationInput.monthlyExpenses === '' ? 0 : Number(simulationInput.monthlyExpenses),
        investmentRatio: simulationInput.investmentRatio === '' ? 0 : Number(simulationInput.investmentRatio),
        annualReturn: simulationInput.annualReturn === '' ? 0 : Number(simulationInput.annualReturn),
        pensionAmountPerYear: simulationInput.pensionAmountPerYear === '' ? 0 : Number(simulationInput.pensionAmountPerYear), // ★追加
        pensionStartDate: simulationInput.pensionStartDate === '' ? 0 : Number(simulationInput.pensionStartDate), // ★新規追加
        severancePay: simulationInput.severancePay === '' ? 0 : Number(simulationInput.severancePay), // ★新規追加
        userId: userId,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(planDocRef, dataToSave, { merge: true });
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

    const { currentAge, retirementAge, lifeExpectancy, currentSavings, annualIncome, monthlyExpenses, investmentRatio, annualReturn, pensionAmountPerYear, pensionStartDate, severancePay } = simulationInput;

    // バリデーション: 空文字やマイナス値をチェック (新しい項目も対象に)
    if ([currentAge, retirementAge, lifeExpectancy, currentSavings, annualIncome, monthlyExpenses, investmentRatio, annualReturn, pensionAmountPerYear, pensionStartDate, severancePay].some(val => val === '' || (typeof val === 'number' && val < 0))) {
        setError("すべての項目を正しく入力してください（0以上の数値を入力）。");
        setLoading(false);
        return;
    }
    // バリデーション: currentAge と retirementAge と lifeExpectancy と pensionStartDate が数値であることを確認
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
      };
      console.log("Request body for simulation API:", JSON.stringify(requestBody, null, 2)); // ★デバッグ用ログ追加
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
      console.log("Simulation API response data:", data); // APIレスポンス全体をログ出力
      if (data.assetData) {
        console.log("Received assetData:", JSON.stringify(data.assetData, null, 2)); // assetDataを整形してログ出力
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

          <InputFormComponent
            input={simulationInput}
            onInputChange={handleInputChange}
            onSubmit={handleSimulate}
            onSave={handleSaveData}
            loading={loading}
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
              {/* assetData があればグラフも表示 */}
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
