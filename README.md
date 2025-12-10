# 🚀 No-code Quiz Builder / Learning Analytics Engine

**技術者向け README（Developer Edition）**

このプロジェクトは、HTML/CSS/JavaScript の純粋なフロントエンド技術のみで **"教材作成・Glossary ベクトル付与・データ分析・結果可視化"** まで完結できる **ノーコード教育エディタ / 学習データ分析エンジン** です。

**プロジェクト規模**: 58,399行（空行除外、2025-11-21時点）

---

## 🧭 クイックスタート

### 1. 環境準備（最小構成）

```bash
# リポジトリをクローン
git clone <repository-url>
cd nocode-site

# 依存関係インストール（オプション・サーバー機能のみ）
npm install

# 開発サーバー起動（オプション）
npm run dev
# または
npm start  # Expressサーバー（ポート3000）
```

**重要**: Node.js は **任意**です。`editor.html`, `player/index.html`, `admin/analysis.html` をブラウザで直接開けば動作します。

### 2. 主要エントリーポイント

- **`main.html`** - プロジェクトトップページ（各機能へのリンク）
- **`src/editor/editor.html`** - 教材作成エディタ（GUIでクイズ・診断を作成）
- **`src/player/index.html`** - クイズ実行画面（学習者がクイズを解く）
- **`admin/analysis.html`** - 学習データ分析ダッシュボード（統計・可視化・クラスタリング）
- **`admin/bookshelf.html`** - プロジェクト本棚（プロジェクト一覧・新規作成）

---

## 🏗️ システム構成（全体アーキテクチャ）

