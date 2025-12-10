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

// 新規プロジェクト作成API
app.post("/admin-api/create-project", (req, res) => {
  const { folder, title, desc, tags } = req.body;

  if (!folder || !title) {
    return res.status(400).json({ error: "folder と title は必須です" });
  }

  const projectsBase = path.join(__dirname, "projects");
  const dir = path.join(projectsBase, folder);

  // 既に同名フォルダがあるかチェック
  if (fs.existsSync(dir)) {
    return res.status(400).json({ error: "既に同名フォルダがあります: " + folder });
  }

  try {
    // ディレクトリを作成
    fs.mkdirSync(dir, { recursive: true });

    // project.json を作成
    fs.writeFileSync(
      path.join(dir, "project.json"),
      JSON.stringify({
        project_id: folder,
        title: title,
        description: desc || "",
        tags: tags || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        access_mode: "public",
        pin_code: null
      }, null, 2) + "\n"
    );

    // quiz.json（空）を作成
    fs.writeFileSync(
      path.join(dir, "quiz.json"),
      JSON.stringify({
        version: 1,
        startNode: null,
        questions: [],
        results: []
      }, null, 2) + "\n"
    );

    // editor.json（空）を作成
    fs.writeFileSync(
      path.join(dir, "editor.json"),
      JSON.stringify({}, null, 2) + "\n"
    );

    // glossary.json（空）を作成
    fs.writeFileSync(
      path.join(dir, "glossary.json"),
      JSON.stringify({ terms: {} }, null, 2) + "\n"
    );

    console.log("✅ プロジェクトを作成しました:", folder);
    res.json({ ok: true, folder });
  } catch (error) {
    console.error("❌ プロジェクト作成エラー:", error);
    res.status(500).json({ error: "プロジェクトの作成に失敗しました: " + error.message });
  }
});

// index.json を再生成するAPI
app.get("/admin-api/generate-index", (req, res) => {
  try {
    const projectsBase = path.join(__dirname, "projects");
    const all = fs.readdirSync(projectsBase).filter(name => {
      const full = path.join(projectsBase, name);
      return fs.statSync(full).isDirectory();
    });
    const filtered = all.filter(n => !n.startsWith("_"));
    
    // index.json の形式: { projects: [{ id: "folder_name" }] }
    const indexData = {
      projects: filtered.map(id => ({ id }))
    };
    
    fs.writeFileSync(
      path.join(projectsBase, "index.json"),
      JSON.stringify(indexData, null, 2) + "\n"
    );
    
    console.log("✅ projects/index.json を再生成しました:", filtered.length, "件");
    res.json({ ok: true, list: filtered });
  } catch (error) {
    console.error("❌ index.json 生成エラー:", error);
    res.status(500).json({ error: "index.json の生成に失敗しました: " + error.message });
  }
});

// ============================================================
// プロジェクト管理API
// ============================================================

const PROJECT_ROOT = path.join(__dirname, "projects");

// ---- プロジェクト一覧 ----
app.get("/api/project/list", (req, res) => {
  try {
    if (!fs.existsSync(PROJECT_ROOT)) {
      return res.json([]);
    }

    const dirs = fs.readdirSync(PROJECT_ROOT)
      .filter(name => {
        const fullPath = path.join(PROJECT_ROOT, name);
        return fs.lstatSync(fullPath).isDirectory();
      });

    const results = dirs.map(id => {
      const file = path.join(PROJECT_ROOT, id, "project.json");
      if (fs.existsSync(file)) {
        try {
          const data = JSON.parse(fs.readFileSync(file, "utf8"));
          return { ...data, id };
        } catch (e) {
          console.warn(`Failed to parse project.json for ${id}:`, e);
          return { id, name: id };
        }
      }
      return { id, name: id };
    });

    res.json(results);
  } catch (error) {
    console.error("Error listing projects:", error);
    res.status(500).json({ error: "Failed to list projects: " + error.message });
  }
});

