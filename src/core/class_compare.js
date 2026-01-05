/**
 * Class Compare - 個人とクラス平均の比較ロジック
 * 
 * 学習者の統計データをクラス全体の平均と比較し、相対的な位置づけを分析する
 */

/**
 * 個人とクラス平均を比較
 * @param {Object} student - 学習者の統計データ（computeStats()の結果）
 * @param {Object} group - クラス全体の統計データ（computeStats()の結果）
 * @returns {Array<Object>} 比較結果の配列
 */
export function compareWithClass(student, group) {
  const report = [];
  
  if (!student || !group) {
    report.push({
      type: "warning",
      category: "データ不足",
      message: "比較に必要なデータが不足しています。",
      detail: "学習者データまたはクラスデータが提供されていません。"
    });
    return report;
  }

  // ============================================================
  // 1. 全体の正答率比較
  // ============================================================
  const diff = (student.accuracy - group.accuracy) * 100;
  
  if (diff > 10) {
    report.push({
      type: "success",
      category: "全体評価",
      message: "クラス平均を大きく上回る理解度です。",
      detail: `正答率がクラス平均より${diff.toFixed(1)}ポイント高く、優秀な成績を示しています。`,
      diff: diff
    });
  } else if (diff > 5) {
    report.push({
      type: "success",
      category: "全体評価",
      message: "クラス平均を上回る理解度です。",
      detail: `正答率がクラス平均より${diff.toFixed(1)}ポイント高く、良好な成績です。`,
      diff: diff
    });
  } else if (diff < -10) {
    report.push({
      type: "critical",
      category: "全体評価",
      message: "クラス平均より低く、基礎概念の補強が必要です。",
      detail: `正答率がクラス平均より${Math.abs(diff).toFixed(1)}ポイント低く、集中的な支援が必要です。`,
      diff: diff
    });
  } else if (diff < -5) {
    report.push({
      type: "warning",
      category: "全体評価",
      message: "クラス平均よりやや低い理解度です。",
      detail: `正答率がクラス平均より${Math.abs(diff).toFixed(1)}ポイント低く、復習を推奨します。`,
      diff: diff
    });
  } else {
    report.push({
      type: "info",
      category: "全体評価",
      message: "クラス平均と同等の理解度です。",
      detail: `正答率がクラス平均とほぼ同等で、標準的な理解度を示しています。`,
      diff: diff
    });
  }

  // ============================================================
  // 2. 概念別の比較
  // ============================================================
  const studentConcepts = student.conceptScore || {};
  const groupConcepts = group.conceptScore || {};
  
  const strongConcepts = [];
  const weakConcepts = [];
  
  for (const key in studentConcepts) {
    if (!groupConcepts[key] || !studentConcepts[key].total || !groupConcepts[key].total) {
      continue;
    }
    
    const studentAcc = studentConcepts[key].correct / studentConcepts[key].total;
    const groupAcc = groupConcepts[key].correct / groupConcepts[key].total;
    const conceptDiff = studentAcc - groupAcc;
    
    // 得意な概念（クラス平均より15%以上高い）
    if (conceptDiff > 0.15) {
      strongConcepts.push({
        concept: key,
        studentAccuracy: studentAcc,
        groupAccuracy: groupAcc,
        diff: conceptDiff
      });
      report.push({
        type: "success",
        category: "概念別評価",
        message: `概念「${key}」はクラス平均よりも得意です。`,
        detail: `正答率が${(studentAcc * 100).toFixed(1)}%で、クラス平均${(groupAcc * 100).toFixed(1)}%より${(conceptDiff * 100).toFixed(1)}ポイント高いです。`,
        concept: key,
        diff: conceptDiff
      });
    }
    // 苦手な概念（クラス平均より15%以上低い）
    else if (conceptDiff < -0.15) {
      weakConcepts.push({
        concept: key,
        studentAccuracy: studentAcc,
        groupAccuracy: groupAcc,
        diff: conceptDiff
      });
      report.push({
        type: "warning",
        category: "概念別評価",
        message: `概念「${key}」はクラス平均よりも苦手です。`,
        detail: `正答率が${(studentAcc * 100).toFixed(1)}%で、クラス平均${(groupAcc * 100).toFixed(1)}%より${(Math.abs(conceptDiff) * 100).toFixed(1)}ポイント低いです。集中的な復習を推奨します。`,
        concept: key,
        diff: conceptDiff
      });
    }
  }

  // ============================================================
  // 3. 反応時間の比較
  // ============================================================
  if (student.rtCount > 0 && group.rtCount > 0) {
    const rtDiff = student.rtMean - group.rtMean;
    const rtDiffPercent = (rtDiff / group.rtMean) * 100;
    
    if (rtDiffPercent > 20) {
      report.push({
        type: "warning",
        category: "反応時間",
        message: "クラス平均より反応時間が長いです。",
        detail: `平均反応時間が${(student.rtMean / 1000).toFixed(1)}秒で、クラス平均${(group.rtMean / 1000).toFixed(1)}秒より${(rtDiffPercent).toFixed(1)}%長く、問題解決に時間がかかっています。`,
        diff: rtDiffPercent
      });
    } else if (rtDiffPercent < -20) {
      report.push({
        type: "success",
        category: "反応時間",
        message: "クラス平均より反応時間が短いです。",
        detail: `平均反応時間が${(student.rtMean / 1000).toFixed(1)}秒で、クラス平均${(group.rtMean / 1000).toFixed(1)}秒より${(Math.abs(rtDiffPercent)).toFixed(1)}%短く、素早い理解を示しています。`,
        diff: rtDiffPercent
      });
    }
  }

  // ============================================================
  // 4. サマリー情報
  // ============================================================
  if (strongConcepts.length > 0 || weakConcepts.length > 0) {
    report.push({
      type: "info",
      category: "サマリー",
      message: `得意な概念が${strongConcepts.length}個、苦手な概念が${weakConcepts.length}個あります。`,
      detail: strongConcepts.length > 0 
        ? `得意: ${strongConcepts.map(c => c.concept).join('、')}`
        : `苦手: ${weakConcepts.map(c => c.concept).join('、')}`,
      strongConcepts: strongConcepts.map(c => c.concept),
      weakConcepts: weakConcepts.map(c => c.concept)
    });
  }

  return report;
}

