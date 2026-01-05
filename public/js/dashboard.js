// Dashboard JavaScript

// ES6モジュールのインポート
import { computeStats, normalizeConceptStats } from '../src/core/stats_core.js';
import { generateInsights, generateInsightsText } from '../src/core/insights_core.js';
import { buildMistakeTopology, normalizeTopologyGraph } from '../src/core/mistake_topology.js';
import { buildConceptDependencyGraph, normalizeConceptGraph, formatGraphForJSON } from '../src/core/concept_dependency.js';
import { computeResponseTimeProfile } from '../src/core/response_time_profile.js';
import { generatePatternSummary } from '../src/core/pattern_summary.js';
import { loadDataset } from '../src/dashboard/logging.js';

// 🔍 Dashboard：分析リクエスト（サーバ側へ student_xxx.csv のパスを送る）
async function requestAnalysis(studentFile) {
  await fetch("/trigger_analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file: studentFile })
  });
}

// =============================
// 📊 データセット選択UI（A1）
// =============================
let currentDataset = null;

/**
 * データセット選択UIを初期化
 */
function initDatasetSelector() {
  const select = document.getElementById("datasetSelect");
  if (!select) return;

  // students/index.json からデータセット一覧を取得
  fetch("/students/index.json", { cache: 'no-store' })
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

  // 選択変更時のイベント
  select.addEventListener('change', async (e) => {
    const datasetName = e.target.value;
    if (!datasetName) {
      currentDataset = null;
      window.currentStats = null;
      window.currentLogs = null;
      await loadSessionData(null); // 全タブをクリア
      return;
    }

    try {
      // loadDataset()関数を使用してデータセットをロード
      const datasetData = await loadDataset(datasetName);
      
      // グローバル変数に保存（他のタブからも使用可能）
      currentDataset = {
        logs: datasetData.logs,
        sessions: datasetData.sessions
      };
      window.currentDataset = currentDataset;
      window.currentDatasetName = datasetName;
      
      // セッションセレクタを更新（もしあれば）
      if (datasetData.metadata) {
        updateSessionSelector({
          id: datasetData.metadata.id,
          name: datasetData.metadata.name,
          sessions: datasetData.sessions
        });
      }
      
      // 統一的なデータロード（全タブで統計値を共有）
      await loadSessionData(currentDataset);
    } catch (error) {
      console.error("Error loading dataset:", error);
      alert(`データセットの読み込みに失敗しました: ${error.message}`);
    }
  });
}

/**
 * セッションセレクタを更新
 */
function updateSessionSelector(dataset) {
  // 既存のセッションセレクタがあれば更新
  const sessionSelect = document.getElementById("sessionSelect");
  if (sessionSelect && dataset.sessions) {
    sessionSelect.innerHTML = '<option value="">セッションを選択してください</option>';
    dataset.sessions.forEach(session => {
      const opt = document.createElement("option");
      opt.value = session.session_id;
      opt.textContent = `${session.session_id} (${new Date(session.date).toLocaleDateString()})`;
      sessionSelect.appendChild(opt);
    });
  }
}

// =============================
// 📊 分析タブ：学生ファイル読込（旧方式、後方互換性のため保持）
// =============================
function loadStudentFilesForAnalysis() {
  fetch("/students/index.json", { cache: 'no-store' })
    .then(res => res.json())
    .then(data => {
      const sel = document.getElementById("analysis-student-file");
      if (!sel) return;
      
      sel.innerHTML = "";
      
      // datasets配列からファイル名を取得
      if (data.datasets && Array.isArray(data.datasets)) {
        data.datasets.forEach(dataset => {
          const opt = document.createElement("option");
          opt.value = dataset.file;
          
          // 表示テキストを統一形式に
          let label = dataset.name;
          if (dataset.sessions && dataset.sessions.length > 0) {
            label += ` (${dataset.sessions.length} sessions / ${dataset.logs} logs)`;
          } else if (dataset.logs > 0) {
            label += ` (${dataset.logs} logs)`;
          }
          
          opt.textContent = label;
          sel.appendChild(opt);
        });
      }
    })
    .catch(error => {
      console.error("Error loading student files:", error);
      const sel = document.getElementById("analysis-student-file");
      if (sel) {
      sel.innerHTML = '<option value="">ファイルの読み込みに失敗しました</option>';
      }
    });
}

// =============================
// 🟩 分析完了通知バナー表示
// =============================
function showAnalysisBanner(resultFile) {
  const banner = document.getElementById("analysis-banner");
  if (!banner) return;
  
  const openLink = document.getElementById("analysis-open");
  if (openLink) {
    openLink.onclick = () => {
      loadAnalysisImage(resultFile);
    };
  }
  banner.classList.remove("hidden");
}

// 結果画像読み込み
function loadAnalysisImage(file) {
  const area = document.getElementById("analysis-result-area");
  if (area) {
    area.innerHTML = `<img src="/analysis/results/${file}?t=${Date.now()}" style="max-width:100%;">`;
  }
}

// =============================
// ⏳ 定期的に解析結果をチェック
// =============================
setInterval(async () => {
  const res = await fetch("/analysis_status");
  if (!res.ok) return;
  const { ready, file } = await res.json();
  if (ready) showAnalysisBanner(file);
}, 2000);

// =============================
// タブ切り替え機能
// =============================
function initTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPages = document.querySelectorAll(".tab-page");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");

      // すべてのタブボタンからactiveクラスを削除
      tabButtons.forEach(b => b.classList.remove("active"));
      // クリックされたタブボタンにactiveクラスを追加
      btn.classList.add("active");

      // すべてのタブページを非表示
      tabPages.forEach(page => {
        page.style.display = "none";
      });

      // 対象のタブページを表示
      const targetPage = document.getElementById(`tab-${targetTab}`);
      if (targetPage) {
        targetPage.style.display = "block";
      }

      // 分析実行タブが選択されたら学生ファイルを読み込む
      if (targetTab === "analysis-run") {
        loadStudentFilesForAnalysis();
      }
      
      // 理解構造レポートタブが選択されたらレポートを更新
      if (targetTab === "insights" && window.currentStats) {
        renderInsights(window.currentStats);
      }
      
      // 概念理解分析タブが選択されたらヒートマップとグラフを更新
      if (targetTab === "concept-understanding") {
        if (window.currentStats) {
          renderConceptUnderstanding(window.currentStats);
        }
        if (window.currentLogs) {
          renderConceptDependency(window.currentLogs);
        }
      }
      
      // 迷いパターン分析タブが選択されたらグラフを更新
      if (targetTab === "paths" && window.currentLogs) {
        renderMistakeTopology(window.currentLogs);
      }
      
      // 反応時間プロファイルタブが選択されたらプロファイルを更新
      if (targetTab === "response-time" && window.currentLogs) {
        renderResponseTimeProfile(window.currentLogs);
      }
      
      // 研究傾向サマリタブが選択されたらサマリを更新
      if (targetTab === "pattern-summary" && window.currentStats && window.currentLogs) {
        renderPatternSummary(window.currentStats, window.currentLogs);
      }
      
      // 他のタブでも統計データがあれば更新
      if (window.currentStats) {
        if (targetTab === "questions") {
          renderConcept(window.currentStats);
        } else if (targetTab === "confusions") {
          renderMistake(window.currentStats);
        }
      }
    });
  });

  // 最初のタブを表示
  if (tabButtons.length > 0) {
    tabButtons[0].click();
  }
}

