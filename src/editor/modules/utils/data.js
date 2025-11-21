/**
 * データユーティリティ関数
 */

/**
 * ゲームデータを正規化
 */
export function normalizeGameData(data) {
    if (!data) {
        return {
            title: '',
            description: '',
            questions: [],
            results: [],
            startNode: null,
            tags: [],
            category: '',
            thumbnail: null
        };
    }
    
    const normalized = {
        title: data.title || '',
        description: data.description || '',
        questions: Array.isArray(data.questions) ? data.questions : [],
        results: Array.isArray(data.results) ? data.results : [],
        startNode: data.startNode || null,
        tags: Array.isArray(data.tags) ? data.tags : [],
        category: data.category || '',
        thumbnail: data.thumbnail || null
    };
    
    // 質問の正規化
    normalized.questions = normalized.questions.map(question => {
        if (!question.choices) question.choices = [];
        question.choices = question.choices.map((choice, index) => {
            if (choice.value === undefined) {
                choice.value = index;
            }
            return choice;
        });
        return question;
    });
    
    return normalized;
}

/**
 * HTMLエスケープ
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * JSON ダウンロード
 */
export function downloadJSON(data, filename) {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'data.json';
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * タグカラー生成（シードベース）
 */
export function randomTagColor(seed) {
    if (!seed) seed = Math.random().toString();
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 85%)`;
}

// 後方互換性のため window にも公開（段階的に削除予定）
if (typeof window !== 'undefined') {
    window.normalizeGameData = normalizeGameData;
    window.escapeHtml = escapeHtml;
    window.downloadJSON = downloadJSON;
    window.randomTagColor = randomTagColor;
}

