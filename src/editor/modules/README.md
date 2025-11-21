# Editor モジュール構造

## 概要

`editor.js` の巨大1ファイル構造から、機能別に分割されたモジュール構造への移行を進めています。

## フォルダ構造

```
src/editor/modules/
├── core/          # コア状態管理
│   └── state.js   # グローバル状態（gameData, nodeIdCounter, etc.）
├── utils/         # ユーティリティ関数
│   └── data.js    # データ正規化、HTMLエスケープ、ダウンロード
├── actions/       # ノード操作
│   └── nodes.js   # ノード追加・削除（addQuestion, addResult, etc.）
├── project/       # プロジェクト管理
│   ├── save.js    # 保存・読み込み（saveProjectAs, loadProjectFromId）
│   └── export.js  # エクスポート（exportCSV, exportHTML）
├── ui/            # UI管理
│   ├── editor.js  # エディタUI更新（updateUI, selectNode）
│   ├── shelf.js   # プロジェクト本棚UI
│   ├── events.js  # イベントリスナー一元管理
│   ├── question-editor.js   # 質問エディタ（プレースホルダー）
│   ├── diagnostic-editor.js # 診断質問エディタ（プレースホルダー）
│   ├── result-editor.js    # 結果エディタ（プレースホルダー）
│   └── preview.js          # プレビュー表示（プレースホルダー）
└── glossary/      # Glossary関連（今後実装予定）
```

## 依存関係

```
core/state.js
  ↓
utils/data.js
  ↓
actions/nodes.js → ui/editor.js
project/save.js → ui/editor.js
project/export.js
ui/shelf.js
ui/events.js → actions/nodes.js, project/save.js, project/export.js, ui/shelf.js
```

## モジュール化の進捗

### ✅ 完了
- [x] フォルダ構造の作成
- [x] コア状態管理（`core/state.js`）
- [x] ユーティリティ関数（`utils/data.js`）
- [x] ノード操作（`actions/nodes.js`）
- [x] プロジェクト保存・読み込み（`project/save.js`）
- [x] プロジェクトエクスポート（`project/export.js`）
- [x] UI管理（`ui/editor.js`）
- [x] プロジェクト本棚UI（`ui/shelf.js`）
- [x] イベントリスナー一元管理（`ui/events.js`）
- [x] メインモジュール（`editor_main.js`）

### 🔄 進行中
- [ ] 質問エディタUI（`showQuestionEditor`）の移動
- [ ] 診断質問エディタUI（`showDiagnosticQuestionEditor`）の移動
- [ ] 結果エディタUI（`showResultEditor`）の移動
- [ ] プレビュー表示（`showPreview`）の移動
- [ ] Glossary関連機能のモジュール化

### 📋 未着手
- [ ] `editor.js` の完全な薄化
- [ ] window namespace の完全削除
- [ ] 循環依存の完全除去
- [ ] テストと動作検証

## 後方互換性

現在、モジュール化された関数は `window` オブジェクトにも公開されており、既存の `editor.js` との互換性を保っています。段階的に `window` への公開を削除していく予定です。

## 使用方法

### ES Module として使用

```javascript
import { addQuestion } from './modules/actions/nodes.js';
import { saveProjectAs } from './modules/project/save.js';
import { updateUI } from './modules/ui/editor.js';
```

### グローバル関数として使用（後方互換）

```javascript
// 既存コードとの互換性のため、window にも公開
window.addQuestion();
window.saveProjectAs();
window.updateUI();
```

## 次のステップ

1. `showQuestionEditor` などの巨大関数をモジュールに移動
2. `editor.js` を完全に薄化
3. 循環依存の検出と除去
4. window namespace の段階的削除
5. 完全な動作検証