// =============================
// 📊 分析実行ボタン
// =============================
function initAnalysisButton() {
  const runAnalysisBtn = document.getElementById("run-analysis-btn");
  if (runAnalysisBtn) {
    runAnalysisBtn.onclick = () => {
      const file = document.getElementById("analysis-student-file").value;
      if (!file) {
        alert("生徒データを選択してください");
        return;
      }
      requestAnalysis(file);
      alert("分析を開始しました。結果は準備ができ次第、通知されます。");
    };
  }
}

// =============================
// 📊 反応時間分布分析
// =============================
let currentStudentData = null;

// 現在選択されている学生データを保存する関数（他のタブから呼ばれる想定）
function setCurrentStudentData(data) {
  currentStudentData = data;
}

// 反応時間分布分析の実行
async function runReactionTimeAnalysis() {
  const btn = document.getElementById('run-rt-analysis');
  const resultArea = document.getElementById('rt-analysis-result');
  
  if (!currentStudentData) {
    // データが選択されていない場合は、最初のデータセットを読み込む
    try {
      const response = await fetch('/students/index.json');
      const indexData = await response.json();
      
      if (!indexData.datasets || indexData.datasets.length === 0) {
        alert('分析するデータがありません。まず学生データを選択してください。');
        return;
      }
      
      // 最初のデータセットを読み込む
      const firstDataset = indexData.datasets[0];
      const dataResponse = await fetch(`/students/${firstDataset.file}`);
      currentStudentData = await dataResponse.json();
    } catch (error) {
      console.error('Error loading student data:', error);
      alert('データの読み込みに失敗しました: ' + error.message);
      return;
    }
  }
  
  if (!currentStudentData) {
    alert('分析するデータがありません。');
    return;
  }
  
  // ボタンを無効化
  btn.disabled = true;
  btn.textContent = '分析中...';
  resultArea.innerHTML = '<p>分析を実行中です。しばらくお待ちください...</p>';
  
  try {
    const response = await fetch('/analyze/reaction-time', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(currentStudentData)
    });
    
    if (!response.ok) {
      throw new Error('分析の実行に失敗しました: ' + response.status);
    }
    
    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    // 結果を表示
    displayReactionTimeResult(result);
    
  } catch (error) {
    console.error('Error running reaction time analysis:', error);
    resultArea.innerHTML = `<p style="color: #d32f2f;">エラー: ${error.message}</p>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Juliaで分析を実行';
  }
}

// 結果を表示する関数
function displayReactionTimeResult(result) {
  const resultArea = document.getElementById('rt-analysis-result');
  
  let html = '<h4>分析結果</h4>';
  
  // 統計テーブル
  html += '<table class="stats-table">';
  html += '<tr><th>統計量</th><th>値</th></tr>';
  html += `<tr><td>平均</td><td>${result.mean.toFixed(2)} 秒</td></tr>`;
  html += `<tr><td>中央値</td><td>${result.median.toFixed(2)} 秒</td></tr>`;
  html += `<tr><td>標準偏差</td><td>${result.std.toFixed(2)} 秒</td></tr>`;
  html += `<tr><td>最小値</td><td>${result.min.toFixed(2)} 秒</td></tr>`;
  html += `<tr><td>最大値</td><td>${result.max.toFixed(2)} 秒</td></tr>`;
  html += '</table>';
  
  // 分布パラメータ
  html += '<h4 style="margin-top: 30px;">分布パラメータ推定</h4>';
  html += '<table class="stats-table">';
  html += '<tr><th>分布</th><th>パラメータ</th><th>値</th></tr>';
  html += `<tr><td>指数分布</td><td>λ (lambda)</td><td>${result.lambda.toFixed(4)}</td></tr>`;
  html += `<tr><td>正規分布</td><td>μ (mu)</td><td>${result.mu.toFixed(2)}</td></tr>`;
  html += `<tr><td>正規分布</td><td>σ (sigma)</td><td>${result.sigma.toFixed(2)}</td></tr>`;
  html += '</table>';
  
  // プロット画像
  if (result.plotImage) {
    html += '<h4 style="margin-top: 30px;">ヒストグラム</h4>';
    html += `<img src="data:image/png;base64,${result.plotImage}" alt="反応時間分布ヒストグラム" class="plot-image">`;
  }
  
  resultArea.innerHTML = html;
}

// =============================
// 📊 統一的なデータロードとレンダリング
// =============================
/**
 * セッションデータをロードし、全タブで統計値を共有
 * @param {Object} dataset - データセットデータ（またはログ配列）
 * @returns {Promise<Object>} 統計データ
 */
async function loadSessionData(dataset) {
  // ログを取得
  let logs = [];
  if (Array.isArray(dataset)) {
    // 直接ログ配列が渡された場合
    logs = dataset;
  } else if (dataset && dataset.logs && Array.isArray(dataset.logs)) {
    // ログベース形式
    logs = dataset.logs;
  } else if (dataset && dataset.sessions && Array.isArray(dataset.sessions)) {
    // セッションベース形式
    dataset.sessions.forEach(session => {
      if (session.logs && Array.isArray(session.logs)) {
        logs = logs.concat(session.logs);
      }
    });
  }

  if (logs.length === 0) {
    // データがない場合はクリア
    renderSummary(null);
    renderConcept(null);
    renderMistake(null);
    renderInsights(null);
    renderConceptUnderstanding(null);
    renderMistakeTopology(null);
    renderConceptDependency(null);
    renderResponseTimeProfile(null);
    renderPatternSummary(null, null);
    return null;
  }

  // 統計を計算
  const stats = computeStats(logs);
  
  // グローバル変数に保存（他のタブからも使用可能）
  window.currentStats = stats;
  window.currentLogs = logs;

  // 全タブで統計値を共有してレンダリング
  renderSummary(stats);
  renderConcept(stats);
  renderMistake(stats);
  renderInsights(stats);
  renderConceptUnderstanding(stats);
  renderMistakeTopology(logs);
  renderConceptDependency(logs);
  renderResponseTimeProfile(logs);
  renderPatternSummary(stats, logs);

  return stats;
}

/**
 * サマリーカードを更新（renderSummaryのエイリアス）
 * @param {Object} stats - 統計データ
 */
function renderSummary(stats) {
  updateSummaryCards(stats);
}

/**
 * 概念スコアテーブルをレンダリング
 * @param {Object} stats - 統計データ
 */
function renderConceptScoreTable(stats) {
  const container = document.getElementById('concept-score-table-container');
  if (!container || !stats) return;

  const conceptDetails = stats.conceptDetails || {};
  const concepts = Object.keys(conceptDetails);

  if (concepts.length === 0) {
    container.innerHTML = '<p style="color: #888;">概念データがありません。</p>';
    return;
  }

  // テーブルを生成
  let html = '<table style="width: 100%; border-collapse: collapse; margin-top: 20px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">';
  html += '<thead>';
  html += '<tr style="background: #f5f5f5;">';
  html += '<th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd;">概念</th>';
  html += '<th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">回答数</th>';
  html += '<th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">正答率</th>';
  html += '<th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">平均反応時間</th>';
  html += '<th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd;">平均パス長</th>';
  html += '</tr>';
  html += '</thead>';
  html += '<tbody>';

  // 正答率でソート
  const sortedConcepts = concepts.sort((a, b) => {
    return conceptDetails[b].accuracy - conceptDetails[a].accuracy;
  });

  sortedConcepts.forEach(concept => {
    const detail = conceptDetails[concept];
    const accuracyPercent = (detail.accuracy * 100).toFixed(1);
    const rtSec = detail.avgResponseTime > 0 ? (detail.avgResponseTime / 1000).toFixed(2) : '-';
    const pathLength = detail.avgPathLength > 0 ? detail.avgPathLength.toFixed(2) : '-';

    html += '<tr style="border-bottom: 1px solid #eee;">';
    html += `<td style="padding: 12px; font-weight: 600;">${concept}</td>`;
    html += `<td style="padding: 12px; text-align: right;">${detail.total}</td>`;
    html += `<td style="padding: 12px; text-align: right;">${accuracyPercent}%</td>`;
    html += `<td style="padding: 12px; text-align: right;">${rtSec}${rtSec !== '-' ? '秒' : ''}</td>`;
    html += `<td style="padding: 12px; text-align: right;">${pathLength}</td>`;
    html += '</tr>';
  });

  html += '</tbody>';
  html += '</table>';

  container.innerHTML = html;
}

/**
 * 概念分析をレンダリング
 * @param {Object} stats - 統計データ
 */
function renderConcept(stats) {
  // 概念分析タブのコンテンツを更新
  const conceptTab = document.getElementById('tab-questions');
  if (!conceptTab || !stats) return;

  // 概念スコアテーブルを表示
  if (!conceptTab.querySelector('.concept-content')) {
    const content = document.createElement('div');
    content.className = 'concept-content';
    content.id = 'concept-tab-table-container';
    conceptTab.appendChild(content);
  }

  const container = conceptTab.querySelector('#concept-tab-table-container');
  if (container && stats.conceptDetails) {
    renderConceptScoreTable(stats);
  }
}

/**
 * 概念理解分析をレンダリング（ヒートマップ）
 * @param {Object} stats - 統計データ
 */
function renderConceptUnderstanding(stats) {
  const container = document.getElementById('concept-heatmap-container');
  if (!container) return;

  if (!stats || !stats.conceptDetails) {
    container.innerHTML = '<p style="color: #888;">データセットを選択すると、概念理解分析が表示されます。</p>';
    return;
  }

  try {
    // 正規化された統計を取得
    const normalized = normalizeConceptStats(stats);
    const concepts = Object.keys(normalized);
    
    if (concepts.length === 0) {
      container.innerHTML = '<p style="color: #888;">概念データがありません。</p>';
      return;
    }

    // メトリクス定義
    const metrics = [
      { key: 'accuracy', label: '正答率', unit: '%' },
      { key: 'avgResponseTime', label: '平均反応時間', unit: '秒' },
      { key: 'avgPathLength', label: '平均パス長', unit: '' },
      { key: 'glossaryShownRate', label: 'Glossary表示率', unit: '%' }
    ];

    // ヒートマップを生成
    let html = '<div style="overflow-x: auto; margin-top: 20px;">';
    html += '<table class="concept-heatmap-table">';
    
    // ヘッダー行
    html += '<thead><tr>';
    html += '<th style="min-width: 150px;">概念</th>';
    metrics.forEach(metric => {
      html += `<th style="min-width: 120px;">${metric.label}</th>`;
    });
    html += '</tr></thead>';
    
    html += '<tbody>';
    
    // 概念ごとに行を生成
    concepts.forEach(concept => {
      html += '<tr>';
      html += `<td class="concept-name">${concept}</td>`;
      
      metrics.forEach(metric => {
        const value = normalized[concept][metric.key] || 0;
        const percent = (value * 100).toFixed(1);
        
        // 偏差に基づいて色を決定（-100%から+100%の範囲）
        const intensity = Math.min(Math.abs(value), 1); // 0-1の範囲に正規化
        let color;
        if (value > 0) {
          // 正の偏差（赤系）
          const r = 255;
          const g = Math.floor(255 * (1 - intensity));
          const b = Math.floor(255 * (1 - intensity));
          color = `rgb(${r}, ${g}, ${b})`;
        } else if (value < 0) {
          // 負の偏差（青系）
          const r = Math.floor(255 * (1 - intensity));
          const g = Math.floor(255 * (1 - intensity));
          const b = 255;
          color = `rgb(${r}, ${g}, ${b})`;
        } else {
          // 偏差なし（白）
          color = 'rgb(255, 255, 255)';
        }
        
        html += `<td class="heatmap-cell" style="background-color: ${color};" title="${metric.label}: ${percent > 0 ? '+' : ''}${percent}%">`;
        html += `<span class="heatmap-value">${percent > 0 ? '+' : ''}${percent}%</span>`;
        html += '</td>';
      });
      
      html += '</tr>';
    });
    
    html += '</tbody>';
    html += '</table>';
    html += '</div>';
    
    // 凡例を追加
    html += '<div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;">';
    html += '<h4 style="margin-top: 0; margin-bottom: 10px;">凡例</h4>';
    html += '<div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">';
    html += '<div style="display: flex; align-items: center; gap: 8px;">';
    html += '<div style="width: 30px; height: 20px; background: rgb(255, 0, 0); border: 1px solid #ddd;"></div>';
    html += '<span>平均より高い（+）</span>';
    html += '</div>';
    html += '<div style="display: flex; align-items: center; gap: 8px;">';
    html += '<div style="width: 30px; height: 20px; background: rgb(255, 255, 255); border: 1px solid #ddd;"></div>';
    html += '<span>平均と同等（0%）</span>';
    html += '</div>';
    html += '<div style="display: flex; align-items: center; gap: 8px;">';
    html += '<div style="width: 30px; height: 20px; background: rgb(0, 0, 255); border: 1px solid #ddd;"></div>';
    html += '<span>平均より低い（-）</span>';
    html += '</div>';
    html += '</div>';
    html += '<p style="margin-top: 10px; color: #666; font-size: 0.9em;">値は全体平均からの相対的な偏差（%）を表示しています。</p>';
    html += '</div>';

    container.innerHTML = html;
  } catch (error) {
    console.error('Error rendering concept understanding heatmap:', error);
    container.innerHTML = `<p style="color: #d32f2f;">エラー: 概念理解分析の生成に失敗しました。${error.message}</p>`;
  }
}

/**
 * 誤答パストポロジーをレンダリング（ネットワークグラフ）
 * @param {Array} logs - ログ配列
 */
function renderMistakeTopology(logs) {
  const container = document.getElementById('mistake-topology-container');
  if (!container) return;

  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    container.innerHTML = '<p style="color: #888;">データセットを選択すると、迷いパターン分析が表示されます。</p>';
    return;
  }

  try {
    // パストポロジーグラフを構築
    const graph = buildMistakeTopology(logs);
    
    if (!graph.nodes || graph.nodes.length === 0) {
      container.innerHTML = '<p style="color: #888;">誤答データが見つかりませんでした。</p>';
      return;
    }

    // グラフを正規化
    const normalizedGraph = normalizeTopologyGraph(graph);

    // SVGでネットワークグラフを描画
    renderTopologySVG(container, normalizedGraph);
  } catch (error) {
    console.error('Error rendering mistake topology:', error);
    container.innerHTML = `<p style="color: #d32f2f;">エラー: 迷いパターン分析の生成に失敗しました。${error.message}</p>`;
  }
}

/**
 * SVGでネットワークグラフを描画
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} graph - 正規化されたグラフ構造
 */
function renderTopologySVG(container, graph) {
  const width = Math.min(1200, container.clientWidth || 1200);
  const height = 600;
  const padding = 50;

  // 力指向レイアウト（簡易版）
  const nodes = graph.nodes;
  const edges = graph.edges;

  // ノードの初期位置を設定（円形配置）
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;
  
  nodes.forEach((node, index) => {
    const angle = (index / nodes.length) * 2 * Math.PI;
    node.x = centerX + radius * Math.cos(angle);
    node.y = centerY + radius * Math.sin(angle);
  });

  // SVGを生成
  let html = `<div style="overflow: auto; border: 1px solid #ddd; border-radius: 8px; background: white;">`;
  html += `<svg width="${width}" height="${height}" style="display: block;">`;
  
  // エッジを描画（ノードより先に描画）
  edges.forEach(edge => {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    
    if (!fromNode || !toNode) return;

    const opacity = Math.max(0.2, edge.normalizedWeight);
    html += `<line x1="${fromNode.x}" y1="${fromNode.y}" x2="${toNode.x}" y2="${toNode.y}" `;
    html += `stroke="#666" stroke-width="${edge.width}" opacity="${opacity}" />`;
    
    // エッジラベル（頻度）
    const midX = (fromNode.x + toNode.x) / 2;
    const midY = (fromNode.y + toNode.y) / 2;
    html += `<text x="${midX}" y="${midY}" font-size="10" fill="#666" text-anchor="middle" dy="4">${edge.frequency}</text>`;
  });

  // ノードを描画
  nodes.forEach(node => {
    const nodeSize = node.size || 30;
    const color = node.concepts && node.concepts.length > 0 ? '#d32f2f' : '#1976d2';
    
    // ノード円
    html += `<circle cx="${node.x}" cy="${node.y}" r="${nodeSize}" `;
    html += `fill="${color}" stroke="#fff" stroke-width="2" opacity="0.8" />`;
    
    // ノードラベル
    html += `<text x="${node.x}" y="${node.y + nodeSize + 15}" `;
    html += `font-size="12" fill="#333" text-anchor="middle">${node.label}</text>`;
    
    // 頻度ラベル
    html += `<text x="${node.x}" y="${node.y}" `;
    html += `font-size="10" fill="#fff" text-anchor="middle" dy="4" font-weight="bold">${node.frequency}</text>`;
  });

  html += `</svg>`;
  html += `</div>`;

  // 凡例と統計情報
  html += `<div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;">`;
  html += `<h4 style="margin-top: 0; margin-bottom: 10px;">統計情報</h4>`;
  html += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">`;
  html += `<div><strong>ノード数:</strong> ${nodes.length}</div>`;
  html += `<div><strong>エッジ数:</strong> ${edges.length}</div>`;
  html += `<div><strong>総誤答数:</strong> ${nodes.reduce((sum, n) => sum + n.frequency, 0)}</div>`;
  html += `</div>`;
  
  // 概念タグの表示
  const allConcepts = new Set();
  nodes.forEach(node => {
    if (node.concepts) {
      node.concepts.forEach(c => allConcepts.add(c));
    }
  });
  
  if (allConcepts.size > 0) {
    html += `<div style="margin-top: 15px;">`;
    html += `<strong>関連概念:</strong> `;
    html += Array.from(allConcepts).join(', ');
    html += `</div>`;
  }
  
  html += `</div>`;

  container.innerHTML = html;
}

