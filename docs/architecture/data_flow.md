# データフロー図

## 概要

このドキュメントは、プロジェクト内のデータがどのように流れ、各コンポーネント間でどのように共有されるかを可視化したものです。

## 1. プロジェクトデータの流れ

### 1.1 プロジェクト設定（project.json）の流れ

```mermaid
graph TD
    A[projects/project.json] --> B[ProjectConfig.load]
    B --> C[Editor]
    B --> D[Player]
    B --> E[Admin]
    B --> F[Glossary]
    
    C --> G[localStorage.projectId]
    D --> G
    E --> G
    F --> G
    
    G --> B
```

### 1.2 クイズデータ（quiz.json）の流れ

```mermaid
graph TD
    A[projects/quiz.json] --> B[Editor: 読み込み]
    A --> C[Player: 読み込み]
    A --> D[Bookshelf: 一覧表示]
    A --> E[Analysis: 問題構造参照]
    
    B --> F[Editor: 編集]
    F --> G[Editor: 保存]
    G --> A
    
    C --> H[Player: クイズ実行]
    H --> I[Player: ログ記録]
    I --> J[students/*_logs.json]
    
    E --> K[Analysis: 分析]
    K --> L[Analysis: 可視化]
```

### 1.3 Glossaryデータの流れ

```mermaid
graph TD
    A[projects/glossary.json] --> B[GlossaryLoader.loadProjectGlossary]
    C[src/glossary/global.json] --> D[GlossaryLoader.loadGlobalGlossary]
    E[src/glossary/domains/*.json] --> F[GlossaryLoader.loadDomainGlossary]
    
    B --> G[GlossaryLoader.mergeGlossaries]
    D --> G
    F --> G
    
    G --> H[Editor: 診断質問の評価軸]
    G --> I[Player: Glossary自動提示]
    G --> J[Glossary: 管理UI]
    G --> K[Analysis: 用語参照]
    
    H --> L[localStorage.currentGlossary]
    I --> L
    J --> L
```

## 2. 学習データの流れ

### 2.1 学習ログの生成と保存

```mermaid
graph TD
    A[Player: クイズ実行] --> B[QuizLogging: ログ記録]
    B --> C[localStorage: 一時保存]
    C --> D[Player: セッション終了]
    D --> E[students/*_logs.json: 保存]
    
    E --> F[DatasetLoader: 読み込み]
    F --> G[Analysis: 分析]
    G --> H[Analysis: 可視化]
```

### 2.2 データセット一覧の流れ

```mermaid
graph TD
    A[students/index.json] --> B[DatasetLoader.listDatasets]
    B --> C[Analysis: データセット選択UI]
    C --> D[ユーザー: データセット選択]
    D --> E[DatasetLoader.loadDataset]
    E --> F[students/*_logs.json: 読み込み]
    F --> G[Analysis: 分析実行]
```

## 3. Editor / Player / Admin / Analysis の四大コンポーネント間の流れ

### 3.1 全体データフロー

```mermaid
graph TB
    subgraph "プロジェクトデータ"
        A[projects/project.json]
        B[projects/quiz.json]
        C[projects/glossary.json]
    end
    
    subgraph "Editor"
        D[editor.html]
        E[editor.js]
        F[localStorage: projects]
        G[localStorage: editor_current_project]
    end
    
    subgraph "Player"
        H[player/index.html]
        I[player.js]
        J[QuizLogging]
    end
    
    subgraph "Admin"
        K[admin.html]
        L[bookshelf.html]
    end
    
    subgraph "Analysis"
        M[analysis.html]
        N[analysis.js]
        O[dataset_loader.js]
    end
    
    subgraph "学習データ"
        P[students/index.json]
        Q[students/*_logs.json]
    end
    
    A --> E
    A --> I
    A --> K
    
    B --> E
    B --> I
    B --> N
    
    C --> E
    C --> I
    
    E --> F
    E --> G
    F --> I
    G --> E
    
    I --> J
    J --> Q
    
    L --> G
    L --> B
    
    P --> O
    Q --> O
    O --> N
    B --> N
```

### 3.2 プロジェクト作成・編集フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant E as Editor
    participant L as localStorage
    participant P as projects/
    
    U->>E: プロジェクト作成
    E->>E: 新規プロジェクトデータ生成
    E->>L: projects に保存
    U->>E: 編集
    E->>E: gameData 更新
    E->>L: autosave_project に保存（3秒ごと）
    U->>E: 保存
    E->>P: quiz.json に保存
    E->>L: projects に更新
```

### 3.3 クイズ実行フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant P as Player
    participant C as ProjectConfig
    participant G as GlossaryLoader
    participant L as QuizLogging
    participant S as students/
    
    U->>P: クイズ開始
    P->>C: project.json 読み込み
    C-->>P: プロジェクト設定
    P->>G: Glossary読み込み
    G-->>P: Glossaryデータ
    P->>P: quiz.json 読み込み
    P->>P: 問題表示
    U->>P: 回答
    P->>L: ログ記録
    L->>L: localStorage に保存
    P->>P: 次の問題
    U->>P: 全問回答完了
    P->>L: セッションログ完成
    L->>S: students/*_logs.json に保存
```

