import { callOllama } from "./ai.js";

export async function generateConceptGraph(glossary) {
  const prompt = `
以下のGlossaryから"概念依存関係"を抽出してください。
Glossary:
${JSON.stringify(glossary)}

出力形式は strict JSON:
{
  "nodes": [
    {"id": "概念名1"},
    {"id": "概念名2"}
  ],
  "edges": [
    {"from": "前提語", "to": "派生語"}
  ]
}`;

  const jsonText = await callOllama("phi3:3.8b", prompt);
  return JSON.parse(jsonText);
}

/**
 * Concept Graphを読み込む
 * @param {string} projectId - プロジェクトID
 * @returns {Promise<Object>} Concept Graphオブジェクト
 */
export async function loadConceptGraph(projectId) {
  const path = `../../projects/${projectId}/concept_graph.json`;
  
  try {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) {
      return { nodes: [], edges: [] };
    }
    return await response.json();
  } catch (error) {
    console.warn('Concept graph load failed:', error);
    return { nodes: [], edges: [] };
  }
}

/**
 * Concept Graphを保存する（ダウンロード方式）
 * @param {string} projectId - プロジェクトID
 * @param {Object} graph - Concept Graphオブジェクト
 */
export async function saveConceptGraph(projectId, graph) {
  const dataStr = JSON.stringify(graph, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'concept_graph.json';
  link.click();
  URL.revokeObjectURL(url);
  
  console.log(`Concept Graph saved: projects/${projectId}/concept_graph.json`);
  return Promise.resolve();
}

/**
 * GlossaryからConcept Graphを更新する
 * @param {Object} graph - 既存のConcept Graph
 * @param {Object} glossary - Glossaryオブジェクト
 * @returns {Promise<Object>} 更新されたConcept Graph
 */
export async function updateGraphFromGlossary(graph, glossary) {
  const prompt = `
既存の概念ネットワークを以下に示す。
${JSON.stringify(graph)}

Glossary:
${JSON.stringify(glossary)}

Glossaryの内容から新しい依存関係・概念がある場合は"追加のみ"行い、
削除は行わない。

出力は strict JSON で:
{
  "nodes": [...],
  "edges": [...]
}
`;

  const jsonText = await callOllama("phi3:3.8b", prompt);
  return JSON.parse(jsonText);
}

