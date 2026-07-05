/**
 * 課金まわりの骨格(マネタイズ正典プラン: docs/strategy/MONETIZATION.md)。
 *
 * - ゲート位置: ScenarioBoard(複数施策の同時組合せ)。初回の不安低減アークは100%無料
 * - PAYWALL_ENABLED: Stripe実装が載るまでゲートは無効(=全機能無料のまま)。
 *   環境変数 REACT_APP_PAYWALL=on で有効化する
 * - isPremium: 暫定は localStorage フラグ。Stripe導入時に subscription_status(Firestore)へ移行
 */
import React from 'react';

export const PAYWALL_ENABLED = process.env.REACT_APP_PAYWALL === 'on';

export function usePremium(): { isPremium: boolean } {
  // TODO(Stripe): users/{uid}.subscription_status を購読する
  const isPremium = typeof window !== 'undefined' && localStorage.getItem('lifeplan_premium') === '1';
  return { isPremium };
}

interface PaywallModalProps {
  onClose: () => void;
}

/** 正典プランの価格・世界観コピーをそのまま使ったペイウォール */
export const PaywallModal: React.FC<PaywallModalProps> = ({ onClose }) => (
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
        <div className="flex items-center justify-between bg-blue-50 border-2 border-blue-400 rounded-xl p-3">
          <div>
            <div className="text-xs font-extrabold text-blue-900">年額プラン(おすすめ)</div>
            <div className="text-[10px] text-blue-700">実質月332円・33%おトク</div>
          </div>
          <div className="text-lg font-extrabold text-blue-900">¥3,980<span className="text-[10px] font-normal">/年</span></div>
        </div>
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-3">
          <div className="text-xs font-bold text-gray-700">月額プラン</div>
          <div className="text-sm font-extrabold text-gray-900">¥480<span className="text-[10px] font-normal">/月</span></div>
        </div>
      </div>

      <button
        disabled
        className="mt-4 w-full py-3 rounded-xl bg-gray-300 text-white text-sm font-bold cursor-not-allowed"
      >
        7日間無料で試す(近日公開)
      </button>
      <button
        onClick={onClose}
        className="mt-2 w-full py-2 text-xs font-bold text-gray-500"
      >
        今は無料版のまま使う
      </button>

      <div className="mt-3 text-[10px] text-gray-400 leading-relaxed">
        私たちは保険も投資信託も一切売りません。だからこの診断は信じられる——収益はあなたの購読だけです。
      </div>
    </div>
  </div>
);
