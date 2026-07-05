/**
 * Stripe課金(正典プラン: docs/strategy/MONETIZATION.md)
 *
 * - POST /api/billing/checkout  { plan: 'annual' | 'monthly' } → Checkout Session URL(7日トライアル)
 * - GET  /api/billing/confirm?session_id=... → 決済確認しbilling/{uid}を更新(Webhook不達時の保険)
 * - POST /api/billing/portal → Customer Portal URL(解約・支払い管理のセルフサーブ)
 * - POST /api/billing/webhook → subscription状態の同期(server.tsでraw bodyマウント)
 *
 * プレミアム状態は billing/{uid}(クライアント書込禁止コレクション)に保存。
 * Firestoreルールで write:false のため、偽装はAdmin SDK経由(=ここ)以外不可能。
 */
import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import admin from 'firebase-admin';

// apiVersionは指定しない(SDK v22組み込みのバージョンを使用)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const PRICES: Record<string, string | undefined> = {
  annual: process.env.STRIPE_PRICE_ANNUAL,
  monthly: process.env.STRIPE_PRICE_MONTHLY,
};

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const router = Router();

/** Firebase IDトークン検証(匿名ユーザーも uid を持つので通る) */
async function verifyAuth(req: Request): Promise<string | null> {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    console.warn('[billing/auth] Authorizationヘッダなし');
    return null;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded.uid;
  } catch (e: any) {
    console.warn('[billing/auth] verifyIdToken失敗:', e?.code, '|', String(e?.message).slice(0, 200), '| token頭20字:', token.slice(0, 20));
    return null;
  }
}

/** billing/{uid} を更新(Admin SDKはルールをバイパスする) */
async function setBillingStatus(uid: string, data: Record<string, any>) {
  await admin.firestore().collection('billing').doc(uid).set(
    { ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true },
  );
}

/** subscription → billing ドキュメントへの正規化 */
function subToBilling(sub: Stripe.Subscription) {
  return {
    subscriptionStatus: sub.status, // trialing | active | canceled | past_due 等
    subscriptionId: sub.id,
    priceId: sub.items.data[0]?.price.id || null,
    currentPeriodEnd: (sub as any).current_period_end
      ? new Date((sub as any).current_period_end * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}

// --- Checkout ---
router.post('/checkout', async (req: Request, res: Response) => {
  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  const plan = req.body?.plan === 'monthly' ? 'monthly' : 'annual';
  const price = PRICES[plan];
  if (!price) return res.status(500).json({ error: 'price not configured' });

  try {
    // 既存customerがあれば再利用
    const billingDoc = await admin.firestore().collection('billing').doc(uid).get();
    const existingCustomer = billingDoc.get('stripeCustomerId') as string | undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { uid },
      },
      metadata: { uid },
      client_reference_id: uid,
      ...(existingCustomer ? { customer: existingCustomer } : {}),
      success_url: `${FRONTEND_URL}/?v2&billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/?v2&billing=cancel`,
      allow_promotion_codes: true,
    });
    return res.json({ url: session.url });
  } catch (e: any) {
    console.error('[billing/checkout]', e?.message);
    return res.status(500).json({ error: 'checkout failed' });
  }
});

// --- 決済確認(成功リダイレクト時の保険。Webhook未着でも即プレミアム化) ---
router.get('/confirm', async (req: Request, res: Response) => {
  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });
  const sessionId = String(req.query.session_id || '');
  if (!sessionId) return res.status(400).json({ error: 'session_id required' });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    if (session.metadata?.uid !== uid) return res.status(403).json({ error: 'uid mismatch' });

    const sub = session.subscription as Stripe.Subscription | null;
    if (sub && (sub.status === 'trialing' || sub.status === 'active')) {
      await setBillingStatus(uid, {
        stripeCustomerId: String(session.customer),
        ...subToBilling(sub),
      });
      return res.json({ premium: true, status: sub.status });
    }
    return res.json({ premium: false, status: sub?.status || 'unknown' });
  } catch (e: any) {
    console.error('[billing/confirm]', e?.message);
    return res.status(500).json({ error: 'confirm failed' });
  }
});

// --- Customer Portal(解約・カード変更のセルフサーブ) ---
router.post('/portal', async (req: Request, res: Response) => {
  const uid = await verifyAuth(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });
  try {
    const billingDoc = await admin.firestore().collection('billing').doc(uid).get();
    const customer = billingDoc.get('stripeCustomerId') as string | undefined;
    if (!customer) return res.status(404).json({ error: 'no customer' });

    const portal = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${FRONTEND_URL}/?v2`,
    });
    return res.json({ url: portal.url });
  } catch (e: any) {
    console.error('[billing/portal]', e?.message);
    return res.status(500).json({ error: 'portal failed' });
  }
});

// --- Webhook(server.tsで express.raw マウント必須) ---
export async function handleWebhook(req: Request, res: Response) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;
  try {
    if (secret) {
      const sig = req.headers['stripe-signature'] as string;
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } else {
      // 開発時(署名シークレット未設定)のみ検証スキップ
      event = JSON.parse(req.body.toString());
      console.warn('[billing/webhook] STRIPE_WEBHOOK_SECRET未設定: 署名検証をスキップ(本番では必須)');
    }
  } catch (e: any) {
    console.error('[billing/webhook] signature verification failed:', e?.message);
    return res.status(400).send('invalid signature');
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const uid = sub.metadata?.uid;
        if (uid) {
          await setBillingStatus(uid, {
            stripeCustomerId: String(sub.customer),
            ...subToBilling(sub),
          });
        }
        break;
      }
      default:
        break; // 他イベントは無視
    }
    return res.json({ received: true });
  } catch (e: any) {
    console.error('[billing/webhook] handler error:', e?.message);
    return res.status(500).send('handler error');
  }
}

export default router;