/**
 * 比較結果をテキスト形式で取得（簡易版）
 * @param {Object} student - 学習者の統計データ
 * @param {Object} group - クラス全体の統計データ
 * @returns {Array<string>} 比較結果メッセージの配列（文字列のみ）
 */
export function compareWithClassText(student, group) {
  const report = compareWithClass(student, group);
  return report.map(item => {
    if (typeof item === 'string') {
      return item;
    }
    return item.message;
  });
}

/**
 * 複数の学習者をクラス平均と比較
 * @param {Array<Object>} students - 学習者の統計データ配列
 * @param {Object} group - クラス全体の統計データ
 * @returns {Object} 各学習者の比較結果
 */
export function compareMultipleStudents(students, group) {
  if (!Array.isArray(students) || students.length === 0) {
    return {};
  }

  const results = {};
  
  students.forEach((student, index) => {
    const studentId = student.id || student.student_id || `student_${index}`;
    results[studentId] = compareWithClass(student, group);
  });

  return results;
}

/**
 * クラス内での相対的な位置を計算
 * @param {Object} student - 学習者の統計データ
 * @param {Array<Object>} allStudents - 全学習者の統計データ配列
 * @returns {Object} 相対位置情報
 */
export function calculateRelativePosition(student, allStudents) {
  if (!student || !Array.isArray(allStudents) || allStudents.length === 0) {
    return {
      percentile: null,
      rank: null,
      total: 0
    };
  }

  // 正答率でソート
  const sorted = [...allStudents]
    .map(s => ({ ...s, accuracy: s.accuracy || 0 }))
    .sort((a, b) => b.accuracy - a.accuracy);

  const studentAccuracy = student.accuracy || 0;
  const rank = sorted.findIndex(s => s.accuracy <= studentAccuracy) + 1;
  const percentile = ((sorted.length - rank + 1) / sorted.length) * 100;

  return {
    percentile: percentile,
    rank: rank,
    total: sorted.length,
    message: `クラス内で${rank}位/${sorted.length}人中（上位${percentile.toFixed(1)}%）`
  };
}




