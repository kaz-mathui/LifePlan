# 購入体験テスト手順（テストモード）

Stripeテスト環境で「購入前→購入→購入後」の全UXを実際に体験するための手順。実際のお金は1円も動かない。

## 0. 前提（ローカル環境の起動）

```bash
# ① backend起動（課金E2E用: prd-life-planのSAで起動する）
cd ~/work/private/LifePlan/backend
set -a && source .env && set +a
export SERVICE_ACCOUNT_KEY="$SERVICE_ACCOUNT_KEY_PRD"   # 課金テスト時のみprdに切替
export CORS_ORIGINS="http://localhost:8877"
npx ts-node -P tsconfig.json src/server.ts

# ② frontendビルド（ペイウォールON + ローカルbackend向き）
cd ~/work/private/LifePlan/frontend
REACT_APP_PAYWALL=on REACT_APP_BACKEND_URL=http://localhost:3001 \
  DISABLE_ESLINT_PLUGIN=true ./node_modules/.bin/react-scripts build

# ③ 配信
python3 -m http.server 8877 --directory build
```

ブラウザで **http://localhost:8877/?v2** を開く。

> 💡 コア12問を即スキップして解放状態にしたい場合は、開く前にDevToolsコンソールで:
> ```js
> localStorage.setItem('lifeplan_v2_answers', JSON.stringify({b_age:35,b_household_status:"single",sp_status:"none",c_has_or_plan:"none",is_annual_income:500,is_job_type:"regular",eh_type:"rent",eh_monthly:8,ef_total_monthly:20,ad_total:400,ai_total:100,r_retire_age:65}))
> ```
> を実行してからリロード→匿名ログイン。

## 1. 購入前（無料体験＝不安低減アーク）

1. ログイン画面 →「**登録なしで今すぐ診断する**」
2. コア12問に回答（または上のスキップ手順）
3. 予測タブ: 判定バナー（🔴◯%）→ アクションプラン → 合算着地点まで**全部無料で見える**ことを確認
4. 「もしも、の戦略ボード」をタップ → **ペイウォール**が出る（ここが課金ゲート）

## 2. 購入（Stripe Checkout）

1. ペイウォールで「**年額プラン ¥3,980**」をタップ
2. Stripe Checkout画面に遷移（`checkout.stripe.com`）。**カード入力欄が無い**こと・「7日間無料」表記を確認
3. **メールアドレスだけ**で「開始」→ トライアル即開始（2026-07-06からカード登録不要方式）
   - カード入力を体験したい場合: トライアル終了前にカード追加するフロー、またはStripeダッシュボードでtrial設定を外す。テストカードは以下:

| 項目 | 値 |
|---|---|
| メール | 任意（例: test@example.com） |
| カード番号 | `4242 4242 4242 4242` |
| 有効期限 | 任意の未来（例: 12/34） |
| CVC | 任意3桁（例: 123） |
| 名前 | 任意 |

> 失敗ケースも試せる: 決済拒否=`4000 0000 0000 0002` / 3Dセキュア要=`4000 0025 0000 3155`

4. 「申し込む」→ アプリに自動で戻る → 🎉「プレミアムへようこそ」トースト

## 3. 購入後（プレミアム体験）

1. **ヘッダに「✨ プレミアム」バッジ**が付く
2. 予測タブ →「もしも、の戦略ボード」が**ペイウォールなしで直接開く**
3. **ツールタブ** → 紫の「プレミアム会員(無料トライアル中)」カード:
   - 無料期間の期限日が表示される
   - 「💳 お支払い管理・解約」→ **Stripe Customer Portal** が開き、カード変更・解約が1タップでできる
4. Portalで「プランをキャンセル」を試す → アプリに戻るとカードが「更新停止済み」表記に変わる（期限までプレミアム維持）

## 4. リセット（もう一度最初から体験する）

- **別ユーザーとして**: シークレットウィンドウで開き直す（匿名ログインは毎回新規uid）
- **同じユーザーの購読を消す**: [Stripeダッシュボード(テスト)](https://dashboard.stripe.com/test/subscriptions) → 該当サブスクリプションをキャンセル → Firestoreコンソール(prd-life-plan) の `billing/{uid}` を削除
- **不安サーベイを再度出す**: `localStorage.removeItem('lifeplan_v2_anxiety_survey_done')`

## 5. 確認ポイント（Stripeダッシュボード側）

- [顧客一覧](https://dashboard.stripe.com/test/customers) にテスト顧客が作成されている
- [サブスクリプション](https://dashboard.stripe.com/test/subscriptions) が `トライアル中` になっている
- カード未登録のまま7日経過 → **自動キャンセル**（=「勝手に課金されない」の構造保証）。カード登録済みなら `active` に移行

## 既知の制約（テストモード）

- Webhook未登録のため、更新系イベントは「復帰時のconfirm API」でのみ反映（本番化時にWebhook登録→`STRIPE_WEBHOOK_SECRET`設定）
- 本番URLではペイウォール無効（`REACT_APP_PAYWALL`未設定=off）。本番有効化はcd.ymlにbuild-arg追加で行う
