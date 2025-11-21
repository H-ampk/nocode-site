/**
 * 結果エディタUI
 * 
 * 結果ノードの編集UIを表示する関数を提供します
 */

import { escapeHtml } from '../utils/data.js';

/**
 * 結果エディタを表示
 * @param {Object} result - 結果オブジェクト
 */
export function showResultEditor(result) {
    const editorContent = document.getElementById('editorContent');
    if (!editorContent) return;
    
    editorContent.innerHTML = `
        <div class="form-group">
            <label>タイトル</label>
            <input type="text" id="resultTitle" value="${escapeHtml(result.title)}" 
                   onchange="updateResultProperty('${result.id}', 'title', this.value)">
        </div>
        
        <div class="form-group">
            <label>結果テキスト</label>
            <textarea id="resultText" 
                      onchange="updateResultProperty('${result.id}', 'text', this.value)">${escapeHtml(result.text)}</textarea>
        </div>
        
        <div class="form-group">
            <label>画像ファイル名（オプション）</label>
            <input type="text" id="resultImage" value="${escapeHtml(result.image)}" 
                   placeholder="例: attention_type.png"
                   onchange="updateResultProperty('${result.id}', 'image', this.value)">
        </div>
        
        <div class="form-group">
            <label>URL（オプション）</label>
            <input type="text" id="resultUrl" value="${escapeHtml(result.url)}" 
                   placeholder="例: https://example.com"
                   onchange="updateResultProperty('${result.id}', 'url', this.value)">
        </div>
        
        <div class="form-group">
            <label>ボタンテキスト（URLがある場合）</label>
            <input type="text" id="resultButtonText" value="${escapeHtml(result.buttonText)}" 
                   placeholder="例: 公式サイトを見る"
                   onchange="updateResultProperty('${result.id}', 'buttonText', this.value)">
        </div>
        
        <div class="form-group">
            <button class="btn btn-danger" onclick="deleteNode('${result.id}')">🗑️ この結果を削除</button>
        </div>
    `;
}

// 後方互換性のため window にも公開
if (typeof window !== 'undefined') {
    window.showResultEditor = showResultEditor;
}
