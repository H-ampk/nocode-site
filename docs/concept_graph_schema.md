# concept_graph.json schema

## 概要

`concept_graph.json` は、Glossaryから抽出した概念間の依存関係を表現するネットワークモデルです。D3.jsやCytoscapeなどの可視化ライブラリと互換性のある形式です。

## スキーマ

```json
{
  "nodes": [
    { "id": "条件付き確率" },
    { "id": "ベイズ推定" }
  ],
  "edges": [
    { "from": "条件付き確率", "to": "ベイズ推定" }
  ]
}
```

## フィールド説明

### nodes (配列)
- **型**: `Array<{ id: string }>`
- **説明**: 概念のリスト
- **id**: 概念名（Glossaryの用語名に対応）

### edges (配列)
- **型**: `Array<{ from: string, to: string }>`
- **説明**: 概念間の依存関係
- **from**: 前提概念（依存元）
- **to**: 派生概念（依存先）

## 例

```json
{
  "nodes": [
    { "id": "条件付き確率" },
    { "id": "ベイズ推定" },
    { "id": "確率" }
  ],
  "edges": [
    { "from": "確率", "to": "条件付き確率" },
    { "from": "条件付き確率", "to": "ベイズ推定" }
  ]
}
```

この例では：
- 「確率」→「条件付き確率」→「ベイズ推定」という依存関係が表現されています
- 「ベイズ推定」を理解するには「条件付き確率」が必要
- 「条件付き確率」を理解するには「確率」が必要

## D3.js / Cytoscape 互換性

この形式は以下の可視化ライブラリと互換です：

- **D3.js**: `nodes` と `edges` をそのまま使用可能
- **Cytoscape.js**: `elements.nodes` と `elements.edges` に変換可能
- **vis.js**: `nodes` と `edges` をそのまま使用可能

## 生成方法

`src/core/concept_graph.js` の `generateConceptGraph()` 関数を使用して、Glossaryから自動生成できます。

