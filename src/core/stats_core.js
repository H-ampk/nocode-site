/**
 * Stats Core - 統計計算の統一レイヤ
 * 
 * ログデータから基本的な統計情報（正答率、反応時間、誤概念ランキングなど）を計算する
 */

/**
 * ログデータから統計情報を計算
 * @param {Array} logs - ログエントリの配列
 * @returns {Object} 統計情報オブジェクト
 */
export function computeStats(logs) {
  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    return {
      total: 0,
      accuracy: 0,
      correctCount: 0,
      incorrectCount: 0,
      conceptScore: {},
      mistakes: [],
      rtMean: 0,
      rtMedian: 0,
      rtStd: 0,
      rtMin: 0,
      rtMax: 0
    };
  }

  const total = logs.length;
  
  // 正答率の計算（複数の形式に対応）
  let correctCount = 0;
  logs.forEach(log => {
    if (log.correct === true || log.correct === 'true') {
      correctCount++;
    } else if (log.selected && log.selected.correct === true) {
      correctCount++;
    } else if (log.final_answer && log.correct !== undefined) {
      if (log.correct === true) correctCount++;
    }
  });
  
  const incorrectCount = total - correctCount;
  const accuracy = total > 0 ? correctCount / total : 0;

  // 概念別集計
  const conceptScore = {};
  logs.forEach(log => {
    // 概念タグを取得（複数の形式に対応）
    const concepts = log.conceptTags || 
                     log.concept_tags || 
                     (log.selected && log.selected.conceptTags) ||
                     [];
    
    if (Array.isArray(concepts)) {
      concepts.forEach(concept => {
        if (!conceptScore[concept]) {
          conceptScore[concept] = { total: 0, correct: 0 };
        }
        conceptScore[concept].total++;
        
        const isCorrect = log.correct === true || 
                         (log.selected && log.selected.correct === true);
        if (isCorrect) {
          conceptScore[concept].correct++;
        }
      });
    }
  });

  // 誤答ランキング
  const mistakes = Object.entries(conceptScore)
    .map(([k, d]) => ({
      concept: k,
      total: d.total,
      correct: d.correct,
      incorrect: d.total - d.correct,
      accuracy: d.total > 0 ? d.correct / d.total : 0
    }))
    .filter(item => item.incorrect > 0) // 誤答があるもののみ
    .sort((a, b) => b.incorrect - a.incorrect);

  // 反応時間の計算（複数の形式に対応）
  const rt = logs
    .map(log => {
      return log.response_time || 
             log.response_time_ms || 
             log.reaction_time || 
             log.time ||
             (log.selected && log.selected.time) ||
             null;
    })
    .filter(v => v != null && typeof v === 'number' && v >= 0);
  
  let rtMean = 0;
  let rtMedian = 0;
  let rtStd = 0;
  let rtMin = 0;
  let rtMax = 0;
  
  if (rt.length > 0) {
    // ソート（中央値計算のため）
    const sortedRt = [...rt].sort((a, b) => a - b);
    
    // 平均
    rtMean = sortedRt.reduce((s, v) => s + v, 0) / sortedRt.length;
    
    // 中央値
    const mid = Math.floor(sortedRt.length / 2);
    rtMedian = sortedRt.length % 2 === 0
      ? (sortedRt[mid - 1] + sortedRt[mid]) / 2
      : sortedRt[mid];
    
    // 標準偏差
    const variance = sortedRt.reduce((s, v) => s + Math.pow(v - rtMean, 2), 0) / sortedRt.length;
    rtStd = Math.sqrt(variance);
    
    // 最小値・最大値
    rtMin = sortedRt[0];
    rtMax = sortedRt[sortedRt.length - 1];
  }

  // パス長の計算
  const pathLengths = logs
    .map(log => {
      if (log.path && Array.isArray(log.path)) {
        return log.path.length;
      } else if (log.clicks && Array.isArray(log.clicks)) {
        return log.clicks.length;
      }
      return null;
    })
    .filter(v => v != null && typeof v === 'number' && v > 0);
  
  let avgPathLength = 0;
  if (pathLengths.length > 0) {
    avgPathLength = pathLengths.reduce((s, v) => s + v, 0) / pathLengths.length;
  }

  // セッション数の計算
  const sessionIds = new Set();
  logs.forEach(log => {
    if (log.session_id) {
      sessionIds.add(log.session_id);
    }
  });
  const totalSessions = sessionIds.size > 0 ? sessionIds.size : 1; // セッションIDがない場合は1とみなす

  // 概念別の詳細統計（正答率、平均反応時間、平均パス長）
  const conceptDetails = {};
  Object.keys(conceptScore).forEach(concept => {
    const conceptLogs = logs.filter(log => {
      const concepts = log.conceptTags || log.concept_tags || [];
      return Array.isArray(concepts) && concepts.includes(concept);
    });

    if (conceptLogs.length === 0) return;

    // 概念別の正答率
    const conceptCorrect = conceptLogs.filter(log => {
      return log.correct === true || 
             (log.selected && log.selected.correct === true);
    }).length;
    const conceptAccuracy = conceptCorrect / conceptLogs.length;

    // 概念別の平均反応時間
    const conceptRT = conceptLogs
      .map(log => log.response_time || log.response_time_ms || log.reaction_time || null)
      .filter(v => v != null && typeof v === 'number' && v >= 0);
    const avgRT = conceptRT.length > 0 
      ? conceptRT.reduce((s, v) => s + v, 0) / conceptRT.length 
      : 0;

    // 概念別の平均パス長
    const conceptPaths = conceptLogs
      .map(log => {
        if (log.path && Array.isArray(log.path)) return log.path.length;
        if (log.clicks && Array.isArray(log.clicks)) return log.clicks.length;
        return null;
      })
      .filter(v => v != null && typeof v === 'number' && v > 0);
    const avgPath = conceptPaths.length > 0
      ? conceptPaths.reduce((s, v) => s + v, 0) / conceptPaths.length
      : 0;

    // 概念別のGlossary表示率（recommended_termsが存在するログの割合）
    const glossaryShown = conceptLogs.filter(log => {
      return (log.recommended_terms && Array.isArray(log.recommended_terms) && log.recommended_terms.length > 0) ||
             (log.glossary_shown !== undefined && log.glossary_shown === true);
    }).length;
    const glossaryShownRate = conceptLogs.length > 0 ? glossaryShown / conceptLogs.length : 0;

    conceptDetails[concept] = {
      total: conceptLogs.length,
      correct: conceptCorrect,
      accuracy: conceptAccuracy,
      avgResponseTime: avgRT,
      avgPathLength: avgPath,
      glossaryShownRate: glossaryShownRate
    };
  });

  // 全体のGlossary表示率を計算
  const totalGlossaryShown = logs.filter(log => {
    return (log.recommended_terms && Array.isArray(log.recommended_terms) && log.recommended_terms.length > 0) ||
           (log.glossary_shown !== undefined && log.glossary_shown === true);
  }).length;
  const overallGlossaryShownRate = logs.length > 0 ? totalGlossaryShown / logs.length : 0;

  return {
    total,
    totalSessions,
    accuracy,
    correctCount,
    incorrectCount,
    conceptScore,
    conceptDetails, // 概念別の詳細統計
    mistakes,
    rtMean,
    rtMedian,
    rtStd,
    rtMin,
    rtMax,
    rtCount: rt.length, // 反応時間データがあるログ数
    avgPathLength,
    pathLengthCount: pathLengths.length, // パス長データがあるログ数
    overallGlossaryShownRate // 全体のGlossary表示率
  };
}

