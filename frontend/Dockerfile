# 1. ビルドステージ
FROM node:18-alpine AS builder

# pnpmのインストール
RUN npm install -g pnpm

# 作業ディレクトリを設定
WORKDIR /app

# ワークスペース全体の依存関係定義ファイルをコピー
COPY package.json pnpm-lock.yaml ./

# backendのpackage.jsonをコピー (ワークスペースの依存解決に必要)
COPY backend/package.json ./backend/
# frontendのpackage.jsonをコピー
COPY frontend/package.json ./frontend/

# 依存関係をインストール (ビルドツールも含むため--prodは付けない)
# --filter lifeplan-frontend... はfrontendとその依存先のみを対象
RUN pnpm install --filter lifeplan-frontend...

# アプリケーションのソースコードをコピー
COPY frontend/ ./frontend/
# frontendが参照する可能性のあるbackendの型定義をコピー
COPY backend/src/types.ts ./backend/src/

# ビルド時に環境変数を渡す
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
ARG REACT_APP_FIREBASE_API_KEY
ENV REACT_APP_FIREBASE_API_KEY=${REACT_APP_FIREBASE_API_KEY}
ARG REACT_APP_FIREBASE_AUTH_DOMAIN
ENV REACT_APP_FIREBASE_AUTH_DOMAIN=${REACT_APP_FIREBASE_AUTH_DOMAIN}
ARG REACT_APP_FIREBASE_PROJECT_ID
ENV REACT_APP_FIREBASE_PROJECT_ID=${REACT_APP_FIREBASE_PROJECT_ID}
ARG REACT_APP_FIREBASE_STORAGE_BUCKET
ENV REACT_APP_FIREBASE_STORAGE_BUCKET=${REACT_APP_FIREBASE_STORAGE_BUCKET}
ARG REACT_APP_FIREBASE_MESSAGING_SENDER_ID
ENV REACT_APP_FIREBASE_MESSAGING_SENDER_ID=${REACT_APP_FIREBASE_MESSAGING_SENDER_ID}
ARG REACT_APP_FIREBASE_APP_ID
ENV REACT_APP_FIREBASE_APP_ID=${REACT_APP_FIREBASE_APP_ID}

# frontendアプリをビルド
RUN pnpm --filter lifeplan-frontend run build

# 2. 本番ステージ
FROM nginx:1.25-alpine

# ビルダーからビルド成果物（静的ファイル）をnginxの公開ディレクトリにコピー
COPY --from=builder /app/frontend/build /usr/share/nginx/html

# nginxがリッスンするポートを公開
EXPOSE 80

# nginxをフォアグラウンドで実行
CMD ["nginx", "-g", "daemon off;"] 
 