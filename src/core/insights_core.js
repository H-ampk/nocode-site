/**
 * Insights Core - 詳細分析レポート生成
 * 
 * 統計データから研究用の解釈・洞察を生成する
 */

/**
 * 統計データから洞察を生成
 * @param {Object} stats - computeStats()の結果
 * @returns {Array<string>} 洞察メッセージの配列
 */
export function generateInsights(stats) {
  const insights = [];
  
  if (!stats || stats.total === 0) {
    insights.push("データが不足しています。分析には十分なログデータが必要です。");
    return insights;
  }

  const acc = stats.accuracy * 100;

  // ============================================================
  // 1. 総評（正答率ベース）
  // ============================================================
  if (acc < 40) {
    insights.push({
      type: "critical",
      category: "総評",
      message: "理解の基盤が不安定で、再構築が必要です。",
      detail: `正答率が${acc.toFixed(1)}%と低く、基本的な概念の理解から見直す必要があります。`
    });
  } else if (acc < 60) {
    insights.push({
      type: "warning",
      category: "総評",
      message: "理解が部分的で、特定概念に依存した誤答傾向があります。",
      detail: `正答率が${acc.toFixed(1)}%で、一部の概念で理解が不足しています。`
    });
  } else if (acc < 80) {
    insights.push({
      type: "info",
      category: "総評",
      message: "全体として理解は安定していますが、一部概念が弱点です。",
      detail: `正答率が${acc.toFixed(1)}%で、基本的な理解はできていますが、改善の余地があります。`
    });
  } else {
    insights.push({
      type: "success",
      category: "総評",
      message: "高い理解度を示し、概念間の接続も強固です。",
      detail: `正答率が${acc.toFixed(1)}%と高く、概念の理解が定着しています。`
    });
  }

  // ============================================================
  // 2. 弱点概念の特定
  // ============================================================
  const conceptEntries = Object.entries(stats.conceptScore || {});
  if (conceptEntries.length > 0) {
    // 正答率が最も低い概念を特定
    const weakest = conceptEntries
      .filter(([_, data]) => data.total > 0)
      .sort((a, b) => {
        const accA = a[1].correct / a[1].total;
        const accB = b[1].correct / b[1].total;
        return accA - accB;
      })[0];
    
    if (weakest) {
      const weakestAcc = (weakest[1].correct / weakest[1].total * 100);
      insights.push({
        type: "warning",
        category: "弱点概念",
        message: `最も弱い概念: ${weakest[0]}（正答率 ${weakestAcc.toFixed(1)}%）`,
        detail: `概念「${weakest[0]}」は${weakest[1].total}問中${weakest[1].correct}問しか正答できておらず、集中的な復習が必要です。`
      });
    }

    // 複数の弱点概念がある場合
    const weakConcepts = conceptEntries
      .filter(([_, data]) => data.total > 0 && (data.correct / data.total) < 0.6)
      .map(([concept, data]) => ({
        concept,
        accuracy: data.correct / data.total,
        total: data.total
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    if (weakConcepts.length > 1) {
      insights.push({
        type: "info",
        category: "弱点概念",
        message: `他にも${weakConcepts.length}個の弱点概念があります。`,
        detail: weakConcepts.map(c => `${c.concept}（${(c.accuracy * 100).toFixed(1)}%）`).join('、')
      });
    }
  }

  // ============================================================
  // 3. 反応時間の分析
  // ============================================================
  if (stats.rtCount > 0) {
    const rtMeanSec = stats.rtMean / 1000; // ミリ秒から秒に変換
    const rtStdSec = stats.rtStd / 1000;

    // 平均反応時間が長い場合
    if (stats.rtMean > 7000) {
      insights.push({
        type: "warning",
        category: "反応時間",
        message: "反応時間が長く、処理負荷が高い設問で迷いやすい傾向があります。",
        detail: `平均反応時間が${rtMeanSec.toFixed(1)}秒と長く、問題解決に時間がかかっています。`
      });
    } else if (stats.rtMean < 2000) {
      insights.push({
        type: "success",
        category: "反応時間",
        message: "反応時間が短く、直感的な理解ができています。",
        detail: `平均反応時間が${rtMeanSec.toFixed(1)}秒と短く、概念の理解が定着しています。`
      });
    }

    // 反応時間のばらつきが大きい場合
    if (stats.rtStd > 3000) {
      insights.push({
        type: "warning",
        category: "反応時間",
        message: "反応時間のばらつきが大きく、曖昧な理解が残っています。",
        detail: `標準偏差が${rtStdSec.toFixed(1)}秒と大きく、問題によって反応時間に大きな差があります。`
      });
    }

    // 反応時間と正答率の関係
    if (stats.rtMean > 5000 && acc < 60) {
      insights.push({
        type: "critical",
        category: "反応時間",
        message: "長時間考えても正答率が低く、理解が不十分です。",
        detail: "反応時間が長いにもかかわらず正答率が低いため、基礎的な理解から見直す必要があります。"
      });
    }
  }

  // ============================================================
  // 4. 誤答密集パターン
  // ============================================================
  if (stats.mistakes && stats.mistakes.length > 0) {
    const topMistakes = stats.mistakes.slice(0, 3);
    
    topMistakes.forEach((mistake, index) => {
      const mistakeRate = (mistake.incorrect / mistake.total * 100);
      insights.push({
        type: "warning",
        category: "誤答パターン",
        message: `概念「${mistake.concept}」は誤答が多く、理解構造の弱点です。`,
        detail: `${mistake.total}問中${mistake.incorrect}問を誤答（誤答率${mistakeRate.toFixed(1)}%）しており、${index === 0 ? '最も' : ''}集中的な復習が必要です。`
      });
    });

    // 誤答が特定の概念に集中している場合
    if (topMistakes.length > 0) {
      const totalMistakes = stats.mistakes.reduce((sum, m) => sum + m.incorrect, 0);
      const top3Mistakes = topMistakes.reduce((sum, m) => sum + m.incorrect, 0);
      const concentration = (top3Mistakes / totalMistakes * 100);
      
      if (concentration > 60) {
        insights.push({
          type: "info",
          category: "誤答パターン",
          message: "誤答が特定の概念に集中しています。",
          detail: `誤答の${concentration.toFixed(1)}%が上位3つの概念に集中しており、これらの概念を重点的に復習することで大幅な改善が期待できます。`
        });
      }
    }
  }

  // ============================================================
  // 5. データの信頼性評価
  // ============================================================
  if (stats.total < 10) {
    insights.push({
      type: "warning",
      category: "データ品質",
      message: "データ量が少なく、分析結果の信頼性が低い可能性があります。",
      detail: `総回答数が${stats.total}問と少ないため、より多くのデータを収集することを推奨します。`
    });
  } else if (stats.total >= 50) {
    insights.push({
      type: "success",
      category: "データ品質",
      message: "十分なデータ量があり、分析結果の信頼性が高いです。",
      detail: `総回答数が${stats.total}問と十分なため、分析結果は信頼できます。`
    });
  }

  return insights;
}

/**
 * 洞察をテキスト形式で取得（簡易版）
 * @param {Object} stats - computeStats()の結果
 * @returns {Array<string>} 洞察メッセージの配列（文字列のみ）
 */
export function generateInsightsText(stats) {
  const insights = generateInsights(stats);
  return insights.map(insight => {
    if (typeof insight === 'string') {
      return insight;
    }
    return insight.message;
  });
}

/**
 * 洞察をカテゴリ別にグループ化
 * @param {Object} stats - computeStats()の結果
 * @returns {Object} カテゴリ別にグループ化された洞察
 */
export function generateInsightsByCategory(stats) {
  const insights = generateInsights(stats);
  const grouped = {};

  insights.forEach(insight => {
    if (typeof insight === 'object' && insight.category) {
      if (!grouped[insight.category]) {
        grouped[insight.category] = [];
      }
      grouped[insight.category].push(insight);
    }
  });

  return grouped;
}

/**
 * 洞察を重要度順にソート
 * @param {Object} stats - computeStats()の結果
 * @returns {Array} 重要度順にソートされた洞察
 */
export function generateInsightsSorted(stats) {
  const insights = generateInsights(stats);
  const priority = { critical: 0, warning: 1, info: 2, success: 3 };
  
  return insights
    .filter(insight => typeof insight === 'object')
    .sort((a, b) => {
      const priorityA = priority[a.type] || 99;
      const priorityB = priority[b.type] || 99;
      return priorityA - priorityB;
    });
}




