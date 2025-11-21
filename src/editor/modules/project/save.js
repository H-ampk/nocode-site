/**
 * プロジェクト保存機能
 */

import { getGameData, setGameData, setSelectedNodeId } from '../core/state.js';
import { normalizeGameData } from '../utils/data.js';

/**
 * プロジェクトを保存（旧形式）
 */
export function saveProject() {
    const gameData = getGameData();
    
    // 保存前に選択肢のvectorを設定
    gameData.questions.forEach(function(question) {
        if (question.vector_scores && Array.isArray(question.choices)) {
            question.choices.forEach(function(choice) {
                const choiceId = choice.id || choice.value;
                if (choiceId && question.vector_scores[choiceId]) {
                    choice.vector = question.vector_scores[choiceId];
                } else {
                    choice.vector = choice.vector || {};
                }
            });
        } else if (Array.isArray(question.choices)) {
            question.choices.forEach(function(choice) {
                choice.vector = choice.vector || {};
            });
        }
    });
    
    const dataStr = JSON.stringify(gameData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'game_project.json';
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * 名前を付けて保存（Save As）
 */
export function saveProjectAs() {
    console.log("⭐ saveProjectAs called");
    try {
        const gameData = getGameData();
        
        // 保存前に選択肢のvectorを設定
        if (!gameData || !gameData.questions) {
            console.warn("⭐ saveProjectAs: No gameData or questions found");
            alert("保存可能なプロジェクトデータが存在しません。");
            return;
        }
        console.log("⭐ saveProjectAs: gameData found, proceeding with save");
        
        gameData.questions.forEach(function(question) {
            if (question.vector_scores && Array.isArray(question.choices)) {
                question.choices.forEach(function(choice) {
                    const choiceId = choice.id || choice.value;
                    if (choiceId && question.vector_scores[choiceId]) {
                        choice.vector = question.vector_scores[choiceId];
                    } else {
                        choice.vector = choice.vector || {};
                    }
                });
            } else if (Array.isArray(question.choices)) {
                question.choices.forEach(function(choice) {
                    choice.vector = choice.vector || {};
                });
            }
        });
        
        const defaultName = "project.json";
        const fileName = prompt("保存するファイル名を入力してください", defaultName);
        
        if (!fileName) return;
        
        // tags を確実に含める
        if (!gameData.tags) gameData.tags = [];
        const data = JSON.stringify(gameData, null, 2);
        
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = url;
        const finalFileName = fileName.endsWith(".json") ? fileName : fileName + ".json";
        a.download = finalFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        // localStorage に保存
        try {
            const projectMeta = {
                name: gameData.title || finalFileName.replace(".json", ""),
                filename: finalFileName,
                updated_at: new Date().toISOString(),
                tags: gameData.tags || [],
                category: gameData.category || "",
                thumbnail: gameData.thumbnail || null,
                data: gameData
            };
            
            const saved = JSON.parse(localStorage.getItem("projects") || "[]");
            // 同名ファイルは上書き
            const filtered = saved.filter(p => p.filename !== projectMeta.filename);
            filtered.push(projectMeta);
            
            localStorage.setItem("projects", JSON.stringify(filtered));
            console.log("[Editor] プロジェクトを localStorage に保存しました:", projectMeta.name);
        } catch (storageError) {
            console.warn("[Editor] localStorage への保存に失敗しました:", storageError);
        }
    } catch (e) {
        console.error("SaveAs Error:", e);
        alert("保存中にエラーが発生しました。");
    }
}

/**
 * プロジェクトを読み込む（ファイル選択）
 */
export function handleFileLoad(event) {
    console.log("⭐ handleFileLoad called");
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            const normalized = normalizeGameData(data);
            setGameData(normalized);
            
            // UI更新は editor.js で行う
            if (typeof window.updateUI === 'function') {
                window.updateUI();
            }
            
            console.log("[Editor] プロジェクトを読み込みました");
        } catch (error) {
            console.error("ファイル読み込みエラー:", error);
            alert("ファイルの読み込みに失敗しました。");
        }
    };
    reader.readAsText(file);
}

/**
 * プロジェクトデータを読み込む（プログラムから）
 */
export function loadProjectData(projectData) {
    const normalized = normalizeGameData(projectData);
    setGameData(normalized);
    
    if (typeof window.updateUI === 'function') {
        window.updateUI();
    }
}

/**
 * プロジェクトIDから読み込む（テンプレート対応・localStorage優先）
 */
