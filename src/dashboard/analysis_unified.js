/**
 * 分析アルゴリズム統一レイヤ
 * 
 * すべてのAI分析呼び出しを統一API経由で実行する
 */

import { diagnoseUnderstanding } from "./analysis_ai.js";
import { loadConceptGraph } from "../core/concept_graph.js";

/**
 * Glossaryを読み込む（ES6モジュール用ラッパー）
 */
async function loadGlossary(projectId) {
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
 * AI分析を実行（統一API）
 * @param {Object} options - 分析オプション
 * @param {string} options.projectId - プロジェクトID
 * @param {Array} options.logs - クイズログの配列
 * @param {string} options.mode - 分析モード: "understanding" | "misconception" | "next-step"
 * @returns {Promise<Object>} 分析結果
 */
export async function runAIAnalysis({ projectId, logs, mode }) {
  const graph = await loadConceptGraph(projectId);
  const glossary = await loadGlossary(projectId);

  const base = await diagnoseUnderstanding(logs, graph);

  if (mode === "understanding") {
    return {
      understood: base.understood,
      depth: base.depth
    };
  }

  if (mode === "misconception") {
    return {
      misunderstood: base.misunderstood,
      misconceptions: base.misconceptions
    };
  }

  if (mode === "next-step") {
    return { next: base.next };
  }

  return base;
}

/**
 * ミスパターンを抽出する
 * @param {Array} logs - クイズログの配列
 * @param {Array} questionList - 質問の配列（conceptsプロパティを持つ）
 * @returns {Object} 概念ごとのミス回数 { concept: mistakeCount }
 */
export function extractMisconceptionPattern(logs, questionList) {
  const result = {};

  // 問題ID → 概念タグに依存
  for (const log of logs) {
    const q = questionList.find(x => x.id === log.questionId);
    if (!q || !q.concepts) continue;

    if (!log.correct) {
      for (const c of q.concepts) {
        if (!result[c]) result[c] = 0;
        result[c] += 1;
      }
    }
  }
  return result;
}

/**
 * 反応時間トポロジーを分析する
 * @param {Array} logs - クイズログの配列
 * @returns {Object} 概念ごとの反応時間統計 { concept: { meanRT, varianceRT, hesitation } }
 */
export function analyzeReactionTopology(logs) {
  const perConcept = {};

  for (const log of logs) {
    // 概念を取得（複数の形式に対応）
    let concepts = [];
    if (log.concepts && Array.isArray(log.concepts)) {
      concepts = log.concepts;
    } else if (log.question && log.question.concept) {
      // question.concept が単一値の場合
      concepts = [log.question.concept];
    } else if (log.concept) {
      concepts = [log.concept];
    }
    
    // 反応時間を取得（複数の形式に対応）
    const rt = log.reactionTime || log.response_time || log.response_time_ms || 0;

    for (const c of concepts) {
      if (!c) continue;
      if (!perConcept[c]) perConcept[c] = [];
      perConcept[c].push(rt);
    }
  }

  const result = {};

  for (const c in perConcept) {
    const arr = perConcept[c];
    if (arr.length === 0) continue;
    
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;

    result[c] = {
      meanRT: mean,
      varianceRT: variance,
      hesitation: variance * 0.7 + mean * 0.3
    };
  }

  return result;
}

