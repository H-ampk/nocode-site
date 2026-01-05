共通ロジックや基盤コード（永続化、イベント、状態、ルータなど）を配置します。

## 関数一覧

- callOllama(): ローカルLLMを呼び出す共通関数
  - import例: `import { callOllama } from '../core/ai.js'`

- computeStats(): ログデータから統計情報を計算
  - import例: `import { computeStats } from '../core/stats_core.js'`
  - 正答率、反応時間、誤概念ランキングなどを計算

- generateInsights(): 統計データから洞察を生成
  - import例: `import { generateInsights } from '../core/insights_core.js'`
  - 研究用の解釈ロジックを含む詳細分析レポートを生成

- compareWithClass(): 個人とクラス平均を比較
  - import例: `import { compareWithClass } from '../core/class_compare.js'`
  - 学習者の統計データをクラス全体の平均と比較し、相対的な位置づけを分析