/**
 * 概念別の統計を全体平均からの偏差に正規化
 * @param {Object} stats - computeStats()の結果
 * @returns {Object} 正規化された概念別統計
 */
export function normalizeConceptStats(stats) {
  if (!stats || !stats.conceptDetails) {
    return {};
  }

  const overall = {
    accuracy: stats.accuracy,
    avgResponseTime: stats.rtMean,
    avgPathLength: stats.avgPathLength,
    glossaryShownRate: stats.overallGlossaryShownRate || 0
  };

  const normalized = {};
  
  Object.keys(stats.conceptDetails).forEach(concept => {
    const detail = stats.conceptDetails[concept];
    
    // 全体平均からの偏差を計算（相対的な差のみ）
    normalized[concept] = {
      accuracy: overall.accuracy > 0 
        ? (detail.accuracy - overall.accuracy) / overall.accuracy 
        : 0,
      avgResponseTime: overall.avgResponseTime > 0
        ? (detail.avgResponseTime - overall.avgResponseTime) / overall.avgResponseTime
        : 0,
      avgPathLength: overall.avgPathLength > 0
        ? (detail.avgPathLength - overall.avgPathLength) / overall.avgPathLength
        : 0,
      glossaryShownRate: overall.glossaryShownRate > 0
        ? (detail.glossaryShownRate - overall.glossaryShownRate) / overall.glossaryShownRate
        : 0
    };
  });

  return normalized;
}