```
┌─────────────────────────────────────────────────────────────┐
│                    ブラウザ（フロントエンド完結）              │
├─────────────────────────────────────────────────────────────┤
│  Editor (教材作成)  →  localStorage  →  Player (クイズ実行)  │
│       ↓                              ↓                      │
│  Glossary Loader          StudentLogManager                 │
│  (概念辞書読み込み)        (学習ログ記録)                     │
│       ↓                              ↓                      │
│  ┌──────────────────  Admin Dashboard  ──────────────────┐ │
│  │  - 統計分析 (analysis.js)                              │ │
│  │  - クラスタリング (k-means)                            │ │
│  │  - 可視化 (Chart.js)                                   │ │
│  │  - データローダー (dataset_loader.js)                  │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### データフロー

1. **Editor** → プロジェクトJSONを `localStorage` に保存
2. **Player** → クイズ実行時に学習ログを記録（`StudentLogManager`）
3. **Admin Dashboard** → ログデータを読み込み、分析・可視化
4. **Glossary** → 3層構造（Project/Domain/Global）から概念辞書を読み込み、ベクトル付与

---

## 📁 ディレクトリ構造（詳細）

```
nocode-site/
├── 📄 main.html                    # トップページ（エントリーポイント）
├── 📄 editor.js                    # レガシーエディタ（4267行、後方互換用）
├── 📄 server.js                    # Expressサーバー（開発用・任意）
├── 📄 package.json                 # npm設定（依存: expressのみ）
│
├── 📂 admin/                       # 管理画面UI（HTMLエントリーポイント）
│   ├── admin.html                  # 管理ダッシュボード（メニュー）
│   ├── analysis.html               # 学習データ分析画面（1563行）
│   ├── bookshelf.html              # プロジェクト本棚UI
│   ├── project_manager.html        # プロジェクト設定
│   ├── version_manager.html        # クイズバージョン管理
│   └── login.html                  # ログイン画面（将来実装）
│
├── 📂 src/                         # ソースコード本体
│   │
│   ├── 📂 core/                    # コア機能（基盤ライブラリ）
│   │   ├── config.js               # プロジェクト設定読み込み（動的パス解決）
│   │   ├── GlossaryLoader.js       # Glossary読み込み・統合（3層構造対応）
│   │   └── README.md
│   │
│   ├── 📂 editor/                  # エディタ機能（モジュール化構造）
│   │   ├── editor.html             # エディタ画面HTML
│   │   ├── editor_main.js          # ES Moduleルート（薄い統合ファイル）
│   │   ├── editor_init.js          # 初期化処理（window.gameData統合）
│   │   └── 📂 modules/             # モジュール化された機能
│   │       ├── 📂 core/
│   │       │   └── state.js        # グローバル状態管理（gameData, nodeIdCounter）
│   │       ├── 📂 utils/
│   │       │   └── data.js         # データユーティリティ（正規化、HTMLエスケープ）
│   │       ├── 📂 actions/
│   │       │   └── nodes.js        # ノード操作（addQuestion, addResult, deleteNode）
│   │       ├── 📂 project/
│   │       │   ├── save.js         # プロジェクト保存・読み込み
│   │       │   └── export.js       # エクスポート（CSV/HTML）
│   │       ├── 📂 ui/
│   │       │   ├── editor.js       # エディタUI更新（updateUI, selectNode）
│   │       │   ├── shelf.js        # プロジェクト本棚UI
│   │       │   ├── events.js       # イベントリスナー一元管理
│   │       │   ├── question-editor.js    # 質問エディタ（プレースホルダー）
│   │       │   ├── diagnostic-editor.js  # 診断質問エディタ
│   │       │   ├── result-editor.js      # 結果エディタ
│   │       │   └── preview.js            # プレビュー表示
│   │       └── README.md
│   │
│   ├── 📂 player/                  # プレイヤー機能（クイズ実行エンジン）
│   │   ├── index.html              # プロジェクト一覧（カード式UI）
│   │   ├── demo.html               # デモ画面（テスト用）
│   │   ├── player.js               # クイズ実行ロジック（分岐処理、Glossary表示）
│   │   ├── logging.js              # 学習ログ記録（StudentLogManager、複数セッション対応）
│   │   ├── recommendation.js       # Glossary自動レコメンド（誤答時の反応時間・path分析）
│   │   └── README.md
│   │
│   ├── 📂 admin/                   # 管理機能（データ分析）
│   │   ├── analysis.js             # データ分析ロジック（2119行、window.AnalysisDashboard）
│   │   ├── dataset_loader.js       # データセット読み込み（標準形統一、multi-session対応）
│   │   ├── version_manager.js      # クイズバージョン管理
│   │   ├── pin.js                  # PIN認証（管理画面アクセス時）
│   │   └── auth.js                 # 認証機能（将来実装）
│   │
│   ├── 📂 glossary/                # Glossaryシステム（3層構造）
│   │   ├── glossary.html           # Glossary管理画面（CRUD操作）
│   │   ├── glossary.js             # Glossary管理ロジック
│   │   ├── glossary_test.html      # Glossaryテスト画面（1498行）
│   │   ├── global.json             # グローバルGlossary（全プロジェクト共通）
│   │   ├── 📂 domains/
│   │   │   ├── AI.json             # AI分野のドメインGlossary
│   │   │   └── psychology.json     # 心理学分野のドメインGlossary
│   │   └── README.md
│   │
│   └── 📂 utils/
│       └── vector_math.js          # ベクトル計算ユーティリティ（コサイン類似度）
│
├── 📂 projects/                    # プロジェクトデータ
│   ├── index.json                  # プロジェクト一覧インデックス（自動生成）
│   ├── generate_index.js           # index.json自動生成スクリプト
│   ├── default/                    # デフォルトプロジェクト
│   │   ├── project.json            # プロジェクト設定
│   │   ├── quiz.json               # クイズデータ（questions, results, startNode）
│   │   ├── glossary.json           # プロジェクト固有Glossary
│   │   ├── editor.json             # エディタ設定
│   │   ├── concept_graph.json      # 概念グラフ（将来実装）
│   │   └── quiz_versions/          # クイズバージョン管理
│   │       └── latest.json         # 最新バージョンへの参照
│   ├── vector_test/                # ベクトル分析テスト用プロジェクト
│   ├── demo_project_01/            # デモプロジェクト（3つ）
│   ├── demo_project_02/
│   └── demo_project_03/
│
├── 📂 students/                    # 学習データ（ログファイル）
│   ├── index.json                  # データセット一覧（マスターファイル）
│   ├── quiz_log_dummy.json         # ダミーログ（17033行、50セッション、cluster_features付き）
│   ├── demo_project_02_logs.json   # デモログ（6291行）
│   ├── demo_project_03_logs.json   # デモログ（6286行）
│   └── generate_index.js           # index.json自動生成スクリプト
│
├── 📂 scripts/                     # データ生成・処理スクリプト
│   ├── generate_dummy_logs.js      # ダミーログ生成（JavaScript版）
│   ├── generate_dummy_logs.py      # ダミーログ生成（Python版）
│   ├── generate_vector_sessions.js # ベクトルセッション生成（50セッション）
│   ├── compute_cluster_features.py # cluster_features計算
│   ├── integrate_cluster_features.py # cluster_features統合
│   ├── merge_student_logs.js       # ログマージスクリプト
│   ├── dependency_analyzer.js      # 依存関係解析（681行）
│   └── README.md
│
├── 📂 analysis/                    # 分析スクリプト（Julia）
│   ├── clustering.jl               # k-meansクラスタリング実装
│   ├── cluster_main.jl             # クラスタリングメイン
│   ├── cluster_utils.jl            # クラスタリングユーティリティ
│   ├── cluster_visualize.jl        # クラスタリング可視化
│   ├── reaction_time.jl            # 反応時間分析（指数分布・正規分布フィッティング）
│   └── run_analysis.jl             # 分析実行スクリプト
│
├── 📂 docs/                        # ドキュメント
│   ├── architecture.md             # アーキテクチャ仕様書
│   ├── roadmap.md                  # 開発計画・ロードマップ
│   ├── glossary_spec.md            # Glossary仕様書（3層構造の詳細）
│   ├── diagnostic_logic.md         # 診断ロジック仕様書
│   └── 📂 architecture/
│       ├── overview.md             # アーキテクチャ概要（316行）
│       ├── data_flow.md            # データフロー図（285行）
│       ├── dependency_map.md       # 依存関係マップ（324行）
│       ├── ui_routes.md            # UIルーティング仕様（342行）
│       ├── editor_refactoring_*.md # エディタリファクタリング進捗記録
│
├── 📂 change_log/                  # 変更履歴（日付別）
│   ├── 20251121.md                 # 最新変更履歴（380行）
│   └── ...
│
├── 📂 public/                      # 公開リソース
│   ├── css/                        # スタイルシート（main.css, admin.css, etc.）
│   ├── js/                         # 公開用JavaScript
│   └── dashboard.html              # 公開ダッシュボード
│
├── 📂 data/                        # リソースファイル（画像・音声・CSV等、集計除外）
├── 📂 legacy/                      # レガシーコード（集計除外）
└── 📂 archive/                     # 一時退避（集計除外）
```

---

## 🧩 Editor（教材作成エディタ）

### 機能概要

- **ノードベース編集**: Start → Question → Result のフローを視覚的に作成
- **質問ノード**: 選択肢（choice）ベースのクイズ作成
- **診断ノード**: スケール（scale）ベースの診断作成（ベクトル付与）
- **結果ノード**: 診断結果・フィードバック画面
- **Glossary統合**: 概念辞書からタグ選択→ベクトル自動付与
- **プレビュー機能**: 実際の動作を即座に確認
- **localStorage保存**: プロジェクトをブラウザ内に保存

### アーキテクチャ（モジュール化構造）

**現状**: 巨大な `editor.js`（4267行）から機能別モジュールへの移行が進行中。

```
src/editor/
├── editor_main.js          # ES Moduleルート（薄い統合ファイル）
├── editor_init.js          # 初期化処理（window.gameData統合）
├── editor.js               # レガシー（後方互換用）
└── modules/
    ├── core/state.js       # グローバル状態（gameData, nodeIdCounter, selectedNodeId）
    ├── utils/data.js       # データ正規化、HTMLエスケープ、JSONダウンロード
    ├── actions/nodes.js    # ノード操作（addQuestion, addDiagnosticQuestion, addResult, deleteNode）
    ├── project/
    │   ├── save.js         # 保存・読み込み（saveProjectAs, loadProjectFromId）
    │   └── export.js       # エクスポート（exportCSV, exportHTML）
    └── ui/
        ├── editor.js       # UI更新（updateUI, updateNodeList, selectNode）
        ├── shelf.js        # プロジェクト本棚UI（openProjectShelf, closeProjectShelf）
        ├── events.js       # イベントリスナー一元管理（bindAllEvents）
        ├── question-editor.js      # 質問エディタ（プレースホルダー）
        ├── diagnostic-editor.js    # 診断質問エディタ（プレースホルダー）
        ├── result-editor.js        # 結果エディタ（プレースホルダー）
        └── preview.js              # プレビュー表示（プレースホルダー）
