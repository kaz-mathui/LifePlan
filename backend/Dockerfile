# 1. ビルドステージ
FROM node:18-alpine AS builder

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存パッケージをインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# TypeScriptをJavaScriptにコンパイル
RUN npm run build


# 2. 本番ステージ
FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー (本番用の依存関係のみインストールするため)
COPY package*.json ./

# 本番用の依存パッケージのみをインストール
RUN npm ci --omit=dev

# ビルドステージからコンパイル済みのファイルとnode_modulesをコピー
COPY --from=builder /app/dist ./dist

# ポート番号を環境変数から受け取るようにする (デフォルトは3001)
ENV PORT 3001

# コンテナがリッスンするポートを公開
EXPOSE ${PORT}

# アプリケーションを起動
CMD [ "npm", "start" ]

# CMD ["npm", "start"] # This would be for production using dist
# For development, docker-compose will override this with `npm run dev` 
 