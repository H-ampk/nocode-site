/**
 * AI診断機能 - 理解構造の診断
 */

import { callOllama } from "../core/ai.js";

/**
 * 理解構造を診断する
 * @param {Array} logs - クイズログの配列
 * @param {Object} graph - Concept Graph
 * @returns {Promise<Object>} 診断結果
 */
export async function diagnoseUnderstanding(logs, graph) {
  const prompt = `
以下のクイズログとConcept Graphから、学習者の理解構造を診断してください。

ログ:
${JSON.stringify(logs, null, 2)}

Concept Graph:
${JSON.stringify(graph, null, 2)}

出力形式は strict JSON:
{
  "understood": ["理解している概念1", "理解している概念2"],
  "misunderstood": ["つまずき1", "つまずき2"],
  "misconceptions": ["誤概念1", "誤概念2"],
  "depth": 3,
  "next": "次の推奨ステップ"
}`;

  const jsonText = await callOllama("phi3:3.8b", prompt);
  return JSON.parse(jsonText);
}