```

### 使用方法

```javascript
// ES Moduleとして使用
import { addQuestion } from './modules/actions/nodes.js';
import { saveProjectAs } from './modules/project/save.js';
import { updateUI } from './modules/ui/editor.js';

// またはグローバル関数として使用（後方互換）
window.addQuestion();
window.saveProjectAs();
```

### データ構造

```json
{
  "title": "Example Quiz",
  "questions": [
    {
      "id": "q_1",
      "type": "question",
      "title": "質問 1",
      "text": "質問文",
      "choices": [
        {
          "id": "c_1",
          "text": "選択肢1",
          "nextId": "q_2",
          "correct": true,
          "vector": { "logic": 1, "analysis": -1 }
        }
      ]
    }
  ],
  "results": [...],
  "startNode": "q_1",
  "meta": { "version": "1.0.0" }
}
```

---

## 📚 プロジェクト本棚 UI

### 機能

- **カード式一覧**: localStorage内のプロジェクトをカード形式で表示
- **新規作成**: 本棚から直接新規プロジェクトを作成（`admin/bookshelf.html`）
- **エディタ連携**: カードの「編集」ボタンで `editor.html?project_id=xxx` に遷移
- **プレイヤー連携**: カードの「開く」ボタンで `player/demo.html` に遷移

### データ保存形式

```javascript
// localStorage
savedProjects: [
  {
    name: "プロジェクト名",
    filename: "project.json",
    updated_at: "2025-11-21T12:00:00.000Z",
    data: { /* プロジェクトデータ */ }
  }
]
```

---

## ▶️ Player（クイズ実行エンジン）

### 機能概要

- **分岐処理**: 選択肢の `nextId` に基づいて動的に遷移
- **Glossary自動提示**: 誤答時に反応時間・path分析から最適な用語解説を表示
- **ログ記録**: `StudentLogManager` で学習者の行動を記録
- **複数セッション対応**: 1人の学習者が複数回クイズを受講可能

### ログデータ構造

```json
{
  "user_id": "student001",
  "sessions": [
    {
      "session_id": "session_001",
      "generated_at": "2025-11-21T12:00:00.000Z",
      "quiz_version": "20251121-1200-ray-quiz",
      "logs": [
        {
          "questionId": "q_1",
          "final_answer": "c_1",
          "correct": true,
          "response_time": 5.2,
          "path": ["c_2", "c_3", "c_1"],
          "vector": { "logic": 1, "analysis": -1 },
          "glossaryShown": ["term1", "term2"],
          "conceptTags": ["認知負荷", "メタ認知"]
        }
      ],
      "vector_summary": { "logic": 0.8, "analysis": 0.6 },
      "cluster_features": [0.2, 0.5, 0.8, 0.3, 0.6, 0.1, 0.4, 0.7]
    }
  ]
}
```

### 主要ファイル

- **`player.js`** - クイズ実行ロジック（分岐処理、Glossary表示、結果画面）
- **`logging.js`** - `StudentLogManager` クラス（複数セッション対応のログ管理）
- **`recommendation.js`** - Glossary自動レコメンド（誤答時の反応時間・path分析）

---

## 📊 Admin Dashboard（学習データ分析）

### 機能概要

- **統計分析**: 全体統計、問題別統計、概念混同分析、反応時間分析
- **クラスタリング**: k-meansクラスタリング（JavaScript実装、Julia出力も可）
- **可視化**: Chart.jsによるグラフ描画（散布図、ヒストグラム、テーブル）
- **データローダー**: `dataset_loader.js` で標準形に統一（multi-session対応）

### 主要API（`window.AnalysisDashboard`）

```javascript
// 統計計算
AnalysisDashboard.computeOverallStats(logs);
AnalysisDashboard.computePerQuestionStats(logs);
AnalysisDashboard.computeConceptConfusions(logs);
AnalysisDashboard.computeResponseTimeProfile(logs);

