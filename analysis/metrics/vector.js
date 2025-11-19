/**
 * Vector Metrics - ベクトル変換と類似度計算
 * 
 * 機能:
 * - オブジェクト形式のベクトルを配列形式に変換
 * - コサイン類似度の計算
 */

(function (global) {
  'use strict';

  function toVector(obj) {
    if (!obj || typeof obj !== 'object') {
      return [];
    }
    
    return Object.entries(obj).map(function(entry) {
      return {
        axis: entry[0],
        value: Number(entry[1]) || 0
      };
    });
  }

  function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }
    
    // 内積を計算
    var dot = vecA.reduce(function(sum, a, i) {
      return sum + a * vecB[i];
    }, 0);
    
    // ノルムを計算
    var na = Math.sqrt(vecA.reduce(function(sum, a) {
      return sum + a * a;
    }, 0));
    var nb = Math.sqrt(vecB.reduce(function(sum, b) {
      return sum + b * b;
    }, 0));
    
    // コサイン類似度を計算（0除算を防ぐ）
    if (na === 0 || nb === 0) {
      return 0;
    }
    
    return dot / (na * nb);
  }

  // グローバルに公開
  global.VectorMetrics = {
    toVector: toVector,
    cosineSimilarity: cosineSimilarity
  };

})(window);

