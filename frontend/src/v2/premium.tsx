/**
 * 課金まわり(マネタイズ正典プラン: docs/strategy/MONETIZATION.md)。
 *
 * - ゲート位置: ScenarioBoard(複数施策の同時組合せ)。初回の不安低減アークは100%無料
 * - PAYWALL_ENABLED: REACT_APP_PAYWALL=on でゲート有効化(offの間は全機能無料のまま)
 * - プレミアム状態: billing/{uid}(クライアント書込禁止・バックエンドのみ更新)を購読
 * - 決済: バックエンド /api/billing/checkout → Stripe Checkout(7日トライアル)へリダイレクト
 */
import React, { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL } from '../constants';
import { ALL_SCENARIOS } from './scenarios';
import { simulateFromAnswers, getKeyMetrics, runMonteCarlo } from './simulator';

export const PAYWALL_ENABLED = process.env.REACT_APP_PAYWALL === 'on';

const PREMIUM_STATUSES = new Set(['active', 'trialing']);

interface BillingInfo {
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export function usePremium(): { isPremium: boolean } & BillingInfo {
  const { user } = useAuth();
  const [info, setInfo] = useState<BillingInfo>({ status: null, currentPeriodEnd: null, cancelAtPeriodEnd: false });

  useEffect(() => {
    if (!user?.uid) { setInfo({ status: null, currentPeriodEnd: null, cancelAtPeriodEnd: false }); return; }
    const unsub = onSnapshot(
      doc(db, 'billing', user.uid),
      snap => {
        const d = snap.data();
        setInfo({
          status: (d?.subscriptionStatus as string) || null,
          currentPeriodEnd: (d?.currentPeriodEnd as string) || null,
          cancelAtPeriodEnd: !!d?.cancelAtPeriodEnd,
        });
      },
      () => setInfo({ status: null, currentPeriodEnd: null, cancelAtPeriodEnd: false }),
    );
    return unsub;
  }, [user?.uid]);

  return { isPremium: info.status != null && PREMIUM_STATUSES.has(info.status), ...info };
}

/** Checkout開始(バックエンド経由でセッション作成→リダイレクト) */
async function startCheckout(plan: 'annual' | 'monthly', idToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/billing/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    return data.url || null;
  } catch {
    return null;
  }
}

/** 決済成功リダイレクト(?billing=success&session_id=...)を検知してconfirm→URLを掃除 */
export function useBillingReturn() {
  const { user } = useAuth();
  const [confirmed, setConfirmed] = useState<null | 'success' | 'failed'>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') !== 'success' || !user) return;
    const sessionId = params.get('session_id');
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(
          `${API_BASE_URL}/api/billing/confirm?session_id=${encodeURIComponent(sessionId || '')}`,
          { headers: { Authorization: `Bearer ${idToken}` } },
        );
        const data = await res.json();
        setConfirmed(data.premium ? 'success' : 'failed');
      } catch {
        setConfirmed('failed');
      } finally {
        // billingパラメータをURLから除去(v2フラグは維持)
        const url = new URL(window.location.href);
        url.searchParams.delete('billing');
        url.searchParams.delete('session_id');
        window.history.replaceState({}, '', url.toString());
      }
    })();
  }, [user]);

  return confirmed;
}

