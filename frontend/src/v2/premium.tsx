/**
 * 課金まわり(マネタイズ正典プラン: docs/strategy/MONETIZATION.md)。
 *
 * - ゲート位置: ScenarioBoard(複数施策の同時組合せ)。初回の不安低減アークは100%無料
 * - PAYWALL_ENABLED: REACT_APP_PAYWALL=on でゲート有効化(offの間は全機能無料のまま)
 * - プレミアム状態: billing/{uid}(クライアント書込禁止・バックエンドのみ更新)を購読
 * - 決済: バックエンド /api/billing/checkout → Stripe Checkout(7日トライアル)へリダイレクト
 */
import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL } from '../constants';

export const PAYWALL_ENABLED = process.env.REACT_APP_PAYWALL === 'on';

const PREMIUM_STATUSES = new Set(['active', 'trialing']);

export function usePremium(): { isPremium: boolean; status: string | null } {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) { setStatus(null); return; }
    const unsub = onSnapshot(
      doc(db, 'billing', user.uid),
      snap => setStatus((snap.data()?.subscriptionStatus as string) || null),
      () => setStatus(null),
    );
    return unsub;
  }, [user?.uid]);

  return { isPremium: status != null && PREMIUM_STATUSES.has(status), status };
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

interface PaywallModalProps {
  onClose: () => void;
}

/** 正典プランの価格・世界観コピーをそのまま使ったペイウォール */
export const PaywallModal: React.FC<PaywallModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<'annual' | 'monthly' | null>(null);
  const [error, setError] = useState(false);

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
          戦略ボードでは複数の打ち手を同時に組み合わせて、あなた専用の立て直しプランを設計・保存できます。
        </div>

        <div className="mt-4 space-y-2">
          <button
            onClick={() => choose('annual')}
            disabled={loading !== null}
            className="w-full flex items-center justify-between bg-blue-50 border-2 border-blue-400 rounded-xl p-3 active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            <div className="text-left">
              <div className="text-xs font-extrabold text-blue-900">年額プラン(おすすめ)</div>
              <div className="text-[10px] text-blue-700">実質月332円・33%おトク</div>
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