/**
 * 概念依存関係グラフをレンダリング
 * @param {Array} logs - ログ配列
 */
function renderConceptDependency(logs) {
  const container = document.getElementById('concept-dependency-container');
  if (!container) return;

  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    container.innerHTML = '<p style="color: #888;">データセットを選択すると、概念依存関係グラフが表示されます。</p>';
    return;
  }

  try {
    // 概念依存関係グラフを構築
    const graph = buildConceptDependencyGraph(logs);
    
    if (!graph.nodes || graph.nodes.length === 0) {
      container.innerHTML = '<p style="color: #888;">概念データが見つかりませんでした。</p>';
      return;
    }

    // グラフを正規化
    const normalizedGraph = normalizeConceptGraph(graph);

    // JSON形式で保存用データを準備
    const jsonData = formatGraphForJSON(graph);
    
    // グローバル変数に保存（他のタブからも使用可能）
    window.conceptDependencyGraph = jsonData;

    // SVGでネットワークグラフを描画
    renderConceptGraphSVG(container, normalizedGraph);
  } catch (error) {
    console.error('Error rendering concept dependency graph:', error);
    container.innerHTML = `<p style="color: #d32f2f;">エラー: 概念依存関係グラフの生成に失敗しました。${error.message}</p>`;
  }
}