// ---- 新規プロジェクト作成（正式仕様 v1.0）----
app.post("/api/project/create", (req, res) => {
  try {
    const name = req.body.name;
    if (!name) {
      return res.status(400).json({ error: "Name required" });
    }

    const id = Date.now().toString();
    const projectPath = path.join(PROJECT_ROOT, id);

    if (!fs.existsSync(PROJECT_ROOT)) {
      fs.mkdirSync(PROJECT_ROOT, { recursive: true });
    }
    fs.mkdirSync(projectPath, { recursive: true });

    const now = new Date().toISOString();

    const json = {
      id,
      name,
      created_at: now,
      updated_at: now,
      version: 1,
      settings: {
        theme: "WSI",
        shuffle_questions: false,
        shuffle_choices: false,
        show_explanation: true
      },
      statistics: {
        total_questions: 0,
        last_edited_question: null
      },
      links: {
        quiz: "quiz.json",
        glossary: "glossary.json",
        concept_graph: "concept_graph.json"
      }
    };

    fs.writeFileSync(
      path.join(projectPath, "project.json"),
      JSON.stringify(json, null, 2) + "\n"
    );

    // 必要ファイルの初期化（v2.0仕様）
    // quiz.json は配列形式（v2.0）
    fs.writeFileSync(
      path.join(projectPath, "quiz.json"),
      JSON.stringify([], null, 2) + "\n"
    );
    fs.writeFileSync(
      path.join(projectPath, "glossary.json"),
      JSON.stringify({ version: 3, concepts: [] }, null, 2) + "\n"  // v3.0
    );
    fs.writeFileSync(
      path.join(projectPath, "concept_graph.json"),
      JSON.stringify({ nodes: [], edges: [] }, null, 2) + "\n"
    );

    console.log("✅ プロジェクトを作成しました:", id);
    res.json(json);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Failed to create project: " + error.message });
  }
});

// ---- プロジェクト読み込み ----
app.get("/api/project/:id/load", (req, res) => {
  try {
    const p = path.join(PROJECT_ROOT, req.params.id, "project.json");
    if (!fs.existsSync(p)) {
      return res.status(404).json({ error: "Not found" });
    }
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    res.json(data);
  } catch (error) {
    console.error("Error loading project:", error);
    res.status(500).json({ error: "Failed to load project: " + error.message });
  }
});

// ---- プロジェクト保存（メタ情報更新）----
app.post("/api/project/:id/save", (req, res) => {
  try {
    const p = path.join(PROJECT_ROOT, req.params.id, "project.json");
    if (!fs.existsSync(p)) {
      return res.status(404).json({ error: "Not found" });
    }

    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    data.updated_at = new Date().toISOString();
    
    // リクエストボディのデータで更新（もしあれば）
    if (req.body) {
      Object.assign(data, req.body);
    }

    fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
    res.json({ ok: true });
  } catch (error) {
    console.error("Error saving project:", error);
    res.status(500).json({ error: "Failed to save project: " + error.message });
  }
});

// ============================================================
// Quiz.json API (v2.0 構造)
// ============================================================

// ---- quiz.json を読む（v2.0 構造前提）----
app.get("/api/project/:projectId/quiz", (req, res) => {
  try {
    const id = req.params.projectId;
    const p = path.join(PROJECT_ROOT, id, "quiz.json");
    if (!fs.existsSync(p)) {
      return res.json([]);
    }
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    res.json(data);
  } catch (error) {
    console.error("Error loading quiz:", error);
    res.status(500).json({ error: "Failed to load quiz: " + error.message });
  }
});

