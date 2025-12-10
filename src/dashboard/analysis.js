/**
 * Dashboard Analysis - 学習データ分析ダッシュボード
 */

let currentProjectId = 'default';

// タブ切替処理
const tabs = ['overview','cluster','timeline','ai'];

function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      
      // すべてのタブボタンとパネルを非アクティブ化
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanels.forEach(panel => panel.style.display = 'none');
      
      // 選択されたタブをアクティブ化
      button.classList.add('active');
      const targetPanel = document.getElementById(`tab-${tabName}`);
      if (targetPanel) {
        targetPanel.style.display = 'block';
      }
    });
  });
}

// プロジェクトIDを取得
function getProjectId() {
  try {
    // URLパラメータから取得
    const params = new URLSearchParams(window.location.search);
    let projectId = params.get("project") || params.get("project_id") || params.get("projectId");
    
    // localStorage から取得
    if (!projectId) {
      projectId = localStorage.getItem('projectId') || localStorage.getItem('project_id');
    }
    
    return projectId || 'default';
  } catch (e) {
    return 'default';
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  currentProjectId = getProjectId();
  initTabs();
});

// AI診断実行（統一API使用）
import { runAIAnalysis } from "./analysis_unified.js";
import { loadQuizLog } from "./logging.js";

// 理解階層分析タブ用
async function runUnderstandingTab() {
  const logs = await loadQuizLog(currentProjectId);
  const data = await runAIAnalysis({
    projectId: currentProjectId,
    logs,
    mode: "understanding"
  });
  console.log("理解階層AI:", data);
}

// 誤概念分析タブ用
async function runMisconceptionTab() {
  const logs = await loadQuizLog(currentProjectId);
  const data = await runAIAnalysis({
    projectId: currentProjectId,
    logs,
    mode: "misconception"
  });
  console.log("誤概念AI:", data);
}

// AI診断ボタンのイベントハンドラ
document.getElementById("btn-run-ai-diagnosis")?.addEventListener("click", async () => {
  const resultBox = document.getElementById("ai-diagnosis-result");
  resultBox.innerHTML = "<p>診断中…</p>";

  try {
    const logs = await loadQuizLog(currentProjectId);
    
    // 統一APIを使用して各モードで分析
    const base = await runAIAnalysis({
      projectId: currentProjectId,
      logs,
      mode: "understanding"
    });

    const next = await runAIAnalysis({
      projectId: currentProjectId,
      logs,
      mode: "next-step"
    });

    const mis = await runAIAnalysis({
      projectId: currentProjectId,
      logs,
      mode: "misconception"
    });

    resultBox.innerHTML = `
      <h3>理解している概念</h3>
      <ul>${base.understood.map(x => `<li>${x}</li>`).join("")}</ul>

      <h3>誤概念</h3>
      <ul>${mis.misconceptions.map(x => `<li>${x}</li>`).join("")}</ul>

      <h3>推奨ステップ</h3>
      <p>${next.next}</p>
    `;
  } catch (err) {
    resultBox.innerHTML = `<p style="color:red;">AI診断失敗… ${err}</p>`;
  }
});

// 概念ミスパターン解析
import { extractMisconceptionPattern } from "./analysis_unified.js";
import { drawConceptGraph } from "./visualize_conceptmap.js";
import { loadConceptGraph } from "../core/concept_graph.js";
import { loadQuiz, loadQuizLog } from "./logging.js";

document.getElementById("btn-run-concept-mispattern")?.addEventListener("click", async () => {
  const container = document.getElementById("conceptmap-container");
  if (!container) return;
  
  container.innerHTML = "<p>読み込み中…</p>";
  
  try {
    const logs = await loadQuizLog(currentProjectId);
    const quiz = await loadQuiz(currentProjectId);
    const graph = await loadConceptGraph(currentProjectId);

    if (!graph.nodes || graph.nodes.length === 0) {
      container.innerHTML = "<p style='color:red;'>Concept Graphが見つかりません。先にConcept Graphを生成してください。</p>";
      return;
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      container.innerHTML = "<p style='color:red;'>クイズデータが見つかりません。</p>";
      return;
    }

    const scores = extractMisconceptionPattern(logs, quiz.questions);

    // コンテナをクリア
    container.innerHTML = "";

    // Concept Graphを描画
    await drawConceptGraph(container, graph, scores);
  } catch (err) {
    console.error('Concept mispattern analysis error:', err);
    container.innerHTML = `<p style="color:red;">概念ミスパターン解析失敗… ${err.message || err}</p>`;
  }
});

// 迷いマップ（RT × 誤答トポロジー）
import { analyzeReactionTopology } from "./analysis_unified.js";
import { drawRTMap } from "./visualize_rtmap.js";

document.getElementById("btn-run-rtmap")?.addEventListener("click", async () => {
  const container = document.getElementById("rtmap-container");
  if (!container) return;
  
  container.innerHTML = "<p>読み込み中…</p>";
  
  try {
    const logs = await loadQuizLog(currentProjectId);
    const graph = await loadConceptGraph(currentProjectId);

    if (!graph.nodes || graph.nodes.length === 0) {
      container.innerHTML = "<p style='color:red;'>Concept Graphが見つかりません。先にConcept Graphを生成してください。</p>";
      return;
    }

    if (!logs || logs.length === 0) {
      container.innerHTML = "<p style='color:red;'>ログデータが見つかりません。</p>";
      return;
    }

    const rtScores = analyzeReactionTopology(logs);

    // コンテナをクリア
    container.innerHTML = "";

    // 迷いマップを描画
    await drawRTMap(container, graph, rtScores);
  } catch (err) {
    console.error('RT map analysis error:', err);
    container.innerHTML = `<p style="color:red;">迷いマップ解析失敗… ${err.message || err}</p>`;
  }
});