/**
 * SVGで概念依存関係グラフを描画
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} graph - 正規化されたグラフ構造
 */
function renderConceptGraphSVG(container, graph) {
  const width = Math.min(1200, container.clientWidth || 1200);
  const height = 600;

  const nodes = graph.nodes;
  const edges = graph.edges;

  // ノードの初期位置を設定（円形配置）
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;
  
  nodes.forEach((node, index) => {
    const angle = (index / nodes.length) * 2 * Math.PI;
    node.x = centerX + radius * Math.cos(angle);
    node.y = centerY + radius * Math.sin(angle);
  });

  // SVGを生成
  let html = `<div style="overflow: auto; border: 1px solid #ddd; border-radius: 8px; background: white;">`;
  html += `<svg width="${width}" height="${height}" style="display: block;">`;
  
  // エッジを描画（ノードより先に描画）
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return;

    const opacity = Math.max(0.3, Math.min(1.0, edge.normalizedWeight || 0.5));
    html += `<line x1="${sourceNode.x}" y1="${sourceNode.y}" x2="${targetNode.x}" y2="${targetNode.y}" `;
    html += `stroke="#666" stroke-width="${edge.width}" opacity="${opacity}" />`;
    
    // エッジラベル（重み）
    const midX = (sourceNode.x + targetNode.x) / 2;
    const midY = (sourceNode.y + targetNode.y) / 2;
    html += `<text x="${midX}" y="${midY}" font-size="10" fill="#666" text-anchor="middle" dy="4">${edge.weight}</text>`;
  });

  // ノードを描画
  nodes.forEach(node => {
    const nodeSize = node.size || 30;
    // 正答率に基づいて色を決定（低いほど赤、高いほど緑）
    const accuracy = node.correct_rate || 0;
    const r = Math.floor(255 * (1 - accuracy));
    const g = Math.floor(255 * accuracy);
    const b = 0;
    const color = `rgb(${r}, ${g}, ${b})`;
    
    // ノード円
    html += `<circle cx="${node.x}" cy="${node.y}" r="${nodeSize}" `;
    html += `fill="${color}" stroke="#fff" stroke-width="2" opacity="0.8" />`;
    
    // ノードラベル
    html += `<text x="${node.x}" y="${node.y + nodeSize + 15}" `;
    html += `font-size="12" fill="#333" text-anchor="middle">${node.label}</text>`;
    
    // 正答率ラベル
    html += `<text x="${node.x}" y="${node.y}" `;
    html += `font-size="10" fill="#fff" text-anchor="middle" dy="4" font-weight="bold">${(accuracy * 100).toFixed(0)}%</text>`;
  });

  html += `</svg>`;
  html += `</div>`;

  // 統計情報とダウンロードボタン
  html += `<div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;">`;
  html += `<h4 style="margin-top: 0; margin-bottom: 10px;">統計情報</h4>`;
  html += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">`;
  html += `<div><strong>ノード数:</strong> ${nodes.length}</div>`;
  html += `<div><strong>エッジ数:</strong> ${edges.length}</div>`;
  html += `<div><strong>総概念出現数:</strong> ${nodes.reduce((sum, n) => sum + (n.total_count || 0), 0)}</div>`;
  html += `</div>`;
  
  // ダウンロードボタン
  html += `<div style="margin-top: 15px;">`;
  html += `<button id="download-concept-graph" style="padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">概念グラフをJSONでダウンロード</button>`;
  html += `</div>`;
  
  html += `<div style="margin-top: 10px; color: #666; font-size: 0.9em;">`;
  html += `<strong>凡例:</strong> ノードの色は正答率（緑=高、赤=低）、エッジの太さは共起強度を示します。`;
  html += `</div>`;
  
  html += `</div>`;

  container.innerHTML = html;

  // ダウンロードボタンのイベントハンドラ
  const downloadBtn = document.getElementById('download-concept-graph');
  if (downloadBtn && window.conceptDependencyGraph) {
    downloadBtn.addEventListener('click', () => {
      const jsonStr = JSON.stringify(window.conceptDependencyGraph, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'concept_graph.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

/**
 * 反応時間プロファイルをレンダリング
 * @param {Array} logs - ログ配列
 */
function renderResponseTimeProfile(logs) {
  const container = document.getElementById('response-time-profile-container');
  if (!container) return;

  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    container.innerHTML = '<p style="color: #888;">データセットを選択すると、反応時間プロファイルが表示されます。</p>';
    return;
  }

  try {
    // 反応時間分布を計算
    const profile = computeResponseTimeProfile(logs);
    
    if (!profile.byConcept || Object.keys(profile.byConcept).length === 0) {
      container.innerHTML = '<p style="color: #888;">概念データが見つかりませんでした。</p>';
      return;
    }

    // ボックスプロットを描画
    renderResponseTimeBoxplot(container, profile);
  } catch (error) {
    console.error('Error rendering response time profile:', error);
    container.innerHTML = `<p style="color: #d32f2f;">エラー: 反応時間プロファイルの生成に失敗しました。${error.message}</p>`;
  }
}

/**
 * SVGでボックスプロットを描画
 * @param {HTMLElement} container - コンテナ要素
 * @param {Object} profile - 反応時間分布データ
 */
function renderResponseTimeBoxplot(container, profile) {
  const width = Math.min(1200, container.clientWidth || 1200);
  const height = 500;
  const padding = { top: 40, right: 40, bottom: 60, left: 80 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const concepts = Object.keys(profile.byConcept).sort();
  const overallMean = profile.overall.mean;

  // Y軸の範囲を決定（全体の最小値と最大値から）
  const allValues = profile.overall.values;
  const yMin = allValues.length > 0 ? allValues[0] : 0;
  const yMax = allValues.length > 0 ? allValues[allValues.length - 1] : 1000;
  const yRange = yMax - yMin || 1;

  // X軸の位置を計算
  const xStep = plotWidth / (concepts.length + 1);
  const xPositions = {};
  concepts.forEach((concept, index) => {
    xPositions[concept] = padding.left + xStep * (index + 1);
  });

  // SVGを生成
  let html = `<div style="overflow-x: auto; border: 1px solid #ddd; border-radius: 8px; background: white;">`;
  html += `<svg width="${width}" height="${height}" style="display: block;">`;
  
  // Y軸グリッドとラベル
  const yTicks = 10;
  for (let i = 0; i <= yTicks; i++) {
    const yValue = yMin + (yMax - yMin) * (i / yTicks);
    const yPos = padding.top + plotHeight * (1 - i / yTicks);
    
    html += `<line x1="${padding.left}" y1="${yPos}" x2="${width - padding.right}" y2="${yPos}" `;
    html += `stroke="#e0e0e0" stroke-width="1" stroke-dasharray="2,2" />`;
    
    html += `<text x="${padding.left - 10}" y="${yPos}" font-size="10" fill="#666" text-anchor="end" dy="4">${(yValue / 1000).toFixed(1)}s</text>`;
  }

  // 全体平均線
  const overallMeanY = padding.top + plotHeight * (1 - (overallMean - yMin) / yRange);
  html += `<line x1="${padding.left}" y1="${overallMeanY}" x2="${width - padding.right}" y2="${overallMeanY}" `;
  html += `stroke="#666" stroke-width="2" stroke-dasharray="5,5" opacity="0.7" />`;
  html += `<text x="${width - padding.right + 5}" y="${overallMeanY}" font-size="10" fill="#666" dy="4">全体平均: ${(overallMean / 1000).toFixed(2)}s</text>`;

  // 各概念のボックスプロットを描画
  concepts.forEach(concept => {
    const x = xPositions[concept];
    const dist = profile.byConcept[concept];
    
    // 正答と誤答の両方を描画
    ['correct', 'incorrect'].forEach((type, typeIndex) => {
      const data = dist[type];
      if (!data || data.count === 0) return;

      const offset = typeIndex === 0 ? -15 : 15; // 正答は左、誤答は右にずらす
      const color = type === 'correct' ? '#4caf50' : '#f44336';
      
      const xPos = x + offset;
      
      // Y座標を計算
      const q1Y = padding.top + plotHeight * (1 - (data.q1 - yMin) / yRange);
      const medianY = padding.top + plotHeight * (1 - (data.median - yMin) / yRange);
      const q3Y = padding.top + plotHeight * (1 - (data.q3 - yMin) / yRange);
      const minY = padding.top + plotHeight * (1 - (data.min - yMin) / yRange);
      const maxY = padding.top + plotHeight * (1 - (data.max - yMin) / yRange);
      
      const boxHeight = q3Y - q1Y;
      const boxWidth = 20;
      
      // ボックス（Q1-Q3）
      html += `<rect x="${xPos - boxWidth/2}" y="${q1Y}" width="${boxWidth}" height="${boxHeight}" `;
      html += `fill="${color}" opacity="0.6" stroke="#333" stroke-width="1" />`;
      
      // 中央値線
      html += `<line x1="${xPos - boxWidth/2}" y1="${medianY}" x2="${xPos + boxWidth/2}" y2="${medianY}" `;
      html += `stroke="#333" stroke-width="2" />`;
      
      // ひげ（最小値-Q1）
      html += `<line x1="${xPos}" y1="${minY}" x2="${xPos}" y2="${q1Y}" `;
      html += `stroke="#333" stroke-width="1" />`;
      html += `<line x1="${xPos - 5}" y1="${minY}" x2="${xPos + 5}" y2="${minY}" `;
      html += `stroke="#333" stroke-width="1" />`;
      
      // ひげ（Q3-最大値）
      html += `<line x1="${xPos}" y1="${q3Y}" x2="${xPos}" y2="${maxY}" `;
      html += `stroke="#333" stroke-width="1" />`;
      html += `<line x1="${xPos - 5}" y1="${maxY}" x2="${xPos + 5}" y2="${maxY}" `;
      html += `stroke="#333" stroke-width="1" />`;
    });
    
    // 概念ラベル
    html += `<text x="${x}" y="${height - padding.bottom + 20}" font-size="11" fill="#333" text-anchor="middle">${concept}</text>`;
  });

  // 軸ラベル
  html += `<text x="${width / 2}" y="${height - 10}" font-size="12" fill="#333" text-anchor="middle" font-weight="600">概念</text>`;
  html += `<text x="20" y="${height / 2}" font-size="12" fill="#333" text-anchor="middle" transform="rotate(-90, 20, ${height / 2})" font-weight="600">反応時間（秒）</text>`;

  html += `</svg>`;
  html += `</div>`;

  // 凡例と統計情報
  html += `<div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;">`;
  html += `<h4 style="margin-top: 0; margin-bottom: 10px;">凡例</h4>`;
  html += `<div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">`;
  html += `<div style="display: flex; align-items: center; gap: 8px;">`;
  html += `<div style="width: 20px; height: 15px; background: #4caf50; opacity: 0.6; border: 1px solid #333;"></div>`;
  html += `<span>正答</span>`;
  html += `</div>`;
  html += `<div style="display: flex; align-items: center; gap: 8px;">`;
  html += `<div style="width: 20px; height: 15px; background: #f44336; opacity: 0.6; border: 1px solid #333;"></div>`;
  html += `<span>誤答</span>`;
  html += `</div>`;
  html += `<div style="display: flex; align-items: center; gap: 8px;">`;
  html += `<div style="width: 30px; height: 2px; background: #666; opacity: 0.7; border: none;"></div>`;
  html += `<span>全体平均</span>`;
  html += `</div>`;
  html += `</div>`;
  
  html += `<div style="margin-top: 15px; color: #666; font-size: 0.9em;">`;
  html += `<strong>統計情報:</strong> 全体平均: ${(overallMean / 1000).toFixed(2)}秒、`;
  html += `正答平均: ${(profile.byCorrectness.correct.mean / 1000).toFixed(2)}秒、`;
  html += `誤答平均: ${(profile.byCorrectness.incorrect.mean / 1000).toFixed(2)}秒`;
  html += `</div>`;
  
  html += `</div>`;

  container.innerHTML = html;
}

/**
 * 研究傾向サマリをレンダリング
 * @param {Object} stats - 統計データ
 * @param {Array} logs - ログ配列
 */
function renderPatternSummary(stats, logs) {
  const container = document.getElementById('pattern-summary-container');
  if (!container) return;

  if (!stats || !logs || !Array.isArray(logs) || logs.length === 0) {
    container.innerHTML = '<p style="color: #888;">データセットを選択すると、研究傾向サマリが表示されます。</p>';
    return;
  }

  try {
    // 必要な統計を計算
    const conceptStats = normalizeConceptStats(stats);
    const rtProfile = computeResponseTimeProfile(logs);

    // パターンサマリを生成
    const summaries = generatePatternSummary(stats, conceptStats, rtProfile);

    if (summaries.length === 0) {
      container.innerHTML = '<p style="color: #888;">検出された傾向パターンはありません。</p>';
      return;
    }

    // サマリを表示
    let html = '<div style="margin-top: 20px;">';
    html += '<h3 style="margin-bottom: 15px;">検出された傾向パターン</h3>';
    html += '<ul style="line-height: 2; padding-left: 20px;">';
    
    summaries.forEach(summary => {
      html += `<li style="margin-bottom: 10px; color: #333;">${summary}</li>`;
    });
    
    html += '</ul>';
    html += '</div>';

    // 統計情報を追加
    html += '<div style="margin-top: 30px; padding: 15px; background: #f9f9f9; border-radius: 8px;">';
    html += '<h4 style="margin-top: 0; margin-bottom: 10px;">全体統計</h4>';
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">';
    html += `<div><strong>総回答数:</strong> ${stats.total}</div>`;
    html += `<div><strong>正答率:</strong> ${(stats.accuracy * 100).toFixed(1)}%</div>`;
    html += `<div><strong>平均反応時間:</strong> ${(stats.rtMean / 1000).toFixed(2)}秒</div>`;
    html += `<div><strong>平均パス長:</strong> ${stats.avgPathLength.toFixed(2)}</div>`;
    html += `</div>`;
    html += `</div>`;

    container.innerHTML = html;
  } catch (error) {
    console.error('Error rendering pattern summary:', error);
    container.innerHTML = `<p style="color: #d32f2f;">エラー: 研究傾向サマリの生成に失敗しました。${error.message}</p>`;
  }
}

/**
 * 誤答分析をレンダリング（renderMistakeのエイリアス）
 * @param {Object} stats - 統計データ
 */
function renderMistake(stats) {
  // 誤概念ランキングは既にrenderSummaryで表示されている
  // 必要に応じて追加の誤答分析をここに実装
  const mistakeTab = document.getElementById('tab-confusions');
  if (!mistakeTab || !stats) return;

  // 誤答分析タブのコンテンツを更新（将来実装）
  if (!mistakeTab.querySelector('.mistake-content')) {
    const content = document.createElement('div');
    content.className = 'mistake-content';
    content.innerHTML = '<p style="color: #888;">誤答分析は準備中です。</p>';
    mistakeTab.appendChild(content);
  }
}

/**
 * 理解構造レポートをレンダリング
 * @param {Object} stats - 統計データ
 */
async function renderInsights(stats) {
  const reportEl = document.getElementById('insights-report');
  if (!reportEl) return;

  if (!stats) {
    reportEl.innerHTML = '<p style="color: #888;">データセットを選択すると、理解構造レポートが表示されます。</p>';
    return;
  }

  try {
    // 洞察を生成
    const insights = generateInsights(stats);
    
    if (insights.length === 0) {
      reportEl.innerHTML = '<p style="color: #888;">分析結果がありません。</p>';
      return;
    }

    // カテゴリ別にグループ化して表示
    const grouped = {};
    insights.forEach(insight => {
      if (typeof insight === 'object' && insight.category) {
        if (!grouped[insight.category]) {
          grouped[insight.category] = [];
        }
        grouped[insight.category].push(insight);
      }
    });

    let html = '';
    
    // カテゴリごとに表示
    Object.keys(grouped).forEach(category => {
      html += `<div style="margin-bottom: 30px;">`;
      html += `<h3 style="color: #333; border-bottom: 2px solid #ddd; padding-bottom: 8px; margin-bottom: 16px;">${category}</h3>`;
      
      grouped[category].forEach(insight => {
        const typeColors = {
          critical: '#d32f2f',
          warning: '#f57c00',
          info: '#1976d2',
          success: '#388e3c'
        };
        const typeIcons = {
          critical: '🔴',
          warning: '⚠️',
          info: 'ℹ️',
          success: '✅'
        };
        
        const color = typeColors[insight.type] || '#666';
        const icon = typeIcons[insight.type] || '•';
        
        html += `<div style="margin-bottom: 16px; padding: 16px; background: #f9f9f9; border-left: 4px solid ${color}; border-radius: 4px;">`;
        html += `<div style="font-weight: 600; color: ${color}; margin-bottom: 8px;">${icon} ${insight.message}</div>`;
        if (insight.detail) {
          html += `<div style="color: #666; font-size: 0.9em; line-height: 1.6;">${insight.detail}</div>`;
        }
        html += `</div>`;
      });
      
      html += `</div>`;
    });

    reportEl.innerHTML = html;
  } catch (error) {
    console.error('Error generating insights report:', error);
    reportEl.innerHTML = `<p style="color: #d32f2f;">エラー: 理解構造レポートの生成に失敗しました。${error.message}</p>`;
  }
}

/**
 * サマリーカードを更新（既存関数を保持）
 * @param {Object} dataset - データセットデータまたは統計データ
 */
function updateSummaryCards(dataset) {
  if (!dataset) {
    // データがない場合はデフォルト値を表示
    document.getElementById('summary-total-answers-value').textContent = '-';
    document.getElementById('summary-accuracy-value').textContent = '-';
    document.getElementById('summary-weakest-layer-value').textContent = '-';
    document.getElementById('summary-avg-response-time-value').textContent = '-';
    document.getElementById('summary-avg-path-length-value').textContent = '-';
    document.getElementById('summary-mistake-ranking-list').innerHTML = '<p style="color: #888;">データを選択してください</p>';
    document.getElementById('concept-score-table-container').innerHTML = '<p style="color: #888;">データを選択してください</p>';
    return;
  }

  // statsオブジェクトが渡された場合（loadSessionData経由）
  if (dataset.total !== undefined && dataset.accuracy !== undefined) {
    const stats = dataset;
    
    // 1. 総回答数
    document.getElementById('summary-total-answers-value').textContent = stats.total.toLocaleString();
    
    // 2. 平均正答率
    document.getElementById('summary-accuracy-value').textContent = `${(stats.accuracy * 100).toFixed(1)}%`;
    
    // 3. 最弱理解階層
    const weakest = findWeakestLevel(stats.conceptScore || {});
    document.getElementById('summary-weakest-layer-value').textContent = weakest;
    
    // 4. 平均反応時間（秒単位で表示）
    const rtMeanSec = stats.rtMean > 0 ? (stats.rtMean / 1000).toFixed(2) : 0;
    document.getElementById('summary-avg-response-time-value').textContent = rtMeanSec > 0 ? `${rtMeanSec}秒` : '-';
    
    // 5. 平均パス長
    document.getElementById('summary-avg-path-length-value').textContent = stats.avgPathLength > 0 
      ? stats.avgPathLength.toFixed(2) 
      : '-';
    
    // 6. 誤概念ランキング
    const mistakeListEl = document.getElementById('summary-mistake-ranking-list');
    if (stats.mistakes && stats.mistakes.length > 0) {
      mistakeListEl.innerHTML = stats.mistakes.slice(0, 5).map((mistake, index) => `
        <div class="card-list-item">
          <span class="card-list-label">${index + 1}. ${mistake.concept}</span>
          <span class="card-list-value">${mistake.incorrect}回</span>
        </div>
      `).join('');
    } else {
      mistakeListEl.innerHTML = '<p style="color: #888;">誤概念は見つかりませんでした</p>';
    }
    
    // 7. 概念スコアテーブル
    renderConceptScoreTable(stats);
    
    return;
  }

  // データセットオブジェクトが渡された場合（既存ロジック）
  // ログを取得
  let logs = [];
  if (dataset.logs && Array.isArray(dataset.logs)) {
    logs = dataset.logs;
  } else if (dataset.sessions && Array.isArray(dataset.sessions)) {
    dataset.sessions.forEach(session => {
      if (session.logs && Array.isArray(session.logs)) {
        logs = logs.concat(session.logs);
      }
    });
  }

  // データセットオブジェクトが渡された場合は、computeStatsを使用して統計を計算
  // 注意: loadSessionDataは既に呼ばれているので、ここでは直接計算する
  const stats = computeStats(logs);
  updateSummaryCards(stats);
}

// =============================
// 📘 理解構造レポート表示機能
// =============================
/**
 * 理解構造レポートを更新
 * @param {Object} dataset - データセットデータ
 */
async function updateInsightsReport(dataset) {
  const reportEl = document.getElementById('insights-report');
  if (!reportEl) return;

  if (!dataset) {
    reportEl.innerHTML = '<p style="color: #888;">データセットを選択すると、理解構造レポートが表示されます。</p>';
    return;
  }

  try {
    // ログを取得
    let logs = [];
    if (dataset.logs && Array.isArray(dataset.logs)) {
      logs = dataset.logs;
    } else if (dataset.sessions && Array.isArray(dataset.sessions)) {
      dataset.sessions.forEach(session => {
        if (session.logs && Array.isArray(session.logs)) {
          logs = logs.concat(session.logs);
        }
      });
    }

    if (logs.length === 0) {
      reportEl.innerHTML = '<p style="color: #888;">ログデータが見つかりません。</p>';
      return;
    }

    // 統計を計算
    const stats = computeStats(logs);
    
    // 洞察を生成
    const insights = generateInsights(stats);
    
    // レポートを表示
    if (insights.length === 0) {
      reportEl.innerHTML = '<p style="color: #888;">分析結果がありません。</p>';
      return;
    }

    // カテゴリ別にグループ化して表示
    const grouped = {};
    insights.forEach(insight => {
      if (typeof insight === 'object' && insight.category) {
        if (!grouped[insight.category]) {
          grouped[insight.category] = [];
        }
        grouped[insight.category].push(insight);
      }
    });

    let html = '';
    
    // カテゴリごとに表示
    Object.keys(grouped).forEach(category => {
      html += `<div style="margin-bottom: 30px;">`;
      html += `<h3 style="color: #333; border-bottom: 2px solid #ddd; padding-bottom: 8px; margin-bottom: 16px;">${category}</h3>`;
      
      grouped[category].forEach(insight => {
        const typeColors = {
          critical: '#d32f2f',
          warning: '#f57c00',
          info: '#1976d2',
          success: '#388e3c'
        };
        const typeIcons = {
          critical: '🔴',
          warning: '⚠️',
          info: 'ℹ️',
          success: '✅'
        };
        
        const color = typeColors[insight.type] || '#666';
        const icon = typeIcons[insight.type] || '•';
        
        html += `<div style="margin-bottom: 16px; padding: 16px; background: #f9f9f9; border-left: 4px solid ${color}; border-radius: 4px;">`;
        html += `<div style="font-weight: 600; color: ${color}; margin-bottom: 8px;">${icon} ${insight.message}</div>`;
        if (insight.detail) {
          html += `<div style="color: #666; font-size: 0.9em; line-height: 1.6;">${insight.detail}</div>`;
        }
        html += `</div>`;
      });
      
      html += `</div>`;
    });

    reportEl.innerHTML = html;
  } catch (error) {
    console.error('Error generating insights report:', error);
    reportEl.innerHTML = `<p style="color: #d32f2f;">エラー: 理解構造レポートの生成に失敗しました。${error.message}</p>`;
  }
}

/**
 * 最弱理解階層を特定（ヘルパー関数）
 * @param {Object} conceptScore - 概念別スコア
 * @returns {string} 最弱理解階層名
 */
function findWeakestLevel(conceptScore) {
  const levels = ['識別', '説明', '適用', '区別', '転移', '構造化'];
  let weakestLevel = 'データ不足';
  let minAccuracy = Infinity;

  Object.entries(conceptScore).forEach(([concept, data]) => {
    if (data.total > 0) {
      const accuracy = data.correct / data.total;
      if (accuracy < minAccuracy) {
        minAccuracy = accuracy;
        weakestLevel = concept;
      }
    }
  });

  return weakestLevel;
}

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initDatasetSelector(); // データセット選択UIを初期化（A1）
  initTabs();
  initAnalysisButton();
  
  // 反応時間分布分析ボタンのイベントハンドラ
  const runRtAnalysisBtn = document.getElementById('run-rt-analysis');
  if (runRtAnalysisBtn) {
    runRtAnalysisBtn.addEventListener('click', runReactionTimeAnalysis);
  }
});

