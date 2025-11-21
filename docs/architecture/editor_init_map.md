# Editor 初期化マップ（統合版）

## 理想的な初期化フロー（7段階）

```
① DOMロード
   ↓
② Glossary のロード (GlossaryLoader.js)
   ↓
③ Config のロード (config.js)
   ↓
④ Project のロード (localStorage or URL)
   ↓
⑤ 初期UI更新 (updateUI)
   ↓
⑥ ノード関連イベント設定
   ↓
⑦ 保存・読み込み・エクスポートイベント設定
```

## 現在の問題点

### 1. Script ロード順序の衝突
- `src/editor/editor.html` で `src/editor/editor.js` (ラッパー) が読み込まれる
- ラッパーが `defer` で `../../editor.js` を読み込む
- さらに `editor.html` で直接 `editor.js` も読み込まれている（二重ロード）

### 2. DOMContentLoaded の分散
- `DOMContentLoaded #1`: ドロップゾーン初期化（656行目）
- `DOMContentLoaded #2`: Editor初期化開始（3609行目）
- `DOMContentLoaded #3`: イベントリスナー登録開始（4047行目）

### 3. 初期化の途中 return
- `loadGlossaryDirectly()` で `GlossaryLoader` が未定義の場合に `return`（早期リターン）
- プロジェクト読み込み時にデータがない場合の早期リターン

### 4. 依存関係の不整合
- `GlossaryLoader` の読み込みが完了する前に `loadGlossaryDirectly()` が呼ばれる可能性
- `editor.js` が読み込まれる前に `DOMContentLoaded` が発火する可能性

## 修正方針

1. **初期化ルートの一本化**: `editor_init.js` を作成し、すべての初期化を一箇所に集約
2. **Script タグの整理**: 二重ロードを解消し、正しい順序で読み込む
3. **初期化の保証**: 各段階でエラーハンドリングを追加し、途中で止まらないようにする
4. **イベント登録の確実性**: すべてのイベントリスナーを確実に登録する

## 実装完了内容

### 1. `src/editor/editor_init.js` の作成
- 7段階の初期化フローを一本化
- 各段階でエラーハンドリングを実装
- 初期化状態を管理し、重複実行を防止

### 2. `src/editor/editor.html` の修正
- `src/editor/editor.js` (ラッパー) を削除
- `editor.js` を直接読み込むように変更
- `editor_init.js` を追加

### 3. `editor.js` の修正
- 既存の `DOMContentLoaded` イベントリスナーをレガシーコードとして残す
- `editor_init.js` が読み込まれている場合は、レガシーコードをスキップ

### 4. 初期化フローの保証
- Glossary の読み込みが完了するまで待機
- プロジェクトの読み込みが失敗しても続行
- イベントリスナーの登録を確実に実行

