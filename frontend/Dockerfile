# 1. ビルドステージ
FROM node:18-alpine AS builder

# pnpmのインストール
RUN npm install -g pnpm

# 作業ディレクトリを設定
WORKDIR /usr/src/app

# ワークスペース全体の依存関係定義ファイルをコピー
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# backendとfrontendのpackage.jsonをコピー
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# 依存関係をインストール
RUN pnpm install --filter lifeplan-frontend

# アプリケーションのソースコードをコピー
COPY frontend/ ./frontend/
# frontendが参照する可能性のあるbackendの型定義をコピー
COPY backend/src/types.ts ./backend/src/

# ビルド時に注入する環境変数（CRAは REACT_APP_* をビルド時にバンドルに埋め込む）
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# frontendアプリをビルド
RUN pnpm --filter lifeplan-frontend run build

# 2. 本番ステージ
FROM nginx:1.25-alpine

# ビルダーからビルド成果物（静的ファイル）をnginxの公開ディレクトリにコピー
COPY --from=builder /usr/src/app/frontend/build /usr/share/nginx/html

# nginxがリッスンするポートを公開
EXPOSE 80

# nginxをフォアグラウンドで実行
CMD ["nginx", "-g", "daemon off;"] 
 