// 可視化
AnalysisDashboard.renderOverallStats(stats);
AnalysisDashboard.renderQuestionStats(stats);
AnalysisDashboard.renderClusterAnalysis(datasetData, projectId);

// クラスタリング
AnalysisDashboard.renderClusterAnalysis(datasetData, projectId);
// → Julia出力優先、JS fallbackあり
```

### スクリプト読み込み順序（重要）

```html
<!-- admin/analysis.html -->
<script src="../src/core/config.js"></script>
<script src="../src/core/GlossaryLoader.js"></script>
<script src="../src/admin/dataset_loader.js"></script>
<script src="../src/utils/vector_math.js"></script>
<script src="../src/admin/analysis.js"></script>
<!-- この順序を守らないと window.AnalysisDashboard が undefined -->
```

---

## 🔌 Glossary（概念辞書システム）

### 3層構造

1. **Project Glossary** (`projects/{id}/glossary.json`) - プロジェクト固有、優先度: 最高
2. **Domain Glossary** (`src/glossary/domains/{domain}.json`) - 分野別（AI、心理学など）、優先度: 中
3. **Global Glossary** (`src/glossary/global.json`) - 全プロジェクト共通、優先度: 最低

### ベクトル軸の例

```json
{
  "terms": {
    "logic": {
      "id": "logic",
      "title": "論理的思考",
      "description": "...",
      "vector": { "logic": 1, "analysis": 0, "creativity": 0 }
    }
  }
}
```

### 使用方法

```javascript
// GlossaryLoaderで読み込み
const glossary = await GlossaryLoader.loadGlossaryByPolicy(projectId, policy);
// → 3層を自動統合（Project > Domain > Globalの優先順位）

