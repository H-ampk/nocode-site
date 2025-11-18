# No-code Quiz Builder

教育者・学生向けのノーコードクイズ・診断作成ツールです。コードを書かずに、Web上でインタラクティブなクイズや診断アプリケーションを作成できます。

## 📋 目次

- [プロジェクト概要](#プロジェクト概要)
- [Quick Start](#quick-start)
- [主な機能](#主な機能)
- [フォルダ構成](#フォルダ構成)
- [Glossary 機能](#glossary-機能)
- [Quiz.json / Player 機能](#quizjson--player-機能)
- [Students データ管理](#students-データ管理)
- [Dashboard（データ分析機能）](#dashboardデータ分析機能)
- [データ形式](#データ形式)
- [公開方式（access_mode）](#公開方式access_mode)
- [今後の開発計画](#今後の開発計画)

## プロジェクト概要

### What
このプロジェクトは、プログラミング知識がなくてもWeb上でクイズ・診断アプリケーションを作成できるノーコードツールです。エディタ画面で質問と選択肢を視覚的に編集し、その場でプレビューして実行できます。

### Purpose
- **教育者向け**: 授業で使えるクイズや理解度チェック診断を簡単に作成
- **学習支援**: 誤答時に自動的にGlossary（用語解説）を提示し、学習者の理解を促進
- **データ分析**: 学習者の行動ログを記録し、教師がクラス全体の理解状況を可視化

## Quick Start

### 1. プロジェクトを開く
```
ブラウザで main.html を開く
```

### 2. クイズを作成する
1. `main.html` → 「🔐 管理ダッシュボード」をクリック
2. 「📝 エディタ（Editor）」を選択
3. 「+ 質問を追加」で質問を作成
4. 選択肢を追加し、分岐先を設定
5. 「👁️ プレビュー」で実行画面を確認

### 3. クイズを実行する
1. `main.html` → 「🎮 クイズを実行する（Player）」をクリック
2. 作成したクイズに回答
3. 誤答時には自動的にGlossary（用語解説）が表示される
4. 回答ログが自動記録される

### 4. 学習データを分析する
1. `main.html` → 「🔐 管理ダッシュボード」→ 「📊 学習データ分析（Analysis）」
2. `students/` フォルダからデータセットを選択
3. 全体概要・問題別分析・概念混同分析などの結果を確認

## 主な機能

### 🎮 ノーコードエディタ
- **質問ノードの作成・編集**: 質問文と選択肢を視覚的に編集
- **分岐設定**: 各選択肢から次の質問や結果への分岐を設定
- **正誤判定**: 選択肢ごとに正解フラグを設定し、即時フィードバック
- **デザイン設定**: 背景色・フォント・ボタンスタイルをGUIで設定（コード不要）
- **プレビュー機能**: 編集しながら実際の実行画面を確認

### 📚 Glossary（用語集）システム
- **3層構造**: プロジェクト固有・学問領域別・グローバルの3層で用語を管理
- **自動レコメンド**: 誤答時に学習者の迷いパターンや反応時間を解析し、最適な用語解説を自動提示
- **タグベース検索**: 選択肢のタグと用語の分野（domains）を照合

### 🎯 Player（実行画面）
- **インタラクティブなクイズ**: 質問に回答し、分岐に従って進行
- **Glossary解説表示**: 誤答時に自動的に関連用語を表示
- **ログ記録**: 回答時間・選択肢遷移・正誤などの行動データを自動記録
- **反応時間プロファイル**: 直感・探索・熟慮の3タイプを判定（中立的な速度プロファイル）

### 📊 Dashboard（データ分析）
- **全体概要**: 総回答数・正答率・平均反応時間・思考タイプ分布を可視化
- **問題別分析**: 各問題の正答率・よく選ばれた誤答をグラフ表示
- **概念混同分析**: 誤答パターンと迷いの軌跡（path）から混同概念を推測
- **反応時間プロファイル**: 反応時間の分布をヒストグラムで表示
- **迷いパターン分析**: 選択肢遷移のパターンをランキング表示

## フォルダ構成

```
nocode-site/
├── main.html                    # エントリーポイント（トップページ）
├── README.md                    # このファイル
├── package.json                 # プロジェクト設定
├── LICENSE                      # ライセンス
│
├── admin/                       # 管理画面
│   ├── admin.html              # 管理ダッシュボード（メニュー）
│   ├── editor.html             # エディタ画面（src/editor/editor.html へリダイレクト）
│   ├── glossary.html           # Glossary 編集画面
│   ├── project_manager.html    # プロジェクト設定（公開方式・PIN設定）
│   ├── analysis.html           # データ分析ダッシュボード
│   └── login.html              # ログイン画面（将来実装）
│
├── player/                      # 一般利用画面
│   ├── index.html              # プレイヤー（クイズ実行画面）
│   └── demo.html               # デモ画面
│
├── src/                         # ロジック本体
│   ├── core/                   # 共通機能
│   │   ├── config.js           # プロジェクト設定の読み込み・保存
│   │   └── GlossaryLoader.js   # Glossary の読み込み・統合
│   ├── editor/                 # エディタ機能
│   │   ├── editor.html         # エディタ画面
│   │   └── editor.js           # エディタロジック（レガシー互換ローダ）
│   ├── player/                 # プレイヤー機能
│   │   ├── player.js           # クイズ実行ロジック
│   │   ├── logging.js          # ログ記録
│   │   └── recommendation.js   # Glossary 自動レコメンド
│   ├── auth/                   # 認証機能
│   │   └── pin.js              # PIN認証
│   ├── admin/                  # 管理機能
│   │   ├── analysis.js         # データ分析ロジック
│   │   └── dataset_loader.js   # データセット読み込み
│   ├── glossary/               # Glossary機能
│   ├── concepts/               # 概念管理
│   ├── diagnostic/             # 診断ロジック
│   ├── explanation/            # 解説生成
│   ├── utils/                  # ユーティリティ
│   └── types/                  # 型定義
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
├── glossary/                    # グローバル用語集
│   ├── global.json             # グローバルGlossary（分野横断の基底辞書）
│   └── domains/                # 学問領域別Glossary
│       ├── psychology.json     # 心理学
│       ├── AI.json             # AI・機械学習
│       └── ...
│
├── public/                      # 静的ファイル
│   ├── css/
│   │   └── main.css            # 共通スタイル
│   └── img/                    # 画像ファイル（段階的に data/ から移行予定）
│
├── data/                        # データファイル（レガシー）
│   ├── *.csv                   # CSVデータ
│   ├── *.png                   # 画像ファイル
│   └── *.mp3                   # 音声ファイル
│
├── docs/                        # ドキュメント
│   ├── README.md               # プロジェクト説明
│   ├── architecture.md         # アーキテクチャ
│   ├── roadmap.md              # 開発計画
│   ├── glossary_spec.md        # Glossary仕様
│   ├── concept_graph_spec.md   # 概念グラフ仕様
│   └── diagnostic_logic.md     # 診断ロジック仕様
│
├── change_log/                  # 変更履歴
│   ├── 20251031.md
│   ├── 20251114.md
│   ├── 20251117.md
│   └── 20251118.md
│
├── scripts/                     # スクリプト
│   ├── generate_dummy_logs.py  # ダミーログ生成
│   └── migrate_to_flat_structure.py  # データ移行
│
└── archive/                     # 一時退避
    └── README.md
```

## Glossary 機能

### 3層構造

Glossary（用語集）は3層構造で管理されます。優先順位は **Project > Domain > Global** です。

1. **Project Glossary** (`projects/{project_id}/glossary.json`)
   - プロジェクト固有の用語集
   - 特定のクイズや教材で使用する専門用語を定義

2. **Domain Glossary** (`glossary/domains/{domain}.json`)
   - 学問領域別の用語集
   - 例: 心理学 (`psychology.json`)、AI (`AI.json`)、数学 (`mathematics.json`)
   - 複数のドメインを同時に読み込み可能

3. **Global Glossary** (`glossary/global.json`)
   - 分野横断の基底辞書
   - すべてのプロジェクトで共有する基本的な用語

### Glossary接続設定

`admin/project_manager.html` で、プロジェクトが使用するGlossaryを選択できます。

- **プロジェクトのみ**: Project Glossaryのみを使用
- **学問別で共有**: Project + Domain Glossary（複数選択可能）
- **グローバル辞書と接続**: Project + Domain + Global Glossary

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

#### 用語データ構造

```json
{
  "termId": "uuid-string",
  "word": "用語名",
  "definition": "基本定義",
  "example": "使用例（オプション）",
  "note": "補足説明（オプション）",
  "domains": ["心理学", "認知科学"],
  "tags": ["短期記憶", "注意制御"],
  "links": ["関連用語1", "関連用語2"],
  "depth": "basic | intermediate | deep",
  "updatedAt": "2025-11-18T00:00:00.000Z"
}
```

### Glossary Editor

`admin/glossary.html` で用語をフォームベースで編集できます。

- 用語名・説明文・分野チェックボックスを入力
- カスタム分野を追加可能（カンマ区切りで複数追加）
- glossary.json をダウンロードして保存

![Glossary Editor](fig/glossary_editor.png)

## Quiz.json / Player 機能

### Quiz.json の構造

```json
{
  "version": 2,
  "startNode": "q_0",
  "questions": [
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
      "backgroundType": "color",
      "backgroundColor": "#ffffff",
      "questionFontSize": "1.3em",
      "questionTextColor": "#2d3748"
    }
  ],
  "results": [
    {
      "id": "r_0",
      "type": "result",
      "title": "結果 1",
      "text": "診断結果",
      "image": "attention_type.png",
      "url": "https://example.com",
      "buttonText": "公式サイトを見る"
    }
  ]
}
```

### Player の動作フロー

1. **プロジェクト読み込み**: `project.json` と `quiz.json` を読み込む
2. **Glossary読み込み**: `glossary_policy` に基づいてGlossaryを統合
3. **問題表示**: 質問と選択肢を表示、ログ記録を開始
4. **選択肢クリック**: クリック時刻と選択肢IDを記録
5. **回答確定**: 正誤を判定し、Glossary解説を表示（誤答時）
6. **ログ完成**: 回答ログを `quizLogs` 配列に追加
7. **次の問題へ**: 分岐設定に従って遷移
8. **ログダウンロード**: すべての問題が終了したら `quiz_log.json` をダウンロード

![Player Flow](fig/player_flow.png)

## Students データ管理

### データ構造

学習データは `students/` フォルダで管理されます。各データセットは `index.json` マスターファイルに登録されます。

#### students/index.json

```json
{
  "datasets": [
    {
      "file": "quiz_log_dummy.json",
      "dataset_name": "quiz_log_dummy",
      "type": "class"
    },
    {
      "file": "classA_2025.json",
      "dataset_name": "classA_2025",
      "type": "class"
    },
    {
      "file": "student001.json",
      "dataset_name": "student001",
      "type": "student"
    }
  ]
}
```

#### データセットファイル

```json
{
  "dataset_name": "classA_2025",
  "type": "class",
  "created_at": "2025-11-18",
  "logs": [
    {
      "questionId": "q_0",
      "timestamp": "2025-11-18T00:00:00.000Z",
      "clicks": [
        { "choiceId": "c1", "time": 1.2 },
        { "choiceId": "c2", "time": 3.5 }
      ],
      "final_answer": "c2",
      "correct": false,
      "response_time": 5.8,
      "path": ["c1", "c2"],
      "conceptTags": ["作業記憶"],
      "recommended_terms": ["短期記憶", "注意制御"]
    }
  ]
}
```

### データセットタイプ

- **class**: クラス全体のデータ（複数生徒のログを統合）
- **student**: 個人のデータ（1人の生徒のログ）

### index.json 自動生成

`admin/analysis.html` の「🔄 index.json を再生成」ボタンで、`students/` フォルダ内のすべてのJSONファイルから `index.json` を自動生成できます。

- 各ファイルから `dataset_name` と `type` を取得
- 未定義の場合はファイル名から推測
- 生成された `index.json` をダウンロードして保存

## Dashboard（データ分析機能）

`admin/analysis.html` で学習データを可視化・分析できます。

### 分析セクション

1. **全体概要**
   - 総回答数・正答率・平均反応時間
   - 思考タイプ分布（instant / searching / deliberate）をドーナツチャートで表示

2. **問題別分析**
   - 各問題の正答率を棒グラフで表示
   - よく選ばれた誤答・クリック回数分布をテーブル表示

3. **概念混同分析**
   - 誤答タグランキングをバーグラフで表示
   - 混同ペアランキング（path から推測した選択肢遷移パターン）をテーブル表示

4. **反応時間プロファイル集計**
   - 反応時間のヒストグラム（0-50秒を1秒刻み）
   - 最頻値・中央値・最大値・最小値を統計カードで表示

5. **迷いパターン（path）分析**
   - ユニーク遷移パターンのランキング
   - 平均迷いステップ数を表示
   - 最も多い path 例を表示

6. **Glossary 提示履歴の集計**
   - 提示された用語の頻度をテーブル表示
   - 思考タイプ別の用語提示頻度をテーブル表示

![Dashboard](fig/dashboard.png)

### データ読み込み

1. `admin/analysis.html` を開く
2. 「利用可能なデータセット一覧」からデータセットを選択
3. クラスデータ / 個人データに分類されて表示
4. データセット名をクリックして分析開始

### 新規データセット作成

1. 「新規データファイル作成」セクションで `dataset_name` と `type` を入力
2. 「作成」ボタンをクリック
3. 空のデータセットファイルが生成され、`index.json` に自動登録

## データ形式

### CSV形式（エクスポート）

エディタからエクスポートできるCSV形式（908.py互換）:

```
Start,"開始メッセージ"
Selection,"質問1","選択肢1","選択肢2"
Selection,"質問2","選択肢A","選択肢B"
Result,0,"結果1","image.png"
Result_URL,0,"結果2","ボタンテキスト","https://example.com"
End
```

### JSON形式

- **quiz.json**: クイズデータ（質問・選択肢・分岐）
- **glossary.json**: 用語集データ
- **project.json**: プロジェクト設定（公開方式・PIN設定・glossary_policy・timing_profile）

### Logs形式

#### quiz_log.json（Player出力）

```json
{
  "version": "1.0",
  "generated_at": "2025-11-18T00:00:00.000Z",
  "logs": [
    {
      "questionId": "q_0",
      "timestamp": "2025-11-18T00:00:00.000Z",
      "clicks": [
        { "choiceId": "c1", "time": 1.2 },
        { "choiceId": "c2", "time": 3.5 }
      ],
      "final_answer": "c2",
      "correct": false,
      "response_time": 5.8,
      "path": ["c1", "c2"],
      "conceptTags": ["作業記憶"],
      "recommended_terms": ["短期記憶", "注意制御"]
    }
  ]
}
```

#### データセットファイル（Dashboard入力）

```json
{
  "dataset_name": "classA_2025",
  "type": "class",
  "created_at": "2025-11-18",
  "logs": [...]
}
```

## 公開方式（access_mode）

各プロジェクトは `projects/{project_id}/project.json` で公開方式を指定します。

### project.json の構造

```json
{
  "project_id": "default",
  "access_mode": "public",
  "pin_code": null,
  "glossary_policy": {
    "mode": "project",
    "domains": []
  },
  "timing_profile": {
    "preset": "profileB",
    "instant_threshold": 3,
    "deliberate_threshold": 15
  }
}
```

### 公開方式の種類

1. **public** (初期値)
   - 一般公開
   - 管理画面も認証無し（開発時の簡便用）

2. **pin**
   - 管理画面（`admin/*`）アクセス時のみ4桁PINを要求
   - PINは `localStorage` で記憶（次回アクセス時は自動認証）
   - プレイヤー（`player/*`）は認証不要

3. **login** (将来実装)
   - 本格的なログイン機能
   - 現状は未対応（adminアクセス不可）

### 公開設定の変更

`admin/project_manager.html` または `main.html` 下部のUIで設定:

1. ラジオボタンで `public` / `pin` / `login` を選択
2. `pin` 選択時のみPIN入力欄が表示
3. 「保存」ボタンで `project.json` をダウンロード
4. ダウンロードしたファイルを `projects/{project_id}/` に配置

## 今後の開発計画

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
- **プレイヤー**: `player/index.html`（常に誰でもアクセス可）

### 共通ユーティリティ

- `src/core/config.js`: `window.ProjectConfig` を提供（load/download/normalize）
- `src/auth/pin.js`: PIN認証ロジック（`window.AdminAuth.init({admin:true})`）
