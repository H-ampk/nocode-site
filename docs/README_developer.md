# 開発者向け README

**No-code Quiz Builder / Learning Analytics Engine - Developer Documentation**

このドキュメントは、プロジェクトの詳細な技術仕様、アーキテクチャ、開発ガイドラインを提供します。

---

## 1. Overview（開発者向け概要）

このプロジェクトは、HTML/CSS/JavaScriptのみで動作するノーコード教育エディタ / 学習データ分析エンジンです。ブラウザ完結型で、Node.jsは開発用サーバーとして任意で使用します。

### プロジェクト規模
- **コード量**: 58,399行（空行除外、2025-11-21時点）
- **主要コンポーネント**: Editor / Player / Dashboard / Glossary
- **技術スタック**: Vanilla JavaScript (ES6+), HTML5, CSS3

### 設計原則
- **推論ではなく観測**: LLMを使用せず、観測データ（学習ログ）から数値・統計のみを計算
- **テンプレートベース**: 研究用サマリはテンプレート文字列で生成
- **人格評価なし**: 解釈や人格的評価は行わない
- **ブラウザ完結**: サーバー不要で動作（Node.jsは開発用のみ）

---

## 2. Quick Start（ブラウザ直開き / Node.js）

### ブラウザ直開き（推奨）
```bash
git clone <repository-url>
cd nocode-site

# ブラウザで直接開く
# - main.html
# - src/editor/editor.html
# - src/player/index.html
# - public/dashboard.html
```

### Node.js使用時（開発用）
```bash
npm install
npm start  # Expressサーバー（ポート3000）
# http://localhost:3000/ でアクセス
```

**重要**: Node.jsは任意です。HTMLファイルをブラウザで直接開けば動作します。

---

## 3. Architecture（Editor/Player/Dashboard/Glossary + data flow）

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                    ブラウザ（フロントエンド完結）              │
├─────────────────────────────────────────────────────────────┤
│  Editor (教材作成)  →  localStorage  →  Player (クイズ実行)  │
│       ↓                              ↓                      │
│  Glossary Loader          StudentLogManager                 │
│  (概念辞書読み込み)        (学習ログ記録)                     │
│       ↓                              ↓                      │
│  ┌──────────────────  Dashboard  ──────────────────┐ │
│  │  - 統計分析 (stats_core.js)                     │ │
│  │  - 研究分析 (pattern_summary.js 等)             │ │
│  │  - 可視化 (ヒートマップ、ネットワーク、ボックス)  │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### データフロー

1. **Editor** → プロジェクトJSONを `localStorage` に保存
2. **Player** → クイズ実行時に学習ログを記録（`StudentLogManager`）
3. **Dashboard** → ログデータを読み込み、分析・可視化
4. **Glossary** → 3層構造（Project/Domain/Global）から概念辞書を読み込み

### 主要コンポーネント

#### Editor（教材作成）
- **エントリーポイント**: `src/editor/editor.html`
- **主要ファイル**: 
  - `src/editor/editor_main.js` - ES Moduleルート
  - `src/editor/modules/` - モジュール化された機能
- **機能**: ノードベース編集、質問・選択肢・分岐・結果画面の作成

#### Player（クイズ実行）
- **エントリーポイント**: `src/player/index.html`
- **主要ファイル**:
  - `src/player/player.js` - クイズ実行ロジック
  - `src/player/logging.js` - 学習ログ記録（`StudentLogManager`）
  - `src/player/recommendation.js` - Glossary自動レコメンド
- **機能**: 分岐処理、Glossary自動提示、ログ記録

#### Dashboard（学習データ分析）
- **エントリーポイント**: `public/dashboard.html`
- **主要ファイル**:
  - `public/js/dashboard.js` - ダッシュボードロジック
  - `src/core/stats_core.js` - 統一統計計算レイヤ
  - `src/core/pattern_summary.js` - 研究傾向サマリ生成
- **機能**: 統計分析、可視化、研究用サマリ生成

#### Glossary（概念辞書システム）
- **エントリーポイント**: `src/glossary/glossary.html`
- **主要ファイル**:
  - `src/core/GlossaryLoader.js` - Glossary読み込み・統合
- **機能**: 3層構造（Project/Domain/Global）の概念辞書管理

