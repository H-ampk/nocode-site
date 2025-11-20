/**
 * Vector Math Utilities
 * ベクトル計算ユーティリティ関数
 * ES module 禁止: IIFE + window 形式で export
 */

(function (global) {
  'use strict';

  /**
   * コサイン類似度を計算する
   * @param {Array<number>} a - ベクトルA
   * @param {Array<number>} b - ベクトルB
   * @returns {number} コサイン類似度（0-1の範囲）
   */
  function cosineSimilarity(a, b) {
    if (!a || !b || !Array.isArray(a) || !Array.isArray(b)) {
      return 0;
    }
    
    if (a.length !== b.length) {
      console.warn('ベクトルの長さが異なります:', a.length, 'vs', b.length);
      // 短い方の長さに合わせる
      var minLength = Math.min(a.length, b.length);
      a = a.slice(0, minLength);
      b = b.slice(0, minLength);
    }
    
    var dot = 0;
    var na = 0;
    var nb = 0;
    
    for (var i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i]; // ** 2 の代わりに * a[i]
      nb += b[i] * b[i]; // ** 2 の代わりに * b[i]
    }
    
    return na && nb ? dot / Math.sqrt(na * nb) : 0;
  }

  // window.VectorMath として公開（重複定義を防ぐ）
  if (typeof global.VectorMath === 'undefined') {
    global.VectorMath = {};
  }
  
  global.VectorMath.cosineSimilarity = cosineSimilarity;

})(window);
