/**
 * K-means Clustering Module - k-meansクラスタリングモジュール
 * 
 * 因子スコアを入力として、k-meansクラスタリングを実行
 */

(function (global) {
  'use strict';

  /**
   * 2点間のユークリッド距離を計算
   * @param {Array} point1 - 点1（配列）
   * @param {Array} point2 - 点2（配列）
   * @returns {number} 距離
   */
  function euclideanDistance(point1, point2) {
    if (!point1 || !point2 || point1.length !== point2.length) {
      return Infinity;
    }
    
    let sum = 0;
    for (let i = 0; i < point1.length; i++) {
      const diff = point1[i] - point2[i];
      sum += diff * diff;
    }
    
    return Math.sqrt(sum);
  }

  /**
   * ランダムに初期クラスタ中心を選択
   * @param {Array} data - データ点の配列
   * @param {number} k - クラスタ数
   * @returns {Array} 初期クラスタ中心の配列
   */
  function initializeCentroids(data, k) {
    if (!data || data.length === 0 || k <= 0 || k > data.length) {
      return [];
    }

    const centroids = [];
    const indices = [];
    
    // ランダムにk個の点を選択
    while (indices.length < k) {
      const index = Math.floor(Math.random() * data.length);
      if (indices.indexOf(index) === -1) {
        indices.push(index);
        centroids.push(data[index].slice()); // コピーを作成
      }
    }

    return centroids;
  }

  /**
   * 各データ点を最も近いクラスタに割り当て
   * @param {Array} data - データ点の配列
   * @param {Array} centroids - クラスタ中心の配列
   * @returns {Array} 各データ点のクラスタラベル
   */
  function assignClusters(data, centroids) {
    if (!data || !centroids || data.length === 0 || centroids.length === 0) {
      return [];
    }

    const labels = [];
    
    for (let i = 0; i < data.length; i++) {
      let minDistance = Infinity;
      let closestCluster = 0;
      
      for (let j = 0; j < centroids.length; j++) {
        const distance = euclideanDistance(data[i], centroids[j]);
        if (distance < minDistance) {
          minDistance = distance;
          closestCluster = j;
        }
      }
      
      labels.push(closestCluster);
    }
    
    return labels;
  }

  /**
   * クラスタ中心を更新
   * @param {Array} data - データ点の配列
   * @param {Array} labels - 各データ点のクラスタラベル
   * @param {number} k - クラスタ数
   * @returns {Array} 新しいクラスタ中心の配列
   */
  function updateCentroids(data, labels, k) {
    if (!data || !labels || data.length === 0 || labels.length === 0) {
      return [];
    }

    const dimension = data[0].length;
    const newCentroids = [];
    
    for (let clusterId = 0; clusterId < k; clusterId++) {
      const clusterPoints = [];
      
      // このクラスタに属する点を収集
      for (let i = 0; i < data.length; i++) {
        if (labels[i] === clusterId) {
          clusterPoints.push(data[i]);
        }
      }
      
      if (clusterPoints.length === 0) {
        // 空のクラスタの場合はランダムな点を使用
        const randomIndex = Math.floor(Math.random() * data.length);
        newCentroids.push(data[randomIndex].slice());
      } else {
        // 平均を計算
        const centroid = [];
        for (let d = 0; d < dimension; d++) {
          let sum = 0;
          for (let p = 0; p < clusterPoints.length; p++) {
            sum += clusterPoints[p][d];
          }
          centroid.push(sum / clusterPoints.length);
        }
        newCentroids.push(centroid);
      }
    }
    
    return newCentroids;
  }

  /**
   * k-meansクラスタリングを実行
   * @param {Object} factorScores - 因子スコアオブジェクト { studentId: { F1: value, F2: value, ... }, ... }
   * @param {number} k - クラスタ数
   * @param {number} maxIterations - 最大反復回数（デフォルト: 100）
   * @returns {Object} クラスタリング結果
   */
  function kmeans(factorScores, k, maxIterations) {
    maxIterations = maxIterations || 100;
    
    if (!factorScores || typeof factorScores !== 'object') {
      throw new Error('因子スコアが無効です');
    }

    const studentIds = Object.keys(factorScores);
    if (studentIds.length === 0) {
      throw new Error('因子スコアが空です');
    }

    if (k <= 0 || k > studentIds.length) {
      throw new Error('クラスタ数 k が無効です（1 <= k <= データ数）');
    }

    // 因子名を取得（F1, F2, ...）
    const factorKeys = [];
    const firstStudent = factorScores[studentIds[0]];
    Object.keys(firstStudent).forEach(function(key) {
      if (key.startsWith('F')) {
        factorKeys.push(key);
      }
    });
    factorKeys.sort(); // F1, F2, F3, ... の順にソート

    if (factorKeys.length === 0) {
      throw new Error('因子スコアが見つかりません');
    }

    // データ点の配列に変換
    const data = [];
    studentIds.forEach(function(studentId) {
      const point = [];
      factorKeys.forEach(function(factorKey) {
        point.push(factorScores[studentId][factorKey] || 0);
      });
      data.push(point);
    });

    // k-meansアルゴリズム
    let centroids = initializeCentroids(data, k);
    let labels = [];
    let previousLabels = [];

    for (let iter = 0; iter < maxIterations; iter++) {
      // クラスタに割り当て
      labels = assignClusters(data, centroids);

      // 収束チェック
      if (previousLabels.length > 0) {
        let converged = true;
        for (let i = 0; i < labels.length; i++) {
          if (labels[i] !== previousLabels[i]) {
            converged = false;
            break;
          }
        }
        if (converged) {
          console.log('K-means converged at iteration', iter + 1);
          break;
        }
      }

      previousLabels = labels.slice();

      // クラスタ中心を更新
      centroids = updateCentroids(data, labels, k);
    }

    // 結果を整形
    const labelsMap = {};
    studentIds.forEach(function(studentId, index) {
      labelsMap[studentId] = labels[index];
    });

    const clusterCenters = [];
    centroids.forEach(function(centroid) {
      const center = {};
      factorKeys.forEach(function(factorKey, index) {
        center[factorKey] = centroid[index];
      });
      clusterCenters.push(center);
    });

    return {
      k: k,
      labels: labelsMap,
      cluster_centers: clusterCenters,
      factor_keys: factorKeys,
      iterations: Math.min(maxIterations, iter + 1)
    };
  }

  // グローバルに公開
  global.Clustering = {
    kmeans: kmeans,
    euclideanDistance: euclideanDistance
  };

})(window);


