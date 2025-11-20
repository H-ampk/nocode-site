/**
 * Vector Math Utilities
 * ベクトル計算ユーティリティ関数
 */

/**
 * コサイン類似度を計算する
 * @param {Array<number>} a - ベクトルA
 * @param {Array<number>} b - ベクトルB
 * @returns {number} コサイン類似度（0-1の範囲）
 */
export function cosineSimilarity(a, b) {
    if (!a || !b || !Array.isArray(a) || !Array.isArray(b)) {
        return 0;
    }
    
    if (a.length !== b.length) {
        console.warn('ベクトルの長さが異なります:', a.length, 'vs', b.length);
        // 短い方の長さに合わせる
        const minLength = Math.min(a.length, b.length);
        a = a.slice(0, minLength);
        b = b.slice(0, minLength);
    }
    
    let dot = 0;
    let na = 0;
    let nb = 0;
    
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] ** 2;
        nb += b[i] ** 2;
    }
    
    return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

