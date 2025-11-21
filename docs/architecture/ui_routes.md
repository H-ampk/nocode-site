# UI遷移図

## 概要

このドキュメントは、プロジェクト内のすべてのHTMLページ間の遷移関係を可視化したものです。

## 1. メインナビゲーション

### 1.1 エントリーポイント

```mermaid
graph TD
    A[main.html] --> B[src/player/index.html]
    A --> C[admin/admin.html]
    A --> D[projects/]
```

### 1.2 Admin ダッシュボードからの遷移

```mermaid
stateDiagram-v2
    [*] --> admin.html
    
    admin.html --> editor.html: クイズ編集
    admin.html --> glossary.html: 用語集管理
    admin.html --> project_manager.html: 公開設定
    admin.html --> bookshelf.html: プロジェクト本棚
    admin.html --> analysis.html: 学習データ分析
    admin.html --> main.html: ホームに戻る
    
    editor.html --> admin.html: 戻る
    glossary.html --> admin.html: 戻る
    project_manager.html --> admin.html: 戻る
    bookshelf.html --> admin.html: 戻る
    analysis.html --> admin.html: 戻る
```

## 2. Editor の遷移

### 2.1 Editor の遷移フロー

```mermaid
stateDiagram-v2
    [*] --> editor.html
    
    editor.html --> editor.html: プロジェクト本棚から読み込み
    editor.html --> editor.html: ファイル読み込み
    editor.html --> editor.html: 新規プロジェクト作成
    
    note right of editor.html
        - プロジェクト本棚モーダル表示
        - localStorage.projects から読み込み
        - projects/{projectId}/quiz.json から読み込み
    end note
```

### 2.2 Editor の内部遷移

```mermaid
graph TD
    A[editor.html: 起動] --> B{URLパラメータ確認}
    B -->|projectId あり| C[loadProjectFromId]
    B -->|mode=edit あり| D[loadProjectFromLocalStorage]
    B -->|なし| E[新規プロジェクト]
    
    C --> F[projects/{projectId}/project.json]
    C --> G[projects/{projectId}/quiz.json]
    C --> H[projects/{projectId}/editor.json]
    
    D --> I[localStorage.editor_current_project]
    
    F --> J[エディタUI表示]
    G --> J
    H --> J
    I --> J
    E --> J
    
    J --> K[ユーザー: 編集]
    K --> L[オートセーブ: 3秒ごと]
    L --> M[localStorage.autosave_project]
    
    K --> N[ユーザー: 保存]
    N --> O[saveProjectAs]
    O --> P[quiz.json ダウンロード]
    O --> Q[localStorage.projects 更新]
```

## 3. Player の遷移

### 3.1 Player の遷移フロー

```mermaid
stateDiagram-v2
    [*] --> index.html
    
    index.html --> demo.html: デモを開始
    index.html --> demo.html: プロジェクト選択
    
    demo.html --> demo.html: クイズ実行
    demo.html --> demo.html: 結果表示
    
    note right of index.html
        - プロジェクト一覧表示
        - localStorage.projects から読み込み
        - JSONインポート機能
    end note
    
    note right of demo.html
        - window.currentProjectData から読み込み
        - QuizPlayer.loadQuiz() でクイズ実行
        - QuizLogging でログ記録
    end note
```

### 3.2 Player の内部遷移

```mermaid
graph TD
    A[index.html: 起動] --> B[loadProjectList]
    B --> C[localStorage.projects 読み込み]
    C --> D[プロジェクト一覧表示]
    
    D --> E[ユーザー: プロジェクト選択]
    E --> F[window.currentProjectData 設定]
    F --> G[demo.html に遷移]
    
    D --> H[ユーザー: JSONインポート]
    H --> I[ファイル読み込み]
    I --> J[localStorage.projects 更新]
    J --> D
    
    G --> K[demo.html: 起動]
    K --> L{window.currentProjectData 確認}
    L -->|あり| M[window.currentProjectData 使用]
    L -->|なし| N[デモ用クイズデータ使用]
    
    M --> O[QuizPlayer.loadProject]
    N --> O
    
    O --> P[ProjectConfig.load]
    P --> Q[project.json 読み込み]
    
    O --> R[GlossaryLoader.loadGlossaryByPolicy]
    R --> S[Glossary読み込み]
    
    O --> T[QuizPlayer.loadQuiz]
    T --> U[quiz.json 読み込み]
    
    Q --> V[クイズ実行]
    S --> V
    U --> V
    
    V --> W[問題表示]
    W --> X[ユーザー: 回答]
    X --> Y[QuizLogging: ログ記録]
    Y --> Z[次の問題]
    Z --> W
    
    W --> AA[全問回答完了]
    AA --> AB[結果表示]
    AB --> AC[ログ保存]
    AC --> AD[students/*_logs.json]
```

