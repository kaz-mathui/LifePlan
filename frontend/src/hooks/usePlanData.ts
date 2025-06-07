import { useState, useCallback } from 'react';
import { doc, setDoc, getDoc, collection, query, orderBy, getDocs, DocumentData, Timestamp, deleteDoc } from 'firebase/firestore';
import { FirebaseFirestore } from '../services/firebase'; // FirebaseFirestore の型をインポート
import { LifeEvent, SimulationInputData, PlanListItem } from '../types'; // ★ 追加: 型定義をtypes.tsからインポート
import toast from 'react-hot-toast';

interface UsePlanDataProps {
  db: FirebaseFirestore | null;
  appId: string;
  userId: string | null;
}

interface SavePlanResult {
  success: boolean;
  planId?: string;
  planName?: string;
  updatedAt?: string;
  error?: string;
}

// ★ プラン一覧読み込みの結果型
interface LoadPlansResult {
  success: boolean;
  plans?: PlanListItem[];
  error?: string;
}

// ★ 個別プラン読み込みの結果型 (SimulationInputDataの部分集合を返すイメージ)
interface LoadSpecificPlanResult {
  success: boolean;
  planData?: Partial<SimulationInputData>; // 完全にSimulationInputDataと一致しない場合も考慮
  error?: string;
  notFound?: boolean; // プランが見つからなかった場合にtrue
}

// ★ プラン削除の結果型
interface DeletePlanResult {
  success: boolean;
  error?: string;
}

