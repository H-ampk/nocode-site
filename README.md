# No-code Quiz Builder / Learning Analytics Engine

**ブラウザ完結型のノーコード教育エディタ / 学習データ分析エンジン**

HTML/CSS/JavaScriptのみで動作し、Node.jsは任意です。教材作成から学習データ分析まで、すべてブラウザ内で完結します。

---

## 🎯 できること

- **教材作成**: GUIエディタでクイズ・診断をノーコードで作成（質問、選択肢、分岐、結果画面）
- **クイズ実行**: 学習者がブラウザでクイズを解き、学習ログを自動記録
- **データ分析**: 学習ログから統計・可視化・研究用サマリを自動生成
- **概念分析**: 概念（conceptTags）別の理解傾向、誤答パターン、反応時間分布を可視化

---

## 🚀 起動方法

### ブラウザ直開き（推奨）
```bash
# リポジトリをクローン
git clone <repository-url>
cd nocode-site

# ブラウザで直接開く
# - main.html - トップページ
# - src/editor/editor.html - エディタ
# - src/player/index.html - プレイヤー
# - public/dashboard.html - ダッシュボード
```

### Node.js使用時（任意・開発用）
```bash
npm install
npm start  # Expressサーバー（ポート3000）
# http://localhost:3000/ でアクセス
```

**重要**: Node.jsは任意です。HTMLファイルをブラウザで直接開けば動作します。

---

## 📍 エントリーポイント

| 機能 | パス | 説明 |
|------|------|------|
| **トップページ** | `main.html` | 各機能へのリンク |
| **エディタ** | `src/editor/editor.html` | 教材作成（ノードベース編集） |
| **プレイヤー** | `src/player/index.html` | クイズ実行画面 |
| **ダッシュボード** | `public/dashboard.html` | 学習データ分析（統計・可視化） |

---

## 🏗️ 主要モジュール

### コア機能
- **`src/core/stats_core.js`** - 統一統計計算レイヤ（2025-12-17実装）
  - `computeStats()` - 基本統計（正答率、反応時間、パス長など）
  - `normalizeConceptStats()` - 概念別統計の正規化
- **`src/dashboard/logging.js`** - 統一データローダー（2026-01-05改善）
  - `loadDataset()` - データセット読み込み（`/students/index.json`から）

### 分析モジュール（非LLM・観測データ中心）
- **`src/core/pattern_summary.js`** - 研究傾向サマリ（テンプレートベース）
- **`src/core/mistake_topology.js`** - 誤答パストポロジー（行動構造のみ）
- **`src/core/concept_dependency.js`** - 概念依存関係グラフ（観測データベース）
- **`src/core/response_time_profile.js`** - 反応時間プロファイル（数値のみ）

---

## 📊 データセットシステム（2025-12-16改善）

### 1画面1ドロップダウン形式
- データセット選択UI: 1つのセレクトボックスに全データセットを表示
- 表示形式: `{dataset_name}（{セッション数} sessions / {ログ数} logs）`
- 自動更新: Node.js使用時、`chokidar`で`students/`フォルダを監視し、`index.json`を自動生成
- 自動判定: `dataset_type`を自動判定（class/project/quiz）

### データローダー統一（2026-01-05改善）
- `loadDataset(datasetName)` - 統一ローダー関数
- `/students/index.json`からデータセット一覧を取得
- `/students/${dataset.file}`からデータを読み込む

---

## 🎨 設計思想

### 推論ではなく観測
- **LLM使用禁止**: 統計結果と観測データの正確性を担保できないため,再現可能な分析を優先し、テンプレート／ルールベースで実装
- **観測データ中心**: 学習ログから数値・統計のみを計算
- **人格評価なし**: 解釈や人格的評価は行わない
- **研究用言語**: 数値と統計的表現のみでサマリを生成

### ブラウザ完結
- サーバー不要で動作（Node.jsは開発用のみ）
- localStorageでプロジェクト管理
- すべての処理がクライアント側で完結

---

## 📚 詳細ドキュメント

詳細なアーキテクチャ、ディレクトリ構造、API仕様は **[docs/README_developer.md](docs/README_developer.md)** を参照してください。

---

## 📝 変更履歴

最新の変更履歴は `change_log/` ディレクトリを参照:
- [2025-12-16](change_log/20251216.md) - データセット選択UIの根本改修
- [2025-12-17](change_log/20251217.md) - 統計計算レイヤの統一、研究分析機能
- [2026-01-05](change_log/20260105.md) - 基本統計の復元、データローダー統一

---

## 📄 ライセンス

`LICENSE` ファイルを参照してください。