// Editorでタグ選択→ベクトル自動付与
// Playerで誤答時に自動レコメンド
```

---

## 🔧 開発者向け情報

### 技術スタック

- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **モジュール**: ES Modules（一部IIFE + window形式も使用）
- **可視化**: Chart.js
- **サーバー**: Node.js + Express（開発用・任意）
- **分析**: Julia（オプション、クラスタリング用）

### 依存関係

```json
{
  "dependencies": {
    "express": "^4.18.2"  // サーバー機能のみ、フロントエンドは依存なし
  }
}
```

### 主要なグローバルAPI

```javascript
// Editor
window.gameData              // プロジェクトデータ（questions, results, startNode）
window.Editor                // モジュール化されたエディタAPI

// Player
window.StudentLogManager     // ログ管理クラス
window.currentProjectData    // 現在実行中のプロジェクトデータ

// Admin
window.AnalysisDashboard     // 分析ダッシュボードAPI
window.DatasetLoader         // データセット読み込みAPI
window.VectorMath            // ベクトル計算ユーティリティ
window.GlossaryLoader        // Glossary読み込みAPI
```

### モジュール間の依存関係

```
core/state.js
  ↓
utils/data.js
  ↓
actions/nodes.js → ui/editor.js
project/save.js → ui/editor.js
project/export.js
ui/shelf.js
ui/events.js → (全モジュール統合)
```

---

## 📊 データ構造（詳細）

### プロジェクトJSON (`quiz.json`)

```json
{
  "id": "quiz_001",
  "title": "クイズタイトル",
  "questions": [
    {
      "id": "q_0",
      "type": "question",
      "title": "質問 1",
      "text": "質問文",
      "choices": [
        {
          "id": "c_0",
          "text": "選択肢1",
          "value": 0,
          "nextId": "q_1",
          "correct": true,
          "vector": { "logic": 1, "analysis": -1, "creativity": 0 }
        }
      ]
    },
    {
      "id": "q_diag_0",
      "type": "diagnostic",
      "title": "診断質問 1",
      "text": "診断質問文",
      "scales": [...],
      "branches": { "yes": "r_1", "no": "r_2" }
    }
  ],
  "results": [
    {
      "id": "r_0",
      "type": "result",
      "title": "結果 1",
      "text": "診断結果",
      "image": "attention_type.png"
    }
  ],
  "startNode": "q_0"
}
```

### 学習ログJSON（multi-session構造）

```json
{
  "user_id": "student001",
  "sessions": [
    {
      "session_id": "session_001",
      "generated_at": "2025-11-21T12:00:00.000Z",
      "quiz_version": "20251121-1200-ray-quiz",
      "logs": [
        {
          "questionId": "q_0",
          "final_answer": "c_0",
          "correct": true,
          "response_time": 5.2,
          "path": ["c_1", "c_2", "c_0"],
          "vector": { "logic": 1, "analysis": -1 },
          "glossaryShown": ["term1"],
          "conceptTags": ["認知負荷"]
        }
      ],
      "vector_summary": { "logic": 0.8, "analysis": 0.6 },
      "cluster_features": [0.2, 0.5, 0.8, 0.3, 0.6, 0.1, 0.4, 0.7]
    }
  ]
}
```

---

## 🔍 今後の拡張（ロードマップ）

### Phase 1: MVP（完了 ✅）
- [x] Editor/Player の分離
- [x] JSON保存
- [x] 手動実行

### Phase 2: 診断エンジンの土台（完了 ✅）
- [x] スコアベクトル・分岐
- [x] ベクトル分析
- [x] 反応時間分析

### Phase 3: 概念ツリー（Concept Graph）（将来実装）
- [ ] Concept Graph の実装
- [ ] 概念間の関係を可視化
- [ ] 概念の階層構造を管理

### Phase 4: Glossary CRUD（完了 ✅）
- [x] 3層構造のGlossary
- [x] Glossary管理画面
- [x] 自動レコメンド

### Phase 5: 自動解説生成（将来実装）
- [ ] AIによる自動解説生成
- [ ] 誤答パターンに基づく解説の最適化

### Phase 6: 可視化・レポート（完了 ✅）
- [x] データ可視化
- [x] クラスタリング分析
- [x] ベクトル分析
- [x] 反応時間分析
- [x] JSON diff

### Phase 7: 将来の拡張（検討中）
- [ ] プロジェクト共有（クラウド同期）
- [ ] WebRTCを用いた授業モード
- [ ] LMS連携（Moodle, Google Classroom）
- [ ] アクセス統計の保存
- [ ] Glossary自動生成（AI）
- [ ] WebGL可視化

---

## 🧪 テストデータ

### ダミーログ

- **`students/quiz_log_dummy.json`** - 50セッション、`cluster_features` 付き（17033行）
- **`students/demo_project_02_logs.json`** - デモログ（6291行）
- **`students/demo_project_03_logs.json`** - デモログ（6286行）

### テストプロジェクト

- **`projects/vector_test/`** - ベクトル分析テスト用（5問、各選択肢にvector設定）
- **`projects/demo_project_01/`, `demo_project_02/`, `demo_project_03/`** - デモプロジェクト

---

## 📖 ドキュメント

詳細なドキュメントは `docs/` ディレクトリを参照してください。

- **`docs/architecture.md`** - アーキテクチャ仕様書
- **`docs/glossary_spec.md`** - Glossary仕様書（3層構造の詳細）
- **`docs/diagnostic_logic.md`** - 診断ロジック仕様書
- **`change_log/`** - 変更履歴（日付別）

---

## 📝 ライセンス

このプロジェクトのライセンス情報は `LICENSE` ファイルを参照してください。

---

## 🎯 まとめ

このプロジェクトは、**ブラウザのみで完結するノーコード教育エディタ / 学習データ分析エンジン**です。

- **58,399行**のコード量を持つ本格的なフルスタック構成
- **Editor / Player / Admin / Glossary** の4つの主要コンポーネント
- **モジュール化が進行中**（Editorは巨大1ファイルから機能別モジュールへ移行）
- **Glossaryシステム**による3層構造の概念辞書管理
- **学習データ分析**によるk-meansクラスタリング、統計分析、可視化
- **localStorage**によるプロジェクト管理（サーバー不要）

**開発者はどこから触るべきか？**

1. **エディタ機能を理解したい**: `src/editor/modules/` から読む
2. **プレイヤー機能を理解したい**: `src/player/player.js`, `logging.js` から読む
3. **分析機能を理解したい**: `src/admin/analysis.js`, `dataset_loader.js` から読む
4. **Glossaryシステムを理解したい**: `src/glossary/`, `src/core/GlossaryLoader.js` から読む

---

**最終更新**: 2025-11-21a