/**
 * 誤概念ランキングを計算
 * @param {Array} logs - ログエントリの配列
 * @param {number} topN - 上位N件を返す（デフォルト: 5）
 * @returns {Array} 誤概念ランキング配列
 */
export function computeMistakeRanking(logs, topN = 5) {
  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    return [];
  }

  const mistakeCounts = {};
  
  logs.forEach(log => {
    // 誤答の場合のみカウント
    const isCorrect = log.correct === true || 
                     (log.selected && log.selected.correct === true);
    
    if (!isCorrect) {
      // 誤概念を取得（複数の形式に対応）
      const misconception = log.selected?.misconception ||
                           log.selected?.misconceptionTags?.[0] ||
                           log.misconception ||
                           '未分類';
      
      mistakeCounts[misconception] = (mistakeCounts[misconception] || 0) + 1;
    }
  });

  return Object.entries(mistakeCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

/**
 * 理解階層別の統計を計算
 * @param {Array} logs - ログエントリの配列
 * @param {Array} levels - 理解階層の配列（デフォルト: ['識別', '説明', '適用', '区別', '転移', '構造化']）
 * @returns {Object} 理解階層別統計
 */
export function computeLevelStats(logs, levels = ['識別', '説明', '適用', '区別', '転移', '構造化']) {
  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    return {};
  }

  const levelStats = {};
  levels.forEach(level => {
    levelStats[level] = { total: 0, correct: 0, incorrect: 0 };
  });

  logs.forEach(log => {
    // 理解階層を取得
    const logLevels = log.conceptTags || 
                     log.concept_tags ||
                     (log.selected && log.selected.measure) ||
                     [];
    
    const isCorrect = log.correct === true || 
                     (log.selected && log.selected.correct === true);
    
    if (Array.isArray(logLevels)) {
      logLevels.forEach(level => {
        if (levelStats[level]) {
          levelStats[level].total++;
          if (isCorrect) {
            levelStats[level].correct++;
          } else {
            levelStats[level].incorrect++;
          }
        }
      });
    }
  });

  // 精度を計算
  Object.keys(levelStats).forEach(level => {
    const stat = levelStats[level];
    stat.accuracy = stat.total > 0 ? stat.correct / stat.total : 0;
  });

  return levelStats;
}

/**
 * 最弱理解階層を特定
 * @param {Object} levelStats - 理解階層別統計（computeLevelStatsの結果）
 * @returns {string} 最弱理解階層名
 */
export function findWeakestLevel(levelStats) {
  if (!levelStats || Object.keys(levelStats).length === 0) {
    return 'データ不足';
  }

  let weakestLevel = null;
  let minAccuracy = Infinity;

  Object.entries(levelStats).forEach(([level, stat]) => {
    if (stat.total > 0 && stat.accuracy < minAccuracy) {
      minAccuracy = stat.accuracy;
      weakestLevel = level;
    }
  });

  return weakestLevel || 'データ不足';
}