// ---- quiz.json を保存（v2.0 構造強制）----
app.post("/api/project/:projectId/quiz/save", (req, res) => {
  try {
    const id = req.params.projectId;
    const p = path.join(PROJECT_ROOT, id, "quiz.json");

    const data = req.body;

    // v2.0 構造強制
    const now = new Date().toISOString();
    if (Array.isArray(data)) {
      data.forEach(q => {
        q.meta = q.meta || {};
        q.meta.updated_at = now;
        q.measure = q.measure || {
          "識別": 0,
          "説明": 0,
          "適用": 0,
          "区別": 0,
          "転移": 0,
          "構造化": 0
        };

        // choice tags の構造保証
        if (Array.isArray(q.choices)) {
          q.choices.forEach(c => {
            if (!Array.isArray(c.tags)) c.tags = [];
          });
        }
      });
    }

    fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
    res.json({ ok: true });
  } catch (error) {
    console.error("Error saving quiz:", error);
    res.status(500).json({ error: "Failed to save quiz: " + error.message });
  }
});

// ============================================================
// Glossary.json API (v3.0 構造)
// ============================================================

// ---- glossary.json 読み取り（v3.0 構造前提）----
app.get("/api/project/:projectId/glossary", (req, res) => {
  try {
    const id = req.params.projectId;
    const p = path.join(PROJECT_ROOT, id, "glossary.json");
    if (!fs.existsSync(p)) {
      return res.json({ version: 3, concepts: [] });
    }

    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    // version が無ければ v3 とみなす
    if (!data.version) {
      data.version = 3;
    }

    res.json(data);
  } catch (error) {
    console.error("Error loading glossary:", error);
    res.status(500).json({ error: "Failed to load glossary: " + error.message });
  }
});

// ---- glossary.json 保存（v3.0 構造強制）----
app.post("/api/project/:projectId/glossary/save", (req, res) => {
  try {
    const id = req.params.projectId;
    const p = path.join(PROJECT_ROOT, id, "glossary.json");

    const data = req.body;

    // 必須構造を保証（v3.0）
    data.version = 3;
    data.concepts = data.concepts || [];

    data.concepts.forEach(c => {
      c.tags = c.tags || [];
      c.level = c.level || {
        "識別": 0,
        "説明": 0,
        "適用": 0,
        "区別": 0,
        "転移": 0,
        "構造化": 0
      };
      c.metacog = c.metacog || {
        metacognition_level: 0,
        tom_level: 0
      };
      c.relations = c.relations || {
        prerequisites: [],
        related: []
      };
      c.misconceptions = c.misconceptions || [];
    });

    fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
    res.json({ ok: true });
  } catch (error) {
    console.error("Error saving glossary:", error);
    res.status(500).json({ error: "Failed to save glossary: " + error.message });
  }
});

// ============================================================
// 開発用API: 既存project.jsonの補完
// ============================================================

// ---- 既存プロジェクトの補完API ----
app.post("/api/dev/repair-project-json", (req, res) => {
  try {
    if (!fs.existsSync(PROJECT_ROOT)) {
      return res.json({ ok: true, message: "projects フォルダなし" });
    }

    const dirs = fs.readdirSync(PROJECT_ROOT);
    let repairedCount = 0;

    dirs.forEach(dir => {
      const projectPath = path.join(PROJECT_ROOT, dir);
      if (!fs.lstatSync(projectPath).isDirectory()) return;

      const pj = path.join(projectPath, "project.json");
      if (!fs.existsSync(pj)) return;

      try {
        const data = JSON.parse(fs.readFileSync(pj, "utf8"));
        let updated = false;

        // 補完処理
        if (!data.settings) {
          data.settings = {
            theme: "WSI",
            shuffle_questions: false,
            shuffle_choices: false,
            show_explanation: true
          };
          updated = true;
        }

        if (!data.statistics) {
          data.statistics = {
            total_questions: 0,
            last_edited_question: null
          };
          updated = true;
        }

        if (!data.links) {
          data.links = {
            quiz: "quiz.json",
            glossary: "glossary.json",
            concept_graph: "concept_graph.json"
          };
          updated = true;
        }

        if (updated) {
          // updated_at を更新
          data.updated_at = data.updated_at || new Date().toISOString();
          fs.writeFileSync(pj, JSON.stringify(data, null, 2) + "\n");
          console.log(`✨ project.json repaired: ${dir}`);
          repairedCount++;
        }
      } catch (e) {
        console.warn(`Failed to repair project.json for ${dir}:`, e.message);
      }
    });

    res.json({
      ok: true,
      message: "Project.json repair complete",
      repairedCount
    });
  } catch (error) {
    console.error("Error repairing project.json files:", error);
    res.status(500).json({ error: "Failed to repair project.json files: " + error.message });
  }
});

