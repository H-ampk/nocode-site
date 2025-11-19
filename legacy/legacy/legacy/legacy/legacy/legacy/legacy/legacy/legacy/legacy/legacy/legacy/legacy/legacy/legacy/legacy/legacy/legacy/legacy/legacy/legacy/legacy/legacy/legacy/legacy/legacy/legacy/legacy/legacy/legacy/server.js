const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// 静的ファイルの提供
app.use(express.static('public'));
app.use('/students', express.static('students'));
app.use('/analysis', express.static('analysis'));

// JSONパーサー
app.use(express.json());

// 📤 分析トリガー：指定された student_xxx.csv を analysis/input/ にコピー
app.post("/trigger_analysis", express.json(), (req, res) => {
  const file = req.body.file;
  const src = path.join(__dirname, "students", file);
  const dst = path.join(__dirname, "analysis/input", file);
  
  // analysis/input ディレクトリが存在しない場合は作成
  const inputDir = path.dirname(dst);
  if (!fs.existsSync(inputDir)) {
    fs.mkdirSync(inputDir, { recursive: true });
  }
  
  // ファイルをコピー
  try {
    fs.copyFileSync(src, dst);
    res.json({ status: "queued" });
  } catch (error) {
    console.error("Error copying file:", error);
    res.status(500).json({ error: "Failed to copy file" });
  }
});

// 📥 Julia による解析結果チェック
app.get("/analysis_status", (req, res) => {
  const resultsDir = path.join(__dirname, "analysis/results");
  
  // results ディレクトリが存在しない場合は作成
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
    return res.json({ ready: false });
  }
  
  try {
    const files = fs.readdirSync(resultsDir);
    const pngFiles = files.filter(f => f.endsWith('.png'));
    
    if (pngFiles.length === 0) {
      return res.json({ ready: false });
    }
    
    // 最新のファイルを取得（更新日時順）
    const filesWithStats = pngFiles.map(f => ({
      name: f,
      mtime: fs.statSync(path.join(resultsDir, f)).mtime
    })).sort((a, b) => b.mtime - a.mtime);
    
    const latest = filesWithStats[0].name;
    res.json({ ready: true, file: latest });
  } catch (error) {
    console.error("Error checking analysis status:", error);
    res.status(500).json({ error: "Failed to check status" });
  }
});

// 生徒ファイル一覧
app.get('/api/student-files', (req, res) => {
  const studentsDir = path.join(__dirname, 'students');
  
  if (!fs.existsSync(studentsDir)) {
    return res.json([]);
  }
  
  try {
    const files = fs.readdirSync(studentsDir).filter(f => f.endsWith('.json') && f !== 'index.json');
    res.json(files);
  } catch (error) {
    console.error("Error reading student files:", error);
    res.status(500).json({ error: "Failed to read student files" });
  }
});

// Julia 分析実行エンドポイント
app.get('/api/run-analysis', (req, res) => {
  const { exec } = require('child_process');
  const file = req.query.file;

  if (!file) {
    return res.status(400).json({ error: "file parameter is required" });
  }

  // students/ フォルダからファイルを読み込む（folder/file または file の形式に対応）
  const studentFile = path.join(__dirname, 'students', file);
  
  if (!fs.existsSync(studentFile)) {
    return res.status(404).json({ error: `ファイルが見つかりません: ${file}` });
  }

  try {
    // ファイルを読み込んでJuliaスクリプトに渡す
    const cmd = `julia analysis/run_analysis.jl ${studentFile}`;
    console.log("Running:", cmd);

    exec(cmd, { timeout: 15000, cwd: __dirname }, (err, stdout, stderr) => {
      if (err) {
        console.error("Julia execution error:", err);
        return res.json({ error: stderr || err.message });
      }
      try {
        res.json(JSON.parse(stdout));
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        res.json({ raw: stdout });
      }
    });
  } catch (error) {
    console.error("Error reading file:", error);
    res.status(500).json({ error: `ファイルの読み込みに失敗しました: ${error.message}` });
  }
});

// 反応時間分布分析エンドポイント
app.post('/analyze/reaction-time', express.json(), (req, res) => {
  const studentData = req.body;
  
  if (!studentData) {
    return res.status(400).json({ error: 'データが提供されていません' });
  }
  
  const inputFile = path.join(__dirname, 'analysis', 'input_rt.json');
  const outputJsonFile = path.join(__dirname, 'analysis', 'rt_result.json');
  const outputPlotFile = path.join(__dirname, 'analysis', 'rt_plot.png');
  
  // analysis ディレクトリが存在しない場合は作成
  const analysisDir = path.dirname(inputFile);
  if (!fs.existsSync(analysisDir)) {
    fs.mkdirSync(analysisDir, { recursive: true });
  }
  
  try {
    // 入力JSONを一時ファイルに保存
    fs.writeFileSync(inputFile, JSON.stringify(studentData, null, 2));
    
    // Juliaスクリプトを実行
    const julia = spawn('julia', [
      path.join(__dirname, 'analysis', 'reaction_time.jl'),
      inputFile,
      outputJsonFile
    ], {
      cwd: __dirname,
      timeout: 30000 // 30秒タイムアウト
    });
    
    let stdout = '';
    let stderr = '';
    
    julia.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    julia.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    julia.on('close', (code) => {
      if (code !== 0) {
        console.error('Julia execution error:', stderr);
        return res.status(500).json({ error: `Julia実行エラー: ${stderr || 'Unknown error'}` });
      }
      
      try {
        // 結果JSONを読み込む
        if (!fs.existsSync(outputJsonFile)) {
          return res.status(500).json({ error: '結果ファイルが生成されませんでした' });
        }
        
        const resultJson = JSON.parse(fs.readFileSync(outputJsonFile, 'utf8'));
        
        // プロット画像をBase64で読み込む
        let plotImageBase64 = null;
        if (fs.existsSync(outputPlotFile)) {
          const plotBuffer = fs.readFileSync(outputPlotFile);
          plotImageBase64 = plotBuffer.toString('base64');
        }
        
        // 結果を返す
        res.json({
          ...resultJson,
          plotImage: plotImageBase64
        });
        
      } catch (error) {
        console.error('Error reading results:', error);
        res.status(500).json({ error: `結果の読み込みに失敗しました: ${error.message}` });
      }
    });
    
    julia.on('error', (error) => {
      console.error('Failed to start Julia process:', error);
      res.status(500).json({ error: `Juliaプロセスの起動に失敗しました: ${error.message}` });
    });
    
  } catch (error) {
    console.error('Error in reaction time analysis:', error);
    res.status(500).json({ error: `分析処理中にエラーが発生しました: ${error.message}` });
  }
});

// ルートパス
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

