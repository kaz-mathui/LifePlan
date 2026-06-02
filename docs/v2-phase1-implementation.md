# LifePlan v2.0 — Phase 1 実装記録

**実装日:** 2026-05-31
**ステータス:** Phase 1 MVP 完了(localStorage版、Firestore未統合)

## 実装したコンポーネント

### `src/v2/MissionCard.tsx`
1問の質問を表示するカード。
- 質問タイプ別UI: select / number / currency / percent / age / boolean / text
- priority バッジ(必須/推奨/任意)
- recallEffort 表示(⚡即答/🔍調べる/💭推測)
- isCore マーカー(⭐コア)
- **保存ボタン + 「分からない→推定」+ 「あとで」スキップ** の3アクション

### `src/v2/GroupProgress.tsx`
10グループ別の進捗一覧。
- 各グループに進捗バー
- タップで詳細展開
- 完了グループは緑✓表示

### `src/v2/MissionHome.tsx`
メインホーム画面(モバイルファースト・縦スクロール)。
- **「コア12問進捗カード」** (青グラデ、未達時)
- **「ベース予測解放カード」** (緑グラデ、達成後)
- **タブ**: 「📍今日のミッション」 / 「🗂カテゴリ別」
- 今日のミッション: `pickTodayMissions(3)` で3問選出
- カテゴリ別: `GroupProgress` → タップで詳細
- グループ詳細: そのグループの全質問を一覧表示

## データフロー(Phase 1: localStorage)

```
[ユーザー入力]
  ↓ updateAnswer(key, value)
[setState + localStorage('lifeplan_v2_answers')]
  ↓
[getProgress / getCoreProgress / pickTodayMissions が再計算]
  ↓
[UI再描画]
```

Phase 2 で Firestore に統合予定。

## アクセス方法

既存LifePlanのURL末尾に `?v2` を追加するだけ:
```
https://lifeplan-frontend-qn2crluibq-an.a.run.app/?v2
```
ローカル開発では `http://localhost:3000/?v2`。

通常版とv2の切替は `App.tsx` で URL クエリ検出。元のシミュレーターには「v2 試す →」リンクを追加済み。

## 動作確認手順

```bash
cd /Users/bwp378/work/private/LifePlan/frontend
npm install   # 初回のみ
npm start     # localhost:3000
# ブラウザで http://localhost:3000/?v2 を開く
```

## 検証内容

- [x] MissionCard が question type 別に正しい UI を出す
- [x] 「保存」「あとで」「分からない→推定」3ボタン
- [x] コア12問進捗カードが正しく表示
- [x] 12問完了でベース予測解放カードに切替
- [x] pickTodayMissions の乗算スコアリング動作
- [x] GroupProgress の10グループ表示
- [x] グループタップで詳細展開
- [x] localStorage への保存・復元
- [x] dependsOn による表示制御

## 残課題 (Phase 2-3 で実施)

### Phase 2: 計算エンジン統合
- [ ] kakei-planner v5.6 の simulate ロジック移植
- [ ] 答えた質問から SimulationInputData に変換するアダプター
- [ ] 予測結果画面(80歳までの資産推移グラフ)
- [ ] What-if スライダー
- [ ] Monte Carlo シミュ

### Phase 3: Firestore 統合
- [ ] `plans/{planId}/v2answers/{key}` コレクション
- [ ] localStorage → Firestore 移行関数
- [ ] 複数プラン管理(現行 PlanManager との統合)
- [ ] CSV インポート(MF からの実績取込)

### Phase 4: UX 改善
- [ ] スキップ理由の選択肢化
- [ ] estimateRef の動的計算(統計プリフィルの精度向上)
- [ ] 完成証明書 OGP 生成
- [ ] 進捗マイルストーン演出(50/100/150問)

## 既存コードへの影響

- `App.tsx` に **+11行追加** のみ(import + URL分岐 + v2リンク)
- 既存のシミュレーター動作は完全保持
- 既存 `SimulationInputData` 型は変更なし
- 新規ファイル: `src/v2/*.tsx`, `src/data/questions.ts`

## ファイル一覧

```
frontend/src/
├── App.tsx                     (修正: +11行)
├── data/
│   └── questions.ts            (198問・10グループ・3ヘルパー関数)
└── v2/
    ├── MissionCard.tsx         (約180行)
    ├── GroupProgress.tsx       (約40行)
    └── MissionHome.tsx         (約180行)
```
