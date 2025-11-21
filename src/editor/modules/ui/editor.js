/**
 * Editor UI 管理
 * 
 * エディタ全体のUI更新を管理する関数を提供します
 */

import { getGameData, getSelectedNodeId, setSelectedNodeId } from '../core/state.js';
import { escapeHtml } from '../utils/data.js';

/**
 * ノードを選択
 */
export function selectNode(nodeId) {
    console.log("selectNode called with:", nodeId);
    setSelectedNodeId(nodeId);
    updateUI(); // これが updateEditor を呼び出す
    // グローバル関数を使用（後でモジュール化）
    if (typeof window.showPreview === 'function') {
        window.showPreview();
    }
}

// renderNodes関数（エイリアスとしてupdateNodeListを利用）
export function renderNodes() {
    updateNodeList();
}

/**
 * UIを更新
 */
export function updateUI() {
    updateNodeList();
    updateEditor();
}

/**
 * ノードリストを更新
 */
export function updateNodeList() {
    const nodeList = document.getElementById('nodeList');
    if (!nodeList) return;
    
    nodeList.innerHTML = '';
    const gameData = getGameData();
    const selectedNodeId = getSelectedNodeId();
    
    // スタートノード
    if (gameData.startNode) {
        const startNode = gameData.questions.find(q => q.id === gameData.startNode);
        if (startNode) {
            const node = createListNode(startNode, 'start');
            nodeList.appendChild(node);
        }
    }
    
    // 質問ノード
    gameData.questions.forEach(question => {
        const node = createListNode(question, question.type || 'question');
        nodeList.appendChild(node);
    });
    
    // 結果ノード
    gameData.results.forEach(result => {
        const node = createListNode(result, 'result');
        nodeList.appendChild(node);
    });
}

/**
 * リスト表示用のノード要素を作成
 */
function createListNode(data, type) {
    const div = document.createElement('div');
    const selectedNodeId = getSelectedNodeId();
    div.className = `node ${selectedNodeId === data.id ? 'selected' : ''}`;
    
    const typeLabels = {
        'start': '🚀 スタート',
        'question': '❓ 質問',
        'diagnostic_question': '🧠 診断',
        'result': '✅ 結果'
    };
    
    const displayTitle = data.title || data.question_text || data.text || '無題';
    
    div.innerHTML = `
        <div class="node-title">${escapeHtml(displayTitle)}</div>
        <div class="node-type">${typeLabels[type] || type}</div>
    `;
    
    // ノードクリックハンドラ（確実に動作するようフォールバック付き）
    div.onclick = () => {
        console.log("Node clicked:", data.id);
        if (typeof window.selectNode === "function") {
            window.selectNode(data.id);
        } else if (typeof selectNode === "function") {
            selectNode(data.id);
        } else {
            console.error("⚠️ selectNode function not found!");
        }
    };
    
    return div;
}

/**
 * エディタを更新
 */
export function updateEditor() {
    const gameData = getGameData();
    const selectedNodeId = getSelectedNodeId();
    const editorContent = document.getElementById('editorContent');
    
    if (!editorContent) return;
    
    if (!selectedNodeId) {
        editorContent.innerHTML = `
            <div class="empty-state">
                <h2>👋 ようこそ！</h2>
                <p style="margin-top: 20px;">左側の「質問を追加」ボタンをクリックして、最初の質問を作成してください。</p>
            </div>
        `;
        return;
    }
    
    // 質問を検索
    const question = gameData.questions.find(q => q.id === selectedNodeId);
    if (question) {
        // グローバル関数を使用（後でモジュール化）
        if (question.type === 'diagnostic_question') {
            if (typeof window.showDiagnosticQuestionEditor === 'function') {
                window.showDiagnosticQuestionEditor(question);
            }
        } else {
            if (typeof window.showQuestionEditor === 'function') {
                window.showQuestionEditor(question);
            }
        }
        return;
    }
    
    // 結果を検索
    const result = gameData.results.find(r => r.id === selectedNodeId);
    if (result) {
        if (typeof window.showResultEditor === 'function') {
            window.showResultEditor(result);
        }
        return;
    }
}

// 後方互換性のため window にも公開（段階的に削除予定）
if (typeof window !== 'undefined') {
    window.selectNode = selectNode;
    window.updateUI = updateUI;
    // updateEditor も公開（window.Editor経由でもアクセス可能）
    window.updateEditor = updateEditor;
}

