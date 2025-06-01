# ライフプランニングアプリケーション プロジェクト全体像

## 1. プロジェクトREADME (`README.md`)

このリポジトリは、ユーザーが自身のライフプランに基づいた将来の財務状況をシミュレーションし、目標達成に向けた計画を立てることを支援するライフプランニングアプリケーションの雛形です。
フロントエンド、バックエンド、およびドキュメントで構成されています。

### 1.1. プロジェクト構成


life-planning-app/
├── backend/        # バックエンドアプリケーション (Node.js / Express)
│   ├── routes/
│   │   └── simulation.js
│   ├── services/
│   │   └── simulationService.js
│   ├── server.js   # Expressサーバーのエントリポイント
│   └── package.json
├── frontend/       # フロントエンドアプリケーション (React)
│   ├── public/
│   │   └── index.html (主要部分)
│   ├── src/
│   │   ├── components/ # UIコンポーネント
│   │   │   ├── Auth.js
│   │   │   ├── InputForm.js
│   │   │   └── SimulationResult.js
│   │   ├── services/   # Firebase関連サービス
│   │   │   └── firebase.js
│   │   ├── App.js      # メインアプリケーションコンポーネント
│   │   ├── index.js    # Reactアプリケーションのエントリポイント
│   │   └── tailwind.css # (Tailwind CSSをCDN経由でない場合に配置想定)
│   └── package.json
├── docs/           # ドキュメント
│   └── life_plan_app_requirements.md # 要件一覧書
└── README.md       # このファイル (プロジェクトルート)


### 1.2. ドキュメント

アプリケーションの要件定義は、`docs/life_plan_app_requirements.md` に記載されています。

### 1.3. 技術スタック

* **フロントエンド:** React, Tailwind CSS, Firebase (Authentication, Firestore)
* **バックエンド:** Node.js, Express.js
* **データベース:** Firebase Firestore (フロントエンド経由で主に利用)

### 1.4. セットアップと実行 (概念)

**注意:** 以下の手順は一般的な開発環境を想定したものです。

#### 1.4.1. バックエンド

1.  `backend` ディレクトリに移動します: `cd backend`
2.  依存関係をインストールします: `npm install`
3.  サーバーを起動します: `npm start` (または `node server.js`)
    * 通常、`http://localhost:3001` などで起動します。

#### 1.4.2. フロントエンド

1.  `frontend` ディレクトリに移動します: `cd frontend`
2.  依存関係をインストールします: `npm install`
3.  Firebaseの設定:
    * `src/services/firebase.js` に、ご自身のFirebaseプロジェクトの設定情報を入力します。
    * `__firebase_config` グローバル変数が利用可能な場合は、それを使用するようにコードが書かれています。
4.  開発サーバーを起動します: `npm start`
    * 通常、`http://localhost:3000` などで起動します。

### 1.5. APIエンドポイント (バックエンド)

* **POST /api/simulate**
    * リクエストボディ:
        ```json
        {
          "currentAge": 30,
          "retirementAge": 65,
          "currentSavings": 5000000,
          "annualIncome": 6000000,
          "monthlyExpenses": 300000
        }
        ```
    * レスポンスボディ (成功時):
        ```json
        {
          "yearsToRetirement": 35,
          "projectedRetirementSavings": 123456789,
          "annualSavingsRequired": 2000000,
          "message": "目標達成には年間XXX円の貯蓄が必要です..."
        }
        ```
    * レスポンスボディ (エラー時):
        ```json
        {
          "error": "エラーメッセージ"
        }
        ```

### 1.6. Firebase Firestore 構成案 (フロントエンドから利用)

* **ユーザーデータ保存パス:** `/artifacts/{appId}/users/{userId}/lifePlanData/{planId}`
* **ドキュメント構造例 (`planId` ごと):**
    ```json
    {
      "userId": "...",
      "currentAge": 30,
      "retirementAge": 65,
      "currentSavings": 5000000,
      "annualIncome": 6000000,
      "monthlyExpenses": 300000,
      "lifeEvents": [
        { "name": "住宅購入", "age": 35, "cost": 5000000 }
      ],
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
    ``` 