## 4. Analysis の遷移

### 4.1 Analysis の遷移フロー

```mermaid
stateDiagram-v2
    [*] --> analysis.html
    
    analysis.html --> analysis.html: データセット選択
    analysis.html --> analysis.html: セッション選択
    analysis.html --> analysis.html: 分析実行
    
    note right of analysis.html
        - DatasetLoader.listDatasets() でデータセット一覧取得
        - DatasetLoader.loadDataset() でログデータ読み込み
        - AnalysisDashboard.analyze() で分析実行
    end note
```

### 4.2 Analysis の内部遷移

```mermaid
graph TD
    A[analysis.html: 起動] --> B[DatasetLoader.listDatasets]
    B --> C[students/index.json 読み込み]
    C --> D[データセット一覧表示]
    
    D --> E[ユーザー: データセット選択]
    E --> F[DatasetLoader.loadDataset]
    F --> G[students/*_logs.json 読み込み]
    
    G --> H[ログデータ標準化]
    H --> I[セッション選択UI表示]
    
    I --> J[ユーザー: セッション選択]
    J --> K[AnalysisDashboard.analyze]
    
    I --> L[ユーザー: 全セッション合算]
    L --> M[AnalysisDashboard.mergeAllSessions]
    M --> K
    
    K --> N[projects/{projectId}/quiz.json 読み込み]
    N --> O[問題構造参照]
    
    K --> P[分析実行]
    O --> P
    
    P --> Q[全体統計]
    P --> R[問題別分析]
    P --> S[反応時間プロファイル]
    P --> T[パス分析]
    P --> U[Glossary提示履歴]
    P --> V[クラスタリング散布図]
    
    Q --> W[可視化]
    R --> W
    S --> W
    T --> W
    U --> W
    V --> W
```

## 5. Glossary の遷移

### 5.1 Glossary の遷移フロー

```mermaid
stateDiagram-v2
    [*] --> glossary.html
    
    glossary.html --> glossary.html: 用語追加
    glossary.html --> glossary.html: 用語編集
    glossary.html --> glossary.html: 用語削除
    glossary.html --> glossary.html: 保存
    
    note right of glossary.html
        - ProjectConfig.load() でプロジェクト設定読み込み
        - GlossaryLoader.loadProjectGlossary() で用語読み込み
        - GlossaryLoader.loadGlobalGlossary() でグローバル用語読み込み
        - GlossaryLoader.loadDomainGlossary() でドメイン用語読み込み
    end note
```

## 6. Bookshelf の遷移

### 6.1 Bookshelf の遷移フロー

```mermaid
stateDiagram-v2
    [*] --> bookshelf.html
    
    bookshelf.html --> editor.html: プロジェクト編集
    bookshelf.html --> project_manager.html: プロジェクト設定
    
    note right of bookshelf.html
        - projects/{projectId}/project.json から読み込み
        - projects/{projectId}/quiz.json から読み込み
        - タグフィルタ機能
        - 検索機能
    end note
    
    note right of editor.html
        - localStorage.editor_current_project に保存
        - editor.html?projectId={projectId} に遷移
    end note
```

### 6.2 Bookshelf の内部遷移

```mermaid
graph TD
    A[bookshelf.html: 起動] --> B[loadProjects]
    B --> C[プロジェクトフォルダ一覧]
    C --> D[projects/{projectId}/project.json 読み込み]
    C --> E[projects/{projectId}/quiz.json 読み込み]
    
    D --> F[プロジェクトメタデータ取得]
    E --> G[質問数取得]
    
    F --> H[プロジェクトカード表示]
    G --> H
    
    H --> I[ユーザー: タグフィルタ]
    I --> J[フィルタリング]
    J --> H
    
    H --> K[ユーザー: 検索]
    K --> L[検索フィルタリング]
    L --> H
    
    H --> M[ユーザー: プロジェクト選択]
    M --> N[loadProjectIntoEditor]
    N --> O[localStorage.editor_current_project 保存]
    O --> P[editor.html?projectId={projectId} に遷移]
    
    H --> Q[ユーザー: 設定ボタン]
    Q --> R[project_manager.html?projectId={projectId} に遷移]
```

## 7. 全体UI遷移図

### 7.1 完全なUI遷移図

