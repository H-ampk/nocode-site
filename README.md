# No-code Quiz Builder

教育者・学生向けのノーコードクイズ・診断作成ツールです。コードを書かずに、Web上でインタラクティブなクイズや診断アプリケーションを作成できます。

## 📋 目次

- [プロジェクト概要](#プロジェクト概要)
- [システム構成図](#システム構成図)
- [エディタ機能](#エディタ機能)
- [プレイヤー機能](#プレイヤー機能)
- [Glossary（評価軸）システム](#glossary評価軸システム)
- [診断ロジック・ベクトル設定UI](#診断ロジックベクトル設定ui)
- [評価軸テンプレート](#評価軸テンプレート)
- [改善履歴](#改善履歴)
- [今後のロードマップ](#今後のロードマップ)
- [開発メモ](#開発メモ)

---

## プロジェクト概要

### What
このプロジェクトは、プログラミング知識がなくてもWeb上でクイズ・診断アプリケーションを作成できるノーコードツールです。エディタ画面で質問と選択肢を視覚的に編集し、その場でプレビューして実行できます。

### Purpose
- **教育者向け**: 授業で使えるクイズや理解度チェック診断を簡単に作成
- **学習支援**: 誤答時に自動的にGlossary（用語解説）を提示し、学習者の理解を促進
- **データ分析**: 学習者の行動ログを記録し、教師がクラス全体の理解状況を可視化

### 主な特徴
- **ノーコード**: JSONの直接編集不要、GUIで直感的に操作
- **3層Glossary**: プロジェクト・ドメイン・グローバルの3層で用語を管理
- **自動レコメンド**: 誤答パターンと反応時間から最適な用語解説を自動提示
- **データ可視化**: 学習者の理解状況をグラフで可視化

---

## システム構成図

### アーキテクチャ概要

本プロジェクトは **Editor / Player / Engine / Storage** の4層で構成されます。

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
├─────────────────────────────────────────────────────────┤
│  Editor (src/editor/)    │  Player (src/player/)       │
│  - ノーコードUI          │  - 実行画面                 │
│  - 質問・選択肢編集       │  - Glossary自動提示         │
│  - ベクトル設定UI         │  - ログ記録                 │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                    Core Logic                           │
├─────────────────────────────────────────────────────────┤
│  Core (src/core/)        │  Admin (src/admin/)         │
│  - config.js             │  - analysis.js               │
│  - GlossaryLoader.js     │  - dataset_loader.js        │
│                          │  - pin.js                    │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                    Storage                               │
├─────────────────────────────────────────────────────────┤
│  projects/{id}/          │  src/glossary/              │
│  - project.json          │  - global.json              │
│  - quiz.json             │  - domains/*.json           │
│  - glossary.json         │                              │
└─────────────────────────────────────────────────────────┘
```

### フォルダ構成

```
nocode-site/
├── main.html                    # エントリーポイント（トップページ）
├── README.md                    # このファイル
├── package.json                 # プロジェクト設定
├── LICENSE                      # ライセンス
├── server.js                    # 開発サーバー（オプション）
├── editor.js                    # エディタロジック（レガシー互換、ルート配置）
│
├── admin/                       # 管理画面（UIエントリーポイント）
│   ├── admin.html              # 管理ダッシュボード（メニュー）
│   ├── project_manager.html    # プロジェクト設定（公開方式・PIN設定）
│   ├── analysis.html           # データ分析ダッシュボード
│   └── login.html              # ログイン画面（将来実装）
│
├── src/                         # ロジック本体
│   ├── core/                   # 共通機能
│   │   ├── config.js           # プロジェクト設定の読み込み・保存
│   │   ├── GlossaryLoader.js   # Glossary の読み込み・統合
│   │   └── README.md
│   ├── editor/                 # エディタ機能
│   │   ├── editor.html         # エディタ画面（統合済み）
│   │   ├── editor.js           # エディタロジック（レガシー互換ローダ）
│   │   └── README.md
│   ├── player/                 # プレイヤー機能
│   │   ├── index.html          # プレイヤー（クイズ実行画面）
│   │   ├── demo.html           # デモ画面
│   │   ├── player.js           # クイズ実行ロジック
│   │   ├── logging.js          # ログ記録
│   │   ├── recommendation.js   # Glossary 自動レコメンド
│   │   └── README.md
│   ├── admin/                  # 管理機能
│   │   ├── pin.js              # PIN認証
│   │   ├── auth.js             # 認証ロジック
│   │   ├── analysis.js         # データ分析ロジック
│   │   └── dataset_loader.js   # データセット読み込み
│   ├── glossary/               # Glossary機能
│   │   ├── glossary.html      # Glossary 編集画面
│   │   ├── glossary_test.html  # Glossary Loader テスト画面
│   │   ├── glossary.js         # Glossary 編集ロジック
│   │   ├── global.json         # グローバルGlossary（分野横断の基底辞書）
│   │   ├── domains/            # 学問領域別Glossary
│   │   │   ├── psychology.json # 心理学
│   │   │   ├── AI.json         # AI・機械学習
│   │   │   └── ...
│   │   └── README.md
│   └── README.md
│
├── projects/                    # プロジェクトデータ
│   └── {project_id}/           # プロジェクトごとのフォルダ
│       ├── project.json        # プロジェクト設定（公開方式・PIN設定）
│       ├── quiz.json           # クイズデータ（質問・選択肢・分岐）
│       ├── glossary.json       # プロジェクト用語集
│       ├── editor.json         # エディタ設定
│       └── concept_graph.json  # 概念グラフ（将来実装）
│
├── students/                    # 学習データ
│   ├── index.json              # データセット一覧（マスターファイル）
│   ├── generate_index.js       # index.json 自動生成スクリプト
│   └── *.json                  # データセットファイル（クラスデータ・個人データ）
│
├── legacy/                      # バックアップ（フォルダ整理前のコード）
│   └── ...                     # すべての .js ファイルのバックアップ
│
├── public/                      # 静的ファイル
│   ├── css/
│   │   └── main.css            # 共通スタイル
│   ├── js/                     # JavaScript ファイル
│   ├── dashboard.html          # ダッシュボード（レガシー）
│   └── README.md
│
├── data/                        # データファイル（レガシー）
│   ├── *.csv                   # CSVデータ
│   ├── *.png                   # 画像ファイル
│   ├── *.mp3                   # 音声ファイル
│   ├── *.pkl                   # Python シリアライズデータ
│   └── *.html                  # HTML サンプルファイル
│
├── analysis/                    # 分析スクリプト（Julia）
│   ├── reaction_time.jl       # 反応時間分析
│   └── run_analysis.jl        # 分析実行スクリプト
│
├── docs/                        # ドキュメント
│   ├── README.md               # プロジェクト説明
│   ├── architecture.md         # アーキテクチャ
│   ├── roadmap.md              # 開発計画
│   ├── glossary_spec.md        # Glossary仕様
│   ├── concept_graph_spec.md   # 概念グラフ仕様
│   ├── diagnostic_logic.md     # 診断ロジック仕様
│   └── README_legacy.html      # レガシードキュメント
│
├── change_log/                  # 変更履歴
│   ├── 20251031.md
│   ├── 20251114.md
│   ├── 20251117.md
│   ├── 20251118.md
│   └── 20251119.md
│
├── scripts/                     # スクリプト
│   ├── generate_dummy_logs.js  # ダミーログ生成（JavaScript）
│   ├── generate_dummy_logs.py  # ダミーログ生成（Python）
│   ├── verify_dummy_logs.py    # ダミーログ検証
│   ├── migrate_to_flat_structure.py  # データ移行
│   └── README.md
│
├── tests/                       # テスト
│   └── README.md
│
└── archive/                     # 一時退避
    └── README.md
```

---

## エディタ機能

### 概要
`src/editor/editor.html` で提供されるノーコードエディタです。質問と選択肢を視覚的に編集し、分岐設定やデザイン設定をGUIで行えます。

### 主な機能

#### 1. 質問ノードの作成・編集
- **質問文の入力**: テキストエリアで質問文を編集
- **選択肢の追加・削除**: ボタン操作で選択肢を動的に追加・削除
- **選択肢IDの自動生成**: `id`、`value`、またはインデックスベースで自動生成
- **正誤判定**: 各選択肢に正解フラグを設定

#### 2. 分岐設定
- **次のノード選択**: 各選択肢から次の質問や結果への分岐をドロップダウンで設定
- **ループ防止**: 現在編集中のノードを除外してループを防止
- **分岐の可視化**: プレビューパネルで各選択肢の接続先を視覚的に表示

#### 3. デザイン設定
- **背景設定**: 背景色・背景画像・グラデーションをGUIで設定
- **フォント設定**: 質問文・選択肢のフォントサイズ・色を設定
- **ボタンスタイル**: 選択肢ボタンの色・テキスト色を設定

#### 4. プレビュー機能
- **実行可能プレビュー**: 「👁️ プレビュー」ボタンで実際にゲームを実行できる新しいウィンドウを開く
- **分岐処理**: 選択肢をクリックすると、設定した `nextId` に従って次のノードに遷移
- **戻る機能**: 前の質問に戻れる
- **最初からやり直し**: 最初からやり直せる

#### 5. 診断クイズ対応
- **診断質問の追加**: 診断クイズ専用の質問タイプを追加
- **スコアリング設定**: 各選択肢で影響する評価軸を設定（後述のベクトル設定UIを使用）

### データ構造

#### 通常クイズ
```json
{
  "id": "q_0",
  "type": "question",
  "title": "質問 1",
  "text": "質問文",
  "choices": [
    {
      "id": "c1",
      "text": "選択肢1",
      "value": 0,
      "nextId": "q_1",
      "correct": true,
      "tags": ["短期記憶"]
    }
  ],
  "vector_scores": {
    "c1": { "logic": 1, "memory": -1 }
  }
}
```

#### 診断クイズ
```json
{
  "id": "dq_0",
  "type": "diagnostic_question",
  "question_text": "診断質問 1",
  "question_type": "single_choice",
  "choices": [
    { "id": "a", "text": "選択肢A" },
    { "id": "b", "text": "選択肢B" }
  ],
  "scoring": [
    { "choice_id": "a", "vector": { "logic": 1 } },
    { "choice_id": "b", "vector": { "logic": -1 } }
  ]
}
```

---

## プレイヤー機能

### 概要
`src/player/index.html` と `src/player/demo.html` で提供されるクイズ実行画面です。学習者が質問に回答し、分岐に従って進行します。

### 主な機能

#### 1. クイズデータの読み込み
- **プロジェクト設定の読み込み**: `project.json` から `glossary_policy` と `timing_profile` を取得
- **Glossaryの統合**: `GlossaryLoader.loadGlossaryByPolicy()` で3層構造のGlossaryを統合
- **クイズデータの読み込み**: `quiz.json` を読み込み、質問と選択肢を表示

#### 2. インタラクティブなクイズ実行
- **質問表示**: 質問文と選択肢ボタンを表示
- **分岐処理**: 選択肢をクリックすると、設定した `nextId` に従って次のノードに遷移
- **結果表示**: 結果ノードの場合は診断結果・画像・URLボタンを表示

#### 3. Glossary自動提示
- **誤答時の自動提示**: 誤答時に `GlossaryRecommendation` が最適な用語解説を自動提示
- **判定アルゴリズム**: 反応時間・path（迷いの軌跡）・conceptTag と glossary.tags の一致度から判定

#### 4. ログ記録
- **回答ログの記録**: `QuizLogging` が回答時間・選択肢遷移・正誤などの行動データを自動記録
- **ログ形式**: `quiz_log.json` としてダウンロード可能

### 動作フロー

1. **プロジェクト読み込み**: `project.json` と `quiz.json` を読み込む
2. **Glossary読み込み**: `glossary_policy` に基づいてGlossaryを統合
3. **問題表示**: 質問と選択肢を表示、ログ記録を開始
4. **選択肢クリック**: クリック時刻と選択肢IDを記録
5. **回答確定**: 正誤を判定し、Glossary解説を表示（誤答時）
6. **ログ完成**: 回答ログを `quizLogs` 配列に追加
7. **次の問題へ**: 分岐設定に従って遷移
8. **ログダウンロード**: すべての問題が終了したら `quiz_log.json` をダウンロード

---

## Glossary（評価軸）システム

### 3層構造

Glossary（用語集）は3層構造で管理されます。優先順位は **Project > Domain > Global** です。

1. **Project Glossary** (`projects/{project_id}/glossary.json`)
   - プロジェクト固有の用語集
   - 特定のクイズや教材で使用する専門用語を定義

2. **Domain Glossary** (`src/glossary/domains/{domain}.json`)
   - 学問領域別の用語集
   - 例: 心理学 (`psychology.json`)、AI (`AI.json`)、数学 (`mathematics.json`)
   - 複数のドメインを同時に読み込み可能

3. **Global Glossary** (`src/glossary/global.json`)
   - 分野横断の基底辞書
   - すべてのプロジェクトで共有する基本的な用語

### Glossary接続設定

`admin/project_manager.html` で、プロジェクトが使用するGlossaryを選択できます。

- **プロジェクトのみ**: Project Glossaryのみを使用
- **学問別で共有**: Project + Domain Glossary（複数選択可能）
- **グローバル辞書と接続**: Project + Domain + Global Glossary

### GlossaryLoader

`src/core/GlossaryLoader.js` が3層構造のGlossaryを読み込み・統合します。

- **動的パス解決**: 現在のページのパスに基づいて適切なパスを自動計算
- **マージ機能**: `mergeGlossaries()` で複数のGlossaryを統合
- **Policy対応**: `loadGlossaryByPolicy()` で `glossary_policy` に基づいて読み込み

### 自動レコメンド機能

Player（実行画面）で誤答した際、以下のアルゴリズムで最適な用語解説を自動提示します。

#### 判定項目

1. **反応時間による分類**
   - 短い（0-3秒）→ `basic` レベルの用語を優先
   - 中間（3-15秒）→ `intermediate` レベルの用語を優先
   - 長い（15秒以上）→ `deep` レベルの用語を優先

2. **path（迷いの軌跡）解析**
   - ユニーク要素数が1 → 即答型 → 基本定義のみ
   - 2-3選択肢間を往復 → 概念混同 → 対概念の比較解説を提示
   - 4以上遷移 → 深い混乱 → 関連用語まとめを提示（最大3つ）

3. **conceptTag と glossary.tags の一致度計算**
   - 一致度スコア（0-1）でソートし、最も高い用語を優先表示

4. **同じ誤答パターンが複数回続く場合**
   - `links` を持つ用語を優先的に提示

### 用語データ構造

```json
{
  "id": "concept.logic",
  "name": "論理",
  "definition": "物事を筋道立てて考えること。推論や判断の基礎となる思考の方法。",
  "example": "三段論法は論理的な推論の一例である。",
  "fields": ["reasoning", "analysis"],
  "tags": ["短期記憶", "注意制御"],
  "links": ["https://example.com/logic"],
  "depth": "basic | intermediate | deep"
}
```

### Glossary Editor

`src/glossary/glossary.html` で用語をフォームベースで編集できます。

- 用語名・説明文・分野チェックボックスを入力
- カスタム分野を追加可能（カンマ区切りで複数追加）
- glossary.json をダウンロードして保存

---

## 診断ロジック・ベクトル設定UI

### 概要
エディタでクイズを作成する際、各選択肢がどの評価軸にどの程度影響するかを設定するUIです。JSONの直接編集を排除し、Glossaryから評価軸を自動取得して、ラジオボタンで直感的に設定できます。

### 通常クイズのベクトル設定

#### データ構造
```json
{
  "vector_scores": {
    "choice_0": { "logic": 1, "memory": -1 },
    "choice_1": { "logic": -1, "memory": 1 }
  }
}
```

#### UI機能
- **評価軸の自動取得**: Glossaryから評価軸を自動取得し、用語名・ID・定義を表示
- **ラジオボタン操作**: -1（弱まる）/ 0（影響なし）/ +1（強まる）をラジオボタンで選択
- **自動JSON生成**: UI操作から内部JSONを自動生成
- **選択肢ごとの表示**: 各選択肢ごとに評価軸UIを自動生成

### 診断クイズのスコアリング設定

#### データ構造
```json
{
  "scoring": [
    { "choice_id": "a", "vector": { "logic": 1, "memory": -1 } },
    { "choice_id": "b", "vector": { "logic": -1, "memory": 1 } }
  ]
}
```

#### UI機能
- **評価軸の自動取得**: Glossaryから評価軸を自動取得し、用語名・ID・定義を表示
- **ラジオボタン操作**: -1（弱まる）/ 0（影響なし）/ +1（強まる）をラジオボタンで選択
- **自動JSON生成**: UI操作から内部JSONを自動生成
- **選択肢変更時の自動更新**: 選択肢追加・削除・変更時にスコアリングUIを自動再描画

### テンプレート選択UI

通常クイズと診断クイズの両方で、評価軸テンプレートを選択して読み込むことができます。

- **テンプレート選択**: セレクトボックスで3つのテンプレートから選択
- **即座反映**: テンプレートを選択すると、評価軸UIが即座に更新される
- **永続化**: `localStorage` に保存して永続化

---

## 評価軸テンプレート

### 概要
エディタ内で使用できる3種類のGlossaryテンプレートです。クイズ作成時にテンプレートを選択するだけで、評価軸を設定できます。

### テンプレート一覧

#### 1. 教育学（学習科学）
- **`learning.understanding`**: 理解度 - 概念同士の関係性を理解しているか
- **`learning.transfer`**: 転移可能性 - 学んだ内容を新しい状況に応用できる力
- **`learning.metacognition`**: メタ認知 - 自分の理解状態を把握し調整できる力
- **`learning.strategy`**: 学習方略 - 有効な学習方法を使えるか

#### 2. 心理学（認知）
- **`cognition.attention`**: 注意 - 必要な情報に焦点を合わせる能力
- **`cognition.memory`**: 記憶 - 学習内容を保持し想起する能力
- **`cognition.reasoning`**: 推論 - 情報を組み合わせて結論を導く能力
- **`cognition.processing`**: 処理速度 - 情報処理の速さと効率

#### 3. AIリテラシー
- **`ai.critical`**: 批判的思考 - AIの出力を鵜呑みにせず検証する力
- **`ai.data_reason`**: データ思考 - データから意味を読み取る力
- **`ai.meta`**: AI時代のメタ認知 - AIと人間の役割を使い分ける力
- **`ai.collaboration`**: AI協働 - AIを利用して問題解決を進める能力

### 使用方法

1. エディタで質問を編集
2. 「理解分析（ベクトル設定）」または「スコアリング設定」セクションでテンプレートを選択
3. 「テンプレートを読み込む」ボタンをクリック
4. 評価軸UIが即座に更新され、各選択肢で評価軸を設定可能

### 技術実装

- **テンプレート定義**: `editor.js` の先頭に `GLOSSARY_TEMPLATES` オブジェクトとして定義
- **状態管理**: `window.currentGlossary` に設定し、`localStorage` に保存
- **UI更新**: `loadGlossaryTemplateForQuestion()` でテンプレートを読み込み、評価軸UIを再描画

---

## 改善履歴

### 2025-11-19: エディタ内Glossaryテンプレート選択システムの実装

#### 主な改善点
- エディタ内に3種類のGlossaryテンプレート（教育学・心理学・AIリテラシー）を統合
- クイズ作成時にテンプレートから評価軸を選択できるUIシステムを実装
- テンプレート選択時に評価軸UIが更新されない問題を修正（同期処理への変更）

#### 技術的変更
- `loadGlossaryForScoring()` を同期関数に変更
- `renderVectorSettingsForQuestion()` と `renderDiagnosticScoringList()` を同期化
- `window.currentGlossary` と `localStorage` による状態管理

### 2025-11-19: エディタ画面の統合とiframe完全削除

#### 主な改善点
- `admin/editor.html` と `src/editor/editor.html` を統合
- iframe に依存しない単一ファイル構成のエディタに改善
- `project.json` 読み込み問題の修正（動的パス解決）

#### 技術的変更
- `postMessage` イベントリスナーを削除
- `localStorage` の `storage` イベントリスナーを削除
- `loadGlossaryDirectly()` 関数を追加し、`GlossaryLoader` を使って直接 Glossary を読み込む

### 2025-11-19: admin/editor.html の完全削除

#### 主な改善点
- `admin/editor.html` を完全に削除し、エディタ機能を `src/editor/editor.html` に一本化
- iframe や postMessage に依存するコードをすべて撤去

### 2025-11-18: 教師向けデータ分析ダッシュボードの実装

#### 主な改善点
- `quiz_log.json`（学習者の行動ログ）を読み込み、生徒の理解・迷い・反応時間・誤答傾向を可視化
- 6つの分析セクションを実装：
  - 全体概要（総回答数・正答率・平均反応時間・思考タイプ分布）
  - 問題別分析（各問題の正答率・よく選ばれた誤答）
  - 概念混同分析（誤答タグランキング・混同ペアランキング）
  - 反応時間プロファイル集計（ヒストグラム・統計値）
  - 迷いパターン分析（ユニーク遷移パターンのランキング）
  - Glossary 提示履歴の集計

### 2025-11-17: プロジェクト再構成・公開方式・admin分離

#### 主な改善点
- ルート直下のHTML/JSを役割別フォルダへ強制移動
- 公開方式（public/pin/login）を導入
- 管理画面のPIN認証を実装
- `src/` 配下にロジック本体を整理

### 2025-11-14: 分岐機能の改善と実行可能プレビュー機能の実装

#### 主な改善点
- 選択肢ごとの分岐設定の強化（ドロップダウンメニューの改善・ループ防止）
- 分岐の可視化（プレビューパネルで接続先を表示）
- 実行可能プレビュー機能（実際にゲームを実行できる新しいウィンドウ）

---

## 今後のロードマップ

### Phase 1 (MVP) - 完了 ✅
- Editor/Player の分離
- JSON保存
- 手動実行

### Phase 2 - 完了 ✅
- 診断エンジンの土台（スコアベクトル・分岐）
- ベクトル設定UIの実装

### Phase 3 - 進行中
- 概念ツリー（Concept Graph）の可視化・編集機能
- Glossary Editor の機能拡張（例文・リンクの編集UI）

### Phase 4 - 完了 ✅
- Glossary（用語集）CRUD
- 3層構造のGlossaryシステム
- テンプレート選択UI

### Phase 5 - 計画中
- 自動解説生成
- AI連携（「この問題の典型的な誤答理由は？」など）

### Phase 6 - 計画中
- 可視化・レポート（Dashboard の CSV/PDF 出力機能）
- 複数のログファイルの比較分析機能
- リアルタイムダッシュボード機能

### 短期計画
- [ ] Glossary Editor の機能拡張（例文・リンクの編集UI）
- [ ] Dashboard の CSV/PDF 出力機能
- [ ] 複数のログファイルの比較分析機能
- [ ] `login` 公開方式の実装

### 中期計画
- [ ] 概念グラフ（concept_graph.json）の可視化・編集機能
- [ ] AI連携（「この問題の典型的な誤答理由は？」など）
- [ ] リアルタイムダッシュボード機能
- [ ] 画像アップロード機能の改善（サーバー側実装）

### 長期計画
- [ ] サーバー側実装（データ永続化・認証・共有機能）
- [ ] モバイルアプリ対応
- [ ] 多言語対応
- [ ] プラグイン・拡張機能の仕組み

---

## 開発メモ

### アーキテクチャ

本プロジェクトは **Editor / Player / Engine / Storage** の4層で構成されます。

- **Editor**: ノーコードUIで JSON を編集（`src/editor/`）
- **Player**: 学習者向けの実行画面（`src/player/`）
- **Engine**: 診断・概念・解説の判定ロジック（`src/diagnostic/`, `src/concepts/`, `src/explanation/`）
- **Storage**: JSON（ローカル／ブラウザ）と静的ファイル（`projects/`, `public/`）

### 責務分担

- `src/core/`: 共通の状態・永続化・ルーティング方針などの基盤
- `src/utils/`: 小粒の汎用関数
- `src/types/`: 型定義（TS/型付JS）
- `src/unknown/`: 一時避難

### 診断ロジック（ドラフト）

- 質問単位でスコアベクトルを付与し、累積ベクトルを計算
- 分岐は `next.{choice_id}` と `default` を持つ
- 結果はしきい値/ルールで判定、将来的に学習者プロファイル化

### 概念グラフ（concept_graph.json）仕様（ドラフト）

```json
{
  "nodes": [
    { "id": "concept.analysis", "label": "分析力", "prerequisites": [] },
    { "id": "concept.logic_tree", "label": "論理ツリー", "prerequisites": ["concept.analysis"] }
  ],
  "edges": [
    { "from": "concept.analysis", "to": "concept.logic_tree", "weight": 0.8 }
  ],
  "consistency_rules": [
    { "id": "rule_01", "description": "論理ツリーの得点が高い場合、分析力も一定以上であるべき" }
  ]
}
```

### Glossary仕様（ドラフト）

```json
{
  "terms": [
    {
      "id": "concept.logic_tree",
      "name": "論理ツリー",
      "definition": "複雑な問題を分解する思考モデル",
      "parent": "concept.analysis",
      "tags": ["analysis", "problem-solving"]
    }
  ]
}
```

### パス解決の動的化

フォルダ整理後、すべての `src/` 配下からのアクセスに対応するため、パス解決を動的に実装しました。

- `src/core/config.js`: `getConfigPath()` と `getAdminConfigPath()` で現在のページパスに基づいて適切なパスを計算
- `src/core/GlossaryLoader.js`: `getBasePath()` で現在のページパスに基づいて適切なパスを計算
- `src/admin/pin.js`: `loadConfig()` と `getMainHtmlPath()` で現在のページパスに基づいて適切なパスを計算

### 公開方式（access_mode）

各プロジェクトは `projects/{project_id}/project.json` で公開方式を指定します。

- **public**: 一般公開（管理画面も認証無し）
- **pin**: 管理画面（`admin/*`）アクセス時のみ4桁PINを要求
- **login**: 本格的なログイン機能（将来実装）

---

## Quick Start

### 1. プロジェクトを開く
```
ブラウザで main.html を開く
```

### 2. クイズを作成する
1. `main.html` → 「🔐 管理ダッシュボード」をクリック
2. 「🛠 クイズ編集（Editor）」を選択
3. 「+ 質問を追加」で質問を作成
4. 選択肢を追加し、分岐先を設定
5. 「理解分析（ベクトル設定）」で評価軸テンプレートを選択
6. 「👁️ プレビュー」で実行画面を確認

### 3. クイズを実行する
1. `main.html` → 「🎮 クイズを実行する（Player）」をクリック
2. 作成したクイズに回答
3. 誤答時には自動的にGlossary（用語解説）が表示される
4. 回答ログが自動記録される

### 4. 学習データを分析する
1. `main.html` → 「🔐 管理ダッシュボード」→ 「📊 学習データ分析（Analysis）」
2. `students/` フォルダからデータセットを選択
3. 全体概要・問題別分析・概念混同分析などの結果を確認

---

## ライセンス

このプロジェクトのライセンス情報については `LICENSE` ファイルを参照してください。

## 開発者向け

### 開発サーバーの起動

```bash
npm run dev
```

### エントリーポイント

- **トップページ**: `main.html`
- **管理画面**: `admin/admin.html`（PIN等の保護対象、admin配下はすべてPINロジック読込）
- **プレイヤー**: `src/player/index.html`（常に誰でもアクセス可）

### 共通ユーティリティ

- `src/core/config.js`: `window.ProjectConfig` を提供（load/download/normalize）
- `src/admin/pin.js`: PIN認証ロジック（`window.AdminAuth.init({admin:true})`）
- `src/core/GlossaryLoader.js`: Glossary の読み込み・統合（`GlossaryLoader.loadProjectGlossary()`, `GlossaryLoader.loadGlobalGlossary()`, `GlossaryLoader.mergeGlossaries()`）
