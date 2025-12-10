/**
 * イベントリスナーの一元管理
 */

// モジュールから関数をインポート
import { addQuestion, addDiagnosticQuestion, addResult } from '../actions/nodes.js';
import { saveProjectAs, handleFileLoad } from '../project/save.js';
import { openProjectShelf, closeProjectShelf } from './shelf.js';
import { exportCSV, exportHTML, previewGame } from '../project/export.js';
import { generateAndSaveConceptGraph } from '../project/concept_graph.js';
import { syncGlossaryAndGraph } from '../project/glossary_sync.js';

// saveQuiz 関数は後で実装
let saveQuiz = null;

/**
 * すべてのイベントリスナーを登録
 */
export function bindAllEvents() {
    console.log("⭐ Binding all editor events...");
    
    // ノード追加
    const btnAddQuestion = document.getElementById('btn-add-question');
    if (btnAddQuestion) {
        btnAddQuestion.addEventListener('click', addQuestion);
        console.log("⭐ Registered: btn-add-question");
    } else {
        console.warn("⭐ WARNING: Button 'btn-add-question' not found in DOM!");
    }
    
    const btnAddDiagnosticQuestion = document.getElementById('btn-add-diagnostic-question');
    if (btnAddDiagnosticQuestion) {
        btnAddDiagnosticQuestion.addEventListener('click', addDiagnosticQuestion);
        console.log("⭐ Registered: btn-add-diagnostic-question");
    } else {
        console.warn("⭐ WARNING: Button 'btn-add-diagnostic-question' not found in DOM!");
    }
    
    const btnAddResult = document.getElementById('btn-add-result');
    if (btnAddResult) {
        btnAddResult.addEventListener('click', addResult);
        console.log("⭐ Registered: btn-add-result");
    } else {
        console.warn("⭐ WARNING: Button 'btn-add-result' not found in DOM!");
    }
    
    // プロジェクト保存
    const btnSaveProject = document.getElementById('btn-save-project');
    if (btnSaveProject) {
        btnSaveProject.addEventListener('click', saveProjectAs);
        console.log("⭐ Registered: btn-save-project");
    } else {
        console.warn("⭐ WARNING: Button 'btn-save-project' not found in DOM!");
    }
    
    // バージョン保存
    const saveQuizButton = document.getElementById('saveQuizButton');
    if (saveQuizButton) {
        if (typeof window.saveQuiz === 'function') {
            saveQuiz = window.saveQuiz;
            saveQuizButton.addEventListener('click', saveQuiz);
            console.log("⭐ Registered: saveQuizButton");
        } else {
            console.warn("⭐ WARNING: saveQuiz function not found!");
        }
    } else {
        console.warn("⭐ WARNING: Button 'saveQuizButton' not found in DOM!");
    }
    
    // Concept Graph生成
    const btnGenerateConceptGraph = document.getElementById('btn-generate-concept-graph');
    if (btnGenerateConceptGraph) {
        btnGenerateConceptGraph.addEventListener('click', generateAndSaveConceptGraph);
        console.log("⭐ Registered: btn-generate-concept-graph");
    } else {
        console.warn("⭐ WARNING: Button 'btn-generate-concept-graph' not found in DOM!");
    }
    
    // Glossary / ConceptGraph 同期
    const btnSyncGlossaryGraph = document.getElementById('btn-sync-glossary-graph');
    if (btnSyncGlossaryGraph) {
        btnSyncGlossaryGraph.addEventListener('click', syncGlossaryAndGraph);
        console.log("⭐ Registered: btn-sync-glossary-graph");
    } else {
        console.warn("⭐ WARNING: Button 'btn-sync-glossary-graph' not found in DOM!");
    }
    
    // プロジェクト読み込み
    const btnOpenProjectShelf = document.getElementById('btn-open-project-shelf');
    if (btnOpenProjectShelf) {
        btnOpenProjectShelf.addEventListener('click', openProjectShelf);
        console.log("⭐ Registered: btn-open-project-shelf");
    } else {
        console.warn("⭐ WARNING: Button 'btn-open-project-shelf' not found in DOM!");
    }
    
    const btnCloseProjectShelf = document.getElementById('btn-close-project-shelf');
    if (btnCloseProjectShelf) {
        btnCloseProjectShelf.addEventListener('click', closeProjectShelf);
        console.log("⭐ Registered: btn-close-project-shelf");
    } else {
        console.warn("⭐ WARNING: Button 'btn-close-project-shelf' not found in DOM!");
    }
    
    // エクスポート
    const btnExportCsv = document.getElementById('btn-export-csv');
    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', exportCSV);
        console.log("⭐ Registered: btn-export-csv");
    } else {
        console.warn("⭐ WARNING: Button 'btn-export-csv' not found in DOM!");
    }
    
    const btnExportHtml = document.getElementById('btn-export-html');
    if (btnExportHtml) {
        btnExportHtml.addEventListener('click', exportHTML);
        console.log("⭐ Registered: btn-export-html");
    } else {
        console.warn("⭐ WARNING: Button 'btn-export-html' not found in DOM!");
    }
    
    const btnPreviewGame = document.getElementById('btn-preview-game');
    if (btnPreviewGame) {
        btnPreviewGame.addEventListener('click', previewGame);
        console.log("⭐ Registered: btn-preview-game");
    } else {
        console.warn("⭐ WARNING: Button 'btn-preview-game' not found in DOM!");
    }
    
    // ファイル入力
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileLoad);
        console.log("⭐ Registered: fileInput");
    } else {
        console.warn("⭐ WARNING: Input 'fileInput' not found in DOM!");
    }
    
    console.log("⭐ Event binding completed");
}