```mermaid
stateDiagram-v2
    [*] --> main.html
    
    main.html --> player_index: クイズを実行する
    main.html --> admin: 管理ダッシュボード
    main.html --> projects: プロジェクト一覧
    
    player_index --> player_demo: デモを開始
    player_index --> player_demo: プロジェクト選択
    
    player_demo --> player_demo: クイズ実行
    
    admin --> editor: クイズ編集
    admin --> glossary: 用語集管理
    admin --> project_manager: 公開設定
    admin --> bookshelf: プロジェクト本棚
    admin --> analysis: 学習データ分析
    admin --> main: ホームに戻る
    
    bookshelf --> editor: プロジェクト編集
    bookshelf --> project_manager: プロジェクト設定
    
    editor --> admin: 戻る
    glossary --> admin: 戻る
    project_manager --> admin: 戻る
    bookshelf --> admin: 戻る
    analysis --> admin: 戻る
```

## 8. URLパラメータによる遷移

### 8.1 URLパラメータの使用

| ページ | パラメータ | 用途 |
|--------|-----------|------|
| `editor.html` | `projectId` | プロジェクトIDを指定して読み込み |
| `editor.html` | `mode=edit` | 編集モードで起動 |
| `project_manager.html` | `projectId` | プロジェクトIDを指定して設定表示 |
| `demo.html` | なし | `window.currentProjectData` から読み込み |

### 8.2 URLパラメータによる遷移フロー

```mermaid
graph TD
    A[bookshelf.html] -->|projectId={id}| B[editor.html?projectId={id}]
    B --> C[loadProjectFromId]
    C --> D[projects/{id}/project.json]
    C --> E[projects/{id}/quiz.json]
    C --> F[projects/{id}/editor.json]
    
    G[admin.html] -->|projectId={id}| H[project_manager.html?projectId={id}]
    H --> I[プロジェクト設定表示]
    
    J[index.html] -->|なし| K[demo.html]
    K --> L{window.currentProjectData 確認}
    L -->|あり| M[window.currentProjectData 使用]
    L -->|なし| N[デモ用クイズデータ使用]
```

## 9. 認証フロー

### 9.1 Admin認証フロー

```mermaid
stateDiagram-v2
    [*] --> admin.html
    
    admin.html --> pin_check: AdminAuth.init
    pin_check --> authenticated: PIN認証成功
    pin_check --> login.html: PIN認証失敗
    
    login.html --> pin_check: PIN再入力
    authenticated --> editor: クイズ編集
    authenticated --> glossary: 用語集管理
    authenticated --> analysis: 学習データ分析
    
    note right of pin_check
        - src/admin/pin.js でPIN認証
        - localStorage に認証状態保存
    end note
```

## 10. データ読み込みフロー

### 10.1 各ページのデータ読み込み順序

```mermaid
graph TD
    A[ページ起動] --> B{ページタイプ}
    
    B -->|Editor| C[ProjectConfig.load]
    B -->|Player| C
    B -->|Glossary| C
    B -->|Analysis| D[DatasetLoader.listDatasets]
    
    C --> E[project.json 読み込み]
    E --> F[GlossaryLoader.loadGlossaryByPolicy]
    F --> G[Glossary読み込み]
    
    C -->|Editor| H[quiz.json 読み込み]
    C -->|Player| H
    
    D --> I[index.json 読み込み]
    I --> J[データセット一覧表示]
    
    H --> K[UI表示]
    G --> K
    J --> K
```

## 11. エラーハンドリングとフォールバック

### 11.1 エラー時の遷移

```mermaid
stateDiagram-v2
    [*] --> 正常読み込み
    
    正常読み込み --> エラー発生: ファイル読み込み失敗
    エラー発生 --> フォールバック: エラーハンドリング
    
    フォールバック --> デフォルト値: デフォルト値使用
    フォールバック --> エラーメッセージ: エラーメッセージ表示
    フォールバック --> 前のページ: 前のページに戻る
    
    デフォルト値 --> UI表示
    エラーメッセージ --> UI表示
    前のページ --> [*]
```

## 12. UI遷移の改善案

### 12.1 推奨される改善

1. **ルーティングシステムの導入**
   - 現在はHTMLファイル間の直接リンク
   - SPA（Single Page Application）化を検討
   - ルーティングライブラリ（例: Vue Router, React Router）の導入

2. **ナビゲーションコンポーネントの統一**
   - 各ページに共通のナビゲーションバーを追加
   - パンくずリストの実装

3. **遷移アニメーションの追加**
   - ページ遷移時のトランジション効果
   - ローディングインジケーター

4. **深いリンクのサポート**
   - URLパラメータによる状態復元の強化
   - ブラウザの戻る/進むボタンとの連携

