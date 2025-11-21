# Editor モジュール化の進捗

## 実施内容

### 1. 新フォルダ構造の作成 ✅

以下のフォルダ構造を作成しました：

```
src/editor/modules/
├── core/          # コア状態管理
├── utils/         # ユーティリティ関数
├── actions/       # ノード操作
├── project/       # プロジェクト管理
├── ui/            # UI管理
└── glossary/      # Glossary関連（今後実装）
```

### 2. 関数のカテゴリ別分割 ✅

以下のモジュールを作成しました：

#### `modules/core/state.js`
- `gameData` の状態管理
- `nodeIdCounter` の管理
- `selectedNodeId` の管理
- `GLOSSARY_TEMPLATES` の定義

#### `modules/utils/data.js`
- `normalizeGameData()` - データ正規化
- `escapeHtml()` - HTMLエスケープ
- `downloadJSON()` - JSONダウンロード
- `randomTagColor()` - タグカラー生成

#### `modules/actions/nodes.js`
- `addQuestion()` - 質問ノード追加
- `addDiagnosticQuestion()` - 診断質問ノード追加
- `addResult()` - 結果ノード追加
- `deleteNode()` - ノード削除

#### `modules/project/save.js`
- `saveProject()` - プロジェクト保存（旧形式）
- `saveProjectAs()` - 名前を付けて保存
- `handleFileLoad()` - ファイル読み込み
- `loadProjectData()` - プロジェクトデータ読み込み
- `loadProjectFromId()` - プロジェクトIDから読み込み

#### `modules/project/export.js`
- `exportCSV()` - CSV形式でエクスポート
- `exportHTML()` - HTML形式でエクスポート（準備中）
- `previewGame()` - プレビュー表示

#### `modules/ui/editor.js`
- `selectNode()` - ノード選択
- `updateUI()` - UI更新
- `updateNodeList()` - ノードリスト更新
- `updateEditor()` - エディタ更新

#### `modules/ui/shelf.js`
- `openProjectShelf()` - プロジェクト本棚を開く
- `closeProjectShelf()` - プロジェクト本棚を閉じる

#### `modules/ui/events.js`
- `bindAllEvents()` - すべてのイベントリスナーを登録

### 3. メインモジュールの作成 ✅

`src/editor/editor_main.js` を作成し、初期化とイベント登録のみを担当する薄いルートファイルにしました。

### 4. editor.html の更新 ✅

`editor.html` に `editor_main.js` を ES module として追加しました。既存の `editor.js` も後方互換性のため残しています。

## 循環依存の回避

モジュール間の循環依存を避けるため、以下の方針を採用しています：

1. **core → utils → actions/project/ui** の順序で依存
2. UI更新関数はグローバル関数経由で呼び出し（段階的にモジュール化）
3. 後方互換性のため `window` オブジェクトにも公開

## 次のステップ

1. **巨大関数の移動**
   - `showQuestionEditor()` (約300行)
   - `showDiagnosticQuestionEditor()` (約200行)
   - `showResultEditor()` (約100行)
   - `showPreview()` (約200行)

2. **editor.js の薄化**
   - 上記関数を移動後、`editor.js` を完全に薄化

3. **循環依存の検出**
   - `dependency_analyzer.js` を実行して循環依存を検出
   - 検出された循環依存を除去

4. **window namespace の削除**
   - 段階的に `window` への公開を削除
   - ES module の import/export に完全移行

5. **動作検証**
   - すべてのボタンが正常に動作することを確認
   - プロジェクト読み込み・保存・エクスポートの動作確認

## 注意事項

- 現在、モジュール化された関数は `window` オブジェクトにも公開されており、既存コードとの互換性を保っています
- 段階的に `window` への公開を削除していく予定です
- `editor.js` は後方互換性のため残していますが、将来的に削除予定です

