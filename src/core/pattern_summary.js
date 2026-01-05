/**
 * Pattern Summary - 研究用傾向サマリ生成
 * 
 * 統計結果をもとに研究用の傾向サマリを自動生成する
 * LLMは使用せず、テンプレートベースで生成
 */

/**
 * 統計データからパターンを検出し、サマリを生成
 * @param {Object} stats - computeStats()の結果
 * @param {Object} conceptStats - normalizeConceptStats()の結果
 * @param {Object} rtProfile - computeResponseTimeProfile()の結果
 * @returns {Array<string>} サマリテキストの配列
 */
export function generatePatternSummary(stats, conceptStats, rtProfile) {
  const summaries = [];

  if (!stats || !conceptStats || !rtProfile) {
    return summaries;
  }

  // 全体統計の基準値を取得
  const overallAccuracy = stats.accuracy || 0;
  const overallAvgPathLength = stats.avgPathLength || 0;
  const overallAvgRT = stats.rtMean || 0;
  const overallGlossaryRate = stats.overallGlossaryShownRate || 0;

  // 概念別のパターンを検出
  Object.keys(conceptStats).forEach(concept => {
    const conceptData = conceptStats[concept];
    const conceptDetails = stats.conceptDetails?.[concept];
    
    if (!conceptData || !conceptDetails) return;

    const conceptAccuracy = conceptDetails.accuracy || 0;
    const conceptAvgPathLength = conceptDetails.avgPathLength || 0;
    const conceptAvgRT = conceptDetails.avgResponseTime || 0;
    const conceptGlossaryRate = conceptDetails.glossaryShownRate || 0;

    // パターン1: 低正答率かつ高パス長
    if (conceptAccuracy < overallAccuracy - 0.1 && conceptAvgPathLength > overallAvgPathLength * 1.2) {
      const accuracyDiff = ((conceptAccuracy - overallAccuracy) * 100).toFixed(1);
      const pathDiff = ((conceptAvgPathLength / overallAvgPathLength - 1) * 100).toFixed(1);
      summaries.push(
        `概念「${concept}」では正答率が全体平均より${Math.abs(accuracyDiff)}%低く（${(conceptAccuracy * 100).toFixed(1)}%）、平均パス長が${pathDiff}%長い（${conceptAvgPathLength.toFixed(2)}）。`
      );
    }

    // パターン2: 反応時間のみが長い（正答率は平均的）
    if (Math.abs(conceptAccuracy - overallAccuracy) < 0.1 && conceptAvgRT > overallAvgRT * 1.3) {
      const rtDiff = ((conceptAvgRT / overallAvgRT - 1) * 100).toFixed(1);
      summaries.push(
        `概念「${concept}」では正答率は全体平均とほぼ同等（${(conceptAccuracy * 100).toFixed(1)}%）だが、平均反応時間が${rtDiff}%長い（${(conceptAvgRT / 1000).toFixed(2)}秒）。`
      );
    }

    // パターン3: Glossary表示されたが誤答率が高い
    if (conceptGlossaryRate > overallGlossaryRate * 1.5 && conceptAccuracy < overallAccuracy - 0.15) {
      const glossaryDiff = ((conceptGlossaryRate / overallGlossaryRate - 1) * 100).toFixed(1);
      const accuracyDiff = ((conceptAccuracy - overallAccuracy) * 100).toFixed(1);
      summaries.push(
        `概念「${concept}」ではGlossary表示率が全体平均より${glossaryDiff}%高い（${(conceptGlossaryRate * 100).toFixed(1)}%）にもかかわらず、正答率が${Math.abs(accuracyDiff)}%低い（${(conceptAccuracy * 100).toFixed(1)}%）。`
      );
    }

    // パターン4: 正答率が高いが反応時間も長い
    if (conceptAccuracy > overallAccuracy + 0.15 && conceptAvgRT > overallAvgRT * 1.2) {
      const accuracyDiff = ((conceptAccuracy - overallAccuracy) * 100).toFixed(1);
      const rtDiff = ((conceptAvgRT / overallAvgRT - 1) * 100).toFixed(1);
      summaries.push(
        `概念「${concept}」では正答率が全体平均より${accuracyDiff}%高い（${(conceptAccuracy * 100).toFixed(1)}%）が、平均反応時間も${rtDiff}%長い（${(conceptAvgRT / 1000).toFixed(2)}秒）。`
      );
    }
  });

  // 反応時間プロファイルからのパターン検出
  if (rtProfile && rtProfile.byCorrectness) {
    const correctRT = rtProfile.byCorrectness.correct.mean || 0;
    const incorrectRT = rtProfile.byCorrectness.incorrect.mean || 0;
    
    // パターン5: 誤答時の反応時間が正答時より長い
    if (incorrectRT > correctRT * 1.2) {
      const rtDiff = ((incorrectRT / correctRT - 1) * 100).toFixed(1);
      summaries.push(
        `誤答時の平均反応時間（${(incorrectRT / 1000).toFixed(2)}秒）は正答時（${(correctRT / 1000).toFixed(2)}秒）より${rtDiff}%長い。`
      );
    }

    // パターン6: 誤答時の反応時間が正答時より短い
    if (incorrectRT < correctRT * 0.8) {
      const rtDiff = ((1 - incorrectRT / correctRT) * 100).toFixed(1);
      summaries.push(
        `誤答時の平均反応時間（${(incorrectRT / 1000).toFixed(2)}秒）は正答時（${(correctRT / 1000).toFixed(2)}秒）より${rtDiff}%短い。`
      );
    }
  }

  // 全体統計からのパターン検出
  if (stats.avgPathLength > 3 && stats.accuracy < 0.5) {
    summaries.push(
      `全体として平均パス長が${stats.avgPathLength.toFixed(2)}と長く、正答率が${(stats.accuracy * 100).toFixed(1)}%と低い傾向が見られる。`
    );
  }

  if (stats.rtMean > 5000 && stats.accuracy > 0.7) {
    summaries.push(
      `全体として平均反応時間が${(stats.rtMean / 1000).toFixed(2)}秒と長いが、正答率は${(stats.accuracy * 100).toFixed(1)}%と高い。`
    );
  }

  return summaries;
}

