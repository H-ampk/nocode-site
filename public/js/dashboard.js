// Dashboard JavaScript

// 🔍 Dashboard：分析リクエスト（サーバ側へ student_xxx.csv のパスを送る）
async function requestAnalysis(studentFile) {
  await fetch("/trigger_analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file: studentFile })
  });
}

// =============================
// 📊 分析タブ：学生ファイル読込
// =============================
function loadStudentFilesForAnalysis() {
  fetch("/students/index.json")
    .then(res => res.json())
    .then(data => {
      const sel = document.getElementById("analysis-student-file");
      sel.innerHTML = "";
      
      // datasets配列からファイル名を取得
      if (data.datasets && Array.isArray(data.datasets)) {
        data.datasets.forEach(dataset => {
          const opt = document.createElement("option");
          opt.value = dataset.file;
          opt.textContent = `${dataset.dataset_name} (${dataset.type})`;
          sel.appendChild(opt);
        });
      }
    })
    .catch(error => {
      console.error("Error loading student files:", error);
      const sel = document.getElementById("analysis-student-file");
      sel.innerHTML = '<option value="">ファイルの読み込みに失敗しました</option>';
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

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initAnalysisButton();
  
  // 反応時間分布分析ボタンのイベントハンドラ
  const runRtAnalysisBtn = document.getElementById('run-rt-analysis');
  if (runRtAnalysisBtn) {
    runRtAnalysisBtn.addEventListener('click', runReactionTimeAnalysis);
  }
});

