/**
 * Response Time Profile - 反応時間分布分析
 * 
 * 概念別・正誤別の反応時間分布を分析する
 */

/**
 * ログから反応時間分布を計算
 * @param {Array} logs - ログエントリの配列
 * @returns {Object} 反応時間分布データ
 */
export function computeResponseTimeProfile(logs) {
  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    return {
      overall: { mean: 0, median: 0, q1: 0, q3: 0, min: 0, max: 0, values: [] },
      byConcept: {},
      byCorrectness: { correct: [], incorrect: [] }
    };
  }

  // 全体の反応時間を取得
  const allResponseTimes = logs
    .map(log => {
      return log.response_time || 
             log.response_time_ms || 
             log.reaction_time ||
             (log.clicks && log.clicks.length > 0 ? log.clicks[log.clicks.length - 1].time * 1000 : null) ||
             null;
    })
    .filter(v => v != null && typeof v === 'number' && v >= 0);

  // 全体分布を計算
  const overall = computeDistribution(allResponseTimes);

  // 概念別に分割
  const byConcept = {};
  logs.forEach(log => {
    const concepts = log.conceptTags || log.concept_tags || [];
    const responseTime = log.response_time || 
                       log.response_time_ms || 
                       log.reaction_time ||
                       (log.clicks && log.clicks.length > 0 ? log.clicks[log.clicks.length - 1].time * 1000 : null);
    
    if (!Array.isArray(concepts) || concepts.length === 0 || responseTime == null) return;

    const isCorrect = log.correct === true || 
                     (log.selected && log.selected.correct === true);

    concepts.forEach(concept => {
      if (!byConcept[concept]) {
        byConcept[concept] = {
          correct: [],
          incorrect: [],
          all: []
        };
      }

      byConcept[concept].all.push(responseTime);
      if (isCorrect) {
        byConcept[concept].correct.push(responseTime);
      } else {
        byConcept[concept].incorrect.push(responseTime);
      }
    });
  });

  // 概念別の分布を計算
  const conceptDistributions = {};
  Object.keys(byConcept).forEach(concept => {
    conceptDistributions[concept] = {
      all: computeDistribution(byConcept[concept].all),
      correct: computeDistribution(byConcept[concept].correct),
      incorrect: computeDistribution(byConcept[concept].incorrect)
    };
  });

  // 正誤別に分割
  const correctTimes = logs
    .filter(log => {
      const isCorrect = log.correct === true || 
                       (log.selected && log.selected.correct === true);
      return isCorrect;
    })
    .map(log => {
      return log.response_time || 
             log.response_time_ms || 
             log.reaction_time ||
             (log.clicks && log.clicks.length > 0 ? log.clicks[log.clicks.length - 1].time * 1000 : null);
    })
    .filter(v => v != null && typeof v === 'number' && v >= 0);

  const incorrectTimes = logs
    .filter(log => {
      const isCorrect = log.correct === true || 
                       (log.selected && log.selected.correct === true);
      return !isCorrect;
    })
    .map(log => {
      return log.response_time || 
             log.response_time_ms || 
             log.reaction_time ||
             (log.clicks && log.clicks.length > 0 ? log.clicks[log.clicks.length - 1].time * 1000 : null);
    })
    .filter(v => v != null && typeof v === 'number' && v >= 0);

  return {
    overall: overall,
    byConcept: conceptDistributions,
    byCorrectness: {
      correct: computeDistribution(correctTimes),
      incorrect: computeDistribution(incorrectTimes)
    }
  };
}

/**
 * 分布統計を計算（四分位数、平均、最小値、最大値）
 * @param {Array} values - 数値配列
 * @returns {Object} 分布統計
 */
function computeDistribution(values) {
  if (!values || values.length === 0) {
    return {
      mean: 0,
      median: 0,
      q1: 0,
      q3: 0,
      min: 0,
      max: 0,
      count: 0,
      values: []
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / count;
  
  const median = getPercentile(sorted, 50);
  const q1 = getPercentile(sorted, 25);
  const q3 = getPercentile(sorted, 75);
  const min = sorted[0];
  const max = sorted[count - 1];

  return {
    mean,
    median,
    q1,
    q3,
    min,
    max,
    count,
    values: sorted
  };
}

/**
 * パーセンタイルを計算
 * @param {Array} sortedValues - ソート済み数値配列
 * @param {number} percentile - パーセンタイル（0-100）
 * @returns {number} パーセンタイル値
 */
function getPercentile(sortedValues, percentile) {
  if (sortedValues.length === 0) return 0;
  
  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) {
    return sortedValues[lower];
  }

  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}