export const usePlanData = ({ db, appId, userId }: UsePlanDataProps) => {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ★ プラン一覧読み込み用の状態
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(false);
  const [loadPlansError, setLoadPlansError] = useState<string | null>(null);

  // ★ 個別プラン読み込み用の状態
  const [isLoadingSpecificPlan, setIsLoadingSpecificPlan] = useState<boolean>(false);
  const [loadSpecificPlanError, setLoadSpecificPlanError] = useState<string | null>(null);

  // ★ プラン削除用の状態
  const [isDeletingPlan, setIsDeletingPlan] = useState<boolean>(false);
  const [deletePlanError, setDeletePlanError] = useState<string | null>(null);

  const savePlan = useCallback(async (
    simulationInput: SimulationInputData,
  ): Promise<SavePlanResult> => {
    if (!userId || !db) {
      const errorMsg = "ユーザーが認証されていないか、データベースに接続されていません。";
      setSaveError(errorMsg);
      // toast.error(errorMsg); // App.tsx側でエラー状態を見てtoastを出すのでここでは不要かも
      return { success: false, error: errorMsg };
    }
    if (!simulationInput.planName.trim()) {
      const errorMsg = "プラン名を入力してください。";
      setSaveError(errorMsg);
      // toast.error(errorMsg); // 同上
      return { success: false, error: errorMsg };
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const planIdToSave = simulationInput.id || crypto.randomUUID();
      const isNewPlan = !simulationInput.id;

      const planDocRef = doc(db, `artifacts/${appId}/users/${userId}/lifePlans/${planIdToSave}`);

      const cleanedLifeEvents = (simulationInput.lifeEvents || []).map((event: LifeEvent) => ({
        ...event,
        endAge: event.endAge === undefined ? null : event.endAge,
      }));

      // 新しいデータ構造に合わせて保存するデータを構築
      const dataToSave = {
        ...simulationInput, // 新しい詳細データ(housing, educationなど)をすべて含める
        lifeEvents: cleanedLifeEvents,
        id: planIdToSave, 
        userId: userId,
        updatedAt: new Date().toISOString(),
        ...(isNewPlan && { createdAt: new Date().toISOString() }), 
      };

      // 不要なプロパティや変換が必要なものをここで処理することも可能
      // 例: delete dataToSave.someUnwantedProp;

      await setDoc(planDocRef, dataToSave, { merge: true });
      
      // toast.success("データが保存されました！"); // App.tsx側でtoastを出す
      setIsSaving(false);
      return { 
        success: true, 
        planId: planIdToSave, 
        planName: dataToSave.planName,
        updatedAt: dataToSave.updatedAt,
      };

    } catch (err: any) {
      console.error("Error saving data to Firestore in usePlanData:", err);
      const errorMessage = "データの保存に失敗しました: " + (err.message || 'Unknown error');
      setSaveError(errorMessage);
      // toast.error(errorMessage); // App.tsx側でtoastを出す
      setIsSaving(false);
      return { success: false, error: errorMessage };
    }
  }, [db, appId, userId]); // savePlanの依存配列を修正

  // ★ プラン一覧を読み込む関数
  const loadPlans = useCallback(async (): Promise<LoadPlansResult> => {
    if (!db || !userId) {
      const errorMsg = "データベースまたはユーザーIDが利用できません。";
      setLoadPlansError(errorMsg);
      return { success: false, error: errorMsg };
    }
    setIsLoadingPlans(true);
    setLoadPlansError(null);
    try {
      const plansCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/lifePlans`);
      const q = query(plansCollectionRef, orderBy("updatedAt", "desc"));
      const querySnapshot = await getDocs(q);
      const plans: PlanListItem[] = [];
      querySnapshot.forEach((docSn) => { // doc は setDoc と被るので docSn に変更
        const data = docSn.data();
        plans.push({
          id: docSn.id,
          planName: data.planName || '名称未設定プラン',
          updatedAt: data.updatedAt, // FirestoreのTimestampをISO文字列に変換する必要があれば行う
        });
      });
      setIsLoadingPlans(false);
      return { success: true, plans };
    } catch (err: any) {
      console.error("Error loading user plans in usePlanData:", err);
      const errorMessage = "保存済みプラン一覧の読み込みに失敗しました: " + (err.message || 'Unknown error');
      setLoadPlansError(errorMessage);
      setIsLoadingPlans(false);
      return { success: false, error: errorMessage };
    }
  }, [db, userId, appId]); // 依存配列にappIdも追加

  // ★ 特定のプランIDのデータを読み込む関数
  const loadSpecificPlan = useCallback(async (planId: string): Promise<LoadSpecificPlanResult> => {
    if (!db || !userId || !planId) {
      const errorMsg = "データベース、ユーザーID、またはプランIDが利用できません。";
      setLoadSpecificPlanError(errorMsg);
      return { success: false, error: errorMsg };
    }
    setIsLoadingSpecificPlan(true);
    setLoadSpecificPlanError(null);
    try {
      const planDocRef = doc(db, `artifacts/${appId}/users/${userId}/lifePlans/${planId}`);
      const docSnap = await getDoc(planDocRef);
      setIsLoadingSpecificPlan(false);
      if (docSnap.exists()) {
        const data = docSnap.data() as DocumentData; // App.tsxでの型アサーションを参考に
        // SimulationInputDataの形式に変換 (App.tsxのロジックを参考にする)
        const planData: Partial<SimulationInputData> = {
          id: data.id ?? planId,
          planName: data.planName,
          currentAge: data.currentAge,
          retirementAge: data.retirementAge,
          lifeExpectancy: data.lifeExpectancy,
          annualIncome: data.annualIncome,
          salaryIncreaseRate: data.salaryIncreaseRate ?? 0, // 以前のデータにはないためデフォルト値
          currentSavings: data.currentSavings,
          investmentRatio: data.investmentRatio,
          annualReturn: data.annualReturn,
          severancePay: data.severancePay,
          monthlyExpenses: data.monthlyExpenses,
          pensionAmountPerYear: data.pensionAmountPerYear,
          pensionStartDate: data.pensionStartDate,
          housing: data.housing, // 新しいデータを追加
          education: data.education,
          car: data.car,
          senior: data.senior,
          lifeEvents: data.lifeEvents ?? [],
        };
        return { success: true, planData };
      } else {
        return { success: true, notFound: true }; // データなし
      }
    } catch (err: any) {
      console.error("Error loading specific plan data in usePlanData:", err);
      const errorMessage = "プランデータの読み込みに失敗しました: " + (err.message || 'Unknown error');
      setLoadSpecificPlanError(errorMessage);
      setIsLoadingSpecificPlan(false);
      return { success: false, error: errorMessage };
    }
  }, [db, userId, appId]); // 依存配列にappIdも追加

  // ★ プランを削除する関数
  const deletePlan = useCallback(async (planIdToDelete: string): Promise<DeletePlanResult> => {
    if (!db || !userId || !planIdToDelete) {
      const errorMsg = "プランの削除に必要な情報が不足しています (db, userId, or planId)";
      setDeletePlanError(errorMsg);
      // toast.error(errorMsg); // App側でtoast
      return { success: false, error: errorMsg };
    }
    setIsDeletingPlan(true);
    setDeletePlanError(null);
    try {
      const planDocRef = doc(db, `artifacts/${appId}/users/${userId}/lifePlans/${planIdToDelete}`);
      await deleteDoc(planDocRef);
      // toast.success('プランが削除されました。'); // App側でtoast
      setIsDeletingPlan(false);
      return { success: true };
    } catch (err: any) {
      console.error("Error deleting plan in usePlanData:", err);
      const errorMessage = "プランの削除に失敗しました: " + (err.message || 'Unknown error');
      setDeletePlanError(errorMessage);
      // toast.error(errorMessage); // App側でtoast
      setIsDeletingPlan(false);
      return { success: false, error: errorMessage };
    }
  }, [db, userId, appId]);

  return { 
    savePlan, 
    isSaving, 
    saveError, 
    loadPlans, 
    isLoadingPlans, 
    loadPlansError, 
    loadSpecificPlan, 
    isLoadingSpecificPlan, 
    loadSpecificPlanError,
    deletePlan,             // ★ 追加
    isDeletingPlan,       // ★ 追加
    deletePlanError       // ★ 追加
  };
}; 
