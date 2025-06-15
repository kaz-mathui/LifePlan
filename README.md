# LifePlan - 未来家計シミュレーションアプリ

未来の家計をシミュレーションし、可視化するためのWebアプリケーションです。

## 📜 目次

- [✨ はじめに](#-はじめに)
- [🏗️ アーキテクチャ概要](#️-アーキテクチャ概要)
- [🛠️ 技術スタック](#️-技術スタック)
- [📂 プロジェクト構造](#-プロジェクト構造)
- [💻 ローカル開発環境セットアップ](#-ローカル開発環境セットアップ)
- [🚀 本番環境のセットアップと運用](#-本番環境のセットアップと運用)
  - [前提条件](#前提条件)
  - [初回デプロイ手順](#初回デプロイ手順)
  - [サービスの起動・停止 (コスト削減)](#サービスの起動停止-コスト削減)
  - [CI/CDによる自動デプロイ](#cicdによる自動デプロイ)
- [🔒 環境変数とシークレット管理](#-環境変数とシークレット管理)
- [🔮 今後の改善案](#-今後の改善案)

## ✨ はじめに

このプロジェクトは、React(Vite)によるフロントエンドとNode.js(Express)によるバックエンドで構成されるモノレポです。
AWS上のインフラはTerraformでコード管理されており、`base`レイヤー（永続的なリソース）と`alb`レイヤー（オンデマンドリソース）に分割されています。これにより、開発時間外はALBやECSサービスといったコストのかかるリソースを安全に削除でき、コスト効率の高い運用が可能です。

## 🏗️ アーキテクチャ概要

CI/CDはAWS CodePipelineとCodeBuildで構築されており、`main`ブランチへのプッシュをトリガーに、自動でテスト、ビルド、デプロイが実行されます。

```mermaid
graph TD
    subgraph "開発者"
        A[Git Push to main]
    end

    subgraph "AWS CI/CD (albレイヤー)"
        A --> B(CodePipeline: Source)
        B --> C{CodeBuild}
        C -- ビルド & ECRへプッシュ --> D[ECR: Dockerイメージリポジトリ]
        C -- ビルド情報をS3へ --> E[S3: アーティファクト]
        E --> F(CodePipeline: Deploy)
    end

    subgraph "AWS 本番環境"
        subgraph "base レイヤー (永続)"
            D
            J[Route 53: Hosted Zone]
            L[VPC, Subnets, etc.]
            M[ECS Cluster]
            N[IAM Roles]
            O[Secrets Manager]
        end

        subgraph "alb レイヤー (オンデマンド)"
            G[ALB]
            H[ECS Fargate: Frontend]
            I[ECS Fargate: Backend]
            K[Route 53: A Record]

            F -- 新イメージでサービス更新 --> H
            F -- 新イメージでサービス更新 --> I
        end

        O -- ビルド時にキー読込 --> C
        O -- 実行時にキー読込 --> I
    end

    subgraph "エンドユーザー"
        P[ユーザー]
    end

    P -- app.your-domain.com --> K --> G
    G <--> H
    G <--> I
    I -- Firestoreアクセス --> Q((Firebase))
    Q -- 認証 --> P
```

## 🛠️ 技術スタック

| カテゴリ | 技術 |
|---|---|
| **フロントエンド** | React, TypeScript, Vite, pnpm, Tailwind CSS, Chart.js |
| **バックエンド** | Node.js, Express, TypeScript, pnpm, Zod |
| **データベース** | Google Firestore |
| **インフラ** | AWS (ECS Fargate, ALB, ECR, S3, Route 53, Secrets Manager, CloudWatch), Terraform |
| **CI/CD** | AWS CodePipeline, AWS CodeBuild, GitHub |

## 📂 プロジェクト構造

```
.
├── backend/         # バックエンド (Node.js/Express)
├── frontend/        # フロントエンド (React/Vite)
├── infra/
│   ├── base/        # 永続インフラ (VPC, ECR, ECS Cluster, Route53 Zone etc.)
│   └── alb/         # オンデマンドインフラ (ALB, ECS Service, Route53 Record, CodePipeline etc.)
├── scripts/         # サービスの起動・停止用スクリプト
├── buildspec.yml    # CodeBuild定義ファイル
└── docker-compose.yml # ローカル開発環境定義
```

## 💻 ローカル開発環境セットアップ

#### 1. 前提ツール

- Node.js (v18.x以降)
- pnpm (v8.x以降)
- Docker & Docker Compose

#### 2. セットアップ手順

```bash
# 1. リポジトリをクローン
git clone <repository_url>
cd LifePlan

# 2. 依存関係をインストール
pnpm install

# 3. Firebaseサービスアカウントキーの配置
#    FirebaseコンソールからダウンロードしたサービスアカウントのJSONキーを
#    `backend/serviceAccountKey.json` という名前で配置します。

# 4. 開発サーバーを起動
docker-compose up --build
```

- **フロントエンド**: `http://localhost:3000`
- **バックエンド API**: `http://localhost:3001`

ローカル開発では、Firebase Admin SDKが `GOOGLE_APPLICATION_CREDENTIALS` 環境変数（`docker-compose.yml`で設定済）を通じて `serviceAccountKey.json` を自動的に読み込みます。

## 🚀 本番環境のセットアップと運用

### 前提条件

1.  **AWSアカウント** と、認証情報が設定された **AWS CLI**。
2.  **ドメインの取得**: Route 53などでドメイン（例: `life-plan-simulator.com`）を取得済みであること。
3.  **Firebaseプロジェクト**と**サービスアカウントキー**のJSONファイル。
4.  **GitHubリポジトリ**と、接続のための**CodeStar Connection**。

### 初回デプロイ手順

#### ステップ1: `base`レイヤーのデプロイ (永続インフラ)

1.  **Firebaseシークレットの登録**:
    AWSコンソールでSecrets Managerを開き、`prd/life-plan-app/firebase` という名前でシークレットを新規作成します。「プレーンテキスト」を選択し、FirebaseのサービスアカウントキーJSONファイルの中身をそのまま貼り付けます。

2.  **`terraform.tfvars`の作成**:
    `infra/base/` ディレクトリに `terraform.tfvars` というファイルを作成し、取得したドメイン名を設定します。
    ```tfvars
    # infra/base/terraform.tfvars
    domain_name = "your-domain.com"
    ```

3.  **`base`の適用**:
    `infra/base` ディレクトリでTerraformを実行し、VPCやECRなどのコアインフラを構築します。
    ```bash
    cd infra/base
    terraform init
    terraform apply
    ```

4.  **Route 53ホストゾーンのインポート**:
    ドメインをRoute 53以外で管理している場合、または手動で作成した場合は、ここで表示されるホストゾーンIDを使ってインポートします。
    ```bash
    # `terraform apply`後に表示されるHosted Zone ID (例: Z1234567890) を使用
    terraform import 'aws_route53_zone.main' <Hosted Zone ID>
    ```

#### ステップ2: `alb`レイヤーのデプロイ (オンデマンドインフラ)

1.  **`terraform.tfvars`の作成**:
    `infra/alb/` ディレクトリに `terraform.tfvars` というファイルを作成し、ドメイン情報を設定します。
    ```tfvars
    # infra/alb/terraform.tfvars
    domain_name    = "your-domain.com"
    subdomain_name = "app" # 例: app.your-domain.com
    ```

2.  **`alb`の適用（サービスの起動）**:
    プロジェクトルートに戻り、`start_services.sh` スクリプトを実行します。これによりALB、ECSサービス、CI/CDパイプラインなどが構築されます。
    ```bash
    cd ../..
    ./scripts/start_services.sh
    ```

3.  **CodeStar Connectionの承認**:
    AWSコンソールの「Developer Tools」 > 「Connections」に移動し、`github-connection` という接続が「保留中」になっているはずです。これをクリックしてGitHubとの連携を承認してください。

4.  **パイプラインの手動実行**:
    初回のみ、CodePipelineのコンソールから `lifeplan-pipeline` を選択し、「変更をリリース」ボタンを押して手動で実行します。これにより、アプリケーションが初めてデプロイされます。

### サービスの起動・停止 (コスト削減)

開発時間外にコストを節約するため、ALBやECSサービスを安全に停止・再開できます。

- **サービス停止**:
  ```bash
  ./scripts/stop_services.sh
  ```
  このスクリプトは `infra/alb` ディレクトリで `terraform destroy` を実行し、オンデマンドリソースを削除します。

- **サービス起動**:
  ```bash
  ./scripts/start_services.sh
  ```
  このスクリプトは `infra/alb` ディレクトリで `terraform apply` を実行し、オンデマンドリソースを再作成します。

### CI/CDによる自動デプロイ

一度セットアップが完了すれば、`main`ブランチにプッシュするだけで、CodePipelineが自動的にアプリケーションをビルドし、ECSへデプロイします。

## 🔒 環境変数とシークレット管理

| 環境 | 設定ファイル/場所 | 説明 |
|:---|:---|:---|
| **ローカル** | `backend/serviceAccountKey.json` | `docker-compose.yml`内の`GOOGLE_APPLICATION_CREDENTIALS`を通じてバックエンドコンテナに読み込まれます。フロントエンドはローカルプロキシ経由でバックエンドAPIを利用します。 |
| **本番** | AWS Secrets Manager `prd/life-plan-app/firebase` | CodeBuildでのビルド時、およびECSタスクの実行時に、IAMロールを通じて安全に読み込まれます。Terraformコードには一切の秘密情報が含まれません。 |

## 🔮 今後の改善案

- **Terraform Stateの共有**: 現在ローカル管理のStateをS3バックエンドとDynamoDBによるロック機構に移行し、チーム開発を容易にする。
- **ステージング環境の構築**: `main`ブランチとは別に`develop`ブランチ用のインフラ・パイプラインを構築し、本番デプロイ前の検証を行えるようにする。
- **監視体制の強化**: CloudWatchダッシュボードやアラームを設定し、アプリケーションの健全性を常時監視する。
- **CIの有効化**: GitHub Actionsを有効化し、Pull Request時の自動テストとリンター実行を導入する。
- **HTTPS対応**: ALBにACM証明書を割り当て、HTTPS通信を有効化する。
