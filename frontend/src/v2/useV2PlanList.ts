/**
 * useV2PlanList: v2プラン一覧の取得と管理
 * 保存パス: users/{uid}/v2plans/{planId}
 */
import { useEffect, useState, useCallback } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { v4 as uuidv4 } from 'uuid';

export interface V2PlanListItem {
  id: string;
  planName: string;
  updatedAt?: any;
}

export function useV2PlanList() {
  const { user } = useAuth();
  const uid = user?.uid || null;
  const [plans, setPlans] = useState<V2PlanListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = useCallback(async () => {
    if (!uid) { setPlans([]); setLoading(false); return; }
    try {
      const ref = collection(db, 'users', uid, 'v2plans');
      const q = query(ref, orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      const items: V2PlanListItem[] = snap.docs.map(d => ({
        id: d.id,
        planName: (d.data() as any).planName || 'プラン',
        updatedAt: (d.data() as any).updatedAt,
      }));
      // default プランがまだなければ自動作成
      if (!items.find(p => p.id === 'default')) {
        const defaultRef = doc(db, 'users', uid, 'v2plans', 'default');
        const existing = await getDoc(defaultRef);
        if (!existing.exists()) {
          await setDoc(defaultRef, {
            planName: 'メインプラン',
            answers: {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        items.unshift({ id: 'default', planName: 'メインプラン' });
      }
      setPlans(items);
    } catch (e) {
      console.warn('plan list fetch err', e);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const createPlan = useCallback(async (planName: string, fromPlanId?: string): Promise<string | null> => {
    if (!uid) return null;
    const newId = uuidv4();
    let baseAnswers = {};
    if (fromPlanId) {
      // 複製: 元プランの answers をコピー
      const src = await getDoc(doc(db, 'users', uid, 'v2plans', fromPlanId));
      if (src.exists()) baseAnswers = (src.data() as any).answers || {};
    }
    await setDoc(doc(db, 'users', uid, 'v2plans', newId), {
      planName,
      answers: baseAnswers,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await fetchList();
    return newId;
  }, [uid, fetchList]);

  const renamePlan = useCallback(async (planId: string, newName: string) => {
    if (!uid) return;
    await setDoc(doc(db, 'users', uid, 'v2plans', planId), {
      planName: newName,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    await fetchList();
  }, [uid, fetchList]);

  const deletePlanById = useCallback(async (planId: string) => {
    if (!uid || planId === 'default') return;
    await deleteDoc(doc(db, 'users', uid, 'v2plans', planId));
    await fetchList();
  }, [uid, fetchList]);

  return { plans, loading, uid, createPlan, renamePlan, deletePlan: deletePlanById, refresh: fetchList };
}
