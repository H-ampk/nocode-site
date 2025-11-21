# Editor モジュール化 - 進捗サマリー

## 完了した作業

### 1. モジュール構造の作成 ✅
- `src/editor/modules/` フォルダ構造を作成
- 各カテゴリ別にモジュールファイルを作成

### 2. 基本モジュールの実装 ✅
- `core/state.js` - グローバル状態管理
- `utils/data.js` - データユーティリティ
- `actions/nodes.js` - ノード操作
- `project/save.js` - プロジェクト保存・読み込み
- `project/export.js` - エクスポート機能
- `ui/editor.js` - エディタUI管理
- `ui/shelf.js` - プロジェクト本棚UI
- `ui/events.js` - イベントリスナー一元管理
- `editor_main.js` - メインモジュール（薄いルートファイル）

## 残りの作業

### 1. 巨大関数の移動（優先度：高）
以下の関数を適切なモジュールに移動する必要があります：

#### UI関連（`modules/ui/`）
- `showQuestionEditor()` (約320行) → `question-editor.js`
- `showDiagnosticQuestionEditor()` (約80行) → `diagnostic-editor.js`
- `showResultEditor()` (約40行) → `result-editor.js`
- `showPreview()` (約170行) → `preview.js`
- `updateChoicesList()` → `question-editor.js`
- `updateQuestionStyle()` → `question-editor.js`
- `updateQuestionProperty()`, `toggleGrading()`, `updateChoiceCorrect()` → `question-editor.js`
- `addChoice()`, `updateChoice()`, `removeChoice()`, `updateChoiceNext()` → `question-editor.js`
- `getNextNodeOptions()` → `question-editor.js`
- `updateResultProperty()` → `result-editor.js`
- `updateDiagnosticQuestionProperty()`, `updateDiagnosticScale()` → `diagnostic-editor.js`
- `addDiagnosticChoice()`, `updateDiagnosticChoice()`, `removeDiagnosticChoice()` → `diagnostic-editor.js`
- `renderDiagnosticChoicesList()`, `renderDiagnosticNextList()` → `diagnostic-editor.js`
- `addDiagnosticNext()`, `updateDiagnosticNextKey()`, `updateDiagnosticNextValue()`, `removeDiagnosticNext()` → `diagnostic-editor.js`

#### Glossary関連（`modules/glossary/`）
- `renderVectorSettingsForQuestion()` → `glossary/vector-settings.js`
- `renderVectorAxisUI()`, `updateVectorAxisScore()`, `updateVectorJson()`, `collectVectorScores()` → `glossary/vector-settings.js`
- `loadGlossaryTemplateForQuestion()`, `refreshVectorAxis()` → `glossary/template-loader.js`
- `renderDiagnosticScoringList()`, `addDiagnosticScoring()`, `updateDiagnosticScoring()`, `removeDiagnosticScoring()`, `updateScoringJson()` → `glossary/scoring.js`
- `renderAxisUI()`, `updateAxisScore()` → `glossary/scoring.js`
- `loadGlossaryForScoring()` → `glossary/loader.js`

#### プロジェクト関連（`modules/project/`）
- `saveQuiz()`, `buildQuizDataFromEditor()` → `project/version.js`

#### ユーティリティ（`modules/utils/`）
- `initTagEditor()`, `loadAllTags()` → `utils/tags.js`
- `startAutosave()`, `stopAutosave()` → `utils/autosave.js`
- `createTemplateButtons()`, `loadTemplate()`, `cloneTemplateData()`, `calculateNextNodeIdCounterFromData()` → `utils/templates.js`
- `saveCustomImage()`, `getCustomImages()`, `getCustomImageOptions()`, `getCustomImageUrl()`, `handleImageFiles()`, `handleImageDrop()`, `updateBackgroundImageSelect()`, `updateBackgroundImagePreview()` → `utils/images.js`

### 2. editor.js の薄化
- 上記関数を移動後、`editor.js` を後方互換性のためのラッパーに変更
- すべての関数を `window` に公開して既存コードとの互換性を保つ

### 3. 循環依存の検出と除去
- `dependency_analyzer.js` を実行して循環依存を検出
- 検出された循環依存を除去

### 4. window namespace の段階的削除
- ES module の import/export に完全移行
- 段階的に `window` への公開を削除

### 5. 動作検証
- すべてのボタンが正常に動作することを確認
- プロジェクト読み込み・保存・エクスポートの動作確認

## 注意事項

- `editor.js` は後方互換性のため、すべての関数を `window` に公開する形で残します
- 段階的に `window` への公開を削除していく予定です
- モジュール化された関数は ES module の import/export を使用します

