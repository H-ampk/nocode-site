/**
 * Dashboard Analysis - 学習データ分析ダッシュボード
 */

let currentProjectId = 'default';
let currentDatasetData = null; // A4: 統一ローダーで読み込んだデータ

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

// データセット選択UI初期化（A1, A4）
function initDatasetSelector() {
  const select = document.getElementById("datasetSelect");
  if (!select) return;

  // dataset_index.json からデータセット一覧を取得
  fetch("/data/dataset_index.json", { cache: 'no-store' })
    .then(res => res.json())
    .then(index => {
      select.innerHTML = '<option value="">データセットを選択してください</option>';
      
      if (index.datasets && Array.isArray(index.datasets)) {
        index.datasets.forEach(ds => {
          const opt = document.createElement("option");
          opt.value = ds.id;
          
          // 表示テキスト：{dataset_name}（{ログ数} logs / {セッション数} sessions）
          let label = ds.name;
          if (ds.sessions && ds.sessions.length > 0) {
            label += ` (${ds.sessions.length} sessions / ${ds.logs} logs)`;
          } else if (ds.logs > 0) {
            label += ` (${ds.logs} logs)`;
          }
          
          opt.textContent = label;
          select.appendChild(opt);
        });
      }
    })
    .catch(error => {
      console.error("Error loading dataset index:", error);
      select.innerHTML = '<option value="">データセットの読み込みに失敗しました</option>';
    });

  // 選択変更時のイベント（A4: loadDatasetを使用）
  select.addEventListener('change', async (e) => {
    const datasetName = e.target.value;
    if (!datasetName) {
      currentDatasetData = null;
      currentProjectId = 'default';
      return;
    }

    try {
      // 統一ローダーでデータセットを読み込む（A4）
      const { loadDataset } = await import("./logging.js");
      currentDatasetData = await loadDataset(datasetName);
      currentProjectId = datasetName;
      
      // グローバル変数に保存（他のモジュールからも使用可能）
      window.currentDatasetData = currentDatasetData;
      window.currentProjectId = currentProjectId;
      
      console.log(`✅ データセットをロードしました: ${datasetName}`, currentDatasetData.metadata);
    } catch (error) {
      console.error("Error loading dataset:", error);
      alert(`データセットの読み込みに失敗しました: ${error.message}`);
    }
  });
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  currentProjectId = getProjectId();
  initTabs();
  initDatasetSelector(); // A1: データセット選択UIを初期化
});

// AI診断実行（統一API使用）
import { runAIAnalysis } from "./analysis_unified.js";
import { loadQuizLog, loadDataset } from "./logging.js";

// ログを取得するヘルパー関数（A4: 統一ローダーを使用）
async function getLogs() {
  if (currentDatasetData && currentDatasetData.logs) {
    return currentDatasetData.logs;
  }
  // フォールバック: 旧方式
  return await loadQuizLog(currentProjectId);
}

// 理解階層分析タブ用
async function runUnderstandingTab() {
  const logs = await getLogs();
  const data = await runAIAnalysis({
    projectId: currentProjectId,
    logs,
    mode: "understanding"
  });
  console.log("理解階層AI:", data);
}

// 誤概念分析タブ用
async function runMisconceptionTab() {
  const logs = await getLogs();
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
    const logs = await getLogs(); // A4: 統一ローダーを使用
    
    if (!logs || logs.length === 0) {
      resultBox.innerHTML = `<p style="color:orange;">データがありません。先にデータセットを選択してください。</p>`;
      return;
    }
    
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
    const logs = await getLogs(); // A4: 統一ローダーを使用
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
    const logs = await getLogs(); // A4: 統一ローダーを使用
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