---

## 4. Dataset System（index, type判定, loadDataset統一, データ形式）

### データセット選択UI（2025-12-16改善）

#### 1画面1ドロップダウン形式
- **UI仕様**: 1つのセレクトボックスに全データセットを表示
- **表示形式**: `{dataset_name}（{セッション数} sessions / {ログ数} logs）`
- **実装**: `public/dashboard.html`, `public/js/dashboard.js`

#### dataset_index.jsonの自動更新（2025-12-16実装）
- **実装**: `server.js`で`chokidar`を使用して`students/`フォルダを監視
- **動作**: JSONファイルの追加・変更・削除を検知し、`index.json`を自動生成
- **条件**: Node.js使用時のみ動作（ブラウザ直開きでは手動生成が必要）

#### dataset_typeの自動判定（2025-12-16実装）
- **実装**: `server.js`の`detectDatasetType()`関数
- **判定ルール**:
  1. `quiz_log_dummy` → `type=class`
  2. `project_id`または`projectId`がある → `type=project`
  3. `quiz_version`がある → `type=quiz`
  4. `sessions`配列がある → `type=class`（セッションベース）
  5. 上記に該当しない → `type=unknown`

### loadDataset()統一ローダー（2026-01-05改善）

#### 実装
- **ファイル**: `src/dashboard/logging.js`
- **関数**: `loadDataset(datasetName)`
- **動作**:
  1. `/students/index.json`からデータセット一覧を取得
  2. データセット名で検索
  3. `/students/${dataset.file}`からデータを読み込む
  4. ログ配列とセッション配列を抽出して返却

#### 使用例
```javascript
import { loadDataset } from '../src/dashboard/logging.js';

const datasetData = await loadDataset('quiz_log_dummy');
// { logs: Array, sessions: Array, metadata: Object }
```

### データ形式

#### ログベース形式
```json
{
  "dataset_name": "quiz_log_dummy",
  "type": "class",
  "logs": [
    {
      "questionId": "q009",
      "timestamp": "2025-11-15T16:35:30.799678Z",
      "final_answer": "c3",
      "correct": false,
      "response_time": 1.6,
      "path": ["c2", "c3"],
      "conceptTags": ["認知負荷", "メタ認知"]
    }
  ]
}
```

#### セッションベース形式
```json
{
  "dataset_name": "demo_project_02",
  "type": "quiz",
  "sessions": [
    {
      "session_id": "session_001",
      "date": "2025-10-27T16:09:38.014231Z",
      "logs": [...]
    }
  ]
}
```

---

## 5. Analytics Core（stats_core / insights_core / pattern_summary 等の責務）

### stats_core.js（統一統計計算レイヤ、2025-12-17実装）

#### 主要関数
- **`computeStats(logs)`** - ログデータから統計情報を計算
  - 総回答数、正答率、反応時間統計、パス長統計
  - 概念別スコア集計、誤答ランキング
  - 概念別詳細統計（正答率、平均反応時間、平均パス長、Glossary表示率）

- **`normalizeConceptStats(stats)`** - 概念別統計を全体平均からの偏差に正規化

#### 計算される統計情報
- 総回答数、正答数、誤答数、正答率
- 概念別スコア集計
- 誤答ランキング
- 反応時間統計（平均、中央値、標準偏差、最小値、最大値）
- パス長統計（平均パス長）
- セッション数
- 概念別詳細統計

### insights_core.js（理解構造レポート生成、2025-12-17実装）

#### 主要関数
- **`generateInsights(stats)`** - 統計データから洞察を生成
  - 構造化された洞察オブジェクト（タイプ、カテゴリ、メッセージ、詳細）
  - カテゴリ: 総評、弱点概念、反応時間、誤答パターン、データ品質

### pattern_summary.js（研究傾向サマリ生成、非LLM、2025-12-17実装）

#### 主要関数
- **`generatePatternSummary(stats, conceptStats, rtProfile)`** - パターン検出とサマリ生成
  - ルールベースのパターン検出（low_correct_rate_and_high_path、slow_response_time_only、glossary_shown_but_incorrect）
  - テンプレートベースのテキスト生成
  - **制約**: LLM使用禁止、テンプレートのみ、研究用言語のみ

