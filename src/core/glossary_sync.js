/**
 * Glossary同期機能（ES6モジュール）
 * 
 * GlossaryLoader.jsはIIFEパターンのため、ES6モジュールとして使用できる関数を提供
 */

import { callOllama } from "./ai.js";

/**
 * Concept GraphからGlossaryを更新する
 * @param {Object} graph - Concept Graphオブジェクト
 * @param {Object} glossary - 既存のGlossaryオブジェクト
 * @returns {Promise<Object>} 更新されたGlossary
 */
export async function updateGlossaryFromGraph(graph, glossary) {
  const prompt = `
Glossary:
${JSON.stringify(glossary)}

ConceptGraph:
${JSON.stringify(graph)}

グラフに存在するがGlossaryに説明がない概念について、
"簡潔な定義を自動生成して追加"せよ。

strict JSON で:
{
  "updatedGlossary": {
    "terms": [...]
  }
}
`;

  const jsonText = await callOllama("phi3:3.8b", prompt);
  const result = JSON.parse(jsonText);
  return result.updatedGlossary || { terms: [] };
}

/**
 * Glossaryを読み込む（ES6モジュール用ラッパー）
 * @param {string} projectId - プロジェクトID
 * @returns {Promise<Object>} Glossaryオブジェクト
 */
export async function loadGlossary(projectId) {
  // GlossaryLoaderが利用可能な場合は使用
  if (typeof window !== 'undefined' && window.GlossaryLoader && window.GlossaryLoader.loadProjectGlossary) {
    try {
      const glossary = await window.GlossaryLoader.loadProjectGlossary(projectId, {});
      // GlossaryLoaderは termId をキーとするオブジェクトを返すので、配列形式に変換
      const terms = Object.values(glossary || {});
      return { terms: terms };
    } catch (error) {
      console.warn('GlossaryLoader load failed:', error);
    }
  }
  
  // フォールバック: 直接読み込み
  const path = `../../projects/${projectId}/glossary.json`;
  try {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) {
      return { terms: [] };
    }
    return await response.json();
  } catch (error) {
    console.warn('Glossary load failed:', error);
    return { terms: [] };
  }
}

/**
 * Glossaryを保存する（ダウンロード方式）
 * @param {string} projectId - プロジェクトID
 * @param {Object} glossary - Glossaryオブジェクト
 */
export async function saveGlossary(projectId, glossary) {
  const dataStr = JSON.stringify(glossary, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'glossary.json';
  link.click();
  URL.revokeObjectURL(url);
  
  console.log(`Glossary saved: projects/${projectId}/glossary.json`);
  return Promise.resolve();
}

