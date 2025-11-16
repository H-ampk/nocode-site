## プロジェクト概要

このリポジトリは、ノーコードでクイズ／診断教材を編集・実行し、将来的に診断エンジン・用語集・概念グラフ・自動解説に拡張可能な長期構造を持つよう再編成されています。

### 主要ディレクトリ
```
project-root/
├── src/
│   ├── core/
│   ├── editor/
│   ├── player/
│   ├── diagnostic/
│   ├── glossary/
│   ├── concepts/
│   ├── explanation/
│   ├── utils/
│   ├── types/
│   └── unknown/
├── public/
├── projects/
│   └── sample_project/
│       ├── quiz.json
│       ├── editor.json
│       ├── glossary.json
│       └── concept_graph.json
├── docs/
│   ├── architecture.md
│   ├── roadmap.md
│   ├── glossary_spec.md
│   ├── concept_graph_spec.md
│   └── diagnostic_logic.md
├── tests/
├── scripts/
├── .gitignore
├── package.json
└── LICENSE
```

### 現状の運用
- エントリーポイント: ルートの `main.html`
- エディタは `editor.html`（`src/editor/editor.html` にリダイレクト）を起点とし、`src/editor/editor.js` のローダー経由で既存実装（`/editor.js`）を読み込みます（段階移行）。
- 実行ビュー（Player）は `player.html`（`src/player/index.html` にリダイレクト）を起点とします。
- 画像・音声などの静的ファイルは `public/` に配置（既存 `data/` は順次移行）。
- ユーザープロジェクトは `projects/{project_id}/` に JSON を配置します。

### 重要メモ
- 旧配置のファイルは破壊しない方針で段階移行します。`src/unknown/` は分類未確定の一時避難場所です。`/editor.js` は互換のため当面残置します。


