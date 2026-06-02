/**
 * useV2Answers: v2 回答(186問)を Firestore に保存・取得する hook
 *
 * 保存パス: users/{uid}/v2plans/{planId}
 *   - 既存の `users/{uid}/plans` とは別コレクション(後方互換のため分離)
 *   - planId="default" を初期プランとして自動作成
 *
 * オフライン対応:
 *   - 読み込み時: Firestore優先、失敗時 localStorage フォールバック
 *   - 書き込み時: 楽観的にローカル更新、debounce で Firestore へ反映
 *
 * 未ログイン時:
 *   - localStorage のみ
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

const LS_KEY_PREFIX = 'lifeplan_v2_answers';
const DEBOUNCE_MS = 600;

type Answers = Record<string, any>;

interface V2PlanDoc {
  planName: string;
  answers: Answers;
  updatedAt?: any;
  createdAt?: any;
}

const lsKey = (uid: string | null, planId: string) =>
  uid ? `${LS_KEY_PREFIX}_${uid}_${planId}` : `${LS_KEY_PREFIX}_anon_${planId}`;

const legacyLsKey = 'lifeplan_v2_answers'; // Phase 1 で使っていたキー

export function useV2Answers(planId: string = 'default') {
  const { user } = useAuth();
  const uid = user?.uid || null;
  const [answers, setAnswersState] = useState<Answers>({});
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初回ロード: Firestore → localStorage → レガシーキー の順
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // 1. ローカルキャッシュ即時表示
      try {
        const local = localStorage.getItem(lsKey(uid, planId));
        if (local) {
          const parsed = JSON.parse(local) as Answers;
          if (!cancelled) setAnswersState(parsed);
        } else {
          // Phase 1 のレガシーキーがあれば取り込む(ワンタイム移行)
          const legacy = localStorage.getItem(legacyLsKey);
          if (legacy) {
            const parsed = JSON.parse(legacy) as Answers;
            if (!cancelled) setAnswersState(parsed);
            localStorage.setItem(lsKey(uid, planId), legacy);
          }
        }
      } catch (e) { console.warn('local load err', e); }

      // 2. Firestore から取得(ログイン時のみ)
      if (uid) {
        try {
          const ref = doc(db, 'users', uid, 'v2plans', planId);
          const snap = await getDoc(ref);
          if (!cancelled && snap.exists()) {
            const data = snap.data() as V2PlanDoc;
            if (data.answers) {
              setAnswersState(data.answers);
              localStorage.setItem(lsKey(uid, planId), JSON.stringify(data.answers));
            }
          }
        } catch (e) {
          console.warn('firestore load failed, using local', e);
        }
      }

      if (!cancelled) setLoaded(true);
    };
    load();
    return () => { cancelled = true; };
  }, [uid, planId]);

  // Firestore リアルタイム購読(他端末からの更新を反映)
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, 'users', uid, 'v2plans', planId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as V2PlanDoc;
        if (data.answers) {
          setAnswersState(prev => {
            // 簡易差分判定: JSON 文字列で比較
            const same = JSON.stringify(prev) === JSON.stringify(data.answers);
            if (same) return prev;
            localStorage.setItem(lsKey(uid, planId), JSON.stringify(data.answers));
            return data.answers;
          });
        }
      }
    }, (err) => console.warn('snapshot err', err));
    return () => unsub();
  }, [uid, planId]);

  // 保存(debounce付き)
  const flushToFirestore = useCallback(async (next: Answers) => {
    if (!uid) return;
    try {
      setSyncing(true);
      const ref = doc(db, 'users', uid, 'v2plans', planId);
      await setDoc(ref, {
        planName: 'デフォルトプラン',
        answers: next,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('firestore save err', e);
    } finally {
      setSyncing(false);
    }
  }, [uid, planId]);

  const updateAnswer = useCallback((key: string, value: any) => {
    setAnswersState(prev => {
      const next = { ...prev, [key]: value };
      // ローカルは即時保存
      try { localStorage.setItem(lsKey(uid, planId), JSON.stringify(next)); } catch {}
      // Firestore は debounce
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => flushToFirestore(next), DEBOUNCE_MS);
      return next;
    });
  }, [uid, planId, flushToFirestore]);

  const clearAnswers = useCallback(async () => {
    setAnswersState({});
    try { localStorage.removeItem(lsKey(uid, planId)); } catch {}
    if (uid) await flushToFirestore({});
  }, [uid, planId, flushToFirestore]);

  return { answers, updateAnswer, clearAnswers, loaded, syncing, uid };
}
