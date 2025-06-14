import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import simulationRoutes from './routes/simulation';
import admin from 'firebase-admin';

// Heroku/GCPの環境変数からサービスアカウント情報を取得
// ローカルで実行する場合は、環境変数 GOOGLE_APPLICATION_CREDENTIALS にファイルパスを設定
const serviceAccountKey = process.env.SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  throw new Error('SERVICE_ACCOUNT_KEY environment variable is not set.');
}

const serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app: Express = express();
const PORT: string | number = process.env.PORT || 3001;

// ミドルウェア
app.use(cors()); // すべてのオリジンからのリクエストを許可 (開発用)
// 本番環境では、フロントエンドのオリジンのみを許可するように設定してください。
// 例: app.use(cors({ origin: 'http://your-frontend-domain.com' }));
app.use(express.json()); // リクエストボディをJSONとしてパース

// ルート
app.get('/', (req: Request, res: Response) => {
  res.send('Life Planning API is running!');
});

// ヘルスチェック用エンドポイント
app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

// Firestoreへのデータ保存エンドポイント
app.post('/api/plans', async (req, res) => {
    try {
        const planData = req.body;
        // Firestoreの 'plans' コレクションに新しいドキュメントを追加
        const docRef = await db.collection('plans').add(planData);
        res.status(201).json({ id: docRef.id });
    } catch (error) {
        console.error("Error adding document: ", error);
        res.status(500).json({ error: 'Failed to save plan' });
    }
});

app.use('/api/simulations', simulationRoutes);

// エラーハンドリングミドルウェア (簡易版)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
}); 