export async function loadProjectFromId(projectId) {
    console.log("📂 loadProjectFromId:", projectId);
    try {
        // 1. テンプレートかチェック
        if (typeof window.loadTemplateIfNeeded === 'function') {
            if (window.loadTemplateIfNeeded(projectId)) {
                console.log("✅ テンプレートを読み込みました:", projectId);
                return;
            }
        }
        
        // 2. localStorageから読み込む
        try {
            const list = JSON.parse(localStorage.getItem("savedProjects") || "[]");
            const meta = list.find(p => p.id === projectId);
            
            if (meta) {
                // テンプレートの場合は特別処理
                if (meta.id && meta.id.startsWith("template_")) {
                    if (typeof window.loadTemplateIfNeeded === 'function') {
                        if (window.loadTemplateIfNeeded(meta.id)) {
                            console.log("✅ テンプレートを読み込みました:", meta.id);
                            return;
                        }
                    }
                }
                
                const dataStr = localStorage.getItem("project_" + projectId);
                if (dataStr) {
                    const data = JSON.parse(dataStr);
                    console.log("📁 プロジェクトをlocalStorageから読み込み:", projectId);
                    
                    // gameDataに設定
                    const normalized = normalizeGameData(data);
                    setGameData(normalized);
                    
                    // UI復元
                    if (typeof window.restoreGameToEditorUI === 'function') {
                        window.restoreGameToEditorUI(normalized);
                    }
                    
                    // UI更新
                    if (typeof window.updateUI === 'function') {
                        window.updateUI();
                    }
                    if (typeof window.showPreview === 'function') {
                        window.showPreview();
                    }
                    
                    console.log("✅ プロジェクトをlocalStorageから読み込みました:", projectId);
                    return;
                }
            }
        } catch (localError) {
            console.warn("⚠️ localStorageからの読み込みに失敗:", localError);
        }
        
        // localStorageにない場合はファイルから読み込む
        console.log("📁 ファイルからプロジェクトを読み込み:", projectId);
        const projectPath = `../../projects/${projectId}/project.json`;
        const quizPath = `../../projects/${projectId}/quiz.json`;
        const editorPath = `../../projects/${projectId}/editor.json`;
        
        console.log("⭐ Fetching project files:", { projectPath, quizPath, editorPath });
        
        const [projectRes, quizRes, editorRes] = await Promise.all([
            fetch(projectPath).catch((e) => {
                console.warn("⭐ Failed to fetch project.json:", e);
                return null;
            }),
            fetch(quizPath).catch((e) => {
                console.warn("⭐ Failed to fetch quiz.json:", e);
                return null;
            }),
            fetch(editorPath).catch((e) => {
                console.warn("⭐ Failed to fetch editor.json:", e);
                return null;
            })
        ]);
        
        console.log("⭐ Fetch results:", {
            project: projectRes?.ok,
            quiz: quizRes?.ok,
            editor: editorRes?.ok
        });
        
        if (quizRes && quizRes.ok) {
            const quizData = await quizRes.json();
            console.log("⭐ Quiz data loaded:", quizData);
            
            // project.json からメタデータを取得
            let projectMeta = {};
            if (projectRes && projectRes.ok) {
                projectMeta = await projectRes.json();
                console.log("⭐ Project metadata loaded:", projectMeta);
            }
            
            // quiz.json のデータを gameData に設定
            if (quizData.questions) {
                const normalized = normalizeGameData(quizData);
                setGameData(normalized);
                console.log("⭐ Game data normalized");
                
                // project.json のメタデータを統合
                if (projectMeta.title) window.gameData.title = projectMeta.title;
                if (projectMeta.description) window.gameData.description = projectMeta.description;
                if (projectMeta.tags) window.gameData.tags = projectMeta.tags;
                if (projectMeta.category) window.gameData.category = projectMeta.category;
                if (projectMeta.thumbnail) window.gameData.thumbnail = projectMeta.thumbnail;
                setGameData(window.gameData);
                console.log('🔧 unified gameData:', window.gameData);
                setSelectedNodeId(null);
                
                // UI更新はグローバル関数を使用（後でモジュール化）
                if (typeof window.updateUI === 'function') {
                    window.updateUI();
                }
                if (typeof window.showPreview === 'function') {
                    window.showPreview();
                }
                
                console.log("[Editor] プロジェクトを読み込みました:", projectId);
                console.log("⭐ Project loaded successfully");
            } else {
                console.warn("⭐ Quiz data has no questions");
                alert("クイズデータが見つかりません。");
            }
        } else {
            console.warn("⭐ Quiz file not found or not ok:", quizRes);
            alert(`プロジェクト「${projectId}」が見つかりません。`);
        }
    } catch (e) {
        console.error("Failed to load project:", e);
        console.error("⭐ Error in loadProjectFromId:", e);
        alert("プロジェクトの読み込み中にエラーが発生しました。");
    }
}

/**
 * プロジェクトメタデータを保存（savedProjects[]に追加）
 */
export function saveProjectMetadata(meta) {
    try {
        let list = JSON.parse(localStorage.getItem("savedProjects") || "[]");
        
        // 既存のエントリを削除
        list = list.filter(item => item.id !== meta.id);
        
        // 新しいメタデータを追加
        list.push(meta);
        
        localStorage.setItem("savedProjects", JSON.stringify(list));
        console.log("✅ プロジェクトメタデータを保存しました:", meta.id);
    } catch (e) {
        console.error("❌ プロジェクトメタデータの保存に失敗:", e);
    }
}

// 後方互換性のため window にも公開（段階的に削除予定）
if (typeof window !== 'undefined') {
    window.saveProject = saveProject;
    window.saveProjectAs = saveProjectAs;
    window.handleFileLoad = handleFileLoad;
    window.loadProjectData = loadProjectData;
    window.loadProjectFromId = loadProjectFromId;
    window.saveProjectMetadata = saveProjectMetadata;
}

