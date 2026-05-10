# 1. ビルドステージ
FROM node:18-alpine AS builder

# pnpmのインストール
RUN npm install -g pnpm

# 作業ディレクトリを設定
WORKDIR /app

# ワークスペース全体の依存関係定義ファイルをコピー
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# backendとfrontendのpackage.jsonをコピー
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# 依存関係をインストール (devDependenciesも含む)
RUN pnpm install --filter lifeplan-backend

# backendのソースコードをコピー
COPY backend/ ./backend/

# TypeScriptをJavaScriptにコンパイル
RUN pnpm --filter lifeplan-backend run build

# 2. 本番ステージ
FROM node:18-alpine

# pnpmのインストール
RUN npm install -g pnpm

WORKDIR /app

# ユーザーとグループを作成
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# ワークスペースと依存関係の定義ファイルのみをコピー
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
# frontendのpackage.jsonもコピーしてワークスペースの整合性を保つ
COPY frontend/package.json ./frontend/

# 本番用の依存パッケージのみをインストール
# chownで権限を与えてから実行
RUN chown -R appuser:appgroup /app
USER appuser
RUN pnpm install --filter lifeplan-backend --prod

# ビルドステージからコンパイル済みコードをコピー
COPY --from=builder --chown=appuser:appgroup /app/backend/dist ./backend/dist

# ポート番号を環境変数から受け取るようにする (デフォルトは3001)
ENV PORT 3001

# コンテナがリッスンするポートを公開
EXPOSE ${PORT}

# アプリケーションを起動
CMD ["node", "./backend/dist/server.js"]

# CMD ["npm", "start"] # This would be for production using dist
# For development, docker-compose will override this with `npm run dev` 
 