// ============================================================
// 開発用API: glossary.json 自動アップグレード（v3.0）
// ============================================================

// ---- glossary.json 自動アップグレード API ----
app.post("/api/dev/repair-glossary-json", (req, res) => {
  try {
    if (!fs.existsSync(PROJECT_ROOT)) {
      return res.json({ ok: true });
    }

    const dirs = fs.readdirSync(PROJECT_ROOT);
    let upgradedCount = 0;

    dirs.forEach(dir => {
      const folder = path.join(PROJECT_ROOT, dir);
      if (!fs.lstatSync(folder).isDirectory()) return;

      const file = path.join(folder, "glossary.json");
      if (!fs.existsSync(file)) return;

      try {
        const data = JSON.parse(fs.readFileSync(file, "utf8"));
        let updated = false;

        if (!data.version) {
          data.version = 3;
          updated = true;
        }

        data.concepts = data.concepts || [];
        data.concepts.forEach(c => {
          if (!c.level) {
            c.level = {
              "識別": 0,
              "説明": 0,
              "適用": 0,
              "区別": 0,
              "転移": 0,
              "構造化": 0
            };
            updated = true;
          }

          if (!c.metacog) {
            c.metacog = {
              metacognition_level: 0,
              tom_level: 0
            };
            updated = true;
          }

          if (!c.relations) {
            c.relations = {
              prerequisites: [],
              related: []
            };
            updated = true;
          }

          if (!c.misconceptions) {
            c.misconceptions = [];
            updated = true;
          }

          if (!Array.isArray(c.tags)) {
            c.tags = [];
            updated = true;
          }
        });

        if (updated) {
          fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
          console.log(`✨ glossary.json upgraded to v3: ${dir}`);
          upgradedCount++;
        }
      } catch (e) {
        console.warn(`Failed to upgrade glossary.json for ${dir}:`, e.message);
      }
    });

    res.json({
      ok: true,
      message: "Glossary.json upgrade complete",
      upgradedCount
    });
  } catch (error) {
    console.error("Error upgrading glossary.json files:", error);
    res.status(500).json({ error: "Failed to upgrade glossary.json files: " + error.message });
  }
});

// ============================================================
// 開発用API: quiz.json 自動修復（既存v1→v2移行）
// ============================================================

