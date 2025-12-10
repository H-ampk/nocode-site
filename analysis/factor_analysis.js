/**
 * Factor Analysis Module - 因子分析モジュール
 * 
 * 学習ログから観測変数を抽出し、PCA + varimax回転による因子分析を実行
 */

(function (global) {
  'use strict';

  /**
   * 学習ログから観測変数を抽出
   * @param {Array} logs - 学習ログの配列
   * @returns {Object} { data: Array, variables: Array, studentIds: Array }
   */
  function extractObservations(logs) {
    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return { data: [], variables: [], studentIds: [] };
    }

    // 観測変数の定義
    const variables = [
      'correct',           // 正誤（0/1）
      'response_time',     // 反応時間（rt）
      'choice_steps',      // 選択遷移回数
      'back_count',        // 戻る回数
      'abstract_score',    // 記述抽象度
      'confidence',        // 確信度
      'dwell',            // ページ滞在時間
      'error_type'        // 誤答タイプID
    ];

    // 生徒IDごとにデータを集計
    const studentDataMap = {};
    const studentIds = [];

    logs.forEach(function(log) {
      const studentId = log.user_id || log.student_id || 'unknown';
      
      if (!studentDataMap[studentId]) {
        studentDataMap[studentId] = {
          studentId: studentId,
          correct: [],
          response_time: [],
          choice_steps: [],
          back_count: [],
          abstract_score: [],
          confidence: [],
          dwell: [],
          error_type: []
        };
        studentIds.push(studentId);
      }

      const data = studentDataMap[studentId];

      // 各変数を抽出（nullの場合はスキップ）
      if (log.correct !== undefined && log.correct !== null) {
        data.correct.push(log.correct === true ? 1 : 0);
      }
      if (log.response_time !== undefined && log.response_time !== null) {
        data.response_time.push(log.response_time);
      }
      // choice_steps: path配列の長さまたはclicks配列の長さ
      const choiceSteps = (log.path && log.path.length) || (log.clicks && log.clicks.length) || 1;
      data.choice_steps.push(choiceSteps);
      
      // back_count: path内の戻る操作の回数（簡易実装）
      const backCount = (log.path && log.path.filter(function(p) { return p === 'back' || p.type === 'back'; }).length) || 0;
      data.back_count.push(backCount);
      
      // abstract_score: 記述抽象度（未実装の場合はnull）
      if (log.abstract_score !== undefined && log.abstract_score !== null) {
        data.abstract_score.push(log.abstract_score);
      }
      
      // confidence: 確信度（未実装の場合はnull）
      if (log.confidence !== undefined && log.confidence !== null) {
        data.confidence.push(log.confidence);
      }
      
      // dwell: ページ滞在時間（response_timeと同一の場合もあり）
      if (log.dwell !== undefined && log.dwell !== null) {
        data.dwell.push(log.dwell);
      } else if (log.response_time !== undefined && log.response_time !== null) {
        data.dwell.push(log.response_time);
      }
      
      // error_type: 誤答タイプID（誤答の場合のみ）
      if (log.correct === false && log.error_type !== undefined && log.error_type !== null) {
        data.error_type.push(log.error_type);
      } else {
        data.error_type.push(0); // 正答の場合は0
      }
    });

    // 各生徒の平均値を計算（欠損値は平均値で補完）
    const dataMatrix = [];
    const variableMeans = {};
    const variableCounts = {};

    // まず平均値を計算
    studentIds.forEach(function(studentId) {
      const data = studentDataMap[studentId];
      variables.forEach(function(variable) {
        const values = data[variable];
        if (values.length > 0) {
          const sum = values.reduce(function(a, b) { return a + b; }, 0);
          const mean = sum / values.length;
          if (!variableMeans[variable]) {
            variableMeans[variable] = 0;
            variableCounts[variable] = 0;
          }
          variableMeans[variable] += mean;
          variableCounts[variable] += 1;
        }
      });
    });

    // 全体平均を計算
    variables.forEach(function(variable) {
      if (variableCounts[variable] > 0) {
        variableMeans[variable] /= variableCounts[variable];
      } else {
        variableMeans[variable] = 0;
      }
    });

    // データ行列を構築（欠損値は平均値で補完）
    studentIds.forEach(function(studentId) {
      const data = studentDataMap[studentId];
      const row = [];
      variables.forEach(function(variable) {
        const values = data[variable];
        if (values.length > 0) {
          const sum = values.reduce(function(a, b) { return a + b; }, 0);
          const mean = sum / values.length;
          row.push(mean);
        } else {
          // 欠損値は平均値で補完
          row.push(variableMeans[variable] || 0);
        }
      });
      dataMatrix.push(row);
    });

    return {
      data: dataMatrix,
      variables: variables,
      studentIds: studentIds
    };
  }

  /**
   * データを標準化（平均0、分散1）
   * @param {Array} data - データ行列
   * @returns {Object} { standardized: Array, means: Array, stds: Array }
   */
  function standardize(data) {
    if (!data || data.length === 0) {
      return { standardized: [], means: [], stds: [] };
    }

    const n = data.length;
    const m = data[0].length;
    const means = [];
    const stds = [];
    const standardized = [];

    // 各変数の平均と標準偏差を計算
    for (let j = 0; j < m; j++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += data[i][j];
      }
      const mean = sum / n;
      means.push(mean);

      let variance = 0;
      for (let i = 0; i < n; i++) {
        variance += Math.pow(data[i][j] - mean, 2);
      }
      const std = Math.sqrt(variance / n) || 1; // ゼロ除算を防ぐ
      stds.push(std);
    }

    // 標準化
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < m; j++) {
        row.push((data[i][j] - means[j]) / stds[j]);
      }
      standardized.push(row);
    }

    return { standardized: standardized, means: means, stds: stds };
  }

  /**
   * 共分散行列を計算
   * @param {Array} data - 標準化済みデータ行列
   * @returns {Array} 共分散行列
   */
  function computeCovarianceMatrix(data) {
    if (!data || data.length === 0) {
      return [];
    }

    const n = data.length;
    const m = data[0].length;
    const cov = [];

    for (let i = 0; i < m; i++) {
      const row = [];
      for (let j = 0; j < m; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += data[k][i] * data[k][j];
        }
        row.push(sum / (n - 1)); // 不偏分散
      }
      cov.push(row);
    }

    return cov;
  }

  /**
   * 固有値と固有ベクトルを計算（Jacobi法の簡易実装）
   * @param {Array} matrix - 対称行列
   * @returns {Object} { eigenvalues: Array, eigenvectors: Array }
   */
  function computeEigenvaluesAndEigenvectors(matrix) {
    if (!matrix || matrix.length === 0) {
      return { eigenvalues: [], eigenvectors: [] };
    }

    const n = matrix.length;
    let A = matrix.map(function(row) { return row.slice(); });
    let V = [];
    
    // 単位行列を初期化
    for (let i = 0; i < n; i++) {
      V[i] = [];
      for (let j = 0; j < n; j++) {
        V[i][j] = (i === j) ? 1 : 0;
      }
    }

    // Jacobi法（簡易実装、最大100回反復）
    const maxIterations = 100;
    const tolerance = 1e-10;

    for (let iter = 0; iter < maxIterations; iter++) {
      let maxOffDiagonal = 0;
      let p = 0, q = 0;

      // 最大の非対角要素を探す
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const absVal = Math.abs(A[i][j]);
          if (absVal > maxOffDiagonal) {
            maxOffDiagonal = absVal;
            p = i;
            q = j;
          }
        }
      }

      if (maxOffDiagonal < tolerance) {
        break;
      }

      // Givens回転
      const theta = 0.5 * Math.atan2(2 * A[p][q], A[p][p] - A[q][q]);
      const c = Math.cos(theta);
      const s = Math.sin(theta);

      // Aを更新
      const Ap = A[p].slice();
      const Aq = A[q].slice();
      
      for (let k = 0; k < n; k++) {
        if (k !== p && k !== q) {
          const Apk = A[p][k];
          const Aqk = A[q][k];
          A[p][k] = c * Apk - s * Aqk;
          A[k][p] = A[p][k];
          A[q][k] = s * Apk + c * Aqk;
          A[k][q] = A[q][k];
        }
      }

      const App = A[p][p];
      const Apq = A[p][q];
      const Aqq = A[q][q];

      A[p][p] = c * c * App - 2 * c * s * Apq + s * s * Aqq;
      A[q][q] = s * s * App + 2 * c * s * Apq + c * c * Aqq;
      A[p][q] = 0;
      A[q][p] = 0;

      // Vを更新
      for (let k = 0; k < n; k++) {
        const Vkp = V[k][p];
        const Vkq = V[k][q];
        V[k][p] = c * Vkp - s * Vkq;
        V[k][q] = s * Vkp + c * Vkq;
      }
    }

    // 固有値を抽出（対角要素）
    const eigenvalues = [];
    for (let i = 0; i < n; i++) {
      eigenvalues.push(A[i][i]);
    }

    // 固有値の大きい順にソート
    const indices = eigenvalues.map(function(val, idx) { return { val: val, idx: idx }; });
    indices.sort(function(a, b) { return b.val - a.val; });

    const sortedEigenvalues = indices.map(function(item) { return item.val; });
    const sortedEigenvectors = [];
    
    for (let i = 0; i < n; i++) {
      sortedEigenvectors[i] = [];
      for (let j = 0; j < n; j++) {
        sortedEigenvectors[i][j] = V[j][indices[i].idx];
      }
    }

    return {
      eigenvalues: sortedEigenvalues,
      eigenvectors: sortedEigenvectors
    };
  }

  /**
   * Varimax回転を実行
   * @param {Array} loadings - 因子負荷量行列
   * @param {number} maxIterations - 最大反復回数
   * @returns {Array} 回転後の因子負荷量行列
   */
  function varimaxRotation(loadings, maxIterations) {
    maxIterations = maxIterations || 20;
    
    if (!loadings || loadings.length === 0) {
      return loadings;
    }

    const n = loadings.length;      // 変数の数
    const k = loadings[0].length;   // 因子の数

    if (k === 1) {
      return loadings; // 因子が1つの場合は回転不要
    }

    let rotated = loadings.map(function(row) { return row.slice(); });
    let T = [];
    
    // 単位行列を初期化
    for (let i = 0; i < k; i++) {
      T[i] = [];
      for (let j = 0; j < k; j++) {
        T[i][j] = (i === j) ? 1 : 0;
      }
    }

    for (let iter = 0; iter < maxIterations; iter++) {
      let maxChange = 0;

      // 因子ペアごとに回転
      for (let i = 0; i < k; i++) {
        for (let j = i + 1; j < k; j++) {
          // Varimax基準を最大化する角度を計算
          let u = 0, v = 0, w = 0;
          
          for (let m = 0; m < n; m++) {
            const a = rotated[m][i];
            const b = rotated[m][j];
            u += a * a - b * b;
            v += 2 * a * b;
            w += a * a + b * b;
          }

          const theta = 0.25 * Math.atan2(v, u);
          const c = Math.cos(theta);
          const s = Math.sin(theta);

          // 回転行列を適用
          for (let m = 0; m < n; m++) {
            const a = rotated[m][i];
            const b = rotated[m][j];
            rotated[m][i] = c * a - s * b;
            rotated[m][j] = s * a + c * b;
          }

          // Tを更新
          for (let m = 0; m < k; m++) {
            const Tim = T[m][i];
            const Tjm = T[m][j];
            T[m][i] = c * Tim - s * Tjm;
            T[m][j] = s * Tim + c * Tjm;
          }
        }
      }

      if (maxChange < 1e-6) {
        break;
      }
    }

    return rotated;
  }

  /**
   * 因子スコアを計算（回帰法）
   * @param {Array} data - 標準化済みデータ行列
   * @param {Array} loadings - 因子負荷量行列
   * @returns {Array} 因子スコア行列
   */
  function computeFactorScores(data, loadings) {
    if (!data || !loadings || data.length === 0 || loadings.length === 0) {
      return [];
    }

    const n = data.length;
    const k = loadings[0].length;
    const scores = [];

    // 簡易実装: 因子負荷量の重み付き和
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < k; j++) {
        let sum = 0;
        for (let m = 0; m < loadings.length; m++) {
          sum += data[i][m] * loadings[m][j];
        }
        row.push(sum);
      }
      scores.push(row);
    }

    return scores;
  }

  /**
   * 因子分析を実行
   * @param {Array} logs - 学習ログの配列
   * @returns {Object} 因子分析結果
   */
  function runFactorAnalysis(logs) {
    console.log('🔬 Factor Analysis: Starting...');

    // 1. 観測変数を抽出
    const extracted = extractObservations(logs);
    if (extracted.data.length === 0) {
      console.warn('⚠️ Factor Analysis: No data extracted');
      return {
        eigenvalues: [],
        num_factors: 0,
        loadings: {},
        factor_scores: {}
      };
    }

    console.log('🔬 Factor Analysis: Extracted', extracted.data.length, 'students,', extracted.variables.length, 'variables');

    // 2. データを標準化
    const standardized = standardize(extracted.data);
    console.log('🔬 Factor Analysis: Data standardized');

    // 3. 共分散行列を計算
    const cov = computeCovarianceMatrix(standardized.standardized);
    console.log('🔬 Factor Analysis: Covariance matrix computed');

    // 4. 固有値と固有ベクトルを計算
    const eigen = computeEigenvaluesAndEigenvectors(cov);
    console.log('🔬 Factor Analysis: Eigenvalues and eigenvectors computed');

    // 5. Kaiser基準で因子数を決定（固有値 > 1）
    const numFactors = eigen.eigenvalues.filter(function(val) { return val > 1; }).length;
    console.log('🔬 Factor Analysis: Number of factors (Kaiser criterion):', numFactors);

    if (numFactors === 0) {
      console.warn('⚠️ Factor Analysis: No factors with eigenvalue > 1');
      return {
        eigenvalues: eigen.eigenvalues,
        num_factors: 0,
        loadings: {},
        factor_scores: {}
      };
    }

    // 6. 因子負荷量を計算（最初のnumFactors個の固有ベクトル）
    const loadingsMatrix = [];
    for (let i = 0; i < extracted.variables.length; i++) {
      loadingsMatrix[i] = [];
      for (let j = 0; j < numFactors; j++) {
        // 固有ベクトルに固有値の平方根を掛ける
        loadingsMatrix[i][j] = eigen.eigenvectors[j][i] * Math.sqrt(eigen.eigenvalues[j]);
      }
    }

    // 7. Varimax回転
    const rotatedLoadings = varimaxRotation(loadingsMatrix);
    console.log('🔬 Factor Analysis: Varimax rotation completed');

    // 8. 因子負荷量をオブジェクト形式に変換
    const loadings = {};
    extracted.variables.forEach(function(variable, i) {
      loadings[variable] = rotatedLoadings[i];
    });

    // 9. 因子スコアを計算
    const factorScoresMatrix = computeFactorScores(standardized.standardized, rotatedLoadings);
    const factor_scores = {};
    extracted.studentIds.forEach(function(studentId, i) {
      factor_scores[studentId] = {};
      for (let j = 0; j < numFactors; j++) {
        factor_scores[studentId]['F' + (j + 1)] = factorScoresMatrix[i][j];
      }
    });

    console.log('✅ Factor Analysis: Completed');

    return {
      eigenvalues: eigen.eigenvalues,
      num_factors: numFactors,
      loadings: loadings,
      factor_scores: factor_scores
    };
  }

  // グローバルに公開
  global.FactorAnalysis = {
    run: runFactorAnalysis,
    extractObservations: extractObservations,
    standardize: standardize
  };

})(window);


