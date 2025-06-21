import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/firebase';
import { Plan, SimulationInputData } from '../types';
import { defaultInput } from '../constants';

const sanitizeData = (data: Partial<SimulationInputData>): SimulationInputData => {
    const parsed = data || {};
    return {
        ...defaultInput,
        ...parsed,
        housing: { ...defaultInput.housing, ...(parsed.housing || {}) },
        education: { ...defaultInput.education, ...(parsed.education || {}) },
        car: { ...defaultInput.car, ...(parsed.car || {}) },
        senior: { ...defaultInput.senior, ...(parsed.senior || {}) },
        lifeEvents: Array.isArray(parsed.lifeEvents) ? parsed.lifeEvents : defaultInput.lifeEvents,
    };
};

export const usePlanData = (
  user: User | null,
  setSimulationInput: Dispatch<SetStateAction<SimulationInputData>>
) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getPlansCollection = () => {
    if (!user) throw new Error("ユーザーが認証されていません");
    return collection(db, 'users', user.uid, 'plans');
  };

  const fetchPlans = useCallback(async () => {
    if (!user) {
      setPlans([]);
      setActivePlanId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const plansQuery = query(getPlansCollection(), orderBy('updatedAt', 'desc'));
      const querySnapshot = await getDocs(plansQuery);
      
      const fetchedPlans: Plan[] = querySnapshot.docs.map(doc => {
        const docData = doc.data();
        const planInputData = docData.data || docData;
        const sanitizedInputData = sanitizeData(planInputData);
        const planName = sanitizedInputData.planName || `プラン ${doc.id.substring(0, 4)}`;

        const plan: Plan = {
          id: doc.id,
          planName: planName,
          data: {
            ...sanitizedInputData,
            id: doc.id,
            planName: planName
          },
          createdAt: docData.createdAt,
          updatedAt: docData.updatedAt
        };
        return plan;
      });
      
      setPlans(fetchedPlans);

      if (fetchedPlans.length > 0) {
        const lastActivePlanId = localStorage.getItem('lastActivePlanId');
        const planToSelect = fetchedPlans.find(p => p.id === lastActivePlanId) || fetchedPlans[0];
        setActivePlanId(planToSelect.id);
        setSimulationInput(planToSelect.data);
      } else {
        // No plans found, create a new one
        await handleNewPlan(false); // don't setLoading(true) again inside
      }
    } catch (error) {
      console.error("プランの読み込みに失敗しました:", error);
      // Fallback to a new plan if fetching fails
      await handleNewPlan(false);
    } finally {
      setLoading(false);
    }
  }, [user, setSimulationInput]);


  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleSelectPlan = (id: string | null) => {
    setActivePlanId(id);
    if(id) {
        const selectedPlan = plans.find(p => p.id === id);
        if (selectedPlan) {
          setSimulationInput(sanitizeData(selectedPlan.data));
          localStorage.setItem('lastActivePlanId', id);
        }
    }
  };

  const handleSavePlan = async (currentInput: SimulationInputData) => {
    if (!user || !activePlanId) return;
    setLoading(true);
    try {
      const planRef = doc(getPlansCollection(), activePlanId);
      const dataToSave = sanitizeData(currentInput);
      await setDoc(planRef, { data: dataToSave, updatedAt: serverTimestamp() }, { merge: true });
      // Update local state immediately for responsiveness
      const updatedPlans = plans.map(p => p.id === activePlanId ? { ...p, data: dataToSave } : p);
      setPlans(updatedPlans);
    } catch (error) {
      console.error("プランの保存に失敗しました:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewPlan = async (shouldLoad = true) => {
    if (!user) return;
    if (shouldLoad) setLoading(true);

    const newPlanId = uuidv4();
    const newPlanData: SimulationInputData = {
      ...defaultInput,
      id: newPlanId,
      planName: `新しいプラン ${new Date().toLocaleTimeString()}`,
    };

    try {
      const planRef = doc(getPlansCollection(), newPlanId);
      const planToSave = {
        data: newPlanData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
      await setDoc(planRef, planToSave);
      
      const newPlanForState: Plan = {
          id: newPlanId,
          planName: newPlanData.planName,
          ...planToSave,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
      };

      setPlans(prevPlans => [newPlanForState, ...prevPlans]);
      setSimulationInput(newPlanData);
      setActivePlanId(newPlanId);
      localStorage.setItem('lastActivePlanId', newPlanId);
    } catch (error) {
      console.error("新規プランの作成に失敗しました:", error);
    } finally {
      if (shouldLoad) setLoading(false);
    }
  };

  const handleUpdatePlanName = async (name: string) => {
    if (!activePlanId) return;
    
    // Optimistic UI update
    const oldPlans = plans;
    const updatedPlans = plans.map(p =>
      p.id === activePlanId ? { ...p, data: { ...p.data, planName: name } } : p
    );
    setPlans(updatedPlans);
    setSimulationInput(prev => ({ ...prev, planName: name }));

    try {
        const planRef = doc(getPlansCollection(), activePlanId);
        await setDoc(planRef, { data: { planName: name }, updatedAt: serverTimestamp() }, { merge: true });
    } catch (error) {
        console.error("プラン名の更新に失敗しました:", error);
        setPlans(oldPlans); // Rollback on error
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!user) return;
    
    const oldPlans = plans;
    const newPlans = plans.filter(p => p.id !== id);
    setPlans(newPlans);

    if (activePlanId === id) {
      if (newPlans.length > 0) {
        handleSelectPlan(newPlans[0].id);
      } else {
        await handleNewPlan(); 
      }
    }

    try {
      await deleteDoc(doc(getPlansCollection(), id));
    } catch (error) {
      console.error("プランの削除に失敗しました:", error);
      setPlans(oldPlans); // Rollback
    }
  };

  return {
    plans,
    activePlanId,
    loading,
    handleSelectPlan,
    handleSavePlan,
    handleNewPlan,
    handleUpdatePlanName,
    handleDeletePlan,
  };
}; 
 