/**
 * Glossary / ConceptGraph 双方向同期機能
 */

import { loadConceptGraph, saveConceptGraph, updateGraphFromGlossary } from '../../../core/concept_graph.js';
import { loadGlossary, saveGlossary, updateGlossaryFromGraph } from '../../../core/glossary_sync.js';

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
 * Glossary と ConceptGraph を双方向同期する
 */
export async function syncGlossaryAndGraph() {
  const projectId = getProjectId();
  
  if (!projectId) {
    alert('プロジェクトIDが取得できませんでした。');
    return;
  }
  
  // ボタンを無効化
  const button = document.getElementById('btn-sync-glossary-graph');
  if (button) {
    button.disabled = true;
    button.textContent = '同期中...';
  }
  
  try {
    // Glossary と ConceptGraph を読み込む
    const glossary = await loadGlossary(projectId);
    const graph = await loadConceptGraph(projectId);
    
    if (!glossary.terms || glossary.terms.length === 0) {
      alert('Glossaryが見つかりません。\n先にGlossaryを作成してください。');
      if (button) {
        button.disabled = false;
        button.textContent = '🔄 Glossary / ConceptGraph 同期';
      }
      return;
    }
    
    // Glossary → Graph 更新
    const newGraph = await updateGraphFromGlossary(graph, glossary);
    await saveConceptGraph(projectId, newGraph);
    
    // Graph → Glossary 更新
    const updatedGlossary = await updateGlossaryFromGraph(newGraph, glossary);
    await saveGlossary(projectId, updatedGlossary);
    
    alert(`Glossary と ConceptGraph を同期しました！\n\nプロジェクトID: ${projectId}\n\n以下のファイルがダウンロードされました:\n- concept_graph.json\n- glossary.json\n\nダウンロードしたファイルを projects/${projectId}/ フォルダに配置してください。`);
    
  } catch (error) {
    console.error('Glossary/Graph同期エラー:', error);
    alert('Glossary と ConceptGraph の同期に失敗しました。\nエラー: ' + (error.message || '不明なエラー'));
  } finally {
    // ボタンを再有効化
    if (button) {
      button.disabled = false;
      button.textContent = '🔄 Glossary / ConceptGraph 同期';
    }
  }
}

// グローバルに公開（後方互換性のため）
if (typeof window !== 'undefined') {
  window.syncGlossaryAndGraph = syncGlossaryAndGraph;
}