// ---- quiz.json 自動修復 API ----
app.post("/api/dev/repair-quiz-json", (req, res) => {
  try {
    if (!fs.existsSync(PROJECT_ROOT)) {
      return res.json({ ok: true });
    }

    const dirs = fs.readdirSync(PROJECT_ROOT);
    let repairedCount = 0;

    dirs.forEach(dir => {
      const projectPath = path.join(PROJECT_ROOT, dir);
      if (!fs.lstatSync(projectPath).isDirectory()) return;

      const qp = path.join(projectPath, "quiz.json");
      if (!fs.existsSync(qp)) return;

      try {
        const arr = JSON.parse(fs.readFileSync(qp, "utf8"));
        let updated = false;

        // 配列でない場合はスキップ（v2.0は配列形式）
        if (!Array.isArray(arr)) return;

        arr.forEach(q => {
          if (!q.measure) {
            q.measure = {
              "識別": 0,
              "説明": 0,
              "適用": 0,
              "区別": 0,
              "転移": 0,
              "構造化": 0
            };
            updated = true;
          }

          if (!q.meta) {
            q.meta = { created_at: "", updated_at: "" };
            updated = true;
          }

          // choice tags guarantee
          if (Array.isArray(q.choices)) {
            q.choices.forEach(c => {
              if (!Array.isArray(c.tags)) {
                c.tags = [];
                updated = true;
              }
            });
          }
        });

        if (updated) {
          fs.writeFileSync(qp, JSON.stringify(arr, null, 2) + "\n");
          console.log("✨ quiz.json repaired: " + dir);
          repairedCount++;
        }
      } catch (e) {
        console.warn(`Failed to repair quiz.json for ${dir}:`, e.message);
      }
    });

    res.json({
      ok: true,
      message: "Quiz.json repair complete",
      repairedCount
    });
  } catch (error) {
    console.error("Error repairing quiz.json files:", error);
    res.status(500).json({ error: "Failed to repair quiz.json files: " + error.message });
  }
});

// ============================================================
// 開発用API: 旧構造削除＋必要ファイル自動生成
// ============================================================

// ---- 旧構造完全削除＋新構造揃えるAPI ----
app.post("/api/dev/clean-all-legacy", (req, res) => {
  try {
    const root = path.join(__dirname, "projects");

    if (!fs.existsSync(root)) {
      return res.json({ ok: true, message: "projects フォルダなし" });
    }

    const dirs = fs.readdirSync(root);
    let removedFolders = 0;
    let removedFiles = 0;
    let createdFiles = 0;

    dirs.forEach(dir => {
      const projectPath = path.join(root, dir);
      if (!fs.lstatSync(projectPath).isDirectory()) return;

      const files = fs.readdirSync(projectPath);

      // ----------------------------------------------------
      // ① project.json が無い → このフォルダは無効 → 全削除
      // ----------------------------------------------------
      if (!files.includes("project.json")) {
        fs.rmSync(projectPath, { recursive: true, force: true });
        console.log(`🗑 Removed legacy folder (no project.json): ${dir}`);
        removedFolders++;
        return;
      }

      // ----------------------------------------------------
      // ② 不要ファイルを削除（旧仕様）
      // ----------------------------------------------------
      const legacyFiles = [
        "data.json",
        "quiz_data.json",
        "meta.txt",
        "old_project.json",
        "config.txt",
        "old_quiz.json"
      ];

      legacyFiles.forEach(f => {
        const fp = path.join(projectPath, f);
        if (fs.existsSync(fp)) {
          fs.unlinkSync(fp);
          console.log(`🗑 Removed legacy file: ${dir}/${f}`);
          removedFiles++;
        }
      });

      // ----------------------------------------------------
      // ③ 新仕様の必要ファイルを自動生成（なければ作る）
      // ----------------------------------------------------
      const requiredFiles = {
        "quiz.json": JSON.stringify([], null, 2) + "\n",  // v2.0: 配列形式
        "glossary.json": JSON.stringify({ version: 3, concepts: [] }, null, 2) + "\n",  // v3.0
        "concept_graph.json": JSON.stringify({ nodes: [], edges: [] }, null, 2) + "\n"
      };

      Object.entries(requiredFiles).forEach(([file, defaultValue]) => {
        const fp = path.join(projectPath, file);
        if (!fs.existsSync(fp)) {
          fs.writeFileSync(fp, defaultValue);
          console.log(`✨ Created missing file: ${dir}/${file}`);
          createdFiles++;
        }
      });
    });

    res.json({
      ok: true,
      message: "Legacy cleanup complete + new files ensured",
      stats: {
        removedFolders,
        removedFiles,
        createdFiles
      }
    });
  } catch (error) {
    console.error("Error cleaning legacy files:", error);
    res.status(500).json({ error: "Failed to clean legacy files: " + error.message });
  }
});

// ルートパス
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

