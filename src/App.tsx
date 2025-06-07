import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from './services/firebase';
import { doc, setDoc, getDoc, DocumentData, collection, query, orderBy, getDocs, limit, where, deleteDoc } from "firebase/firestore";
import { toast } from 'react-hot-toast';

const App: React.FC = () => {
  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [simulationInput, setSimulationInput] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [initialSimulationInput, setInitialSimulationInput] = useState(null);

  useEffect(() => {
    if (user) {
      fetchPlans();
    }
  }, [user, fetchPlans]);

  useEffect(() => {
    if (initialSimulationInput) {
        setSimulationInput(initialSimulationInput);
    }
  }, [initialSimulationInput]);

  const handleCreateNewPlan = useCallback(() => {
    // ... existing code ...
  }, [user]);

  const createMergedPlan = useCallback((planId: string, planData: SimulationInputData) => {
    // ... existing code ...
  }, []);

  useEffect(() => {
    if (user && plans.length > 0) {
      const latestPlan = plans[0];
      if (latestPlan) {
        setSimulationInput(createMergedPlan(latestPlan.id, latestPlan.data));
        setSelectedPlanId(latestPlan.id);
      } else {
        handleCreateNewPlan();
      }
    } else if (user) {
      handleCreateNewPlan();
    }
  }, [user, plans, handleCreateNewPlan, createMergedPlan]);

  const handleUpdateLifeEvent = (updatedLifeEvents: LifeEvent[]) => {
    // ... existing code ...
  };

  const handleSavePlan = async () => {
    if (!user || !selectedPlanId) {
      // ... existing code ...
      return;
    }
    const { planName, ...saveData } = simulationInput;
    const planRef = doc(db, "users", user.uid, "plans", selectedPlanId);
    try {
      await setDoc(planRef, {
        name: planName,
        ...saveData,
        createdAt: new Date(),
      });
      toast.success("プランが保存されました！");
      fetchPlans(); // 保存後にプラン一覧を再取得
    } catch (error) {
      // ... existing code ...
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!user) return;
    if (window.confirm("本当にこのプランを削除しますか？")) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "plans", planId));
        toast.success("プランを削除しました。");
        fetchPlans(); // 削除後にプラン一覧を再取得
      } catch (error) {
        console.error("Error deleting plan: ", error);
        toast.error("プランの削除中にエラーが発生しました。");
      }
    }
  };

  const { lifeEvents, ...restInput } = simulationInput;
  const simulationResult = simulationInput ? calculateSimulation(restInput, lifeEvents) : null;

  return (
    <div className="App bg-gray-50 min-h-screen">
      // ... existing code ...
    </div>
  );
};

export default App; 
