import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, getDoc } from 'firebase/firestore';
import { useAuth } from './useAuth';
import { SimulationInputData, PlanListItem, Plan } from '../types';
import { defaultInput } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';

// 古いデータ形式から新しい形式に変換する関数
const convertLegacyData = (data: any): SimulationInputData => {
  const convertNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  return {
    planName: data.planName || defaultInput.planName,
    currentAge: convertNumber(data.currentAge),
    retirementAge: convertNumber(data.retirementAge),
    lifeExpectancy: convertNumber(data.lifeExpectancy),
    annualIncome: convertNumber(data.annualIncome),
    salaryIncreaseRate: convertNumber(data.salaryIncreaseRate),
    currentSavings: convertNumber(data.currentSavings),
    investmentRatio: convertNumber(data.investmentRatio),
    annualReturn: convertNumber(data.annualReturn),
    severancePay: convertNumber(data.severancePay),
    monthlyExpenses: convertNumber(data.monthlyExpenses),
    pensionAmountPerYear: convertNumber(data.pensionAmountPerYear),
    pensionStartDate: convertNumber(data.pensionStartDate),
    housing: {
      hasLoan: data.housing?.hasLoan || false,
      propertyValue: convertNumber(data.housing?.propertyValue),
      downPayment: convertNumber(data.housing?.downPayment),
      loanAmount: convertNumber(data.housing?.loanAmount),
      interestRate: convertNumber(data.housing?.interestRate),
      loanTerm: convertNumber(data.housing?.loanTerm),
      startAge: convertNumber(data.housing?.startAge),
      propertyTaxRate: convertNumber(data.housing?.propertyTaxRate),
    },
    education: {
      hasChildren: data.education?.hasChildren || false,
      children: (data.education?.children || []).map((child: any) => ({
        birthYear: convertNumber(child.birthYear),
        plan: child.plan || "public",
        customAmount: child.customAmount ? convertNumber(child.customAmount) : null,
      })),
      childLivingCost: convertNumber(data.education?.childLivingCost),
    },
    car: {
      hasCar: data.car?.hasCar || false,
      price: convertNumber(data.car?.price),
      downPayment: convertNumber(data.car?.downPayment),
      loanAmount: convertNumber(data.car?.loanAmount),
      loanTerm: convertNumber(data.car?.loanTerm),
      interestRate: convertNumber(data.car?.interestRate),
      maintenanceCost: convertNumber(data.car?.maintenanceCost),
      purchaseAge: convertNumber(data.car?.purchaseAge),
      replacementCycle: convertNumber(data.car?.replacementCycle),
    },
    senior: {
      enabled: data.senior?.enabled || false,
      startAge: convertNumber(data.senior?.startAge),
      monthlyExpense: convertNumber(data.senior?.monthlyExpense),
      careCost: convertNumber(data.senior?.careCost),
    },
    lifeEvents: (data.lifeEvents || []).map((event: any) => ({
      id: event.id,
      description: event.description,
      type: event.type,
      amount: convertNumber(event.amount),
      startAge: convertNumber(event.startAge),
      endAge: event.endAge ? convertNumber(event.endAge) : null,
    })),
    childCount: convertNumber(data.childCount),
  };
};