/**
 * 概念別の詳細パターンを検出
 * @param {Object} stats - computeStats()の結果
 * @param {Object} conceptStats - normalizeConceptStats()の結果
 * @returns {Array<Object>} 概念別パターンの配列
 */
export function detectConceptPatterns(stats, conceptStats) {
  const patterns = [];

  if (!stats || !conceptStats) {
    return patterns;
  }

  const overallAccuracy = stats.accuracy || 0;
  const overallAvgPathLength = stats.avgPathLength || 0;
  const overallAvgRT = stats.rtMean || 0;

  Object.keys(conceptStats).forEach(concept => {
    const conceptData = conceptStats[concept];
    const conceptDetails = stats.conceptDetails?.[concept];
    
    if (!conceptData || !conceptDetails) return;

    const conceptAccuracy = conceptDetails.accuracy || 0;
    const conceptAvgPathLength = conceptDetails.avgPathLength || 0;
    const conceptAvgRT = conceptDetails.avgResponseTime || 0;

    const pattern = {
      concept: concept,
      patterns: []
    };

    // 低正答率
    if (conceptAccuracy < overallAccuracy - 0.1) {
      pattern.patterns.push('low_accuracy');
    }

    // 高パス長
    if (conceptAvgPathLength > overallAvgPathLength * 1.2) {
      pattern.patterns.push('high_path_length');
    }

    // 長い反応時間
    if (conceptAvgRT > overallAvgRT * 1.3) {
      pattern.patterns.push('slow_response');
    }

    // 高正答率
    if (conceptAccuracy > overallAccuracy + 0.15) {
      pattern.patterns.push('high_accuracy');
    }

    if (pattern.patterns.length > 0) {
      patterns.push(pattern);
    }
  });

  return patterns;
}