### mistake_topology.js（誤答パストポロジー分析）

#### 主要関数
- **`buildMistakeTopology(logs)`** - 誤答時のpath遷移グラフを構築
  - ノード: ユニークなパス状態
  - エッジ: path[i] -> path[i+1]
  - 重み: 頻度
  - ノードメトリクス: 平均反応時間、平均パス長

### concept_dependency.js（概念依存関係グラフ）

#### 主要関数
- **`buildConceptDependencyGraph(logs)`** - 概念間の依存関係グラフを構築
  - ノード: conceptTags
  - エッジ: concept_i -> concept_j（無向グラフ）
  - 重み: 共起回数 + 誤答ボーナス（+2）
  - ノード統計: 正答率、平均反応時間

### response_time_profile.js（反応時間プロファイル）

#### 主要関数
- **`computeResponseTimeProfile(logs)`** - 反応時間分布を計算
  - conceptTagsとcorrectで分割
  - 四分位数、平均、最小値、最大値を計算
  - 全体分布との比較

### class_compare.js（個人とクラス平均の比較）

#### 主要関数
- **`compareWithClass(individualStats, classStats)`** - 個人とクラス平均を比較
  - 相対的な位置づけ分析
  - パーセンタイルと順位を計算

---

## 6. Visualization Modules（ヒートマップ, ネットワーク, ボックスプロット）

### 概念理解分析（ヒートマップ）
- **実装**: `public/js/dashboard.js`の`renderConceptUnderstanding()`
- **形式**: テーブル形式のヒートマップ
- **軸**: X軸=メトリクス、Y軸=概念
- **色スケール**: 偏差に基づく色付け（正の偏差=赤、負の偏差=青）

### 誤答パストポロジー（ネットワークグラフ）
- **実装**: `public/js/dashboard.js`の`renderMistakeTopology()`
- **形式**: SVG形式のネットワークグラフ
- **ノード**: ユニークなパス状態（サイズ=頻度、色=概念の有無）
- **エッジ**: path遷移（太さ=頻度）

### 概念依存関係グラフ（ネットワークグラフ）
- **実装**: `public/js/dashboard.js`の`renderConceptDependency()`
- **形式**: SVG形式のネットワークグラフ
- **ノード**: 概念（サイズ=出現回数、色=正答率）
- **エッジ**: 概念間の共起（太さ=重み）

### 反応時間プロファイル（ボックスプロット）
- **実装**: `public/js/dashboard.js`の`renderResponseTimeProfile()`
- **形式**: SVG形式のボックスプロット
- **軸**: X軸=概念、Y軸=反応時間
- **オーバーレイ**: correct_vs_incorrect（色分け）、global_mean_line（破線）

---

## 7. Directory Map（必要十分なツリー）

```
nocode-site/
├── main.html                    # トップページ
├── server.js                    # Expressサーバー（開発用・任意）
├── package.json                 # npm設定
│
├── src/
│   ├── core/                    # コア機能
│   │   ├── stats_core.js       # 統一統計計算レイヤ
│   │   ├── insights_core.js    # 理解構造レポート生成
│   │   ├── pattern_summary.js  # 研究傾向サマリ（非LLM）
│   │   ├── mistake_topology.js # 誤答パストポロジー
│   │   ├── concept_dependency.js # 概念依存関係グラフ
│   │   ├── response_time_profile.js # 反応時間プロファイル
│   │   ├── class_compare.js    # 個人とクラス平均の比較
│   │   └── GlossaryLoader.js   # Glossary読み込み
│   │
│   ├── editor/                  # エディタ機能
│   │   ├── editor.html
│   │   ├── editor_main.js
│   │   └── modules/            # モジュール化された機能
│   │
│   ├── player/                  # プレイヤー機能
│   │   ├── index.html
│   │   ├── player.js
│   │   └── logging.js          # StudentLogManager
│   │
│   └── dashboard/               # ダッシュボード機能
│       └── logging.js          # loadDataset()統一ローダー
│
├── public/
│   ├── dashboard.html           # 公開ダッシュボード
│   ├── js/dashboard.js          # ダッシュボードロジック
│   └── css/                     # スタイルシート
│
├── projects/                   # プロジェクトデータ
│   ├── index.json              # プロジェクト一覧
│   └── {project_id}/
│       ├── project.json
│       ├── quiz.json
│       └── glossary.json
│
├── students/                    # 学習データ（ログファイル）
│   ├── index.json              # データセット一覧（自動生成）
│   └── *.json                  # ログファイル
│
├── docs/                        # ドキュメント
│   ├── README_developer.md     # このファイル
│   └── architecture/           # アーキテクチャ仕様書
│
└── change_log/                  # 変更履歴
    ├── 20251216.md             # データセット選択UI改修
    ├── 20251217.md             # 統計計算レイヤ統一
    └── 20260105.md             # 基本統計復元
```