export const usePlanData = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [inputData, setInputData] = useState<SimulationInputData>(defaultInput);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const getPlansCollection = useCallback(() => {
    if (!user) return null;
    return collection(db, 'users', user.uid, 'plans');
  }, [user]);

  const selectPlan = useCallback(async (id: string, plansCollection: any) => {
    setLoading(true);
    try {
      const docRef = doc(plansCollection, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const planData = docSnap.data() as Plan;
        const convertedData = convertLegacyData(planData.data);
        setInputData(convertedData);
        setCurrentPlanId(id);
        localStorage.setItem('lastUsedPlanId', id);
      } else {
        console.error("No such plan!");
      }
    } catch (error) {
      console.error("Error selecting plan: ", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const newPlan = useCallback(() => {
    const newPlanId = uuidv4();
    const planName = `新しいプラン ${plans.length + 1}`;
    const newPlanData: Plan = {
      id: newPlanId,
      planName: planName,
      data: {
        ...defaultInput,
        planName: planName,
      },
    };
    setInputData(newPlanData.data);
    setCurrentPlanId(newPlanId);
    toast.success('新しいプランを作成しました。');
  }, [plans.length]);

  const fetchPlans = useCallback(async () => {
    const plansCollection = getPlansCollection();
    if (!plansCollection) {
      setPlans([]);
      setCurrentPlanId(null);
      setInputData(defaultInput);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(plansCollection, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        await newPlan();
        return;
      }
      
      const fetchedPlans: PlanListItem[] = snapshot.docs.map(d => {
          const data = d.data() as Plan;
          return {
            id: d.id,
            planName: data.planName,
            updatedAt: data.updatedAt,
          };
      });

      setPlans(fetchedPlans);

      const lastUsedPlanId = localStorage.getItem('lastUsedPlanId');
      const planToLoad = fetchedPlans.find(p => p.id === lastUsedPlanId) || fetchedPlans[0];
      await selectPlan(planToLoad.id, plansCollection);

    } catch (error) {
      console.error("Error fetching plans: ", error);
      const plansCollection = getPlansCollection();
      if(plansCollection) await newPlan();
    } finally {
      setLoading(false);
    }
  }, [getPlansCollection, newPlan, selectPlan]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleInputChange = useCallback((name: string, value: any) => {
    if (name === 'root') {
      setInputData(value);
      return;
    }

    const keys = name.split('.');
    if (keys.length > 1) {
      setInputData(prev => {
        const newState = { ...prev };
        let current: any = newState;
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]] = { ...current[keys[i]] };
        }
        current[keys[keys.length - 1]] = value;
        return newState;
      });
    } else {
      setInputData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handlePlanNameChange = (name: string) => {
    handleInputChange('planName', name);
  };

  const savePlan = useCallback(async (planToSave: Pick<Plan, 'id' | 'planName' | 'data'>) => {
    console.log('savePlan関数が呼び出されました');
    console.log('保存するプラン:', planToSave);
    console.log('ユーザー:', user);
    
    if (!user) {
      toast.error("ログインが必要です。");
      return;
    }
    setIsSaving(true);
    try {
      const planRef = doc(db, 'users', user.uid, 'plans', planToSave.id);
      
      // undefined値をnullに変換するクリーンアップ関数
      const cleanData = (obj: any): any => {
        if (obj === null || obj === undefined) return null;
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(cleanData);
        
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          cleaned[key] = value === undefined ? null : cleanData(value);
        }
        return cleaned;
      };
      
      const cleanedData = cleanData(planToSave.data);
      const dataToSave = { 
        ...planToSave,
        data: cleanedData,
        updatedAt: new Date().toISOString()
      };
      console.log('Firebaseに保存するデータ:', dataToSave);
      await setDoc(planRef, dataToSave, { merge: true });

      setPlans(prev => {
        const index = prev.findIndex(p => p.id === planToSave.id);
        const newPlanListItem = { id: planToSave.id, planName: planToSave.planName, updatedAt: dataToSave.updatedAt };
        if (index > -1) {
          const newPlans = [...prev];
          newPlans[index] = newPlanListItem;
          return newPlans;
        }
        return [...prev, newPlanListItem];
      });
      toast.success(`プラン「${planToSave.planName}」を保存しました。`);
    } catch (error) {
      console.error("Error saving plan: ", error);
      toast.error("プランの保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  }, [user]);

  const deletePlan = useCallback(async (planId: string) => {
    if (!user) return;
    try {
      const planRef = doc(db, 'users', user.uid, 'plans', planId);
      await deleteDoc(planRef);
      setPlans(prev => prev.filter(p => p.id !== planId));
      
      // 削除したプランが選択中だった場合
      if(currentPlanId === planId) {
        if (plans.length > 1) {
          const nextPlan = plans.find(p => p.id !== planId);
          if (nextPlan) {
            const plansCollection = getPlansCollection();
            if(plansCollection) selectPlan(nextPlan.id, plansCollection);
          }
        } else {
          newPlan();
        }
      }
      toast.success('プランを削除しました。');
    } catch (error) {
      console.error("Error deleting plan: ", error);
      toast.error('プランの削除に失敗しました。');
    }
  }, [user, plans, currentPlanId, selectPlan, newPlan]);

  return {
    plans,
    currentPlanId,
    inputData,
    loading,
    isSaving,
    selectPlan: (id: string) => {
        const plansCollection = getPlansCollection();
        if(plansCollection) selectPlan(id, plansCollection);
    },
    savePlan,
    newPlan: () => {
        const plansCollection = getPlansCollection();
        if(plansCollection) newPlan();
    },
    deletePlan,
    handleInputChange,
    handlePlanNameChange,
  };
}; 
