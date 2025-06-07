import { useState, useCallback } from 'react';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../src/services/firebase'; // パスを修正
import { SimulationInputData, Plan, PlanListItem } from '../src/types';
import { User } from 'firebase/auth';
import toast from 'react-hot-toast';
import { initialSimulationInput } from '../src/constants';

export const usePlanData = (user: User | null) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const getPlansCollection = useCallback(() => {
    if (!user) return null;
    return collection(db, `users/${user.uid}/plans`);
  }, [user]);

  const fetchPlans = useCallback(async () => {
    const plansCollection = getPlansCollection();
    if (!plansCollection) {
      setPlans([]);
      return;
    }
    const q = query(plansCollection, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const fetchedPlans: Plan[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedPlans.push({
            id: doc.id,
            planName: data.planName || '名称未設定',
            updatedAt: data.updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
            data: data as SimulationInputData,
        });
    });
    setPlans(fetchedPlans);
    if(fetchedPlans.length > 0 && !selectedPlanId) {
        setSelectedPlanId(fetchedPlans[0].id);
    }
  }, [getPlansCollection, selectedPlanId]);

  const savePlan = useCallback(
    async (planId: string, data: SimulationInputData) => {
      const plansCollection = getPlansCollection();
      if (!plansCollection) {
        toast.error('ユーザー認証が必要です。');
        return;
      }
      setIsSaving(true);
      try {
        const planDoc = doc(plansCollection, planId);
        await setDoc(planDoc, { ...data, updatedAt: serverTimestamp() }, { merge: true });
        toast.success('プランを保存しました！');
        await fetchPlans(); // 保存後にリストを更新
      } catch (error) {
        console.error('Error saving plan:', error);
        toast.error('プランの保存に失敗しました。');
      } finally {
        setIsSaving(false);
      }
    },
    [getPlansCollection, fetchPlans]
  );

  const deletePlan = useCallback(
    async (planId: string) => {
      const plansCollection = getPlansCollection();
      if (!plansCollection) {
        toast.error('ユーザー認証が必要です。');
        return;
      }
      try {
        const planDoc = doc(plansCollection, planId);
        await deleteDoc(planDoc);
        toast.success('プランを削除しました。');
        
        // 削除後の処理
        const remainingPlans = plans.filter(p => p.id !== planId);
        setPlans(remainingPlans);
        if (selectedPlanId === planId) {
            if(remainingPlans.length > 0) {
                setSelectedPlanId(remainingPlans[0].id);
            } else {
                setSelectedPlanId(null);
            }
        }
      } catch (error) {
        console.error('Error deleting plan:', error);
        toast.error('プランの削除に失敗しました。');
      }
    },
    [getPlansCollection, plans, selectedPlanId]
  );
  
  const createNewPlan = useCallback(async () => {
    const plansCollection = getPlansCollection();
    if (!plansCollection) {
      toast.error('ユーザー認証が必要です。');
      return null;
    }
    const newPlanDoc = doc(collection(db, `users/${user!.uid}/plans`));
    try {
        await setDoc(newPlanDoc, { ...initialSimulationInput, planName: "新しいプラン", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        toast.success("新しいプランを作成しました。");
        await fetchPlans();
        return newPlanDoc.id;
    } catch (error) {
        console.error('Error creating new plan:', error);
        toast.error('新規プランの作成に失敗しました。');
        return null;
    }
  }, [getPlansCollection, fetchPlans, user]);

  return { plans, selectedPlanId, setSelectedPlanId, fetchPlans, savePlan, deletePlan, createNewPlan, isSaving };
}; 