---

## 8. Data Schemas（project.json / quiz.json / log schema）

### project.json
```json
{
  "id": "default",
  "title": "プロジェクトタイトル",
  "description": "説明",
  "category": "カテゴリ",
  "tags": ["タグ1", "タグ2"]
}
```

### quiz.json
```json
{
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
          "nextId": "q_1",
          "correct": true
        }
      ]
    }
  ],
  "results": [
    {
      "id": "r_0",
      "type": "result",
      "title": "結果 1",
      "text": "診断結果"
    }
  ],
  "startNode": "q_0"
}
```

### 学習ログスキーマ（quiz_log_dummy.json形式）
```json
{
  "dataset_name": "quiz_log_dummy",
  "type": "class",
  "logs": [
    {
      "questionId": "q009",
      "timestamp": "2025-11-15T16:35:30.799678Z",
      "final_answer": "c3",
      "correct": false,
      "response_time": 1.6,
      "path": ["c2", "c3"],
      "conceptTags": ["認知負荷", "メタ認知"],
      "recommended_terms": ["注意制御", "短期記憶"]
    }
  ]
}
```

---

## 9. Change Log Link（change_log/ 参照）

最新の変更履歴は `change_log/` ディレクトリを参照してください。

### 主要な変更履歴
- [2025-12-16](change_log/20251216.md) - データセット選択UIの根本改修、dataset_index自動更新、dataset_type自動判定
- [2025-12-17](change_log/20251217.md) - 統計計算レイヤの統一、研究用分析機能の実装
- [2026-01-05](change_log/20260105.md) - 基本統計の復元、loadDataset()統一ローダー

---

## 10. Roadmap（未実装は明確に区別）

### 実装済み ✅
- Editor/Player の分離
- JSON保存・読み込み
- 統計計算レイヤ統一（stats_core.js）
- 研究用分析機能（非LLM、テンプレートベース）
- データセット選択UI（1画面1ドロップダウン）
- dataset_index自動更新（Node.js使用時）
- loadDataset()統一ローダー

### 将来実装予定 🔮
- インタラクティブなグラフ可視化（D3.jsなどの使用）
- 統計結果のエクスポート機能（CSV、PDFなど）
- 複数データセットの比較機能
- より高度なパターン検出ルールの追加
- プロジェクト共有（クラウド同期）
- LMS連携（Moodle, Google Classroom）

---

## 技術スタック

- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **モジュール**: ES Modules（一部IIFE + window形式も使用）
- **可視化**: SVG（Chart.jsは使用していない）
- **サーバー**: Node.js + Express（開発用・任意）
- **分析**: Julia（オプション、クラスタリング用）

---

## 依存関係

```json
{
  "dependencies": {
    "express": "^4.18.2",  // サーバー機能のみ
    "chokidar": "^3.x.x"   // ファイル監視（dataset_index自動更新用）
  }
}
```

**注意**: フロントエンドは依存なし。ブラウザで直接開けば動作します。

---

## 主要なグローバルAPI

```javascript
// Dashboard
window.currentStats      // 統計データ
window.currentLogs       // ログ配列
window.conceptDependencyGraph // 概念依存関係グラフ

// Editor
window.gameData          // プロジェクトデータ

// Player
window.StudentLogManager // ログ管理クラス
```

---

## モジュール間の依存関係

```
stats_core.js
  ↓
insights_core.js
  ↓
pattern_summary.js

mistake_topology.js (独立)
concept_dependency.js (独立)
response_time_profile.js (独立)
```

---

詳細なアーキテクチャ仕様は `docs/architecture/` ディレクトリを参照してください。
