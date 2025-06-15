# 1. ビルドステージ
FROM public.ecr.aws/library/node:18-alpine AS builder

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
# buildspec.ymlで生成した.envファイルをコピー
COPY frontend/.env ./frontend/.env
# frontendが参照する可能性のあるbackendの型定義をコピー
COPY backend/src/types.ts ./backend/src/

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
 