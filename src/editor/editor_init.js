/**
 * Editor 初期化モジュール
 * 
 * 初期化フローを一本化し、確実に実行されるようにする
 * 
 * 初期化順序:
 * 1. DOMロード確認
 * 2. Glossary のロード
 * 3. Config のロード
 * 4. Project のロード（localStorage or URL）
 * 5. 初期UI更新（updateUI）
 * 6. ノード関連イベント設定
 * 7. 保存・読み込み・エクスポートイベント設定
 */

(function() {
    'use strict';
    
    console.log("⭐ editor_init.js loaded");
    
    // 初期化状態を管理
    const initState = {
        domReady: false,
        glossaryLoaded: false,
        configLoaded: false,
        projectLoaded: false,
        uiUpdated: false,
        eventsBound: false
    };
    
    // 初期化完了フラグ
    let initComplete = false;
    
    /**
     * 初期化の各段階を実行
     */
    async function initEditor() {
        console.log("⭐ Editor initialization started");
        
        try {
            // ① DOMロード確認
            if (!initState.domReady) {
                console.log("⭐ Step 1: DOM ready check");
                if (document.readyState === 'loading') {
                    await new Promise(resolve => {
                        if (document.readyState === 'loading') {
                            document.addEventListener('DOMContentLoaded', resolve);
                        } else {
                            resolve();
                        }
                    });
                }
                initState.domReady = true;
                console.log("⭐ Step 1: DOM ready ✓");
            }
            
            // ② Glossary のロード
            if (!initState.glossaryLoaded) {
                console.log("⭐ Step 2: Loading Glossary");
                await loadGlossary();
                initState.glossaryLoaded = true;
                console.log("⭐ Step 2: Glossary loaded ✓");
            }
            
            // ③ Config のロード（必要に応じて）
            if (!initState.configLoaded) {
                console.log("⭐ Step 3: Loading Config");
                // config.js は既に読み込まれている前提
                initState.configLoaded = true;
                console.log("⭐ Step 3: Config loaded ✓");
            }
            
            // ④ Project のロード
            if (!initState.projectLoaded) {
                console.log("⭐ Step 4: Loading Project");
                await loadProject();
                initState.projectLoaded = true;
                console.log("⭐ Step 4: Project loaded ✓");
            }
            
            // ⑤ 初期UI更新
            if (!initState.uiUpdated) {
                console.log("⭐ Step 5: Updating UI");
                // テンプレートボタンは削除され、本棚UIに統合されました
                // if (typeof createTemplateButtons === 'function') {
                //     try {
                //         createTemplateButtons();
                //         console.log("⭐ Template buttons created");
                //     } catch (e) {
                //         console.error("⭐ Error creating template buttons:", e);
                //     }
                // }
                
                // window.Editor経由でupdateUIを呼び出す
                if (window.Editor && typeof window.Editor.updateUI === 'function') {
                    try {
                        window.Editor.updateUI();
                        console.log("⭐ UI updated");
                    } catch (e) {
                        console.error("⭐ Error updating UI:", e);
                    }
                } else if (typeof window.updateUI === 'function') {
                    // フォールバック
                    try {
                        window.updateUI();
                        console.log("⭐ UI updated (fallback)");
                    } catch (e) {
                        console.error("⭐ Error updating UI:", e);
                    }
                }
                initState.uiUpdated = true;
                console.log("⭐ Step 5: UI updated ✓");
            }
            
            // ⑥ ノード関連イベント設定（必要に応じて）
            console.log("⭐ Step 6: Node events (handled by editor.js)");
            
            // ⑦ 保存・読み込み・エクスポートイベント設定
            if (!initState.eventsBound) {
                console.log("⭐ Step 7: Binding editor events");
                bindEditorEvents();
                initState.eventsBound = true;
                console.log("⭐ Step 7: Events bound ✓");
            }
            
            initComplete = true;
            console.log("⭐ Editor initialization completed successfully");
            
        } catch (error) {
            console.error("⭐ Editor initialization failed:", error);
            // エラーが発生しても最低限のイベント登録は実行
            if (!initState.eventsBound) {
                console.log("⭐ Attempting to bind events despite error");
                bindEditorEvents();
            }
        }
    }
    
    /**
     * Glossary を読み込む
     */
    function loadGlossary() {
        return new Promise((resolve, reject) => {
            console.log("⭐ Loading Glossary...");
            
            // GlossaryLoader が読み込まれているか確認
            if (typeof GlossaryLoader === 'undefined') {
                console.warn("⭐ GlossaryLoader not found, retrying...");
                let retries = 0;
                const checkGlossaryLoader = setInterval(() => {
                    retries++;
                    if (typeof GlossaryLoader !== 'undefined') {
                        clearInterval(checkGlossaryLoader);
                        loadGlossaryData().then(resolve).catch(reject);
                    } else if (retries > 50) { // 5秒待機
                        clearInterval(checkGlossaryLoader);
                        console.warn("⭐ GlossaryLoader not found after retries, using empty glossary");
                        window.currentGlossary = { terms: {} };
                        resolve();
                    }
                }, 100);
            } else {
                loadGlossaryData().then(resolve).catch(reject);
            }
        });
    }
    
    /**
     * Glossary データを実際に読み込む
     */
    function loadGlossaryData() {
        return new Promise((resolve, reject) => {
            const projectId = localStorage.getItem('projectId') || 'default';
            console.log("⭐ Loading Glossary for projectId:", projectId);
            
            Promise.all([
                GlossaryLoader.loadProjectGlossary(projectId, { admin: true }),
                GlossaryLoader.loadGlobalGlossary({ admin: true })
            ]).then(function(results) {
                const projectGlossary = results[0];
                const globalGlossary = results[1];
                
                // GlossaryLoader.mergeGlossaries を使って統合
                const merged = GlossaryLoader.mergeGlossaries([globalGlossary, projectGlossary]);
                
                // terms をオブジェクト形式に変換
                let terms = {};
                if (merged.terms) {
                    if (Array.isArray(merged.terms)) {
                        merged.terms.forEach(function(term) {
                            if (term && term.id) {
                                terms[term.id] = term;
                            }
                        });
                    } else if (typeof merged.terms === 'object') {
                        terms = merged.terms;
                    }
                }
                
                // window.currentGlossary に設定
                const glossaryData = { terms: terms };
                if (typeof updateGlossaryFromData === 'function') {
                    updateGlossaryFromData(glossaryData);
                } else {
                    window.currentGlossary = glossaryData;
                }
                
                // localStorage に保存
                try {
                    localStorage.setItem('currentGlossary', JSON.stringify(glossaryData));
                } catch (e) {
                    console.warn("⭐ Failed to save glossary to localStorage:", e);
                }
                
                console.log("⭐ Glossary loaded successfully:", Object.keys(terms).length + " terms");
                resolve();
            }).catch(function(error) {
                console.error("⭐ Glossary load failed:", error);
                // エラーが発生しても空のGlossaryを設定して続行
                window.currentGlossary = { terms: {} };
                resolve(); // エラーでも続行
            });
        });
    }
    
    /**
     * GameData を読み込む（project.json + quiz.json を統合）
     */
    async function loadGameData(projectId) {
        console.log("⭐ loadGameData:", projectId);
        const base = `../../projects/${projectId}`;
        
        try {
            // project.json を読み込む
            const projectRes = await fetch(`${base}/project.json`);
            if (!projectRes.ok) {
                throw new Error(`project.json not found: ${projectRes.status}`);
            }
            const projectJson = await projectRes.json();
            console.log("⭐ project.json loaded:", projectJson);
            
            // quiz.json を読み込む（存在しない場合は fallback）
            let quizJson = {};
            try {
                const quizRes = await fetch(`${base}/quiz.json`);
                if (quizRes.ok) {
                    quizJson = await quizRes.json();
                    console.log("⭐ quiz.json loaded:", quizJson);
                } else {
                    console.warn("⚠️ quiz.json が存在しないため fallback データを使用します");
                    quizJson = {
                        questions: [],
                        results: [],
                        startNode: null
                    };
                }
            } catch (quizError) {
                console.warn("⚠️ quiz.json の読み込みに失敗しました:", quizError.message);
                quizJson = {
                    questions: [],
                    results: [],
                    startNode: null
                };
            }
            
            // window.gameData を生成
            window.gameData = {
                questions: quizJson.questions || [],
                results: quizJson.results || [],
                startNode: quizJson.startNode || null,
                meta: projectJson,
                // project.json のメタデータも直接統合
                title: projectJson.title || "",
                description: projectJson.description || "",
                tags: projectJson.tags || [],
                category: projectJson.category || "",
                thumbnail: projectJson.thumbnail || null
            };
            
            // window.Editor があれば setGameData も呼び出す
            if (window.Editor && typeof window.Editor.setGameData === 'function') {
                window.Editor.setGameData(window.gameData);
                console.log("⭐ gameData set via window.Editor");
            }
            
            console.log("✨ gameData loaded:", window.gameData);
            return window.gameData;
        } catch (error) {
            console.error("❌ loadGameData error:", error);
            // fallback データを生成
            window.gameData = {
                questions: [],
                results: [],
                startNode: null,
                meta: {},
                title: "",
                description: "",
                tags: [],
                category: "",
                thumbnail: null
            };
            
            if (window.Editor && typeof window.Editor.setGameData === 'function') {
                window.Editor.setGameData(window.gameData);
            }
            
            console.warn("⚠️ Using fallback gameData");
            return window.gameData;
        }
    }
    
    /**
     * Project を読み込む
     */
    async function loadProject() {
        console.log("⭐ Loading Project...");
        
        const params = new URLSearchParams(window.location.search);
        // project_id と projectId の両方に対応
        const projectId = params.get("project_id") || params.get("projectId");
        
        // window.projectId にも設定（editor_main.js から参照可能にする）
        if (projectId) {
            window.projectId = projectId;
            console.log("🟦 editor_init: project_id =", projectId);
        } else {
            console.warn("⚠️ editor_init: URL に project_id が指定されていません");
        }
        
        if (projectId) {
            console.log("⭐ Loading project from ID:", projectId);
            
            // loadGameData で gameData を読み込む（必須）
            try {
                await loadGameData(projectId);
                console.log("⭐ gameData loaded successfully");
                
                // window.Editor があれば updateUI を呼び出してノードリストを更新
                if (window.Editor && typeof window.Editor.updateUI === 'function') {
                    window.Editor.updateUI();
                    console.log("⭐ UI updated after gameData load");
                } else if (typeof window.updateUI === 'function') {
                    window.updateUI();
                    console.log("⭐ UI updated (fallback)");
                } else {
                    // updateNodeList を直接呼び出す
                    if (window.Editor && typeof window.Editor.updateNodeList === 'function') {
                        window.Editor.updateNodeList();
                        console.log("⭐ Node list updated");
                    }
                }
            } catch (e) {
                console.error("⭐ Error loading gameData:", e);
            }
        } else if (params.get("mode") === "edit") {
            console.log("⭐ Loading project from localStorage (mode=edit)");
            const raw = localStorage.getItem("editor_current_project");
            if (raw) {
                try {
                    const data = JSON.parse(raw);
                    if (data && typeof data === 'object') {
                        // Ensure tags, category, thumbnail exists
                        if (!data.tags) data.tags = [];
                        if (!data.category) data.category = "";
                        if (!data.thumbnail) data.thumbnail = null;
                        
                        // gameData にロード（window.Editor経由で安全にアクセス）
                        if (data.questions) {
                            if (window.Editor && typeof window.Editor.normalizeGameData === 'function') {
                                const normalized = window.Editor.normalizeGameData(data);
                                window.Editor.setGameData(normalized);
                                if (typeof window.Editor.updateUI === 'function') {
                                    window.Editor.updateUI();
                                }
                                console.log("⭐ Project loaded from localStorage");
                            } else if (typeof window.getGameData === 'function' && typeof window.normalizeGameData === 'function') {
                                // フォールバック: window経由の関数を使用
                                const normalized = window.normalizeGameData(data);
                                window.setGameData(normalized);
                                if (typeof window.updateUI === 'function') {
                                    window.updateUI();
                                }
                                console.log("⭐ Project loaded from localStorage (fallback)");
                            } else if (typeof window.loadProjectData === "function") {
                                window.loadProjectData(data);
                            } else if (typeof window.loadEditorFromData === "function") {
                                window.loadEditorFromData(data);
                            } else {
                                console.warn("⭐ Editor API not available");
                            }
                        } else if (typeof window.loadProjectData === "function") {
                            window.loadProjectData(data);
                        } else if (typeof window.loadEditorFromData === "function") {
                            window.loadEditorFromData(data);
                        }
                    }
                } catch (e) {
                    console.error("⭐ Error loading from localStorage:", e);
                }
            } else {
                console.log("⭐ No editor_current_project found in localStorage");
            }
        } else {
            console.log("⭐ No projectId or mode=edit parameter, starting with empty project");
        }
    }
    
    /**
     * Editor イベントをバインド
     */
    function bindEditorEvents() {
        console.log("⭐ Binding editor events...");
        
        // 関数の存在確認
        const requiredFunctions = {
            'addQuestion': typeof addQuestion !== 'undefined' ? addQuestion : null,
            'addDiagnosticQuestion': typeof addDiagnosticQuestion !== 'undefined' ? addDiagnosticQuestion : null,
            'addResult': typeof addResult !== 'undefined' ? addResult : null,
            'saveProjectAs': typeof window.saveProjectAs !== 'undefined' ? window.saveProjectAs : null,
            'saveQuiz': typeof saveQuiz !== 'undefined' ? saveQuiz : null,
            'openProjectShelf': typeof window.openProjectShelf !== 'undefined' ? window.openProjectShelf : null,
            'closeProjectShelf': typeof window.closeProjectShelf !== 'undefined' ? window.closeProjectShelf : null,
            'exportCSV': typeof exportCSV !== 'undefined' ? exportCSV : null,
            'exportHTML': typeof exportHTML !== 'undefined' ? exportHTML : null,
            'previewGame': typeof previewGame !== 'undefined' ? previewGame : null,
            'handleFileLoad': typeof handleFileLoad !== 'undefined' ? handleFileLoad : null
        };
        
        for (const [name, func] of Object.entries(requiredFunctions)) {
            if (func === null) {
                console.warn(`⭐ WARNING: Function ${name} is not defined!`);
            } else {
                console.log(`⭐ Function ${name} is available`);
            }
        }
        
        // ボタンとイベントのマッピング
        const buttonEvents = [
            { id: 'btn-add-question', func: requiredFunctions.addQuestion, name: 'addQuestion' },
            { id: 'btn-add-diagnostic-question', func: requiredFunctions.addDiagnosticQuestion, name: 'addDiagnosticQuestion' },
            { id: 'btn-add-result', func: requiredFunctions.addResult, name: 'addResult' },
            { id: 'btn-save-project', func: requiredFunctions.saveProjectAs, name: 'saveProjectAs' },
            { id: 'saveQuizButton', func: requiredFunctions.saveQuiz, name: 'saveQuiz' },
            { id: 'btn-open-project-shelf', func: requiredFunctions.openProjectShelf, name: 'openProjectShelf' },
            { id: 'btn-close-project-shelf', func: requiredFunctions.closeProjectShelf, name: 'closeProjectShelf' },
            { id: 'btn-export-csv', func: requiredFunctions.exportCSV, name: 'exportCSV' },
            { id: 'btn-export-html', func: requiredFunctions.exportHTML, name: 'exportHTML' },
            { id: 'btn-preview-game', func: requiredFunctions.previewGame, name: 'previewGame' }
        ];
        
        // 各ボタンにイベントリスナーを登録
        buttonEvents.forEach(({ id, func, name }) => {
            const button = document.getElementById(id);
            if (button) {
                if (func) {
                    button.addEventListener('click', func);
                    console.log(`⭐ Registered: ${id} -> ${name}`);
                } else {
                    console.warn(`⭐ WARNING: Button ${id} found but function ${name} not available`);
                }
            } else {
                console.warn(`⭐ WARNING: Button ${id} not found in DOM`);
            }
        });
        
        // ファイル入力
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            if (requiredFunctions.handleFileLoad) {
                fileInput.addEventListener('change', requiredFunctions.handleFileLoad);
                console.log("⭐ Registered: fileInput -> handleFileLoad");
            } else {
                console.warn("⭐ WARNING: fileInput found but handleFileLoad function not available");
            }
        } else {
            console.warn("⭐ WARNING: fileInput not found in DOM");
        }
        
        // オートセーブを開始
        if (typeof startAutosave === 'function') {
            try {
                startAutosave();
                console.log("⭐ Autosave started");
            } catch (e) {
                console.error("⭐ Error starting autosave:", e);
            }
        }
        
        console.log("⭐ Event binding completed");
    }
    
    /**
     * Editor API が準備されるまで待つ
     */
    function waitForEditor(callback) {
        const checkEditor = setInterval(() => {
            if (window.Editor && window.Editor.gameData !== undefined) {
                clearInterval(checkEditor);
                console.log("✅ window.Editor is ready");
                callback();
            }
        }, 50);
        
        // タイムアウト（5秒）
        setTimeout(() => {
            clearInterval(checkEditor);
            if (!window.Editor) {
                console.warn("⚠️ window.Editor not found after 5 seconds, proceeding anyway");
            }
            callback();
        }, 5000);
    }
    
    // 初期化を開始（Editor API の準備を待つ）
    function startInitialization() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                waitForEditor(initEditor);
            });
        } else {
            // DOM が既に読み込まれている場合
            waitForEditor(initEditor);
        }
    }
    
    startInitialization();
    
    // グローバルに公開（デバッグ用）
    window.EditorInit = {
        initState: initState,
        initComplete: function() { return initComplete; },
        reinit: initEditor
    };
    
})();

