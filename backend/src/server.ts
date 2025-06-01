import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import simulationRoutes from './routes/simulation';

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

app.use('/api/simulation', simulationRoutes);

// エラーハンドリングミドルウェア (簡易版)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
}); 