/** Customer Portal(解約・支払い管理)を開く */
export async function openCustomerPortal(idToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/billing/portal`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json();
    if (data.url) { window.location.href = data.url; return true; }
    return false;
  } catch {
    return false;
  }
}

/**
 * アカウント/プレミアムセクション(ツールタブ)。
 * 購入後の「居場所」: 会員状態・期限・解約ポータル。無料時はアップセル導線。
 */
export const AccountSection: React.FC<{ onOpenPaywall: () => void }> = ({ onOpenPaywall }) => {
  const { user } = useAuth();
  const { isPremium, status, currentPeriodEnd, cancelAtPeriodEnd } = usePremium();
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = async () => {
    if (!user) return;
    setPortalLoading(true);
    const ok = await openCustomerPortal(await user.getIdToken());
    if (!ok) setPortalLoading(false);
  };

  const periodEndText = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  if (isPremium) {
    return (
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <div className="text-sm font-extrabold">
            プレミアム会員{status === 'trialing' ? '(無料トライアル中)' : ''}
          </div>
        </div>
        <div className="mt-1 text-[11px] opacity-90 leading-relaxed">
          戦略ボード・プラン保存・全機能が使えます。
          {periodEndText && (
            cancelAtPeriodEnd
              ? ` ${periodEndText} まで有効(更新停止済み)。`
              : status === 'trialing'
                ? ` 無料期間は ${periodEndText} まで。`
                : ` 次回更新日: ${periodEndText}。`
          )}
        </div>
        <button
          onClick={openPortal}
          disabled={portalLoading}
          className="mt-3 w-full py-2.5 rounded-xl bg-white/15 text-white text-xs font-bold active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {portalLoading ? '開いています…' : '💳 お支払い管理・解約(いつでも1タップ)'}
        </button>
      </div>
    );
  }

  if (!PAYWALL_ENABLED) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="text-sm font-bold text-gray-900">✨ プレミアム</div>
      <div className="mt-1 text-xs text-gray-500 leading-relaxed">
        戦略ボードで複数の打ち手を組み合わせ、プランを保存・比較。年3,980円(月あたり332円)。
      </div>
      <button
        onClick={onOpenPaywall}
        className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold active:scale-[0.98] transition-transform"
      >
        7日間無料で試す
      </button>
    </div>
  );
};

/** ActionPlanと同じ打ち手セット(表示上位3つの合算効果をペイウォールで見せる) */
const PAYWALL_ACTION_IDS = new Set(['nisa_max', 'side_income', 'rent_down', 'risk_invest', 'career_up', 'sp_career', 'work_longer', 'cost_down']);

const probIcon = (p: number) => (p >= 0.85 ? '🟢' : p >= 0.6 ? '🟡' : p >= 0.4 ? '🟠' : '🔴');

/** answersから「現在の確率→打ち手3つ適用後の確率」を実計算(決済前に自分の数字で価値を見せる) */
function useBeforeAfter(answers: Record<string, any> | undefined) {
  return useMemo(() => {
    if (!answers || Object.keys(answers).length === 0) return null;
    try {
      const base = getKeyMetrics(simulateFromAnswers(answers));
      const beforeProb = runMonteCarlo(answers, 200).successProbability;
      const actions = ALL_SCENARIOS
        .filter(s => PAYWALL_ACTION_IDS.has(s.id) && s.condition(answers))
        .map(s => {
          const m = getKeyMetrics(simulateFromAnswers({ ...answers, ...s.modifications(answers) }));
          return { s, delta: m.assetsAt65 - base.assetsAt65 };
        })
        .filter(x => x.delta > 10)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 3);
      if (actions.length < 2) return null;
      let merged = { ...answers };
      actions.forEach(({ s }) => { merged = { ...merged, ...s.modifications(merged) }; });
      const afterProb = runMonteCarlo(merged, 200).successProbability;
      if (afterProb <= beforeProb + 0.01) return null; // 改善が見えない場合は出さない
      return { beforeProb, afterProb, count: actions.length };
    } catch {
      return null;
    }
  }, [answers]);
}

interface PaywallModalProps {
  onClose: () => void;
  /** 渡すと「あなたの場合 X%→Y%」の実データBefore/Afterを表示 */
  answers?: Record<string, any>;
}

/** 正典プランの価格・世界観コピーをそのまま使ったペイウォール */
export const PaywallModal: React.FC<PaywallModalProps> = ({ onClose, answers }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<'annual' | 'monthly' | null>(null);
  const [error, setError] = useState(false);
  const beforeAfter = useBeforeAfter(answers);

  const choose = async (plan: 'annual' | 'monthly') => {
    if (!user) { setError(true); return; }
    setLoading(plan);
    setError(false);
    const idToken = await user.getIdToken();
    const url = await startCheckout(plan, idToken);
    if (url) {
      window.location.href = url; // Stripe Checkoutへ
    } else {
      setError(true);
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-lg font-extrabold text-gray-900 leading-snug">
          複数の一手を重ねて、<br />「荒天」を自分の手で晴らす
        </div>
        <div className="mt-1 text-xs text-gray-500 leading-relaxed">
          アクションプランの打ち手を<b className="text-gray-700">自分で組み替えて</b>、「寿命まで持つ確率」がどこまで上がるかをその場で確認・保存できます。転職やFIREなど、あり得た未来の比較も。
        </div>

        {/* あなた自身の数字でのBefore/After(推定ではなく実計算) */}
        {beforeAfter && (
          <div className="mt-3 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-300 rounded-xl p-3 text-center">
            <div className="text-[10px] font-bold text-emerald-800">あなたの回答で実計算した例(打ち手{beforeAfter.count}つを重ねた場合)</div>
            <div className="mt-1 text-xl font-extrabold text-gray-900">
              {probIcon(beforeAfter.beforeProb)}{Math.round(beforeAfter.beforeProb * 100)}%
              <span className="mx-2 text-gray-400">→</span>
              {probIcon(beforeAfter.afterProb)}{Math.round(beforeAfter.afterProb * 100)}%
            </div>
            <div className="text-[10px] text-emerald-800">寿命まで資金が持つ確率。組み合わせ次第でさらに上げられます</div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <button
            onClick={() => choose('annual')}
            disabled={loading !== null}
            className="w-full flex items-center justify-between bg-blue-50 border-2 border-blue-400 rounded-xl p-3 active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            <div className="text-left">
              <div className="text-xs font-extrabold text-blue-900">年額プラン(おすすめ)</div>
              <div className="text-[10px] text-blue-700">実質月332円(1日約11円)・月払いより年1,780円おトク</div>
            </div>
            <div className="text-lg font-extrabold text-blue-900">
              {loading === 'annual' ? '…' : <>¥3,980<span className="text-[10px] font-normal">/年</span></>}
            </div>
          </button>
          <button
            onClick={() => choose('monthly')}
            disabled={loading !== null}
            className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-3 active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            <div className="text-xs font-bold text-gray-700">月額プラン</div>
            <div className="text-sm font-extrabold text-gray-900">
              {loading === 'monthly' ? '…' : <>¥480<span className="text-[10px] font-normal">/月</span></>}
            </div>
          </button>
        </div>

        <div className="mt-2 text-center text-[11px] font-bold text-green-700">
          どちらも7日間無料。期間中の解約は0円です
        </div>
        <div className="mt-1.5 text-center text-[11px] text-gray-500">
          FP相談は1回<b className="text-gray-700">3万円</b>。LifePlanなら<b className="text-gray-700">その1/8で1年間</b>、何度でも再診断できます
        </div>
        {error && (
          <div className="mt-2 text-center text-[11px] font-bold text-red-600">
            決済ページを開けませんでした。時間をおいて再度お試しください
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-2 w-full py-2 text-xs font-bold text-gray-500"
        >
          今は無料版のまま使う
        </button>

        <div className="mt-3 text-[10px] text-gray-400 leading-relaxed">
          私たちは保険も投資信託も一切売りません。だからこの診断は信じられる——収益はあなたの購読だけです。
          解約はいつでもマイページから1タップで可能です。
        </div>
      </div>
    </div>
  );
};
