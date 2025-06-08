# 1. ビルドステージ
FROM node:18-alpine AS builder

# pnpmのインストール
RUN npm install -g pnpm

# 作業ディレクトリを設定
WORKDIR /app

# ワークスペース全体の依存関係定義ファイルをコピー
COPY package.json pnpm-lock.yaml ./

# backendとfrontendのpackage.jsonをコピー
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# backendとその依存関係に必要なパッケージをインストール
RUN pnpm install --filter lifeplan-backend...

# backendのソースコードをコピー
COPY backend/ ./backend/

# TypeScriptをJavaScriptにコンパイル
RUN pnpm --filter lifeplan-backend run build

# 2. 本番ステージ
FROM node:18-alpine

# pnpmのインストール
RUN npm install -g pnpm

WORKDIR /app

# プロダクション用の依存関係を再インストールするため、関連ファイルをコピー
COPY package.json pnpm-lock.yaml ./
COPY backend/package.json ./backend/
COPY --from=builder /app/backend/dist ./backend/dist

# 本番用の依存パッケージのみをインストール
RUN pnpm install --filter lifeplan-backend... --prod

# ポート番号を環境変数から受け取るようにする (デフォルトは3001)
ENV PORT 3001

# コンテナがリッスンするポートを公開
EXPOSE ${PORT}

# アプリケーションを起動
CMD ["pnpm", "--filter", "lifeplan-backend", "start"]

# CMD ["npm", "start"] # This would be for production using dist
# For development, docker-compose will override this with `npm run dev` 
 