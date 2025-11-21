/**
 * 診断質問エディタUI
 * 
 * 診断質問ノードの編集UIを表示する関数を提供します
 */

import { escapeHtml } from '../utils/data.js';

/**
 * 診断質問エディタを表示
 * @param {Object} question - 診断質問オブジェクト
 */
export function showDiagnosticQuestionEditor(question) {
    const editorContent = document.getElementById('editorContent');
    if (!editorContent) return;
    
    const questionType = question.question_type || 'single_choice';
    const showChoices = ['single_choice', 'multiple_choice', 'yes_no'].includes(questionType);
    const showScale = questionType === 'scale';
    
    editorContent.innerHTML = `
        <div class="form-group">
            <label>質問ID: ${question.id}</label>
        </div>
        <div class="form-group">
            <label>質問文</label>
            <textarea onchange="updateDiagnosticQuestionProperty('${question.id}', 'question_text', this.value)">${escapeHtml(question.question_text || '')}</textarea>
        </div>
        <div class="form-group">
            <label>説明（任意）</label>
            <textarea onchange="updateDiagnosticQuestionProperty('${question.id}', 'description', this.value)">${escapeHtml(question.description || '')}</textarea>
        </div>
        <div class="form-group">
            <label>質問形式</label>
            <select id="diagQuestionType" onchange="updateDiagnosticQuestionProperty('${question.id}', 'question_type', this.value)">
                <option value="single_choice" ${questionType === 'single_choice' ? 'selected' : ''}>単一選択</option>
                <option value="multiple_choice" ${questionType === 'multiple_choice' ? 'selected' : ''}>複数選択</option>
                <option value="yes_no" ${questionType === 'yes_no' ? 'selected' : ''}>YES/NO</option>
                <option value="scale" ${questionType === 'scale' ? 'selected' : ''}>スケール（数値）</option>
                <option value="text" ${questionType === 'text' ? 'selected' : ''}>自由記述</option>
            </select>
        </div>
        <div class="form-group" id="diagnosticScaleSettings" style="display: ${showScale ? 'block' : 'none'};">
            <label>スケール設定</label>
            <div style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                    <small>最小値</small>
                    <input type="number" value="${question.scale?.min ?? 0}" onchange="updateDiagnosticScale('${question.id}', 'min', this.value)">
                </div>
                <div style="flex: 1;">
                    <small>最大値</small>
                    <input type="number" value="${question.scale?.max ?? 10}" onchange="updateDiagnosticScale('${question.id}', 'max', this.value)">
                </div>
                <div style="flex: 1;">
                    <small>ステップ</small>
                    <input type="number" value="${question.scale?.step ?? 1}" onchange="updateDiagnosticScale('${question.id}', 'step', this.value)">
                </div>
            </div>
        </div>
        <div class="form-group" id="diagnosticChoicesGroup" style="display: ${showChoices ? 'block' : 'none'};">
            <label>選択肢</label>
            <div id="diagnosticChoicesList"></div>
            <button class="btn" type="button" style="margin-top: 10px;" onclick="addDiagnosticChoice('${question.id}')">+ 選択肢を追加</button>
        </div>
        <div class="form-group">
            <label>スコアリング設定</label>
            <p style="color: #718096; font-size: 0.9em; margin-bottom: 10px;">各選択肢で影響する評価軸を設定します。Glossaryから評価軸を自動取得します。</p>
            <div id="diagnosticScoringList"></div>
            <div style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 8px; font-size: 0.9em; color: #555;">
                <strong>詳細表示（JSON）:</strong>
                <pre id="diagnosticScoringJson" style="margin-top: 8px; padding: 8px; background: #fff; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85em; max-height: 200px; overflow-y: auto;"></pre>
            </div>
        </div>
        <div class="form-group">
            <label>分岐設定</label>
            <p style="color: #718096; font-size: 0.9em; margin-bottom: 10px;">回答キー（選択肢ID / yes / no / 任意のキー）ごとに次のノードを指定できます。</p>
            <div id="diagnosticNextList"></div>
            <button class="btn" type="button" style="margin-top: 10px;" onclick="addDiagnosticNext('${question.id}')">+ 分岐ルールを追加</button>
        </div>
        <div class="form-group">
            <button class="btn btn-danger" onclick="deleteNode('${question.id}')">🗑️ この診断質問を削除</button>
        </div>
    `;
    
    // 依存関数をwindow経由で呼び出し（後方互換性）
    if (typeof window.renderDiagnosticChoicesList === 'function') {
        window.renderDiagnosticChoicesList(question);
    }
    if (typeof window.renderDiagnosticNextList === 'function') {
        window.renderDiagnosticNextList(question);
    }
    // スコアリングUIは選択肢の後に表示（選択肢IDが必要なため）
    setTimeout(function() {
        if (typeof window.renderDiagnosticScoringList === 'function') {
            window.renderDiagnosticScoringList(question);
        }
    }, 100);
}

// 後方互換性のため window にも公開（showDiagnosticEditorとしても）
if (typeof window !== 'undefined') {
    window.showDiagnosticQuestionEditor = showDiagnosticQuestionEditor;
    window.showDiagnosticEditor = showDiagnosticQuestionEditor; // 別名でも公開
}
