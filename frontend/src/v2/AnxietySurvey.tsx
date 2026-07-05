/**
 * North Star 計測: 初回の本予測表示直後に「老後の不安、軽くなりましたか?」を1タップで聞く。
 *
 * - 表示条件: ベース予測解放後、予測タブを初めて見てから数秒後に1回だけ
 * - 保存先: users/{uid}/surveys/{autoId}(Firestoreルール変更不要) + localStorage フォールバック
 * - 荒天ユーザーを分離計測するため、その時点の成功確率も併記して保存する
 */
import React, { useEffect, useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { runMonteCarlo } from './simulator';

const LS_DONE_KEY = 'lifeplan_v2_anxiety_survey_done';
const SHOW_DELAY_MS = 7000; // 判定・アクションプランを読む時間を確保してから聞く

type Response = 'reduced' | 'unchanged' | 'increased';

const OPTIONS: Array<{ value: Response; emoji: string; label: string }> = [
  { value: 'reduced', emoji: '😊', label: '減った' },
  { value: 'unchanged', emoji: '😐', label: '変わらない' },
  { value: 'increased', emoji: '😟', label: '増えた' },
];

interface AnxietySurveyProps {
  uid: string | null;
  answers: Record<string, any>;
  answeredCount: number;
  /** 本予測(解放済みの予測タブ)が表示されている時だけ true */
  active: boolean;
}

const AnxietySurvey: React.FC<AnxietySurveyProps> = ({ uid, answers, answeredCount, active }) => {
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<Response | null>(null);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(() => localStorage.getItem(LS_DONE_KEY) === '1');

  useEffect(() => {
    if (!active || done) return;
    const t = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [active, done]);

  if (done || !visible) return null;

  const submit = async (response: Response, freeComment: string) => {
    localStorage.setItem(LS_DONE_KEY, '1');
    setDone(true);
    const payload = {
      response,
      comment: freeComment.trim() || null,
      successProbability: runMonteCarlo(answers, 100).successProbability, // 荒天ユーザー分離計測用
      answeredCount,
      createdAt: new Date().toISOString(),
    };
    try {
      if (uid) {
        await addDoc(collection(db, 'users', uid, 'surveys'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        return;
      }
      throw new Error('no uid');
    } catch {
      // 未ログイン/権限エラー時はローカルに残す(後日同期は Phase 2)
      const local = JSON.parse(localStorage.getItem('lifeplan_v2_surveys_local') || '[]');
      local.push(payload);
      localStorage.setItem('lifeplan_v2_surveys_local', JSON.stringify(local));
    }
  };

  const dismiss = () => {
    // 回答なしで閉じた場合も再表示はしない(しつこさは信頼を削る)
    localStorage.setItem(LS_DONE_KEY, '1');
    setDone(true);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 pointer-events-none">
      <div className="max-w-xl mx-auto pointer-events-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 animate-[slideup_0.3s_ease-out]">
        {selected === null ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-extrabold text-gray-900 leading-snug">
                老後のお金の不安、<br className="sm:hidden" />少し軽くなりましたか?
              </div>
              <button onClick={dismiss} className="text-gray-400 text-lg leading-none px-1" aria-label="閉じる">×</button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setSelected(o.value)}
                  className="py-2.5 rounded-xl border border-gray-200 bg-gray-50 active:scale-[0.96] transition-transform"
                >
                  <div className="text-xl">{o.emoji}</div>
                  <div className="text-[10px] font-bold text-gray-700 mt-0.5">{o.label}</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-extrabold text-gray-900">ありがとうございます 🙏</div>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="よければ一言(任意): 何がそう感じさせましたか?"
              className="mt-2 w-full text-xs border border-gray-200 rounded-xl p-2 h-16 resize-none"
            />
            <button
              onClick={() => submit(selected, comment)}
              className="mt-2 w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold active:scale-[0.98] transition-transform"
            >
              送信する
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AnxietySurvey;
