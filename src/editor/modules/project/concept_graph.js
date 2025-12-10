/**
 * Concept Graph生成・保存機能
 */

import { generateConceptGraph, saveConceptGraph } from '../../../core/concept_graph.js';

/**
 * プロジェクトIDを取得
 */
function getProjectId() {
  try {
    // URLパラメータから取得
    const params = new URLSearchParams(window.location.search);
    let projectId = params.get("project") || params.get("project_id") || params.get("projectId");
    
    // window.projectId から取得
    if (!projectId && window.projectId) {
      projectId = window.projectId;
    }
    
    // localStorage から取得
    if (!projectId) {
      projectId = localStorage.getItem('projectId') || localStorage.getItem('project_id');
    }
    
    return projectId || 'default';
  } catch (e) {
    return 'default';
  }
}

/**
 * Glossaryを読み込む（GlossaryLoaderを使用）
 */
async function loadGlossary(projectId) {
  // GlossaryLoaderが利用可能な場合は使用
  if (typeof window.GlossaryLoader !== 'undefined' && window.GlossaryLoader.loadProjectGlossary) {
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
 * Concept Graphを生成して保存
 */
export async function generateAndSaveConceptGraph() {
  const projectId = getProjectId();
  
  if (!projectId) {
    alert('プロジェクトIDが取得できませんでした。');
    return;
  }
  
  // ボタンを無効化
  const button = document.getElementById('btn-generate-concept-graph');
  if (button) {
    button.disabled = true;
    button.textContent = '生成中...';
  }
  
  try {
    // Glossaryを読み込む
    const glossary = await loadGlossary(projectId);
    
    if (!glossary.terms || glossary.terms.length === 0) {
      alert('Glossaryが見つかりません。\n先にGlossaryを作成してください。');
      if (button) {
        button.disabled = false;
        button.textContent = '🕸️ Concept Graph生成';
      }
      return;
    }
    
    // Concept Graphを生成
    const conceptGraph = await generateConceptGraph(glossary);
    
    // Concept Graphを保存（ダウンロード）
    await saveConceptGraph(projectId, conceptGraph);
    
    alert(`Concept Graphを生成しました！\n\nプロジェクトID: ${projectId}\n保存先: projects/${projectId}/concept_graph.json\n\nダウンロードしたファイルを projects/${projectId}/ フォルダに配置してください。`);
    
  } catch (error) {
    console.error('Concept Graph生成エラー:', error);
    alert('Concept Graphの生成に失敗しました。\nエラー: ' + (error.message || '不明なエラー'));
  } finally {
    // ボタンを再有効化
    if (button) {
      button.disabled = false;
      button.textContent = '🕸️ Concept Graph生成';
    }
  }
}

// グローバルに公開（後方互換性のため）
if (typeof window !== 'undefined') {
  window.generateAndSaveConceptGraph = generateAndSaveConceptGraph;
}

