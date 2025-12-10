/**
 * Editor メインモジュール（薄いルートファイル）
 * 
 * このファイルは初期化とイベント登録のみを担当し、
 * 実装は modules/* に分割されています
 */

import { getGameData, setGameData, getGlossaryTemplates } from './modules/core/state.js';
import { normalizeGameData } from './modules/utils/data.js';
import { updateUI, selectNode, renderNodes, updateEditor, updateNodeList } from './modules/ui/editor.js';
import { bindAllEvents } from './modules/ui/events.js';
import { showQuestionEditor } from './modules/ui/question-editor.js';
import { showDiagnosticQuestionEditor } from './modules/ui/diagnostic-editor.js';
import { showResultEditor } from './modules/ui/result-editor.js';

// UIモジュールを再エクスポート（集約）
export { showQuestionEditor, showDiagnosticQuestionEditor, showResultEditor, updateUI, selectNode, renderNodes };

// グローバルに公開（後方互換性のため）
if (typeof window !== 'undefined') {
    window.getGameData = getGameData;
    window.setGameData = setGameData;
    window.normalizeGameData = normalizeGameData;
    window.updateUI = updateUI;
    window.selectNode = selectNode; // ノード選択（必ず設定）
    window.renderNodes = renderNodes;
    window.showQuestionEditor = showQuestionEditor;
    window.showDiagnosticQuestionEditor = showDiagnosticQuestionEditor;
    window.showDiagnosticEditor = showDiagnosticQuestionEditor; // 別名でも公開
    window.showResultEditor = showResultEditor;
    window.GLOSSARY_TEMPLATES = getGlossaryTemplates();
    
    // updateEditor をグローバルに公開（createListNode からの参照用）
    // 注意: updateEditor は updateUI() 内で自動実行されるため、
    // 直接呼び出す必要はないが、念のため公開
    console.log("✅ Editor main module: Global functions registered");
    
    // ==== 公開APIをwindow.Editorにエクスポート ====
    // editor_init.js や他のスクリプトから安全にアクセスできるようにする
    window.Editor = {
        // ゲームデータへのアクセス（getter/setter経由）
        get gameData() {
            return getGameData();
        },
        set gameData(data) {
            setGameData(data);
        },
        
        // 主要関数
        getGameData: getGameData,
        setGameData: setGameData,
        normalizeGameData: normalizeGameData,
        selectNode: selectNode,
        updateUI: updateUI,
        updateEditor: updateEditor, // updateUI内で呼ばれるが、直接呼び出しも可能
        renderNodes: renderNodes,
        updateNodeList: updateNodeList, // 内部関数だが、必要に応じて公開
        
        // エディタ表示関数
        showQuestionEditor: showQuestionEditor,
        showDiagnosticQuestionEditor: showDiagnosticQuestionEditor,
        showResultEditor: showResultEditor,
        
        // その他
        GLOSSARY_TEMPLATES: getGlossaryTemplates()
    };
    
    console.log("✅ window.Editor API registered");
}

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log("⭐ Editor main module loaded");
    
    // イベントリスナーを登録
    bindAllEvents();
    
    // プロジェクト読み込み（URLパラメータ）
    // project_id, projectId, project のすべてに対応
    const params = new URLSearchParams(window.location.search);
    let projectId = params.get("project") || params.get("project_id") || params.get("projectId");
    
    // getProjectId関数を定義（他のスクリプトからも使用可能に）
    window.getProjectId = function() {
        const p = new URLSearchParams(window.location.search);
        return p.get("project") || p.get("project_id") || p.get("projectId");
    };
    
    // window.projectId からも取得（editor_init.js が設定した場合）
    if (!projectId && window.projectId) {
        projectId = window.projectId;
        console.log("🟩 editor_main.js: projectId (from window) =", projectId);
    }
    
    // Zero-Project Mode -------------------------
    if (!projectId) {
        // プロジェクト名の入力ダイアログ
        const name = prompt("新規プロジェクトの名前を入力してください（空欄可）", "");
        const base = name?.trim() || "new_project";

        // ID を付加
        const timestamp = new Date().toISOString().replace(/[-:T.]/g,"").slice(0,14);
        projectId = `${base}_${timestamp}`;

        console.warn(`[Editor] Zero-Project Modeで新規作成: ${projectId}`);

        // 空データを保存
        try {
            window.localStorage.setItem("project_id", projectId);
            window.localStorage.setItem(`project_${projectId}`, JSON.stringify({
                title: base,
                questions: [],
                glossary: {},
                results: [],
                created_at: timestamp
            }));
        } catch (e) {
            console.warn("[Editor] localStorage への保存に失敗しました:", e);
        }
    }

    // projectId を window に設定（他のスクリプトから参照可能にする）
    window.projectId = projectId;
    
    if (projectId && typeof window.loadProjectFromId === 'function') {
        console.log("📁 Editor: auto-loading project:", projectId);
        window.loadProjectFromId(projectId);
    } else if (params.get("mode") === "edit") {
        console.log("⭐ Loading project from localStorage (mode=edit)");
        const raw = localStorage.getItem("editor_current_project");
        if (raw) {
            try {
                const data = JSON.parse(raw);
                if (data && data.questions) {
                    const normalized = normalizeGameData(data);
                    setGameData(normalized);
                    updateUI();
                    console.log("[Editor] 本棚からプロジェクトをロードしました");
                }
            } catch (e) {
                console.error("Editor: 本棚からのロードに失敗", e);
            }
        }
    }
    
    // 初期UI更新
    updateUI();
    
    console.log("⭐ Editor initialization completed");
});

