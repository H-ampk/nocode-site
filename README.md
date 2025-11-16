# No-code Quiz Builder

このプロジェクトのエントリーポイントは `main.html` です。

- トップ: `main.html`
- エディタ/用語集など管理系: `admin/admin.html`（PIN等の保護対象、admin配下はすべてPINロジック読込）
- エディタ（編集画面専用）: `admin/editor.html`（`src/editor/editor.html` へリダイレクト）
- 用語集（準備中）: `admin/glossary.html`
- プレイヤー（実行画面）: `player.html`（`src/player/index.html` へリダイレクト、常に誰でもアクセス可）
- プロジェクトデータ: `projects/{project_id}/` に JSON を配置

開発用の簡易サーバは以下で起動できます（必要に応じて）。

```
npm run dev
```

## 公開方式（access_mode）
各プロジェクトは `projects/{id}/project.json` で公開方式を指定します（初期値は必ず public、pin_code は null）。
標準の配置は以下です。

```
projects/default/
  project.json
  quiz.json
  glossary.json
  concept_graph.json
```

```json
{
  "project_id": "sample_project",
  "access_mode": "public | pin | login",
  "pin_code": "1234"
}
```

- public: 一般公開。管理画面も認証無し（開発時の簡便用）
- pin: 管理画面（admin/*）アクセス時のみ4桁PINを要求（localStorageで記憶）
- login: 将来実装。現状は未対応（adminアクセス不可）

管理画面は `src/auth/pin.js` を通して `project.json` を参照し、必要に応じてPIN認証を行います。

## 使い方
- main.html → 「クイズを実行する」または「管理ダッシュボード」へ遷移
- 管理ダッシュボード（admin.html） → Editor / Glossary / 公開設定を操作
- 公開設定（project_manager.html / main.html下部UI）で公開方式を選び、必要ならPINを入力。`project.json` をダウンロードして所定の場所に置き換え
  - public を選べば `access_mode: "public"`, `pin_code: null`
  - pin を選べば `access_mode: "pin"`, `pin_code: "1234"`（入力値）
  - login は将来機能（選択可・挙動は未実装）

## projectId の決定ロジック（将来拡張）
- 取得: `localStorage.getItem("projectId") || "default"`
- 参照例（main.html）:
  ```js
  function getCurrentProjectId() { return localStorage.getItem("projectId") || "default"; }
  fetch(`./projects/${getCurrentProjectId()}/project.json`)
  ```

## ディレクトリ構成とルール
- ルート直下のHTMLは `main.html` のみ。その他のHTMLは役割別ディレクトリに配置します。
  - 管理者向け画面: `admin/`（`admin.html`, `editor.html`, `glossary.html`, `project_manager.html` 等）
  - 一般利用画面: `player/index.html`
  - JSロジック本体: `src/`（`src/editor/*`, `src/player/*`, `src/glossary/*`, `src/core/*`, `src/auth/*`, `src/utils/*`, `src/router/*`）
  - 静的ファイル: `public/`（CSSは `public/css/`、画像は `public/img/` に配置）
  - プロジェクトデータ: `projects/{project_id}/`
- 旧配置の無分類ファイルは `archive/` に退避します（理由を `archive/README.md` に記載）。

## 共通ユーティリティ
- `src/core/config.js` に `window.ProjectConfig` を提供（load/download/normalize）。main/admin双方で利用し、project.json の読込・保存処理を共通化。
 - `src/auth/pin.js` に PIN認証ロジック（`window.AdminAuth.init({admin:true})`）。admin配下のHTMLから読み込んで使用します。

## 将来のログイン機能
- ルートに `login.html` と `auth.js` を用意（現在は未使用）。将来的に本格的な認証に拡張可能な構成です。


