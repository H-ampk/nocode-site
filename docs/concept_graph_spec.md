## concept_graph.json 仕様（ドラフト）

```json
{
  "nodes": [
    { "id": "concept.analysis", "label": "分析力", "prerequisites": [] },
    { "id": "concept.logic_tree", "label": "論理ツリー", "prerequisites": ["concept.analysis"] }
  ],
  "edges": [
    { "from": "concept.analysis", "to": "concept.logic_tree", "weight": 0.8 }
  ],
  "consistency_rules": [
    { "id": "rule_01", "description": "論理ツリーの得点が高い場合、分析力も一定以上であるべき" }
  ]
}
```



