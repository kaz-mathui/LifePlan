import { useState, useCallback } from 'react';
import { doc, setDoc, getDocs, collection, query, orderBy, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User } from 'firebase/auth';
import { initialSimulationInput } from '../constants';
import toast from 'react-hot-toast';
import { Plan, SimulationInputData } from '../types';

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
    const fetchedPlans: Plan[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            planName: data.planName || '名称未設定',
            updatedAt: data.updatedAt?.toDate()?.toISOString() || new Date().toISOString(),
            data: data as SimulationInputData,
        }
    });
    setPlans(fetchedPlans);
    if(fetchedPlans.length > 0 && !selectedPlanId) {
        setSelectedPlanId(fetchedPlans[0].id);
    }
  }, [getPlansCollection, selectedPlanId]);

  const savePlan = useCallback(
    async (planId: string | null, data: SimulationInputData) => {
      const plansCollection = getPlansCollection();
      if (!plansCollection) {
        toast.error('ユーザー認証が必要です。');
        return { success: false, error: 'ユーザー認証が必要です。' };
      }
      
      const planIdToSave = planId || doc(plansCollection).id;

      setIsSaving(true);
      try {
        const planDoc = doc(plansCollection, planIdToSave);
        await setDoc(planDoc, { ...data, id: planIdToSave, updatedAt: serverTimestamp() }, { merge: true });
        await fetchPlans(); // 保存後にリストを更新
        toast.success('プランを保存しました！');
        return { success: true };
      } catch (error: any) {
        console.error('Error saving plan:', error);
        toast.error('プランの保存に失敗しました。');
        return { success: false, error: error.message };
      } finally {
        setIsSaving(false);
      }
    },
    [getPlansCollection, fetchPlans]
  );

  const deletePlan = useCallback(
    async (planId: string) => {
      const plansCollection = getPlansCollection();
      if (!plansCollection) return;

      try {
        const planDoc = doc(plansCollection, planId);
        await deleteDoc(planDoc);
        toast.success('プランを削除しました。');
        
        const remainingPlans = plans.filter(p => p.id !== planId);
        setPlans(remainingPlans);
        if (selectedPlanId === planId) {
            setSelectedPlanId(remainingPlans.length > 0 ? remainingPlans[0].id : null);
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
    if (!plansCollection) return null;

    const newPlanDoc = doc(plansCollection);
    try {
        const newPlanName = `新しいプラン ${plans.length + 1}`;
        await setDoc(newPlanDoc, { ...initialSimulationInput, id: newPlanDoc.id, planName: newPlanName, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        await fetchPlans();
        return newPlanDoc.id;
    } catch (error) {
        console.error('Error creating new plan:', error);
        toast.error('新規プランの作成に失敗しました。');
        return null;
    }
  }, [getPlansCollection, fetchPlans, plans.length]);

  return { plans, selectedPlanId, setSelectedPlanId, fetchPlans, savePlan, deletePlan, createNewPlan, isSaving };
}; 
 