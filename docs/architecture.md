## アーキテクチャ

本プロジェクトは Editor / Player / Engine / Storage の4層で構成されます。

- Editor: ノーコードUIで JSON を編集（`src/editor/`）
- Player: 学習者向けの実行画面（`src/player/`）
- Engine: 診断・概念・解説の判定ロジック（`src/diagnostic/`, `src/concepts/`, `src/explanation/`）
- Storage: JSON（ローカル／ブラウザ）と静的ファイル（`projects/`, `public/`）

責務は以下の通りです。
- `src/core/`: 共通の状態・永続化・ルーティング方針などの基盤
- `src/utils/`: 小粒の汎用関数
- `src/types/`: 型定義（TS/型付JS）
- `src/unknown/`: 一時避難