### 3.4 分析フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant A as Analysis
    participant D as DatasetLoader
    participant I as students/index.json
    participant L as students/*_logs.json
    participant Q as projects/quiz.json
    
    U->>A: データセット選択
    A->>D: listDatasets()
    D->>I: index.json 読み込み
    I-->>D: データセット一覧
    D-->>A: データセット一覧
    A->>A: UI表示
    U->>A: データセット選択
    A->>D: loadDataset()
    D->>L: *_logs.json 読み込み
    L-->>D: ログデータ
    D-->>A: 標準化されたログデータ
    A->>Q: quiz.json 読み込み（問題構造参照）
    Q-->>A: 問題データ
    A->>A: 分析実行
    A->>A: 可視化
```

## 4. localStorage のデータフロー

### 4.1 Editor の localStorage フロー

```mermaid
graph TD
    A[Editor: 起動] --> B[localStorage.projects 読み込み]
    B --> C[プロジェクト一覧表示]
    C --> D[ユーザー: プロジェクト選択]
    D --> E[localStorage.editor_current_project 保存]
    E --> F[Editor: プロジェクト読み込み]
    
    G[Editor: 編集] --> H[localStorage.autosave_project 保存]
    H --> I[3秒ごとに自動保存]
    
    J[Editor: 保存] --> K[localStorage.projects 更新]
    K --> L[quiz.json ダウンロード]
    
    M[Glossary読み込み] --> N[localStorage.currentGlossary 保存]
    N --> O[Editor: 評価軸UI更新]
```

### 4.2 Player の localStorage フロー

```mermaid
graph TD
    A[Player: 起動] --> B[localStorage.projectId 読み込み]
    B --> C[ProjectConfig.load]
    C --> D[project.json 読み込み]
    
    E[Player: プロジェクト一覧] --> F[localStorage.projects 読み込み]
    F --> G[プロジェクト一覧表示]
    G --> H[ユーザー: プロジェクト選択]
    H --> I[window.currentProjectData 設定]
    I --> J[demo.html に遷移]
```

## 5. データ保存の関係

### 5.1 保存データの関係図

```mermaid
graph TD
    A[projects/project.json] --> B[プロジェクトメタデータ]
    C[projects/quiz.json] --> D[クイズデータ]
    E[projects/glossary.json] --> F[Glossary用語]
    G[projects/editor.json] --> H[エディタ設定]
    
    I[students/index.json] --> J[データセット一覧]
    K[students/*_logs.json] --> L[学習ログ]
    
    B --> M[Editor: 読み込み]
    B --> N[Player: 読み込み]
    B --> O[Admin: 表示]
    
    D --> M
    D --> N
    D --> P[Analysis: 参照]
    
    F --> M
    F --> N
    F --> Q[Glossary: 管理]
    
    H --> M
    
    J --> R[Analysis: データセット選択]
    L --> S[Analysis: 分析]
    
    M --> T[localStorage: 一時保存]
    N --> T
    T --> U[ブラウザ再起動後も復元可能]
```

## 6. データ整合性の保証

### 6.1 データ整合性チェックポイント

1. **プロジェクトIDの一貫性**
   - `localStorage.projectId` ↔ `projects/{projectId}/project.json`
   - チェック: `ProjectConfig.load()` で整合性確認

2. **Glossaryの統合**
   - `projects/{projectId}/glossary.json` + `src/glossary/global.json` + `src/glossary/domains/*.json`
   - チェック: `GlossaryLoader.mergeGlossaries()` で重複排除

3. **クイズデータの整合性**
   - `quiz.json` の `startNode` ↔ `questions[].id`
   - チェック: `normalizeGameData()` で正規化

4. **学習ログの整合性**
   - `students/*_logs.json` の `session_id` の一意性
   - チェック: `DatasetLoader.loadDataset()` で標準化

### 6.2 データ不整合のリスク

1. **localStorage とファイルシステムの不整合**
   - リスク: `localStorage.projects` に存在するが、実際のファイルが削除されている
   - 対策: ファイル存在確認を追加

2. **Glossary用語IDの重複**
   - リスク: 複数のGlossaryで同じIDの用語が定義されている
   - 対策: `GlossaryLoader.mergeGlossaries()` で後勝ち（Project > Domain > Global）

3. **クイズバージョンの不整合**
   - リスク: `quiz.json` と `quiz_versions/latest.json` の不一致
   - 対策: バージョン管理システムで整合性保証

## 7. データフローの改善案

### 7.1 推奨される改善

1. **データバリデーション層の追加**
   - 各データ読み込み時にスキーマ検証を実施
   - JSON Schema を使用した検証

2. **キャッシュ戦略の最適化**
   - `localStorage` とファイルシステムの同期を改善
   - キャッシュ無効化の仕組みを追加

3. **エラーハンドリングの強化**
   - データ読み込み失敗時のフォールバック処理
   - ユーザーへのエラーメッセージ表示

4. **データバックアップ機能**
   - 自動バックアップの実装
   - 復元機能の追加

