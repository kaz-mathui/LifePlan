# ライフプランニングシミュレーションアプリ

## 1. プロジェクト概要

このアプリケーションは、ユーザーが自身の財務情報やライフイベントを入力することで、将来の資産状況をシミュレーションし、ライフプランニングを支援することを目的としています。
フロントエンドはReact、バックエンドはNode.js (Express) で構成され、Dockerを使用してコンテナ環境で動作します。

## 2. 技術スタック

- **フロントエンド:** React, TypeScript
- **バックエンド:** Node.js, Express, TypeScript
- **テスト (バックエンド):** Jest, ts-jest
- **コンテナ:** Docker, Docker Compose
- **その他:** ESLint, Prettier (コード品質維持のため)

## 3. 前提条件

- Docker Desktop (Docker Engine および Docker Compose を含む) がインストールされていること。
- Node.js と npm (ローカルでの型チェックや開発ツール利用のために推奨)

## 4. セットアップと起動方法

1.  **リポジトリのクローン:**
    ```bash
    git clone <リポジトリURL>
    cd LifePlan # プロジェクトルートへ移動
    ```
2.  **環境変数の設定 (必要な場合):**
    プロジェクトルートに `.env` ファイルを作成し、必要な環境変数（Firebase連携情報など）を設定します。
    (現状、具体的な `.env` の要件は明確ではありませんが、将来的な拡張に備えて記載)

3.  **Dockerコンテナのビルドと起動:**
    初回起動時や `Dockerfile`、`docker-compose.yml`、または依存関係 (`package.json`) に変更があった場合は、以下のコマンドでイメージを再ビルドして起動します。
    ```bash
    docker compose up --build -d
    ```
    通常起動時は以下のコマンドを使用します。
    ```bash
    docker compose up -d
    ```
    `-d` オプションを外すと、コンテナのログがフォアグラウンドで表示されます。

4.  **アプリケーションへのアクセス:**
    -   フロントエンド: `http://localhost:3000`
    -   バックエンドAPI (例): `http://localhost:3001/api/simulation` (具体的なエンドポイントは `backend/src/routes/` を参照)

5.  **コンテナの停止:**
    ```bash
    docker compose down
    ```
    ボリュームも削除する場合は `docker compose down --volumes` を使用します。

## 5. テストの実行方法 (バックエンド)

バックエンド (`simulationService.ts`) の単体テストはJestを使用して記述されています。
以下のコマンドで、Dockerコンテナ内でテストを実行できます。

```bash
docker compose exec backend npm run test:docker
```
このコマンドは、`backend/package.json` の `scripts."test:docker"` (`NODE_ENV=test jest`) を実行します。

## 6. 主なテスト項目 (simulationService)

`backend/src/services/__tests__/simulationService.spec.ts` にて、以下の項目などについてテストされています。

-   **基本動作:**
    -   有効な入力に対する正常な結果返却
    -   データ配列の長さ検証
-   **入力エラー処理:**
    -   現在の年齢が退職年齢以上の場合のエラー
-   **計算ロジック検証:**
    -   イベントなしの場合の初年度末資産
    -   一時的な支出イベントの正しい考慮
    -   年次の収入イベントの正しい処理 (開始・期間中・終了後)
    -   年次の支出イベントの正しい処理 (開始・期間中・終了後)
    -   退職金の正しい計上と退職年の収入計算
    -   年金支給の正しい計上 (開始・期間中)
    -   貯蓄がマイナスの場合の運用益計算 (マイナス時は運用益ゼロ)
-   **境界値テスト:**
    -   現在の年齢が退職年齢の1年前の場合
-   **ライフイベントの期間処理:**
    -   年次イベントの終了年齢 (`endAge`) の正しい処理

## 7. 現在の主要機能・仕様概要 (バックエンド `simulationService`)

`simulationService` は、ユーザーの入力に基づいてライフプランのシミュレーション計算を行います。

-   **主な入力パラメータ (`SimulationInput`):**
    -   `currentAge` (現在の年齢)
    -   `retirementAge` (退職希望年齢)
    -   `lifeExpectancy` (平均寿命)
    -   `currentSavings` (現在の貯蓄額)
    -   `annualIncome` (年間収入)
    -   `monthlyExpenses` (月間支出)
    -   `investmentRatio` (貯蓄のうち投資に回す割合 %)
    -   `annualReturn` (投資の年利回り %)
    -   `pensionAmountPerYear` (年間の年金受給額)
    -   `pensionStartDate` (年金受給開始年齢)
    -   `severancePay` (退職金)
    -   `lifeEvents` (ライフイベントの配列):
        -   `id`, `age`, `description`, `type` ('income' または 'expense'), `amount`, `frequency` ('one-time' または 'annual'), `endAge` (年次イベントの場合)
-   **シミュレーションロジックの概要:**
    -   指定された平均寿命まで、1年ごとの資産状況を計算します。
    -   各年の収入には、基本収入、年金（該当年齢）、一時的収入イベント、年次収入イベントが含まれます。
    -   各年の支出には、基本支出、一時的支出イベント、年次支出イベントが含まれます。
    -   退職年には退職金が収入として加算されます。
    -   貯蓄残高がプラスの場合、指定された投資割合と利回りに基づいて運用益が計算され、資産に加算されます。貯蓄残高がマイナスの場合は運用益は発生しません。
-   **主な出力 (`SimulationResult`):**
    -   `message`: シミュレーション結果のサマリーメッセージ (エラー含む)
    -   `assetData`: 各年齢ごとの資産詳細 (`AssetDataPoint`) の配列。
        -   `age`, `savings` (年末貯蓄額), `income` (年間収入総額), `expenses` (年間支出総額), `investmentReturn` (運用益)

## 8. ディレクトリ構成 (主要)

```
LifePlan/
├── backend/                # バックエンド (Node.js, Express, TypeScript)
│   ├── src/
│   │   ├── services/       # ビジネスロジック (simulationService.ts)
│   │   ├── routes/         # APIルーティング
│   │   ├── __tests__/      # Jestテストコード (simulationService.spec.ts)
│   │   ├── server.ts       # Expressサーバーエントリーポイント
│   │   └── (その他設定ファイル等)
│   ├── Dockerfile
│   ├── jest.config.js
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # フロントエンド (React, JavaScript - TypeScript移行想定)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── App.js
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── .dockerignore
├── .gitignore
├── docker-compose.yml      # Docker Compose設定ファイル
└── README.md               # このファイル
```

## 9. VSCode推奨拡張機能

開発効率向上のため、以下のVSCode拡張機能の導入を推奨します。

-   ESLint
-   Prettier - Code formatter
-   Jest (jest-community.vscode-jest)
-   Docker (ms-azuretools.vscode-docker)
-   GitLens — Git supercharged

## 10. 今後の課題・TODO (例)

-   フロントエンドのTypeScriptへの完全移行
-   詳細なエラーハンドリングとユーザーへのフィードバック強化
-   入力バリデーションの強化 (フロントエンド・バックエンド両方)
-   より複雑なライフイベント（例: 住宅ローン、子供の教育費の段階的変化）への対応
-   テストカバレッジの向上とカバレッジレポートの導入
-   CI/CDパイプラインの構築
-   Firebase Authentication / Firestore を用いたユーザーデータ保存機能の実装 (フロントエンド側)
