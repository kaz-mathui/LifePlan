# LifePlan - ライフプランシミュレーター

あなたの未来の家計を、分かりやすく予測するWebアプリケーションです。

## ✨ 主な機能

- **詳細なシミュレーション**: 収入、支出、投資、住宅ローン、教育費などの様々な要素を考慮したライフプランのシミュレーション。
- **グラフによる可視化**: 年齢別の資産推移をグラフで直感的に確認。
- **プラン管理**: 複数のライフプランを保存・比較検討。

## 🚀 技術スタック

- **フロントエンド**: React, TypeScript, Vite, Tailwind CSS
- **バックエンド**: Node.js, Express, TypeScript
- **インフラ**: AWS (ECS Fargate, ALB, ECR), Terraform
- **CI/CD**: GitHub Actions, AWS CodePipeline

---

## 📖 開発ガイド

### ローカル開発環境のセットアップ

1.  **依存関係のインストール**:
    プロジェクトのルートで以下のコマンドを実行し、フロントエンドとバックエンドの全ての依存関係をインストールします。
    ```bash
    pnpm install
    ```

2.  **環境変数の設定**:
    プロジェクトのルートに`.env`ファイルを作成し、Firebaseなどの設定を記述します。
    ```env
    # .env
    VITE_FIREBASE_API_KEY=...
    VITE_FIREBASE_AUTH_DOMAIN=...
    VITE_FIREBASE_PROJECT_ID=...
    VITE_FIREBASE_STORAGE_BUCKET=...
    VITE_FIREBASE_MESSAGING_SENDER_ID=...
    VITE_FIREBASE_APP_ID=...
    ```

3.  **開発サーバーの起動**:
    `docker-compose`を使用して、フロントエンドとバックエンドの開発サーバーを起動します。
    ```bash
    docker compose up --build
    ```
    - フロントエンド: `http://localhost:5173`
    - バックエンド: `http://localhost:3001`

---

## ☁️ AWSインフラとCI/CD

このアプリケーションは、TerraformによるIaC (Infrastructure as Code) と、AWS CodePipelineによる継続的デプロイが設定されています。

### インフラの構築・管理

インフラの定義はすべて`/infra`ディレクトリ内のTerraformコードで管理されています。

- **初回デプロイ**:
  ```bash
  cd infra
  terraform init
  terraform apply
  ```
  `apply`後、一度だけ[AWS CodeStarの接続コンソール](https://ap-northeast-1.console.aws.amazon.com/codesuite/settings/connections)でGitHub連携を手動で承認する必要があります。

- **インフラの更新**:
  `infra`ディレクトリ内の`.tf`ファイルを修正し、`terraform apply`を実行します。

- **サービスの停止・再開（コスト削減のため）**:
  ALBなどの一部リソースは常時稼働しているとコストが発生します。開発や検証が不要な期間は、以下のスクリプトでサービスを安全に停止・再開できます。
  
  - **サービス停止**:
    ```bash
    ./scripts/stop_services.sh
    ```
  - **サービス再開**:
    ```bash
    ./scripts/start_services.sh
    ```

### CI/CDプロセス

- **CI (継続的インテグレーション)**:
  - **トリガー**: `main`ブランチへのPull Request作成・更新時。
  - **実行内容**: GitHub Actionsが起動し、`pnpm install`と`pnpm --filter frontend build`を実行して、コードのビルドと静的チェックを行います。
  - **設定ファイル**: `.github/workflows/ci.yml`

- **CD (継続的デプロイ)**:
  - **トリガー**: `main`ブランチへのマージ時。
  - **実行内容**:
    1. AWS CodePipelineが起動し、ソースコードをS3に取得します。
    2. AWS CodeBuildが`buildspec.yml`の定義に従い、DockerイメージのビルドとECRへのプッシュを行います。
    3. AWS CodeDeploy(ECS)が、新しいDockerイメージを使ってECSサービスを更新し、本番環境にデプロイします。
  - **設定ファイル**: `infra/codepipeline.tf`, `buildspec.yml`

