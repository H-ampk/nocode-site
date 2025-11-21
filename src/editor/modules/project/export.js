/**
 * プロジェクトエクスポート機能
 */

import { getGameData } from '../core/state.js';
import { downloadJSON } from '../utils/data.js';

/**
 * CSV形式でエクスポート
 */
export function exportCSV() {
    console.log("⭐ exportCSV called");
    const gameData = getGameData();
    
    let csv = "question_id,question_text,choice_text,choice_value,next_id,is_correct\n";
    
    gameData.questions.forEach(question => {
        const questionId = question.id || '';
        const questionText = (question.text || question.title || '').replace(/"/g, '""');
        
        if (question.choices && Array.isArray(question.choices)) {
            question.choices.forEach(choice => {
                const choiceText = (choice.text || '').replace(/"/g, '""');
                const choiceValue = choice.value || '';
                const nextId = choice.nextId || '';
                const isCorrect = choice.isCorrect ? '1' : '0';
                
                csv += `"${questionId}","${questionText}","${choiceText}",${choiceValue},"${nextId}",${isCorrect}\n`;
            });
        } else {
            csv += `"${questionId}","${questionText}","",,"",0\n`;
        }
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quiz_export.csv';
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * HTML形式でエクスポート
 */
export function exportHTML() {
    console.log("⭐ exportHTML called");
    // TODO: HTMLエクスポート機能を実装
    alert("HTML形式のエクスポートは準備中です。");
}

/**
 * プレビューを表示
 */
export function previewGame() {
    console.log("⭐ previewGame called");
    if (typeof window.showPreview === 'function') {
        window.showPreview();
    } else {
        alert("プレビュー機能が利用できません。");
    }
}

// 後方互換性のため window にも公開（段階的に削除予定）
if (typeof window !== 'undefined') {
    window.exportCSV = exportCSV;
    window.exportHTML = exportHTML;
    window.previewGame = previewGame;
}

